# Visitor Analytics SQLite Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the public Tailscale Funnel visitor pixel with a safer first-party visitor analytics system that captures as much useful visitor data as possible, including raw IP, into a private SQLite database managed by the portfolio repo.

**Architecture:** The browser should call a same-origin endpoint on `marcofernstaedt.com`, not a public Tailscale Funnel URL. The endpoint captures request headers server-side, including raw IP from trusted proxy headers, stores the event in SQLite, and optionally records enriched browser/session fields sent by a small client script. The SQLite database must live in a runtime data path inside the repo checkout or an attached volume, but must be gitignored and never committed.

**Tech Stack:** Astro portfolio, small Node collector/API server, SQLite, Caddy/Nginx reverse proxy or equivalent, systemd/pm2 keepalive on VPS, privacy-safe client beacon JavaScript.

---

## Critical Design Decision

The current portfolio is a static Astro site. A purely static Vercel deployment cannot reliably write to a local SQLite database because serverless filesystem writes are ephemeral and not durable.

So the correct design is one of these two paths:

1. **Preferred:** Run a small first-party analytics collector from this same repo on the VPS and expose it through `marcofernstaedt.com/api/visit` or `analytics.marcofernstaedt.com/visit` behind Caddy.
2. **Alternative:** Keep the portfolio on Vercel, but use a hosted SQLite-compatible service such as Turso/LibSQL. This is not a local SQLite DB in the repo, so it does not match Marco's exact request.

This plan assumes the preferred VPS collector.

---

## Security and Privacy Rules

- Raw IPs may be stored privately in SQLite, but never committed to GitHub.
- SQLite files, WAL files, backups, `.env`, and export files must be gitignored.
- Do not expose an admin dashboard publicly.
- Do not put raw IPs in Obsidian notes, chat summaries, screenshots, GitHub, LinkedIn, or blog posts.
- Add request-size limits and CORS/origin checks.
- Only trust `X-Forwarded-For` or `X-Real-IP` from our own reverse proxy.
- Client-side data is useful but spoofable; raw IP and headers must be captured server-side.
- Do not request browser permissions such as geolocation, camera, clipboard, notifications, screen capture, or filesystem access.

---

## Database Location

Runtime database path:

```text
/home/marco/imperator-workspace/repos/marcofernstaedt-portfolio/data/visitor-analytics.sqlite3
```

Gitignore these:

```gitignore
data/*.sqlite3
data/*.sqlite3-*
data/*.db
data/*.db-*
data/exports/
.env
.env.*
```

Reason: Marco asked for SQLite in the same repo. The database can live under the repo checkout for operational convenience, but the file must remain private and untracked.

---

## Data Model

### Table: visitors

Purpose: one stable browser/device identity when a first-party cookie/localStorage ID exists.

Columns:

```sql
CREATE TABLE IF NOT EXISTS visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT UNIQUE,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  first_raw_ip TEXT,
  last_raw_ip TEXT,
  first_ip_hash TEXT,
  last_ip_hash TEXT,
  first_user_agent TEXT,
  last_user_agent TEXT,
  owner_marked INTEGER DEFAULT 0,
  visit_count INTEGER DEFAULT 0,
  notes TEXT
);
```

### Table: visits

Purpose: one page load or route visit.

```sql
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT,
  session_id TEXT,
  received_at TEXT NOT NULL,
  raw_ip TEXT,
  ip_hash TEXT,
  method TEXT,
  host TEXT,
  origin TEXT,
  referer TEXT,
  user_agent TEXT,
  accept_language TEXT,
  x_forwarded_for TEXT,
  x_real_ip TEXT,
  cf_ipcountry TEXT,
  url TEXT,
  path TEXT,
  title TEXT,
  timezone TEXT,
  language TEXT,
  platform TEXT,
  vendor TEXT,
  screen TEXT,
  viewport TEXT,
  color_depth INTEGER,
  pixel_ratio REAL,
  touch_points INTEGER,
  cookies_enabled INTEGER,
  do_not_track TEXT,
  global_privacy_control TEXT,
  online INTEGER,
  connection_type TEXT,
  downlink REAL,
  rtt INTEGER,
  save_data INTEGER,
  device_memory REAL,
  hardware_concurrency INTEGER,
  navigation_type TEXT,
  visibility_state TEXT,
  load_time_ms INTEGER,
  payload_json TEXT
);
```

### Table: events

Purpose: safe interaction/session events after page load.

```sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT,
  session_id TEXT,
  received_at TEXT NOT NULL,
  raw_ip TEXT,
  ip_hash TEXT,
  event_type TEXT NOT NULL,
  path TEXT,
  url TEXT,
  payload_json TEXT
);
```

### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_visits_received_at ON visits(received_at);
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visits_raw_ip ON visits(raw_ip);
CREATE INDEX IF NOT EXISTS idx_events_received_at ON events(received_at);
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events(visitor_id);
```

---

## What To Collect

### Server-side, reliable enough

- Raw IP from socket/proxy.
- Full `X-Forwarded-For` chain, only if injected by trusted reverse proxy.
- `X-Real-IP`.
- User-Agent.
- Accept-Language.
- Referrer.
- Origin.
- Host.
- Path and query string.
- Request timestamp.
- Country header only if a trusted proxy provides it.

### Browser-side, useful but spoofable

- First-party `visitor_id` cookie/localStorage ID.
- `session_id`.
- Page URL, path, title.
- Timezone.
- Language.
- Platform/vendor.
- Screen and viewport.
- Pixel ratio, color depth, touch points.
- Cookie enabled.
- Do Not Track and Global Privacy Control.
- Online status.
- Connection type/downlink/RTT/save-data where exposed.
- Device memory and CPU threads where exposed.
- Navigation timing/load time.
- Visibility state.
- Scroll depth milestones.
- Link/button click metadata, excluding typed text or form contents.
- Pagehide/session duration heartbeat.
- Client error counts with messages scrubbed or omitted.

### Do not collect

- Passwords.
- Form field values.
- Keystroke contents.
- Clipboard content.
- Permission-based geolocation.
- Camera/microphone/screen data.
- Canvas/WebGL/audio/font fingerprinting unless explicitly approved later.

---

## Task 1: Add Git Ignore Safety Net

**Objective:** Ensure private runtime analytics files cannot be committed.

**Files:**
- Modify: `.gitignore`

**Steps:**
1. Add `data/*.sqlite3`, `data/*.sqlite3-*`, `data/*.db`, `data/*.db-*`, `data/exports/`, `.env`, `.env.*`.
2. Run `git status --short`.
3. Verify no database or env files are staged.
4. Commit:

```bash
git add .gitignore
git commit -m "chore: ignore private analytics runtime data"
```

---

## Task 2: Add SQLite Schema and Migration Script

**Objective:** Create deterministic DB initialization.

**Files:**
- Create: `server/analytics/schema.sql`
- Create: `server/analytics/init-db.mjs`

**Implementation Notes:**
- Use `better-sqlite3` for simple synchronous writes.
- DB path defaults to `./data/visitor-analytics.sqlite3`.
- Allow override via `VISITOR_DB_PATH`.

**Verification:**

```bash
node server/analytics/init-db.mjs
sqlite3 data/visitor-analytics.sqlite3 '.tables'
```

Expected tables:

```text
visitors visits events
```

Commit:

```bash
git add server/analytics/schema.sql server/analytics/init-db.mjs package.json package-lock.json
git commit -m "feat: add visitor analytics sqlite schema"
```

---

## Task 3: Build the Collector Server

**Objective:** Add a small HTTP server that accepts `/api/visit`, `/api/event`, and `/health`.

**Files:**
- Create: `server/analytics/collector.mjs`

**Endpoints:**

- `GET /health` returns `{ ok: true }`.
- `POST /api/visit` records a visit.
- `POST /api/event` records an event.
- Reject all other paths with 404.

**Required Guards:**

- Max body size: 64 KB.
- Allowed origins: `https://marcofernstaedt.com`, `https://www.marcofernstaedt.com`, local dev origins.
- No wildcard CORS in production.
- Parse JSON safely.
- Never log request bodies to stdout.
- Store raw IP in DB, but do not print it in logs.

**Verification:**

```bash
VISITOR_DB_PATH=./data/visitor-analytics.sqlite3 node server/analytics/collector.mjs
curl -sS http://127.0.0.1:3025/health
curl -sS -X POST http://127.0.0.1:3025/api/visit \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://marcofernstaedt.com' \
  -d '{"visitor_id":"test-visitor","session_id":"test-session","path":"/","title":"test"}'
sqlite3 data/visitor-analytics.sqlite3 'select visitor_id,path,title from visits order by id desc limit 1;'
```

Commit:

```bash
git add server/analytics/collector.mjs
git commit -m "feat: add private visitor analytics collector"
```

---

## Task 4: Add Client Beacon Script

**Objective:** Replace the old Tailscale Funnel pixel with same-origin analytics calls.

**Files:**
- Create: `src/components/VisitorAnalytics.astro`
- Modify: `src/layouts/BaseLayout.astro`

**Approach:**
- Add an inline script or versioned static script.
- Generate/store first-party `visitor_id` and `session_id`.
- Send `POST /api/visit` on page load using `navigator.sendBeacon()` when possible, with `fetch(..., keepalive: true)` fallback.
- Send limited events for scroll milestones, visibility/pagehide, and safe link clicks.
- Do not send typed values or form data.

**Verification:**

```bash
npm run build
npm test
```

Then browser-verify network requests call `/api/visit`, not the old `:8448/pixel` URL.

Commit:

```bash
git add src/components/VisitorAnalytics.astro src/layouts/BaseLayout.astro tests/site-contract.mjs
git commit -m "feat: send visitor analytics to same-origin endpoint"
```

---

## Task 5: Add Reverse Proxy Route

**Objective:** Route `https://marcofernstaedt.com/api/visit` and `/api/event` to the local collector.

**Files:**
- Create: `deploy/Caddyfile.analytics.example`
- Create: `deploy/visitor-analytics.service.example`

**Caddy Pattern:**

```caddyfile
marcofernstaedt.com {
  handle /api/visit {
    reverse_proxy 127.0.0.1:3025
  }

  handle /api/event {
    reverse_proxy 127.0.0.1:3025
  }

  handle /health/visitor-analytics {
    uri replace /health/visitor-analytics /health
    reverse_proxy 127.0.0.1:3025
  }

  handle {
    reverse_proxy 127.0.0.1:3000
  }
}
```

**Important:** If the main site remains on Vercel, this exact same-origin route cannot be served by the VPS unless DNS/proxy architecture changes. In that case use `analytics.marcofernstaedt.com` with strict CORS as a compromise, or move the portfolio behind VPS/Caddy.

Commit:

```bash
git add deploy/Caddyfile.analytics.example deploy/visitor-analytics.service.example
git commit -m "docs: add visitor analytics deployment examples"
```

---

## Task 6: Add Private Summary CLI

**Objective:** Let Marco ask for visitor summaries without dumping raw SQLite manually.

**Files:**
- Create: `server/analytics/summary.mjs`

**Output:**
- Total visits.
- Unique visitors.
- Last 24 hours visits.
- Top pages.
- Recent visitors with raw IP shown only in terminal/local output.
- Owner/non-owner split if owner marker exists.

**Verification:**

```bash
node server/analytics/summary.mjs --last 20
```

Commit:

```bash
git add server/analytics/summary.mjs
git commit -m "feat: add private visitor analytics summary cli"
```

---

## Task 7: Remove Old Funnel Beacon

**Objective:** Ensure the portfolio no longer calls the disabled Tailscale Funnel route.

**Files:**
- Search all source files for `tail72f980`, `8448`, `/pixel`.
- Modify files only if found.

**Verification:**

```bash
grep -RInE 'tail72f980|8448|/pixel' src server tests docs package.json || true
npm run build
npm test
```

Expected: no production source calls old Funnel endpoint.

Commit:

```bash
git add .
git commit -m "chore: remove old tailscale funnel visitor beacon"
```

---

## Task 8: End-to-End Deployment Verification

**Objective:** Prove real visitor data lands in SQLite.

**Commands:**

```bash
curl -sS https://marcofernstaedt.com/ >/tmp/portfolio.html
curl -sS https://marcofernstaedt.com/health/visitor-analytics
sqlite3 data/visitor-analytics.sqlite3 'select received_at, raw_ip, path, user_agent from visits order by id desc limit 5;'
```

Browser checks:
- Open `https://marcofernstaedt.com`.
- Confirm `/api/visit` returns 204 or 200.
- Confirm no console errors.
- Confirm one row appears in SQLite.
- Confirm raw IP is present in SQLite.
- Confirm DB file is untracked by Git.

```bash
git status --short --ignored | grep -E 'visitor-analytics.sqlite3|data/'
```

Expected: database is ignored, not staged.

---

## Acceptance Criteria

- Public Tailscale Funnel `:8448` remains off.
- No browser calls to `srv1522777.tail72f980.ts.net:8448`.
- Visitor data is posted to a first-party endpoint.
- Raw IP is captured server-side and stored in private SQLite.
- Browser/device/session fields are stored with each visit.
- SQLite DB lives under repo runtime path but is gitignored.
- No secrets, raw IP exports, or DB files are committed.
- There is a local summary command for private review.
- The system works after reboot through systemd or equivalent keepalive.

---

## Blunt Constraint

If the portfolio stays purely static on Vercel, a raw-IP local SQLite database in the same repo will not be durable. To meet the request exactly, the analytics collector must run on a persistent server, preferably this VPS, and the public site/proxy must route analytics requests to it.

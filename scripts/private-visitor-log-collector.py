#!/usr/bin/env python3
"""Tiny privacy-safe visitor collector for marcofernstaedt.com.

Stores hashed IPs, browser-provided visitor IDs, page paths, referrers, and user agents
in local SQLite. Raw IPs are never written to disk.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

DATA_DIR = Path(os.environ.get("VISITOR_LOG_DIR", "/home/marco/.hermes/visitor-analytics"))
DB_PATH = Path(os.environ.get("VISITOR_LOG_DB", str(DATA_DIR / "visitors.sqlite3")))
CONFIG_PATH = DATA_DIR / "config.env"
ALLOWED_ORIGINS = {
    "https://marcofernstaedt.com",
    "https://www.marcofernstaedt.com",
    "https://marcofernstaedt-portfolio.vercel.app",
}

# Additional browser-provided fields. Still privacy-safe: no raw IPs, no secrets, no keystrokes.
EXTRA_COLUMNS = {
    "url": "TEXT",
    "search": "TEXT",
    "hash": "TEXT",
    "viewport": "TEXT",
    "color_depth": "TEXT",
    "pixel_ratio": "TEXT",
    "touch_points": "TEXT",
    "platform": "TEXT",
    "vendor": "TEXT",
    "cookies_enabled": "TEXT",
    "do_not_track": "TEXT",
    "online": "TEXT",
    "connection_type": "TEXT",
    "connection_downlink": "TEXT",
    "connection_rtt": "TEXT",
    "save_data": "TEXT",
    "device_memory": "TEXT",
    "hardware_concurrency": "TEXT",
    "nav_type": "TEXT",
    "visibility_state": "TEXT",
    "page_load_ms": "TEXT",
    "session_id": "TEXT",
    "visit_count": "TEXT",
}


def load_config() -> dict[str, str]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CONFIG_PATH.exists():
        import secrets
        CONFIG_PATH.write_text(
            "VISITOR_LOG_SALT=" + secrets.token_hex(32) + "\n" +
            "VISITOR_LOG_TOKEN=" + secrets.token_urlsafe(32) + "\n",
            encoding="utf-8",
        )
        os.chmod(CONFIG_PATH, 0o600)
    values: dict[str, str] = {}
    for line in CONFIG_PATH.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip()
    return values


CONFIG = load_config()
SALT = CONFIG["VISITOR_LOG_SALT"].encode("utf-8")
TOKEN = CONFIG["VISITOR_LOG_TOKEN"]


def db() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts_utc TEXT NOT NULL,
            received_ms INTEGER NOT NULL,
            visitor_id TEXT,
            owner_mark INTEGER NOT NULL DEFAULT 0,
            ip_hash TEXT NOT NULL,
            country TEXT,
            region TEXT,
            city TEXT,
            path TEXT,
            referrer TEXT,
            title TEXT,
            user_agent TEXT,
            language TEXT,
            screen TEXT,
            timezone TEXT,
            source_origin TEXT
        )
        """
    )
    existing = {row[1] for row in conn.execute("PRAGMA table_info(visits)").fetchall()}
    for column, col_type in EXTRA_COLUMNS.items():
        if column not in existing:
            conn.execute(f"ALTER TABLE visits ADD COLUMN {column} {col_type}")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_visits_ts ON visits(ts_utc)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_visits_owner ON visits(owner_mark)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_visits_session ON visits(session_id)")
    return conn


def now_utc() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def hash_ip(ip: str) -> str:
    return hmac.new(SALT, ip.encode("utf-8"), hashlib.sha256).hexdigest()[:24]


def truncate(value, limit: int = 500) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text[:limit] if text else None


def first_query(qs: dict[str, list[str]], key: str, limit: int = 500) -> str | None:
    return truncate((qs.get(key) or [None])[0], limit)


def payload_value(payload: dict, key: str, limit: int = 500) -> str | None:
    return truncate(payload.get(key), limit)


def extra_from_query(qs: dict[str, list[str]]) -> list[str | None]:
    limits = {"url": 1000, "referrer": 1000}
    return [first_query(qs, column, limits.get(column, 200)) for column in EXTRA_COLUMNS]


def extra_from_payload(payload: dict) -> list[str | None]:
    limits = {"url": 1000, "referrer": 1000}
    return [payload_value(payload, column, limits.get(column, 200)) for column in EXTRA_COLUMNS]


def client_ip(headers, address) -> str:
    # Tailscale Funnel and reverse proxies may pass one of these. Keep only first hop.
    for header in ["X-Forwarded-For", "X-Real-IP", "CF-Connecting-IP", "Fly-Client-IP"]:
        value = headers.get(header)
        if value:
            return value.split(",")[0].strip()
    return address[0]


class Handler(BaseHTTPRequestHandler):
    server_version = "ImperatorVisitorLog/1.0"

    def log_message(self, fmt, *args):
        # Keep stdout low-noise; SQLite is the source of truth.
        return

    def cors_origin(self) -> str:
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS or origin.endswith(".vercel.app"):
            return origin
        return "https://marcofernstaedt.com"

    def send_json(self, status: int, payload: dict):
        raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", self.cors_origin())
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_json(204, {})

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            self.send_json(200, {"ok": True, "service": "visitor-log"})
            return
        if parsed.path in {"/pixel", "/visit.gif"}:
            qs = parse_qs(parsed.query)
            ip = client_ip(self.headers, self.client_address)
            with db() as conn:
                conn.execute(
                    """
                    INSERT INTO visits (
                        ts_utc, received_ms, visitor_id, owner_mark, ip_hash, country, region, city,
                        path, referrer, title, user_agent, language, screen, timezone, source_origin,
                        url, search, hash, viewport, color_depth, pixel_ratio, touch_points, platform,
                        vendor, cookies_enabled, do_not_track, online, connection_type, connection_downlink,
                        connection_rtt, save_data, device_memory, hardware_concurrency, nav_type,
                        visibility_state, page_load_ms, session_id, visit_count
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        now_utc(), int(time.time() * 1000), first_query(qs, "visitorId", 120),
                        1 if (qs.get("owner") or [""])[0] == "1" else 0, hash_ip(ip),
                        truncate(self.headers.get("X-Vercel-IP-Country"), 80),
                        truncate(self.headers.get("X-Vercel-IP-Country-Region"), 80),
                        truncate(self.headers.get("X-Vercel-IP-City"), 120), first_query(qs, "path", 500),
                        first_query(qs, "referrer", 1000), first_query(qs, "title", 300),
                        truncate(self.headers.get("User-Agent"), 500), first_query(qs, "language", 80),
                        first_query(qs, "screen", 80), first_query(qs, "timezone", 120),
                        truncate(self.headers.get("Referer") or self.headers.get("Origin"), 200),
                        *extra_from_query(qs),
                    ),
                )
            # 1x1 transparent GIF
            raw = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
            self.send_response(200)
            self.send_header("Content-Type", "image/gif")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        if parsed.path == "/summary":
            qs = parse_qs(parsed.query)
            token = (qs.get("token") or [""])[0]
            if not hmac.compare_digest(token, TOKEN):
                self.send_json(403, {"ok": False, "error": "forbidden"})
                return
            with db() as conn:
                total = conn.execute("SELECT COUNT(*) FROM visits").fetchone()[0]
                non_owner = conn.execute("SELECT COUNT(*) FROM visits WHERE owner_mark=0").fetchone()[0]
                visitors = conn.execute("SELECT COUNT(DISTINCT visitor_id) FROM visits WHERE owner_mark=0 AND visitor_id IS NOT NULL").fetchone()[0]
                rows = conn.execute(
                    """
                    SELECT ts_utc, visitor_id, owner_mark, country, region, city, path, referrer, user_agent
                    FROM visits
                    ORDER BY id DESC
                    LIMIT 20
                    """
                ).fetchall()
            self.send_json(200, {
                "ok": True,
                "total_visits": total,
                "non_owner_visits": non_owner,
                "non_owner_unique_browser_ids": visitors,
                "recent": [
                    {
                        "ts_utc": r[0], "visitor_id": r[1], "owner_mark": bool(r[2]),
                        "country": r[3], "region": r[4], "city": r[5], "path": r[6],
                        "referrer": r[7], "user_agent": r[8],
                    } for r in rows
                ],
            })
            return
        self.send_json(404, {"ok": False, "error": "not_found"})

    def do_POST(self):
        if urlparse(self.path).path != "/visit":
            self.send_json(404, {"ok": False, "error": "not_found"})
            return
        try:
            length = min(int(self.headers.get("Content-Length", "0") or "0"), 16384)
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except Exception:
            self.send_json(400, {"ok": False, "error": "bad_json"})
            return

        ip = client_ip(self.headers, self.client_address)
        owner_mark = 1 if payload.get("owner") is True else 0
        with db() as conn:
            conn.execute(
                """
                INSERT INTO visits (
                    ts_utc, received_ms, visitor_id, owner_mark, ip_hash, country, region, city,
                    path, referrer, title, user_agent, language, screen, timezone, source_origin,
                    url, search, hash, viewport, color_depth, pixel_ratio, touch_points, platform,
                    vendor, cookies_enabled, do_not_track, online, connection_type, connection_downlink,
                    connection_rtt, save_data, device_memory, hardware_concurrency, nav_type,
                    visibility_state, page_load_ms, session_id, visit_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    now_utc(), int(time.time() * 1000), payload_value(payload, "visitorId", 120), owner_mark,
                    hash_ip(ip), truncate(self.headers.get("X-Vercel-IP-Country"), 80),
                    truncate(self.headers.get("X-Vercel-IP-Country-Region"), 80),
                    truncate(self.headers.get("X-Vercel-IP-City"), 120), payload_value(payload, "path", 500),
                    payload_value(payload, "referrer", 1000), payload_value(payload, "title", 300),
                    truncate(self.headers.get("User-Agent"), 500), payload_value(payload, "language", 80),
                    payload_value(payload, "screen", 80), payload_value(payload, "timezone", 120),
                    truncate(self.headers.get("Origin"), 200),
                    *extra_from_payload(payload),
                ),
            )
        self.send_json(200, {"ok": True})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3025)
    parser.add_argument("--summary", action="store_true")
    args = parser.parse_args()
    if args.summary:
        with db() as conn:
            total = conn.execute("SELECT COUNT(*) FROM visits").fetchone()[0]
            non_owner = conn.execute("SELECT COUNT(*) FROM visits WHERE owner_mark=0").fetchone()[0]
            unique = conn.execute("SELECT COUNT(DISTINCT visitor_id) FROM visits WHERE owner_mark=0 AND visitor_id IS NOT NULL").fetchone()[0]
            print(json.dumps({"total_visits": total, "non_owner_visits": non_owner, "non_owner_unique_browser_ids": unique}, indent=2))
        return
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"visitor-log listening on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()

# Obsidian blog publishing implementation plan

## Goal

Publish selected HomeLab writing from Marco's private Obsidian vault to the public Astro portfolio blog without exposing the vault, private ops notes, secrets, IP-heavy infrastructure details, or unfinished claims.

## Current source notes found

Source folder:

`/home/marco/obsidian-vault/03 - HomeLab Sprint/`

Candidate notes:

1. `Project 01 - Pi-hole + Unbound.md`
   - Strong public candidate.
   - Has real metrics, build log, concepts learned, resume line, LinkedIn copy, and TikTok copy.
   - Needs public sanitization before upload because it contains local/Tailscale IPs, internal script paths, cron IDs, and operational details that do not belong on the public site.

2. `Archive/Project 02 - Wireshark Lab.md`
   - Weak/unfinished public candidate as written.
   - It is archived and explicitly says the packet capture still needs elevated capture permission and should not be presented as finished.
   - Can be uploaded only as an honest learning writeup: "Wireshark packet capture lab setup and permission blocker," not as a completed lab.

## Non-negotiable safety rules

- Do not publish the whole Obsidian vault.
- Do not publish exact private/local/Tailscale IPs.
- Do not publish script paths, cron IDs, local usernames, credentials, or secret locations.
- Do not publish operational commands that expose private infrastructure topology unless rewritten generically.
- Do not present unfinished labs as completed proof.
- Every public article must be reviewed from the generated Markdown before deploy.

## Target architecture

Keep the public site simple:

- Astro remains the blog engine.
- Public posts live in `src/content/blog/*.md`.
- Obsidian remains private source material.
- A controlled exporter converts approved sections into public-safe Markdown.
- Git/Vercel remains the publishing path.

## Proposed generated posts

### Post 1

Slug:

`pihole-unbound-recursive-dns-homelab`

Title:

`Building a Pi-hole and Unbound Recursive DNS Homelab`

Public framing:

- Problem: normal DNS sends full lookup history to upstream providers.
- Build: Pi-hole for DNS filtering plus Unbound for recursive resolving.
- Skills shown: DNS, Linux service setup, troubleshooting, blocklist management, metrics, documentation.
- Metrics: publish rounded numbers only.
- Remove private IPs and internal automation paths.

### Post 2

Slug:

`wireshark-packet-capture-lab-lessons`

Title:

`What a Wireshark Packet Capture Lab Teaches Before the Capture Even Works`

Public framing:

- This was a lab setup and troubleshooting note, not a finished portfolio proof.
- The useful lesson is capture permissions, traffic generation, DNS/ICMP filters, and how to document blockers honestly.
- Do not claim completed packet evidence until real captures/screenshots exist.

## Blog hardening implementation

### 1. Expand Astro blog schema

Update `src/content.config.ts` to support:

- `title`
- `description`
- `category`
- `pubDate`
- `updatedDate`
- `draft`
- `featured`
- `tags`
- `source`
- `publicReviewed`

### 2. Strengthen tests

Extend `tests/site-contract.mjs` to check:

- no hidden primary content CSS.
- every published post has required frontmatter.
- no `TODO`, `FIXME`, or placeholder markers in public posts.
- no private file paths like `/home/marco`, `.hermes`, `.env`, `Vaultwarden`.
- no private IP ranges or Tailscale 100.x IPs in public posts.
- no archived/incomplete post is published unless it is explicitly framed as a lesson/blocker.

### 3. Add exporter script

Create:

`scripts/export-obsidian-blog.mjs`

Inputs:

- `/home/marco/obsidian-vault/03 - HomeLab Sprint/Project 01 - Pi-hole + Unbound.md`
- `/home/marco/obsidian-vault/03 - HomeLab Sprint/Archive/Project 02 - Wireshark Lab.md`

Outputs:

- `src/content/blog/pihole-unbound-recursive-dns-homelab.md`
- `src/content/blog/wireshark-packet-capture-lab-lessons.md`

The exporter should not blindly copy notes. It should transform them into public articles using allowlisted sections and redaction rules.

### 4. Review generated output

Before deploy:

- Read both generated Markdown files.
- Confirm public framing is honest.
- Confirm no private details leaked.
- Confirm article pages build locally.

### 5. Deploy

Run:

```bash
npm test
npm run build
git diff --check
git add .
git commit -m "Add HomeLab blog publishing workflow"
git push
npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

Verify:

- `https://marcofernstaedt.com/blog/`
- `https://marcofernstaedt.com/blog/pihole-unbound-recursive-dns-homelab/`
- `https://marcofernstaedt.com/blog/wireshark-packet-capture-lab-lessons/`

## Recommended order

1. Finish CSS visibility fix and deploy it first.
2. Harden blog tests/schema.
3. Generate the two HomeLab posts.
4. Review generated public Markdown.
5. Deploy posts.
6. Only after this works, generalize the exporter for future Obsidian blog posts.

## Blunt recommendation

Publish the Pi-hole/Unbound article immediately after sanitization.

Publish the Wireshark article only as a blocker/lesson article unless Marco captures real packets first. Calling it completed would be false, and false proof kills credibility.

# Blog implementation plan

## Current state

The new portfolio is an Astro static site. Blog/writeup content already exists as Markdown under `src/content/blog/` and is rendered through Astro content collections.

Current working paths:

- Blog index: `src/pages/blog/index.astro`
- Blog article route: `src/pages/blog/[...id].astro`
- Blog schema: `src/content.config.ts`
- Article layout: `src/layouts/PostLayout.astro`
- Source posts: `src/content/blog/*.md`

## Recommended direction

Keep the blog as static Markdown-first Astro content. Do not add a CMS yet.

Reason:

- Static Markdown is fast, cheap, and reliable on Vercel.
- The current codebase already supports it.
- The content can be reviewed in Git before publishing.
- No database, auth panel, or private admin surface is needed.
- It is safer for job-search credibility than an overbuilt CMS.

## Phase 1: Harden the existing blog

1. Expand the frontmatter schema in `src/content.config.ts`:
   - `title`
   - `description`
   - `category`
   - `pubDate`
   - `updatedDate`
   - `draft`
   - `featured`
   - `tags`
   - `audience`
   - `canonicalUrl`
2. Add validation rules:
   - draft posts are hidden.
   - title and description are required.
   - future-dated posts stay hidden unless explicitly allowed.
   - no `TODO` placeholders in published posts.
3. Add `npm test` with a small contract script that checks:
   - every published post has valid frontmatter.
   - every published slug builds.
   - no secrets or private file paths appear in published Markdown.
   - no placeholder links remain.
4. Add RSS feed and sitemap support.
5. Add category and tag display on `/blog`.

## Phase 2: Editorial workflow

Use Git as the approval system:

1. Draft posts live in `src/content/blog/` with `draft: true`.
2. A post is published only by changing `draft: false` and merging to `main`.
3. Every post gets reviewed for:
   - no secrets.
   - no private infrastructure details.
   - no fake claims.
   - clear help-desk or engineering value.
   - screen-reader-friendly structure.
4. Deploy remains automatic through Vercel after push to `main`.

## Phase 3: Obsidian-to-blog bridge

Keep the private Obsidian vault private. Export only approved public writing.

Recommended vault lane:

- `05 - Public Writing/Drafts/`
- `05 - Public Writing/Approved/`
- `05 - Public Writing/Published/`
- `05 - Public Writing/Templates/`

Build a script later:

- Input: approved Markdown notes from the public-writing vault lane.
- Output: copied and normalized Markdown in `src/content/blog/`.
- Gate: only export notes with `public: true` and `status: approved`.
- Reject: secrets, private paths, local IPs, `.env` values, or placeholder text.

## Phase 4: Content strategy

Primary content should support Marco's current job-search lane:

- Service desk troubleshooting guides.
- Password reset and account lockout procedures.
- Microsoft 365 and Outlook fixes.
- VPN, printer, workstation, and network-drive triage.
- Short project writeups showing hands-on systems thinking.

Best format:

1. Problem.
2. Fast triage checklist.
3. Likely causes.
4. Fix steps.
5. Escalation criteria.
6. What this proves about Marco.

## Near-term implementation order

1. Add test/validation script.
2. Add richer frontmatter schema.
3. Add RSS and sitemap.
4. Add tags/categories.
5. Add Obsidian export only after the static blog is hardened.

## Anti-patterns to avoid

- Do not publish the whole Obsidian vault.
- Do not add a database for this version.
- Do not add a private admin CMS until there is a real reason.
- Do not publish agent internals, local automation paths, private IPs, or credentials.
- Do not let AI-generated content ship without review.

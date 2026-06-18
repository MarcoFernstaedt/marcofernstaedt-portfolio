# Marco Fernstaedt — Portfolio

Static portfolio and writeups site built with Astro. Dark theme by default with a
light toggle that respects the visitor's system preference.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL it prints. Edit content, and the site reloads.

## Add a writeup (knowledge base article)

1. Create a new Markdown file in `src/content/blog/`, for example `printer-checklist.md`.
2. Add frontmatter at the top:

```markdown
---
title: "A practical checklist for printer issues"
description: "One sentence summary."
category: "Hardware"
pubDate: 2026-02-20
---

Your article body in plain Markdown.
```

3. Save. It appears automatically on `/blog` and in the writeups list on the homepage.
   Set `draft: true` in frontmatter to hide one while you work on it.

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Deploy that, or connect the repo to Netlify, Cloudflare
Pages, or GitHub Pages.

## Things to fill in

- Replace the placeholder text in projects with your real outcomes and numbers.
- Point each project's GitHub link at the specific repo for that project.
- The custom domain is set in `public/CNAME` and `astro.config.mjs`.

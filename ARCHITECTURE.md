# ARCHITECTURE.md — NTWKKM Personal Website

## Overview

Static personal website hosted on GitHub Pages (`ntwkkm.github.io`). Serves as a professional portfolio for an Emergency Medicine physician & Clinical Informatics developer.

## Pages

| File         | Purpose                                                    |
| ------------ | ---------------------------------------------------------- |
| `index.html` | Homepage — paper slider + project portfolio grid           |
| `blog.html`  | Research blog reader — sidebar list + article detail view  |

## Data Flow

```text
n8n Automated:
  ├── papers.json          → Fully replaced on each run (index.html slider)
  └── research_blog_2.json → Active blog entries (new data goes here)

Manually Maintained:
  ├── research_blog.json   → Legacy blog entries (large file, no longer updated by n8n)
  ├── blog_index.json      → File list for blog.html to load (manually add new JSON filenames)
  └── projects.json        → Project cards (edit to add/remove projects)
```

### Key Rules

- `papers.json` — **Automated.** Fully replaced on each n8n run (1-2x/day).
- `research_blog_2.json` — **Automated.** n8n workflow was manually redirected here after `research_blog.json` grew too large (~750KB, 292 items).
- `research_blog.json` — **Frozen.** Original blog data file. No longer updated by n8n.
- `blog_index.json` — **Manual.** Lists which JSON files `blog.html` should load. Must be updated manually when adding a new blog JSON file.
- `projects.json` — **Manual.** Edit directly to add/remove project cards.

> **Note:** There is currently no automated workflow to monitor JSON file sizes or create new split files. If `research_blog_2.json` grows too large in the future, the process is: (1) create `research_blog_3.json`, (2) redirect n8n to the new file, (3) add the filename to `blog_index.json`.

## Theming

Both pages use `data-theme="light|dark"` on `<html>` element with `localStorage.theme` persistence. Theme selection syncs seamlessly between pages.

### CSS Architecture

- `shared.css` — Common styles (reset, theme toggle, skip-to-content, reduced-motion)
- `index.html <style>` — Homepage-specific styles (paper slider, portfolio grid, header)
- `blog.html <style>` — Blog-specific styles (sidebar, article view, search, filters)

## Security

All JSON data is sanitized before DOM injection via:

- `escapeHTML(str)` — escapes `<`, `>`, `&`, `"` entities
- `sanitizeURL(url)` — validates `http:` / `https:` protocol only

## Caching

- JSON fetches include `?v=${Date.now()}` cache-buster to ensure freshness after n8n updates
- `blog.html` has a 5-minute `localStorage` cache (`research_blog_data`)

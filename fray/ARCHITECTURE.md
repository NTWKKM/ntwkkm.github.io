# Fray Dashboard — Architecture

> Live at https://ntwkkm.github.io/fray/
> Served via GitHub Pages from `main` branch.

## Core Components

1. **index.html** — Single-page dashboard shell. Static HTML with skeleton loading state. Panel order: Sage → Outsider → Companion → Fleet Table → Historian. Day tabs (Today + 6 history days) switch data sources.
2. **fray-dashboard.js** — Client-side rendering engine. Fetches `dashboard-snapshot.json` every 30s. Renders vitals strip (CPU/RAM/Disk/Network/n8n/Gateway/Token), Sage alerts, Outsider quote, Companion briefing, fleet table, and Historian chronicle. Supports history day switching via `history/YYYY-MM-DD.json`.
3. **fray-dashboard.css** — Theme tokens (light/dark), layout grid, vitals cards, panels, fleet table, alert cards, loading skeletons, responsive breakpoints. All component styles externalized; no inline styles in JS-generated HTML.
4. **dashboard-snapshot.json** — Live telemetry payload. Written by HERALD cron → n8n webhook → git commit. Schema v1.0.0 with sections: observer, sage, outsider, historian, archivist, companion.
5. **history/*.json** — Daily snapshots archived by HERALD. One file per day (`YYYY-MM-DD.json`). Retrieved on-demand when user clicks a day tab.
6. **shared.js / shared.css** — Site-wide utilities (debounce, fetchWithFallback, escapeHTML, sanitizeURL, theme toggle, a11y). Lives at repo root, shared with index.html and blog.html.

## Data Flow

1. **HERALD cron** (Hermes Agent, daily ~07:15 ICT) → collects fleet data from OBSERVER, SAGE, OUTSIDER, COMPANION, HISTORIAN, ARCHIVIST snapshots
2. **HERALD → n8n webhook** → n8n workflow writes `dashboard-snapshot.json` + archives current to `history/YYYY-MM-DD.json` → git commit + push to `main`
3. **GitHub Pages** serves static files at `ntwkkm.github.io/fray/`
4. **Browser** loads `index.html` → `fray-dashboard.js` fetches `dashboard-snapshot.json?v={timestamp}` → renders all panels → polls every 30s

## Warnings

- **Gateway zombie detection**: If `observer.gateway.log_fresh === false`, the gateway bar turns red and shows "ZOMBIE" regardless of health string. This is intentional — stale log = silent Telegram blackout.
- **History file availability**: Day tabs for dates without a `history/YYYY-MM-DD.json` file will show empty states. The tab gets grayed out (`.missing` class). History files are only created when HERALD runs successfully.
- **Cache busting**: All JSON fetches use `?v={Date.now()}` to bypass GitHub Pages CDN cache. Without this, stale data would persist for up to 10 minutes.
- **Schema drift**: The JS handles both legacy string-based fields and structured object fields (e.g., sage.alerts can be `string[]` or `{severity, component, message}[]`). Do not assume a single shape.
- **Memory total mismatch**: `observer.memory_total_gb` may report 16 (virtual) on 8GB hardware due to swap. Sage alerts provide the real hardware context.
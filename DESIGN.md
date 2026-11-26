# NTWKKM Design System & Guidelines (DESIGN.md)

Last updated: *2026-11-21* (ADR-030, Grid redesign)

This document is the **core design guideline** for any AI agent or developer changing or creating interfaces in this repository (`index`, `blog`). Every UI change MUST follow it. The separately maintained `/pl/` sub-app follows its own guidelines in the private `NTWKKM/pl` repository.

---

## 1. Core Philosophy

- **Grid, a Swiss poster material**: a white sheet, a blue-black ink, one neo-grotesque in two optical cuts, and two flat colours with separate jobs. Structure comes from the twelve-column system: type hung from column lines, fields that start and stop on them, big jumps in scale, white held on purpose.
- **Three roles and the paper**: **Field** (ultramarine) floods a sheet, full width or from a column line to the bleed. **Mark** (Swiss red) marks the one chosen or current thing: the wordmark square, the active pager mark, a hovered link, the reading progress bar. **Ink** sets type and the primary control. Red never sits on the ultramarine; two fields never touch.
- **Lists before cards**: repeating content (papers, tools, summary sections) is set as ruled rows. No boxed cards, no shadows on in-flow content, radius 0 everywhere. Sections part by space or a change of paper, never by a rule above the section; the only lines are 1px hairlines between rows.
- **Motion with a reason**: on desktop (`min-width: 60rem` and `min-height: 640px`), the homepage behaves as a four-slide presentation deck (`scroll-snap-type: y mandatory` on `html`; `scroll-snap-align: start; scroll-snap-stop: always` on `.deck-slide`) paired with a right-edge Swiss square slide rail (`.slide-rail`, adapting colour to each slide's surface via `data-surface`, keeping red off ultramarine) synced via `scrollsnapchange` with an `IntersectionObserver` fallback. Scroll-driven transitions link every slide: the stuck hero (`animation-timeline: scroll(root)`), papers sheet entry/exit (`animation-timeline: view(block)`), the tools band's slanted top-edge wipe and staggered groups/cards, and the closing poster sheet, all playing cleanly in both directions; non-view-timeline browsers receive a subtle active-slide settle fallback under `.js`. Layered over a load entrance (about 0.9s once on the hero children), reader summary sections that settle on each paper change, and state motion on hover (a colour step, an arrow nudge of 2 to 3px, a 1px underline that draws left to right and leaves to the right, linked tool rows that lift 2px with an icon square that fills with field-ink, buttons that step up 1px on hover and sink 1px and scale 0.985 on press). Content is visible with scripting off; under `prefers-reduced-motion: reduce` every motion shows its end state at once. Never parallax, auto-scroll, auto-rotating carousels or infinite loops other than the skeleton loader.
- **First-class dark mode**: re-derived, never inverted. Paper `oklch(17% 0.014 266)`, surfaces step lighter as they rise, ink `oklch(94% 0.008 90)`, body weight drops to 350, the field and mark lift in L and lose chroma, shadows are off.

---

## 2. Typography

- **Display** (`var(--font-display)`): Radio Canada Big, weight 700, sentence case, tracking `-0.035em` (`-0.045em` at poster size), line-height 0.92 at poster size, 1.05 at section size. Item titles (paper and tool titles) use the display cut at 500.
- **Body and labels** (`var(--font-body)`): Radio Canada 400 for prose, 500 for labels, captions, nav links and meta, a step smaller, sentence case, untracked. No capitals in a label.
- **Thai** (`var(--font-thai)`, also `.thai-text` / `lang="th"`): Sarabun 400 and 600 with line-height 1.75.
- **Dates and counts**: the body face with `font-variant-numeric: tabular-nums` (`.mono` and `<time>` map here). `var(--font-mono)` is the system monospace stack, used only for the citation text box and the search key hint.

Fonts are self-hosted woff2 files in `assets/fonts/`, declared by `@font-face` at the top of `shared.css` with `font-display: swap`. Do not add a `<link>` to an external font service. A new weight or script means a new file there, a matching `@font-face`, and its name in the `FONTS` list of `sw.js` (bump `FONTS_CACHE`).

Scale tokens (homepage): `--type-poster` (hero head, about 106px at 1440), `--type-display` (the hero figure), `--type-section` (h2, about 52px at 1440), `--type-title`, `--type-lead`, `--type-body`, `--type-small`. The reader keeps the legacy `--text-xs` to `--text-xl` names. Running text is never below 13px.

---

## 3. Color Palette & CSS Variables

All colours MUST be tokens declared in `shared.css` (`:root` and `[data-theme="dark"]`), in OKLCH. **No literal colour or `font-family` outside the token block**; `lint-css.js` enforces it.

### 3.1. Light

| Token | Value | Role |
| --- | --- | --- |
| `--color-paper` | `oklch(97.5% 0.005 90)` | the sheet |
| `--color-paper-2` / `-3` | `oklch(94.2% …)` / `oklch(90.5% …)` | wells, sidebar, active row |
| `--color-ink` | `oklch(19% 0.022 266)` | type, primary control |
| `--color-ink-2` | `oklch(31% 0.02 266)` | secondary text |
| `--color-muted` | `oklch(47% 0.016 266)` | meta, captions |
| `--color-rule` | `oklch(87.5% 0.008 90)` | hairlines between rows |
| `--color-edge` | `oklch(58% 0.014 266)` | control edges, 3:1 on paper |
| `--color-field` / `--color-accent` | `oklch(44% 0.2 266)` | ultramarine flood, links |
| `--color-field-ink` | `oklch(97.5% 0.005 90)` | type on the field |
| `--color-mark` | `oklch(57% 0.215 29)` | Swiss red, marks and fills |
| `--color-mark-text` | `oklch(51% 0.2 29)` | red as small text (hover) |
| `--color-focus` | `oklch(46% 0.2 266)` | 2px focus ring |

### 3.2. Dark

Re-derived in `[data-theme="dark"]` from the same hues; see `shared.css` for values. Elevation is lighter paper, never a shadow.

### 3.3. Legacy aliases

`--bg-body`, `--bg-card`, `--text-main`, `--text-muted`, `--border`, `--primary`, `--accent-vermilion*`, `--accent-teal*` and the rest remain in `shared.css` as aliases of the Grid tokens so `blog.css` keeps its roles: vermilion maps to the mark, teal to the ultramarine. New work uses the `--color-*` names.

---

## 4. UI Components & Patterns

### 4.1. Rows and surfaces

- **Radius** 0. **Borders**: 1px `--color-rule` hairlines between rows; the first row of a list takes an ink hairline. No boxed cards; the one well is `.section-clinical-relevance` on `--color-paper-2` with no border.
- **Hover**: a paper title or link turns `--color-mark-text` and underlines; an external arrow nudges 2px up and right. Rows never lift or gain shadows.
- **Spacing**: `--space-*` (2 to 144px) on the homepage, the legacy `--s-*` 4px scale in the reader.

### 4.2. Navigation & Masthead

- **Homepage nav**: edge-aligned, 80px: the wordmark left on one line (`.wordmark--line`: red square, `NTWKKM`, `Research archive`, 44px tall; under 26rem only the name), the skip link hidden on the container line inside the bar until focused, then `Research Blog`, `#theme-toggle` and GitHub right, each a 44px target.
- **One screen per section**: from 768px up the hero, papers, tools and close are each exactly one screen (`min-height: 100svh`, content sized to fit, bottom padding 72px); on phones papers and tools grow with their content, the hero and close stay one screen. The nav lies over the top of the hero (`.masthead` absolute), so the hero starts at the page's top edge.
- **Papers**: six to a page as a three-by-two grid of ruled cells (two across from 40rem, one on phones). `index.js` keeps every title and Thai note whole in `data-full` and shows it shortened at a word boundary to what its cell holds (`fitPaperText` with `textBudget`, from the grid width), worked out again on every resize; phone width shows the whole text; the full title is also on the link's `title` and `aria-label`; CSS line-clamp (3 lines, 2 on short screens) guards between resizes.
- **Homepage hero**: fills the first screen (`min-height: 100svh`), inside `main` as its first section; the head at the top, the lead, actions and figures at the foot. `h1.hero-title` hangs from column 1 at `--type-poster`; `.hero-field` floods from the column 8 line to the right edge; `.hero-overprint` (an `aria-hidden` copy) shows the heading in field-ink where it crosses the field. `#hero-figure` shows the live count from `papers.json` and `#hero-blog-figure` the reader's count from `data/blog/pmids.json`, linking to `blog.html` (each hidden until loaded, never a typed number). `.hero-field` is a layer over the whole hero cut by `clip-path` to a slanted band (the edge leans by `--slant`, street-poster style: its foot on the column 7 line less the slant, never closer than 560px to the container edge so the lead stays on paper); the white copy of the head (`.hero-overprint`) lives inside it, so letters turn white exactly where the band crosses them, whatever its position. On screens at least 60rem wide and 640px tall, in browsers with scroll timelines and without reduced motion, the hero sticks to the top and is choreographed by scroll (`animation-timeline: scroll(root)`, 0 to 80vh): it drifts up 2% and shrinks to 0.95, the band winds in 40px then eases 18vw back to the right along its slant without leaving (registered property `--field-shift`), the head drifts up 24px whole and dims to 0.4, the copy and figures fade; scrolling up plays it back. Smaller screens keep the hero still. Under 60rem the field stops bleeding and the figure becomes its own ultramarine block.
- **Tools**: `#works-section` is the ultramarine field band set as a dense index: from 768px, two columns (1.25fr and 1fr), Clinical tools spanning two rows on the left, Simulators and Research & statistics on the right, Knowledge & notes full width in three columns. Each row is a 40px outlined icon, title and description, and an arrow. On scroll (view timelines, both directions, all widths, off under reduced motion) the band's top edge enters on the hero's slant (`--tilt`) and flattens, each group rises 48px into place (done by half its entry) and each row slides in 32px from the left (done by 70% of its entry), so everything on screen is at rest once the band reaches the top; `.paper-track` keeps `position: relative` so slide `offsetLeft` matches `scrollLeft`.
- **Close** (`footer.site-footer.closing`): one screen on the ink from 60rem up (content height below): the h2 and the main action word for word (`Open the research reader`, the paper-on-ink button), then `NTWKKM` set across the container (`clamp(3.5rem, 17.5vw, 15.75rem)`, a red square before it) as the back-to-top link (`#back-to-top` → `#top` on the masthead; smooth scroll, instant under reduced motion, focus to the top wordmark, no hash left; the square turns a quarter on hover, focus and tap), then the copyright line over a hairline. Papers and tools sections are at least one screen tall.
- **Reader** (`blog.html`): the brand link carries the red square in the sidebar header; `.toolbar-home` appears when the sidebar is collapsed or on narrow screens, leftmost in `.reader-toolbar` before `#sidebar-open-btn`. It carries the wordmark's red square (`::before`, no icon) that turns a quarter on hover and focus, as on the homepage.
- **Favicons / PWA icons**: unchanged from before the redesign (`#1e3c72` square, `#F0EDE5` letter); `manifest.json` background and theme colours follow the paper.

### 4.3. Badges and Chips

- Specialty chips (`.tag-badge`) take the ultramarine as text; status labels on the field (`.project-status`) are field-ink outlined; filter chips stay neutral and switch to ink fill with paper text when `aria-pressed="true"`.
- Filter `<button>`s carry `aria-pressed`.

### 4.4. AI Provenance Note

- Any block of AI-written text (reader summary, homepage paper comments) carries one `.ai-note` line: `--text-sm`, `--color-muted`, sentence case, no icon, no tint. It says what the AI did and tells the reader to check the original paper.
- A date beside AI-summarised content is labelled for what it is (`Added 12 Nov 2026`), never left bare where it could be read as a publication date.

### 4.5. Buttons & Controls

- **Hero primary** (`.hero-primary`): a square ink block with paper text, 52px tall, full width on phones; paper on ink in the close. One per view.
- **Standard Button** (`.btn`): paper, 1px `--color-edge` border, 40px (44px on touch). **Primary** (`.btn.btn-primary`): ink fill, paper text.
- **Secondary**: text with a 1px underline that turns red on hover.
- **Icon Button** (`.icon-btn`): 36px square (44px in the masthead and on coarse pointers), borderless, always with an `aria-label`.
- **Pager**: square marks, the current one red and scaled 1.5; at `<= 40rem` a count (`1 / 12`) between two 44px buttons replaces them.
- Every clickable thing is a `<button>` or `<a>`; `:focus-visible` shows a 2px `--color-focus` ring (field-ink on the ultramarine); `:disabled` is 45% opacity.

---

## 5. AI Agent Instruction Checklist

1. [ ] Use the Grid tokens from `shared.css` (`--color-paper`, `--color-ink`, `--color-field`, `--color-mark`, …). No literal colour and no literal `font-family` outside the token block.
2. [ ] `var(--font-display)` for heads and item titles, `var(--font-body)` for UI and prose, `var(--font-thai)` for Thai; dates and counts take `tabular-nums`.
3. [ ] Radius 0, no shadows on in-flow content, hairlines only between rows.
4. [ ] Red marks one chosen thing; it never sits on the ultramarine; two fields never touch.
5. [ ] Motion: never `transition: all`, animate only `transform`, `opacity` and colours; every animation ends visible and has a reduced-motion fallback; scroll-driven motion in the hero, papers, tools band and footer.
6. [ ] Responsive at 320, 768 and 1440, and both themes re-derived, never inverted.
7. [ ] Run `node .github/scripts/lint-css.js` (also in CI before every deploy) and `node ~/.claude/skills/hallmark/scripts/sloplint.mjs index.html index.css shared.css --genre editorial --render` when available; keep the stamp and waiver lines at the top of `shared.css`, `index.css` and `blog.css`.
8. [ ] Every link that opens in a new tab (`target="_blank"`) MUST define `rel="noopener noreferrer"`.

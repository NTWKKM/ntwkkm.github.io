# NTWKKM Design System & Guidelines (DESIGN.md)

Last updated: *2026-11-12*

This document serves as the **core design guideline** for any AI agent or developer modifying or creating new interfaces maintained in this repository (`index`, `blog`). All UI implementations MUST adhere strictly to these principles to maintain a cohesive, premium, and matte aesthetic across these modules. Note that the separately maintained `/pl/` sub-app follows its own dedicated design guidelines in the private `NTWKKM/pl` repository.

---

## 1. Core Philosophy

- **Modern Apple / iPadOS Slate & Titanium Navy**: The design language pairs a crisp, digital **Modern Apple / iPadOS Slate** light theme with a deep **Titanium Precision Navy** dark theme. It delivers the clean, tactile feel of modern clinical operating systems (iPadOS / macOS HIG) with strict WCAG AAA contrast standards.
- **Lists Before Cards**: Repeating content (papers, tools, summary sections) is set as ruled lists and ledger rows: a narrow rail for the label or date, the content beside it. A card (white surface, 1px border) is reserved for a grouped list or the one item that must stand out, such as Clinical relevance. Shadows are for floating layers only (dialog, drawer, update bar).
- **Nothing Moves By Itself**: No auto-scroll, no scroll-triggered reveals. Motion answers the pointer or a state change and lasts 0.15 to 0.25s.
- **Interactive & Quiet**: Elements react smoothly to user hover (subtle border color highlights and shadow shifts) while preserving strict layout stability.
- **First-Class Dark Mode (Ergonomic Navy)**: Dark mode preserves the signature deep navy canvas (`#121E36`) with elevated surfaces (`#1C2D4F`). To prevent eye fatigue and glare during long clinical sessions, text is rendered in soft slate white (`#E2E8F0`, contrast 10.8:1 PASS AAA) instead of harsh 100% white.
- **Accent Restraint**: Only ONE accent color (`--signal-orange`) exists. It must be used sparingly for high-priority or critical items only (e.g., status errors, highlights). Do not use it decoratively or for standard call-to-actions.

---

## 2. Typography

We use a multi-font stack to separate UI labels, prose, Thai text, and technical data:

- **Primary Text (UI & English Prose)**: `Inter Tight`, `Neue Haas Grotesk`, sans-serif
- **Secondary Text (Thai Language)**: `Sarabun`
- **Technical Data (Metrics, Logs, IDs, Status, Barcodes)**: `JetBrains Mono`, `Courier New`, monospace

Use the tokens, never a literal family: `var(--font-ui)`, `var(--font-thai)` (also applied by `.thai-text` / `lang="th"`, with 1.75 line height), `var(--font-mono)` (also `.mono` and `<time>`). Sizes come from `--text-xs` (12px) to `--text-xl`; running text is never below 12px. Labels and section headings are sentence case, untracked, never uppercase.

---

## 3. Color Palette & CSS Variables

All colors MUST be referenced via CSS variables defined in `:root` and `[data-theme="dark"]`. **Do not hardcode HEX or RGB values** in component styles.

### 3.1. Light Theme (Modern Apple / iPadOS Slate)

- Canvas Background (`--bg-body`): `#ECECEE` (Neutral Cool Gray)
- Card Container (`--bg-card`): `#FFFFFF` (Pure White)
- Primary Text (`--text-main` / `--ink`): `#1d1d1f` on Card `#FFFFFF` (Contrast: 16.83:1, PASS WCAG AAA)
- Secondary Text (`--text-secondary` / `--graphite`): `#333333` on Canvas `#ECECEE` (Contrast: 10.71:1, PASS WCAG AAA)
- Muted Text (`--text-muted`): `#636368` (5.0:1 on Canvas, 5.9:1 on Card, PASS WCAG AA Normal Text)
- Card Border (`--border` / `--rule`): `1px solid #D8D8DC`
- Border Strong (`--border-strong`): `#8E8E93` (edges of inputs and buttons, 3:1 on white)
- Card Shadow (`--shadow`): `0 4px 20px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)`
- Surface Contrast (Canvas vs Card): 1.18:1 (Clean, modern card separation)
- Accent Signal (`--signal-orange`): `#d84315`; as small text use `--signal-ink` `#b5360f` (5.9:1 on white)
- Shared Card Hover Tokens: `--card-hover-bg: #F8F8FA`, `--card-hover-border: #1E3C72`, `--card-hover-icon-bg: rgba(30, 60, 114, 0.08)`

### 3.2. Dark Theme (Titanium Precision Navy - Ergonomic Tone 1)

- Canvas Background (`--bg-body`): `#121E36` (Signature Deep Navy)
- Card Container (`--bg-card`): `#1C2D4F` (Elevated Navy Surface)
- Primary Text (`--text-main`): `#E2E8F0` on Card `#1C2D4F` (Soft Slate White, Anti-glare, Contrast: 10.8:1, PASS WCAG AAA)
- Secondary Text (`--text-secondary`): `#B4C0D3` on Card `#1C2D4F`
- Muted Text (`--text-muted`): `#94A3B8` on Card `#1C2D4F` (Contrast: 5.5:1, PASS WCAG AA Normal Text)
- Card Border (`--border` / `--rule`): `1px solid #2B406A`
- Border Strong (`--border-strong`): `#5C78AD`
- Card Shadow (`--shadow`): `0 4px 20px rgba(6, 12, 24, 0.55), 0 1px 3px rgba(6, 12, 24, 0.30)`
- Surface Contrast (Canvas vs Card): 1.26:1 (Sharp clinical layer separation)
- Accent Signal (`--signal-orange`): `#FF7A45`
- Primary Link/Action (`--primary`): `#93c5fd`
- Shared Card Hover Tokens: `--card-hover-bg: #243B68`, `--card-hover-border: #4E78BC`, `--card-hover-icon-bg: rgba(147, 197, 253, 0.20)`

### 3.3. Category / Tag Colors

Muted tones, applied **text-only** (never as solid background badges).

- Ochre: `#b8873a` (e.g., Neuro)
- Slate: `#3a5566` (e.g., Cardiac, Pulmonary)
- Olive: `#5a6b3b` (e.g., Anticoag, Procedural)
- Brick: `#8a3a2a` (e.g., Tox)
- Graphite: `#4a4a4a` (e.g., Tools)

---

## 4. UI Components & Patterns

### 4.1. Cards & Panels

- **Border Radius**: `--radius: 4px` for outer cards, `--radius-sm: 2px` for inner elements, to give a harder industrial edge.
- **Borders**: Thin `1px solid var(--border)`.
- **Hover:** a list row changes its background to `var(--card-hover-bg)`; a title link turns `var(--primary)` and underlines; an external-link arrow nudges 2px up and right. Rows and cards do not lift or gain shadows. `.btn` darkens its border to `var(--card-hover-border)` and steps 1px down on press.
- **Active list item** (`.article-list-item.active`): `var(--bg-paper-list)` background with a 3px inset left edge of `var(--text-main)`.
- **Spacing:** the 4px scale tokens `--s-1` to `--s-16` only.

### 4.2. Navigation & Masthead

- **No Gradient Topbar:** Neither the homepage nor the reader uses a full-bleed navy gradient bar. Both pages sit directly on `--bg-body` (`#ECECEE` light / `#121E36` dark).
- **Homepage Masthead:** The homepage opens with an editorial masthead (`NTWKKM` display title and subtitle left, quiet right-aligned controls for `Research Blog`, `#theme-toggle`, and GitHub), anchored by a `1px solid var(--text-main)` bottom rule. The reader (`blog.html`) carries its brand link inside the sidebar header.
- **Favicons / Icons:** SVGs used in favicons are standardized to the Rams color palette (background `#1e3c72`, rounded corners `rx="4"`, and warm off-white text `#F0EDE5`), ensuring brand alignment down to the browser tab indicator. Standard PWA icons retain rounded corners (`rx`), while maskable PWA icons use flat, full-bleed squares (`rx="0"`) with scaled-down text to prevent clipping in circular/squircle shapes.
- **Mobile:** Masthead controls maintain 44px touch targets at the right edge; `Research Blog` collapses to an icon button on narrow screens (`<= 640px`).

### 4.3. Badges and Chips

- Muted category colors are applied to text and borders only.
- Chips (`.filter-tag`, `.tag-badge`) use background `var(--bg-card)` and a 1px border; they are `<button>`s with `aria-pressed`.
- Active filters use high-contrast ink: background `var(--text-main)`, color `var(--bg-card)`.

### 4.4. Buttons & Controls

- **Standard Button** (`.btn`): `var(--bg-card)`, border `var(--border-strong)`, 40px tall (44px on touch layouts).
- **Primary Button** (`.btn.btn-primary`): solid ink (`var(--text-main)`), text `var(--bg-card)`, no shadow. One per view.
- **Icon Button** (`.icon-btn`): 36px square (44px on touch layouts), borderless; always carries an `aria-label`.
- Every clickable thing is a `<button>` or `<a>`; `:focus-visible` shows a 2px `var(--primary)` ring; `:disabled` is 45% opacity.

---

## 5. AI Agent Instruction Checklist

**When building a new component or page, strictly enforce these rules:**

1. [ ] "Use the shared Slate/Titanium tokens from `shared.css` (`var(--bg-body)`, `var(--bg-card)`, `var(--text-main)`, `var(--border)`, `var(--card-hover-bg)`, etc.). No hardcoded HEX/RGB and no literal `font-family` outside the token block."
2. [ ] "Use `var(--font-ui)` for UI/Latin, `var(--font-thai)` for Thai, and `var(--font-mono)` for dates, PMIDs and counts."
3. [ ] "Set card border radius to `4px` and small elements to `2px` for harder industrial edges."
4. [ ] "Rows answer hover with `var(--card-hover-bg)`; no lifts, no shadows on in-flow content, never `transition: all`, animate only `transform`, `opacity` and colours."
5. [ ] "Category tags/badges must be text-only colors, never solid colored backgrounds."
6. [ ] "Ensure the layout is responsive and supports the Inverted Dark Theme color variables."
7. [ ] "Run `node ~/.claude/skills/hallmark/scripts/sloplint.mjs . --scope app --genre modern-minimal` when available; keep the stamp and waiver lines at the top of `shared.css`."
8. [ ] "Every anchor link that opens in a new tab (`target="_blank"`) MUST strictly define `rel="noopener noreferrer"` to prevent tabnabbing security vulnerabilities."

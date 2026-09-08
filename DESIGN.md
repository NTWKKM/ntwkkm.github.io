# NTWKKM Design System & Guidelines (DESIGN.md)

Last updated: *2026-07-04*

This document serves as the **core design guideline** for any AI agent or developer modifying or creating new interfaces for the NTWKKM project. All UI implementations MUST adhere strictly to these principles to maintain a cohesive, premium, and matte aesthetic across all modules (`index`, `blog`, `tracking`).

---

## 1. Core Philosophy

- **Modern Apple / iPadOS Slate & Titanium Navy**: The design language pairs a crisp, digital **Modern Apple / iPadOS Slate** light theme with a deep **Titanium Precision Navy** dark theme. It delivers the clean, tactile feel of modern clinical operating systems (iPadOS / macOS HIG) with strict WCAG AAA contrast standards.
- **Card Separation & Soft Depth**: Surfaces feature distinct, ergonomic elevation. Cards sit cleanly atop the canvas with soft dimensional shadows (`0 4px 20px rgba(...)`) and crisp 1px borders.
- **Interactive & Quiet**: Elements react smoothly to user hover (subtle border color highlights and shadow shifts) while preserving strict layout stability.
- **First-Class Dark Mode (Ergonomic Navy)**: Dark mode preserves the signature deep navy canvas (`#121E36`) with elevated surfaces (`#1C2D4F`). To prevent eye fatigue and glare during long clinical sessions, text is rendered in soft slate white (`#E2E8F0`, contrast 10.8:1 PASS AAA) instead of harsh 100% white.
- **Accent Restraint**: Only ONE accent color (`--signal-orange`) exists. It must be used sparingly for high-priority or critical items only (e.g., status errors, highlights). Do not use it decoratively or for standard call-to-actions.

---

## 2. Typography

We use a multi-font stack to separate UI labels, prose, Thai text, and technical data:

- **Primary Text (UI & English Prose)**: `Inter Tight`, `Neue Haas Grotesk`, sans-serif
- **Secondary Text (Thai Language)**: `Sarabun`
- **Technical Data (Metrics, Logs, IDs, Status, Barcodes)**: `JetBrains Mono`, `Courier New`, monospace

```css
font-family: "Inter Tight", "Neue Haas Grotesk", "Sarabun", sans-serif;
```

---

## 3. Color Palette & CSS Variables

All colors MUST be referenced via CSS variables defined in `:root` and `[data-theme="dark"]`. **Do not hardcode HEX or RGB values** in component styles.

### 3.1. Light Theme (Modern Apple / iPadOS Slate)

- Canvas Background (`--bg-body`): `#ECECEE` (Neutral Cool Gray)
- Card Container (`--bg-card`): `#FFFFFF` (Pure White)
- Primary Text (`--text-main` / `--ink`): `#1d1d1f` on Card `#FFFFFF` (Contrast: 16.83:1, PASS WCAG AAA)
- Secondary Text (`--text-secondary` / `--graphite`): `#333333` on Canvas `#ECECEE` (Contrast: 10.71:1, PASS WCAG AAA)
- Muted Text (`--text-muted`): `#6E6E73` on Card `#FFFFFF` (Contrast: 5.42:1, PASS WCAG AA Normal Text, PASS WCAG AAA Large Text >= 18pt); on Canvas `#ECECEE` (Contrast: 4.38:1, PASS WCAG AA Large Text / Non-text UI >= 3.0:1)
- Card Border (`--border` / `--rule`): `1px solid #D8D8DC`
- Border Strong (`--border-strong`): `#C7C7CC`
- Card Shadow (`--shadow`): `0 4px 20px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.04)`
- Surface Contrast (Canvas vs Card): 1.18:1 (Clean, modern card separation)
- Accent Signal (`--signal-orange`): `#d84315`
- Shared Card Hover Tokens: `--card-hover-bg: #1E3A6D`, `--card-hover-border: #1E3A6D`, `--card-hover-text: #FFFFFF`, `--card-hover-sentinel: #93C5FD`

### 3.2. Dark Theme (Titanium Precision Navy - Ergonomic Tone 1)

- Canvas Background (`--bg-body`): `#121E36` (Signature Deep Navy)
- Card Container (`--bg-card`): `#1C2D4F` (Elevated Navy Surface)
- Primary Text (`--text-main`): `#E2E8F0` on Card `#1C2D4F` (Soft Slate White, Anti-glare, Contrast: 10.8:1, PASS WCAG AAA)
- Secondary Text (`--text-secondary`): `#94A3B8` on Card `#1C2D4F` (Cool Slate Gray, Contrast: 5.5:1, PASS WCAG AA Normal Text, PASS WCAG AAA Large Text >= 18pt)
- Muted Text (`--text-muted`): `#64748B` on Card `#1C2D4F` (Contrast: 3.2:1, PASS WCAG UI Component / Non-text >= 3.0:1)
- Card Border (`--border` / `--rule`): `1px solid #2B406A`
- Border Strong (`--border-strong`): `#3A548C`
- Card Shadow (`--shadow`): `0 4px 20px rgba(6, 12, 24, 0.55), 0 1px 3px rgba(6, 12, 24, 0.30)`
- Surface Contrast (Canvas vs Card): 1.26:1 (Sharp clinical layer separation)
- Accent Signal (`--signal-orange`): `#FF7A45`
- Primary Link/Action (`--primary`): `#93c5fd`
- Shared Card Hover Tokens: `--card-hover-bg: #233760`, `--card-hover-border: #3A578E`, `--card-hover-text: #FFFFFF`, `--card-hover-sentinel: #93C5FD`

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
- **Hover State / Minimal Standout Sentinel / Active Highlights:** Cards (such as `.project-card` and homepage `.paper-card`) elevate with soft shadow `var(--shadow-hover)`. On hover, background changes to `var(--card-hover-bg)`, borders are `var(--card-hover-border)`, child text turning `var(--card-hover-text)`, and a left border sentinel is styled as `border-left: 4px solid var(--card-hover-sentinel);` (with corresponding left padding reduction to prevent layout shift). Similarly, blog article list items (`.article-list-item`) and related cards (`.related-card`) transition to `var(--card-hover-bg)` background, `var(--card-hover-text)` text, and a `3px` left border sentinel of `var(--card-hover-sentinel)` on hover. Active selection list items (`.article-list-item.active`) utilize `var(--bg-paper-list)` background with a solid `3px` left border of `var(--text-main)` to visually signify the active reading state.

### 4.2. Navigation Bar

- The header is the only area permitted a gradient: `linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)`. This color scheme is standardized globally across all module headers (Homepage and Tracking dashboards) for layout consistency.
- Navigation text, brand logo, subtitles, and icons are warm off-white (`#F0EDE5`) in both Light and Dark themes to ensure legibility on the dark navy gradient.
- **Favicons / Icons:** SVGs used in favicons are standardized to the Rams color palette (background `#1e3c72`, rounded corners `rx="4"`, and warm off-white text `#F0EDE5`), ensuring brand alignment down to the browser tab indicator. Standard PWA icons retain rounded corners (`rx`), while maskable PWA icons use flat, full-bleed squares (`rx="0"`) with scaled-down text to prevent clipping in circular/squircle shapes.
- Buttons and links (e.g. GitHub, Research Blog, Refresh, and Add Tracking): Borders are transparent (`none`/`transparent`) in their normal state to retain a flat, printed-document aesthetic. Hover states use `var(--card-hover-bg)` background.
- **Mobile Viewport Alignment:** Controls inside the navigation bar (links, toggles, actions) are collapsed to icon-only buttons (with text spans hidden) and aligned strictly to the right side of the screen (`justify-content: flex-end; gap: 12px;`) to optimize finger reachability and space.

### 4.3. Badges and Chips

- Muted category colors are applied to text and borders only.
- chips use background `var(--bg-paper-list)` and border `var(--border)`.
- Active filters use high-contrast ink: background `var(--text-main)`, color `var(--bg-card)`.

### 4.4. Buttons & Controls

- **Standard Button**: Warm background (`var(--bg-card)`), border `var(--border)`. Hovers to `var(--border-strong)`.
- **Primary Button**: Solid ink background (`var(--text-main)`), cream text (`var(--bg-card)`), flat with no drop shadow.
- **Theme Toggle**: Circular button with no shadow. Adjusts fill color to match nav bar background.

### 4.5. Secure Dashboards & Passcode Gate

- **Auth Gate Overlay**: The passcode gate `.auth-gate` covers the entire screen, utilizing standard Rams flexbox layout to center the login container.
- **Passcode Box Feedback**: If decryption fails, the `.auth-box` is temporarily given a `.shake` class (shaking CSS keyframe animation) triggered by a forced browser reflow (`void authBox.offsetWidth;`) for immediate tactile feedback.
- **Session Persistence**: Once successfully decrypted, the raw passcode is saved in `sessionStorage` (`tracking_passcode`) so subsequent page reloads do not trigger the auth gate, automatically pre-authenticating the user.

---

## 5. AI Agent Instruction Checklist

**When building a new component or page, strictly enforce these rules:**

1. [ ] "Use the centralized Braun variables from `shared.css` (`var(--paper)`, `var(--ink)`, `var(--rule)`, etc.). No hardcoded HEX/RGB."
2. [ ] "Use `Inter Tight` for UI/Latin, `Sarabun` for Thai, and monospace for metrics/IDs."
3. [ ] "Set card border radius to `4px` and small elements to `2px` for harder industrial edges."
4. [ ] "Do not implement card elevation lifts (`translateY`) or drop shadows on hover. Hover effects must be flat (e.g., border color changes)."
5. [ ] "Category tags/badges must be text-only colors, never solid colored backgrounds."
6. [ ] "Ensure the layout is responsive and supports the Inverted Dark Theme color variables."
7. [ ] "Every anchor link that opens in a new tab (`target="_blank"`) MUST strictly define `rel="noopener noreferrer"` to prevent tabnabbing security vulnerabilities."

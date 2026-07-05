# NTWKKM Design System & Guidelines (DESIGN.md)

Last updated: *2026-07-04*

This document serves as the **core design guideline** for any AI agent or developer modifying or creating new interfaces for the NTWKKM project. All UI implementations MUST adhere strictly to these principles to maintain a cohesive, premium, and matte aesthetic across all modules (`index`, `blog`, `tracking`, `fray`).

---

## 1. Core Philosophy

- **Braun-Era Paper-Industrial**: The design language is inspired by the 1960s-70s Braun product design (Dieter Rams). It has a muted, matte, "printed document" feel. Avoid modern glassmorphic panels, glossy gradients (except navigation), and 3D tilts.
- **Flat & Solid**: Use thin 1px lines in `--rule` for dividers and borders. Avoid heavy drop shadows or large blurred overlays.
- **Interactive & Quiet**: Elements should react to user hover but remain quiet. Change border colors or background shades on hover. Avoid moving elements (no `transform: translateY`) or increasing drop shadows.
- **First-Class Dark Mode (Inverted)**: Both Light and Dark modes are supported. Dark mode is an inversion: using deep navy surfaces (`#121e36` body, `#1a2744` cards) and warm cream/paper text (`#ebe7df`).
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

### 3.1. Light Theme (Default)

- `--paper`: `#ebe7df` (Main page background — warm cream/off-white)
- `--ink`: `#1a1a1a` (Primary text color)
- `--graphite`: `#4a4a4a` (Secondary text)
- `--rule`: `#d8d4c8` (Dividers, card borders)
- `--signal-orange`: `#d84315` (Signal accent — high priority only)
- `--primary`: `#1e3c72` (Deep navy nav background)
- `--primary-hover`: `#49628d` (Nav item hover background)

### 3.2. Dark Theme (Inverted)

- `--bg-body`: `#121e36` (Deep navy body background)
- `--bg-card`: `#1a2744` (Slightly lighter navy card background)
- `--text-main`: `#ebe7df` (Warm cream primary text)
- `--text-secondary`: `#c4bfb0` (Warm greyish secondary text)
- `--border`: `#233558` (Dark rule/border)
- `--signal-orange`: `#ff6f43` (Slightly brighter orange for dark contrast)

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
- **Hover State / Minimal Standout Sentinel / Active Highlights:** Cards (such as `.project-card` and homepage `.paper-card`) do NOT lift or grow shadows. On hover, background changes to `#49628d`, borders are `#49628d`, child text turning `#F0EDE5`, and a left border sentinel is styled as `border-left: 4px solid #F0EDE5;` (with corresponding left padding reduction to prevent layout shift). Similarly, blog article list items (`.article-list-item`) and related cards (`.related-card`) transition to `#49628d` background, `#F0EDE5` text, and a `3px` left border sentinel on hover. Active selection list items (`.article-list-item.active`) utilize `var(--bg-paper-list)` background with a solid `3px` left border of `var(--text-main)` to visually signify the active reading state.

### 4.2. Navigation Bar

- The header is the only area permitted a gradient: `linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)`. This color scheme is standardized globally across all module headers (Homepage, Fray, and Tracking dashboards) for layout consistency.
- Navigation text, brand logo, subtitles, and icons are warm off-white (`#F0EDE5`) in both Light and Dark themes to ensure legibility on the dark navy gradient.
- **Favicons / Icons:** SVGs used in favicons are standardized to the Rams color palette (background `#1e3c72`, rounded corners `rx="4"`, and warm off-white text `#F0EDE5`), ensuring brand alignment down to the browser tab indicator.
- Buttons and links (e.g. GitHub, Research Blog, Refresh, and Add Tracking): Borders are transparent (`none`/`transparent`) in their normal state to retain a flat, printed-document aesthetic. Hover states use `#49628d` background.
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

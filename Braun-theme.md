# Braun Theme — Color & Style Concept

Source reference: `er-hub/index.html` (NTWKKM/er-hub)

Design language: **paper-industrial** — inspired by Braun-era (1960s–70s) product design.
Muted, matte, "printed document" feel. NOT a bright/glossy modern web palette.
Only ONE accent color (signal orange) exists, and it should be used sparingly.

---

## 1. Core Palette

### Light Theme (Default)
```css
:root {
    --paper:          #ebe7df; /* main page background — warm off-white/cream */
    --ink:             #1a1a1a; /* primary text color */
    --graphite:       #4a4a4a; /* secondary text (labels, numbers, meta info) */
    --rule:            #d8d4c8; /* divider lines, table borders */
    --signal-orange:  #d84315; /* single accent color — use sparingly, high-priority items only */

    --theme-color:    #f4f2ec; /* browser/meta theme-color, close to --paper */
}
```

### Dark Theme (Inverted)
```css
[data-theme="dark"] {
    --paper:          #ebe7df; /* warm off-white/cream — used for text in dark mode */
    --ink:             #1a1a1a;
    --graphite:       #4a4a4a;
    --rule:            #233558; /* dark navy divider line */
    --signal-orange:  #ff6f43; /* single accent color — slightly brighter for readability */

    --theme-color:    #121e36; /* browser/meta theme-color, close to --bg-body */
    
    --bg-body:        #121e36; /* deep navy background */
    --bg-card:        #1a2744; /* slightly lighter navy card */
}
```

## 2. Navigation Bar

```css
.top-nav {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    color: #F0EDE5;
}

.nav-item:hover,
.list-row:hover,
.project-card:hover {
    background-color: #49628d;
    color: #F0EDE5;
}
```

- Nav background: deep navy gradient (`#1e3c72` → `#2a5298`)
- Text/icons on nav: warm off-white `#F0EDE5` in both Light and Dark themes for contrast.
- Nav buttons/links (e.g. GitHub, Research): Borders are removed (set to `transparent`) to fit the flat aesthetic.
- Hover state (rows, nav items, project cards): mid-blue `#49628d` background, text/child elements turn `#F0EDE5`, and a `4px` left border sentinel becomes `#F0EDE5`. Smooth CSS transitions (0.2s ease) are implemented on both the card container and its children (`.project-title`, `.project-desc`, and `.project-icon`) to ensure a polished interactive feel.

## 3. Category / Tag Colors
Muted colors, **text-only** — never used as solid backgrounds. Keeps the UI calm and non-flashy.

```css
:root {
    --cat-neuro:        #b8873a; /* Ochre */
    --cat-cardiac:      #3a5566; /* Slate */
    --cat-pulmonary:    #3a5566; /* Slate */
    --cat-anticoag:     #5a6b3b; /* Olive */
    --cat-tox:           #8a3a2a; /* Brick */
    --cat-procedural:  #5a6b3b; /* Olive */
    --cat-tools:         #4a4a4a; /* Graphite */
}
```

## 4. Typography

| Role | Font | Weights |
|---|---|---|
| UI / Latin text | `Inter Tight` | 400, 500, 700 |
| Thai text | `Sarabun` | 400, 700 |
| Fallback | `Neue Haas Grotesk, sans-serif` | — |

```css
font-family: "Inter Tight", "Neue Haas Grotesk", "Sarabun", sans-serif;
```

## 5. Usage Principles (for AI agents applying this theme)

1. **Background** is always the warm cream/paper tone (`--paper`), never pure white.
2. **Text** is near-black (`--ink`), not pure `#000`.
3. **Dividers** use thin 1px lines in `--rule`, not shadows or heavy borders.
4. **Accent orange** (`--signal-orange`) is reserved for critical/priority signals only — do not use it decoratively or for general CTAs.
5. **Category colors** are muted and applied to text/labels only, never as button or card backgrounds.
6. **Nav bar** is the one area allowed a gradient — deep navy — everything else stays flat/matte.
7. Overall tone: clinical, serious, printed-document feel — avoid bright, saturated, or glossy UI elements.

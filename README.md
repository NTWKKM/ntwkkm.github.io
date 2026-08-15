# NTWKKM | Emergency Medicine & Clinical Informatics

> **Personal Website, Clinical Informatics Knowledge Base, and Medical Research Portal**  
> 🌐 **Live Website:** [ntwkkm.github.io](https://ntwkkm.github.io/)

---

## 🩺 Overview

A unified portfolio and clinical tool hub for an **Emergency Medicine Physician & Clinical Informatics Developer**. Built with a local-first, offline-capable architecture designed for rapid clinical reference and automated medical literature aggregation.

---

## ✨ Key Features & Portals

- **📑 Automated Medical Literature Feed (`index.html`)**: Daily automated curation of high-impact Emergency Medicine publications from PubMed via n8n automated pipelines.
- **📝 Research Blog & Knowledge Base (`blog.html`)**: Interactive clinical informatics and research articles automatically synchronized and chunked from Notion databases.
- **🛡️ NTWKKM Knowledge Vault (`/pl/`)**: Integrated knowledge repository and clinical informatics resource dashboard.
- **📦 Thailand Post Package Tracker (`/tracking/`)**: Client-side encrypted package tracking dashboard with automated status updates.
- **⚡ Offline-First PWA**: Progressive Web App with Service Worker (`sw.js`) caching strategies, zero-cloud dependency for local utilities, and resilient fallback states.
- **🎨 Minimal Braun Aesthetic**: Clean, high-legibility interface built on Vanilla HTML5, CSS custom properties, and WCAG 2.1 AA accessible typography.

---

## 🚀 Projects & Clinical Tools

| Project | Description | Link |
| :--- | :--- | :--- |
| **⚕️ ER Standing Order Hub** | Emergency standing orders & clinical protocols | [Launch Hub](https://ntwkkm.github.io/er-hub/) |
| **🩺 ER-PED Workstation** | Pediatric emergency calculator workstation | [Launch Workstation](https://ntwkkm.github.io/er-ped/) |
| **🧪 Toxico Course Bookmarks** | Toxicology course bookmarks & reference links | [View Bookmarks](https://ntwkkm.github.io/toxico/) |
| **💊 Acetaminophen Tox** | Interactive nomogram & antidote protocol | [Open Calculator](https://acetatox.netlify.app/) |
| **🫁 VentSim** | Mechanical ventilator simulator | [Launch VentSim](https://ventsim.vercel.app/) |
| **💓 Shock Sim** | Hemodynamic changes & shock state visualizer | [Launch Shock Sim](https://shocksimulation.vercel.app/) |
| **🚑 MNRH Refer** | Inter-hospital emergency referral system | [Open Referral](https://mnrhrefer.vercel.app/) |
| **🕒 Stroke Protocol V1** | Archive version of acute ischemic stroke rtPA tools | [Open Tool](https://rtpamnrh.vercel.app/) |
| **📦 Package Tracker** | Thailand Post real-time tracking dashboard | [Open Tracker](https://ntwkkm.github.io/tracking/) |
| **🛡️ NTWKKM Knowledge Vault** | Clinical informatics dashboard & automated resource hub | [Open Vault](https://ntwkkm.github.io/pl/) |
| **🏥 Medical Stat Tool** | Interactive Shiny application for medical statistics and clinical research | [Launch Shiny App](https://ntwkkm-shinystat.hf.space/) |
| **📊 Med Statistics** | Easy online calculator for medical stats | [Open MedStat](https://medstat.app/) |

---

## 🛠️ Architecture & Tech Stack

- **Frontend Core**: Vanilla HTML5, CSS3 (Modular Tokens, No Framework Overhead), Vanilla ES6+ JavaScript.
- **PWA & Offline Resilience**: Service Worker (`sw.js`) with cache-first and network-first hybrid caching strategies.
- **Automated Data Pipelines**:
  - **PubMed Pipeline**: Daily EM literature digest pushed automatically into `papers.json`.
  - **Notion Sync Pipeline**: Research articles fetched and chunked into `data/blog/*.json` with `blog_index.json`.
  - **Tracking Engine**: Scheduled GitHub Actions runner fetching Thailand Post Track & Trace API.
- **Security & Privacy**: Zero-PHI enforcement, client-side AES-256-GCM encrypted status storage for personal trackers, and strict Content Security Policies.

---

[--- REPOSITORY-TREE-START ---]

📂 Repository Contents (File Structure)

This content reflects the repository structure (updated by GitHub Actions):

```text
|-- data /
|   `-- blog /
|       `-- (Chunked JSON files)
|-- soul /
|   `-- audit_and_fix.md
|-- tracking /
|   |-- auth.json
|   |-- index.html
|   |-- status_store.json
|   |-- track_list.json
|   `-- tracking.css
|-- _config.yml
|-- .gitignore
|-- ARCHITECTURE.md
|-- blog_index.json
|-- blog.css
|-- blog.html
|-- Braun-theme.md
|-- CONTEXT.md
|-- DESIGN.md
|-- index.css
|-- index.html
|-- manifest.json
|-- papers.json
|-- projects.json
|-- README.md
|-- shared.css
|-- shared.js
`-- sw.js
```

[--- REPOSITORY-TREE-END ---]

---

© 2025–2026 [NTWKKM](https://github.com/NTWKKM). All Rights Reserved. Dynamically Indexed and Hosted by GitHub Pages.

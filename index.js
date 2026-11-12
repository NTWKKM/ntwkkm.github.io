// index.js - homepage: the paper ledger and the tools index
'use strict';

const INITIAL_PAPERS = 10;

// Icon keys used by projects.json ("icon" field). Add a key here, then use it there.
const ICONS = {
    clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1"></rect><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line>',
    stethoscope: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"></path><path d="M8 15v1a6 6 0 0 0 12 0v-4"></path><circle cx="20" cy="10" r="2"></circle>',
    pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path>',
    ambulance: '<rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle><line x1="6" y1="8" x2="10" y2="8"></line><line x1="8" y1="6" x2="8" y2="10"></line>',
    clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    lungs: '<path d="M12 3v9"></path><path d="M12 12c-1-3-3-5-5-5-3 0-4 5-4 9 0 2 1 4 3 4 3 0 6-2 6-5"></path><path d="M12 12c1-3 3-5 5-5 3 0 4 5 4 9 0 2-1 4-3 4-3 0-6-2-6-5"></path>',
    pulse: '<polyline points="2 12 6 12 9 4 13 20 16 12 22 12"></polyline>',
    chart: '<line x1="4" y1="20" x2="20" y2="20"></line><rect x="6" y="11" width="3" height="6"></rect><rect x="11" y="6" width="3" height="11"></rect><rect x="16" y="13" width="3" height="4"></rect>',
    calculator: '<rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="11" x2="8.01" y2="11"></line><line x1="12" y1="11" x2="12.01" y2="11"></line><line x1="16" y1="11" x2="16.01" y2="11"></line><line x1="8" y1="15" x2="8.01" y2="15"></line><line x1="12" y1="15" x2="12.01" y2="15"></line><line x1="16" y1="15" x2="16.01" y2="15"></line><line x1="8" y1="19" x2="16" y2="19"></line>',
    vault: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path>',
    flask: '<path d="M9 2h6"></path><path d="M10 2v7.3L4.6 18a2 2 0 0 0 1.7 3h11.4a2 2 0 0 0 1.7-3L14 9.3V2"></path><path d="M7.5 15h9"></path>',
    cup: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>',
};

const svg = (inner, size = 20) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const EXTERNAL_ICON = svg('<path d="M7 17L17 7M17 7H7M17 7V17"/>', 14);

// AI summaries sometimes carry markdown bold markers; the ledger shows plain text.
const stripMarkdown = str => String(str || '').replace(/\*\*/g, '').trim();

// ---------------------------------------------------------------------------
// Latest papers: a ledger grouped by curation date
// ---------------------------------------------------------------------------
async function fetchPapers() {
    const container = document.getElementById('paper-container');
    const moreBtn = document.getElementById('papers-more');
    container.setAttribute('aria-busy', 'true');
    container.innerHTML = createSkeletonUI(4, 'card');

    const papers = await fetchWithFallback('./papers.json');
    container.setAttribute('aria-busy', 'false');

    if (!Array.isArray(papers) || papers.length === 0) {
        container.innerHTML = createErrorUI('Failed to load latest papers. Please check your connection and try again.', fetchPapers);
        return;
    }

    // Group consecutive papers that share a date; the file is newest first.
    const days = [];
    papers.forEach((paper) => {
        const last = days[days.length - 1];
        if (last && last.date === paper.date) last.papers.push(paper);
        else days.push({ date: paper.date, papers: [paper] });
    });

    let shown = 0;
    container.innerHTML = days.map((day) => {
        const collapsed = shown >= INITIAL_PAPERS;
        shown += day.papers.length;
        const items = day.papers.map((paper) => {
            const title = escapeHTML(stripMarkdown(paper.title));
            return `
                <li class="paper-card">
                    <a href="${escapeHTML(sanitizeURL(paper.link))}" class="paper-link" target="_blank" rel="noopener noreferrer">
                        <span class="paper-title">${title}</span>${EXTERNAL_ICON}
                    </a>
                    <p class="paper-comment thai-text" lang="th">${escapeHTML(stripMarkdown(paper.comment))}</p>
                </li>`;
        }).join('');
        return `
            <div class="paper-day"${collapsed ? ' hidden' : ''}>
                <p class="paper-date mono">${escapeHTML(day.date)}</p>
                <ul class="paper-list" role="list">${items}</ul>
            </div>`;
    }).join('');

    document.getElementById('papers-meta').textContent = `${papers.length} papers, latest ${papers[0].date}`;

    const hiddenDays = container.querySelectorAll('.paper-day[hidden]');
    if (hiddenDays.length > 0) {
        moreBtn.hidden = false;
        moreBtn.textContent = `Show all ${papers.length} papers`;
        moreBtn.onclick = () => {
            hiddenDays.forEach((day) => { day.hidden = false; });
            moreBtn.hidden = true;
            const firstNew = hiddenDays[0].querySelector('a');
            if (firstNew) firstNew.focus();
            announceToScreenReader(`Showing all ${papers.length} papers`);
        };
    }

    announceToScreenReader(`Loaded ${papers.length} research papers`);
}

// ---------------------------------------------------------------------------
// Clinical systems and tools: grouped by the "category" field of projects.json
// ---------------------------------------------------------------------------
async function fetchProjects() {
    const container = document.getElementById('projects-container');
    container.setAttribute('aria-busy', 'true');
    container.innerHTML = createSkeletonUI(3, 'list');

    const projects = await fetchWithFallback('./projects.json');
    container.setAttribute('aria-busy', 'false');

    if (!Array.isArray(projects) || projects.length === 0) {
        container.innerHTML = createErrorUI('Failed to load projects. Please check your connection.', fetchProjects);
        return;
    }

    // Categories appear in the order they first occur in the file.
    const groups = new Map();
    projects.forEach((project) => {
        const key = project.category || 'Other';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(project);
    });

    container.innerHTML = Array.from(groups, ([category, items]) => `
        <div class="project-group">
            <h3 class="project-group-title">${escapeHTML(category)}</h3>
            <ul class="project-list" role="list">
                ${items.map(project => `
                <li>
                    <a class="project-card" href="${escapeHTML(sanitizeURL(project.url))}" target="_blank" rel="noopener noreferrer">
                        <span class="project-icon">${svg(ICONS[project.icon] || ICONS.layers)}</span>
                        <span class="project-body">
                            <span class="project-title">${escapeHTML(project.title)}${project.status ? ` <span class="project-status">${escapeHTML(project.status)}</span>` : ''}</span>
                            <span class="project-desc">${escapeHTML(project.desc)}</span>
                        </span>
                        <span class="project-external-arrow">${EXTERNAL_ICON}</span>
                    </a>
                </li>`).join('')}
            </ul>
        </div>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    fetchPapers();
    fetchProjects();
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});

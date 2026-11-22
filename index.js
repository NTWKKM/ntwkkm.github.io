// index.js - homepage: the paper ledger and the tools index
'use strict';

const PAPERS_PER_PAGE = 6;
let carouselAbort = null;

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

// The paper grid holds one screen, so a long title or Thai note is shown
// shortened at a word boundary to what its cell holds (index.css: three
// across from 60rem, two from 40rem; two lines on short screens). The full
// text is never lost: it stays in data-full (and the title on the link's
// title and aria-label), and the shortening is worked out again on every
// resize, so a phone-width window shows everything. Shortening in script,
// not only line-clamp, keeps no hidden clamped line lying under the next
// text; CSS line-clamp stays as the guard between resizes.
function textBudget(container, charWidth) {
    const width = container.clientWidth || window.innerWidth;
    const vw = window.innerWidth;
    if (vw <= 640) return Infinity; // phones show the whole title
    const columns = vw > 960 ? 3 : 2;
    const gap = vw > 960 ? 32 : 24;
    const cell = (width - gap * (columns - 1)) / columns;
    const short = vw > 960 ? window.innerHeight <= 820 : window.innerHeight <= 1100;
    const lines = short ? 2 : 3;
    // charWidth: about 10.5px a character for a title at 19px in the
    // display cut, about 8px for a Thai note at 14px; less a margin for
    // words that wrap early and the external-link icon.
    return Math.max(40, Math.floor((cell / charWidth) * lines * 0.85) - 3);
}

const shorten = (str, max) => {
    if (!Number.isFinite(max) || str.length <= max) return str;
    const cut = str.slice(0, max);
    const space = cut.lastIndexOf(' ');
    return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, '')}…`;
};

// ---------------------------------------------------------------------------
// Latest papers: horizontal paged ledger with scroll-snap and dot marks
// ---------------------------------------------------------------------------
function setupPaperCarousel(track, pager, dotsContainer, statusEl, totalPages) {
    if (carouselAbort) carouselAbort.abort();
    carouselAbort = new AbortController();
    const { signal } = carouselAbort;

    const slides = Array.from(track.querySelectorAll('.paper-slide'));
    const dots = Array.from(dotsContainer.querySelectorAll('.paper-dot'));
    const prevBtn = pager.querySelector('[data-direction="previous"]');
    const nextBtn = pager.querySelector('[data-direction="next"]');

    let currentIndex = 0;
    let settledIndex = 0;
    let pendingTarget = null;
    let suppressAbortUntil = 0;
    let rafId = 0;
    let settleTimer = 0;
    let suppressClick = false;

    const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const countEl = pager.querySelector('.paper-count');

    // Only the page in view takes focus, so Tab does not walk every paper of
    // every off-screen page on its way to the tools below.
    const markSlides = (active) => {
        slides.forEach((slide, idx) => { slide.inert = idx !== active; });
    };

    const updateDots = (active) => {
        if (countEl) countEl.textContent = `${active + 1} / ${totalPages}`;
        if (active === currentIndex && dots[active]?.getAttribute('aria-current') === 'true') return;
        currentIndex = active;
        dots.forEach((dot, idx) => {
            dot.setAttribute('aria-current', idx === active ? 'true' : 'false');
        });
    };

    const nearestSlideIndex = () => {
        const left = track.scrollLeft;
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < slides.length; i += 1) {
            const dist = Math.abs(slides[i].offsetLeft - left);
            if (dist < bestDist) {
                bestDist = dist;
                best = i;
            }
        }
        return best;
    };

    const onSettle = () => {
        clearTimeout(settleTimer);
        if (
            pendingTarget !== null
            && performance.now() < suppressAbortUntil
            && Math.abs(slides[pendingTarget].offsetLeft - track.scrollLeft) > 8
        ) {
            return;
        }
        pendingTarget = null;
        suppressAbortUntil = 0;
        const settled = nearestSlideIndex();
        updateDots(settled);
        markSlides(settled);
        if (settled !== settledIndex) {
            settledIndex = settled;
            if (statusEl) statusEl.textContent = `Page ${settled + 1} of ${totalPages}`;
        }
    };

    const goTo = (index) => {
        const target = ((index % totalPages) + totalPages) % totalPages;
        const destLeft = slides[target].offsetLeft;
        const alreadyAtTarget = Math.abs(destLeft - track.scrollLeft) < 1;
        const reduced = prefersReducedMotion() || alreadyAtTarget;
        pendingTarget = target;
        suppressAbortUntil = reduced ? 0 : performance.now() + 80;
        updateDots(target);
        if (!alreadyAtTarget) {
            track.scrollTo({
                left: destLeft,
                behavior: reduced ? 'auto' : 'smooth',
            });
        }
        if (reduced) onSettle();
    };

    dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => goTo(idx), { signal });
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const base = pendingTarget !== null ? pendingTarget : currentIndex;
            goTo(base - 1);
        }, { signal });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const base = pendingTarget !== null ? pendingTarget : currentIndex;
            goTo(base + 1);
        }, { signal });
    }

    track.addEventListener('keydown', (e) => {
        if (e.target !== track) return;
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            goTo((pendingTarget !== null ? pendingTarget : currentIndex) - 1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            goTo((pendingTarget !== null ? pendingTarget : currentIndex) + 1);
        }
    }, { signal });

    const supportsScrollEnd = 'onscrollend' in window;
    track.addEventListener('scroll', () => {
        if (pendingTarget === null && !rafId) {
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                if (pendingTarget === null) updateDots(nearestSlideIndex());
            });
        }
        if (!supportsScrollEnd) {
            clearTimeout(settleTimer);
            settleTimer = setTimeout(onSettle, 140);
        }
    }, { passive: true, signal });

    if (supportsScrollEnd) {
        track.addEventListener('scrollend', onSettle, { signal });
    }

    const clearPendingTarget = () => {
        pendingTarget = null;
        suppressAbortUntil = 0;
    };
    track.addEventListener('touchstart', clearPendingTarget, { passive: true, signal });
    track.addEventListener('wheel', clearPendingTarget, { passive: true, signal });

    // Threshold-gated mouse drag (> 5px) so clicking links or selecting text stays clean.
    let pointerDown = false;
    let dragging = false;
    let startX = 0;
    let startScroll = 0;

    track.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        pointerDown = true;
        dragging = false;
        suppressClick = false;
        startX = e.clientX;
        startScroll = track.scrollLeft;
    }, { signal });

    window.addEventListener('pointermove', (e) => {
        if (!pointerDown) return;
        const dx = e.clientX - startX;
        if (!dragging && Math.abs(dx) > 5) {
            dragging = true;
            suppressClick = true;
            pendingTarget = null;
            track.classList.add('is-dragging');
        }
        if (dragging) {
            track.scrollLeft = startScroll - dx;
        }
    }, { signal });

    const endDrag = () => {
        if (!pointerDown) return;
        pointerDown = false;
        if (dragging) {
            dragging = false;
            track.classList.remove('is-dragging');
            goTo(nearestSlideIndex());
        }
    };

    window.addEventListener('pointerup', endDrag, { signal });
    window.addEventListener('pointercancel', endDrag, { signal });

    track.addEventListener('click', (e) => {
        if (!suppressClick) return;
        suppressClick = false;
        e.preventDefault();
        e.stopPropagation();
    }, { capture: true, signal });

    updateDots(0);
    markSlides(0);
}

async function fetchPapers() {
    const container = document.getElementById('paper-container');
    const pager = document.getElementById('papers-pager');
    const dotsContainer = document.getElementById('papers-dots');
    const statusEl = document.getElementById('papers-status');
    container.setAttribute('aria-busy', 'true');
    container.innerHTML = createSkeletonUI(4, 'card');

    const papers = await fetchWithFallback('./papers.json');
    container.setAttribute('aria-busy', 'false');

    if (!Array.isArray(papers) || papers.length === 0) {
        if (pager) pager.hidden = true;
        container.innerHTML = createErrorUI('Failed to load latest papers. Please check your connection and try again.', fetchPapers);
        return;
    }

    const pages = [];
    for (let i = 0; i < papers.length; i += PAPERS_PER_PAGE) {
        pages.push(papers.slice(i, i + PAPERS_PER_PAGE));
    }

    container.innerHTML = pages.map((pagePapers, pageIndex) => {
        const items = pagePapers.map((paper) => {
            const fullAttr = escapeHTML(stripMarkdown(paper.title));
            const noteAttr = escapeHTML(stripMarkdown(paper.comment));
            return `
                <li class="paper-card" data-pmid="${escapeHTML(paper.pmid)}">
                    <time class="paper-date mono">${escapeHTML(paper.date)}</time>
                    <div class="paper-body">
                        <a href="${escapeHTML(sanitizeURL(paper.link))}" class="paper-link" target="_blank" rel="noopener noreferrer" title="${fullAttr}" aria-label="${fullAttr} (PubMed, opens in a new tab)">
                            <span class="paper-title" data-full="${fullAttr}">${fullAttr}</span>${EXTERNAL_ICON}
                        </a>
                        <p class="paper-comment thai-text" lang="th" data-full="${noteAttr}">${noteAttr}</p>
                    </div>
                </li>`;
        }).join('');
        return `
            <div class="paper-slide" role="group" aria-roledescription="slide" aria-label="Page ${pageIndex + 1} of ${pages.length}">
                <ul class="paper-list" role="list">${items}</ul>
            </div>`;
    }).join('');

    fitPaperText(container);

    document.getElementById('papers-meta').textContent = `${papers.length} papers, latest ${papers[0].date}`;

    // The hero's figure is the real count from papers.json, never a set number.
    const heroFigure = document.getElementById('hero-figure');
    if (heroFigure) {
        document.getElementById('hero-count').textContent = papers.length;
        document.getElementById('hero-count-label').textContent = `papers, latest ${papers[0].date}`;
        heroFigure.hidden = false;
    }

    if (pager && dotsContainer && pages.length > 1) {
        dotsContainer.innerHTML = pages.map((_, idx) => `
            <button type="button" class="paper-dot" aria-label="Page ${idx + 1} of ${pages.length}" aria-current="${idx === 0 ? 'true' : 'false'}"></button>
        `).join('');
        pager.hidden = false;
        setupPaperCarousel(container, pager, dotsContainer, statusEl, pages.length);
    } else if (pager) {
        pager.hidden = true;
    }

    announceToScreenReader(`Loaded ${papers.length} research papers`);
    linkSummaries(container);
}

/** Show each title and note at what its cell holds now, from its full text. */
function fitPaperText(container) {
    const titleMax = textBudget(container, 10.5);
    const noteMax = textBudget(container, 8);
    container.querySelectorAll('.paper-title[data-full]').forEach((el) => {
        el.textContent = shorten(el.dataset.full, titleMax);
    });
    container.querySelectorAll('.paper-comment[data-full]').forEach((el) => {
        el.textContent = shorten(el.dataset.full, noteMax);
    });
}

/**
 * Papers that already have a full Thai summary in the research reader get a
 * link to it. Runs after the ledger is on screen and fails silently: the
 * links are an extra, and the ledger must never wait on them.
 */
/** The reader's own count, from the same list the summary links use. */
function showReaderCount(count) {
    const figure = document.getElementById('hero-blog-figure');
    if (!figure || !count) return;
    document.getElementById('hero-blog-count').textContent = count.toLocaleString('en-GB');
    figure.hidden = false;
}

async function linkSummaries(container) {
    const pmids = await fetchWithFallback('./data/blog/pmids.json', null, 1);
    if (!Array.isArray(pmids)) return;
    const held = new Set(pmids);
    showReaderCount(held.size);
    container.querySelectorAll('.paper-card[data-pmid]').forEach((card) => {
        const pmid = card.dataset.pmid;
        if (!/^\d+$/.test(pmid) || !held.has(pmid) || card.querySelector('.paper-summary-link')) return;
        const link = document.createElement('a');
        link.className = 'paper-summary-link';
        link.href = `blog.html?pmid=${pmid}`;
        link.textContent = 'Read the Thai summary';
        // Thirty-odd links share that text; name each by its paper for screen readers.
        const paperLink = card.querySelector('.paper-link');
        const name = paperLink?.getAttribute('title') || card.querySelector('.paper-title')?.textContent;
        if (name) link.setAttribute('aria-label', `Read the Thai summary of ${name}`);
        card.querySelector('.paper-body').appendChild(link);
    });
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
    const CATEGORY_TONES = {
        'Clinical tools': 'vermilion',
        'Simulators': 'teal',
        'Research & statistics': 'teal',
    };
    const groups = new Map();
    projects.forEach((project) => {
        const key = project.category || 'Other';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(project);
    });

    const worksMeta = document.getElementById('works-meta');
    if (worksMeta) worksMeta.textContent = `${projects.length} systems, ${groups.size} groups`;

    container.innerHTML = Array.from(groups, ([category, items]) => {
        const tone = CATEGORY_TONES[category];
        const toneAttr = tone ? ` data-tone="${tone}"` : '';
        return `
        <div class="project-group"${toneAttr}>
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
        </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('paper-container');
    window.addEventListener('resize', debounce(() => fitPaperText(track), 150), { passive: true });
    fetchPapers();
    fetchProjects();
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    setupBackToTop();
});

/**
 * The footer name scrolls back to the top. Without JavaScript the #top link
 * still jumps there. With it the scroll is smooth (instant under reduced
 * motion), the URL keeps no hash, and focus lands on the top wordmark.
 * The square turns on tap too, since touch screens have no hover.
 */
function setupBackToTop() {
    const link = document.getElementById('back-to-top');
    if (!link) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    link.addEventListener('click', (e) => {
        e.preventDefault();
        link.classList.add('is-turning');
        setTimeout(() => link.classList.remove('is-turning'), 600);
        window.scrollTo({ top: 0, behavior: reduced.matches ? 'auto' : 'smooth' });
        const home = document.querySelector('.masthead .wordmark');
        if (home) home.focus({ preventScroll: true });
    });
}

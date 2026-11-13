// blog.js - research reader
//
// Data model: the list is driven by data/blog/index.json (one compact row per
// paper, built by .github/scripts/process_blog.js). The full record of a paper
// lives in a chunk file that is fetched only when that paper is opened, or
// when the reader starts a full-text search.
'use strict';

const PAGE_SIZE = 20;
const INDEX_URL = './data/blog/index.json';
const chunkUrl = n => `./data/blog/research_chunk_${n}.json`;
const MOBILE = window.matchMedia('(max-width: 899px)');
const $ = id => document.getElementById(id);
// Pure logic lives in reader-core.js so it can be unit tested.
const { tokenize, scorePost, highlightText, inline, parseSummary, generateCitation } = readerCore;
// Same text as the #empty-state paragraph in blog.html.
const EMPTY_HINT = 'Choose from the list on the left to view full details.';

const SPECIALTY_TONES = {
    cardio: 'navy',
    resus: 'vermilion',
    airway: 'navy',
    neuro: 'ochre',
    trauma: 'vermilion',
    infect: 'vermilion',
    tox: 'vermilion',
    peds: 'navy',
    geri: 'ochre',
    surg: 'navy',
    metab: 'teal',
    heme: 'navy',
    psych: 'ochre',
    obgyn: 'navy',
    imaging: 'teal',
    ai: 'teal',
    ems: 'ochre',
    ops: 'ochre',
};

const specialtyTone = idx => SPECIALTY_TONES[state.specialties[idx]?.id] || 'navy';

const state = {
    posts: [],            // newest first
    byId: new Map(),
    specialties: [],      // [{ id, label }]
    designs: [],          // [{ id, label }]
    filtered: [],
    page: 1,
    query: '',
    specs: new Set(),     // selected specialty indexes (OR)
    design: -1,           // selected design index, -1 = any
    currentId: null,
    chunks: new Map(),    // chunk number -> Promise<Map<id, record>>
    fullText: null,       // Map<id, lowercased summary> once loaded
    fullTextLoading: false,
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
function rowToPost([id, title, ts, pmid, chunk, spec, design, tags]) {
    const date = ts
        ? new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
    const labels = spec.map(i => state.specialties[i]?.label || '');
    return {
        id, title, ts, pmid, chunk, spec, design, tags, date,
        iso: ts ? new Date(ts).toISOString() : '',
        titleLc: title.toLowerCase(),
        hay: [title, pmid, ...tags, ...labels].join(' ').toLowerCase(),
    };
}

function loadChunk(n) {
    if (!state.chunks.has(n)) {
        const promise = fetchWithFallback(chunkUrl(n)).then((records) => {
            if (!Array.isArray(records)) throw new Error(`Chunk ${n} unavailable`);
            return new Map(records.map(r => [r.id, r]));
        });
        // A failed chunk must not stay cached, or a retry could never succeed.
        promise.catch(() => state.chunks.delete(n));
        state.chunks.set(n, promise);
    }
    return state.chunks.get(n);
}

/** Load every chunk once so search can look inside the summaries. */
async function ensureFullText() {
    if (state.fullText || state.fullTextLoading) return;
    state.fullTextLoading = true;
    renderSearchStatus();
    try {
        const numbers = Array.from(new Set(state.posts.map(p => p.chunk)));
        const maps = await Promise.all(numbers.map(loadChunk));
        const text = new Map();
        maps.forEach(map => map.forEach((record, id) => {
            text.set(id, String(record.property_comment || '').toLowerCase());
        }));
        state.fullText = text;
    } catch (error) {
        console.warn('[Search] Full text unavailable, searching titles and tags only.', error);
    } finally {
        state.fullTextLoading = false;
        if (state.query) applyFilters();
        else renderSearchStatus();
    }
}

// ---------------------------------------------------------------------------
// Filtering and search
// ---------------------------------------------------------------------------

/**
 * Every search term must appear as a substring. Title hits rank above tag
 * hits, which rank above hits found only in the summary; ties keep date order.
 */
function applyFilters() {
    const tokens = tokenize(state.query);
    const scored = [];

    for (const post of state.posts) {
        if (state.specs.size && !post.spec.some(i => state.specs.has(i))) continue;
        if (state.design !== -1 && post.design !== state.design) continue;

        let score = 0;
        if (tokens.length) {
            score = scorePost(post, tokens, state.fullText ? state.fullText.get(post.id) || '' : '');
            if (score === -1) continue;
        }
        scored.push({ post, score });
    }

    // Array.prototype.sort is stable, so equal scores stay newest first.
    if (tokens.length) scored.sort((a, b) => b.score - a.score);
    state.filtered = scored.map(s => s.post);

    const at = state.filtered.findIndex(p => p.id === state.currentId);
    state.page = at === -1 ? 1 : Math.floor(at / PAGE_SIZE) + 1;

    renderList();
    renderFacetState();
    renderSearchStatus();
    updateNavButtons();
}

// ---------------------------------------------------------------------------
// Sidebar rendering
// ---------------------------------------------------------------------------
function renderFacets() {
    const specCounts = state.specialties.map(() => 0);
    const designCounts = state.designs.map(() => 0);
    state.posts.forEach((post) => {
        post.spec.forEach((i) => { specCounts[i]++; });
        if (post.design !== -1) designCounts[post.design]++;
    });

    const chip = (kind, value, label, count, tone) =>
        `<button type="button" class="filter-tag" data-${kind}="${value}" data-tone="${tone}" aria-pressed="false">${escapeHTML(label)} <span class="tag-count">${count}</span></button>`;

    $('filter-tags-container').innerHTML = state.specialties
        .map((s, i) => (specCounts[i] ? chip('spec', i, s.label, specCounts[i], specialtyTone(i)) : '')).join('');
    $('design-tags-container').innerHTML = state.designs
        .map((d, i) => (designCounts[i] ? chip('design', i, d.label, designCounts[i], 'teal') : '')).join('');
}

function renderFacetState() {
    document.querySelectorAll('.filter-tag[data-spec]').forEach((el) => {
        el.setAttribute('aria-pressed', String(state.specs.has(Number(el.dataset.spec))));
    });
    document.querySelectorAll('.filter-tag[data-design]').forEach((el) => {
        el.setAttribute('aria-pressed', String(state.design === Number(el.dataset.design)));
    });
    const active = state.specs.size + (state.design !== -1 ? 1 : 0);
    const badge = $('active-filters-badge');
    badge.textContent = active ? String(active) : '';
    badge.hidden = !active;
    $('clear-filters').hidden = !active;
}

function renderSearchStatus() {
    const total = state.posts.length.toLocaleString('en-GB');
    const shown = state.filtered.length.toLocaleString('en-GB');
    const filtering = state.query || state.specs.size || state.design !== -1;
    let text = filtering ? `${shown} of ${total} papers` : `${total} papers`;
    if (state.query && state.fullTextLoading) text += ', loading full text';
    else if (state.query && !state.fullText) text += ' by title and tag';
    $('result-count').textContent = text;
}

function renderList() {
    const list = $('sidebar-list');
    if (state.filtered.length === 0) {
        list.innerHTML = `
            <li class="list-empty">
                <p>No papers match.</p>
                <button type="button" class="btn" id="reset-search">Clear search and filters</button>
            </li>`;
        updatePagination();
        return;
    }

    const start = (state.page - 1) * PAGE_SIZE;
    list.innerHTML = state.filtered.slice(start, start + PAGE_SIZE).map((post) => {
        const specIdx = post.spec[0];
        const where = post.spec.length ? state.specialties[specIdx].label : '';
        const specAttr = post.spec.length ? ` class="list-spec" data-tone="${specialtyTone(specIdx)}"` : '';
        return `
            <li><button type="button" class="article-list-item${post.id === state.currentId ? ' active' : ''}" data-id="${escapeHTML(post.id)}"${post.id === state.currentId ? ' aria-current="true"' : ''}>
                <span class="list-title">${highlightText(post.title, state.query)}</span>
                <span class="list-meta"><span class="mono">${escapeHTML(post.date)}</span><span${specAttr}>${escapeHTML(where)}</span></span>
            </button></li>`;
    }).join('');
    updatePagination();
}

function updatePagination() {
    const total = state.filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const first = total ? (state.page - 1) * PAGE_SIZE + 1 : 0;
    const last = Math.min(state.page * PAGE_SIZE, total);
    $('page-info').textContent = total ? `${first} to ${last} of ${total.toLocaleString('en-GB')}` : 'No results';
    $('prev-btn').disabled = state.page <= 1;
    $('next-btn').disabled = state.page >= pages;
}

function changePage(delta) {
    state.page += delta;
    renderList();
    document.querySelector('.sidebar-content').scrollTop = 0;
}

// ---------------------------------------------------------------------------
// Article
// ---------------------------------------------------------------------------
function renderSummary(text) {
    const sections = parseSummary(text);
    if (!sections.length) return '<p class="summary-missing">No summary is stored for this paper.</p>';
    return sections.map((section, i) => {
        const body = section.paragraphs.filter(Boolean).map(p => `<p>${inline(p)}</p>`).join('');
        const key = section.title.toLowerCase().replace(/\s+/g, '-');
        return `
            <section class="research-section${key ? ` section-${key}` : ''}">
                ${section.title ? `<h2 class="sec-header" id="section-${i}">${section.title}</h2>` : ''}
                <div class="sec-content thai-text" lang="th">${body}</div>
            </section>`;
    }).join('');
}

/**
 * Tell the reader that the link they followed points at a paper this library
 * does not hold, instead of silently showing a different one.
 * @param {{ pmid?: string } | null} missing - null hides the notice
 */
function setRouteNotice(missing) {
    const notice = $('route-notice');
    notice.hidden = !missing;
    if (!missing) { notice.textContent = ''; return; }
    notice.textContent = 'The linked paper is not in this library. Showing the latest paper instead. ';
    if (/^\d+$/.test(missing.pmid || '')) {
        const link = document.createElement('a');
        link.href = `https://pubmed.ncbi.nlm.nih.gov/${missing.pmid}/`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = `Open PMID ${missing.pmid} on PubMed`;
        notice.appendChild(link);
    }
}

async function loadArticle(post, pushHistory = true) {
    setRouteNotice(null);
    state.currentId = post.id;
    document.title = `${post.title} | Medical Research Blog`;

    $('empty-state').hidden = true;
    const view = $('article-view');
    view.hidden = false;

    // The date a paper entered this library, not its publication date.
    $('post-date').textContent = post.date ? `Added ${post.date}` : '';
    $('post-date').dateTime = post.iso;
    $('post-id').textContent = post.pmid ? `PMID ${post.pmid}` : '';
    $('post-id').hidden = !post.pmid;
    $('post-design').textContent = post.design !== -1 ? state.designs[post.design].label : '';
    $('post-design').hidden = post.design === -1;
    $('reading-time').hidden = true;
    $('post-title').textContent = post.title;

    $('post-tags').innerHTML =
        post.spec.map(i => `<button type="button" class="tag-badge" data-spec="${i}" data-tone="${specialtyTone(i)}">${escapeHTML(state.specialties[i].label)}</button>`).join('') +
        post.tags.map(tag => `<button type="button" class="tag-link" data-tag="${escapeHTML(tag)}">${escapeHTML(tag)}</button>`).join('');

    const link = $('post-link');
    const href = post.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${post.pmid}/` : '';
    link.hidden = !href;
    if (href) link.href = href;

    renderRelated(post);

    document.querySelectorAll('.article-list-item').forEach((el) => {
        const active = el.dataset.id === post.id;
        el.classList.toggle('active', active);
        if (active) el.setAttribute('aria-current', 'true');
        else el.removeAttribute('aria-current');
    });

    if (pushHistory) history.pushState({ id: post.id }, '', buildURL(post.id));
    updateNavButtons();
    window.scrollTo(0, 0);
    updateReadingProgress();
    if (MOBILE.matches) closeSidebar();

    const container = $('formatted-summary-container');
    container.innerHTML = createSkeletonUI(3, 'card');
    $('toc-container').hidden = true;

    try {
        const chunk = await loadChunk(post.chunk);
        if (state.currentId !== post.id) return; // the reader moved on while this loaded
        const record = chunk.get(post.id);
        if (!record) throw new Error('Record missing from its chunk');
        const summary = record.property_comment || '';
        container.innerHTML = renderSummary(summary);
        const minutes = Math.max(1, Math.ceil(summary.length / 1000));
        $('reading-time-val').textContent = `${minutes} min read`;
        $('reading-time').hidden = false;
        generateToC();
        updateReadingProgress();
    } catch (error) {
        if (state.currentId !== post.id) return;
        console.error('[Reader] Could not load paper:', error);
        container.innerHTML = createErrorUI(
            'This summary could not be loaded. Check your connection, or open the paper on PubMed.',
            () => loadArticle(post, false)
        );
    }
}

function clearArticle() {
    state.currentId = null;
    document.title = 'Medical Research Blog | NTWKKM';
    $('empty-state').hidden = false;
    $('article-view').hidden = true;
    $('toc-container').hidden = true;
    updateNavButtons();
    updateReadingProgress();
}

function generateToC() {
    const toc = $('toc-container');
    const headers = document.querySelectorAll('#formatted-summary-container .sec-header');
    if (headers.length < 2) { toc.hidden = true; return; }
    $('toc-list').innerHTML = Array.from(headers)
        .map(h => `<a class="toc-link" href="#${h.id}">${escapeHTML(h.textContent)}</a>`).join('');
    toc.hidden = false;
}

/** Papers that share the most tags and specialties with the open one. */
function renderRelated(current) {
    const tags = new Set(current.tags.map(t => t.toLowerCase()));
    const scored = [];
    for (const post of state.posts) {
        if (post.id === current.id) continue;
        let score = 0;
        post.tags.forEach((t) => { if (tags.has(t.toLowerCase())) score += 2; });
        post.spec.forEach((i) => { if (current.spec.includes(i)) score += 1; });
        if (score >= 2) scored.push({ post, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3);

    $('related-papers').hidden = top.length === 0;
    $('related-grid').innerHTML = top.map(({ post }) => `
        <button type="button" class="related-card" data-id="${escapeHTML(post.id)}">
            <span class="related-title">${escapeHTML(post.title)}</span>
            <span class="related-date mono">${escapeHTML(post.date)}</span>
        </button>`).join('');
}

function navigateArticle(direction) {
    const at = state.filtered.findIndex(p => p.id === state.currentId);
    const next = state.filtered[at + direction];
    if (at === -1 || !next) return;
    const page = Math.floor((at + direction) / PAGE_SIZE) + 1;
    if (page !== state.page) { state.page = page; renderList(); }
    loadArticle(next);
}

function updateNavButtons() {
    const at = state.filtered.findIndex(p => p.id === state.currentId);
    const atStart = at <= 0;
    const atEnd = at === -1 || at >= state.filtered.length - 1;
    ['nav-prev-article', 'mob-nav-prev'].forEach((id) => { $(id).disabled = atStart; });
    ['nav-next-article', 'mob-nav-next'].forEach((id) => { $(id).disabled = atEnd; });
    ['citation-btn', 'mob-nav-cite'].forEach((id) => { $(id).disabled = !state.currentId; });
}

function updateReadingProgress() {
    const bar = document.querySelector('.reading-progress-bar');
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = state.currentId && scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
    bar.style.transform = `scaleX(${progress})`;
}

// ---------------------------------------------------------------------------
// Citation
// ---------------------------------------------------------------------------

let citationFormat = 'vancouver';

function renderCitation() {
    const post = state.byId.get(state.currentId);
    if (post) $('citation-text').value = generateCitation(post, citationFormat);
    document.querySelectorAll('.citation-format-tab').forEach((tab) => {
        tab.setAttribute('aria-pressed', String(tab.dataset.format === citationFormat));
    });
}

function openCitationModal() {
    if (!state.currentId) return;
    renderCitation();
    $('citation-copy-btn').textContent = 'Copy citation';
    $('citation-dialog').showModal();
}

async function copyCitation() {
    const btn = $('citation-copy-btn');
    try {
        await navigator.clipboard.writeText($('citation-text').value);
        btn.textContent = 'Copied';
        triggerHaptic('success');
        announceToScreenReader('Citation copied to clipboard');
    } catch (error) {
        // Clipboard access can be refused; select the text so Ctrl/Cmd+C works.
        $('citation-text').select();
        btn.textContent = 'Press Ctrl+C to copy';
    }
    setTimeout(() => { btn.textContent = 'Copy citation'; }, 2000);
}

// ---------------------------------------------------------------------------
// Sidebar (docked on desktop, drawer on small screens)
// ---------------------------------------------------------------------------
function syncSidebar() {
    const app = $('app-container');
    const visible = MOBILE.matches ? app.classList.contains('sidebar-open') : !app.classList.contains('sidebar-hidden');
    $('sidebar').inert = !visible;
    // An open drawer is modal: nothing behind its backdrop may take focus.
    const modal = MOBILE.matches && visible;
    document.querySelector('.main-content').inert = modal;
    $('mobile-bottom-nav').inert = modal;
    $('sidebar-open-btn').setAttribute('aria-expanded', String(visible));
    $('mob-nav-menu').setAttribute('aria-expanded', String(visible));
}

let sidebarOpener = null;

function openSidebar() {
    const app = $('app-container');
    if (MOBILE.matches && !app.classList.contains('sidebar-open')) sidebarOpener = document.activeElement;
    app.classList.remove('sidebar-hidden');
    app.classList.add('sidebar-open');
    syncSidebar();
    if (MOBILE.matches) $('sidebar-close-btn').focus();
}

function closeSidebar() {
    const app = $('app-container');
    const hadFocus = $('sidebar').contains(document.activeElement);
    app.classList.add('sidebar-hidden');
    app.classList.remove('sidebar-open');
    syncSidebar();
    // Focus inside a closing sidebar would be lost; hand it to what opened the
    // drawer, or on desktop to the button that brings the list back.
    if (!hadFocus) return;
    if (!MOBILE.matches) $('sidebar-open-btn').focus();
    else if (sidebarOpener && sidebarOpener.isConnected && sidebarOpener !== document.body) sidebarOpener.focus();
    else $('mob-nav-menu').focus();
}

// ---------------------------------------------------------------------------
// URL state: ?id= &q= &cat= &design=   (legacy ?tag= becomes a search)
// ---------------------------------------------------------------------------
function buildURL(id = state.currentId) {
    const params = new URLSearchParams();
    if (id) params.set('id', id);
    if (state.query) params.set('q', state.query);
    if (state.specs.size) params.set('cat', Array.from(state.specs, i => state.specialties[i].id).join(','));
    if (state.design !== -1) params.set('design', state.designs[state.design].id);
    const qs = params.toString();
    return `${window.location.pathname}${qs ? `?${qs}` : ''}`;
}

function readURL() {
    const params = new URLSearchParams(window.location.search);
    state.query = (params.get('q') || params.get('tag') || '').replace(/,/g, ' ').trim();
    state.specs = new Set(
        (params.get('cat') || '').split(',')
            .map(id => state.specialties.findIndex(s => s.id === id))
            .filter(i => i !== -1)
    );
    state.design = state.designs.findIndex(d => d.id === params.get('design'));
    $('search-input').value = state.query;
    if (state.query) ensureFullText();
    return params;
}

function route() {
    const params = readURL();
    applyFilters();
    const wantedId = params.get('id');
    const wantedPmid = params.get('pmid');
    const wanted = state.byId.get(wantedId)
        || (wantedPmid && state.posts.find(p => p.pmid === wantedPmid));
    const post = wanted || state.filtered[0];
    if (!post) { clearArticle(); return; }
    // Bring the list to the page that holds the open paper.
    const at = state.filtered.indexOf(post);
    if (at !== -1) { state.page = Math.floor(at / PAGE_SIZE) + 1; }
    loadArticle(post, false);
    // After loadArticle, which clears the notice: a link that named a paper
    // we do not hold must say so rather than pass off the default as that paper.
    if (!wanted && (wantedId || wantedPmid)) setRouteNotice({ pmid: wantedPmid || '' });
    renderList();
}

function onFiltersChanged() {
    applyFilters();
    history.replaceState(history.state, '', buildURL());
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
function setupEventListeners() {
    const search = $('search-input');
    // Full text (every chunk, several megabytes) loads on the first typed
    // character, not on focus: pressing "/" alone must not start that download.
    search.addEventListener('input', debounce(() => {
        state.query = search.value.trim();
        if (state.query) ensureFullText();
        onFiltersChanged();
    }, 200));

    $('prev-btn').addEventListener('click', () => changePage(-1));
    $('next-btn').addEventListener('click', () => changePage(1));

    $('sidebar-close-btn').addEventListener('click', closeSidebar);
    $('sidebar-open-btn').addEventListener('click', openSidebar);
    $('sidebar-overlay').addEventListener('click', closeSidebar);
    MOBILE.addEventListener('change', () => {
        $('app-container').classList.remove('sidebar-open', 'sidebar-hidden');
        syncSidebar();
    });

    $('filters-toggle').addEventListener('click', () => {
        const panel = $('filters-panel');
        panel.hidden = !panel.hidden;
        $('filters-toggle').setAttribute('aria-expanded', String(!panel.hidden));
    });

    const resetAll = () => {
        state.query = '';
        search.value = '';
        state.specs.clear();
        state.design = -1;
        onFiltersChanged();
    };
    $('clear-filters').addEventListener('click', () => {
        state.specs.clear();
        state.design = -1;
        onFiltersChanged();
    });

    // One delegated listener serves the list, the chips and the related cards.
    document.addEventListener('click', (e) => {
        const item = e.target.closest('.article-list-item, .related-card');
        if (item) {
            const post = state.byId.get(item.dataset.id);
            if (post) loadArticle(post);
            return;
        }
        const spec = e.target.closest('[data-spec]');
        if (spec) {
            const i = Number(spec.dataset.spec);
            // In the article a chip means "show me this specialty"; in the panel it toggles.
            if (spec.classList.contains('tag-badge')) { state.specs = new Set([i]); if (MOBILE.matches) openSidebar(); }
            else if (state.specs.has(i)) state.specs.delete(i);
            else state.specs.add(i);
            onFiltersChanged();
            return;
        }
        const design = e.target.closest('.filter-tag[data-design]');
        if (design) {
            const i = Number(design.dataset.design);
            state.design = state.design === i ? -1 : i;
            onFiltersChanged();
            return;
        }
        const tag = e.target.closest('.tag-link');
        if (tag) {
            state.query = tag.dataset.tag;
            search.value = state.query;
            ensureFullText();
            onFiltersChanged();
            if (MOBILE.matches) openSidebar();
            return;
        }
        if (e.target.closest('#reset-search')) resetAll();
    });

    $('nav-prev-article').addEventListener('click', () => navigateArticle(-1));
    $('nav-next-article').addEventListener('click', () => navigateArticle(1));
    $('citation-btn').addEventListener('click', openCitationModal);

    $('mob-nav-menu').addEventListener('click', () => { openSidebar(); triggerHaptic('light'); });
    $('mob-nav-prev').addEventListener('click', () => { navigateArticle(-1); triggerHaptic('light'); });
    $('mob-nav-next').addEventListener('click', () => { navigateArticle(1); triggerHaptic('light'); });
    $('mob-nav-cite').addEventListener('click', () => { openCitationModal(); triggerHaptic('light'); });

    $('citation-close-btn').addEventListener('click', () => $('citation-dialog').close());
    $('citation-copy-btn').addEventListener('click', copyCitation);
    document.querySelectorAll('.citation-format-tab').forEach((tab) => {
        tab.addEventListener('click', () => { citationFormat = tab.dataset.format; renderCitation(); });
    });

    // Reader font size, remembered between visits
    let scale = 1;
    const applyScale = (value) => {
        scale = Math.min(Math.max(value, 0.85), 1.5);
        $('article-view').style.setProperty('--reader-scale', scale.toFixed(2));
        $('font-decrease').disabled = scale <= 0.85;
        $('font-increase').disabled = scale >= 1.5;
        try { localStorage.setItem('reader_font_size', scale.toFixed(2)); } catch (e) { /* private mode */ }
    };
    try {
        const saved = parseFloat(localStorage.getItem('reader_font_size'));
        if (!Number.isNaN(saved)) applyScale(saved);
    } catch (e) { /* private mode */ }
    $('font-decrease').addEventListener('click', () => applyScale(scale - 0.1));
    $('font-increase').addEventListener('click', () => applyScale(scale + 0.1));

    window.addEventListener('scroll', updateReadingProgress, { passive: true });
    window.addEventListener('resize', debounce(updateReadingProgress, 100));

    // Shortcuts: arrows move between papers, "/" focuses search, Escape closes the drawer
    document.addEventListener('keydown', (e) => {
        if ($('citation-dialog').open) return;
        const el = document.activeElement;
        const typing = el && (/^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable);
        if (typing) {
            if (e.key === 'Escape') { el.blur(); if (MOBILE.matches) closeSidebar(); }
            return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        // Shift+Arrow extends a text selection; it must not change the paper.
        if (e.key === 'ArrowLeft' && !e.shiftKey) navigateArticle(-1);
        else if (e.key === 'ArrowRight' && !e.shiftKey) navigateArticle(1);
        else if (e.key === '/') {
            e.preventDefault();
            openSidebar();
            search.focus();
            search.select();
        } else if (e.key === 'Escape' && MOBILE.matches) closeSidebar();
    });

    window.addEventListener('popstate', route);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function init() {
    syncSidebar();
    const loading = $('loading-indicator');
    loading.hidden = false;

    const index = await fetchWithFallback(INDEX_URL);
    loading.hidden = true;

    if (!index || !Array.isArray(index.posts) || index.posts.length === 0) {
        $('result-count').textContent = '';
        $('sidebar-list').innerHTML = `<li>${createErrorUI('The paper list could not be loaded. Check your connection and try again.', init)}</li>`;
        clearArticle();
        $('empty-state').querySelector('p').textContent = 'The paper list could not be loaded.';
        return;
    }
    // A retry that succeeds must not leave the failure text in the empty state.
    $('empty-state').querySelector('p').textContent = EMPTY_HINT;

    state.specialties = index.specialties || [];
    state.designs = index.designs || [];
    state.posts = index.posts.map(rowToPost);
    state.byId = new Map(state.posts.map(p => [p.id, p]));

    renderFacets();
    route();
    announceToScreenReader(`Loaded ${state.posts.length} papers`);
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    init();
});

// A stale copy of the old all-in-one cache can be several megabytes; drop it.
try { localStorage.removeItem('research_blog_data_v2'); } catch (e) { /* private mode */ }

// shared.js - utilities used by both pages (index.js, blog.js)

// ===========================================================================
// UTILITIES
// ===========================================================================

/**
 * Debounce a function call
 * @param {Function} fn
 * @param {number} delay - milliseconds
 */
function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function escapeHTML(str) {
    if (str === undefined || str === null || str === '') return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

function sanitizeURL(url) {
    if (!url) return '#';
    try { return ['http:', 'https:'].includes(new URL(url).protocol) ? url : '#'; }
    catch { return '#'; }
}

const FETCH_TIMEOUT_MS = 8000;

/**
 * Fetch JSON with retries and exponential backoff. An attempt that gets no
 * response within FETCH_TIMEOUT_MS is abandoned, so a stalled connection ends
 * in the error state with its retry button instead of a skeleton that never resolves.
 * Requests revalidate with the server (`cache: 'no-cache'`), so fresh data
 * arrives without cache-busting query strings.
 * @param {string} url
 * @param {*} fallbackData - returned when every attempt fails
 * @param {number} maxRetries
 */
async function fetchWithFallback(url, fallbackData = null, maxRetries = 2) {
    for (let i = 0; i < maxRetries; i++) {
        // The limit covers the wait for a response to start. Once headers
        // arrive it is lifted, so a large file on a slow link is not cut off
        // and downloaded again from the beginning.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const response = await fetch(url, { cache: 'no-cache', signal: controller.signal });
            clearTimeout(timer);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            clearTimeout(timer);
            console.warn(`[Fetch] Attempt ${i + 1}/${maxRetries} failed for ${url}:`, error.message);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
        }
    }
    return fallbackData;
}

// ===========================================================================
// LOADING AND ERROR STATES
// ===========================================================================

const retryCallbacks = new Map();
let retrySeq = 0;

/**
 * Error block with a retry button. The callback is held in a registry and
 * dispatched by one delegated listener, so no handler lives in the markup.
 * @param {string} message
 * @param {Function} retryCallback
 * @returns {string} HTML
 */
function createErrorUI(message, retryCallback) {
    const id = String(++retrySeq);
    retryCallbacks.set(id, retryCallback);
    return `
    <div class="error-state" role="alert">
      <svg class="error-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      <h3 class="error-title">Loading failed</h3>
      <p class="error-message">${escapeHTML(message)}</p>
      <button type="button" class="btn retry-btn" data-retry="${id}">Try again</button>
    </div>`;
}

// No document under `node --test`, where only the pure utilities are used.
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-retry]');
        if (!btn) return;
        const callback = retryCallbacks.get(btn.dataset.retry);
        retryCallbacks.delete(btn.dataset.retry);
        if (callback) callback();
    });
}

/**
 * Skeleton placeholder
 * @param {number} count
 * @param {'card'|'list'} type
 * @returns {string} HTML
 */
function createSkeletonUI(count = 3, type = 'card') {
    const item = type === 'list'
        ? '<div class="skeleton-list-item"><div class="skeleton-line w-70"></div><div class="skeleton-line w-40"></div></div>'
        : '<div class="skeleton-card"><div class="skeleton-line w-60"></div><div class="skeleton-line w-80"></div><div class="skeleton-line w-40"></div></div>';
    return `<div class="skeleton-container" aria-hidden="true">${item.repeat(count)}</div>`;
}

// ===========================================================================
// ACCESSIBILITY
// ===========================================================================

function initScreenReaderAnnouncer() {
    if (document.getElementById('sr-announcer')) return;
    const announcer = document.createElement('div');
    announcer.id = 'sr-announcer';
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    document.body.appendChild(announcer);
}

function announceToScreenReader(message, priority = 'polite') {
    const announcer = document.getElementById('sr-announcer');
    if (!announcer) return;
    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;
    setTimeout(() => { announcer.textContent = ''; }, 1000);
}

function triggerHaptic(type = 'light') {
    if (!('vibrate' in navigator)) return;
    const patterns = { light: 20, medium: 40, error: [40, 60, 40], success: [30, 40, 30] };
    try { navigator.vibrate(patterns[type] || 20); } catch (e) { /* blocked by permissions */ }
}

// ===========================================================================
// THEME
// ===========================================================================

function initSharedTheme() {
    const toggleBtn = document.getElementById('theme-toggle');
    const root = document.documentElement;
    if (!toggleBtn) return;

    const sunIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000 1.41.996.996 0 001.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06z"/></svg>';
    const moonIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.37 5.51A7.35 7.35 0 009.1 7.5c0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27A7.014 7.014 0 0112 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>';

    const paint = (theme) => {
        root.setAttribute('data-theme', theme);
        toggleBtn.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
        toggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        // Browser chrome follows the page canvas in both themes.
        const meta = document.querySelector('meta[name="theme-color"]');
        const canvas = getComputedStyle(root).getPropertyValue('--bg-body').trim();
        if (meta && canvas) meta.setAttribute('content', canvas);
    };

    // The inline head script has already set the attribute; keep the two in step.
    paint(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

    toggleBtn.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        // Applied synchronously: the switch must never wait on an animation.
        paint(next);
        try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
    });
}

// ===========================================================================
// NETWORK STATUS AND SERVICE WORKER
// ===========================================================================

function initNetworkStatus() {
    const pill = document.createElement('div');
    pill.id = 'offline-pill';
    pill.className = 'offline-pill';
    pill.setAttribute('role', 'status');
    pill.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 1l22 22"></path><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>Offline. Showing saved copies.';
    document.body.appendChild(pill);

    const update = () => pill.classList.toggle('is-offline', !navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
}

/**
 * Register the service worker and offer a reload when a new version takes
 * over. The page never reloads by itself: a reader is not interrupted
 * mid-article, and the first controller a tab gains shows nothing.
 */
function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    // False on a first visit; flips once this tab is claimed, so only a later
    // change (a new deploy taking over) offers the reload.
    let controlled = Boolean(navigator.serviceWorker.controller);

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
            console.warn('[PWA] Service worker registration failed:', error);
        });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!controlled) { controlled = true; return; }
        if (document.getElementById('pwa-update-bar')) return;
        const bar = document.createElement('div');
        bar.id = 'pwa-update-bar';
        bar.className = 'pwa-update-bar';
        bar.setAttribute('role', 'status');
        bar.innerHTML = '<span>A new version is ready.</span><button type="button" class="btn btn-primary pwa-update-btn" id="pwa-refresh-btn">Reload</button>';
        document.body.appendChild(bar);
        document.getElementById('pwa-refresh-btn').addEventListener('click', () => window.location.reload());
    });
}

if (typeof document !== 'undefined') {
    initServiceWorker();

    document.addEventListener('DOMContentLoaded', () => {
        initScreenReaderAnnouncer();
        initSharedTheme();
        initNetworkStatus();
    });
}

if (typeof module !== 'undefined' && module.exports) module.exports = { escapeHTML, sanitizeURL, debounce };

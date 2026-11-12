/**
 * Service worker for ntwkkm.github.io (homepage and research reader only).
 *
 * Strategy: network-first with a short timeout, cache as the fallback.
 * A reader on hospital Wi-Fi always gets the current code and data when the
 * network answers, and the last good copy when it does not.
 *
 * Scope note: this worker is registered at "/", which also covers the sibling
 * project sites published under the same origin (/pl/, /er-hub/, /er-ped/ ...).
 * Those requests are deliberately left alone so a clinical tool is never
 * served from a stale copy held by this worker.
 */

const VERSION = 'v6';
const SHELL_CACHE = `ntwkkm-shell-${VERSION}`;
const DATA_CACHE = `ntwkkm-data-${VERSION}`;
const FONTS_CACHE = 'ntwkkm-fonts-v1';
const KEEP = [SHELL_CACHE, DATA_CACHE, FONTS_CACHE];

const NETWORK_TIMEOUT_MS = 4000;

const SHELL = [
    '/',
    '/index.html',
    '/index.css',
    '/index.js',
    '/blog.html',
    '/blog.css',
    '/blog.js',
    '/shared.css',
    '/shared.js',
    '/manifest.json',
];

const DATA_FILES = ['/papers.json', '/projects.json', '/blog_index.json'];
const DATA_PREFIX = '/data/blog/';

const isShell = pathname => SHELL.includes(pathname);
const isData = pathname => DATA_FILES.includes(pathname) || pathname.startsWith(DATA_PREFIX);

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then(cache => cache.addAll(SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(names.filter(n => !KEEP.includes(n)).map(n => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

/**
 * Network first; fall back to the cache on failure or after the timeout.
 * Entries are stored under the URL without its query string, so cache-busting
 * parameters never create duplicate copies.
 */
async function networkFirst(request, cacheName) {
    const url = new URL(request.url);
    const key = url.origin + url.pathname;
    const cache = await caches.open(cacheName);

    // Revalidate with the server instead of trusting the HTTP cache, so a
    // deploy is picked up on the next load (a 304 keeps this cheap).
    const fromNetwork = fetch(url.href, { cache: 'no-cache' }).then((response) => {
        if (response.ok) cache.put(key, response.clone());
        return response;
    });

    const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT_MS, null));

    try {
        const winner = await Promise.race([fromNetwork, timeout]);
        if (winner && winner.ok) return winner;
        const cached = await cache.match(key);
        if (cached) return cached;
        // Nothing cached: wait for the network however slow, or surface its error.
        return winner || await fromNetwork;
    } catch (error) {
        const cached = await cache.match(key);
        if (cached) return cached;
        if (request.mode === 'navigate') {
            const fallback = url.pathname.startsWith('/blog') ? '/blog.html' : '/index.html';
            const page = await cache.match(url.origin + fallback) || await cache.match(fallback);
            if (page) return page;
        }
        throw error;
    }
}

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(cacheFirst(request, FONTS_CACHE));
        return;
    }

    if (url.origin !== self.location.origin) return;

    if (isShell(url.pathname)) {
        event.respondWith(networkFirst(request, SHELL_CACHE));
    } else if (isData(url.pathname)) {
        event.respondWith(networkFirst(request, DATA_CACHE));
    }
    // Anything else, including sibling project sites, goes straight to the network.
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(caches.keys().then(names => Promise.all(names.map(n => caches.delete(n)))));
    }
});

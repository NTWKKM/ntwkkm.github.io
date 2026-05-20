/**
 * Service Worker for NTWKKM Personal Website
 * Provides offline support with cache-first strategy for static assets
 * and network-first with cache fallback for dynamic content.
 */

// CACHE_NAME constant removed as per code review
const STATIC_CACHE = 'ntwkkm-static-v1';
const DYNAMIC_CACHE = 'ntwkkm-dynamic-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/blog.html',
    '/shared.css',
    '/shared.js',
    '/manifest.json',
    '/tracking/',
    '/fray/'
];

// Dynamic content that should be network-first
const DYNAMIC_PATHS = [
    '/papers.json',
    '/projects.json',
    '/blog_index.json',
    '/data/blog/',
    '/tracking/status_store.json',
    '/tracking/auth.json',
    '/tracking/track_list.json',
    '/fray/dashboard-snapshot-clean.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static assets:', error);
                throw error;
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Service worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    const pathname = new URL(url).pathname;

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests except for fonts and CDN
    if (!url.startsWith(self.location.origin)) {
        // Cache Google Fonts
        if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
            event.respondWith(
                caches.open(STATIC_CACHE)
                    .then((cache) => {
                        return cache.match(event.request)
                            .then((cachedResponse) => {
                                if (cachedResponse) {
                                    return cachedResponse;
                                }

                                return fetch(event.request)
                                    .then((networkResponse) => {
                                        if (networkResponse.ok) {
                                            cache.put(event.request, networkResponse.clone());
                                        }
                                        return networkResponse;
                                    })
                                    .catch(() => {
                                        // Return offline indicator for fonts
                                        return new Response('', { status: 404 });
                                    });
                            });
                    })
            );
            return;
        }
        return;
    }

    // Check if this is a dynamic path (network-first)
    const isDynamic = DYNAMIC_PATHS.some(path => pathname.startsWith(path) || pathname === path);

    if (isDynamic) {
        // Network-first strategy for dynamic content
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // Cache successful responses
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then((cache) => cache.put(event.request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(event.request)
                        .then((cachedResponse) => {
                            if (cachedResponse) {
                                console.log('[SW] Serving from cache (offline):', pathname);
                                return cachedResponse;
                            }

                            // Return offline page for HTML requests
                            if (event.request.destination === 'document') {
                                return caches.match('/index.html');
                            }

                            // Return error response for other requests
                            return new Response(JSON.stringify({
                                error: 'offline',
                                message: 'You are offline and this resource is not cached.'
                            }), {
                                status: 503,
                                headers: { 'Content-Type': 'application/json' }
                            });
                        });
                })
        );
    } else {
        // Cache-first strategy for static assets
        event.respondWith(
            caches.match(event.request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        // Return cached version but fetch fresh version in background
                        fetch(event.request)
                            .then((networkResponse) => {
                                if (networkResponse.ok) {
                                    caches.open(STATIC_CACHE)
                                        .then((cache) => cache.put(event.request, networkResponse));
                                }
                            })
                            .catch(() => {
                                // Silently fail for background updates
                            });

                        return cachedResponse;
                    }

                    // Not in cache, fetch from network
                    return fetch(event.request)
                        .then((networkResponse) => {
                            if (networkResponse.ok) {
                                const responseClone = networkResponse.clone();
                                caches.open(STATIC_CACHE)
                                    .then((cache) => cache.put(event.request, responseClone));
                            }
                            return networkResponse;
                        })
                        .catch(() => {
                            // Return offline page for HTML requests
                            if (event.request.destination === 'document') {
                                return caches.match('/index.html');
                            }

                            return new Response('Offline', { status: 503 });
                        });
                })
        );
    }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((names) => {
                return Promise.all(names.map((name) => caches.delete(name)));
            })
        );
    }
});

// Background sync for offline actions (future use)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(
            Promise.resolve().then(() => {
                // Future: sync offline data when back online
                console.log('[SW] Background sync triggered');
            })
        );
    }
});
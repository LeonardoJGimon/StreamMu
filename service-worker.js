/**
 * Service Worker
 * Cacheo de assets, offline support, y background sync
 */

const CACHE_NAME = 'app-cache-v12';
const STATIC_ASSETS = [
    '/manifest.json',
    '/assets/css/style.css',
    '/assets/js/constants.js',
    '/assets/js/layout.js',
    '/assets/js/main.js',
    '/assets/icon/icon.png'
];

// Evento Install - Cachear assets estáticos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('Cache addAll failed:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Evento Activate - Limpiar caches antiguos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Evento Fetch - Estrategia Cache-First para assets, Network-First para API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip chrome extensions y otros protocolos especiales
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // HTML principal: usar network-first para obtener siempre la versión más reciente
    if (url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const cache = caches.open(CACHE_NAME);
                        cache.then(c => c.put(event.request, response.clone()));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then((response) => {
                        return response || new Response(
                            'Offline - Resource not available',
                            { status: 503, statusText: 'Service Unavailable' }
                        );
                    });
                })
        );
        return;
    }

    // Estrategia para assets estáticos
    if (isStaticAsset(url.pathname)) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request).then((response) => {
                    if (response.ok) {
                        const cache = caches.open(CACHE_NAME);
                        cache.then(c => c.put(event.request, response.clone()));
                    }
                    return response;
                });
            }).catch(() => {
                // Fallback offline
                return caches.match('/offline.html') || new Response(
                    'Offline - Resource not available',
                    { status: 503, statusText: 'Service Unavailable' }
                );
            })
        );
        return;
    }

    // Estrategia Network-First para API calls
    if (isAPICall(url.pathname)) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const cache = caches.open(CACHE_NAME);
                        cache.then(c => c.put(event.request, response.clone()));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then((response) => {
                        return response || new Response(
                            JSON.stringify({ offline: true }),
                            { status: 503, headers: { 'Content-Type': 'application/json' } }
                        );
                    });
                })
        );
        return;
    }

    // Default: Network-First
    event.respondWith(
        fetch(event.request)
            .then((response) => response)
            .catch(() => {
                return caches.match(event.request) || new Response(
                    'Network request failed',
                    { status: 503 }
                );
            })
    );
});

/**
 * Helper: Identificar assets estáticos
 */
function isStaticAsset(pathname) {
    return /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i.test(pathname) ||
           pathname === '/' ||
           pathname === '/index.html';
}

/**
 * Helper: Identificar API calls
 */
function isAPICall(pathname) {
    return pathname.startsWith('/api/') ||
           pathname.startsWith('/auth/') ||
           pathname.startsWith('/streaming/') ||
           pathname.startsWith('/news') ||
           pathname.startsWith('/top-ranking') ||
           pathname.startsWith('/event-info');
}

/**
 * Periodic Background Sync (si disponible)
 * Para sincronizar datos cuando vuelve conexión
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncCriticalData());
    }
});

async function syncCriticalData() {
    try {
        const endpoints = [
            '/auth/servers',
            '/news',
            '/top-ranking-characters'
        ];

        return Promise.all(
            endpoints.map(endpoint =>
                fetch(endpoint)
                    .then(r => r.json())
                    .then(data => {
                        const cache = caches.open(CACHE_NAME);
                        cache.then(c => c.put(endpoint, new Response(JSON.stringify(data))));
                    })
                    .catch(err => console.warn(`Sync failed for ${endpoint}:`, err))
            )
        );
    } catch (error) {
        console.warn('Background sync failed:', error);
    }
}

/**
 * Push Notifications (si disponible)
 */
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    const options = {
        body: data.body || 'New notification',
        icon: '/assets/icon/icon.png',
        badge: '/assets/icon/badge.png',
        tag: data.tag || 'notification',
        requireInteraction: data.requireInteraction || false
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'AnyLauncher', options)
    );
});

/**
 * Click en notificación push
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data?.url || '/');
            }
        })
    );
});

console.log('Service Worker loaded');

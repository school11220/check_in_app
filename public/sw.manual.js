const CACHE_NAME = 'eventhub-v1';
const STATIC_ASSETS = [
    '/logo.png',
    '/favicon.png',
    '/sounds/success.mp3',
    '/sounds/error.mp3',
];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests (mutations like POST /api/checkin)
    if (request.method !== 'GET') return;

    // Skip Clerk auth and webhook endpoints
    if (url.pathname.startsWith('/api/webhooks') || url.pathname.includes('clerk')) return;

    // Network-first for ticket pages (so QR codes work offline)
    if (url.pathname.startsWith('/ticket/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Network-first for ticket API data
    if (url.pathname.startsWith('/api/tickets/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Cache-first for static assets
    if (
        STATIC_ASSETS.some((asset) => url.pathname === asset) ||
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|css|js)$/)
    ) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Network-first for everything else (HTML pages, API)
    event.respondWith(networkFirst(request));
});

// Cache-first: return cached version, fall back to network
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Offline', { status: 503 });
    }
}

// Network-first: try network, fall back to cache
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;

        // For HTML navigation requests, return a basic offline page
        if (request.headers.get('Accept')?.includes('text/html')) {
            return new Response(
                `<!DOCTYPE html>
        <html lang="en">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>EventHub - Offline</title>
        <style>body{background:#0B0B0B;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
        .c{max-width:400px;padding:2rem}.icon{font-size:3rem;margin-bottom:1rem}h1{font-size:1.5rem;margin-bottom:.5rem}p{color:#737373;font-size:.9rem}
        button{margin-top:1.5rem;padding:.75rem 2rem;background:#E11D2E;color:#fff;border:none;border-radius:12px;font-size:.9rem;cursor:pointer}</style>
        </head><body><div class="c"><div class="icon">OFFLINE</div><h1>You're Offline</h1><p>Check your internet connection and try again.</p>
        <button onclick="location.reload()">Retry</button></div></body></html>`,
                { status: 503, headers: { 'Content-Type': 'text/html' } }
            );
        }
        return new Response('Offline', { status: 503 });
    }
}

// ─── Background Sync: process offline check-in queue ───────────────────────
self.addEventListener('sync', (event) => {
    if (event.tag === 'checkin-sync') {
        event.waitUntil(processOfflineCheckins());
    }
});

async function processOfflineCheckins() {
    let db;
    try { db = await openIDB(); } catch { return; }

    const pending = await db.getAll('pending_logs');
    if (!pending.length) return;

    await Promise.allSettled(
        pending.map(async (entry) => {
            const res = await fetch('/api/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: entry.ticketId, eventId: entry.eventId, source: 'offline-sync' }),
            });
            if (res.ok) await db.delete('pending_logs', entry.ticketId);
        })
    );

    const allClients = await self.clients.matchAll({ type: 'window' });
    allClients.forEach(c => c.postMessage({ type: 'SYNC_COMPLETE' }));
}

function openIDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('offline-checkin', 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('pending_logs'))
                db.createObjectStore('pending_logs', { keyPath: 'ticketId' });
            if (!db.objectStoreNames.contains('tickets')) {
                const ts = db.createObjectStore('tickets', { keyPath: 'id' });
                ts.createIndex('eventId', 'eventId', { unique: false });
                ts.createIndex('token', 'token', { unique: false });
            }
        };
        req.onsuccess = (e) => {
            const raw = e.target.result;
            const wrap = (store, mode, fn) => new Promise((res, rej) => {
                const tx = raw.transaction(store, mode);
                const r2 = fn(tx.objectStore(store));
                r2.onsuccess = () => res(r2.result);
                r2.onerror = rej;
            });
            raw.getAll = (store) => wrap(store, 'readonly', s => s.getAll());
            raw.delete = (store, key) => wrap(store, 'readwrite', s => s.delete(key));
            resolve(raw);
        };
        req.onerror = reject;
    });
}
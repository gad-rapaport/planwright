/*
 * Planwright service worker (template). The build fills in the two placeholders below with the content hash
 * and the list of built files (vite.config.ts), so every release has a byte-different worker and the browser picks it up.
 *
 * Strategy: the whole app is precached at install; requests are answered from that cache first, so the app
 * opens and works with no network. A new version installs in the background and waits until the page asks it
 * to take over (the "New version: reload" button), so an open plan is never replaced mid-edit.
 */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `planwright-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('planwright-') && k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === '/healthz') return;
  if (request.mode === 'navigate') {
    // Every route is the same single-page app.
    event.respondWith(caches.match('/index.html', { cacheName: CACHE }).then((hit) => hit || fetch(request)));
    return;
  }
  event.respondWith(caches.match(request, { cacheName: CACHE }).then((hit) => hit || fetch(request)));
});

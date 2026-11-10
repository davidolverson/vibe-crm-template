// VIBE service worker.
// Strategy: network-first for HTML + API calls, cache-first for static
// assets, graceful fallback to /offline for navigation failures.
// Bump CACHE_VERSION when shipping a breaking change so stale clients
// drop their caches on next activate.

const CACHE_VERSION = 'vibe-v2-2026-04-22';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept auth or API routes — those must hit the network.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data') ||
    url.pathname.startsWith('/sign-')
  ) {
    return;
  }

  // Navigation requests: network-first, fall back to /offline.
  // Only cache PUBLIC navigations (marketing pages, /p/ sites). Authed app
  // routes like /dashboard must not be cached — otherwise a user signing out
  // and back in as someone else on the same device would see the prior
  // user's rendered HTML for a beat. Keep the safe-list conservative.
  if (req.mode === 'navigate') {
    const cacheablePublic =
      url.pathname === '/' ||
      url.pathname.startsWith('/p/') ||
      url.pathname === '/pricing' ||
      url.pathname === '/founding-50' ||
      url.pathname === '/contact' ||
      url.pathname === '/privacy' ||
      url.pathname === '/terms' ||
      url.pathname === '/changelog' ||
      url.pathname === '/offline';
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheablePublic) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/offline')))
    );
    return;
  }

  // Static assets under /_next/static: cache-first.
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Everything else: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((hit) => {
      const fetched = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => hit);
      return hit || fetched;
    })
  );
});

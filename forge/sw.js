// Bump CACHE_NAME on every deploy (same cadence as ?v= strings in index.html).
// Old caches with a different name are deleted on activate.
const CACHE_NAME = 'taletrove-2026.05.12a';
const STATIC_ASSETS = [
  './',
  './index.html',
  './worldbuilder.css',
  './worldbuilder.js',
  './utils.js',
  './state.js',
  './data.js',
  './map.js',
  './google-drive.js',
  'https://unpkg.com/@elfalem/leaflet-curve@0.9.2/dist/leaflet.curve.js',
  './inspector.js',
  './block-editor.js',
  './panels.js',
  './image-search.js',
  './modals.js',
  './ui.js',
  './styles.js',
  './markdown-extensions.js',
  './tutorial.js',
  './generator.js',
  './grid.js',
  './dice-roller.js',
  './armoria.js',
  './cat_themable.svg',
  // DiceBox engine (CDN) — assets are large and cached on first use via CDN strategy
  'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist/dice-box.es.min.js',
  'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist/world.offscreen.min.js',
  'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist/world.onscreen.min.js',
  'https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1.1.4/dist/Dice.min.js',
  // Data files loaded by data.js at runtime — required for offline use
  './data/blocks.js',
  './data/taxonomy.json',
  './data/generators.json',
  './data/icon-manifest.json',
  './data/ui-icon-manifest.json',
  './data/icon-synonyms.json',
  './data/news.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CDNs: cache-first. Local: stale-while-revalidate.
  const isCDN = url.hostname.includes('unpkg.com') ||
                url.hostname.includes('cdn.jsdelivr.net') ||
                url.hostname.includes('cdnjs.cloudflare.com') ||
                url.hostname.includes('fonts.googleapis.com') ||
                url.hostname.includes('fonts.gstatic.com');

  // Pass through external API calls (e.g. api.github.com) — don't intercept
  const isLocal = url.hostname === self.location.hostname || url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (!isLocal && !isCDN) return;

  // Cache API only supports GET; skip everything else
  if (event.request.method !== 'GET') return;

  if (isCDN) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse); // Network failed — fall back to cache
        return cachedResponse || fetchPromise;
      })
    );
  }
});

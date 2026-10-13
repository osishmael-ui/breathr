const CACHE = 'breathr-v1';
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/audio/restore-relax.mp3',
  '/audio/arrive-relax.mp3',
  '/audio/downshift-relax.mp3',
];

async function precacheApp() {
  const cache = await caches.open(CACHE);
  await cache.addAll(SHELL);

  const response = await fetch('/index.html', { cache: 'reload' });
  const html = await response.clone().text();
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)[^"]*"/g)]
    .map((match) => match[1]);

  await cache.put('/index.html', response);
  await cache.addAll([...new Set(assets)]);

  const stylesheets = assets.filter((asset) => asset.endsWith('.css'));
  const fontAssets = [];

  for (const stylesheet of stylesheets) {
    const cssResponse = await cache.match(stylesheet);
    if (!cssResponse) continue;
    const css = await cssResponse.text();
    for (const match of css.matchAll(/url\(["']?([^"'()]+\.woff2)["']?\)/g)) {
      fontAssets.push(new URL(match[1], new URL(stylesheet, self.location.origin)).pathname);
    }
  }

  await cache.addAll([...new Set(fontAssets)]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheApp());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
        return response;
      }).catch(() => caches.match('/index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => Response.error())),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

const CACHE_PREFIX = `daily-tasks:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}v11`;
const ASSETS = [
  "./",
  "./styles.css?v=10",
  "./app.js?v=11",
  "./vendor/csv-parse-6.1.0.js",
  "./manifest.json",
  "./icon.svg",
];
const assetURLs = new Set(ASSETS.map((asset) => new URL(asset, self.registration.scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS.map((asset) => new Request(asset, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("./", { cacheName: CACHE_NAME })));
  } else if (assetURLs.has(request.url)) {
    event.respondWith(
      caches.match(request, { cacheName: CACHE_NAME }).then((cached) => cached || fetch(request)),
    );
  }
});

const CACHE = 'gongfu-v1';
const ASSETS = ['./', './index.html', './app.js', './style.css', './manifest.webmanifest', './icon.svg', './icon-180.png'];

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys =>
  Promise.all(keys.filter(k => k.startsWith('gongfu-') && k !== CACHE).map(k => caches.delete(k))))));

// Network first so updates land straight away; the cache is only for brewing offline.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || Response.error())));
});

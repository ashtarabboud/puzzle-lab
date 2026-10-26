/* Puzzle Lab service worker — version 202610260006-7c1cdd. Caches the whole app so it works offline. */
const CACHE = 'puzzle-lab-202610260006-7c1cdd';
const ASSETS = ["./","index.html","app.45cc27988e.js","data.57c157eeba.js","style.b31b4a0a26.css","manifest.webmanifest","icons/apple-touch-icon.png","icons/favicon-32.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","fonts/atkinson-400.woff2","fonts/atkinson-700.woff2","fonts/bricolage-600.woff2","fonts/bricolage-700.woff2","fonts/jbmono-500.woff2","fonts/jbmono-700.woff2"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); });
self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('puzzle-lab-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') { // the page: network first so updates are found, cache when offline
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return r; }).catch(() => caches.match('index.html', { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
});

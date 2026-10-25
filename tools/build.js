/* Build the installable web app into dist/.
   - app.<hash>.js: core + game engines; data.<hash>.js: word banks and lexicon; style.<hash>.css
   - index.html with Home Screen metadata, manifest.webmanifest, sw.js (offline cache, versioned)
   Usage: node tools/build.js */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..'), R = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = (name) => 'PL.data["' + name + '"]=' + JSON.stringify(JSON.parse(R('data/' + name + '.json'))) + ';';
const GAMES = ['password', 'island', 'bridges', 'algebra', 'loop', 'detective', 'shape', 'balance', 'reverse', 'links', 'logic'];
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);

const dataFiles = ['src/data/words.js', 'src/data/lexicon.js'].map(R).concat(['password_a', 'password_b', 'island_vocab', 'wordlinks'].filter(n => fs.existsSync(path.join(root, 'data', n + '.json'))).map(json));
const data = 'var PL = (typeof PL !== "undefined") ? PL : { data: {}, games: {} }; PL.data = PL.data || {};\n' + dataFiles.join('\n;\n');
const code = [R('src/core/base.js'), R('src/core/linalg.js'), ...GAMES.filter(g => fs.existsSync(path.join(root, 'src/games', g + '.js'))).map(g => R('src/games/' + g + '.js')),
  R('src/core/store.js'), R('src/core/model.js'), R('src/core/scratch.js'), R('src/core/calc.js'), R('src/core/app.js')].join('\n;\n');
const css = R('src/style.css');
const version = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') + '-' + hash(code + data + css).slice(0, 6);
const appJs = 'PL.VERSION=' + JSON.stringify(version) + ';\n' + code;
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const names = { app: 'app.' + hash(appJs) + '.js', data: 'data.' + hash(data) + '.js', css: 'style.' + hash(css) + '.css' };
fs.writeFileSync(path.join(out, names.app), appJs);
fs.writeFileSync(path.join(out, names.data), data);
fs.writeFileSync(path.join(out, names.css), css);
fs.cpSync(path.join(root, 'public'), out, { recursive: true });

const manifest = {
  name: 'Puzzle Lab', short_name: 'Puzzle Lab', description: 'A personal arcade of ten puzzle games.',
  start_url: './', scope: './', display: 'standalone', orientation: 'portrait', background_color: '#f4f5f2', theme_color: '#3b3fa8',
  icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
};
fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Puzzle Lab</title>
<meta name="description" content="A personal arcade of ten puzzle games.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Puzzle Lab">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#f4f5f2" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121419" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="stylesheet" href="${names.css}">
</head>
<body>
<div id="app"></div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script src="${names.data}"></script>
<script src="${names.app}"></script>
<script>
PL.boot();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker && navigator.serviceWorker.register('sw.js').then(function (reg) {
    function offer(w) { if (!w) return; PL.showUpdate(function () { w.postMessage('skip-waiting'); }); }
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', function () {
      var w = reg.installing;
      w && w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
    });
    setInterval(function () { reg.update().catch(function () {}); }, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) reg.update().catch(function () {}); });
  }).catch(function () {});
  // reload only when an update replaces an existing worker (not on the very first install)
  var hadController = !!(navigator.serviceWorker && navigator.serviceWorker.controller), reloaded = false;
  navigator.serviceWorker && navigator.serviceWorker.addEventListener('controllerchange', function () { if (!hadController || reloaded) return; reloaded = true; location.reload(); });
}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(out, 'index.html'), html);

const precache = ['./', 'index.html', names.app, names.data, names.css, 'manifest.webmanifest',
  ...fs.readdirSync(path.join(out, 'icons')).map(f => 'icons/' + f), ...fs.readdirSync(path.join(out, 'fonts')).map(f => 'fonts/' + f)];
const sw = `/* Puzzle Lab service worker — version ${version}. Caches the whole app so it works offline. */
const CACHE = 'puzzle-lab-${version}';
const ASSETS = ${JSON.stringify(precache)};
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
`;
fs.writeFileSync(path.join(out, 'sw.js'), sw);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
const size = f => (fs.statSync(path.join(out, f)).size / 1024).toFixed(0) + 'KB';
console.log('version', version, '| app', size(names.app), '| data', size(names.data), '| css', size(names.css));

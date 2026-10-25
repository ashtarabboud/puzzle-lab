/* ===== Puzzle Lab core: namespace, RNG, helpers, rational math, dictionary ===== */
var PL = (typeof PL !== 'undefined') ? PL : {};
PL.data = PL.data || {};
PL.games = PL.games || {};
PL.order = ['password', 'island', 'bridges', 'algebra', 'loop', 'detective', 'shape', 'balance', 'reverse', 'links',
  'wordcount', 'wordgrid', 'threads', 'trails', 'wordrush', 'catlogic', 'survey'];
PL.groups = [
  { name: 'Word games', games: ['password', 'wordgrid', 'threads', 'trails', 'wordrush', 'links', 'bridges', 'survey'] },
  { name: 'Logic & deduction', games: ['island', 'wordcount', 'detective', 'catlogic'] },
  { name: 'Math & reasoning', games: ['algebra', 'balance', 'reverse'] },
  { name: 'Visual & spatial', games: ['loop', 'shape'] }
];
PL.DAILY_V2_ORDER = ['password', 'island', 'bridges', 'algebra', 'loop', 'detective', 'shape', 'balance', 'reverse', 'links'];
PL.retired = ['logic']; // kept only so historical records can still be reviewed
PL.OLD_DAILY_ORDER = ['password', 'island', 'logic', 'bridges', 'algebra', 'loop', 'detective', 'shape', 'balance'];

/* ---- Seeded RNG (mulberry32) ---- */
PL.hash = function (str) {
  var h = 1779033703 ^ str.length;
  for (var i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
};
PL.rng = function (seed) {
  var a = (typeof seed === 'string') ? PL.hash(seed) : (seed >>> 0);
  var f = function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.int = function (lo, hi) { return lo + Math.floor(f() * (hi - lo + 1)); };
  f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
  f.shuffle = function (arr) {
    var a2 = arr.slice();
    for (var i = a2.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var t = a2[i]; a2[i] = a2[j]; a2[j] = t; }
    return a2;
  };
  f.chance = function (p) { return f() < p; };
  f.weighted = function (items, weights) {
    var tot = 0, i; for (i = 0; i < weights.length; i++) tot += weights[i];
    var r = f() * tot;
    for (i = 0; i < items.length; i++) { r -= weights[i]; if (r < 0) return items[i]; }
    return items[items.length - 1];
  };
  return f;
};

/* ---- Small helpers ---- */
PL.clamp = function (x, lo, hi) { return Math.max(lo, Math.min(hi, x)); };
PL.round = function (x) { return Math.round(x); };
PL.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };
PL.deep = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };
PL.fmtTime = function (ms) {
  var s = Math.max(0, Math.round(ms / 1000));
  var m = Math.floor(s / 60), r = s % 60;
  if (m >= 60) { var hh = Math.floor(m / 60); m = m % 60; return hh + ':' + (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r; }
  return m + ':' + (r < 10 ? '0' : '') + r;
};
PL.dateKey = function (d) {
  d = d || new Date();
  var m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
};
PL.dayNumber = function (key) { // days since 2026-01-01 for a YYYY-MM-DD key (UTC arithmetic, no DST issues)
  var p = key.split('-');
  return Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(2026, 0, 1)) / 86400000);
};
PL.mean = function (a) { if (!a.length) return null; var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; };
PL.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
PL.cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
PL.plural = function (n, word, pl) { return n + ' ' + (n === 1 ? word : (pl || word + 's')); };
PL.listJoin = function (arr, conj) {
  conj = conj || 'and';
  if (arr.length <= 1) return arr.join('');
  if (arr.length === 2) return arr[0] + ' ' + conj + ' ' + arr[1];
  return arr.slice(0, -1).join(', ') + ', ' + conj + ' ' + arr[arr.length - 1];
};

/* ---- DOM builder (no-op stub under Node tests) ---- */
PL.h = function (tag, attrs) {
  var el = document.createElement(tag);
  var kids = Array.prototype.slice.call(arguments, 2);
  if (attrs) {
    for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') { for (var s in v) el.style.setProperty(s, v[s]); }
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  var add = function (c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(add); return; }
    el.appendChild((typeof c === 'string' || typeof c === 'number') ? document.createTextNode(String(c)) : c);
  };
  kids.forEach(add);
  return el;
};
PL.svg = function (tag, attrs) {
  var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (var k in (attrs || {})) {
    if (attrs[k] == null) continue;
    if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
    else el.setAttribute(k, attrs[k]);
  }
  for (var i = 2; i < arguments.length; i++) {
    var c = arguments[i];
    if (c == null) continue;
    if (Array.isArray(c)) c.forEach(function (x) { if (x) el.appendChild(x); });
    else if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else el.appendChild(c);
  }
  return el;
};

/* ---- Exact rational arithmetic ---- */
(function () {
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function Q(n, d) {
    if (d === undefined) d = 1;
    if (d === 0) throw new Error('Division by zero');
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  PL.Q = Q;
  PL.gcd = gcd;
  PL.qadd = function (a, b) { return Q(a.n * b.d + b.n * a.d, a.d * b.d); };
  PL.qsub = function (a, b) { return Q(a.n * b.d - b.n * a.d, a.d * b.d); };
  PL.qmul = function (a, b) { return Q(a.n * b.n, a.d * b.d); };
  PL.qdiv = function (a, b) { return Q(a.n * b.d, a.d * b.n); };
  PL.qeq = function (a, b) { return a.n === b.n && a.d === b.d; };
  PL.qval = function (a) { return a.n / a.d; };
  PL.qstr = function (a) { return a.d === 1 ? String(a.n) : a.n + '/' + a.d; };
  PL.qmixed = function (a) {
    if (a.d === 1) return String(a.n);
    var dec = a.n / a.d;
    var s = a.n + '/' + a.d;
    var r = Math.round(dec * 1000) / 1000;
    return s + ' (≈ ' + r + ')';
  };
  /* Parse user numeric input: integers, decimals, fractions, mixed numbers "2 1/2", percents, with commas, $ and units stripped. Returns Q or null */
  PL.parseNum = function (str) {
    if (str == null) return null;
    var s = String(str).trim().toLowerCase().replace(/[$,]/g, '').replace(/[a-z%°]+\.?$/g, function (m) { return m === '%' ? '%' : ''; }).trim();
    s = s.replace(/\s*(dollars?|cents?|hours?|hrs?|minutes?|mins?|years?|yrs?|km|miles?|mph|kg|g|litres?|liters?|l|ml|units?|pounds?|lbs?|grams?|days?|people|items?|coins?|points?|m|cm|s|seconds?|secs?)$/, '').trim();
    var pct = false;
    if (/%$/.test(s)) { pct = true; s = s.slice(0, -1).trim(); }
    var m;
    var out = null;
    if ((m = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/))) {
      var w = +m[1], n = +m[2], d = +m[3];
      if (d === 0) return null;
      out = Q((w < 0 ? -1 : 1) * (Math.abs(w) * d + n), d);
    } else if ((m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/))) {
      if (+m[2] === 0) return null;
      out = Q(+m[1], +m[2]);
    } else if ((m = s.match(/^-?(\d+\.?\d*|\.\d+)$/))) {
      var parts = s.split('.');
      if (parts.length === 1) out = Q(parseInt(s, 10), 1);
      else {
        var dp = parts[1].length;
        var den = Math.pow(10, dp);
        out = Q(Math.round(parseFloat(s) * den), den);
      }
    }
    if (out && pct) out = PL.qdiv(out, Q(100));
    return out;
  };
  /* Compare user answer against exact answer: exact match, or decimal within rounding of displayed precision */
  PL.numMatch = function (input, ans, opts) {
    var q = PL.parseNum(input);
    if (!q) return false;
    if (PL.qeq(q, ans)) return true;
    if (opts && opts.percentOk && PL.qeq(PL.qmul(q, Q(1, 100)), ans)) return true;
    if (opts && opts.percentOk && PL.qeq(q, PL.qmul(ans, Q(100)))) return true;
    var v = PL.qval(ans), u = PL.qval(q);
    if (ans.d !== 1) { // allow decimals rounded to 2+ places
      var str = String(input).trim();
      var dec = (str.split('.')[1] || '').replace(/[^0-9]/g, '').length;
      if (dec >= 2 && Math.abs(u - v) <= 0.5 * Math.pow(10, -dec) + 1e-9) return true;
    }
    return false;
  };
})();

/* ---- Dictionary ---- */
PL.dict = (function () {
  var all = null, tierOf = null, byLen = {};
  function load() {
    if (all) return;
    all = new Set(); tierOf = {};
    var W = PL.data.words;
    ['A', 'B', 'C'].forEach(function (t) {
      var g = W[t];
      for (var len in g) {
        var s = g[len], L = +len;
        for (var i = 0; i < s.length; i += L) {
          var w = s.substr(i, L);
          all.add(w); tierOf[w] = t;
          (byLen[L] = byLen[L] || { A: [], B: [], C: [] })[t].push(w);
        }
      }
    });
  }
  return {
    has: function (w) { load(); return all.has(String(w).toLowerCase()); },
    tier: function (w) { load(); return tierOf[String(w).toLowerCase()] || null; },
    words: function (len, tiers) {
      load(); var g = byLen[len]; if (!g) return [];
      var out = []; (tiers || ['A']).forEach(function (t) { out = out.concat(g[t]); });
      return out;
    }
  };
})();

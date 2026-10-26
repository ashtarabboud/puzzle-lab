PL.VERSION="202610260006-7c1cdd";
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

;
/* ===== Exact linear algebra + Fourier–Motzkin entailment over rationals ===== */
(function () {
  var Q = PL.Q, add = PL.qadd, sub = PL.qsub, mul = PL.qmul, div = PL.qdiv;
  var Z = Q(0), ONE = Q(1);
  function isZ(a) { return a.n === 0; }
  PL.la = {};
  /* Row-reduce matrix of rationals (array of rows, each array of Q, last column = constant). Returns RREF + pivot columns */
  PL.la.rref = function (M, ncols) {
    var A = M.map(function (r) { return r.slice(); });
    var piv = [], row = 0;
    for (var c = 0; c < ncols && row < A.length; c++) {
      var p = -1;
      for (var r = row; r < A.length; r++) if (!isZ(A[r][c])) { p = r; break; }
      if (p < 0) continue;
      var t = A[p]; A[p] = A[row]; A[row] = t;
      var inv = div(ONE, A[row][c]);
      A[row] = A[row].map(function (x) { return mul(x, inv); });
      for (r = 0; r < A.length; r++) {
        if (r !== row && !isZ(A[r][c])) {
          var f = A[r][c];
          A[r] = A[r].map(function (x, j) { return sub(x, mul(f, A[row][j])); });
        }
      }
      piv.push(c); row++;
    }
    return { A: A, piv: piv };
  };
  /* Given equations rows [coef_0..coef_{n-1}, const] meaning sum coef_i x_i = const,
     decide whether linear form f (array of n Q) has a determined value. Returns Q value or null.
     Method: f is determined iff f lies in the row space of the coefficient matrix. */
  PL.la.determined = function (rows, n, f) {
    var R = PL.la.rref(rows, n);
    // consistency check: no row 0 = nonzero
    for (var i = 0; i < R.A.length; i++) {
      var allz = true; for (var j = 0; j < n; j++) if (!isZ(R.A[i][j])) { allz = false; break; }
      if (allz && !isZ(R.A[i][n])) return { inconsistent: true };
    }
    // reduce f by pivot rows
    var g = f.slice(), val = Z;
    R.piv.forEach(function (c, k) {
      if (!isZ(g[c])) {
        var coef = g[c];
        for (var j = 0; j < n; j++) g[j] = sub(g[j], mul(coef, R.A[k][j]));
        val = add(val, mul(coef, R.A[k][n]));
      }
    });
    for (var j2 = 0; j2 < n; j2++) if (!isZ(g[j2])) return null;
    return val;
  };
  /* Find coefficients lambda such that sum lambda_k * rows_k (coef part) = f. Returns array of Q or null */
  PL.la.combo = function (rows, n, f) {
    var m = rows.length;
    // unknowns lambda (m of them); equations: for each j<n: sum_k lambda_k rows[k][j] = f[j]
    var M = [];
    for (var j = 0; j < n; j++) {
      var r = []; for (var k = 0; k < m; k++) r.push(rows[k][j]); r.push(f[j]); M.push(r);
    }
    var R = PL.la.rref(M, m);
    for (var i = 0; i < R.A.length; i++) {
      var allz = true; for (var c = 0; c < m; c++) if (!isZ(R.A[i][c])) { allz = false; break; }
      if (allz && !isZ(R.A[i][m])) return null;
    }
    var lam = []; for (var k2 = 0; k2 < m; k2++) lam.push(Z);
    R.piv.forEach(function (c, idx) { lam[c] = R.A[idx][m]; });
    return lam;
  };

  /* Fourier–Motzkin feasibility for constraints {a:[Q..], op:'>'|'>='|'=', b:Q} meaning a·x op b. */
  function fmFeasible(cons, n) {
    // normalise '=' into two '>='
    var C = [];
    cons.forEach(function (c) {
      if (c.op === '=') {
        C.push({ a: c.a.slice(), b: c.b, s: false });
        C.push({ a: c.a.map(function (x) { return Q(-x.n, x.d); }), b: Q(-c.b.n, c.b.d), s: false });
      } else C.push({ a: c.a.slice(), b: c.b, s: c.op === '>' });
    });
    for (var v = 0; v < n; v++) {
      var pos = [], neg = [], zero = [];
      C.forEach(function (c) { if (c.a[v].n > 0) pos.push(c); else if (c.a[v].n < 0) neg.push(c); else zero.push(c); });
      var next = zero;
      // a·x >= b with a_v>0 gives lower bound; with a_v<0 gives upper bound. Combine each pair.
      for (var i = 0; i < pos.length; i++) for (var j = 0; j < neg.length; j++) {
        var p = pos[i], q = neg[j];
        var fp = div(ONE, p.a[v]), fq = div(ONE, Q(-q.a[v].n, q.a[v].d));
        var a = p.a.map(function (x, k) { return add(mul(x, fp), mul(q.a[k], fq)); });
        a[v] = Z;
        next.push({ a: a, b: add(mul(p.b, fp), mul(q.b, fq)), s: p.s || q.s });
      }
      // de-duplicate to limit growth
      var seen = {}; C = [];
      next.forEach(function (c) { var key = c.a.map(PL.qstr).join(',') + '|' + PL.qstr(c.b) + c.s; if (!seen[key]) { seen[key] = 1; C.push(c); } });
      if (C.length > 4000) return true; // give up conservatively (treat as feasible → not entailed)
    }
    // all coefficients zero: need 0 >= b (or 0 > b if strict)
    for (var t = 0; t < C.length; t++) {
      var bv = PL.qval(C[t].b);
      if (C[t].s ? !(0 > bv) : !(0 >= bv)) return false;
    }
    return true;
  }
  PL.la.feasible = fmFeasible;
  /* Does the system (with all variables > 0) entail f·x op 0 ? op in '>','<','=' */
  PL.la.entails = function (cons, n, f, op) {
    var base = cons.slice();
    for (var i = 0; i < n; i++) { var a = []; for (var j = 0; j < n; j++) a.push(j === i ? ONE : Z); base.push({ a: a, op: '>', b: Z }); }
    var neg = function (x) { return Q(-x.n, x.d); };
    if (op === '>') return !fmFeasible(base.concat([{ a: f.map(neg), op: '>=', b: Z }]), n); // f<=0 infeasible
    if (op === '<') return !fmFeasible(base.concat([{ a: f, op: '>=', b: Z }]), n);
    if (op === '=') return !fmFeasible(base.concat([{ a: f, op: '>', b: Z }]), n) && !fmFeasible(base.concat([{ a: f.map(neg), op: '>', b: Z }]), n);
    return false;
  };
  PL.la.consistent = function (cons, n) {
    var base = cons.slice();
    for (var i = 0; i < n; i++) { var a = []; for (var j = 0; j < n; j++) a.push(j === i ? ONE : Z); base.push({ a: a, op: '>', b: Z }); }
    return fmFeasible(base, n);
  };
})();

;
/* ===== GAME 1: PASSWORD ===== */
(function () {
  var h = PL.h;
  var BANK = null;
  function bank() {
    if (BANK) return BANK;
    // v3 bank (curated for natural, contemporary associations); the v1 bank is only used if v3 is missing
    BANK = (PL.data.password_v2_a || []).concat(PL.data.password_v2_b || []);
    if (!BANK.length) BANK = (PL.data.password_a || []).concat(PL.data.password_b || []);
    return BANK;
  }
  PL.passwordBank = bank;
  var UNSOLVED = 9; // clue-count penalty for a passed word (7 clues + 2)

  function pickWords(level, rng, n, seen) {
    var B = bank(), lv = PL.clamp(level, 1, 10), out = [], used = {};
    var seenSet = {}; (seen || []).forEach(function (w) { seenSet[w] = 1; });
    for (var widen = 1; out.length < n && widen <= 10; widen++) {
      var pool = B.filter(function (e) { return Math.abs(e.d - lv) <= widen && !used[e.w]; });
      var fresh = pool.filter(function (e) { return !seenSet[e.w]; });
      var src = fresh.length >= n - out.length ? fresh : pool;
      // prefer exact level, then neighbours
      src = rng.shuffle(src).sort(function (a, b) { return Math.abs(a.d - lv) - Math.abs(b.d - lv); });
      var take = src.slice(0, Math.max(0, n - out.length));
      // mix a little: keep at most 70% at exact level for variety
      take.forEach(function (e) { if (!used[e.w] && out.length < n) { used[e.w] = 1; out.push(e); } });
    }
    return rng.shuffle(out);
  }
  function generate(level, rng, ctx) {
    var n = ctx && ctx.daily ? 5 : 10; // daily: five words, one combined score out of 100
    var ws = pickWords(level, rng, n, ctx && ctx.seenWords);
    return { n: n, words: ws.map(function (e) { return { w: e.w, alts: e.alts || [], clues: e.clues, d: e.d, def: e.def }; }) };
  }
  function init(p) { return { i: 0, res: p.words.map(function () { return { shown: 1, solved: false, passed: false, wrong: 0, guesses: [], hints: 0 }; }) }; }
  function matches(word, guess) {
    var g = guess.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (!g) return false;
    var opts = [word.w].concat(word.alts || []);
    return opts.some(function (o) { return o === g || o + 'S' === g || o + 'ES' === g || (o.slice(-1) === 'S' && o.slice(0, -1) === g); });
  }
  function clueScore(r) { return r.solved ? r.shown : UNSOLVED; }

  function view(api) {
    var p = api.p, gs = api.gs;
    if (gs.i >= p.n || api.done) return summaryView(p, gs);
    var word = p.words[gs.i], r = gs.res[gs.i];
    var inp = h('input', { id: 'pw-in', class: 'txt', type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'Your guess', enterkeyhint: 'go' });
    function advance() {
      gs.i++;
      if (gs.i >= p.n) { api.update(gs); api.finish(gs.res.some(function (x) { return x.solved; }) ? 'solved' : 'failed'); return; }
      api.update(gs);
      setTimeout(function () { var el = document.getElementById('pw-in'); if (el) el.focus(); }, 30);
    }
    function guess(e) {
      e.preventDefault();
      var g = inp.value.trim(); if (!g) return;
      r.guesses.push(g.toUpperCase());
      if (matches(word, g)) { r.solved = true; api.toast('Yes — ' + word.w + ' on clue ' + r.shown + '.', 'good'); advance(); return; }
      r.wrong++; api.wrong();
      api.toast('Not it.', 'bad');
      api.update(gs);
      setTimeout(function () { var el = document.getElementById('pw-in'); if (el) el.focus(); }, 30);
    }
    var total = gs.res.slice(0, gs.i).reduce(function (a, x) { return a + clueScore(x); }, 0);
    return h('div', { class: 'password' },
      p.n > 1 ? h('div', { class: 'pw-prog' }, gs.res.map(function (x, k) { return h('span', { class: 'pw-dot' + (k === gs.i ? ' cur' : x.solved ? ' ok' : x.passed ? ' bad' : '') }, ''); })) : null,
      h('div', { class: 'pw-head' }, h('span', { class: 'lbl' }, p.n > 1 ? 'Word ' + (gs.i + 1) + ' of ' + p.n : 'Secret word'), p.n > 1 ? h('span', { class: 'muted' }, 'Clues used so far: ' + total) : null),
      h('ol', { class: 'pw-clues' }, word.clues.slice(0, r.shown).map(function (c, k) { return h('li', { class: k === r.shown - 1 ? 'new' : '' }, c); })),
      r.hints ? h('div', { class: 'pw-letters mono', 'aria-label': 'Letter hint' }, pattern(word.w, r.hints)) : null,
      h('form', { class: 'row-in', onsubmit: guess }, inp, h('button', { class: 'btn primary', type: 'submit' }, 'Guess')),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn', disabled: r.shown >= word.clues.length, onclick: function () { r.shown++; api.update(gs); } }, r.shown >= word.clues.length ? 'No more clues' : 'Next clue (' + (r.shown + 1) + '/' + word.clues.length + ')'),
        h('button', { class: 'btn ghost', onclick: function () {
          if (!r.confirmPass) { r.confirmPass = true; api.update(gs); setTimeout(function () { r.confirmPass = false; }, 3000); return; }
          r.passed = true; api.toast('The word was ' + word.w + '.', ''); advance();
        } }, r.confirmPass ? 'Tap again to pass' : 'Pass')),
      r.guesses.length ? h('div', { class: 'muted small' }, 'Guesses: ' + r.guesses.join(', ')) : null);
  }
  function summaryView(p, gs) {
    var total = gs.res.reduce(function (a, x) { return a + clueScore(x); }, 0);
    return h('div', { class: 'password' },
      h('div', { class: 'lbl' }, p.n > 1 ? 'Total clues: ' + total + ' (best possible ' + p.n + ')' : 'Result'),
      h('table', { class: 'pwtable' }, p.words.map(function (w, k) {
        var r = gs.res[k];
        return h('tr', null, h('td', { class: 'mono' }, w.w), h('td', null, r.solved ? 'clue ' + r.shown : r.passed ? 'passed (+' + UNSOLVED + ')' : '—'), h('td', { class: 'muted' }, [r.wrong ? r.wrong + ' wrong' : '', r.hints ? PL.plural(r.hints, 'letter hint') : ''].filter(Boolean).join(' · ')));
      })));
  }
  /* Letter hints are separate from the association clues: each one reveals one more letter of the secret word
     (first letter, then last, then letters from the left), never the whole word. */
  function revealOrder(w) {
    var L = w.length, out = [0];
    if (L > 1) out.push(L - 1);
    for (var i = 1; i < L - 1; i++) out.push(i);
    return out.slice(0, Math.max(1, L - 1));
  }
  function pattern(w, n) {
    var show = revealOrder(w).slice(0, n), out = '';
    for (var i = 0; i < w.length; i++) out += (show.indexOf(i) >= 0 ? w[i] : '_') + (i < w.length - 1 ? ' ' : '');
    return out;
  }
  function hint(p, gs) {
    var r = gs.res[gs.i]; if (!r) return { msg: 'No word in play.', noCount: true };
    var w = p.words[gs.i].w;
    if (r.hints >= revealOrder(w).length) return { msg: 'No more letters can be revealed for this word.', noCount: true };
    r.hints++;
    return { msg: 'Letters: ' + pattern(w, r.hints), gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var per = gs.res.map(function (r) { return r.solved ? PL.clamp(100 - (r.shown - 1) * 14 - r.wrong * 5 - r.hints * 10, 5, 100) : 0; });
    var q = PL.mean(per);
    var total = gs.res.reduce(function (a, x) { return a + clueScore(x); }, 0);
    var solvedN = gs.res.filter(function (r) { return r.solved; }).length;
    return { quality: Math.round(q), metrics: { total: total, solved: solvedN, n: p.n, perWord: gs.res.map(function (r, k) { return { w: p.words[k].w, clues: r.shown, solved: r.solved, wrong: r.wrong, hints: r.hints || 0, passed: !!r.passed }; }), firstClue: gs.res.filter(function (r) { return r.solved && r.shown === 1; }).length, avgClues: PL.mean(gs.res.filter(function (r) { return r.solved; }).map(function (r) { return r.shown; })) },
      lines: [['Total clues', total + (p.n > 1 ? ' (lower is better)' : '')], ['Words solved', solvedN + '/' + p.n], ['Wrong guesses', gs.res.reduce(function (a, r) { return a + r.wrong; }, 0)]]
        .concat(p.n <= 5 && p.n > 1 ? gs.res.map(function (r, k) { return [p.words[k].w, r.solved ? 'clue ' + r.shown + (r.wrong ? ' · ' + r.wrong + ' wrong' : '') + (r.hints ? ' · ' + PL.plural(r.hints, 'letter hint') : '') : r.passed ? 'passed' : 'not reached']; }) : []) };
  }
  function review(p, gs) {
    return h('div', { class: 'review' }, p.words.map(function (w, k) {
      var r = gs.res[k];
      return h('div', { class: 'pw-rev' }, h('div', null, h('b', { class: 'mono' }, w.w), ' — ', r.solved ? 'solved on clue ' + r.shown : r.passed ? 'passed' : 'not reached'),
        h('div', { class: 'small' }, w.clues.map(function (c, i) { return (i + 1) + '. ' + c; }).join('  ')),
        h('div', { class: 'muted small' }, w.def), r.guesses.length ? h('div', { class: 'muted small' }, 'Guesses: ' + r.guesses.join(', ')) : null);
    }));
  }
  function stats(atts) {
    var full = atts.filter(function (a) { return a.metrics && a.metrics.n === 10 && a.outcome !== 'abandoned' && a.outcome !== 'skipped'; });
    var words = []; atts.forEach(function (a) { (a.metrics && a.metrics.perWord || []).forEach(function (w) { words.push(w); }); });
    var solved = words.filter(function (w) { return w.solved; });
    var best = full.length ? Math.min.apply(null, full.map(function (a) { return a.metrics.total; })) : null;
    return [['Average clues per solved word', solved.length ? PL.mean(solved.map(function (w) { return w.clues; })).toFixed(2) : '—'],
      ['Average total per 10-word game', full.length ? PL.mean(full.map(function (a) { return a.metrics.total; })).toFixed(1) : '—'],
      ['Personal best (10 words)', best != null ? best + ' clues' : '—'],
      ['Solved on the first clue', words.length ? Math.round(100 * solved.filter(function (w) { return w.clues === 1; }).length / words.length) + '%' : '—'],
      ['Words solved', words.length ? solved.length + '/' + words.length : '—'],
      ['Wrong guesses', words.reduce(function (a, w) { return a + (w.wrong || 0); }, 0)]];
  }
  PL.games.password = {
    id: 'password', name: 'Password', blurb: 'Guess secret words from clues revealed one at a time.',
    rules: 'Clues for a secret word appear one at a time, from subtle to obvious. Guess whenever you like or ask for the next clue. A full game has ten words; your score is the total number of clues you needed (lower is better). Passing a word costs ' + UNSOLVED + ' clues.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv, daily, p) { return daily ? (45 + lv * 6) * ((p && p.n) || 5) : 400 + lv * 30; }, timeLimit: function (lv) { return 600; },
    _matches: matches
  };
})();

;
/* ===== GAME 2: THE ISLAND =====
   Evaluation architecture (v2):
   - Every submission is normalised: lower case, punctuation removed, spaces collapsed, a leading article
     ("a", "an", "the", "some") dropped. Up to four words are accepted.
   - Spelling and structure rules are evaluated directly on the submitted letters (spaces ignored), with no dictionary check,
     so any submission gets a definite YES or NO.
   - Meaning rules use an offline lexicon: the curated island catalogue first, then WordNet categories (a word counts if any
     ordinary meaning fits). Plurals are reduced to singular forms and multi-word phrases fall back to their last word.
   - Sound rules use the CMU pronouncing dictionary with a deterministic fallback syllable counter. */
(function () {
  var h = PL.h;
  var V = null, LEX = null, CAT = null;
  function vocab() { if (!V) { V = {}; (PL.data.island_vocab || []).forEach(function (e) { V[e.w] = e; }); } return V; }
  function lex() { if (!LEX) { LEX = (PL.data.lexicon && PL.data.lexicon.w) || {}; CAT = {}; ((PL.data.lexicon && PL.data.lexicon.cats) || []).forEach(function (c, i) { CAT[c] = i; }); } return LEX; }

  /* ---------- normalisation ---------- */
  var ARTICLES = { a: 1, an: 1, the: 1, some: 1, my: 1 };
  function normalize(raw) {
    var s = String(raw || '').toLowerCase().replace(/&/g, ' and ').replace(/[’']/g, '').replace(/[^a-z\s-]/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    var words = s ? s.split(' ') : [];
    while (words.length > 1 && ARTICLES[words[0]]) words.shift();
    var text = words.join(' ');
    return { text: text, letters: words.join(''), words: words };
  }
  PL.islandNormalize = normalize;
  var IRREG = { mice: 'mouse', geese: 'goose', teeth: 'tooth', feet: 'foot', children: 'child', men: 'man', women: 'woman', people: 'person', oxen: 'ox', lice: 'louse', dice: 'die', knives: 'knife', wives: 'wife', leaves: 'leaf', loaves: 'loaf', wolves: 'wolf', halves: 'half', shelves: 'shelf', calves: 'calf', thieves: 'thief', scarves: 'scarf', hooves: 'hoof', potatoes: 'potato', tomatoes: 'tomato', heroes: 'hero', echoes: 'echo', cacti: 'cactus', fungi: 'fungus', octopi: 'octopus' };
  function singulars(w) {
    var out = [w];
    if (IRREG[w]) out.push(IRREG[w]);
    if (/ies$/.test(w) && w.length > 4) out.push(w.slice(0, -3) + 'y');
    if (/ves$/.test(w)) { out.push(w.slice(0, -3) + 'f'); out.push(w.slice(0, -3) + 'fe'); }
    if (/(ches|shes|xes|sses|zes|oes)$/.test(w)) out.push(w.slice(0, -2));
    if (/s$/.test(w) && !/ss$/.test(w)) out.push(w.slice(0, -1));
    return out;
  }
  /* ---------- meaning lookup ---------- */
  var CURATED_MAP = { animal: ['animal', 'mammal'], bird: ['animal', 'bird'], fish_sea: ['animal', 'fish'], insect: ['animal', 'insect'], fruit: ['food', 'fruit'], vegetable: ['food', 'vegetable'], food: ['food', 'dish'], drink: ['food', 'drink'], plant: ['plant'], tool: ['artifact', 'tool'], kitchen: ['artifact', 'tool'], furniture: ['artifact', 'furniture'], clothing: ['artifact', 'clothing'], instrument: ['artifact', 'instrument'], vehicle: ['artifact', 'vehicle'], sport: ['sport'], toy: ['artifact', 'toy'], stationery: ['artifact'], electronic: ['artifact', 'device'], container: ['artifact', 'container'], jewelry: ['artifact', 'clothing'], body_care: ['artifact'], weather_nature: ['nature'], building: ['artifact', 'building'] };
  function catsFromCurated(e) { var s = {}; (CURATED_MAP[e.cat] || []).forEach(function (c) { s[c] = 1; }); if (e.edible) s.food = 1; if (e.living && e.cat === 'plant') s.plant = 1; return s; }
  function catsFromMask(mask) { var s = {}; Object.keys(CAT).forEach(function (c) { if (mask & (1 << CAT[c])) s[c] = 1; }); return s; }
  // returns {cats, src, key} or null
  function meaning(n) {
    lex(); var voc = vocab();
    var keys = [n.text, n.letters];
    var last = n.words[n.words.length - 1];
    singulars(n.text).concat(singulars(n.letters)).forEach(function (k) { keys.push(k); });
    if (n.words.length > 1) { var head = n.words.slice(0, -1).join(' '); singulars(last).forEach(function (s2) { keys.push(head + ' ' + s2); keys.push(n.words.slice(0, -1).join('') + s2); }); }
    for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (voc[k]) return { cats: catsFromCurated(voc[k]), src: 'catalogue', key: k }; }
    for (i = 0; i < keys.length; i++) { var v = LEX[keys[i]]; if (v != null) { var m = parseInt(String(v).split(',')[0], 36); if (m) return { cats: catsFromMask(m), src: 'dictionary', key: keys[i] }; } }
    if (n.words.length > 1) { var hs = singulars(last); for (i = 0; i < hs.length; i++) { if (voc[hs[i]]) return { cats: catsFromCurated(voc[hs[i]]), src: 'catalogue', key: hs[i] }; var v2 = LEX[hs[i]]; if (v2 != null) { var m2 = parseInt(String(v2).split(',')[0], 36); if (m2) return { cats: catsFromMask(m2), src: 'dictionary', key: hs[i] }; } } }
    return null;
  }
  /* ---------- sound ---------- */
  function heuristicSyl(w) {
    w = w.toLowerCase(); if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    var m = w.match(/[aeiouy]{1,2}/g); return m ? m.length : 1;
  }
  function wordPhon(w) {
    lex(); var v = LEX[w];
    if (v != null) { var p = String(v).split(','); if (p.length >= 3) return { syl: +p[1], vstart: p[2] === '1' }; }
    var sg = singulars(w); for (var i = 1; i < sg.length; i++) { var v2 = LEX[sg[i]]; if (v2 != null) { var q = String(v2).split(','); if (q.length >= 3) return { syl: +q[1] + (/(ches|shes|xes|sses|zes|ges)$/.test(w) ? 1 : 0), vstart: q[2] === '1' }; } }
    return { syl: heuristicSyl(w), vstart: /^[aeiou]/.test(w) && !/^(uni|use|eu|one|once)/.test(w) };
  }
  function syllables(n) { return n.words.reduce(function (s, w) { return s + wordPhon(w).syl; }, 0); }
  function vowelSoundStart(n) { return n.words.length ? wordPhon(n.words[0]).vstart : false; }
  /* ---------- structure helpers ---------- */
  var VOW = 'aeiou';
  function isV(ch) { return VOW.indexOf(ch) >= 0; }
  function vowels(w) { var c = 0; for (var i = 0; i < w.length; i++) if (isV(w[i])) c++; return c; }
  function compoundish(n) { // two or more words, or splittable into two dictionary words of 3+ letters
    if (n.words.length >= 2) return true;
    var w = n.letters; for (var i = 3; i <= w.length - 3; i++) if (PL.dict.has(w.slice(0, i)) && PL.dict.has(w.slice(i)) && PL.dict.tier(w.slice(0, i)) !== 'C' && PL.dict.tier(w.slice(i)) !== 'C') return true;
    return false;
  }

  /* kind: 'spell' (letters only), 'sem' (meaning), 'sound', 'rel' (depends on the previous accepted item)
     f(n, prev, ctx, param) -> true | false | null (null only when a meaning rule cannot identify the item) */
  function hasCat(n, c) { var m = meaning(n); return m ? !!m.cats[c] : null; }
  var CATN = { animal: 'animals of any kind (including birds, fish and insects)', bird: 'birds', insect: 'insects, spiders and other bugs', fruit: 'fruits', food: 'things people eat or drink', drink: 'drinks', instrument: 'musical instruments', furniture: 'furniture', clothing: 'clothing, shoes and accessories', vehicle: 'vehicles', building: 'buildings and structures', fish: 'fish and sea creatures' };
  var RULES = [
    { id: 'dbl', d: 2, kind: 'spell', text: 'Items with a double letter (two identical letters side by side).', f: function (n) { return /(.)\1/.test(n.letters); } },
    { id: 'startvowel', d: 1, kind: 'spell', text: 'Items whose first letter is a vowel (A, E, I, O, U).', f: function (n) { return isV(n.letters[0]); } },
    { id: 'endvowel', d: 2, kind: 'spell', text: 'Items whose last letter is a vowel (A, E, I, O, U).', f: function (n) { return isV(n.letters[n.letters.length - 1]); } },
    { id: 'len4', d: 2, kind: 'spell', text: 'Items with exactly four letters.', f: function (n) { return n.letters.length === 4; } },
    { id: 'len6p', d: 2, kind: 'spell', text: 'Items with six or more letters.', f: function (n) { return n.letters.length >= 6; } },
    { id: 'noe', d: 3, kind: 'spell', text: 'Items that contain no letter E.', f: function (n) { return n.letters.indexOf('e') < 0; } },
    { id: 'hasa', d: 2, kind: 'spell', text: 'Items that contain the letter A.', f: function (n) { return n.letters.indexOf('a') >= 0; } },
    { id: 'samefl', d: 4, kind: 'spell', text: 'Items that start and end with the same letter.', f: function (n) { return n.letters[0] === n.letters[n.letters.length - 1]; } },
    { id: 'onevowel', d: 4, kind: 'spell', text: 'Items with exactly one vowel letter (Y does not count).', f: function (n) { return vowels(n.letters) === 1; } },
    { id: 'secondhalf', d: 4, kind: 'spell', text: 'Items whose first letter is in the second half of the alphabet (N–Z).', f: function (n) { return n.letters[0] >= 'n'; } },
    { id: 'repeat', d: 4, kind: 'spell', text: 'Items in which some letter appears at least twice (anywhere).', f: function (n) { return new Set(n.letters.split('')).size < n.letters.length; } },
    { id: 'evenlen', d: 5, kind: 'spell', text: 'Items with an even number of letters.', f: function (n) { return n.letters.length % 2 === 0; } },
    { id: 'firstlast', d: 6, kind: 'spell', text: 'Items whose first letter comes earlier in the alphabet than their last letter.', f: function (n) { return n.letters[0] < n.letters[n.letters.length - 1]; } },
    { id: 'abc', d: 7, kind: 'spell', text: 'Items containing two neighbouring letters that are also consecutive in the alphabet, in order (like ST in “stop”).', f: function (n) { for (var i = 1; i < n.letters.length; i++) if (n.letters.charCodeAt(i) - n.letters.charCodeAt(i - 1) === 1) return true; return false; } },
    { id: 'vgtc', d: 7, kind: 'spell', text: 'Items where vowels make up at least half the letters.', f: function (n) { return vowels(n.letters) * 2 >= n.letters.length; } },
    { id: 'cvc', d: 8, kind: 'spell', text: 'Items whose vowels and consonants strictly alternate (Y counts as a consonant).', f: function (n) { var w = n.letters; for (var i = 1; i < w.length; i++) if (isV(w[i]) === isV(w[i - 1])) return false; return true; } },
    { id: 'c_len5', d: 8, kind: 'spell', text: 'Items that start with a consonant AND have exactly five letters.', f: function (n) { return !isV(n.letters[0]) && n.letters.length === 5; } },
    { id: 'dbl_or_y', d: 8, kind: 'spell', text: 'Items with a double letter OR ending in Y (either is enough).', f: function (n) { return /(.)\1/.test(n.letters) || n.letters.slice(-1) === 'y'; } },
    { id: 'compound', d: 5, kind: 'spell', text: 'Items made of two words, written together or apart (“toothbrush”, “ice cream”).', f: function (n) { return compoundish(n); } },
    { id: 'syl1', d: 4, kind: 'sound', text: 'Items with exactly one syllable.', f: function (n) { return syllables(n) === 1; } },
    { id: 'syl3', d: 5, kind: 'sound', text: 'Items with three or more syllables.', f: function (n) { return syllables(n) >= 3; } },
    { id: 'syl2', d: 6, kind: 'sound', text: 'Items with exactly two syllables.', f: function (n) { return syllables(n) === 2; } },
    { id: 'vsound', d: 6, kind: 'sound', text: 'Items that begin with a vowel sound (so “hour” counts and “unicorn” does not).', f: function (n) { return vowelSoundStart(n); } },
    { id: 'chain', d: 6, kind: 'rel', text: 'Each item must start with the last letter of the previous accepted item. (The first item is always welcome.)', f: function (n, prev) { return !prev || n.letters[0] === prev[prev.length - 1]; } },
    { id: 'longer', d: 7, kind: 'rel', text: 'Each item must have more letters than the previous accepted item. (The first item is always welcome.)', f: function (n, prev) { return !prev || n.letters.length > prev.length; } },
    { id: 'shareletter', d: 8, kind: 'rel', text: 'Each item must share a letter with the previous accepted item, but not its first letter. (The first item is always welcome.)', f: function (n, prev) { if (!prev) return true; if (n.letters[0] === prev[0]) return false; for (var i = 0; i < n.letters.length; i++) if (prev.indexOf(n.letters[i]) >= 0) return true; return false; } },
    { id: 'alphaafter', d: 9, kind: 'rel', text: 'Each item must come later in alphabetical order than the previous accepted item. (The first item is always welcome.)', f: function (n, prev) { return !prev || n.letters > prev; } },
    { id: 'cat', d: 1, kind: 'sem', param: ['fruit', 'animal', 'clothing', 'instrument', 'vehicle', 'food'], text: function (k) { return 'Only ' + CATN[k] + '.'; }, f: function (n, p, c, k) { return hasCat(n, k); } },
    { id: 'cat2', d: 3, kind: 'sem', param: ['bird', 'insect', 'furniture', 'building', 'drink'], text: function (k) { return 'Only ' + CATN[k] + '.'; }, f: function (n, p, c, k) { return hasCat(n, k); } },
    { id: 'notfood', d: 4, kind: 'sem', text: 'Anything that is NOT something people eat or drink.', f: function (n) { var x = hasCat(n, 'food'); return x == null ? null : !x; } },
    { id: 'food_syl', d: 7, kind: 'sem', text: 'Only things people eat or drink whose names have two or more syllables.', f: function (n) { var x = hasCat(n, 'food'); return x == null ? null : x && syllables(n) >= 2; } },
    { id: 'animal_short', d: 8, kind: 'sem', text: 'Only animals whose names have five letters or fewer.', f: function (n) { var x = hasCat(n, 'animal'); return x == null ? null : x && n.letters.length <= 5; } },
    { id: 'animal_or_vowel', d: 8, kind: 'sem', text: 'Animals, or anything at all that starts with a vowel letter (either is enough).', f: function (n) { if (isV(n.letters[0])) return true; return hasCat(n, 'animal'); } },
    { id: 'cat_consonant', d: 9, kind: 'sem', param: ['food', 'clothing', 'animal'], text: function (k) { return 'Only ' + CATN[k] + ' whose names start with a consonant.'; }, f: function (n, p, c, k) { var x = hasCat(n, k); return x == null ? null : x && !isV(n.letters[0]); } },
    { id: 'notanimal_dbl', d: 9, kind: 'sem', text: 'Items with a double letter that are NOT animals.', f: function (n) { if (!/(.)\1/.test(n.letters)) return false; var x = hasCat(n, 'animal'); return x == null ? null : !x; } }
  ];
  function ruleById(id) { for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i]; }
  function ruleText(r, param) { return typeof r.text === 'function' ? r.text(param) : r.text; }
  function judgeWith(r, param, raw, prevLetters) { var n = typeof raw === 'string' ? normalize(raw) : raw; return r.f(n, prevLetters, null, param); }
  function judge(p, raw, prevLetters) { return judgeWith(ruleById(p.rule), p.param, raw, prevLetters); }
  var KINDS = { spell: 'the letters of the item', sem: 'what the item is (its meaning)', sound: 'how the item sounds', rel: 'how each item relates to the previous accepted one' };

  /* ---------- generation ---------- */
  function catalogue() { return Object.keys(vocab()); }
  function generate(level, rng) {
    var lv = PL.clamp(level, 1, 10), words = catalogue();
    var pool = RULES.filter(function (r) { return Math.abs(r.d - lv) <= 1; });
    for (var t = 0; t < 150; t++) {
      var r = rng.pick(pool.length ? pool : RULES), param = r.param ? rng.pick(r.param) : null;
      var P = { rule: r.id, param: param, kind: r.kind, d: r.d, v: 2 };
      if (r.kind !== 'rel') {
        var known = words.map(function (w) { return r.f(normalize(w), null, null, param); }).filter(function (x) { return x != null; });
        var yes = known.filter(Boolean).length;
        if (yes < 15 || yes > known.length * 0.65) continue;
      }
      var cands = rng.shuffle(words);
      if (r.kind === 'rel') {
        var first = cands[0], second = null, bad = null;
        for (var j = 1; j < cands.length && !second; j++) if (r.f(normalize(cands[j]), first, null, param) === true) second = cands[j];
        if (!second) continue;
        var sl = normalize(second).letters;
        for (j = 1; j < cands.length && !bad; j++) if (cands[j] !== second && r.f(normalize(cands[j]), sl, null, param) === false) bad = cands[j];
        if (!bad) continue;
        P.seed = [{ w: first, ok: true, prev: null }, { w: second, ok: true, prev: normalize(first).letters }, { w: bad, ok: false, prev: sl }];
      } else {
        var yesW = null, noW = null;
        for (var i = 0; i < cands.length && (!yesW || !noW); i++) { var res = r.f(normalize(cands[i]), null, null, param); if (res === true && !yesW) yesW = cands[i]; else if (res === false && !noW) noW = cands[i]; }
        if (!yesW || !noW) continue;
        P.seed = [{ w: yesW, ok: true }, { w: noW, ok: false }];
      }
      P.par = 6 + r.d * 2;
      P.options = nameOptions(P, rng);
      P.ruleText = ruleText(r, param);
      return P;
    }
    throw new Error('island generation failed');
  }
  /* candidate rule statements for "Name the rule": the true rule plus five that behave differently */
  function instances() {
    var out = [];
    RULES.forEach(function (r) { (r.param || [null]).forEach(function (pm) { out.push({ id: r.id, param: pm }); }); });
    return out;
  }
  function signature(inst, sample) {
    var r = ruleById(inst.id);
    return sample.map(function (w, i) { var prev = r.kind === 'rel' ? normalize(sample[(i + 5) % sample.length]).letters : null; var x = r.f(normalize(w), prev, null, inst.param); return x == null ? '?' : x ? '1' : '0'; }).join('');
  }
  function nameOptions(P, rng) {
    var sample = catalogue().slice(0, 160);
    var truth = { id: P.rule, param: P.param }, tsig = signature(truth, sample);
    var r0 = ruleById(P.rule);
    var others = rng.shuffle(instances().filter(function (x) { return !(x.id === truth.id && x.param === truth.param); }));
    // prefer the same kind, then different kinds; drop rules that sort the sample identically to the truth
    others.sort(function (a, b) { return (ruleById(a.id).kind === r0.kind ? 0 : 1) - (ruleById(b.id).kind === r0.kind ? 0 : 1); });
    var picked = [], sigs = {}; sigs[tsig] = 1;
    for (var i = 0; i < others.length && picked.length < 5; i++) { var s = signature(others[i], sample); if (sigs[s]) continue; sigs[s] = 1; picked.push(others[i]); }
    return rng.shuffle([truth].concat(picked)).map(function (x) { return { id: x.id, param: x.param, text: ruleText(ruleById(x.id), x.param) }; });
  }

  /* ---------- play ---------- */
  function init(p) { return { log: PL.deep(p.seed), tests: 0, phase: 'explore', test: null, guesses: [], named: [], hintN: 0 }; }
  function lastAccepted(gs) { for (var i = gs.log.length - 1; i >= 0; i--) if (gs.log[i].ok) return normalize(gs.log[i].w).letters; return null; }
  function buildTest(p, gs, rng) {
    var r = ruleById(p.rule), words = rng.shuffle(catalogue()), used = {};
    gs.log.forEach(function (x) { used[normalize(x.w).text] = 1; });
    var n = p.d >= 7 ? 8 : 6, yes = [], no = [];
    for (var i = 0; i < words.length && (yes.length < n / 2 || no.length < n / 2); i++) {
      var w = words[i]; if (used[w]) continue;
      var prev = r.kind === 'rel' ? words[(i + 7) % words.length] : null;
      var res = r.f(normalize(w), prev ? normalize(prev).letters : null, null, p.param);
      var item = { w: w, prev: prev, ok: res };
      if (res === true && yes.length < n / 2) yes.push(item);
      else if (res === false && no.length < n / 2) no.push(item);
    }
    return rng.shuffle(yes.concat(no)).map(function (x) { x.ans = null; return x; });
  }
  function view(api) {
    var p = api.p, gs = api.gs;
    var acc = gs.log.filter(function (x) { return x.ok; }), rej = gs.log.filter(function (x) { return !x.ok; });
    var chip = function (x, cls) { return h('span', { class: 'wchip ' + cls + (x.fromHint ? ' hinted' : '') }, x.w + (p.kind === 'rel' && x.prevW ? ' (after ' + x.prevW + ')' : '')); };
    var lists = h('div', { class: 'isl-lists' },
      h('div', { class: 'isl-col yes' }, h('div', { class: 'lbl' }, 'Allowed'), h('div', { class: 'wordchips' }, acc.map(function (x) { return chip(x, 'yes'); }))),
      h('div', { class: 'isl-col no' }, h('div', { class: 'lbl' }, 'Turned away'), h('div', { class: 'wordchips' }, rej.map(function (x) { return chip(x, 'no'); }))));
    if (p.kind === 'rel') lists.appendChild(h('div', { class: 'muted small isl-seq' }, 'Order of play: ' + gs.log.map(function (x) { return (x.ok ? '✓ ' : '✗ ') + x.w; }).join(' · ')));
    if (gs.phase === 'test' && !api.done) return h('div', { class: 'island' }, lists, testView(api));
    if (gs.phase === 'name' && !api.done) return h('div', { class: 'island' }, lists, nameView(api));
    var inp = h('input', { id: 'isl-in', class: 'txt', type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', placeholder: 'Suggest something to bring', enterkeyhint: 'go' });
    function submit(e) {
      e.preventDefault();
      var n = normalize(inp.value);
      if (n.letters.length < 2) { api.toast('Type a word or short phrase.', ''); return; }
      if (n.words.length > 4) { api.toast('Keep it to four words or fewer.', ''); return; }
      var prev = lastAccepted(gs);
      if (p.kind !== 'rel' && gs.log.some(function (x) { return normalize(x.w).text === n.text; })) { api.toast('Already tried “' + n.text + '”.', ''); return; }
      var res = judge(p, n, prev);
      if (res === null) { api.toast('The island doesn’t recognise “' + n.text + '”, so it isn’t counted. Try another everyday thing.', ''); return; }
      var prevW = null; for (var i = gs.log.length - 1; i >= 0; i--) if (gs.log[i].ok) { prevW = gs.log[i].w; break; }
      gs.log.push({ w: n.text, ok: res, prev: prev, prevW: prevW }); gs.tests++;
      api.update(gs);
      setTimeout(function () { var el = document.getElementById('isl-in'); if (el) el.focus(); }, 30);
    }
    return h('div', { class: 'island' },
      h('div', { class: 'muted small' }, 'A secret rule decides what may come ashore. Suggest any word or short phrase; the island answers yes or no. Rules can be about letters, sound, meaning, or the previous accepted item.'),
      lists,
      api.done ? null : h('form', { class: 'row-in', onsubmit: submit }, inp, h('button', { class: 'btn primary', type: 'submit' }, 'Ask')),
      api.done ? null : h('div', { class: 'row-actions' }, h('span', { class: 'muted' }, PL.plural(gs.tests, 'test') + ' so far'),
        h('button', { class: 'btn primary', onclick: function () { gs.phase = 'name'; api.update(gs); } }, 'Name the rule'),
        h('button', { class: 'btn', onclick: function () { gs.test = { items: buildTest(p, gs, PL.rng(p.rule + ':' + gs.guesses.length + ':' + gs.tests)), note: '' }; gs.phase = 'test'; api.update(gs); } }, 'Prove it with a test')),
      h('details', { class: 'muted small' }, h('summary', null, 'How items are judged'), h('p', null, 'Capitals, punctuation and a leading “a”, “an” or “the” are ignored; letter rules ignore spaces. Meaning rules use a built-in dictionary: a word counts if any ordinary meaning fits, plurals are treated as singular, and a phrase is judged by its last word. Sound rules use standard American pronunciation.')));
  }
  function nameView(api) {
    var p = api.p, gs = api.gs;
    return h('div', { class: 'isl-test' },
      h('p', { class: 'q' }, 'Which rule is the island using?'),
      h('div', { class: 'opts' }, p.options.map(function (o, i) {
        var tried = gs.named.indexOf(i) >= 0;
        return h('button', { class: 'btn opt', disabled: tried, onclick: function () {
          gs.named.push(i);
          if (o.id === p.rule && o.param === p.param) { gs.phase = 'done'; gs.solvedBy = 'name'; api.update(gs); api.finish('solved'); return; }
          api.wrong(); api.toast('Not that one. Keep testing if you like.', 'bad'); api.update(gs);
        } }, o.text + (tried ? ' ✗' : ''));
      })),
      h('button', { class: 'btn ghost', onclick: function () { gs.phase = 'explore'; api.update(gs); } }, 'Back to testing'));
  }
  function testView(api) {
    var p = api.p, gs = api.gs, T = gs.test;
    var note = h('textarea', { id: 'isl-note', class: 'txt area', rows: 2, placeholder: 'Optional: your rule in your own words' }, T.note || '');
    note.addEventListener('input', function () { T.note = note.value; api.save(gs); });
    var all = T.items.every(function (x) { return x.ans != null; });
    return h('div', { class: 'isl-test' },
      h('p', { class: 'q' }, 'Prove it: which of these would the island accept?'),
      h('p', { class: 'muted small' }, 'Classify every item correctly to pass.' + (p.kind === 'rel' ? ' Each item shows the item accepted just before it.' : '')),
      note,
      T.items.map(function (it) {
        return h('div', { class: 'srow' }, h('span', { class: 'sname' }, it.w + (it.prev ? ' (after ' + it.prev + ')' : '')), h('div', { class: 'seg' }, [[true, 'Allowed'], [false, 'Not allowed']].map(function (o) {
          return h('button', { class: 'segb' + (it.ans === o[0] ? ' on' : ''), onclick: function () { it.ans = o[0]; api.update(gs); } }, o[1]);
        })));
      }),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn ghost', onclick: function () { gs.phase = 'explore'; gs.test = null; api.update(gs); } }, 'Back'),
        h('button', { class: 'btn primary', disabled: !all, onclick: function () {
          var wrong = T.items.filter(function (x) { return x.ans !== x.ok; });
          gs.guesses.push({ note: T.note || '', score: (T.items.length - wrong.length) + '/' + T.items.length });
          if (!wrong.length) { gs.phase = 'done'; gs.solvedBy = 'test'; api.update(gs); api.finish('solved'); return; }
          api.wrong();
          T.items.forEach(function (x) { gs.log.push({ w: x.w, ok: x.ok, prev: x.prev ? normalize(x.prev).letters : null, prevW: x.prev, fromTest: true }); });
          api.toast(wrong.length + ' of ' + T.items.length + ' wrong. The answers were added to your lists.', 'bad');
          gs.phase = 'explore'; gs.test = null; api.update(gs);
        } }, 'Submit')));
  }
  /* Hint: a strategically useful example with its verdict. It targets a rival rule that still fits the evidence. */
  function hint(p, gs) {
    var r = ruleById(p.rule), prev = lastAccepted(gs);
    var evidence = gs.log.map(function (x) { return x; });
    var rivals = instances().filter(function (inst) {
      if (inst.id === p.rule && inst.param === p.param) return false;
      var rr = ruleById(inst.id);
      return evidence.every(function (x) { var v = rr.f(normalize(x.w), x.prev || null, null, inst.param); return v === x.ok; });
    });
    var used = {}; gs.log.forEach(function (x) { used[normalize(x.w).text] = 1; });
    var words = PL.rng('isl-h' + gs.hintN + ':' + gs.tests).shuffle(catalogue()).filter(function (w) { return !used[w]; });
    var wantYes = gs.hintN % 2 === 0;
    var pick = null;
    for (var k = 0; k < rivals.length && !pick; k++) {
      var rv = ruleById(rivals[k].id);
      for (var i = 0; i < words.length; i++) {
        var n = normalize(words[i]), t = r.f(n, prev, null, p.param), o = rv.f(n, prev, null, rivals[k].param);
        if (t == null || o == null || t === o) continue;
        if (t === wantYes || i > 200) { pick = { w: words[i], ok: t }; break; }
      }
    }
    if (!pick) for (var j = 0; j < words.length; j++) { var t2 = r.f(normalize(words[j]), prev, null, p.param); if (t2 === wantYes) { pick = { w: words[j], ok: t2 }; break; } }
    if (!pick) return { msg: 'The rule is about ' + KINDS[p.kind] + '.' };
    gs.hintN++;
    var prevW = null; for (var q = gs.log.length - 1; q >= 0; q--) if (gs.log[q].ok) { prevW = gs.log[q].w; break; }
    gs.log.push({ w: pick.w, ok: pick.ok, prev: prev, prevW: prevW, fromHint: true });
    return { msg: '“' + pick.w + '” would be ' + (pick.ok ? 'allowed' : 'turned away') + (rivals.length ? ' — that separates the true rule from another rule your evidence still allows.' : '.'), gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved', over = Math.max(0, gs.tests - p.par);
    var q = solved ? PL.clamp(100 - over * 3 - ctx.wrong * 15 - ctx.hints * 10, 15, 100) : 0;
    return { quality: Math.round(q), metrics: { tests: gs.tests, hypotheses: (gs.guesses || []).length + (gs.named || []).length, wrongHyp: ctx.wrong, kind: p.kind, rule: p.rule, discovered: solved, noHint: solved && !ctx.hints, by: gs.solvedBy || null },
      lines: [['Examples tested', gs.tests + ' (par ' + p.par + ')'], ['Rule guesses and tests', (gs.guesses || []).length + (gs.named || []).length], ['Wrong guesses', ctx.wrong]] };
  }
  function review(p, gs) {
    var r = ruleById(p.rule);
    return h('div', { class: 'review' },
      h('div', { class: 'lbl' }, 'The rule'), h('p', null, h('b', null, p.ruleText || (r ? ruleText(r, p.param) : p.rule))),
      (gs.guesses || []).some(function (g) { return g.note; }) ? h('div', null, h('div', { class: 'lbl' }, 'Your wording'), gs.guesses.filter(function (g) { return g.note; }).map(function (g) { return h('p', { class: 'muted' }, '“' + g.note + '” (' + g.score + ')'); })) : null,
      h('div', { class: 'lbl' }, 'Evidence'), h('p', { class: 'small' }, gs.log.map(function (x) { return (x.ok ? '✓ ' : '✗ ') + x.w; }).join(' · ')),
      h('p', { class: 'muted small' }, 'The rule was fixed before you started and every answer came from the same test.'));
  }
  function stats(atts) {
    var by = {}; atts.forEach(function (a) { var k = a.metrics && a.metrics.kind; if (!k) return; (by[k] = by[k] || { n: 0, ok: 0 }); by[k].n++; if (a.outcome === 'solved') by[k].ok++; });
    var rows = [['Average examples tested', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.tests; })).toFixed(1) : '—'],
      ['Average guesses', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.hypotheses || 0; })).toFixed(1) : '—'],
      ['Discovered without hints', atts.length ? Math.round(100 * atts.filter(function (a) { return a.metrics.noHint; }).length / atts.length) + '%' : '—']];
    var names = { spell: 'Letter rules', sem: 'Meaning rules', sound: 'Sound rules', rel: 'Sequence rules' };
    Object.keys(by).forEach(function (k) { rows.push([names[k] || k, by[k].ok + '/' + by[k].n + ' discovered']); });
    return rows;
  }
  PL.games.island = {
    id: 'island', name: 'The Island', blurb: 'Discover the secret rule for what may come ashore.',
    rules: 'A hidden rule, fixed before you begin, decides what may come to the island. Suggest words or short phrases and watch the yes/no answers. When you think you know it, name the rule from a short list, or prove it by sorting fresh items. Fewer examples means a better score.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 90 + lv * 30; }, timeLimit: function (lv) { return 240 + lv * 30; },
    _rules: RULES, _judge: judge, _normalize: normalize, _meaning: meaning, _syllables: syllables, _buildTest: buildTest, _ruleById: ruleById
  };
})();

;
/* ===== GAME 4: WORD BRIDGES ===== */
(function () {
  var h = PL.h;
  var graphs = {};
  function graph(L) {
    if (graphs[L]) return graphs[L];
    var words = PL.dict.words(L, ['A', 'B']);
    var set = new Set(words), buckets = {};
    words.forEach(function (w) {
      for (var i = 0; i < L; i++) {
        var k = w.slice(0, i) + '_' + w.slice(i + 1);
        (buckets[k] = buckets[k] || []).push(w);
      }
    });
    var adj = {};
    words.forEach(function (w) {
      var n = [];
      for (var i = 0; i < L; i++) {
        var b = buckets[w.slice(0, i) + '_' + w.slice(i + 1)];
        for (var j = 0; j < b.length; j++) if (b[j] !== w) n.push(b[j]);
      }
      adj[w] = n;
    });
    graphs[L] = { words: words, set: set, adj: adj, L: L };
    return graphs[L];
  }
  function oneApart(a, b) {
    if (a.length !== b.length) return false;
    var d = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    return d === 1;
  }
  function allowed(w, c) {
    if (c.forbid && w.indexOf(c.forbid) >= 0) return false;
    if (c.lock != null && w[c.lock.i] !== c.lock.ch) return false;
    return true;
  }
  function bfs(G, s, c) { // distances + parents from s under constraints
    var dist = {}; var par = {}; dist[s] = 0; var q = [s], qi = 0;
    while (qi < q.length) {
      var u = q[qi++];
      var nb = G.adj[u];
      for (var i = 0; i < nb.length; i++) {
        var v = nb[i];
        if (dist[v] === undefined && allowed(v, c)) { dist[v] = dist[u] + 1; par[v] = u; q.push(v); }
      }
    }
    return { dist: dist, par: par };
  }
  function pathTo(par, s, t) { var p = [t]; while (p[0] !== s) p.unshift(par[p[0]]); return p; }
  // shortest path from cur to target respecting checkpoint (if not yet visited)
  function solveFrom(p, cur, visitedCheck) {
    var G = graph(p.L), c = p.cons;
    if (c.via && !visitedCheck) {
      var a = bfs(G, cur, c);
      if (a.dist[c.via] === undefined) return null;
      var b = bfs(G, c.via, c);
      if (b.dist[p.target] === undefined) return null;
      return pathTo(a.par, cur, c.via).concat(pathTo(b.par, c.via, p.target).slice(1));
    }
    var r = bfs(G, cur, c);
    if (r.dist[p.target] === undefined) return null;
    return pathTo(r.par, cur, p.target);
  }

  function levelSpec(level) {
    var specs = {
      1: { L: 4, d: [3, 3] }, 2: { L: 4, d: [3, 4] }, 3: { L: 4, d: [4, 4] }, 4: { L: 4, d: [4, 5], cons: 0.3 },
      5: { L: 5, d: [4, 5], cons: 0.35 }, 6: { L: 4, d: [5, 6], cons: 0.5 }, 7: { L: 5, d: [5, 6], cons: 0.55 },
      8: { L: 5, d: [6, 7], cons: 0.6 }, 9: { L: 5, d: [6, 8], cons: 0.7 }, 10: { L: 5, d: [7, 9], cons: 0.8 }
    };
    return specs[PL.clamp(level, 1, 10)];
  }

  function generate(level, rng) {
    var spec = levelSpec(level);
    var G = graph(spec.L);
    var starts = PL.dict.words(spec.L, ['A']).filter(function (w) { return G.adj[w] && G.adj[w].length >= 2; });
    for (var tries = 0; tries < 400; tries++) {
      var s = rng.pick(starts);
      var kind = (spec.cons && rng.chance(spec.cons)) ? rng.pick(['forbid', 'via', 'lock']) : 'none';
      var cons = {};
      var base = bfs(G, s, {});
      var cands = Object.keys(base.dist).filter(function (w) {
        var d = base.dist[w];
        return PL.dict.tier(w) === 'A' && d >= spec.d[0] - (kind === 'none' ? 0 : 1) && d <= spec.d[1];
      });
      if (!cands.length) continue;
      var t = rng.pick(cands);
      var opt;
      if (kind === 'forbid') {
        var onPath = pathTo(base.par, s, t);
        var letters = {}; onPath.slice(1, -1).forEach(function (w) { for (var i = 0; i < w.length; i++) letters[w[i]] = 1; });
        var opts = Object.keys(letters).filter(function (ch) { return s.indexOf(ch) < 0 && t.indexOf(ch) < 0; });
        if (!opts.length) continue;
        cons.forbid = rng.pick(opts);
      } else if (kind === 'lock') {
        var same = []; for (var i = 0; i < spec.L; i++) if (s[i] === t[i]) same.push(i);
        if (!same.length) continue;
        var li = rng.pick(same); cons.lock = { i: li, ch: s[li] };
      } else if (kind === 'via') {
        var bt = bfs(G, t, {});
        var vias = Object.keys(base.dist).filter(function (w) {
          if (w === s || w === t || bt.dist[w] === undefined || PL.dict.tier(w) !== 'A') return false;
          var extra = base.dist[w] + bt.dist[w] - base.dist[t];
          return extra >= 1 && extra <= 2;
        });
        if (!vias.length) continue;
        cons.via = rng.pick(vias);
      }
      var P = { L: spec.L, start: s, target: t, cons: cons };
      var sol = solveFrom(P, s, false);
      if (!sol) continue;
      opt = sol.length - 1;
      if (opt < spec.d[0] || opt > spec.d[1] + 1) continue;
      // when a restriction exists, it must matter or at least not trivialise: require optimal >= unconstrained
      P.optimal = opt; P.solution = sol;
      P.paths = countShortest(P);
      return P;
    }
    // fallback (should not happen): plain puzzle
    return generate(Math.max(1, level - 1), rng);
  }
  function countShortest(p) { // number of distinct shortest paths (capped), for "multiple routes" info
    if (p.cons.via) return null;
    var G = graph(p.L), r = bfs(G, p.start, p.cons), cnt = {}; cnt[p.start] = 1;
    var order = Object.keys(r.dist).sort(function (a, b) { return r.dist[a] - r.dist[b]; });
    order.forEach(function (u) {
      if (u === p.start) return;
      var c = 0; G.adj[u].forEach(function (v) { if (r.dist[v] === r.dist[u] - 1) c += cnt[v] || 0; });
      cnt[u] = Math.min(c, 999);
    });
    return cnt[p.target] || 1;
  }

  function init(p) { return { path: [p.start], err: null, invalid: 0 }; }

  function validateMove(p, gs, w) {
    w = w.trim().toLowerCase();
    var cur = gs.path[gs.path.length - 1];
    if (!/^[a-z]+$/.test(w)) return 'Letters only.';
    if (w.length !== p.L) return 'Use ' + p.L + '-letter words.';
    if (!oneApart(cur, w)) return 'Change exactly one letter of ' + cur.toUpperCase() + '.';
    if (!graph(p.L).set.has(w)) return w.toUpperCase() + ' is not in the game dictionary.';
    if (p.cons.forbid && w.indexOf(p.cons.forbid) >= 0) return 'The letter ' + p.cons.forbid.toUpperCase() + ' is forbidden.';
    if (p.cons.lock && w[p.cons.lock.i] !== p.cons.lock.ch) return 'Letter ' + (p.cons.lock.i + 1) + ' must stay ' + p.cons.lock.ch.toUpperCase() + '.';
    if (w === p.target && p.cons.via && gs.path.indexOf(p.cons.via) < 0) return 'You must pass through ' + p.cons.via.toUpperCase() + ' first.';
    return null;
  }

  function consText(p) {
    var c = p.cons, out = [];
    if (c.forbid) out.push('No word may contain the letter ' + c.forbid.toUpperCase() + '.');
    if (c.lock) out.push('Letter ' + (c.lock.i + 1) + ' stays ' + c.lock.ch.toUpperCase() + ' the whole way.');
    if (c.via) out.push('Your route must pass through ' + c.via.toUpperCase() + '.');
    return out;
  }

  function wordTile(w, prev, cls) {
    var spans = [];
    for (var i = 0; i < w.length; i++) {
      var changed = prev && prev[i] !== w[i];
      spans.push(h('span', { class: 'lt' + (changed ? ' lt-ch' : '') }, w[i].toUpperCase()));
    }
    return h('div', { class: 'wrow ' + (cls || '') }, spans);
  }

  function view(api) {
    var p = api.p, gs = api.gs;
    var cur = gs.path[gs.path.length - 1];
    var rows = gs.path.map(function (w, i) { return wordTile(w, i ? gs.path[i - 1] : null, i === 0 ? 'w-start' : ''); });
    var input = h('input', { id: 'bridge-in', class: 'txt mono', type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', maxlength: p.L, placeholder: 'Next word', enterkeyhint: 'go' });
    function submit(e) {
      if (e) e.preventDefault();
      var w = input.value;
      var err = validateMove(p, gs, w);
      if (err) { gs.invalid++; api.toast(err, 'bad'); api.save(gs); input.select(); return; }
      w = w.trim().toLowerCase();
      gs.path.push(w);
      if (w === p.target) { api.update(gs); api.finish('solved'); return; }
      api.update(gs);
      setTimeout(function () { var el = document.getElementById('bridge-in'); if (el) el.focus(); }, 30);
    }
    var cons = consText(p);
    var moves = gs.path.length - 1;
    return h('div', { class: 'bridges' },
      h('div', { class: 'goal' },
        h('div', { class: 'goal-l' }, h('span', { class: 'lbl' }, 'From'), h('b', { class: 'mono' }, p.start.toUpperCase())),
        h('div', { class: 'goal-arrow', 'aria-hidden': 'true' }, '→'),
        h('div', { class: 'goal-l' }, h('span', { class: 'lbl' }, 'To'), h('b', { class: 'mono' }, p.target.toUpperCase())),
        h('div', { class: 'goal-l' }, h('span', { class: 'lbl' }, 'Best'), h('b', { class: 'mono' }, p.optimal + ' moves'))
      ),
      cons.length ? h('div', { class: 'rules-box' }, cons.map(function (c) { return h('div', null, c); })) : null,
      h('div', { class: 'ladder' }, rows, api.done ? null : wordTile(p.target, null, 'w-target')),
      api.done ? null : h('form', { class: 'row-in', onsubmit: submit },
        input, h('button', { class: 'btn primary', type: 'submit' }, 'Play')),
      api.done ? null : h('div', { class: 'row-actions' },
        h('span', { class: 'muted' }, PL.plural(moves, 'move') + ' so far'),
        h('button', { class: 'btn ghost sm', disabled: gs.path.length < 2, onclick: function () { gs.path.pop(); api.update(gs); } }, 'Undo'),
        h('button', { class: 'btn ghost sm', disabled: gs.path.length < 2, onclick: function () { gs.path = [p.start]; api.update(gs); } }, 'Reset'))
    );
  }

  function hint(p, gs) {
    var cur = gs.path[gs.path.length - 1];
    var sol = solveFrom(p, cur, gs.path.indexOf(p.cons.via) >= 0);
    if (!sol || sol.length < 2) {
      // stuck in a dead end under constraints: suggest backing up
      return { msg: 'No route from ' + cur.toUpperCase() + ' — undo a step or two.' };
    }
    var nx = sol[1];
    return { msg: 'Next word on a shortest route from ' + cur.toUpperCase() + ': ' + nx.toUpperCase() + ' (then ' + (sol.length - 2) + ' more ' + (sol.length - 2 === 1 ? 'move' : 'moves') + ' to go).', gs: gs };
  }

  function evaluate(p, gs, ctx) {
    var moves = gs.path.length - 1;
    var solved = ctx.outcome === 'solved';
    var excess = solved ? moves - p.optimal : null;
    var q;
    if (solved) q = PL.clamp(100 - Math.max(0, excess) * 12 - ctx.hints * 9 - Math.min(gs.invalid, 5) * 1, 25, 100);
    else {
      var cur = gs.path[gs.path.length - 1];
      var rem = solveFrom(p, cur, gs.path.indexOf(p.cons.via) >= 0);
      var prog = rem ? PL.clamp(1 - (rem.length - 1) / Math.max(1, p.optimal), 0, 1) : 0;
      q = Math.round(prog * 20);
    }
    return {
      quality: Math.round(q),
      metrics: { moves: moves, optimal: p.optimal, excess: excess, optimalHit: solved && excess <= 0, invalid: gs.invalid, length: p.L, restriction: Object.keys(p.cons)[0] || 'none' },
      lines: [['Moves', solved ? moves : '—'], ['Optimal', p.optimal], ['Excess moves', solved ? Math.max(0, excess) : '—'], ['Rejected words', gs.invalid]]
    };
  }

  function review(p, gs) {
    return h('div', { class: 'review' },
      h('div', { class: 'lbl' }, 'Your route'),
      h('div', { class: 'mono' }, gs.path.map(function (w) { return w.toUpperCase(); }).join(' → ')),
      h('div', { class: 'lbl' }, 'A shortest route (' + p.optimal + ' moves' + (p.paths > 1 ? ', one of ' + p.paths : '') + ')'),
      h('div', { class: 'mono' }, p.solution.map(function (w) { return w.toUpperCase(); }).join(' → ')),
      consText(p).length ? h('div', { class: 'muted' }, consText(p).join(' ')) : null
    );
  }

  function stats(atts) {
    var s = atts.filter(function (a) { return a.outcome === 'solved'; });
    var m = function (f) { var v = PL.mean(s.map(f)); return v == null ? '—' : v.toFixed(1); };
    return [
      ['Average moves', m(function (a) { return a.metrics.moves; })],
      ['Average excess moves', m(function (a) { return Math.max(0, a.metrics.excess); })],
      ['Optimal-route rate', s.length ? Math.round(100 * s.filter(function (a) { return a.metrics.optimalHit; }).length / s.length) + '%' : '—'],
      ['Average optimal length', m(function (a) { return a.metrics.optimal; })],
      ['Puzzles with restrictions', atts.filter(function (a) { return a.metrics && a.metrics.restriction && a.metrics.restriction !== 'none'; }).length]
    ];
  }

  PL.games.bridges = {
    id: 'bridges', name: 'Word Bridges', blurb: 'Change one letter at a time to reach the target.',
    rules: 'Turn the top word into the target word. Each move changes exactly one letter and must make a valid word of the same length. Try to match the shortest route. Some puzzles add a forbidden letter, a fixed letter, or a checkpoint word.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 60 + lv * 25; },
    timeLimit: function (lv) { return 120 + lv * 30; },
    _graph: graph, _solve: solveFrom, _validate: validateMove
  };
})();

;
/* ===== GAME 5: ALGEBRA ARCADE ===== */
(function () {
  var h = PL.h, Q = PL.Q;
  var NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Elena', 'Farid', 'Grace', 'Hugo', 'Iris', 'Jonah', 'Kira', 'Leo', 'Maya', 'Nico', 'Omar', 'Priya', 'Quinn', 'Rosa', 'Sam', 'Tara', 'Umar', 'Vera', 'Wes', 'Yara', 'Zane'];
  function names(rng, k) { return rng.shuffle(NAMES).slice(0, k); }
  function money(x) { var v = typeof x === 'number' ? x : PL.qval(x); return '$' + (Math.round(v * 100) % 100 ? v.toFixed(2) : String(Math.round(v))); }
  function frac(q) { return PL.qstr(q); }
  function between(x, lo, hi) { return x >= lo && x <= hi; }

  /* Each template: function(rng, lv) -> object or null.
     Common fields: topic, text, ask, ans (Q) | ansIdx, unit, steps[], optional: eq + eqWrong (for equation format), ask2/ans2 (multi-part) */
  var T = {};

  T.consecutive = { topic: 'Number relationships', lv: [1, 4], f: function (rng, lv) {
    var k = rng.int(3, lv >= 3 ? 5 : 4), kind = rng.pick(['', 'even ', 'odd ']), step = kind ? 2 : 1;
    var first = rng.int(5, 40); if (kind === 'even ' && first % 2) first++; if (kind === 'odd ' && !(first % 2)) first++;
    var sum = 0; for (var i = 0; i < k; i++) sum += first + i * step;
    var largest = first + (k - 1) * step;
    var offs = []; for (i = 0; i < k; i++) offs.push(i * step);
    var offSum = offs.reduce(function (a, b) { return a + b; }, 0);
    return { text: 'The sum of ' + k + ' consecutive ' + kind + 'integers is ' + sum + '.', ask: 'What is the largest of them?', ans: Q(largest), unit: '',
      eq: 'n' + offs.slice(1).map(function (o) { return ' + (n + ' + o + ')'; }).join('') + ' = ' + sum,
      eqWrong: ['n' + offs.slice(1).map(function (o, j) { return ' + (n + ' + (j + 1) + ')'; }).join('') + ' = ' + sum, k + 'n = ' + sum, 'n + ' + (k - 1) * step + ' = ' + sum].filter(function (e, j) { return !(step === 1 && j === 0); }),
      eqVar: 'n = the smallest integer',
      steps: ['Let the smallest be n. The integers are ' + offs.map(function (o) { return o ? 'n + ' + o : 'n'; }).join(', ') + '.', 'Their sum is ' + k + 'n + ' + offSum + ' = ' + sum + ', so ' + k + 'n = ' + (sum - offSum) + ' and n = ' + first + '.', 'The largest is ' + first + ' + ' + (k - 1) * step + ' = ' + largest + '.'] };
  } };

  T.ratioShare = { topic: 'Ratios and proportions', lv: [1, 4], f: function (rng, lv) {
    var nm = names(rng, 3), parts = [rng.int(1, 5), rng.int(2, 6), rng.int(1, 7)];
    if (lv < 3) parts = parts.slice(0, 2);
    var unitV = rng.int(3, 15) * (lv < 3 ? 5 : 4), tot = parts.reduce(function (a, b) { return a + b; }, 0) * unitV;
    var who = rng.int(0, parts.length - 1);
    var ratio = parts.join(':');
    return { text: nm.slice(0, parts.length).join(lv < 3 ? ' and ' : ', ').replace(/, ([^,]*)$/, ' and $1') + ' share ' + money(tot) + ' in the ratio ' + ratio + ' (in that order).', ask: 'How much does ' + nm[who] + ' get?', ans: Q(parts[who] * unitV), unit: '$',
      steps: ['The ratio has ' + parts.join(' + ') + ' = ' + (tot / unitV) + ' equal parts.', 'One part is ' + money(tot) + ' ÷ ' + (tot / unitV) + ' = ' + money(unitV) + '.', nm[who] + ' gets ' + parts[who] + ' parts: ' + parts[who] + ' × ' + money(unitV) + ' = ' + money(parts[who] * unitV) + '.'] };
  } };

  T.agesTimes = { topic: 'Ages', lv: [2, 6], f: function (rng) {
    for (var t = 0; t < 200; t++) {
      var b = rng.int(4, 16), k = rng.int(2, 5), n = rng.int(2, 15), a = k * b;
      var num = a + n, den = b + n; if (num % den) continue;
      var m = num / den; if (m < 2 || m >= k) continue;
      var nm = names(rng, 2);
      return { text: nm[0] + ' is ' + k + ' times as old as ' + nm[1] + '. In ' + n + ' years, ' + nm[0] + ' will be ' + (m === 2 ? 'twice' : m + ' times') + ' as old as ' + nm[1] + '.', ask: 'How old is ' + nm[1] + ' now?', ans: Q(b), unit: 'years',
        eq: k + 'x + ' + n + ' = ' + m + '(x + ' + n + ')', eqWrong: [k + 'x + ' + n + ' = ' + m + 'x + ' + n, k + '(x + ' + n + ') = ' + m + '(x + ' + n + ')', k + 'x = ' + m + '(x + ' + n + ')'], eqVar: 'x = ' + nm[1] + '’s age now',
        steps: ['Let ' + nm[1] + ' be x now, so ' + nm[0] + ' is ' + k + 'x.', 'In ' + n + ' years: ' + k + 'x + ' + n + ' = ' + m + '(x + ' + n + ').', 'Expand: ' + k + 'x + ' + n + ' = ' + m + 'x + ' + (m * n) + ', so ' + (k - m) + 'x = ' + (m * n - n) + ' and x = ' + b + '.'] };
    }
    return null;
  } };

  T.agesSumDiff = { topic: 'Ages', lv: [3, 7], f: function (rng) {
    var a = rng.int(20, 60), b = rng.int(8, a - 6), y = rng.int(2, Math.min(b - 1, 12));
    var nm = names(rng, 2);
    var S = a + b, ago = (a - y) - (b - y);
    var r = (a - y) / (b - y);
    if (Number.isInteger(r) && r >= 2 && r <= 6) {
      return { text: 'The sum of ' + nm[0] + '’s and ' + nm[1] + '’s ages is ' + S + '. ' + y + ' years ago, ' + nm[0] + ' was ' + (r === 2 ? 'twice' : r + ' times') + ' as old as ' + nm[1] + '.', ask: 'How old is ' + nm[0] + ' now?', ans: Q(a), unit: 'years',
        ask2: 'How old is ' + nm[1] + ' now?', ans2: Q(b),
        eq: '(' + S + ' − x) − ' + y + ' = ' + r + '(x − ' + y + ')', eqWrong: [S + ' − x − ' + y + ' = ' + r + 'x', '(' + S + ' − x) = ' + r + '(x − ' + y + ')', '(' + S + ' − x) − ' + y + ' = ' + r + 'x − ' + y], eqVar: 'x = ' + nm[1] + '’s age now',
        steps: ['Let ' + nm[1] + ' be x; then ' + nm[0] + ' is ' + S + ' − x.', y + ' years ago: (' + S + ' − x) − ' + y + ' = ' + r + '(x − ' + y + ').', 'So ' + (S - y) + ' − x = ' + r + 'x − ' + (r * y) + ', giving ' + (r + 1) + 'x = ' + (S - y + r * y) + ' and x = ' + b + '.', nm[0] + ' is ' + S + ' − ' + b + ' = ' + a + '.'] };
    }
    return null;
  } };

  T.coins = { topic: 'Systems of equations', lv: [3, 6], f: function (rng) {
    var items = rng.pick([['adult tickets', 'child tickets', 'tickets'], ['large boxes', 'small boxes', 'boxes'], ['quarters', 'dimes', 'coins']]);
    var p1, p2;
    if (items[2] === 'coins') { p1 = 25; p2 = 10; } else { p1 = rng.int(8, 18); p2 = rng.int(3, p1 - 2); }
    var x = rng.int(5, 30), y = rng.int(5, 30), n = x + y, v = p1 * x + p2 * y;
    var fmt = items[2] === 'coins' ? function (c) { return money(c / 100); } : money;
    var priceTxt = items[2] === 'coins' ? '' : ' ' + PL.cap(items[0]) + ' cost ' + money(p1) + ' each and ' + items[1] + ' cost ' + money(p2) + ' each.';
    return { text: 'A total of ' + n + ' ' + items[2] + ' were ' + (items[2] === 'coins' ? 'in a jar, all quarters and dimes, worth ' : 'sold for ') + fmt(v) + '.' + priceTxt, ask: 'How many ' + items[0] + ' were there?', ans: Q(x), unit: '',
      ask2: 'How many ' + items[1] + '?', ans2: Q(y),
      eq: p1 + 'x + ' + p2 + '(' + n + ' − x) = ' + v, eqWrong: [p1 + 'x + ' + p2 + 'x = ' + v, p2 + 'x + ' + p1 + '(' + n + ' − x) = ' + v, p1 + 'x + ' + p2 + '(' + n + ' + x) = ' + v], eqVar: 'x = number of ' + items[0] + (items[2] === 'coins' ? ' (values in cents)' : ''),
      steps: ['Let x be the ' + items[0] + '; then there are ' + n + ' − x ' + items[1] + '.', 'Value: ' + p1 + 'x + ' + p2 + '(' + n + ' − x) = ' + v + (items[2] === 'coins' ? ' (in cents)' : '') + '.', (p1 - p2) + 'x + ' + (p2 * n) + ' = ' + v + ', so ' + (p1 - p2) + 'x = ' + (v - p2 * n) + ' and x = ' + x + '.', items[1] + ': ' + n + ' − ' + x + ' = ' + y + '.'] };
  } };

  T.mixture = { topic: 'Mixtures', lv: [4, 7], f: function (rng) {
    for (var t = 0; t < 300; t++) {
      var p = rng.int(1, 6) * 5, q = rng.int(p / 5 + 2, 18) * 5, x = rng.int(2, 12) * (rng.chance(0.5) ? 5 : 2);
      var r = rng.int(p / 5 + 1, q / 5 - 1) * 5;
      var y = Q(x * (r - p), q - r); // p x + q y = r (x+y)
      if (y.d !== 1 || y.n <= 0 || y.n > 200) continue;
      var sub = rng.pick(['salt solution', 'acid solution', 'juice blend (percent juice)', 'alloy (percent copper)']);
      var u = sub.indexOf('alloy') >= 0 ? 'kg' : 'litres';
      return { text: 'You have ' + x + ' ' + u + ' of a ' + p + '% ' + sub + '. You want to add some ' + q + '% ' + sub.replace(/ \(.*\)/, '') + ' so the mixture is ' + r + '%.', ask: 'How many ' + u + ' of the ' + q + '% mixture should you add?', ans: y, unit: u,
        eq: '0.' + pad(p) + '(' + x + ') + 0.' + pad(q) + 'y = 0.' + pad(r) + '(' + x + ' + y)', eqWrong: ['0.' + pad(p) + '(' + x + ') + 0.' + pad(q) + 'y = 0.' + pad(r) + 'y', '0.' + pad(p) + ' + 0.' + pad(q) + ' = 0.' + pad(r) + '(' + x + ' + y)', '0.' + pad(p) + '(' + x + ') + 0.' + pad(q) + 'y = 0.' + pad(r) + '(' + x + ')'], eqVar: 'y = ' + u + ' added',
        steps: ['Track the pure ingredient. Start: ' + p + '% of ' + x + ' = ' + fmtNum(p * x / 100) + '.', 'Added: ' + q + '% of y. Final: ' + r + '% of (' + x + ' + y).', p * x / 100 + ' + ' + q / 100 + 'y = ' + r / 100 + '(' + x + ' + y) → ' + fmtNum((q - r) / 100) + 'y = ' + fmtNum((r - p) * x / 100) + ' → y = ' + y.n + '.'] };
    }
    return null;
  } };
  function pad(p) { return (p < 10 ? '0' : '') + p; }
  function fmtNum(v) { return String(Math.round(v * 1000) / 1000); }

  T.meet = { topic: 'Distance, speed, and time', lv: [3, 6], f: function (rng) {
    for (var t = 0; t < 200; t++) {
      var v1 = rng.int(4, 16) * 5, v2 = rng.int(4, 16) * 5, tm = Q(rng.int(1, 8), rng.pick([1, 2, 4]));
      var D = PL.qmul(Q(v1 + v2), tm); if (D.d !== 1) continue;
      var nm = names(rng, 2), mode = rng.pick(['meet', 'chase']);
      if (mode === 'meet') {
        return { text: 'Two towns are ' + D.n + ' km apart. ' + nm[0] + ' drives from one toward the other at ' + v1 + ' km/h; at the same moment ' + nm[1] + ' drives from the other town toward the first at ' + v2 + ' km/h.', ask: 'After how many hours do they meet?', ans: tm, unit: 'hours',
          eq: v1 + 't + ' + v2 + 't = ' + D.n, eqWrong: [v1 + 't − ' + v2 + 't = ' + D.n, '(' + v1 + ' + ' + v2 + ')/t = ' + D.n, v1 + 't = ' + v2 + 't + ' + D.n], eqVar: 't = hours until they meet',
          steps: ['They close the gap at ' + v1 + ' + ' + v2 + ' = ' + (v1 + v2) + ' km/h.', 'Time = ' + D.n + ' ÷ ' + (v1 + v2) + ' = ' + frac(tm) + ' hours.'] };
      }
      if (v1 <= v2) continue;
      var head = rng.int(1, 3);
      var gap = v2 * head, ct = Q(gap, v1 - v2);
      if (ct.d > 4) continue;
      return { text: nm[1] + ' leaves home cycling at ' + v2 + ' km/h. ' + head + ' hour' + (head > 1 ? 's' : '') + ' later ' + nm[0] + ' sets off along the same road at ' + v1 + ' km/h.', ask: 'How many hours after ' + nm[0] + ' starts does ' + nm[0] + ' catch up?', ans: ct, unit: 'hours',
        eq: v1 + 't = ' + v2 + '(t + ' + head + ')', eqWrong: [v1 + 't = ' + v2 + 't', v1 + '(t + ' + head + ') = ' + v2 + 't', v1 + 't + ' + v2 + 't = ' + gap], eqVar: 't = hours after ' + nm[0] + ' starts',
        steps: [nm[1] + ' has a head start of ' + v2 + ' × ' + head + ' = ' + gap + ' km.', nm[0] + ' gains ' + v1 + ' − ' + v2 + ' = ' + (v1 - v2) + ' km each hour.', 'Time = ' + gap + ' ÷ ' + (v1 - v2) + ' = ' + frac(ct) + ' hours.'] };
    }
    return null;
  } };

  T.roundTrip = { topic: 'Distance, speed, and time', lv: [6, 9], f: function (rng) {
    for (var t = 0; t < 200; t++) {
      var a = rng.int(3, 15) * 5, b = rng.int(3, 15) * 5; if (a === b) continue;
      var avg = Q(2 * a * b, a + b); if (avg.d !== 1) continue;
      var d = rng.int(2, 12) * 30;
      return { text: 'A courier drives ' + d + ' km to a depot at ' + a + ' km/h and returns by the same road at ' + b + ' km/h.', ask: 'What is the average speed for the whole round trip, in km/h?', ans: avg, unit: 'km/h',
        steps: ['Time out: ' + d + ' ÷ ' + a + ' = ' + frac(Q(d, a)) + ' h. Time back: ' + d + ' ÷ ' + b + ' = ' + frac(Q(d, b)) + ' h.', 'Total distance ' + (2 * d) + ' km over ' + frac(PL.qadd(Q(d, a), Q(d, b))) + ' h.', 'Average = ' + (2 * d) + ' ÷ ' + frac(PL.qadd(Q(d, a), Q(d, b))) + ' = ' + avg.n + ' km/h (not ' + (a + b) / 2 + ', the simple mean of the speeds).'] };
    }
    return null;
  } };

  T.work = { topic: 'Work rates', lv: [4, 7], f: function (rng, lv) {
    for (var t = 0; t < 200; t++) {
      var a = rng.int(2, 12), b = rng.int(2, 15); if (a === b) continue;
      var nm = names(rng, 2), job = rng.pick(['paint a fence', 'grade a stack of exams', 'clear a garden', 'assemble a batch of shelves']);
      if (lv < 6 || rng.chance(0.5)) {
        var tt = Q(a * b, a + b); if (tt.d > 6) continue;
        return { text: nm[0] + ' can ' + job + ' alone in ' + a + ' hours. ' + nm[1] + ' can do it alone in ' + b + ' hours.', ask: 'How many hours does it take if they work together? (A fraction is fine.)', ans: tt, unit: 'hours',
          eq: 't/' + a + ' + t/' + b + ' = 1', eqWrong: [a + 't + ' + b + 't = 1', 't = (' + a + ' + ' + b + ')/2', '1/' + a + ' + 1/' + b + ' = t'], eqVar: 't = hours together',
          steps: ['Rates: ' + nm[0] + ' does 1/' + a + ' of the job per hour, ' + nm[1] + ' 1/' + b + '.', 'Together: 1/' + a + ' + 1/' + b + ' = ' + frac(Q(a + b, a * b)) + ' per hour.', 'Time = 1 ÷ ' + frac(Q(a + b, a * b)) + ' = ' + frac(tt) + ' hours.'] };
      }
      var s = rng.int(1, a - 1); // A works s hours alone, then both finish
      var rem = PL.qsub(Q(1), Q(s, a)); var tt2 = PL.qdiv(rem, Q(a + b, a * b));
      if (tt2.d > 6 || tt2.n <= 0) continue;
      return { text: nm[0] + ' can ' + job + ' alone in ' + a + ' hours; ' + nm[1] + ' alone takes ' + b + ' hours. ' + nm[0] + ' works alone for ' + s + ' hour' + (s > 1 ? 's' : '') + ', then ' + nm[1] + ' joins and they finish together.', ask: 'How many hours do they work together?', ans: tt2, unit: 'hours',
        steps: ['In ' + s + ' h, ' + nm[0] + ' completes ' + frac(Q(s, a)) + ' of the job, leaving ' + frac(rem) + '.', 'Together they do 1/' + a + ' + 1/' + b + ' = ' + frac(Q(a + b, a * b)) + ' per hour.', 'Time = ' + frac(rem) + ' ÷ ' + frac(Q(a + b, a * b)) + ' = ' + frac(tt2) + ' hours.'] };
    }
    return null;
  } };

  T.pipes = { topic: 'Work rates', lv: [7, 10], f: function (rng) {
    for (var t = 0; t < 300; t++) {
      var a = rng.int(2, 10), b = rng.int(2, 10), c = rng.int(4, 24);
      var rate = PL.qsub(PL.qadd(Q(1, a), Q(1, b)), Q(1, c)); if (rate.n <= 0) continue;
      var tt = PL.qdiv(Q(1), rate); if (tt.d > 4 || PL.qval(tt) > 20) continue;
      return { text: 'Pipe A fills a tank in ' + a + ' hours and pipe B fills it in ' + b + ' hours. A drain empties the full tank in ' + c + ' hours. All three are opened on an empty tank.', ask: 'How many hours until the tank is full?', ans: tt, unit: 'hours',
        eq: 't/' + a + ' + t/' + b + ' − t/' + c + ' = 1', eqWrong: ['t/' + a + ' + t/' + b + ' + t/' + c + ' = 1', a + ' + ' + b + ' − ' + c + ' = t', 't/' + a + ' + t/' + b + ' = t/' + c], eqVar: 't = hours to fill',
        steps: ['Net rate = 1/' + a + ' + 1/' + b + ' − 1/' + c + ' = ' + frac(rate) + ' tank per hour.', 'Time = 1 ÷ ' + frac(rate) + ' = ' + frac(tt) + ' hours.'] };
    }
    return null;
  } };

  T.percentSeq = { topic: 'Percentages', lv: [2, 6], f: function (rng, lv) {
    for (var t = 0; t < 200; t++) {
      var up = rng.int(1, 6) * 5, down = rng.int(1, 6) * 5;
      var final = rng.int(4, 40) * 10;
      var orig = PL.qdiv(Q(final), PL.qmul(Q(100 + up, 100), Q(100 - down, 100)));
      if (orig.d !== 1 || (100 + up) * (100 - down) === 10000 || lv < 3 && orig.n > 500) continue;
      var item = rng.pick(['jacket', 'bicycle', 'lamp', 'printer', 'desk chair']);
      return { text: 'A store raises the price of a ' + item + ' by ' + up + '%, then later puts it on sale at ' + down + '% off the new price. The sale price is ' + money(final) + '.', ask: 'What was the original price?', ans: orig, unit: '$',
        eq: 'p × ' + fmtNum(1 + up / 100) + ' × ' + fmtNum(1 - down / 100) + ' = ' + final, eqWrong: ['p × ' + fmtNum(1 + (up - down) / 100) + ' = ' + final, 'p + ' + up + ' − ' + down + ' = ' + final, 'p × ' + fmtNum(1 + up / 100) + ' − ' + fmtNum(down / 100) + ' = ' + final], eqVar: 'p = original price',
        steps: ['Each change multiplies the price: × ' + fmtNum(1 + up / 100) + ' then × ' + fmtNum(1 - down / 100) + '.', 'p × ' + fmtNum((1 + up / 100) * (1 - down / 100)) + ' = ' + final + '.', 'p = ' + final + ' ÷ ' + fmtNum((1 + up / 100) * (1 - down / 100)) + ' = ' + orig.n + '.'] };
    }
    return null;
  } };

  T.percentOf = { topic: 'Percentages', lv: [1, 3], f: function (rng) {
    var tot = rng.int(4, 30) * 20, pct = rng.pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 60, 75]), part = tot * pct / 100;
    var what = rng.pick(['students in a school play an instrument', 'trees in an orchard are apple trees', 'emails received this month were spam']);
    if (rng.chance(0.5)) return { text: pct + '% of the ' + what.replace(/ (play|are|were) /, ' $1 ') + '. There are ' + tot + ' in total.', ask: 'How many is that?', ans: Q(part), unit: '', steps: [pct + '% means ' + pct + '/100.', pct + '/100 × ' + tot + ' = ' + part + '.'] };
    return { text: 'Of ' + tot + ' ' + what.split(' ')[0] + ', ' + part + ' ' + what.split(' ').slice(1).join(' ').replace(/^in (a|an) [a-z]+ /, '').replace(/^this month /, '') + (what.indexOf('school') >= 0 ? ' (in this school).' : '.'), ask: 'What percent is that?', ans: Q(pct), unit: '%', steps: ['Percent = part ÷ whole × 100.', part + ' ÷ ' + tot + ' × 100 = ' + pct + '%.'] };
  } };

  T.netChange = { topic: 'Percentages', lv: [5, 8], f: function (rng) {
    var x = rng.int(2, 8) * 5; var net = Q(-x * x, 100);
    return { text: 'A share price rises ' + x + '% on Monday and falls ' + x + '% on Tuesday.', ask: 'What is the overall percent change? (Use a negative number for a decrease.)', ans: net, unit: '%',
      steps: ['Multiply the factors: ' + fmtNum(1 + x / 100) + ' × ' + fmtNum(1 - x / 100) + ' = ' + fmtNum(1 - x * x / 10000) + '.', 'That is a change of ' + fmtNum(-x * x / 100) + '%. The two moves do not cancel, because the fall applies to a larger amount.'] };
  } };

  T.probBag = { topic: 'Probability', lv: [4, 8], f: function (rng, lv) {
    var r = rng.int(2, 7), b = rng.int(2, 7), g = lv >= 6 ? rng.int(1, 5) : 0, n = r + b + g;
    var kind = rng.pick(lv >= 6 ? ['both', 'one', 'diff'] : ['both', 'single']);
    var ans, steps;
    if (kind === 'single') { ans = Q(r, n); steps = ['There are ' + n + ' marbles and ' + r + ' are red.', 'P(red) = ' + r + '/' + n + ' = ' + frac(ans) + '.']; }
    else if (kind === 'both') { ans = PL.qmul(Q(r, n), Q(r - 1, n - 1)); steps = ['First draw red: ' + r + '/' + n + '.', 'Second draw red (one red removed): ' + (r - 1) + '/' + (n - 1) + '.', 'Multiply: ' + frac(ans) + '.']; }
    else if (kind === 'one') { ans = PL.qadd(PL.qmul(Q(r, n), Q(n - r, n - 1)), PL.qmul(Q(n - r, n), Q(r, n - 1))); steps = ['Red then not-red: ' + r + '/' + n + ' × ' + (n - r) + '/' + (n - 1) + '.', 'Not-red then red: ' + (n - r) + '/' + n + ' × ' + r + '/' + (n - 1) + '.', 'Add: ' + frac(ans) + '.']; }
    else { var same = PL.qadd(PL.qadd(PL.qmul(Q(r, n), Q(r - 1, n - 1)), PL.qmul(Q(b, n), Q(b - 1, n - 1))), g > 1 ? PL.qmul(Q(g, n), Q(g - 1, n - 1)) : Q(0)); ans = PL.qsub(Q(1), same); steps = ['Find P(same colour) and subtract from 1.', 'P(same) = ' + frac(same) + '.', 'P(different) = 1 − ' + frac(same) + ' = ' + frac(ans) + '.']; }
    var ask = { single: 'What is the probability that one marble drawn at random is red?', both: 'Two marbles are drawn without replacement. What is the probability both are red?', one: 'Two marbles are drawn without replacement. What is the probability that exactly one is red?', diff: 'Two marbles are drawn without replacement. What is the probability they are different colours?' }[kind];
    return { text: 'A bag holds ' + r + ' red, ' + b + ' blue' + (g ? ' and ' + g + ' green' : '') + ' marbles.', ask: ask + ' (Give a fraction.)', ans: ans, unit: '', steps: steps };
  } };

  T.dice = { topic: 'Probability', lv: [5, 9], f: function (rng) {
    var kind = rng.pick(['sum', 'atleast', 'greater']), cnt = 0, s = rng.int(4, 10);
    for (var i = 1; i <= 6; i++) for (var j = 1; j <= 6; j++) {
      if (kind === 'sum' && i + j === s) cnt++;
      if (kind === 'atleast' && (i === 6 || j === 6)) cnt++;
      if (kind === 'greater' && i > j) cnt++;
    }
    var ans = Q(cnt, 36);
    var ask = { sum: 'What is the probability the total is ' + s + '?', atleast: 'What is the probability at least one die shows a 6?', greater: 'What is the probability the red die shows a higher number than the blue die?' }[kind];
    var st = { sum: ['There are 36 equally likely outcomes.', 'Pairs that total ' + s + ': ' + cnt + '.', 'Probability = ' + cnt + '/36 = ' + frac(ans) + '.'], atleast: ['P(no 6) = 5/6 × 5/6 = 25/36.', 'P(at least one 6) = 1 − 25/36 = 11/36.'], greater: ['36 outcomes; 6 are ties.', 'The other 30 split evenly between red higher and blue higher: 15.', 'Probability = 15/36 = 5/12.'] }[kind];
    return { text: 'A red die and a blue die, both fair and six-sided, are rolled together.', ask: ask + ' (Give a fraction.)', ans: ans, unit: '', steps: st };
  } };

  T.digits = { topic: 'Number relationships', lv: [5, 8], f: function (rng) {
    for (var t = 0; t < 100; t++) {
      var a = rng.int(1, 9), b = rng.int(0, 9); if (a === b || b === 0) continue;
      var n = 10 * a + b, rev = 10 * b + a, d = rev - n, s = a + b;
      return { text: 'A two-digit number has digits that add up to ' + s + '. Reversing its digits ' + (d > 0 ? 'increases' : 'decreases') + ' the number by ' + Math.abs(d) + '.', ask: 'What is the number?', ans: Q(n), unit: '',
        eq: '(10b + a) − (10a + b) = ' + d, eqWrong: ['(10a + b) − (10b + a) = ' + d, 'b − a = ' + d, '10(b − a) = ' + d], eqVar: 'a = tens digit, b = ones digit',
        steps: ['Write the number as 10a + b with a + b = ' + s + '.', 'Reversed minus original: (10b + a) − (10a + b) = 9(b − a) = ' + d + ', so b − a = ' + (d / 9) + '.', 'With a + b = ' + s + ': a = ' + a + ', b = ' + b + ', so the number is ' + n + '.'] };
    }
    return null;
  } };

  T.rectangle = { topic: 'Multi-step algebra', lv: [3, 6], f: function (rng) {
    var w = rng.int(3, 20), k = rng.int(2, 3), c = rng.int(1, 9) * (rng.chance(0.5) ? 1 : -1), L = k * w + c;
    if (L <= w) return null;
    var P = 2 * (L + w);
    return { text: 'A rectangle’s length is ' + (c > 0 ? c + ' more than ' : (-c) + ' less than ') + k + ' times its width. Its perimeter is ' + P + ' cm.', ask: 'What is its area in square centimetres?', ans: Q(L * w), unit: 'cm²',
      ask2: null,
      steps: ['Let the width be w, so the length is ' + k + 'w ' + (c > 0 ? '+ ' + c : '− ' + (-c)) + '.', 'Perimeter: 2(w + ' + k + 'w ' + (c > 0 ? '+ ' + c : '− ' + (-c)) + ') = ' + P + ', so ' + (k + 1) + 'w ' + (c > 0 ? '+ ' + c : '− ' + (-c)) + ' = ' + (P / 2) + ' and w = ' + w + '.', 'Length = ' + L + '. Area = ' + L + ' × ' + w + ' = ' + (L * w) + '.'] };
  } };

  T.plans = { topic: 'Practical scenarios', lv: [2, 5], f: function (rng) {
    for (var t = 0; t < 200; t++) {
      var f1 = rng.int(0, 10) * 5, r1 = rng.int(10, 30), f2 = f1 + rng.int(2, 12) * 5, r2 = rng.int(2, r1 - 2);
      var m = Q((f2 - f1) * 100, r1 - r2); if (m.d !== 1 || m.n > 400) continue;
      var it = rng.pick([['gym', 'visit', 'visits'], ['car-share', 'kilometre', 'kilometres'], ['phone', 'gigabyte', 'gigabytes']]);
      return { text: 'Plan A for a ' + it[0] + ' membership costs ' + money(f1) + ' per month plus ' + r1 + '¢ per ' + it[1] + '. Plan B costs ' + money(f2) + ' per month plus ' + r2 + '¢ per ' + it[1] + '.', ask: 'At how many ' + it[2] + ' per month do the plans cost the same?', ans: m, unit: '',
        eq: f1 * 100 + ' + ' + r1 + 'x = ' + f2 * 100 + ' + ' + r2 + 'x', eqWrong: [f1 + ' + ' + r1 + 'x = ' + f2 + ' + ' + r2 + 'x', f1 * 100 + ' + ' + r2 + 'x = ' + f2 * 100 + ' + ' + r1 + 'x', (f1 + f2) * 100 + ' = (' + r1 + ' + ' + r2 + ')x'], eqVar: 'x = ' + it[2] + ', amounts in cents',
        steps: ['In cents: ' + (f1 * 100) + ' + ' + r1 + 'x = ' + (f2 * 100) + ' + ' + r2 + 'x.', (r1 - r2) + 'x = ' + ((f2 - f1) * 100) + ', so x = ' + m.n + '.'] };
    }
    return null;
  } };

  T.average = { topic: 'Practical scenarios', lv: [2, 5], f: function (rng) {
    for (var t = 0; t < 100; t++) {
      var n = rng.int(3, 6), avg = rng.int(70, 88), target = avg + rng.int(1, 4);
      var need = target * (n + 1) - avg * n; if (need > 100 || need < 50) continue;
      var nm = names(rng, 1)[0];
      return { text: nm + '’s average over ' + n + ' tests is ' + avg + '.', ask: 'What score on the next test would raise the average to exactly ' + target + '?', ans: Q(need), unit: '',
        eq: '(' + (avg * n) + ' + x) / ' + (n + 1) + ' = ' + target, eqWrong: ['(' + avg + ' + x) / 2 = ' + target, '(' + (avg * n) + ' + x) / ' + n + ' = ' + target, avg + ' + x = ' + target * (n + 1)], eqVar: 'x = next score',
        steps: ['Current total: ' + n + ' × ' + avg + ' = ' + (avg * n) + '.', 'Needed total for ' + (n + 1) + ' tests: ' + (n + 1) + ' × ' + target + ' = ' + (target * (n + 1)) + '.', 'Next score = ' + (target * (n + 1)) + ' − ' + (avg * n) + ' = ' + need + '.'] };
    }
    return null;
  } };

  T.ratioChange = { topic: 'Ratios and proportions', lv: [5, 8], f: function (rng) {
    for (var t = 0; t < 300; t++) {
      var a = rng.int(1, 6), b = rng.int(a + 1, 9), k = rng.int(2, 12), add = rng.int(2, 20);
      if (PL.gcd(a, b) !== 1) continue;
      var x = a * k + add, y = b * k + add, g = PL.gcd(x, y), c = x / g, d = y / g;
      if (c > 12 || d > 12 || c * b === d * a) continue;
      var nm = rng.pick([['cats', 'dogs', 'a shelter'], ['novels', 'biographies', 'a bookcase'], ['red tiles', 'blue tiles', 'a box']]);
      return { text: 'In ' + nm[2] + ' the ratio of ' + nm[0] + ' to ' + nm[1] + ' is ' + a + ':' + b + '. After ' + add + ' more of each are added, the ratio becomes ' + c + ':' + d + '.', ask: 'How many ' + nm[0] + ' were there at first?', ans: Q(a * k), unit: '',
        eq: '(' + a + 'k + ' + add + ')/(' + b + 'k + ' + add + ') = ' + c + '/' + d, eqWrong: ['(' + a + ' + ' + add + ')/(' + b + ' + ' + add + ') = ' + c + '/' + d, a + 'k/' + b + 'k = ' + c + '/' + d, '(' + a + 'k + ' + add + ')/(' + b + 'k) = ' + c + '/' + d], eqVar: 'there are ' + a + 'k ' + nm[0] + ' and ' + b + 'k ' + nm[1] + ' at first',
        steps: ['Let the original counts be ' + a + 'k and ' + b + 'k.', 'Cross-multiply: ' + d + '(' + a + 'k + ' + add + ') = ' + c + '(' + b + 'k + ' + add + ').', (d * a) + 'k + ' + (d * add) + ' = ' + (c * b) + 'k + ' + (c * add) + ' → ' + (c * b - d * a) + 'k = ' + (d * add - c * add) + ' → k = ' + k + '.', 'Original ' + nm[0] + ': ' + a + ' × ' + k + ' = ' + (a * k) + '.'] };
    }
    return null;
  } };

  /* ---- format: identify missing information ---- */
  var MISSING = [
    function (rng) {
      var v = rng.int(40, 80), tm = rng.int(2, 5);
      return { topic: 'Distance, speed, and time', text: 'A train leaves the station and travels at a steady speed until it reaches the next city. Then it rests for 20 minutes.', ask: 'Which single extra fact would let you find the distance between the cities?',
        opts: ['The train’s speed and how long it travelled', 'The time it left the station', 'How long it rested', 'The number of passengers'], ans: 0,
        steps: ['Distance = speed × time; the problem gives neither.', 'Only the first option supplies both. The departure time alone or the rest period does not give travel time.'] };
    },
    function (rng) {
      var nm = names(rng, 2), s = rng.int(30, 60);
      return { topic: 'Ages', text: 'The sum of ' + nm[0] + '’s and ' + nm[1] + '’s ages is ' + s + '.', ask: 'Which additional fact is enough to find both ages?',
        opts: [nm[0] + ' is ' + rng.int(2, 9) + ' years older than ' + nm[1], 'In 5 years the sum of their ages will be ' + (s + 10), 'They were both born in spring', 'Five years ago the sum of their ages was ' + (s - 10)], ans: 0,
        steps: ['One equation (x + y = ' + s + ') with two unknowns needs a second, independent equation.', 'The age-difference fact gives x − y = constant, which is independent.', 'The future and past sums follow automatically from the first fact, so they add nothing.'] };
    },
    function (rng) {
      var p = rng.int(2, 6) * 5;
      return { topic: 'Percentages', text: 'A laptop is discounted by ' + p + '%.', ask: 'What do you need to know to find how much money the discount saves?',
        opts: ['The original price', 'The discount percentage', 'The sales tax rate', 'Which store sells it'], ans: 0,
        steps: ['Savings = ' + p + '% × original price.', 'The percentage is already given; the original price is the missing quantity.'] };
    },
    function (rng) {
      var a = rng.int(3, 9);
      return { topic: 'Work rates', text: 'Two printers working together finish a print job in ' + a + ' hours.', ask: 'What extra fact lets you find how long the first printer takes alone?',
        opts: ['How long the second printer takes alone', 'That both printers are the same brand', 'How many pages the job has', 'That they started at 9 a.m.'], ans: 0,
        steps: ['1/A + 1/B = 1/' + a + ' has two unknowns.', 'Knowing B gives 1/A = 1/' + a + ' − 1/B. Page count alone does not help without a printing rate.'] };
    },
    function (rng) {
      return { topic: 'Mixtures', text: 'A chemist mixes some 10% saline with some 30% saline.', ask: 'Which extra information is enough to find the concentration of the mixture?',
        opts: ['The volume of each solution used', 'The total volume only', 'The temperature of each solution', 'The cost per litre of each'], ans: 0,
        steps: ['The concentration depends on the proportion of each solution.', 'Total volume alone does not fix the proportion; the separate volumes do.'] };
    },
    function (rng) {
      var n = rng.int(20, 40);
      return { topic: 'Systems of equations', text: 'A farmer has chickens and cows, ' + n + ' animals in all.', ask: 'Which extra fact is enough to find how many cows there are?',
        opts: ['The total number of legs', 'The number of heads', 'That chickens have two legs', 'The farm’s size in acres'], ans: 0,
        steps: ['Heads give the same equation as the animal count. Legs give a second, independent equation: 2c + 4k = legs.', 'With c + k = ' + n + ' you can solve for k.'] };
    }
  ];

  /* ---- format: does the conclusion follow? ---- */
  function genFollows(rng, lv) {
    var nm = names(rng, 3), a = rng.int(3, 12), k = rng.int(2, 4);
    var kind = rng.int(0, 3);
    if (kind === 0) {
      // x > k*y, y >= a => x > k*a (yes); conclusion x >= k*a+? etc
      var c = rng.pick([k * a, k * a + rng.int(1, 6), k * a - rng.int(1, 4)]);
      var ans = c <= k * a ? 0 : 2; // strictly: x > k y >= k a so x > ka >= c → Yes if c <= ka. If c > ka can't tell
      return { topic: 'Number relationships', text: nm[0] + ' has more than ' + k + ' times as many stamps as ' + nm[1] + '. ' + nm[1] + ' has at least ' + a + ' stamps.', ask: 'Conclusion: “' + nm[0] + ' has more than ' + c + ' stamps.” Does it follow?', opts: ['Yes, it must be true', 'No, it must be false', 'Cannot be determined'], ans: ans,
        steps: [nm[0] + ' > ' + k + ' × ' + nm[1] + ' ≥ ' + k + ' × ' + a + ' = ' + (k * a) + '.', ans === 0 ? 'So ' + nm[0] + ' has more than ' + (k * a) + ', which is at least ' + c + '. It follows.' : nm[0] + ' must exceed ' + (k * a) + ', but could have ' + (k * a + 1) + ', which is not more than ' + c + '. It might be true or not.'] };
    }
    if (kind === 1) {
      var s = rng.int(20, 60), d = rng.int(2, 10);
      var big = (s + d) / 2;
      if (!Number.isInteger(big)) { s++; big = (s + d) / 2; }
      var claim = rng.pick([big, big + 1, big - 1]);
      var ans1 = claim === big ? 0 : 1;
      return { topic: 'Systems of equations', text: 'Two numbers add to ' + s + ' and differ by ' + d + '.', ask: 'Conclusion: “The larger number is ' + claim + '.” Does it follow?', opts: ['Yes, it must be true', 'No, it must be false', 'Cannot be determined'], ans: ans1,
        steps: ['Larger = (sum + difference) ÷ 2 = (' + s + ' + ' + d + ') ÷ 2 = ' + big + '.', ans1 === 0 ? 'The conclusion is exactly right.' : 'The larger number is ' + big + ', so the claim is false.'] };
    }
    if (kind === 2) {
      var avg = rng.int(60, 85), n = rng.int(3, 6);
      var claimB = rng.chance(0.5);
      return { topic: 'Practical scenarios', text: 'The average of ' + n + ' test scores is ' + avg + '. All scores are whole numbers from 0 to 100.', ask: claimB ? 'Conclusion: “At least one score is ' + avg + ' or higher.” Does it follow?' : 'Conclusion: “At least one score is exactly ' + avg + '.” Does it follow?', opts: ['Yes, it must be true', 'No, it must be false', 'Cannot be determined'], ans: claimB ? 0 : 2,
        steps: claimB ? ['If every score were below ' + avg + ', the average would be below ' + avg + '.', 'So at least one score is ' + avg + ' or more.'] : ['Scores of ' + (avg - 1) + ' and ' + (avg + 1) + ' (with the rest at ' + avg + ' or similar pairs) can average ' + avg + ' with no score equal to ' + avg + '.', 'But all scores could also be ' + avg + '. So it cannot be determined.'] };
    }
    var p = rng.int(2, 6) * 10;
    return { topic: 'Percentages', text: 'Store A cuts all prices by ' + p + '%. Store B raises its prices by ' + p + '% and then cuts the new prices by ' + p + '%. Both stores started with identical prices.', ask: 'Conclusion: “Prices at the two stores are now the same.” Does it follow?', opts: ['Yes, it must be true', 'No, it must be false', 'Cannot be determined'], ans: 1,
      steps: ['Store A: × ' + fmtNum(1 - p / 100) + '. Store B: × ' + fmtNum(1 + p / 100) + ' × ' + fmtNum(1 - p / 100) + ' = × ' + fmtNum((1 + p / 100) * (1 - p / 100)) + '.', 'These factors differ, so the prices differ (Store A is cheaper).'] };
  }

  /* ---- format: find the error ---- */
  function genError(rng, lv) {
    var pool = ['agesTimes', 'coins', 'consecutive', 'plans', 'average'];
    for (var t = 0; t < 20; t++) {
      var key = rng.pick(pool), tp = T[key], base = tp.f(rng, lv);
      if (!base || !base.eq) continue;
      // Build a 3-4 line solution where one line is wrong
      var steps = base.steps.slice();
      var wrongIdx = rng.int(1, steps.length - 1);
      var mutated = steps[wrongIdx].replace(/(=\s*)(\d+)(?!.*=\s*\d)/, function (m0, pre, num) { var nv = +num + rng.pick([-3, -2, 2, 3, 5]); if (nv <= 0) nv = +num + 4; return pre + nv; });
      if (mutated === steps[wrongIdx]) continue;
      steps[wrongIdx] = mutated;
      var nm = names(rng, 1)[0];
      return { topic: tp.topic, text: base.text + ' ' + base.ask, ask: nm + ' wrote the solution below. Which line contains the first mistake?', work: steps, opts: steps.map(function (_, i) { return 'Line ' + (i + 1); }).concat(['No mistake']), ans: wrongIdx,
        steps: ['Line ' + (wrongIdx + 1) + ' should read: ' + base.steps[wrongIdx], 'Correct answer: ' + PL.qstr(base.ans) + (base.unit && base.unit !== '$' ? ' ' + base.unit : '') + '.'] };
    }
    return null;
  }

  var FORMAT_BY_LEVEL = {
    1: { num: 10 }, 2: { num: 8, eq: 2 }, 3: { num: 7, eq: 2, multi: 1 }, 4: { num: 6, eq: 2, multi: 1, missing: 1 },
    5: { num: 5, eq: 2, multi: 1, missing: 1, follows: 1 }, 6: { num: 5, eq: 1, multi: 1, missing: 1, follows: 1, error: 1 },
    7: { num: 5, eq: 1, multi: 1, follows: 1, error: 2 }, 8: { num: 5, eq: 1, multi: 1, follows: 1, error: 2 },
    9: { num: 6, multi: 1, follows: 1, error: 2 }, 10: { num: 6, multi: 2, error: 2 }
  };

  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10);
    var fmts = FORMAT_BY_LEVEL[lv], keys = Object.keys(fmts);
    var recentTopics = (ctx && ctx.recent) || [];
    for (var t = 0; t < 80; t++) {
      var fmt = rng.weighted(keys, keys.map(function (k) { return fmts[k]; }));
      var p = null;
      if (fmt === 'missing') { var m = rng.pick(MISSING)(rng); p = { format: 'mc', topic: m.topic, text: m.text, ask: m.ask, opts: m.opts, ans: m.ans, steps: m.steps, sub: 'Missing information' }; }
      else if (fmt === 'follows') { var f = genFollows(rng, lv); p = { format: 'mc', topic: f.topic, text: f.text, ask: f.ask, opts: f.opts, ans: f.ans, steps: f.steps, sub: 'Does it follow?', fixedOrder: true }; }
      else if (fmt === 'error') { var e = genError(rng, lv); if (e) p = { format: 'mc', topic: e.topic, text: e.text, ask: e.ask, work: e.work, opts: e.opts, ans: e.ans, steps: e.steps, sub: 'Find the error', fixedOrder: true }; }
      else {
        var cands = Object.keys(T).filter(function (k) { var r = T[k].lv; return lv >= r[0] - (fmt === 'eq' ? 1 : 0) && lv <= r[1] + 1; });
        if (fmt === 'eq') cands = cands.filter(function (k) { return k !== 'roundTrip' && k !== 'probBag' && k !== 'dice' && k !== 'netChange' && k !== 'percentOf' && k !== 'rectangle' && k !== 'ratioShare'; });
        if (fmt === 'multi') cands = cands.filter(function (k) { return k === 'coins' || k === 'agesSumDiff'; });
        if (!cands.length) continue;
        var fresh = cands.filter(function (k) { return recentTopics.indexOf(k) < 0; });
        var key = rng.pick(fresh.length ? fresh : cands);
        var b = T[key].f(rng, lv);
        if (!b) continue;
        if (fmt === 'eq') {
          if (!b.eq) continue;
          var rootC = eqRoot(b.eq);
          var wrong = b.eqWrong.filter(function (x) { if (x === b.eq) return false; var r = eqRoot(x); return !(rootC != null && r != null && Math.abs(r - rootC) < 1e-9) && r !== 'same'; }).slice(0, 3);
          if (wrong.length < 2) continue;
          var opts = rng.shuffle([b.eq].concat(wrong));
          p = { format: 'mc', topic: T[key].topic, text: b.text, ask: 'Which equation correctly models this situation? Let ' + b.eqVar + '.', opts: opts, ans: opts.indexOf(b.eq), steps: ['Correct model: ' + b.eq].concat(b.steps).concat(['Answer to the question: ' + PL.qstr(b.ans) + (b.unit && b.unit !== '$' ? ' ' + b.unit : '') + '.']), sub: 'Choose the equation', tkey: key, mono: true };
        } else if (fmt === 'multi') {
          if (!b.ans2) continue;
          p = { format: 'multi', topic: T[key].topic, text: b.text, ask: b.ask, ask2: b.ask2, ans: b.ans, ans2: b.ans2, unit: b.unit, steps: b.steps, sub: 'Multi-part', tkey: key };
        } else {
          p = { format: 'num', topic: T[key].topic, text: b.text, ask: b.ask, ans: b.ans, unit: b.unit, steps: b.steps, sub: 'Solve', tkey: key };
        }
      }
      if (!p) continue;
      if (p.format === 'mc' && !p.fixedOrder && p.sub === 'Missing information') {
        var correct = p.opts[p.ans]; p.opts = rng.shuffle(p.opts); p.ans = p.opts.indexOf(correct);
      }
      if (!verify(p)) continue;
      return p;
    }
    throw new Error('algebra generation failed');
  }

  /* numeric root of a one-variable equation string (null if not parseable or not unique). Used to reject distractor
     equations that happen to share the correct equation's solution. */
  function eqRoot(eq) {
    try {
      var sides = eq.replace(/−/g, '-').replace(/×/g, '*').split('=');
      if (sides.length !== 2) return null;
      var fix = function (x) { return x.replace(/(\d|\))\s*\(/g, '$1*(').replace(/(\d)([a-z])/g, '$1*$2').replace(/\)([a-z\d])/g, ')*$1'); };
      var vars = (sides[0] + sides[1]).match(/[a-z]/g) || [];
      var uniq = vars.filter(function (v, i) { return vars.indexOf(v) === i; });
      if (uniq.length !== 1) return null;
      var f = new Function(uniq[0], 'return (' + fix(sides[0]) + ')-(' + fix(sides[1]) + ');');
      var found = null;
      for (var n = 1; n <= 3000; n++) {
        var dens = [1, 2, 3, 4, 5, 6, 8, 10, 12];
        for (var di = 0; di < dens.length; di++) { var v = n / dens[di]; if (Math.abs(f(v)) < 1e-9) { if (found != null && Math.abs(found - v) > 1e-9) return null; found = v; } }
      }
      return found;
    } catch (e) { return null; }
  }
  PL._eqRoot = eqRoot;

  function verify(p) {
    if (p.format === 'num' || p.format === 'multi') {
      if (!p.ans || !isFinite(PL.qval(p.ans))) return false;
      if (p.ans.d > 12) return false;
      if (p.format === 'multi' && (!p.ans2 || p.ans2.n <= 0)) return false;
      // the stated answer must appear in the final solution step (consistency of the worked solution)
      var last = p.steps.join(' ');
      var show = PL.qstr(p.ans), alt = String(PL.qval(p.ans));
      if (last.indexOf(show) < 0 && last.indexOf(alt) < 0 && last.indexOf(money(p.ans).replace('$', '')) < 0) return false;
      return true;
    }
    if (p.format === 'mc') return p.ans >= 0 && p.ans < p.opts.length && new Set(p.opts).size === p.opts.length;
    return false;
  }

  function init() { return { tries: [] }; }
  function view(api) {
    var p = api.p, gs = api.gs;
    function done(ok, label) {
      gs.tries.push(label);
      if (ok) { api.update(gs); api.finish('solved'); }
      else { api.wrong(); api.toast('Not quite. Try again or use the scratchpad.', 'bad'); api.update(gs); }
    }
    var body;
    if (p.format === 'mc') {
      body = h('div', { class: 'opts' }, p.opts.map(function (o, i) {
        return h('button', { class: 'btn opt' + (p.mono ? ' mono' : ''), disabled: api.done || gs.tries.indexOf(o) >= 0, onclick: function () { done(i === p.ans, o); } }, o);
      }));
    } else {
      var i1 = h('input', { id: 'alg-1', class: 'txt', type: 'text', inputmode: 'text', autocomplete: 'off', placeholder: 'Answer' + (p.unit && p.unit !== '$' && p.unit !== '%' ? ' (' + p.unit + ')' : p.unit === '$' ? ' ($)' : p.unit === '%' ? ' (%)' : '') });
      var i2 = p.format === 'multi' ? h('input', { id: 'alg-2', class: 'txt', type: 'text', inputmode: 'text', autocomplete: 'off', placeholder: 'Second answer' }) : null;
      body = h('form', { class: 'alg-form', onsubmit: function (e) {
        e.preventDefault();
        var v1 = i1.value.trim(); if (!v1) return;
        var ok = PL.numMatch(v1, p.ans, { percentOk: p.unit === '%' });
        var label = v1;
        if (i2) { var v2 = i2.value.trim(); if (!v2) { api.toast('Fill in both answers.', ''); return; } ok = ok && PL.numMatch(v2, p.ans2); label += ' / ' + v2; }
        done(ok, label);
      } },
        h('label', { class: 'lbl', for: 'alg-1' }, p.ask), i1,
        i2 ? h('label', { class: 'lbl', for: 'alg-2' }, p.ask2) : null, i2,
        h('button', { class: 'btn primary', type: 'submit', disabled: api.done }, 'Check'),
        h('div', { class: 'muted small' }, 'Fractions (3/4), mixed numbers (1 1/2) and decimals rounded to at least two places are accepted.'));
    }
    return h('div', { class: 'algebra' },
      h('div', { class: 'tagrow' }, h('span', { class: 'tag' }, p.topic), h('span', { class: 'tag ghost' }, p.sub)),
      h('p', { class: 'prob' }, p.text),
      p.work ? h('ol', { class: 'work mono' }, p.work.map(function (l) { return h('li', null, l); })) : null,
      p.format === 'mc' ? h('p', { class: 'q' }, p.ask) : null,
      body,
      gs.tries.length ? h('div', { class: 'muted small' }, 'Tried: ' + gs.tries.join(' · ')) : null);
  }
  function hint(p, gs) {
    // reveal the worked solution one step at a time, never the final line
    var max = Math.max(1, p.steps.length - 1);
    if ((gs.h || 0) >= max) return { msg: 'All intermediate steps are shown; the last step is yours.', noCount: true };
    gs.h = (gs.h || 0) + 1;
    return { msg: 'Step ' + gs.h + ': ' + p.steps[gs.h - 1], gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var pen = p.format === 'mc' ? (p.opts.length <= 3 ? 40 : 30) : 15;
    var q = solved ? PL.clamp(100 - ctx.wrong * pen - ctx.hints * 15, 10, 100) : 0;
    return { quality: Math.round(q), metrics: { topic: p.topic, format: p.sub, wrong: ctx.wrong, firstTry: solved && !ctx.wrong && !ctx.hints },
      lines: [['Topic', p.topic], ['Format', p.sub], ['Wrong answers', ctx.wrong]] };
  }
  function answerText(p) {
    if (p.format === 'mc') return p.opts[p.ans];
    var u = p.unit && p.unit !== '$' ? ' ' + p.unit : '';
    var a = p.unit === '$' ? money(p.ans) : PL.qmixed(p.ans) + u;
    if (p.format === 'multi') a += '; ' + PL.qmixed(p.ans2);
    return a;
  }
  function review(p, gs) {
    return h('div', { class: 'review' },
      h('p', { class: 'prob' }, p.text), p.work ? h('ol', { class: 'work mono' }, p.work.map(function (l) { return h('li', null, l); })) : null,
      h('p', null, p.ask),
      h('div', null, h('span', { class: 'lbl' }, 'Answer '), h('b', null, answerText(p))),
      h('div', { class: 'lbl' }, 'Solution'),
      h('ol', { class: 'steps' }, p.steps.map(function (s) { return h('li', null, s); })),
      gs.tries.length ? h('div', { class: 'muted small' }, 'Your answers: ' + gs.tries.join(' · ')) : null);
  }
  function stats(atts) {
    var by = {};
    atts.forEach(function (a) { var t = a.metrics && a.metrics.topic; if (!t) return; (by[t] = by[t] || { n: 0, ok: 0, q: 0 }); by[t].n++; by[t].q += a.quality || 0; if (a.outcome === 'solved') by[t].ok++; });
    var rows = [['Accuracy', atts.length ? Math.round(100 * atts.filter(function (a) { return a.outcome === 'solved'; }).length / atts.length) + '%' : '—'],
      ['First-try, no-hint rate', atts.length ? Math.round(100 * atts.filter(function (a) { return a.metrics && a.metrics.firstTry; }).length / atts.length) + '%' : '—']];
    Object.keys(by).sort().forEach(function (t) { rows.push([t, by[t].ok + '/' + by[t].n + ' solved · avg ' + Math.round(by[t].q / by[t].n)]); });
    return rows;
  }
  PL.games.algebra = {
    id: 'algebra', name: 'Algebra Arcade', blurb: 'Word problems: model, solve, and check reasoning.',
    rules: 'Read the problem and answer. Some ask for a number, some for the equation that models the situation, the missing fact, whether a conclusion follows, or the first wrong line in someone’s working. Use the scratchpad freely; it never counts against you.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 60 + lv * 20; }, timeLimit: function (lv) { return 120 + lv * 30; },
    _T: T, _answerText: answerText
  };
})();

;
/* ===== GAME 6: LOOP LOGIC (Slitherlink) ===== */
(function () {
  var h = PL.h, S = PL.svg;
  /* Edge indexing: horizontal edges first: h(r,c) r in 0..R, c in 0..C-1 → r*C + c
     vertical edges: v(r,c) r in 0..R-1, c in 0..C → H + r*(C+1) + c. Vertices (r,c) r 0..R, c 0..C → r*(C+1)+c */
  function geom(R, C) {
    if (geomCache[R + 'x' + C]) return geomCache[R + 'x' + C];
    var H = (R + 1) * C, V = R * (C + 1), E = H + V, NV = (R + 1) * (C + 1);
    var ends = [], cellEdges = [], vertEdges = [];
    for (var i = 0; i < NV; i++) vertEdges.push([]);
    for (var r = 0; r <= R; r++) for (var c = 0; c < C; c++) { var e = r * C + c; ends[e] = [r * (C + 1) + c, r * (C + 1) + c + 1]; }
    for (r = 0; r < R; r++) for (c = 0; c <= C; c++) { var e2 = H + r * (C + 1) + c; ends[e2] = [r * (C + 1) + c, (r + 1) * (C + 1) + c]; }
    for (var e3 = 0; e3 < E; e3++) { vertEdges[ends[e3][0]].push(e3); vertEdges[ends[e3][1]].push(e3); }
    for (r = 0; r < R; r++) for (c = 0; c < C; c++) cellEdges.push([r * C + c, (r + 1) * C + c, H + r * (C + 1) + c, H + r * (C + 1) + c + 1]);
    var edgeCells = []; for (e3 = 0; e3 < E; e3++) edgeCells.push([]);
    cellEdges.forEach(function (es, ci) { es.forEach(function (e) { edgeCells[e].push(ci); }); });
    return (geomCache[R + 'x' + C] = { R: R, C: C, H: H, E: E, NV: NV, ends: ends, cellEdges: cellEdges, vertEdges: vertEdges, edgeCells: edgeCells });
  }
  var geomCache = {};

  /* ---- solver: count solutions up to `limit`; returns {count, sol} ---- */
  function solve(R, C, clues, limit, startState) {
    var G = geom(R, C), E = G.E;
    var st = startState ? startState.slice() : []; if (!startState) for (var i = 0; i < E; i++) st.push(-1);
    var count = 0, sol = null, nodes = 0;
    function propagate(s, queue) {
      while (queue.length) {
        var e = queue.pop();
        // vertices of e
        for (var k = 0; k < 2; k++) {
          var v = G.ends[e][k], es = G.vertEdges[v], on = 0, unk = 0, u = -1;
          for (var j = 0; j < es.length; j++) { var x = s[es[j]]; if (x === 1) on++; else if (x === -1) { unk++; u = es[j]; } }
          if (on > 2) return false;
          if (on === 2) { for (j = 0; j < es.length; j++) if (s[es[j]] === -1) { s[es[j]] = 0; queue.push(es[j]); } }
          else if (on === 1) { if (unk === 0) return false; if (unk === 1) { s[u] = 1; queue.push(u); } }
          else if (on === 0 && unk === 1) { s[u] = 0; queue.push(u); }
        }
        var cs = G.edgeCells[e];
        for (k = 0; k < cs.length; k++) {
          var ci = cs[k], cl = clues[ci]; if (cl == null) continue;
          var ce = G.cellEdges[ci], on2 = 0, unk2 = 0;
          for (j = 0; j < 4; j++) { var y = s[ce[j]]; if (y === 1) on2++; else if (y === -1) unk2++; }
          if (on2 > cl || on2 + unk2 < cl) return false;
          if (unk2 && on2 === cl) { for (j = 0; j < 4; j++) if (s[ce[j]] === -1) { s[ce[j]] = 0; queue.push(ce[j]); } }
          else if (unk2 && on2 + unk2 === cl) { for (j = 0; j < 4; j++) if (s[ce[j]] === -1) { s[ce[j]] = 1; queue.push(ce[j]); } }
        }
      }
      return loopCheck(s);
    }
    function loopCheck(s) {
      // detect closed sub-loops; a closed loop is allowed only if it contains every on-edge and no unknowns could add more
      var seen = {}, onCount = 0;
      for (var e = 0; e < E; e++) if (s[e] === 1) onCount++;
      for (e = 0; e < E; e++) {
        if (s[e] !== 1 || seen[e]) continue;
        // walk the path
        var stack = [e], comp = 0, closed = true;
        seen[e] = 1;
        while (stack.length) {
          var x = stack.pop(); comp++;
          for (var k = 0; k < 2; k++) {
            var v = G.ends[x][k], es = G.vertEdges[v], deg = 0;
            for (var j = 0; j < es.length; j++) if (s[es[j]] === 1) { deg++; if (!seen[es[j]]) { seen[es[j]] = 1; stack.push(es[j]); } }
            if (deg < 2) closed = false;
          }
        }
        if (closed && comp < onCount) return false;
        if (closed) {
          // must be complete: all clues satisfied with remaining unknowns off
          for (var ci = 0; ci < clues.length; ci++) {
            if (clues[ci] == null) continue;
            var on = 0; G.cellEdges[ci].forEach(function (y) { if (s[y] === 1) on++; });
            if (on !== clues[ci]) return false;
          }
        }
      }
      return true;
    }
    function pick(s) {
      // prefer an unknown edge at a vertex of degree 1 (extend a path)
      for (var v = 0; v < G.NV; v++) {
        var es = G.vertEdges[v], on = 0, u = -1;
        for (var j = 0; j < es.length; j++) { if (s[es[j]] === 1) on++; else if (s[es[j]] === -1) u = es[j]; }
        if (on === 1 && u >= 0) return u;
      }
      // else an unknown edge next to a clue cell with most constraint
      var best = -1, bs = -1;
      for (var e = 0; e < E; e++) if (s[e] === -1) {
        var sc = 0; G.edgeCells[e].forEach(function (ci) { if (clues[ci] != null) sc += 1 + (clues[ci] === 3 || clues[ci] === 0 ? 1 : 0); });
        if (sc > bs) { bs = sc; best = e; }
      }
      return best;
    }
    function complete(s) {
      var on = 0; for (var e = 0; e < E; e++) if (s[e] === 1) on++;
      if (!on) return false;
      for (e = 0; e < E; e++) if (s[e] === -1) return false;
      // single closed loop check
      var start = -1; for (e = 0; e < E; e++) if (s[e] === 1) { start = e; break; }
      var seen = {}, stack = [start], comp = 0; seen[start] = 1;
      while (stack.length) { var x = stack.pop(); comp++; for (var k = 0; k < 2; k++) { var es = G.vertEdges[G.ends[x][k]]; for (var j = 0; j < es.length; j++) if (s[es[j]] === 1 && !seen[es[j]]) { seen[es[j]] = 1; stack.push(es[j]); } } }
      if (comp !== on) return false;
      for (var ci = 0; ci < clues.length; ci++) if (clues[ci] != null) { var c2 = 0; G.cellEdges[ci].forEach(function (y) { if (s[y] === 1) c2++; }); if (c2 !== clues[ci]) return false; }
      return true;
    }
    function rec(s) {
      if (count >= limit) return;
      if (++nodes > 200000) { count = limit + 1; return; } // safety valve
      var e = pick(s);
      if (e < 0) { if (complete(s)) { count++; if (!sol) sol = s.slice(); } return; }
      for (var val = 1; val >= 0; val--) {
        var s2 = s.slice(); s2[e] = val;
        if (propagate(s2, [e])) rec(s2);
        if (count >= limit) return;
      }
    }
    // initial propagation from all edges
    var q = []; for (i = 0; i < E; i++) q.push(i);
    var s0 = st.slice();
    if (!propagateAll(s0)) return { count: 0, sol: null };
    rec(s0);
    return { count: count, sol: sol, nodes: nodes };
    function propagateAll(s) {
      // run cell rules on every clue cell and vertex rules on all vertices
      var queue = [];
      for (var e = 0; e < E; e++) queue.push(e);
      return propagate(s, queue);
    }
  }

  /* ---- generator ---- */
  function size(lv) { return lv <= 2 ? [4, 4] : lv <= 4 ? [5, 5] : lv <= 6 ? [6, 6] : lv <= 8 ? [6, 7] : [7, 7]; }
  function makeRegion(R, C, rng) {
    var inR = []; for (var i = 0; i < R * C; i++) inR.push(false);
    var start = rng.int(0, R * C - 1); inR[start] = true;
    var target = Math.round(R * C * (0.42 + rng() * 0.16)), cnt = 1;
    var nb = function (i) { var r = Math.floor(i / C), c = i % C, o = []; if (r > 0) o.push(i - C); if (r < R - 1) o.push(i + C); if (c > 0) o.push(i - 1); if (c < C - 1) o.push(i + 1); return o; };
    function outsideConnected() {
      // flood fill complement including a virtual outside border
      var seen = {}, stack = [], total = 0;
      for (var i = 0; i < R * C; i++) if (!inR[i]) { total++; var r = Math.floor(i / C), c = i % C; if (r === 0 || c === 0 || r === R - 1 || c === C - 1) { seen[i] = 1; stack.push(i); } }
      var got = stack.length;
      while (stack.length) { var x = stack.pop(); nb(x).forEach(function (y) { if (!inR[y] && !seen[y]) { seen[y] = 1; got++; stack.push(y); } }); }
      return got === total;
    }
    var guard = 0;
    while (cnt < target && guard++ < 5000) {
      var front = []; for (i = 0; i < R * C; i++) if (inR[i]) nb(i).forEach(function (y) { if (!inR[y]) front.push(y); });
      if (!front.length) break;
      var y = rng.pick(front);
      inR[y] = true;
      if (!outsideConnected()) { inR[y] = false; continue; }
      cnt++;
    }
    return inR;
  }
  function generate(level, rng) {
    var sz = size(PL.clamp(level, 1, 10)), R = sz[0], C = sz[1], G = geom(R, C);
    for (var tries = 0; tries < 30; tries++) {
      var inR = makeRegion(R, C, rng);
      var isIn = function (r, c) { return r >= 0 && c >= 0 && r < R && c < C && inR[r * C + c]; };
      var sol = []; for (var e = 0; e < G.E; e++) sol.push(0);
      for (var r = 0; r <= R; r++) for (var c = 0; c < C; c++) if (isIn(r - 1, c) !== isIn(r, c)) sol[r * C + c] = 1;
      for (r = 0; r < R; r++) for (c = 0; c <= C; c++) if (isIn(r, c - 1) !== isIn(r, c)) sol[G.H + r * (C + 1) + c] = 1;
      var full = G.cellEdges.map(function (es) { return es.reduce(function (a, x) { return a + sol[x]; }, 0); });
      var clues = full.slice();
      var res = solve(R, C, clues, 2);
      if (res.count !== 1) continue;
      // remove clues while unique; keep a level-dependent floor
      var keepFrac = level <= 2 ? 0.62 : level <= 4 ? 0.5 : level <= 6 ? 0.42 : level <= 8 ? 0.36 : 0.3;
      var order = rng.shuffle(clues.map(function (_, i) { return i; }));
      var minKeep = Math.round(R * C * keepFrac);
      for (var k = 0; k < order.length; k++) {
        var remaining = clues.filter(function (x) { return x != null; }).length;
        if (remaining <= minKeep) break;
        var i = order[k], save = clues[i]; clues[i] = null;
        var r2 = solve(R, C, clues, 2);
        if (r2.count !== 1) clues[i] = save;
      }
      return { R: R, C: C, clues: clues, sol: sol, variant: 'classic' };
    }
    throw new Error('loop generation failed');
  }

  /* ---- play ---- */
  function init(p) { var st = []; for (var e = 0; e < geom(p.R, p.C).E; e++) st.push(0); return { e: st, undo: [], redo: [] }; } // 0 unknown 1 line 2 cross
  function view(api) {
    var p = api.p, gs = api.gs, G = geom(p.R, p.C);
    var cell = Math.min(46, Math.floor(330 / Math.max(p.R, p.C))), pad = 14;
    var W = p.C * cell + pad * 2, H = p.R * cell + pad * 2;
    var X = function (c) { return pad + c * cell; }, Y = function (r) { return pad + r * cell; };
    var kids = [];
    // clues
    p.clues.forEach(function (cl, ci) {
      if (cl == null) return;
      var r = Math.floor(ci / p.C), c = ci % p.C;
      var on = G.cellEdges[ci].filter(function (e) { return gs.e[e] === 1; }).length;
      kids.push(S('text', { x: X(c) + cell / 2, y: Y(r) + cell / 2 + 6, 'text-anchor': 'middle', class: 'lp-clue' + (on === cl ? ' sat' : on > cl ? ' over' : '') }, String(cl)));
    });
    // edges
    for (var e = 0; e < G.E; e++) (function (e) {
      var a = G.ends[e][0], b = G.ends[e][1];
      var ra = Math.floor(a / (p.C + 1)), ca = a % (p.C + 1), rb = Math.floor(b / (p.C + 1)), cb = b % (p.C + 1);
      var x1 = X(ca), y1 = Y(ra), x2 = X(cb), y2 = Y(rb), st = gs.e[e];
      if (gs.hintEdge === e) kids.push(S('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: 'lp-hl' }));
      if (st === 1) kids.push(S('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: 'lp-line' }));
      if (st === 2) { var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, d = 4; kids.push(S('path', { d: 'M' + (mx - d) + ' ' + (my - d) + 'L' + (mx + d) + ' ' + (my + d) + 'M' + (mx + d) + ' ' + (my - d) + 'L' + (mx - d) + ' ' + (my + d), class: 'lp-x' })); }
      kids.push(S('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: 'lp-hit', 'data-e': e }));
    })(e);
    for (var v = 0; v < G.NV; v++) kids.push(S('circle', { cx: X(v % (p.C + 1)), cy: Y(Math.floor(v / (p.C + 1))), r: 2.6, class: 'lp-dot' }));
    var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'loop-svg', style: 'max-width:' + W + 'px' }, kids);
    function setEdge(e, val) {
      gs.undo.push([e, gs.e[e]]); if (gs.undo.length > 300) gs.undo.shift();
      gs.redo = []; gs.e[e] = val; api.update(gs);
    }
    if (!api.done) svg.addEventListener('click', function (ev) {
      var t = ev.target; if (!t.getAttribute || t.getAttribute('data-e') == null) return;
      var e = +t.getAttribute('data-e');
      gs.hintEdge = null;
      setEdge(e, gs.mode === 'x' ? (gs.e[e] === 2 ? 0 : 2) : (gs.e[e] + 1) % 3);
    });
    var lines = gs.e.filter(function (x) { return x === 1; }).length;
    return h('div', { class: 'loop' },
      h('div', { class: 'muted small' }, 'Tap an edge: line → × → blank. Numbers count the lines around that square. Make one closed loop that never branches or crosses.'),
      h('div', { class: 'loopwrap' }, svg),
      api.done ? null : h('div', { class: 'row-actions' },
        h('div', { class: 'seg' }, [['line', 'Cycle'], ['x', '× only']].map(function (m) { return h('button', { class: 'segb' + ((gs.mode || 'line') === m[0] ? ' on' : ''), onclick: function () { gs.mode = m[0]; api.update(gs); } }, m[1]); })),
        h('button', { class: 'btn ghost sm', disabled: !gs.undo.length, onclick: function () { var u = gs.undo.pop(); gs.redo.push([u[0], gs.e[u[0]]]); gs.e[u[0]] = u[1]; api.update(gs); } }, 'Undo'),
        h('button', { class: 'btn ghost sm', disabled: !gs.redo.length, onclick: function () { var u = gs.redo.pop(); gs.undo.push([u[0], gs.e[u[0]]]); gs.e[u[0]] = u[1]; api.update(gs); } }, 'Redo'),
        h('button', { class: 'btn ghost sm', onclick: function () { if (gs.confirmReset) { gs.e = gs.e.map(function () { return 0; }); gs.undo = []; gs.redo = []; gs.confirmReset = false; } else { gs.confirmReset = true; setTimeout(function () { gs.confirmReset = false; }, 3000); } api.update(gs); } }, gs.confirmReset ? 'Tap to confirm' : 'Reset')),
      api.done ? null : h('button', { class: 'btn primary wide', disabled: lines < 4, onclick: function () {
        var ok = p.sol.every(function (v, e) { return (v === 1) === (gs.e[e] === 1); });
        if (ok) { api.update(gs); api.finish('solved'); }
        else { api.wrong(); api.toast(loopProblem(p, gs), 'bad'); api.update(gs); }
      } }, 'Check loop'));
  }
  function loopProblem(p, gs) {
    var G = geom(p.R, p.C);
    for (var ci = 0; ci < p.clues.length; ci++) if (p.clues[ci] != null) { var on = G.cellEdges[ci].filter(function (e) { return gs.e[e] === 1; }).length; if (on !== p.clues[ci]) return 'A number is not satisfied yet.'; }
    for (var v = 0; v < G.NV; v++) { var d = G.vertEdges[v].filter(function (e) { return gs.e[e] === 1; }).length; if (d === 1) return 'The loop has a loose end.'; if (d > 2) return 'The loop branches somewhere.'; }
    return 'That is not a single loop matching the clues.';
  }
  function hint(p, gs) {
    var G = geom(p.R, p.C);
    for (var e = 0; e < G.E; e++) if (gs.e[e] === 1 && !p.sol[e]) return { msg: 'One of your lines is not part of the loop. Look near the numbers that are over-filled or near a branch.' };
    for (e = 0; e < G.E; e++) if (gs.e[e] === 2 && p.sol[e]) return { msg: 'One of your × marks is on an edge that the loop uses.' };
    // forced edge by propagation from the player's (correct) state
    var st = gs.e.map(function (x) { return x === 1 ? 1 : x === 2 ? 0 : -1; });
    var target = forcedByPropagation(p, st);
    if (target != null) {
      gs.e[target] = p.sol[target] ? 1 : 2; gs.hintEdge = target;
      return { msg: 'The highlighted edge ' + edgeName(p, target) + (p.sol[target] ? ' must be part of the loop' : ' must be excluded') + ' — it follows from a nearby number or a dot that already has its two lines.', gs: gs };
    }
    for (e = 0; e < G.E; e++) if (gs.e[e] === 0 && p.sol[e]) { gs.e[e] = 1; gs.hintEdge = e; return { msg: 'The highlighted edge ' + edgeName(p, e) + ' is part of the loop (no simpler one-step deduction was available).', gs: gs }; }
    return { msg: 'All loop edges are drawn. Check the loop.' };
  }
  function edgeName(p, e) {
    var G = geom(p.R, p.C);
    if (e < G.H) { var r = Math.floor(e / p.C), c = e % p.C; return '(horizontal, ' + (r === 0 ? 'top edge' : r === p.R ? 'bottom edge' : 'below row ' + r) + ', column ' + (c + 1) + ')'; }
    var k = e - G.H, r2 = Math.floor(k / (p.C + 1)), c2 = k % (p.C + 1);
    return '(vertical, row ' + (r2 + 1) + ', ' + (c2 === 0 ? 'left edge' : c2 === p.C ? 'right edge' : 'right of column ' + c2) + ')';
  }
  function forcedByPropagation(p, st) {
    // apply local rules once and find an edge whose value becomes known
    var G = geom(p.R, p.C), before = st.slice();
    var s = st.slice(), changed = true, guard = 0;
    while (changed && guard++ < 50) {
      changed = false;
      for (var ci = 0; ci < p.clues.length; ci++) {
        var cl = p.clues[ci]; if (cl == null) continue;
        var ce = G.cellEdges[ci], on = 0, unk = 0;
        ce.forEach(function (e) { if (s[e] === 1) on++; else if (s[e] === -1) unk++; });
        if (unk && on === cl) { ce.forEach(function (e) { if (s[e] === -1) { s[e] = 0; changed = true; } }); }
        else if (unk && on + unk === cl) { ce.forEach(function (e) { if (s[e] === -1) { s[e] = 1; changed = true; } }); }
      }
      for (var v = 0; v < G.NV; v++) {
        var es = G.vertEdges[v], on2 = 0, u = [];
        es.forEach(function (e) { if (s[e] === 1) on2++; else if (s[e] === -1) u.push(e); });
        if (on2 === 2 && u.length) { u.forEach(function (e) { s[e] = 0; }); changed = true; }
        else if (on2 === 1 && u.length === 1) { s[u[0]] = 1; changed = true; }
        else if (on2 === 0 && u.length === 1) { s[u[0]] = 0; changed = true; }
      }
    }
    for (var e = 0; e < s.length; e++) if (before[e] === -1 && s[e] !== -1 && (s[e] === 1) === !!p.sol[e]) return e;
    return null;
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var q = solved ? PL.clamp(100 - ctx.wrong * 12 - ctx.hints * 10, 15, 100) : Math.round(20 * p.sol.filter(function (v, e) { return v && gs.e[e] === 1; }).length / p.sol.filter(Boolean).length);
    return { quality: Math.round(q), metrics: { size: p.R + '×' + p.C, wrong: ctx.wrong, clues: p.clues.filter(function (x) { return x != null; }).length, unaided: solved && !ctx.hints },
      lines: [['Grid', p.R + '×' + p.C], ['Clues given', p.clues.filter(function (x) { return x != null; }).length], ['Incorrect checks', ctx.wrong]] };
  }
  function staticSVG(p, edges) {
    var G = geom(p.R, p.C), cell = Math.min(36, Math.floor(280 / Math.max(p.R, p.C))), pad = 10;
    var W = p.C * cell + pad * 2, Hh = p.R * cell + pad * 2, kids = [];
    var X = function (c) { return pad + c * cell; }, Y = function (r) { return pad + r * cell; };
    p.clues.forEach(function (cl, ci) { if (cl != null) kids.push(S('text', { x: X(ci % p.C) + cell / 2, y: Y(Math.floor(ci / p.C)) + cell / 2 + 5, 'text-anchor': 'middle', class: 'lp-clue' }, String(cl))); });
    edges.forEach(function (on, e) { if (on !== 1) return; var a = G.ends[e][0], b = G.ends[e][1]; kids.push(S('line', { x1: X(a % (p.C + 1)), y1: Y(Math.floor(a / (p.C + 1))), x2: X(b % (p.C + 1)), y2: Y(Math.floor(b / (p.C + 1))), class: 'lp-line' })); });
    for (var v = 0; v < G.NV; v++) kids.push(S('circle', { cx: X(v % (p.C + 1)), cy: Y(Math.floor(v / (p.C + 1))), r: 2, class: 'lp-dot' }));
    return S('svg', { viewBox: '0 0 ' + W + ' ' + Hh, class: 'loop-svg small', style: 'max-width:' + W + 'px' }, kids);
  }
  function review(p, gs) {
    return h('div', { class: 'review' }, h('div', { class: 'lbl' }, 'Solution'), staticSVG(p, p.sol),
      h('p', { class: 'muted small' }, 'Verified unique by an exhaustive solver. Common openings: a 0 rules out all four sides; a 3 next to a 0 fixes three lines; a corner 3 draws its two outer edges.'),
      h('div', { class: 'lbl' }, 'Your final grid'), staticSVG(p, gs.e));
  }
  function stats(atts) {
    var by = {}; atts.forEach(function (a) { var k = a.metrics && a.metrics.size; if (!k) return; (by[k] = by[k] || { n: 0, ok: 0 }); by[k].n++; if (a.outcome === 'solved') by[k].ok++; });
    var rows = [['Solved without hints', atts.length ? Math.round(100 * atts.filter(function (a) { return a.metrics && a.metrics.unaided; }).length / atts.length) + '%' : '—'],
      ['Average incorrect checks', atts.length ? (PL.mean(atts.map(function (a) { return a.wrong || 0; }))).toFixed(1) : '—']];
    Object.keys(by).sort().forEach(function (k) { rows.push([k + ' grids', by[k].ok + '/' + by[k].n + ' solved']); });
    return rows;
  }
  PL.games.loop = {
    id: 'loop', name: 'Loop Logic', blurb: 'Draw one closed loop that satisfies every number.',
    rules: 'Connect dots with horizontal and vertical lines to form a single loop with no branches or crossings. Each number tells how many of the four sides of its square are part of the loop. Blank squares can have any number.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 90 + lv * 40; }, timeLimit: function (lv) { return 240 + lv * 60; },
    _solve: solve, _geom: geom
  };
})();

;
/* ===== GAME 7: WORD DETECTIVE ===== */
(function () {
  var h = PL.h;
  function lenRange(lv) { return lv <= 2 ? [4, 5] : lv <= 4 ? [5, 6] : lv <= 6 ? [5, 7] : lv <= 8 ? [6, 8] : [7, 10]; }
  function costs(lv) {
    return { len: 1, vow: 1, has: 1, pos: 3, at: 4, rep: 1, half: 1, cat: 2 + Math.floor(lv / 5), assoc: 3 + Math.floor(lv / 4), def: 6 + Math.floor(lv / 3), wrong: 3 };
  }
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), lr = lenRange(lv);
    var seen = {}; ((ctx && ctx.seenWords) || []).forEach(function (w) { seen[w] = 1; });
    var pool = PL.passwordBank().filter(function (e) { return e.w.length >= lr[0] && e.w.length <= lr[1] && /^[A-Z]+$/.test(e.w); });
    var fresh = pool.filter(function (e) { return !seen[e.w]; });
    var e = rng.pick(fresh.length ? fresh : pool);
    return { w: e.w, cat: e.cat, def: e.def, assoc: rng.shuffle(e.assoc).slice(0, 3), costs: costs(lv), par: 4 + e.w.length + Math.floor(lv / 2) };
  }
  function init() { return { facts: [], cost: 0, guesses: [], mode: null, assocUsed: 0 }; }
  var VOW = 'AEIOU';
  function ask(p, gs, kind, arg) {
    var w = p.w, c = p.costs, f = null;
    if (kind === 'len') f = { k: 'len', t: 'It has ' + w.length + ' letters.' };
    if (kind === 'vow') { var n = w.split('').filter(function (x) { return VOW.indexOf(x) >= 0; }).length; f = { k: 'vow', t: 'It has ' + n + ' vowel letter' + (n === 1 ? '' : 's') + ' (A E I O U).' }; }
    if (kind === 'has') f = { k: 'has:' + arg, t: arg + (w.indexOf(arg) >= 0 ? ' is in the word.' : ' is not in the word.'), yes: w.indexOf(arg) >= 0, letter: arg };
    if (kind === 'pos') { var ps = []; w.split('').forEach(function (x, i) { if (x === arg) ps.push(i + 1); }); f = { k: 'pos:' + arg, t: ps.length ? arg + ' is at position' + (ps.length > 1 ? 's ' : ' ') + ps.join(' and ') + '.' : arg + ' is not in the word.', letter: arg, at: ps }; }
    if (kind === 'at') f = { k: 'at:' + arg, t: 'Letter ' + arg + ' is ' + w[arg - 1] + '.', at: arg, letter: w[arg - 1] };
    if (kind === 'rep') { var rep = w.split('').filter(function (x, i) { return w.indexOf(x) !== i; }); f = { k: 'rep', t: rep.length ? 'Yes, some letter appears more than once.' : 'No letter appears more than once.' }; }
    if (kind === 'half') f = { k: 'half', t: 'It starts with a letter in ' + (w[0] <= 'M' ? 'A–M.' : 'N–Z.') };
    if (kind === 'cat') f = { k: 'cat', t: 'Broad category: ' + p.cat + '.' };
    if (kind === 'assoc') { if (gs.assocUsed >= p.assoc.length) return null; f = { k: 'assoc' + gs.assocUsed, t: 'Associated with: ' + p.assoc[gs.assocUsed] + '.' }; gs.assocUsed++; }
    if (kind === 'def') f = { k: 'def', t: 'Definition: ' + p.def };
    if (!f) return null;
    if (gs.facts.some(function (x) { return x.k === f.k; })) return 'dup';
    f.cost = c[kind]; gs.facts.push(f); gs.cost += c[kind];
    return f;
  }
  function pattern(p, gs) {
    var lenKnown = gs.facts.some(function (f) { return f.k === 'len'; });
    var known = {};
    gs.facts.forEach(function (f) { if (f.k.indexOf('pos:') === 0) f.at.forEach(function (i) { known[i] = f.letter; }); if (f.k.indexOf('at:') === 0) known[f.at] = f.letter; });
    if (!lenKnown && !Object.keys(known).length) return null;
    var L = lenKnown ? p.w.length : null;
    if (!L) return null;
    var out = []; for (var i = 1; i <= L; i++) out.push(known[i] || '·');
    return out;
  }
  function view(api) {
    var p = api.p, gs = api.gs, c = p.costs;
    var L = p.w.length, lenKnown = gs.facts.some(function (f) { return f.k === 'len'; });
    var pat = pattern(p, gs);
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    var yes = {}, no = {};
    gs.facts.forEach(function (f) { if (f.letter && f.k.indexOf('has:') === 0) (f.yes ? yes : no)[f.letter] = 1; if (f.k.indexOf('pos:') === 0) (f.at.length ? yes : no)[f.letter] = 1; if (f.k.indexOf('at:') === 0) yes[f.letter] = 1; });
    function doAsk(kind, arg) {
      var r = ask(p, gs, kind, arg);
      if (r === 'dup') { api.toast('You already know that.', ''); return; }
      if (!r) { api.toast('Nothing more of that kind.', ''); return; }
      gs.mode = null; api.update(gs);
    }
    var picker = null;
    if (gs.mode === 'has' || gs.mode === 'pos') {
      picker = h('div', { class: 'keys' }, letters.map(function (ch) {
        return h('button', { class: 'key' + (yes[ch] ? ' yes' : no[ch] ? ' no' : ''), onclick: function () { doAsk(gs.mode, ch); } }, ch);
      }).concat([h('button', { class: 'key wide ghost', onclick: function () { gs.mode = null; api.update(gs); } }, 'Cancel')]));
    }
    if (gs.mode === 'at') {
      var nums = []; for (var i = 1; i <= L; i++) nums.push(i);
      picker = h('div', { class: 'keys' }, nums.map(function (n) { return h('button', { class: 'key', onclick: function () { doAsk('at', n); } }, String(n)); }).concat([h('button', { class: 'key wide ghost', onclick: function () { gs.mode = null; api.update(gs); } }, 'Cancel')]));
    }
    var act = function (kind, label, cost, opts) {
      var used = gs.facts.some(function (f) { return f.k === kind; }) || (kind === 'assoc' && gs.assocUsed >= p.assoc.length);
      return h('button', { class: 'btn act', disabled: api.done || used || (opts && opts.needLen && !lenKnown), onclick: function () { if (opts && opts.mode) { gs.mode = opts.mode; api.update(gs); } else doAsk(kind); } },
        h('span', null, label), h('span', { class: 'cost' }, cost));
    };
    var inp = h('input', { id: 'det-in', class: 'txt', type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'Your guess', enterkeyhint: 'go' });
    return h('div', { class: 'detective' },
      h('div', { class: 'det-top' },
        h('div', null, h('span', { class: 'lbl' }, 'Information cost '), h('b', { class: 'big mono' }, String(gs.cost))),
        h('div', { class: 'muted small' }, 'Par ' + p.par + '. Wrong guess +' + c.wrong + '.')),
      pat ? h('div', { class: 'det-pat mono' }, pat.map(function (x) { return h('span', { class: 'lt' + (x !== '·' ? ' lt-ch' : '') }, x); })) : null,
      h('div', { class: 'det-acts' },
        act('len', 'Word length', c.len), act('vow', 'Vowel count', c.vow), act('rep', 'Any repeated letter?', c.rep), act('half', 'First letter A–M or N–Z?', c.half),
        act('has', 'Is letter … in it?', c.has, { mode: 'has' }), act('pos', 'Where is letter …?', c.pos, { mode: 'pos' }), act('at', 'Letter at position …', c.at, { mode: 'at', needLen: true }),
        act('cat', 'Broad category', c.cat), act('assoc', 'An association', c.assoc), act('def', 'Definition', c.def)),
      picker,
      h('ol', { class: 'facts' }, gs.facts.map(function (f) { return h('li', null, h('span', null, f.t), h('span', { class: 'cost' }, f.hint ? 'hint' : '+' + f.cost)); })),
      api.done ? null : h('form', { class: 'row-in', onsubmit: function (e) {
        e.preventDefault();
        var g = inp.value.trim().toUpperCase().replace(/[^A-Z]/g, ''); if (!g) return;
        gs.guesses.push(g);
        if (g === p.w) { api.update(gs); api.finish('solved'); return; }
        gs.cost += c.wrong; api.wrong();
        var info = g.length !== p.w.length ? ' (and the length is different)' : '';
        api.toast('Not ' + g + info + '. +' + c.wrong, 'bad'); api.update(gs);
      } }, inp, h('button', { class: 'btn primary', type: 'submit' }, 'Guess')),
      gs.guesses.length ? h('div', { class: 'muted small' }, 'Guesses: ' + gs.guesses.join(', ')) : null);
  }
  /* Hint: reveals a letter in its position (free of information cost, but counted as a hint).
     First the word length if unknown, then unknown positions, choosing the letter that is rarest (most informative). */
  function hint(p, gs) {
    var w = p.w;
    if (!gs.facts.some(function (f) { return f.k === 'len'; })) { gs.facts.push({ k: 'len', t: 'It has ' + w.length + ' letters.', cost: 0, hint: true }); return { msg: 'The word has ' + w.length + ' letters.', gs: gs }; }
    var known = {};
    gs.facts.forEach(function (f) { if (f.k.indexOf('pos:') === 0) f.at.forEach(function (i) { known[i] = 1; }); if (f.k.indexOf('at:') === 0) known[f.at] = 1; });
    var freq = 'ETAOINSHRDLCUMWFGYPBVKJXQZ';
    var cand = []; for (var i = 1; i <= w.length; i++) if (!known[i]) cand.push(i);
    if (cand.length <= 1) return { msg: 'Only one letter is still hidden — you can do it!', noCount: true };
    cand.sort(function (a, b) { return freq.indexOf(w[b - 1]) - freq.indexOf(w[a - 1]); });
    var at = cand[0];
    gs.facts.push({ k: 'at:' + at, t: 'Letter ' + at + ' is ' + w[at - 1] + '.', at: at, letter: w[at - 1], cost: 0, hint: true });
    return { msg: 'Letter ' + at + ' is ' + w[at - 1] + '.', gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var q = solved ? PL.clamp(100 - Math.max(0, gs.cost - p.par) * 4 - ctx.hints * 10, 10, 100) : 0;
    return { quality: Math.round(q), metrics: { cost: gs.cost, par: p.par, clues: gs.facts.length, wrong: ctx.wrong, len: p.w.length, usedDef: gs.facts.some(function (f) { return f.k === 'def'; }) },
      lines: [['Information cost', gs.cost + ' (par ' + p.par + ')'], ['Questions asked', gs.facts.length], ['Wrong guesses', ctx.wrong]] };
  }
  function review(p, gs) {
    return h('div', { class: 'review' }, h('div', null, h('span', { class: 'lbl' }, 'The word '), h('b', { class: 'mono' }, p.w)), h('p', { class: 'muted small' }, p.def + ' Category: ' + p.cat + '. Associations: ' + p.assoc.join(', ') + '.'),
      h('div', { class: 'lbl' }, 'Your questions'), h('ol', { class: 'facts' }, gs.facts.map(function (f) { return h('li', null, h('span', null, f.t), h('span', { class: 'cost' }, f.hint ? 'hint' : '+' + f.cost)); })),
      gs.guesses.length ? h('p', { class: 'muted small' }, 'Guesses: ' + gs.guesses.join(', ')) : null);
  }
  function stats(atts) {
    var s = atts.filter(function (a) { return a.outcome === 'solved'; });
    return [['Average information cost', s.length ? PL.mean(s.map(function (a) { return a.metrics.cost; })).toFixed(1) : '—'],
      ['Average cost over par', s.length ? PL.mean(s.map(function (a) { return a.metrics.cost - a.metrics.par; })).toFixed(1) : '—'],
      ['Solved without the definition', s.length ? Math.round(100 * s.filter(function (a) { return !a.metrics.usedDef; }).length / s.length) + '%' : '—'],
      ['Average questions asked', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.clues; })).toFixed(1) : '—']];
  }
  PL.games.detective = {
    id: 'detective', name: 'Word Detective', blurb: 'Buy only the clues you need to name a hidden word.',
    rules: 'A hidden word is waiting. Each question costs points: cheap ones about letters and length, pricier ones about meaning. Choose your questions wisely, then guess. Lower total cost is better; wrong guesses add to the cost.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 60 + lv * 15; }, timeLimit: function (lv) { return 180 + lv * 20; },
    _ask: ask
  };
})();

;
/* ===== GAME 8: SHAPE SHIFT (polyomino silhouettes) ===== */
(function () {
  var h = PL.h;
  var COLORS = 8;
  function norm(cells) {
    var mr = Infinity, mc = Infinity;
    cells.forEach(function (x) { mr = Math.min(mr, x[0]); mc = Math.min(mc, x[1]); });
    return cells.map(function (x) { return [x[0] - mr, x[1] - mc]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  }
  function rot(cells) { return norm(cells.map(function (x) { return [x[1], -x[0]]; })); }
  function flip(cells) { return norm(cells.map(function (x) { return [x[0], -x[1]]; })); }
  function key(cells) { return cells.map(function (x) { return x[0] + ',' + x[1]; }).join(';'); }
  function orientations(cells, allowFlip) {
    var out = [], seen = {}, c = norm(cells);
    for (var f = 0; f < (allowFlip ? 2 : 1); f++) {
      for (var r = 0; r < 4; r++) { var k = key(c); if (!seen[k]) { seen[k] = 1; out.push(c); } c = rot(c); }
      c = flip(c);
    }
    return out;
  }

  function spec(lv) {
    return [null,
      { W: 4, H: 4, n: 3, size: [3, 4] },
      { W: 4, H: 4, n: 4, size: [3, 4] },
      { W: 5, H: 5, n: 4, size: [3, 5] },
      { W: 5, H: 5, n: 5, size: [3, 5], blocks: 1 },
      { W: 6, H: 5, n: 5, size: [4, 5], lock: 1 },
      { W: 6, H: 6, n: 6, size: [4, 5], blocks: 2, noflip: true },
      { W: 6, H: 6, n: 7, size: [4, 5], lock: 2, minMoves: true },
      { W: 7, H: 6, n: 7, size: [4, 5], blocks: 2, lock: 1, noflip: true },
      { W: 7, H: 7, n: 8, size: [4, 5], lock: 2, minMoves: true },
      { W: 7, H: 7, n: 9, size: [4, 5], blocks: 2, lock: 2, noflip: true, minMoves: true }][PL.clamp(lv, 1, 10)];
  }
  function nb(i, W, H) { var r = Math.floor(i / W), c = i % W, o = []; if (r > 0) o.push(i - W); if (r < H - 1) o.push(i + W); if (c > 0) o.push(i - 1); if (c < W - 1) o.push(i + 1); return o; }

  function generate(level, rng) {
    var sp = spec(level), W = sp.W, H = sp.H;
    for (var tries = 0; tries < 400; tries++) {
      var sizes = []; for (var i = 0; i < sp.n; i++) sizes.push(rng.int(sp.size[0], sp.size[1]));
      var total = sizes.reduce(function (a, b) { return a + b; }, 0);
      if (total > W * H - 1) continue;
      // grow pieces one at a time, each attached to the existing shape
      var owner = []; for (i = 0; i < W * H; i++) owner.push(-1);
      var ok = true;
      for (var p = 0; p < sp.n && ok; p++) {
        var start;
        if (p === 0) start = rng.int(0, W * H - 1);
        else {
          var front = []; for (i = 0; i < W * H; i++) if (owner[i] >= 0) nb(i, W, H).forEach(function (y) { if (owner[y] < 0) front.push(y); });
          if (!front.length) { ok = false; break; }
          start = rng.pick(front);
        }
        owner[start] = p; var cells = [start];
        while (cells.length < sizes[p]) {
          var fr = []; cells.forEach(function (x) { nb(x, W, H).forEach(function (y) { if (owner[y] < 0) fr.push(y); }); });
          if (!fr.length) { ok = false; break; }
          var y = rng.pick(fr); owner[y] = p; cells.push(y);
        }
      }
      if (!ok) continue;
      // trim frame to the bounding box of the shape
      var rs = [], cs = []; owner.forEach(function (o, i) { if (o >= 0) { rs.push(Math.floor(i / W)); cs.push(i % W); } });
      var r0 = Math.min.apply(null, rs), c0 = Math.min.apply(null, cs), r1 = Math.max.apply(null, rs), c1 = Math.max.apply(null, cs);
      var w = c1 - c0 + 1, hh = r1 - r0 + 1;
      if (w < 3 || hh < 3) continue;
      var target = [], pieces = [];
      for (p = 0; p < sp.n; p++) pieces.push({ cells: [], sol: null });
      for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) { var o = owner[r * W + c]; if (o >= 0) { target.push([r - r0, c - c0]); pieces[o].cells.push([r - r0, c - c0]); } }
      // reject pieces that are identical shapes to keep the puzzle legible (allow one duplicate at high levels)
      var keys = pieces.map(function (pc) { return orientations(pc.cells, !sp.noflip).map(key).sort()[0]; });
      var dup = keys.length - new Set(keys).size;
      if (dup > (level >= 7 ? 1 : 0)) continue;
      // fixed blocks: pre-placed pieces (restricted placement)
      var fixed = [];
      var order = rng.shuffle(pieces.map(function (_, i) { return i; }));
      for (var b = 0; b < (sp.blocks || 0); b++) fixed.push(order[b]);
      var locked = [];
      for (var l = 0; l < (sp.lock || 0); l++) { var li = order[(sp.blocks || 0) + l]; if (li != null) locked.push(li); }
      var out = { w: w, h: hh, target: target, noflip: !!sp.noflip, minMoves: !!sp.minMoves, pieces: [] };
      pieces.forEach(function (pc, i) {
        var minr = Math.min.apply(null, pc.cells.map(function (x) { return x[0]; })), minc = Math.min.apply(null, pc.cells.map(function (x) { return x[1]; }));
        var solCells = norm(pc.cells);
        var isFixed = fixed.indexOf(i) >= 0, isLocked = locked.indexOf(i) >= 0;
        // start orientation: random (if rotation allowed), the locked ones keep the solution orientation
        var start = solCells;
        if (!isFixed && !isLocked) { var os = orientations(solCells, !sp.noflip); start = os[rng.int(0, os.length - 1)]; }
        out.pieces.push({ id: i, color: i % COLORS, start: start, sol: { cells: solCells, r: minr, c: minc }, fixed: isFixed, locked: isLocked });
      });
      out.pieces = rng.shuffle(out.pieces);
      out.target_moves = out.pieces.filter(function (pc) { return !pc.fixed; }).length;
      if (!verify(out)) continue;
      return out;
    }
    throw new Error('shape generation failed');
  }
  function verify(p) { // the stored solution must exactly tile the target with no overlaps, using allowed orientations
    var cover = {};
    p.target.forEach(function (x) { cover[x[0] + ',' + x[1]] = 0; });
    for (var i = 0; i < p.pieces.length; i++) {
      var pc = p.pieces[i];
      var allowed = pc.locked || pc.fixed ? [pc.start] : orientations(pc.start, !p.noflip);
      if (!allowed.some(function (o) { return key(o) === key(pc.sol.cells); })) return false;
      for (var j = 0; j < pc.sol.cells.length; j++) {
        var k = (pc.sol.cells[j][0] + pc.sol.r) + ',' + (pc.sol.cells[j][1] + pc.sol.c);
        if (cover[k] !== 0) return false; cover[k] = 1;
      }
    }
    for (var kk in cover) if (cover[kk] !== 1) return false;
    return true;
  }

  function init(p) {
    return { pcs: p.pieces.map(function (pc) { return { id: pc.id, cells: pc.start, at: pc.fixed ? { r: pc.sol.r, c: pc.sol.c } : null }; }), sel: null, moves: 0, rots: 0, hist: [] };
  }
  function pdef(p, id) { for (var i = 0; i < p.pieces.length; i++) if (p.pieces[i].id === id) return p.pieces[i]; }
  function occupancy(p, gs, exceptId) {
    var occ = {};
    gs.pcs.forEach(function (s) { if (!s.at || s.id === exceptId) return; s.cells.forEach(function (x) { occ[(x[0] + s.at.r) + ',' + (x[1] + s.at.c)] = s.id; }); });
    return occ;
  }
  function canPlace(p, gs, s, r, c) {
    var tgt = {}; p.target.forEach(function (x) { tgt[x[0] + ',' + x[1]] = 1; });
    var occ = occupancy(p, gs, s.id);
    return s.cells.every(function (x) { var k = (x[0] + r) + ',' + (x[1] + c); return tgt[k] && occ[k] == null; });
  }
  function solvedState(p, gs) {
    var occ = occupancy(p, gs, null);
    return p.target.every(function (x) { return occ[x[0] + ',' + x[1]] != null; }) && gs.pcs.every(function (s) { return s.at; });
  }

  function view(api) {
    var p = api.p, gs = api.gs;
    var cell = Math.floor(Math.min(46, 320 / Math.max(p.w, 5)));
    var mini = Math.max(14, Math.floor(cell * 0.5));
    var tgt = {}; p.target.forEach(function (x) { tgt[x[0] + ',' + x[1]] = 1; });
    var root = h('div', { class: 'shape' });
    var board = h('div', { class: 'sh-board', style: { width: (p.w * cell) + 'px', height: (p.h * cell) + 'px', '--cell': cell + 'px' } });
    for (var r = 0; r < p.h; r++) for (var c = 0; c < p.w; c++) if (tgt[r + ',' + c]) board.appendChild(h('div', { class: 'sh-t', style: { left: (c * cell) + 'px', top: (r * cell) + 'px', width: cell + 'px', height: cell + 'px' } }));
    function pieceEl(s, size, onBoard) {
      var def = pdef(p, s.id);
      var mr = 0, mc = 0; s.cells.forEach(function (x) { mr = Math.max(mr, x[0]); mc = Math.max(mc, x[1]); });
      var el = h('div', { class: 'sh-piece c' + def.color + (def.fixed ? ' fixed' : '') + (def.locked ? ' locked' : '') + (gs.sel === s.id ? ' sel' : ''), style: { width: ((mc + 1) * size) + 'px', height: ((mr + 1) * size) + 'px' }, 'data-id': s.id, role: 'button', 'aria-label': 'Piece ' + (s.id + 1) + (def.locked ? ', rotation locked' : '') });
      s.cells.forEach(function (x) { el.appendChild(h('div', { class: 'sh-c', style: { left: (x[1] * size) + 'px', top: (x[0] * size) + 'px', width: size + 'px', height: size + 'px' } })); });
      if (def.locked && !def.fixed) el.appendChild(h('span', { class: 'sh-lock', 'aria-hidden': 'true' }, '⌀'));
      if (onBoard) { el.style.left = (s.at.c * cell) + 'px'; el.style.top = (s.at.r * cell) + 'px'; el.style.position = 'absolute'; }
      if (!def.fixed && !api.done) attachDrag(el, s, size);
      return el;
    }
    gs.pcs.forEach(function (s) { if (s.at) board.appendChild(pieceEl(s, cell, true)); });
    var tray = h('div', { class: 'sh-tray' });
    gs.pcs.forEach(function (s) { if (!s.at) tray.appendChild(h('div', { class: 'sh-slot' }, pieceEl(s, mini, false))); });

    function attachDrag(el, s, size) {
      el.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        var startX = ev.clientX, startY = ev.clientY, moved = false, ghost = null;
        var rect = el.getBoundingClientRect();
        // grab offset in cells (relative to piece origin) at board scale
        var gx = (ev.clientX - rect.left) / size, gy = (ev.clientY - rect.top) / size;
        var gcell = [Math.floor(gy), Math.floor(gx)];
        try { el.setPointerCapture(ev.pointerId); } catch (e) { }
        function move(e2) {
          if (!moved && Math.hypot(e2.clientX - startX, e2.clientY - startY) < 6) return;
          if (!moved) {
            moved = true;
            ghost = pieceElStatic(s, cell); ghost.classList.add('ghost');
            document.body.appendChild(ghost);
            el.style.opacity = '0.25';
          }
          ghost.style.left = (e2.clientX - (gcell[1] + 0.5) * cell) + 'px';
          ghost.style.top = (e2.clientY - (gcell[0] + 0.5) * cell) + 'px';
        }
        function up(e2) {
          el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
          if (ghost) ghost.remove();
          if (!moved) { gs.sel = gs.sel === s.id ? null : s.id; api.update(gs); return; }
          var br = board.getBoundingClientRect();
          var cx = (e2.clientX - br.left) / cell - (gcell[1] + 0.5), cy = (e2.clientY - br.top) / cell - (gcell[0] + 0.5);
          var rr = Math.round(cy), cc = Math.round(cx);
          var inside = e2.clientX >= br.left - cell && e2.clientX <= br.right + cell && e2.clientY >= br.top - cell && e2.clientY <= br.bottom + cell;
          var prev = s.at ? { r: s.at.r, c: s.at.c } : null;
          if (inside && canPlace(p, gs, s, rr, cc)) {
            if (!prev || prev.r !== rr || prev.c !== cc) { gs.hist.push({ id: s.id, at: prev, cells: s.cells }); s.at = { r: rr, c: cc }; gs.moves++; }
          } else if (!inside && prev) { gs.hist.push({ id: s.id, at: prev, cells: s.cells }); s.at = null; }
          else if (inside) api.toast('It doesn’t fit there.', '');
          gs.sel = s.id;
          api.update(gs);
          if (solvedState(p, gs)) api.finish('solved');
        }
        el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      });
    }
    function pieceElStatic(s, size) {
      var def = pdef(p, s.id), el = h('div', { class: 'sh-piece c' + def.color });
      s.cells.forEach(function (x) { el.appendChild(h('div', { class: 'sh-c', style: { left: (x[1] * size) + 'px', top: (x[0] * size) + 'px', width: size + 'px', height: size + 'px' } })); });
      el.style.position = 'fixed'; el.style.pointerEvents = 'none'; el.style.zIndex = 50;
      return el;
    }
    var selS = gs.pcs.filter(function (s) { return s.id === gs.sel; })[0], selDef = selS ? pdef(p, selS.id) : null;
    function transform(fn) {
      if (!selS || selDef.locked || selDef.fixed) return;
      var nc = fn(selS.cells);
      gs.hist.push({ id: selS.id, at: selS.at ? { r: selS.at.r, c: selS.at.c } : null, cells: selS.cells });
      selS.cells = nc; gs.rots++;
      if (selS.at && !canPlace(p, gs, selS, selS.at.r, selS.at.c)) selS.at = null; // pops back to tray
      api.update(gs);
    }
    var controls = api.done ? null : h('div', { class: 'row-actions' },
      h('button', { class: 'btn sm', disabled: !selS || selDef.locked || selDef.fixed, onclick: function () { transform(rot); } }, 'Rotate'),
      p.noflip ? null : h('button', { class: 'btn sm', disabled: !selS || selDef.locked || selDef.fixed, onclick: function () { transform(flip); } }, 'Flip'),
      h('button', { class: 'btn ghost sm', disabled: !gs.hist.length, onclick: function () { var u = gs.hist.pop(); var s = gs.pcs.filter(function (x) { return x.id === u.id; })[0]; s.at = u.at; s.cells = u.cells; api.update(gs); } }, 'Undo'),
      h('button', { class: 'btn ghost sm', onclick: function () { gs.pcs.forEach(function (s) { var d = pdef(p, s.id); if (!d.fixed) { s.at = null; s.cells = d.start; } }); gs.hist = []; gs.sel = null; api.update(gs); } }, 'Reset'));
    var notes = [];
    if (p.pieces.some(function (pc) { return pc.fixed; })) notes.push('Grey pieces are fixed in place.');
    if (p.pieces.some(function (pc) { return pc.locked && !pc.fixed; })) notes.push('Pieces marked ⌀ cannot be rotated or flipped.');
    if (p.noflip) notes.push('No flipping in this puzzle.');
    if (p.minMoves) notes.push('Move challenge: place each piece once. Target: ' + p.target_moves + ' placements (you have made ' + gs.moves + ').');
    return h('div', { class: 'shape' },
      h('div', { class: 'muted small' }, 'Drag pieces into the outline so it is completely filled with no overlaps. Tap a piece to select it, then rotate' + (p.noflip ? '' : ' or flip') + '. Drag a placed piece off the board to return it.'),
      notes.length ? h('div', { class: 'rules-box' }, notes.map(function (n) { return h('div', null, n); })) : null,
      h('div', { class: 'sh-boardwrap' }, board),
      controls, h('div', { class: 'lbl' }, 'Pieces'), tray.childNodes.length ? tray : h('div', { class: 'muted small' }, 'All pieces placed.'));
  }
  function hint(p, gs) {
    // place one unplaced or misplaced piece in its verified solution position
    var occSol = {};
    for (var i = 0; i < gs.pcs.length; i++) {
      var s = gs.pcs[i], d = pdef(p, s.id);
      if (d.fixed) continue;
      var correct = s.at && s.at.r === d.sol.r && s.at.c === d.sol.c && key(s.cells) === key(d.sol.cells);
      if (correct) continue;
      // clear anything overlapping the solution footprint
      var foot = {}; d.sol.cells.forEach(function (x) { foot[(x[0] + d.sol.r) + ',' + (x[1] + d.sol.c)] = 1; });
      gs.pcs.forEach(function (o) {
        if (o.id === s.id || !o.at) return;
        if (o.cells.some(function (x) { return foot[(x[0] + o.at.r) + ',' + (x[1] + o.at.c)]; })) o.at = null;
      });
      s.cells = d.sol.cells; s.at = { r: d.sol.r, c: d.sol.c };
      gs.hist = [];
      return { msg: 'One piece has been placed in its solution position.', gs: gs, after: solvedState(p, gs) ? 'solved' : null };
    }
    return { msg: 'Every piece is already where the reference solution puts it.', noCount: true };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var excess = Math.max(0, gs.moves - p.target_moves);
    var q = solved ? PL.clamp(100 - ctx.hints * 18 - excess * (p.minMoves ? 6 : 2), 15, 100) : Math.round(20 * gs.pcs.filter(function (s) { return s.at; }).length / gs.pcs.length);
    return { quality: Math.round(q), metrics: { pieces: p.pieces.length, moves: gs.moves, target: p.target_moves, excess: excess, minMoves: p.minMoves, rotations: gs.rots },
      lines: [['Pieces', p.pieces.length], ['Placements', gs.moves + ' (target ' + p.target_moves + ')'], ['Rotations and flips', gs.rots]] };
  }
  function review(p, gs) {
    var cell = Math.floor(Math.min(34, 260 / p.w));
    var board = h('div', { class: 'sh-board', style: { width: (p.w * cell) + 'px', height: (p.h * cell) + 'px' } });
    p.pieces.forEach(function (pc) { pc.sol.cells.forEach(function (x) { board.appendChild(h('div', { class: 'sh-c c' + pc.color + (pc.fixed ? ' fixed' : ''), style: { position: 'absolute', left: ((x[1] + pc.sol.c) * cell) + 'px', top: ((x[0] + pc.sol.r) * cell) + 'px', width: cell + 'px', height: cell + 'px' } })); }); });
    return h('div', { class: 'review' }, h('div', { class: 'lbl' }, 'A verified solution'), h('div', { class: 'sh-boardwrap' }, board),
      h('p', { class: 'muted small' }, 'Any arrangement that fills the outline exactly is accepted; this is the one the puzzle was built from. Placements: ' + gs.moves + ' (target ' + p.target_moves + ').'));
  }
  function stats(atts) {
    var s = atts.filter(function (a) { return a.outcome === 'solved'; });
    return [['Completion rate', atts.length ? Math.round(100 * s.length / atts.length) + '%' : '—'],
      ['Average excess placements', s.length ? PL.mean(s.map(function (a) { return a.metrics.excess; })).toFixed(1) : '—'],
      ['Move-target hit rate', s.length ? Math.round(100 * s.filter(function (a) { return a.metrics.excess === 0; }).length / s.length) + '%' : '—'],
      ['Average pieces per puzzle', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.pieces; })).toFixed(1) : '—']];
  }
  PL.games.shape = {
    id: 'shape', name: 'Shape Shift', blurb: 'Fill the outline exactly with the given pieces.',
    rules: 'Drag every piece into the outline so it is completely covered with no gaps or overlaps. Tap a piece to select it, then rotate or flip it where allowed. Some puzzles fix pieces in place, lock rotation, or set a placement target.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 60 + lv * 25; }, timeLimit: function (lv) { return 120 + lv * 30; },
    _verify: verify, _canPlace: canPlace, _solved: solvedState
  };
})();

;
/* ===== GAME 9: BALANCE ===== */
(function () {
  var h = PL.h, S = PL.svg, Q = PL.Q;
  var SHAPES = ['circle', 'square', 'triangle', 'star'];
  var NAMES = { circle: 'circle', square: 'square', triangle: 'triangle', star: 'star' };
  var GLYPH = { circle: '●', square: '■', triangle: '▲', star: '★' };

  function shape(kind, x, y, r) {
    var cls = 'shp shp-' + kind;
    if (kind === 'circle') return S('circle', { cx: x, cy: y, r: r * 0.9, class: cls });
    if (kind === 'square') return S('rect', { x: x - r * 0.82, y: y - r * 0.82, width: r * 1.64, height: r * 1.64, rx: 2, class: cls });
    if (kind === 'triangle') return S('polygon', { points: [x, y - r, x + r * 1.05, y + r * 0.8, x - r * 1.05, y + r * 0.8].join(','), class: cls });
    var pts = [];
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r * 1.05; pts.push((x + rr * Math.cos(a)).toFixed(1), (y + rr * Math.sin(a)).toFixed(1)); }
    return S('polygon', { points: pts.join(','), class: cls });
  }
  PL.shapeSVG = shape;

  function sideItems(side, shapes) {
    var items = [];
    side.c.forEach(function (n, i) { for (var k = 0; k < n; k++) items.push({ t: 's', k: shapes[i] }); });
    if (side.n) items.push({ t: 'n', v: side.n });
    return items;
  }
  function drawScale(sc, shapes, idx) {
    var W = 320, H = 150, cx = 160, beamY = 52;
    var ang = sc.tilt === 'L' ? -7 : sc.tilt === 'R' ? 7 : 0; // left heavier → left side lower
    var rad = ang * Math.PI / 180, arm = 112;
    var lx = cx - arm * Math.cos(rad), ly = beamY - arm * Math.sin(rad);
    var rx = cx + arm * Math.cos(rad), ry = beamY + arm * Math.sin(rad);
    function pan(px, py, items) {
      var g = [];
      var panY = py + 52;
      g.push(S('line', { x1: px - 40, y1: panY, x2: px, y2: py, class: 'sc-str' }));
      g.push(S('line', { x1: px + 40, y1: panY, x2: px, y2: py, class: 'sc-str' }));
      g.push(S('path', { d: 'M' + (px - 46) + ' ' + panY + ' Q ' + px + ' ' + (panY + 14) + ' ' + (px + 46) + ' ' + panY + ' Z', class: 'sc-pan' }));
      // stack items in rows of 4 above pan
      var per = 4, r = 9, gap = 21;
      items.forEach(function (it, i) {
        var row = Math.floor(i / per), col = i % per, inRow = Math.min(per, items.length - row * per);
        var x = px - (inRow - 1) * gap / 2 + col * gap, y = panY - 11 - row * 21;
        if (it.t === 's') g.push(shape(it.k, x, y, r));
        else { g.push(S('rect', { x: x - 10, y: y - 10, width: 20, height: 20, rx: 3, class: 'sc-wt' })); g.push(S('text', { x: x, y: y + 4.5, class: 'sc-wtx', 'text-anchor': 'middle' }, String(it.v))); }
      });
      return g;
    }
    return S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'scale-svg', role: 'img', 'aria-label': describeScale(sc, shapes) },
      S('text', { x: 6, y: 16, class: 'sc-idx' }, 'Scale ' + (idx + 1)),
      S('polygon', { points: (cx - 26) + ',' + (H - 6) + ' ' + (cx + 26) + ',' + (H - 6) + ' ' + cx + ',' + (beamY + 4), class: 'sc-base' }),
      S('line', { x1: lx, y1: ly, x2: rx, y2: ry, class: 'sc-beam' }),
      S('circle', { cx: cx, cy: beamY, r: 4.5, class: 'sc-pivot' }),
      pan(lx, ly, sideItems(sc.L, shapes)), pan(rx, ry, sideItems(sc.R, shapes)),
      sc.tilt ? S('text', { x: cx, y: 22, class: 'sc-note', 'text-anchor': 'middle' }, sc.tilt === 'L' ? 'left is heavier' : 'right is heavier') : S('text', { x: cx, y: 22, class: 'sc-note', 'text-anchor': 'middle' }, 'balanced')
    );
  }
  function sideText(side, shapes) {
    var parts = [];
    side.c.forEach(function (n, i) { if (n) parts.push((n > 1 ? n : '') + GLYPH[shapes[i]]); });
    if (side.n) parts.push(String(side.n));
    return parts.join(' + ') || '0';
  }
  function describeScale(sc, shapes) {
    var op = sc.tilt === 'L' ? ' > ' : sc.tilt === 'R' ? ' < ' : ' = ';
    return sideText(sc.L, shapes) + op + sideText(sc.R, shapes);
  }

  /* ---- maths helpers ---- */
  function rowOf(sc, n) { // L - R = (R.n - L.n)
    var a = []; for (var i = 0; i < n; i++) a.push(Q(sc.L.c[i] - sc.R.c[i]));
    return { a: a, b: Q((sc.R.n || 0) - (sc.L.n || 0)) };
  }
  function eqRows(scales, n) { return scales.filter(function (s) { return !s.tilt; }).map(function (s) { var r = rowOf(s, n); return r.a.concat([r.b]); }); }
  function consOf(scales, n) {
    return scales.map(function (s) {
      var r = rowOf(s, n);
      if (!s.tilt) return { a: r.a, op: '=', b: r.b };
      if (s.tilt === 'L') return { a: r.a, op: '>', b: r.b };
      return { a: r.a.map(function (x) { return Q(-x.n, x.d); }), op: '>', b: Q(-r.b.n, r.b.d) };
    });
  }
  function unit(n, i, k) { var f = []; for (var j = 0; j < n; j++) f.push(Q(j === i ? (k === undefined ? 1 : k) : 0)); return f; }
  function sumW(side, w) { var s = side.n || 0; side.c.forEach(function (c, i) { s += c * w[i]; }); return s; }

  function randSide(rng, n, maxEach, maxKinds) {
    var c = []; for (var i = 0; i < n; i++) c.push(0);
    var kinds = rng.int(1, Math.min(n, maxKinds));
    rng.shuffle(c.map(function (_, i) { return i; })).slice(0, kinds).forEach(function (i) { c[i] = rng.int(1, maxEach); });
    return c;
  }
  function makeScale(rng, w, opt) {
    var n = w.length;
    for (var t = 0; t < 200; t++) {
      var L = randSide(rng, n, opt.maxEach, opt.maxKinds), R = randSide(rng, n, opt.maxEach, opt.maxKinds);
      // avoid same shape on both sides most of the time (allowed at level 2+ for "x on both sides")
      if (opt.oneSideOnly) { R = R.map(function () { return 0; }); }
      var both = false; for (var i = 0; i < n; i++) if (L[i] && R[i]) both = true;
      if (both && !opt.bothOk) continue;
      var sl = sumW({ c: L }, w), sr = sumW({ c: R }, w);
      var sc = { L: { c: L, n: 0 }, R: { c: R, n: 0 }, tilt: 0 };
      if (opt.tilt) {
        if (sl === sr) continue;
        if (opt.nums && rng.chance(0.4)) { var add = rng.int(1, 6); if (rng.chance(0.5)) sc.L.n = add; else sc.R.n = add; }
        var a = sumW(sc.L, w), b = sumW(sc.R, w);
        if (a === b) continue;
        sc.tilt = a > b ? 'L' : 'R';
        return sc;
      }
      if (sl === sr) { if (L.join() === R.join()) continue; return sc; }
      if (!opt.nums) continue;
      var d = sl - sr;
      if (Math.abs(d) > opt.maxNum) continue;
      if (d > 0) sc.R.n = d; else sc.L.n = -d;
      if (opt.extraNums && rng.chance(0.4)) { var e = rng.int(1, 5); sc.L.n += e; sc.R.n += e; }
      if (!R.some(Boolean) && !sc.R.n) continue;
      return sc;
    }
    return null;
  }

  var SPEC = {
    1: { n: 1, types: ['value'], nums: true, maxEach: 3, maxKinds: 1, oneSide: true, maxW: 9 },
    2: { n: 1, types: ['value'], nums: true, maxEach: 4, maxKinds: 1, bothOk: true, maxW: 9 },
    3: { n: 2, types: ['value'], nums: true, maxEach: 3, maxKinds: 2, maxW: 9 },
    4: { n: 2, types: ['value', 'ratio'], nums: true, maxEach: 3, maxKinds: 2, maxW: 10 },
    5: { n: 3, types: ['value', 'ratio'], nums: true, maxEach: 3, maxKinds: 2, maxW: 10 },
    6: { n: 3, types: ['value', 'value', 'insufficient', 'compare'], nums: true, maxEach: 3, maxKinds: 2, maxW: 12, cantTell: true },
    7: { n: 3, types: ['compare', 'value', 'ratio', 'insufficient'], nums: true, maxEach: 3, maxKinds: 3, maxW: 12, cantTell: true },
    8: { n: 3, types: ['must', 'compare', 'value', 'insufficient'], nums: true, maxEach: 3, maxKinds: 3, bothOk: true, maxW: 12, cantTell: true },
    9: { n: 4, types: ['must', 'compare', 'value', 'ratio', 'insufficient'], nums: true, maxEach: 3, maxKinds: 3, bothOk: true, maxW: 12, cantTell: true },
    10: { n: 4, types: ['must', 'compare', 'value', 'insufficient'], nums: true, maxEach: 4, maxKinds: 3, bothOk: true, maxW: 15, cantTell: true }
  };

  function weights(rng, n, maxW) {
    var pool = []; for (var i = 1; i <= maxW; i++) pool.push(i);
    return rng.shuffle(pool).slice(0, n);
  }

  function genValue(rng, sp, insufficient) {
    var n = sp.n, w = weights(rng, n, sp.maxW), shapes = rng.shuffle(SHAPES).slice(0, n);
    var target = rng.int(0, n - 1);
    var scales = [];
    var opt = { maxEach: sp.maxEach, maxKinds: sp.maxKinds, nums: true, maxNum: 30, bothOk: sp.bothOk || n === 1 && sp.bothOk, oneSideOnly: sp.oneSide, extraNums: n === 1 && sp.bothOk };
    for (var t = 0; t < 40 && scales.length < n + 1; t++) {
      // when insufficient: build n-1 independent eqs that do not pin target
      var sc = makeScale(rng, w, opt);
      if (!sc) continue;
      var trial = scales.concat([sc]);
      var rows = eqRows(trial, n);
      if (PL.la.rref(rows, n).piv.length < rows.length) continue; // redundant
      var det = PL.la.determined(rows, n, unit(n, target));
      if (insufficient) {
        if (det) continue;
        scales = trial;
        if (scales.length >= n - 1) break;
      } else {
        scales = trial;
        if (det) break;
      }
    }
    var rowsF = eqRows(scales, n);
    var detF = PL.la.determined(rowsF, n, unit(n, target));
    if (insufficient) { if (detF || scales.length < Math.max(1, n - 1)) return null; }
    else if (!detF || PL.qval(detF) !== w[target]) return null;
    // require at least one numeric weight unless ratio
    return { kind: insufficient ? 'insufficient' : 'value', w: w, shapes: shapes, scales: rng.shuffle(scales), target: target, answer: insufficient ? null : w[target] };
  }

  function genRatio(rng, sp) {
    var n = sp.n, shapes = rng.shuffle(SHAPES).slice(0, n);
    for (var tries = 0; tries < 60; tries++) {
      var w = weights(rng, n, sp.maxW);
      var a = rng.int(0, n - 1), b = rng.int(0, n - 1);
      if (a === b || w[a] % w[b] !== 0 || w[a] / w[b] < 2) continue;
      var k = w[a] / w[b];
      var scales = [], opt = { maxEach: sp.maxEach + 1, maxKinds: sp.maxKinds, nums: false, bothOk: sp.bothOk };
      var f = unit(n, a); f[b] = Q(-k);
      for (var t = 0; t < 60 && scales.length < n; t++) {
        var sc = makeScale(rng, w, opt); if (!sc) continue;
        var tr = scales.concat([sc]), rows = eqRows(tr, n);
        if (PL.la.rref(rows, n).piv.length < rows.length) continue;
        // a direct statement "a = k b" is too easy: avoid a scale that is exactly 1 a vs k b
        scales = tr;
        var d = PL.la.determined(rows, n, f);
        if (d && d.n === 0) break;
      }
      var dd = PL.la.determined(eqRows(scales, n), n, f);
      if (!dd || dd.n !== 0) continue;
      var direct = scales.some(function (s) { var r = rowOf(s, n).a; return r.every(function (x, i) { return (i === a || i === b) ? x.n !== 0 : x.n === 0; }) && Math.abs(r[a].n) === 1; });
      if (direct && scales.length < 2) continue;
      return { kind: 'ratio', w: w, shapes: shapes, scales: rng.shuffle(scales), a: a, b: b, answer: k };
    }
    return null;
  }

  function compareAnswer(scales, n, x, y) {
    var cons = consOf(scales, n), f = unit(n, x); f[y] = Q(-1);
    if (PL.la.entails(cons, n, f, '=')) return 'eq';
    if (PL.la.entails(cons, n, f, '>')) return 'x';
    if (PL.la.entails(cons, n, f, '<')) return 'y';
    return 'unk';
  }
  function genCompare(rng, sp) {
    var n = Math.min(sp.n, 3), shapes = rng.shuffle(SHAPES).slice(0, n);
    var want = rng.weighted(['x', 'y', 'unk'], [2, 2, 1.3]);
    for (var tries = 0; tries < 80; tries++) {
      var w = weights(rng, n, sp.maxW);
      var x = rng.int(0, n - 1), y = (x + rng.int(1, n - 1)) % n;
      var scales = [], nt = rng.int(1, 2), ne = rng.int(1, n - 1);
      for (var i = 0; i < ne; i++) { var s = makeScale(rng, w, { maxEach: sp.maxEach, maxKinds: sp.maxKinds, nums: rng.chance(0.4), maxNum: 12, bothOk: false }); if (s) scales.push(s); }
      for (var j = 0; j < nt; j++) { var t2 = makeScale(rng, w, { maxEach: sp.maxEach, maxKinds: sp.maxKinds, nums: false, tilt: true }); if (t2) scales.push(t2); }
      if (scales.length < 2) continue;
      // no scale may directly compare x and y alone
      var trivial = scales.some(function (s) { var r = rowOf(s, n); return r.b.n === 0 && r.a.every(function (v, i) { return (i === x || i === y) ? Math.abs(v.n) === 1 : v.n === 0; }); });
      if (trivial) continue;
      var ans = compareAnswer(scales, n, x, y);
      if (ans !== want && !(want === 'x' && ans === 'y')) continue;
      return { kind: 'compare', w: w, shapes: shapes, scales: rng.shuffle(scales), x: x, y: y, answer: ans };
    }
    return null;
  }

  function stmtText(st, shapes) {
    var term = function (k, i) { return (k > 1 ? k : '') + GLYPH[shapes[i]]; };
    var lhs = st.l.map(function (p) { return term(p[0], p[1]); }).join(' + ');
    var rhs = st.r.map(function (p) { return term(p[0], p[1]); }).join(' + ');
    return lhs + ' ' + st.op + ' ' + rhs;
  }
  function stmtForm(st, n) { var f = unit(n, 0, 0); st.l.forEach(function (p) { f[p[1]] = PL.qadd(f[p[1]], Q(p[0])); }); st.r.forEach(function (p) { f[p[1]] = PL.qsub(f[p[1]], Q(p[0])); }); return f; }
  function stmtEntailed(st, cons, n) { var f = stmtForm(st, n); return PL.la.entails(cons, n, f, st.op === '=' ? '=' : st.op === '>' ? '>' : '<'); }
  function randStmt(rng, n) {
    var i = rng.int(0, n - 1), j = (i + rng.int(1, n - 1)) % n;
    var r = rng();
    if (r < 0.4) return { l: [[1, i]], op: rng.pick(['>', '<']), r: [[1, j]] };
    if (r < 0.7) return { l: [[rng.int(1, 3), i]], op: rng.pick(['=', '>', '<']), r: [[rng.int(1, 3), j]] };
    var k = n > 2 ? (j + 1) % n === i ? (j + 2) % n : (j + 1) % n : j;
    if (k === i || k === j) return { l: [[2, i]], op: rng.pick(['>', '<']), r: [[1, j]] };
    return { l: [[1, i], [1, j]], op: rng.pick(['>', '<', '=']), r: [[rng.int(1, 2), k]] };
  }
  function genMust(rng, sp) {
    var n = Math.min(sp.n, 3) + (sp.n > 3 && rng.chance(0.3) ? 1 : 0), shapes = rng.shuffle(SHAPES).slice(0, n);
    for (var tries = 0; tries < 120; tries++) {
      var w = weights(rng, n, sp.maxW), scales = [];
      var ne = rng.int(1, n - 1), nt = rng.int(1, 2);
      for (var i = 0; i < ne; i++) { var s = makeScale(rng, w, { maxEach: sp.maxEach, maxKinds: sp.maxKinds, nums: false, bothOk: sp.bothOk }); if (s) scales.push(s); }
      for (var j = 0; j < nt; j++) { var t2 = makeScale(rng, w, { maxEach: sp.maxEach, maxKinds: sp.maxKinds, nums: false, tilt: true }); if (t2) scales.push(t2); }
      if (scales.length < 2) continue;
      var cons = consOf(scales, n);
      var good = null, bad = [], seen = {};
      for (var k = 0; k < 60 && (!good || bad.length < 3); k++) {
        var st = randStmt(rng, n), key = stmtText(st, shapes);
        if (seen[key]) continue; seen[key] = 1;
        var ent = stmtEntailed(st, cons, n);
        // trivial if the statement is literally one of the scales
        var lit = scales.some(function (sc) { return describeScale(sc, shapes).replace(/\s/g, '') === key.replace(/\s/g, ''); });
        if (ent && !good && !lit) good = st; else if (!ent && bad.length < 3) bad.push(st);
      }
      if (!good || bad.length < 3) continue;
      var opts = rng.shuffle([good].concat(bad)).map(function (st) { return { text: stmtText(st, shapes), st: st }; });
      var ansIdx = opts.findIndex(function (o) { return o.st === good; });
      return { kind: 'must', w: w, shapes: shapes, scales: rng.shuffle(scales), options: opts.map(function (o) { return o.text; }), stmts: opts.map(function (o) { return o.st; }), answer: ansIdx };
    }
    return null;
  }

  function generate(level, rng) {
    var sp = SPEC[PL.clamp(level, 1, 10)];
    for (var t = 0; t < 60; t++) {
      var type = rng.pick(sp.types), p = null;
      if (type === 'value') p = genValue(rng, sp, false);
      else if (type === 'insufficient') p = genValue(rng, sp, true);
      else if (type === 'ratio') p = genRatio(rng, sp);
      else if (type === 'compare') p = genCompare(rng, sp);
      else if (type === 'must') p = genMust(rng, sp);
      if (p) {
        p.cantTell = !!sp.cantTell; p.expl = explain(p);
        var txt = p.expl.join('\n');
        // fairness: undetermined answers must be demonstrable with whole-number weights
        if (p.kind === 'insufficient' && txt.indexOf('For example') < 0) continue;
        if (p.kind === 'compare' && p.answer === 'unk' && txt.indexOf('Both ') < 0) continue;
        if (p.kind === 'must' && (txt.match(/fails for/g) || []).length !== 3) continue;
        return p;
      }
    }
    if (level <= 1) throw new Error('Balance generator failed');
    return generate(level - 1, rng);
  }

  /* ---- explanation ---- */
  function formText(f, shapes) {
    var parts = [];
    f.forEach(function (q, i) { if (q.n) parts.push({ c: q, s: GLYPH[shapes[i]] }); });
    if (!parts.length) return '0';
    return parts.map(function (p, k) {
      var v = PL.qval(p.c), a = Math.abs(v), coef = a === 1 ? '' : PL.qstr(Q(Math.abs(p.c.n), p.c.d));
      return (k === 0 ? (v < 0 ? '−' : '') : (v < 0 ? ' − ' : ' + ')) + coef + p.s;
    }).join('');
  }
  function sequentialSteps(p) {
    var n = p.shapes.length, known = {}, steps = [], eqs = p.scales.map(function (s, i) { return { s: s, i: i }; }).filter(function (e) { return !e.s.tilt; });
    var progress = true;
    while (progress) {
      progress = false;
      for (var k = 0; k < eqs.length; k++) {
        var r = rowOf(eqs[k].s, n), unk = [], rhs = r.b;
        r.a.forEach(function (c, i) { if (c.n) { if (known[i] != null) rhs = PL.qsub(rhs, PL.qmul(c, Q(known[i]))); else unk.push(i); } });
        if (unk.length === 1) {
          var i = unk[0], val = PL.qdiv(rhs, r.a[i]);
          if (val.d !== 1) continue;
          known[i] = val.n;
          steps.push('Scale ' + (eqs[k].i + 1) + ': ' + describeScale(eqs[k].s, p.shapes) + (Object.keys(known).length > 1 && r.a.filter(function (c) { return c.n; }).length > 1 ? ', using the weights already found,' : '') + ' gives ' + GLYPH[p.shapes[i]] + ' = ' + val.n + '.');
          progress = true;
        }
      }
    }
    return { known: known, steps: steps };
  }
  function explain(p) {
    var n = p.shapes.length, lines = [];
    if (p.kind === 'value' || p.kind === 'ratio') {
      var seq = p.kind === 'value' ? sequentialSteps(p) : { known: {}, steps: [] };
      if (p.kind === 'value' && seq.known[p.target] != null) return seq.steps;
      var eqIdx = []; p.scales.forEach(function (s, i) { if (!s.tilt) eqIdx.push(i); });
      var rows = eqRows(p.scales, n);
      var f = p.kind === 'value' ? unit(n, p.target) : (function () { var g = unit(n, p.a); g[p.b] = Q(-p.answer); return g; })();
      var lam = PL.la.combo(rows.map(function (r) { return r.slice(0, n).concat([r[n]]); }), n, f);
      if (lam) {
        var used = [], L = 1;
        lam.forEach(function (l) { if (l.n) L = L * l.d / PL.gcd(L, l.d); });
        lam = lam.map(function (l) { return PL.qmul(l, Q(L)); });
        lam.forEach(function (l, k) {
          if (!l.n) return;
          var v = PL.qval(l);
          used.push((used.length ? (v < 0 ? ' − ' : ' + ') : (v < 0 ? '−' : '')) + (Math.abs(v) === 1 ? '' : PL.qstr(Q(Math.abs(l.n), l.d)) + '×') + 'Scale ' + (eqIdx[k] + 1));
        });
        lines.push('Write each balanced scale as an equation (left side minus right side equals the difference in plain weights).');
        p.scales.forEach(function (s, i) { if (!s.tilt) lines.push('Scale ' + (i + 1) + ': ' + describeScale(s, p.shapes)); });
        lines.push('Combine them as ' + used.join('') + '. Everything else cancels, leaving ' + (p.kind === 'value' ? (L > 1 ? L : '') + GLYPH[p.shapes[p.target]] + ' = ' + (L * p.answer) + (L > 1 ? ', so ' + GLYPH[p.shapes[p.target]] + ' = ' + p.answer : '') : (L > 1 ? L : '') + GLYPH[p.shapes[p.a]] + ' = ' + (L * p.answer) + GLYPH[p.shapes[p.b]] + (L > 1 ? ', so ' + GLYPH[p.shapes[p.a]] + ' = ' + p.answer + GLYPH[p.shapes[p.b]] : '')) + '.');
      }
      return lines;
    }
    if (p.kind === 'insufficient') {
      var wit = witnesses(p, function (w) { return w[p.target]; });
      lines.push('The balanced scales give ' + PL.plural(p.scales.length, 'equation') + ' but not enough to pin down ' + GLYPH[p.shapes[p.target]] + '.');
      if (wit) lines.push('For example, ' + witText(wit[0], p.shapes) + ' and ' + witText(wit[1], p.shapes) + ' both fit every scale.');
      return lines;
    }
    if (p.kind === 'compare') {
      var X = GLYPH[p.shapes[p.x]], Y = GLYPH[p.shapes[p.y]];
      if (p.answer === 'unk') {
        var wt = witnesses(p, function (w) { return Math.sign(w[p.x] - w[p.y]); });
        lines.push('The scales do not decide it.');
        if (wt) lines.push('Both ' + witText(wt[0], p.shapes) + ' and ' + witText(wt[1], p.shapes) + ' fit every scale.');
      } else {
        lines.push(p.answer === 'x' ? X + ' must be heavier than ' + Y + '.' : p.answer === 'y' ? Y + ' must be heavier than ' + X + '.' : X + ' and ' + Y + ' must weigh the same.');
        var cert = certificate(p, p.answer === 'x' ? [p.x, p.y] : [p.y, p.x]);
        if (cert) lines.push(cert);
        lines.push('One set of weights that fits: ' + witText(p.w, p.shapes) + '.');
      }
      return lines;
    }
    if (p.kind === 'must') {
      lines.push('Only "' + p.options[p.answer] + '" holds for every set of weights that fits all the scales.');
      var cons = consOf(p.scales, n);
      p.stmts.forEach(function (st, i) {
        if (i === p.answer) return;
        var f = stmtForm(st, n);
        var w = witnessFor(p, function (wv) { var v = 0; f.forEach(function (q, j) { v += PL.qval(q) * wv[j]; }); return st.op === '=' ? Math.abs(v) > 1e-9 : st.op === '>' ? v <= 0 : v >= 0; });
        if (w) lines.push('"' + p.options[i] + '" fails for ' + witText(w, p.shapes) + ', which fits every scale.');
      });
      return lines;
    }
    return lines;
  }
  function fits(p, w) {
    return p.scales.every(function (s) { var a = sumW(s.L, w), b = sumW(s.R, w); return s.tilt === 'L' ? a > b : s.tilt === 'R' ? a < b : a === b; });
  }
  function enumerate(p, cb) {
    var n = p.shapes.length, w = [], max = 15;
    (function rec(i) {
      if (i === n) { if (fits(p, w)) return cb(w.slice()); return false; }
      for (var v = 1; v <= max; v++) { w[i] = v; if (rec(i + 1)) return true; }
      return false;
    })(0);
  }
  function witnesses(p, keyFn) {
    var first = null, out = null;
    enumerate(p, function (w) { if (!first) { first = w; return false; } if (keyFn(w) !== keyFn(first)) { out = [first, w]; return true; } return false; });
    return out;
  }
  function witnessFor(p, pred) { var r = null; enumerate(p, function (w) { if (pred(w)) { r = w; return true; } return false; }); return r; }
  function witText(w, shapes) { return w.map(function (v, i) { return GLYPH[shapes[i]] + '=' + v; }).join(', '); }
  function certificate(p, pair) { // find small integer combo of scales proving heavier/equal
    var n = p.shapes.length, cons = consOf(p.scales, n);
    var target = unit(n, pair[0]); target[pair[1]] = Q(-1);
    var m = cons.length, best = null;
    var lam = [];
    (function rec(k) {
      if (best) return;
      if (k === m) {
        if (lam.every(function (x) { return x === 0; })) return;
        var f = unit(n, 0, 0), b = Q(0), strict = false;
        lam.forEach(function (l, i) { if (!l) return; cons[i].a.forEach(function (q, j) { f[j] = PL.qadd(f[j], PL.qmul(q, Q(l))); }); b = PL.qadd(b, PL.qmul(cons[i].b, Q(l))); if (cons[i].op === '>') strict = true; });
        // need f = c*target + (nonnegative multiples of positive vars), with c>0, b >= 0
        var c = null;
        for (var j = 0; j < n; j++) if (j === pair[0]) c = f[j];
        if (!c || c.n <= 0) return;
        var ok = true;
        for (j = 0; j < n; j++) {
          var expect = j === pair[0] ? c : j === pair[1] ? Q(-c.n, c.d) : Q(0);
          var diff = PL.qsub(expect, f[j]); // must be >=0 → f[j] <= expect, slack positive vars subtracted
          if (PL.qval(diff) > 0) { ok = false; break; } // f has smaller coef than needed
        }
        if (!ok || PL.qval(b) < 0) return;
        best = lam.slice();
        return;
      }
      var range = cons[k].op === '=' ? [0, 1, -1, 2, -2, 3, -3] : [0, 1, 2, 3];
      for (var r = 0; r < range.length; r++) { lam[k] = range[r]; rec(k + 1); if (best) return; }
    })(0);
    if (!best) return null;
    var used = [];
    best.forEach(function (l, i) { if (l) used.push((l < 0 ? '−' : used.length ? '+' : '') + (Math.abs(l) > 1 ? Math.abs(l) + '×' : '') + 'Scale ' + (i + 1)); });
    return 'Reason: combine ' + used.join(' ') + ' and cancel what appears on both sides; what is left shows ' + GLYPH[p.shapes[pair[0]]] + ' outweighs ' + GLYPH[p.shapes[pair[1]]] + ' (every shape has positive weight).';
  }

  /* ---- play ---- */
  function question(p) {
    if (p.kind === 'value' || p.kind === 'insufficient') return 'What does one ' + NAMES[p.shapes[p.target]] + ' ' + GLYPH[p.shapes[p.target]] + ' weigh?';
    if (p.kind === 'ratio') return 'How many ' + NAMES[p.shapes[p.b]] + 's ' + GLYPH[p.shapes[p.b]] + ' balance one ' + NAMES[p.shapes[p.a]] + ' ' + GLYPH[p.shapes[p.a]] + '?';
    if (p.kind === 'compare') return 'Which is heavier: ' + GLYPH[p.shapes[p.x]] + ' or ' + GLYPH[p.shapes[p.y]] + '?';
    return 'Which statement must be true?';
  }
  function init() { return { tries: [] }; }
  function correct(p, ans) {
    if (p.kind === 'value' || p.kind === 'insufficient' || p.kind === 'ratio') {
      if (ans === 'cant') return p.answer === null;
      if (p.answer === null) return false;
      return PL.numMatch(ans, Q(p.answer));
    }
    return ans === p.answer;
  }
  function view(api) {
    var p = api.p, gs = api.gs;
    var submit = function (ans, label) {
      if (api.done) return;
      gs.tries.push(label || String(ans));
      if (correct(p, ans)) { api.update(gs); api.finish('solved'); }
      else { api.wrong(); api.toast('Not right. Check the scales again.', 'bad'); api.update(gs); }
    };
    var ctrl;
    if (p.kind === 'compare') {
      var X = GLYPH[p.shapes[p.x]], Y = GLYPH[p.shapes[p.y]];
      ctrl = h('div', { class: 'opts' }, [['x', X + ' is heavier'], ['y', Y + ' is heavier'], ['eq', 'Same weight'], ['unk', 'Can’t tell']].map(function (o) {
        return h('button', { class: 'btn opt', disabled: api.done, onclick: function () { submit(o[0], o[1]); } }, o[1]);
      }));
    } else if (p.kind === 'must') {
      ctrl = h('div', { class: 'opts' }, p.options.map(function (t, i) { return h('button', { class: 'btn opt mono', disabled: api.done, onclick: function () { submit(i, t); } }, t); }));
    } else {
      var inp = h('input', { id: 'bal-in', class: 'txt', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Your answer' });
      ctrl = h('div', null,
        h('form', { class: 'row-in', onsubmit: function (e) { e.preventDefault(); if (inp.value.trim()) submit(inp.value.trim()); } }, inp, h('button', { class: 'btn primary', type: 'submit', disabled: api.done }, 'Check')),
        p.cantTell ? h('button', { class: 'btn ghost', disabled: api.done, onclick: function () { submit('cant', 'Not enough information'); } }, 'Not enough information') : null);
    }
    return h('div', { class: 'balance' },
      h('div', { class: 'muted small' }, 'Every shape has a positive weight (not necessarily a whole number). Identical shapes weigh the same. Numbered blocks show their weight.'),
      h('div', { class: 'scales' }, p.scales.map(function (s, i) { return drawScale(s, p.shapes, i); })),
      h('div', { class: 'q' }, question(p)),
      ctrl,
      gs.tries.length ? h('div', { class: 'muted small' }, 'Tried: ' + gs.tries.join(', ')) : null
    );
  }
  /* Progressive hints: the equations first, then genuine deductions taken from the verified explanation
     (an intermediate value, a combination of scales, or a counterexample that eliminates an option). */
  function hintLines(p) {
    var eqs = 'As equations — ' + p.scales.map(function (s, i) { return 'Scale ' + (i + 1) + ': ' + describeScale(s, p.shapes); }).join('; ');
    var out = [eqs], ex = p.expl || [];
    if (p.kind === 'value') {
      var seq = sequentialSteps(p);
      if (seq.known[p.target] != null) out = out.concat(seq.steps.filter(function (l) { return true; }));
      else out = out.concat(ex.filter(function (l) { return /^Combine/.test(l); }).map(function (l) { return l.replace(/, so .*$/, '.'); }));
    } else if (p.kind === 'ratio') out = out.concat(ex.filter(function (l) { return /^Combine/.test(l); }).map(function (l) { return l.replace(/, so .*$/, '.'); }));
    else if (p.kind === 'insufficient') {
      var nEq = p.scales.filter(function (s) { return !s.tilt; }).length;
      out.push('Count them: ' + PL.plural(nEq, 'balanced scale') + ' give at most ' + PL.plural(nEq, 'independent equation') + ' for ' + p.shapes.length + ' unknown shapes. Check whether ' + GLYPH[p.shapes[p.target]] + ' can be isolated.');
      out = out.concat(ex.filter(function (l) { return /^For example/.test(l); }));
    } else if (p.kind === 'compare') out = out.concat(ex.filter(function (l) { return /^Reason|^Both/.test(l); }));
    else if (p.kind === 'must') out = out.concat(ex.filter(function (l) { return /fails for/.test(l); }).map(function (l) { return 'Eliminate: ' + l; }));
    return out;
  }
  function hint(p, gs) {
    var lines = hintLines(p);
    gs.h = gs.h || 0;
    if (gs.h >= lines.length) return { msg: 'No further hints for this puzzle — every useful step has been shown.', noCount: true };
    var msg = lines[gs.h]; gs.h++;
    return { msg: msg, gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var nOpts = p.kind === 'compare' ? 4 : p.kind === 'must' ? 4 : 0;
    var pen = nOpts ? 30 : 18; // wrong guesses cost more where options are few (discourage guessing)
    var q = solved ? PL.clamp(100 - ctx.wrong * pen - ctx.hints * 12, 15, 100) : 0;
    return {
      quality: Math.round(q),
      metrics: { kind: p.kind, unknowns: p.shapes.length, scales: p.scales.length, wrong: ctx.wrong, firstTry: solved && ctx.wrong === 0 },
      lines: [['Question type', { value: 'Find a weight', insufficient: 'Find a weight', ratio: 'Ratio', compare: 'Compare', must: 'Must be true' }[p.kind]], ['Unknown shapes', p.shapes.length], ['Wrong answers', ctx.wrong]]
    };
  }
  function answerText(p) {
    if (p.kind === 'value') return GLYPH[p.shapes[p.target]] + ' = ' + p.answer;
    if (p.kind === 'insufficient') return 'Not enough information';
    if (p.kind === 'ratio') return p.answer + ' ' + GLYPH[p.shapes[p.b]] + ' balance one ' + GLYPH[p.shapes[p.a]];
    if (p.kind === 'compare') return { x: GLYPH[p.shapes[p.x]] + ' is heavier', y: GLYPH[p.shapes[p.y]] + ' is heavier', eq: 'Same weight', unk: 'Can’t tell' }[p.answer];
    return p.options[p.answer];
  }
  function review(p, gs) {
    return h('div', { class: 'review' },
      h('div', { class: 'scales' }, p.scales.map(function (s, i) { return drawScale(s, p.shapes, i); })),
      h('div', null, h('span', { class: 'lbl' }, 'Answer '), h('b', null, answerText(p))),
      h('ol', { class: 'steps' }, p.expl.map(function (l) { return h('li', null, l); })),
      gs.tries.length ? h('div', { class: 'muted small' }, 'Your answers: ' + gs.tries.join(', ')) : null);
  }
  function stats(atts) {
    var by = {}; atts.forEach(function (a) { var k = a.metrics && a.metrics.kind; if (!k) return; (by[k] = by[k] || []).push(a); });
    var acc = function (arr) { return arr.length ? Math.round(100 * arr.filter(function (a) { return a.outcome === 'solved'; }).length / arr.length) + '%' : '—'; };
    var first = atts.filter(function (a) { return a.metrics && a.metrics.firstTry; }).length;
    return [
      ['Accuracy', acc(atts)],
      ['First-try rate', atts.length ? Math.round(100 * first / atts.length) + '%' : '—'],
      ['Find-a-weight accuracy', acc((by.value || []).concat(by.insufficient || []))],
      ['Ratio accuracy', acc(by.ratio || [])],
      ['Compare accuracy', acc(by.compare || [])],
      ['Must-be-true accuracy', acc(by.must || [])]
    ];
  }
  PL.games.balance = {
    id: 'balance', name: 'Balance', blurb: 'Reason about weights from balance scales.',
    rules: 'Each scale shows how shapes compare. A level beam means both sides weigh the same; a tilted beam means the lower side is heavier. Work out what the question asks. On harder puzzles the honest answer can be “Not enough information” or “Can’t tell”.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 45 + lv * 20; }, timeLimit: function (lv) { return 90 + lv * 25; },
    _correct: correct, _fits: fits, _compare: compareAnswer, _answerText: answerText, _describe: describeScale
  };
})();

;
/* ===== GAME 9: REVERSE ENGINEER =====
   Work backward from a final state. Six variations, every one checked by exhaustive search:
   num (numeric chain, unique start), seq (rearranged sequence), grid (moved board), missing (missing operations),
   multi (several possible starts / which fact makes it unique), constraint (several machines, one hidden start). */
(function () {
  var h = PL.h;

  /* ---------- numeric operations ---------- */
  function digitsOf(x) { return String(x).split('').map(Number); }
  var NUM_OPS = {
    add: { lossy: false, txt: function (k) { return 'add ' + k; }, f: function (x, k) { return x + k; } },
    sub: { lossy: false, txt: function (k) { return 'subtract ' + k; }, f: function (x, k) { return x - k > 0 ? x - k : null; } },
    mul: { lossy: false, txt: function (k) { return 'multiply by ' + k; }, f: function (x, k) { return x * k; } },
    div: { lossy: false, txt: function (k) { return 'divide by ' + k + ' (it divides exactly)'; }, f: function (x, k) { return x % k === 0 ? x / k : null; } },
    sq: { lossy: false, txt: function () { return 'square it'; }, f: function (x) { return x * x <= 1e7 ? x * x : null; } },
    rev: { lossy: true, txt: function () { return 'reverse its digits (a leading zero is dropped)'; }, f: function (x) { return parseInt(String(x).split('').reverse().join(''), 10) || null; } },
    dsum: { lossy: true, txt: function () { return 'replace it with the sum of its digits'; }, f: function (x) { return digitsOf(x).reduce(function (a, b) { return a + b; }, 0); } },
    addds: { lossy: true, txt: function () { return 'add the sum of its own digits'; }, f: function (x) { return x + digitsOf(x).reduce(function (a, b) { return a + b; }, 0); } },
    droplast: { lossy: true, txt: function () { return 'delete its last digit'; }, f: function (x) { return x >= 10 ? Math.floor(x / 10) : null; } },
    half: { lossy: true, txt: function () { return 'halve it, rounding down'; }, f: function (x) { return Math.floor(x / 2) || null; } },
    mod: { lossy: true, txt: function (k) { return 'keep only the remainder after dividing by ' + k + ', then add ' + k; }, f: function (x, k) { return (x % k) + k; } },
    swapends: { lossy: true, txt: function () { return 'swap its first and last digits'; }, f: function (x) { var s = String(x); if (s.length < 2) return x; var t = s[s.length - 1] + s.slice(1, -1) + s[0]; return t[0] === '0' ? null : parseInt(t, 10); } }
  };
  function runChain(x, ops, trace) {
    var v = x; if (trace) trace.push(v);
    for (var i = 0; i < ops.length; i++) { v = NUM_OPS[ops[i].t].f(v, ops[i].k); if (v == null || v <= 0 || v > 1e7) return null; if (trace) trace.push(v); }
    return v;
  }
  function chainText(ops) { return ops.map(function (o) { return NUM_OPS[o.t].txt(o.k); }); }
  function randNumOp(rng, lv, allowLossy) {
    var pool = ['add', 'sub', 'mul', 'div'];
    if (lv >= 3) pool.push('rev', 'sq');
    if (allowLossy && lv >= 4) pool.push('addds', 'swapends');
    if (allowLossy && lv >= 6) pool.push('droplast', 'half', 'dsum', 'mod');
    var t = rng.pick(pool), k = null;
    if (t === 'add' || t === 'sub') k = rng.int(2, lv >= 5 ? 60 : 20);
    if (t === 'mul') k = rng.int(2, lv >= 6 ? 9 : 5);
    if (t === 'div') k = rng.pick([2, 3, 4, 5, 6]);
    if (t === 'mod') k = rng.pick([5, 7, 9, 11]);
    return { t: t, k: k };
  }
  function domainFor(lv) { return lv <= 2 ? [1, 99] : lv <= 5 ? [10, 500] : [10, 999]; }
  function startsFor(ops, final, dom) { var out = []; for (var x = dom[0]; x <= dom[1]; x++) if (runChain(x, ops) === final) out.push(x); return out; }

  function genNum(lv, rng) {
    var nOps = PL.clamp(1 + Math.ceil(lv / 2), 2, 6), dom = domainFor(lv);
    for (var t = 0; t < 300; t++) {
      var x = rng.int(dom[0], dom[1]), ops = [];
      for (var i = 0; i < nOps; i++) ops.push(randNumOp(rng, lv, lv >= 5));
      // reject trivial chains (all add/sub) at higher levels
      if (lv >= 4 && ops.every(function (o) { return o.t === 'add' || o.t === 'sub'; })) continue;
      var trace = [], fin = runChain(x, ops, trace); if (fin == null) continue;
      var starts = startsFor(ops, fin, dom);
      if (starts.length !== 1) continue;
      return { type: 'num', dom: dom, ops: ops, steps: chainText(ops), final: fin, answer: x, trace: trace,
        intro: 'A secret starting number between ' + dom[0] + ' and ' + dom[1] + ' went through these steps in order. Every number along the way was a whole number above zero.', ask: 'What was the starting number?' };
    }
    return null;
  }
  function genMulti(lv, rng) {
    var dom = lv <= 6 ? [10, 99] : [10, 999];
    for (var t = 0; t < 400; t++) {
      var nOps = lv <= 6 ? 2 : 3, ops = [];
      for (var i = 0; i < nOps; i++) ops.push(randNumOp(rng, Math.max(lv, 6), true));
      if (!ops.some(function (o) { return NUM_OPS[o.t].lossy; })) continue;
      var x = rng.int(dom[0], dom[1]), fin = runChain(x, ops); if (fin == null) continue;
      var starts = startsFor(ops, fin, dom);
      if (starts.length < 2 || starts.length > 6) continue;
      if (lv >= 8 && rng.chance(0.5)) {
        // which extra fact makes the start unique?
        var facts = [
          { t: 'It was even.', f: function (v) { return v % 2 === 0; } }, { t: 'It was odd.', f: function (v) { return v % 2 === 1; } },
          { t: 'It was a multiple of 3.', f: function (v) { return v % 3 === 0; } }, { t: 'It was a multiple of 5.', f: function (v) { return v % 5 === 0; } },
          { t: 'It was greater than ' + starts[Math.floor(starts.length / 2)] + '.', f: (function (m) { return function (v) { return v > m; }; })(starts[Math.floor(starts.length / 2)]) },
          { t: 'It was less than ' + starts[1] + '.', f: (function (m) { return function (v) { return v < m; }; })(starts[1]) },
          { t: 'Its digits were all different.', f: function (v) { var d = String(v); return new Set(d).size === d.length; } },
          { t: 'Its last digit was ' + (starts[0] % 10) + '.', f: (function (m) { return function (v) { return v % 10 === m; }; })(starts[0] % 10) }
        ];
        var good = facts.filter(function (fc) { return starts.filter(fc.f).length === 1; }), bad = facts.filter(function (fc) { return starts.filter(fc.f).length !== 1; });
        if (!good.length || bad.length < 3) continue;
        var g = rng.pick(good), opts = rng.shuffle([g].concat(rng.shuffle(bad).slice(0, 3)));
        return { type: 'multi', mode: 'fact', dom: dom, ops: ops, steps: chainText(ops), final: fin, starts: starts, options: opts.map(function (o) { return o.t; }), answer: opts.indexOf(g), unique: starts.filter(g.f)[0],
          intro: 'A starting number between ' + dom[0] + ' and ' + dom[1] + ' went through these steps. Several different starting numbers could give this result.', ask: 'Which single extra fact would pin the starting number down to exactly one possibility?' };
      }
      return { type: 'multi', mode: 'list', dom: dom, ops: ops, steps: chainText(ops), final: fin, starts: starts, answer: starts,
        intro: 'A starting number between ' + dom[0] + ' and ' + dom[1] + ' went through these steps. More than one starting number might work.', ask: 'Enter every possible starting number, separated by commas.' };
    }
    return null;
  }
  function genConstraint(lv, rng) {
    var dom = lv <= 5 ? [10, 99] : [100, 999];
    for (var t = 0; t < 400; t++) {
      var x = rng.int(dom[0], dom[1]), nm = lv >= 8 ? 3 : 2, machines = [];
      for (var m = 0; m < nm; m++) { var ops = [randNumOp(rng, 8, true)]; if (lv >= 6) ops.push(randNumOp(rng, 6, true)); machines.push(ops); }
      if (!machines.every(function (ops) { return ops.some(function (o) { return NUM_OPS[o.t].lossy; }); })) continue;
      var outs = machines.map(function (ops) { return runChain(x, ops); }); if (outs.some(function (v) { return v == null; })) continue;
      var sets = machines.map(function (ops, i) { return startsFor(ops, outs[i], dom); });
      if (sets.some(function (s) { return s.length < 2; })) continue; // each machine alone must be ambiguous
      var all = sets.reduce(function (a, s) { return a.filter(function (v) { return s.indexOf(v) >= 0; }); });
      if (all.length !== 1) continue;
      return { type: 'constraint', dom: dom, machines: machines.map(function (ops, i) { return { name: 'Machine ' + 'ABC'[i], steps: chainText(ops), out: outs[i], ops: ops, cands: sets[i] }; }), answer: x,
        intro: 'The same secret number between ' + dom[0] + ' and ' + dom[1] + ' was fed into each machine. No machine alone reveals it, but together they do.', ask: 'What was the secret number?' };
    }
    return null;
  }

  /* ---------- sequence operations ---------- */
  var SEQ_OPS = {
    swap: { txt: function (a, b) { return 'swap positions ' + (a + 1) + ' and ' + (b + 1); }, f: function (s, a, b) { var t = s.slice(); var x = t[a]; t[a] = t[b]; t[b] = x; return t; } },
    rotl: { txt: function (k) { return 'move the first ' + (k === 1 ? 'item' : k + ' items') + ' to the end'; }, f: function (s, k) { return s.slice(k).concat(s.slice(0, k)); } },
    rotr: { txt: function (k) { return 'move the last ' + (k === 1 ? 'item' : k + ' items') + ' to the front'; }, f: function (s, k) { return s.slice(s.length - k).concat(s.slice(0, s.length - k)); } },
    revall: { txt: function () { return 'reverse the whole row'; }, f: function (s) { return s.slice().reverse(); } },
    revseg: { txt: function (a, b) { return 'reverse positions ' + (a + 1) + ' to ' + (b + 1); }, f: function (s, a, b) { var t = s.slice(); var seg = t.slice(a, b + 1).reverse(); for (var i = a; i <= b; i++) t[i] = seg[i - a]; return t; } },
    move: { txt: function (a, b) { return 'take the item in position ' + (a + 1) + ' and insert it at position ' + (b + 1); }, f: function (s, a, b) { var t = s.slice(); var x = t.splice(a, 1)[0]; t.splice(b, 0, x); return t; } }
  };
  function seqApply(s, op) { return SEQ_OPS[op.t].f(s, op.a, op.b); }
  function seqText(op) { return SEQ_OPS[op.t].txt(op.a, op.b); }
  var SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  function randSeqOp(rng, n, lv) {
    var pool = ['swap', 'rotl', 'rotr', 'revall'];
    if (lv >= 3) pool.push('revseg', 'move');
    var t = rng.pick(pool), a = 0, b = 0;
    if (t === 'swap' || t === 'move') { a = rng.int(0, n - 1); b = rng.int(0, n - 1); if (a === b) b = (a + 1) % n; }
    if (t === 'revseg') { a = rng.int(0, n - 3); b = rng.int(a + 2, n - 1); }
    if (t === 'rotl' || t === 'rotr') { a = rng.int(1, n - 2); }
    return { t: t, a: a, b: b };
  }
  function genSeq(lv, rng) {
    var n = PL.clamp(3 + Math.ceil(lv / 2), 4, 8), k = PL.clamp(1 + Math.ceil(lv / 2), 2, 6);
    for (var t = 0; t < 100; t++) {
      var start = rng.shuffle(SYMBOLS.slice(0, n)), ops = [];
      for (var i = 0; i < k; i++) { var o = randSeqOp(rng, n, lv); if (ops.length && JSON.stringify(ops[ops.length - 1]) === JSON.stringify(o)) { i--; continue; } ops.push(o); }
      var trace = [start], cur = start;
      ops.forEach(function (o) { cur = seqApply(cur, o); trace.push(cur); });
      if (cur.join('') === start.join('')) continue;
      return { type: 'seq', n: n, ops: ops, steps: ops.map(seqText), final: cur, answer: start, trace: trace,
        intro: 'Tiles were laid in a row, then rearranged by these steps in order. Here is the final row.', ask: 'Rebuild the original row.' };
    }
    return null;
  }

  /* ---------- grid operations (spatial) ---------- */
  var GRID_OPS = {
    rowR: { txt: function (r) { return 'slide row ' + (r + 1) + ' one place right (the end wraps to the start)'; }, f: function (g, n, r) { var t = g.slice(); var row = t.slice(r * n, r * n + n); row = [row[n - 1]].concat(row.slice(0, n - 1)); for (var i = 0; i < n; i++) t[r * n + i] = row[i]; return t; } },
    rowL: { txt: function (r) { return 'slide row ' + (r + 1) + ' one place left (the end wraps)'; }, f: function (g, n, r) { var t = g.slice(); var row = t.slice(r * n, r * n + n); row = row.slice(1).concat([row[0]]); for (var i = 0; i < n; i++) t[r * n + i] = row[i]; return t; } },
    colD: { txt: function (c) { return 'slide column ' + (c + 1) + ' one place down (the end wraps)'; }, f: function (g, n, c) { var t = g.slice(); var col = []; for (var i = 0; i < n; i++) col.push(g[i * n + c]); col = [col[n - 1]].concat(col.slice(0, n - 1)); for (i = 0; i < n; i++) t[i * n + c] = col[i]; return t; } },
    colU: { txt: function (c) { return 'slide column ' + (c + 1) + ' one place up (the end wraps)'; }, f: function (g, n, c) { var t = g.slice(); var col = []; for (var i = 0; i < n; i++) col.push(g[i * n + c]); col = col.slice(1).concat([col[0]]); for (i = 0; i < n; i++) t[i * n + c] = col[i]; return t; } },
    rotCW: { txt: function () { return 'rotate the whole board a quarter turn clockwise'; }, f: function (g, n) { var t = []; for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) t[c * n + (n - 1 - r)] = g[r * n + c]; return t; } },
    flipH: { txt: function () { return 'flip the board left-to-right'; }, f: function (g, n) { var t = []; for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) t[r * n + (n - 1 - c)] = g[r * n + c]; return t; } },
    swap: { txt: function (a, b, n) { return 'swap the contents of ' + cellName(a, n) + ' and ' + cellName(b, n); }, f: function (g, n, a, b) { var t = g.slice(); var x = t[a]; t[a] = t[b]; t[b] = x; return t; } }
  };
  function cellName(i, n) { return 'row ' + (Math.floor(i / n) + 1) + ' column ' + (i % n + 1); }
  var TOKENS = ['●', '▲', '■', '★', '◆'];
  function genGrid(lv, rng) {
    var n = lv <= 6 ? 3 : 4, k = PL.clamp(Math.ceil(lv / 2), 2, 5);
    for (var t = 0; t < 100; t++) {
      var cells = []; for (var i = 0; i < n * n; i++) cells.push('');
      var nt = n === 3 ? rng.int(4, 5) : rng.int(6, 8), idx = rng.shuffle(cells.map(function (_, j) { return j; })).slice(0, nt);
      idx.forEach(function (j, q) { cells[j] = TOKENS[q % TOKENS.length]; });
      var ops = [];
      for (i = 0; i < k; i++) {
        var pool = ['rowR', 'rowL', 'colD', 'colU', 'swap'].concat(lv >= 5 ? ['rotCW', 'flipH'] : []);
        var tt = rng.pick(pool), o = { t: tt, a: 0, b: 0 };
        if (/row|col/.test(tt)) o.a = rng.int(0, n - 1);
        if (tt === 'swap') { o.a = rng.int(0, n * n - 1); o.b = rng.int(0, n * n - 1); if (o.a === o.b) o.b = (o.a + 1) % (n * n); }
        ops.push(o);
      }
      var trace = [cells], cur = cells;
      ops.forEach(function (o) { cur = GRID_OPS[o.t].f(cur, n, o.a, o.b); trace.push(cur); });
      if (cur.join('|') === cells.join('|')) continue;
      return { type: 'grid', n: n, ops: ops, steps: ops.map(function (o) { return GRID_OPS[o.t].txt(o.a, o.b, n); }), final: cur, answer: cells, trace: trace,
        intro: 'Tokens sat on a board, then these moves were made in order. Here is the board afterwards.', ask: 'Restore the original board: tap two squares to swap them.' };
    }
    return null;
  }

  /* ---------- missing operations ---------- */
  function genMissing(lv, rng) {
    var gaps = lv >= 5 ? 2 : 1;
    if (rng.chance(0.5)) {
      // numeric
      for (var t = 0; t < 400; t++) {
        var menu = [], seen = {};
        while (menu.length < (lv >= 7 ? 6 : 5)) { var o = randNumOp(rng, Math.max(lv, 3), false); var key = o.t + o.k; if (!seen[key]) { seen[key] = 1; menu.push(o); } }
        var len = gaps + rng.int(1, 2), ops = [];
        for (var i = 0; i < len; i++) ops.push(rng.pick(menu));
        var gapIdx = rng.shuffle(ops.map(function (_, j) { return j; })).slice(0, gaps).sort();
        var x = rng.int(5, 60), fin = runChain(x, ops); if (fin == null) continue;
        // enumerate all assignments for the gaps
        var sols = [];
        (function rec(g, cur) {
          if (g === gaps) { var trial = ops.slice(); gapIdx.forEach(function (gi, q) { trial[gi] = menu[cur[q]]; }); if (runChain(x, trial) === fin) sols.push(cur.slice()); return; }
          for (var m = 0; m < menu.length; m++) { cur.push(m); rec(g + 1, cur); cur.pop(); }
        })(0, []);
        if (sols.length !== 1) continue;
        return { type: 'missing', kind: 'num', start: x, final: fin, ops: ops, gapIdx: gapIdx, menu: menu.map(function (o) { return NUM_OPS[o.t].txt(o.k); }), answer: sols[0],
          stepsShown: ops.map(function (o, j) { return gapIdx.indexOf(j) >= 0 ? '?' : NUM_OPS[o.t].txt(o.k); }),
          intro: 'The number ' + x + ' was turned into ' + fin + ' by the steps below, but ' + (gaps === 1 ? 'one step is' : 'two steps are') + ' missing. Each missing step is one of the listed operations.', ask: 'Choose the missing ' + (gaps === 1 ? 'step' : 'steps') + '.' };
      }
    }
    var n = lv >= 5 ? 6 : 5;
    for (var t2 = 0; t2 < 400; t2++) {
      var menu2 = [], seen2 = {};
      while (menu2.length < 5) { var o2 = randSeqOp(rng, n, Math.max(lv, 3)); var k2 = JSON.stringify(o2); if (!seen2[k2]) { seen2[k2] = 1; menu2.push(o2); } }
      var len2 = gaps + rng.int(1, 2), ops2 = [];
      for (var i2 = 0; i2 < len2; i2++) ops2.push(rng.pick(menu2));
      var gi2 = rng.shuffle(ops2.map(function (_, j) { return j; })).slice(0, gaps).sort();
      var start = SYMBOLS.slice(0, n), cur = start; ops2.forEach(function (o) { cur = seqApply(cur, o); });
      var fin2 = cur.join('');
      var sols2 = [];
      (function rec2(g, c) {
        if (g === gaps) { var tr = ops2.slice(); gi2.forEach(function (gi, q) { tr[gi] = menu2[c[q]]; }); var s = start; tr.forEach(function (o) { s = seqApply(s, o); }); if (s.join('') === fin2) sols2.push(c.slice()); return; }
        for (var m = 0; m < menu2.length; m++) { c.push(m); rec2(g + 1, c); c.pop(); }
      })(0, []);
      if (sols2.length !== 1 || fin2 === start.join('')) continue;
      return { type: 'missing', kind: 'seq', start: start, final: cur, ops: ops2, gapIdx: gi2, menu: menu2.map(seqText), answer: sols2[0],
        stepsShown: ops2.map(function (o, j) { return gi2.indexOf(j) >= 0 ? '?' : seqText(o); }),
        intro: 'The row ' + start.join(' ') + ' became ' + cur.join(' ') + ' through the steps below, but ' + (gaps === 1 ? 'one step is' : 'two steps are') + ' missing. Each missing step is one of the listed moves.', ask: 'Choose the missing ' + (gaps === 1 ? 'step' : 'steps') + '.' };
    }
    return null;
  }

  var TYPE_NAMES = { num: 'Numbers', seq: 'Sequence', grid: 'Board', missing: 'Missing steps', multi: 'Multiple starts', constraint: 'Several machines' };
  var TYPE_LEVELS = { num: [1, 10], seq: [1, 10], missing: [1, 10], grid: [3, 10], constraint: [3, 10], multi: [5, 10] };
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10);
    var types = Object.keys(TYPE_LEVELS).filter(function (t) { return lv >= TYPE_LEVELS[t][0] && lv <= TYPE_LEVELS[t][1]; });
    var recent = (ctx && ctx.recent) || [];
    var fresh = types.filter(function (t) { return recent.slice(-2).indexOf(t) < 0; });
    if (ctx && ctx.forceType) fresh = [ctx.forceType];
    for (var tries = 0; tries < 40; tries++) {
      var t = rng.pick(fresh.length ? fresh : types), P = null;
      if (t === 'num') P = genNum(lv, rng); else if (t === 'seq') P = genSeq(lv, rng); else if (t === 'grid') P = genGrid(lv, rng);
      else if (t === 'missing') P = genMissing(lv, rng); else if (t === 'multi') P = genMulti(lv, rng); else if (t === 'constraint') P = genConstraint(lv, rng);
      if (P) { P.tkey = t; P.typeName = TYPE_NAMES[t]; P.math = t === 'num' || t === 'multi' || t === 'constraint' || (t === 'missing' && P.kind === 'num'); return P; }
    }
    throw new Error('reverse generation failed');
  }

  /* ---------- checking ---------- */
  function parseList(s) { return String(s).split(/[^0-9]+/).filter(Boolean).map(Number); }
  function check(p, gs) {
    if (p.type === 'num' || p.type === 'constraint') return parseInt(gs.input, 10) === p.answer;
    if (p.type === 'multi') {
      if (p.mode === 'fact') return gs.choice === p.answer;
      var got = parseList(gs.input).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      return got.join(',') === p.answer.slice().sort(function (a, b) { return a - b; }).join(',');
    }
    if (p.type === 'seq') {
      if (gs.guess) return gs.guess.join('') === p.answer.join('');
      return !!gs.slots && gs.slots.every(function (x, i) { return x != null && gs.pool[x] === p.answer[i]; });
    }
    if (p.type === 'grid') return gs.cells.join('|') === p.answer.join('|');
    if (p.type === 'missing') return gs.picks.every(function (v, i) { return v === p.answer[i]; });
    return false;
  }
  function init(p) {
    if (p.type === 'seq') return { tries: [], guess: null };
    if (p.type === 'grid') return { cells: p.final.slice(), sel: null, swaps: 0, tries: [] };
    if (p.type === 'missing') return { picks: p.gapIdx.map(function () { return null; }), tries: [] };
    return { input: '', choice: null, tries: [] };
  }
  function minSwaps(from, to) { // minimum swaps to transform one arrangement into another (tokens may repeat blanks)
    var a = from.slice(), n = 0;
    for (var i = 0; i < a.length; i++) { if (a[i] === to[i]) continue; for (var j = i + 1; j < a.length; j++) if (a[j] === to[i] && a[j] !== to[j]) { var t = a[i]; a[i] = a[j]; a[j] = t; n++; break; } }
    return n;
  }
  function gridView(cells, n, opts) {
    var g = h('div', { class: 're-grid', style: { 'grid-template-columns': 'repeat(' + n + ', 1fr)' } });
    cells.forEach(function (v, i) {
      g.appendChild(h(opts && opts.onclick ? 'button' : 'span', { class: 're-cell' + (opts && opts.sel === i ? ' sel' : '') + (v ? ' tok t' + TOKENS.indexOf(v) : ''), disabled: opts && opts.disabled, 'aria-label': cellName(i, n) + (v ? ' ' + v : ' empty'), onclick: opts && opts.onclick ? function () { opts.onclick(i); } : null }, v || ''));
    });
    return g;
  }
  function stepsList(steps, numbered) { return h('ol', { class: 're-steps' }, steps.map(function (s) { return h('li', { class: s === '?' ? 'gap' : '' }, s === '?' ? 'missing step' : PL.cap(s)); })); }

  /* ======================= Workspaces =======================
     Free experimentation areas. Nothing here counts as a hint or an attempt; only "Check" submissions do.
     Undo model (shared by every workspace): a linear list of complete, immutable snapshots plus a cursor.
       states[0] is the starting arrangement and is never modified; every action appends a NEW snapshot
       (dropping any redo branch); Undo/Redo only move the cursor; Reset appends a copy of states[0].
     Nothing is ever recomputed or reshuffled on undo, so undo/redo always land on exactly the recorded states.
     Tiles carry stable ids (their index in the starting row), so repeated letters are tracked independently.
     All of this lives in gs, so it survives leaving and returning. */
  var HMAX = 150;
  function snap(o) { return JSON.parse(JSON.stringify(o)); }
  function hNew(start) { return { states: [snap(start)], idx: 0 }; }
  function hCur(hs) { return hs.states[hs.idx]; }
  function hCommit(hs, next) { // returns false when the action changed nothing (no history entry)
    if (JSON.stringify(next) === JSON.stringify(hCur(hs))) return false;
    hs.states = hs.states.slice(0, hs.idx + 1); hs.states.push(snap(next));
    if (hs.states.length > HMAX) hs.states.splice(1, hs.states.length - HMAX); // the start (states[0]) is always kept
    hs.idx = hs.states.length - 1; return true;
  }
  function hUndo(hs) { if (hs.idx > 0) { hs.idx--; return true; } return false; }
  function hRedo(hs) { if (hs.idx < hs.states.length - 1) { hs.idx++; return true; } return false; }
  function hReset(hs) { return hCommit(hs, hs.states[0]); }
  function hFromOld(start, hist, current, fut) { // rebuild a history saved by the old {hist, fut} format, in order
    var hs = hNew(start), at = 0;
    (hist || []).forEach(function (x) { hCommit(hs, x); });
    hCommit(hs, current); at = hs.idx;
    (fut || []).slice().reverse().forEach(function (x) { hCommit(hs, x); });
    hs.idx = at; return hs;
  }
  function histButtons(hs, after, disabled) {
    return [
      h('button', { class: 'btn ghost sm', 'data-act': 'undo', disabled: disabled || hs.idx === 0, onclick: function () { if (hUndo(hs)) after(); } }, 'Undo'),
      h('button', { class: 'btn ghost sm', 'data-act': 'redo', disabled: disabled || hs.idx >= hs.states.length - 1, onclick: function () { if (hRedo(hs)) after(); } }, 'Redo'),
      h('button', { class: 'btn ghost sm', 'data-act': 'reset', disabled: disabled || JSON.stringify(hCur(hs)) === JSON.stringify(hs.states[0]), onclick: function () { if (hReset(hs)) after(); } }, 'Reset to start')];
  }

  /* --- A. letter/symbol tiles --- */
  function tileStart(p) { return p.type === 'missing' ? p.start.slice() : p.final.slice(); }
  function ensureTiles(p, gs) {
    var start = tileStart(p), ids = start.map(function (_, i) { return i; });
    var ws = gs.tws;
    if (!ws || !ws.hs) { // new, or saved by the old version ({rows, hist, fut} of symbol rows): rebuild as id rows
      var toIds = function (rows) { // map symbols back to ids, using each starting position once per row
        return rows.map(function (row) { var used = {}; return row.map(function (sym) { for (var i = 0; i < start.length; i++) if (start[i] === sym && !used[i]) { used[i] = 1; return i; } return null; }); })
          .filter(function (row) { return row.length === start.length && row.every(function (x) { return x != null; }); });
      };
      var conv = function (rows) { var r = toIds(rows); return { rows: r.length ? r : [ids] }; };
      var hs = ws && ws.rows ? hFromOld({ rows: [ids] }, (ws.hist || []).map(conv), conv(ws.rows), (ws.fut || []).map(conv)) : hNew({ rows: [ids] });
      ws = gs.tws = { sym: start, hs: hs, sel: null };
    }
    return ws;
  }
  function tileRows(gs) { var ws = gs.tws; return ws && ws.hs ? hCur(ws.hs).rows.map(function (r) { return r.map(function (id) { return ws.sym[id]; }); }) : null; }
  function tileWorkspace(api, opts) {
    var p = api.p, gs = api.gs, ws = ensureTiles(p, gs), state = hCur(ws.hs);
    var change = function (fn) { var next = snap(hCur(ws.hs)); fn(next.rows); ws.sel = null; hCommit(ws.hs, next); api.update(gs); };
    var after = function () { ws.sel = null; api.update(gs); };
    var rowsEl = h('div', { class: 'tws-rows' });
    state.rows.forEach(function (row, r) {
      var tiles = h('div', { class: 'tws-tiles', 'data-row': r });
      row.forEach(function (id, i) {
        var sym = ws.sym[id];
        var t = h('button', { class: 'tws-tile mono' + (ws.sel && ws.sel.r === r && ws.sel.id === id ? ' sel' : ''), 'data-i': i, 'data-id': id, 'aria-label': 'Tile ' + sym + ', position ' + (i + 1) }, sym);
        attachTileDrag(t, r, id, tiles, ws, api, gs, change);
        tiles.appendChild(t);
      });
      var acts = h('div', { class: 'tws-acts' },
        h('button', { class: 'btn ghost xs', 'aria-label': 'Move first tile to the end', onclick: function () { change(function (rows) { rows[r] = rows[r].slice(1).concat(rows[r].slice(0, 1)); }); } }, '1st→end'),
        h('button', { class: 'btn ghost xs', 'aria-label': 'Move last tile to the front', onclick: function () { change(function (rows) { rows[r] = rows[r].slice(-1).concat(rows[r].slice(0, -1)); }); } }, 'last→1st'),
        h('button', { class: 'btn ghost xs', 'aria-label': 'Reverse this row', onclick: function () { change(function (rows) { rows[r] = rows[r].slice().reverse(); }); } }, 'Flip'),
        h('button', { class: 'btn ghost xs', 'aria-label': 'Duplicate this row', onclick: function () { change(function (rows) { rows.splice(r + 1, 0, rows[r].slice()); }); } }, 'Copy'),
        state.rows.length > 1 ? h('button', { class: 'btn ghost xs', 'aria-label': 'Delete this row', onclick: function () { change(function (rows) { rows.splice(r, 1); }); } }, '✕') : null,
        opts.submit && !api.done ? h('button', { class: 'btn xs primary', onclick: function () { opts.submit(row.map(function (id) { return ws.sym[id]; })); } }, 'Check') : null);
      rowsEl.appendChild(h('div', { class: 'tws-row' }, h('span', { class: 'tws-n muted' }, String(r + 1)), tiles, acts));
    });
    return h('div', { class: 'workspace' },
      h('div', { class: 'ws-head' }, h('span', { class: 'lbl' }, 'Workspace'), h('div', { class: 'row-actions' }, histButtons(ws.hs, after, api.done))),
      h('div', { class: 'muted small' }, 'Drag a tile to move it, or tap two tiles to swap them. 1st→end and last→1st rotate the row, Flip reverses it, Copy duplicates it to try another idea. Undo and Redo step through your moves exactly; Reset to start goes back to the starting row (and can itself be undone).' + (opts.submit ? ' Tap Check on the row that is your answer.' : ' Nothing here affects your score.')),
      rowsEl);
  }
  /* Drag: a drop is recorded only on a real pointerup. A pointercancel (iOS cancels touches for system gestures,
     scrolling or zoom, often reporting coordinates of 0) abandons the drag instead of dropping the tile somewhere. */
  function attachTileDrag(el, r, id, tilesEl, ws, api, gs, change) {
    el.addEventListener('pointerdown', function (ev) {
      if (api.done || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
      ev.preventDefault();
      var sx = ev.clientX, sy = ev.clientY, moved = false, ghost = null, pid = ev.pointerId;
      try { el.setPointerCapture(pid); } catch (e) { }
      function cleanup() {
        el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', cancel);
        if (ghost) ghost.remove(); el.classList.remove('dragging');
      }
      function move(e2) {
        if (e2.pointerId !== pid) return;
        if (!moved && Math.hypot(e2.clientX - sx, e2.clientY - sy) < 8) return;
        if (!moved) { moved = true; ghost = el.cloneNode(true); ghost.classList.add('tws-ghost'); document.body.appendChild(ghost); el.classList.add('dragging'); }
        ghost.style.left = (e2.clientX - 20) + 'px'; ghost.style.top = (e2.clientY - 24) + 'px';
      }
      function cancel(e2) { if (e2.pointerId !== pid) return; cleanup(); }
      function up(e2) {
        if (e2.pointerId !== pid) return;
        cleanup();
        var row = hCur(ws.hs).rows[r], from = row ? row.indexOf(id) : -1;
        if (from < 0) return;
        if (!moved) { // tap: select, or swap with the selected tile in the same row
          if (ws.sel && ws.sel.r === r && ws.sel.id !== id) { var other = ws.sel.id; change(function (rows) { var a = rows[r].indexOf(other), b = rows[r].indexOf(id); rows[r][a] = id; rows[r][b] = other; }); }
          else { ws.sel = ws.sel && ws.sel.r === r && ws.sel.id === id ? null : { r: r, id: id }; api.update(gs); }
          return;
        }
        var kids = Array.prototype.slice.call(tilesEl.children), best = from, bd = Infinity;
        kids.forEach(function (k, j) { var b = k.getBoundingClientRect(), d = Math.abs(e2.clientX - (b.left + b.width / 2)); if (d < bd) { bd = d; best = j; } });
        if (best !== from) change(function (rows) { var rw = rows[r], x = rw.splice(rw.indexOf(id), 1)[0]; rw.splice(best, 0, x); });
      }
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', cancel);
    });
  }

  /* --- B. step-by-step number workspace --- */
  function numSteps(p) {
    if (p.type === 'num' || p.type === 'multi') return p.steps.map(function (s, k) { return 'Before step ' + (p.steps.length - k) + ' (' + p.steps[p.steps.length - 1 - k] + ')'; });
    if (p.type === 'missing') return p.stepsShown.map(function (s, k) { return 'After step ' + (k + 1) + (s === '?' ? ' (missing)' : ' (' + s + ')'); });
    return ['Working 1', 'Working 2', 'Working 3'];
  }
  function numStart(p) { return { rows: numSteps(p).map(function (l) { return { label: l, expr: '' }; }) }; }
  function ensureNums(p, gs) {
    var ws = gs.nws;
    if (!ws || !ws.hs) {
      var w = function (rows) { return { rows: rows }; };
      var hs = ws && ws.rows ? hFromOld(numStart(p), (ws.hist || []).map(w), w(ws.rows), (ws.fut || []).map(w)) : hNew(numStart(p));
      ws = gs.nws = { hs: hs };
    }
    return ws;
  }
  function evalSafe(expr) { if (!expr || !expr.trim()) return ''; try { return PL.calc.evaluate(expr); } catch (e) { return '…'; } }
  function numWorkspace(api) {
    var p = api.p, gs = api.gs, ws = ensureNums(p, gs), rows = hCur(ws.hs).rows;
    var hb = histButtons(ws.hs, function () { api.update(gs); }, api.done);
    function refreshHist() { hb[0].disabled = api.done || ws.hs.idx === 0; hb[1].disabled = api.done || ws.hs.idx >= ws.hs.states.length - 1; hb[2].disabled = api.done || JSON.stringify(hCur(ws.hs)) === JSON.stringify(ws.hs.states[0]); }
    var change = function (fn) { var next = snap(hCur(ws.hs)); fn(next.rows); hCommit(ws.hs, next); api.update(gs); };
    var refFinal = p.type === 'missing' ? 'Start ' + p.start + ' → end ' + p.final : p.type === 'constraint' ? p.machines.map(function (m) { return m.name + ' output ' + m.out; }).join(' · ') : 'Final result ' + p.final;
    var list = h('div', { class: 'nws-rows' });
    rows.forEach(function (row, k) {
      var out = h('span', { class: 'nws-val mono' }, evalSafe(row.expr) ? '= ' + evalSafe(row.expr) : '');
      var lab = h('input', { class: 'nws-lab', value: row.label, 'aria-label': 'Row label' });
      var inp = h('input', { class: 'nws-in mono', value: row.expr, inputmode: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'e.g. 129591 + 20', 'aria-label': 'Calculation for ' + row.label });
      // typing: the first keystroke of each focus starts one new history entry; later keystrokes edit that entry
      var editing = false;
      var edit = function (field, el) {
        if (!editing) { var next = snap(hCur(ws.hs)); next.rows[k][field] = el.value; if (hCommit(ws.hs, next)) editing = true; }
        else hCur(ws.hs).rows[k][field] = el.value;
        refreshHist();
        if (field === 'expr') { var v = evalSafe(el.value); out.textContent = v ? '= ' + v : ''; }
        api.save(gs);
      };
      // leaving a field only saves: re-rendering here would close the keyboard and swallow the tap on the next field or button
      [lab, inp].forEach(function (el) { el.addEventListener('focus', function () { editing = false; }); el.addEventListener('blur', function () { editing = false; api.save(gs); }); });
      lab.addEventListener('input', function () { edit('label', lab); });
      inp.addEventListener('input', function () { edit('expr', inp); });
      list.appendChild(h('div', { class: 'nws-row' },
        h('div', { class: 'nws-top' }, lab,
          h('button', { class: 'btn ghost xs', 'aria-label': 'Move up', disabled: k === 0, onclick: function () { change(function (R) { var t = R[k - 1]; R[k - 1] = R[k]; R[k] = t; }); } }, '↑'),
          h('button', { class: 'btn ghost xs', 'aria-label': 'Move down', disabled: k === rows.length - 1, onclick: function () { change(function (R) { var t = R[k + 1]; R[k + 1] = R[k]; R[k] = t; }); } }, '↓'),
          h('button', { class: 'btn ghost xs', 'aria-label': 'Copy this result into the next row', disabled: !evalSafe(row.expr) || evalSafe(row.expr) === '…', onclick: function () { var v = evalSafe(row.expr).split(' ≈')[0]; change(function (R) { if (k === R.length - 1) R.push({ label: 'Working ' + (R.length + 1), expr: '' }); var nx = R[k + 1]; nx.expr = (nx.expr || '') + (/^-|\//.test(v) ? '(' + v + ')' : v); }); } }, 'Copy ↓'),
          h('button', { class: 'btn ghost xs', 'aria-label': 'Remove row', disabled: rows.length <= 1, onclick: function () { change(function (R) { R.splice(k, 1); }); } }, '✕')),
        h('div', { class: 'nws-bottom' }, inp, out)));
    });
    return h('div', { class: 'workspace' },
      h('div', { class: 'ws-head' }, h('span', { class: 'lbl' }, 'Workspace'), h('div', { class: 'row-actions' }, hb)),
      h('div', { class: 'muted small' }, refFinal + '. Write one calculation per row; each row shows its value. The workspace never solves anything for you and never affects your score.'),
      list,
      h('button', { class: 'btn ghost sm', onclick: function () { change(function (R) { R.push({ label: 'Working ' + (R.length + 1), expr: '' }); }); } }, '+ Add row'));
  }

  /* --- C. board workspace: transformations are tried on "Your board" (gs.cells mirrors the current snapshot) --- */
  function flipV(g, n) { var t = []; for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) t[(n - 1 - r) * n + c] = g[r * n + c]; return t; }
  function ensureBoard(p, gs) {
    if (!gs.bhs) {
      gs.bhs = hFromOld(p.final.slice(), gs.bh, gs.cells, gs.bf); delete gs.bh; delete gs.bf;
    }
    gs.cells = hCur(gs.bhs).slice();
    return gs.bhs;
  }
  function boardMove(api, fn, isSwap) { var gs = api.gs, hs = ensureBoard(api.p, gs); if (hCommit(hs, fn(hCur(hs).slice())) && isSwap) gs.swaps++; gs.cells = hCur(hs).slice(); api.update(gs); }
  function boardTools(api) {
    var p = api.p, gs = api.gs, n = p.n, hs = ensureBoard(p, gs);
    var sel = gs.sel, r = sel != null ? Math.floor(sel / n) : null, c = sel != null ? sel % n : null;
    var apply = function (fn) { boardMove(api, fn); };
    var after = function () { gs.cells = hCur(hs).slice(); gs.sel = null; api.update(gs); };
    var b = function (label, aria, fn, dis) { return h('button', { class: 'btn ghost xs', 'aria-label': aria, disabled: api.done || dis, onclick: fn }, label); };
    return h('div', { class: 'board-tools' },
      h('div', { class: 'row-actions' },
        b('Row ←', 'Slide the selected row left', function () { apply(function (g) { return GRID_OPS.rowL.f(g, n, r); }); }, sel == null),
        b('Row →', 'Slide the selected row right', function () { apply(function (g) { return GRID_OPS.rowR.f(g, n, r); }); }, sel == null),
        b('Col ↑', 'Slide the selected column up', function () { apply(function (g) { return GRID_OPS.colU.f(g, n, c); }); }, sel == null),
        b('Col ↓', 'Slide the selected column down', function () { apply(function (g) { return GRID_OPS.colD.f(g, n, c); }); }, sel == null)),
      h('div', { class: 'row-actions' },
        b('Turn ↻', 'Rotate the board clockwise', function () { apply(function (g) { return GRID_OPS.rotCW.f(g, n); }); }),
        b('Turn ↺', 'Rotate the board anticlockwise', function () { apply(function (g) { var x = g; for (var k = 0; k < 3; k++) x = GRID_OPS.rotCW.f(x, n); return x; }); }),
        b('Mirror ⇆', 'Flip left to right', function () { apply(function (g) { return GRID_OPS.flipH.f(g, n); }); }),
        b('Mirror ⇅', 'Flip top to bottom', function () { apply(function (g) { return flipV(g, n); }); })),
      h('div', { class: 'row-actions' }, histButtons(hs, after, api.done)),
      h('div', { class: 'muted small' }, 'Tap two squares to swap them. Select a square, then slide its row or column. Undo and Redo step through your moves exactly; Reset to start returns to the board afterwards. Moves are free experimentation; only Check counts.'));
  }

  function view(api) {
    var p = api.p, gs = api.gs;
    function submit(label) {
      if (api.done) return;
      gs.tries.push(label);
      if (check(p, gs)) { api.update(gs); api.finish('solved'); }
      else { api.wrong(); api.toast('Not right. Work backward from the end one step at a time.', 'bad'); api.update(gs); }
    }
    var head = h('div', null, h('div', { class: 'tagrow' }, h('span', { class: 'tag' }, p.typeName)), h('p', { class: 'prob' }, p.intro));
    var body = [];
    if (p.type === 'num' || p.type === 'multi') {
      body.push(stepsList(p.steps));
      body.push(h('div', { class: 're-final' }, h('span', { class: 'lbl' }, 'Result '), h('b', { class: 'mono' }, String(p.final))));
    }
    if (p.type === 'constraint') {
      p.machines.forEach(function (m) { body.push(h('div', { class: 're-machine' }, h('b', null, m.name), stepsList(m.steps), h('div', null, h('span', { class: 'lbl' }, 'Output '), h('b', { class: 'mono' }, String(m.out))))); });
    }
    if (p.type === 'missing') {
      body.push(h('div', { class: 're-final' }, h('span', { class: 'lbl' }, 'Start '), h('b', { class: 'mono' }, p.kind === 'num' ? String(p.start) : p.start.join(' '))));
      body.push(stepsList(p.stepsShown));
      body.push(h('div', { class: 're-final' }, h('span', { class: 'lbl' }, 'End '), h('b', { class: 'mono' }, p.kind === 'num' ? String(p.final) : p.final.join(' '))));
      body.push(h('div', { class: 'lbl' }, 'Possible operations'));
      p.gapIdx.forEach(function (gi, q) {
        body.push(h('div', { class: 'srow col' }, h('span', { class: 'sname' }, 'Missing step ' + (gi + 1)), h('div', { class: 'opts' }, p.menu.map(function (m, mi) {
          return h('button', { class: 'btn opt sm' + (gs.picks[q] === mi ? ' on' : ''), disabled: api.done, onclick: function () { gs.picks[q] = mi; api.update(gs); } }, PL.cap(m));
        }))));
      });
      body.push(h('button', { class: 'btn primary wide', disabled: api.done || gs.picks.some(function (x) { return x == null; }), onclick: function () { submit(gs.picks.map(function (x) { return p.menu[x]; }).join(' / ')); } }, 'Check'));
    }
    if (p.type === 'seq') {
      body.push(stepsList(p.steps));
      body.push(h('div', null, h('span', { class: 'lbl' }, 'Final row '), h('span', { class: 'mono re-row' }, p.final.join(' '))));
      body.push(h('p', { class: 'q' }, 'Rearrange the tiles back into the original row, then tap Check on that row.'));
      body.push(tileWorkspace(api, { submit: function (row) { gs.guess = row; submit(row.join('')); } }));
    }
    if (p.type === 'grid') {
      ensureBoard(p, gs);
      body.push(stepsList(p.steps));
      body.push(h('div', { class: 're-boards' },
        h('div', null, h('div', { class: 'lbl' }, 'Board afterwards'), gridView(p.final, p.n)),
        h('div', null, h('div', { class: 'lbl' }, 'Your board'), gridView(gs.cells, p.n, { sel: gs.sel, disabled: api.done, onclick: function (i) {
          if (gs.sel == null) { gs.sel = i; } else if (gs.sel === i) { gs.sel = null; } else { var a = gs.sel; gs.sel = null; boardMove(api, function (g) { var t = g[a]; g[a] = g[i]; g[i] = t; return g; }, true); return; }
          api.update(gs);
        } }))));
      if (!api.done) body.push(boardTools(api));
      if (gs.hintBoard) body.push(h('div', null, h('div', { class: 'lbl' }, 'Hint: an earlier board'), gridView(gs.hintBoard, p.n)));
      body.push(h('button', { class: 'btn primary wide', disabled: api.done, onclick: function () { submit('board'); } }, 'Check this board'));
    }
    if (p.type === 'num' || p.type === 'constraint' || (p.type === 'multi' && p.mode === 'list')) {
      var inp = h('input', { id: 're-in', class: 'txt', type: 'text', inputmode: p.type === 'multi' ? 'text' : 'numeric', autocomplete: 'off', placeholder: p.type === 'multi' ? 'e.g. 12, 21, 30' : 'Starting number', value: gs.input || '' });
      body.push(h('p', { class: 'q' }, p.ask));
      body.push(h('form', { class: 'row-in', onsubmit: function (e) { e.preventDefault(); gs.input = inp.value; if (!gs.input.trim()) return; submit(gs.input.trim()); } }, inp, h('button', { class: 'btn primary', type: 'submit', disabled: api.done }, 'Check')));
    }
    if (p.type === 'multi' && p.mode === 'fact') {
      body.push(h('p', { class: 'q' }, p.ask));
      body.push(h('div', { class: 'opts' }, p.options.map(function (o, i) { return h('button', { class: 'btn opt', disabled: api.done || gs.tries.indexOf(o) >= 0, onclick: function () { gs.choice = i; submit(o); } }, o); })));
    }
    if (gs.tries.length) body.push(h('div', { class: 'muted small' }, 'Tried: ' + gs.tries.join(' · ')));
    if (!api.done) {
      if (p.type === 'num' || p.type === 'multi' || p.type === 'constraint' || (p.type === 'missing' && p.kind === 'num')) body.push(numWorkspace(api));
      if (p.type === 'missing' && p.kind === 'seq') body.push(tileWorkspace(api, {}));
    }
    return h('div', { class: 'reverse' }, head, body);
  }

  /* ---------- hints: one backward step at a time ---------- */
  function hint(p, gs) {
    gs.hn = gs.hn || 0;
    var msg = null;
    if (p.type === 'num') {
      // trace[i] is the value before step i+1; reveal from the end backward, never the start itself
      var idx = p.trace.length - 2 - gs.hn;
      if (idx >= 1) msg = 'Before step ' + (idx + 1) + ' (' + p.steps[idx] + ') the number was ' + p.trace[idx] + '.';
    } else if (p.type === 'seq' || p.type === 'grid') {
      var j = p.trace.length - 2 - gs.hn;
      if (j >= 1) {
        msg = 'Before step ' + (j + 1) + ' the ' + (p.type === 'seq' ? 'row was ' + p.trace[j].join(' ') : 'board looked like the one shown below this hint') + '.';
        if (p.type === 'grid') gs.hintBoard = p.trace[j];
      } else if (p.type === 'seq' && gs.hn === p.trace.length - 2) {
        // last resort: fix the first wrong position
        msg = 'Position 1 of the original row is ' + p.answer[0] + '.';
      }
    } else if (p.type === 'missing') {
      if (gs.hn < p.gapIdx.length) msg = 'Missing step ' + (p.gapIdx[gs.hn] + 1) + ' is: ' + p.menu[p.answer[gs.hn]] + '.';
    } else if (p.type === 'multi') {
      if (p.mode === 'list') { if (gs.hn === 0) msg = 'There are exactly ' + p.starts.length + ' possible starting numbers.'; else if (gs.hn <= p.starts.length - 1) msg = p.starts[gs.hn - 1] + ' is one of them.'; }
      else { if (gs.hn === 0) msg = 'The possible starting numbers are ' + PL.listJoin(p.starts.map(String)) + '.'; }
    } else if (p.type === 'constraint') {
      if (gs.hn < p.machines.length) { var m = p.machines[gs.hn]; msg = m.name + ' alone allows: ' + m.cands.slice(0, 12).join(', ') + (m.cands.length > 12 ? '…' : '') + '.'; }
    }
    if (!msg) return { msg: 'No further hints — the remaining step is yours.', noCount: true };
    gs.hn++;
    return { msg: msg, gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var q = solved ? PL.clamp(100 - ctx.wrong * (p.type === 'multi' && p.mode === 'fact' ? 30 : 18) - ctx.hints * 12, 10, 100) : 0;
    var eff = null;
    if (p.type === 'grid' && solved) eff = { swaps: gs.swaps, best: minSwaps(p.final, p.answer) }; // recorded only; experimenting is never penalised
    return { quality: Math.round(q), metrics: { type: p.tkey, wrong: ctx.wrong, steps: (p.steps || p.stepsShown || []).length, eff: eff, unaided: solved && !ctx.hints },
      lines: [['Variation', p.typeName], ['Wrong answers', ctx.wrong]] };
  }
  function answerText(p) {
    if (p.type === 'num' || p.type === 'constraint') return String(p.answer);
    if (p.type === 'multi') return p.mode === 'list' ? p.answer.join(', ') : p.options[p.answer] + ' (leaving ' + p.unique + ')';
    if (p.type === 'seq') return p.answer.join(' ');
    if (p.type === 'missing') return p.answer.map(function (a, i) { return 'step ' + (p.gapIdx[i] + 1) + ': ' + p.menu[a]; }).join('; ');
    return '';
  }
  function review(p, gs) {
    var parts = [h('p', { class: 'prob' }, p.intro)];
    if (p.type === 'grid') parts.push(h('div', { class: 're-boards' }, h('div', null, h('div', { class: 'lbl' }, 'Original'), gridView(p.answer, p.n)), h('div', null, h('div', { class: 'lbl' }, 'Afterwards'), gridView(p.final, p.n))));
    else parts.push(h('div', null, h('span', { class: 'lbl' }, 'Answer '), h('b', { class: 'mono' }, answerText(p))));
    var lines = [];
    if (p.type === 'num') lines = p.trace.map(function (v, i) { return i === 0 ? 'Start: ' + v : 'After “' + p.steps[i - 1] + '”: ' + v; });
    if (p.type === 'seq') lines = p.trace.map(function (v, i) { return (i === 0 ? 'Start: ' : 'After “' + p.steps[i - 1] + '”: ') + v.join(' '); });
    if (p.type === 'grid') lines = p.steps.map(function (s, i) { return 'Undo step ' + (p.steps.length - i) + ' in reverse order: ' + p.steps[p.steps.length - 1 - i]; });
    if (p.type === 'missing') lines = ['Every combination of the listed operations was tried; only this one turns the start into the end.'];
    if (p.type === 'multi') lines = ['Checking every starting number in range, these produce the result: ' + p.starts.join(', ') + '.'];
    if (p.type === 'constraint') lines = p.machines.map(function (m) { return m.name + ' alone allows ' + m.cands.length + ' numbers: ' + m.cands.slice(0, 15).join(', ') + (m.cands.length > 15 ? '…' : ''); }).concat(['Only ' + p.answer + ' is allowed by every machine.']);
    parts.push(h('ol', { class: 'steps' }, lines.map(function (l) { return h('li', null, l); })));
    if (gs.tries && gs.tries.length) parts.push(h('div', { class: 'muted small' }, 'Your answers: ' + gs.tries.join(' · ')));
    return h('div', { class: 'review' }, parts);
  }
  function stats(atts) {
    var by = {}; atts.forEach(function (a) { var t = a.metrics && a.metrics.type; if (!t) return; (by[t] = by[t] || { n: 0, ok: 0, q: 0 }); by[t].n++; by[t].q += a.quality || 0; if (a.outcome === 'solved') by[t].ok++; });
    var rows = [['Accuracy', atts.length ? Math.round(100 * atts.filter(function (a) { return a.outcome === 'solved'; }).length / atts.length) + '%' : '—'],
      ['Solved without hints', atts.length ? Math.round(100 * atts.filter(function (a) { return a.metrics && a.metrics.unaided; }).length / atts.length) + '%' : '—']];
    Object.keys(by).forEach(function (t) { rows.push([TYPE_NAMES[t], by[t].ok + '/' + by[t].n + ' solved · avg ' + Math.round(by[t].q / by[t].n)]); });
    return rows;
  }
  PL.games.reverse = {
    id: 'reverse', name: 'Reverse Engineer', blurb: 'See the ending; work out how it started.',
    rules: 'You are shown the result of a sequence of steps. Reason backward to recover the starting number, row or board, the missing steps, or every start that could have led there. Hints reveal intermediate states working back from the end.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 60 + lv * 25; }, timeLimit: function (lv) { return 150 + lv * 30; },
    math: function (p) { return !!p.math; },
    _check: check, _tileRows: tileRows, _hist: { commit: hCommit, undo: hUndo, redo: hRedo, reset: hReset, cur: hCur, make: hNew }, _ensureTiles: ensureTiles, _ensureBoard: ensureBoard, _NUM: NUM_OPS, _run: runChain, _seqApply: seqApply, _GRID: GRID_OPS, _starts: startsFor
  };
})();

;
/* ===== GAME 10: WORD LINKS =====
   Two (or more) clues describe familiar compound words or phrases. The second part of each expression is the first part
   of the next: NEWS+PAPER, PAPER+PLATE → NEWS → PAPER → PLATE. All expressions come from a curated, validated bank. */
(function () {
  var h = PL.h;
  var IDX = null;
  function bank() { return PL.data.wordlinks || []; }
  function index() {
    if (IDX) return IDX;
    IDX = { byA: {} };
    bank().forEach(function (e, i) { e.i = i; (IDX.byA[e.a] = IDX.byA[e.a] || []).push(e); });
    return IDX;
  }
  function norm(s) { return String(s || '').toUpperCase().replace(/[^A-Z]/g, ''); }
  function accepts(e, input) {
    var g = norm(input); if (!g) return false;
    var forms = [e.text, e.a + e.b].concat(e.alts || []).map(norm);
    return forms.some(function (f) { return f === g || f + 'S' === g || f + 'ES' === g; });
  }
  function lenFor(lv, rng) { return lv <= 6 ? 2 : lv <= 8 ? (rng.chance(0.5) ? 3 : 2) : lv === 9 ? 3 : (rng.chance(0.4) ? 4 : 3); }
  function clueKind(lv, rng) { if (lv <= 3) return 'easy'; if (lv <= 6) return rng.chance((lv - 3) / 4) ? 'hard' : 'easy'; return 'hard'; }

  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), B = bank(), I = index();
    if (!B.length) throw new Error('Word Links data missing');
    var avoid = {}; ((ctx && ctx.recent) || []).slice(-40).forEach(function (k) { String(k).split('|').forEach(function (w) { avoid[w] = 1; }); });
    var n = lenFor(lv, rng);
    for (var t = 0; t < 2000; t++) {
      var first = rng.pick(B), chain = [first], parts = [first.a, first.b];
      var ok = true;
      for (var k = 1; k < n && ok; k++) {
        var prev = chain[chain.length - 1];
        var nexts = (I.byA[prev.b] || []).filter(function (e) { return parts.indexOf(e.b) < 0 && chain.indexOf(e) < 0; });
        if (!nexts.length) { ok = false; break; }
        var e = rng.pick(nexts); chain.push(e); parts.push(e.b);
      }
      if (!ok) continue;
      var shared = parts.slice(1, -1);
      if (t < 1500 && shared.some(function (w) { return avoid[w]; })) continue;
      var links = chain.map(function (e) { var kind = clueKind(lv, rng); return { a: e.a, b: e.b, text: e.text, alts: e.alts || [], clue: e[kind] || e.easy, kind: kind, i: e.i }; });
      // order of presentation: in chain order (the overlap is the puzzle); hard levels shuffle the clues
      var order = links.map(function (_, i) { return i; });
      if (lv >= 8) order = rng.shuffle(order);
      return { links: links, parts: parts, order: order, len: n, tkey: shared.join('|') };
    }
    throw new Error('word links generation failed');
  }
  function init(p) { return { solved: p.links.map(function () { return false; }), entries: p.links.map(function () { return []; }), reveal: p.parts.map(function () { return 0; }) }; }

  function partView(p, gs, i) {
    var w = p.parts[i], known = gs.solved.some(function (s, k) { return s && (k === i || k === i - 1); });
    var shared = i > 0 && i < p.parts.length - 1;
    var txt = known ? w : (gs.reveal[i] ? w.slice(0, gs.reveal[i]) + w.slice(gs.reveal[i]).replace(/./g, '·') : '?');
    return h('span', { class: 'wl-part' + (shared ? ' shared' : '') + (known ? '' : ' unknown') }, txt);
  }
  function view(api) {
    var p = api.p, gs = api.gs;
    var chain = h('div', { class: 'wl-chain', 'aria-label': 'Chain' });
    p.parts.forEach(function (_, i) { if (i) chain.appendChild(h('span', { class: 'muted' }, '→')); chain.appendChild(partView(p, gs, i)); });
    var rows = p.order.map(function (li, pos) {
      var L = p.links[li], solved = gs.solved[li];
      var inp = h('input', { id: 'wl-' + li, class: 'txt', type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'Expression ' + (pos + 1), enterkeyhint: 'go' });
      return h('div', { class: 'wl-clue' },
        h('div', { class: 'q' }, (pos + 1) + '. ' + L.clue),
        solved ? h('div', { class: 'wl-done mono' }, '✓ ' + L.text.toUpperCase()) :
          api.done ? null : h('form', { class: 'row-in', onsubmit: function (e) {
            e.preventDefault(); var v = inp.value.trim(); if (!v) return;
            gs.entries[li].push(v.toUpperCase());
            if (accepts(L, v)) {
              gs.solved[li] = true; api.toast('Yes — ' + L.text.toUpperCase(), 'good');
              api.update(gs);
              if (gs.solved.every(Boolean)) { api.finish('solved'); return; }
              var nextIdx = p.order.filter(function (x) { return !gs.solved[x]; })[0];
              setTimeout(function () { var el = document.getElementById('wl-' + nextIdx); if (el) el.focus(); }, 40);
            } else {
              api.wrong(); api.toast('Not that one.', 'bad'); api.update(gs);
              setTimeout(function () { var el = document.getElementById('wl-' + li); if (el) el.focus(); }, 40);
            }
          } }, inp, h('button', { class: 'btn primary', type: 'submit' }, 'Enter')),
        gs.entries[li].length && !solved ? h('div', { class: 'muted small' }, 'Tried: ' + gs.entries[li].join(', ')) : null);
    });
    return h('div', { class: 'links' },
      h('div', { class: 'muted small' }, 'Each answer is a familiar compound word or two-word phrase. The last part of one answer is the first part of the next' + (p.len > 2 ? ', all the way along the chain' : '') + '. Spaces and hyphens don’t matter.'),
      chain, rows);
  }
  /* Hints reveal parts of the chain: the shared word(s) first (first letter, then the whole word), then the outer words letter by letter. */
  function hint(p, gs) {
    var order = [];
    for (var i = 1; i < p.parts.length - 1; i++) order.push(i);
    order.push(0, p.parts.length - 1);
    for (var k = 0; k < order.length; k++) {
      var idx = order[k], w = p.parts[idx];
      var known = gs.solved.some(function (s, li) { return s && (li === idx || li === idx - 1); });
      if (known) continue;
      var interior = idx > 0 && idx < p.parts.length - 1;
      var cap = interior ? w.length : w.length - 1;
      if (gs.reveal[idx] >= cap) continue;
      gs.reveal[idx] = interior && gs.reveal[idx] >= 1 ? w.length : gs.reveal[idx] + 1;
      var nShared = p.parts.length - 2, ord = ['first', 'second', 'third'];
      var where = idx === 0 ? 'The first word' : idx === p.parts.length - 1 ? 'The last word' : nShared > 1 ? 'The ' + ord[idx - 1] + ' shared word' : 'The shared word';
      return { msg: gs.reveal[idx] >= w.length ? where + ' is ' + w + '.' : where + ' starts ' + w.slice(0, gs.reveal[idx]) + '…', gs: gs };
    }
    return { msg: 'Nothing more to reveal — you have every piece you need.', noCount: true };
  }
  function evaluate(p, gs, ctx) {
    var solvedN = gs.solved.filter(Boolean).length, all = solvedN === p.links.length;
    var q = all && ctx.outcome === 'solved' ? PL.clamp(100 - ctx.wrong * 8 - ctx.hints * 10, 10, 100) : Math.round(30 * solvedN / p.links.length);
    return { quality: Math.round(q), metrics: { len: p.len, wrong: ctx.wrong, solvedLinks: solvedN, hard: p.links.filter(function (l) { return l.kind === 'hard'; }).length, unaided: all && !ctx.hints },
      lines: [['Chain length', p.len + ' expressions'], ['Solved', solvedN + '/' + p.links.length], ['Wrong guesses', ctx.wrong]] };
  }
  function review(p, gs) {
    return h('div', { class: 'review' },
      h('div', { class: 'wl-chain' }, p.parts.map(function (w, i) { return [i ? h('span', { class: 'muted' }, '→') : null, h('span', { class: 'wl-part' + (i > 0 && i < p.parts.length - 1 ? ' shared' : '') }, w)]; })),
      h('ol', { class: 'steps' }, p.links.map(function (L, i) { return h('li', null, h('b', null, L.text.toUpperCase()), ' — ' + L.clue + (gs.entries && gs.entries[i].length ? ' (your entries: ' + gs.entries[i].join(', ') + ')' : '')); })));
  }
  function stats(atts) {
    var by = {}; atts.forEach(function (a) { var l = a.metrics && a.metrics.len; if (!l) return; (by[l] = by[l] || { n: 0, ok: 0, q: 0 }); by[l].n++; by[l].q += a.quality || 0; if (a.outcome === 'solved') by[l].ok++; });
    var rows = [['Accuracy', atts.length ? Math.round(100 * atts.filter(function (a) { return a.outcome === 'solved'; }).length / atts.length) + '%' : '—'],
      ['Average wrong guesses', atts.length ? PL.mean(atts.map(function (a) { return a.wrong || 0; })).toFixed(1) : '—'],
      ['Solved without hints', atts.length ? Math.round(100 * atts.filter(function (a) { return a.metrics && a.metrics.unaided; }).length / atts.length) + '%' : '—']];
    Object.keys(by).sort().forEach(function (l) { rows.push([l + '-link chains', by[l].ok + '/' + by[l].n + ' solved · avg ' + Math.round(by[l].q / by[l].n)]); });
    return rows;
  }
  PL.games.links = {
    id: 'links', name: 'Word Links', blurb: 'Solve overlapping compound words and phrases.',
    rules: 'Each clue points to a familiar compound word or two-word phrase. The second part of one answer is the first part of the next (NEWS → PAPER → PLATE). Solving one answer reveals the shared word, which helps with the next. Expert puzzles chain three or four answers.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 45 + lv * 15; }, timeLimit: function (lv) { return 120 + lv * 20; },
    _accepts: accepts
  };
})();

;
/* ===== GAME 3: LOGIC LAB ===== */
(function () {
  var h = PL.h;
  var NAMES = ['Ava', 'Ben', 'Cleo', 'Dara', 'Eli', 'Faye', 'Gus', 'Hana', 'Ivo', 'Jude', 'Kai', 'Lena', 'Milo', 'Nora', 'Otto', 'Pia', 'Rex', 'Sol', 'Tess', 'Uma', 'Vic', 'Wren'];

  /* ===================== Shared: permutations & assignment engine ===================== */
  function perms(n) {
    var out = [], a = []; for (var i = 0; i < n; i++) a.push(i);
    (function rec(k) {
      if (k === n) { out.push(a.slice()); return; }
      for (var i = k; i < n; i++) { var t = a[k]; a[k] = a[i]; a[i] = t; rec(k + 1); t = a[k]; a[k] = a[i]; a[i] = t; }
    })(0);
    return out;
  }
  var permCache = {};
  function permsC(n) { return permCache[n] || (permCache[n] = perms(n)); }

  /* ===================== 1. LOGIC GRID ===================== */
  var THEMES = [
    { title: 'Book club', intro: 'Members of a book club each chose a different genre and brought a different snack.', cats: [
      { name: 'Member', vals: null },
      { name: 'Genre', vals: ['mystery', 'poetry', 'history', 'sci-fi', 'memoir'], np: 'the {v} reader' },
      { name: 'Snack', vals: ['scones', 'olives', 'figs', 'pretzels', 'grapes'], np: 'the person who brought {v}' },
      { name: 'Age', vals: [31, 34, 37, 40, 43], num: true, np: 'the {v}-year-old', more: 'older', less: 'younger', unit: 'years', step: 3 }] },
    { title: 'Concert night', intro: 'Five musicians each play a different instrument, start at a different time and come from a different city.', cats: [
      { name: 'Musician', vals: null },
      { name: 'Instrument', vals: ['cello', 'flute', 'harp', 'oboe', 'viola'], np: 'the {v} player' },
      { name: 'City', vals: ['Lisbon', 'Oslo', 'Quito', 'Perth', 'Accra'], np: 'the musician from {v}' },
      { name: 'Start', vals: ['7:00', '7:15', '7:30', '7:45', '8:00'], num: true, nums: [0, 15, 30, 45, 60], np: 'the {v} performer', more: 'later', less: 'earlier', unit: 'minutes', step: 15, verbMore: 'starts', verb: 'starts' }] },
    { title: 'Garden show', intro: 'Gardeners each grew a different flower in a different plot and won a different ribbon colour.', cats: [
      { name: 'Gardener', vals: null },
      { name: 'Flower', vals: ['tulips', 'roses', 'irises', 'dahlias', 'lilies'], np: 'the person who grew {v}' },
      { name: 'Ribbon', vals: ['red', 'blue', 'white', 'gold', 'green'], np: 'the {v}-ribbon winner' },
      { name: 'Plot', vals: [1, 2, 3, 4, 5], num: true, np: 'the gardener in plot {v}', more: 'in a higher-numbered plot', less: 'in a lower-numbered plot', unit: 'plots', step: 1, rawCompare: true }] },
    { title: 'Bakery orders', intro: 'Customers each ordered a different cake in a different box, for pickup on different days.', cats: [
      { name: 'Customer', vals: null },
      { name: 'Cake', vals: ['lemon', 'carrot', 'almond', 'cherry', 'walnut'], np: 'the {v} cake customer' },
      { name: 'Box', vals: ['striped', 'plain', 'floral', 'dotted', 'gold'], np: 'the customer with the {v} box' },
      { name: 'Pickup', vals: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], num: true, nums: [1, 2, 3, 4, 5], np: 'the {v} pickup', more: 'later in the week', less: 'earlier in the week', unit: 'days', step: 1, rawCompare: true, verb: 'picks up' }] },
    { title: 'Hiking club', intro: 'Hikers each climbed a different peak carrying a different snack, and each hiked a different distance.', cats: [
      { name: 'Hiker', vals: null },
      { name: 'Peak', vals: ['Ash Ridge', 'Bell Top', 'Crow Hill', 'Dune Point', 'Echo Crag'], np: 'the hiker who climbed {v}' },
      { name: 'Snack', vals: ['trail mix', 'apples', 'jerky', 'cheese', 'dates'], np: 'the hiker with {v}' },
      { name: 'Distance', vals: [6, 8, 10, 12, 14], num: true, np: 'the {v} km hiker', more: 'farther', less: 'a shorter distance', unit: 'km', step: 2, verb: 'hiked' }] }
  ];

  function gridSpec(lv) {
    if (lv <= 2) return { n: 3, k: 3 };
    if (lv <= 4) return { n: 4, k: 3 };
    if (lv <= 6) return { n: 4, k: 4 };
    if (lv <= 8) return { n: 5, k: 3 };
    return { n: 5, k: 4 };
  }
  function gridGen(lv, rng) {
    var sp = gridSpec(lv), th = rng.pick(THEMES);
    var n = sp.n;
    var people = rng.shuffle(NAMES).slice(0, n).sort();
    var catIdx = [0].concat(rng.shuffle([1, 2, 3]).slice(0, sp.k - 1).sort());
    if (sp.k === 4) catIdx = [0, 1, 2, 3];
    // numeric category must keep consecutive values to make relations meaningful
    var cats = catIdx.map(function (ci) {
      var c = th.cats[ci];
      if (ci === 0) return { name: c.name, vals: people, np: '{v}' };
      var o = PL.deep(c);
      o.vals = c.vals.slice(0, n);
      if (c.nums) o.nums = c.nums.slice(0, n);
      return o;
    });
    // 5-item 4-cat (k=4,n=5) is too big to brute force: use n=5,k=3 or n=4,k=4
    if (n === 5 && sp.k === 4) { cats = cats.slice(0, 3); if (!cats.some(function (c) { return c.num; })) cats[2] = (function () { var c = PL.deep(th.cats[3]); c.vals = c.vals.slice(0, n); if (c.nums) c.nums = c.nums.slice(0, n); return c; })(); }
    var K = cats.length;
    var sol = []; for (var c = 1; c < K; c++) sol.push(rng.shuffle(seq(n)));
    var P = { type: 'grid', title: th.title, intro: th.intro, cats: cats, n: n, sol: sol };
    var all = gridAll(n, K);
    var cand = all.slice();
    var clues = [];
    var weights = lv <= 3 ? { pos: 4, neg: 3, rel: 2, either: 1, pair: 1 } : lv <= 6 ? { pos: 2, neg: 4, rel: 3, either: 2, pair: 2 } : { pos: 1, neg: 4, rel: 4, either: 3, pair: 3 };
    for (var guard = 0; guard < 400 && cand.length > 1; guard++) {
      var cl = gridRandClue(P, rng, weights);
      if (!cl || !gridEval(P, cl, sol)) continue;
      var nc = cand.filter(function (s) { return gridEval(P, cl, s); });
      if (nc.length === cand.length) continue;
      if (lv >= 5 && cl.t === 'pos' && nc.length === 1 && clues.length < 4) continue; // avoid trivial finishes
      clues.push(cl); cand = nc;
    }
    if (cand.length !== 1) return null;
    // minimise
    for (var i = clues.length - 1; i >= 0; i--) {
      var rest = clues.slice(0, i).concat(clues.slice(i + 1));
      var cnt = 0;
      for (var j = 0; j < all.length && cnt < 2; j++) if (rest.every(function (x) { return gridEval(P, x, all[j]); })) cnt++;
      if (cnt === 1) clues = rest;
    }
    P.clues = rng.shuffle(clues);
    P.clueText = P.clues.map(function (c) { return gridClueText(P, c); });
    return P;
  }
  function seq(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function gridAll(n, K) {
    var ps = permsC(n), out = [[]];
    for (var c = 1; c < K; c++) { var nx = []; out.forEach(function (o) { ps.forEach(function (p) { nx.push(o.concat([p])); }); }); out = nx; }
    return out;
  }
  function ent(P, s, it) { return it.c === 0 ? it.v : s[it.c - 1].indexOf(it.v); }
  function numVal(P, c, v) { var cat = P.cats[c]; return cat.nums ? cat.nums[v] : cat.vals[v]; }
  function valOfEnt(P, s, c, e) { return c === 0 ? e : s[c - 1][e]; }
  function gridEval(P, cl, s) {
    var ea = ent(P, s, cl.a), eb = cl.b ? ent(P, s, cl.b) : null;
    if (cl.t === 'pos') return ea === eb;
    if (cl.t === 'neg') return ea !== eb;
    if (cl.t === 'either') return ea === eb || ea === ent(P, s, cl.c2);
    if (cl.t === 'pair') { var ec = ent(P, s, cl.c2), ed = ent(P, s, cl.d); return (ea === ec && eb === ed) || (ea === ed && eb === ec); }
    if (cl.t === 'rel') {
      var va = numVal(P, cl.nc, valOfEnt(P, s, cl.nc, ea)), vb = numVal(P, cl.nc, valOfEnt(P, s, cl.nc, eb));
      if (ea === eb) return false;
      if (cl.d != null) return va - vb === cl.d;
      return cl.dir > 0 ? va > vb : va < vb;
    }
    return true;
  }
  function gridRandClue(P, rng, wts) {
    var K = P.cats.length, n = P.n, s = P.sol;
    var t = rng.weighted(Object.keys(wts), Object.keys(wts).map(function (k) { return wts[k]; }));
    var numC = -1; P.cats.forEach(function (c, i) { if (c.num) numC = i; });
    var item = function (c, v) { return { c: c, v: v }; };
    var rItem = function (excl) { var c; do { c = rng.int(0, K - 1); } while (excl != null && c === excl); return item(c, rng.int(0, n - 1)); };
    if (t === 'pos' || t === 'neg') { var a = rItem(), b = rItem(a.c); if (a.c === numC && b.c === numC) return null; return { t: t, a: a, b: b }; }
    if (t === 'either') { var a2 = rItem(), c2 = rng.int(0, K - 1); if (c2 === a2.c) return null; var v1 = rng.int(0, n - 1), v2 = rng.int(0, n - 1); if (v1 === v2) return null; return { t: 'either', a: a2, b: item(c2, v1), c2: item(c2, v2) }; }
    if (t === 'pair') {
      var ca = rng.int(0, K - 1), cb = rng.int(0, K - 1); if (ca === cb) return null;
      var x1 = rng.int(0, n - 1), x2 = rng.int(0, n - 1), y1 = rng.int(0, n - 1), y2 = rng.int(0, n - 1);
      if (x1 === x2 || y1 === y2) return null;
      return { t: 'pair', a: item(ca, x1), b: item(ca, x2), c2: item(cb, y1), d: item(cb, y2) };
    }
    if (t === 'rel' && numC >= 0) {
      var p = rItem(numC), q = rItem(numC);
      var useD = rng.chance(0.5);
      var ep = ent(P, s, p), eq = ent(P, s, q); if (ep === eq) return null;
      var vp = numVal(P, numC, valOfEnt(P, s, numC, ep)), vq = numVal(P, numC, valOfEnt(P, s, numC, eq));
      return { t: 'rel', a: p, b: q, nc: numC, d: useD ? vp - vq : null, dir: vp > vq ? 1 : -1 };
    }
    return null;
  }
  function np(P, it) { var c = P.cats[it.c]; return c.np.replace('{v}', c.vals[it.v]); }
  function gridClueText(P, cl) {
    var A = PL.cap(np(P, cl.a));
    if (cl.t === 'pos') return A + ' is ' + np(P, cl.b) + '.';
    if (cl.t === 'neg') return A + ' is not ' + np(P, cl.b) + '.';
    if (cl.t === 'either') return A + ' is either ' + np(P, cl.b) + ' or ' + np(P, cl.c2) + '.';
    if (cl.t === 'pair') return 'Of ' + np(P, cl.a) + ' and ' + np(P, cl.b) + ', one is ' + np(P, cl.c2) + ' and the other is ' + np(P, cl.d) + '.';
    var nc = P.cats[cl.nc], up = cl.d != null ? cl.d > 0 : cl.dir > 0;
    var word = up ? nc.more : nc.less;
    if (cl.d != null) {
      var amt = Math.abs(cl.d);
      if (nc.rawCompare) return A + (nc.verb ? ' ' + nc.verb + ' ' + amt + ' ' + (amt === 1 ? nc.unit.replace(/s$/, '') : nc.unit) + ' ' + word.replace(/^in a /, '').replace('later in the week', 'later').replace('earlier in the week', 'earlier') + ' than ' : ' is ' + amt + ' ' + (amt === 1 ? nc.unit.replace(/s$/, '') : nc.unit) + ' ' + (up ? 'higher' : 'lower') + ' than ') + np(P, cl.b) + '.';
      if (nc.verb) return A + ' ' + nc.verb + ' ' + amt + ' ' + nc.unit + ' ' + word + ' than ' + np(P, cl.b) + '.';
      return A + ' is ' + amt + ' ' + nc.unit + ' ' + word + ' than ' + np(P, cl.b) + '.';
    }
    if (nc.verb) return A + ' ' + nc.verb + ' ' + word + ' than ' + np(P, cl.b) + '.';
    return A + ' is ' + word + ' than ' + np(P, cl.b) + '.';
  }

  /* ===================== 2. ORDERING ===================== */
  var ORDER_THEMES = [
    { title: 'Photo finish', intro: 'Runners crossed the finish line one at a time.', pos: 'place', first: '1st', ahead: 'finished ahead of', behind: 'finished behind', imm: 'finished immediately ahead of', at: 'finished in {p} place', notEnd: 'did not finish first or last', ord: true },
    { title: 'Bookshelf', intro: 'Books stand in a single row on a shelf, numbered from the left.', pos: 'slot', first: 'leftmost', ahead: 'is somewhere to the left of', behind: 'is somewhere to the right of', imm: 'is directly to the left of', at: 'is in slot {n}', notEnd: 'is not at either end', items: ['Atlas', 'Bible', 'Cookbook', 'Diary', 'Encyclopedia', 'Field guide', 'Gazetteer'] },
    { title: 'Apartment floors', intro: 'Neighbours each live on a different floor of a small building, numbered from the bottom.', pos: 'floor', first: 'lowest', ahead: 'lives below', behind: 'lives above', imm: 'lives directly below', at: 'lives on floor {n}', notEnd: 'lives on neither the top nor the bottom floor' }
  ];
  function ordPlace(k) { return k + (k === 1 ? 'st' : k === 2 ? 'nd' : k === 3 ? 'rd' : 'th'); }
  function orderGen(lv, rng) {
    var n = PL.clamp(3 + Math.ceil(lv / 2), 4, 7);
    var th = rng.pick(ORDER_THEMES);
    var items = th.items ? rng.shuffle(th.items).slice(0, n) : rng.shuffle(NAMES).slice(0, n);
    items.sort();
    var sol = rng.shuffle(seq(n)); // sol[item] = position
    var P = { type: 'order', title: th.title, intro: th.intro + ' Work out the full order.', items: items, n: n, th: ORDER_THEMES.indexOf(th), sol: sol };
    var all = permsC(n), cand = all.slice(), clues = [];
    var wts = lv <= 3 ? { before: 3, imm: 2, at: 2, notAdj: 1, between: 1, notEnd: 1 } : lv <= 7 ? { before: 4, imm: 2, at: 1, notAdj: 2, between: 2, notEnd: 1 } : { before: 5, imm: 1, at: 0.5, notAdj: 3, between: 3, notEnd: 2 };
    for (var g = 0; g < 500 && cand.length > 1; g++) {
      var cl = orderRandClue(P, rng, wts);
      if (!cl || !orderEval(cl, sol)) continue;
      var nc = cand.filter(function (s) { return orderEval(cl, s); });
      if (nc.length === cand.length) continue;
      clues.push(cl); cand = nc;
    }
    if (cand.length !== 1) return null;
    for (var i = clues.length - 1; i >= 0; i--) {
      var rest = clues.slice(0, i).concat(clues.slice(i + 1)), cnt = 0;
      for (var j = 0; j < all.length && cnt < 2; j++) if (rest.every(function (x) { return orderEval(x, all[j]); })) cnt++;
      if (cnt === 1) clues = rest;
    }
    P.clues = rng.shuffle(clues);
    P.clueText = P.clues.map(function (c) { return orderText(P, c); });
    return P;
  }
  function orderRandClue(P, rng, wts) {
    var n = P.n, t = rng.weighted(Object.keys(wts), Object.keys(wts).map(function (k) { return wts[k]; }));
    var a = rng.int(0, n - 1), b = rng.int(0, n - 1);
    if (t === 'at') return { t: 'at', a: a, p: P.sol[a] };
    if (t === 'notEnd') return { t: 'notEnd', a: a };
    if (a === b) return null;
    if (t === 'before') return { t: 'before', a: a, b: b };
    if (t === 'imm') return { t: 'imm', a: a, b: b };
    if (t === 'notAdj') return { t: 'notAdj', a: a, b: b };
    if (t === 'between') return { t: 'between', a: a, b: b, k: Math.abs(P.sol[a] - P.sol[b]) - 1 };
    return null;
  }
  function orderEval(cl, s) {
    if (cl.t === 'at') return s[cl.a] === cl.p;
    if (cl.t === 'notEnd') return s[cl.a] !== 0 && s[cl.a] !== s.length - 1;
    if (cl.t === 'before') return s[cl.a] < s[cl.b];
    if (cl.t === 'imm') return s[cl.b] - s[cl.a] === 1;
    if (cl.t === 'notAdj') return Math.abs(s[cl.a] - s[cl.b]) !== 1;
    if (cl.t === 'between') return Math.abs(s[cl.a] - s[cl.b]) - 1 === cl.k;
    return true;
  }
  function orderText(P, cl) {
    var th = ORDER_THEMES[P.th], A = P.items[cl.a], B = cl.b != null ? P.items[cl.b] : '';
    var art = th.items ? 'The ' : '';
    var nmA = th.items ? art + A.toLowerCase() : A, nmB = th.items ? 'the ' + B.toLowerCase() : B;
    if (cl.t === 'at') return nmA + ' ' + th.at.replace('{p}', ordPlace(cl.p + 1)).replace('{n}', cl.p + 1) + '.';
    if (cl.t === 'notEnd') return nmA + ' ' + th.notEnd + '.';
    if (cl.t === 'before') return nmA + ' ' + th.ahead + ' ' + nmB + '.';
    if (cl.t === 'imm') return nmA + ' ' + th.imm + ' ' + nmB + '.';
    if (cl.t === 'notAdj') return nmA + ' and ' + nmB + ' are not next to each other.';
    if (cl.t === 'between') return cl.k === 0 ? nmA + ' and ' + nmB + ' are next to each other.' : 'Exactly ' + PL.plural(cl.k, th.items ? 'book' : 'person', th.items ? 'books' : 'people') + ' ' + (cl.k === 1 ? 'is' : 'are') + ' between ' + nmA.replace(/^The /, 'the ') + ' and ' + nmB + '.';
    return '';
  }

  /* ===================== 3. SCHEDULING ===================== */
  function partitions(n, D, cap) { // all assignments person -> day with exactly cap per day
    var out = [], a = [], cnt = []; for (var d = 0; d < D; d++) cnt.push(0);
    (function rec(i) {
      if (i === n) { out.push(a.slice()); return; }
      for (var d = 0; d < D; d++) if (cnt[d] < cap) { a[i] = d; cnt[d]++; rec(i + 1); cnt[d]--; }
    })(0);
    return out;
  }
  var SCHED_THEMES = [
    { title: 'Volunteer rota', intro: 'Volunteers are scheduled at a food bank, with the same number on each day.', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], unit: 'day' },
    { title: 'Lab shifts', intro: 'Researchers share lab shifts, with the same number on each shift.', days: ['early shift', 'midday shift', 'late shift', 'night shift'], unit: 'shift' },
    { title: 'Conference talks', intro: 'Speakers are placed in sessions, with the same number in each session.', days: ['Session 1', 'Session 2', 'Session 3', 'Session 4'], unit: 'session' }
  ];
  function schedGen(lv, rng) {
    var cfg = lv <= 4 ? { D: 3, cap: 2 } : lv <= 7 ? { D: 4, cap: 2 } : { D: 3, cap: 3 };
    var n = cfg.D * cfg.cap, th = rng.pick(SCHED_THEMES);
    var people = rng.shuffle(NAMES).slice(0, n).sort();
    var all = partitions(n, cfg.D, cfg.cap);
    var sol = rng.pick(all);
    var P = { type: 'sched', title: th.title, intro: th.intro + ' There are ' + n + ' people, ' + cfg.D + ' ' + th.unit + 's, and ' + cfg.cap + ' people per ' + th.unit + '. Assign everyone.', people: people, days: th.days.slice(0, cfg.D), n: n, D: cfg.D, cap: cfg.cap, unit: th.unit, sol: sol };
    var cand = all.slice(), clues = [];
    var wts = lv <= 4 ? { same: 2, diff: 3, on: 2, noton: 2, earlier: 2, next: 1 } : { same: 2, diff: 3, on: 0.5, noton: 3, earlier: 3, next: 2, cond: 2 };
    for (var g = 0; g < 600 && cand.length > 1; g++) {
      var cl = schedRand(P, rng, wts);
      if (!cl || !schedEval(cl, sol)) continue;
      var nc = cand.filter(function (s) { return schedEval(cl, s); });
      if (nc.length === cand.length) continue;
      clues.push(cl); cand = nc;
    }
    if (cand.length !== 1) return null;
    for (var i = clues.length - 1; i >= 0; i--) {
      var rest = clues.slice(0, i).concat(clues.slice(i + 1)), cnt = 0;
      for (var j = 0; j < all.length && cnt < 2; j++) if (rest.every(function (x) { return schedEval(x, all[j]); })) cnt++;
      if (cnt === 1) clues = rest;
    }
    P.clues = rng.shuffle(clues);
    P.clueText = P.clues.map(function (c) { return schedText(P, c); });
    return P;
  }
  function schedRand(P, rng, wts) {
    var t = rng.weighted(Object.keys(wts), Object.keys(wts).map(function (k) { return wts[k]; }));
    var a = rng.int(0, P.n - 1), b = rng.int(0, P.n - 1), d = rng.int(0, P.D - 1);
    if (t === 'on') return { t: 'on', a: a, d: d };
    if (t === 'noton') return { t: 'noton', a: a, d: d };
    if (a === b) return null;
    if (t === 'cond') { var c = rng.int(0, P.n - 1); if (c === a || c === b) return null; return { t: 'cond', a: a, d: d, b: b, c: c }; }
    return { t: t, a: a, b: b };
  }
  function schedEval(cl, s) {
    if (cl.t === 'on') return s[cl.a] === cl.d;
    if (cl.t === 'noton') return s[cl.a] !== cl.d;
    if (cl.t === 'same') return s[cl.a] === s[cl.b];
    if (cl.t === 'diff') return s[cl.a] !== s[cl.b];
    if (cl.t === 'earlier') return s[cl.a] < s[cl.b];
    if (cl.t === 'next') return s[cl.b] - s[cl.a] === 1;
    if (cl.t === 'cond') return s[cl.a] !== cl.d || s[cl.b] === s[cl.c];
    return true;
  }
  function schedText(P, cl) {
    var A = P.people[cl.a], B = cl.b != null ? P.people[cl.b] : '', D = cl.d != null ? P.days[cl.d] : '';
    var on = P.unit === 'day' ? 'on ' : P.unit === 'session' ? 'in ' : 'on the ';
    if (cl.t === 'on') return A + ' is ' + on + D + '.';
    if (cl.t === 'noton') return A + ' is not ' + on + D + '.';
    if (cl.t === 'same') return A + ' and ' + B + ' are on the same ' + P.unit + '.';
    if (cl.t === 'diff') return A + ' and ' + B + ' are on different ' + P.unit + 's.';
    if (cl.t === 'earlier') return A + '’s ' + P.unit + ' comes before ' + B + '’s.';
    if (cl.t === 'next') return B + '’s ' + P.unit + ' comes directly after ' + A + '’s.';
    if (cl.t === 'cond') return 'If ' + A + ' is ' + on + D + ', then ' + B + ' and ' + P.people[cl.c] + ' share a ' + P.unit + '.';
    return '';
  }

  /* ===================== 4. KNIGHTS AND KNAVES ===================== */
  function kkGen(lv, rng) {
    var n = lv <= 3 ? 3 : lv <= 7 ? 4 : 5;
    var people = rng.shuffle(NAMES).slice(0, n);
    var all = []; for (var m = 0; m < (1 << n); m++) { var a = []; for (var i = 0; i < n; i++) a.push((m >> i) & 1); all.push(a); } // 1 = knight
    for (var tries = 0; tries < 200; tries++) {
      var sol = rng.pick(all);
      var stmts = [];
      for (var i2 = 0; i2 < n; i2++) {
        // each speaker makes one statement; statement truth must equal speaker type
        for (var t = 0; t < 40; t++) {
          var st = kkRand(rng, n, i2, lv);
          if (kkEval(st, sol) === !!sol[i2]) { stmts.push(st); break; }
        }
        if (stmts.length !== i2 + 1) break;
      }
      if (stmts.length !== n) continue;
      var sols = all.filter(function (s) { return stmts.every(function (st, k) { return kkEval(st, s) === !!s[k]; }); });
      if (sols.length !== 1) continue;
      // avoid puzzles where every statement is a direct "X is a knave" (too formulaic) at higher levels
      var kinds = {}; stmts.forEach(function (s) { kinds[s.t] = 1; });
      if (lv >= 5 && Object.keys(kinds).length < 2) continue;
      var P = { type: 'kk', title: 'Island of knights and knaves', intro: 'Every inhabitant is either a knight, who always tells the truth, or a knave, who always lies. You meet ' + PL.listJoin(people) + '. Decide who is which.', people: people, n: n, stmts: stmts, sol: sol };
      P.clueText = stmts.map(function (s, k) { return people[k] + ' says: “' + kkText(s, people, k) + '”'; });
      return P;
    }
    return null;
  }
  function kkRand(rng, n, sp, lv) {
    var others = seq(n).filter(function (i) { return i !== sp; });
    var pool = lv <= 3 ? ['is', 'is', 'same', 'count'] : ['is', 'same', 'count', 'atleast', 'if', 'or'];
    var t = rng.pick(pool);
    if (t === 'is') return { t: 'is', x: rng.pick(others), k: rng.int(0, 1) };
    if (t === 'same') { var x = rng.pick(others), y = rng.pick(seq(n).filter(function (i) { return i !== x; })); return { t: 'same', x: x, y: y, same: rng.int(0, 1) }; }
    if (t === 'count') return { t: 'count', k: rng.int(0, Math.min(2, n)), knights: rng.int(0, 1) };
    if (t === 'atleast') return { t: 'atleast', k: rng.int(1, Math.min(3, n - 1)), knights: rng.int(0, 1) };
    if (t === 'if') { var p = rng.pick(others), q = rng.pick(seq(n).filter(function (i) { return i !== p; })); return { t: 'if', p: p, pk: rng.int(0, 1), q: q, qk: rng.int(0, 1) }; }
    return { t: 'or', p: sp, pk: 0, q: rng.pick(others), qk: rng.int(0, 1) }; // "I am a knave or X is a knight"
  }
  function kkEval(st, s) {
    var cntK = s.reduce(function (a, b) { return a + b; }, 0), n = s.length;
    if (st.t === 'is') return s[st.x] === st.k;
    if (st.t === 'same') return (s[st.x] === s[st.y]) === !!st.same;
    if (st.t === 'count') return (st.knights ? cntK : n - cntK) === st.k;
    if (st.t === 'atleast') return (st.knights ? cntK : n - cntK) >= st.k;
    if (st.t === 'if') return s[st.p] !== st.pk || s[st.q] === st.qk;
    if (st.t === 'or') return s[st.p] === st.pk || s[st.q] === st.qk;
    return false;
  }
  function kkText(st, ppl, sp) {
    var kind = function (k) { return k ? 'a knight' : 'a knave'; };
    var nm = function (i) { return i === sp ? 'I' : ppl[i]; };
    var be = function (i) { return i === sp ? 'am' : 'is'; };
    if (st.t === 'is') return ppl[st.x] + ' is ' + kind(st.k) + '.';
    if (st.t === 'same') return (st.x === sp || st.y === sp ? (st.x === sp ? 'I' : ppl[st.x]) + ' and ' + (st.y === sp ? 'I' : ppl[st.y]) : ppl[st.x] + ' and ' + ppl[st.y]) + (st.same ? ' are the same kind.' : ' are different kinds.');
    if (st.t === 'count') return (st.k === 0 ? 'None' : 'Exactly ' + ['zero', 'one', 'two', 'three'][st.k]) + ' of us ' + (st.k === 1 ? 'is ' : 'are ') + (st.knights ? (st.k === 1 ? 'a knight' : 'knights') : (st.k === 1 ? 'a knave' : 'knaves')) + '.';
    if (st.t === 'atleast') return 'At least ' + ['zero', 'one', 'two', 'three'][st.k] + ' of us ' + (st.k === 1 ? 'is ' : 'are ') + (st.knights ? (st.k === 1 ? 'a knight' : 'knights') : (st.k === 1 ? 'a knave' : 'knaves')) + '.';
    if (st.t === 'if') return 'If ' + nm(st.p) + ' ' + be(st.p) + ' ' + kind(st.pk) + ', then ' + nm(st.q) + ' ' + be(st.q) + ' ' + kind(st.qk) + '.';
    return nm(st.p) + ' ' + be(st.p) + ' ' + kind(st.pk) + ', or ' + nm(st.q) + ' ' + be(st.q) + ' ' + kind(st.qk) + '.';
  }

  /* ===================== 5. CONDITIONAL REASONING ===================== */
  var ATOMS = [
    ['the gallery is open', 'the gallery is closed'], ['Jo takes the train', 'Jo does not take the train'], ['the meeting runs late', 'the meeting does not run late'],
    ['the lights are on', 'the lights are off'], ['the report is approved', 'the report is not approved'], ['it snows', 'it does not snow'],
    ['the road is gritted', 'the road is not gritted'], ['Sam brings dessert', 'Sam does not bring dessert'], ['the alarm sounds', 'the alarm does not sound'],
    ['the market is busy', 'the market is quiet'], ['the bridge is raised', 'the bridge is lowered'], ['Kim wins the vote', 'Kim does not win the vote'],
    ['the ferry runs', 'the ferry does not run'], ['the server restarts', 'the server does not restart'], ['the kiln is lit', 'the kiln is not lit']
  ];
  function condGen(lv, rng) {
    var nv = lv <= 4 ? 3 : 4;
    var atoms = rng.shuffle(ATOMS).slice(0, nv);
    var asg = []; for (var m = 0; m < (1 << nv); m++) { var a = []; for (var i = 0; i < nv; i++) a.push((m >> i) & 1); asg.push(a); }
    var lit = function (v, pos) { return { v: v, p: pos }; };
    for (var tries = 0; tries < 300; tries++) {
      var np_ = lv <= 4 ? rng.int(2, 3) : rng.int(3, 4);
      var prem = [];
      var forms = lv <= 4 ? ['imp', 'imp', 'or', 'fact'] : ['imp', 'onlyif', 'or', 'nand', 'unless', 'fact', 'iff'];
      for (var k = 0; k < np_; k++) {
        var f = rng.pick(forms), x = rng.int(0, nv - 1), y = rng.int(0, nv - 1);
        if (f !== 'fact' && x === y) { k--; continue; }
        prem.push(f === 'fact' ? { f: f, a: lit(x, rng.int(0, 1)) } : { f: f, a: lit(x, rng.int(0, 1)), b: lit(y, rng.int(0, 1)) });
      }
      if (prem.filter(function (p) { return p.f === 'fact'; }).length > 1) continue;
      var models = asg.filter(function (s) { return prem.every(function (p) { return premEval(p, s); }); });
      if (!models.length || models.length === asg.length) continue;
      var used = {}; prem.forEach(function (q) { used[q.a.v] = 1; if (q.b) used[q.b.v] = 1; });
      if (Object.keys(used).length < nv) continue;
      var askMust = lv <= 6 ? true : rng.chance(0.6);
      // candidate statements: literals and implications
      var cands = [];
      for (var v = 0; v < nv; v++) for (var pp = 0; pp < 2; pp++) cands.push({ f: 'fact', a: lit(v, pp) });
      for (var v1 = 0; v1 < nv; v1++) for (var v2 = 0; v2 < nv; v2++) if (v1 !== v2) for (var s1 = 0; s1 < 2; s1++) for (var s2 = 0; s2 < 2; s2++) cands.push({ f: 'imp', a: lit(v1, s1), b: lit(v2, s2) });
      var isPrem = function (c) { return prem.some(function (p) { return JSON.stringify(p) === JSON.stringify(c) || (p.f === 'fact' && c.f === 'fact' && p.a.v === c.a.v && p.a.p === c.a.p); }); };
      var must = function (c) { return models.every(function (s) { return premEval(c, s); }); };
      var could = function (c) { return models.some(function (s) { return premEval(c, s); }); };
      var good, bad;
      if (askMust) {
        good = cands.filter(function (c) { return must(c) && !isPrem(c) && !(c.f === 'imp' && contrapositiveOfPrem(c, prem)) && !(c.f === 'imp' && !models.some(function (s) { return L(c.a, s); })) && !(c.f === 'imp' && models.every(function (s) { return L(c.b, s); })); });
        bad = cands.filter(function (c) { return !must(c); });
      } else {
        good = cands.filter(function (c) { return could(c) && !must(c) && c.f === 'fact'; });
        bad = cands.filter(function (c) { return !could(c); });
      }
      if (!good.length || bad.length < 3) continue;
      var g = rng.pick(good);
      // prefer a "converse error" distractor for implication answers
      var opts = rng.shuffle([g].concat(rng.shuffle(bad).slice(0, 3)));
      var P = { type: 'cond', title: 'If and only if', intro: 'Assume every statement below is true.', atoms: atoms, prem: prem, nv: nv, ask: askMust ? 'Which of these must be true?' : 'Which of these could be true? (Exactly one is consistent with the statements.)', opts: opts, ans: opts.indexOf(g), askMust: askMust };
      P.clueText = prem.map(function (p) { return condText(p, atoms); });
      P.optText = opts.map(function (o) { return condText(o, atoms); });
      return P;
    }
    return null;
  }
  function contrapositiveOfPrem(c, prem) {
    return prem.some(function (p) { return p.f === 'imp' && p.a.v === c.b.v && p.b.v === c.a.v && p.a.p !== c.b.p && p.b.p !== c.a.p; });
  }
  function L(lt, s) { return s[lt.v] === lt.p; }
  function premEval(p, s) {
    if (p.f === 'fact') return L(p.a, s);
    if (p.f === 'imp') return !L(p.a, s) || L(p.b, s);
    if (p.f === 'onlyif') return !L(p.a, s) || L(p.b, s); // A only if B == A -> B
    if (p.f === 'or') return L(p.a, s) || L(p.b, s);
    if (p.f === 'nand') return !(L(p.a, s) && L(p.b, s));
    if (p.f === 'unless') return L(p.b, s) || L(p.a, s); // A unless B == if not B then A
    if (p.f === 'iff') return L(p.a, s) === L(p.b, s);
    return true;
  }
  function condText(p, atoms) {
    var t = function (lt) { return atoms[lt.v][lt.p ? 0 : 1]; };
    if (p.f === 'fact') return PL.cap(t(p.a)) + '.';
    if (p.f === 'imp') return 'If ' + t(p.a) + ', then ' + t(p.b) + '.';
    if (p.f === 'onlyif') return PL.cap(t(p.a)) + ' only if ' + t(p.b) + '.';
    if (p.f === 'or') return 'At least one is true: ' + t(p.a) + ', or ' + t(p.b) + '.';
    if (p.f === 'nand') return 'It is not the case that both ' + t(p.a) + ' and ' + t(p.b) + '.';
    if (p.f === 'unless') return PL.cap(t(p.a)) + ' unless ' + t(p.b) + '.';
    if (p.f === 'iff') return PL.cap(t(p.a)) + ' if and only if ' + t(p.b) + '.';
    return '';
  }

  /* ===================== 6. FIND THE NUMBER ===================== */
  function digits(x) { return String(x).split('').map(Number); }
  function isPrime(x) { if (x < 2) return false; for (var i = 2; i * i <= x; i++) if (x % i === 0) return false; return true; }
  var NUM_PROPS = [
    { id: 'odd', txt: function () { return 'It is odd.'; }, f: function (x) { return x % 2 === 1; } },
    { id: 'even', txt: function () { return 'It is even.'; }, f: function (x) { return x % 2 === 0; } },
    { id: 'div', param: [3, 4, 5, 6, 7, 9], txt: function (k) { return 'It is divisible by ' + k + '.'; }, f: function (x, k) { return x % k === 0; } },
    { id: 'ndiv', param: [3, 4, 5, 6, 7], txt: function (k) { return 'It is not divisible by ' + k + '.'; }, f: function (x, k) { return x % k !== 0; } },
    { id: 'dsum', txt: function (k) { return 'Its digits add up to ' + k + '.'; }, f: function (x, k) { return digits(x).reduce(function (a, b) { return a + b; }, 0) === k; }, derive: function (x) { return digits(x).reduce(function (a, b) { return a + b; }, 0); } },
    { id: 'gt', txt: function (k) { return 'It is greater than ' + k + '.'; }, f: function (x, k) { return x > k; }, derive: function (x, rng) { return Math.max(1, x - rng.int(3, 40)); } },
    { id: 'lt', txt: function (k) { return 'It is less than ' + k + '.'; }, f: function (x, k) { return x < k; }, derive: function (x, rng) { return x + rng.int(3, 40); } },
    { id: 'prime', txt: function () { return 'It is a prime number.'; }, f: isPrime },
    { id: 'nprime', txt: function () { return 'It is not prime.'; }, f: function (x) { return !isPrime(x); } },
    { id: 'square', txt: function () { return 'It is a perfect square.'; }, f: function (x) { return Math.round(Math.sqrt(x)) ** 2 === x; } },
    { id: 'distinct', txt: function () { return 'All its digits are different.'; }, f: function (x) { var d = digits(x); return new Set(d).size === d.length; } },
    { id: 'repeat', txt: function () { return 'It has a repeated digit.'; }, f: function (x) { var d = digits(x); return new Set(d).size !== d.length; } },
    { id: 'incr', txt: function () { return 'Its digits strictly increase from left to right.'; }, f: function (x) { var d = digits(x); for (var i = 1; i < d.length; i++) if (d[i] <= d[i - 1]) return false; return d.length > 1; } },
    { id: 'firstgt', txt: function () { return 'Its first digit is larger than its last digit.'; }, f: function (x) { var d = digits(x); return d[0] > d[d.length - 1]; } },
    { id: 'rem', param: [3, 4, 5, 6, 7, 8], txt: function (k, r) { return 'Divided by ' + k + ', it leaves remainder ' + r + '.'; }, f: function (x, k, r) { return x % k === r; }, two: true },
    { id: 'lastd', txt: function (k) { return 'Its last digit is ' + k + '.'; }, f: function (x, k) { return x % 10 === k; }, derive: function (x) { return x % 10; } },
    { id: 'prod', txt: function (k) { return 'The product of its digits is ' + k + '.'; }, f: function (x, k) { return digits(x).reduce(function (a, b) { return a * b; }, 1) === k; }, derive: function (x) { return digits(x).reduce(function (a, b) { return a * b; }, 1); } }
  ];
  function numberGen(lv, rng) {
    var lo = lv <= 2 ? 10 : lv <= 5 ? 10 : 100, hi = lv <= 2 ? 60 : lv <= 5 ? 99 : lv <= 8 ? 400 : 999;
    var x = rng.int(lo, hi);
    var pool = []; for (var i = lo; i <= hi; i++) pool.push(i);
    var cand = pool.slice(), clues = [];
    for (var g = 0; g < 300 && cand.length > 1; g++) {
      var pr = rng.pick(NUM_PROPS);
      if (lv <= 3 && (pr.id === 'prod' || pr.id === 'rem')) continue;
      var c = { id: pr.id };
      if (pr.param) c.k = rng.pick(pr.param);
      if (pr.two) c.r = x % c.k;
      if (pr.derive) c.k = pr.derive(x, rng);
      if (!pr.f(x, c.k, c.r)) continue;
      var nc = cand.filter(function (y) { return pr.f(y, c.k, c.r); });
      if (nc.length === cand.length || (nc.length === 1 && clues.length < 2 && lv >= 3)) continue;
      // keep "gt/lt" rare at high levels so elimination is arithmetic rather than range narrowing
      if (lv >= 6 && (pr.id === 'gt' || pr.id === 'lt') && clues.filter(function (q) { return q.id === 'gt' || q.id === 'lt'; }).length >= 1) continue;
      clues.push(c); cand = nc;
    }
    if (cand.length !== 1) return null;
    for (var j = clues.length - 1; j >= 0; j--) {
      var rest = clues.slice(0, j).concat(clues.slice(j + 1));
      if (pool.filter(function (y) { return rest.every(function (q) { return numProp(q).f(y, q.k, q.r); }); }).length === 1) clues = rest;
    }
    if (clues.length < (lv <= 2 ? 2 : 3)) return null;
    var P = { type: 'number', title: 'Find the number', intro: 'A secret whole number lies between ' + lo + ' and ' + hi + ' inclusive. Every clue is true, and together they identify exactly one number.', lo: lo, hi: hi, clues: rng.shuffle(clues), sol: x };
    P.clueText = P.clues.map(function (q) { return numProp(q).txt(q.k, q.r); });
    return P;
  }
  function numProp(q) { for (var i = 0; i < NUM_PROPS.length; i++) if (NUM_PROPS[i].id === q.id) return NUM_PROPS[i]; }

  /* ===================== 7. FUTOSHIKI ===================== */
  function latin(n, rng) {
    var base = []; for (var r = 0; r < n; r++) { var row = []; for (var c = 0; c < n; c++) row.push((r + c) % n); base.push(row); }
    var rp = rng.shuffle(seq(n)), cp = rng.shuffle(seq(n)), sp = rng.shuffle(seq(n));
    return rp.map(function (r) { return cp.map(function (c) { return sp[base[r][c]] + 1; }); });
  }
  function futCount(n, givens, ineq, limit) {
    var g = []; for (var r = 0; r < n; r++) { g.push([]); for (var c = 0; c < n; c++) g[r].push(givens[r * n + c] || 0); }
    var cnt = 0, sol = null;
    function ok(r, c, v) {
      for (var i = 0; i < n; i++) { if (i !== c && g[r][i] === v) return false; if (i !== r && g[i][c] === v) return false; }
      for (var k = 0; k < ineq.length; k++) {
        var q = ineq[k], a = q.a, b = q.b; // cell a < cell b
        var ra = Math.floor(a / n), ca = a % n, rb = Math.floor(b / n), cb = b % n;
        var va = (ra === r && ca === c) ? v : g[ra][ca], vb = (rb === r && cb === c) ? v : g[rb][cb];
        if (va && vb && !(va < vb)) return false;
        if ((ra === r && ca === c) && !vb && v === n) return false;
        if ((rb === r && cb === c) && !va && v === 1) return false;
      }
      return true;
    }
    (function rec(idx) {
      if (cnt >= limit) return;
      if (idx === n * n) { cnt++; if (!sol) sol = g.map(function (row) { return row.slice(); }); return; }
      var r = Math.floor(idx / n), c = idx % n;
      if (g[r][c]) { if (ok(r, c, g[r][c])) rec(idx + 1); return; }
      for (var v = 1; v <= n; v++) if (ok(r, c, v)) { g[r][c] = v; rec(idx + 1); g[r][c] = 0; if (cnt >= limit) return; }
    })(0);
    return { count: cnt, sol: sol };
  }
  function futGen(lv, rng) {
    var n = lv <= 5 ? 4 : 5;
    var sq = latin(n, rng), flat = [].concat.apply([], sq);
    var ineq = [];
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      var i = r * n + c;
      if (c < n - 1) ineq.push(flat[i] < flat[i + 1] ? { a: i, b: i + 1 } : { a: i + 1, b: i });
      if (r < n - 1) ineq.push(flat[i] < flat[i + n] ? { a: i, b: i + n } : { a: i + n, b: i });
    }
    var givens = {}; for (var k = 0; k < n * n; k++) givens[k] = flat[k];
    // remove elements greedily while unique
    var items = rng.shuffle(Object.keys(givens).map(function (k) { return { g: +k }; }).concat(ineq.map(function (q, j) { return { q: j }; })));
    var activeQ = ineq.map(function () { return true; });
    items.forEach(function (it) {
      var g2 = Object.assign({}, givens), q2 = activeQ.slice();
      if (it.g != null) delete g2[it.g]; else q2[it.q] = false;
      var res = futCount(n, g2, ineq.filter(function (_, j) { return q2[j]; }), 2);
      if (res.count === 1) { givens = g2; activeQ = q2; }
    });
    var finalQ = ineq.filter(function (_, j) { return activeQ[j]; });
    var ng = Object.keys(givens).length;
    var target = lv <= 3 ? 4 : lv <= 5 ? 2 : lv <= 7 ? 3 : 1; // add back givens for easier levels
    var missing = seq(n * n).filter(function (k) { return givens[k] == null; });
    missing = rng.shuffle(missing);
    while (Object.keys(givens).length < target + ng - 0 && missing.length && lv <= 7) { var m = missing.pop(); givens[m] = flat[m]; if (Object.keys(givens).length >= ng + (lv <= 3 ? 3 : lv <= 5 ? 2 : 1)) break; }
    return { type: 'fut', title: 'Inequality square', intro: 'Fill the ' + n + '×' + n + ' grid so every row and column contains 1 to ' + n + ' exactly once. Each < or > sign between neighbours must be obeyed.', n: n, givens: givens, ineq: finalQ, sol: flat };
  }

  /* ===================== Generation dispatcher ===================== */
  var TYPE_LEVELS = { grid: [1, 10], order: [1, 10], sched: [3, 10], kk: [2, 10], cond: [2, 10], number: [1, 10], fut: [3, 10] };
  var TYPE_NAMES = { grid: 'Logic grid', order: 'Ordering', sched: 'Scheduling', kk: 'Truth-tellers & liars', cond: 'Conditional reasoning', number: 'Elimination', fut: 'Constraint square' };
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10);
    var types = Object.keys(TYPE_LEVELS).filter(function (t) { return lv >= TYPE_LEVELS[t][0] && lv <= TYPE_LEVELS[t][1]; });
    var recent = (ctx && ctx.recent) || [];
    var fresh = types.filter(function (t) { return recent.slice(-3).indexOf(t) < 0; });
    var pool = fresh.length ? fresh : types;
    if (ctx && ctx.forceType) pool = [ctx.forceType];
    for (var t = 0; t < 30; t++) {
      var type = rng.pick(pool), P = null;
      if (type === 'grid') P = gridGen(lv, rng);
      else if (type === 'order') P = orderGen(lv, rng);
      else if (type === 'sched') P = schedGen(lv, rng);
      else if (type === 'kk') P = kkGen(lv, rng);
      else if (type === 'cond') P = condGen(lv, rng);
      else if (type === 'number') P = numberGen(lv, rng);
      else if (type === 'fut') P = futGen(lv, rng);
      if (P) { P.typeName = TYPE_NAMES[type]; P.tkey = type; return P; }
    }
    throw new Error('logic generation failed');
  }

  /* ===================== Play ===================== */
  function init(p) {
    if (p.type === 'grid') { var m = []; for (var c = 1; c < p.cats.length; c++) { var a = []; for (var i = 0; i < p.n; i++) { var r = []; for (var v = 0; v < p.n; v++) r.push(0); a.push(r); } m.push(a); } return { marks: m, struck: [] }; }
    if (p.type === 'order') return { slots: p.items.map(function () { return null; }), sel: null, struck: [] };
    if (p.type === 'sched') return { asg: p.people.map(function () { return null; }), struck: [] };
    if (p.type === 'kk') return { k: p.people.map(function () { return null; }) };
    if (p.type === 'cond') return { tried: [] };
    if (p.type === 'number') return { struck: [], tries: [] };
    if (p.type === 'fut') return { v: {}, sel: null };
    return {};
  }
  function clueList(p, gs) {
    return h('ol', { class: 'clues' }, p.clueText.map(function (t, i) {
      var struck = gs.struck && gs.struck.indexOf(i) >= 0;
      return h('li', { class: struck ? 'struck' : '', onclick: gs.struck ? function () { var k = gs.struck.indexOf(i); if (k >= 0) gs.struck.splice(k, 1); else gs.struck.push(i); this.classList.toggle('struck'); } : null }, t);
    }));
  }
  function isComplete(p, gs) {
    if (p.type === 'grid') return gs.marks.every(function (M) { return M.every(function (r) { return r.filter(function (x) { return x === 2; }).length === 1; }) && seq(p.n).every(function (v) { return M.filter(function (r) { return r[v] === 2; }).length === 1; }); });
    if (p.type === 'order') return gs.slots.every(function (x) { return x != null; });
    if (p.type === 'sched') return gs.asg.every(function (x) { return x != null; });
    if (p.type === 'kk') return gs.k.every(function (x) { return x != null; });
    if (p.type === 'fut') return seq(p.n * p.n).every(function (k) { return p.givens[k] != null || gs.v[k]; });
    return true;
  }
  function isCorrect(p, gs) {
    if (p.type === 'grid') return gs.marks.every(function (M, c) { return M.every(function (r, i) { return r[p.sol[c][i]] === 2; }); });
    if (p.type === 'order') return gs.slots.every(function (it, pos) { return p.sol[it] === pos; });
    if (p.type === 'sched') { // same partition up to nothing (days are labelled)
      return gs.asg.every(function (d, i) { return d === p.sol[i]; });
    }
    if (p.type === 'kk') return gs.k.every(function (x, i) { return x === p.sol[i]; });
    if (p.type === 'fut') return seq(p.n * p.n).every(function (k) { return (p.givens[k] != null ? p.givens[k] : gs.v[k]) === p.sol[k]; });
    return false;
  }

  function view(api) {
    var p = api.p, gs = api.gs;
    var head = h('div', null,
      h('div', { class: 'tagrow' }, h('span', { class: 'tag' }, p.typeName), h('span', { class: 'tag ghost' }, p.title)),
      h('p', { class: 'prob' }, p.intro));
    var check = function () {
      if (isCorrect(p, gs)) { api.update(gs); api.finish('solved'); }
      else { api.wrong(); api.toast('Not correct yet. At least one assignment is wrong.', 'bad'); api.update(gs); }
    };
    var checkBtn = function () { return api.done ? null : h('button', { class: 'btn primary wide', disabled: !isComplete(p, gs), onclick: check }, isComplete(p, gs) ? 'Check solution' : 'Complete the grid to check'); };
    var body;
    if (p.type === 'grid') body = gridView(api, p, gs);
    else if (p.type === 'order') body = orderView(api, p, gs);
    else if (p.type === 'sched') body = schedView(api, p, gs);
    else if (p.type === 'kk') body = kkView(api, p, gs);
    else if (p.type === 'fut') body = futView(api, p, gs);
    if (p.type === 'cond') {
      return h('div', { class: 'logic' }, head, clueList(p, { struck: null }), h('p', { class: 'q' }, p.ask),
        h('div', { class: 'opts' }, p.optText.map(function (t, i) {
          return h('button', { class: 'btn opt', disabled: api.done || gs.tried.indexOf(i) >= 0, onclick: function () {
            gs.tried.push(i);
            if (i === p.ans) { api.update(gs); api.finish('solved'); } else { api.wrong(); api.toast('That does not follow. Check each statement.', 'bad'); api.update(gs); }
          } }, t);
        })));
    }
    if (p.type === 'number') {
      var inp = h('input', { id: 'num-in', class: 'txt', type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: 'The number' });
      return h('div', { class: 'logic' }, head, h('div', { class: 'muted small' }, 'Tap a clue to grey it out once you have used it.'), clueList(p, gs),
        api.done ? null : h('form', { class: 'row-in', onsubmit: function (e) {
          e.preventDefault(); var v = parseInt(inp.value, 10); if (!v && v !== 0) return;
          gs.tries.push(v);
          if (v === p.sol) { api.update(gs); api.finish('solved'); }
          else {
            api.wrong();
            var failing = p.clues.map(function (q, i) { return numProp(q).f(v, q.k, q.r) ? null : i + 1; }).filter(Boolean);
            api.toast(v < p.lo || v > p.hi ? 'Out of range.' : failing.length ? v + ' breaks clue ' + failing[0] + '.' : v + ' fits every clue you can see, but it is not unique… check again.', 'bad');
            api.update(gs);
          }
        } }, inp, h('button', { class: 'btn primary', type: 'submit' }, 'Check')),
        gs.tries.length ? h('div', { class: 'muted small' }, 'Tried: ' + gs.tries.join(', ')) : null);
    }
    return h('div', { class: 'logic' }, head, p.type !== 'fut' ? h('div', { class: 'muted small' }, 'Tap a clue to grey it out once you have used it.') : null, p.clueText ? clueList(p, gs) : null, body, checkBtn());
  }

  function gridView(api, p, gs) {
    var mats = [];
    for (var c = 1; c < p.cats.length; c++) (function (c) {
      var cat = p.cats[c], M = gs.marks[c - 1];
      var rows = [h('tr', null, h('th', null, ''), cat.vals.map(function (v) { return h('th', { class: 'colh' }, h('span', null, String(v))); }))];
      p.cats[0].vals.forEach(function (nm, i) {
        rows.push(h('tr', null, h('th', { class: 'rowh' }, nm), cat.vals.map(function (_, v) {
          var st = M[i][v];
          return h('td', { class: 'gcell' + (st === 2 ? ' yes' : st === 1 ? ' no' : ''), role: 'button', 'aria-label': nm + ' ' + cat.vals[v] + ': ' + ['unknown', 'no', 'yes'][st], onclick: api.done ? null : function () {
            var ns = (st + 1) % 3; M[i][v] = ns;
            if (ns === 2 && gs.auto !== false) { for (var x = 0; x < p.n; x++) { if (x !== v && M[i][x] === 0) M[i][x] = 1; if (x !== i && M[x][v] === 0) M[x][v] = 1; } }
            api.update(gs);
          } }, st === 2 ? '●' : st === 1 ? '×' : '');
        })));
      });
      mats.push(h('div', { class: 'gmat' }, h('div', { class: 'lbl' }, p.cats[0].name + ' × ' + cat.name), h('div', { class: 'scrollx' }, h('table', { class: 'gtable' }, rows))));
    })(c);
    return h('div', null, h('div', { class: 'muted small' }, 'Tap a cell to cycle: blank → × (ruled out) → ● (match). A match rules out the rest of its row and column.'), mats);
  }
  function orderView(api, p, gs) {
    var th = ORDER_THEMES[p.th];
    var used = gs.slots.filter(function (x) { return x != null; });
    var chips = h('div', { class: 'chips' }, p.items.map(function (it, i) {
      if (used.indexOf(i) >= 0) return null;
      return h('button', { class: 'chip' + (gs.sel === i ? ' sel' : ''), disabled: api.done, onclick: function () { gs.sel = gs.sel === i ? null : i; api.update(gs); } }, it);
    }));
    var slots = h('ol', { class: 'slots' }, gs.slots.map(function (it, pos) {
      var label = th.ord ? ordPlace(pos + 1) : th.pos === 'floor' ? 'Floor ' + (pos + 1) : 'Slot ' + (pos + 1);
      return h('li', { class: 'slot' + (it != null ? ' filled' : ''), onclick: api.done ? null : function () {
        if (it != null) { gs.slots[pos] = null; gs.sel = it; }
        else if (gs.sel != null) { gs.slots[pos] = gs.sel; gs.sel = null; }
        api.update(gs);
      } }, h('span', { class: 'slot-n' }, label), h('span', { class: 'slot-v' }, it != null ? p.items[it] : (gs.sel != null ? 'Tap to place' : '—')));
    }));
    return h('div', null, h('div', { class: 'muted small' }, 'Tap a name, then a position. Tap a filled position to pick it back up.'), chips, th.pos === 'floor' ? h('div', { class: 'muted small' }, 'Floor 1 is the bottom.') : null, slots);
  }
  function schedView(api, p, gs) {
    var counts = p.days.map(function (_, d) { return gs.asg.filter(function (x) { return x === d; }).length; });
    return h('div', { class: 'sched' },
      h('div', { class: 'muted small' }, 'Choose a ' + p.unit + ' for each person. Counts: ' + p.days.map(function (d, i) { return d + ' ' + counts[i] + '/' + p.cap; }).join(' · ')),
      p.people.map(function (nm, i) {
        return h('div', { class: 'srow' }, h('span', { class: 'sname' }, nm), h('div', { class: 'seg' }, p.days.map(function (d, di) {
          return h('button', { class: 'segb' + (gs.asg[i] === di ? ' on' : ''), disabled: api.done, onclick: function () { gs.asg[i] = gs.asg[i] === di ? null : di; api.update(gs); } }, d.replace(' shift', '').replace('Session ', 'S').replace(/day$/, '').slice(0, 5));
        })));
      }));
  }
  function kkView(api, p, gs) {
    return h('div', { class: 'sched' }, p.people.map(function (nm, i) {
      return h('div', { class: 'srow' }, h('span', { class: 'sname' }, nm), h('div', { class: 'seg' }, [[1, 'Knight'], [0, 'Knave']].map(function (o) {
        return h('button', { class: 'segb' + (gs.k[i] === o[0] ? ' on' : ''), disabled: api.done, onclick: function () { gs.k[i] = gs.k[i] === o[0] ? null : o[0]; api.update(gs); } }, o[1]);
      })));
    }));
  }
  function futView(api, p, gs) {
    var n = p.n, cells = [];
    var sym = {};
    p.ineq.forEach(function (q) {
      var a = q.a, b = q.b, ra = Math.floor(a / n), ca = a % n, rb = Math.floor(b / n), cb = b % n;
      if (ra === rb) { var left = Math.min(a, b); sym['h' + left] = (a === left) ? '<' : '>'; }
      else { var top = Math.min(a, b); sym['v' + top] = (a === top) ? '∧' : '∨'; }
    });
    var size = 2 * n - 1;
    var grid = h('div', { class: 'fut', style: { 'grid-template-columns': 'repeat(' + size + ', auto)' } });
    for (var R = 0; R < size; R++) for (var C = 0; C < size; C++) {
      if (R % 2 === 0 && C % 2 === 0) {
        (function (k) {
          var given = p.givens[k] != null, v = given ? p.givens[k] : gs.v[k];
          grid.appendChild(h('button', { class: 'fcell' + (given ? ' given' : '') + (gs.sel === k ? ' sel' : ''), disabled: given || api.done, 'aria-label': 'Row ' + (Math.floor(k / n) + 1) + ' column ' + (k % n + 1), onclick: function () { gs.sel = k; api.update(gs); } }, v ? String(v) : ''));
        })((R / 2) * n + C / 2);
      } else if (R % 2 === 0) {
        var k1 = (R / 2) * n + (C - 1) / 2; grid.appendChild(h('span', { class: 'fsym' }, sym['h' + k1] || ''));
      } else if (C % 2 === 0) {
        var k2 = ((R - 1) / 2) * n + C / 2; grid.appendChild(h('span', { class: 'fsym v' }, sym['v' + k2] || ''));
      } else grid.appendChild(h('span', null, ''));
    }
    var pad = h('div', { class: 'pad' }, seq(n).map(function (i) {
      return h('button', { class: 'btn padb', disabled: gs.sel == null || api.done, onclick: function () { gs.v[gs.sel] = i + 1; api.update(gs); } }, String(i + 1));
    }).concat([h('button', { class: 'btn padb ghost', disabled: gs.sel == null || api.done, onclick: function () { delete gs.v[gs.sel]; api.update(gs); } }, 'Clear')]));
    return h('div', null, h('div', { class: 'muted small' }, '∧ means the upper number is smaller; ∨ means the upper number is larger.'), h('div', { class: 'futwrap' }, grid), api.done ? null : pad);
  }

  /* ===================== Hints: next valid deduction ===================== */
  function assignAll(p) {
    if (p.type === 'grid') return gridAll(p.n, p.cats.length);
    if (p.type === 'order') return permsC(p.n);
    if (p.type === 'sched') return partitions(p.n, p.D, p.cap);
    return null;
  }
  function clueEval(p, cl, s) { return p.type === 'grid' ? gridEval(p, cl, s) : p.type === 'order' ? orderEval(cl, s) : schedEval(cl, s); }
  // vars: grid -> (c,i) value; order -> item position; sched -> person day
  function varsOf(p, s) {
    if (p.type === 'grid') { var o = []; s.forEach(function (perm, c) { perm.forEach(function (v, i) { o.push(v); }); }); return o; }
    return s;
  }
  function varName(p, idx, val) {
    if (p.type === 'grid') { var c = Math.floor(idx / p.n) + 1, i = idx % p.n; return p.cats[0].vals[i] + ' ↔ ' + p.cats[c].vals[val]; }
    if (p.type === 'order') { var th = ORDER_THEMES[p.th]; return p.items[idx] + ' is ' + (th.ord ? ordPlace(val + 1) : th.pos + ' ' + (val + 1)); }
    return p.people[idx] + ' is on ' + p.days[val];
  }
  function domSize(p) { return p.type === 'grid' ? p.n : p.type === 'order' ? p.n : p.D; }
  function nVars(p) { return p.type === 'grid' ? (p.cats.length - 1) * p.n : p.n; }
  function fullDoms(p) { var d = [], m = domSize(p); for (var k = 0; k < nVars(p); k++) { var a = []; for (var v = 0; v < m; v++) a.push(true); d.push(a); } return d; }
  // domains implied by the player's correct marks (wrong marks are reported separately)
  function playerDoms(p, gs) {
    var d = fullDoms(p);
    var fix = function (k, v) { for (var x = 0; x < d[k].length; x++) d[k][x] = x === v; };
    if (p.type === 'grid') gs.marks.forEach(function (M, c) { M.forEach(function (r, i) { r.forEach(function (st, v) { var k = c * p.n + i; if (st === 2 && p.sol[c][i] === v) fix(k, v); else if (st === 1 && p.sol[c][i] !== v) d[k][v] = false; }); }); });
    if (p.type === 'order') gs.slots.forEach(function (it, pos) { if (it != null && p.sol[it] === pos) fix(it, pos); });
    if (p.type === 'sched') gs.asg.forEach(function (dd, i) { if (dd != null && p.sol[i] === dd) fix(i, dd); });
    return d;
  }
  function wrongMark(p, gs) {
    if (p.type === 'grid') { for (var c = 0; c < gs.marks.length; c++) for (var i = 0; i < p.n; i++) for (var v = 0; v < p.n; v++) { var st = gs.marks[c][i][v]; if (st === 2 && p.sol[c][i] !== v) return p.cats[0].vals[i] + ' is not ' + p.cats[c + 1].vals[v]; if (st === 1 && p.sol[c][i] === v) return 'something is wrongly ruled out in ' + p.cats[0].vals[i] + '’s row (' + p.cats[c + 1].name + ')'; } }
    if (p.type === 'order') for (var pos = 0; pos < gs.slots.length; pos++) { var it = gs.slots[pos]; if (it != null && p.sol[it] !== pos) return p.items[it] + ' is in the wrong position'; }
    if (p.type === 'sched') for (var k = 0; k < gs.asg.length; k++) if (gs.asg[k] != null && gs.asg[k] !== p.sol[k]) return p.people[k] + ' is on the wrong ' + p.unit;
    if (p.type === 'kk') for (var j = 0; j < gs.k.length; j++) if (gs.k[j] != null && gs.k[j] !== p.sol[j]) return p.people[j] + ' is marked wrongly';
    if (p.type === 'fut') for (var key in gs.v) if (gs.v[key] && gs.v[key] !== p.sol[key]) return 'row ' + (Math.floor(key / p.n) + 1) + ', column ' + (key % p.n + 1) + ' is wrong';
    return null;
  }
  function deduce(p, dom, all) {
    all = all || assignAll(p);
    var base = all.filter(function (s) { var vs = varsOf(p, s); for (var k = 0; k < vs.length; k++) if (!dom[k][vs[k]]) return false; return true; });
    var tryWith = function (filterFn) {
      var set = base.filter(filterFn);
      if (!set.length) return null;
      var nd = dom.map(function (a) { return a.map(function () { return false; }); });
      set.forEach(function (s) { varsOf(p, s).forEach(function (v, k) { nd[k][v] = true; }); });
      var changes = [];
      for (var k = 0; k < nd.length; k++) for (var v = 0; v < nd[k].length; v++) if (dom[k][v] && !nd[k][v]) changes.push({ k: k, v: v });
      return changes.length ? { nd: nd, changes: changes } : null;
    };
    for (var ci = 0; ci < p.clues.length; ci++) { var r = tryWith(function (s) { return clueEval(p, p.clues[ci], s); }); if (r) { r.clues = [ci]; return r; } }
    for (var a = 0; a < p.clues.length; a++) for (var b = a + 1; b < p.clues.length; b++) { var r2 = tryWith(function (s) { return clueEval(p, p.clues[a], s) && clueEval(p, p.clues[b], s); }); if (r2) { r2.clues = [a, b]; return r2; } }
    var r3 = tryWith(function (s) { return p.clues.every(function (c) { return clueEval(p, c, s); }); });
    if (r3) r3.clues = null;
    return r3;
  }
  function dedText(p, d, dom) {
    var placed = [], ruled = [];
    var byVar = {};
    d.changes.forEach(function (c) { (byVar[c.k] = byVar[c.k] || []).push(c.v); });
    Object.keys(byVar).forEach(function (k) {
      var left = []; d.nd[k].forEach(function (ok, v) { if (ok) left.push(v); });
      var before = dom[k].filter(Boolean).length;
      if (left.length === 1 && before > 1) placed.push(varName(p, +k, left[0]));
      else byVar[k].forEach(function (v) { ruled.push(varName(p, +k, v).replace(' ↔ ', ' is not ').replace(' is ', ' is not ').replace('not not', 'not')); });
    });
    var src = d.clues == null ? 'Using all the clues together' : d.clues.length === 1 ? 'Clue ' + (d.clues[0] + 1) : 'Clues ' + (d.clues[0] + 1) + ' and ' + (d.clues[1] + 1) + ' together';
    var parts = [];
    if (placed.length) parts.push(placed.slice(0, 3).join('; '));
    if (ruled.length) parts.push('rules out: ' + ruled.slice(0, 3).join('; ') + (ruled.length > 3 ? ' (and ' + (ruled.length - 3) + ' more)' : ''));
    return src + (placed.length ? ' gives ' : ' ') + parts.join('. It also ').replace(/^rules out/, 'rules out') + '.';
  }
  function futCandidates(p, vals) {
    var n = p.n, cand = {};
    for (var k = 0; k < n * n; k++) {
      if (vals[k]) continue;
      var r = Math.floor(k / n), c = k % n, s = [];
      for (var v = 1; v <= n; v++) {
        var ok = true;
        for (var i = 0; i < n; i++) { if (vals[r * n + i] === v || vals[i * n + c] === v) ok = false; }
        if (ok) s.push(v);
      }
      cand[k] = s;
    }
    // inequality bound propagation
    for (var it = 0; it < 8; it++) {
      p.ineq.forEach(function (q) {
        var lo = vals[q.a] ? [vals[q.a]] : cand[q.a], hi = vals[q.b] ? [vals[q.b]] : cand[q.b];
        if (!lo || !hi || !lo.length || !hi.length) return;
        var maxHi = Math.max.apply(null, hi), minLo = Math.min.apply(null, lo);
        if (!vals[q.a]) cand[q.a] = cand[q.a].filter(function (v) { return v < maxHi; });
        if (!vals[q.b]) cand[q.b] = cand[q.b].filter(function (v) { return v > minLo; });
      });
    }
    return cand;
  }
  function hint(p, gs) {
    var wm = wrongMark(p, gs);
    if (wm) return { msg: 'Check your work: ' + wm + '.' };
    if (p.type === 'grid' || p.type === 'order' || p.type === 'sched') {
      var dm = playerDoms(p, gs), d = deduce(p, dm);
      if (d) return { msg: dedText(p, d, dm) };
      return { msg: 'Everything you have is correct — finish entering the rest.' };
    }
    if (p.type === 'kk') {
      var all = []; for (var m = 0; m < (1 << p.n); m++) { var a = []; for (var i = 0; i < p.n; i++) a.push((m >> i) & 1); all.push(a); }
      for (var x = 0; x < p.n; x++) {
        if (gs.k[x] === p.sol[x]) continue;
        var opp = 1 - p.sol[x];
        var any = all.some(function (s) { return s[x] === opp && p.stmts.every(function (st, k) { return kkEval(st, s) === !!s[k]; }); });
        if (!any) return { msg: 'Suppose ' + p.people[x] + ' were a ' + (opp ? 'knight' : 'knave') + '. No assignment then makes every statement fit, so ' + p.people[x] + ' is a ' + (p.sol[x] ? 'knight' : 'knave') + '.' };
      }
      return { msg: 'Test one person as a knight, follow the consequences, and look for a contradiction.' };
    }
    if (p.type === 'cond') {
      return { msg: 'Rewrite each statement as “if … then …”. Remember: from “if A then B”, knowing B tells you nothing about A, but knowing “not B” gives “not A”.' };
    }
    if (p.type === 'number') {
      var pool = []; for (var y = p.lo; y <= p.hi; y++) pool.push(y);
      gs.hintN = (gs.hintN || 0) + 1;
      var k2 = Math.min(gs.hintN + 1, p.clues.length - 1);
      var left = pool.filter(function (z) { return p.clues.slice(0, k2).every(function (q) { return numProp(q).f(z, q.k, q.r); }); });
      return { msg: 'Clues 1–' + k2 + ' together leave ' + left.length + ' possible numbers' + (left.length <= 8 ? ': ' + left.join(', ') : '') + '.', gs: gs };
    }
    if (p.type === 'fut') {
      var vals = {}; for (var kk = 0; kk < p.n * p.n; kk++) vals[kk] = p.givens[kk] != null ? p.givens[kk] : (gs.v[kk] || 0);
      var cand = futCandidates(p, vals);
      for (var key in cand) if (cand[key].length === 1) return { msg: 'Row ' + (Math.floor(key / p.n) + 1) + ', column ' + (key % p.n + 1) + ' can only be ' + cand[key][0] + ' once you account for its row, column and inequality signs.' };
      // fall back: reveal a cell
      var empty = Object.keys(cand); if (!empty.length) return { msg: 'All cells are filled.' };
      var kk2 = empty[0]; gs.v[kk2] = p.sol[kk2];
      return { msg: 'No single-step deduction is visible; filled row ' + (Math.floor(kk2 / p.n) + 1) + ', column ' + (kk2 % p.n + 1) + ' for you.', gs: gs };
    }
    return { msg: 'Read the clues again carefully.' };
  }

  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var pen = (p.type === 'cond' || p.type === 'kk') ? 30 : 20;
    var q = solved ? PL.clamp(100 - ctx.wrong * pen - ctx.hints * 12, 10, 100) : 0;
    return { quality: Math.round(q), metrics: { type: p.tkey, wrong: ctx.wrong, unaided: solved && !ctx.hints && !ctx.wrong, clues: p.clueText ? p.clueText.length : null },
      lines: [['Puzzle type', p.typeName], ['Incorrect checks', ctx.wrong]] };
  }

  function solutionView(p) {
    if (p.type === 'grid') {
      return h('div', { class: 'scrollx' }, h('table', { class: 'soltable' },
        h('tr', null, p.cats.map(function (c) { return h('th', null, c.name); })),
        p.cats[0].vals.map(function (nm, i) { return h('tr', null, h('td', null, nm), p.sol.map(function (perm, c) { return h('td', null, String(p.cats[c + 1].vals[perm[i]])); })); })));
    }
    if (p.type === 'order') {
      var order = []; p.sol.forEach(function (pos, it) { order[pos] = p.items[it]; });
      var th = ORDER_THEMES[p.th];
      return h('ol', { class: 'steps' }, order.map(function (x, i) { return h('li', null, (th.ord ? ordPlace(i + 1) : th.pos === 'floor' ? 'Floor ' + (i + 1) : 'Slot ' + (i + 1)) + ': ' + x); }));
    }
    if (p.type === 'sched') return h('ul', { class: 'steps' }, p.days.map(function (d, di) { return h('li', null, d + ': ' + p.people.filter(function (_, i) { return p.sol[i] === di; }).join(', ')); }));
    if (p.type === 'kk') return h('ul', { class: 'steps' }, p.people.map(function (nm, i) { return h('li', null, nm + ': ' + (p.sol[i] ? 'knight' : 'knave')); }));
    if (p.type === 'cond') return h('div', null, h('b', null, p.optText[p.ans]));
    if (p.type === 'number') return h('div', null, h('b', { class: 'mono' }, String(p.sol)));
    if (p.type === 'fut') {
      var g = h('div', { class: 'fut small', style: { 'grid-template-columns': 'repeat(' + p.n + ', auto)' } });
      p.sol.forEach(function (v, k) { g.appendChild(h('span', { class: 'fcell ro' + (p.givens[k] != null ? ' given' : '') }, String(v))); });
      return g;
    }
  }
  function explanation(p) {
    var out = [];
    if (p.type === 'grid' || p.type === 'order' || p.type === 'sched') {
      var dom = fullDoms(p), all = assignAll(p), guard = 0;
      while (guard++ < 40) {
        if (dom.every(function (a) { return a.filter(Boolean).length === 1; })) break;
        var d = deduce(p, dom, all);
        if (!d) break;
        out.push(dedText(p, d, dom));
        dom = d.nd;
        if (out.length >= 12) { out.push('The remaining placements follow by elimination.'); break; }
      }
      return out;
    }
    if (p.type === 'kk') {
      out.push('Check the solution against each statement:');
      p.stmts.forEach(function (st, k) { var tr = kkEval(st, p.sol); out.push(p.people[k] + ' (' + (p.sol[k] ? 'knight' : 'knave') + ') says something ' + (tr ? 'true' : 'false') + ': “' + kkText(st, p.people, k) + '”'); });
      out.push('No other assignment of knights and knaves fits all the statements (checked exhaustively).');
      return out;
    }
    if (p.type === 'cond') {
      var asg = []; for (var m = 0; m < (1 << p.nv); m++) { var a = []; for (var i = 0; i < p.nv; i++) a.push((m >> i) & 1); asg.push(a); }
      var models = asg.filter(function (s) { return p.prem.every(function (q) { return premEval(q, s); }); });
      out.push(models.length === 1 ? 'Only one situation fits all the statements: ' + modelText(p, models[0]) + '.' : PL.cap(models.length + ' situations fit all the statements:'));
      if (models.length > 1) models.forEach(function (s) { out.push('• ' + modelText(p, s)); });
      p.opts.forEach(function (o, i) {
        var holds = models.filter(function (s) { return premEval(o, s); }).length;
        out.push('“' + p.optText[i] + '” holds in ' + holds + ' of ' + models.length + (i === p.ans ? ' ✓' : '') + '.');
      });
      return out;
    }
    if (p.type === 'number') {
      var pool = []; for (var y = p.lo; y <= p.hi; y++) pool.push(y);
      p.clues.forEach(function (q, i) { pool = pool.filter(function (z) { return numProp(q).f(z, q.k, q.r); }); out.push('After clue ' + (i + 1) + ': ' + pool.length + ' candidate' + (pool.length === 1 ? '' : 's') + (pool.length <= 10 ? ' (' + pool.join(', ') + ')' : '') + '.'); });
      return out;
    }
    if (p.type === 'fut') return ['Each row and column holds every number once; the signs then force a unique arrangement (verified by an exhaustive solver).'];
    return out;
  }
  function modelText(p, s) { return s.map(function (b, v) { return p.atoms[v][b ? 0 : 1]; }).join('; '); }
  function review(p, gs) {
    return h('div', { class: 'review' },
      h('p', { class: 'prob' }, p.intro),
      p.clueText ? h('ol', { class: 'clues' }, p.clueText.map(function (t) { return h('li', null, t); })) : null,
      p.type === 'cond' ? h('p', null, p.ask) : null,
      h('div', { class: 'lbl' }, 'Solution'), solutionView(p),
      h('div', { class: 'lbl' }, 'Reasoning'), h('ol', { class: 'steps' }, explanation(p).map(function (l) { return h('li', null, l); })));
  }
  function stats(atts) {
    var by = {};
    atts.forEach(function (a) { var t = a.metrics && a.metrics.type; if (!t) return; (by[t] = by[t] || { n: 0, ok: 0, un: 0 }); by[t].n++; if (a.outcome === 'solved') by[t].ok++; if (a.metrics.unaided) by[t].un++; });
    var rows = [['Solved without help', atts.length ? Math.round(100 * atts.filter(function (a) { return a.metrics && a.metrics.unaided; }).length / atts.length) + '%' : '—']];
    Object.keys(by).forEach(function (t) { rows.push([TYPE_NAMES[t], by[t].ok + '/' + by[t].n + ' solved · ' + by[t].un + ' unaided']); });
    return rows;
  }
  PL.games.logic = {
    id: 'logic', name: 'Logic Lab', blurb: 'Grids, orderings, liars, conditionals and more.',
    rules: 'Each puzzle gives complete, consistent clues with exactly one answer. Use the workspace to record deductions and check when you are done. Hints point to the next valid deduction rather than giving away the answer.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 120 + lv * 45; }, timeLimit: function (lv) { return 300 + lv * 60; },
    _gen: { grid: gridGen, order: orderGen, sched: schedGen, kk: kkGen, cond: condGen, number: numberGen, fut: futGen },
    _check: { isCorrect: isCorrect, explanation: explanation, futCount: futCount, all: assignAll, clueEval: clueEval, kkEval: kkEval, premEval: premEval, numProp: numProp, deduce: deduce }
  };
})();

;
/* ===== Shared five-letter word helpers (Word Grid, Word Count) ===== */
(function () {
  var h = PL.h;
  var F = null;
  function unpack(s) { var out = []; for (var i = 0; i < s.length; i += 5) out.push(s.substr(i, 5)); return out; }
  function data() {
    if (F) return F;
    var d = PL.data.five || { t1: '', t2: '', t3: '', g: '' };
    F = { t1: unpack(d.t1), t2: unpack(d.t2), t3: unpack(d.t3), guess: new Set(unpack(d.g)) };
    F.t1.concat(F.t2, F.t3).forEach(function (w) { F.guess.add(w); });
    F.neighbors = {}; // words in t1+t2 that differ from w in exactly one position (traps like _ight)
    var common = F.t1.concat(F.t2), bucket = {};
    common.forEach(function (w) { for (var i = 0; i < 5; i++) { var k = w.slice(0, i) + '_' + w.slice(i + 1); (bucket[k] = bucket[k] || []).push(w); } });
    common.forEach(function (w) { var n = 0; for (var i = 0; i < 5; i++) n += bucket[w.slice(0, i) + '_' + w.slice(i + 1)].length - 1; F.neighbors[w] = n; });
    return F;
  }
  function repeats(w) { return new Set(w.split('')).size < 5; }
  /* Wordle-style marks with correct duplicate handling: each answer letter is used at most once. 2 = right spot, 1 = elsewhere, 0 = absent */
  function marks(guess, answer) {
    var m = [0, 0, 0, 0, 0], left = {};
    for (var i = 0; i < 5; i++) { if (guess[i] === answer[i]) m[i] = 2; else left[answer[i]] = (left[answer[i]] || 0) + 1; }
    for (i = 0; i < 5; i++) if (m[i] !== 2 && left[guess[i]]) { m[i] = 1; left[guess[i]]--; }
    return m;
  }
  function counts(guess, answer) { var m = marks(guess, answer), c = [0, 0, 0]; m.forEach(function (x) { c[x === 2 ? 0 : x === 1 ? 1 : 2]++; }); return c; } // [right spot, wrong spot, absent]
  var ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  function keyboard(opts) { // opts: state(letter)->class, onKey(k), allowed (Set|null)
    return h('div', { class: 'kb', role: 'group', 'aria-label': 'Keyboard' }, ROWS.map(function (row, ri) {
      var keys = row.split('').map(function (ch) {
        var dis = opts.allowed && !opts.allowed.has(ch);
        return h('button', { class: 'kbk ' + (opts.state ? opts.state(ch) : '') + (dis ? ' off' : ''), disabled: dis || opts.disabled, 'aria-label': ch.toUpperCase(), onclick: function () { opts.onKey(ch); } }, ch.toUpperCase());
      });
      if (ri === 2) { keys.unshift(h('button', { class: 'kbk wide', disabled: opts.disabled, onclick: function () { opts.onKey('enter'); } }, 'Enter')); keys.push(h('button', { class: 'kbk wide', disabled: opts.disabled, 'aria-label': 'Delete', onclick: function () { opts.onKey('del'); } }, '⌫')); }
      return h('div', { class: 'kbr' }, keys);
    }));
  }
  /* physical keyboard support (one listener for the whole app; routed to whichever game registered last) */
  var keyHandler = null;
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('keydown', function (e) {
    if (!keyHandler || !document.querySelector('.five')) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'Enter') { e.preventDefault(); keyHandler('enter'); } else if (e.key === 'Backspace') { e.preventDefault(); keyHandler('del'); } else if (e.key === ' ') { e.preventDefault(); keyHandler('blank'); } else if (/^[a-zA-Z]$/.test(e.key)) keyHandler(e.key.toLowerCase());
  });
  function streaks(atts) {
    var cur = 0, best = 0;
    atts.forEach(function (a) { if (a.outcome === 'solved') { cur++; best = Math.max(best, cur); } else cur = 0; });
    return { cur: cur, best: best };
  }
  function pickAnswer(rng, pool, avoid) {
    var fresh = pool.filter(function (w) { return !avoid[w]; });
    return rng.pick(fresh.length > 20 ? fresh : pool);
  }
  PL.five = { data: data, marks: marks, counts: counts, repeats: repeats, keyboard: keyboard, setKeyHandler: function (f) { keyHandler = f; }, streaks: streaks, pickAnswer: pickAnswer };
})();

;
/* ===== GAME 12: WORD GRID — classic five-letter deduction with per-letter colours ===== */
(function () {
  var h = PL.h, X = PL.five;
  function pool(lv, rng) {
    var F = X.data(), nr = function (w) { return !X.repeats(w); };
    if (lv <= 2) return F.t1.filter(function (w) { return nr(w) && F.neighbors[w] <= 4; });
    if (lv <= 4) return F.t1.filter(nr);
    if (lv <= 6) return F.t1.concat(F.t2).filter(nr);
    if (lv <= 8) return F.t1.concat(F.t2);
    // 9–10: tricky families (many one-letter neighbours) or repeated letters, still common words
    var tricky = F.t1.concat(F.t2).filter(function (w) { return F.neighbors[w] >= 5 || X.repeats(w); });
    return lv === 10 && rng.chance(0.25) ? F.t3 : tricky;
  }
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), avoid = {};
    ((ctx && ctx.seenWords) || []).forEach(function (w) { avoid[String(w).toLowerCase()] = 1; });
    var P = pool(lv, rng);
    return { w: X.pickAnswer(rng, P, avoid), max: 6, lv: lv };
  }
  function init(p) { return { rows: [], cur: '', hard: !!(PL.model && PL.model.settings && PL.model.settings().wgHard), reveal: [] }; }
  function letterState(gs) {
    var st = {};
    gs.rows.forEach(function (r) { r.g.split('').forEach(function (ch, i) { st[ch] = Math.max(st[ch] == null ? -1 : st[ch], r.m[i]); }); });
    return st;
  }
  function hardViolation(gs, g) {
    for (var k = 0; k < gs.rows.length; k++) {
      var r = gs.rows[k];
      for (var i = 0; i < 5; i++) {
        if (r.m[i] === 2 && g[i] !== r.g[i]) return 'Letter ' + (i + 1) + ' must be ' + r.g[i].toUpperCase() + '.';
      }
      var need = {};
      for (i = 0; i < 5; i++) if (r.m[i] > 0) need[r.g[i]] = (need[r.g[i]] || 0) + 1;
      for (var ch in need) { var have = g.split('').filter(function (c) { return c === ch; }).length; if (have < need[ch]) return 'Your guess must contain ' + ch.toUpperCase() + '.'; }
    }
    return null;
  }
  function candidates(p, gs) {
    var P = X.data().t1.concat(X.data().t2, X.data().t3);
    return P.filter(function (w) { return gs.rows.every(function (r) { return X.marks(r.g, w).join('') === r.m.join(''); }); });
  }
  function view(api) {
    var p = api.p, gs = api.gs, F = X.data();
    var over = api.done;
    function submit() {
      var g = gs.cur;
      if (g.length < 5) { api.toast('Not enough letters.', ''); return; }
      if (!F.guess.has(g)) { api.toast('“' + g.toUpperCase() + '” isn’t in the word list.', 'bad'); return; }
      if (gs.hard) { var v = hardViolation(gs, g); if (v) { api.toast('Hard mode: ' + v, 'bad'); return; } }
      gs.rows.push({ g: g, m: X.marks(g, p.w) }); gs.cur = '';
      if (g === p.w) { api.update(gs); api.finish('solved'); return; }
      api.wrong();
      if (gs.rows.length >= p.max) { api.update(gs); api.finish('failed'); return; }
      api.update(gs);
    }
    function onKey(k) {
      if (over) return;
      if (k === 'enter') return submit();
      if (k === 'del') { gs.cur = gs.cur.slice(0, -1); api.save(gs); rerenderRows(); return; }
      if (k.length !== 1) return;
      if (gs.cur.length < 5) { gs.cur += k; api.save(gs); rerenderRows(); }
    }
    X.setKeyHandler(onKey);
    var grid = h('div', { class: 'wg-grid' });
    function rerenderRows() {
      grid.innerHTML = '';
      for (var r = 0; r < p.max; r++) {
        var row = gs.rows[r], cells = [];
        for (var i = 0; i < 5; i++) {
          var ch = row ? row.g[i] : (r === gs.rows.length ? gs.cur[i] || '' : '');
          var cls = row ? ['absent', 'present', 'correct'][row.m[i]] : ch ? 'typed' : '';
          cells.push(h('div', { class: 'wg-cell ' + cls, 'aria-label': ch ? ch.toUpperCase() + (row ? ' ' + cls : '') : 'empty' }, ch.toUpperCase()));
        }
        grid.appendChild(h('div', { class: 'wg-row' }, cells));
      }
    }
    rerenderRows();
    var st = letterState(gs);
    return h('div', { class: 'wordgrid five' },
      gs.rows.length === 0 && !over ? h('label', { class: 'switch small' }, h('input', { type: 'checkbox', checked: gs.hard, onchange: function () { gs.hard = this.checked; PL.model.setSetting('wgHard', gs.hard); api.save(gs); } }), ' Hard mode: revealed letters must be reused') : gs.hard ? h('div', { class: 'muted small' }, 'Hard mode') : null,
      gs.reveal.length ? h('div', { class: 'wg-reveal mono' }, [0, 1, 2, 3, 4].map(function (i) { return h('span', { class: 'lt' + (gs.reveal.indexOf(i) >= 0 ? ' lt-ch' : '') }, gs.reveal.indexOf(i) >= 0 ? p.w[i].toUpperCase() : '·'); })) : null,
      grid,
      over ? null : X.keyboard({ onKey: onKey, state: function (ch) { return st[ch] == null ? '' : ['absent', 'present', 'correct'][st[ch]]; } }));
  }
  function hint(p, gs) {
    var known = {}; gs.rows.forEach(function (r) { r.m.forEach(function (m, i) { if (m === 2) known[i] = 1; }); });
    gs.reveal.forEach(function (i) { known[i] = 1; });
    var hidden = [0, 1, 2, 3, 4].filter(function (i) { return !known[i]; });
    if (hidden.length <= 1) return { msg: 'Only one letter is left to find — no more hints for this word.', noCount: true };
    var i = hidden[Math.floor(hidden.length / 2)];
    gs.reveal.push(i);
    var n = candidates(p, gs).filter(function (w) { return gs.reveal.every(function (j) { return w[j] === p.w[j]; }); }).length;
    return { msg: 'Letter ' + (i + 1) + ' is ' + p.w[i].toUpperCase() + '. ' + PL.plural(n, 'word') + ' still fit everything you know.', gs: gs };
  }
  var GQ = [100, 100, 92, 82, 70, 58];
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved', n = gs.rows.length;
    var q = solved ? PL.clamp(GQ[n - 1] - ctx.hints * 12, 10, 100) : 0;
    var first = gs.rows[0] ? gs.rows[0].m : [];
    return { quality: Math.round(q), metrics: { guesses: n, solved: solved, hard: gs.hard, firstGreen: first.filter(function (x) { return x === 2; }).length, firstYellow: first.filter(function (x) { return x === 1; }).length, word: p.w },
      lines: [['Word', p.w.toUpperCase()], ['Guesses', solved ? n + ' / 6' : 'X / 6'], ['Hard mode', gs.hard ? 'On' : 'Off']] };
  }
  function review(p, gs) {
    return h('div', { class: 'review' }, h('div', null, h('span', { class: 'lbl' }, 'The word '), h('b', { class: 'mono' }, p.w.toUpperCase())),
      h('div', { class: 'wg-grid small' }, gs.rows.map(function (r) { return h('div', { class: 'wg-row' }, r.g.split('').map(function (ch, i) { return h('div', { class: 'wg-cell ' + ['absent', 'present', 'correct'][r.m[i]] }, ch.toUpperCase()); })); })));
  }
  function stats(atts) {
    var wins = atts.filter(function (a) { return a.outcome === 'solved'; }), dist = [0, 0, 0, 0, 0, 0];
    wins.forEach(function (a) { var g = a.metrics.guesses; if (g >= 1 && g <= 6) dist[g - 1]++; });
    var s = X.streaks(atts);
    return [['Win rate', atts.length ? Math.round(100 * wins.length / atts.length) + '%' : '—'],
      ['Average guesses (wins)', wins.length ? PL.mean(wins.map(function (a) { return a.metrics.guesses; })).toFixed(2) : '—'],
      ['Guess distribution 1–6', dist.join(' · ')],
      ['Current streak', s.cur], ['Best streak', s.best],
      ['Average greens on first guess', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.firstGreen || 0; })).toFixed(2) : '—'],
      ['Hard-mode wins', wins.filter(function (a) { return a.metrics.hard; }).length]];
  }
  PL.games.wordgrid = {
    id: 'wordgrid', name: 'Word Grid', blurb: 'Find the five-letter word in six guesses.',
    rules: 'Guess the hidden five-letter word in six tries. After each guess, green means the right letter in the right spot, gold means the letter is in the word elsewhere, and grey means it is not in the word (or not as many times). Optional hard mode makes you reuse every revealed letter.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 90 + lv * 10; }, timeLimit: function (lv) { return 240; },
    _candidates: candidates, _pool: pool, _hard: hardViolation
  };
})();

;
/* ===== GAME 11: WORD COUNT — five-letter deduction from aggregate counts only =====
   After each guess the game reports how many letters are in the right spot, how many are in the word but elsewhere,
   and how many are absent (always totalling five), never which letters. Duplicate letters count once per occurrence. */
(function () {
  var h = PL.h, X = PL.five;
  var COMMON = 'etaoinsrhldcumfpgwybvk';
  function spec(lv) {
    if (lv <= 3) return { tier: 't1', repeats: false, pool: true };
    if (lv <= 5) return { tier: 't1', repeats: false, pool: false };
    if (lv <= 7) return { tier: 't12', repeats: false, pool: false };
    return { tier: lv >= 10 ? 't123' : 't12', repeats: true, pool: false };
  }
  function answers(sp) {
    var F = X.data(), list = sp.tier === 't1' ? F.t1 : sp.tier === 't12' ? F.t1.concat(F.t2) : F.t1.concat(F.t2, F.t3);
    return sp.repeats ? list : list.filter(function (w) { return !X.repeats(w); });
  }
  function fits(w, pool) { for (var i = 0; i < 5; i++) if (pool.indexOf(w[i]) < 0) return false; return true; }
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), sp = spec(lv), avoid = {};
    ((ctx && ctx.seenWords) || []).forEach(function (w) { avoid[String(w).toLowerCase()] = 1; });
    var list = answers(sp);
    for (var t = 0; t < 200; t++) {
      var w = X.pickAnswer(rng, list, avoid);
      if (!sp.pool) return { w: w, max: 8, lv: lv, pool: null, repeats: sp.repeats };
      // easy: a 12-letter pool containing the answer; guesses may only use these letters
      var extra = rng.shuffle(COMMON.split('').filter(function (c) { return w.indexOf(c) < 0; })).slice(0, 7);
      var pool = w.split('').concat(extra).sort().join('');
      var guessable = Array.from(X.data().guess).filter(function (g) { return fits(g, pool) && !X.repeats(g); });
      var cands = list.filter(function (g) { return fits(g, pool); });
      if (guessable.length >= 40 && cands.length >= 6) return { w: w, max: 8, lv: lv, pool: pool, repeats: false };
    }
    return { w: X.pickAnswer(rng, list, avoid), max: 8, lv: lv, pool: null, repeats: sp.repeats };
  }
  function init() { return { rows: [], cur: '', cm: {}, ws: [], tool: 0, edit: null, hin: [], told: [] }; }
  function candidates(p, gs) {
    var list = answers(spec(p.lv)).filter(function (w) { return !p.pool || fits(w, p.pool); });
    return list.filter(function (w) { return gs.rows.every(function (r) { return X.counts(r.g, w).join() === r.c.join(); }); });
  }
  /* ---- deduction workspace ----
     Your own markings, never game feedback, never a hint or a guess. Every letter cell has its OWN mark, so the N in one
     row can be green while the N in another is yellow. Marks: 0 none, 1 green (right spot), 2 yellow (in the word,
     elsewhere), 3 red (ruled out). Working rows below the guesses hold any letters or blanks ("_ A _ E _"). */
  var MARK = ['', 'm1', 'm2', 'm3'], MARK_NAME = ['unmarked', 'green', 'yellow', 'red'];
  function upgrade(gs) { // records saved before per-cell marks: one mark per LETTER (1 maybe, 2 out, 3 in)
    if (!gs.cm) {
      var old = gs.mk || {}, map = { 1: 2, 2: 3, 3: 1 }; gs.cm = {};
      gs.hin = gs.hin || [];
      (gs.told || []).forEach(function (t) { var m = /^([A-Z]) is in the word/.exec(t) || /is ([A-Z])\.$/.exec(t); if (m && gs.hin.indexOf(m[1].toLowerCase()) < 0) gs.hin.push(m[1].toLowerCase()); });
      gs.rows.forEach(function (r, i) { gs.cm[i] = r.g.split('').map(function (ch) { return gs.hin.indexOf(ch) >= 0 && old[ch] === 3 ? 0 : (map[old[ch]] || 0); }); });
      delete gs.mk; delete gs.markMode;
    }
    gs.ws = gs.ws || []; gs.tool = gs.tool || 0; gs.hin = gs.hin || []; if (gs.edit === undefined) gs.edit = null;
    return gs;
  }
  function letterState(gs, ch) { // keyboard tint summarises your marks: any green > any yellow > only red
    if (gs.hin.indexOf(ch) >= 0) return 'in';
    var seen = { 1: 0, 2: 0, 3: 0 };
    gs.rows.forEach(function (r, i) { var m = gs.cm[i] || []; r.g.split('').forEach(function (c, k) { if (c === ch && m[k]) seen[m[k]]++; }); });
    gs.ws.forEach(function (row) { row.forEach(function (cell) { if (cell.l === ch && cell.m) seen[cell.m]++; }); });
    return seen[1] ? 'in' : seen[2] ? 'maybe' : seen[3] ? 'out' : '';
  }
  function view(api) {
    var p = api.p, gs = upgrade(api.gs), F = X.data(), over = api.done;
    var allowed = p.pool ? new Set(p.pool.split('')) : null;
    function save() { api.save(gs); api.update(gs); }
    function submit() {
      var g = gs.cur;
      if (g.length < 5) { api.toast('Not enough letters.', ''); return; }
      if (!F.guess.has(g)) { api.toast('“' + g.toUpperCase() + '” isn’t in the word list.', 'bad'); return; }
      if (p.pool && X.repeats(g)) { api.toast('In this puzzle, guesses can’t repeat letters.', ''); return; }
      if (gs.rows.some(function (r) { return r.g === g; })) { api.toast('Already guessed.', ''); return; }
      gs.rows.push({ g: g, c: X.counts(g, p.w) }); gs.cm[gs.rows.length - 1] = [0, 0, 0, 0, 0]; gs.cur = '';
      if (g === p.w) { api.update(gs); api.finish('solved'); return; }
      api.wrong();
      if (gs.rows.length >= p.max) { api.update(gs); api.finish('failed'); return; }
      api.update(gs);
    }
    function applyMark(cur) { // the selected colour; tapping a cell that already has it clears it
      if (gs.tool === 4) return 0;
      if (gs.tool) return cur === gs.tool ? 0 : gs.tool;
      return (cur + 1) % 4; // no colour selected: tap cycles none → green → yellow → red → none
    }
    function markGuess(r, k) { var m = gs.cm[r] = gs.cm[r] || [0, 0, 0, 0, 0]; m[k] = applyMark(m[k] || 0); save(); }
    function wsTap(r, k) {
      var cell = gs.ws[r][k];
      if (gs.tool) { cell.m = applyMark(cell.m || 0); save(); return; }
      gs.edit = gs.edit && gs.edit.r === r && gs.edit.i === k ? null : { r: r, i: k }; save();
    }
    function onKey(k) {
      if (over) return;
      if (gs.edit) { // typing into a working row; the official guess is untouched
        var row = gs.ws[gs.edit.r]; if (!row) { gs.edit = null; return save(); }
        if (k === 'enter') { gs.edit = null; return save(); }
        if (k === 'del') { if (row[gs.edit.i].l) row[gs.edit.i].l = ''; else if (gs.edit.i > 0) { gs.edit.i--; row[gs.edit.i].l = ''; } return save(); }
        if (k === 'blank') { row[gs.edit.i].l = ''; if (gs.edit.i < 4) gs.edit.i++; return save(); }
        if (k.length === 1) { row[gs.edit.i].l = k; if (gs.edit.i < 4) gs.edit.i++; return save(); }
        return;
      }
      if (k === 'enter') return submit();
      if (k === 'del') { gs.cur = gs.cur.slice(0, -1); return save(); }
      if (k.length !== 1) return;
      if (allowed && !allowed.has(k)) return;
      if (gs.cur.length < 5) { gs.cur += k; save(); }
    }
    X.setKeyHandler(onKey);
    var rows = gs.rows.map(function (r, ri) {
      var m = gs.cm[ri] || [];
      return h('div', { class: 'wc-row' + (ri === gs.rows.length - 1 && PL.fx && PL.fx.once('wc:' + p.w + ':' + gs.rows.length + ':' + (gs.rows[ri].g)) ? ' fresh' : '') },
        h('div', { class: 'wc-word' }, r.g.split('').map(function (ch, k) { return h('button', { class: 'wc-l ' + MARK[m[k] || 0], style: '--d:' + (k * 60) + 'ms', 'aria-label': ch.toUpperCase() + ', marked ' + MARK_NAME[m[k] || 0] + ' (tap to mark)', disabled: over, onclick: function () { markGuess(ri, k); } }, ch.toUpperCase()); })),
        h('div', { class: 'wc-counts', 'aria-label': r.c[0] + ' right spot, ' + r.c[1] + ' wrong spot, ' + r.c[2] + ' absent' },
          h('span', { class: 'wc-c g' }, String(r.c[0])), h('span', { class: 'wc-c y' }, String(r.c[1])), h('span', { class: 'wc-c x' }, String(r.c[2]))));
    });
    if (!over) rows.push(h('div', { class: 'wc-row cur' + (gs.edit ? ' idle' : '') }, h('div', { class: 'wc-word' }, [0, 1, 2, 3, 4].map(function (i) { return h('span', { class: 'wc-l typed' }, (gs.cur[i] || '').toUpperCase()); })), h('div', { class: 'muted small' }, (p.max - gs.rows.length) + ' left')));
    var tools = over ? null : h('div', { class: 'wc-tools', role: 'toolbar', 'aria-label': 'Marking colour' },
      h('span', { class: 'small muted' }, 'Mark:'),
      [[1, 'Green', 'right spot'], [2, 'Yellow', 'elsewhere'], [3, 'Red', 'ruled out'], [4, 'Clear', 'remove a mark']].map(function (t) {
        return h('button', { class: 'wc-tool t' + t[0] + (gs.tool === t[0] ? ' on' : ''), 'aria-pressed': gs.tool === t[0] ? 'true' : 'false', title: t[2], onclick: function () { gs.tool = gs.tool === t[0] ? 0 : t[0]; gs.edit = null; save(); } }, t[1]);
      }));
    var wsEl = over && !gs.ws.length ? null : h('div', { class: 'wc-ws' },
      h('div', { class: 'ws-head' }, h('span', { class: 'lbl' }, 'Working rows'), over ? null : h('button', { class: 'btn ghost sm', onclick: function () { gs.ws.push([0, 1, 2, 3, 4].map(function () { return { l: '', m: 0 }; })); gs.tool = 0; gs.edit = { r: gs.ws.length - 1, i: 0 }; save(); } }, '+ Row')),
      gs.ws.length ? null : h('div', { class: 'muted small' }, 'Add a row to sketch ideas like _ A _ E _. Tap a square, then type; blanks stay blank. Nothing here is a guess.'),
      gs.ws.map(function (row, r) {
        return h('div', { class: 'wc-row' },
          h('div', { class: 'wc-word' }, row.map(function (cell, k) {
            var on = gs.edit && gs.edit.r === r && gs.edit.i === k;
            return h('button', { class: 'wc-l ws ' + MARK[cell.m || 0] + (on ? ' editing' : '') + (cell.l ? '' : ' blank'), disabled: over, 'aria-label': 'Working row ' + (r + 1) + ' square ' + (k + 1) + ': ' + (cell.l ? cell.l.toUpperCase() : 'blank') + ', ' + MARK_NAME[cell.m || 0], onclick: function () { wsTap(r, k); } }, cell.l ? cell.l.toUpperCase() : '_');
          })),
          over ? null : h('div', { class: 'row-actions' },
            h('button', { class: 'btn ghost xs', 'aria-label': 'Clear row ' + (r + 1), onclick: function () { row.forEach(function (c) { c.l = ''; c.m = 0; }); gs.edit = { r: r, i: 0 }; save(); } }, 'Clear'),
            h('button', { class: 'btn ghost xs', 'aria-label': 'Delete row ' + (r + 1), onclick: function () { gs.ws.splice(r, 1); gs.edit = null; save(); } }, '✕')));
      }),
      gs.edit && !over ? h('div', { class: 'row-actions' }, h('span', { class: 'small muted' }, 'Typing into working row ' + (gs.edit.r + 1) + '.'), h('button', { class: 'btn ghost sm', onclick: function () { onKey('blank'); } }, 'Blank _'), h('button', { class: 'btn sm', onclick: function () { gs.edit = null; save(); } }, 'Done')) : null);
    return h('div', { class: 'wordcount five' },
      h('div', { class: 'wc-legend small' }, h('span', { class: 'wc-c g' }, '#'), ' right letter, right spot  ', h('span', { class: 'wc-c y' }, '#'), ' in the word, wrong spot  ', h('span', { class: 'wc-c x' }, '#'), ' not in the word'),
      p.pool ? h('div', { class: 'muted small' }, 'Letters in play: ' + p.pool.toUpperCase().split('').join(' ') + '. Guesses use only these letters, with no repeats.') : p.repeats ? h('div', { class: 'muted small' }, 'The hidden word may repeat a letter.') : h('div', { class: 'muted small' }, 'The hidden word has five different letters.'),
      gs.told.length ? h('div', { class: 'wc-told small' }, gs.told.join(' · ')) : null,
      h('div', { class: 'wc-rows' }, rows),
      tools,
      over ? null : h('div', { class: 'muted small' }, gs.tool ? (gs.tool === 4 ? 'Tap a letter to clear its mark.' : 'Tap letters to mark them ' + MARK_NAME[gs.tool] + '; tap again to clear. Tap the colour again to stop.') : 'Tap a letter to cycle its mark (green → yellow → red → none), or pick a colour. Each letter is marked on its own. Marks are your notes, not feedback.'),
      wsEl,
      over ? null : X.keyboard({ onKey: onKey, allowed: gs.edit ? null : allowed, state: function (ch) { return letterState(gs, ch); } }));
  }
  /* Hints alternate between confirming a letter that is in the word and placing a letter in its spot; each also says
     how many words still fit the feedback. Hint letters are kept apart from your own marks. */
  function remaining(p, gs) {
    var hin = gs.hin || [];
    return candidates(p, gs).filter(function (w) { return (gs.placed || []).every(function (i) { return w[i] === p.w[i]; }) && hin.every(function (c) { return w.indexOf(c) >= 0; }); });
  }
  function hint(p, gs) {
    upgrade(gs);
    gs.hn = gs.hn || 0; gs.placed = gs.placed || [];
    var letters = p.w.split('').filter(function (c, i, a) { return a.indexOf(c) === i; });
    if (remaining(p, gs).length <= 1) return { msg: 'Only one word fits everything you know now — you can get it!', noCount: true };
    var confirmed = letters.filter(function (c) { return gs.hin.indexOf(c) >= 0; }).length;
    var msg = null;
    if (gs.hn % 2 === 0 && confirmed < letters.length - 1) {
      var c = letters.filter(function (x) { return gs.hin.indexOf(x) < 0; })[0];
      gs.hin.push(c); msg = c.toUpperCase() + ' is in the word.';
    } else if (gs.placed.length < 3) {
      var i = [0, 1, 2, 3, 4].filter(function (k) { return gs.placed.indexOf(k) < 0; })[0];
      gs.placed.push(i); if (gs.hin.indexOf(p.w[i]) < 0) gs.hin.push(p.w[i]); msg = 'Letter ' + (i + 1) + ' is ' + p.w[i].toUpperCase() + '.';
    } else return { msg: 'No more hints for this word.', noCount: true };
    gs.hn++;
    gs.told.push(msg);
    var n = remaining(p, gs).length;
    return { msg: msg + ' ' + PL.plural(n, 'possible answer') + (n === 1 ? ' remains.' : ' remain.'), gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved', n = gs.rows.length;
    var q = solved ? PL.clamp(100 - Math.max(0, n - 4) * 12 - ctx.hints * 12, 15, 100) : 0;
    var first = gs.rows[0] ? gs.rows[0].c : [0, 0, 5];
    return { quality: Math.round(q), metrics: { guesses: n, solved: solved, firstGreen: first[0], firstYellow: first[1], word: p.w, pool: !!p.pool, repeats: p.repeats },
      lines: [['Word', p.w.toUpperCase()], ['Guesses', solved ? n + ' / 8' : 'X / 8']] };
  }
  function review(p, gs) {
    return h('div', { class: 'review' }, h('div', null, h('span', { class: 'lbl' }, 'The word '), h('b', { class: 'mono' }, p.w.toUpperCase())),
      h('div', { class: 'wc-rows' }, gs.rows.map(function (r) { return h('div', { class: 'wc-row' }, h('span', { class: 'mono' }, r.g.toUpperCase()), h('div', { class: 'wc-counts' }, h('span', { class: 'wc-c g' }, String(r.c[0])), h('span', { class: 'wc-c y' }, String(r.c[1])), h('span', { class: 'wc-c x' }, String(r.c[2])))); })));
  }
  function stats(atts) {
    var wins = atts.filter(function (a) { return a.outcome === 'solved'; }), dist = [0, 0, 0, 0, 0, 0, 0, 0];
    wins.forEach(function (a) { var g = a.metrics.guesses; if (g >= 1 && g <= 8) dist[g - 1]++; });
    var s = X.streaks(atts);
    return [['Win rate', atts.length ? Math.round(100 * wins.length / atts.length) + '%' : '—'],
      ['Average guesses (wins)', wins.length ? PL.mean(wins.map(function (a) { return a.metrics.guesses; })).toFixed(2) : '—'],
      ['Guess distribution 1–8', dist.join(' · ')],
      ['First guess: average right-spot / wrong-spot', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.firstGreen || 0; })).toFixed(1) + ' / ' + PL.mean(atts.map(function (a) { return a.metrics.firstYellow || 0; })).toFixed(1) : '—'],
      ['Current streak', s.cur], ['Best streak', s.best]];
  }
  PL.games.wordcount = {
    id: 'wordcount', name: 'Word Count', blurb: 'Deduce a word from letter counts alone.',
    rules: 'Guess the hidden five-letter word in eight tries. After each guess you only learn three numbers: letters in the right spot, letters in the word but in the wrong spot, and letters not in the word. You never learn which letters they are. Mark any letter green, yellow or red to keep track (each letter on its own), and use working rows with blanks such as _ A _ E _ to try ideas. Marks and working rows are your notes, never guesses or hints.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 180 + lv * 30; }, timeLimit: function (lv) { return 600; },
    _candidates: candidates, _spec: spec, _upgrade: upgrade, _letterState: letterState
  };
})();

;
/* ===== Shared letter-grid tracing (Word Rush, Word Trails) =====
   Drag a finger across adjacent letters (including diagonals) to build a word, or tap letters one by one and press
   Enter. Each cell can be used once per word. Hit areas are circles a little smaller than the cell, so diagonal moves
   do not accidentally pick up neighbouring cells. */
(function () {
  var h = PL.h;
  function adj(a, b, cols) { var ra = Math.floor(a / cols), ca = a % cols, rb = Math.floor(b / cols), cb = b % cols; return a !== b && Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1; }
  /* opts: rows, cols, letters (array of strings, may be 'QU'), cellClass(i) -> string, cellBadge(i) -> number|null, onSubmit(path) -> void, disabled,
           lines: array of {path, cls} drawn as connectors (found words) */
  function traceGrid(opts) {
    var path = [], cells = [];
    var wrap = h('div', { class: 'tr-wrap' });
    var word = h('div', { class: 'tr-word mono', 'aria-live': 'polite' }, ' ');
    var grid = h('div', { class: 'tr-grid', style: { 'grid-template-columns': 'repeat(' + opts.cols + ', 1fr)' } });
    var svg = PL.svg('svg', { class: 'tr-lines', 'aria-hidden': 'true' });
    opts.letters.forEach(function (L, i) {
      var badge = opts.cellBadge ? opts.cellBadge(i) : null;
      var c = h('div', { class: 'tr-cell ' + (opts.cellClass ? opts.cellClass(i) : ''), 'data-i': i, role: 'button', 'aria-label': L + ' row ' + (Math.floor(i / opts.cols) + 1) + ' column ' + (i % opts.cols + 1) + (badge ? ', hint step ' + badge : '') }, h('span', null, L.length > 1 ? L[0] + L.slice(1).toLowerCase() : L), badge ? h('b', { class: 'tr-ord' }, String(badge)) : null);
      cells.push(c); grid.appendChild(c);
    });
    wrap.appendChild(grid); wrap.appendChild(svg);
    function centre(i) { var g = grid.getBoundingClientRect(), b = cells[i].getBoundingClientRect(); return [b.left - g.left + b.width / 2, b.top - g.top + b.height / 2]; }
    function drawLines() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var g = grid.getBoundingClientRect(); svg.setAttribute('viewBox', '0 0 ' + g.width + ' ' + g.height); svg.style.width = g.width + 'px'; svg.style.height = g.height + 'px';
      (opts.lines || []).concat(path.length > 1 ? [{ path: path, cls: 'cur' }] : []).forEach(function (ln) {
        if (ln.path.length < 2) return;
        var pts = ln.path.map(function (i) { return centre(i).map(function (v) { return v.toFixed(1); }).join(','); }).join(' ');
        svg.appendChild(PL.svg('polyline', { points: pts, class: 'tr-line ' + (ln.cls || '') }));
      });
    }
    function refresh() {
      cells.forEach(function (c, i) { c.classList.toggle('on', path.indexOf(i) >= 0); c.classList.toggle('last', path[path.length - 1] === i); });
      word.textContent = path.length ? path.map(function (i) { return opts.letters[i]; }).join('') : ' ';
      drawLines();
    }
    function hit(x, y) {
      for (var i = 0; i < cells.length; i++) {
        var b = cells[i].getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        if (Math.hypot(x - cx, y - cy) <= b.width * 0.42) return i;
      }
      return -1;
    }
    function extend(i) {
      if (i < 0) return;
      var n = path.length;
      if (n >= 2 && path[n - 2] === i) { path.pop(); refresh(); return; } // slide back to undo the last letter
      if (path.indexOf(i) >= 0) return;
      if (n && !adj(path[n - 1], i, opts.cols)) return;
      path.push(i); refresh();
    }
    function submit() { if (!path.length) return; var p = path.slice(); path = []; refresh(); opts.onSubmit(p); }
    var dragging = false, moved = false, startCell = -1;
    grid.addEventListener('pointerdown', function (e) {
      if (opts.disabled) return;
      e.preventDefault();
      try { grid.setPointerCapture(e.pointerId); } catch (x) { }
      var i = hit(e.clientX, e.clientY); dragging = true; moved = false; startCell = i;
      if (i < 0) return;
      if (path.length && path[path.length - 1] === i) return; // tapping the last letter again submits on release
      if (path.length && !adj(path[path.length - 1], i, opts.cols)) path = [];
      extend(i);
    });
    grid.addEventListener('pointermove', function (e) {
      if (!dragging) return; e.preventDefault();
      var i = hit(e.clientX, e.clientY);
      if (i >= 0 && i !== path[path.length - 1]) { moved = true; extend(i); }
    });
    function up(e) {
      if (!dragging) return; dragging = false;
      if (moved && path.length >= 2) submit();                       // traced a word in one stroke
      else if (!moved && startCell >= 0 && path.length > 1 && path[path.length - 1] === startCell && wrap.dataset.lastTap === String(startCell)) submit(); // double-tap last letter
      wrap.dataset.lastTap = String(startCell);
    }
    // a cancelled touch (iOS takes the gesture for scrolling, zoom or a system swipe) must never submit a word
    grid.addEventListener('pointerup', up); grid.addEventListener('pointercancel', function () { dragging = false; });
    var controls = h('div', { class: 'row-actions tr-controls' },
      h('button', { class: 'btn ghost sm', onclick: function () { path = []; refresh(); } }, 'Clear'),
      h('button', { class: 'btn sm primary', onclick: submit }, 'Enter'));
    setTimeout(drawLines, 0);
    window.addEventListener('resize', drawLines);
    return { el: h('div', { class: 'trace' }, word, wrap, opts.disabled ? null : controls), submit: submit, select: function (p) { path = p.slice(); refresh(); } };
  }
  PL.trace = { grid: traceGrid, adj: adj };
})();

;
/* ===== GAME 15: WORD RUSH — find words in a letter grid =====
   Every word on the board is computed in advance by a depth-first search over the game dictionary with a prefix set,
   so scoring is exact and missed words can be listed afterwards. Timed (1–3 minutes) or untimed rounds.

   Scoring v2 (coverage of what THIS board offers; v1 compared points with a small fixed-share target and was too easy):
   - valid      every dictionary word on the board (tiers A, B, C) is accepted.
   - findable   the "reasonably discoverable" pool: common words (tier A) plus their plain inflections (ants, baked, ...).
                The benchmark is calibrated on this pool only.
   - bonus      every other valid word (rarer words). They add to your words and points but are never needed for 100.
   Benchmark:   K = words an excellent player finds here. Untimed: 60% of the findable pool (at most 20 + 30% on very rich boards).
                Timed: the smaller of that and 10 words a minute + 2 (1 min 12, 2 min 22, 3 min 32).
                Kp = K × (1 + average points of a findable word) / 2  (credits longer words without demanding them).
   Ratio r = ½ · words found / K  +  ½ · points earned / Kp      (bonus words count in both)
   Quality = round(100 · min(r, 1)^0.6) − 6 per hint.  r = 1 → 100, 0.9 → 94, 0.75 → 84, 0.5 → 66, 0.25 → 43.
   Results saved under v1 are re-scored with the same formula from the stored board and words; the old score is kept. */
(function () {
  var h = PL.h;
  var PRE = null, WORDS = null;
  function lex() {
    if (WORDS) return;
    WORDS = new Set(); PRE = new Set();
    for (var L = 3; L <= 10; L++) PL.dict.words(L, ['A', 'B', 'C']).forEach(function (w) {
      if (/q(?!u)/.test(w)) return;
      WORDS.add(w); for (var k = 1; k < w.length; k++) PRE.add(w.slice(0, k));
    });
  }
  // letter weights (English frequency, tuned for play); "Qu" is one tile
  var FREQ = { e: 12, a: 9, i: 8, o: 8, t: 9, n: 7, s: 7, r: 7, h: 4, l: 5, d: 4, c: 3, u: 4, m: 3, f: 2, p: 3, g: 2, w: 2, y: 2, b: 2, v: 1, k: 1, x: 0.4, j: 0.3, qu: 0.4, z: 0.3 };
  var VOW = { a: 1, e: 1, i: 1, o: 1, u: 1 };
  function points(len) { return len <= 4 ? 1 : len === 5 ? 2 : len === 6 ? 3 : len === 7 ? 5 : 11; }
  function solve(letters, cols) {
    lex();
    var n = letters.length, found = new Set(), used = [];
    function dfs(i, s) {
      var t = s + letters[i].toLowerCase();
      if (t.length > 10) return;
      if (t.length >= 3 && WORDS.has(t)) found.add(t);
      if (!PRE.has(t)) return;
      used[i] = 1;
      for (var j = 0; j < n; j++) if (!used[j] && PL.trace.adj(i, j, cols)) dfs(j, t);
      used[i] = 0;
    }
    for (var i = 0; i < n; i++) dfs(i, '');
    return Array.from(found).sort(function (a, b) { return b.length - a.length || (a < b ? -1 : 1); });
  }
  var SV = 2; // scoring version
  function findable(w) { // tier A, or a plain inflection of a tier-A word
    var t = PL.dict.tier(w); if (t === 'A') return true; if (t !== 'B') return false;
    var bases = [w.replace(/s$/, ''), w.replace(/es$/, ''), w.replace(/ies$/, 'y'), w.replace(/ed$/, ''), w.replace(/ed$/, 'e'), w.replace(/d$/, ''), w.replace(/ied$/, 'y'),
      w.replace(/ing$/, ''), w.replace(/ing$/, 'e'), w.replace(/(.)\1ing$/, '$1'), w.replace(/(.)\1ed$/, '$1'), w.replace(/er$/, ''), w.replace(/r$/, ''), w.replace(/est$/, ''), w.replace(/st$/, '')];
    return bases.some(function (b) { return b !== w && b.length >= 3 && PL.dict.tier(b) === 'A'; });
  }
  function pools(p) { // old boards carry words/common only
    if (!p._pool) {
      var disc = p.disc || p.words.filter(findable), set = {}; disc.forEach(function (w) { set[w] = 1; });
      p._pool = { disc: disc, set: set, bonus: p.words.filter(function (w) { return !set[w]; }) };
      Object.defineProperty(p, '_pool', { enumerable: false });
    }
    return p._pool;
  }
  function benchmark(p, gs) {
    var D = pools(p).disc, untimed = Math.max(5, Math.round(Math.min(0.6 * D.length, 20 + 0.3 * D.length)));
    var K = gs.mode === 'timed' ? Math.max(5, Math.min(untimed, Math.round(10 * (gs.dur || 120) / 60 + 2))) : untimed;
    var avg = D.length ? D.reduce(function (s, w) { return s + points(w.length); }, 0) / D.length : 1;
    return { words: K, pts: Math.max(5, Math.round(K * (1 + avg) / 2)), disc: D.length, discPts: D.reduce(function (s, w) { return s + points(w.length); }, 0) };
  }
  function rawRatio(p, gs) {
    var b = benchmark(p, gs), pts = score(gs);
    return { r: 0.5 * gs.found.length / b.words + 0.5 * pts / b.pts, b: b, pts: pts };
  }
  function qualityFrom(r, hints) { return PL.clamp(Math.round(100 * Math.pow(Math.min(1, Math.max(0, r)), 0.6)) - (hints || 0) * 6, 0, 100); }
  function spec(lv) {
    return { size: lv <= 6 ? 4 : 5, minWords: [0, 60, 55, 50, 45, 40, 35, 70, 60, 55, 50][lv], minLong: lv <= 3 ? 6 : lv <= 6 ? 6 : 7, frac: [0, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.2, 0.23, 0.26, 0.3][lv], vowels: lv <= 3 ? [0.32, 0.45] : [0.25, 0.45] };
  }
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), sp = spec(lv), keys = Object.keys(FREQ), wts = keys.map(function (k) { return FREQ[k]; });
    var best = null;
    for (var t = 0; t < 60; t++) {
      var n = sp.size * sp.size, letters = [];
      for (var i = 0; i < n; i++) letters.push(rng.weighted(keys, wts).toUpperCase());
      var v = letters.filter(function (L) { return VOW[L.toLowerCase()]; }).length / n;
      if (v < sp.vowels[0] || v > sp.vowels[1]) continue;
      var words = solve(letters, sp.size);
      var longest = words.filter(function (w) { return PL.dict.tier(w) === 'A'; }).reduce(function (m, w) { return Math.max(m, w.length); }, 0);
      // every dictionary word is accepted, but targets and the missed-word list use only common words (tier A)
      var common = words.filter(function (w) { return PL.dict.tier(w) === 'A'; });
      var disc = words.filter(findable);
      var cand = { size: sp.size, letters: letters, words: words, common: common, disc: disc, total: common.reduce(function (s, w) { return s + points(w.length); }, 0), lv: lv, sv: SV };
      if (!best || disc.length > best.disc.length) best = cand;
      if (disc.length >= sp.minWords && longest >= sp.minLong) { best = cand; break; }
    }
    best.frac = sp.frac;
    if (ctx && ctx.daily) { best.daily = true; best.fixedDur = 120; }
    return best;
  }
  function targetV1(p, gs) { // the old (v1) target, kept only to explain old results
    var f = p.frac || 0.2;
    if (gs.mode === 'timed') return Math.max(5, Math.round(p.total * f * Math.min(1, Math.pow((gs.dur || 120) / 180, 0.7)) * 1.2));
    return Math.max(8, Math.round(p.total * f * 1.8));
  }
  function init(p) { return p.daily ? { found: [], mode: 'timed', dur: p.fixedDur, t0: null, rejected: 0, hintWord: null, hintStage: 0, hinted: [] } : { found: [], mode: null, dur: 120, t0: null, rejected: 0, hintWord: null, hintStage: 0, hinted: [] }; }
  function score(gs) { return gs.found.reduce(function (s, w) { return s + points(w.length); }, 0); }
  function view(api) {
    var p = api.p, gs = api.gs;
    if (!gs.mode && !api.done) {
      var durSel = h('div', { class: 'seg' }, [60, 120, 180].map(function (d) { return h('button', { class: 'segb' + (gs.dur === d ? ' on' : ''), onclick: function () { gs.dur = d; api.update(gs); } }, (d / 60) + ' min'); }));
      return h('div', { class: 'wordrush' },
        h('p', { class: 'prob' }, 'Find as many words as you can by tracing adjacent letters, including diagonals. Words need at least three letters; each letter tile can be used once per word.'),
        h('div', { class: 'muted small' }, 'Points: 3–4 letters 1 · 5 letters 2 · 6 letters 3 · 7 letters 5 · 8+ letters 11'),
        h('div', { class: 'card' }, h('h3', null, 'Timed round'), durSel, h('button', { class: 'btn primary', onclick: function () { gs.mode = 'timed'; gs.t0 = api.activeMs(); api.update(gs); } }, 'Start timed round')),
        h('div', { class: 'card' }, h('h3', null, 'Untimed'), h('p', { class: 'small muted' }, 'No deadline; your time is still recorded. Finish when you are done.'), h('button', { class: 'btn', onclick: function () { gs.mode = 'untimed'; gs.t0 = api.activeMs(); api.update(gs); } }, 'Start untimed')));
    }
    if (gs.t0 == null) gs.t0 = api.activeMs();
    var rr = rawRatio(p, gs), bm = rr.b, pts = rr.pts;
    var clock = h('b', { class: 'mono wr-clock' }, '');
    function tick() {
      if (gs.mode !== 'timed' || api.done) return;
      var left = gs.dur * 1000 - (api.activeMs() - gs.t0);
      clock.textContent = PL.fmtTime(Math.max(0, left));
      clock.classList.toggle('warn', left < 15000);
      if (left <= 0) { clearInterval(iv); api.finish('solved'); }
    }
    var iv = gs.mode === 'timed' && !api.done ? setInterval(function () { if (!document.body.contains(clock)) { clearInterval(iv); return; } tick(); }, 400) : null;
    tick();
    var tr = PL.trace.grid({
      rows: p.size, cols: p.size, letters: p.letters, disabled: api.done,
      cellClass: function (i) { return gs.hintCell === i ? 'hinted' : ''; },
      onSubmit: function (path) {
        var w = path.map(function (i) { return p.letters[i]; }).join('').toLowerCase();
        if (w.length < 3) { api.toast('Words need at least three letters.', ''); return; }
        if (gs.found.indexOf(w) >= 0) { api.toast('Already found.', ''); return; }
        if (p.words.indexOf(w) < 0) { gs.rejected++; api.toast((PL.dict.has(w) ? '“' + w.toUpperCase() + '” isn’t in the game list.' : '“' + w.toUpperCase() + '” isn’t a word here.'), 'bad'); api.save(gs); return; }
        gs.found.push(w); if (gs.hintWord === w) { gs.hintWord = null; gs.hintStage = 0; gs.hintCell = null; }
        var bonus = !pools(p).set[w];
        api.toast('+' + points(w.length) + ' ' + w.toUpperCase() + (bonus ? ' · bonus word' : ''), 'good'); api.update(gs);
      }
    });
    return h('div', { class: 'wordrush' },
      h('div', { class: 'wr-top' },
        h('div', null, h('span', { class: 'lbl' }, 'Points '), h('b', { class: 'big mono' }, String(pts)), h('span', { class: 'muted small' }, ' · ' + PL.plural(gs.found.length, 'word'))),
        gs.mode === 'timed' ? h('div', null, h('span', { class: 'lbl' }, 'Left '), clock) : h('div', { class: 'muted small' }, 'Untimed')),
      h('div', { class: 'wr-bar', title: 'Progress toward an excellent round on this board' }, h('span', { style: { width: Math.min(100, Math.round(100 * rr.r)) + '%' } })),
      h('div', { class: 'muted small' }, 'Excellent here: about ' + bm.words + ' words or ' + bm.pts + ' points' + (gs.mode === 'timed' ? ' in ' + (gs.dur / 60) + ' min' : '') + ' · ' + bm.disc + ' findable words on the board, plus rarer bonus words'),
      tr.el,
      api.done ? null : h('div', { class: 'row-actions' }, h('span', { class: 'muted small' }, PL.plural(gs.found.length, 'word') + ' found'),
        h('button', { class: 'btn', onclick: function () { if (!this.dataset.armed) { this.dataset.armed = 1; this.textContent = 'Tap again to finish'; return; } api.finish('solved'); } }, 'Finish round')),
      h('div', { class: 'wr-found' }, gs.found.slice().reverse().map(function (w, k) { return h('span', { class: 'wchip' + (pools(p).set[w] ? '' : ' bonus') + (k === 0 && PL.fx && PL.fx.once('wr:' + p.letters.join('') + ':' + w) ? ' pop' : '') }, w.toUpperCase() + ' ' + points(w.length)); })));
  }
  /* Hints: a word you have not found — first its length and first two letters with the starting tile highlighted, then the word itself */
  function hint(p, gs) {
    if (!gs.mode) return { msg: 'Start a round first.', noCount: true };
    if (!gs.hintWord || gs.found.indexOf(gs.hintWord) >= 0) {
      var pool = pools(p).disc;
      var cand = pool.filter(function (w) { return gs.found.indexOf(w) < 0 && gs.hinted.indexOf(w) < 0 && w.length >= 5; });
      if (!cand.length) cand = pool.filter(function (w) { return gs.found.indexOf(w) < 0 && gs.hinted.indexOf(w) < 0; });
      if (!cand.length) return { msg: 'You have found every word!', noCount: true };
      gs.hintWord = cand[Math.floor(cand.length / 3)]; gs.hintStage = 0; gs.hinted.push(gs.hintWord);
    }
    var w = gs.hintWord;
    if (gs.hintStage === 0) {
      gs.hintStage = 1;
      gs.hintCell = firstCell(p, w);
      return { msg: 'There is a ' + w.length + '-letter word starting “' + w.slice(0, 2).toUpperCase() + '…”; its first tile is highlighted.', gs: gs };
    }
    gs.hintStage = 0; var word = w; gs.hintWord = null;
    return { msg: 'Try “' + word.toUpperCase() + '”.', gs: gs };
  }
  function firstCell(p, w) {
    var cols = p.size;
    for (var i = 0; i < p.letters.length; i++) {
      var ok = (function find(pos, k, used) {
        var L = p.letters[pos].toLowerCase();
        if (w.substr(k, L.length) !== L) return false;
        if (k + L.length === w.length) return true;
        used[pos] = 1;
        for (var j = 0; j < p.letters.length; j++) if (!used[j] && PL.trace.adj(pos, j, cols) && find(j, k + L.length, used)) return true;
        used[pos] = 0; return false;
      })(i, 0, {});
      if (ok) return i;
    }
    return null;
  }
  function measure(p, gs, hints) {
    var P = pools(p), rr = rawRatio(p, gs), b = rr.b;
    var fd = gs.found.filter(function (w) { return P.set[w]; }), fb = gs.found.filter(function (w) { return !P.set[w]; });
    var longest = gs.found.reduce(function (a, w) { return w.length > a.length ? w : a; }, '');
    var missed = P.disc.filter(function (w) { return gs.found.indexOf(w) < 0; });
    return { quality: qualityFrom(rr.r, hints), ratio: Math.round(rr.r * 1000) / 1000,
      metrics: { sv: SV, mode: gs.mode, dur: gs.dur, points: rr.pts, words: gs.found.length, findable: P.disc.length, findableFound: fd.length,
        findablePts: b.discPts, bonus: fb.length, benchWords: b.words, benchPts: b.pts, ratio: Math.round(rr.r * 1000) / 1000,
        available: P.disc.length, availablePts: b.discPts, longest: longest, found: gs.found.slice(), missedCommon: missed.filter(function (w) { return PL.dict.tier(w) === 'A'; }).length } };
  }
  function evaluate(p, gs, ctx) {
    var m = measure(p, gs, ctx.hints), x = m.metrics;
    return { quality: m.quality, metrics: x,
      lines: [['Words found', x.words + (x.bonus ? ' (' + x.bonus + ' bonus)' : '')], ['Findable words found', x.findableFound + ' of ' + x.findable + ' (' + Math.round(100 * x.findableFound / Math.max(1, x.findable)) + '%)'],
        ['Points', x.points + ' of ' + x.findablePts + ' available (' + Math.round(100 * x.points / Math.max(1, x.findablePts)) + '%)'],
        ['Benchmark for 100', x.benchWords + ' words or ' + x.benchPts + ' points' + (gs.mode === 'timed' ? ' in ' + (gs.dur / 60) + ' min' : '')],
        ['Longest word', x.longest ? x.longest.toUpperCase() : '—'], ['Mode', gs.mode === 'timed' ? 'Timed, ' + (gs.dur / 60) + ' min' : 'Untimed']] };
  }
  /* Re-score a v1 result with v2 (same board, same words found, same hints). Returns null if it is already v2. */
  function rescore(att) {
    if (!att || att.game !== 'wordrush' || !att.puzzle || !att.gs || (att.metrics && att.metrics.sv >= SV)) return null;
    if (!att.gs.mode) return null; // never started
    var m = measure(att.puzzle, att.gs, att.hints || 0);
    var perf = att.outcome === 'abandoned' ? Math.min(m.quality, 20) : m.quality;
    return { quality: m.quality, perf: perf, metrics: m.metrics, v1: { quality: att.quality, perf: att.perf, target: att.metrics && att.metrics.target, points: att.metrics && att.metrics.points } };
  }
  function review(p, gs) {
    var P = pools(p), missed = P.disc.filter(function (w) { return gs.found.indexOf(w) < 0; });
    var bonusOnBoard = P.bonus.filter(function (w) { return gs.found.indexOf(w) < 0; });
    var byLen = {}; missed.forEach(function (w) { (byLen[w.length] = byLen[w.length] || []).push(w); });
    var g = h('div', { class: 'tr-grid small', style: { 'grid-template-columns': 'repeat(' + p.size + ', 1fr)' } }, p.letters.map(function (L) { return h('div', { class: 'tr-cell' }, h('span', null, L.length > 1 ? 'Qu' : L)); }));
    return h('div', { class: 'review' }, g,
      h('div', { class: 'lbl' }, 'You found (' + gs.found.length + ')'), h('p', { class: 'small' }, gs.found.map(function (w) { return w.toUpperCase() + (P.set[w] ? '' : '★'); }).join(', ') || '—'),
      gs.found.some(function (w) { return !P.set[w]; }) ? h('p', { class: 'muted small' }, '★ bonus word (rarer than the findable pool)') : null,
      h('div', { class: 'lbl' }, 'Findable words you missed (' + missed.length + ')'),
      Object.keys(byLen).sort(function (a, b) { return b - a; }).map(function (L) { return h('p', { class: 'small' }, h('b', null, L + ' letters: '), byLen[L].map(function (w) { return w.toUpperCase(); }).join(', ')); }),
      bonusOnBoard.length ? h('details', null, h('summary', { class: 'small muted' }, 'Rarer bonus words also on the board (' + bonusOnBoard.length + ')'), h('p', { class: 'small muted' }, bonusOnBoard.map(function (w) { return w.toUpperCase(); }).join(', '))) : null);
  }
  function stats(atts) {
    var all = atts.filter(function (a) { return a.metrics && a.metrics.mode; });
    var v2 = all.filter(function (a) { return a.metrics.sv >= SV; }), old = all.filter(function (a) { return a.v1; });
    var pct = function (x, y) { return y ? Math.round(100 * x / y) + '%' : '—'; };
    var sum = function (A, k) { return A.reduce(function (s, a) { return s + (a.metrics[k] || 0); }, 0); };
    var longest = all.reduce(function (a, x) { return (x.metrics.longest || '').length > a.length ? x.metrics.longest : a; }, '');
    var uniq = new Set(); all.forEach(function (a) { (a.metrics.found || []).forEach(function (w) { uniq.add(w); }); });
    var rows = [['Rounds', all.length],
      ['Words found (all rounds)', sum(v2, 'words')], ['Findable words on those boards', sum(v2, 'findable')],
      ['Share of findable words found', pct(sum(v2, 'findableFound'), sum(v2, 'findable'))],
      ['Points earned / available', sum(v2, 'points') + ' / ' + sum(v2, 'findablePts') + ' (' + pct(sum(v2, 'points'), sum(v2, 'findablePts')) + ')'],
      ['Bonus words found', sum(v2, 'bonus')],
      ['Common words missed per round', v2.length ? (sum(v2, 'missedCommon') / v2.length).toFixed(1) : '—'],
      ['Longest word ever', longest ? longest.toUpperCase() : '—'], ['Unique words found', uniq.size]];
    ['timed', 'untimed'].forEach(function (m) {
      var A = v2.filter(function (a) { return a.metrics.mode === m; }); if (!A.length) return;
      rows.push([m === 'timed' ? 'Timed rounds' : 'Untimed rounds', A.length + ' · avg ' + Math.round(PL.mean(A.map(function (a) { return a.metrics.words; }))) + ' words · avg ' + Math.round(PL.mean(A.map(function (a) { return a.perf; }))) + ' performance · avg time ' + PL.fmtTime(PL.mean(A.map(function (a) { return a.activeMs || 0; })))]);
    });
    var lv = {}; v2.forEach(function (a) { (lv[a.level] = lv[a.level] || []).push(a); });
    Object.keys(lv).sort(function (a, b) { return a - b; }).forEach(function (L) { rows.push(['Level ' + L, lv[L].length + ' rounds · ' + pct(sum(lv[L], 'findableFound'), sum(lv[L], 'findable')) + ' of findable words']); });
    if (old.length) rows.push(['Re-scored from v1', PL.plural(old.length, 'round') + ' (old v1 average ' + Math.round(PL.mean(old.map(function (a) { return a.v1.perf; }))) + ', now ' + Math.round(PL.mean(old.map(function (a) { return a.perf; }))) + '; both kept)']);
    return rows;
  }
  PL.games.wordrush = {
    id: 'wordrush', name: 'Word Rush', blurb: 'Trace as many words as you can in a letter grid.',
    rules: 'Drag across touching letters, including diagonals, to spell words of three or more letters; release to submit. Each tile can be used once per word. Longer words score more. Play a timed round or untimed. Your performance is how thoroughly you cover what this board offers: words and points found, measured against what an excellent player finds here (about 60% of the board’s findable common words untimed; in a timed round, the smaller of that and about 10 words a minute). Rarer dictionary words are accepted as bonus words but are never needed for 100.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv, daily) { return daily ? 1e9 : 180; }, timeLimit: function () { return 600; },
    rescore: rescore, scoreVersion: SV,
    _solve: solve, _points: points, _benchmark: benchmark, _measure: measure, _findable: findable, _targetV1: targetV1, _firstCell: firstCell, _quality: qualityFrom
  };
})();

;
/* ===== GAME 14: WORD TRAILS — themed word search that fills the whole board =====
   Construction: pick a theme, choose theme words whose lengths (plus the theme word) exactly fill the board, lay the
   theme word across the board edge to edge, then lay every other word as a path of adjacent cells. A backtracking
   search with connected-region pruning guarantees every cell belongs to exactly one word; the result is verified. */
(function () {
  var h = PL.h;
  function sizeFor(lv, daily) { if (daily || lv <= 3) return [5, 6]; if (lv <= 6) return [6, 7]; return [6, 8]; } // cols, rows
  function nbrs(i, C, R) { var r = Math.floor(i / C), c = i % C, o = []; for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; var rr = r + dr, cc = c + dc; if (rr >= 0 && rr < R && cc >= 0 && cc < C) o.push(rr * C + cc); } return o; }
  function subsetSum(lengths, target, rng) { // pick a subset (random order) of lengths summing to target; returns indices
    var idx = rng.shuffle(lengths.map(function (_, i) { return i; })), res = null, steps = 0;
    (function rec(k, sum, pick) {
      if (res || ++steps > 20000) return;
      if (sum === target) { res = pick.slice(); return; }
      if (k >= idx.length || sum > target) return;
      pick.push(idx[k]); rec(k + 1, sum + lengths[idx[k]], pick); pick.pop();
      rec(k + 1, sum, pick);
    })(0, 0, []);
    return res;
  }
  function components(free, C, R) {
    var seen = {}, comps = [];
    for (var i = 0; i < C * R; i++) {
      if (!free[i] || seen[i]) continue;
      var st = [i], sz = 0; seen[i] = 1;
      while (st.length) { var x = st.pop(); sz++; nbrs(x, C, R).forEach(function (y) { if (free[y] && !seen[y]) { seen[y] = 1; st.push(y); } }); }
      comps.push(sz);
    }
    return comps;
  }
  function feasible(free, C, R, lens) {
    if (!lens.length) return true;
    var min = Math.min.apply(null, lens), sums = { 0: 1 };
    lens.forEach(function (l) { Object.keys(sums).forEach(function (s) { sums[+s + l] = 1; }); });
    return components(free, C, R).every(function (sz) { return sz >= min && sums[sz]; });
  }
  // find a path of exactly len free cells starting at s, chosen randomly; endCheck optional
  function pathFrom(s, len, free, C, R, rng, endOk, budget) {
    var path = [s], used = {}; used[s] = 1;
    var ok = (function rec() {
      if (budget.n-- <= 0) return false;
      if (path.length === len) return !endOk || endOk(path[path.length - 1]);
      var cur = path[path.length - 1];
      var opts = rng.shuffle(nbrs(cur, C, R).filter(function (y) { return free[y] && !used[y]; }));
      // prefer cells with fewer free neighbours (keeps the region compact, avoids stranding cells)
      opts.sort(function (a, b) { return freeDeg(a) - freeDeg(b); });
      for (var k = 0; k < opts.length; k++) { var y = opts[k]; path.push(y); used[y] = 1; if (rec()) return true; path.pop(); delete used[y]; }
      return false;
    })();
    function freeDeg(x) { return nbrs(x, C, R).filter(function (y) { return free[y] && !used[y]; }).length; }
    return ok ? path : null;
  }
  function build(theme, C, R, rng) {
    var N = C * R, span = theme.span;
    if (span.length > N) return null;
    var lens = theme.words.map(function (w) { return w.length; });
    var pickIdx = subsetSum(lens, N - span.length, rng);
    if (!pickIdx) return null;
    var words = pickIdx.map(function (i) { return theme.words[i]; });
    for (var attempt = 0; attempt < 30; attempt++) {
      var free = []; for (var i = 0; i < N; i++) free.push(true);
      var budget = { n: 4000 };
      // theme word: from the left edge to the right edge, or top to bottom
      var horiz = rng.chance(0.5) && span.length >= C;
      var starts = [];
      for (i = 0; i < N; i++) { var r = Math.floor(i / C), c = i % C; if (horiz ? c === 0 : r === 0) starts.push(i); }
      var sp = null;
      rng.shuffle(starts).some(function (s) {
        sp = pathFrom(s, span.length, free, C, R, rng, function (e) { return horiz ? e % C === C - 1 : Math.floor(e / C) === R - 1; }, budget);
        if (sp) { var tf = free.slice(); sp.forEach(function (x) { tf[x] = false; }); if (!feasible(tf, C, R, words.map(function (w) { return w.length; }))) sp = null; }
        return !!sp;
      });
      if (!sp) continue;
      sp.forEach(function (x) { free[x] = false; });
      var placed = [{ w: span, path: sp, span: true }], remaining = rng.shuffle(words.slice()), fail = false;
      while (remaining.length) {
        // start in the most constrained free cell
        var cells = []; for (i = 0; i < N; i++) if (free[i]) cells.push(i);
        cells.sort(function (a, b) { return nbrs(a, C, R).filter(function (y) { return free[y]; }).length - nbrs(b, C, R).filter(function (y) { return free[y]; }).length; });
        var s0 = cells[0], done = false;
        // try words (longest first among a shuffled order) that can start at s0
        var order = remaining.slice().sort(function () { return rng() - 0.5; });
        for (var k = 0; k < order.length && !done; k++) {
          var w = order[k], b2 = { n: 3000 };
          for (var t = 0; t < 4 && !done; t++) {
            var path = pathFrom(s0, w.length, free, C, R, rng, null, b2);
            if (!path) break;
            var tf2 = free.slice(); path.forEach(function (x) { tf2[x] = false; });
            var rest = remaining.filter(function (x, j) { return j !== remaining.indexOf(w); });
            if (!feasible(tf2, C, R, rest.map(function (x) { return x.length; }))) continue;
            // also allow the path to start at s0 reading backwards (the word may run either way)
            if (rng.chance(0.5)) path.reverse();
            path.forEach(function (x) { free[x] = false; });
            placed.push({ w: w, path: path });
            remaining.splice(remaining.indexOf(w), 1); done = true;
          }
        }
        if (!done) { fail = true; break; }
      }
      if (fail) continue;
      var letters = []; placed.forEach(function (pl) { pl.path.forEach(function (x, j) { letters[x] = pl.w[j]; }); });
      var P = { C: C, R: R, letters: letters, words: placed, clue: theme.clue, theme: theme.id, d: theme.d };
      if (verify(P)) return P;
    }
    return null;
  }
  function verify(P) {
    var N = P.C * P.R, cover = {};
    for (var k = 0; k < P.words.length; k++) {
      var pl = P.words[k];
      if (pl.path.length !== pl.w.length) return false;
      for (var j = 0; j < pl.path.length; j++) {
        if (cover[pl.path[j]]) return false; cover[pl.path[j]] = 1;
        if (P.letters[pl.path[j]] !== pl.w[j]) return false;
        if (j && !PL.trace.adj(pl.path[j - 1], pl.path[j], P.C)) return false;
      }
    }
    return Object.keys(cover).length === N && P.words.filter(function (x) { return x.span; }).length === 1;
  }
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), daily = !!(ctx && ctx.daily), sz = sizeFor(lv, daily);
    var maxD = lv <= 4 ? 1 : lv <= 7 ? 2 : 3;
    var themes = (PL.data.trails || []).filter(function (t) { return t.d <= maxD && (lv < 8 || t.d >= 2); });
    var recent = (ctx && ctx.recent) || [];
    var fresh = themes.filter(function (t) { return recent.indexOf(t.id) < 0; });
    var pool = rng.shuffle(fresh.length ? fresh : themes);
    for (var i = 0; i < pool.length && i < 40; i++) {
      var P = build(pool[i], sz[0], sz[1], rng);
      if (P) { P.tkey = P.theme; return P; }
    }
    throw new Error('Word Trails could not build a board');
  }
  function init(p) { return { found: [], tries: 0, notTheme: [], hintW: null, hintStage: 0, hp: {} }; }
  /* Progressive hints, tracked per word in gs.hp (so progress survives leaving, and switching to another word):
       stage 1  outline every cell of one unfound word
       stage 2  number its starting cell (1)
       stage 3+ number the next cell along the word's verified path (2, 3, ...) and draw the revealed segment
     until every cell is numbered; nothing is ever repeated and only the generator's checked path is shown. */
  function hintState(p, gs) {
    if (!gs.hp) { gs.hp = {}; if (gs.hintW && gs.hintStage) gs.hp[gs.hintW] = gs.hintStage; } // records from before per-word progress
    var w = gs.hintW && gs.found.indexOf(gs.hintW) < 0 ? gs.hintW : null;
    var pl = w ? p.words.filter(function (x) { return x.w === w; })[0] : null;
    return { w: w, pl: pl, stage: w ? gs.hp[w] || 0 : 0 };
  }
  function view(api) {
    var p = api.p, gs = api.gs;
    var foundSet = {}; gs.found.forEach(function (w) { foundSet[w] = 1; });
    var cellOwner = {}; p.words.forEach(function (pl) { pl.path.forEach(function (x) { cellOwner[x] = pl; }); });
    var hs = hintState(p, gs), hintCells = {}, hintOrd = {}, shown = 0;
    if (hs.pl && hs.stage >= 1) { hs.pl.path.forEach(function (x) { hintCells[x] = 1; }); shown = Math.min(hs.pl.path.length, hs.stage - 1); hs.pl.path.slice(0, shown).forEach(function (x, k) { hintOrd[x] = k + 1; }); }
    var tr = PL.trace.grid({
      rows: p.R, cols: p.C, letters: p.letters, disabled: api.done,
      lines: p.words.filter(function (pl) { return foundSet[pl.w]; }).map(function (pl) { return { path: pl.path, cls: pl.span ? 'span' : 'found' }; })
        .concat(shown >= 2 ? [{ path: hs.pl.path.slice(0, shown), cls: 'hint' }] : []),
      cellClass: function (i) { var o = cellOwner[i]; return o && foundSet[o.w] ? (o.span ? 'spanned' : 'found') : hintCells[i] ? 'hinted' + (hintOrd[i] ? ' ordered' : '') : ''; },
      cellBadge: function (i) { return hintOrd[i] || null; },
      onSubmit: function (path) {
        var w = path.map(function (i) { return p.letters[i]; }).join('');
        var match = p.words.filter(function (pl) { return pl.w === w; })[0];
        if (match && !foundSet[w]) {
          gs.found.push(w); if (gs.hintW === w) { gs.hintW = null; gs.hintStage = 0; }
          api.toast(match.span ? 'Theme word! ' + w : w, 'good');
          if (gs.found.length === p.words.length) { api.update(gs); api.finish('solved'); return; }
          api.update(gs); return;
        }
        if (match) { api.toast('Already found.', ''); return; }
        gs.tries++;
        if (w.length >= 4 && PL.dict.has(w)) { if (gs.notTheme.indexOf(w) < 0) gs.notTheme.push(w); api.toast('“' + w + '” is a word, but not part of this theme.', ''); }
        else api.toast(w.length < 4 ? 'Theme words have at least four letters.' : 'Not a word here.', 'bad');
        api.save(gs);
      }
    });
    var themeFound = gs.found.indexOf(p.words[0].w) >= 0;
    return h('div', { class: 'trails' },
      h('div', { class: 'tw-clue' }, h('span', { class: 'lbl' }, 'Theme '), h('b', null, p.clue)),
      h('div', { class: 'muted small' }, (gs.found.length) + ' of ' + p.words.length + ' theme words found' + (themeFound ? '' : ' · one of them spans the board and names the theme')),
      tr.el,
      hs.pl && hs.stage >= 1 ? h('div', { class: 'muted small' }, shown >= hs.pl.path.length ? 'Hint: trace the numbered cells in order, 1 to ' + hs.pl.path.length + '.' : 'Hint: the outlined cells form one ' + hs.pl.path.length + '-letter theme word' + (shown ? '; the numbers show how it starts.' : '.')) : null,
      gs.notTheme.length ? h('div', { class: 'muted small' }, 'Words that aren’t in the theme: ' + gs.notTheme.join(', ')) : null);
  }
  function hint(p, gs) {
    var unfound = p.words.filter(function (pl) { return gs.found.indexOf(pl.w) < 0; });
    if (!unfound.length) return { msg: 'Everything is found.', noCount: true };
    var hs = hintState(p, gs);
    if (!hs.w) { // pick the next word: one already started, else the first unfound non-theme word, theme word last
      var started = unfound.filter(function (pl) { return gs.hp[pl.w]; }), others = unfound.filter(function (pl) { return !pl.span; });
      gs.hintW = (started.length ? started : others.length ? others : unfound)[0].w;
      hs = hintState(p, gs);
    }
    var pl = hs.pl, L = pl.path.length, st = hs.stage;
    if (st >= L + 1) return { msg: 'Every cell of this word is numbered: trace 1 to ' + L + '.', noCount: true };
    st = gs.hp[pl.w] = st + 1; gs.hintStage = st;
    var msg;
    if (st === 1) msg = 'The outlined cells form one ' + L + '-letter theme word' + (pl.span ? ' (the one that names the theme)' : '') + '.';
    else if (st === 2) msg = 'It starts at the cell marked 1: “' + p.letters[pl.path[0]] + '”.';
    else msg = 'Letter ' + (st - 1) + ' is “' + p.letters[pl.path[st - 2]] + '”, marked ' + (st - 1) + (st - 1 === L ? '. That is the whole word.' : '.');
    return { msg: msg, gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved', n = gs.found.length;
    var q = solved ? PL.clamp(100 - ctx.hints * 7 - Math.floor(gs.tries / 4) * 3, 15, 100) : Math.round(40 * n / p.words.length);
    return { quality: Math.round(q), metrics: { found: gs.found.slice(), words: p.words.length, theme: p.theme, size: p.C + '×' + p.R, perfect: solved && !ctx.hints, tries: gs.tries },
      lines: [['Theme words', n + ' / ' + p.words.length], ['Board', p.C + ' × ' + p.R], ['Non-theme tries', gs.tries]] };
  }
  function review(p, gs) {
    return h('div', { class: 'review' }, h('div', null, h('span', { class: 'lbl' }, 'Theme '), h('b', null, p.clue)),
      h('ol', { class: 'steps' }, p.words.map(function (pl) { return h('li', null, h('b', { class: pl.span ? 'tw-span' : '' }, pl.w), pl.span ? ' (theme word)' : '', gs.found.indexOf(pl.w) >= 0 ? ' ✓' : ''); })));
  }
  function stats(atts) {
    var s = atts.filter(function (a) { return a.outcome === 'solved'; });
    return [['Completion rate', atts.length ? Math.round(100 * s.length / atts.length) + '%' : '—'],
      ['Perfect boards (no hints)', s.filter(function (a) { return a.metrics.perfect; }).length],
      ['Average words found', atts.length ? PL.mean(atts.map(function (a) { return (a.metrics.found || []).length; })).toFixed(1) : '—'],
      ['Themes completed', s.length]];
  }
  PL.games.trails = {
    id: 'trails', name: 'Word Trails', blurb: 'Find the theme words that fill the whole board.',
    rules: 'Every letter belongs to exactly one theme word. Trace words through touching letters, including diagonals; each letter is used once. One special theme word stretches from one side of the board to the other and names the theme. Find them all.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 150 + lv * 30; }, timeLimit: function (lv) { return 600; },
    _build: build, _verify: verify, _hintState: hintState
  };
})();

;
/* ===== GAME 16: CAT LOGIC — one cat per row, column and coloured region; cats never touch =====
   Generation: place a valid hidden solution, grow coloured regions from each cat, then keep only boards that an
   exhaustive solver proves have exactly one solution. Difficulty is measured by a human-style deduction solver:
   easy boards fall to simple rules alone; harder ones need region/line interaction or deeper reasoning. */
(function () {
  var h = PL.h;
  function size(lv) { return lv <= 2 ? 5 : lv <= 4 ? 6 : lv <= 6 ? 7 : lv <= 8 ? 8 : 9; }
  function touches(a, b, n) { return Math.abs(Math.floor(a / n) - Math.floor(b / n)) <= 1 && Math.abs(a % n - b % n) <= 1; }
  /* count solutions (up to limit) — row by row backtracking with column/region/adjacency checks */
  function countSolutions(n, reg, limit) {
    var colUsed = 0, regUsed = 0, sol = [], cnt = 0, first = null;
    (function rec(r) {
      if (cnt >= limit) return;
      if (r === n) { cnt++; if (!first) first = sol.slice(); return; }
      for (var c = 0; c < n; c++) {
        var g = reg[r * n + c];
        if (colUsed & (1 << c) || regUsed & (1 << g)) continue;
        if (r && Math.abs(sol[r - 1] - c) <= 1) continue;
        colUsed |= 1 << c; regUsed |= 1 << g; sol[r] = c;
        rec(r + 1);
        colUsed &= ~(1 << c); regUsed &= ~(1 << g);
      }
    })(0);
    return { count: cnt, sol: first };
  }
  /* human-style solver: returns { solved, steps, maxTier } using tiers:
     1 = a row/column/region has one possible cell; a cat rules out its row, column, region and neighbours
     2 = a region confined to one row/column clears that line elsewhere (and vice versa)
     3 = a cell whose cat would empty some region/row/column is ruled out */
  function logicSolve(n, reg) {
    var cand = [], cat = [], i, maxTier = 0, steps = 0;
    for (i = 0; i < n * n; i++) { cand.push(true); cat.push(false); }
    function place(x) { cat[x] = true; for (var j = 0; j < n * n; j++) if (j !== x && (Math.floor(j / n) === Math.floor(x / n) || j % n === x % n || reg[j] === reg[x] || touches(j, x, n))) cand[j] = false; }
    function groups() {
      var g = [];
      for (var r = 0; r < n; r++) { var a = []; for (var c = 0; c < n; c++) a.push(r * n + c); g.push(a); }
      for (c = 0; c < n; c++) { var b = []; for (r = 0; r < n; r++) b.push(r * n + c); g.push(b); }
      for (var k = 0; k < n; k++) { var d = []; for (var j = 0; j < n * n; j++) if (reg[j] === k) d.push(j); g.push(d); }
      return g;
    }
    var G = groups();
    function live(gr) { return gr.filter(function (x) { return cand[x] && !cat[x]; }); }
    function done(gr) { return gr.some(function (x) { return cat[x]; }); }
    var guard = 0;
    while (guard++ < 400) {
      var progress = false;
      // tier 1: singles
      for (var k = 0; k < G.length && !progress; k++) { if (done(G[k])) continue; var L = live(G[k]); if (L.length === 0) return { solved: false, contradiction: true }; if (L.length === 1) { place(L[0]); progress = true; maxTier = Math.max(maxTier, 1); steps++; } }
      if (progress) continue;
      // tier 2: region confined to a line (or a line confined to a region) clears the rest of that line/region
      for (k = 0; k < G.length && !progress; k++) {
        if (done(G[k])) continue; var L2 = live(G[k]); if (!L2.length) continue;
        var rows = new Set(L2.map(function (x) { return Math.floor(x / n); })), cols = new Set(L2.map(function (x) { return x % n; })), regs = new Set(L2.map(function (x) { return reg[x]; }));
        [[rows, function (x) { return Math.floor(x / n); }], [cols, function (x) { return x % n; }], [regs, function (x) { return reg[x]; }]].forEach(function (pair) {
          if (progress || pair[0].size !== 1) return;
          var v = pair[0].values().next().value;
          for (var j = 0; j < n * n; j++) if (cand[j] && !cat[j] && pair[1](j) === v && G[k].indexOf(j) < 0) { cand[j] = false; progress = true; }
        });
        if (progress) { maxTier = Math.max(maxTier, 2); steps++; }
      }
      if (progress) continue;
      // tier 3: hypothetical placement that would leave a group with no candidates
      for (var x = 0; x < n * n && !progress; x++) {
        if (!cand[x] || cat[x]) continue;
        var save = cand.slice();
        for (var j = 0; j < n * n; j++) if (j !== x && (Math.floor(j / n) === Math.floor(x / n) || j % n === x % n || reg[j] === reg[x] || touches(j, x, n))) cand[j] = false;
        var bad = G.some(function (gr) { return !done(gr) && gr.indexOf(x) < 0 && !gr.some(function (y) { return cand[y] && !cat[y]; }); });
        cand = save;
        if (bad) { cand[x] = false; progress = true; maxTier = Math.max(maxTier, 3); steps++; }
      }
      if (!progress) break;
    }
    var solved = cat.filter(Boolean).length === n;
    return { solved: solved, steps: steps, maxTier: solved ? maxTier : 4, cats: cat };
  }
  function growRegions(n, sol, rng) {
    // balanced growth: repeatedly extend one of the smallest regions that can still grow (with some randomness)
    var reg = []; for (var i = 0; i < n * n; i++) reg.push(-1);
    var size = []; sol.forEach(function (c, r) { reg[r * n + c] = r; size[r] = 1; });
    var left = n * n - n;
    while (left > 0) {
      var front = {};
      for (i = 0; i < n * n; i++) if (reg[i] >= 0) {
        var r = Math.floor(i / n), c = i % n;
        [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(function (q) { if (q[0] >= 0 && q[0] < n && q[1] >= 0 && q[1] < n && reg[q[0] * n + q[1]] < 0) (front[reg[i]] = front[reg[i]] || []).push(q[0] * n + q[1]); });
      }
      var gs = Object.keys(front).map(Number); if (!gs.length) break;
      gs.sort(function (a, b) { return size[a] - size[b] + (rng() - 0.5) * 3; });
      var g = gs[0], x = rng.pick(front[g]);
      reg[x] = g; size[g]++; left--;
    }
    return reg;
  }
  /* hill-climb on region borders until the hidden solution is the only one */
  function connected(n, reg, k) {
    var cells = []; for (var i = 0; i < n * n; i++) if (reg[i] === k) cells.push(i);
    if (!cells.length) return false;
    var seen = {}, st = [cells[0]]; seen[cells[0]] = 1; var cnt = 0;
    while (st.length) { var x = st.pop(); cnt++; var r = Math.floor(x / n), c = x % n; [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(function (q) { var y = q[0] * n + q[1]; if (q[0] >= 0 && q[0] < n && q[1] >= 0 && q[1] < n && reg[y] === k && !seen[y]) { seen[y] = 1; st.push(y); } }); }
    return cnt === cells.length;
  }
  function repair(n, reg, sol, rng) {
    var catCell = {}; sol.forEach(function (c, r) { catCell[r * n + c] = 1; });
    var cur = countSolutions(n, reg, 40).count;
    for (var it = 0; it < 600 && cur > 1; it++) {
      var x = rng.int(0, n * n - 1); if (catCell[x]) continue;
      var r = Math.floor(x / n), c = x % n, nb = [];
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(function (q) { if (q[0] >= 0 && q[0] < n && q[1] >= 0 && q[1] < n) { var g = reg[q[0] * n + q[1]]; if (g !== reg[x] && nb.indexOf(g) < 0) nb.push(g); } });
      if (!nb.length) continue;
      var old = reg[x], g2 = rng.pick(nb);
      reg[x] = g2;
      if (!connected(n, reg, old)) { reg[x] = old; continue; }
      var cnt = countSolutions(n, reg, 40).count;
      if (cnt >= 1 && cnt <= cur) cur = cnt; else reg[x] = old;
    }
    return cur === 1 ? reg : null;
  }
  function randomSolution(n, rng) {
    for (var t = 0; t < 500; t++) {
      var cols = rng.shuffle(Array.from({ length: n }, function (_, i) { return i; })), ok = true;
      for (var r = 1; r < n; r++) if (Math.abs(cols[r] - cols[r - 1]) <= 1) { ok = false; break; }
      if (ok) return cols;
    }
    return null;
  }
  var TIER_WANT = { 1: [1, 1], 2: [1, 2], 3: [1, 2], 4: [2, 2], 5: [2, 3], 6: [2, 3], 7: [2, 3], 8: [3, 3], 9: [2, 3], 10: [3, 3] };
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), n = (ctx && ctx.daily) ? Math.min(size(lv), 7) : size(lv), want = TIER_WANT[lv], best = null;
    for (var t = 0; t < 400; t++) {
      var sol = randomSolution(n, rng); if (!sol) continue;
      var reg = growRegions(n, sol, rng);
      reg = repair(n, reg, sol, rng);
      if (!reg) continue;
      var ls = logicSolve(n, reg);
      var tier = ls.maxTier;
      var P = { n: n, reg: reg, sol: sol, tier: tier, steps: ls.steps };
      if (tier >= want[0] && tier <= want[1]) return P;
      if (!best || Math.abs(tier - want[0]) < Math.abs(best.tier - want[0])) best = P;
    }
    if (best) return best;
    throw new Error('Cat Logic could not build a board');
  }
  function init(p) { return { s: Array(p.n * p.n).fill(0), hist: [], fut: [], marked: [] }; } // 0 empty, 1 X, 2 cat
  function conflicts(p, gs) {
    var n = p.n, cats = [], bad = {};
    gs.s.forEach(function (v, i) { if (v === 2) cats.push(i); });
    for (var a = 0; a < cats.length; a++) for (var b = a + 1; b < cats.length; b++) {
      var x = cats[a], y = cats[b];
      if (Math.floor(x / n) === Math.floor(y / n) || x % n === y % n || p.reg[x] === p.reg[y] || touches(x, y, n)) { bad[x] = 1; bad[y] = 1; }
    }
    return bad;
  }
  function isSolved(p, gs) { return p.sol.every(function (c, r) { return gs.s[r * p.n + c] === 2; }) && gs.s.filter(function (v) { return v === 2; }).length === p.n; }
  var PALETTE = 10;
  function borderStyle(edges) {
    var o = {}, sides = ['top', 'right', 'bottom', 'left'];
    sides.forEach(function (sd, k) { o['border-' + sd + '-width'] = edges[k] ? '2.5px' : '0.5px'; o['border-' + sd + '-color'] = edges[k] ? '#1d2130' : 'rgba(29,33,48,0.22)'; });
    return o;
  }
  function catIcon() {
    return PL.svg('svg', { viewBox: '0 0 24 24', class: 'cat-ico', 'aria-hidden': 'true' },
      PL.svg('path', { d: 'M4 4l4 4h8l4-4v9a8 7 0 0 1-16 0z', class: 'cat-head' }),
      PL.svg('circle', { cx: 9, cy: 12, r: 1.3, class: 'cat-eye' }), PL.svg('circle', { cx: 15, cy: 12, r: 1.3, class: 'cat-eye' }),
      PL.svg('path', { d: 'M11 15h2l-1 1z', class: 'cat-eye' }));
  }
  function view(api) {
    var p = api.p, gs = api.gs, n = p.n, bad = conflicts(p, gs);
    var set = function (i, v) { gs.hist.push(gs.s.slice()); if (gs.hist.length > 200) gs.hist.shift(); gs.fut = []; gs.s[i] = v; api.update(gs); if (isSolved(p, gs)) api.finish('solved'); };
    var mode = gs.mode || 'cycle';
    var board = h('div', { class: 'cl-board', style: { 'grid-template-columns': 'repeat(' + n + ', 1fr)' } });
    for (var i = 0; i < n * n; i++) (function (i) {
      var r = Math.floor(i / n), c = i % n, g = p.reg[i];
      var edges = [r === 0 || p.reg[i - n] !== g, c === n - 1 || p.reg[i + 1] !== g, r === n - 1 || p.reg[i + n] !== g, c === 0 || p.reg[i - 1] !== g];
      var cell = h('button', { class: 'cl-cell rg' + (g % PALETTE) + (bad[i] ? ' bad' : '') + (gs.hintCell === i ? ' hinted' : ''), disabled: api.done, 'aria-label': 'Row ' + (r + 1) + ' column ' + (c + 1) + ': ' + ['empty', 'ruled out', 'cat'][gs.s[i]],
        style: borderStyle(edges),
        onclick: function () { var v = gs.s[i]; set(i, mode === 'cat' ? (v === 2 ? 0 : 2) : mode === 'x' ? (v === 1 ? 0 : 1) : (v + 1) % 3); } },
        gs.s[i] === 2 ? catIcon() : gs.s[i] === 1 ? h('span', { class: 'cl-x' }, '×') : null);
      board.appendChild(cell);
    })(i);
    var cats = gs.s.filter(function (v) { return v === 2; }).length;
    return h('div', { class: 'catlogic' },
      h('div', { class: 'muted small' }, 'Place ' + n + ' cats: one in every row, every column and every coloured region. Cats may not touch, not even diagonally.'),
      h('div', { class: 'cl-wrap' }, board),
      api.done ? null : h('div', { class: 'row-actions' },
        h('div', { class: 'seg' }, [['cycle', 'Tap: × → cat'], ['x', '× only'], ['cat', 'Cat only']].map(function (m) { return h('button', { class: 'segb' + (mode === m[0] ? ' on' : ''), onclick: function () { gs.mode = m[0]; api.update(gs); } }, m[1]); }))),
      api.done ? null : h('div', { class: 'row-actions' },
        h('span', { class: 'muted small' }, cats + ' / ' + n + ' cats' + (Object.keys(bad).length ? ' · conflicts shown in red' : '')),
        h('button', { class: 'btn ghost sm', disabled: !gs.hist.length, onclick: function () { gs.fut.push(gs.s.slice()); gs.s = gs.hist.pop(); api.update(gs); } }, 'Undo'),
        h('button', { class: 'btn ghost sm', disabled: !gs.fut.length, onclick: function () { gs.hist.push(gs.s.slice()); gs.s = gs.fut.pop(); api.update(gs); } }, 'Redo'),
        h('button', { class: 'btn ghost sm', onclick: function () { if (!this.dataset.armed) { this.dataset.armed = 1; this.textContent = 'Tap to confirm'; return; } gs.hist.push(gs.s.slice()); gs.s = Array(n * n).fill(0); api.update(gs); } }, 'Reset'),
        h('button', { class: 'btn sm', disabled: cats !== n, onclick: function () { if (!isSolved(p, gs)) { api.wrong(); api.toast('Not quite: at least one cat is misplaced.', 'bad'); } } }, 'Check')));
  }
  /* Hints: first flag any wrong cat or wrongly ruled-out cell; otherwise give the next deduction from the logic solver
     applied to the cats you have correctly placed. */
  function hint(p, gs) {
    var n = p.n;
    for (var i = 0; i < n * n; i++) {
      var r = Math.floor(i / n), isCat = p.sol[r] === i % n;
      if (gs.s[i] === 2 && !isCat) { gs.hintCell = i; return { msg: 'The highlighted cat is in the wrong place.', gs: gs }; }
      if (gs.s[i] === 1 && isCat) { gs.hintCell = i; return { msg: 'The highlighted cell was ruled out, but it needs a cat.', gs: gs }; }
    }
    // next forced cat given current correct cats
    var reg = p.reg, placed = {}; gs.s.forEach(function (v, j) { if (v === 2) placed[j] = 1; });
    var cand = []; for (i = 0; i < n * n; i++) cand.push(true);
    Object.keys(placed).forEach(function (x) { x = +x; for (var j = 0; j < n * n; j++) if (j !== x && (Math.floor(j / n) === Math.floor(x / n) || j % n === x % n || reg[j] === reg[x] || touches(j, x, n))) cand[j] = false; });
    var groups = [];
    for (r = 0; r < n; r++) groups.push({ name: 'row ' + (r + 1), cells: Array.from({ length: n }, function (_, c) { return r * n + c; }) });
    for (var c = 0; c < n; c++) groups.push({ name: 'column ' + (c + 1), cells: Array.from({ length: n }, function (_, rr) { return rr * n + c; }) });
    for (var k = 0; k < n; k++) groups.push({ name: 'the highlighted region', cells: Array.from({ length: n * n }, function (_, j) { return j; }).filter(function (j) { return reg[j] === k; }) });
    for (k = 0; k < groups.length; k++) {
      var g = groups[k]; if (g.cells.some(function (x) { return placed[x]; })) continue;
      var live = g.cells.filter(function (x) { return cand[x]; });
      if (live.length === 1) { gs.hintCell = live[0]; return { msg: 'In ' + g.name + ', only the highlighted cell can still hold a cat.', gs: gs }; }
    }
    // fall back: reveal a correct cat
    for (r = 0; r < n; r++) { var x2 = r * n + p.sol[r]; if (!placed[x2]) { gs.hintCell = x2; gs.hist.push(gs.s.slice()); gs.s[x2] = 2; return { msg: 'No single-step deduction is visible, so a cat was placed in row ' + (r + 1) + '.', gs: gs, after: isSolved(p, gs) ? 'solved' : null }; } }
    return { msg: 'All cats are placed.', noCount: true };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var q = solved ? PL.clamp(100 - ctx.wrong * 15 - ctx.hints * 12, 10, 100) : 0;
    return { quality: Math.round(q), metrics: { n: p.n, tier: p.tier, wrong: ctx.wrong, perfect: solved && !ctx.wrong && !ctx.hints },
      lines: [['Board', p.n + ' × ' + p.n], ['Deduction level', ['', 'basic', 'line–region', 'advanced', 'deep'][p.tier] || '—'], ['Wrong checks', ctx.wrong]] };
  }
  function review(p, gs) {
    var n = p.n, board = h('div', { class: 'cl-board small', style: { 'grid-template-columns': 'repeat(' + n + ', 1fr)' } });
    for (var i = 0; i < n * n; i++) { var r = Math.floor(i / n), c = i % n, g = p.reg[i]; board.appendChild(h('div', { class: 'cl-cell rg' + (g % PALETTE), style: borderStyle([r === 0 || p.reg[i - n] !== g, c === n - 1 || p.reg[i + 1] !== g, r === n - 1 || p.reg[i + n] !== g, c === 0 || p.reg[i - 1] !== g]) }, p.sol[r] === c ? catIcon() : null)); }
    return h('div', { class: 'review' }, h('div', { class: 'lbl' }, 'Solution (verified unique)'), h('div', { class: 'cl-wrap' }, board));
  }
  function stats(atts) {
    var s = atts.filter(function (a) { return a.outcome === 'solved'; }), by = {};
    atts.forEach(function (a) { var k = a.metrics && a.metrics.n; if (!k) return; (by[k] = by[k] || { n: 0, ok: 0 }); by[k].n++; if (a.outcome === 'solved') by[k].ok++; });
    var rows = [['Solved', s.length + ' / ' + atts.length], ['Perfect (no hints or wrong checks)', s.filter(function (a) { return a.metrics.perfect; }).length],
      ['Average wrong checks', atts.length ? PL.mean(atts.map(function (a) { return a.wrong || 0; })).toFixed(1) : '—']];
    Object.keys(by).sort().forEach(function (k) { rows.push([k + '×' + k + ' boards', by[k].ok + '/' + by[k].n + ' solved']); });
    return rows;
  }
  PL.games.catlogic = {
    id: 'catlogic', name: 'Cat Logic', blurb: 'Seat one cat per row, column and colour.',
    rules: 'Place cats so that every row, every column and every coloured region has exactly one cat, and no two cats touch, even diagonally. Tap a cell to mark it × (no cat), tap again for a cat. Each board has exactly one solution.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 90 + lv * 30; }, timeLimit: function (lv) { return 300 + lv * 30; },
    _count: countSolutions, _logic: logicSolve, _solved: isSolved
  };
})();

;
/* ===== Survey Says answer matching =====
   Decides which answer on THIS question's board (if any) a typed guess means. Deterministic and conservative:
   it only accepts genuine equivalents, never "looks similar" matches between two different real words.

   1. Normalise both sides: case, accents, apostrophes, punctuation, "&" → "and", filler words (a, the, my, to, of...),
      number words → digits ("seven" → 7, "midnight"/"noon" → 12), and units after a bare number ("10 pm", "$30").
   2. Curated aliases (ALIASES below): vet = veterinarian, TV = television, bike = bicycle, cell phone = mobile phone,
      spelling variants (theatre/theater, donut/doughnut) and irregular plurals (teeth/tooth, children/kid).
   3. Word forms: regular plurals (tattoos → tattoo), and -ing/-ed verb forms when the shorter form is itself a real
      word (cooking → cook, but "cookies" stays "cookie" and never meets "cook").
   Match levels, best first, for each answer on the board:
      4  same words (any order) after 1–3                        "Brush Teeth" = "teeth brushing"
      3  same letters ignoring spaces                            "r2d2" = "R2-D2", "door bell" = "doorbell"
      2  one small typo per word, only when the guess word is NOT a different real word
         (or the answer word isn't a dictionary word, e.g. a name)  "tatoo" → "Tattoo", "oprha" → "Oprah"
      1  a shorter or longer phrase with the same head word      "price tag" → "Remove Price Tag", "a big pumpkin" → "Pumpkin"
   Ambiguity: if two answers tie at the best level ≤ 2 the guess is NOT matched (the player is asked to be more specific);
   at level 3–4 a tie (two answers worded the same) goes to the one whose own label matched, then the more popular one. */
(function () {
  var NUM = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
    fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, midnight: 12, noon: 12, dozen: 12 };
  var STOP = { a: 1, an: 1, the: 1, some: 1, my: 1, your: 1, their: 1, his: 1, her: 1, its: 1, it: 1, to: 1, of: 1, and: 1, our: 1 };
  var UNITS = { am: 1, pm: 1, oclock: 1, o: 1, clock: 1, dollar: 1, dollars: 1, buck: 1, bucks: 1, cent: 1, cents: 1, year: 1, years: 1, yr: 1, yrs: 1,
    old: 1, minute: 1, minutes: 1, min: 1, mins: 1, hour: 1, hours: 1, hr: 1, hrs: 1, time: 1, times: 1, pound: 1, pounds: 1, lb: 1, lbs: 1,
    percent: 1, day: 1, days: 1, week: 1, weeks: 1, month: 1, months: 1, people: 1, guest: 1, guests: 1, pair: 1, pairs: 1, mph: 1, inch: 1, inches: 1, feet: 1, foot: 1, ft: 1 };
  /* Genuine equivalents only: the same thing under another name, spelling or abbreviation. The first entry is the
     canonical form. Near-synonyms that mean different things (tired/sleepy, toilet/bathroom) are deliberately absent. */
  var ALIASES = [
    ['veterinarian', 'vet', 'animal doctor'], ['television', 'tv', 'telly', 't v'], ['cell phone', 'cellphone', 'mobile phone', 'smartphone', 'smart phone', 'cell phones'],
    ['bicycle', 'bike', 'pushbike'], ['refrigerator', 'fridge', 'icebox', 'ice box'], ['automobile', 'car'], ['airplane', 'plane', 'aeroplane'],
    ['mother', 'mom', 'mommy', 'mum', 'mama', 'momma', 'mummy'], ['father', 'dad', 'daddy', 'papa'], ['grandmother', 'grandma', 'granny', 'nana', 'grammy', 'gran'],
    ['grandfather', 'grandpa', 'granddad', 'grandad', 'gramps'], ['child', 'kid', 'children', 'kiddo'], ['husband', 'hubby'], ['baby', 'infant', 'newborn'],
    ['police officer', 'cop', 'policeman', 'police', 'policewoman', 'police man'], ['firefighter', 'fireman', 'firemen', 'fire fighter'],
    ['mail carrier', 'mailman', 'postman', 'mail man', 'letter carrier', 'postal worker', 'mailmen'], ['doctor', 'doc', 'dr', 'physician'],
    ['lawyer', 'attorney'], ['sofa', 'couch', 'settee'], ['movie', 'film', 'flick', 'motion picture'], ['photograph', 'photo', 'picture', 'pic', 'snapshot'],
    ['restroom', 'bathroom', 'washroom', 'lavatory', 'loo', 'rest room', 'powder room'], ['stomach', 'tummy', 'belly'], ['birthday', 'bday', 'b day'],
    ['christmas', 'xmas', 'x mas'], ['sneaker', 'tennis shoe', 'running shoe', 'gym shoe', 'trainer'], ['eyeglasses', 'spectacles', 'eye glasses'],
    ['sunglasses', 'shades', 'sun glasses'], ['gasoline', 'gas', 'petrol'], ['mathematics', 'math', 'maths'], ['physical education', 'pe', 'phys ed', 'p e', 'gym class'],
    ['identification', 'id', 'i d'], ['air conditioning', 'air conditioner', 'ac', 'a c', 'aircon'], ['barbecue', 'bbq', 'barbeque', 'bar b que', 'b b q', 'bar b q'],
    ['doughnut', 'donut'], ['theater', 'theatre'], ['color', 'colour'], ['gray', 'grey'], ['axe', 'ax'], ['jewelry', 'jewellery'], ['mustache', 'moustache'],
    ['pajamas', 'pyjamas', 'pjs', 'jammies', 'pj', 'p j'], ['catalog', 'catalogue'], ['okay', 'ok'], ['favorite', 'favourite'], ['neighbor', 'neighbour'],
    ['ketchup', 'catsup'], ['yogurt', 'yoghurt'], ['hamburger', 'burger'], ['hot dog', 'hotdog', 'wiener', 'frankfurter'], ['computer', 'pc'],
    ['email', 'e mail'], ['new york city', 'nyc', 'big apple'], ['los angeles', 'la', 'l a'], ['united states', 'usa', 'u s a', 'u s', 'united states of america', 'america'],
    ['washington dc', 'dc', 'd c', 'washington d c'], ['las vegas', 'vegas'], ['disney world', 'disneyworld', 'walt disney world'], ['mcdonalds', 'mcdonald s', 'mickey ds'],
    ['vacuum cleaner', 'vacuum', 'hoover'], ['tissue', 'kleenex'], ['bandage', 'band aid', 'bandaid'], ['cotton swab', 'q tip', 'qtip'], ['flashlight', 'torch'],
    ['diaper', 'nappy'], ['pacifier', 'binky'], ['money', 'cash'], ['big', 'large'], ['small', 'little'], ['fat', 'overweight'],
    ['tooth', 'teeth'], ['foot', 'feet'], ['man', 'men'], ['woman', 'women'], ['mouse', 'mice'], ['goose', 'geese'], ['person', 'people'], ['garbage', 'trash', 'rubbish'],
    ['swimsuit', 'bathing suit', 'swimming suit', 'swim suit'], ['tuxedo', 'tux'], ['limousine', 'limo'], ['microwave', 'microwave oven'], ['popsicle', 'ice pop', 'ice lolly'],
    ['soda', 'soft drink', 'soda pop', 'fizzy drink'], ['restaurant', 'eatery'], ['television show', 'tv show', 'tv program', 'television program'],
    ['mister', 'mr'], ['doctor', 'dr'], ['mount', 'mt'], ['santa', 'santa claus', 'father christmas', 'saint nick', 'st nick'],
    ['ice cream', 'icecream'], ['french fries', 'fries', 'french fry'], ['candy', 'sweets'], ['alcohol', 'booze', 'liquor'], ['present', 'gift']
  ];
  var IRREG = { children: 'child', teeth: 'tooth', feet: 'foot', men: 'man', women: 'woman', mice: 'mouse', geese: 'goose', people: 'person', knives: 'knife', wives: 'wife', leaves: 'leaf', loaves: 'loaf', wolves: 'wolf', shelves: 'shelf', lives: 'life', halves: 'half', calves: 'calf' };
  var NOSTEM = { news: 1, glasses: 1, pants: 1, jeans: 1, shorts: 1, scissors: 1, series: 1, species: 1, physics: 1, mathematics: 1, politics: 1, economics: 1, gymnastics: 1, chess: 1, bus: 1, gas: 1, yes: 1, this: 1, is: 1, his: 1, was: 1, has: 1, us: 1, plus: 1, bonus: 1, virus: 1, circus: 1, cactus: 1, octopus: 1, campus: 1, status: 1, lens: 1, christmas: 1, texas: 1, vegas: 1, paris: 1, dallas: 1, mcdonalds: 1, ss: 1, kiss: 1, dress: 1, glass: 1, grass: 1, class: 1, boss: 1, tennis: 1, means: 1, always: 1, sometimes: 1 };
  var ING_KEEP = { evening: 1, wedding: 1, nothing: 1, something: 1, anything: 1, everything: 1, ring: 1, king: 1, thing: 1, during: 1, ceiling: 1, lightning: 1, darling: 1, sterling: 1, morning: 1, spring: 1, string: 1, sing: 1, wing: 1, bring: 1, sibling: 1, pudding: 1, stuffing: 1, icing: 1, frosting: 1, clothing: 1, building: 1, painting: 1, drawing: 1, meeting: 1, feeling: 1, earring: 1, tired: 1, scared: 1, bored: 1, married: 1, excited: 1, worried: 1, teething: 1, interested: 1, boxing: 1, bowling: 1, parking: 1, dressing: 1, kidding: 1, bedding: 1, filling: 1, topping: 1, siding: 1, flooring: 1, roofing: 1, plumbing: 1, wiring: 1, timing: 1, training: 1, setting: 1, being: 1, swing: 1, sling: 1, dumpling: 1, sapling: 1, offspring: 1, savings: 1, belongings: 1, housing: 1, crossing: 1, banking: 1, landing: 1, heading: 1, booking: 1, listing: 1, rating: 1, spelling: 1, lighting: 1, sweeping: 1, posting: 1, crooked: 1, wicked: 1, naked: 1, rugged: 1, ragged: 1, jagged: 1, aged: 1, blessed: 1, beloved: 1, sacred: 1, wretched: 1, legged: 1, dogged: 1, bed: 1, red: 1, need: 1, seed: 1, speed: 1, weed: 1, feed: 1, breed: 1, shed: 1, sled: 1, wed: 1, fed: 1, led: 1, hundred: 1 };

  var VOCAB = null; // every word used in the question bank's answers counts as a real word too (brands, names: Lego, Chex)
  var GENERIC = { thing: 1, stuff: 1, person: 1, way: 1, time: 1, place: 1, one: 1, lot: 1, kind: 1, type: 1, something: 1, someone: 1, them: 1, they: 1, you: 1, me: 1, him: 1, do: 1, be: 1, get: 1, go: 1, make: 1, have: 1 };
  var EXTRA_OK = {}; ('big large huge giant tiny small little new old nice good great bad real fake favorite own lot lots many more few extra whole cute pretty ugly dirty clean '
    + 'fresh free cheap expensive fancy special every any other another very really too much just also all most best worst same different '
    + 'buy get have eat drink wear go use take make give do play see watch hear wash fix clean find bring keep put need want like love hate try '
    + 'warm hot cold nice cool long short tall wild young cell mobile smart cordless electric digital wrist pocket').split(' ').forEach(function (w) { EXTRA_OK[w] = 1; });
  var DROP_OK = {}; ('buy get have eat drink wear go use take make give do play see watch hear wash fix clean find bring keep put need want like love hate try '
    + 'cell mobile smart cordless electric digital wrist pocket favorite own lots lot many more extra whole every any other another very really too much just also all').split(' ').forEach(function (w) { DROP_OK[w] = 1; });
  function hasWord(w) { return !!((PL.dict && PL.dict.has(w)) || (VOCAB && VOCAB[w])); }
  function setVocab(labels) { VOCAB = {}; labels.forEach(function (l) { rawTokens(l).forEach(function (w) { VOCAB[w] = 1; }); }); cache = {}; }
  function rawTokens(s) {
    s = String(s == null ? '' : s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.replace(/[’'`]/g, '').replace(/&/g, ' and ').replace(/\$/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2');
    return s.split(' ').filter(Boolean).map(function (w) { return NUM[w] != null ? String(NUM[w]) : w; });
  }
  // alias table → token sequences, longest first
  var AL = [];
  // a spelling that loses a word to the filler list ("a c" -> "c") would rewrite unrelated text, so it is skipped
  ALIASES.forEach(function (g) { var canon = rawTokens(g[0]).filter(function (w) { return !STOP[w]; }); g.forEach(function (v) { var raw = rawTokens(v), t = raw.filter(function (w) { return !STOP[w]; }); if (t.length && t.length === raw.length && !(t.length === 1 && t[0].length === 1)) AL.push({ from: t, to: canon }); }); });
  AL.sort(function (a, b) { return b.from.length - a.from.length; });
  function base(w) { // canonical word form: irregular plurals, regular plurals; verb -ing/-ed only to a real shorter word
    if (/^\d+$/.test(w) || w.length <= 3) return w;
    if (IRREG[w]) return IRREG[w];
    if (!NOSTEM[w]) {
      // plurals: drop the "s" when that leaves a word (shoes -> shoe, cookies -> cookie), else "es" (boxes -> box), else ies -> y
      if (/[^su]s$/.test(w) && hasWord(w.slice(0, -1))) return w.slice(0, -1);
      if (/(ch|sh|x|ss|z|o)es$/.test(w) && hasWord(w.slice(0, -2))) return w.slice(0, -2);
      if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
      if (/[^su]s$/.test(w)) return w.slice(0, -1);
    }
    if (!ING_KEEP[w]) {
      var m = /^(.{3,}?)(ing|ed)$/.exec(w);
      if (m) {
        // hating -> hate (not hat), riding -> ride, running -> run, cooking -> cook: after a vowel + single consonant the
        // silent-e form is tried first; a doubled consonant is undone before the bare stem
        var s = m[1], cands = (/[aeiou][^aeiouwxy]$/.test(s) && !/[aeiou]{2}[^aeiou]$/.test(s) ? [s + 'e'] : []).concat([s.replace(/([^aeiou])\1$/, '$1'), s, s.replace(/i$/, 'y')]);
        for (var i = 0; i < cands.length; i++) if (cands[i].length >= 3 && hasWord(cands[i])) return cands[i];
      }
    }
    return w;
  }
  function tokens(s, plain) {
    var t = rawTokens(s), all = t.slice();
    t = t.filter(function (w) { return !STOP[w]; });
    if (!t.length) t = all.length ? all : [];               // answers like "A" or "Her" are only filler words
    var out = [], i = 0;
    while (i < t.length) {
      var hit = null;
      for (var k = 0; k < AL.length && !hit && !plain; k++) {
        var f = AL[k].from; if (i + f.length > t.length) continue;
        var ok = true; for (var j = 0; j < f.length; j++) if (t[i + j] !== f[j] && base(t[i + j]) !== f[j]) { ok = false; break; }
        if (ok) hit = AL[k];
      }
      if (hit) { out = out.concat(hit.to); i += hit.from.length; } else { out.push(base(t[i])); i++; }
    }
    return out;
  }
  function numberOnly(tk) { // [30] from "30", "$30", "30 dollars", "10 pm"; null otherwise
    var nums = tk.filter(function (w) { return /^\d+$/.test(w); });
    if (nums.length !== 1) return null;
    return tk.every(function (w) { return /^\d+$/.test(w) || UNITS[w]; }) ? nums[0] : null;
  }
  function bareNumber(tk) { return tk.length === 1 && /^\d+$/.test(tk[0]) ? tk[0] : null; }
  function damerau(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; } for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
      var c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  }
  function typoOk(g, a) { // one guessed word vs one answer word
    if (g === a) return true;
    if (/\d/.test(g) || /\d/.test(a)) return false;          // numbers must be exact
    var L = Math.max(g.length, a.length); if (L < 5 || Math.min(g.length, a.length) < 4) return false;
    if (hasWord(g) && hasWord(a)) return false;               // two different real words ("cold" vs "cook") are never a typo
    if (g[0] !== a[0] && !(g[0] === a[1] && g[1] === a[0])) return false;
    return damerau(g, a) <= (L >= 8 ? 2 : 1);
  }
  function sameBag(x, y) { return x.length === y.length && x.slice().sort().join(' ') === y.slice().sort().join(' '); }
  function contains(big, small) { var pool = big.slice(); return small.every(function (w) { var k = pool.indexOf(w); if (k < 0) return false; pool.splice(k, 1); return true; }); }
  function level(gt, at) {
    if (!gt.length || !at.length) return 0;
    var an = bareNumber(at);                                                // "7", "30": the guess must be that number
    if (an != null) return numberOnly(gt) === an ? 4 : 0;                   // ("seven", "$30", "10 pm" are fine)
    if (numberOnly(gt) != null && !at.some(function (w) { return /^\d+$/.test(w); })) return 0;
    if (sameBag(gt, at)) return 4;
    if (gt.join('') === at.join('')) return 3;
    if (gt.length === at.length) { var all = true, any = false; for (var i = 0; i < gt.length; i++) { if (gt[i] === at[i]) continue; if (typoOk(gt[i], at[i])) any = true; else { all = false; break; } } if (all && any) return 2; }
    if (gt.length === 1 && at.length === 1) return 0;
    var head = at[at.length - 1], ghead = gt[gt.length - 1];
    if (head !== ghead || GENERIC[head]) return 0;
    // shorter guess: must keep the head word and at least half of the answer's words ("price tag" → "remove price tag", "hat" → "top hat")
    if (gt.length < at.length) {
      if (!contains(at, gt) || gt.length * 2 < at.length || gt.join('').length < 3) return 0;
      var dropped = at.slice(); gt.forEach(function (w) { dropped.splice(dropped.indexOf(w), 1); });
      return gt.length >= 2 || dropped.every(function (w) { return DROP_OK[w]; }) ? 1 : 0;   // "dog" is not "hot dog"
    }
    // longer guess: the extra words may only be plain describing or doing words ("a big pumpkin", "buy flowers"), never another
    // noun that makes it a different thing ("garlic bread" is not "bread", "onion rings" is not "ring")
    if (gt.length <= at.length + 2 && contains(gt, at) && at.join('').length >= 3) {
      var extra = gt.slice(); at.forEach(function (w) { extra.splice(extra.indexOf(w), 1); });
      return extra.every(function (w) { return EXTRA_OK[w]; }) ? 1 : 0;
    }
    return 0;
    return 0;
  }
  var cache = {};
  function tk(s, plain) { var k = (plain ? '1' : '0') + String(s); if (!cache[k]) cache[k] = tokens(String(s), plain); return cache[k]; }
  /* board: [{label, n, answers:[...]}]. Returns {i, level, via} or {i:-1, ambiguous:[...]}.
     Each answer is scored twice: on the words as typed (plain) and with aliases. A plain match ranks above an alias
     match of the same level, so when a board has both "Dad" and "Daddy", "daddy" opens Daddy, not Dad. */
  function match(board, guess, open) {
    var gp = tokens(guess, true), ga = tokens(guess, false), per = [];
    board.forEach(function (c, i) {
      var best = 0, own = false;
      [c.label].concat(c.answers || []).forEach(function (a, k) {
        var l = Math.max(2 * level(gp, tk(a, true)) + 1, 2 * level(ga, tk(a, false))); if (l === 1) l = 0;
        if (l > best) { best = l; own = k === 0; }
      });
      per.push({ i: i, key: best, own: own, n: c.n });
    });
    var top = Math.max.apply(null, per.map(function (x) { return x.key; }));
    if (!top) return { i: -1, level: 0 };
    var lvl = top >> 1, cands = per.filter(function (x) { return x.key === top; });
    if (open && cands.length > 1) { var closed = cands.filter(function (x) { return !open[x.i]; }); if (closed.length) cands = closed; } // fish, then fishing
    // a tie is only resolved when both answers are worded the same (plain level 3–4); anything looser is ambiguous
    if (cands.length > 1 && !(top % 2 === 1 && lvl >= 3)) return { i: -1, level: lvl, ambiguous: cands.map(function (x) { return x.i; }) };
    cands.sort(function (a, b) { return (b.own - a.own) || (b.n - a.n) || (a.i - b.i); });
    return { i: cands[0].i, level: lvl, plain: top % 2 === 1 };
  }
  PL.surveyMatch = { setVocab: setVocab, match: match, tokens: tokens, level: level, typoOk: typoOk, ALIASES: ALIASES };
})();

;
/* ===== GAME 17: SURVEY SAYS — guess the most common answers to real survey questions =====
   Two question banks, both with real per-answer counts (nothing here is invented):
   - PL.data.survey: ProtoQA crowdsourced evaluation set (Boratko et al., 2020), CC BY 4.0. About 100 US English
     speakers per question; answers clustered by the dataset authors. See data/SURVEY-LICENSE-CC-BY-4.0.txt.
   - PL.data.survey_ff: the Family Feud question database the owner supplied (data/source/), converted by
     tools/build-survey-ff.py. Counts are exactly as listed in that file, out of 100. Compact rows:
     [id, question, [[answer, count, other accepted spellings...], ...]]. */
(function () {
  var h = PL.h;
  var ATTR_PQ = 'Survey data: ProtoQA crowdsourced set (Boratko et al., 2020), CC BY 4.0. About 100 real responses per question.';
  var ATTR_FF = 'Question from the Family Feud question database you supplied. Points are the counts listed in that file, out of 100.';
  function attr(p) { return p && p.src === 'ff' ? ATTR_FF : ATTR_PQ; }
  var BANK = null;
  function bank() {
    if (BANK) return BANK;
    var pq = (PL.data.survey || []).map(function (q) { return { id: q.id, q: q.q, total: q.total, src: 'pq', clusters: q.clusters }; });
    var ff = (PL.data.survey_ff || []).map(function (r) {
      return { id: r[0], q: r[1], total: 100, src: 'ff', clusters: r[2].map(function (c) { return { label: c[0], n: c[1], answers: [String(c[0]).toLowerCase()].concat(c.slice(2)) }; }) };
    });
    BANK = { pq: pq, ff: ff, all: pq.concat(ff) };
    SM.setVocab(ff.reduce(function (a, q) { q.clusters.forEach(function (c) { a.push(c.label); }); return a; }, []));
    return BANK;
  }
  var SM = PL.surveyMatch;
  function norm(s) { return SM.tokens(s).join(' '); }
  function slots(lv) { return lv <= 2 ? 4 : lv <= 4 ? 5 : lv <= 6 ? 6 : lv <= 8 ? 7 : 8; }
  // supplied bank: the whole board is shown, so the level picks how many answers the question has
  function sizes(lv) { return lv <= 2 ? [3, 4] : lv <= 4 ? [4, 5] : lv <= 6 ? [5, 6] : lv <= 8 ? [6, 7] : [7, 7]; }
  function pickBand(ok, lv, recent, rng) {
    ok = ok.slice().sort(function (a, b) { return (b.clusters[0].n - a.clusters[0].n) * (lv <= 5 ? 1 : -1); });
    var fresh = ok.filter(function (q) { return recent.indexOf(q.id) < 0; });
    var pool = fresh.length >= 3 ? fresh : ok;
    return rng.pick(pool.slice(0, Math.max(3, Math.ceil(pool.length * (lv <= 3 || lv >= 8 ? 0.5 : 0.8)))));
  }
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), B = bank(), n = slots(lv);
    var recent = (ctx && ctx.recent) || [];
    if (B.ff.length) { // ProtoQA's coarse answer groups (e.g. "cook" filed under "cold") made matches look wrong; new rounds use the supplied bank
      var sz = sizes(lv), q0 = pickBand(B.ff.filter(function (q) { return q.clusters.length >= sz[0] && q.clusters.length <= sz[1]; }), lv, recent, rng);
      return { id: q0.id, q: q0.q, total: 100, src: 'ff', board: q0.clusters.map(function (c) { return { label: c.label, n: c.n, answers: c.answers }; }), strikes: 3, tkey: q0.id };
    }
    var Q = B.pq;
    var ok = Q.filter(function (q) { return q.clusters.length >= Math.min(n, 4); });
    // easier levels prefer questions whose top answer is popular; harder ones prefer spread-out answers
    var q = pickBand(ok, lv, recent, rng);
    var shown = q.clusters.slice(0, n);
    return { id: q.id, q: q.q, total: q.total, src: 'pq', board: shown.map(function (c) { return { label: c.label, n: c.n, answers: c.answers }; }), strikes: 3, tkey: q.id };
  }
  function init(p) { return { open: p.board.map(function () { return false; }), given: p.board.map(function () { return false; }), strikes: 0, guesses: [], hintIdx: null, hintStage: 0 }; }
  function bestMatch(p, gs, guess) { var r = SM.match(p.board, guess, gs && gs.open); return r.i; }
  function matchInfo(p, guess, gs) { return SM.match(p.board, guess, gs && gs.open); }
  function points(p, gs) { return p.board.reduce(function (s, c, i) { return s + (gs.open[i] && !gs.given[i] ? c.n : 0); }, 0); }
  function boardTotal(p) { return p.board.reduce(function (s, c) { return s + c.n; }, 0); }
  function over(p, gs) { return gs.strikes >= p.strikes || gs.open.every(Boolean); }
  function view(api) {
    var p = api.p, gs = api.gs;
    var inp = h('input', { id: 'sv-in', class: 'txt', type: 'text', autocomplete: 'off', autocapitalize: 'none', placeholder: 'Your answer', enterkeyhint: 'go' });
    function guess(e) {
      e.preventDefault(); var g = inp.value.trim(); if (!g) return;
      if (gs.guesses.some(function (x) { return x.g.trim().toLowerCase() === g.toLowerCase(); })) { api.toast('Already tried.', ''); return; }
      var m = matchInfo(p, g, gs), i = m.i;
      if (m.ambiguous) { api.toast('“' + g + '” could mean more than one answer. Try being more specific.', ''); return; } // no strike
      if (i >= 0 && gs.open[i]) { api.toast('That matches “' + PL.cap(p.board[i].label) + '”, already on the board.', ''); return; }
      if (i >= 0) { gs.open[i] = true; gs.last = i; gs.guesses.push({ g: g, hit: i }); api.toast('Survey says: ' + p.board[i].n + '!' + (m.level < 4 && norm(g) !== norm(p.board[i].label) ? ' (accepted as “' + PL.cap(p.board[i].label) + '”)' : ''), 'good'); }
      else { gs.strikes++; gs.guesses.push({ g: g, hit: -1 }); api.wrong(); api.toast('Not on the board — strike ' + gs.strikes + '.', 'bad'); }
      if (over(p, gs)) { api.update(gs); api.finish(gs.open.every(Boolean) || points(p, gs) > 0 ? 'solved' : 'failed'); return; }
      api.update(gs);
      setTimeout(function () { var el = document.getElementById('sv-in'); if (el) el.focus(); }, 40);
    }
    var showAll = api.done;
    return h('div', { class: 'survey' },
      h('p', { class: 'prob' }, /^we asked/i.test(p.q) ? null : h('span', { class: 'lbl' }, p.src === 'ff' ? 'We asked 100 people: ' : 'We asked about ' + p.total + ' people: '), p.q),
      h('ol', { class: 'sv-board' }, p.board.map(function (c, i) {
        var open = gs.open[i] || showAll;
        return h('li', { class: 'sv-slot' + (gs.open[i] ? ' open' : showAll ? ' missed' : '') + (gs.given[i] ? ' given' : '') + (gs.open[i] && PL.fx && PL.fx.once('sv:' + p.id + ':' + i) ? ' reveal' : '') },
          h('span', { class: 'sv-rank mono' }, String(i + 1)),
          h('span', { class: 'sv-label' }, open ? PL.cap(c.label) : gs.hintIdx === i && gs.hintStage >= 1 ? String(c.label)[0].toUpperCase() + ' · ' + letters(c.label) : ''),
          h('span', { class: 'sv-n mono' }, open ? String(c.n) : ''));
      })),
      h('div', { class: 'sv-status' }, h('span', null, h('b', { class: 'mono' }, String(points(p, gs))), ' points'), h('span', { class: 'sv-strikes', 'aria-label': gs.strikes + ' strikes' }, [0, 1, 2].map(function (k) { return h('span', { class: 'sv-x' + (k < gs.strikes ? ' on' : '') }, '✕'); }))),
      api.done ? null : h('form', { class: 'row-in', onsubmit: guess }, inp, h('button', { class: 'btn primary', type: 'submit' }, 'Guess')),
      api.done ? null : h('button', { class: 'btn ghost sm', onclick: function () { if (!this.dataset.armed) { this.dataset.armed = 1; this.textContent = 'Tap again to stop and see the board'; return; } api.finish(points(p, gs) > 0 ? 'solved' : 'failed'); } }, 'Stop here'),
      gs.guesses.length ? h('div', { class: 'muted small' }, 'Your guesses: ' + gs.guesses.map(function (x) { return x.g + (x.hit >= 0 ? ' ✓' : ' ✗'); }).join(', ')) : null,
      h('p', { class: 'muted small' }, attr(p)));
  }
  function letters(l) { var k = String(l).replace(/[^a-z0-9]/gi, '').length; return /^\d+$/.test(String(l)) ? k + (k === 1 ? ' digit' : ' digits') : k + ' letters'; }
  function hint(p, gs) {
    var idx = gs.hintIdx;
    if (idx == null || gs.open[idx]) {
      idx = null;
      for (var i = 0; i < p.board.length; i++) if (!gs.open[i]) { idx = i; break; }
      if (idx == null) return { msg: 'Every answer is already on the board.', noCount: true };
      gs.hintIdx = idx; gs.hintStage = 0;
    }
    gs.hintStage++;
    var c = p.board[idx];
    if (gs.hintStage === 1) return { msg: 'Answer #' + (idx + 1) + ' starts with “' + String(c.label)[0].toUpperCase() + '” (' + letters(c.label) + ').', gs: gs };
    gs.open[idx] = true; gs.given[idx] = true;
    return { msg: 'Answer #' + (idx + 1) + ' is “' + c.label + '” (no points for revealed answers).', gs: gs, after: gs.open.every(Boolean) ? 'solved' : null };
  }
  function evaluate(p, gs, ctx) {
    var pts = points(p, gs), tot = boardTotal(p);
    var q = PL.clamp(Math.round(100 * pts / tot) - ctx.hints * 5, 0, 100);
    var found = gs.open.filter(function (o, i) { return o && !gs.given[i]; }).length;
    return { quality: Math.round(q), metrics: { points: pts, possible: tot, found: found, slots: p.board.length, strikes: gs.strikes, qid: p.id },
      lines: [['Points', pts + ' of ' + tot], ['Answers found', found + ' / ' + p.board.length], ['Strikes', gs.strikes]] };
  }
  function review(p, gs) {
    return h('div', { class: 'review' }, h('p', { class: 'prob' }, p.q),
      h('ol', { class: 'steps' }, p.board.map(function (c, i) { return h('li', null, PL.cap(c.label) + ' — ' + c.n + (gs.open[i] && !gs.given[i] ? ' ✓' : gs.given[i] ? ' (revealed)' : '') + (c.answers.length > 1 ? ' · also: ' + c.answers.filter(function (a) { return a !== c.label; }).slice(0, 5).join(', ') : '')); })),
      h('p', { class: 'muted small' }, attr(p)));
  }
  function stats(atts) {
    var A = atts.filter(function (a) { return a.metrics && a.metrics.possible; });
    return [['Rounds', A.length],
      ['Average points earned', A.length ? Math.round(PL.mean(A.map(function (a) { return 100 * a.metrics.points / a.metrics.possible; }))) + '% of the board' : '—'],
      ['Answers found', A.reduce(function (s, a) { return s + a.metrics.found; }, 0)],
      ['Clean boards (no strikes)', A.filter(function (a) { return a.metrics.strikes === 0 && a.metrics.found === a.metrics.slots; }).length],
      ['Questions seen', new Set(A.map(function (a) { return a.metrics.qid; })).size + ' of ' + bank().ff.length.toLocaleString('en-US')]];
  }
  PL.games.survey = {
    id: 'survey', name: 'Survey Says', blurb: 'Guess what most people answered in a real survey.',
    rules: 'Each question was put to 100 people. Name the answers on the board. Plurals, common abbreviations and true equivalents (vet = veterinarian, TV = television) count, as do small typos that can’t be another real word; look-alike words don’t. If a guess could mean two answers you’ll be asked to be more specific, without a strike. Three wrong guesses end the round. Points are the number of people who gave each answer. Questions come from the Family Feud question database you supplied, with spelling cleaned up; counts are exactly as listed there.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 60 + lv * 10; }, timeLimit: function () { return 240; },
    _match: bestMatch, _info: matchInfo, _norm: norm, _bank: bank
  };
})();

;
/* ===== GAME 13: COMMON THREADS — sixteen words, four hidden groups of four =====
   Built from a curated category bank with complete membership lists. A board is accepted only if
   (1) exactly one way exists to split the 16 words into the four chosen categories, and
   (2) no other category in the bank links four or more of the words across different groups,
   so every intended solution is fair and no rival grouping is equally defensible. Red herrings come from words
   that also belong to another chosen category; harder levels require more of them. */
(function () {
  var h = PL.h;
  var IDX = null;
  function bank() { return PL.data.threads || []; }
  function index() {
    if (IDX) return IDX;
    IDX = { byWord: {} };
    bank().forEach(function (c, i) { c.i = i; c.members.forEach(function (w) { (IDX.byWord[w] = IDX.byWord[w] || []).push(i); }); });
    return IDX;
  }
  function spec(lv) {
    if (lv <= 2) return { d: [1, 1], herr: [0, 0] };
    if (lv <= 4) return { d: [1, 2], herr: [0, 1] };
    if (lv <= 6) return { d: [1, 3], herr: [1, 3], need3: 1 };
    if (lv <= 8) return { d: [2, 4], herr: [2, 5], need3: 1 };
    return { d: [2, 4], herr: [3, 8], need3: 2 };
  }
  function countPartitions(words, cats, limit) {
    // assign each word to one of the 4 categories it belongs to, each category exactly 4 words
    var opts = words.map(function (w) { return cats.map(function (c, k) { return c.members.indexOf(w) >= 0 ? k : -1; }).filter(function (k) { return k >= 0; }); });
    var load = [0, 0, 0, 0], cnt = 0;
    var order = words.map(function (_, i) { return i; }).sort(function (a, b) { return opts[a].length - opts[b].length; });
    (function rec(k) {
      if (cnt >= limit) return;
      if (k === order.length) { cnt++; return; }
      var o = opts[order[k]];
      for (var j = 0; j < o.length; j++) if (load[o[j]] < 4) { load[o[j]]++; rec(k + 1); load[o[j]]--; }
    })(0);
    return cnt;
  }
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), sp = spec(lv), B = bank(); index();
    if (B.length < 8) throw new Error('Common Threads data missing');
    var recent = ((ctx && ctx.recent) || []).join('|').split('|');
    var eligible = B.filter(function (c) { return c.d >= sp.d[0] && c.d <= sp.d[1]; });
    for (var t = 0; t < 3000; t++) {
      var cats = [], used = {};
      var pool = rng.shuffle(eligible);
      for (var i = 0; i < pool.length && cats.length < 4; i++) {
        var c = pool[i];
        if (cats.some(function (x) { return x.id === c.id || x.name === c.name; })) continue;
        if (t < 2000 && recent.indexOf(c.id) >= 0) continue;
        cats.push(c);
      }
      if (cats.length < 4) continue;
      if (sp.need3 && cats.filter(function (c) { return c.d >= 3; }).length < sp.need3) continue;
      // choose 4 members of each category, distinct across the board; prefer words that are herrings at harder levels
      var picks = [], ok = true;
      for (var k = 0; k < 4 && ok; k++) {
        var cand = rng.shuffle(cats[k].members.filter(function (w) { return !used[w]; }));
        if (sp.herr[1] > 0) cand.sort(function (a, b) { return herrScore(b, cats, k) - herrScore(a, cats, k) + (rng() - 0.5) * 1.2; });
        else cand = cand.filter(function (w) { return herrScore(w, cats, k) === 0; });
        if (cand.length < 4) { ok = false; break; }
        var four = cand.slice(0, 4); four.forEach(function (w) { used[w] = 1; }); picks.push(four);
      }
      if (!ok) continue;
      var words = [].concat.apply([], picks);
      var herr = words.filter(function (w, j) { return herrScore(w, cats, Math.floor(j / 4)) > 0; }).length;
      if (herr < sp.herr[0] || herr > sp.herr[1]) continue;
      if (countPartitions(words, cats, 2) !== 1) continue;
      if (rival(words, picks, cats)) continue;
      var groups = cats.map(function (c, j) { return { id: c.id, name: c.name, explain: c.explain, d: c.d, words: picks[j] }; });
      groups.sort(function (a, b) { return a.d - b.d; });
      return { groups: groups, tiles: rng.shuffle(words), herrings: herr, tkey: cats.map(function (c) { return c.id; }).join('|'), maxMistakes: 4 };
    }
    throw new Error('Common Threads could not build a fair board');
  }
  function herrScore(w, cats, own) { var n = 0; cats.forEach(function (c, k) { if (k !== own && c.members.indexOf(w) >= 0) n++; }); return n; }
  function rival(words, picks, cats) { // another bank category tying 4+ board words together across groups
    var ids = {}; cats.forEach(function (c) { ids[c.i] = 1; });
    var hits = {};
    words.forEach(function (w, j) { (IDX.byWord[w] || []).forEach(function (ci) { if (ids[ci]) return; (hits[ci] = hits[ci] || []).push(Math.floor(j / 4)); }); });
    return Object.keys(hits).some(function (ci) { var g = hits[ci]; return g.length >= 4 && new Set(g).size > 1; });
  }
  function init(p) { return { solved: [], sel: [], mistakes: 0, tries: [], order: p.tiles.slice(), hintG: null, hintStage: 0, shown: [] }; }
  function groupOf(p, w) { for (var i = 0; i < p.groups.length; i++) if (p.groups[i].words.indexOf(w) >= 0) return i; return -1; }
  function view(api) {
    var p = api.p, gs = api.gs;
    var solvedWords = {}; gs.solved.forEach(function (gi) { p.groups[gi].words.forEach(function (w) { solvedWords[w] = 1; }); });
    var remaining = gs.order.filter(function (w) { return !solvedWords[w]; });
    function submit() {
      if (gs.sel.length !== 4) return;
      var key = gs.sel.slice().sort().join('|');
      if (gs.tries.indexOf(key) >= 0) { api.toast('You already tried that group.', ''); return; }
      gs.tries.push(key);
      var gi = groupOf(p, gs.sel[0]);
      if (gs.sel.every(function (w) { return groupOf(p, w) === gi; })) {
        gs.solved.push(gi); gs.sel = [];
        if (gs.hintG === gi) { gs.hintG = null; gs.hintStage = 0; }
        api.toast(p.groups[gi].name, 'good');
        if (gs.solved.length === 4) { api.update(gs); api.finish('solved'); return; }
        api.update(gs); return;
      }
      gs.mistakes++; api.wrong();
      var counts = {}; gs.sel.forEach(function (w) { var g = groupOf(p, w); counts[g] = (counts[g] || 0) + 1; });
      var oneAway = Object.keys(counts).some(function (g) { return counts[g] === 3; });
      if (gs.mistakes >= p.maxMistakes) { api.update(gs); api.finish('failed'); return; }
      api.toast(oneAway ? 'One away…' : 'Not a group.', 'bad'); api.update(gs);
    }
    var hintWords = {}; if (gs.hintG != null && gs.hintStage >= 2) p.groups[gs.hintG].words.slice(0, gs.hintStage >= 3 ? 3 : 2).forEach(function (w) { hintWords[w] = 1; });
    return h('div', { class: 'threads' },
      h('div', { class: 'muted small' }, 'Find four groups of four words that share something. Select four, then submit.'),
      gs.solved.map(function (gi) { var g = p.groups[gi]; return h('div', { class: 'th-solved d' + g.d + (!api.done && PL.fx && PL.fx.once('th:' + p.groups.map(function (x) { return x.name; }).join('|') + ':' + gi) ? ' land' : '') }, h('b', null, g.name), h('div', { class: 'small' }, g.words.join(', '))); }),
      gs.hintG != null && gs.solved.indexOf(gs.hintG) < 0 ? h('div', { class: 'hintline small' }, 'Hint: one group is “' + p.groups[gs.hintG].name + '”.') : null,
      h('div', { class: 'th-grid' }, remaining.map(function (w) {
        var on = gs.sel.indexOf(w) >= 0;
        return h('button', { class: 'th-tile' + (on ? ' on' : '') + (hintWords[w] ? ' hinted' : '') + (w.length > 8 ? ' long' : ''), disabled: api.done, onclick: function () {
          var i = gs.sel.indexOf(w);
          if (i >= 0) gs.sel.splice(i, 1); else if (gs.sel.length < 4) gs.sel.push(w);
          api.update(gs);
        } }, w);
      })),
      api.done ? null : h('div', { class: 'row-actions th-actions' },
        h('span', { class: 'muted small' }, 'Mistakes left: ' + '●'.repeat(p.maxMistakes - gs.mistakes) + '○'.repeat(gs.mistakes)),
        h('button', { class: 'btn ghost sm', onclick: function () { gs.order = PL.rng(PL.uid()).shuffle(gs.order); api.update(gs); } }, 'Shuffle'),
        h('button', { class: 'btn ghost sm', disabled: !gs.sel.length, onclick: function () { gs.sel = []; api.update(gs); } }, 'Deselect'),
        h('button', { class: 'btn sm primary', disabled: gs.sel.length !== 4, onclick: submit }, 'Submit')));
  }
  /* Hints, per group (easiest unsolved group first): its name, then two of its words, then a third word */
  function hint(p, gs) {
    if (gs.hintG == null || gs.solved.indexOf(gs.hintG) >= 0) {
      var next = p.groups.map(function (_, i) { return i; }).filter(function (i) { return gs.solved.indexOf(i) < 0; })[0];
      if (next == null) return { msg: 'All groups are solved.', noCount: true };
      gs.hintG = next; gs.hintStage = 0;
    }
    var g = p.groups[gs.hintG];
    if (gs.hintStage >= 3) return { msg: 'You have every clue for “' + g.name + '”: ' + g.words.slice(0, 3).join(', ') + ' and one more.', noCount: true };
    gs.hintStage++;
    if (gs.hintStage === 1) return { msg: 'One group is “' + g.name + '”.', gs: gs };
    if (gs.hintStage === 2) return { msg: g.words[0] + ' and ' + g.words[1] + ' are both in “' + g.name + '” (highlighted).', gs: gs };
    return { msg: g.words[2] + ' is in “' + g.name + '” too.', gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved', n = gs.solved.length;
    var q = solved ? PL.clamp(100 - gs.mistakes * 12 - ctx.hints * 12, 15, 100) : n * 12;
    return { quality: Math.round(q), metrics: { groups: n, mistakes: gs.mistakes, perfect: solved && !gs.mistakes && !ctx.hints, herrings: p.herrings, cats: p.groups.map(function (g) { return g.id; }) },
      lines: [['Groups solved', n + ' / 4'], ['Mistakes', gs.mistakes + ' / ' + p.maxMistakes], ['Red herrings on the board', p.herrings]] };
  }
  function review(p, gs) {
    return h('div', { class: 'review' }, p.groups.map(function (g) { return h('div', { class: 'th-solved d' + g.d }, h('b', null, g.name), h('div', { class: 'small' }, g.words.join(', ')), g.explain ? h('div', { class: 'small muted' }, g.explain) : null); }),
      gs.tries && gs.tries.length ? h('p', { class: 'muted small' }, 'Your submissions: ' + gs.tries.map(function (t) { return t.split('|').join(' '); }).join(' · ')) : null);
  }
  function stats(atts) {
    var s = atts.filter(function (a) { return a.outcome === 'solved'; });
    return [['Boards solved', s.length + ' / ' + atts.length],
      ['Perfect boards', s.filter(function (a) { return a.metrics.perfect; }).length],
      ['Average groups found', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.groups; })).toFixed(1) + ' / 4' : '—'],
      ['Average mistakes', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.mistakes; })).toFixed(1) : '—']];
  }
  PL.games.threads = {
    id: 'threads', name: 'Common Threads', blurb: 'Sort sixteen words into four hidden groups.',
    rules: 'Sixteen words hide four groups of four. Select four words that share a connection and submit. Some words seem to fit more than one group; only one complete arrangement works. Four mistakes end the board.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 120 + lv * 20; }, timeLimit: function () { return 420; },
    _count: countPartitions, _rival: rival
  };
})();

;
/* ===== Five-question sessions =====
   Wraps a single-question engine (Algebra Arcade, Balance, Word Links) so a standard game is a session of five
   questions. One session = one attempt record, so adaptive difficulty updates once per completed session; every
   question's own result (accuracy, attempts, hints, level, active time, quality) is kept inside metrics.questions.
   Puzzles without `qs` (daily puzzles and pre-v3 history) are passed straight to the original engine. */
(function () {
  var h = PL.h;
  var N = 5;
  var OFFSETS = [0, 0, 1, -1, 0]; // gentle variation within a session, never more than one level away

  function wrap(id) {
    var base = PL.games[id];
    if (!base || base.multi) return;
    var W = Object.assign({}, base);
    W.multi = N; W.base = base;

    W.generate = function (level, rng, ctx) {
      if (ctx && ctx.daily) return base.generate(level, rng, ctx);
      var qs = [], levels = [], fps = {}, recent = ((ctx && ctx.recent) || []).slice();
      var offs = rng.shuffle(OFFSETS);
      for (var i = 0; i < N; i++) {
        var lv = PL.clamp(level + offs[i], 1, 10), p = null;
        for (var t = 0; t < 12; t++) {
          var cand = base.generate(lv, rng, Object.assign({}, ctx, { recent: recent }));
          var fp = PL.hash(JSON.stringify(cand)), key = cand.tkey || cand.text || null;
          if (fps[fp] || (key && fps['k:' + key] && t < 8)) continue;
          fps[fp] = 1; if (key) fps['k:' + key] = 1; p = cand; break;
        }
        if (!p) throw new Error('Could not build five distinct questions');
        if (p.tkey) recent.push(p.tkey);
        qs.push(p); levels.push(lv);
      }
      return { qs: qs, levels: levels, format: 'session5', v: 1 };
    };
    function qInit(p, i, api) { return { gs: base.init(p.qs[i]), hints: 0, wrong: 0, ms: 0, start: api ? api.activeMs() : 0, outcome: null }; }
    W.init = function (p) {
      if (!p.qs) return base.init(p);
      return { i: 0, q: [{ gs: base.init(p.qs[0]), hints: 0, wrong: 0, ms: 0, start: 0, outcome: null }], showResult: false };
    };
    function current(gs) { return gs.q[gs.i]; }
    function endQuestion(p, gs, api, outcome) {
      var q = current(gs);
      if (q.outcome) return;
      q.outcome = outcome; q.ms = Math.max(0, api.activeMs() - (q.start || 0));
      gs.showResult = true;
    }
    function advance(p, gs, api) {
      gs.showResult = false;
      if (gs.i >= N - 1) return;
      gs.i++;
      gs.q[gs.i] = qInit(p, gs.i, api);
    }
    function sessionDone(gs) { return gs.q.length === N && gs.q.every(function (q) { return q.outcome; }); }

    W.view = function (api) {
      var p = api.p, gs = api.gs;
      if (!p.qs) return base.view(api);
      if (gs.q[gs.i] && gs.q[gs.i].start == null) gs.q[gs.i].start = api.activeMs();
      var q = current(gs), qp = p.qs[gs.i];
      var sub = {
        p: qp, gs: q.gs, level: p.levels[gs.i], daily: false, done: api.done || !!q.outcome,
        activeMs: api.activeMs,
        update: function (g) { q.gs = g; api.update(gs); },
        save: function (g) { q.gs = g; api.save(gs); },
        wrong: function (n) { q.wrong += (n || 1); api.wrong(n); },
        toast: api.toast,
        finish: function (outcome) {
          endQuestion(p, gs, api, outcome);
          if (sessionDone(gs)) { gs.showResult = false; api.update(gs); api.finish('solved'); }
          else api.update(gs);
        }
      };
      var dots = h('div', { class: 'q-dots', 'aria-hidden': 'true' }, p.qs.map(function (_, k) {
        var qq = gs.q[k];
        return h('span', { class: 'q-dot' + (k === gs.i ? ' cur' : '') + (qq && qq.outcome === 'solved' ? ' ok' : qq && qq.outcome ? ' bad' : '') });
      }));
      var head = h('div', { class: 'q-head' }, h('span', { class: 'lbl' }, 'Question ' + (gs.i + 1) + ' of ' + N), dots);
      var resultBar = null;
      if (gs.showResult && q.outcome && !api.done) {
        var ok = q.outcome === 'solved';
        var ev = base.evaluate(qp, q.gs, { outcome: q.outcome, hints: q.hints, wrong: q.wrong });
        resultBar = h('div', { class: 'q-result ' + (ok ? 'ok' : 'bad'), role: 'status' },
          h('div', null, h('b', null, ok ? (q.wrong || q.hints ? 'Correct' : 'Correct, first try') : 'Not solved'), h('span', { class: 'muted small' }, ' · ' + ev.quality + ' points · ' + PL.fmtTime(q.ms))),
          h('button', { class: 'btn primary', onclick: function () { advance(p, gs, api); api.update(gs); window.scrollTo(0, 0); } }, gs.i === N - 1 ? 'See results' : 'Next question'));
      }
      var body;
      try { body = base.view(sub); } catch (e) { body = h('div', { class: 'notice bad' }, e.message); }
      var parts = [head, resultBar, body];
      if (gs.showResult && q.outcome) parts.push(h('details', { class: 'card q-review' }, h('summary', null, 'Show the solution'), base.review(qp, q.gs)));
      return h('div', { class: 'session' }, parts);
    };
    W.hint = function (p, gs) {
      if (!p.qs) return base.hint(p, gs);
      var q = current(gs);
      if (q.outcome) return { msg: 'This question is finished. Tap Next question to continue.', noCount: true };
      var r = base.hint(p.qs[gs.i], q.gs) || { msg: 'No hint available.', noCount: true };
      if (r.gs) q.gs = r.gs;
      if (!r.noCount) q.hints++;
      return { msg: r.msg, gs: gs, noCount: r.noCount };
    };
    W.giveUp = function (p, gs, api) { // give up on the current question only; the session continues
      if (!p.qs) return false;
      var q = current(gs); if (q.outcome) return true;
      endQuestion(p, gs, api, 'failed');
      if (sessionDone(gs)) { gs.showResult = false; api.finish('solved'); }
      return true;
    };
    W.giveUpLabel = function (p) { return p.qs ? 'Give up on this question' : null; };
    W.evaluate = function (p, gs, ctx) {
      if (!p.qs) return base.evaluate(p, gs, ctx);
      var questions = p.qs.map(function (qp, k) {
        var q = gs.q[k];
        if (!q || !q.outcome) return { level: p.levels[k], outcome: 'unanswered', quality: 0, hints: q ? q.hints : 0, wrong: q ? q.wrong : 0, ms: q ? q.ms : 0 };
        var ev = base.evaluate(qp, q.gs, { outcome: q.outcome, hints: q.hints, wrong: q.wrong });
        return { level: p.levels[k], outcome: q.outcome, quality: ev.quality, hints: q.hints, wrong: q.wrong, ms: q.ms, metrics: ev.metrics };
      });
      var quality = Math.round(PL.mean(questions.map(function (x) { return x.quality; })));
      var correct = questions.filter(function (x) { return x.outcome === 'solved'; }).length;
      var answered = questions.filter(function (x) { return x.outcome !== 'unanswered'; }).length;
      var complete = answered === N;
      return {
        quality: quality,
        title: complete ? correct + ' of ' + N + ' correct' : 'Session ended early',
        complete: complete,
        metrics: { session: true, format: 'session5', correct: correct, answered: answered, complete: complete, questions: questions },
        lines: [['Questions correct', correct + ' / ' + N], ['Session score', quality + ' / 100']].concat(questions.map(function (x, k) {
          return ['Q' + (k + 1) + ' · level ' + x.level, x.outcome === 'solved' ? '✓ ' + x.quality + (x.hints ? ' · ' + PL.plural(x.hints, 'hint') : '') + (x.wrong ? ' · ' + x.wrong + ' wrong' : '') : x.outcome === 'failed' ? '✗ given up' : '—'];
        }))
      };
    };
    W.review = function (p, gs) {
      if (!p.qs) return base.review(p, gs);
      return h('div', { class: 'review' }, p.qs.map(function (qp, k) {
        var q = gs.q[k];
        return h('details', { class: 'card', open: k === 0 }, h('summary', null, 'Question ' + (k + 1) + ' · ' + (q && q.outcome === 'solved' ? 'correct' : q && q.outcome ? 'not solved' : 'not reached')),
          base.review(qp, q ? q.gs : base.init(qp)));
      }));
    };
    W.stats = function (atts) {
      // flatten sessions into question-level records so the game's own statistics include every question
      var flat = [], sessions = [];
      atts.forEach(function (a) {
        if (a.metrics && a.metrics.session) {
          sessions.push(a);
          a.metrics.questions.forEach(function (q) { if (q.outcome !== 'unanswered') flat.push({ outcome: q.outcome, quality: q.quality, perf: q.quality, hints: q.hints, wrong: q.wrong, level: q.level, activeMs: q.ms, metrics: q.metrics || {} }); });
        } else flat.push(a);
      });
      var rows = [];
      if (sessions.length) {
        var comp = sessions.filter(function (a) { return a.metrics.complete; });
        rows.push(['Five-question games', comp.length + ' completed' + (sessions.length > comp.length ? ' (' + (sessions.length - comp.length) + ' ended early)' : '')]);
        if (comp.length) {
          rows.push(['Average correct per game', PL.mean(comp.map(function (a) { return a.metrics.correct; })).toFixed(1) + ' / 5']);
          rows.push(['Best game score', Math.max.apply(null, comp.map(function (a) { return a.quality; }))]);
          rows.push(['Perfect games (5/5, no hints)', comp.filter(function (a) { return a.metrics.correct === 5 && !a.hints; }).length]);
        }
        rows.push(['Questions answered', flat.length]);
      }
      return rows.concat(base.stats(flat));
    };
    W.timeLimit = function (lv) { return base.timeLimit(lv) * N; };
    PL.games[id] = W;
  }
  ['algebra', 'balance', 'links'].forEach(wrap);
})();

;
/* ===== Persistence: IndexedDB on the device (localStorage fallback), with a persistent-storage request ===== */
(function () {
  var SCHEMA = 4;
  PL.SCHEMA = SCHEMA;
  var DBNAME = 'puzzlelab', STORE = 'kv';
  var mem = {}, idb = null, mode = 'memory', persisted = null, listeners = [];

  function openIDB() {
    return new Promise(function (resolve) {
      try {
        if (!window.indexedDB) return resolve(null);
        var req = indexedDB.open(DBNAME, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { resolve(null); };
        req.onblocked = function () { resolve(null); };
        setTimeout(function () { resolve(null); }, 5000);
      } catch (e) { resolve(null); }
    });
  }
  function idbAll(db) {
    return new Promise(function (resolve) {
      try {
        var out = {}, req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
        req.onsuccess = function () { var c = req.result; if (c) { out[c.key] = c.value; c.continue(); } else resolve(out); };
        req.onerror = function () { resolve(out); };
      } catch (e) { resolve({}); }
    });
  }
  // writes are batched per tick so a burst of saves becomes one transaction
  var pending = {}, flushT = null;
  function schedule(k, v) { pending[k] = v; if (!flushT) flushT = setTimeout(flush, 30); }
  function flush() {
    flushT = null;
    var keys = Object.keys(pending); if (!keys.length) return;
    var batch = pending; pending = {};
    if (mode === 'indexeddb') {
      try {
        var tx = idb.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE);
        keys.forEach(function (k) { if (batch[k] === undefined) st.delete(k); else st.put(batch[k], k); });
        tx.onerror = function () { notify('error'); };
      } catch (e) { notify('error'); }
    } else if (mode === 'localstorage') {
      try { localStorage.setItem('puzzlelab.kv', JSON.stringify(mem)); } catch (e) { notify('error'); }
    }
  }
  function notify(ev) { listeners.forEach(function (f) { try { f(ev); } catch (e) { } }); }

  PL.store = {
    get: function (k) { return mem[k]; },
    keys: function (prefix) { return Object.keys(mem).filter(function (k) { return k.indexOf(prefix) === 0; }); },
    put: function (k, v) { if (v && typeof v === 'object') v.u = Date.now(); mem[k] = v; schedule(k, v); },
    del: function (k) { delete mem[k]; schedule(k, undefined); },
    raw: function () { return mem; },
    flush: flush,
    onChange: function (f) { listeners.push(f); },
    status: function () { return { local: mode, persisted: persisted }; },
    replaceAll: function (obj) {
      Object.keys(mem).forEach(function (k) { if (!(k in obj)) PL.store.del(k); });
      Object.keys(obj).forEach(function (k) { mem[k] = obj[k]; schedule(k, obj[k]); });
      flush();
    },
    init: async function () {
      idb = await openIDB();
      if (idb) { mode = 'indexeddb'; mem = await idbAll(idb); }
      else {
        try { var s = localStorage.getItem('puzzlelab.kv'); mem = s ? JSON.parse(s) : {}; mode = 'localstorage'; } catch (e) { mem = {}; mode = 'memory'; }
      }
      try { if (navigator.storage && navigator.storage.persist) { persisted = await navigator.storage.persisted(); if (!persisted) persisted = await navigator.storage.persist(); } } catch (e) { }
      return mem;
    }
  };
  window.addEventListener && window.addEventListener('pagehide', flush);
  document.addEventListener && document.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });
})();

;
/* ===== Data model: settings, ratings (adaptive difficulty), attempts, daily quiz ===== */
(function () {
  var S = function () { return PL.store; };
  var GEN_VERSION = 1;
  PL.GEN_VERSION = GEN_VERSION;

  function defaultCore() {
    var ratings = {};
    PL.order.concat(PL.retired).forEach(function (g) { ratings[g] = { level: 3, highest: 3, changes: [], since: 0 }; });
    return { schema: PL.SCHEMA, settings: { timed: false, excluded: [], adjIndex: false }, ratings: ratings, shuffle: { recent: [] }, created: Date.now() };
  }
  PL.migrate = function (core) { // schema migrations for exported/stored data
    if (!core) return defaultCore();
    if (!core.schema) core.schema = 1;
    if (core.schema < 2) { // v2: ten games; Logic Lab retired (its rating is kept for the record); Reverse Engineer and Word Links added
      core.schema = 2;
      if (core.settings && core.settings.excluded) core.settings.excluded = core.settings.excluded.filter(function (g) { return PL.order.indexOf(g) >= 0; });
    }
    if (core.schema < 3) core.schema = 3; // v3: seven new games (ratings created below at the default level, independent of other games)
    if (core.schema < 4) core.schema = 4; // v4: Word Rush scoring v2; old results are re-scored by M.upgradeRecords (originals kept in a.v1); daily order lists
    var d = defaultCore();
    core.settings = Object.assign({}, d.settings, core.settings || {});
    core.ratings = core.ratings || {};
    PL.order.concat(PL.retired).forEach(function (g) { if (!core.ratings[g]) core.ratings[g] = d.ratings[g]; });
    core.shuffle = core.shuffle || { recent: [] };
    return core;
  };
  var M = PL.model = {};
  M.core = function () { var c = S().get('core'); if (!c) { c = defaultCore(); S().put('core', c); } return PL.migrate(c); };
  M.saveCore = function (c) { S().put('core', c); };
  M.settings = function () { return M.core().settings; };
  M.setSetting = function (k, v) { var c = M.core(); c.settings[k] = v; M.saveCore(c); };
  M.rating = function (g) { return M.core().ratings[g]; };

  /* ---- attempts ---- */
  M.attempts = function (filter) {
    var out = [];
    S().keys('att:').forEach(function (k) { var a = S().get(k); if (a && (!filter || filter(a))) out.push(a); });
    out.sort(function (a, b) { return (a.endedAt || 0) - (b.endedAt || 0); });
    return out;
  };
  M.saveAttempt = function (a) { S().put('att:' + a.id, a); };
  M.getAttempt = function (id) { return S().get('att:' + id); };
  // which attempts count toward ordinary statistics
  M.counts = function (a) { return a.mode === 'unlimited' && !a.timed; };
  M.eligible = function (a) { return M.counts(a) && a.outcome !== 'skipped'; };

  /* ---- adaptive difficulty ----
     Effective performance credits harder puzzles: eff = perf + 6 × (attempt level − current level), clamped 0–100.
     Window: eligible attempts since the last level change (at most 20), weighted 0.85^age (newest weight 1).
     Rise: weighted mean ≥ 85 with ≥ 4 attempts (3 during the first 8 attempts of a game) and the latest eff ≥ 70.
     Drop: weighted mean < 65 with ≥ 4 attempts (3 during calibration) and the latest eff < 75.
     The 65–85 band, the reset of the window after each change, and the one-level step provide hysteresis. */
  M.ADAPT = { up: 85, down: 65, minN: 4, calibN: 3, calibAttempts: 8, decay: 0.85, window: 20, levelCredit: 6 };
  M.rollingFor = function (g, rating) {
    rating = rating || M.rating(g);
    var A = M.ADAPT;
    var all = M.attempts(function (a) { return a.game === g && M.eligible(a); });
    var lastChange = rating.changes.length ? rating.changes[rating.changes.length - 1].t : 0;
    var win = all.filter(function (a) { return a.endedAt > lastChange; }).slice(-A.window);
    var effs = win.map(function (a) { return PL.clamp(a.perf + A.levelCredit * (a.level - rating.level), 0, 100); });
    var wsum = 0, tot = 0;
    for (var i = 0; i < effs.length; i++) { var w = Math.pow(A.decay, effs.length - 1 - i); wsum += w; tot += w * effs[i]; }
    return { n: effs.length, mean: effs.length ? tot / wsum : null, latest: effs.length ? effs[effs.length - 1] : null, total: all.length };
  };
  M.adapt = function (g) {
    var c = M.core(), r = c.ratings[g], A = M.ADAPT;
    var roll = M.rollingFor(g, r);
    var minN = roll.total <= A.calibAttempts ? A.calibN : A.minN;
    var change = 0, reason = '';
    if (roll.n >= minN && roll.mean >= A.up && roll.latest >= 70 && r.level < 10) { change = 1; reason = 'Recent performance ' + Math.round(roll.mean) + ' over ' + roll.n + ' puzzles'; }
    else if (roll.n >= minN && roll.mean < A.down && roll.latest < 75 && r.level > 1) { change = -1; reason = 'Recent performance ' + Math.round(roll.mean) + ' over ' + roll.n + ' puzzles'; }
    if (change) {
      var from = r.level; r.level += change; r.highest = Math.max(r.highest, r.level);
      r.changes.push({ t: Date.now(), from: from, to: r.level, reason: reason });
      M.saveCore(c);
    }
    return { change: change, level: r.level, roll: roll };
  };

  /* ---- record upgrades (idempotent; run at start-up, after import and after bringing back reset results) ----
     Word Rush v1 scores compared points with a small target, so almost every round scored 100 and pushed the level up.
     Each v1 unlimited round is re-scored with v2 from its stored board, words found and hints. The original numbers stay
     on the record (a.v1 = {quality, perf, target, points}) and the round's review says it was re-scored. Daily quiz
     results are never changed. Then the Word Rush level is recalibrated by replaying the normal adaptive rules over the
     re-scored rounds, so the level reflects real coverage across many games rather than the old inflated scores. */
  M.replayLevel = function (g) {
    var A = M.ADAPT, atts = M.attempts(function (a) { return a.game === g && M.eligible(a); });
    if (!atts.length) return null;
    var L = atts[0].level, since = 0, ups = 0, downs = 0;
    atts.forEach(function (a, idx) {
      var win = atts.slice(since, idx + 1).slice(-A.window);
      var effs = win.map(function (x) { return PL.clamp(x.perf + A.levelCredit * (x.level - L), 0, 100); });
      var wsum = 0, tot = 0; for (var i = 0; i < effs.length; i++) { var w = Math.pow(A.decay, effs.length - 1 - i); wsum += w; tot += w * effs[i]; }
      var mean = tot / wsum, latest = effs[effs.length - 1], minN = idx + 1 <= A.calibAttempts ? A.calibN : A.minN;
      if (effs.length >= minN && mean >= A.up && latest >= 70 && L < 10) { L++; ups++; since = idx + 1; }
      else if (effs.length >= minN && mean < A.down && latest < 75 && L > 1) { L--; downs++; since = idx + 1; }
    });
    return { level: L, n: atts.length };
  };
  M.upgradeRecords = function () {
    var G = PL.games.wordrush, n = 0;
    if (G && G.rescore) M.attempts(function (a) { return a.game === 'wordrush' && a.mode === 'unlimited'; }).forEach(function (a) {
      var r = null; try { r = G.rescore(a); } catch (e) { r = null; } // a damaged record is left exactly as it was
      if (!r) return;
      a.v1 = r.v1; a.quality = r.quality; a.perf = r.perf; a.metrics = Object.assign({}, a.metrics, r.metrics); a.rescoredAt = Date.now();
      a.lines = (a.lines || []).concat([['Scoring', 'Re-scored with Word Rush scoring v2: ' + r.perf + ' (was ' + r.v1.perf + ' under v1, kept on record)']]);
      M.saveAttempt(a); n++;
    });
    var c0 = M.core(), rt0 = c0.ratings.wordrush;
    if (rt0 && (n || (!rt0.v2cal && M.attempts(function (a) { return a.game === 'wordrush' && a.v1; }).length))) {
      var rep = M.replayLevel('wordrush'), c = M.core(), rt = c.ratings.wordrush;
      if (rep && rep.level !== rt.level) {
        rt.changes.push({ t: Date.now(), from: rt.level, to: rep.level, reason: 'Recalibrated after re-scoring Word Rush rounds with scoring v2' });
        rt.level = rep.level;
      }
      rt.v2cal = true; M.saveCore(c);
    }
    return n;
  };

  /* ---- active unlimited sessions (resumable) ---- */
  M.active = function (g) { return S().get('act:' + g); };
  M.saveActive = function (g, s) { S().put('act:' + g, s); };
  M.clearActive = function (g) { S().del('act:' + g); };

  /* ---- repeat avoidance context ---- */
  M.genContext = function (g) {
    var atts = M.attempts(function (a) { return a.game === g; }).slice(-60);
    var ctx = { recent: [], seenWords: [] };
    atts.forEach(function (a) {
      var p = a.puzzle || {};
      if (p.tkey) ctx.recent.push(p.tkey);
      if (p.words) p.words.forEach(function (w) { ctx.seenWords.push(w.w); });
      if (p.w) ctx.seenWords.push(p.w);
    });
    // words seen in either word game count as seen for both
    if (g === 'password' || g === 'detective') {
      M.attempts(function (a) { return (a.game === 'password' || a.game === 'detective'); }).slice(-80).forEach(function (a) {
        var p = a.puzzle || {}; if (p.words) p.words.forEach(function (w) { ctx.seenWords.push(w.w); }); if (p.w) ctx.seenWords.push(p.w);
      });
    }
    ctx.fingerprints = {}; M.attempts(function (a) { return a.game === g; }).slice(-500).forEach(function (a) { if (a.fp) ctx.fingerprints[a.fp] = 1; });
    return ctx;
  };
  M.newPuzzle = function (g, level, seed, ctx) {
    var G = PL.games[g];
    ctx = ctx || {};
    for (var t = 0; t < 6; t++) {
      var s = seed + (t ? ':' + t : '');
      var p = G.generate(level, PL.rng(s), ctx);
      var fp = PL.hash(JSON.stringify(p)).toString(36);
      if (ctx.fingerprints && ctx.fingerprints[fp]) continue;
      return { puzzle: p, seed: s, fp: fp };
    }
    var p2 = G.generate(level, PL.rng(seed + ':x'), ctx);
    return { puzzle: p2, seed: seed + ':x', fp: PL.hash(JSON.stringify(p2)).toString(36) };
  };

  /* ---- daily quiz ---- */
  var LEVEL = { Easy: 2, Medium: 5, Hard: 8 };
  M.DAILY_LEVEL = LEVEL;
  M.dailyDifficulty = function (date) {
    var cycle = ['Easy', 'Medium', 'Hard', 'Easy', 'Medium', 'Hard', 'Mixed'];
    var n = PL.dayNumber(date);
    return cycle[((n % 7) + 7) % 7];
  };
  M.migrateDay = function (d) { // days created before v2 have nine games scored out of 900
    if (d && !d.games) { d.games = PL.OLD_DAILY_ORDER.slice(); d.max = 900; }
    if (d && !d.max) d.max = d.games.length * 100;
    return d;
  };
  M.daily = function (date) { return M.migrateDay(S().get('day:' + date)); };
  /* Daily order: each new day gets its own shuffled order (seeded by the date, stored on the day, so it never changes
     while the day lasts). Days created before this have no order and keep the fixed order they were shown in. */
  M.dayOrder = function (d) { var o = (d.order || []).filter(function (g) { return d.games.indexOf(g) >= 0; }); return o.length === d.games.length ? o : d.games.slice(); };
  M.dayStarted = function (d) { return d.games.some(function (g) { var pr = d.prog[g]; return pr && (pr.gs || pr.done || pr.activeMs); }); };
  M.nextDailyGame = function (d, after) { // the next unfinished game in the day's order after `after`, wrapping round; null when all are done
    var o = M.dayOrder(d), i = o.indexOf(after);
    for (var k = 1; k <= o.length; k++) { var g = o[(i + k + o.length) % o.length]; if (g !== after && d.prog[g] && !d.prog[g].done) return g; }
    return null;
  };
  function dailyPuzzle(date, g, level) {
    var seed = 'daily:' + date + ':' + g, p = null;
    for (var t = 0; t < 4 && !p; t++) { try { p = PL.games[g].generate(level, PL.rng(seed + (t ? ':' + t : '')), { daily: true }); if (t) seed += ':' + t; } catch (e) { p = null; } }
    return p ? { puzzle: p, seed: seed } : null;
  }
  /* A day created earlier today that nobody has started yet is brought up to the current format (shuffled order,
     five-word Password). A day that has been started is never changed: same puzzles, same order. */
  M.upgradeDay = function (d) {
    if (!d) return d;
    // today's quiz was marked finished after nine puzzles by an old check, even with games left: reopen it (scores kept)
    if (d.complete && d.date === PL.dateKey() && d.games.some(function (g) { return d.prog[g] && !d.prog[g].done; })) { d.complete = false; delete d.total; delete d.completedAt; d.reopened = Date.now(); M.saveDaily(d); }
    if (d.fmt >= 2 || d.complete) return d;
    if (M.dayStarted(d)) { d.fmt = 1; M.saveDaily(d); return d; }
    d.order = PL.rng('daily-order:' + d.date).shuffle(d.games.slice());
    if (d.puzzles.password && (d.puzzles.password.puzzle.n || 1) < 5) { var np = dailyPuzzle(d.date, 'password', d.levels.password); if (np) d.puzzles.password = np; }
    d.fmt = 2; M.saveDaily(d);
    return d;
  };
  M.saveDaily = function (d) { S().put('day:' + d.date, d); };
  M.ensureDaily = function (date) {
    var d = M.daily(date);
    if (d) return date === PL.dateKey() ? M.upgradeDay(d) : d;
    var diff = M.dailyDifficulty(date), levels = {}, puzzles = {}, prog = {};
    var rng = PL.rng('daily-mix:' + date);
    var games = PL.order.slice(), skipped = [];
    games.forEach(function (g) {
      levels[g] = diff === 'Mixed' ? rng.pick([2, 5, 8]) : LEVEL[diff];
      var dp = dailyPuzzle(date, g, levels[g]);
      if (!dp) { skipped.push(g); return; } // a game whose daily puzzle cannot be built is left out of that day (max adjusts)
      puzzles[g] = dp;
      prog[g] = { gs: null, activeMs: 0, hints: 0, wrong: 0, done: false };
    });
    games = games.filter(function (g) { return skipped.indexOf(g) < 0; });
    d = { date: date, diff: diff, games: games, order: PL.rng('daily-order:' + date).shuffle(games.slice()), fmt: 2, max: games.length * 100, levels: levels, puzzles: puzzles, prog: prog, created: Date.now(), complete: false, v: GEN_VERSION };
    M.saveDaily(d);
    return d;
  };
  /* Daily scoring (documented in the app):
     score = round(0.8 × Q + 0.2 × T), where Q is the game's solution quality (0–100) and
     T = (solved ? 100 × clamp((4B − t) / 3B, 0, 1) : 0) × Q / 100, with t the active seconds and B the benchmark
     seconds for that game and level (full time credit at or under B, none at 4B or beyond). Scaling T by Q means
     fast but sloppy answers earn little time credit, and unsolved puzzles earn none. */
  M.dailyScore = function (g, level, quality, solved, activeMs, p) {
    var B = PL.games[g].benchmark(level, true, p), t = activeMs / 1000;
    var T = solved ? 100 * PL.clamp((4 * B - t) / (3 * B), 0, 1) : 0;
    T = T * quality / 100;
    return { score: Math.round(0.8 * quality + 0.2 * T), time: Math.round(T), quality: Math.round(quality), bench: B };
  };
  M.dailyTotals = function (d) {
    var tot = 0, ms = 0, hints = 0, wrong = 0, done = 0;
    M.migrateDay(d);
    d.games.forEach(function (g) { var pr = d.prog[g]; if (!pr) return; if (pr.done) { tot += pr.score || 0; done++; } ms += pr.activeMs || 0; hints += pr.hints || 0; wrong += pr.wrong || 0; });
    return { score: tot, ms: ms, hints: hints, wrong: wrong, done: done, n: d.games.length, max: d.max, pct: d.max ? 100 * tot / d.max : 0 };
  };
  M.dailies = function () { return S().keys('day:').map(function (k) { return M.migrateDay(S().get(k)); }).filter(Boolean).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); };
  M.dayPct = function (d) { return d.max ? 100 * (d.total != null ? d.total : M.dailyTotals(d).score) / d.max : 0; };

  /* ---- fresh start ----
     Clears statistics, difficulty levels, daily results and in-progress puzzles, then rebuilds today's daily quiz
     with the current game list. Nothing is destroyed: the cleared records are kept under 'arc:<time>' (included in
     exports, ignored by statistics) so M.undoFreshStart can put them back. Settings are kept. */
  var CLEARED = ['att:', 'day:', 'act:'];
  M.freshStart = function (today) {
    var c = M.core(), arc = { at: Date.now(), ratings: PL.deep(c.ratings), recent: (c.shuffle.recent || []).slice(), data: {} };
    CLEARED.forEach(function (pre) { S().keys(pre).forEach(function (k) { arc.data[k] = S().get(k); }); });
    var n = Object.keys(arc.data).filter(function (k) { return k.indexOf('att:') === 0; }).length;
    S().put('arc:' + arc.at, arc);
    Object.keys(arc.data).forEach(function (k) { S().del(k); });
    c.ratings = defaultCore().ratings; c.shuffle.recent = []; c.freshAt = arc.at; M.saveCore(c);
    M.ensureDaily(today || PL.dateKey());
    return { attempts: n, archive: 'arc:' + arc.at };
  };
  M.lastArchive = function () { var ks = S().keys('arc:').sort(); return ks.length ? S().get(ks[ks.length - 1]) : null; };
  M.undoFreshStart = function () { // puts the archived records back; anything played since the reset is kept too
    var ks = S().keys('arc:').sort(); if (!ks.length) return null;
    var arc = S().get(ks[ks.length - 1]), c = M.core(), back = 0;
    Object.keys(arc.data).forEach(function (k) {
      if (k.indexOf('att:') === 0) { S().put(k, arc.data[k]); back++; }
      else if (!S().get(k)) S().put(k, arc.data[k]); // a daily or active puzzle started after the reset wins
    });
    c.ratings = PL.migrate({ schema: PL.SCHEMA, ratings: arc.ratings }).ratings; c.shuffle.recent = arc.recent || []; delete c.freshAt; M.saveCore(c);
    S().del(ks[ks.length - 1]);
    M.upgradeRecords();
    return { attempts: back };
  };

  /* ---- scratchpad ---- */
  M.scratch = function (key) { return S().get('scr:' + key) || { draw: [], text: '', grid: null }; };
  M.saveScratch = function (key, v) { S().put('scr:' + key, v); };
  M.pruneScratch = function () { // keep scratch for the newest 300 keys
    var ks = S().keys('scr:'); if (ks.length <= 300) return;
    ks.map(function (k) { return { k: k, u: (S().get(k) || {}).u || 0 }; }).sort(function (a, b) { return a.u - b.u; }).slice(0, ks.length - 300).forEach(function (x) { S().del(x.k); });
  };

  /* ---- export / import ---- */
  M.exportData = function () {
    var raw = S().raw(), out = { app: 'puzzle-lab', schema: PL.SCHEMA, exportedAt: new Date().toISOString(), data: {} };
    Object.keys(raw).forEach(function (k) { out.data[k] = raw[k]; });
    return out;
  };
  M.validateImport = function (obj) {
    if (!obj || obj.app !== 'puzzle-lab' || !obj.data || typeof obj.data !== 'object') return 'This is not a Puzzle Lab export.';
    if (obj.schema > PL.SCHEMA) return 'This export comes from a newer version of Puzzle Lab.';
    return null;
  };
  M.importData = function (obj, mode) {
    var data = PL.deep(obj.data), counts = { attempts: 0, days: 0 };
    if (data.core) data.core = PL.migrate(data.core);
    Object.keys(data).forEach(function (k) {
      if (k.indexOf('day:') === 0) { M.migrateDay(data[k]); counts.days++; }
      if (k.indexOf('att:') === 0) counts.attempts++;
      // in-progress puzzles of retired games cannot be resumed
      if (k.indexOf('act:') === 0 && PL.order.indexOf(k.slice(4)) < 0) delete data[k];
    });
    if (mode === 'replace') { S().replaceAll(data); M.upgradeRecords(); return counts; }
    var hadAttempts = S().keys('att:').length > 0;
    Object.keys(data).forEach(function (k) {
      if (k === 'core') return;
      var cur = S().get(k), inc = data[k];
      if (!cur || ((inc && inc.u) || 0) > ((cur && cur.u) || 0)) S().put(k, inc);
    });
    if (data.core) {
      var c = M.core();
      if (!hadAttempts) { c.ratings = data.core.ratings; c.shuffle = data.core.shuffle || c.shuffle; }
      else Object.keys(data.core.ratings).forEach(function (g) {
        var a = c.ratings[g], b = data.core.ratings[g];
        var ta = a && a.changes.length ? a.changes[a.changes.length - 1].t : 0, tb = b.changes.length ? b.changes[b.changes.length - 1].t : 0;
        if (!a || tb > ta) c.ratings[g] = b;
      });
      M.saveCore(c);
    }
    M.upgradeRecords();
    return counts;
  };
})();

;
/* ===== Universal scratchpad: draw / text / grid ===== */
(function () {
  var h = PL.h;
  var openState = null;
  /* The scratchpad renders into the docked tool panel (see dock.js); the puzzle stays visible above it. */
  PL.scratch = {
    isOpen: function () { return !!openState; },
    open: function (key) { PL.dock.open('scratch', key); },
    close: function () { PL.dock.close(); },
    mount: function (container, key) {
      if (openState) PL.scratch.unmount();
      var data = PL.model.scratch(key);
      openState = { key: key, data: data, tab: data.lastTab || 'draw', tool: 'pen', redo: [], el: container };
      render();
    },
    unmount: function () { if (!openState) return; save(true); openState = null; },
    refresh: function () { if (openState && openState.tab === 'draw') render(); }
  };
  var saveT = null;
  function save(now) {
    if (!openState) return;
    var st = openState;
    st.data.lastTab = st.tab;
    clearTimeout(saveT);
    var doIt = function () { PL.model.saveScratch(st.key, st.data); };
    if (now) doIt(); else saveT = setTimeout(doIt, 600);
  }
  function render() {
    var st = openState, el = st.el;
    el.innerHTML = '';
    var tabs = h('div', { class: 'seg sheet-tabs' }, [['draw', 'Draw'], ['text', 'Text'], ['grid', 'Grid']].map(function (t) {
      return h('button', { class: 'segb' + (st.tab === t[0] ? ' on' : ''), onclick: function () { st.tab = t[0]; save(); render(); } }, t[1]);
    }));
    el.appendChild(h('div', { class: 'dock-subbar' }, tabs));
    var body = h('div', { class: 'sheet-body' });
    el.appendChild(body);
    if (st.tab === 'draw') drawTab(body, st);
    else if (st.tab === 'text') textTab(body, st);
    else gridTab(body, st);

  }
  function textTab(body, st) {
    var ta = h('textarea', { id: 'scr-text', class: 'txt area scr-text', placeholder: 'Notes, calculations, hypotheses…', spellcheck: 'false' }, st.data.text || '');
    ta.addEventListener('input', function () { st.data.text = ta.value; save(); });
    body.appendChild(ta);
    body.appendChild(h('div', { class: 'row-actions' }, h('button', { class: 'btn ghost sm', onclick: function () { if (confirmInline(this)) { st.data.text = ''; save(); render(); } } }, 'Clear text')));
  }
  function confirmInline(btn) {
    if (btn.dataset.armed) return true;
    btn.dataset.armed = '1'; var t = btn.textContent; btn.textContent = 'Tap again to confirm';
    setTimeout(function () { if (btn.isConnected) { btn.textContent = t; delete btn.dataset.armed; } }, 2500);
    return false;
  }
  function gridTab(body, st) {
    if (!st.data.grid) st.data.grid = { r: 4, c: 4, cells: {}, heads: {} };
    var g = st.data.grid;
    var sizeSel = function (k, lab) {
      return h('label', { class: 'small' }, lab + ' ', h('select', { class: 'sel', onchange: function () { g[k] = +this.value; save(); render(); } }, [2, 3, 4, 5, 6, 7].map(function (n) { var o = h('option', { value: n }, String(n)); if (g[k] === n) o.selected = true; return o; })));
    };
    body.appendChild(h('div', { class: 'row-actions' }, sizeSel('r', 'Rows'), sizeSel('c', 'Columns'),
      h('button', { class: 'btn ghost sm', onclick: function () { if (confirmInline(this)) { g.cells = {}; save(); render(); } } }, 'Clear marks')));
    var tbl = h('table', { class: 'gtable scr-grid' });
    var head = h('tr', null, h('th', null, ''));
    for (var c = 0; c < g.c; c++) (function (c) {
      var inp = h('input', { class: 'hin', value: g.heads['c' + c] || '', placeholder: String.fromCharCode(65 + c), 'aria-label': 'Column ' + (c + 1) + ' label' });
      inp.addEventListener('input', function () { g.heads['c' + c] = inp.value; save(); });
      head.appendChild(h('th', null, inp));
    })(c);
    tbl.appendChild(head);
    for (var r = 0; r < g.r; r++) (function (r) {
      var inp = h('input', { class: 'hin', value: g.heads['r' + r] || '', placeholder: String(r + 1), 'aria-label': 'Row ' + (r + 1) + ' label' });
      inp.addEventListener('input', function () { g.heads['r' + r] = inp.value; save(); });
      var tr = h('tr', null, h('th', null, inp));
      for (var c2 = 0; c2 < g.c; c2++) (function (c2) {
        var k = r + ',' + c2, v = g.cells[k] || 0;
        tr.appendChild(h('td', { class: 'gcell' + (v === 2 ? ' yes' : v === 1 ? ' no' : ''), onclick: function () { g.cells[k] = ((g.cells[k] || 0) + 1) % 3; save(); render(); } }, v === 2 ? '●' : v === 1 ? '×' : ''));
      })(c2);
      tbl.appendChild(tr);
    })(r);
    body.appendChild(h('div', { class: 'scrollx' }, tbl));
    body.appendChild(h('div', { class: 'muted small' }, 'Type labels in the headers. Tap a cell: blank → × → ●.'));
  }
  function drawTab(body, st) {
    var wrap = h('div', { class: 'canvas-wrap' });
    var cv = h('canvas', { class: 'scr-canvas', 'aria-label': 'Drawing area' });
    wrap.appendChild(cv);
    var tools = h('div', { class: 'row-actions scr-tools' },
      h('div', { class: 'seg' }, [['pen', 'Pen'], ['arrow', 'Arrow'], ['erase', 'Eraser']].map(function (t) {
        return h('button', { class: 'segb' + (st.tool === t[0] ? ' on' : ''), onclick: function () { st.tool = t[0]; render(); } }, t[1]);
      })),
      h('button', { class: 'btn ghost sm', disabled: !st.data.draw.length, onclick: function () { st.redo.push(st.data.draw.pop()); save(); render(); } }, 'Undo'),
      h('button', { class: 'btn ghost sm', disabled: !st.redo.length, onclick: function () { st.data.draw.push(st.redo.pop()); save(); render(); } }, 'Redo'),
      h('button', { class: 'btn ghost sm', disabled: !st.data.draw.length, onclick: function () { if (confirmInline(this)) { st.redo = []; st.data.draw = []; save(); render(); } } }, 'Clear'));
    body.appendChild(tools); body.appendChild(wrap);
    requestAnimationFrame(function () { setupCanvas(cv, wrap, st); });
  }
  function ink() { return getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#222'; }
  function setupCanvas(cv, wrap, st) {
    var dpr = window.devicePixelRatio || 1;
    var W = wrap.clientWidth, H = wrap.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    // strokes stored in normalised coordinates of a 1000-wide virtual canvas so they survive size changes
    var scale = W / 1000;
    function drawStroke(s) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (s.t === 'erase') { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 22 * scale + 6; }
      else { ctx.strokeStyle = ink(); ctx.lineWidth = 2.4; }
      var pts = s.p;
      if (s.t === 'arrow') {
        var x1 = pts[0] * scale, y1 = pts[1] * scale, x2 = pts[2] * scale, y2 = pts[3] * scale;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        var a = Math.atan2(y2 - y1, x2 - x1), L = 12;
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45));
        ctx.moveTo(x2, y2); ctx.lineTo(x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(pts[0] * scale, pts[1] * scale);
        for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] * scale, pts[i + 1] * scale);
        if (pts.length === 2) ctx.lineTo(pts[0] * scale + 0.1, pts[1] * scale + 0.1);
        ctx.stroke();
      }
      ctx.restore();
    }
    function redraw() { ctx.clearRect(0, 0, W, H); st.data.draw.forEach(drawStroke); }
    redraw();
    var cur = null;
    function pt(e) { var r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / scale * 10) / 10, Math.round((e.clientY - r.top) / scale * 10) / 10]; }
    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { }
      var p = pt(e);
      cur = { t: st.tool === 'erase' ? 'erase' : st.tool === 'arrow' ? 'arrow' : 'pen', p: st.tool === 'arrow' ? [p[0], p[1], p[0], p[1]] : [p[0], p[1]] };
    });
    cv.addEventListener('pointermove', function (e) {
      if (!cur) return; e.preventDefault();
      var p = pt(e);
      if (cur.t === 'arrow') { cur.p[2] = p[0]; cur.p[3] = p[1]; redraw(); drawStroke(cur); return; }
      var n = cur.p.length; if (Math.hypot(p[0] - cur.p[n - 2], p[1] - cur.p[n - 1]) < 2.5) return;
      cur.p.push(p[0], p[1]);
      ctx.save(); redrawPartial(cur); ctx.restore();
    });
    function redrawPartial(s) { // draw only the last segment for responsiveness
      var n = s.p.length; if (n < 4) return;
      var seg = { t: s.t, p: [s.p[n - 4], s.p[n - 3], s.p[n - 2], s.p[n - 1]] }; drawStroke(seg);
    }
    function end() {
      if (!cur) return;
      if (cur.t !== 'arrow' || Math.hypot(cur.p[2] - cur.p[0], cur.p[3] - cur.p[1]) > 4) { st.data.draw.push(cur); st.redo = []; }
      cur = null; redraw(); save();
      var tools = openState && openState.el.querySelector('.scr-tools');
      if (tools) { var b = tools.querySelectorAll('button'); b[3].disabled = !st.data.draw.length; b[5].disabled = !st.data.draw.length; }
    }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
})();

;
/* ===== Calculator: safe expression parser (no eval) with exact fractions ===== */
(function () {
  var h = PL.h;
  /* Grammar: expr := term (('+'|'-') term)* ; term := power (('*'|'/'|implicit) power)* ;
     power := unary ('^' power)? ; unary := '-' unary | power ; power := postfix ('^' unary)? ; primary := number | '(' expr ')' | 'sqrt' primary | primary '%'
     Values are {q: rational | null, f: float}; rationals stay exact until a non-rational operation. */
  function V(q, f) { return { q: q, f: q ? PL.qval(q) : f }; }
  function fromNum(str) { var q = PL.parseNum(str); return q ? V(q) : V(null, parseFloat(str)); }
  function safeQ(fn, a, b) {
    if (!a.q || (b && !b.q)) return null;
    try { var r = fn(a.q, b && b.q); if (Math.abs(r.n) > 9e15 || r.d > 9e15) return null; return r; } catch (e) { return null; }
  }
  function op(sym, a, b) {
    if (sym === '+') { var q = safeQ(PL.qadd, a, b); return q ? V(q) : V(null, a.f + b.f); }
    if (sym === '-') { var q2 = safeQ(PL.qsub, a, b); return q2 ? V(q2) : V(null, a.f - b.f); }
    if (sym === '*') { var q3 = safeQ(PL.qmul, a, b); return q3 ? V(q3) : V(null, a.f * b.f); }
    if (sym === '/') { if (b.f === 0) throw new Error('Division by zero'); var q4 = safeQ(PL.qdiv, a, b); return q4 ? V(q4) : V(null, a.f / b.f); }
    if (sym === '^') {
      if (a.q && b.q && b.q.d === 1 && Math.abs(b.q.n) <= 64) {
        var r = PL.Q(1), base = b.q.n < 0 ? PL.qdiv(PL.Q(1), a.q) : a.q, ok = true;
        for (var i = 0; i < Math.abs(b.q.n); i++) { r = PL.qmul(r, base); if (Math.abs(r.n) > 9e15 || r.d > 9e15) { ok = false; break; } }
        if (ok) return V(r);
      }
      var f = Math.pow(a.f, b.f); if (isNaN(f)) throw new Error('Not a real number'); return V(null, f);
    }
    throw new Error('Unknown operator');
  }
  function tokenize(s) {
    s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/√/g, 'sqrt').replace(/\s+/g, '');
    var out = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/[0-9.]/.test(c)) { var j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; var num = s.slice(i, j); if ((num.match(/\./g) || []).length > 1) throw new Error('Bad number'); out.push({ t: 'n', v: num }); i = j; continue; }
      if (s.substr(i, 4) === 'sqrt') { out.push({ t: 'f', v: 'sqrt' }); i += 4; continue; }
      if ('+-*/^()%'.indexOf(c) >= 0) { out.push({ t: c }); i++; continue; }
      throw new Error('Unexpected “' + c + '”');
    }
    return out;
  }
  function parse(src) {
    var tk = tokenize(src), pos = 0;
    function peek() { return tk[pos]; }
    function eat(t) { if (!tk[pos] || tk[pos].t !== t) throw new Error('Expected ' + t); pos++; }
    function expr() { var v = term(); while (peek() && (peek().t === '+' || peek().t === '-')) { var o = tk[pos++].t; v = op(o, v, term()); } return v; }
    function startsPrimary(t) { return t && (t.t === 'n' || t.t === '(' || t.t === 'f'); }
    function term() {
      var v = unary();
      while (peek() && (peek().t === '*' || peek().t === '/' || startsPrimary(peek()))) {
        var o = (peek().t === '*' || peek().t === '/') ? tk[pos++].t : '*';
        v = op(o, v, unary());
      }
      return v;
    }
    function power() { var b = postfix(primary()); if (peek() && peek().t === '^') { pos++; return op('^', b, unary()); } return b; }
    function unary() { if (peek() && peek().t === '-') { pos++; var v = unary(); return op('*', V(PL.Q(-1)), v); } if (peek() && peek().t === '+') { pos++; return unary(); } return power(); }
    function postfix(v) { while (peek() && peek().t === '%') { pos++; v = op('/', v, V(PL.Q(100))); } return v; }
    function primary() {
      var t = peek(); if (!t) throw new Error('Incomplete expression');
      if (t.t === 'n') { pos++; return fromNum(t.v); }
      if (t.t === '(') { pos++; var v = expr(); eat(')'); return v; }
      if (t.t === 'f') { pos++; var a = primary(); if (a.f < 0) throw new Error('Not a real number'); var r = Math.sqrt(a.f), ri = Math.round(r); if (a.q && a.q.d === 1 && ri * ri === a.q.n) return V(PL.Q(ri)); if (a.q) { var rn = Math.round(Math.sqrt(a.q.n)), rd = Math.round(Math.sqrt(a.q.d)); if (rn * rn === a.q.n && rd * rd === a.q.d) return V(PL.Q(rn, rd)); } return V(null, r); }
      throw new Error('Unexpected “' + t.t + '”');
    }
    var res = expr();
    if (pos !== tk.length) throw new Error('Unexpected “' + tk[pos].t + '”');
    return res;
  }
  function fmt(v) {
    if (v.q) {
      if (v.q.d === 1) return String(v.q.n);
      var dd = v.q.d; while (dd % 2 === 0) dd /= 2; while (dd % 5 === 0) dd /= 5;
      var dec = v.q.n / v.q.d;
      if (dd === 1 && String(dec).length <= 12) return String(dec); // terminating decimal: show it exactly (7.5)
      return PL.qstr(v.q) + ' ≈ ' + (Math.round(dec * 1e8) / 1e8);
    }
    if (!isFinite(v.f)) return 'Error';
    return String(Math.round(v.f * 1e10) / 1e10);
  }
  PL.calc = { evaluate: function (s) { return fmt(parse(s)); }, parse: parse };

  /* ---- calculator state machine ----
     A freshly typed expression is evaluated with normal precedence (5 + 5 ÷ 2 = 7.5).
     After "=", the result becomes the accumulator: an operator key continues from it (5 + 5 = then ÷ 2 = gives 5),
     while a digit, decimal point, "(" or "√" starts a new expression. */
  function resultToken(r) { // exact value as an expression fragment; fractions and negatives are bracketed
    var v = r.split(' ≈')[0];
    return /^-?\d+$/.test(v) && v[0] !== '-' ? v : '(' + v + ')';
  }
  var OPS = { '+': 1, '−': 1, '×': 1, '÷': 1, '^': 1, '/': 1 };
  function newState() { return { expr: '', result: '', acc: null, justEval: false, err: false }; }
  function press(st, k) {
    if (k === 'AC') { st.expr = ''; st.result = ''; st.acc = null; st.justEval = false; return; }
    if (k === 'CE') { // clear the current entry: the trailing number (or the whole pending result)
      if (st.justEval) { st.expr = ''; st.result = ''; st.justEval = false; return; }
      var m = st.expr.match(/(\d*\.?\d*)$/); st.expr = st.expr.slice(0, st.expr.length - (m && m[1] ? m[1].length : 1)); return;
    }
    if (k === '⌫') { if (st.justEval) { st.justEval = false; st.result = ''; return; } st.expr = st.expr.slice(0, -1); return; }
    if (k === '=') {
      if (!st.expr) return;
      try { var r = PL.calc.evaluate(st.expr); st.result = r; st.acc = r; st.justEval = true; st.err = false; st.lastExpr = st.expr; return r; }
      catch (e) { st.result = e.message; st.err = true; st.justEval = false; return null; }
    }
    if (k === '±') { // negate the number being typed (or the last answer); a leading minus is unary, so 5 − ± 3 = 8
      if (st.justEval) { st.justEval = false; st.result = ''; st.expr = st.acc != null ? resultToken(st.acc) : ''; }
      var mm = st.expr.match(/(\d+\.?\d*|\.\d+|\([^()]*\))$/), body = mm ? st.expr.slice(0, st.expr.length - mm[1].length) : st.expr, tail = mm ? mm[1] : '';
      var unary = /−$/.test(body) && (body.length === 1 || /[+−×÷^(\/]$/.test(body.slice(0, -1)));
      st.expr = unary ? body.slice(0, -1) + tail : body + '−' + tail; return;
    }
    if (k === '()') { // one bracket key: closes an open bracket after a number or ")", otherwise opens one
      if (st.justEval) { st.justEval = false; st.result = ''; st.expr = ''; }
      var open = (st.expr.match(/\(/g) || []).length - (st.expr.match(/\)/g) || []).length;
      st.expr += open > 0 && /[\d.)%]$/.test(st.expr) ? ')' : '('; return;
    }
    if (k === 'ans') { if (st.acc == null) return; if (st.justEval) { st.expr = ''; st.justEval = false; } st.expr += resultToken(st.acc); return; }
    if (st.justEval) {
      st.justEval = false;
      if (OPS[k]) st.expr = resultToken(st.acc); // continue from the result
      else st.expr = '';                          // start fresh
      st.result = '';
    }
    st.expr += k;
  }
  PL.calc.newState = newState; PL.calc.press = press;
  /* convenience for tests: run a sequence of keys and return the last displayed result */
  PL.calc.run = function (keys) { var st = newState(); keys.forEach(function (k) { press(st, k); }); return st; };

  /* ---- calculator UI (rendered inside the docked tool panel) ---- */
  var cs = null;
  PL.calcSheet = {
    isOpen: function () { return !!cs; },
    open: function (key) { PL.dock.open('calc', key); },
    close: function () { PL.dock.close(); },
    mount: function (container, key) {
      var saved = PL.model.scratch(key);
      cs = { key: key, el: container, st: Object.assign(newState(), saved.calcState || {}), hist: (saved.calc || []).slice(-12) };
      render();
    },
    unmount: function () { if (cs) persist(); cs = null; }
  };
  function persist() { var d = PL.model.scratch(cs.key); d.calc = cs.hist.slice(-20); d.calcState = { expr: cs.st.expr, result: cs.st.result, acc: cs.st.acc, justEval: cs.st.justEval }; PL.model.saveScratch(cs.key, d); }
  function render() {
    var c = cs, st = c.st; c.el.innerHTML = '';
    var shown = st.justEval ? (st.lastExpr || '') : st.expr;
    var disp = h('div', { class: 'calc-disp' },
      h('div', { class: 'calc-expr mono' + (st.justEval ? ' dim' : '') }, shown || '0'),
      h('div', { class: 'calc-res mono' + (st.err ? ' err' : '') }, st.result ? (st.err ? st.result : '= ' + st.result) : (st.acc != null ? 'Ans = ' + st.acc : '')));
    /* Familiar layout: digits in the usual 7-8-9 / 4-5-6 / 1-2-3 / 0 grid, the four operators in one column on the
       right, clear / delete / sign / brackets on top. Less common keys sit in the "More" row. */
    var keys = ['AC', '⌫', '±', '()', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+'];
    var more = ['(', ')', 'CE', '√', '^', '/', 'ans', '%'];
    var labels = { '/': 'a/b', 'ans': 'Ans', '()': '( )', '^': 'xʸ', '±': '+/−' };
    var names = { '/': 'fraction bar', 'CE': 'clear entry', 'AC': 'clear all', '⌫': 'delete', '±': 'change sign', '()': 'bracket', '^': 'power', '√': 'square root', 'ans': 'previous answer', '÷': 'divide', '×': 'multiply', '−': 'minus', '+': 'plus', '=': 'equals', '%': 'percent' };
    function key(k) {
      return h('button', { class: 'ckey' + (k === '=' ? ' eq' : OPS[k] ? ' op' : /^(AC|CE|⌫|±|\(\)|\(|\))$/.test(k) ? ' fn' : /^[0-9.]$/.test(k) ? ' num' : ' adv'), 'data-k': k, 'aria-label': names[k] || k, onclick: function () {
        var r = press(st, k);
        if (k === '=' && r != null) { c.hist.push({ e: st.lastExpr, r: r }); }
        persist(); render();
      } }, labels[k] || k);
    }
    var pad = h('div', { class: 'calc-pad' }, keys.map(key));
    var moreEl = h('details', { class: 'calc-more' }, h('summary', { class: 'small' }, 'More keys'), h('div', { class: 'calc-pad more' }, more.map(key)));
    if (c.moreOpen) moreEl.open = true;
    moreEl.addEventListener('toggle', function () { c.moreOpen = moreEl.open; });
    c.el.appendChild(h('div', { class: 'sheet-body calc-body' }, disp, pad, moreEl,
      c.hist.length ? h('div', { class: 'calc-hist' }, c.hist.slice().reverse().map(function (x) { return h('button', { class: 'linkbtn mono small', onclick: function () { st.expr = x.e; st.justEval = false; st.result = ''; persist(); render(); } }, x.e + ' = ' + x.r); })) : null,
      h('div', { class: 'muted small' }, 'After =, an operator continues from the answer; a number starts fresh. +/− changes the sign of the number you are typing; ( ) opens or closes a bracket. Using the calculator never affects your score.')));
  }
})();

;
/* ===== Docked tool panel =====
   The scratchpad and calculator open in a panel docked to the bottom of the screen. The puzzle stays visible and
   usable above it: the page gets bottom padding equal to the panel height, so the question scrolls independently.
   The panel can be resized (compact / half / tall), switches between tools without closing, and follows the iPhone
   keyboard via visualViewport so typed notes are never covered. */
(function () {
  var h = PL.h;
  var D = null;
  var SIZES = { compact: 0.34, half: 0.5, tall: 0.7 };
  function vv() { return window.visualViewport; }
  function layout() {
    if (!D) return;
    var vh = window.innerHeight, kb = 0;
    if (vv()) kb = Math.max(0, vh - vv().height - vv().offsetTop);
    var avail = vh - kb;
    var hgt = Math.round(Math.min(avail - 120, Math.max(220, vh * SIZES[D.size])));
    if (kb > 0) hgt = Math.min(hgt, Math.max(180, avail - 140)); // keep some of the question visible above the keyboard
    D.el.style.height = hgt + 'px';
    D.el.style.bottom = kb + 'px';
    document.documentElement.style.setProperty('--dock-h', (hgt + kb) + 'px');
  }
  function mountTool() {
    if (D.mounted === 'scratch') PL.scratch.unmount();
    if (D.mounted === 'calc') PL.calcSheet.unmount();
    D.body.innerHTML = '';
    if (D.tool === 'scratch') PL.scratch.mount(D.body, D.key);
    else PL.calcSheet.mount(D.body, D.key);
    D.mounted = D.tool;
  }
  function renderHead() {
    D.head.innerHTML = '';
    var tabs = h('div', { class: 'seg' }, [['scratch', 'Scratchpad'], ['calc', 'Calculator']].filter(function (t) { return t[0] !== 'calc' || D.math; }).map(function (t) {
      return h('button', { class: 'segb' + (D.tool === t[0] ? ' on' : ''), onclick: function () { if (D.tool === t[0]) return; D.tool = t[0]; renderHead(); mountTool(); } }, t[1]);
    }));
    var next = D.size === 'compact' ? 'half' : D.size === 'half' ? 'tall' : 'compact';
    D.head.appendChild(h('div', { class: 'dock-bar' },
      h('div', { class: 'dock-grab', role: 'button', 'aria-label': 'Resize panel', onclick: function () { D.size = next; save(); layout(); renderHead(); if (D.tool === 'scratch') PL.scratch.refresh(); } }),
      tabs,
      h('button', { class: 'btn ghost sm', 'aria-label': D.size === 'tall' ? 'Make panel smaller' : 'Make panel larger', onclick: function () { D.size = next; save(); layout(); renderHead(); if (D.tool === 'scratch') PL.scratch.refresh(); } }, D.size === 'tall' ? 'Smaller' : 'Larger'),
      h('button', { class: 'btn ghost sm', onclick: PL.dock.close }, 'Close')));
  }
  function save() { try { localStorage.setItem('puzzlelab.dock', D.size); } catch (e) { } }
  function savedSize() { try { return localStorage.getItem('puzzlelab.dock') || 'half'; } catch (e) { return 'half'; } }
  PL.dock = {
    isOpen: function () { return !!D; },
    open: function (tool, key, opts) {
      if (D && D.key === key) { if (D.tool !== tool) { D.tool = tool; renderHead(); mountTool(); } return; }
      if (D) PL.dock.close();
      D = { tool: tool, key: key, math: !!(opts && opts.math), size: SIZES[savedSize()] ? savedSize() : 'half' };
      if (tool === 'calc') D.math = true;
      D.head = h('div', { class: 'dock-head' });
      D.body = h('div', { class: 'dock-body' });
      D.el = h('section', { class: 'dock', role: 'region', 'aria-label': 'Tools' }, D.head, D.body);
      document.body.appendChild(D.el);
      document.body.classList.add('dock-open');
      renderHead(); layout(); mountTool();
      // bring the question into view above the panel
      var target = document.querySelector('.play .gamebody') || document.querySelector('.play');
      if (target) { var top = target.getBoundingClientRect().top + window.scrollY - 70; if (window.scrollY > top) window.scrollTo(0, Math.max(0, top)); }
    },
    setMath: function (m) { if (D) { D.math = !!m; renderHead(); } },
    close: function () {
      if (!D) return;
      if (D.mounted === 'scratch') PL.scratch.unmount();
      if (D.mounted === 'calc') PL.calcSheet.unmount();
      D.el.remove(); D = null;
      document.body.classList.remove('dock-open');
      document.documentElement.style.setProperty('--dock-h', '0px');
    }
  };
  if (window.visualViewport) { vv().addEventListener('resize', layout); vv().addEventListener('scroll', layout); }
  window.addEventListener && window.addEventListener('resize', layout);
})();

;
/* ===== Small rewards: haptics, a brief celebration, counting scores, one-shot animations =====
   Everything here is short (under a second), never blocks input, and does nothing visual when the person has asked
   the system for reduced motion. Haptics: navigator.vibrate where it exists; on iPhone (Safari 18+) a hidden switch
   control is toggled, which the system answers with a light tap. Haptics can be turned off in Settings. */
(function () {
  var h = PL.h;
  function reduced() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function hapticsOn() { try { return !PL.model || PL.model.settings().haptics !== false; } catch (e) { return true; } }
  var sw = null;
  function haptic(kind) {
    if (!hapticsOn()) return;
    try {
      if (navigator.vibrate) { navigator.vibrate(kind === 'success' ? [12, 60, 18] : kind === 'error' ? [30] : 8); return; }
      if (!sw) {
        sw = h('label', { 'aria-hidden': 'true', style: 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none' }, h('input', { type: 'checkbox', switch: '', tabindex: '-1' }));
        document.body.appendChild(sw);
      }
      sw.click();
      if (kind === 'success') setTimeout(function () { try { sw.click(); } catch (e) { } }, 90);
    } catch (e) { }
  }
  /* A light burst of a few dozen dots from a point (default: top centre of the element). ~0.9 s. */
  function celebrate(el, strength) {
    if (reduced() || !el || !el.getBoundingClientRect) return;
    var b = el.getBoundingClientRect(), n = strength === 'big' ? 34 : 20;
    var layer = h('div', { class: 'fx-layer', 'aria-hidden': 'true' });
    var colors = ['var(--accent)', 'var(--good)', 'var(--marker)', 'var(--g1)', 'var(--g4)', 'var(--g7)'];
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + Math.random() * 0.5, d = 60 + Math.random() * (strength === 'big' ? 120 : 80);
      var dot = h('span', { class: 'fx-dot' + (i % 3 === 0 ? ' sq' : '') });
      dot.style.left = (b.left + b.width / 2) + 'px'; dot.style.top = (b.top + 34) + 'px';
      dot.style.background = colors[i % colors.length];
      dot.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px'); dot.style.setProperty('--dy', Math.round(Math.sin(a) * d * 0.7 - 30) + 'px');
      dot.style.animationDelay = Math.round(Math.random() * 80) + 'ms';
      layer.appendChild(dot);
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 1200);
  }
  /* Count a number up to its value (about half a second); the final value is written immediately for screen readers. */
  function count(el, to) {
    if (!el) return; el.textContent = String(to);
    if (reduced() || !(to > 0)) return;
    el.setAttribute('aria-label', String(to));
    var t0 = null, dur = Math.min(650, 250 + to * 4);
    function step(t) {
      if (t0 == null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  /* Returns true the first time it is asked about `key`, so a re-render doesn't replay an animation. */
  var seen = {};
  function once(key) { if (seen[key]) return false; seen[key] = 1; return true; }
  PL.fx = { haptic: haptic, celebrate: celebrate, count: count, once: once, reduced: reduced, good: function () { haptic('light'); } };
})();

;
/* ===== App shell: navigation, play sessions, timers, summaries, daily quiz, stats, data ===== */
(function () {
  var h = PL.h, M = PL.model;
  var root, screen = { name: 'home' }, cur = null, toastT = null;
  var ICONS = {
    password: 'M4 7h16M4 12h10M4 17h7M17 15l3 3-3 3',
    island: 'M3 18c3-2 6-2 9 0s6 2 9 0M8 15c0-4 2-7 4-7s4 3 4 7M12 8V4l4 2',
    logic: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 17l2 2 4-4',
    bridges: 'M3 17h18M5 17V9m14 8V9M5 9c4 5 10 5 14 0M9 17v-4m6 4v-4',
    algebra: 'M4 7h6M7 4v6M14 7h6M4 17l5-5M4 12l5 5M14 15h6M14 19h6',
    loop: 'M6 6h8v4h4v8H6zM6 6v12',
    detective: 'M10 10m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0M14.5 14.5L20 20',
    shape: 'M4 4h8v8H4zM12 8h8v8h-8zM4 12h8v8H4z',
    balance: 'M12 4v16M5 20h14M4 9h16M4 9l-2 6h6zM20 9l-2 6h6z',
    reverse: 'M20 12H6M10 7l-5 5 5 5M20 5v14',
    links: 'M9 15l6-6M7.5 11.5l-2 2a3.5 3.5 0 0 0 5 5l2-2M16.5 12.5l2-2a3.5 3.5 0 0 0-5-5l-2 2',
    wordcount: 'M3 6h4v4H3zM10 6h4v4h-4zM17 6h4v4h-4zM5 17h2M11 15v4M17 15l2 2-2 2',
    wordgrid: 'M3 4h5v5H3zM9.5 4h5v5h-5zM16 4h5v5h-5zM3 15h5v5H3zM9.5 15h5v5h-5zM16 15h5v5h-5z',
    threads: 'M4 5h4v4H4zM10 5h4v4h-4zM16 5h4v4h-4zM4 15h16v4H4z',
    trails: 'M5 19l4-5 3 3 4-6 3 3M5 5h.01M12 5h.01M19 5h.01',
    wordrush: 'M13 3L5 14h6l-1 7 8-11h-6z',
    catlogic: 'M5 5l3 3h8l3-3v9a7 6 0 0 1-14 0zM9.5 12h.01M14.5 12h.01',
    survey: 'M4 6h12M4 12h9M4 18h6M18 14v6M15 17h6'
  };
  function icon(g, cls) { return PL.svg('svg', { viewBox: '0 0 24 24', class: 'gicon ' + (cls || ''), 'aria-hidden': 'true' }, PL.svg('path', { d: ICONS[g] || ICONS.logic })); }

  /* ---------- toasts ---------- */
  function toast(msg, kind) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast show ' + (kind || '');
    if (kind === 'good' && PL.fx) PL.fx.haptic('light');
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = 'toast'; }, kind === 'bad' ? 2600 : 2200);
  }
  PL.toast = toast;

  /* ---------- navigation ---------- */
  function go(s) {
    leavePlay();
    screen = s; render(); window.scrollTo(0, 0);
  }
  function render() {
    root.innerHTML = '';
    var view;
    if (screen.name === 'home') view = homeView();
    else if (screen.name === 'play') view = playView();
    else if (screen.name === 'daily') view = dailyView();
    else if (screen.name === 'stats') view = statsView();
    else if (screen.name === 'gstats') view = gameStatsView(screen.g);
    else if (screen.name === 'dstats') view = dailyStatsView();
    else if (screen.name === 'history') view = historyView();
    else if (screen.name === 'settings') view = settingsView();
    else if (screen.name === 'shuffle') view = shuffleView();
    else view = homeView();
    root.appendChild(view);
  }
  function topbar(title, back, right) {
    return h('header', { class: 'topbar' },
      back ? h('button', { class: 'iconbtn', 'aria-label': 'Back', onclick: back }, PL.svg('svg', { viewBox: '0 0 24 24', class: 'gicon' }, PL.svg('path', { d: 'M15 5l-7 7 7 7' }))) : h('span', { class: 'iconbtn ph' }),
      h('div', { class: 'tb-title' }, title), right || h('span', { class: 'iconbtn ph' }));
  }

  /* ---------- home ---------- */
  function homeView() {
    var today = PL.dateKey(), d = M.daily(today), diff = M.dailyDifficulty(today);
    var dt = d ? M.dailyTotals(d) : null;
    var st = PL.store.status();
    return h('main', { class: 'page home' },
      h('div', { class: 'brand' }, h('h1', null, 'Puzzle Lab'), h('button', { class: 'iconbtn', 'aria-label': 'Settings and data', onclick: function () { go({ name: 'settings' }); } }, PL.svg('svg', { viewBox: '0 0 24 24', class: 'gicon' }, PL.svg('path', { d: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6' })))),
      h('button', { class: 'daily-card', onclick: function () { go({ name: 'daily' }); } },
        h('div', null, h('div', { class: 'eyebrow' }, 'Daily Mini Quiz · ' + fmtDate(today)), h('div', { class: 'dc-title' }, d && d.complete ? 'Done — ' + dt.score + ' / ' + d.max : d && dt.done ? dt.done + ' of ' + dt.n + ' solved' : PL.order.length + ' puzzles, one from each game'),
          h('div', { class: 'muted small' }, diff + ' day' + (d && d.complete ? ' · ' + PL.fmtTime(dt.ms) : ''))),
        h('div', { class: 'dc-dots', style: { 'grid-template-columns': 'repeat(' + (d ? d.games : PL.order).length + ', 1fr)' } }, (d ? d.games : PL.order).map(function (g) { var pr = d && d.prog[g]; return h('span', { class: 'dc-dot' + (pr && pr.done ? (pr.outcome === 'solved' ? ' ok' : ' bad') : pr && pr.gs ? ' part' : '') }); }))),
      h('div', { class: 'quick' },
        h('button', { class: 'btn', onclick: function () { go({ name: 'shuffle' }); } }, 'Shuffle'),
        h('button', { class: 'btn', onclick: function () { go({ name: 'stats' }); } }, 'Statistics'),
        h('button', { class: 'btn', onclick: function () { go({ name: 'history' }); } }, 'History')),
      freshOffer(),
      M.settings().timed ? h('div', { class: 'notice' }, 'Timed mode is on for new puzzles. Timed results are kept separately. ', h('button', { class: 'linkbtn', onclick: function () { M.setSetting('timed', false); render(); } }, 'Turn off')) : null,
      PL.groups.map(function (grp) {
        return h('section', { class: 'ggroup' }, h('h2', { class: 'ggroup-h' }, grp.name),
          h('ul', { class: 'games tiles2' }, grp.games.map(function (g) {
            var G = PL.games[g], r = M.rating(g), act = M.active(g);
            return h('li', null, h('button', { class: 'gtile g-' + g, onclick: function () { startUnlimited(g); }, 'aria-label': G.name + ', level ' + r.level + (act ? ', in progress' : '') },
              h('div', { class: 'gt-top' }, icon(g), h('span', { class: 'lvl' }, 'Lv ' + r.level)),
              h('div', { class: 'gc-name' }, G.name),
              h('div', { class: 'gt-blurb' }, act ? h('span', { class: 'resume' }, 'Resume') : G.blurb)));
          })));
      }),
      h('footer', { class: 'foot muted small' }, syncLine(st)));
  }
  /* One-time offer after the 17-game update (the owner asked for a clean slate). Also available in Settings. */
  function freshButton(label) {
    return h('button', { class: 'btn sm primary', onclick: function () {
      if (!this.dataset.armed) { this.dataset.armed = 1; this.textContent = 'Tap again to reset'; return; }
      var r = M.freshStart(PL.dateKey()); var c = M.core(); c.freshOffered = 1; M.saveCore(c);
      toast('Fresh start: ' + PL.plural(r.attempts, 'old result') + ' set aside, levels back to 3, today’s quiz rebuilt with all ' + PL.order.length + ' games.', 'good');
      go({ name: 'home' });
    } }, label);
  }
  function freshOffer() {
    var c = M.core();
    if (c.freshOffered || c.freshAt || !PL.store.keys('att:').length && !PL.store.keys('day:').length) return null;
    return h('div', { class: 'notice fresh' },
      h('p', null, h('b', null, 'Fresh start? '), 'Reset your statistics and levels, and rebuild today’s daily quiz with all ' + PL.order.length + ' games. Your old results are set aside (not deleted) and can be brought back from Settings.'),
      h('div', { class: 'row-actions' }, freshButton('Reset stats and today’s quiz'),
        h('button', { class: 'btn sm ghost', onclick: function () { var c2 = M.core(); c2.freshOffered = 1; M.saveCore(c2); render(); } }, 'Not now')));
  }
  function syncLine(st) {
    if (st.local === 'memory') return 'Storage is unavailable here, so progress will be lost when you close the app. Export your data from Settings.';
    return 'Saved on this iPhone' + (st.persisted ? ' (protected storage)' : '') + '. Export a backup from Settings now and then.';
  }
  function fmtDate(k) { var p = k.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }

  /* ---------- play sessions ---------- */
  var sidSeq = 0;
  function newSid() { return ++sidSeq; }
  function startUnlimited(g, opts) {
    var act = M.active(g);
    // self-heal: an "active" record that was already finished (older builds could resurrect one) is discarded
    if (act && (act.done || M.getAttempt(act.id))) { M.clearActive(g); act = null; }
    if (!act) {
      var r = M.rating(g), G = PL.games[g], set = M.settings();
      var ctx = M.genContext(g);
      var seed = PL.uid();
      var made;
      try { made = M.newPuzzle(g, r.level, g + ':' + seed, ctx); }
      catch (e) { toast('Could not build a valid puzzle. Please try again.', 'bad'); return; }
      act = { id: PL.uid(), game: g, mode: 'unlimited', timed: !!set.timed, timeLimit: set.timed ? G.timeLimit(r.level) : null, level: r.level, seed: made.seed, fp: made.fp, puzzle: made.puzzle,
        gs: G.init(made.puzzle), hints: 0, wrong: 0, activeMs: 0, startedAt: Date.now(), touched: false, hintLog: [], shuffle: !!(opts && opts.shuffle) };
      M.saveActive(g, act);
    } else if (opts && opts.shuffle) { act.shuffle = true; }
    cur = { sid: newSid(), kind: 'unlimited', g: g, rec: act, p: act.puzzle, level: act.level, paused: false, done: false, hint: null };
    lastTick = performance.now();
    screen = { name: 'play' }; render(); window.scrollTo(0, 0);
  }
  function startDaily(g, practice) {
    if (!practice && screen.date && screen.date !== PL.dateKey()) { go({ name: 'daily', date: screen.date }); return; } // only today's quiz is scored
    var d = M.ensureDaily(screen.date || PL.dateKey());
    var pz = d.puzzles[g];
    if (practice) {
      var rec = { id: PL.uid(), game: g, mode: 'practice', level: d.levels[g], seed: pz.seed, puzzle: pz.puzzle, gs: PL.games[g].init(pz.puzzle), hints: 0, wrong: 0, activeMs: 0, startedAt: Date.now(), hintLog: [], dailyDate: d.date };
      cur = { sid: newSid(), kind: 'practice', g: g, rec: rec, p: pz.puzzle, level: d.levels[g], paused: false, done: false, d: d };
    } else {
      var pr = d.prog[g];
      if (!pr.gs) { pr.gs = PL.games[g].init(pz.puzzle); pr.id = PL.uid(); pr.startedAt = Date.now(); pr.hintLog = []; M.saveDaily(d); }
      cur = { sid: newSid(), kind: 'daily', g: g, rec: pr, p: pz.puzzle, level: d.levels[g], paused: false, done: pr.done, d: d };
    }
    lastTick = performance.now();
    screen = { name: 'play', date: d.date }; render(); window.scrollTo(0, 0);
  }
  /* Lifecycle rule: a session's record is written only while that session is the current one AND unfinished.
     Finishing cancels pending writes, so a completed puzzle can never be saved back as "active" (the old Next Puzzle bug). */
  function persistRec() {
    if (!cur || cur.done) return;
    if (cur.kind === 'unlimited') M.saveActive(cur.g, cur.rec);
    else if (cur.kind === 'daily') M.saveDaily(cur.d);
  }
  var persistT = null;
  function persistSoon() { clearTimeout(persistT); var sid = cur && cur.sid; persistT = setTimeout(function () { if (cur && cur.sid === sid) persistRec(); }, 800); }
  function leavePlay() {
    if (PL.dock.isOpen()) PL.dock.close();
    clearTimeout(persistT);
    if (cur && !cur.done) { tickNow(); persistRec(); }
    cur = null;
  }

  /* ---------- active-time tracking ---------- */
  var lastTick = null;
  function tickNow() {
    var t = performance.now();
    if (cur && !cur.done && !cur.paused && !document.hidden && lastTick != null) {
      var dt = Math.min(t - lastTick, 5000); // cap: never credit long gaps (sleep, background)
      cur.rec.activeMs = (cur.rec.activeMs || 0) + dt;
    }
    lastTick = t;
  }
  setInterval(function () {
    tickNow();
    if (!cur || cur.done) return;
    var el = document.getElementById('clock');
    if (el) {
      if (cur.rec.timeLimit) { var left = cur.rec.timeLimit * 1000 - cur.rec.activeMs; el.textContent = PL.fmtTime(Math.max(0, left)); el.classList.toggle('warn', left < 30000); if (left <= 0) finish('timeout'); }
      else el.textContent = PL.fmtTime(cur.rec.activeMs);
    }
    if (Math.floor(cur.rec.activeMs / 1000) % 5 === 0) persistRec();
  }, 1000);
  document.addEventListener('visibilitychange', function () { tickNow(); if (document.hidden) { persistRec(); PL.store.flush(); } else lastTick = performance.now(); });
  window.addEventListener('pagehide', function () { tickNow(); persistRec(); });

  /* ---------- play view ---------- */
  function playView() {
    if (!cur) return homeView();
    var G = PL.games[cur.g], rec = cur.rec;
    var wrap = h('main', { class: 'page play' + (PL.fx && PL.fx.once('play:' + cur.sid) ? ' enter' : '') });
    var meta = cur.kind === 'unlimited' ? 'Level ' + cur.level + (rec.timed ? ' · timed' : '') + (rec.shuffle ? ' · shuffle' : '') : cur.kind === 'daily' ? 'Daily · ' + diffName(cur.level) : 'Daily practice (not scored)';
    var right = h('div', { class: 'tb-right' },
      h('span', { id: 'clock', class: 'clock mono' + (rec.timeLimit ? ' timed' : ''), 'aria-label': 'Active time' }, rec.timeLimit ? PL.fmtTime(rec.timeLimit * 1000 - rec.activeMs) : PL.fmtTime(rec.activeMs)),
      cur.done ? null : h('button', { class: 'iconbtn', 'aria-label': cur.paused ? 'Resume' : 'Pause', onclick: function () { tickNow(); cur.paused = !cur.paused; persistRec(); render(); } }, PL.svg('svg', { viewBox: '0 0 24 24', class: 'gicon' }, PL.svg('path', { d: cur.paused ? 'M8 5l11 7-11 7z' : 'M8 5v14M16 5v14' }))));
    wrap.appendChild(topbar(h('div', null, h('div', { class: 'tb-name' }, G.name), h('div', { class: 'tb-meta' }, meta)), function () { go(cur && cur.kind !== 'unlimited' ? { name: 'daily', date: cur.d && cur.d.date } : { name: 'home' }); }, right));
    var tools = h('div', { class: 'toolbar' },
      h('button', { class: 'btn sm', onclick: function () { PL.dock.open('scratch', scratchKey(), { math: isMath() }); } }, 'Scratchpad'),
      isMath() ? h('button', { class: 'btn sm', 'aria-label': 'Calculator', onclick: function () { PL.dock.open('calc', scratchKey(), { math: true }); } }, 'Calculator') : null,
      cur.done ? null : h('button', { id: 'hintbtn', class: 'btn sm', onclick: doHint }, 'Hint' + (rec.hints ? ' (' + rec.hints + ')' : '')),
      h('details', { class: 'rules' }, h('summary', { class: 'btn sm ghost' }, 'Rules'), h('div', { class: 'rules-pop' }, G.rules)),
      cur.done ? null : h('details', { class: 'more' }, h('summary', { class: 'btn sm ghost', 'aria-label': 'More actions' }, '•••'),
        h('div', { class: 'more-pop' },
          cur.kind === 'unlimited' ? h('button', { class: 'linkbtn', onclick: skip }, rec.touched || rec.activeMs > 30000 ? 'Skip this puzzle (counts as abandoned)' : 'Skip this puzzle') : null,
          G.giveUpLabel && G.giveUpLabel(cur.p) ? h('button', { class: 'linkbtn', onclick: function () { if (!this.dataset.armed) { this.dataset.armed = 1; this.textContent = 'Tap again to give up on this question'; return; } this.closest('details').open = false; giveUpQuestion(); } }, G.giveUpLabel(cur.p)) : null,
          h('button', { class: 'linkbtn', onclick: function () { if (this.dataset.armed) finish('failed'); else { this.dataset.armed = 1; this.textContent = G.multi && cur.p.qs ? 'Tap again to end the whole game now' : 'Tap again to give up and see the solution'; } } }, G.multi && cur.p.qs ? 'End this game' : 'Give up'))));
    wrap.appendChild(tools);
    if (cur.hint) wrap.appendChild(h('div', { class: 'hintbox', role: 'status' }, h('span', null, cur.hint), h('button', { class: 'linkbtn', onclick: function () { cur.hint = null; render(); } }, 'Dismiss')));
    if (cur.done && cur.summary) wrap.appendChild(summaryCard());
    var body = h('div', { id: 'gamebody', class: 'gamebody' + (cur.paused ? ' paused' : '') });
    try { body.appendChild(G.view(makeApi())); }
    catch (e) { body.appendChild(h('div', { class: 'notice bad' }, 'This puzzle failed to display: ' + e.message)); console.error(e); }
    wrap.appendChild(body);
    if (cur.paused) wrap.appendChild(h('div', { class: 'pause-cover' }, h('div', null, h('b', null, 'Paused'), h('div', { class: 'muted small' }, 'The timer is stopped.'), h('button', { class: 'btn primary', onclick: function () { lastTick = performance.now(); cur.paused = false; render(); } }, 'Resume'))));
    if (cur.done && cur.showReview) wrap.appendChild(h('section', { class: 'card' }, h('h2', null, 'Solution and review'), G.review(cur.p, rec.gs)));
    return wrap;
  }
  function isMath() { var G = PL.games[cur.g]; return cur.g === 'algebra' || cur.g === 'balance' || (G.math && G.math(cur.p)); }
  function diffName(lv) { return lv <= 3 ? 'Easy' : lv <= 6 ? 'Medium' : 'Hard'; }
  function scratchKey() { return cur.kind === 'daily' ? 'daily:' + cur.d.date + ':' + cur.g : cur.rec.id; }
  function makeApi() {
    var session = cur, rec = cur.rec;
    var live = function () { return cur === session && !session.done; };
    return {
      p: cur.p, gs: rec.gs, level: cur.level, daily: cur.kind !== 'unlimited', done: cur.done,
      activeMs: function () { if (cur === session) tickNow(); return rec.activeMs || 0; },
      update: function (gs) { if (!live()) { if (cur === session) rerenderBody(); return; } rec.gs = gs; rec.touched = true; persistSoon(); rerenderBody(); },
      save: function (gs) { if (!live()) return; rec.gs = gs; rec.touched = true; persistSoon(); },
      wrong: function (n) { if (!live()) return; rec.wrong = (rec.wrong || 0) + (n || 1); rec.touched = true; },
      toast: toast,
      finish: function (outcome) { setTimeout(function () { if (cur === session) finish(outcome); }, 0); }
    };
  }
  function rerenderBody() {
    var body = document.getElementById('gamebody');
    if (!body || !cur) { render(); return; }
    var y = window.scrollY;
    body.innerHTML = '';
    try { body.appendChild(PL.games[cur.g].view(makeApi())); } catch (e) { body.appendChild(h('div', { class: 'notice bad' }, e.message)); console.error(e); }
    window.scrollTo(0, y);
    var hb = document.getElementById('hintbtn'); if (hb && !cur.done) hb.textContent = 'Hint' + (cur.rec.hints ? ' (' + cur.rec.hints + ')' : '');
  }
  function doHint() {
    if (!cur || cur.done) return;
    var G = PL.games[cur.g], rec = cur.rec;
    var res = G.hint(cur.p, rec.gs) || { msg: 'No hint available.', noCount: true };
    if (!res.noCount) { rec.hints = (rec.hints || 0) + 1; rec.touched = true; (rec.hintLog = rec.hintLog || []).push(res.msg); }
    if (res.gs) rec.gs = res.gs;
    cur.hint = res.msg; persistRec(); render();
    if (res.after === 'solved') finish('solved');
  }
  function giveUpQuestion() {
    var G = PL.games[cur.g], api = makeApi();
    if (G.giveUp && G.giveUp(cur.p, cur.rec.gs, api)) { cur.rec.touched = true; persistRec(); rerenderBody(); }
  }
  function skip() {
    var rec = cur.rec;
    var outcome = (!rec.touched && rec.activeMs < 30000) ? 'skipped' : 'abandoned';
    finish(outcome, true);
  }

  function finish(outcome, leave) {
    if (!cur || cur.done) return;
    tickNow();
    clearTimeout(persistT);
    var G = PL.games[cur.g], rec = cur.rec, p = cur.p;
    var ev = G.evaluate(p, rec.gs, { outcome: outcome === 'timeout' ? 'failed' : outcome, hints: rec.hints || 0, wrong: rec.wrong || 0, activeMs: rec.activeMs });
    var perf = ev.quality;
    if (outcome === 'abandoned') perf = Math.min(perf, 20);
    var att = { id: rec.id, game: cur.g, mode: cur.kind, timed: !!rec.timed, timeLimit: rec.timeLimit || null, level: cur.level, startedAt: rec.startedAt, endedAt: Date.now(), activeMs: Math.round(rec.activeMs),
      outcome: outcome, perf: perf, quality: ev.quality, metrics: ev.metrics, lines: ev.lines, hints: rec.hints || 0, wrong: rec.wrong || 0, hintLog: rec.hintLog || [],
      puzzle: p, seed: rec.seed, fp: rec.fp || null, gs: rec.gs, gen: PL.GEN_VERSION, scratchKey: scratchKey() };
    cur.done = true; rec.done = true; // stops the clock and blocks any further writes from this session
    var sum = { outcome: outcome, perf: perf, lines: ev.lines, ms: rec.activeMs, hints: att.hints, wrong: att.wrong, title: ev.title };
    if (cur.kind === 'unlimited') {
      M.saveAttempt(att); M.clearActive(cur.g);
      if (M.eligible(att)) { var ad = M.adapt(cur.g); sum.adapt = ad; }
      else sum.note = att.timed ? 'Timed result: kept separately and not used for difficulty.' : outcome === 'skipped' ? 'Skipped before you started: not counted toward difficulty.' : '';
      var c = M.core(); c.shuffle.recent = (c.shuffle.recent || []).concat([cur.g]).slice(-6); M.saveCore(c);
    } else if (cur.kind === 'daily') {
      var ds = M.dailyScore(cur.g, cur.level, ev.quality, outcome === 'solved', rec.activeMs, p);
      rec.done = true; rec.outcome = outcome; rec.quality = ds.quality; rec.timeScore = ds.time; rec.score = ds.score; rec.endedAt = att.endedAt;
      att.dailyDate = cur.d.date; att.dailyDiff = cur.d.diff; att.dailyScore = ds;
      M.saveAttempt(att);
      var tt = M.dailyTotals(cur.d);
      if (tt.done === tt.n && !cur.d.complete) { cur.d.complete = true; cur.d.total = tt.score; cur.d.completedAt = Date.now(); }
      M.saveDaily(cur.d);
      sum.daily = ds; sum.dayDone = cur.d.complete; sum.nextDaily = cur.d.complete ? null : M.nextDailyGame(cur.d, cur.g);
    } else {
      M.saveAttempt(att);
      sum.note = 'Practice replay: recorded in your history, not in statistics or the official daily score.';
    }
    // a personal best: higher than every earlier result in this game (needs a few earlier results to mean something)
    if (outcome === 'solved' && cur.kind !== 'practice') {
      var mine = cur.kind === 'daily' ? function (a) { return a.game === cur.g && a.mode === 'daily' && a.id !== att.id && a.dailyScore; } : function (a) { return a.game === cur.g && M.eligible(a) && a.id !== att.id; };
      var prev = M.attempts(mine).map(function (a) { return cur.kind === 'daily' ? a.dailyScore.score : a.perf; });
      var val = cur.kind === 'daily' ? sum.daily.score : perf;
      if (prev.length >= 3 && val > Math.max.apply(null, prev)) sum.pb = true;
      sum.great = val >= 90;
    }
    cur.summary = sum;
    if (leave && outcome === 'skipped') { var g = cur.g; cur = null; startUnlimited(g); toast('Skipped. Here is a fresh puzzle.', ''); return; }
    render(); window.scrollTo(0, 0);
    if (PL.fx && outcome === 'solved') {
      PL.fx.haptic('success');
      var el = document.querySelector('.summary'), num = document.querySelector('.summary .sum-score b');
      if (num) PL.fx.count(num, Number(num.textContent));
      if (el && (sum.great || sum.pb || sum.dayDone)) PL.fx.celebrate(el, sum.pb || sum.dayDone ? 'big' : 'small');
    }
  }
  function summaryCard() {
    var s = cur.summary, G = PL.games[cur.g];
    var title = s.title && (s.outcome === 'solved' || s.outcome === 'failed') ? s.title : s.outcome === 'solved' ? 'Solved' : s.outcome === 'timeout' ? 'Time is up' : s.outcome === 'abandoned' ? 'Abandoned' : s.outcome === 'skipped' ? 'Skipped' : 'Not solved';
    var rows = [['Active time', PL.fmtTime(s.ms)], ['Hints', s.hints]].concat(s.lines || []);
    var adapt = null;
    if (s.adapt) {
      var a = s.adapt;
      adapt = a.change > 0 ? 'Difficulty up to level ' + a.level + '.' : a.change < 0 ? 'Difficulty eased to level ' + a.level + '.' : a.roll.n ? 'Level ' + a.level + ' · recent performance ' + Math.round(a.roll.mean) + ' over ' + PL.plural(a.roll.n, 'puzzle') + '.' : '';
    }
    var next = cur.kind === 'unlimited' ? h('button', { class: 'btn primary', onclick: function () {
      var g = cur.g, sh = cur.rec.shuffle; cur = null;
      if (sh) startShuffle(); else startUnlimited(g);
    } }, cur.rec.shuffle ? 'Next shuffle' : 'Next puzzle') : cur.kind === 'daily' ? (s.nextDaily ? h('button', { class: 'btn primary', id: 'next-daily', onclick: function () { var g2 = s.nextDaily, dd = cur.d.date; if (dd !== PL.dateKey()) { toast('A new day has started, so that quiz is closed.', ''); go({ name: 'daily', date: dd }); return; } cur = null; screen.date = dd; startDaily(g2, false); } }, 'Next puzzle: ' + PL.games[s.nextDaily].name)
        : h('button', { class: 'btn primary', onclick: function () { go({ name: 'daily', date: cur.d.date }); } }, s.dayDone ? 'See daily results' : 'Back to the daily quiz')) : h('button', { class: 'btn primary', onclick: function () { go({ name: 'daily', date: cur.d.date }); } }, 'Back');
    return h('section', { class: 'card summary ' + (s.outcome === 'solved' ? 'ok' : 'bad') + (PL.fx && PL.fx.once('sum:' + cur.sid) ? ' enter' : '') + (s.great ? ' great' : '') },
      s.pb ? h('div', { class: 'pb-badge' }, '★ New personal best') : null,
      s.dayDone ? h('div', { class: 'pb-badge day' }, 'Daily quiz complete') : null,
      h('div', { class: 'sum-head' }, h('h2', null, title), h('div', { class: 'sum-score' }, s.daily ? h('span', null, h('b', null, String(s.daily.score)), ' / 100') : h('span', null, h('b', null, String(Math.round(s.perf))), ' performance'))),
      s.daily ? h('div', { class: 'muted small' }, 'Quality ' + s.daily.quality + ' × 0.8 + time credit ' + s.daily.time + ' × 0.2 (benchmark ' + PL.fmtTime(s.daily.bench * 1000) + ')') : null,
      h('dl', { class: 'kv' }, rows.map(function (r) { return [h('dt', null, r[0]), h('dd', null, String(r[1]))]; })),
      adapt ? h('div', { class: 'adapt' }, adapt) : null,
      s.note ? h('div', { class: 'muted small' }, s.note) : null,
      h('div', { class: 'row-actions' }, next, s.nextDaily ? h('button', { class: 'btn', onclick: function () { go({ name: 'daily', date: cur.d.date }); } }, 'Daily overview') : null, cur.showReview ? null : h('button', { class: 'btn', onclick: function () { cur.showReview = true; render(); setTimeout(function () { var r = document.querySelector('.play .card:last-child'); if (r) r.scrollIntoView({ behavior: 'smooth' }); }, 50); } }, 'Review solution'),
        h('button', { class: 'btn ghost', onclick: function () { go({ name: 'gstats', g: cur.g }); } }, G.name + ' stats')));
  }

  /* ---------- shuffle ---------- */
  function startShuffle() {
    var set = M.settings(), recent = M.core().shuffle.recent || [];
    var pool = PL.order.filter(function (g) { return set.excluded.indexOf(g) < 0; });
    if (!pool.length) { toast('Every game is excluded. Include at least one.', 'bad'); go({ name: 'shuffle' }); return; }
    // weight away from the last few games played
    var weights = pool.map(function (g) { var i = recent.lastIndexOf(g); return i < 0 ? 4 : i >= recent.length - 1 ? 0.15 : i >= recent.length - 3 ? 1 : 2.5; });
    var g = PL.rng(PL.uid()).weighted(pool, weights);
    startUnlimited(g, { shuffle: true });
  }
  function shuffleView() {
    var set = M.settings();
    return h('main', { class: 'page' }, topbar('Shuffle', function () { go({ name: 'home' }); }),
      h('p', { class: 'muted' }, 'Get a fresh puzzle from a random game at your current level for that game. Recently played games come up less often. Results count normally.'),
      h('div', { class: 'lbl' }, 'Include'),
      h('div', { class: 'chips' }, PL.order.map(function (g) {
        var on = set.excluded.indexOf(g) < 0;
        return h('button', { class: 'chip' + (on ? ' sel' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: function () { var ex = set.excluded.slice(); var i = ex.indexOf(g); if (i >= 0) ex.splice(i, 1); else ex.push(g); M.setSetting('excluded', ex); render(); } }, PL.games[g].name);
      })),
      h('button', { class: 'btn primary wide', onclick: startShuffle }, 'Shuffle a puzzle'));
  }

  /* ---------- daily ---------- */
  function dailyView() {
    var date = screen.date || PL.dateKey();
    var isToday = date === PL.dateKey();
    var d = isToday ? M.ensureDaily(date) : M.daily(date);
    if (!d) return h('main', { class: 'page' }, topbar('Daily', function () { go({ name: 'home' }); }), h('p', null, 'No quiz was played on that date.'));
    var t = M.dailyTotals(d);
    // comparisons use percentages so nine-game (900) and ten-game (1000) days are comparable
    var prev = M.dailies().filter(function (x) { return x.complete && x.diff === d.diff && x.date !== d.date; });
    var avgPrev = prev.length ? Math.round(PL.mean(prev.map(M.dayPct))) : null;
    var bestPrev = prev.length ? Math.round(Math.max.apply(null, prev.map(M.dayPct))) : null;
    var myPct = Math.round(t.pct);
    return h('main', { class: 'page daily' }, topbar('Daily Mini Quiz', function () { go({ name: 'home' }); }),
      h('div', { class: 'daily-head' }, h('div', null, h('div', { class: 'eyebrow' }, fmtDate(date)), h('h2', null, d.diff + ' day')),
        h('div', { class: 'sum-score' }, h('b', null, String(t.score)), ' / ' + d.max)),
      isToday && !d.complete && M.nextDailyGame(d, null) ? h('button', { class: 'btn primary wide', id: 'daily-continue', onclick: function () { startDaily(M.nextDailyGame(d, null), false); } }, M.dayStarted(d) ? 'Continue: ' + PL.games[M.nextDailyGame(d, null)].name : 'Start with ' + PL.games[M.nextDailyGame(d, null)].name) : null,
      !isToday && !d.complete ? h('div', { class: 'notice' }, 'This day’s quiz was not finished. Only the current day’s quiz can be played for an official score.') : null,
      d.complete ? h('section', { class: 'card' },
        h('h3', null, 'Results'),
        h('dl', { class: 'kv' }, [['Total', t.score + ' / ' + d.max + ' (' + myPct + '%)'], ['Active time', PL.fmtTime(t.ms)], ['Hints', t.hints], ['Incorrect attempts', t.wrong],
          ['Your average on ' + d.diff + ' days', avgPrev != null ? avgPrev + '% (' + PL.plural(prev.length, 'day') + ')' : 'First ' + d.diff + ' day'],
          ['Previous best on ' + d.diff + ' days', bestPrev != null ? bestPrev + '%' + (myPct > bestPrev ? ' — new personal best!' : '') : '—']].map(function (r) { return [h('dt', null, r[0]), h('dd', null, String(r[1]))]; }))) : null,
      d.games.length !== PL.order.length ? h('div', { class: 'notice' }, 'This quiz is from an earlier version: ' + d.games.length + ' games, scored out of ' + d.max + '.') : null,
      h('ul', { class: 'dlist' }, M.dayOrder(d).map(function (g, k) {
        var G = PL.games[g], pr = d.prog[g];
        var status = pr.done ? (pr.outcome === 'solved' ? pr.score + ' pts' : 'Not solved · ' + (pr.score || 0) + ' pts') : pr.gs ? 'In progress · ' + PL.fmtTime(pr.activeMs) : d.diff === 'Mixed' ? diffName(d.levels[g]) : '';
        return h('li', null, h('button', { class: 'gcard g-' + g + (pr.done ? ' done' : ''), disabled: !isToday && !pr.done, onclick: function () { if (pr.done) { reviewDaily(d, g); } else startDaily(g, false); } },
          h('span', { class: 'dnum mono' }, String(k + 1)), icon(g), h('div', { class: 'gc-text' }, h('div', { class: 'gc-name' }, G.name), h('div', { class: 'gc-blurb' }, status || 'Not started')),
          pr.done ? h('span', { class: 'mark ' + (pr.outcome === 'solved' ? 'ok' : 'bad') }, pr.outcome === 'solved' ? '✓' : '×') : null));
      })),
      h('details', { class: 'card' }, h('summary', null, 'How daily scoring works'),
        h('p', { class: 'small' }, 'Each puzzle is worth up to 100 points: 80% solution quality and 20% time. Quality reflects the game (clues used in Password, moves versus the shortest route in Word Bridges, information cost in Word Detective, wrong answers and hints elsewhere). Time credit is full at or under a benchmark for that game and difficulty, falls linearly to zero at four times the benchmark, and is multiplied by your quality, so rushing a sloppy answer earns little. Unsolved puzzles get no time credit. Only active time counts: the clock stops when you pause, leave the puzzle or close the app. There is no time limit.'),
        h('p', { class: 'small muted' }, 'Formula: score = round(0.8·Q + 0.2·T), T = (solved ? 100·clamp((4B − t)/(3B), 0, 1) : 0) · Q/100. Benchmarks are provisional and will be recalibrated as data accumulates.')),
      h('p', { class: 'muted small' }, 'Today’s order is shuffled once for the day and stays the same; after each puzzle, Next puzzle takes you to the next unfinished one. You can still tap any game to play it first. Progress is saved. Daily results never change your unlimited-play levels.'));
  }
  function reviewDaily(d, g) {
    var pr = d.prog[g], G = PL.games[g];
    openModal(G.name + ' — daily', h('div', null,
      h('dl', { class: 'kv' }, [['Score', pr.score + ' / 100'], ['Quality', pr.quality], ['Time credit', pr.timeScore], ['Active time', PL.fmtTime(pr.activeMs)], ['Hints', pr.hints], ['Wrong attempts', pr.wrong]].map(function (r) { return [h('dt', null, r[0]), h('dd', null, String(r[1]))]; })),
      G.review(d.puzzles[g].puzzle, pr.gs),
      h('button', { class: 'btn', onclick: function () { closeModal(); screen.date = d.date; startDaily(g, true); } }, 'Practise this puzzle again (not scored)')));
  }

  /* ---------- modal ---------- */
  function openModal(title, content) {
    closeModal();
    var m = h('div', { class: 'modal', role: 'dialog', 'aria-label': title },
      h('div', { class: 'modal-card' }, h('div', { class: 'modal-head' }, h('b', null, title), h('button', { class: 'btn ghost sm', onclick: closeModal }, 'Close')), h('div', { class: 'modal-body' }, content)));
    m.addEventListener('click', function (e) { if (e.target === m) closeModal(); });
    document.body.appendChild(m); document.body.classList.add('sheet-open');
  }
  function closeModal() { var m = document.querySelector('.modal'); if (m) m.remove(); document.body.classList.remove('sheet-open'); }

  /* ---------- statistics ---------- */
  function spark(values, opts) {
    opts = opts || {};
    var W = 320, H = opts.h || 80, pad = 6;
    if (values.length < 2) return h('div', { class: 'muted small' }, 'A trend appears after a few more puzzles.');
    var min = opts.min != null ? opts.min : Math.min.apply(null, values), max = opts.max != null ? opts.max : Math.max.apply(null, values);
    if (max === min) max = min + 1;
    var x = function (i) { return pad + i * (W - 2 * pad) / (values.length - 1); }, y = function (v) { return H - pad - (v - min) * (H - 2 * pad) / (max - min); };
    var pts = values.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); });
    var kids = [];
    [0.25, 0.5, 0.75].forEach(function (f) { kids.push(PL.svg('line', { x1: pad, x2: W - pad, y1: (pad + f * (H - 2 * pad)).toFixed(1), y2: (pad + f * (H - 2 * pad)).toFixed(1), class: 'sp-grid' })); });
    kids.push(PL.svg('path', { d: 'M' + x(0) + ',' + (H - pad) + ' L' + pts.join(' L') + ' L' + x(values.length - 1) + ',' + (H - pad) + ' Z', class: 'sp-area' }));
    kids.push(PL.svg('polyline', { points: pts.join(' '), class: 'sp-line' }));
    kids.push(PL.svg('circle', { cx: x(values.length - 1), cy: y(values[values.length - 1]), r: 3.5, class: 'sp-end' }));
    return h('div', { class: 'spark' }, PL.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'img', 'aria-label': opts.label || 'Trend' }, kids),
      h('div', { class: 'sp-axis small muted' }, h('span', null, opts.left || ''), h('span', null, opts.right || '')));
  }
  function rollingAvg(vals, k) { var out = []; for (var i = 0; i < vals.length; i++) { var s = vals.slice(Math.max(0, i - k + 1), i + 1); out.push(PL.mean(s)); } return out; }
  function pct(a, b) { return b ? Math.round(100 * a / b) + '%' : '—'; }
  function kvRows(rows) { return h('dl', { class: 'kv' }, rows.map(function (r) { return [h('dt', null, r[0]), h('dd', null, String(r[1]))]; })); }

  function statsView() {
    var atts = M.attempts(M.counts);
    var done = atts.filter(function (a) { return a.outcome === 'solved'; });
    var ms = atts.reduce(function (s, a) { return s + (a.activeMs || 0); }, 0);
    var real = atts.filter(function (a) { return a.outcome !== 'skipped'; });
    var timed = M.attempts(function (a) { return a.mode === 'unlimited' && a.timed; });
    var byLevel = {}; real.forEach(function (a) { (byLevel[a.level] = byLevel[a.level] || []).push(a); });
    return h('main', { class: 'page stats' }, topbar('Statistics', function () { go({ name: 'home' }); }),
      h('div', { class: 'tabs' }, h('button', { class: 'tab on' }, 'Unlimited play'), h('button', { class: 'tab', onclick: function () { go({ name: 'dstats' }); } }, 'Daily quiz')),
      !atts.length ? h('div', { class: 'empty' }, h('b', null, 'No puzzles yet.'), h('p', { class: 'muted' }, 'Every puzzle you finish, skip or abandon in unlimited play will appear here. Nothing is pre-filled.')) : h('div', null,
        h('div', { class: 'tiles' },
          tile('Attempted', real.length), tile('Completed', done.length), tile('Completion', pct(done.length, real.length)), tile('Avg perf', real.length ? Math.round(PL.mean(real.map(function (a) { return a.perf; }))) : '—')),
        h('section', { class: 'card' }, h('h3', null, 'Performance over time'), spark(rollingAvg(real.map(function (a) { return a.perf; }), 10), { min: 0, max: 100, left: 'oldest', right: 'latest · 10-puzzle average', label: 'Performance trend' })),
        h('section', { class: 'card' }, h('h3', null, 'Overall'), kvRows([
          ['Total active time', PL.fmtTime(ms)], ['Average time per completed puzzle', done.length ? PL.fmtTime(PL.mean(done.map(function (a) { return a.activeMs; }))) : '—'],
          ['Hints used', atts.reduce(function (s, a) { return s + (a.hints || 0); }, 0)], ['Failed', atts.filter(function (a) { return a.outcome === 'failed'; }).length],
          ['Abandoned', atts.filter(function (a) { return a.outcome === 'abandoned'; }).length], ['Skipped (not counted)', atts.filter(function (a) { return a.outcome === 'skipped'; }).length]]))),
      h('section', { class: 'card' }, h('h3', null, 'By game'), h('div', { class: 'scrollx' }, h('table', { class: 'dtable' },
        h('tr', null, h('th', null, 'Game'), h('th', null, 'Level'), h('th', null, 'Played'), h('th', null, 'Solved'), h('th', null, 'Perf')),
        PL.order.concat(PL.retired.filter(function (g) { return real.some(function (a) { return a.game === g; }); })).map(function (g) {
          var A = real.filter(function (a) { return a.game === g; }), r = M.rating(g), ret = PL.retired.indexOf(g) >= 0;
          return h('tr', { class: 'rowlink', onclick: function () { go({ name: 'gstats', g: g }); } }, h('td', null, PL.games[g].name + (ret ? ' (retired)' : '')), h('td', null, ret ? '—' : r.level + (r.highest > r.level ? ' (max ' + r.highest + ')' : '')), h('td', null, A.length), h('td', null, pct(A.filter(function (a) { return a.outcome === 'solved'; }).length, A.length)), h('td', null, A.length ? Math.round(PL.mean(A.map(function (a) { return a.perf; }))) : '—'));
        }))), h('div', { class: 'muted small' }, 'Tap a game for its detailed page.')),
      Object.keys(byLevel).length ? h('section', { class: 'card' }, h('h3', null, 'By difficulty level'), h('div', { class: 'scrollx' }, h('table', { class: 'dtable' },
        h('tr', null, h('th', null, 'Level'), h('th', null, 'Played'), h('th', null, 'Solved'), h('th', null, 'Avg perf')),
        Object.keys(byLevel).sort(function (a, b) { return a - b; }).map(function (lv) { var A = byLevel[lv]; return h('tr', null, h('td', null, lv), h('td', null, A.length), h('td', null, pct(A.filter(function (a) { return a.outcome === 'solved'; }).length, A.length)), h('td', null, Math.round(PL.mean(A.map(function (a) { return a.perf; }))))); })))) : null,
      timed.length ? h('section', { class: 'card' }, h('h3', null, 'Timed mode (kept separately)'), kvRows([['Timed attempts', timed.length], ['Beat the clock', pct(timed.filter(function (a) { return a.outcome === 'solved'; }).length, timed.length)], ['Average performance', Math.round(PL.mean(timed.map(function (a) { return a.perf; })))]])) : null);
  }
  function tile(label, val) { return h('div', { class: 'tile' }, h('div', { class: 'tile-v' }, String(val)), h('div', { class: 'tile-l' }, label)); }

  function gameStatsView(g) {
    var G = PL.games[g], r = M.rating(g);
    var atts = M.attempts(function (a) { return a.game === g && M.counts(a); });
    var real = atts.filter(function (a) { return a.outcome !== 'skipped'; });
    var roll = M.rollingFor(g);
    var byLevel = {}; real.forEach(function (a) { (byLevel[a.level] = byLevel[a.level] || []).push(a); });
    var recent = real.slice(-10), older = real.slice(-20, -10);
    var trend = recent.length >= 5 && older.length >= 5 ? Math.round(PL.mean(recent.map(function (a) { return a.perf; })) - PL.mean(older.map(function (a) { return a.perf; }))) : null;
    var timed = M.attempts(function (a) { return a.game === g && a.mode === 'unlimited' && a.timed; });
    var dailyA = M.attempts(function (a) { return a.game === g && a.mode === 'daily'; });
    return h('main', { class: 'page stats' }, topbar(G.name, function () { go({ name: 'stats' }); }),
      h('div', { class: 'tiles' }, tile('Current level', r.level), tile('Highest', r.highest), tile('Rolling', roll.mean != null ? Math.round(roll.mean) : '—'), tile('Lifetime avg', real.length ? Math.round(PL.mean(real.map(function (a) { return a.perf; }))) : '—')),
      h('section', { class: 'card' }, h('h3', null, 'Recent trend'), spark(real.slice(-40).map(function (a) { return a.perf; }), { min: 0, max: 100, left: 'last ' + Math.min(40, real.length) + ' puzzles', right: trend != null ? (trend >= 0 ? '+' : '') + trend + ' vs previous 10' : '', label: 'Performance per puzzle' }),
        h('div', { class: 'muted small' }, 'Rolling score uses up to 20 puzzles since the last level change, weighting recent ones more and crediting harder puzzles. ≥ 85 raises the level, below 65 lowers it.')),
      h('section', { class: 'card' }, h('h3', null, 'Game details'), kvRows([['Played', real.length], ['Solved', pct(real.filter(function (a) { return a.outcome === 'solved'; }).length, real.length)], ['Average solving time', real.filter(function (a) { return a.outcome === 'solved'; }).length ? PL.fmtTime(PL.mean(real.filter(function (a) { return a.outcome === 'solved'; }).map(function (a) { return a.activeMs; }))) : '—'], ['Hints used', real.reduce(function (s, a) { return s + (a.hints || 0); }, 0)]].concat(G.stats(real)))),
      Object.keys(byLevel).length ? h('section', { class: 'card' }, h('h3', null, 'Results by level'), h('div', { class: 'scrollx' }, h('table', { class: 'dtable' }, h('tr', null, h('th', null, 'Level'), h('th', null, 'Played'), h('th', null, 'Solved'), h('th', null, 'Avg perf')),
        Object.keys(byLevel).sort(function (a, b) { return a - b; }).map(function (lv) { var A = byLevel[lv]; return h('tr', null, h('td', null, lv), h('td', null, A.length), h('td', null, pct(A.filter(function (a) { return a.outcome === 'solved'; }).length, A.length)), h('td', null, Math.round(PL.mean(A.map(function (a) { return a.perf; }))))); })))) : null,
      r.changes.length ? h('section', { class: 'card' }, h('h3', null, 'Difficulty changes'), h('ul', { class: 'steps' }, r.changes.slice(-12).reverse().map(function (c) { return h('li', null, new Date(c.t).toLocaleDateString() + ': ' + c.from + ' → ' + c.to + ' · ' + c.reason); }))) : null,
      timed.length ? h('section', { class: 'card' }, h('h3', null, 'Timed mode'), kvRows([['Attempts', timed.length], ['Beat the clock', pct(timed.filter(function (a) { return a.outcome === 'solved'; }).length, timed.length)]])) : null,
      dailyA.length ? h('section', { class: 'card' }, h('h3', null, 'In the daily quiz'), kvRows([['Played', dailyA.length], ['Average daily points', Math.round(PL.mean(dailyA.map(function (a) { return a.dailyScore ? a.dailyScore.score : 0; })))]])) : null,
      h('section', { class: 'card' }, h('h3', null, 'Recent attempts'), attemptList(atts.slice(-15).reverse())));
  }
  function attemptList(list) {
    if (!list.length) return h('div', { class: 'muted small' }, 'Nothing yet.');
    return h('ul', { class: 'alist' }, list.map(function (a) {
      return h('li', null, h('button', { class: 'arow', onclick: function () { openAttempt(a.id); } },
        h('span', { class: 'mark ' + (a.outcome === 'solved' ? 'ok' : 'bad') }, a.outcome === 'solved' ? '✓' : a.outcome === 'skipped' ? '–' : '×'),
        h('span', { class: 'a-main' }, h('span', null, PL.games[a.game].name + (a.mode === 'daily' ? ' · daily' : a.mode === 'practice' ? ' · practice' : '') + ' · Lv ' + a.level), h('span', { class: 'muted small' }, new Date(a.endedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' · ' + PL.fmtTime(a.activeMs) + ' · ' + a.outcome)),
        h('span', { class: 'a-perf mono' }, a.mode === 'daily' && a.dailyScore ? a.dailyScore.score : Math.round(a.perf))));
    }));
  }
  function openAttempt(id) {
    var a = M.getAttempt(id); if (!a) return;
    var G = PL.games[a.game];
    var body;
    try { body = G.review(a.puzzle, a.gs); } catch (e) { body = h('div', { class: 'notice bad' }, 'This record could not be displayed: ' + e.message); }
    openModal(G.name, h('div', null,
      kvRows([['Played', new Date(a.endedAt).toLocaleString()], ['Mode', a.mode + (a.timed ? ' (timed)' : '')], ['Level', a.level], ['Result', a.outcome], [a.mode === 'daily' ? 'Daily points' : 'Performance', a.mode === 'daily' && a.dailyScore ? a.dailyScore.score : Math.round(a.perf)], ['Active time', PL.fmtTime(a.activeMs)], ['Hints', a.hints], ['Wrong attempts', a.wrong]].concat(a.lines || []).concat([['Puzzle ID', a.seed || a.id]])),
      a.hintLog && a.hintLog.length ? h('div', null, h('div', { class: 'lbl' }, 'Hints you saw'), h('ul', { class: 'steps small' }, a.hintLog.map(function (x) { return h('li', null, x); }))) : null,
      body,
      scratchPreview(a.scratchKey)));
  }
  function scratchPreview(key) {
    if (!key) return null; var s = PL.store.get('scr:' + key); if (!s || (!s.text && !(s.draw && s.draw.length))) return null;
    return h('div', null, h('div', { class: 'lbl' }, 'Your scratchpad'), s.text ? h('pre', { class: 'small scr-pre' }, s.text) : null, s.draw && s.draw.length ? h('div', { class: 'muted small' }, PL.plural(s.draw.length, 'drawn stroke') + ' saved.') : null);
  }
  function historyView() {
    var f = screen.filter || 'all';
    var list = M.attempts(function (a) { return f === 'all' || a.game === f || (f === 'daily' && a.mode !== 'unlimited'); }).reverse();
    return h('main', { class: 'page' }, topbar('History', function () { go({ name: 'home' }); }),
      h('div', { class: 'chips' }, [['all', 'All']].concat([['daily', 'Daily']]).concat(PL.order.concat(PL.retired.filter(function (g) { return PL.store.keys('att:').some(function (k) { return (PL.store.get(k) || {}).game === g; }); })).map(function (g) { return [g, PL.games[g].name]; })).map(function (o) {
        return h('button', { class: 'chip' + (f === o[0] ? ' sel' : ''), onclick: function () { screen.filter = o[0]; render(); } }, o[1]);
      })),
      list.length ? attemptList(list.slice(0, 200)) : h('div', { class: 'empty' }, h('p', { class: 'muted' }, 'Finished puzzles appear here. Open one to see the original puzzle, your answers and the full solution.')),
      list.length > 200 ? h('p', { class: 'muted small' }, 'Showing the latest 200. Export your data for the complete record.') : null);
  }

  function dailyStatsView() {
    var days = M.dailies().filter(function (d) { return d.date <= PL.dateKey(); });
    var f = screen.diff || 'All';
    var show = days.filter(function (d) { return f === 'All' || d.diff === f; });
    var comp = show.filter(function (d) { return d.complete; });
    var useAdj = M.settings().adjIndex;
    var FACT = { Easy: 0.85, Medium: 1, Hard: 1.2, Mixed: 1 };
    var P = function (d) { return M.dayPct(d); };
    var adj = function (d) { return Math.round(P(d) * FACT[d.diff]); };
    var cats = ['Easy', 'Medium', 'Hard', 'Mixed'];
    return h('main', { class: 'page stats' }, topbar('Statistics', function () { go({ name: 'home' }); }),
      h('div', { class: 'tabs' }, h('button', { class: 'tab', onclick: function () { go({ name: 'stats' }); } }, 'Unlimited play'), h('button', { class: 'tab on' }, 'Daily quiz')),
      h('div', { class: 'chips' }, ['All'].concat(cats).map(function (c) { return h('button', { class: 'chip' + (f === c ? ' sel' : ''), onclick: function () { screen.diff = c; render(); } }, c); })),
      !show.length ? h('div', { class: 'empty' }, h('p', { class: 'muted' }, 'Daily results will appear here once you start a daily quiz.')) : h('div', null,
        h('div', { class: 'tiles' }, tile('Attempted', show.length), tile('Completed', comp.length), tile('Average', comp.length ? Math.round(PL.mean(comp.map(P))) + '%' : '—'), tile('Best', comp.length ? Math.round(Math.max.apply(null, comp.map(P))) + '%' : '—')),
        h('section', { class: 'card' }, h('h3', null, 'Score history' + (f !== 'All' ? ' · ' + f : '')), spark(comp.map(function (d) { return useAdj ? adj(d) : P(d); }), { min: 0, max: useAdj ? 120 : 100, left: comp.length ? comp[0].date : '', right: comp.length ? comp[comp.length - 1].date : '', label: 'Daily scores' }),
          h('div', { class: 'muted small' }, 'Scores are shown as a percentage of the day’s maximum, so 900-point and 1,000-point days compare fairly.'),
          kvRows([['Completion rate', pct(comp.length, show.length)], ['Average active time', comp.length ? PL.fmtTime(PL.mean(comp.map(function (d) { return M.dailyTotals(d).ms; }))) : '—']])),
        h('section', { class: 'card' }, h('h3', null, 'By difficulty'), h('div', { class: 'scrollx' }, h('table', { class: 'dtable' },
          h('tr', null, h('th', null, ''), h('th', null, 'Days'), h('th', null, 'Done'), h('th', null, 'Avg'), h('th', null, 'Best'), h('th', null, 'Avg time')),
          cats.map(function (c) {
            var D = days.filter(function (d) { return d.diff === c; }), C = D.filter(function (d) { return d.complete; });
            return h('tr', null, h('td', null, c), h('td', null, D.length), h('td', null, pct(C.length, D.length)), h('td', null, C.length ? Math.round(PL.mean(C.map(P))) + '%' : '—'), h('td', null, C.length ? Math.round(Math.max.apply(null, C.map(P))) + '%' : '—'), h('td', null, C.length ? PL.fmtTime(PL.mean(C.map(function (d) { return M.dailyTotals(d).ms; }))) : '—'));
          })))),
        h('section', { class: 'card' }, h('h3', null, 'Per game' + (f !== 'All' ? ' on ' + f + ' days' : '')), h('div', { class: 'scrollx' }, h('table', { class: 'dtable' },
          h('tr', null, h('th', null, 'Game'), h('th', null, 'Avg pts'), h('th', null, 'Solved')),
          PL.order.concat(PL.retired).filter(function (g) { return show.some(function (d) { return d.games.indexOf(g) >= 0; }); }).map(function (g) {
            var PG = show.map(function (d) { return d.prog[g]; }).filter(function (p) { return p && p.done; });
            return h('tr', null, h('td', null, PL.games[g].name + (PL.retired.indexOf(g) >= 0 ? ' (retired)' : '')), h('td', null, PG.length ? Math.round(PL.mean(PG.map(function (p) { return p.score; }))) : '—'), h('td', null, pct(PG.filter(function (p) { return p.outcome === 'solved'; }).length, PG.length)));
          })))),
        h('section', { class: 'card' }, h('h3', null, 'Difficulty-adjusted index'),
          h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: useAdj, onchange: function () { M.setSetting('adjIndex', this.checked); render(); } }), ' Show adjusted scores in the chart'),
          h('p', { class: 'muted small' }, 'An optional, estimated index (percentage of maximum, weighted by difficulty): Easy × 0.85, Medium × 1.0, Hard × 1.2, Mixed × 1.0. It is a rough convenience, not a validated measure of ability. Raw scores are always kept and shown elsewhere.'),
          comp.length ? kvRows([['Average adjusted index', Math.round(PL.mean(comp.map(adj)))]]) : null),
        h('section', { class: 'card' }, h('h3', null, 'Days'), h('ul', { class: 'alist' }, show.slice().reverse().map(function (d) {
          var t = M.dailyTotals(d);
          return h('li', null, h('button', { class: 'arow', onclick: function () { go({ name: 'daily', date: d.date }); } }, h('span', { class: 'mark ' + (d.complete ? 'ok' : 'bad') }, d.complete ? '✓' : '…'), h('span', { class: 'a-main' }, h('span', null, fmtDate(d.date) + ' · ' + d.diff), h('span', { class: 'muted small' }, t.done + '/' + t.n + ' · ' + PL.fmtTime(t.ms) + ' · ' + Math.round(t.pct) + '%')), h('span', { class: 'a-perf mono' }, (d.complete ? d.total : t.score) + '/' + d.max)));
        })))));
  }

  /* ---------- settings & data ---------- */
  function settingsView() {
    var set = M.settings(), st = PL.store.status();
    var ta = h('textarea', { id: 'imp-text', class: 'txt area', rows: 4, placeholder: 'Or paste exported JSON here' });
    var fileIn = h('input', { id: 'imp-file', type: 'file', accept: 'application/json,.json', class: 'file' });
    var pending = null, impMsg = h('div', { class: 'small' });
    function readImport(text) {
      try { var obj = JSON.parse(text); var err = M.validateImport(obj); if (err) { impMsg.textContent = err; return; } pending = obj; var n = Object.keys(obj.data).filter(function (k) { return k.indexOf('att:') === 0; }).length; impMsg.textContent = 'Ready: ' + PL.plural(n, 'attempt') + ' from ' + obj.exportedAt.slice(0, 10) + '. Choose how to restore below.'; impBtns.hidden = false; }
      catch (e) { impMsg.textContent = 'That is not valid JSON.'; }
    }
    fileIn.addEventListener('change', function () { var f = fileIn.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { readImport(r.result); }; r.readAsText(f); });
    ta.addEventListener('input', function () { if (ta.value.trim().length > 20) readImport(ta.value.trim()); });
    var impBtns = h('div', { class: 'row-actions', hidden: true },
      h('button', { class: 'btn', onclick: function () { if (!pending) return; var c1 = M.importData(pending, 'merge'); toast('Merged ' + PL.plural(c1.attempts, 'attempt') + '.', 'good'); go({ name: 'home' }); } }, 'Merge with current data'),
      h('button', { class: 'btn ghost', onclick: function () { if (!pending) return; if (!this.dataset.armed) { this.dataset.armed = 1; this.textContent = 'Tap again: this replaces everything'; return; } M.importData(pending, 'replace'); toast('Restored.', 'good'); go({ name: 'home' }); } }, 'Replace all data'));
    var exportOut = h('div');
    return h('main', { class: 'page' }, topbar('Settings and data', function () { go({ name: 'home' }); }),
      h('section', { class: 'card' }, h('h3', null, 'Play'),
        h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: set.timed, onchange: function () { M.setSetting('timed', this.checked); render(); } }), ' Timed mode for new unlimited puzzles'),
        h('p', { class: 'muted small' }, 'Each game sets a time limit based on its level, shown as a countdown. Timed results are stored separately and never change your difficulty level. The daily quiz is never timed.')),
      h('section', { class: 'card' }, h('h3', null, 'Feel'),
        h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: set.haptics !== false, onchange: function () { M.setSetting('haptics', this.checked); if (this.checked && PL.fx) PL.fx.haptic('light'); } }), ' Haptic taps for correct answers and solves'),
        h('p', { class: 'muted small' }, 'A light tap where the iPhone supports it (iOS 18 or later). Animations are short and switch off automatically when Reduce Motion is on in iPhone Settings → Accessibility → Motion.')),
      h('section', { class: 'card' }, h('h3', null, 'Where your data lives'),
        h('p', { class: 'small' }, syncLine(st)),
        kvRows([['On this device', st.local === 'indexeddb' ? 'IndexedDB' : st.local === 'localstorage' ? 'Browser storage (limited space)' : 'Not available'], ['Protected from automatic clean-up', st.persisted ? 'Yes' : 'Not granted'], ['Puzzles recorded', PL.store.keys('att:').length], ['App version', PL.VERSION || 'dev']]),
        h('p', { class: 'muted small' }, 'Everything stays on this iPhone; nothing is uploaded. Opening Puzzle Lab from the Home Screen icon keeps its storage separate from Safari tabs. Export a backup now and then, especially before deleting the icon.')),
      h('section', { class: 'card' }, h('h3', null, 'Fresh start'),
        h('p', { class: 'small' }, 'Clears statistics, levels, daily results and unfinished puzzles, and rebuilds today’s daily quiz. Settings stay. The cleared records are kept aside on this iPhone and included in exports.'),
        freshButton('Reset stats and today’s quiz'),
        M.lastArchive() ? h('p', { class: 'small' }, 'Last reset: ' + new Date(M.lastArchive().at).toLocaleString() + '. ',
          h('button', { class: 'linkbtn', onclick: function () { if (!this.dataset.armed) { this.dataset.armed = 1; this.textContent = 'Tap again to bring them back'; return; } var r = M.undoFreshStart(); toast('Restored ' + PL.plural(r.attempts, 'result') + ' and your previous levels.', 'good'); go({ name: 'home' }); } }, 'Bring back the old results')) : null),
      h('section', { class: 'card' }, h('h3', null, 'Export'),
        h('p', { class: 'small' }, 'A versioned JSON file with every attempt, daily result, level and scratchpad. On iPhone, choose “Save to Files”.'),
        h('button', { class: 'btn', onclick: async function () {
          var data = JSON.stringify(M.exportData());
          var name = 'puzzle-lab-' + PL.dateKey() + '.json';
          try {
            var file = new File([data], name, { type: 'application/json' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Puzzle Lab backup' }); toast('Backup shared.', 'good'); return; }
          } catch (e) { if (e && e.name === 'AbortError') return; }
          exportOut.innerHTML = '';
          var out = h('textarea', { class: 'txt area mono', rows: 5, readonly: true }, data);
          exportOut.appendChild(h('div', null, h('p', { class: 'small' }, 'Copy this text and save it somewhere safe:'), out, h('button', { class: 'btn sm', onclick: function () { out.select(); try { navigator.clipboard.writeText(data).then(function () { toast('Copied.', 'good'); }, function () { toast('Select the text and copy it manually.', ''); }); } catch (e) { toast('Select the text and copy it manually.', ''); } } }, 'Copy')));
        } }, 'Export data'), exportOut),
      h('section', { class: 'card' }, h('h3', null, 'Restore or import'), h('p', { class: 'small' }, 'Pick a backup file, or one exported from the earlier Claude version of Puzzle Lab. Logic Lab history is kept for review; its puzzles are no longer offered.'), fileIn, ta, impMsg, impBtns),
      h('section', { class: 'card' }, h('h3', null, 'About'), h('p', { class: 'small muted' }, 'Puzzles are generated on the phone from seeds and checked before you see them: loop puzzles by an exhaustive solver, word bridges by shortest-path search, maths, balance and reverse puzzles by exact arithmetic and exhaustive search, and island rules by fixed tests. Word games use curated banks; The Island also uses WordNet (Princeton University) and the CMU Pronouncing Dictionary. Works offline. Data format version ' + PL.SCHEMA + '.')));
  }

  // test hooks (used by the automated browser tests)
  PL._cur = function () { return cur; };
  PL._go = function (sc) { go(sc); };
  PL._testFinish = function (o) { finish(o); };
  /* ---------- boot ---------- */
  PL.showUpdate = function (apply) {
    if (document.getElementById('upd')) return;
    var bar = h('div', { id: 'upd', class: 'update-bar', role: 'status' }, h('span', null, 'A new version of Puzzle Lab is ready.'), h('button', { class: 'btn sm primary', onclick: function () { if (cur && !cur.done) { tickNow(); persistRec(); } PL.store.flush(); apply(); } }, 'Update'));
    document.body.appendChild(bar);
  };
  PL.boot = async function () {
    root = document.getElementById('app');
    root.appendChild(h('div', { class: 'boot muted' }, 'Loading your puzzles…'));
    await PL.store.init();
    M.core();
    try { M.upgradeRecords(); } catch (e) { console.error(e); }
    render();
    PL.store.onChange(function (ev) { if (ev === 'error') toast('Saving failed on this device. Export a backup from Settings.', 'bad'); });
    M.pruneScratch();
  };
})();

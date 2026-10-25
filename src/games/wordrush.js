/* ===== GAME 15: WORD RUSH — find words in a letter grid =====
   Every word on the board is computed in advance by a depth-first search over the game dictionary with a prefix set,
   so scoring is exact and missed words can be listed afterwards. Timed (1–3 minutes) or untimed rounds. */
(function () {
  var h = PL.h;
  var PRE = null, WORDS = null;
  function lex() {
    if (WORDS) return;
    WORDS = new Set(); PRE = new Set();
    for (var L = 3; L <= 10; L++) PL.dict.words(L, ['A', 'B']).forEach(function (w) {
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
      var cand = { size: sp.size, letters: letters, words: words, common: common, total: common.reduce(function (s, w) { return s + points(w.length); }, 0), lv: lv };
      if (!best || common.length > best.common.length) best = cand;
      if (common.length >= sp.minWords * 0.7 && longest >= sp.minLong) { best = cand; break; }
    }
    best.frac = sp.frac;
    if (ctx && ctx.daily) { best.daily = true; best.fixedDur = 120; }
    return best;
  }
  function target(p, gs) {
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
    var tgt = target(p, gs), pts = score(gs);
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
        api.toast('+' + points(w.length) + ' ' + w.toUpperCase(), 'good'); api.update(gs);
      }
    });
    return h('div', { class: 'wordrush' },
      h('div', { class: 'wr-top' },
        h('div', null, h('span', { class: 'lbl' }, 'Score '), h('b', { class: 'big mono' }, String(pts)), h('span', { class: 'muted small' }, ' / target ' + tgt)),
        gs.mode === 'timed' ? h('div', null, h('span', { class: 'lbl' }, 'Left '), clock) : h('div', { class: 'muted small' }, 'Untimed')),
      h('div', { class: 'wr-bar' }, h('span', { style: { width: Math.min(100, Math.round(100 * pts / tgt)) + '%' } })),
      tr.el,
      api.done ? null : h('div', { class: 'row-actions' }, h('span', { class: 'muted small' }, PL.plural(gs.found.length, 'word') + ' found · about ' + (p.common || p.words).length + ' common words on the board'),
        h('button', { class: 'btn', onclick: function () { if (!this.dataset.armed) { this.dataset.armed = 1; this.textContent = 'Tap again to finish'; return; } api.finish('solved'); } }, 'Finish round')),
      h('div', { class: 'wr-found' }, gs.found.slice().reverse().map(function (w) { return h('span', { class: 'wchip' }, w.toUpperCase() + ' ' + points(w.length)); })));
  }
  /* Hints: a word you have not found — first its length and first two letters with the starting tile highlighted, then the word itself */
  function hint(p, gs) {
    if (!gs.mode) return { msg: 'Start a round first.', noCount: true };
    if (!gs.hintWord || gs.found.indexOf(gs.hintWord) >= 0) {
      var pool = p.common || p.words;
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
  function evaluate(p, gs, ctx) {
    var pts = score(gs), tgt = target(p, gs);
    var q = PL.clamp(Math.round(100 * pts / tgt) - ctx.hints * 6, 0, 100);
    var longest = gs.found.reduce(function (a, w) { return w.length > a.length ? w : a; }, '');
    return { quality: Math.round(q), metrics: { mode: gs.mode, dur: gs.dur, points: pts, target: tgt, words: gs.found.length, available: (p.common || p.words).length, availablePts: p.total, longest: longest, found: gs.found.slice() },
      lines: [['Points', pts + ' (target ' + tgt + ')'], ['Words found', gs.found.length + ' (board has ' + (p.common || p.words).length + ' common words)'], ['Longest word', longest ? longest.toUpperCase() : '—'], ['Mode', gs.mode === 'timed' ? 'Timed, ' + (gs.dur / 60) + ' min' : 'Untimed']] };
  }
  function review(p, gs) {
    var missed = (p.common || p.words).filter(function (w) { return gs.found.indexOf(w) < 0; });
    var g = h('div', { class: 'tr-grid small', style: { 'grid-template-columns': 'repeat(' + p.size + ', 1fr)' } }, p.letters.map(function (L) { return h('div', { class: 'tr-cell' }, h('span', null, L.length > 1 ? 'Qu' : L)); }));
    return h('div', { class: 'review' }, g,
      h('div', { class: 'lbl' }, 'You found (' + gs.found.length + ')'), h('p', { class: 'small' }, gs.found.map(function (w) { return w.toUpperCase(); }).join(', ') || '—'),
      h('div', { class: 'lbl' }, 'Common words you missed (' + missed.length + ')'), h('p', { class: 'small muted' }, missed.map(function (w) { return w.toUpperCase(); }).join(', ')));
  }
  function stats(atts) {
    var by = { timed: [], untimed: [] };
    atts.forEach(function (a) { if (a.metrics && by[a.metrics.mode]) by[a.metrics.mode].push(a); });
    var all = atts.filter(function (a) { return a.metrics && a.metrics.mode; });
    var longest = all.reduce(function (a, x) { return (x.metrics.longest || '').length > a.length ? x.metrics.longest : a; }, '');
    var uniq = new Set(); all.forEach(function (a) { (a.metrics.found || []).forEach(function (w) { uniq.add(w); }); });
    var rows = [['Rounds', all.length], ['Unique words found', uniq.size], ['Longest word ever', longest ? longest.toUpperCase() : '—'],
      ['Average share of words found', all.length ? Math.round(100 * PL.mean(all.map(function (a) { return a.metrics.words / Math.max(1, a.metrics.available); }))) + '%' : '—']];
    ['timed', 'untimed'].forEach(function (m) {
      var A = by[m]; if (!A.length) return;
      rows.push([m === 'timed' ? 'Timed rounds' : 'Untimed rounds', A.length + ' · avg ' + Math.round(PL.mean(A.map(function (a) { return a.metrics.points; }))) + ' pts · avg ' + Math.round(PL.mean(A.map(function (a) { return a.metrics.words; }))) + ' words']);
    });
    return rows;
  }
  PL.games.wordrush = {
    id: 'wordrush', name: 'Word Rush', blurb: 'Trace as many words as you can in a letter grid.',
    rules: 'Drag across touching letters, including diagonals, to spell words of three or more letters; release to submit. Each tile can be used once per word. Longer words score more. Play a timed round or untimed. Your score is compared with a target based on how many words the board holds.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv, daily) { return daily ? 1e9 : 180; }, timeLimit: function () { return 600; },
    _solve: solve, _points: points, _target: target, _firstCell: firstCell
  };
})();

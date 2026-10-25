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

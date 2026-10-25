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
    var n = ctx && ctx.daily ? 1 : 10;
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
        return h('tr', null, h('td', { class: 'mono' }, w.w), h('td', null, r.solved ? 'clue ' + r.shown : r.passed ? 'passed (+' + UNSOLVED + ')' : '—'), h('td', { class: 'muted' }, r.wrong ? r.wrong + ' wrong' : ''));
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
    return { quality: Math.round(q), metrics: { total: total, solved: solvedN, n: p.n, perWord: gs.res.map(function (r, k) { return { w: p.words[k].w, clues: r.shown, solved: r.solved, wrong: r.wrong }; }), firstClue: gs.res.filter(function (r) { return r.solved && r.shown === 1; }).length, avgClues: PL.mean(gs.res.filter(function (r) { return r.solved; }).map(function (r) { return r.shown; })) },
      lines: [['Total clues', total + (p.n > 1 ? ' (lower is better)' : '')], ['Words solved', solvedN + '/' + p.n], ['Wrong guesses', gs.res.reduce(function (a, r) { return a + r.wrong; }, 0)]] };
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
    benchmark: function (lv, daily) { return daily ? 45 + lv * 6 : 400 + lv * 30; }, timeLimit: function (lv) { return 600; },
    _matches: matches
  };
})();

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

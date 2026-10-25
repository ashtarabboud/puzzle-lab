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
    return BANK;
  }
  var NUM = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, midnight: 12, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 };
  function norm(s) {
    var raw = String(s || ''); s = raw.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2');
    s = s.replace(/\b(a|an|the|some|my|your|their|his|her|it|to|of)\b/g, ' ').replace(/\b[a-z]+\b/g, function (w) { return NUM[w] != null ? String(NUM[w]) : w; });
    s = s.replace(/\s+/g, ' ').trim();
    return s || raw.toLowerCase().replace(/[^a-z0-9]/g, ''); // answers like "A" (a vitamin) or "Her" are only stop words
  }
  function sing(w) { // light stemming: plurals, -ing, -ed
    w = w.replace(/ies$/, 'y').replace(/(ch|sh|x|ss)es$/, '$1').replace(/([^s])s$/, '$1');
    if (w.length > 5) w = w.replace(/ing$/, '');
    if (w.length > 4) w = w.replace(/ed$/, '');
    return w.replace(/(.)\1$/, '$1');
  }
  function lev(a, b) { var m = [], i, j; for (i = 0; i <= a.length; i++) { m[i] = [i]; } for (j = 0; j <= b.length; j++) m[0][j] = j; for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; }
  function matchScore(guess, ans) {
    var g = norm(guess), a = norm(ans); if (!g || !a) return 0;
    var gs = g.split(' ').map(sing).join(' '), as = a.split(' ').map(sing).join(' ');
    if (gs === as || gs.replace(/ /g, '') === as.replace(/ /g, '')) return 3;           // "r2d2" ~ "R2 D2"
    var gw = gs.split(' '), aw = as.split(' ');
    if (aw.length === 1 && /^\d+$/.test(aw[0])) return gw.indexOf(aw[0]) >= 0 ? 2 : 0;  // "10 pm" ~ "10"; numbers need the exact number
    function inside(x, y) { return x.every(function (w) { return y.indexOf(w) >= 0; }); }
    if (gw.length >= 2 && aw.length > gw.length && inside(gw, aw) && gs.length >= 6) return 2; // "price tag" ~ "remove price tag"
    if (aw.length >= 2 && gw.length > aw.length && gw.length <= aw.length + 2 && inside(aw, gw)) return 2; // "take a bubble bath" ~ "bubble bath"
    if (aw.length === 1 && gw.indexOf(aw[0]) >= 0 && aw[0].length >= 3) return 2;     // "a big pumpkin" ~ "pumpkin"
    if (gw.length === 1 && aw.indexOf(gw[0]) >= 0 && gw[0].length >= 4) return 2;     // "breakfast" ~ "have breakfast"
    var d = lev(gs, as); if ((as.length >= 5 && d <= 1) || (as.length >= 8 && d <= 2)) return 1; // typos
    return 0;
  }
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
    if (B.ff.length && !(B.pq.length && rng() < 0.1)) {
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
  function bestMatch(p, gs, guess) {
    var best = -1, bs = 0;
    p.board.forEach(function (c, i) {
      var s = Math.max.apply(null, [c.label].concat(c.answers).map(function (a) { return matchScore(guess, a); }));
      if (s === 3 && matchScore(guess, c.label) === 3) s = 3.5; // the slot's own wording beats a shared alternative ("Touch" vs "Kiss/Touch")
      if (s > bs || (s === bs && s > 0 && c.n > p.board[best].n)) { bs = s; best = i; }
    });
    return bs > 0 ? best : -1;
  }
  function points(p, gs) { return p.board.reduce(function (s, c, i) { return s + (gs.open[i] && !gs.given[i] ? c.n : 0); }, 0); }
  function boardTotal(p) { return p.board.reduce(function (s, c) { return s + c.n; }, 0); }
  function over(p, gs) { return gs.strikes >= p.strikes || gs.open.every(Boolean); }
  function view(api) {
    var p = api.p, gs = api.gs;
    var inp = h('input', { id: 'sv-in', class: 'txt', type: 'text', autocomplete: 'off', autocapitalize: 'none', placeholder: 'Your answer', enterkeyhint: 'go' });
    function guess(e) {
      e.preventDefault(); var g = inp.value.trim(); if (!g) return;
      if (gs.guesses.some(function (x) { return norm(x.g) === norm(g); })) { api.toast('Already tried.', ''); return; }
      var i = bestMatch(p, gs, g);
      if (i >= 0 && gs.open[i]) { api.toast('That matches an answer already on the board.', ''); return; }
      if (i >= 0) { gs.open[i] = true; gs.guesses.push({ g: g, hit: i }); api.toast('Survey says: ' + p.board[i].n + '!', 'good'); }
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
        return h('li', { class: 'sv-slot' + (gs.open[i] ? ' open' : showAll ? ' missed' : '') + (gs.given[i] ? ' given' : '') },
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
      ['Questions seen', new Set(A.map(function (a) { return a.metrics.qid; })).size + ' of ' + bank().all.length.toLocaleString('en-US')]];
  }
  PL.games.survey = {
    id: 'survey', name: 'Survey Says', blurb: 'Guess what most people answered in a real survey.',
    rules: 'Each question was put to about 100 people. Name the answers on the board; similar wordings and small typos are accepted. Three wrong guesses end the round. Points are the number of people who gave each answer. Most questions come from the Family Feud question database you supplied (counts exactly as listed there); some come from the ProtoQA survey (CC BY 4.0).',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 60 + lv * 10; }, timeLimit: function () { return 240; },
    _match: bestMatch, _norm: norm, _bank: bank, _score: matchScore
  };
})();

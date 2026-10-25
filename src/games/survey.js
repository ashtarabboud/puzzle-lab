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
  function bestMatch(p, gs, guess) { var r = SM.match(p.board, guess); return r.i; }
  function matchInfo(p, guess) { return SM.match(p.board, guess); }
  function points(p, gs) { return p.board.reduce(function (s, c, i) { return s + (gs.open[i] && !gs.given[i] ? c.n : 0); }, 0); }
  function boardTotal(p) { return p.board.reduce(function (s, c) { return s + c.n; }, 0); }
  function over(p, gs) { return gs.strikes >= p.strikes || gs.open.every(Boolean); }
  function view(api) {
    var p = api.p, gs = api.gs;
    var inp = h('input', { id: 'sv-in', class: 'txt', type: 'text', autocomplete: 'off', autocapitalize: 'none', placeholder: 'Your answer', enterkeyhint: 'go' });
    function guess(e) {
      e.preventDefault(); var g = inp.value.trim(); if (!g) return;
      if (gs.guesses.some(function (x) { return norm(x.g) === norm(g); })) { api.toast('Already tried.', ''); return; }
      var m = matchInfo(p, g), i = m.i;
      if (m.ambiguous) { api.toast('“' + g + '” could mean more than one answer. Try being more specific.', ''); return; } // no strike
      if (i >= 0 && gs.open[i]) { api.toast('That matches “' + PL.cap(p.board[i].label) + '”, already on the board.', ''); return; }
      if (i >= 0) { gs.open[i] = true; gs.last = i; gs.guesses.push({ g: g, hit: i }); api.toast('Survey says: ' + p.board[i].n + '!' + (m.level < 4 && norm(g) !== norm(p.board[i].label) ? ' (accepted as “' + PL.cap(p.board[i].label) + '”)' : ''), 'good'); if (PL.fx) PL.fx.good(); }
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

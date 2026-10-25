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

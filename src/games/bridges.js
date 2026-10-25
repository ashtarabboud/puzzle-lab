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

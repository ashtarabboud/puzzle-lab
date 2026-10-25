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

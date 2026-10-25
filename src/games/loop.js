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

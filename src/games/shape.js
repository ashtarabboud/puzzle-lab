/* ===== GAME 8: SHAPE SHIFT (polyomino silhouettes) ===== */
(function () {
  var h = PL.h;
  var COLORS = 8;
  function norm(cells) {
    var mr = Infinity, mc = Infinity;
    cells.forEach(function (x) { mr = Math.min(mr, x[0]); mc = Math.min(mc, x[1]); });
    return cells.map(function (x) { return [x[0] - mr, x[1] - mc]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  }
  function rot(cells) { return norm(cells.map(function (x) { return [x[1], -x[0]]; })); }
  function flip(cells) { return norm(cells.map(function (x) { return [x[0], -x[1]]; })); }
  function key(cells) { return cells.map(function (x) { return x[0] + ',' + x[1]; }).join(';'); }
  function orientations(cells, allowFlip) {
    var out = [], seen = {}, c = norm(cells);
    for (var f = 0; f < (allowFlip ? 2 : 1); f++) {
      for (var r = 0; r < 4; r++) { var k = key(c); if (!seen[k]) { seen[k] = 1; out.push(c); } c = rot(c); }
      c = flip(c);
    }
    return out;
  }

  function spec(lv) {
    return [null,
      { W: 4, H: 4, n: 3, size: [3, 4] },
      { W: 4, H: 4, n: 4, size: [3, 4] },
      { W: 5, H: 5, n: 4, size: [3, 5] },
      { W: 5, H: 5, n: 5, size: [3, 5], blocks: 1 },
      { W: 6, H: 5, n: 5, size: [4, 5], lock: 1 },
      { W: 6, H: 6, n: 6, size: [4, 5], blocks: 2, noflip: true },
      { W: 6, H: 6, n: 7, size: [4, 5], lock: 2, minMoves: true },
      { W: 7, H: 6, n: 7, size: [4, 5], blocks: 2, lock: 1, noflip: true },
      { W: 7, H: 7, n: 8, size: [4, 5], lock: 2, minMoves: true },
      { W: 7, H: 7, n: 9, size: [4, 5], blocks: 2, lock: 2, noflip: true, minMoves: true }][PL.clamp(lv, 1, 10)];
  }
  function nb(i, W, H) { var r = Math.floor(i / W), c = i % W, o = []; if (r > 0) o.push(i - W); if (r < H - 1) o.push(i + W); if (c > 0) o.push(i - 1); if (c < W - 1) o.push(i + 1); return o; }

  function generate(level, rng) {
    var sp = spec(level), W = sp.W, H = sp.H;
    for (var tries = 0; tries < 400; tries++) {
      var sizes = []; for (var i = 0; i < sp.n; i++) sizes.push(rng.int(sp.size[0], sp.size[1]));
      var total = sizes.reduce(function (a, b) { return a + b; }, 0);
      if (total > W * H - 1) continue;
      // grow pieces one at a time, each attached to the existing shape
      var owner = []; for (i = 0; i < W * H; i++) owner.push(-1);
      var ok = true;
      for (var p = 0; p < sp.n && ok; p++) {
        var start;
        if (p === 0) start = rng.int(0, W * H - 1);
        else {
          var front = []; for (i = 0; i < W * H; i++) if (owner[i] >= 0) nb(i, W, H).forEach(function (y) { if (owner[y] < 0) front.push(y); });
          if (!front.length) { ok = false; break; }
          start = rng.pick(front);
        }
        owner[start] = p; var cells = [start];
        while (cells.length < sizes[p]) {
          var fr = []; cells.forEach(function (x) { nb(x, W, H).forEach(function (y) { if (owner[y] < 0) fr.push(y); }); });
          if (!fr.length) { ok = false; break; }
          var y = rng.pick(fr); owner[y] = p; cells.push(y);
        }
      }
      if (!ok) continue;
      // trim frame to the bounding box of the shape
      var rs = [], cs = []; owner.forEach(function (o, i) { if (o >= 0) { rs.push(Math.floor(i / W)); cs.push(i % W); } });
      var r0 = Math.min.apply(null, rs), c0 = Math.min.apply(null, cs), r1 = Math.max.apply(null, rs), c1 = Math.max.apply(null, cs);
      var w = c1 - c0 + 1, hh = r1 - r0 + 1;
      if (w < 3 || hh < 3) continue;
      var target = [], pieces = [];
      for (p = 0; p < sp.n; p++) pieces.push({ cells: [], sol: null });
      for (var r = r0; r <= r1; r++) for (var c = c0; c <= c1; c++) { var o = owner[r * W + c]; if (o >= 0) { target.push([r - r0, c - c0]); pieces[o].cells.push([r - r0, c - c0]); } }
      // reject pieces that are identical shapes to keep the puzzle legible (allow one duplicate at high levels)
      var keys = pieces.map(function (pc) { return orientations(pc.cells, !sp.noflip).map(key).sort()[0]; });
      var dup = keys.length - new Set(keys).size;
      if (dup > (level >= 7 ? 1 : 0)) continue;
      // fixed blocks: pre-placed pieces (restricted placement)
      var fixed = [];
      var order = rng.shuffle(pieces.map(function (_, i) { return i; }));
      for (var b = 0; b < (sp.blocks || 0); b++) fixed.push(order[b]);
      var locked = [];
      for (var l = 0; l < (sp.lock || 0); l++) { var li = order[(sp.blocks || 0) + l]; if (li != null) locked.push(li); }
      var out = { w: w, h: hh, target: target, noflip: !!sp.noflip, minMoves: !!sp.minMoves, pieces: [] };
      pieces.forEach(function (pc, i) {
        var minr = Math.min.apply(null, pc.cells.map(function (x) { return x[0]; })), minc = Math.min.apply(null, pc.cells.map(function (x) { return x[1]; }));
        var solCells = norm(pc.cells);
        var isFixed = fixed.indexOf(i) >= 0, isLocked = locked.indexOf(i) >= 0;
        // start orientation: random (if rotation allowed), the locked ones keep the solution orientation
        var start = solCells;
        if (!isFixed && !isLocked) { var os = orientations(solCells, !sp.noflip); start = os[rng.int(0, os.length - 1)]; }
        out.pieces.push({ id: i, color: i % COLORS, start: start, sol: { cells: solCells, r: minr, c: minc }, fixed: isFixed, locked: isLocked });
      });
      out.pieces = rng.shuffle(out.pieces);
      out.target_moves = out.pieces.filter(function (pc) { return !pc.fixed; }).length;
      if (!verify(out)) continue;
      return out;
    }
    throw new Error('shape generation failed');
  }
  function verify(p) { // the stored solution must exactly tile the target with no overlaps, using allowed orientations
    var cover = {};
    p.target.forEach(function (x) { cover[x[0] + ',' + x[1]] = 0; });
    for (var i = 0; i < p.pieces.length; i++) {
      var pc = p.pieces[i];
      var allowed = pc.locked || pc.fixed ? [pc.start] : orientations(pc.start, !p.noflip);
      if (!allowed.some(function (o) { return key(o) === key(pc.sol.cells); })) return false;
      for (var j = 0; j < pc.sol.cells.length; j++) {
        var k = (pc.sol.cells[j][0] + pc.sol.r) + ',' + (pc.sol.cells[j][1] + pc.sol.c);
        if (cover[k] !== 0) return false; cover[k] = 1;
      }
    }
    for (var kk in cover) if (cover[kk] !== 1) return false;
    return true;
  }

  function init(p) {
    return { pcs: p.pieces.map(function (pc) { return { id: pc.id, cells: pc.start, at: pc.fixed ? { r: pc.sol.r, c: pc.sol.c } : null }; }), sel: null, moves: 0, rots: 0, hist: [] };
  }
  function pdef(p, id) { for (var i = 0; i < p.pieces.length; i++) if (p.pieces[i].id === id) return p.pieces[i]; }
  function occupancy(p, gs, exceptId) {
    var occ = {};
    gs.pcs.forEach(function (s) { if (!s.at || s.id === exceptId) return; s.cells.forEach(function (x) { occ[(x[0] + s.at.r) + ',' + (x[1] + s.at.c)] = s.id; }); });
    return occ;
  }
  function canPlace(p, gs, s, r, c) {
    var tgt = {}; p.target.forEach(function (x) { tgt[x[0] + ',' + x[1]] = 1; });
    var occ = occupancy(p, gs, s.id);
    return s.cells.every(function (x) { var k = (x[0] + r) + ',' + (x[1] + c); return tgt[k] && occ[k] == null; });
  }
  function solvedState(p, gs) {
    var occ = occupancy(p, gs, null);
    return p.target.every(function (x) { return occ[x[0] + ',' + x[1]] != null; }) && gs.pcs.every(function (s) { return s.at; });
  }

  function view(api) {
    var p = api.p, gs = api.gs;
    var cell = Math.floor(Math.min(46, 320 / Math.max(p.w, 5)));
    var mini = Math.max(14, Math.floor(cell * 0.5));
    var tgt = {}; p.target.forEach(function (x) { tgt[x[0] + ',' + x[1]] = 1; });
    var root = h('div', { class: 'shape' });
    var board = h('div', { class: 'sh-board', style: { width: (p.w * cell) + 'px', height: (p.h * cell) + 'px', '--cell': cell + 'px' } });
    for (var r = 0; r < p.h; r++) for (var c = 0; c < p.w; c++) if (tgt[r + ',' + c]) board.appendChild(h('div', { class: 'sh-t', style: { left: (c * cell) + 'px', top: (r * cell) + 'px', width: cell + 'px', height: cell + 'px' } }));
    function pieceEl(s, size, onBoard) {
      var def = pdef(p, s.id);
      var mr = 0, mc = 0; s.cells.forEach(function (x) { mr = Math.max(mr, x[0]); mc = Math.max(mc, x[1]); });
      var el = h('div', { class: 'sh-piece c' + def.color + (def.fixed ? ' fixed' : '') + (def.locked ? ' locked' : '') + (gs.sel === s.id ? ' sel' : ''), style: { width: ((mc + 1) * size) + 'px', height: ((mr + 1) * size) + 'px' }, 'data-id': s.id, role: 'button', 'aria-label': 'Piece ' + (s.id + 1) + (def.locked ? ', rotation locked' : '') });
      s.cells.forEach(function (x) { el.appendChild(h('div', { class: 'sh-c', style: { left: (x[1] * size) + 'px', top: (x[0] * size) + 'px', width: size + 'px', height: size + 'px' } })); });
      if (def.locked && !def.fixed) el.appendChild(h('span', { class: 'sh-lock', 'aria-hidden': 'true' }, '⌀'));
      if (onBoard) { el.style.left = (s.at.c * cell) + 'px'; el.style.top = (s.at.r * cell) + 'px'; el.style.position = 'absolute'; }
      if (!def.fixed && !api.done) attachDrag(el, s, size);
      return el;
    }
    gs.pcs.forEach(function (s) { if (s.at) board.appendChild(pieceEl(s, cell, true)); });
    var tray = h('div', { class: 'sh-tray' });
    gs.pcs.forEach(function (s) { if (!s.at) tray.appendChild(h('div', { class: 'sh-slot' }, pieceEl(s, mini, false))); });

    function attachDrag(el, s, size) {
      el.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        var startX = ev.clientX, startY = ev.clientY, moved = false, ghost = null;
        var rect = el.getBoundingClientRect();
        // grab offset in cells (relative to piece origin) at board scale
        var gx = (ev.clientX - rect.left) / size, gy = (ev.clientY - rect.top) / size;
        var gcell = [Math.floor(gy), Math.floor(gx)];
        try { el.setPointerCapture(ev.pointerId); } catch (e) { }
        function move(e2) {
          if (!moved && Math.hypot(e2.clientX - startX, e2.clientY - startY) < 6) return;
          if (!moved) {
            moved = true;
            ghost = pieceElStatic(s, cell); ghost.classList.add('ghost');
            document.body.appendChild(ghost);
            el.style.opacity = '0.25';
          }
          ghost.style.left = (e2.clientX - (gcell[1] + 0.5) * cell) + 'px';
          ghost.style.top = (e2.clientY - (gcell[0] + 0.5) * cell) + 'px';
        }
        function up(e2) {
          el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
          if (ghost) ghost.remove();
          if (!moved) { gs.sel = gs.sel === s.id ? null : s.id; api.update(gs); return; }
          var br = board.getBoundingClientRect();
          var cx = (e2.clientX - br.left) / cell - (gcell[1] + 0.5), cy = (e2.clientY - br.top) / cell - (gcell[0] + 0.5);
          var rr = Math.round(cy), cc = Math.round(cx);
          var inside = e2.clientX >= br.left - cell && e2.clientX <= br.right + cell && e2.clientY >= br.top - cell && e2.clientY <= br.bottom + cell;
          var prev = s.at ? { r: s.at.r, c: s.at.c } : null;
          if (inside && canPlace(p, gs, s, rr, cc)) {
            if (!prev || prev.r !== rr || prev.c !== cc) { gs.hist.push({ id: s.id, at: prev, cells: s.cells }); s.at = { r: rr, c: cc }; gs.moves++; }
          } else if (!inside && prev) { gs.hist.push({ id: s.id, at: prev, cells: s.cells }); s.at = null; }
          else if (inside) api.toast('It doesn’t fit there.', '');
          gs.sel = s.id;
          api.update(gs);
          if (solvedState(p, gs)) api.finish('solved');
        }
        el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      });
    }
    function pieceElStatic(s, size) {
      var def = pdef(p, s.id), el = h('div', { class: 'sh-piece c' + def.color });
      s.cells.forEach(function (x) { el.appendChild(h('div', { class: 'sh-c', style: { left: (x[1] * size) + 'px', top: (x[0] * size) + 'px', width: size + 'px', height: size + 'px' } })); });
      el.style.position = 'fixed'; el.style.pointerEvents = 'none'; el.style.zIndex = 50;
      return el;
    }
    var selS = gs.pcs.filter(function (s) { return s.id === gs.sel; })[0], selDef = selS ? pdef(p, selS.id) : null;
    function transform(fn) {
      if (!selS || selDef.locked || selDef.fixed) return;
      var nc = fn(selS.cells);
      gs.hist.push({ id: selS.id, at: selS.at ? { r: selS.at.r, c: selS.at.c } : null, cells: selS.cells });
      selS.cells = nc; gs.rots++;
      if (selS.at && !canPlace(p, gs, selS, selS.at.r, selS.at.c)) selS.at = null; // pops back to tray
      api.update(gs);
    }
    var controls = api.done ? null : h('div', { class: 'row-actions' },
      h('button', { class: 'btn sm', disabled: !selS || selDef.locked || selDef.fixed, onclick: function () { transform(rot); } }, 'Rotate'),
      p.noflip ? null : h('button', { class: 'btn sm', disabled: !selS || selDef.locked || selDef.fixed, onclick: function () { transform(flip); } }, 'Flip'),
      h('button', { class: 'btn ghost sm', disabled: !gs.hist.length, onclick: function () { var u = gs.hist.pop(); var s = gs.pcs.filter(function (x) { return x.id === u.id; })[0]; s.at = u.at; s.cells = u.cells; api.update(gs); } }, 'Undo'),
      h('button', { class: 'btn ghost sm', onclick: function () { gs.pcs.forEach(function (s) { var d = pdef(p, s.id); if (!d.fixed) { s.at = null; s.cells = d.start; } }); gs.hist = []; gs.sel = null; api.update(gs); } }, 'Reset'));
    var notes = [];
    if (p.pieces.some(function (pc) { return pc.fixed; })) notes.push('Grey pieces are fixed in place.');
    if (p.pieces.some(function (pc) { return pc.locked && !pc.fixed; })) notes.push('Pieces marked ⌀ cannot be rotated or flipped.');
    if (p.noflip) notes.push('No flipping in this puzzle.');
    if (p.minMoves) notes.push('Move challenge: place each piece once. Target: ' + p.target_moves + ' placements (you have made ' + gs.moves + ').');
    return h('div', { class: 'shape' },
      h('div', { class: 'muted small' }, 'Drag pieces into the outline so it is completely filled with no overlaps. Tap a piece to select it, then rotate' + (p.noflip ? '' : ' or flip') + '. Drag a placed piece off the board to return it.'),
      notes.length ? h('div', { class: 'rules-box' }, notes.map(function (n) { return h('div', null, n); })) : null,
      h('div', { class: 'sh-boardwrap' }, board),
      controls, h('div', { class: 'lbl' }, 'Pieces'), tray.childNodes.length ? tray : h('div', { class: 'muted small' }, 'All pieces placed.'));
  }
  function hint(p, gs) {
    // place one unplaced or misplaced piece in its verified solution position
    var occSol = {};
    for (var i = 0; i < gs.pcs.length; i++) {
      var s = gs.pcs[i], d = pdef(p, s.id);
      if (d.fixed) continue;
      var correct = s.at && s.at.r === d.sol.r && s.at.c === d.sol.c && key(s.cells) === key(d.sol.cells);
      if (correct) continue;
      // clear anything overlapping the solution footprint
      var foot = {}; d.sol.cells.forEach(function (x) { foot[(x[0] + d.sol.r) + ',' + (x[1] + d.sol.c)] = 1; });
      gs.pcs.forEach(function (o) {
        if (o.id === s.id || !o.at) return;
        if (o.cells.some(function (x) { return foot[(x[0] + o.at.r) + ',' + (x[1] + o.at.c)]; })) o.at = null;
      });
      s.cells = d.sol.cells; s.at = { r: d.sol.r, c: d.sol.c };
      gs.hist = [];
      return { msg: 'One piece has been placed in its solution position.', gs: gs, after: solvedState(p, gs) ? 'solved' : null };
    }
    return { msg: 'Every piece is already where the reference solution puts it.', noCount: true };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var excess = Math.max(0, gs.moves - p.target_moves);
    var q = solved ? PL.clamp(100 - ctx.hints * 18 - excess * (p.minMoves ? 6 : 2), 15, 100) : Math.round(20 * gs.pcs.filter(function (s) { return s.at; }).length / gs.pcs.length);
    return { quality: Math.round(q), metrics: { pieces: p.pieces.length, moves: gs.moves, target: p.target_moves, excess: excess, minMoves: p.minMoves, rotations: gs.rots },
      lines: [['Pieces', p.pieces.length], ['Placements', gs.moves + ' (target ' + p.target_moves + ')'], ['Rotations and flips', gs.rots]] };
  }
  function review(p, gs) {
    var cell = Math.floor(Math.min(34, 260 / p.w));
    var board = h('div', { class: 'sh-board', style: { width: (p.w * cell) + 'px', height: (p.h * cell) + 'px' } });
    p.pieces.forEach(function (pc) { pc.sol.cells.forEach(function (x) { board.appendChild(h('div', { class: 'sh-c c' + pc.color + (pc.fixed ? ' fixed' : ''), style: { position: 'absolute', left: ((x[1] + pc.sol.c) * cell) + 'px', top: ((x[0] + pc.sol.r) * cell) + 'px', width: cell + 'px', height: cell + 'px' } })); }); });
    return h('div', { class: 'review' }, h('div', { class: 'lbl' }, 'A verified solution'), h('div', { class: 'sh-boardwrap' }, board),
      h('p', { class: 'muted small' }, 'Any arrangement that fills the outline exactly is accepted; this is the one the puzzle was built from. Placements: ' + gs.moves + ' (target ' + p.target_moves + ').'));
  }
  function stats(atts) {
    var s = atts.filter(function (a) { return a.outcome === 'solved'; });
    return [['Completion rate', atts.length ? Math.round(100 * s.length / atts.length) + '%' : '—'],
      ['Average excess placements', s.length ? PL.mean(s.map(function (a) { return a.metrics.excess; })).toFixed(1) : '—'],
      ['Move-target hit rate', s.length ? Math.round(100 * s.filter(function (a) { return a.metrics.excess === 0; }).length / s.length) + '%' : '—'],
      ['Average pieces per puzzle', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.pieces; })).toFixed(1) : '—']];
  }
  PL.games.shape = {
    id: 'shape', name: 'Shape Shift', blurb: 'Fill the outline exactly with the given pieces.',
    rules: 'Drag every piece into the outline so it is completely covered with no gaps or overlaps. Tap a piece to select it, then rotate or flip it where allowed. Some puzzles fix pieces in place, lock rotation, or set a placement target.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 60 + lv * 25; }, timeLimit: function (lv) { return 120 + lv * 30; },
    _verify: verify, _canPlace: canPlace, _solved: solvedState
  };
})();

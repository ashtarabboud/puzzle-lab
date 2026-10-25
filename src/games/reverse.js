/* ===== GAME 9: REVERSE ENGINEER =====
   Work backward from a final state. Six variations, every one checked by exhaustive search:
   num (numeric chain, unique start), seq (rearranged sequence), grid (moved board), missing (missing operations),
   multi (several possible starts / which fact makes it unique), constraint (several machines, one hidden start). */
(function () {
  var h = PL.h;

  /* ---------- numeric operations ---------- */
  function digitsOf(x) { return String(x).split('').map(Number); }
  var NUM_OPS = {
    add: { lossy: false, txt: function (k) { return 'add ' + k; }, f: function (x, k) { return x + k; } },
    sub: { lossy: false, txt: function (k) { return 'subtract ' + k; }, f: function (x, k) { return x - k > 0 ? x - k : null; } },
    mul: { lossy: false, txt: function (k) { return 'multiply by ' + k; }, f: function (x, k) { return x * k; } },
    div: { lossy: false, txt: function (k) { return 'divide by ' + k + ' (it divides exactly)'; }, f: function (x, k) { return x % k === 0 ? x / k : null; } },
    sq: { lossy: false, txt: function () { return 'square it'; }, f: function (x) { return x * x <= 1e7 ? x * x : null; } },
    rev: { lossy: true, txt: function () { return 'reverse its digits (a leading zero is dropped)'; }, f: function (x) { return parseInt(String(x).split('').reverse().join(''), 10) || null; } },
    dsum: { lossy: true, txt: function () { return 'replace it with the sum of its digits'; }, f: function (x) { return digitsOf(x).reduce(function (a, b) { return a + b; }, 0); } },
    addds: { lossy: true, txt: function () { return 'add the sum of its own digits'; }, f: function (x) { return x + digitsOf(x).reduce(function (a, b) { return a + b; }, 0); } },
    droplast: { lossy: true, txt: function () { return 'delete its last digit'; }, f: function (x) { return x >= 10 ? Math.floor(x / 10) : null; } },
    half: { lossy: true, txt: function () { return 'halve it, rounding down'; }, f: function (x) { return Math.floor(x / 2) || null; } },
    mod: { lossy: true, txt: function (k) { return 'keep only the remainder after dividing by ' + k + ', then add ' + k; }, f: function (x, k) { return (x % k) + k; } },
    swapends: { lossy: true, txt: function () { return 'swap its first and last digits'; }, f: function (x) { var s = String(x); if (s.length < 2) return x; var t = s[s.length - 1] + s.slice(1, -1) + s[0]; return t[0] === '0' ? null : parseInt(t, 10); } }
  };
  function runChain(x, ops, trace) {
    var v = x; if (trace) trace.push(v);
    for (var i = 0; i < ops.length; i++) { v = NUM_OPS[ops[i].t].f(v, ops[i].k); if (v == null || v <= 0 || v > 1e7) return null; if (trace) trace.push(v); }
    return v;
  }
  function chainText(ops) { return ops.map(function (o) { return NUM_OPS[o.t].txt(o.k); }); }
  function randNumOp(rng, lv, allowLossy) {
    var pool = ['add', 'sub', 'mul', 'div'];
    if (lv >= 3) pool.push('rev', 'sq');
    if (allowLossy && lv >= 4) pool.push('addds', 'swapends');
    if (allowLossy && lv >= 6) pool.push('droplast', 'half', 'dsum', 'mod');
    var t = rng.pick(pool), k = null;
    if (t === 'add' || t === 'sub') k = rng.int(2, lv >= 5 ? 60 : 20);
    if (t === 'mul') k = rng.int(2, lv >= 6 ? 9 : 5);
    if (t === 'div') k = rng.pick([2, 3, 4, 5, 6]);
    if (t === 'mod') k = rng.pick([5, 7, 9, 11]);
    return { t: t, k: k };
  }
  function domainFor(lv) { return lv <= 2 ? [1, 99] : lv <= 5 ? [10, 500] : [10, 999]; }
  function startsFor(ops, final, dom) { var out = []; for (var x = dom[0]; x <= dom[1]; x++) if (runChain(x, ops) === final) out.push(x); return out; }

  function genNum(lv, rng) {
    var nOps = PL.clamp(1 + Math.ceil(lv / 2), 2, 6), dom = domainFor(lv);
    for (var t = 0; t < 300; t++) {
      var x = rng.int(dom[0], dom[1]), ops = [];
      for (var i = 0; i < nOps; i++) ops.push(randNumOp(rng, lv, lv >= 5));
      // reject trivial chains (all add/sub) at higher levels
      if (lv >= 4 && ops.every(function (o) { return o.t === 'add' || o.t === 'sub'; })) continue;
      var trace = [], fin = runChain(x, ops, trace); if (fin == null) continue;
      var starts = startsFor(ops, fin, dom);
      if (starts.length !== 1) continue;
      return { type: 'num', dom: dom, ops: ops, steps: chainText(ops), final: fin, answer: x, trace: trace,
        intro: 'A secret starting number between ' + dom[0] + ' and ' + dom[1] + ' went through these steps in order. Every number along the way was a whole number above zero.', ask: 'What was the starting number?' };
    }
    return null;
  }
  function genMulti(lv, rng) {
    var dom = lv <= 6 ? [10, 99] : [10, 999];
    for (var t = 0; t < 400; t++) {
      var nOps = lv <= 6 ? 2 : 3, ops = [];
      for (var i = 0; i < nOps; i++) ops.push(randNumOp(rng, Math.max(lv, 6), true));
      if (!ops.some(function (o) { return NUM_OPS[o.t].lossy; })) continue;
      var x = rng.int(dom[0], dom[1]), fin = runChain(x, ops); if (fin == null) continue;
      var starts = startsFor(ops, fin, dom);
      if (starts.length < 2 || starts.length > 6) continue;
      if (lv >= 8 && rng.chance(0.5)) {
        // which extra fact makes the start unique?
        var facts = [
          { t: 'It was even.', f: function (v) { return v % 2 === 0; } }, { t: 'It was odd.', f: function (v) { return v % 2 === 1; } },
          { t: 'It was a multiple of 3.', f: function (v) { return v % 3 === 0; } }, { t: 'It was a multiple of 5.', f: function (v) { return v % 5 === 0; } },
          { t: 'It was greater than ' + starts[Math.floor(starts.length / 2)] + '.', f: (function (m) { return function (v) { return v > m; }; })(starts[Math.floor(starts.length / 2)]) },
          { t: 'It was less than ' + starts[1] + '.', f: (function (m) { return function (v) { return v < m; }; })(starts[1]) },
          { t: 'Its digits were all different.', f: function (v) { var d = String(v); return new Set(d).size === d.length; } },
          { t: 'Its last digit was ' + (starts[0] % 10) + '.', f: (function (m) { return function (v) { return v % 10 === m; }; })(starts[0] % 10) }
        ];
        var good = facts.filter(function (fc) { return starts.filter(fc.f).length === 1; }), bad = facts.filter(function (fc) { return starts.filter(fc.f).length !== 1; });
        if (!good.length || bad.length < 3) continue;
        var g = rng.pick(good), opts = rng.shuffle([g].concat(rng.shuffle(bad).slice(0, 3)));
        return { type: 'multi', mode: 'fact', dom: dom, ops: ops, steps: chainText(ops), final: fin, starts: starts, options: opts.map(function (o) { return o.t; }), answer: opts.indexOf(g), unique: starts.filter(g.f)[0],
          intro: 'A starting number between ' + dom[0] + ' and ' + dom[1] + ' went through these steps. Several different starting numbers could give this result.', ask: 'Which single extra fact would pin the starting number down to exactly one possibility?' };
      }
      return { type: 'multi', mode: 'list', dom: dom, ops: ops, steps: chainText(ops), final: fin, starts: starts, answer: starts,
        intro: 'A starting number between ' + dom[0] + ' and ' + dom[1] + ' went through these steps. More than one starting number might work.', ask: 'Enter every possible starting number, separated by commas.' };
    }
    return null;
  }
  function genConstraint(lv, rng) {
    var dom = lv <= 5 ? [10, 99] : [100, 999];
    for (var t = 0; t < 400; t++) {
      var x = rng.int(dom[0], dom[1]), nm = lv >= 8 ? 3 : 2, machines = [];
      for (var m = 0; m < nm; m++) { var ops = [randNumOp(rng, 8, true)]; if (lv >= 6) ops.push(randNumOp(rng, 6, true)); machines.push(ops); }
      if (!machines.every(function (ops) { return ops.some(function (o) { return NUM_OPS[o.t].lossy; }); })) continue;
      var outs = machines.map(function (ops) { return runChain(x, ops); }); if (outs.some(function (v) { return v == null; })) continue;
      var sets = machines.map(function (ops, i) { return startsFor(ops, outs[i], dom); });
      if (sets.some(function (s) { return s.length < 2; })) continue; // each machine alone must be ambiguous
      var all = sets.reduce(function (a, s) { return a.filter(function (v) { return s.indexOf(v) >= 0; }); });
      if (all.length !== 1) continue;
      return { type: 'constraint', dom: dom, machines: machines.map(function (ops, i) { return { name: 'Machine ' + 'ABC'[i], steps: chainText(ops), out: outs[i], ops: ops, cands: sets[i] }; }), answer: x,
        intro: 'The same secret number between ' + dom[0] + ' and ' + dom[1] + ' was fed into each machine. No machine alone reveals it, but together they do.', ask: 'What was the secret number?' };
    }
    return null;
  }

  /* ---------- sequence operations ---------- */
  var SEQ_OPS = {
    swap: { txt: function (a, b) { return 'swap positions ' + (a + 1) + ' and ' + (b + 1); }, f: function (s, a, b) { var t = s.slice(); var x = t[a]; t[a] = t[b]; t[b] = x; return t; } },
    rotl: { txt: function (k) { return 'move the first ' + (k === 1 ? 'item' : k + ' items') + ' to the end'; }, f: function (s, k) { return s.slice(k).concat(s.slice(0, k)); } },
    rotr: { txt: function (k) { return 'move the last ' + (k === 1 ? 'item' : k + ' items') + ' to the front'; }, f: function (s, k) { return s.slice(s.length - k).concat(s.slice(0, s.length - k)); } },
    revall: { txt: function () { return 'reverse the whole row'; }, f: function (s) { return s.slice().reverse(); } },
    revseg: { txt: function (a, b) { return 'reverse positions ' + (a + 1) + ' to ' + (b + 1); }, f: function (s, a, b) { var t = s.slice(); var seg = t.slice(a, b + 1).reverse(); for (var i = a; i <= b; i++) t[i] = seg[i - a]; return t; } },
    move: { txt: function (a, b) { return 'take the item in position ' + (a + 1) + ' and insert it at position ' + (b + 1); }, f: function (s, a, b) { var t = s.slice(); var x = t.splice(a, 1)[0]; t.splice(b, 0, x); return t; } }
  };
  function seqApply(s, op) { return SEQ_OPS[op.t].f(s, op.a, op.b); }
  function seqText(op) { return SEQ_OPS[op.t].txt(op.a, op.b); }
  var SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  function randSeqOp(rng, n, lv) {
    var pool = ['swap', 'rotl', 'rotr', 'revall'];
    if (lv >= 3) pool.push('revseg', 'move');
    var t = rng.pick(pool), a = 0, b = 0;
    if (t === 'swap' || t === 'move') { a = rng.int(0, n - 1); b = rng.int(0, n - 1); if (a === b) b = (a + 1) % n; }
    if (t === 'revseg') { a = rng.int(0, n - 3); b = rng.int(a + 2, n - 1); }
    if (t === 'rotl' || t === 'rotr') { a = rng.int(1, n - 2); }
    return { t: t, a: a, b: b };
  }
  function genSeq(lv, rng) {
    var n = PL.clamp(3 + Math.ceil(lv / 2), 4, 8), k = PL.clamp(1 + Math.ceil(lv / 2), 2, 6);
    for (var t = 0; t < 100; t++) {
      var start = rng.shuffle(SYMBOLS.slice(0, n)), ops = [];
      for (var i = 0; i < k; i++) { var o = randSeqOp(rng, n, lv); if (ops.length && JSON.stringify(ops[ops.length - 1]) === JSON.stringify(o)) { i--; continue; } ops.push(o); }
      var trace = [start], cur = start;
      ops.forEach(function (o) { cur = seqApply(cur, o); trace.push(cur); });
      if (cur.join('') === start.join('')) continue;
      return { type: 'seq', n: n, ops: ops, steps: ops.map(seqText), final: cur, answer: start, trace: trace,
        intro: 'Tiles were laid in a row, then rearranged by these steps in order. Here is the final row.', ask: 'Rebuild the original row.' };
    }
    return null;
  }

  /* ---------- grid operations (spatial) ---------- */
  var GRID_OPS = {
    rowR: { txt: function (r) { return 'slide row ' + (r + 1) + ' one place right (the end wraps to the start)'; }, f: function (g, n, r) { var t = g.slice(); var row = t.slice(r * n, r * n + n); row = [row[n - 1]].concat(row.slice(0, n - 1)); for (var i = 0; i < n; i++) t[r * n + i] = row[i]; return t; } },
    rowL: { txt: function (r) { return 'slide row ' + (r + 1) + ' one place left (the end wraps)'; }, f: function (g, n, r) { var t = g.slice(); var row = t.slice(r * n, r * n + n); row = row.slice(1).concat([row[0]]); for (var i = 0; i < n; i++) t[r * n + i] = row[i]; return t; } },
    colD: { txt: function (c) { return 'slide column ' + (c + 1) + ' one place down (the end wraps)'; }, f: function (g, n, c) { var t = g.slice(); var col = []; for (var i = 0; i < n; i++) col.push(g[i * n + c]); col = [col[n - 1]].concat(col.slice(0, n - 1)); for (i = 0; i < n; i++) t[i * n + c] = col[i]; return t; } },
    colU: { txt: function (c) { return 'slide column ' + (c + 1) + ' one place up (the end wraps)'; }, f: function (g, n, c) { var t = g.slice(); var col = []; for (var i = 0; i < n; i++) col.push(g[i * n + c]); col = col.slice(1).concat([col[0]]); for (i = 0; i < n; i++) t[i * n + c] = col[i]; return t; } },
    rotCW: { txt: function () { return 'rotate the whole board a quarter turn clockwise'; }, f: function (g, n) { var t = []; for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) t[c * n + (n - 1 - r)] = g[r * n + c]; return t; } },
    flipH: { txt: function () { return 'flip the board left-to-right'; }, f: function (g, n) { var t = []; for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) t[r * n + (n - 1 - c)] = g[r * n + c]; return t; } },
    swap: { txt: function (a, b, n) { return 'swap the contents of ' + cellName(a, n) + ' and ' + cellName(b, n); }, f: function (g, n, a, b) { var t = g.slice(); var x = t[a]; t[a] = t[b]; t[b] = x; return t; } }
  };
  function cellName(i, n) { return 'row ' + (Math.floor(i / n) + 1) + ' column ' + (i % n + 1); }
  var TOKENS = ['●', '▲', '■', '★', '◆'];
  function genGrid(lv, rng) {
    var n = lv <= 6 ? 3 : 4, k = PL.clamp(Math.ceil(lv / 2), 2, 5);
    for (var t = 0; t < 100; t++) {
      var cells = []; for (var i = 0; i < n * n; i++) cells.push('');
      var nt = n === 3 ? rng.int(4, 5) : rng.int(6, 8), idx = rng.shuffle(cells.map(function (_, j) { return j; })).slice(0, nt);
      idx.forEach(function (j, q) { cells[j] = TOKENS[q % TOKENS.length]; });
      var ops = [];
      for (i = 0; i < k; i++) {
        var pool = ['rowR', 'rowL', 'colD', 'colU', 'swap'].concat(lv >= 5 ? ['rotCW', 'flipH'] : []);
        var tt = rng.pick(pool), o = { t: tt, a: 0, b: 0 };
        if (/row|col/.test(tt)) o.a = rng.int(0, n - 1);
        if (tt === 'swap') { o.a = rng.int(0, n * n - 1); o.b = rng.int(0, n * n - 1); if (o.a === o.b) o.b = (o.a + 1) % (n * n); }
        ops.push(o);
      }
      var trace = [cells], cur = cells;
      ops.forEach(function (o) { cur = GRID_OPS[o.t].f(cur, n, o.a, o.b); trace.push(cur); });
      if (cur.join('|') === cells.join('|')) continue;
      return { type: 'grid', n: n, ops: ops, steps: ops.map(function (o) { return GRID_OPS[o.t].txt(o.a, o.b, n); }), final: cur, answer: cells, trace: trace,
        intro: 'Tokens sat on a board, then these moves were made in order. Here is the board afterwards.', ask: 'Restore the original board: tap two squares to swap them.' };
    }
    return null;
  }

  /* ---------- missing operations ---------- */
  function genMissing(lv, rng) {
    var gaps = lv >= 5 ? 2 : 1;
    if (rng.chance(0.5)) {
      // numeric
      for (var t = 0; t < 400; t++) {
        var menu = [], seen = {};
        while (menu.length < (lv >= 7 ? 6 : 5)) { var o = randNumOp(rng, Math.max(lv, 3), false); var key = o.t + o.k; if (!seen[key]) { seen[key] = 1; menu.push(o); } }
        var len = gaps + rng.int(1, 2), ops = [];
        for (var i = 0; i < len; i++) ops.push(rng.pick(menu));
        var gapIdx = rng.shuffle(ops.map(function (_, j) { return j; })).slice(0, gaps).sort();
        var x = rng.int(5, 60), fin = runChain(x, ops); if (fin == null) continue;
        // enumerate all assignments for the gaps
        var sols = [];
        (function rec(g, cur) {
          if (g === gaps) { var trial = ops.slice(); gapIdx.forEach(function (gi, q) { trial[gi] = menu[cur[q]]; }); if (runChain(x, trial) === fin) sols.push(cur.slice()); return; }
          for (var m = 0; m < menu.length; m++) { cur.push(m); rec(g + 1, cur); cur.pop(); }
        })(0, []);
        if (sols.length !== 1) continue;
        return { type: 'missing', kind: 'num', start: x, final: fin, ops: ops, gapIdx: gapIdx, menu: menu.map(function (o) { return NUM_OPS[o.t].txt(o.k); }), answer: sols[0],
          stepsShown: ops.map(function (o, j) { return gapIdx.indexOf(j) >= 0 ? '?' : NUM_OPS[o.t].txt(o.k); }),
          intro: 'The number ' + x + ' was turned into ' + fin + ' by the steps below, but ' + (gaps === 1 ? 'one step is' : 'two steps are') + ' missing. Each missing step is one of the listed operations.', ask: 'Choose the missing ' + (gaps === 1 ? 'step' : 'steps') + '.' };
      }
    }
    var n = lv >= 5 ? 6 : 5;
    for (var t2 = 0; t2 < 400; t2++) {
      var menu2 = [], seen2 = {};
      while (menu2.length < 5) { var o2 = randSeqOp(rng, n, Math.max(lv, 3)); var k2 = JSON.stringify(o2); if (!seen2[k2]) { seen2[k2] = 1; menu2.push(o2); } }
      var len2 = gaps + rng.int(1, 2), ops2 = [];
      for (var i2 = 0; i2 < len2; i2++) ops2.push(rng.pick(menu2));
      var gi2 = rng.shuffle(ops2.map(function (_, j) { return j; })).slice(0, gaps).sort();
      var start = SYMBOLS.slice(0, n), cur = start; ops2.forEach(function (o) { cur = seqApply(cur, o); });
      var fin2 = cur.join('');
      var sols2 = [];
      (function rec2(g, c) {
        if (g === gaps) { var tr = ops2.slice(); gi2.forEach(function (gi, q) { tr[gi] = menu2[c[q]]; }); var s = start; tr.forEach(function (o) { s = seqApply(s, o); }); if (s.join('') === fin2) sols2.push(c.slice()); return; }
        for (var m = 0; m < menu2.length; m++) { c.push(m); rec2(g + 1, c); c.pop(); }
      })(0, []);
      if (sols2.length !== 1 || fin2 === start.join('')) continue;
      return { type: 'missing', kind: 'seq', start: start, final: cur, ops: ops2, gapIdx: gi2, menu: menu2.map(seqText), answer: sols2[0],
        stepsShown: ops2.map(function (o, j) { return gi2.indexOf(j) >= 0 ? '?' : seqText(o); }),
        intro: 'The row ' + start.join(' ') + ' became ' + cur.join(' ') + ' through the steps below, but ' + (gaps === 1 ? 'one step is' : 'two steps are') + ' missing. Each missing step is one of the listed moves.', ask: 'Choose the missing ' + (gaps === 1 ? 'step' : 'steps') + '.' };
    }
    return null;
  }

  var TYPE_NAMES = { num: 'Numbers', seq: 'Sequence', grid: 'Board', missing: 'Missing steps', multi: 'Multiple starts', constraint: 'Several machines' };
  var TYPE_LEVELS = { num: [1, 10], seq: [1, 10], missing: [1, 10], grid: [3, 10], constraint: [3, 10], multi: [5, 10] };
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10);
    var types = Object.keys(TYPE_LEVELS).filter(function (t) { return lv >= TYPE_LEVELS[t][0] && lv <= TYPE_LEVELS[t][1]; });
    var recent = (ctx && ctx.recent) || [];
    var fresh = types.filter(function (t) { return recent.slice(-2).indexOf(t) < 0; });
    if (ctx && ctx.forceType) fresh = [ctx.forceType];
    for (var tries = 0; tries < 40; tries++) {
      var t = rng.pick(fresh.length ? fresh : types), P = null;
      if (t === 'num') P = genNum(lv, rng); else if (t === 'seq') P = genSeq(lv, rng); else if (t === 'grid') P = genGrid(lv, rng);
      else if (t === 'missing') P = genMissing(lv, rng); else if (t === 'multi') P = genMulti(lv, rng); else if (t === 'constraint') P = genConstraint(lv, rng);
      if (P) { P.tkey = t; P.typeName = TYPE_NAMES[t]; P.math = t === 'num' || t === 'multi' || t === 'constraint' || (t === 'missing' && P.kind === 'num'); return P; }
    }
    throw new Error('reverse generation failed');
  }

  /* ---------- checking ---------- */
  function parseList(s) { return String(s).split(/[^0-9]+/).filter(Boolean).map(Number); }
  function check(p, gs) {
    if (p.type === 'num' || p.type === 'constraint') return parseInt(gs.input, 10) === p.answer;
    if (p.type === 'multi') {
      if (p.mode === 'fact') return gs.choice === p.answer;
      var got = parseList(gs.input).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
      return got.join(',') === p.answer.slice().sort(function (a, b) { return a - b; }).join(',');
    }
    if (p.type === 'seq') {
      if (gs.guess) return gs.guess.join('') === p.answer.join('');
      return !!gs.slots && gs.slots.every(function (x, i) { return x != null && gs.pool[x] === p.answer[i]; });
    }
    if (p.type === 'grid') return gs.cells.join('|') === p.answer.join('|');
    if (p.type === 'missing') return gs.picks.every(function (v, i) { return v === p.answer[i]; });
    return false;
  }
  function init(p) {
    if (p.type === 'seq') return { tries: [], guess: null };
    if (p.type === 'grid') return { cells: p.final.slice(), sel: null, swaps: 0, tries: [] };
    if (p.type === 'missing') return { picks: p.gapIdx.map(function () { return null; }), tries: [] };
    return { input: '', choice: null, tries: [] };
  }
  function minSwaps(from, to) { // minimum swaps to transform one arrangement into another (tokens may repeat blanks)
    var a = from.slice(), n = 0;
    for (var i = 0; i < a.length; i++) { if (a[i] === to[i]) continue; for (var j = i + 1; j < a.length; j++) if (a[j] === to[i] && a[j] !== to[j]) { var t = a[i]; a[i] = a[j]; a[j] = t; n++; break; } }
    return n;
  }
  function gridView(cells, n, opts) {
    var g = h('div', { class: 're-grid', style: { 'grid-template-columns': 'repeat(' + n + ', 1fr)' } });
    cells.forEach(function (v, i) {
      g.appendChild(h(opts && opts.onclick ? 'button' : 'span', { class: 're-cell' + (opts && opts.sel === i ? ' sel' : '') + (v ? ' tok t' + TOKENS.indexOf(v) : ''), disabled: opts && opts.disabled, 'aria-label': cellName(i, n) + (v ? ' ' + v : ' empty'), onclick: opts && opts.onclick ? function () { opts.onclick(i); } : null }, v || ''));
    });
    return g;
  }
  function stepsList(steps, numbered) { return h('ol', { class: 're-steps' }, steps.map(function (s) { return h('li', { class: s === '?' ? 'gap' : '' }, s === '?' ? 'missing step' : PL.cap(s)); })); }

  /* ======================= Workspaces =======================
     Free experimentation areas. Nothing here counts as a hint or an attempt; only "Check" submissions do.
     Undo model (shared by every workspace): a linear list of complete, immutable snapshots plus a cursor.
       states[0] is the starting arrangement and is never modified; every action appends a NEW snapshot
       (dropping any redo branch); Undo/Redo only move the cursor; Reset appends a copy of states[0].
     Nothing is ever recomputed or reshuffled on undo, so undo/redo always land on exactly the recorded states.
     Tiles carry stable ids (their index in the starting row), so repeated letters are tracked independently.
     All of this lives in gs, so it survives leaving and returning. */
  var HMAX = 400;
  function snap(o) { return JSON.parse(JSON.stringify(o)); }
  function hNew(start) { return { states: [snap(start)], idx: 0 }; }
  function hCur(hs) { return hs.states[hs.idx]; }
  function hCommit(hs, next) { // returns false when the action changed nothing (no history entry)
    if (JSON.stringify(next) === JSON.stringify(hCur(hs))) return false;
    hs.states = hs.states.slice(0, hs.idx + 1); hs.states.push(snap(next));
    if (hs.states.length > HMAX) hs.states.splice(1, hs.states.length - HMAX); // the start (states[0]) is always kept
    hs.idx = hs.states.length - 1; return true;
  }
  function hUndo(hs) { if (hs.idx > 0) { hs.idx--; return true; } return false; }
  function hRedo(hs) { if (hs.idx < hs.states.length - 1) { hs.idx++; return true; } return false; }
  function hReset(hs) { return hCommit(hs, hs.states[0]); }
  function hFromOld(start, hist, current, fut) { // rebuild a history saved by the old {hist, fut} format, in order
    var hs = hNew(start), at = 0;
    (hist || []).forEach(function (x) { hCommit(hs, x); });
    hCommit(hs, current); at = hs.idx;
    (fut || []).slice().reverse().forEach(function (x) { hCommit(hs, x); });
    hs.idx = at; return hs;
  }
  function histButtons(hs, after, disabled) {
    return [
      h('button', { class: 'btn ghost sm', 'data-act': 'undo', disabled: disabled || hs.idx === 0, onclick: function () { if (hUndo(hs)) after(); } }, 'Undo'),
      h('button', { class: 'btn ghost sm', 'data-act': 'redo', disabled: disabled || hs.idx >= hs.states.length - 1, onclick: function () { if (hRedo(hs)) after(); } }, 'Redo'),
      h('button', { class: 'btn ghost sm', 'data-act': 'reset', disabled: disabled || JSON.stringify(hCur(hs)) === JSON.stringify(hs.states[0]), onclick: function () { if (hReset(hs)) after(); } }, 'Reset to start')];
  }

  /* --- A. letter/symbol tiles --- */
  function tileStart(p) { return p.type === 'missing' ? p.start.slice() : p.final.slice(); }
  function ensureTiles(p, gs) {
    var start = tileStart(p), ids = start.map(function (_, i) { return i; });
    var ws = gs.tws;
    if (!ws || !ws.hs) { // new, or saved by the old version ({rows, hist, fut} of symbol rows): rebuild as id rows
      var toIds = function (rows) { // map symbols back to ids, using each starting position once per row
        return rows.map(function (row) { var used = {}; return row.map(function (sym) { for (var i = 0; i < start.length; i++) if (start[i] === sym && !used[i]) { used[i] = 1; return i; } return null; }); })
          .filter(function (row) { return row.length === start.length && row.every(function (x) { return x != null; }); });
      };
      var conv = function (rows) { var r = toIds(rows); return { rows: r.length ? r : [ids] }; };
      var hs = ws && ws.rows ? hFromOld({ rows: [ids] }, (ws.hist || []).map(conv), conv(ws.rows), (ws.fut || []).map(conv)) : hNew({ rows: [ids] });
      ws = gs.tws = { sym: start, hs: hs, sel: null };
    }
    return ws;
  }
  function tileRows(gs) { var ws = gs.tws; return ws && ws.hs ? hCur(ws.hs).rows.map(function (r) { return r.map(function (id) { return ws.sym[id]; }); }) : null; }
  function tileWorkspace(api, opts) {
    var p = api.p, gs = api.gs, ws = ensureTiles(p, gs), state = hCur(ws.hs);
    var change = function (fn) { var next = snap(hCur(ws.hs)); fn(next.rows); ws.sel = null; hCommit(ws.hs, next); api.update(gs); };
    var after = function () { ws.sel = null; api.update(gs); };
    var rowsEl = h('div', { class: 'tws-rows' });
    state.rows.forEach(function (row, r) {
      var tiles = h('div', { class: 'tws-tiles', 'data-row': r });
      row.forEach(function (id, i) {
        var sym = ws.sym[id];
        var t = h('button', { class: 'tws-tile mono' + (ws.sel && ws.sel.r === r && ws.sel.id === id ? ' sel' : ''), 'data-i': i, 'data-id': id, 'aria-label': 'Tile ' + sym + ', position ' + (i + 1) }, sym);
        attachTileDrag(t, r, id, tiles, ws, api, gs, change);
        tiles.appendChild(t);
      });
      var acts = h('div', { class: 'tws-acts' },
        h('button', { class: 'btn ghost xs', 'aria-label': 'Move first tile to the end', onclick: function () { change(function (rows) { rows[r] = rows[r].slice(1).concat(rows[r].slice(0, 1)); }); } }, '1st→end'),
        h('button', { class: 'btn ghost xs', 'aria-label': 'Move last tile to the front', onclick: function () { change(function (rows) { rows[r] = rows[r].slice(-1).concat(rows[r].slice(0, -1)); }); } }, 'last→1st'),
        h('button', { class: 'btn ghost xs', 'aria-label': 'Reverse this row', onclick: function () { change(function (rows) { rows[r] = rows[r].slice().reverse(); }); } }, 'Flip'),
        h('button', { class: 'btn ghost xs', 'aria-label': 'Duplicate this row', onclick: function () { change(function (rows) { rows.splice(r + 1, 0, rows[r].slice()); }); } }, 'Copy'),
        state.rows.length > 1 ? h('button', { class: 'btn ghost xs', 'aria-label': 'Delete this row', onclick: function () { change(function (rows) { rows.splice(r, 1); }); } }, '✕') : null,
        opts.submit && !api.done ? h('button', { class: 'btn xs primary', onclick: function () { opts.submit(row.map(function (id) { return ws.sym[id]; })); } }, 'Check') : null);
      rowsEl.appendChild(h('div', { class: 'tws-row' }, h('span', { class: 'tws-n muted' }, String(r + 1)), tiles, acts));
    });
    return h('div', { class: 'workspace' },
      h('div', { class: 'ws-head' }, h('span', { class: 'lbl' }, 'Workspace'), h('div', { class: 'row-actions' }, histButtons(ws.hs, after, api.done))),
      h('div', { class: 'muted small' }, 'Drag a tile to move it, or tap two tiles to swap them. 1st→end and last→1st rotate the row, Flip reverses it, Copy duplicates it to try another idea. Undo and Redo step through your moves exactly; Reset to start goes back to the starting row (and can itself be undone).' + (opts.submit ? ' Tap Check on the row that is your answer.' : ' Nothing here affects your score.')),
      rowsEl);
  }
  /* Drag: a drop is recorded only on a real pointerup. A pointercancel (iOS cancels touches for system gestures,
     scrolling or zoom, often reporting coordinates of 0) abandons the drag instead of dropping the tile somewhere. */
  function attachTileDrag(el, r, id, tilesEl, ws, api, gs, change) {
    el.addEventListener('pointerdown', function (ev) {
      if (api.done || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
      ev.preventDefault();
      var sx = ev.clientX, sy = ev.clientY, moved = false, ghost = null, pid = ev.pointerId;
      try { el.setPointerCapture(pid); } catch (e) { }
      function cleanup() {
        el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', cancel);
        if (ghost) ghost.remove(); el.classList.remove('dragging');
      }
      function move(e2) {
        if (e2.pointerId !== pid) return;
        if (!moved && Math.hypot(e2.clientX - sx, e2.clientY - sy) < 8) return;
        if (!moved) { moved = true; ghost = el.cloneNode(true); ghost.classList.add('tws-ghost'); document.body.appendChild(ghost); el.classList.add('dragging'); }
        ghost.style.left = (e2.clientX - 20) + 'px'; ghost.style.top = (e2.clientY - 24) + 'px';
      }
      function cancel(e2) { if (e2.pointerId !== pid) return; cleanup(); }
      function up(e2) {
        if (e2.pointerId !== pid) return;
        cleanup();
        var row = hCur(ws.hs).rows[r], from = row ? row.indexOf(id) : -1;
        if (from < 0) return;
        if (!moved) { // tap: select, or swap with the selected tile in the same row
          if (ws.sel && ws.sel.r === r && ws.sel.id !== id) { var other = ws.sel.id; change(function (rows) { var a = rows[r].indexOf(other), b = rows[r].indexOf(id); rows[r][a] = id; rows[r][b] = other; }); }
          else { ws.sel = ws.sel && ws.sel.r === r && ws.sel.id === id ? null : { r: r, id: id }; api.update(gs); }
          return;
        }
        var kids = Array.prototype.slice.call(tilesEl.children), best = from, bd = Infinity;
        kids.forEach(function (k, j) { var b = k.getBoundingClientRect(), d = Math.abs(e2.clientX - (b.left + b.width / 2)); if (d < bd) { bd = d; best = j; } });
        if (best !== from) change(function (rows) { var rw = rows[r], x = rw.splice(rw.indexOf(id), 1)[0]; rw.splice(best, 0, x); });
      }
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', cancel);
    });
  }

  /* --- B. step-by-step number workspace --- */
  function numSteps(p) {
    if (p.type === 'num' || p.type === 'multi') return p.steps.map(function (s, k) { return 'Before step ' + (p.steps.length - k) + ' (' + p.steps[p.steps.length - 1 - k] + ')'; });
    if (p.type === 'missing') return p.stepsShown.map(function (s, k) { return 'After step ' + (k + 1) + (s === '?' ? ' (missing)' : ' (' + s + ')'); });
    return ['Working 1', 'Working 2', 'Working 3'];
  }
  function numStart(p) { return { rows: numSteps(p).map(function (l) { return { label: l, expr: '' }; }) }; }
  function ensureNums(p, gs) {
    var ws = gs.nws;
    if (!ws || !ws.hs) {
      var w = function (rows) { return { rows: rows }; };
      var hs = ws && ws.rows ? hFromOld(numStart(p), (ws.hist || []).map(w), w(ws.rows), (ws.fut || []).map(w)) : hNew(numStart(p));
      ws = gs.nws = { hs: hs };
    }
    return ws;
  }
  function evalSafe(expr) { if (!expr || !expr.trim()) return ''; try { return PL.calc.evaluate(expr); } catch (e) { return '…'; } }
  function numWorkspace(api) {
    var p = api.p, gs = api.gs, ws = ensureNums(p, gs), rows = hCur(ws.hs).rows;
    var change = function (fn) { var next = snap(hCur(ws.hs)); fn(next.rows); hCommit(ws.hs, next); api.update(gs); };
    var refFinal = p.type === 'missing' ? 'Start ' + p.start + ' → end ' + p.final : p.type === 'constraint' ? p.machines.map(function (m) { return m.name + ' output ' + m.out; }).join(' · ') : 'Final result ' + p.final;
    var list = h('div', { class: 'nws-rows' });
    rows.forEach(function (row, k) {
      var out = h('span', { class: 'nws-val mono' }, evalSafe(row.expr) ? '= ' + evalSafe(row.expr) : '');
      var lab = h('input', { class: 'nws-lab', value: row.label, 'aria-label': 'Row label' });
      var inp = h('input', { class: 'nws-in mono', value: row.expr, inputmode: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'e.g. 129591 + 20', 'aria-label': 'Calculation for ' + row.label });
      // typing: the first keystroke of each focus starts one new history entry; later keystrokes edit that entry
      var editing = false;
      var edit = function (field, el) {
        if (!editing) { var next = snap(hCur(ws.hs)); next.rows[k][field] = el.value; if (hCommit(ws.hs, next)) editing = true; }
        else hCur(ws.hs).rows[k][field] = el.value;
        if (field === 'expr') { var v = evalSafe(el.value); out.textContent = v ? '= ' + v : ''; }
        api.save(gs);
      };
      [lab, inp].forEach(function (el) { el.addEventListener('focus', function () { editing = false; }); el.addEventListener('blur', function () { if (editing) api.update(gs); editing = false; }); });
      lab.addEventListener('input', function () { edit('label', lab); });
      inp.addEventListener('input', function () { edit('expr', inp); });
      list.appendChild(h('div', { class: 'nws-row' },
        h('div', { class: 'nws-top' }, lab,
          h('button', { class: 'btn ghost xs', 'aria-label': 'Move up', disabled: k === 0, onclick: function () { change(function (R) { var t = R[k - 1]; R[k - 1] = R[k]; R[k] = t; }); } }, '↑'),
          h('button', { class: 'btn ghost xs', 'aria-label': 'Move down', disabled: k === rows.length - 1, onclick: function () { change(function (R) { var t = R[k + 1]; R[k + 1] = R[k]; R[k] = t; }); } }, '↓'),
          h('button', { class: 'btn ghost xs', 'aria-label': 'Copy this result into the next row', disabled: !evalSafe(row.expr) || evalSafe(row.expr) === '…', onclick: function () { var v = evalSafe(row.expr).split(' ≈')[0]; change(function (R) { if (k === R.length - 1) R.push({ label: 'Working ' + (R.length + 1), expr: '' }); var nx = R[k + 1]; nx.expr = (nx.expr || '') + (/^-|\//.test(v) ? '(' + v + ')' : v); }); } }, 'Copy ↓'),
          h('button', { class: 'btn ghost xs', 'aria-label': 'Remove row', disabled: rows.length <= 1, onclick: function () { change(function (R) { R.splice(k, 1); }); } }, '✕')),
        h('div', { class: 'nws-bottom' }, inp, out)));
    });
    return h('div', { class: 'workspace' },
      h('div', { class: 'ws-head' }, h('span', { class: 'lbl' }, 'Workspace'), h('div', { class: 'row-actions' }, histButtons(ws.hs, function () { api.update(gs); }, api.done))),
      h('div', { class: 'muted small' }, refFinal + '. Write one calculation per row; each row shows its value. The workspace never solves anything for you and never affects your score.'),
      list,
      h('button', { class: 'btn ghost sm', onclick: function () { change(function (R) { R.push({ label: 'Working ' + (R.length + 1), expr: '' }); }); } }, '+ Add row'));
  }

  /* --- C. board workspace: transformations are tried on "Your board" (gs.cells mirrors the current snapshot) --- */
  function flipV(g, n) { var t = []; for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) t[(n - 1 - r) * n + c] = g[r * n + c]; return t; }
  function ensureBoard(p, gs) {
    if (!gs.bhs) {
      gs.bhs = hFromOld(p.final.slice(), gs.bh, gs.cells, gs.bf); delete gs.bh; delete gs.bf;
    }
    gs.cells = hCur(gs.bhs).slice();
    return gs.bhs;
  }
  function boardMove(api, fn, isSwap) { var gs = api.gs, hs = ensureBoard(api.p, gs); if (hCommit(hs, fn(hCur(hs).slice())) && isSwap) gs.swaps++; gs.cells = hCur(hs).slice(); api.update(gs); }
  function boardTools(api) {
    var p = api.p, gs = api.gs, n = p.n, hs = ensureBoard(p, gs);
    var sel = gs.sel, r = sel != null ? Math.floor(sel / n) : null, c = sel != null ? sel % n : null;
    var apply = function (fn) { boardMove(api, fn); };
    var after = function () { gs.cells = hCur(hs).slice(); gs.sel = null; api.update(gs); };
    var b = function (label, aria, fn, dis) { return h('button', { class: 'btn ghost xs', 'aria-label': aria, disabled: api.done || dis, onclick: fn }, label); };
    return h('div', { class: 'board-tools' },
      h('div', { class: 'row-actions' },
        b('Row ←', 'Slide the selected row left', function () { apply(function (g) { return GRID_OPS.rowL.f(g, n, r); }); }, sel == null),
        b('Row →', 'Slide the selected row right', function () { apply(function (g) { return GRID_OPS.rowR.f(g, n, r); }); }, sel == null),
        b('Col ↑', 'Slide the selected column up', function () { apply(function (g) { return GRID_OPS.colU.f(g, n, c); }); }, sel == null),
        b('Col ↓', 'Slide the selected column down', function () { apply(function (g) { return GRID_OPS.colD.f(g, n, c); }); }, sel == null)),
      h('div', { class: 'row-actions' },
        b('Turn ↻', 'Rotate the board clockwise', function () { apply(function (g) { return GRID_OPS.rotCW.f(g, n); }); }),
        b('Turn ↺', 'Rotate the board anticlockwise', function () { apply(function (g) { var x = g; for (var k = 0; k < 3; k++) x = GRID_OPS.rotCW.f(x, n); return x; }); }),
        b('Mirror ⇆', 'Flip left to right', function () { apply(function (g) { return GRID_OPS.flipH.f(g, n); }); }),
        b('Mirror ⇅', 'Flip top to bottom', function () { apply(function (g) { return flipV(g, n); }); })),
      h('div', { class: 'row-actions' }, histButtons(hs, after, api.done)),
      h('div', { class: 'muted small' }, 'Tap two squares to swap them. Select a square, then slide its row or column. Undo and Redo step through your moves exactly; Reset to start returns to the board afterwards. Moves are free experimentation; only Check counts.'));
  }

  function view(api) {
    var p = api.p, gs = api.gs;
    function submit(label) {
      if (api.done) return;
      gs.tries.push(label);
      if (check(p, gs)) { api.update(gs); api.finish('solved'); }
      else { api.wrong(); api.toast('Not right. Work backward from the end one step at a time.', 'bad'); api.update(gs); }
    }
    var head = h('div', null, h('div', { class: 'tagrow' }, h('span', { class: 'tag' }, p.typeName)), h('p', { class: 'prob' }, p.intro));
    var body = [];
    if (p.type === 'num' || p.type === 'multi') {
      body.push(stepsList(p.steps));
      body.push(h('div', { class: 're-final' }, h('span', { class: 'lbl' }, 'Result '), h('b', { class: 'mono' }, String(p.final))));
    }
    if (p.type === 'constraint') {
      p.machines.forEach(function (m) { body.push(h('div', { class: 're-machine' }, h('b', null, m.name), stepsList(m.steps), h('div', null, h('span', { class: 'lbl' }, 'Output '), h('b', { class: 'mono' }, String(m.out))))); });
    }
    if (p.type === 'missing') {
      body.push(h('div', { class: 're-final' }, h('span', { class: 'lbl' }, 'Start '), h('b', { class: 'mono' }, p.kind === 'num' ? String(p.start) : p.start.join(' '))));
      body.push(stepsList(p.stepsShown));
      body.push(h('div', { class: 're-final' }, h('span', { class: 'lbl' }, 'End '), h('b', { class: 'mono' }, p.kind === 'num' ? String(p.final) : p.final.join(' '))));
      body.push(h('div', { class: 'lbl' }, 'Possible operations'));
      p.gapIdx.forEach(function (gi, q) {
        body.push(h('div', { class: 'srow col' }, h('span', { class: 'sname' }, 'Missing step ' + (gi + 1)), h('div', { class: 'opts' }, p.menu.map(function (m, mi) {
          return h('button', { class: 'btn opt sm' + (gs.picks[q] === mi ? ' on' : ''), disabled: api.done, onclick: function () { gs.picks[q] = mi; api.update(gs); } }, PL.cap(m));
        }))));
      });
      body.push(h('button', { class: 'btn primary wide', disabled: api.done || gs.picks.some(function (x) { return x == null; }), onclick: function () { submit(gs.picks.map(function (x) { return p.menu[x]; }).join(' / ')); } }, 'Check'));
    }
    if (p.type === 'seq') {
      body.push(stepsList(p.steps));
      body.push(h('div', null, h('span', { class: 'lbl' }, 'Final row '), h('span', { class: 'mono re-row' }, p.final.join(' '))));
      body.push(h('p', { class: 'q' }, 'Rearrange the tiles back into the original row, then tap Check on that row.'));
      body.push(tileWorkspace(api, { submit: function (row) { gs.guess = row; submit(row.join('')); } }));
    }
    if (p.type === 'grid') {
      ensureBoard(p, gs);
      body.push(stepsList(p.steps));
      body.push(h('div', { class: 're-boards' },
        h('div', null, h('div', { class: 'lbl' }, 'Board afterwards'), gridView(p.final, p.n)),
        h('div', null, h('div', { class: 'lbl' }, 'Your board'), gridView(gs.cells, p.n, { sel: gs.sel, disabled: api.done, onclick: function (i) {
          if (gs.sel == null) { gs.sel = i; } else if (gs.sel === i) { gs.sel = null; } else { var a = gs.sel; gs.sel = null; boardMove(api, function (g) { var t = g[a]; g[a] = g[i]; g[i] = t; return g; }, true); return; }
          api.update(gs);
        } }))));
      if (!api.done) body.push(boardTools(api));
      if (gs.hintBoard) body.push(h('div', null, h('div', { class: 'lbl' }, 'Hint: an earlier board'), gridView(gs.hintBoard, p.n)));
      body.push(h('button', { class: 'btn primary wide', disabled: api.done, onclick: function () { submit('board'); } }, 'Check this board'));
    }
    if (p.type === 'num' || p.type === 'constraint' || (p.type === 'multi' && p.mode === 'list')) {
      var inp = h('input', { id: 're-in', class: 'txt', type: 'text', inputmode: p.type === 'multi' ? 'text' : 'numeric', autocomplete: 'off', placeholder: p.type === 'multi' ? 'e.g. 12, 21, 30' : 'Starting number', value: gs.input || '' });
      body.push(h('p', { class: 'q' }, p.ask));
      body.push(h('form', { class: 'row-in', onsubmit: function (e) { e.preventDefault(); gs.input = inp.value; if (!gs.input.trim()) return; submit(gs.input.trim()); } }, inp, h('button', { class: 'btn primary', type: 'submit', disabled: api.done }, 'Check')));
    }
    if (p.type === 'multi' && p.mode === 'fact') {
      body.push(h('p', { class: 'q' }, p.ask));
      body.push(h('div', { class: 'opts' }, p.options.map(function (o, i) { return h('button', { class: 'btn opt', disabled: api.done || gs.tries.indexOf(o) >= 0, onclick: function () { gs.choice = i; submit(o); } }, o); })));
    }
    if (gs.tries.length) body.push(h('div', { class: 'muted small' }, 'Tried: ' + gs.tries.join(' · ')));
    if (!api.done) {
      if (p.type === 'num' || p.type === 'multi' || p.type === 'constraint' || (p.type === 'missing' && p.kind === 'num')) body.push(numWorkspace(api));
      if (p.type === 'missing' && p.kind === 'seq') body.push(tileWorkspace(api, {}));
    }
    return h('div', { class: 'reverse' }, head, body);
  }

  /* ---------- hints: one backward step at a time ---------- */
  function hint(p, gs) {
    gs.hn = gs.hn || 0;
    var msg = null;
    if (p.type === 'num') {
      // trace[i] is the value before step i+1; reveal from the end backward, never the start itself
      var idx = p.trace.length - 2 - gs.hn;
      if (idx >= 1) msg = 'Before step ' + (idx + 1) + ' (' + p.steps[idx] + ') the number was ' + p.trace[idx] + '.';
    } else if (p.type === 'seq' || p.type === 'grid') {
      var j = p.trace.length - 2 - gs.hn;
      if (j >= 1) {
        msg = 'Before step ' + (j + 1) + ' the ' + (p.type === 'seq' ? 'row was ' + p.trace[j].join(' ') : 'board looked like the one shown below this hint') + '.';
        if (p.type === 'grid') gs.hintBoard = p.trace[j];
      } else if (p.type === 'seq' && gs.hn === p.trace.length - 2) {
        // last resort: fix the first wrong position
        msg = 'Position 1 of the original row is ' + p.answer[0] + '.';
      }
    } else if (p.type === 'missing') {
      if (gs.hn < p.gapIdx.length) msg = 'Missing step ' + (p.gapIdx[gs.hn] + 1) + ' is: ' + p.menu[p.answer[gs.hn]] + '.';
    } else if (p.type === 'multi') {
      if (p.mode === 'list') { if (gs.hn === 0) msg = 'There are exactly ' + p.starts.length + ' possible starting numbers.'; else if (gs.hn <= p.starts.length - 1) msg = p.starts[gs.hn - 1] + ' is one of them.'; }
      else { if (gs.hn === 0) msg = 'The possible starting numbers are ' + PL.listJoin(p.starts.map(String)) + '.'; }
    } else if (p.type === 'constraint') {
      if (gs.hn < p.machines.length) { var m = p.machines[gs.hn]; msg = m.name + ' alone allows: ' + m.cands.slice(0, 12).join(', ') + (m.cands.length > 12 ? '…' : '') + '.'; }
    }
    if (!msg) return { msg: 'No further hints — the remaining step is yours.', noCount: true };
    gs.hn++;
    return { msg: msg, gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var q = solved ? PL.clamp(100 - ctx.wrong * (p.type === 'multi' && p.mode === 'fact' ? 30 : 18) - ctx.hints * 12, 10, 100) : 0;
    var eff = null;
    if (p.type === 'grid' && solved) eff = { swaps: gs.swaps, best: minSwaps(p.final, p.answer) }; // recorded only; experimenting is never penalised
    return { quality: Math.round(q), metrics: { type: p.tkey, wrong: ctx.wrong, steps: (p.steps || p.stepsShown || []).length, eff: eff, unaided: solved && !ctx.hints },
      lines: [['Variation', p.typeName], ['Wrong answers', ctx.wrong]] };
  }
  function answerText(p) {
    if (p.type === 'num' || p.type === 'constraint') return String(p.answer);
    if (p.type === 'multi') return p.mode === 'list' ? p.answer.join(', ') : p.options[p.answer] + ' (leaving ' + p.unique + ')';
    if (p.type === 'seq') return p.answer.join(' ');
    if (p.type === 'missing') return p.answer.map(function (a, i) { return 'step ' + (p.gapIdx[i] + 1) + ': ' + p.menu[a]; }).join('; ');
    return '';
  }
  function review(p, gs) {
    var parts = [h('p', { class: 'prob' }, p.intro)];
    if (p.type === 'grid') parts.push(h('div', { class: 're-boards' }, h('div', null, h('div', { class: 'lbl' }, 'Original'), gridView(p.answer, p.n)), h('div', null, h('div', { class: 'lbl' }, 'Afterwards'), gridView(p.final, p.n))));
    else parts.push(h('div', null, h('span', { class: 'lbl' }, 'Answer '), h('b', { class: 'mono' }, answerText(p))));
    var lines = [];
    if (p.type === 'num') lines = p.trace.map(function (v, i) { return i === 0 ? 'Start: ' + v : 'After “' + p.steps[i - 1] + '”: ' + v; });
    if (p.type === 'seq') lines = p.trace.map(function (v, i) { return (i === 0 ? 'Start: ' : 'After “' + p.steps[i - 1] + '”: ') + v.join(' '); });
    if (p.type === 'grid') lines = p.steps.map(function (s, i) { return 'Undo step ' + (p.steps.length - i) + ' in reverse order: ' + p.steps[p.steps.length - 1 - i]; });
    if (p.type === 'missing') lines = ['Every combination of the listed operations was tried; only this one turns the start into the end.'];
    if (p.type === 'multi') lines = ['Checking every starting number in range, these produce the result: ' + p.starts.join(', ') + '.'];
    if (p.type === 'constraint') lines = p.machines.map(function (m) { return m.name + ' alone allows ' + m.cands.length + ' numbers: ' + m.cands.slice(0, 15).join(', ') + (m.cands.length > 15 ? '…' : ''); }).concat(['Only ' + p.answer + ' is allowed by every machine.']);
    parts.push(h('ol', { class: 'steps' }, lines.map(function (l) { return h('li', null, l); })));
    if (gs.tries && gs.tries.length) parts.push(h('div', { class: 'muted small' }, 'Your answers: ' + gs.tries.join(' · ')));
    return h('div', { class: 'review' }, parts);
  }
  function stats(atts) {
    var by = {}; atts.forEach(function (a) { var t = a.metrics && a.metrics.type; if (!t) return; (by[t] = by[t] || { n: 0, ok: 0, q: 0 }); by[t].n++; by[t].q += a.quality || 0; if (a.outcome === 'solved') by[t].ok++; });
    var rows = [['Accuracy', atts.length ? Math.round(100 * atts.filter(function (a) { return a.outcome === 'solved'; }).length / atts.length) + '%' : '—'],
      ['Solved without hints', atts.length ? Math.round(100 * atts.filter(function (a) { return a.metrics && a.metrics.unaided; }).length / atts.length) + '%' : '—']];
    Object.keys(by).forEach(function (t) { rows.push([TYPE_NAMES[t], by[t].ok + '/' + by[t].n + ' solved · avg ' + Math.round(by[t].q / by[t].n)]); });
    return rows;
  }
  PL.games.reverse = {
    id: 'reverse', name: 'Reverse Engineer', blurb: 'See the ending; work out how it started.',
    rules: 'You are shown the result of a sequence of steps. Reason backward to recover the starting number, row or board, the missing steps, or every start that could have led there. Hints reveal intermediate states working back from the end.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 60 + lv * 25; }, timeLimit: function (lv) { return 150 + lv * 30; },
    math: function (p) { return !!p.math; },
    _check: check, _tileRows: tileRows, _hist: { commit: hCommit, undo: hUndo, redo: hRedo, reset: hReset, cur: hCur, make: hNew }, _ensureTiles: ensureTiles, _ensureBoard: ensureBoard, _NUM: NUM_OPS, _run: runChain, _seqApply: seqApply, _GRID: GRID_OPS, _starts: startsFor
  };
})();

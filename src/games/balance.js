/* ===== GAME 9: BALANCE ===== */
(function () {
  var h = PL.h, S = PL.svg, Q = PL.Q;
  var SHAPES = ['circle', 'square', 'triangle', 'star'];
  var NAMES = { circle: 'circle', square: 'square', triangle: 'triangle', star: 'star' };
  var GLYPH = { circle: '●', square: '■', triangle: '▲', star: '★' };

  function shape(kind, x, y, r) {
    var cls = 'shp shp-' + kind;
    if (kind === 'circle') return S('circle', { cx: x, cy: y, r: r * 0.9, class: cls });
    if (kind === 'square') return S('rect', { x: x - r * 0.82, y: y - r * 0.82, width: r * 1.64, height: r * 1.64, rx: 2, class: cls });
    if (kind === 'triangle') return S('polygon', { points: [x, y - r, x + r * 1.05, y + r * 0.8, x - r * 1.05, y + r * 0.8].join(','), class: cls });
    var pts = [];
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r * 1.05; pts.push((x + rr * Math.cos(a)).toFixed(1), (y + rr * Math.sin(a)).toFixed(1)); }
    return S('polygon', { points: pts.join(','), class: cls });
  }
  PL.shapeSVG = shape;

  function sideItems(side, shapes) {
    var items = [];
    side.c.forEach(function (n, i) { for (var k = 0; k < n; k++) items.push({ t: 's', k: shapes[i] }); });
    if (side.n) items.push({ t: 'n', v: side.n });
    return items;
  }
  function drawScale(sc, shapes, idx) {
    var W = 320, H = 150, cx = 160, beamY = 52;
    var ang = sc.tilt === 'L' ? -7 : sc.tilt === 'R' ? 7 : 0; // left heavier → left side lower
    var rad = ang * Math.PI / 180, arm = 112;
    var lx = cx - arm * Math.cos(rad), ly = beamY - arm * Math.sin(rad);
    var rx = cx + arm * Math.cos(rad), ry = beamY + arm * Math.sin(rad);
    function pan(px, py, items) {
      var g = [];
      var panY = py + 52;
      g.push(S('line', { x1: px - 40, y1: panY, x2: px, y2: py, class: 'sc-str' }));
      g.push(S('line', { x1: px + 40, y1: panY, x2: px, y2: py, class: 'sc-str' }));
      g.push(S('path', { d: 'M' + (px - 46) + ' ' + panY + ' Q ' + px + ' ' + (panY + 14) + ' ' + (px + 46) + ' ' + panY + ' Z', class: 'sc-pan' }));
      // stack items in rows of 4 above pan
      var per = 4, r = 9, gap = 21;
      items.forEach(function (it, i) {
        var row = Math.floor(i / per), col = i % per, inRow = Math.min(per, items.length - row * per);
        var x = px - (inRow - 1) * gap / 2 + col * gap, y = panY - 11 - row * 21;
        if (it.t === 's') g.push(shape(it.k, x, y, r));
        else { g.push(S('rect', { x: x - 10, y: y - 10, width: 20, height: 20, rx: 3, class: 'sc-wt' })); g.push(S('text', { x: x, y: y + 4.5, class: 'sc-wtx', 'text-anchor': 'middle' }, String(it.v))); }
      });
      return g;
    }
    return S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'scale-svg', role: 'img', 'aria-label': describeScale(sc, shapes) },
      S('text', { x: 6, y: 16, class: 'sc-idx' }, 'Scale ' + (idx + 1)),
      S('polygon', { points: (cx - 26) + ',' + (H - 6) + ' ' + (cx + 26) + ',' + (H - 6) + ' ' + cx + ',' + (beamY + 4), class: 'sc-base' }),
      S('line', { x1: lx, y1: ly, x2: rx, y2: ry, class: 'sc-beam' }),
      S('circle', { cx: cx, cy: beamY, r: 4.5, class: 'sc-pivot' }),
      pan(lx, ly, sideItems(sc.L, shapes)), pan(rx, ry, sideItems(sc.R, shapes)),
      sc.tilt ? S('text', { x: cx, y: 22, class: 'sc-note', 'text-anchor': 'middle' }, sc.tilt === 'L' ? 'left is heavier' : 'right is heavier') : S('text', { x: cx, y: 22, class: 'sc-note', 'text-anchor': 'middle' }, 'balanced')
    );
  }
  function sideText(side, shapes) {
    var parts = [];
    side.c.forEach(function (n, i) { if (n) parts.push((n > 1 ? n : '') + GLYPH[shapes[i]]); });
    if (side.n) parts.push(String(side.n));
    return parts.join(' + ') || '0';
  }
  function describeScale(sc, shapes) {
    var op = sc.tilt === 'L' ? ' > ' : sc.tilt === 'R' ? ' < ' : ' = ';
    return sideText(sc.L, shapes) + op + sideText(sc.R, shapes);
  }

  /* ---- maths helpers ---- */
  function rowOf(sc, n) { // L - R = (R.n - L.n)
    var a = []; for (var i = 0; i < n; i++) a.push(Q(sc.L.c[i] - sc.R.c[i]));
    return { a: a, b: Q((sc.R.n || 0) - (sc.L.n || 0)) };
  }
  function eqRows(scales, n) { return scales.filter(function (s) { return !s.tilt; }).map(function (s) { var r = rowOf(s, n); return r.a.concat([r.b]); }); }
  function consOf(scales, n) {
    return scales.map(function (s) {
      var r = rowOf(s, n);
      if (!s.tilt) return { a: r.a, op: '=', b: r.b };
      if (s.tilt === 'L') return { a: r.a, op: '>', b: r.b };
      return { a: r.a.map(function (x) { return Q(-x.n, x.d); }), op: '>', b: Q(-r.b.n, r.b.d) };
    });
  }
  function unit(n, i, k) { var f = []; for (var j = 0; j < n; j++) f.push(Q(j === i ? (k === undefined ? 1 : k) : 0)); return f; }
  function sumW(side, w) { var s = side.n || 0; side.c.forEach(function (c, i) { s += c * w[i]; }); return s; }

  function randSide(rng, n, maxEach, maxKinds) {
    var c = []; for (var i = 0; i < n; i++) c.push(0);
    var kinds = rng.int(1, Math.min(n, maxKinds));
    rng.shuffle(c.map(function (_, i) { return i; })).slice(0, kinds).forEach(function (i) { c[i] = rng.int(1, maxEach); });
    return c;
  }
  function makeScale(rng, w, opt) {
    var n = w.length;
    for (var t = 0; t < 200; t++) {
      var L = randSide(rng, n, opt.maxEach, opt.maxKinds), R = randSide(rng, n, opt.maxEach, opt.maxKinds);
      // avoid same shape on both sides most of the time (allowed at level 2+ for "x on both sides")
      if (opt.oneSideOnly) { R = R.map(function () { return 0; }); }
      var both = false; for (var i = 0; i < n; i++) if (L[i] && R[i]) both = true;
      if (both && !opt.bothOk) continue;
      var sl = sumW({ c: L }, w), sr = sumW({ c: R }, w);
      var sc = { L: { c: L, n: 0 }, R: { c: R, n: 0 }, tilt: 0 };
      if (opt.tilt) {
        if (sl === sr) continue;
        if (opt.nums && rng.chance(0.4)) { var add = rng.int(1, 6); if (rng.chance(0.5)) sc.L.n = add; else sc.R.n = add; }
        var a = sumW(sc.L, w), b = sumW(sc.R, w);
        if (a === b) continue;
        sc.tilt = a > b ? 'L' : 'R';
        return sc;
      }
      if (sl === sr) { if (L.join() === R.join()) continue; return sc; }
      if (!opt.nums) continue;
      var d = sl - sr;
      if (Math.abs(d) > opt.maxNum) continue;
      if (d > 0) sc.R.n = d; else sc.L.n = -d;
      if (opt.extraNums && rng.chance(0.4)) { var e = rng.int(1, 5); sc.L.n += e; sc.R.n += e; }
      if (!R.some(Boolean) && !sc.R.n) continue;
      return sc;
    }
    return null;
  }

  var SPEC = {
    1: { n: 1, types: ['value'], nums: true, maxEach: 3, maxKinds: 1, oneSide: true, maxW: 9 },
    2: { n: 1, types: ['value'], nums: true, maxEach: 4, maxKinds: 1, bothOk: true, maxW: 9 },
    3: { n: 2, types: ['value'], nums: true, maxEach: 3, maxKinds: 2, maxW: 9 },
    4: { n: 2, types: ['value', 'ratio'], nums: true, maxEach: 3, maxKinds: 2, maxW: 10 },
    5: { n: 3, types: ['value', 'ratio'], nums: true, maxEach: 3, maxKinds: 2, maxW: 10 },
    6: { n: 3, types: ['value', 'value', 'insufficient', 'compare'], nums: true, maxEach: 3, maxKinds: 2, maxW: 12, cantTell: true },
    7: { n: 3, types: ['compare', 'value', 'ratio', 'insufficient'], nums: true, maxEach: 3, maxKinds: 3, maxW: 12, cantTell: true },
    8: { n: 3, types: ['must', 'compare', 'value', 'insufficient'], nums: true, maxEach: 3, maxKinds: 3, bothOk: true, maxW: 12, cantTell: true },
    9: { n: 4, types: ['must', 'compare', 'value', 'ratio', 'insufficient'], nums: true, maxEach: 3, maxKinds: 3, bothOk: true, maxW: 12, cantTell: true },
    10: { n: 4, types: ['must', 'compare', 'value', 'insufficient'], nums: true, maxEach: 4, maxKinds: 3, bothOk: true, maxW: 15, cantTell: true }
  };

  function weights(rng, n, maxW) {
    var pool = []; for (var i = 1; i <= maxW; i++) pool.push(i);
    return rng.shuffle(pool).slice(0, n);
  }

  function genValue(rng, sp, insufficient) {
    var n = sp.n, w = weights(rng, n, sp.maxW), shapes = rng.shuffle(SHAPES).slice(0, n);
    var target = rng.int(0, n - 1);
    var scales = [];
    var opt = { maxEach: sp.maxEach, maxKinds: sp.maxKinds, nums: true, maxNum: 30, bothOk: sp.bothOk || n === 1 && sp.bothOk, oneSideOnly: sp.oneSide, extraNums: n === 1 && sp.bothOk };
    for (var t = 0; t < 40 && scales.length < n + 1; t++) {
      // when insufficient: build n-1 independent eqs that do not pin target
      var sc = makeScale(rng, w, opt);
      if (!sc) continue;
      var trial = scales.concat([sc]);
      var rows = eqRows(trial, n);
      if (PL.la.rref(rows, n).piv.length < rows.length) continue; // redundant
      var det = PL.la.determined(rows, n, unit(n, target));
      if (insufficient) {
        if (det) continue;
        scales = trial;
        if (scales.length >= n - 1) break;
      } else {
        scales = trial;
        if (det) break;
      }
    }
    var rowsF = eqRows(scales, n);
    var detF = PL.la.determined(rowsF, n, unit(n, target));
    if (insufficient) { if (detF || scales.length < Math.max(1, n - 1)) return null; }
    else if (!detF || PL.qval(detF) !== w[target]) return null;
    // require at least one numeric weight unless ratio
    return { kind: insufficient ? 'insufficient' : 'value', w: w, shapes: shapes, scales: rng.shuffle(scales), target: target, answer: insufficient ? null : w[target] };
  }

  function genRatio(rng, sp) {
    var n = sp.n, shapes = rng.shuffle(SHAPES).slice(0, n);
    for (var tries = 0; tries < 60; tries++) {
      var w = weights(rng, n, sp.maxW);
      var a = rng.int(0, n - 1), b = rng.int(0, n - 1);
      if (a === b || w[a] % w[b] !== 0 || w[a] / w[b] < 2) continue;
      var k = w[a] / w[b];
      var scales = [], opt = { maxEach: sp.maxEach + 1, maxKinds: sp.maxKinds, nums: false, bothOk: sp.bothOk };
      var f = unit(n, a); f[b] = Q(-k);
      for (var t = 0; t < 60 && scales.length < n; t++) {
        var sc = makeScale(rng, w, opt); if (!sc) continue;
        var tr = scales.concat([sc]), rows = eqRows(tr, n);
        if (PL.la.rref(rows, n).piv.length < rows.length) continue;
        // a direct statement "a = k b" is too easy: avoid a scale that is exactly 1 a vs k b
        scales = tr;
        var d = PL.la.determined(rows, n, f);
        if (d && d.n === 0) break;
      }
      var dd = PL.la.determined(eqRows(scales, n), n, f);
      if (!dd || dd.n !== 0) continue;
      var direct = scales.some(function (s) { var r = rowOf(s, n).a; return r.every(function (x, i) { return (i === a || i === b) ? x.n !== 0 : x.n === 0; }) && Math.abs(r[a].n) === 1; });
      if (direct && scales.length < 2) continue;
      return { kind: 'ratio', w: w, shapes: shapes, scales: rng.shuffle(scales), a: a, b: b, answer: k };
    }
    return null;
  }

  function compareAnswer(scales, n, x, y) {
    var cons = consOf(scales, n), f = unit(n, x); f[y] = Q(-1);
    if (PL.la.entails(cons, n, f, '=')) return 'eq';
    if (PL.la.entails(cons, n, f, '>')) return 'x';
    if (PL.la.entails(cons, n, f, '<')) return 'y';
    return 'unk';
  }
  function genCompare(rng, sp) {
    var n = Math.min(sp.n, 3), shapes = rng.shuffle(SHAPES).slice(0, n);
    var want = rng.weighted(['x', 'y', 'unk'], [2, 2, 1.3]);
    for (var tries = 0; tries < 80; tries++) {
      var w = weights(rng, n, sp.maxW);
      var x = rng.int(0, n - 1), y = (x + rng.int(1, n - 1)) % n;
      var scales = [], nt = rng.int(1, 2), ne = rng.int(1, n - 1);
      for (var i = 0; i < ne; i++) { var s = makeScale(rng, w, { maxEach: sp.maxEach, maxKinds: sp.maxKinds, nums: rng.chance(0.4), maxNum: 12, bothOk: false }); if (s) scales.push(s); }
      for (var j = 0; j < nt; j++) { var t2 = makeScale(rng, w, { maxEach: sp.maxEach, maxKinds: sp.maxKinds, nums: false, tilt: true }); if (t2) scales.push(t2); }
      if (scales.length < 2) continue;
      // no scale may directly compare x and y alone
      var trivial = scales.some(function (s) { var r = rowOf(s, n); return r.b.n === 0 && r.a.every(function (v, i) { return (i === x || i === y) ? Math.abs(v.n) === 1 : v.n === 0; }); });
      if (trivial) continue;
      var ans = compareAnswer(scales, n, x, y);
      if (ans !== want && !(want === 'x' && ans === 'y')) continue;
      return { kind: 'compare', w: w, shapes: shapes, scales: rng.shuffle(scales), x: x, y: y, answer: ans };
    }
    return null;
  }

  function stmtText(st, shapes) {
    var term = function (k, i) { return (k > 1 ? k : '') + GLYPH[shapes[i]]; };
    var lhs = st.l.map(function (p) { return term(p[0], p[1]); }).join(' + ');
    var rhs = st.r.map(function (p) { return term(p[0], p[1]); }).join(' + ');
    return lhs + ' ' + st.op + ' ' + rhs;
  }
  function stmtForm(st, n) { var f = unit(n, 0, 0); st.l.forEach(function (p) { f[p[1]] = PL.qadd(f[p[1]], Q(p[0])); }); st.r.forEach(function (p) { f[p[1]] = PL.qsub(f[p[1]], Q(p[0])); }); return f; }
  function stmtEntailed(st, cons, n) { var f = stmtForm(st, n); return PL.la.entails(cons, n, f, st.op === '=' ? '=' : st.op === '>' ? '>' : '<'); }
  function randStmt(rng, n) {
    var i = rng.int(0, n - 1), j = (i + rng.int(1, n - 1)) % n;
    var r = rng();
    if (r < 0.4) return { l: [[1, i]], op: rng.pick(['>', '<']), r: [[1, j]] };
    if (r < 0.7) return { l: [[rng.int(1, 3), i]], op: rng.pick(['=', '>', '<']), r: [[rng.int(1, 3), j]] };
    var k = n > 2 ? (j + 1) % n === i ? (j + 2) % n : (j + 1) % n : j;
    if (k === i || k === j) return { l: [[2, i]], op: rng.pick(['>', '<']), r: [[1, j]] };
    return { l: [[1, i], [1, j]], op: rng.pick(['>', '<', '=']), r: [[rng.int(1, 2), k]] };
  }
  function genMust(rng, sp) {
    var n = Math.min(sp.n, 3) + (sp.n > 3 && rng.chance(0.3) ? 1 : 0), shapes = rng.shuffle(SHAPES).slice(0, n);
    for (var tries = 0; tries < 120; tries++) {
      var w = weights(rng, n, sp.maxW), scales = [];
      var ne = rng.int(1, n - 1), nt = rng.int(1, 2);
      for (var i = 0; i < ne; i++) { var s = makeScale(rng, w, { maxEach: sp.maxEach, maxKinds: sp.maxKinds, nums: false, bothOk: sp.bothOk }); if (s) scales.push(s); }
      for (var j = 0; j < nt; j++) { var t2 = makeScale(rng, w, { maxEach: sp.maxEach, maxKinds: sp.maxKinds, nums: false, tilt: true }); if (t2) scales.push(t2); }
      if (scales.length < 2) continue;
      var cons = consOf(scales, n);
      var good = null, bad = [], seen = {};
      for (var k = 0; k < 60 && (!good || bad.length < 3); k++) {
        var st = randStmt(rng, n), key = stmtText(st, shapes);
        if (seen[key]) continue; seen[key] = 1;
        var ent = stmtEntailed(st, cons, n);
        // trivial if the statement is literally one of the scales
        var lit = scales.some(function (sc) { return describeScale(sc, shapes).replace(/\s/g, '') === key.replace(/\s/g, ''); });
        if (ent && !good && !lit) good = st; else if (!ent && bad.length < 3) bad.push(st);
      }
      if (!good || bad.length < 3) continue;
      var opts = rng.shuffle([good].concat(bad)).map(function (st) { return { text: stmtText(st, shapes), st: st }; });
      var ansIdx = opts.findIndex(function (o) { return o.st === good; });
      return { kind: 'must', w: w, shapes: shapes, scales: rng.shuffle(scales), options: opts.map(function (o) { return o.text; }), stmts: opts.map(function (o) { return o.st; }), answer: ansIdx };
    }
    return null;
  }

  function generate(level, rng) {
    var sp = SPEC[PL.clamp(level, 1, 10)];
    for (var t = 0; t < 60; t++) {
      var type = rng.pick(sp.types), p = null;
      if (type === 'value') p = genValue(rng, sp, false);
      else if (type === 'insufficient') p = genValue(rng, sp, true);
      else if (type === 'ratio') p = genRatio(rng, sp);
      else if (type === 'compare') p = genCompare(rng, sp);
      else if (type === 'must') p = genMust(rng, sp);
      if (p) {
        p.cantTell = !!sp.cantTell; p.expl = explain(p);
        var txt = p.expl.join('\n');
        // fairness: undetermined answers must be demonstrable with whole-number weights
        if (p.kind === 'insufficient' && txt.indexOf('For example') < 0) continue;
        if (p.kind === 'compare' && p.answer === 'unk' && txt.indexOf('Both ') < 0) continue;
        if (p.kind === 'must' && (txt.match(/fails for/g) || []).length !== 3) continue;
        return p;
      }
    }
    if (level <= 1) throw new Error('Balance generator failed');
    return generate(level - 1, rng);
  }

  /* ---- explanation ---- */
  function formText(f, shapes) {
    var parts = [];
    f.forEach(function (q, i) { if (q.n) parts.push({ c: q, s: GLYPH[shapes[i]] }); });
    if (!parts.length) return '0';
    return parts.map(function (p, k) {
      var v = PL.qval(p.c), a = Math.abs(v), coef = a === 1 ? '' : PL.qstr(Q(Math.abs(p.c.n), p.c.d));
      return (k === 0 ? (v < 0 ? '−' : '') : (v < 0 ? ' − ' : ' + ')) + coef + p.s;
    }).join('');
  }
  function sequentialSteps(p) {
    var n = p.shapes.length, known = {}, steps = [], eqs = p.scales.map(function (s, i) { return { s: s, i: i }; }).filter(function (e) { return !e.s.tilt; });
    var progress = true;
    while (progress) {
      progress = false;
      for (var k = 0; k < eqs.length; k++) {
        var r = rowOf(eqs[k].s, n), unk = [], rhs = r.b;
        r.a.forEach(function (c, i) { if (c.n) { if (known[i] != null) rhs = PL.qsub(rhs, PL.qmul(c, Q(known[i]))); else unk.push(i); } });
        if (unk.length === 1) {
          var i = unk[0], val = PL.qdiv(rhs, r.a[i]);
          if (val.d !== 1) continue;
          known[i] = val.n;
          steps.push('Scale ' + (eqs[k].i + 1) + ': ' + describeScale(eqs[k].s, p.shapes) + (Object.keys(known).length > 1 && r.a.filter(function (c) { return c.n; }).length > 1 ? ', using the weights already found,' : '') + ' gives ' + GLYPH[p.shapes[i]] + ' = ' + val.n + '.');
          progress = true;
        }
      }
    }
    return { known: known, steps: steps };
  }
  function explain(p) {
    var n = p.shapes.length, lines = [];
    if (p.kind === 'value' || p.kind === 'ratio') {
      var seq = p.kind === 'value' ? sequentialSteps(p) : { known: {}, steps: [] };
      if (p.kind === 'value' && seq.known[p.target] != null) return seq.steps;
      var eqIdx = []; p.scales.forEach(function (s, i) { if (!s.tilt) eqIdx.push(i); });
      var rows = eqRows(p.scales, n);
      var f = p.kind === 'value' ? unit(n, p.target) : (function () { var g = unit(n, p.a); g[p.b] = Q(-p.answer); return g; })();
      var lam = PL.la.combo(rows.map(function (r) { return r.slice(0, n).concat([r[n]]); }), n, f);
      if (lam) {
        var used = [], L = 1;
        lam.forEach(function (l) { if (l.n) L = L * l.d / PL.gcd(L, l.d); });
        lam = lam.map(function (l) { return PL.qmul(l, Q(L)); });
        lam.forEach(function (l, k) {
          if (!l.n) return;
          var v = PL.qval(l);
          used.push((used.length ? (v < 0 ? ' − ' : ' + ') : (v < 0 ? '−' : '')) + (Math.abs(v) === 1 ? '' : PL.qstr(Q(Math.abs(l.n), l.d)) + '×') + 'Scale ' + (eqIdx[k] + 1));
        });
        lines.push('Write each balanced scale as an equation (left side minus right side equals the difference in plain weights).');
        p.scales.forEach(function (s, i) { if (!s.tilt) lines.push('Scale ' + (i + 1) + ': ' + describeScale(s, p.shapes)); });
        lines.push('Combine them as ' + used.join('') + '. Everything else cancels, leaving ' + (p.kind === 'value' ? (L > 1 ? L : '') + GLYPH[p.shapes[p.target]] + ' = ' + (L * p.answer) + (L > 1 ? ', so ' + GLYPH[p.shapes[p.target]] + ' = ' + p.answer : '') : (L > 1 ? L : '') + GLYPH[p.shapes[p.a]] + ' = ' + (L * p.answer) + GLYPH[p.shapes[p.b]] + (L > 1 ? ', so ' + GLYPH[p.shapes[p.a]] + ' = ' + p.answer + GLYPH[p.shapes[p.b]] : '')) + '.');
      }
      return lines;
    }
    if (p.kind === 'insufficient') {
      var wit = witnesses(p, function (w) { return w[p.target]; });
      lines.push('The balanced scales give ' + PL.plural(p.scales.length, 'equation') + ' but not enough to pin down ' + GLYPH[p.shapes[p.target]] + '.');
      if (wit) lines.push('For example, ' + witText(wit[0], p.shapes) + ' and ' + witText(wit[1], p.shapes) + ' both fit every scale.');
      return lines;
    }
    if (p.kind === 'compare') {
      var X = GLYPH[p.shapes[p.x]], Y = GLYPH[p.shapes[p.y]];
      if (p.answer === 'unk') {
        var wt = witnesses(p, function (w) { return Math.sign(w[p.x] - w[p.y]); });
        lines.push('The scales do not decide it.');
        if (wt) lines.push('Both ' + witText(wt[0], p.shapes) + ' and ' + witText(wt[1], p.shapes) + ' fit every scale.');
      } else {
        lines.push(p.answer === 'x' ? X + ' must be heavier than ' + Y + '.' : p.answer === 'y' ? Y + ' must be heavier than ' + X + '.' : X + ' and ' + Y + ' must weigh the same.');
        var cert = certificate(p, p.answer === 'x' ? [p.x, p.y] : [p.y, p.x]);
        if (cert) lines.push(cert);
        lines.push('One set of weights that fits: ' + witText(p.w, p.shapes) + '.');
      }
      return lines;
    }
    if (p.kind === 'must') {
      lines.push('Only "' + p.options[p.answer] + '" holds for every set of weights that fits all the scales.');
      var cons = consOf(p.scales, n);
      p.stmts.forEach(function (st, i) {
        if (i === p.answer) return;
        var f = stmtForm(st, n);
        var w = witnessFor(p, function (wv) { var v = 0; f.forEach(function (q, j) { v += PL.qval(q) * wv[j]; }); return st.op === '=' ? Math.abs(v) > 1e-9 : st.op === '>' ? v <= 0 : v >= 0; });
        if (w) lines.push('"' + p.options[i] + '" fails for ' + witText(w, p.shapes) + ', which fits every scale.');
      });
      return lines;
    }
    return lines;
  }
  function fits(p, w) {
    return p.scales.every(function (s) { var a = sumW(s.L, w), b = sumW(s.R, w); return s.tilt === 'L' ? a > b : s.tilt === 'R' ? a < b : a === b; });
  }
  function enumerate(p, cb) {
    var n = p.shapes.length, w = [], max = 15;
    (function rec(i) {
      if (i === n) { if (fits(p, w)) return cb(w.slice()); return false; }
      for (var v = 1; v <= max; v++) { w[i] = v; if (rec(i + 1)) return true; }
      return false;
    })(0);
  }
  function witnesses(p, keyFn) {
    var first = null, out = null;
    enumerate(p, function (w) { if (!first) { first = w; return false; } if (keyFn(w) !== keyFn(first)) { out = [first, w]; return true; } return false; });
    return out;
  }
  function witnessFor(p, pred) { var r = null; enumerate(p, function (w) { if (pred(w)) { r = w; return true; } return false; }); return r; }
  function witText(w, shapes) { return w.map(function (v, i) { return GLYPH[shapes[i]] + '=' + v; }).join(', '); }
  function certificate(p, pair) { // find small integer combo of scales proving heavier/equal
    var n = p.shapes.length, cons = consOf(p.scales, n);
    var target = unit(n, pair[0]); target[pair[1]] = Q(-1);
    var m = cons.length, best = null;
    var lam = [];
    (function rec(k) {
      if (best) return;
      if (k === m) {
        if (lam.every(function (x) { return x === 0; })) return;
        var f = unit(n, 0, 0), b = Q(0), strict = false;
        lam.forEach(function (l, i) { if (!l) return; cons[i].a.forEach(function (q, j) { f[j] = PL.qadd(f[j], PL.qmul(q, Q(l))); }); b = PL.qadd(b, PL.qmul(cons[i].b, Q(l))); if (cons[i].op === '>') strict = true; });
        // need f = c*target + (nonnegative multiples of positive vars), with c>0, b >= 0
        var c = null;
        for (var j = 0; j < n; j++) if (j === pair[0]) c = f[j];
        if (!c || c.n <= 0) return;
        var ok = true;
        for (j = 0; j < n; j++) {
          var expect = j === pair[0] ? c : j === pair[1] ? Q(-c.n, c.d) : Q(0);
          var diff = PL.qsub(expect, f[j]); // must be >=0 → f[j] <= expect, slack positive vars subtracted
          if (PL.qval(diff) > 0) { ok = false; break; } // f has smaller coef than needed
        }
        if (!ok || PL.qval(b) < 0) return;
        best = lam.slice();
        return;
      }
      var range = cons[k].op === '=' ? [0, 1, -1, 2, -2, 3, -3] : [0, 1, 2, 3];
      for (var r = 0; r < range.length; r++) { lam[k] = range[r]; rec(k + 1); if (best) return; }
    })(0);
    if (!best) return null;
    var used = [];
    best.forEach(function (l, i) { if (l) used.push((l < 0 ? '−' : used.length ? '+' : '') + (Math.abs(l) > 1 ? Math.abs(l) + '×' : '') + 'Scale ' + (i + 1)); });
    return 'Reason: combine ' + used.join(' ') + ' and cancel what appears on both sides; what is left shows ' + GLYPH[p.shapes[pair[0]]] + ' outweighs ' + GLYPH[p.shapes[pair[1]]] + ' (every shape has positive weight).';
  }

  /* ---- play ---- */
  function question(p) {
    if (p.kind === 'value' || p.kind === 'insufficient') return 'What does one ' + NAMES[p.shapes[p.target]] + ' ' + GLYPH[p.shapes[p.target]] + ' weigh?';
    if (p.kind === 'ratio') return 'How many ' + NAMES[p.shapes[p.b]] + 's ' + GLYPH[p.shapes[p.b]] + ' balance one ' + NAMES[p.shapes[p.a]] + ' ' + GLYPH[p.shapes[p.a]] + '?';
    if (p.kind === 'compare') return 'Which is heavier: ' + GLYPH[p.shapes[p.x]] + ' or ' + GLYPH[p.shapes[p.y]] + '?';
    return 'Which statement must be true?';
  }
  function init() { return { tries: [] }; }
  function correct(p, ans) {
    if (p.kind === 'value' || p.kind === 'insufficient' || p.kind === 'ratio') {
      if (ans === 'cant') return p.answer === null;
      if (p.answer === null) return false;
      return PL.numMatch(ans, Q(p.answer));
    }
    return ans === p.answer;
  }
  function view(api) {
    var p = api.p, gs = api.gs;
    var submit = function (ans, label) {
      if (api.done) return;
      gs.tries.push(label || String(ans));
      if (correct(p, ans)) { api.update(gs); api.finish('solved'); }
      else { api.wrong(); api.toast('Not right. Check the scales again.', 'bad'); api.update(gs); }
    };
    var ctrl;
    if (p.kind === 'compare') {
      var X = GLYPH[p.shapes[p.x]], Y = GLYPH[p.shapes[p.y]];
      ctrl = h('div', { class: 'opts' }, [['x', X + ' is heavier'], ['y', Y + ' is heavier'], ['eq', 'Same weight'], ['unk', 'Can’t tell']].map(function (o) {
        return h('button', { class: 'btn opt', disabled: api.done, onclick: function () { submit(o[0], o[1]); } }, o[1]);
      }));
    } else if (p.kind === 'must') {
      ctrl = h('div', { class: 'opts' }, p.options.map(function (t, i) { return h('button', { class: 'btn opt mono', disabled: api.done, onclick: function () { submit(i, t); } }, t); }));
    } else {
      var inp = h('input', { id: 'bal-in', class: 'txt', type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Your answer' });
      ctrl = h('div', null,
        h('form', { class: 'row-in', onsubmit: function (e) { e.preventDefault(); if (inp.value.trim()) submit(inp.value.trim()); } }, inp, h('button', { class: 'btn primary', type: 'submit', disabled: api.done }, 'Check')),
        p.cantTell ? h('button', { class: 'btn ghost', disabled: api.done, onclick: function () { submit('cant', 'Not enough information'); } }, 'Not enough information') : null);
    }
    return h('div', { class: 'balance' },
      h('div', { class: 'muted small' }, 'Every shape has a positive weight (not necessarily a whole number). Identical shapes weigh the same. Numbered blocks show their weight.'),
      h('div', { class: 'scales' }, p.scales.map(function (s, i) { return drawScale(s, p.shapes, i); })),
      h('div', { class: 'q' }, question(p)),
      ctrl,
      gs.tries.length ? h('div', { class: 'muted small' }, 'Tried: ' + gs.tries.join(', ')) : null
    );
  }
  /* Progressive hints: the equations first, then genuine deductions taken from the verified explanation
     (an intermediate value, a combination of scales, or a counterexample that eliminates an option). */
  function hintLines(p) {
    var eqs = 'As equations — ' + p.scales.map(function (s, i) { return 'Scale ' + (i + 1) + ': ' + describeScale(s, p.shapes); }).join('; ');
    var out = [eqs], ex = p.expl || [];
    if (p.kind === 'value') {
      var seq = sequentialSteps(p);
      if (seq.known[p.target] != null) out = out.concat(seq.steps.filter(function (l) { return true; }));
      else out = out.concat(ex.filter(function (l) { return /^Combine/.test(l); }).map(function (l) { return l.replace(/, so .*$/, '.'); }));
    } else if (p.kind === 'ratio') out = out.concat(ex.filter(function (l) { return /^Combine/.test(l); }).map(function (l) { return l.replace(/, so .*$/, '.'); }));
    else if (p.kind === 'insufficient') {
      var nEq = p.scales.filter(function (s) { return !s.tilt; }).length;
      out.push('Count them: ' + PL.plural(nEq, 'balanced scale') + ' give at most ' + PL.plural(nEq, 'independent equation') + ' for ' + p.shapes.length + ' unknown shapes. Check whether ' + GLYPH[p.shapes[p.target]] + ' can be isolated.');
      out = out.concat(ex.filter(function (l) { return /^For example/.test(l); }));
    } else if (p.kind === 'compare') out = out.concat(ex.filter(function (l) { return /^Reason|^Both/.test(l); }));
    else if (p.kind === 'must') out = out.concat(ex.filter(function (l) { return /fails for/.test(l); }).map(function (l) { return 'Eliminate: ' + l; }));
    return out;
  }
  function hint(p, gs) {
    var lines = hintLines(p);
    gs.h = gs.h || 0;
    if (gs.h >= lines.length) return { msg: 'No further hints for this puzzle — every useful step has been shown.', noCount: true };
    var msg = lines[gs.h]; gs.h++;
    return { msg: msg, gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var nOpts = p.kind === 'compare' ? 4 : p.kind === 'must' ? 4 : 0;
    var pen = nOpts ? 30 : 18; // wrong guesses cost more where options are few (discourage guessing)
    var q = solved ? PL.clamp(100 - ctx.wrong * pen - ctx.hints * 12, 15, 100) : 0;
    return {
      quality: Math.round(q),
      metrics: { kind: p.kind, unknowns: p.shapes.length, scales: p.scales.length, wrong: ctx.wrong, firstTry: solved && ctx.wrong === 0 },
      lines: [['Question type', { value: 'Find a weight', insufficient: 'Find a weight', ratio: 'Ratio', compare: 'Compare', must: 'Must be true' }[p.kind]], ['Unknown shapes', p.shapes.length], ['Wrong answers', ctx.wrong]]
    };
  }
  function answerText(p) {
    if (p.kind === 'value') return GLYPH[p.shapes[p.target]] + ' = ' + p.answer;
    if (p.kind === 'insufficient') return 'Not enough information';
    if (p.kind === 'ratio') return p.answer + ' ' + GLYPH[p.shapes[p.b]] + ' balance one ' + GLYPH[p.shapes[p.a]];
    if (p.kind === 'compare') return { x: GLYPH[p.shapes[p.x]] + ' is heavier', y: GLYPH[p.shapes[p.y]] + ' is heavier', eq: 'Same weight', unk: 'Can’t tell' }[p.answer];
    return p.options[p.answer];
  }
  function review(p, gs) {
    return h('div', { class: 'review' },
      h('div', { class: 'scales' }, p.scales.map(function (s, i) { return drawScale(s, p.shapes, i); })),
      h('div', null, h('span', { class: 'lbl' }, 'Answer '), h('b', null, answerText(p))),
      h('ol', { class: 'steps' }, p.expl.map(function (l) { return h('li', null, l); })),
      gs.tries.length ? h('div', { class: 'muted small' }, 'Your answers: ' + gs.tries.join(', ')) : null);
  }
  function stats(atts) {
    var by = {}; atts.forEach(function (a) { var k = a.metrics && a.metrics.kind; if (!k) return; (by[k] = by[k] || []).push(a); });
    var acc = function (arr) { return arr.length ? Math.round(100 * arr.filter(function (a) { return a.outcome === 'solved'; }).length / arr.length) + '%' : '—'; };
    var first = atts.filter(function (a) { return a.metrics && a.metrics.firstTry; }).length;
    return [
      ['Accuracy', acc(atts)],
      ['First-try rate', atts.length ? Math.round(100 * first / atts.length) + '%' : '—'],
      ['Find-a-weight accuracy', acc((by.value || []).concat(by.insufficient || []))],
      ['Ratio accuracy', acc(by.ratio || [])],
      ['Compare accuracy', acc(by.compare || [])],
      ['Must-be-true accuracy', acc(by.must || [])]
    ];
  }
  PL.games.balance = {
    id: 'balance', name: 'Balance', blurb: 'Reason about weights from balance scales.',
    rules: 'Each scale shows how shapes compare. A level beam means both sides weigh the same; a tilted beam means the lower side is heavier. Work out what the question asks. On harder puzzles the honest answer can be “Not enough information” or “Can’t tell”.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 45 + lv * 20; }, timeLimit: function (lv) { return 90 + lv * 25; },
    _correct: correct, _fits: fits, _compare: compareAnswer, _answerText: answerText, _describe: describeScale
  };
})();

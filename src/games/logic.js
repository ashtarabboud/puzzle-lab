/* ===== GAME 3: LOGIC LAB ===== */
(function () {
  var h = PL.h;
  var NAMES = ['Ava', 'Ben', 'Cleo', 'Dara', 'Eli', 'Faye', 'Gus', 'Hana', 'Ivo', 'Jude', 'Kai', 'Lena', 'Milo', 'Nora', 'Otto', 'Pia', 'Rex', 'Sol', 'Tess', 'Uma', 'Vic', 'Wren'];

  /* ===================== Shared: permutations & assignment engine ===================== */
  function perms(n) {
    var out = [], a = []; for (var i = 0; i < n; i++) a.push(i);
    (function rec(k) {
      if (k === n) { out.push(a.slice()); return; }
      for (var i = k; i < n; i++) { var t = a[k]; a[k] = a[i]; a[i] = t; rec(k + 1); t = a[k]; a[k] = a[i]; a[i] = t; }
    })(0);
    return out;
  }
  var permCache = {};
  function permsC(n) { return permCache[n] || (permCache[n] = perms(n)); }

  /* ===================== 1. LOGIC GRID ===================== */
  var THEMES = [
    { title: 'Book club', intro: 'Members of a book club each chose a different genre and brought a different snack.', cats: [
      { name: 'Member', vals: null },
      { name: 'Genre', vals: ['mystery', 'poetry', 'history', 'sci-fi', 'memoir'], np: 'the {v} reader' },
      { name: 'Snack', vals: ['scones', 'olives', 'figs', 'pretzels', 'grapes'], np: 'the person who brought {v}' },
      { name: 'Age', vals: [31, 34, 37, 40, 43], num: true, np: 'the {v}-year-old', more: 'older', less: 'younger', unit: 'years', step: 3 }] },
    { title: 'Concert night', intro: 'Five musicians each play a different instrument, start at a different time and come from a different city.', cats: [
      { name: 'Musician', vals: null },
      { name: 'Instrument', vals: ['cello', 'flute', 'harp', 'oboe', 'viola'], np: 'the {v} player' },
      { name: 'City', vals: ['Lisbon', 'Oslo', 'Quito', 'Perth', 'Accra'], np: 'the musician from {v}' },
      { name: 'Start', vals: ['7:00', '7:15', '7:30', '7:45', '8:00'], num: true, nums: [0, 15, 30, 45, 60], np: 'the {v} performer', more: 'later', less: 'earlier', unit: 'minutes', step: 15, verbMore: 'starts', verb: 'starts' }] },
    { title: 'Garden show', intro: 'Gardeners each grew a different flower in a different plot and won a different ribbon colour.', cats: [
      { name: 'Gardener', vals: null },
      { name: 'Flower', vals: ['tulips', 'roses', 'irises', 'dahlias', 'lilies'], np: 'the person who grew {v}' },
      { name: 'Ribbon', vals: ['red', 'blue', 'white', 'gold', 'green'], np: 'the {v}-ribbon winner' },
      { name: 'Plot', vals: [1, 2, 3, 4, 5], num: true, np: 'the gardener in plot {v}', more: 'in a higher-numbered plot', less: 'in a lower-numbered plot', unit: 'plots', step: 1, rawCompare: true }] },
    { title: 'Bakery orders', intro: 'Customers each ordered a different cake in a different box, for pickup on different days.', cats: [
      { name: 'Customer', vals: null },
      { name: 'Cake', vals: ['lemon', 'carrot', 'almond', 'cherry', 'walnut'], np: 'the {v} cake customer' },
      { name: 'Box', vals: ['striped', 'plain', 'floral', 'dotted', 'gold'], np: 'the customer with the {v} box' },
      { name: 'Pickup', vals: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], num: true, nums: [1, 2, 3, 4, 5], np: 'the {v} pickup', more: 'later in the week', less: 'earlier in the week', unit: 'days', step: 1, rawCompare: true, verb: 'picks up' }] },
    { title: 'Hiking club', intro: 'Hikers each climbed a different peak carrying a different snack, and each hiked a different distance.', cats: [
      { name: 'Hiker', vals: null },
      { name: 'Peak', vals: ['Ash Ridge', 'Bell Top', 'Crow Hill', 'Dune Point', 'Echo Crag'], np: 'the hiker who climbed {v}' },
      { name: 'Snack', vals: ['trail mix', 'apples', 'jerky', 'cheese', 'dates'], np: 'the hiker with {v}' },
      { name: 'Distance', vals: [6, 8, 10, 12, 14], num: true, np: 'the {v} km hiker', more: 'farther', less: 'a shorter distance', unit: 'km', step: 2, verb: 'hiked' }] }
  ];

  function gridSpec(lv) {
    if (lv <= 2) return { n: 3, k: 3 };
    if (lv <= 4) return { n: 4, k: 3 };
    if (lv <= 6) return { n: 4, k: 4 };
    if (lv <= 8) return { n: 5, k: 3 };
    return { n: 5, k: 4 };
  }
  function gridGen(lv, rng) {
    var sp = gridSpec(lv), th = rng.pick(THEMES);
    var n = sp.n;
    var people = rng.shuffle(NAMES).slice(0, n).sort();
    var catIdx = [0].concat(rng.shuffle([1, 2, 3]).slice(0, sp.k - 1).sort());
    if (sp.k === 4) catIdx = [0, 1, 2, 3];
    // numeric category must keep consecutive values to make relations meaningful
    var cats = catIdx.map(function (ci) {
      var c = th.cats[ci];
      if (ci === 0) return { name: c.name, vals: people, np: '{v}' };
      var o = PL.deep(c);
      o.vals = c.vals.slice(0, n);
      if (c.nums) o.nums = c.nums.slice(0, n);
      return o;
    });
    // 5-item 4-cat (k=4,n=5) is too big to brute force: use n=5,k=3 or n=4,k=4
    if (n === 5 && sp.k === 4) { cats = cats.slice(0, 3); if (!cats.some(function (c) { return c.num; })) cats[2] = (function () { var c = PL.deep(th.cats[3]); c.vals = c.vals.slice(0, n); if (c.nums) c.nums = c.nums.slice(0, n); return c; })(); }
    var K = cats.length;
    var sol = []; for (var c = 1; c < K; c++) sol.push(rng.shuffle(seq(n)));
    var P = { type: 'grid', title: th.title, intro: th.intro, cats: cats, n: n, sol: sol };
    var all = gridAll(n, K);
    var cand = all.slice();
    var clues = [];
    var weights = lv <= 3 ? { pos: 4, neg: 3, rel: 2, either: 1, pair: 1 } : lv <= 6 ? { pos: 2, neg: 4, rel: 3, either: 2, pair: 2 } : { pos: 1, neg: 4, rel: 4, either: 3, pair: 3 };
    for (var guard = 0; guard < 400 && cand.length > 1; guard++) {
      var cl = gridRandClue(P, rng, weights);
      if (!cl || !gridEval(P, cl, sol)) continue;
      var nc = cand.filter(function (s) { return gridEval(P, cl, s); });
      if (nc.length === cand.length) continue;
      if (lv >= 5 && cl.t === 'pos' && nc.length === 1 && clues.length < 4) continue; // avoid trivial finishes
      clues.push(cl); cand = nc;
    }
    if (cand.length !== 1) return null;
    // minimise
    for (var i = clues.length - 1; i >= 0; i--) {
      var rest = clues.slice(0, i).concat(clues.slice(i + 1));
      var cnt = 0;
      for (var j = 0; j < all.length && cnt < 2; j++) if (rest.every(function (x) { return gridEval(P, x, all[j]); })) cnt++;
      if (cnt === 1) clues = rest;
    }
    P.clues = rng.shuffle(clues);
    P.clueText = P.clues.map(function (c) { return gridClueText(P, c); });
    return P;
  }
  function seq(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }
  function gridAll(n, K) {
    var ps = permsC(n), out = [[]];
    for (var c = 1; c < K; c++) { var nx = []; out.forEach(function (o) { ps.forEach(function (p) { nx.push(o.concat([p])); }); }); out = nx; }
    return out;
  }
  function ent(P, s, it) { return it.c === 0 ? it.v : s[it.c - 1].indexOf(it.v); }
  function numVal(P, c, v) { var cat = P.cats[c]; return cat.nums ? cat.nums[v] : cat.vals[v]; }
  function valOfEnt(P, s, c, e) { return c === 0 ? e : s[c - 1][e]; }
  function gridEval(P, cl, s) {
    var ea = ent(P, s, cl.a), eb = cl.b ? ent(P, s, cl.b) : null;
    if (cl.t === 'pos') return ea === eb;
    if (cl.t === 'neg') return ea !== eb;
    if (cl.t === 'either') return ea === eb || ea === ent(P, s, cl.c2);
    if (cl.t === 'pair') { var ec = ent(P, s, cl.c2), ed = ent(P, s, cl.d); return (ea === ec && eb === ed) || (ea === ed && eb === ec); }
    if (cl.t === 'rel') {
      var va = numVal(P, cl.nc, valOfEnt(P, s, cl.nc, ea)), vb = numVal(P, cl.nc, valOfEnt(P, s, cl.nc, eb));
      if (ea === eb) return false;
      if (cl.d != null) return va - vb === cl.d;
      return cl.dir > 0 ? va > vb : va < vb;
    }
    return true;
  }
  function gridRandClue(P, rng, wts) {
    var K = P.cats.length, n = P.n, s = P.sol;
    var t = rng.weighted(Object.keys(wts), Object.keys(wts).map(function (k) { return wts[k]; }));
    var numC = -1; P.cats.forEach(function (c, i) { if (c.num) numC = i; });
    var item = function (c, v) { return { c: c, v: v }; };
    var rItem = function (excl) { var c; do { c = rng.int(0, K - 1); } while (excl != null && c === excl); return item(c, rng.int(0, n - 1)); };
    if (t === 'pos' || t === 'neg') { var a = rItem(), b = rItem(a.c); if (a.c === numC && b.c === numC) return null; return { t: t, a: a, b: b }; }
    if (t === 'either') { var a2 = rItem(), c2 = rng.int(0, K - 1); if (c2 === a2.c) return null; var v1 = rng.int(0, n - 1), v2 = rng.int(0, n - 1); if (v1 === v2) return null; return { t: 'either', a: a2, b: item(c2, v1), c2: item(c2, v2) }; }
    if (t === 'pair') {
      var ca = rng.int(0, K - 1), cb = rng.int(0, K - 1); if (ca === cb) return null;
      var x1 = rng.int(0, n - 1), x2 = rng.int(0, n - 1), y1 = rng.int(0, n - 1), y2 = rng.int(0, n - 1);
      if (x1 === x2 || y1 === y2) return null;
      return { t: 'pair', a: item(ca, x1), b: item(ca, x2), c2: item(cb, y1), d: item(cb, y2) };
    }
    if (t === 'rel' && numC >= 0) {
      var p = rItem(numC), q = rItem(numC);
      var useD = rng.chance(0.5);
      var ep = ent(P, s, p), eq = ent(P, s, q); if (ep === eq) return null;
      var vp = numVal(P, numC, valOfEnt(P, s, numC, ep)), vq = numVal(P, numC, valOfEnt(P, s, numC, eq));
      return { t: 'rel', a: p, b: q, nc: numC, d: useD ? vp - vq : null, dir: vp > vq ? 1 : -1 };
    }
    return null;
  }
  function np(P, it) { var c = P.cats[it.c]; return c.np.replace('{v}', c.vals[it.v]); }
  function gridClueText(P, cl) {
    var A = PL.cap(np(P, cl.a));
    if (cl.t === 'pos') return A + ' is ' + np(P, cl.b) + '.';
    if (cl.t === 'neg') return A + ' is not ' + np(P, cl.b) + '.';
    if (cl.t === 'either') return A + ' is either ' + np(P, cl.b) + ' or ' + np(P, cl.c2) + '.';
    if (cl.t === 'pair') return 'Of ' + np(P, cl.a) + ' and ' + np(P, cl.b) + ', one is ' + np(P, cl.c2) + ' and the other is ' + np(P, cl.d) + '.';
    var nc = P.cats[cl.nc], up = cl.d != null ? cl.d > 0 : cl.dir > 0;
    var word = up ? nc.more : nc.less;
    if (cl.d != null) {
      var amt = Math.abs(cl.d);
      if (nc.rawCompare) return A + (nc.verb ? ' ' + nc.verb + ' ' + amt + ' ' + (amt === 1 ? nc.unit.replace(/s$/, '') : nc.unit) + ' ' + word.replace(/^in a /, '').replace('later in the week', 'later').replace('earlier in the week', 'earlier') + ' than ' : ' is ' + amt + ' ' + (amt === 1 ? nc.unit.replace(/s$/, '') : nc.unit) + ' ' + (up ? 'higher' : 'lower') + ' than ') + np(P, cl.b) + '.';
      if (nc.verb) return A + ' ' + nc.verb + ' ' + amt + ' ' + nc.unit + ' ' + word + ' than ' + np(P, cl.b) + '.';
      return A + ' is ' + amt + ' ' + nc.unit + ' ' + word + ' than ' + np(P, cl.b) + '.';
    }
    if (nc.verb) return A + ' ' + nc.verb + ' ' + word + ' than ' + np(P, cl.b) + '.';
    return A + ' is ' + word + ' than ' + np(P, cl.b) + '.';
  }

  /* ===================== 2. ORDERING ===================== */
  var ORDER_THEMES = [
    { title: 'Photo finish', intro: 'Runners crossed the finish line one at a time.', pos: 'place', first: '1st', ahead: 'finished ahead of', behind: 'finished behind', imm: 'finished immediately ahead of', at: 'finished in {p} place', notEnd: 'did not finish first or last', ord: true },
    { title: 'Bookshelf', intro: 'Books stand in a single row on a shelf, numbered from the left.', pos: 'slot', first: 'leftmost', ahead: 'is somewhere to the left of', behind: 'is somewhere to the right of', imm: 'is directly to the left of', at: 'is in slot {n}', notEnd: 'is not at either end', items: ['Atlas', 'Bible', 'Cookbook', 'Diary', 'Encyclopedia', 'Field guide', 'Gazetteer'] },
    { title: 'Apartment floors', intro: 'Neighbours each live on a different floor of a small building, numbered from the bottom.', pos: 'floor', first: 'lowest', ahead: 'lives below', behind: 'lives above', imm: 'lives directly below', at: 'lives on floor {n}', notEnd: 'lives on neither the top nor the bottom floor' }
  ];
  function ordPlace(k) { return k + (k === 1 ? 'st' : k === 2 ? 'nd' : k === 3 ? 'rd' : 'th'); }
  function orderGen(lv, rng) {
    var n = PL.clamp(3 + Math.ceil(lv / 2), 4, 7);
    var th = rng.pick(ORDER_THEMES);
    var items = th.items ? rng.shuffle(th.items).slice(0, n) : rng.shuffle(NAMES).slice(0, n);
    items.sort();
    var sol = rng.shuffle(seq(n)); // sol[item] = position
    var P = { type: 'order', title: th.title, intro: th.intro + ' Work out the full order.', items: items, n: n, th: ORDER_THEMES.indexOf(th), sol: sol };
    var all = permsC(n), cand = all.slice(), clues = [];
    var wts = lv <= 3 ? { before: 3, imm: 2, at: 2, notAdj: 1, between: 1, notEnd: 1 } : lv <= 7 ? { before: 4, imm: 2, at: 1, notAdj: 2, between: 2, notEnd: 1 } : { before: 5, imm: 1, at: 0.5, notAdj: 3, between: 3, notEnd: 2 };
    for (var g = 0; g < 500 && cand.length > 1; g++) {
      var cl = orderRandClue(P, rng, wts);
      if (!cl || !orderEval(cl, sol)) continue;
      var nc = cand.filter(function (s) { return orderEval(cl, s); });
      if (nc.length === cand.length) continue;
      clues.push(cl); cand = nc;
    }
    if (cand.length !== 1) return null;
    for (var i = clues.length - 1; i >= 0; i--) {
      var rest = clues.slice(0, i).concat(clues.slice(i + 1)), cnt = 0;
      for (var j = 0; j < all.length && cnt < 2; j++) if (rest.every(function (x) { return orderEval(x, all[j]); })) cnt++;
      if (cnt === 1) clues = rest;
    }
    P.clues = rng.shuffle(clues);
    P.clueText = P.clues.map(function (c) { return orderText(P, c); });
    return P;
  }
  function orderRandClue(P, rng, wts) {
    var n = P.n, t = rng.weighted(Object.keys(wts), Object.keys(wts).map(function (k) { return wts[k]; }));
    var a = rng.int(0, n - 1), b = rng.int(0, n - 1);
    if (t === 'at') return { t: 'at', a: a, p: P.sol[a] };
    if (t === 'notEnd') return { t: 'notEnd', a: a };
    if (a === b) return null;
    if (t === 'before') return { t: 'before', a: a, b: b };
    if (t === 'imm') return { t: 'imm', a: a, b: b };
    if (t === 'notAdj') return { t: 'notAdj', a: a, b: b };
    if (t === 'between') return { t: 'between', a: a, b: b, k: Math.abs(P.sol[a] - P.sol[b]) - 1 };
    return null;
  }
  function orderEval(cl, s) {
    if (cl.t === 'at') return s[cl.a] === cl.p;
    if (cl.t === 'notEnd') return s[cl.a] !== 0 && s[cl.a] !== s.length - 1;
    if (cl.t === 'before') return s[cl.a] < s[cl.b];
    if (cl.t === 'imm') return s[cl.b] - s[cl.a] === 1;
    if (cl.t === 'notAdj') return Math.abs(s[cl.a] - s[cl.b]) !== 1;
    if (cl.t === 'between') return Math.abs(s[cl.a] - s[cl.b]) - 1 === cl.k;
    return true;
  }
  function orderText(P, cl) {
    var th = ORDER_THEMES[P.th], A = P.items[cl.a], B = cl.b != null ? P.items[cl.b] : '';
    var art = th.items ? 'The ' : '';
    var nmA = th.items ? art + A.toLowerCase() : A, nmB = th.items ? 'the ' + B.toLowerCase() : B;
    if (cl.t === 'at') return nmA + ' ' + th.at.replace('{p}', ordPlace(cl.p + 1)).replace('{n}', cl.p + 1) + '.';
    if (cl.t === 'notEnd') return nmA + ' ' + th.notEnd + '.';
    if (cl.t === 'before') return nmA + ' ' + th.ahead + ' ' + nmB + '.';
    if (cl.t === 'imm') return nmA + ' ' + th.imm + ' ' + nmB + '.';
    if (cl.t === 'notAdj') return nmA + ' and ' + nmB + ' are not next to each other.';
    if (cl.t === 'between') return cl.k === 0 ? nmA + ' and ' + nmB + ' are next to each other.' : 'Exactly ' + PL.plural(cl.k, th.items ? 'book' : 'person', th.items ? 'books' : 'people') + ' ' + (cl.k === 1 ? 'is' : 'are') + ' between ' + nmA.replace(/^The /, 'the ') + ' and ' + nmB + '.';
    return '';
  }

  /* ===================== 3. SCHEDULING ===================== */
  function partitions(n, D, cap) { // all assignments person -> day with exactly cap per day
    var out = [], a = [], cnt = []; for (var d = 0; d < D; d++) cnt.push(0);
    (function rec(i) {
      if (i === n) { out.push(a.slice()); return; }
      for (var d = 0; d < D; d++) if (cnt[d] < cap) { a[i] = d; cnt[d]++; rec(i + 1); cnt[d]--; }
    })(0);
    return out;
  }
  var SCHED_THEMES = [
    { title: 'Volunteer rota', intro: 'Volunteers are scheduled at a food bank, with the same number on each day.', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], unit: 'day' },
    { title: 'Lab shifts', intro: 'Researchers share lab shifts, with the same number on each shift.', days: ['early shift', 'midday shift', 'late shift', 'night shift'], unit: 'shift' },
    { title: 'Conference talks', intro: 'Speakers are placed in sessions, with the same number in each session.', days: ['Session 1', 'Session 2', 'Session 3', 'Session 4'], unit: 'session' }
  ];
  function schedGen(lv, rng) {
    var cfg = lv <= 4 ? { D: 3, cap: 2 } : lv <= 7 ? { D: 4, cap: 2 } : { D: 3, cap: 3 };
    var n = cfg.D * cfg.cap, th = rng.pick(SCHED_THEMES);
    var people = rng.shuffle(NAMES).slice(0, n).sort();
    var all = partitions(n, cfg.D, cfg.cap);
    var sol = rng.pick(all);
    var P = { type: 'sched', title: th.title, intro: th.intro + ' There are ' + n + ' people, ' + cfg.D + ' ' + th.unit + 's, and ' + cfg.cap + ' people per ' + th.unit + '. Assign everyone.', people: people, days: th.days.slice(0, cfg.D), n: n, D: cfg.D, cap: cfg.cap, unit: th.unit, sol: sol };
    var cand = all.slice(), clues = [];
    var wts = lv <= 4 ? { same: 2, diff: 3, on: 2, noton: 2, earlier: 2, next: 1 } : { same: 2, diff: 3, on: 0.5, noton: 3, earlier: 3, next: 2, cond: 2 };
    for (var g = 0; g < 600 && cand.length > 1; g++) {
      var cl = schedRand(P, rng, wts);
      if (!cl || !schedEval(cl, sol)) continue;
      var nc = cand.filter(function (s) { return schedEval(cl, s); });
      if (nc.length === cand.length) continue;
      clues.push(cl); cand = nc;
    }
    if (cand.length !== 1) return null;
    for (var i = clues.length - 1; i >= 0; i--) {
      var rest = clues.slice(0, i).concat(clues.slice(i + 1)), cnt = 0;
      for (var j = 0; j < all.length && cnt < 2; j++) if (rest.every(function (x) { return schedEval(x, all[j]); })) cnt++;
      if (cnt === 1) clues = rest;
    }
    P.clues = rng.shuffle(clues);
    P.clueText = P.clues.map(function (c) { return schedText(P, c); });
    return P;
  }
  function schedRand(P, rng, wts) {
    var t = rng.weighted(Object.keys(wts), Object.keys(wts).map(function (k) { return wts[k]; }));
    var a = rng.int(0, P.n - 1), b = rng.int(0, P.n - 1), d = rng.int(0, P.D - 1);
    if (t === 'on') return { t: 'on', a: a, d: d };
    if (t === 'noton') return { t: 'noton', a: a, d: d };
    if (a === b) return null;
    if (t === 'cond') { var c = rng.int(0, P.n - 1); if (c === a || c === b) return null; return { t: 'cond', a: a, d: d, b: b, c: c }; }
    return { t: t, a: a, b: b };
  }
  function schedEval(cl, s) {
    if (cl.t === 'on') return s[cl.a] === cl.d;
    if (cl.t === 'noton') return s[cl.a] !== cl.d;
    if (cl.t === 'same') return s[cl.a] === s[cl.b];
    if (cl.t === 'diff') return s[cl.a] !== s[cl.b];
    if (cl.t === 'earlier') return s[cl.a] < s[cl.b];
    if (cl.t === 'next') return s[cl.b] - s[cl.a] === 1;
    if (cl.t === 'cond') return s[cl.a] !== cl.d || s[cl.b] === s[cl.c];
    return true;
  }
  function schedText(P, cl) {
    var A = P.people[cl.a], B = cl.b != null ? P.people[cl.b] : '', D = cl.d != null ? P.days[cl.d] : '';
    var on = P.unit === 'day' ? 'on ' : P.unit === 'session' ? 'in ' : 'on the ';
    if (cl.t === 'on') return A + ' is ' + on + D + '.';
    if (cl.t === 'noton') return A + ' is not ' + on + D + '.';
    if (cl.t === 'same') return A + ' and ' + B + ' are on the same ' + P.unit + '.';
    if (cl.t === 'diff') return A + ' and ' + B + ' are on different ' + P.unit + 's.';
    if (cl.t === 'earlier') return A + '’s ' + P.unit + ' comes before ' + B + '’s.';
    if (cl.t === 'next') return B + '’s ' + P.unit + ' comes directly after ' + A + '’s.';
    if (cl.t === 'cond') return 'If ' + A + ' is ' + on + D + ', then ' + B + ' and ' + P.people[cl.c] + ' share a ' + P.unit + '.';
    return '';
  }

  /* ===================== 4. KNIGHTS AND KNAVES ===================== */
  function kkGen(lv, rng) {
    var n = lv <= 3 ? 3 : lv <= 7 ? 4 : 5;
    var people = rng.shuffle(NAMES).slice(0, n);
    var all = []; for (var m = 0; m < (1 << n); m++) { var a = []; for (var i = 0; i < n; i++) a.push((m >> i) & 1); all.push(a); } // 1 = knight
    for (var tries = 0; tries < 200; tries++) {
      var sol = rng.pick(all);
      var stmts = [];
      for (var i2 = 0; i2 < n; i2++) {
        // each speaker makes one statement; statement truth must equal speaker type
        for (var t = 0; t < 40; t++) {
          var st = kkRand(rng, n, i2, lv);
          if (kkEval(st, sol) === !!sol[i2]) { stmts.push(st); break; }
        }
        if (stmts.length !== i2 + 1) break;
      }
      if (stmts.length !== n) continue;
      var sols = all.filter(function (s) { return stmts.every(function (st, k) { return kkEval(st, s) === !!s[k]; }); });
      if (sols.length !== 1) continue;
      // avoid puzzles where every statement is a direct "X is a knave" (too formulaic) at higher levels
      var kinds = {}; stmts.forEach(function (s) { kinds[s.t] = 1; });
      if (lv >= 5 && Object.keys(kinds).length < 2) continue;
      var P = { type: 'kk', title: 'Island of knights and knaves', intro: 'Every inhabitant is either a knight, who always tells the truth, or a knave, who always lies. You meet ' + PL.listJoin(people) + '. Decide who is which.', people: people, n: n, stmts: stmts, sol: sol };
      P.clueText = stmts.map(function (s, k) { return people[k] + ' says: “' + kkText(s, people, k) + '”'; });
      return P;
    }
    return null;
  }
  function kkRand(rng, n, sp, lv) {
    var others = seq(n).filter(function (i) { return i !== sp; });
    var pool = lv <= 3 ? ['is', 'is', 'same', 'count'] : ['is', 'same', 'count', 'atleast', 'if', 'or'];
    var t = rng.pick(pool);
    if (t === 'is') return { t: 'is', x: rng.pick(others), k: rng.int(0, 1) };
    if (t === 'same') { var x = rng.pick(others), y = rng.pick(seq(n).filter(function (i) { return i !== x; })); return { t: 'same', x: x, y: y, same: rng.int(0, 1) }; }
    if (t === 'count') return { t: 'count', k: rng.int(0, Math.min(2, n)), knights: rng.int(0, 1) };
    if (t === 'atleast') return { t: 'atleast', k: rng.int(1, Math.min(3, n - 1)), knights: rng.int(0, 1) };
    if (t === 'if') { var p = rng.pick(others), q = rng.pick(seq(n).filter(function (i) { return i !== p; })); return { t: 'if', p: p, pk: rng.int(0, 1), q: q, qk: rng.int(0, 1) }; }
    return { t: 'or', p: sp, pk: 0, q: rng.pick(others), qk: rng.int(0, 1) }; // "I am a knave or X is a knight"
  }
  function kkEval(st, s) {
    var cntK = s.reduce(function (a, b) { return a + b; }, 0), n = s.length;
    if (st.t === 'is') return s[st.x] === st.k;
    if (st.t === 'same') return (s[st.x] === s[st.y]) === !!st.same;
    if (st.t === 'count') return (st.knights ? cntK : n - cntK) === st.k;
    if (st.t === 'atleast') return (st.knights ? cntK : n - cntK) >= st.k;
    if (st.t === 'if') return s[st.p] !== st.pk || s[st.q] === st.qk;
    if (st.t === 'or') return s[st.p] === st.pk || s[st.q] === st.qk;
    return false;
  }
  function kkText(st, ppl, sp) {
    var kind = function (k) { return k ? 'a knight' : 'a knave'; };
    var nm = function (i) { return i === sp ? 'I' : ppl[i]; };
    var be = function (i) { return i === sp ? 'am' : 'is'; };
    if (st.t === 'is') return ppl[st.x] + ' is ' + kind(st.k) + '.';
    if (st.t === 'same') return (st.x === sp || st.y === sp ? (st.x === sp ? 'I' : ppl[st.x]) + ' and ' + (st.y === sp ? 'I' : ppl[st.y]) : ppl[st.x] + ' and ' + ppl[st.y]) + (st.same ? ' are the same kind.' : ' are different kinds.');
    if (st.t === 'count') return (st.k === 0 ? 'None' : 'Exactly ' + ['zero', 'one', 'two', 'three'][st.k]) + ' of us ' + (st.k === 1 ? 'is ' : 'are ') + (st.knights ? (st.k === 1 ? 'a knight' : 'knights') : (st.k === 1 ? 'a knave' : 'knaves')) + '.';
    if (st.t === 'atleast') return 'At least ' + ['zero', 'one', 'two', 'three'][st.k] + ' of us ' + (st.k === 1 ? 'is ' : 'are ') + (st.knights ? (st.k === 1 ? 'a knight' : 'knights') : (st.k === 1 ? 'a knave' : 'knaves')) + '.';
    if (st.t === 'if') return 'If ' + nm(st.p) + ' ' + be(st.p) + ' ' + kind(st.pk) + ', then ' + nm(st.q) + ' ' + be(st.q) + ' ' + kind(st.qk) + '.';
    return nm(st.p) + ' ' + be(st.p) + ' ' + kind(st.pk) + ', or ' + nm(st.q) + ' ' + be(st.q) + ' ' + kind(st.qk) + '.';
  }

  /* ===================== 5. CONDITIONAL REASONING ===================== */
  var ATOMS = [
    ['the gallery is open', 'the gallery is closed'], ['Jo takes the train', 'Jo does not take the train'], ['the meeting runs late', 'the meeting does not run late'],
    ['the lights are on', 'the lights are off'], ['the report is approved', 'the report is not approved'], ['it snows', 'it does not snow'],
    ['the road is gritted', 'the road is not gritted'], ['Sam brings dessert', 'Sam does not bring dessert'], ['the alarm sounds', 'the alarm does not sound'],
    ['the market is busy', 'the market is quiet'], ['the bridge is raised', 'the bridge is lowered'], ['Kim wins the vote', 'Kim does not win the vote'],
    ['the ferry runs', 'the ferry does not run'], ['the server restarts', 'the server does not restart'], ['the kiln is lit', 'the kiln is not lit']
  ];
  function condGen(lv, rng) {
    var nv = lv <= 4 ? 3 : 4;
    var atoms = rng.shuffle(ATOMS).slice(0, nv);
    var asg = []; for (var m = 0; m < (1 << nv); m++) { var a = []; for (var i = 0; i < nv; i++) a.push((m >> i) & 1); asg.push(a); }
    var lit = function (v, pos) { return { v: v, p: pos }; };
    for (var tries = 0; tries < 300; tries++) {
      var np_ = lv <= 4 ? rng.int(2, 3) : rng.int(3, 4);
      var prem = [];
      var forms = lv <= 4 ? ['imp', 'imp', 'or', 'fact'] : ['imp', 'onlyif', 'or', 'nand', 'unless', 'fact', 'iff'];
      for (var k = 0; k < np_; k++) {
        var f = rng.pick(forms), x = rng.int(0, nv - 1), y = rng.int(0, nv - 1);
        if (f !== 'fact' && x === y) { k--; continue; }
        prem.push(f === 'fact' ? { f: f, a: lit(x, rng.int(0, 1)) } : { f: f, a: lit(x, rng.int(0, 1)), b: lit(y, rng.int(0, 1)) });
      }
      if (prem.filter(function (p) { return p.f === 'fact'; }).length > 1) continue;
      var models = asg.filter(function (s) { return prem.every(function (p) { return premEval(p, s); }); });
      if (!models.length || models.length === asg.length) continue;
      var used = {}; prem.forEach(function (q) { used[q.a.v] = 1; if (q.b) used[q.b.v] = 1; });
      if (Object.keys(used).length < nv) continue;
      var askMust = lv <= 6 ? true : rng.chance(0.6);
      // candidate statements: literals and implications
      var cands = [];
      for (var v = 0; v < nv; v++) for (var pp = 0; pp < 2; pp++) cands.push({ f: 'fact', a: lit(v, pp) });
      for (var v1 = 0; v1 < nv; v1++) for (var v2 = 0; v2 < nv; v2++) if (v1 !== v2) for (var s1 = 0; s1 < 2; s1++) for (var s2 = 0; s2 < 2; s2++) cands.push({ f: 'imp', a: lit(v1, s1), b: lit(v2, s2) });
      var isPrem = function (c) { return prem.some(function (p) { return JSON.stringify(p) === JSON.stringify(c) || (p.f === 'fact' && c.f === 'fact' && p.a.v === c.a.v && p.a.p === c.a.p); }); };
      var must = function (c) { return models.every(function (s) { return premEval(c, s); }); };
      var could = function (c) { return models.some(function (s) { return premEval(c, s); }); };
      var good, bad;
      if (askMust) {
        good = cands.filter(function (c) { return must(c) && !isPrem(c) && !(c.f === 'imp' && contrapositiveOfPrem(c, prem)) && !(c.f === 'imp' && !models.some(function (s) { return L(c.a, s); })) && !(c.f === 'imp' && models.every(function (s) { return L(c.b, s); })); });
        bad = cands.filter(function (c) { return !must(c); });
      } else {
        good = cands.filter(function (c) { return could(c) && !must(c) && c.f === 'fact'; });
        bad = cands.filter(function (c) { return !could(c); });
      }
      if (!good.length || bad.length < 3) continue;
      var g = rng.pick(good);
      // prefer a "converse error" distractor for implication answers
      var opts = rng.shuffle([g].concat(rng.shuffle(bad).slice(0, 3)));
      var P = { type: 'cond', title: 'If and only if', intro: 'Assume every statement below is true.', atoms: atoms, prem: prem, nv: nv, ask: askMust ? 'Which of these must be true?' : 'Which of these could be true? (Exactly one is consistent with the statements.)', opts: opts, ans: opts.indexOf(g), askMust: askMust };
      P.clueText = prem.map(function (p) { return condText(p, atoms); });
      P.optText = opts.map(function (o) { return condText(o, atoms); });
      return P;
    }
    return null;
  }
  function contrapositiveOfPrem(c, prem) {
    return prem.some(function (p) { return p.f === 'imp' && p.a.v === c.b.v && p.b.v === c.a.v && p.a.p !== c.b.p && p.b.p !== c.a.p; });
  }
  function L(lt, s) { return s[lt.v] === lt.p; }
  function premEval(p, s) {
    if (p.f === 'fact') return L(p.a, s);
    if (p.f === 'imp') return !L(p.a, s) || L(p.b, s);
    if (p.f === 'onlyif') return !L(p.a, s) || L(p.b, s); // A only if B == A -> B
    if (p.f === 'or') return L(p.a, s) || L(p.b, s);
    if (p.f === 'nand') return !(L(p.a, s) && L(p.b, s));
    if (p.f === 'unless') return L(p.b, s) || L(p.a, s); // A unless B == if not B then A
    if (p.f === 'iff') return L(p.a, s) === L(p.b, s);
    return true;
  }
  function condText(p, atoms) {
    var t = function (lt) { return atoms[lt.v][lt.p ? 0 : 1]; };
    if (p.f === 'fact') return PL.cap(t(p.a)) + '.';
    if (p.f === 'imp') return 'If ' + t(p.a) + ', then ' + t(p.b) + '.';
    if (p.f === 'onlyif') return PL.cap(t(p.a)) + ' only if ' + t(p.b) + '.';
    if (p.f === 'or') return 'At least one is true: ' + t(p.a) + ', or ' + t(p.b) + '.';
    if (p.f === 'nand') return 'It is not the case that both ' + t(p.a) + ' and ' + t(p.b) + '.';
    if (p.f === 'unless') return PL.cap(t(p.a)) + ' unless ' + t(p.b) + '.';
    if (p.f === 'iff') return PL.cap(t(p.a)) + ' if and only if ' + t(p.b) + '.';
    return '';
  }

  /* ===================== 6. FIND THE NUMBER ===================== */
  function digits(x) { return String(x).split('').map(Number); }
  function isPrime(x) { if (x < 2) return false; for (var i = 2; i * i <= x; i++) if (x % i === 0) return false; return true; }
  var NUM_PROPS = [
    { id: 'odd', txt: function () { return 'It is odd.'; }, f: function (x) { return x % 2 === 1; } },
    { id: 'even', txt: function () { return 'It is even.'; }, f: function (x) { return x % 2 === 0; } },
    { id: 'div', param: [3, 4, 5, 6, 7, 9], txt: function (k) { return 'It is divisible by ' + k + '.'; }, f: function (x, k) { return x % k === 0; } },
    { id: 'ndiv', param: [3, 4, 5, 6, 7], txt: function (k) { return 'It is not divisible by ' + k + '.'; }, f: function (x, k) { return x % k !== 0; } },
    { id: 'dsum', txt: function (k) { return 'Its digits add up to ' + k + '.'; }, f: function (x, k) { return digits(x).reduce(function (a, b) { return a + b; }, 0) === k; }, derive: function (x) { return digits(x).reduce(function (a, b) { return a + b; }, 0); } },
    { id: 'gt', txt: function (k) { return 'It is greater than ' + k + '.'; }, f: function (x, k) { return x > k; }, derive: function (x, rng) { return Math.max(1, x - rng.int(3, 40)); } },
    { id: 'lt', txt: function (k) { return 'It is less than ' + k + '.'; }, f: function (x, k) { return x < k; }, derive: function (x, rng) { return x + rng.int(3, 40); } },
    { id: 'prime', txt: function () { return 'It is a prime number.'; }, f: isPrime },
    { id: 'nprime', txt: function () { return 'It is not prime.'; }, f: function (x) { return !isPrime(x); } },
    { id: 'square', txt: function () { return 'It is a perfect square.'; }, f: function (x) { return Math.round(Math.sqrt(x)) ** 2 === x; } },
    { id: 'distinct', txt: function () { return 'All its digits are different.'; }, f: function (x) { var d = digits(x); return new Set(d).size === d.length; } },
    { id: 'repeat', txt: function () { return 'It has a repeated digit.'; }, f: function (x) { var d = digits(x); return new Set(d).size !== d.length; } },
    { id: 'incr', txt: function () { return 'Its digits strictly increase from left to right.'; }, f: function (x) { var d = digits(x); for (var i = 1; i < d.length; i++) if (d[i] <= d[i - 1]) return false; return d.length > 1; } },
    { id: 'firstgt', txt: function () { return 'Its first digit is larger than its last digit.'; }, f: function (x) { var d = digits(x); return d[0] > d[d.length - 1]; } },
    { id: 'rem', param: [3, 4, 5, 6, 7, 8], txt: function (k, r) { return 'Divided by ' + k + ', it leaves remainder ' + r + '.'; }, f: function (x, k, r) { return x % k === r; }, two: true },
    { id: 'lastd', txt: function (k) { return 'Its last digit is ' + k + '.'; }, f: function (x, k) { return x % 10 === k; }, derive: function (x) { return x % 10; } },
    { id: 'prod', txt: function (k) { return 'The product of its digits is ' + k + '.'; }, f: function (x, k) { return digits(x).reduce(function (a, b) { return a * b; }, 1) === k; }, derive: function (x) { return digits(x).reduce(function (a, b) { return a * b; }, 1); } }
  ];
  function numberGen(lv, rng) {
    var lo = lv <= 2 ? 10 : lv <= 5 ? 10 : 100, hi = lv <= 2 ? 60 : lv <= 5 ? 99 : lv <= 8 ? 400 : 999;
    var x = rng.int(lo, hi);
    var pool = []; for (var i = lo; i <= hi; i++) pool.push(i);
    var cand = pool.slice(), clues = [];
    for (var g = 0; g < 300 && cand.length > 1; g++) {
      var pr = rng.pick(NUM_PROPS);
      if (lv <= 3 && (pr.id === 'prod' || pr.id === 'rem')) continue;
      var c = { id: pr.id };
      if (pr.param) c.k = rng.pick(pr.param);
      if (pr.two) c.r = x % c.k;
      if (pr.derive) c.k = pr.derive(x, rng);
      if (!pr.f(x, c.k, c.r)) continue;
      var nc = cand.filter(function (y) { return pr.f(y, c.k, c.r); });
      if (nc.length === cand.length || (nc.length === 1 && clues.length < 2 && lv >= 3)) continue;
      // keep "gt/lt" rare at high levels so elimination is arithmetic rather than range narrowing
      if (lv >= 6 && (pr.id === 'gt' || pr.id === 'lt') && clues.filter(function (q) { return q.id === 'gt' || q.id === 'lt'; }).length >= 1) continue;
      clues.push(c); cand = nc;
    }
    if (cand.length !== 1) return null;
    for (var j = clues.length - 1; j >= 0; j--) {
      var rest = clues.slice(0, j).concat(clues.slice(j + 1));
      if (pool.filter(function (y) { return rest.every(function (q) { return numProp(q).f(y, q.k, q.r); }); }).length === 1) clues = rest;
    }
    if (clues.length < (lv <= 2 ? 2 : 3)) return null;
    var P = { type: 'number', title: 'Find the number', intro: 'A secret whole number lies between ' + lo + ' and ' + hi + ' inclusive. Every clue is true, and together they identify exactly one number.', lo: lo, hi: hi, clues: rng.shuffle(clues), sol: x };
    P.clueText = P.clues.map(function (q) { return numProp(q).txt(q.k, q.r); });
    return P;
  }
  function numProp(q) { for (var i = 0; i < NUM_PROPS.length; i++) if (NUM_PROPS[i].id === q.id) return NUM_PROPS[i]; }

  /* ===================== 7. FUTOSHIKI ===================== */
  function latin(n, rng) {
    var base = []; for (var r = 0; r < n; r++) { var row = []; for (var c = 0; c < n; c++) row.push((r + c) % n); base.push(row); }
    var rp = rng.shuffle(seq(n)), cp = rng.shuffle(seq(n)), sp = rng.shuffle(seq(n));
    return rp.map(function (r) { return cp.map(function (c) { return sp[base[r][c]] + 1; }); });
  }
  function futCount(n, givens, ineq, limit) {
    var g = []; for (var r = 0; r < n; r++) { g.push([]); for (var c = 0; c < n; c++) g[r].push(givens[r * n + c] || 0); }
    var cnt = 0, sol = null;
    function ok(r, c, v) {
      for (var i = 0; i < n; i++) { if (i !== c && g[r][i] === v) return false; if (i !== r && g[i][c] === v) return false; }
      for (var k = 0; k < ineq.length; k++) {
        var q = ineq[k], a = q.a, b = q.b; // cell a < cell b
        var ra = Math.floor(a / n), ca = a % n, rb = Math.floor(b / n), cb = b % n;
        var va = (ra === r && ca === c) ? v : g[ra][ca], vb = (rb === r && cb === c) ? v : g[rb][cb];
        if (va && vb && !(va < vb)) return false;
        if ((ra === r && ca === c) && !vb && v === n) return false;
        if ((rb === r && cb === c) && !va && v === 1) return false;
      }
      return true;
    }
    (function rec(idx) {
      if (cnt >= limit) return;
      if (idx === n * n) { cnt++; if (!sol) sol = g.map(function (row) { return row.slice(); }); return; }
      var r = Math.floor(idx / n), c = idx % n;
      if (g[r][c]) { if (ok(r, c, g[r][c])) rec(idx + 1); return; }
      for (var v = 1; v <= n; v++) if (ok(r, c, v)) { g[r][c] = v; rec(idx + 1); g[r][c] = 0; if (cnt >= limit) return; }
    })(0);
    return { count: cnt, sol: sol };
  }
  function futGen(lv, rng) {
    var n = lv <= 5 ? 4 : 5;
    var sq = latin(n, rng), flat = [].concat.apply([], sq);
    var ineq = [];
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      var i = r * n + c;
      if (c < n - 1) ineq.push(flat[i] < flat[i + 1] ? { a: i, b: i + 1 } : { a: i + 1, b: i });
      if (r < n - 1) ineq.push(flat[i] < flat[i + n] ? { a: i, b: i + n } : { a: i + n, b: i });
    }
    var givens = {}; for (var k = 0; k < n * n; k++) givens[k] = flat[k];
    // remove elements greedily while unique
    var items = rng.shuffle(Object.keys(givens).map(function (k) { return { g: +k }; }).concat(ineq.map(function (q, j) { return { q: j }; })));
    var activeQ = ineq.map(function () { return true; });
    items.forEach(function (it) {
      var g2 = Object.assign({}, givens), q2 = activeQ.slice();
      if (it.g != null) delete g2[it.g]; else q2[it.q] = false;
      var res = futCount(n, g2, ineq.filter(function (_, j) { return q2[j]; }), 2);
      if (res.count === 1) { givens = g2; activeQ = q2; }
    });
    var finalQ = ineq.filter(function (_, j) { return activeQ[j]; });
    var ng = Object.keys(givens).length;
    var target = lv <= 3 ? 4 : lv <= 5 ? 2 : lv <= 7 ? 3 : 1; // add back givens for easier levels
    var missing = seq(n * n).filter(function (k) { return givens[k] == null; });
    missing = rng.shuffle(missing);
    while (Object.keys(givens).length < target + ng - 0 && missing.length && lv <= 7) { var m = missing.pop(); givens[m] = flat[m]; if (Object.keys(givens).length >= ng + (lv <= 3 ? 3 : lv <= 5 ? 2 : 1)) break; }
    return { type: 'fut', title: 'Inequality square', intro: 'Fill the ' + n + '×' + n + ' grid so every row and column contains 1 to ' + n + ' exactly once. Each < or > sign between neighbours must be obeyed.', n: n, givens: givens, ineq: finalQ, sol: flat };
  }

  /* ===================== Generation dispatcher ===================== */
  var TYPE_LEVELS = { grid: [1, 10], order: [1, 10], sched: [3, 10], kk: [2, 10], cond: [2, 10], number: [1, 10], fut: [3, 10] };
  var TYPE_NAMES = { grid: 'Logic grid', order: 'Ordering', sched: 'Scheduling', kk: 'Truth-tellers & liars', cond: 'Conditional reasoning', number: 'Elimination', fut: 'Constraint square' };
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10);
    var types = Object.keys(TYPE_LEVELS).filter(function (t) { return lv >= TYPE_LEVELS[t][0] && lv <= TYPE_LEVELS[t][1]; });
    var recent = (ctx && ctx.recent) || [];
    var fresh = types.filter(function (t) { return recent.slice(-3).indexOf(t) < 0; });
    var pool = fresh.length ? fresh : types;
    if (ctx && ctx.forceType) pool = [ctx.forceType];
    for (var t = 0; t < 30; t++) {
      var type = rng.pick(pool), P = null;
      if (type === 'grid') P = gridGen(lv, rng);
      else if (type === 'order') P = orderGen(lv, rng);
      else if (type === 'sched') P = schedGen(lv, rng);
      else if (type === 'kk') P = kkGen(lv, rng);
      else if (type === 'cond') P = condGen(lv, rng);
      else if (type === 'number') P = numberGen(lv, rng);
      else if (type === 'fut') P = futGen(lv, rng);
      if (P) { P.typeName = TYPE_NAMES[type]; P.tkey = type; return P; }
    }
    throw new Error('logic generation failed');
  }

  /* ===================== Play ===================== */
  function init(p) {
    if (p.type === 'grid') { var m = []; for (var c = 1; c < p.cats.length; c++) { var a = []; for (var i = 0; i < p.n; i++) { var r = []; for (var v = 0; v < p.n; v++) r.push(0); a.push(r); } m.push(a); } return { marks: m, struck: [] }; }
    if (p.type === 'order') return { slots: p.items.map(function () { return null; }), sel: null, struck: [] };
    if (p.type === 'sched') return { asg: p.people.map(function () { return null; }), struck: [] };
    if (p.type === 'kk') return { k: p.people.map(function () { return null; }) };
    if (p.type === 'cond') return { tried: [] };
    if (p.type === 'number') return { struck: [], tries: [] };
    if (p.type === 'fut') return { v: {}, sel: null };
    return {};
  }
  function clueList(p, gs) {
    return h('ol', { class: 'clues' }, p.clueText.map(function (t, i) {
      var struck = gs.struck && gs.struck.indexOf(i) >= 0;
      return h('li', { class: struck ? 'struck' : '', onclick: gs.struck ? function () { var k = gs.struck.indexOf(i); if (k >= 0) gs.struck.splice(k, 1); else gs.struck.push(i); this.classList.toggle('struck'); } : null }, t);
    }));
  }
  function isComplete(p, gs) {
    if (p.type === 'grid') return gs.marks.every(function (M) { return M.every(function (r) { return r.filter(function (x) { return x === 2; }).length === 1; }) && seq(p.n).every(function (v) { return M.filter(function (r) { return r[v] === 2; }).length === 1; }); });
    if (p.type === 'order') return gs.slots.every(function (x) { return x != null; });
    if (p.type === 'sched') return gs.asg.every(function (x) { return x != null; });
    if (p.type === 'kk') return gs.k.every(function (x) { return x != null; });
    if (p.type === 'fut') return seq(p.n * p.n).every(function (k) { return p.givens[k] != null || gs.v[k]; });
    return true;
  }
  function isCorrect(p, gs) {
    if (p.type === 'grid') return gs.marks.every(function (M, c) { return M.every(function (r, i) { return r[p.sol[c][i]] === 2; }); });
    if (p.type === 'order') return gs.slots.every(function (it, pos) { return p.sol[it] === pos; });
    if (p.type === 'sched') { // same partition up to nothing (days are labelled)
      return gs.asg.every(function (d, i) { return d === p.sol[i]; });
    }
    if (p.type === 'kk') return gs.k.every(function (x, i) { return x === p.sol[i]; });
    if (p.type === 'fut') return seq(p.n * p.n).every(function (k) { return (p.givens[k] != null ? p.givens[k] : gs.v[k]) === p.sol[k]; });
    return false;
  }

  function view(api) {
    var p = api.p, gs = api.gs;
    var head = h('div', null,
      h('div', { class: 'tagrow' }, h('span', { class: 'tag' }, p.typeName), h('span', { class: 'tag ghost' }, p.title)),
      h('p', { class: 'prob' }, p.intro));
    var check = function () {
      if (isCorrect(p, gs)) { api.update(gs); api.finish('solved'); }
      else { api.wrong(); api.toast('Not correct yet. At least one assignment is wrong.', 'bad'); api.update(gs); }
    };
    var checkBtn = function () { return api.done ? null : h('button', { class: 'btn primary wide', disabled: !isComplete(p, gs), onclick: check }, isComplete(p, gs) ? 'Check solution' : 'Complete the grid to check'); };
    var body;
    if (p.type === 'grid') body = gridView(api, p, gs);
    else if (p.type === 'order') body = orderView(api, p, gs);
    else if (p.type === 'sched') body = schedView(api, p, gs);
    else if (p.type === 'kk') body = kkView(api, p, gs);
    else if (p.type === 'fut') body = futView(api, p, gs);
    if (p.type === 'cond') {
      return h('div', { class: 'logic' }, head, clueList(p, { struck: null }), h('p', { class: 'q' }, p.ask),
        h('div', { class: 'opts' }, p.optText.map(function (t, i) {
          return h('button', { class: 'btn opt', disabled: api.done || gs.tried.indexOf(i) >= 0, onclick: function () {
            gs.tried.push(i);
            if (i === p.ans) { api.update(gs); api.finish('solved'); } else { api.wrong(); api.toast('That does not follow. Check each statement.', 'bad'); api.update(gs); }
          } }, t);
        })));
    }
    if (p.type === 'number') {
      var inp = h('input', { id: 'num-in', class: 'txt', type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: 'The number' });
      return h('div', { class: 'logic' }, head, h('div', { class: 'muted small' }, 'Tap a clue to grey it out once you have used it.'), clueList(p, gs),
        api.done ? null : h('form', { class: 'row-in', onsubmit: function (e) {
          e.preventDefault(); var v = parseInt(inp.value, 10); if (!v && v !== 0) return;
          gs.tries.push(v);
          if (v === p.sol) { api.update(gs); api.finish('solved'); }
          else {
            api.wrong();
            var failing = p.clues.map(function (q, i) { return numProp(q).f(v, q.k, q.r) ? null : i + 1; }).filter(Boolean);
            api.toast(v < p.lo || v > p.hi ? 'Out of range.' : failing.length ? v + ' breaks clue ' + failing[0] + '.' : v + ' fits every clue you can see, but it is not unique… check again.', 'bad');
            api.update(gs);
          }
        } }, inp, h('button', { class: 'btn primary', type: 'submit' }, 'Check')),
        gs.tries.length ? h('div', { class: 'muted small' }, 'Tried: ' + gs.tries.join(', ')) : null);
    }
    return h('div', { class: 'logic' }, head, p.type !== 'fut' ? h('div', { class: 'muted small' }, 'Tap a clue to grey it out once you have used it.') : null, p.clueText ? clueList(p, gs) : null, body, checkBtn());
  }

  function gridView(api, p, gs) {
    var mats = [];
    for (var c = 1; c < p.cats.length; c++) (function (c) {
      var cat = p.cats[c], M = gs.marks[c - 1];
      var rows = [h('tr', null, h('th', null, ''), cat.vals.map(function (v) { return h('th', { class: 'colh' }, h('span', null, String(v))); }))];
      p.cats[0].vals.forEach(function (nm, i) {
        rows.push(h('tr', null, h('th', { class: 'rowh' }, nm), cat.vals.map(function (_, v) {
          var st = M[i][v];
          return h('td', { class: 'gcell' + (st === 2 ? ' yes' : st === 1 ? ' no' : ''), role: 'button', 'aria-label': nm + ' ' + cat.vals[v] + ': ' + ['unknown', 'no', 'yes'][st], onclick: api.done ? null : function () {
            var ns = (st + 1) % 3; M[i][v] = ns;
            if (ns === 2 && gs.auto !== false) { for (var x = 0; x < p.n; x++) { if (x !== v && M[i][x] === 0) M[i][x] = 1; if (x !== i && M[x][v] === 0) M[x][v] = 1; } }
            api.update(gs);
          } }, st === 2 ? '●' : st === 1 ? '×' : '');
        })));
      });
      mats.push(h('div', { class: 'gmat' }, h('div', { class: 'lbl' }, p.cats[0].name + ' × ' + cat.name), h('div', { class: 'scrollx' }, h('table', { class: 'gtable' }, rows))));
    })(c);
    return h('div', null, h('div', { class: 'muted small' }, 'Tap a cell to cycle: blank → × (ruled out) → ● (match). A match rules out the rest of its row and column.'), mats);
  }
  function orderView(api, p, gs) {
    var th = ORDER_THEMES[p.th];
    var used = gs.slots.filter(function (x) { return x != null; });
    var chips = h('div', { class: 'chips' }, p.items.map(function (it, i) {
      if (used.indexOf(i) >= 0) return null;
      return h('button', { class: 'chip' + (gs.sel === i ? ' sel' : ''), disabled: api.done, onclick: function () { gs.sel = gs.sel === i ? null : i; api.update(gs); } }, it);
    }));
    var slots = h('ol', { class: 'slots' }, gs.slots.map(function (it, pos) {
      var label = th.ord ? ordPlace(pos + 1) : th.pos === 'floor' ? 'Floor ' + (pos + 1) : 'Slot ' + (pos + 1);
      return h('li', { class: 'slot' + (it != null ? ' filled' : ''), onclick: api.done ? null : function () {
        if (it != null) { gs.slots[pos] = null; gs.sel = it; }
        else if (gs.sel != null) { gs.slots[pos] = gs.sel; gs.sel = null; }
        api.update(gs);
      } }, h('span', { class: 'slot-n' }, label), h('span', { class: 'slot-v' }, it != null ? p.items[it] : (gs.sel != null ? 'Tap to place' : '—')));
    }));
    return h('div', null, h('div', { class: 'muted small' }, 'Tap a name, then a position. Tap a filled position to pick it back up.'), chips, th.pos === 'floor' ? h('div', { class: 'muted small' }, 'Floor 1 is the bottom.') : null, slots);
  }
  function schedView(api, p, gs) {
    var counts = p.days.map(function (_, d) { return gs.asg.filter(function (x) { return x === d; }).length; });
    return h('div', { class: 'sched' },
      h('div', { class: 'muted small' }, 'Choose a ' + p.unit + ' for each person. Counts: ' + p.days.map(function (d, i) { return d + ' ' + counts[i] + '/' + p.cap; }).join(' · ')),
      p.people.map(function (nm, i) {
        return h('div', { class: 'srow' }, h('span', { class: 'sname' }, nm), h('div', { class: 'seg' }, p.days.map(function (d, di) {
          return h('button', { class: 'segb' + (gs.asg[i] === di ? ' on' : ''), disabled: api.done, onclick: function () { gs.asg[i] = gs.asg[i] === di ? null : di; api.update(gs); } }, d.replace(' shift', '').replace('Session ', 'S').replace(/day$/, '').slice(0, 5));
        })));
      }));
  }
  function kkView(api, p, gs) {
    return h('div', { class: 'sched' }, p.people.map(function (nm, i) {
      return h('div', { class: 'srow' }, h('span', { class: 'sname' }, nm), h('div', { class: 'seg' }, [[1, 'Knight'], [0, 'Knave']].map(function (o) {
        return h('button', { class: 'segb' + (gs.k[i] === o[0] ? ' on' : ''), disabled: api.done, onclick: function () { gs.k[i] = gs.k[i] === o[0] ? null : o[0]; api.update(gs); } }, o[1]);
      })));
    }));
  }
  function futView(api, p, gs) {
    var n = p.n, cells = [];
    var sym = {};
    p.ineq.forEach(function (q) {
      var a = q.a, b = q.b, ra = Math.floor(a / n), ca = a % n, rb = Math.floor(b / n), cb = b % n;
      if (ra === rb) { var left = Math.min(a, b); sym['h' + left] = (a === left) ? '<' : '>'; }
      else { var top = Math.min(a, b); sym['v' + top] = (a === top) ? '∧' : '∨'; }
    });
    var size = 2 * n - 1;
    var grid = h('div', { class: 'fut', style: { 'grid-template-columns': 'repeat(' + size + ', auto)' } });
    for (var R = 0; R < size; R++) for (var C = 0; C < size; C++) {
      if (R % 2 === 0 && C % 2 === 0) {
        (function (k) {
          var given = p.givens[k] != null, v = given ? p.givens[k] : gs.v[k];
          grid.appendChild(h('button', { class: 'fcell' + (given ? ' given' : '') + (gs.sel === k ? ' sel' : ''), disabled: given || api.done, 'aria-label': 'Row ' + (Math.floor(k / n) + 1) + ' column ' + (k % n + 1), onclick: function () { gs.sel = k; api.update(gs); } }, v ? String(v) : ''));
        })((R / 2) * n + C / 2);
      } else if (R % 2 === 0) {
        var k1 = (R / 2) * n + (C - 1) / 2; grid.appendChild(h('span', { class: 'fsym' }, sym['h' + k1] || ''));
      } else if (C % 2 === 0) {
        var k2 = ((R - 1) / 2) * n + C / 2; grid.appendChild(h('span', { class: 'fsym v' }, sym['v' + k2] || ''));
      } else grid.appendChild(h('span', null, ''));
    }
    var pad = h('div', { class: 'pad' }, seq(n).map(function (i) {
      return h('button', { class: 'btn padb', disabled: gs.sel == null || api.done, onclick: function () { gs.v[gs.sel] = i + 1; api.update(gs); } }, String(i + 1));
    }).concat([h('button', { class: 'btn padb ghost', disabled: gs.sel == null || api.done, onclick: function () { delete gs.v[gs.sel]; api.update(gs); } }, 'Clear')]));
    return h('div', null, h('div', { class: 'muted small' }, '∧ means the upper number is smaller; ∨ means the upper number is larger.'), h('div', { class: 'futwrap' }, grid), api.done ? null : pad);
  }

  /* ===================== Hints: next valid deduction ===================== */
  function assignAll(p) {
    if (p.type === 'grid') return gridAll(p.n, p.cats.length);
    if (p.type === 'order') return permsC(p.n);
    if (p.type === 'sched') return partitions(p.n, p.D, p.cap);
    return null;
  }
  function clueEval(p, cl, s) { return p.type === 'grid' ? gridEval(p, cl, s) : p.type === 'order' ? orderEval(cl, s) : schedEval(cl, s); }
  // vars: grid -> (c,i) value; order -> item position; sched -> person day
  function varsOf(p, s) {
    if (p.type === 'grid') { var o = []; s.forEach(function (perm, c) { perm.forEach(function (v, i) { o.push(v); }); }); return o; }
    return s;
  }
  function varName(p, idx, val) {
    if (p.type === 'grid') { var c = Math.floor(idx / p.n) + 1, i = idx % p.n; return p.cats[0].vals[i] + ' ↔ ' + p.cats[c].vals[val]; }
    if (p.type === 'order') { var th = ORDER_THEMES[p.th]; return p.items[idx] + ' is ' + (th.ord ? ordPlace(val + 1) : th.pos + ' ' + (val + 1)); }
    return p.people[idx] + ' is on ' + p.days[val];
  }
  function domSize(p) { return p.type === 'grid' ? p.n : p.type === 'order' ? p.n : p.D; }
  function nVars(p) { return p.type === 'grid' ? (p.cats.length - 1) * p.n : p.n; }
  function fullDoms(p) { var d = [], m = domSize(p); for (var k = 0; k < nVars(p); k++) { var a = []; for (var v = 0; v < m; v++) a.push(true); d.push(a); } return d; }
  // domains implied by the player's correct marks (wrong marks are reported separately)
  function playerDoms(p, gs) {
    var d = fullDoms(p);
    var fix = function (k, v) { for (var x = 0; x < d[k].length; x++) d[k][x] = x === v; };
    if (p.type === 'grid') gs.marks.forEach(function (M, c) { M.forEach(function (r, i) { r.forEach(function (st, v) { var k = c * p.n + i; if (st === 2 && p.sol[c][i] === v) fix(k, v); else if (st === 1 && p.sol[c][i] !== v) d[k][v] = false; }); }); });
    if (p.type === 'order') gs.slots.forEach(function (it, pos) { if (it != null && p.sol[it] === pos) fix(it, pos); });
    if (p.type === 'sched') gs.asg.forEach(function (dd, i) { if (dd != null && p.sol[i] === dd) fix(i, dd); });
    return d;
  }
  function wrongMark(p, gs) {
    if (p.type === 'grid') { for (var c = 0; c < gs.marks.length; c++) for (var i = 0; i < p.n; i++) for (var v = 0; v < p.n; v++) { var st = gs.marks[c][i][v]; if (st === 2 && p.sol[c][i] !== v) return p.cats[0].vals[i] + ' is not ' + p.cats[c + 1].vals[v]; if (st === 1 && p.sol[c][i] === v) return 'something is wrongly ruled out in ' + p.cats[0].vals[i] + '’s row (' + p.cats[c + 1].name + ')'; } }
    if (p.type === 'order') for (var pos = 0; pos < gs.slots.length; pos++) { var it = gs.slots[pos]; if (it != null && p.sol[it] !== pos) return p.items[it] + ' is in the wrong position'; }
    if (p.type === 'sched') for (var k = 0; k < gs.asg.length; k++) if (gs.asg[k] != null && gs.asg[k] !== p.sol[k]) return p.people[k] + ' is on the wrong ' + p.unit;
    if (p.type === 'kk') for (var j = 0; j < gs.k.length; j++) if (gs.k[j] != null && gs.k[j] !== p.sol[j]) return p.people[j] + ' is marked wrongly';
    if (p.type === 'fut') for (var key in gs.v) if (gs.v[key] && gs.v[key] !== p.sol[key]) return 'row ' + (Math.floor(key / p.n) + 1) + ', column ' + (key % p.n + 1) + ' is wrong';
    return null;
  }
  function deduce(p, dom, all) {
    all = all || assignAll(p);
    var base = all.filter(function (s) { var vs = varsOf(p, s); for (var k = 0; k < vs.length; k++) if (!dom[k][vs[k]]) return false; return true; });
    var tryWith = function (filterFn) {
      var set = base.filter(filterFn);
      if (!set.length) return null;
      var nd = dom.map(function (a) { return a.map(function () { return false; }); });
      set.forEach(function (s) { varsOf(p, s).forEach(function (v, k) { nd[k][v] = true; }); });
      var changes = [];
      for (var k = 0; k < nd.length; k++) for (var v = 0; v < nd[k].length; v++) if (dom[k][v] && !nd[k][v]) changes.push({ k: k, v: v });
      return changes.length ? { nd: nd, changes: changes } : null;
    };
    for (var ci = 0; ci < p.clues.length; ci++) { var r = tryWith(function (s) { return clueEval(p, p.clues[ci], s); }); if (r) { r.clues = [ci]; return r; } }
    for (var a = 0; a < p.clues.length; a++) for (var b = a + 1; b < p.clues.length; b++) { var r2 = tryWith(function (s) { return clueEval(p, p.clues[a], s) && clueEval(p, p.clues[b], s); }); if (r2) { r2.clues = [a, b]; return r2; } }
    var r3 = tryWith(function (s) { return p.clues.every(function (c) { return clueEval(p, c, s); }); });
    if (r3) r3.clues = null;
    return r3;
  }
  function dedText(p, d, dom) {
    var placed = [], ruled = [];
    var byVar = {};
    d.changes.forEach(function (c) { (byVar[c.k] = byVar[c.k] || []).push(c.v); });
    Object.keys(byVar).forEach(function (k) {
      var left = []; d.nd[k].forEach(function (ok, v) { if (ok) left.push(v); });
      var before = dom[k].filter(Boolean).length;
      if (left.length === 1 && before > 1) placed.push(varName(p, +k, left[0]));
      else byVar[k].forEach(function (v) { ruled.push(varName(p, +k, v).replace(' ↔ ', ' is not ').replace(' is ', ' is not ').replace('not not', 'not')); });
    });
    var src = d.clues == null ? 'Using all the clues together' : d.clues.length === 1 ? 'Clue ' + (d.clues[0] + 1) : 'Clues ' + (d.clues[0] + 1) + ' and ' + (d.clues[1] + 1) + ' together';
    var parts = [];
    if (placed.length) parts.push(placed.slice(0, 3).join('; '));
    if (ruled.length) parts.push('rules out: ' + ruled.slice(0, 3).join('; ') + (ruled.length > 3 ? ' (and ' + (ruled.length - 3) + ' more)' : ''));
    return src + (placed.length ? ' gives ' : ' ') + parts.join('. It also ').replace(/^rules out/, 'rules out') + '.';
  }
  function futCandidates(p, vals) {
    var n = p.n, cand = {};
    for (var k = 0; k < n * n; k++) {
      if (vals[k]) continue;
      var r = Math.floor(k / n), c = k % n, s = [];
      for (var v = 1; v <= n; v++) {
        var ok = true;
        for (var i = 0; i < n; i++) { if (vals[r * n + i] === v || vals[i * n + c] === v) ok = false; }
        if (ok) s.push(v);
      }
      cand[k] = s;
    }
    // inequality bound propagation
    for (var it = 0; it < 8; it++) {
      p.ineq.forEach(function (q) {
        var lo = vals[q.a] ? [vals[q.a]] : cand[q.a], hi = vals[q.b] ? [vals[q.b]] : cand[q.b];
        if (!lo || !hi || !lo.length || !hi.length) return;
        var maxHi = Math.max.apply(null, hi), minLo = Math.min.apply(null, lo);
        if (!vals[q.a]) cand[q.a] = cand[q.a].filter(function (v) { return v < maxHi; });
        if (!vals[q.b]) cand[q.b] = cand[q.b].filter(function (v) { return v > minLo; });
      });
    }
    return cand;
  }
  function hint(p, gs) {
    var wm = wrongMark(p, gs);
    if (wm) return { msg: 'Check your work: ' + wm + '.' };
    if (p.type === 'grid' || p.type === 'order' || p.type === 'sched') {
      var dm = playerDoms(p, gs), d = deduce(p, dm);
      if (d) return { msg: dedText(p, d, dm) };
      return { msg: 'Everything you have is correct — finish entering the rest.' };
    }
    if (p.type === 'kk') {
      var all = []; for (var m = 0; m < (1 << p.n); m++) { var a = []; for (var i = 0; i < p.n; i++) a.push((m >> i) & 1); all.push(a); }
      for (var x = 0; x < p.n; x++) {
        if (gs.k[x] === p.sol[x]) continue;
        var opp = 1 - p.sol[x];
        var any = all.some(function (s) { return s[x] === opp && p.stmts.every(function (st, k) { return kkEval(st, s) === !!s[k]; }); });
        if (!any) return { msg: 'Suppose ' + p.people[x] + ' were a ' + (opp ? 'knight' : 'knave') + '. No assignment then makes every statement fit, so ' + p.people[x] + ' is a ' + (p.sol[x] ? 'knight' : 'knave') + '.' };
      }
      return { msg: 'Test one person as a knight, follow the consequences, and look for a contradiction.' };
    }
    if (p.type === 'cond') {
      return { msg: 'Rewrite each statement as “if … then …”. Remember: from “if A then B”, knowing B tells you nothing about A, but knowing “not B” gives “not A”.' };
    }
    if (p.type === 'number') {
      var pool = []; for (var y = p.lo; y <= p.hi; y++) pool.push(y);
      gs.hintN = (gs.hintN || 0) + 1;
      var k2 = Math.min(gs.hintN + 1, p.clues.length - 1);
      var left = pool.filter(function (z) { return p.clues.slice(0, k2).every(function (q) { return numProp(q).f(z, q.k, q.r); }); });
      return { msg: 'Clues 1–' + k2 + ' together leave ' + left.length + ' possible numbers' + (left.length <= 8 ? ': ' + left.join(', ') : '') + '.', gs: gs };
    }
    if (p.type === 'fut') {
      var vals = {}; for (var kk = 0; kk < p.n * p.n; kk++) vals[kk] = p.givens[kk] != null ? p.givens[kk] : (gs.v[kk] || 0);
      var cand = futCandidates(p, vals);
      for (var key in cand) if (cand[key].length === 1) return { msg: 'Row ' + (Math.floor(key / p.n) + 1) + ', column ' + (key % p.n + 1) + ' can only be ' + cand[key][0] + ' once you account for its row, column and inequality signs.' };
      // fall back: reveal a cell
      var empty = Object.keys(cand); if (!empty.length) return { msg: 'All cells are filled.' };
      var kk2 = empty[0]; gs.v[kk2] = p.sol[kk2];
      return { msg: 'No single-step deduction is visible; filled row ' + (Math.floor(kk2 / p.n) + 1) + ', column ' + (kk2 % p.n + 1) + ' for you.', gs: gs };
    }
    return { msg: 'Read the clues again carefully.' };
  }

  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var pen = (p.type === 'cond' || p.type === 'kk') ? 30 : 20;
    var q = solved ? PL.clamp(100 - ctx.wrong * pen - ctx.hints * 12, 10, 100) : 0;
    return { quality: Math.round(q), metrics: { type: p.tkey, wrong: ctx.wrong, unaided: solved && !ctx.hints && !ctx.wrong, clues: p.clueText ? p.clueText.length : null },
      lines: [['Puzzle type', p.typeName], ['Incorrect checks', ctx.wrong]] };
  }

  function solutionView(p) {
    if (p.type === 'grid') {
      return h('div', { class: 'scrollx' }, h('table', { class: 'soltable' },
        h('tr', null, p.cats.map(function (c) { return h('th', null, c.name); })),
        p.cats[0].vals.map(function (nm, i) { return h('tr', null, h('td', null, nm), p.sol.map(function (perm, c) { return h('td', null, String(p.cats[c + 1].vals[perm[i]])); })); })));
    }
    if (p.type === 'order') {
      var order = []; p.sol.forEach(function (pos, it) { order[pos] = p.items[it]; });
      var th = ORDER_THEMES[p.th];
      return h('ol', { class: 'steps' }, order.map(function (x, i) { return h('li', null, (th.ord ? ordPlace(i + 1) : th.pos === 'floor' ? 'Floor ' + (i + 1) : 'Slot ' + (i + 1)) + ': ' + x); }));
    }
    if (p.type === 'sched') return h('ul', { class: 'steps' }, p.days.map(function (d, di) { return h('li', null, d + ': ' + p.people.filter(function (_, i) { return p.sol[i] === di; }).join(', ')); }));
    if (p.type === 'kk') return h('ul', { class: 'steps' }, p.people.map(function (nm, i) { return h('li', null, nm + ': ' + (p.sol[i] ? 'knight' : 'knave')); }));
    if (p.type === 'cond') return h('div', null, h('b', null, p.optText[p.ans]));
    if (p.type === 'number') return h('div', null, h('b', { class: 'mono' }, String(p.sol)));
    if (p.type === 'fut') {
      var g = h('div', { class: 'fut small', style: { 'grid-template-columns': 'repeat(' + p.n + ', auto)' } });
      p.sol.forEach(function (v, k) { g.appendChild(h('span', { class: 'fcell ro' + (p.givens[k] != null ? ' given' : '') }, String(v))); });
      return g;
    }
  }
  function explanation(p) {
    var out = [];
    if (p.type === 'grid' || p.type === 'order' || p.type === 'sched') {
      var dom = fullDoms(p), all = assignAll(p), guard = 0;
      while (guard++ < 40) {
        if (dom.every(function (a) { return a.filter(Boolean).length === 1; })) break;
        var d = deduce(p, dom, all);
        if (!d) break;
        out.push(dedText(p, d, dom));
        dom = d.nd;
        if (out.length >= 12) { out.push('The remaining placements follow by elimination.'); break; }
      }
      return out;
    }
    if (p.type === 'kk') {
      out.push('Check the solution against each statement:');
      p.stmts.forEach(function (st, k) { var tr = kkEval(st, p.sol); out.push(p.people[k] + ' (' + (p.sol[k] ? 'knight' : 'knave') + ') says something ' + (tr ? 'true' : 'false') + ': “' + kkText(st, p.people, k) + '”'); });
      out.push('No other assignment of knights and knaves fits all the statements (checked exhaustively).');
      return out;
    }
    if (p.type === 'cond') {
      var asg = []; for (var m = 0; m < (1 << p.nv); m++) { var a = []; for (var i = 0; i < p.nv; i++) a.push((m >> i) & 1); asg.push(a); }
      var models = asg.filter(function (s) { return p.prem.every(function (q) { return premEval(q, s); }); });
      out.push(models.length === 1 ? 'Only one situation fits all the statements: ' + modelText(p, models[0]) + '.' : PL.cap(models.length + ' situations fit all the statements:'));
      if (models.length > 1) models.forEach(function (s) { out.push('• ' + modelText(p, s)); });
      p.opts.forEach(function (o, i) {
        var holds = models.filter(function (s) { return premEval(o, s); }).length;
        out.push('“' + p.optText[i] + '” holds in ' + holds + ' of ' + models.length + (i === p.ans ? ' ✓' : '') + '.');
      });
      return out;
    }
    if (p.type === 'number') {
      var pool = []; for (var y = p.lo; y <= p.hi; y++) pool.push(y);
      p.clues.forEach(function (q, i) { pool = pool.filter(function (z) { return numProp(q).f(z, q.k, q.r); }); out.push('After clue ' + (i + 1) + ': ' + pool.length + ' candidate' + (pool.length === 1 ? '' : 's') + (pool.length <= 10 ? ' (' + pool.join(', ') + ')' : '') + '.'); });
      return out;
    }
    if (p.type === 'fut') return ['Each row and column holds every number once; the signs then force a unique arrangement (verified by an exhaustive solver).'];
    return out;
  }
  function modelText(p, s) { return s.map(function (b, v) { return p.atoms[v][b ? 0 : 1]; }).join('; '); }
  function review(p, gs) {
    return h('div', { class: 'review' },
      h('p', { class: 'prob' }, p.intro),
      p.clueText ? h('ol', { class: 'clues' }, p.clueText.map(function (t) { return h('li', null, t); })) : null,
      p.type === 'cond' ? h('p', null, p.ask) : null,
      h('div', { class: 'lbl' }, 'Solution'), solutionView(p),
      h('div', { class: 'lbl' }, 'Reasoning'), h('ol', { class: 'steps' }, explanation(p).map(function (l) { return h('li', null, l); })));
  }
  function stats(atts) {
    var by = {};
    atts.forEach(function (a) { var t = a.metrics && a.metrics.type; if (!t) return; (by[t] = by[t] || { n: 0, ok: 0, un: 0 }); by[t].n++; if (a.outcome === 'solved') by[t].ok++; if (a.metrics.unaided) by[t].un++; });
    var rows = [['Solved without help', atts.length ? Math.round(100 * atts.filter(function (a) { return a.metrics && a.metrics.unaided; }).length / atts.length) + '%' : '—']];
    Object.keys(by).forEach(function (t) { rows.push([TYPE_NAMES[t], by[t].ok + '/' + by[t].n + ' solved · ' + by[t].un + ' unaided']); });
    return rows;
  }
  PL.games.logic = {
    id: 'logic', name: 'Logic Lab', blurb: 'Grids, orderings, liars, conditionals and more.',
    rules: 'Each puzzle gives complete, consistent clues with exactly one answer. Use the workspace to record deductions and check when you are done. Hints point to the next valid deduction rather than giving away the answer.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 120 + lv * 45; }, timeLimit: function (lv) { return 300 + lv * 60; },
    _gen: { grid: gridGen, order: orderGen, sched: schedGen, kk: kkGen, cond: condGen, number: numberGen, fut: futGen },
    _check: { isCorrect: isCorrect, explanation: explanation, futCount: futCount, all: assignAll, clueEval: clueEval, kkEval: kkEval, premEval: premEval, numProp: numProp, deduce: deduce }
  };
})();

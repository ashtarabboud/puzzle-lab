/* ===== GAME 13: COMMON THREADS — sixteen words, four hidden groups of four =====
   Built from a curated category bank with complete membership lists. A board is accepted only if
   (1) exactly one way exists to split the 16 words into the four chosen categories, and
   (2) no other category in the bank links four or more of the words across different groups,
   so every intended solution is fair and no rival grouping is equally defensible. Red herrings come from words
   that also belong to another chosen category; harder levels require more of them. */
(function () {
  var h = PL.h;
  var IDX = null;
  function bank() { return PL.data.threads || []; }
  function index() {
    if (IDX) return IDX;
    IDX = { byWord: {} };
    bank().forEach(function (c, i) { c.i = i; c.members.forEach(function (w) { (IDX.byWord[w] = IDX.byWord[w] || []).push(i); }); });
    return IDX;
  }
  function spec(lv) {
    if (lv <= 2) return { d: [1, 1], herr: [0, 0] };
    if (lv <= 4) return { d: [1, 2], herr: [0, 1] };
    if (lv <= 6) return { d: [1, 3], herr: [1, 3], need3: 1 };
    if (lv <= 8) return { d: [2, 4], herr: [2, 5], need3: 1 };
    return { d: [2, 4], herr: [3, 8], need3: 2 };
  }
  function countPartitions(words, cats, limit) {
    // assign each word to one of the 4 categories it belongs to, each category exactly 4 words
    var opts = words.map(function (w) { return cats.map(function (c, k) { return c.members.indexOf(w) >= 0 ? k : -1; }).filter(function (k) { return k >= 0; }); });
    var load = [0, 0, 0, 0], cnt = 0;
    var order = words.map(function (_, i) { return i; }).sort(function (a, b) { return opts[a].length - opts[b].length; });
    (function rec(k) {
      if (cnt >= limit) return;
      if (k === order.length) { cnt++; return; }
      var o = opts[order[k]];
      for (var j = 0; j < o.length; j++) if (load[o[j]] < 4) { load[o[j]]++; rec(k + 1); load[o[j]]--; }
    })(0);
    return cnt;
  }
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), sp = spec(lv), B = bank(); index();
    if (B.length < 8) throw new Error('Common Threads data missing');
    var recent = ((ctx && ctx.recent) || []).join('|').split('|');
    var eligible = B.filter(function (c) { return c.d >= sp.d[0] && c.d <= sp.d[1]; });
    for (var t = 0; t < 3000; t++) {
      var cats = [], used = {};
      var pool = rng.shuffle(eligible);
      for (var i = 0; i < pool.length && cats.length < 4; i++) {
        var c = pool[i];
        if (cats.some(function (x) { return x.id === c.id || x.name === c.name; })) continue;
        if (t < 2000 && recent.indexOf(c.id) >= 0) continue;
        cats.push(c);
      }
      if (cats.length < 4) continue;
      if (sp.need3 && cats.filter(function (c) { return c.d >= 3; }).length < sp.need3) continue;
      // choose 4 members of each category, distinct across the board; prefer words that are herrings at harder levels
      var picks = [], ok = true;
      for (var k = 0; k < 4 && ok; k++) {
        var cand = rng.shuffle(cats[k].members.filter(function (w) { return !used[w]; }));
        if (sp.herr[1] > 0) cand.sort(function (a, b) { return herrScore(b, cats, k) - herrScore(a, cats, k) + (rng() - 0.5) * 1.2; });
        else cand = cand.filter(function (w) { return herrScore(w, cats, k) === 0; });
        if (cand.length < 4) { ok = false; break; }
        var four = cand.slice(0, 4); four.forEach(function (w) { used[w] = 1; }); picks.push(four);
      }
      if (!ok) continue;
      var words = [].concat.apply([], picks);
      var herr = words.filter(function (w, j) { return herrScore(w, cats, Math.floor(j / 4)) > 0; }).length;
      if (herr < sp.herr[0] || herr > sp.herr[1]) continue;
      if (countPartitions(words, cats, 2) !== 1) continue;
      if (rival(words, picks, cats)) continue;
      var groups = cats.map(function (c, j) { return { id: c.id, name: c.name, explain: c.explain, d: c.d, words: picks[j] }; });
      groups.sort(function (a, b) { return a.d - b.d; });
      return { groups: groups, tiles: rng.shuffle(words), herrings: herr, tkey: cats.map(function (c) { return c.id; }).join('|'), maxMistakes: 4 };
    }
    throw new Error('Common Threads could not build a fair board');
  }
  function herrScore(w, cats, own) { var n = 0; cats.forEach(function (c, k) { if (k !== own && c.members.indexOf(w) >= 0) n++; }); return n; }
  function rival(words, picks, cats) { // another bank category tying 4+ board words together across groups
    var ids = {}; cats.forEach(function (c) { ids[c.i] = 1; });
    var hits = {};
    words.forEach(function (w, j) { (IDX.byWord[w] || []).forEach(function (ci) { if (ids[ci]) return; (hits[ci] = hits[ci] || []).push(Math.floor(j / 4)); }); });
    return Object.keys(hits).some(function (ci) { var g = hits[ci]; return g.length >= 4 && new Set(g).size > 1; });
  }
  function init(p) { return { solved: [], sel: [], mistakes: 0, tries: [], order: p.tiles.slice(), hintG: null, hintStage: 0, shown: [] }; }
  function groupOf(p, w) { for (var i = 0; i < p.groups.length; i++) if (p.groups[i].words.indexOf(w) >= 0) return i; return -1; }
  function view(api) {
    var p = api.p, gs = api.gs;
    var solvedWords = {}; gs.solved.forEach(function (gi) { p.groups[gi].words.forEach(function (w) { solvedWords[w] = 1; }); });
    var remaining = gs.order.filter(function (w) { return !solvedWords[w]; });
    function submit() {
      if (gs.sel.length !== 4) return;
      var key = gs.sel.slice().sort().join('|');
      if (gs.tries.indexOf(key) >= 0) { api.toast('You already tried that group.', ''); return; }
      gs.tries.push(key);
      var gi = groupOf(p, gs.sel[0]);
      if (gs.sel.every(function (w) { return groupOf(p, w) === gi; })) {
        gs.solved.push(gi); gs.sel = [];
        if (gs.hintG === gi) { gs.hintG = null; gs.hintStage = 0; }
        api.toast(p.groups[gi].name, 'good');
        if (gs.solved.length === 4) { api.update(gs); api.finish('solved'); return; }
        api.update(gs); return;
      }
      gs.mistakes++; api.wrong();
      var counts = {}; gs.sel.forEach(function (w) { var g = groupOf(p, w); counts[g] = (counts[g] || 0) + 1; });
      var oneAway = Object.keys(counts).some(function (g) { return counts[g] === 3; });
      if (gs.mistakes >= p.maxMistakes) { api.update(gs); api.finish('failed'); return; }
      api.toast(oneAway ? 'One away…' : 'Not a group.', 'bad'); api.update(gs);
    }
    var hintWords = {}; if (gs.hintG != null && gs.hintStage >= 2) p.groups[gs.hintG].words.slice(0, gs.hintStage >= 3 ? 3 : 2).forEach(function (w) { hintWords[w] = 1; });
    return h('div', { class: 'threads' },
      h('div', { class: 'muted small' }, 'Find four groups of four words that share something. Select four, then submit.'),
      gs.solved.map(function (gi) { var g = p.groups[gi]; return h('div', { class: 'th-solved d' + g.d + (!api.done && PL.fx && PL.fx.once('th:' + p.groups.map(function (x) { return x.name; }).join('|') + ':' + gi) ? ' land' : '') }, h('b', null, g.name), h('div', { class: 'small' }, g.words.join(', '))); }),
      gs.hintG != null && gs.solved.indexOf(gs.hintG) < 0 ? h('div', { class: 'hintline small' }, 'Hint: one group is “' + p.groups[gs.hintG].name + '”.') : null,
      h('div', { class: 'th-grid' }, remaining.map(function (w) {
        var on = gs.sel.indexOf(w) >= 0;
        return h('button', { class: 'th-tile' + (on ? ' on' : '') + (hintWords[w] ? ' hinted' : '') + (w.length > 8 ? ' long' : ''), disabled: api.done, onclick: function () {
          var i = gs.sel.indexOf(w);
          if (i >= 0) gs.sel.splice(i, 1); else if (gs.sel.length < 4) gs.sel.push(w);
          api.update(gs);
        } }, w);
      })),
      api.done ? null : h('div', { class: 'row-actions th-actions' },
        h('span', { class: 'muted small' }, 'Mistakes left: ' + '●'.repeat(p.maxMistakes - gs.mistakes) + '○'.repeat(gs.mistakes)),
        h('button', { class: 'btn ghost sm', onclick: function () { gs.order = PL.rng(PL.uid()).shuffle(gs.order); api.update(gs); } }, 'Shuffle'),
        h('button', { class: 'btn ghost sm', disabled: !gs.sel.length, onclick: function () { gs.sel = []; api.update(gs); } }, 'Deselect'),
        h('button', { class: 'btn sm primary', disabled: gs.sel.length !== 4, onclick: submit }, 'Submit')));
  }
  /* Hints, per group (easiest unsolved group first): its name, then two of its words, then a third word */
  function hint(p, gs) {
    if (gs.hintG == null || gs.solved.indexOf(gs.hintG) >= 0) {
      var next = p.groups.map(function (_, i) { return i; }).filter(function (i) { return gs.solved.indexOf(i) < 0; })[0];
      if (next == null) return { msg: 'All groups are solved.', noCount: true };
      gs.hintG = next; gs.hintStage = 0;
    }
    var g = p.groups[gs.hintG];
    if (gs.hintStage >= 3) return { msg: 'You have every clue for “' + g.name + '”: ' + g.words.slice(0, 3).join(', ') + ' and one more.', noCount: true };
    gs.hintStage++;
    if (gs.hintStage === 1) return { msg: 'One group is “' + g.name + '”.', gs: gs };
    if (gs.hintStage === 2) return { msg: g.words[0] + ' and ' + g.words[1] + ' are both in “' + g.name + '” (highlighted).', gs: gs };
    return { msg: g.words[2] + ' is in “' + g.name + '” too.', gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved', n = gs.solved.length;
    var q = solved ? PL.clamp(100 - gs.mistakes * 12 - ctx.hints * 12, 15, 100) : n * 12;
    return { quality: Math.round(q), metrics: { groups: n, mistakes: gs.mistakes, perfect: solved && !gs.mistakes && !ctx.hints, herrings: p.herrings, cats: p.groups.map(function (g) { return g.id; }) },
      lines: [['Groups solved', n + ' / 4'], ['Mistakes', gs.mistakes + ' / ' + p.maxMistakes], ['Red herrings on the board', p.herrings]] };
  }
  function review(p, gs) {
    return h('div', { class: 'review' }, p.groups.map(function (g) { return h('div', { class: 'th-solved d' + g.d }, h('b', null, g.name), h('div', { class: 'small' }, g.words.join(', ')), g.explain ? h('div', { class: 'small muted' }, g.explain) : null); }),
      gs.tries && gs.tries.length ? h('p', { class: 'muted small' }, 'Your submissions: ' + gs.tries.map(function (t) { return t.split('|').join(' '); }).join(' · ')) : null);
  }
  function stats(atts) {
    var s = atts.filter(function (a) { return a.outcome === 'solved'; });
    return [['Boards solved', s.length + ' / ' + atts.length],
      ['Perfect boards', s.filter(function (a) { return a.metrics.perfect; }).length],
      ['Average groups found', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.groups; })).toFixed(1) + ' / 4' : '—'],
      ['Average mistakes', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.mistakes; })).toFixed(1) : '—']];
  }
  PL.games.threads = {
    id: 'threads', name: 'Common Threads', blurb: 'Sort sixteen words into four hidden groups.',
    rules: 'Sixteen words hide four groups of four. Select four words that share a connection and submit. Some words seem to fit more than one group; only one complete arrangement works. Four mistakes end the board.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 120 + lv * 20; }, timeLimit: function () { return 420; },
    _count: countPartitions, _rival: rival
  };
})();

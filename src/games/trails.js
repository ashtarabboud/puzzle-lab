/* ===== GAME 14: WORD TRAILS — themed word search that fills the whole board =====
   Construction: pick a theme, choose theme words whose lengths (plus the theme word) exactly fill the board, lay the
   theme word across the board edge to edge, then lay every other word as a path of adjacent cells. A backtracking
   search with connected-region pruning guarantees every cell belongs to exactly one word; the result is verified. */
(function () {
  var h = PL.h;
  function sizeFor(lv, daily) { if (daily || lv <= 3) return [5, 6]; if (lv <= 6) return [6, 7]; return [6, 8]; } // cols, rows
  function nbrs(i, C, R) { var r = Math.floor(i / C), c = i % C, o = []; for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; var rr = r + dr, cc = c + dc; if (rr >= 0 && rr < R && cc >= 0 && cc < C) o.push(rr * C + cc); } return o; }
  function subsetSum(lengths, target, rng) { // pick a subset (random order) of lengths summing to target; returns indices
    var idx = rng.shuffle(lengths.map(function (_, i) { return i; })), res = null, steps = 0;
    (function rec(k, sum, pick) {
      if (res || ++steps > 20000) return;
      if (sum === target) { res = pick.slice(); return; }
      if (k >= idx.length || sum > target) return;
      pick.push(idx[k]); rec(k + 1, sum + lengths[idx[k]], pick); pick.pop();
      rec(k + 1, sum, pick);
    })(0, 0, []);
    return res;
  }
  function components(free, C, R) {
    var seen = {}, comps = [];
    for (var i = 0; i < C * R; i++) {
      if (!free[i] || seen[i]) continue;
      var st = [i], sz = 0; seen[i] = 1;
      while (st.length) { var x = st.pop(); sz++; nbrs(x, C, R).forEach(function (y) { if (free[y] && !seen[y]) { seen[y] = 1; st.push(y); } }); }
      comps.push(sz);
    }
    return comps;
  }
  function feasible(free, C, R, lens) {
    if (!lens.length) return true;
    var min = Math.min.apply(null, lens), sums = { 0: 1 };
    lens.forEach(function (l) { Object.keys(sums).forEach(function (s) { sums[+s + l] = 1; }); });
    return components(free, C, R).every(function (sz) { return sz >= min && sums[sz]; });
  }
  // find a path of exactly len free cells starting at s, chosen randomly; endCheck optional
  function pathFrom(s, len, free, C, R, rng, endOk, budget) {
    var path = [s], used = {}; used[s] = 1;
    var ok = (function rec() {
      if (budget.n-- <= 0) return false;
      if (path.length === len) return !endOk || endOk(path[path.length - 1]);
      var cur = path[path.length - 1];
      var opts = rng.shuffle(nbrs(cur, C, R).filter(function (y) { return free[y] && !used[y]; }));
      // prefer cells with fewer free neighbours (keeps the region compact, avoids stranding cells)
      opts.sort(function (a, b) { return freeDeg(a) - freeDeg(b); });
      for (var k = 0; k < opts.length; k++) { var y = opts[k]; path.push(y); used[y] = 1; if (rec()) return true; path.pop(); delete used[y]; }
      return false;
    })();
    function freeDeg(x) { return nbrs(x, C, R).filter(function (y) { return free[y] && !used[y]; }).length; }
    return ok ? path : null;
  }
  function build(theme, C, R, rng) {
    var N = C * R, span = theme.span;
    if (span.length > N) return null;
    var lens = theme.words.map(function (w) { return w.length; });
    var pickIdx = subsetSum(lens, N - span.length, rng);
    if (!pickIdx) return null;
    var words = pickIdx.map(function (i) { return theme.words[i]; });
    for (var attempt = 0; attempt < 30; attempt++) {
      var free = []; for (var i = 0; i < N; i++) free.push(true);
      var budget = { n: 4000 };
      // theme word: from the left edge to the right edge, or top to bottom
      var horiz = rng.chance(0.5) && span.length >= C;
      var starts = [];
      for (i = 0; i < N; i++) { var r = Math.floor(i / C), c = i % C; if (horiz ? c === 0 : r === 0) starts.push(i); }
      var sp = null;
      rng.shuffle(starts).some(function (s) {
        sp = pathFrom(s, span.length, free, C, R, rng, function (e) { return horiz ? e % C === C - 1 : Math.floor(e / C) === R - 1; }, budget);
        if (sp) { var tf = free.slice(); sp.forEach(function (x) { tf[x] = false; }); if (!feasible(tf, C, R, words.map(function (w) { return w.length; }))) sp = null; }
        return !!sp;
      });
      if (!sp) continue;
      sp.forEach(function (x) { free[x] = false; });
      var placed = [{ w: span, path: sp, span: true }], remaining = rng.shuffle(words.slice()), fail = false;
      while (remaining.length) {
        // start in the most constrained free cell
        var cells = []; for (i = 0; i < N; i++) if (free[i]) cells.push(i);
        cells.sort(function (a, b) { return nbrs(a, C, R).filter(function (y) { return free[y]; }).length - nbrs(b, C, R).filter(function (y) { return free[y]; }).length; });
        var s0 = cells[0], done = false;
        // try words (longest first among a shuffled order) that can start at s0
        var order = remaining.slice().sort(function () { return rng() - 0.5; });
        for (var k = 0; k < order.length && !done; k++) {
          var w = order[k], b2 = { n: 3000 };
          for (var t = 0; t < 4 && !done; t++) {
            var path = pathFrom(s0, w.length, free, C, R, rng, null, b2);
            if (!path) break;
            var tf2 = free.slice(); path.forEach(function (x) { tf2[x] = false; });
            var rest = remaining.filter(function (x, j) { return j !== remaining.indexOf(w); });
            if (!feasible(tf2, C, R, rest.map(function (x) { return x.length; }))) continue;
            // also allow the path to start at s0 reading backwards (the word may run either way)
            if (rng.chance(0.5)) path.reverse();
            path.forEach(function (x) { free[x] = false; });
            placed.push({ w: w, path: path });
            remaining.splice(remaining.indexOf(w), 1); done = true;
          }
        }
        if (!done) { fail = true; break; }
      }
      if (fail) continue;
      var letters = []; placed.forEach(function (pl) { pl.path.forEach(function (x, j) { letters[x] = pl.w[j]; }); });
      var P = { C: C, R: R, letters: letters, words: placed, clue: theme.clue, theme: theme.id, d: theme.d };
      if (verify(P)) return P;
    }
    return null;
  }
  function verify(P) {
    var N = P.C * P.R, cover = {};
    for (var k = 0; k < P.words.length; k++) {
      var pl = P.words[k];
      if (pl.path.length !== pl.w.length) return false;
      for (var j = 0; j < pl.path.length; j++) {
        if (cover[pl.path[j]]) return false; cover[pl.path[j]] = 1;
        if (P.letters[pl.path[j]] !== pl.w[j]) return false;
        if (j && !PL.trace.adj(pl.path[j - 1], pl.path[j], P.C)) return false;
      }
    }
    return Object.keys(cover).length === N && P.words.filter(function (x) { return x.span; }).length === 1;
  }
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), daily = !!(ctx && ctx.daily), sz = sizeFor(lv, daily);
    var maxD = lv <= 4 ? 1 : lv <= 7 ? 2 : 3;
    var themes = (PL.data.trails || []).filter(function (t) { return t.d <= maxD && (lv < 8 || t.d >= 2); });
    var recent = (ctx && ctx.recent) || [];
    var fresh = themes.filter(function (t) { return recent.indexOf(t.id) < 0; });
    var pool = rng.shuffle(fresh.length ? fresh : themes);
    for (var i = 0; i < pool.length && i < 40; i++) {
      var P = build(pool[i], sz[0], sz[1], rng);
      if (P) { P.tkey = P.theme; return P; }
    }
    throw new Error('Word Trails could not build a board');
  }
  function init(p) { return { found: [], tries: 0, notTheme: [], hintW: null, hintStage: 0, hp: {} }; }
  /* Progressive hints, tracked per word in gs.hp (so progress survives leaving, and switching to another word):
       stage 1  outline every cell of one unfound word
       stage 2  number its starting cell (1)
       stage 3+ number the next cell along the word's verified path (2, 3, ...) and draw the revealed segment
     until every cell is numbered; nothing is ever repeated and only the generator's checked path is shown. */
  function hintState(p, gs) {
    if (!gs.hp) { gs.hp = {}; if (gs.hintW && gs.hintStage) gs.hp[gs.hintW] = gs.hintStage; } // records from before per-word progress
    var w = gs.hintW && gs.found.indexOf(gs.hintW) < 0 ? gs.hintW : null;
    var pl = w ? p.words.filter(function (x) { return x.w === w; })[0] : null;
    return { w: w, pl: pl, stage: w ? gs.hp[w] || 0 : 0 };
  }
  function view(api) {
    var p = api.p, gs = api.gs;
    var foundSet = {}; gs.found.forEach(function (w) { foundSet[w] = 1; });
    var cellOwner = {}; p.words.forEach(function (pl) { pl.path.forEach(function (x) { cellOwner[x] = pl; }); });
    var hs = hintState(p, gs), hintCells = {}, hintOrd = {}, shown = 0;
    if (hs.pl && hs.stage >= 1) { hs.pl.path.forEach(function (x) { hintCells[x] = 1; }); shown = Math.min(hs.pl.path.length, hs.stage - 1); hs.pl.path.slice(0, shown).forEach(function (x, k) { hintOrd[x] = k + 1; }); }
    var tr = PL.trace.grid({
      rows: p.R, cols: p.C, letters: p.letters, disabled: api.done,
      lines: p.words.filter(function (pl) { return foundSet[pl.w]; }).map(function (pl) { return { path: pl.path, cls: pl.span ? 'span' : 'found' }; })
        .concat(shown >= 2 ? [{ path: hs.pl.path.slice(0, shown), cls: 'hint' }] : []),
      cellClass: function (i) { var o = cellOwner[i]; return o && foundSet[o.w] ? (o.span ? 'spanned' : 'found') : hintCells[i] ? 'hinted' + (hintOrd[i] ? ' ordered' : '') : ''; },
      cellBadge: function (i) { return hintOrd[i] || null; },
      onSubmit: function (path) {
        var w = path.map(function (i) { return p.letters[i]; }).join('');
        var match = p.words.filter(function (pl) { return pl.w === w; })[0];
        if (match && !foundSet[w]) {
          gs.found.push(w); if (gs.hintW === w) { gs.hintW = null; gs.hintStage = 0; }
          api.toast(match.span ? 'Theme word! ' + w : w, 'good');
          if (gs.found.length === p.words.length) { api.update(gs); api.finish('solved'); return; }
          api.update(gs); return;
        }
        if (match) { api.toast('Already found.', ''); return; }
        gs.tries++;
        if (w.length >= 4 && PL.dict.has(w)) { if (gs.notTheme.indexOf(w) < 0) gs.notTheme.push(w); api.toast('“' + w + '” is a word, but not part of this theme.', ''); }
        else api.toast(w.length < 4 ? 'Theme words have at least four letters.' : 'Not a word here.', 'bad');
        api.save(gs);
      }
    });
    var themeFound = gs.found.indexOf(p.words[0].w) >= 0;
    return h('div', { class: 'trails' },
      h('div', { class: 'tw-clue' }, h('span', { class: 'lbl' }, 'Theme '), h('b', null, p.clue)),
      h('div', { class: 'muted small' }, (gs.found.length) + ' of ' + p.words.length + ' theme words found' + (themeFound ? '' : ' · one of them spans the board and names the theme')),
      tr.el,
      hs.pl && hs.stage >= 1 ? h('div', { class: 'muted small' }, shown >= hs.pl.path.length ? 'Hint: trace the numbered cells in order, 1 to ' + hs.pl.path.length + '.' : 'Hint: the outlined cells form one ' + hs.pl.path.length + '-letter theme word' + (shown ? '; the numbers show how it starts.' : '.')) : null,
      gs.notTheme.length ? h('div', { class: 'muted small' }, 'Words that aren’t in the theme: ' + gs.notTheme.join(', ')) : null);
  }
  function hint(p, gs) {
    var unfound = p.words.filter(function (pl) { return gs.found.indexOf(pl.w) < 0; });
    if (!unfound.length) return { msg: 'Everything is found.', noCount: true };
    var hs = hintState(p, gs);
    if (!hs.w) { // pick the next word: one already started, else the first unfound non-theme word, theme word last
      var started = unfound.filter(function (pl) { return gs.hp[pl.w]; }), others = unfound.filter(function (pl) { return !pl.span; });
      gs.hintW = (started.length ? started : others.length ? others : unfound)[0].w;
      hs = hintState(p, gs);
    }
    var pl = hs.pl, L = pl.path.length, st = hs.stage;
    if (st >= L + 1) return { msg: 'Every cell of this word is numbered: trace 1 to ' + L + '.', noCount: true };
    st = gs.hp[pl.w] = st + 1; gs.hintStage = st;
    var msg;
    if (st === 1) msg = 'The outlined cells form one ' + L + '-letter theme word' + (pl.span ? ' (the one that names the theme)' : '') + '.';
    else if (st === 2) msg = 'It starts at the cell marked 1: “' + p.letters[pl.path[0]] + '”.';
    else msg = 'Letter ' + (st - 1) + ' is “' + p.letters[pl.path[st - 2]] + '”, marked ' + (st - 1) + (st - 1 === L ? '. That is the whole word.' : '.');
    return { msg: msg, gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved', n = gs.found.length;
    var q = solved ? PL.clamp(100 - ctx.hints * 7 - Math.floor(gs.tries / 4) * 3, 15, 100) : Math.round(40 * n / p.words.length);
    return { quality: Math.round(q), metrics: { found: gs.found.slice(), words: p.words.length, theme: p.theme, size: p.C + '×' + p.R, perfect: solved && !ctx.hints, tries: gs.tries },
      lines: [['Theme words', n + ' / ' + p.words.length], ['Board', p.C + ' × ' + p.R], ['Non-theme tries', gs.tries]] };
  }
  function review(p, gs) {
    return h('div', { class: 'review' }, h('div', null, h('span', { class: 'lbl' }, 'Theme '), h('b', null, p.clue)),
      h('ol', { class: 'steps' }, p.words.map(function (pl) { return h('li', null, h('b', { class: pl.span ? 'tw-span' : '' }, pl.w), pl.span ? ' (theme word)' : '', gs.found.indexOf(pl.w) >= 0 ? ' ✓' : ''); })));
  }
  function stats(atts) {
    var s = atts.filter(function (a) { return a.outcome === 'solved'; });
    return [['Completion rate', atts.length ? Math.round(100 * s.length / atts.length) + '%' : '—'],
      ['Perfect boards (no hints)', s.filter(function (a) { return a.metrics.perfect; }).length],
      ['Average words found', atts.length ? PL.mean(atts.map(function (a) { return (a.metrics.found || []).length; })).toFixed(1) : '—'],
      ['Themes completed', s.length]];
  }
  PL.games.trails = {
    id: 'trails', name: 'Word Trails', blurb: 'Find the theme words that fill the whole board.',
    rules: 'Every letter belongs to exactly one theme word. Trace words through touching letters, including diagonals; each letter is used once. One special theme word stretches from one side of the board to the other and names the theme. Find them all.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 150 + lv * 30; }, timeLimit: function (lv) { return 600; },
    _build: build, _verify: verify, _hintState: hintState
  };
})();

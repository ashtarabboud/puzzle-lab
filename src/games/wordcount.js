/* ===== GAME 11: WORD COUNT — five-letter deduction from aggregate counts only =====
   After each guess the game reports how many letters are in the right spot, how many are in the word but elsewhere,
   and how many are absent (always totalling five), never which letters. Duplicate letters count once per occurrence. */
(function () {
  var h = PL.h, X = PL.five;
  var COMMON = 'etaoinsrhldcumfpgwybvk';
  function spec(lv) {
    if (lv <= 3) return { tier: 't1', repeats: false, pool: true };
    if (lv <= 5) return { tier: 't1', repeats: false, pool: false };
    if (lv <= 7) return { tier: 't12', repeats: false, pool: false };
    return { tier: lv >= 10 ? 't123' : 't12', repeats: true, pool: false };
  }
  function answers(sp) {
    var F = X.data(), list = sp.tier === 't1' ? F.t1 : sp.tier === 't12' ? F.t1.concat(F.t2) : F.t1.concat(F.t2, F.t3);
    return sp.repeats ? list : list.filter(function (w) { return !X.repeats(w); });
  }
  function fits(w, pool) { for (var i = 0; i < 5; i++) if (pool.indexOf(w[i]) < 0) return false; return true; }
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), sp = spec(lv), avoid = {};
    ((ctx && ctx.seenWords) || []).forEach(function (w) { avoid[String(w).toLowerCase()] = 1; });
    var list = answers(sp);
    for (var t = 0; t < 200; t++) {
      var w = X.pickAnswer(rng, list, avoid);
      if (!sp.pool) return { w: w, max: 8, lv: lv, pool: null, repeats: sp.repeats };
      // easy: a 12-letter pool containing the answer; guesses may only use these letters
      var extra = rng.shuffle(COMMON.split('').filter(function (c) { return w.indexOf(c) < 0; })).slice(0, 7);
      var pool = w.split('').concat(extra).sort().join('');
      var guessable = Array.from(X.data().guess).filter(function (g) { return fits(g, pool) && !X.repeats(g); });
      var cands = list.filter(function (g) { return fits(g, pool); });
      if (guessable.length >= 40 && cands.length >= 6) return { w: w, max: 8, lv: lv, pool: pool, repeats: false };
    }
    return { w: X.pickAnswer(rng, list, avoid), max: 8, lv: lv, pool: null, repeats: sp.repeats };
  }
  function init() { return { rows: [], cur: '', cm: {}, ws: [], tool: 0, edit: null, hin: [], told: [] }; }
  function candidates(p, gs) {
    var list = answers(spec(p.lv)).filter(function (w) { return !p.pool || fits(w, p.pool); });
    return list.filter(function (w) { return gs.rows.every(function (r) { return X.counts(r.g, w).join() === r.c.join(); }); });
  }
  /* ---- deduction workspace ----
     Your own markings, never game feedback, never a hint or a guess. Every letter cell has its OWN mark, so the N in one
     row can be green while the N in another is yellow. Marks: 0 none, 1 green (right spot), 2 yellow (in the word,
     elsewhere), 3 red (ruled out). Working rows below the guesses hold any letters or blanks ("_ A _ E _"). */
  var MARK = ['', 'm1', 'm2', 'm3'], MARK_NAME = ['unmarked', 'green', 'yellow', 'red'];
  function upgrade(gs) { // records saved before per-cell marks: one mark per LETTER (1 maybe, 2 out, 3 in)
    if (!gs.cm) {
      var old = gs.mk || {}, map = { 1: 2, 2: 3, 3: 1 }; gs.cm = {};
      gs.hin = gs.hin || [];
      (gs.told || []).forEach(function (t) { var m = /^([A-Z]) is in the word/.exec(t) || /is ([A-Z])\.$/.exec(t); if (m && gs.hin.indexOf(m[1].toLowerCase()) < 0) gs.hin.push(m[1].toLowerCase()); });
      gs.rows.forEach(function (r, i) { gs.cm[i] = r.g.split('').map(function (ch) { return gs.hin.indexOf(ch) >= 0 && old[ch] === 3 ? 0 : (map[old[ch]] || 0); }); });
      delete gs.mk; delete gs.markMode;
    }
    gs.ws = gs.ws || []; gs.tool = gs.tool || 0; gs.hin = gs.hin || []; if (gs.edit === undefined) gs.edit = null;
    return gs;
  }
  function letterState(gs, ch) { // keyboard tint summarises your marks: any green > any yellow > only red
    if (gs.hin.indexOf(ch) >= 0) return 'in';
    var seen = { 1: 0, 2: 0, 3: 0 };
    gs.rows.forEach(function (r, i) { var m = gs.cm[i] || []; r.g.split('').forEach(function (c, k) { if (c === ch && m[k]) seen[m[k]]++; }); });
    gs.ws.forEach(function (row) { row.forEach(function (cell) { if (cell.l === ch && cell.m) seen[cell.m]++; }); });
    return seen[1] ? 'in' : seen[2] ? 'maybe' : seen[3] ? 'out' : '';
  }
  function view(api) {
    var p = api.p, gs = upgrade(api.gs), F = X.data(), over = api.done;
    var allowed = p.pool ? new Set(p.pool.split('')) : null;
    function save() { api.save(gs); api.update(gs); }
    function submit() {
      var g = gs.cur;
      if (g.length < 5) { api.toast('Not enough letters.', ''); return; }
      if (!F.guess.has(g)) { api.toast('“' + g.toUpperCase() + '” isn’t in the word list.', 'bad'); return; }
      if (p.pool && X.repeats(g)) { api.toast('In this puzzle, guesses can’t repeat letters.', ''); return; }
      if (gs.rows.some(function (r) { return r.g === g; })) { api.toast('Already guessed.', ''); return; }
      gs.rows.push({ g: g, c: X.counts(g, p.w) }); gs.cm[gs.rows.length - 1] = [0, 0, 0, 0, 0]; gs.cur = '';
      if (g === p.w) { api.update(gs); api.finish('solved'); return; }
      api.wrong();
      if (gs.rows.length >= p.max) { api.update(gs); api.finish('failed'); return; }
      api.update(gs);
    }
    function applyMark(cur) { // the selected colour; tapping a cell that already has it clears it
      if (gs.tool === 4) return 0;
      if (gs.tool) return cur === gs.tool ? 0 : gs.tool;
      return (cur + 1) % 4; // no colour selected: tap cycles none → green → yellow → red → none
    }
    function markGuess(r, k) { var m = gs.cm[r] = gs.cm[r] || [0, 0, 0, 0, 0]; m[k] = applyMark(m[k] || 0); save(); }
    function wsTap(r, k) {
      var cell = gs.ws[r][k];
      if (gs.tool) { cell.m = applyMark(cell.m || 0); save(); return; }
      gs.edit = gs.edit && gs.edit.r === r && gs.edit.i === k ? null : { r: r, i: k }; save();
    }
    function onKey(k) {
      if (over) return;
      if (gs.edit) { // typing into a working row; the official guess is untouched
        var row = gs.ws[gs.edit.r]; if (!row) { gs.edit = null; return save(); }
        if (k === 'enter') { gs.edit = null; return save(); }
        if (k === 'del') { if (row[gs.edit.i].l) row[gs.edit.i].l = ''; else if (gs.edit.i > 0) { gs.edit.i--; row[gs.edit.i].l = ''; } return save(); }
        if (k === 'blank') { row[gs.edit.i].l = ''; if (gs.edit.i < 4) gs.edit.i++; return save(); }
        if (k.length === 1) { row[gs.edit.i].l = k; if (gs.edit.i < 4) gs.edit.i++; return save(); }
        return;
      }
      if (k === 'enter') return submit();
      if (k === 'del') { gs.cur = gs.cur.slice(0, -1); return save(); }
      if (k.length !== 1) return;
      if (allowed && !allowed.has(k)) return;
      if (gs.cur.length < 5) { gs.cur += k; save(); }
    }
    X.setKeyHandler(onKey);
    var rows = gs.rows.map(function (r, ri) {
      var m = gs.cm[ri] || [];
      return h('div', { class: 'wc-row' + (ri === gs.rows.length - 1 && PL.fx && PL.fx.once('wc:' + p.w + ':' + gs.rows.length + ':' + (gs.rows[ri].g)) ? ' fresh' : '') },
        h('div', { class: 'wc-word' }, r.g.split('').map(function (ch, k) { return h('button', { class: 'wc-l ' + MARK[m[k] || 0], style: '--d:' + (k * 60) + 'ms', 'aria-label': ch.toUpperCase() + ', marked ' + MARK_NAME[m[k] || 0] + ' (tap to mark)', disabled: over, onclick: function () { markGuess(ri, k); } }, ch.toUpperCase()); })),
        h('div', { class: 'wc-counts', 'aria-label': r.c[0] + ' right spot, ' + r.c[1] + ' wrong spot, ' + r.c[2] + ' absent' },
          h('span', { class: 'wc-c g' }, String(r.c[0])), h('span', { class: 'wc-c y' }, String(r.c[1])), h('span', { class: 'wc-c x' }, String(r.c[2]))));
    });
    if (!over) rows.push(h('div', { class: 'wc-row cur' + (gs.edit ? ' idle' : '') }, h('div', { class: 'wc-word' }, [0, 1, 2, 3, 4].map(function (i) { return h('span', { class: 'wc-l typed' }, (gs.cur[i] || '').toUpperCase()); })), h('div', { class: 'muted small' }, (p.max - gs.rows.length) + ' left')));
    var tools = over ? null : h('div', { class: 'wc-tools', role: 'toolbar', 'aria-label': 'Marking colour' },
      h('span', { class: 'small muted' }, 'Mark:'),
      [[1, 'Green', 'right spot'], [2, 'Yellow', 'elsewhere'], [3, 'Red', 'ruled out'], [4, 'Clear', 'remove a mark']].map(function (t) {
        return h('button', { class: 'wc-tool t' + t[0] + (gs.tool === t[0] ? ' on' : ''), 'aria-pressed': gs.tool === t[0] ? 'true' : 'false', title: t[2], onclick: function () { gs.tool = gs.tool === t[0] ? 0 : t[0]; gs.edit = null; save(); } }, t[1]);
      }));
    var wsEl = over && !gs.ws.length ? null : h('div', { class: 'wc-ws' },
      h('div', { class: 'ws-head' }, h('span', { class: 'lbl' }, 'Working rows'), over ? null : h('button', { class: 'btn ghost sm', onclick: function () { gs.ws.push([0, 1, 2, 3, 4].map(function () { return { l: '', m: 0 }; })); gs.tool = 0; gs.edit = { r: gs.ws.length - 1, i: 0 }; save(); } }, '+ Row')),
      gs.ws.length ? null : h('div', { class: 'muted small' }, 'Add a row to sketch ideas like _ A _ E _. Tap a square, then type; blanks stay blank. Nothing here is a guess.'),
      gs.ws.map(function (row, r) {
        return h('div', { class: 'wc-row' },
          h('div', { class: 'wc-word' }, row.map(function (cell, k) {
            var on = gs.edit && gs.edit.r === r && gs.edit.i === k;
            return h('button', { class: 'wc-l ws ' + MARK[cell.m || 0] + (on ? ' editing' : '') + (cell.l ? '' : ' blank'), disabled: over, 'aria-label': 'Working row ' + (r + 1) + ' square ' + (k + 1) + ': ' + (cell.l ? cell.l.toUpperCase() : 'blank') + ', ' + MARK_NAME[cell.m || 0], onclick: function () { wsTap(r, k); } }, cell.l ? cell.l.toUpperCase() : '_');
          })),
          over ? null : h('div', { class: 'row-actions' },
            h('button', { class: 'btn ghost xs', 'aria-label': 'Clear row ' + (r + 1), onclick: function () { row.forEach(function (c) { c.l = ''; c.m = 0; }); gs.edit = { r: r, i: 0 }; save(); } }, 'Clear'),
            h('button', { class: 'btn ghost xs', 'aria-label': 'Delete row ' + (r + 1), onclick: function () { gs.ws.splice(r, 1); gs.edit = null; save(); } }, '✕')));
      }),
      gs.edit && !over ? h('div', { class: 'row-actions' }, h('span', { class: 'small muted' }, 'Typing into working row ' + (gs.edit.r + 1) + '.'), h('button', { class: 'btn ghost sm', onclick: function () { onKey('blank'); } }, 'Blank _'), h('button', { class: 'btn sm', onclick: function () { gs.edit = null; save(); } }, 'Done')) : null);
    return h('div', { class: 'wordcount five' },
      h('div', { class: 'wc-legend small' }, h('span', { class: 'wc-c g' }, '#'), ' right letter, right spot  ', h('span', { class: 'wc-c y' }, '#'), ' in the word, wrong spot  ', h('span', { class: 'wc-c x' }, '#'), ' not in the word'),
      p.pool ? h('div', { class: 'muted small' }, 'Letters in play: ' + p.pool.toUpperCase().split('').join(' ') + '. Guesses use only these letters, with no repeats.') : p.repeats ? h('div', { class: 'muted small' }, 'The hidden word may repeat a letter.') : h('div', { class: 'muted small' }, 'The hidden word has five different letters.'),
      gs.told.length ? h('div', { class: 'wc-told small' }, gs.told.join(' · ')) : null,
      h('div', { class: 'wc-rows' }, rows),
      tools,
      over ? null : h('div', { class: 'muted small' }, gs.tool ? (gs.tool === 4 ? 'Tap a letter to clear its mark.' : 'Tap letters to mark them ' + MARK_NAME[gs.tool] + '; tap again to clear. Tap the colour again to stop.') : 'Tap a letter to cycle its mark (green → yellow → red → none), or pick a colour. Each letter is marked on its own. Marks are your notes, not feedback.'),
      wsEl,
      over ? null : X.keyboard({ onKey: onKey, allowed: gs.edit ? null : allowed, state: function (ch) { return letterState(gs, ch); } }));
  }
  /* Hints alternate between confirming a letter that is in the word and placing a letter in its spot; each also says
     how many words still fit the feedback. Hint letters are kept apart from your own marks. */
  function remaining(p, gs) {
    var hin = gs.hin || [];
    return candidates(p, gs).filter(function (w) { return (gs.placed || []).every(function (i) { return w[i] === p.w[i]; }) && hin.every(function (c) { return w.indexOf(c) >= 0; }); });
  }
  function hint(p, gs) {
    upgrade(gs);
    gs.hn = gs.hn || 0; gs.placed = gs.placed || [];
    var letters = p.w.split('').filter(function (c, i, a) { return a.indexOf(c) === i; });
    if (remaining(p, gs).length <= 1) return { msg: 'Only one word fits everything you know now — you can get it!', noCount: true };
    var confirmed = letters.filter(function (c) { return gs.hin.indexOf(c) >= 0; }).length;
    var msg = null;
    if (gs.hn % 2 === 0 && confirmed < letters.length - 1) {
      var c = letters.filter(function (x) { return gs.hin.indexOf(x) < 0; })[0];
      gs.hin.push(c); msg = c.toUpperCase() + ' is in the word.';
    } else if (gs.placed.length < 3) {
      var i = [0, 1, 2, 3, 4].filter(function (k) { return gs.placed.indexOf(k) < 0; })[0];
      gs.placed.push(i); if (gs.hin.indexOf(p.w[i]) < 0) gs.hin.push(p.w[i]); msg = 'Letter ' + (i + 1) + ' is ' + p.w[i].toUpperCase() + '.';
    } else return { msg: 'No more hints for this word.', noCount: true };
    gs.hn++;
    gs.told.push(msg);
    var n = remaining(p, gs).length;
    return { msg: msg + ' ' + PL.plural(n, 'possible answer') + (n === 1 ? ' remains.' : ' remain.'), gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved', n = gs.rows.length;
    var q = solved ? PL.clamp(100 - Math.max(0, n - 4) * 12 - ctx.hints * 12, 15, 100) : 0;
    var first = gs.rows[0] ? gs.rows[0].c : [0, 0, 5];
    return { quality: Math.round(q), metrics: { guesses: n, solved: solved, firstGreen: first[0], firstYellow: first[1], word: p.w, pool: !!p.pool, repeats: p.repeats },
      lines: [['Word', p.w.toUpperCase()], ['Guesses', solved ? n + ' / 8' : 'X / 8']] };
  }
  function review(p, gs) {
    return h('div', { class: 'review' }, h('div', null, h('span', { class: 'lbl' }, 'The word '), h('b', { class: 'mono' }, p.w.toUpperCase())),
      h('div', { class: 'wc-rows' }, gs.rows.map(function (r) { return h('div', { class: 'wc-row' }, h('span', { class: 'mono' }, r.g.toUpperCase()), h('div', { class: 'wc-counts' }, h('span', { class: 'wc-c g' }, String(r.c[0])), h('span', { class: 'wc-c y' }, String(r.c[1])), h('span', { class: 'wc-c x' }, String(r.c[2])))); })));
  }
  function stats(atts) {
    var wins = atts.filter(function (a) { return a.outcome === 'solved'; }), dist = [0, 0, 0, 0, 0, 0, 0, 0];
    wins.forEach(function (a) { var g = a.metrics.guesses; if (g >= 1 && g <= 8) dist[g - 1]++; });
    var s = X.streaks(atts);
    return [['Win rate', atts.length ? Math.round(100 * wins.length / atts.length) + '%' : '—'],
      ['Average guesses (wins)', wins.length ? PL.mean(wins.map(function (a) { return a.metrics.guesses; })).toFixed(2) : '—'],
      ['Guess distribution 1–8', dist.join(' · ')],
      ['First guess: average right-spot / wrong-spot', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.firstGreen || 0; })).toFixed(1) + ' / ' + PL.mean(atts.map(function (a) { return a.metrics.firstYellow || 0; })).toFixed(1) : '—'],
      ['Current streak', s.cur], ['Best streak', s.best]];
  }
  PL.games.wordcount = {
    id: 'wordcount', name: 'Word Count', blurb: 'Deduce a word from letter counts alone.',
    rules: 'Guess the hidden five-letter word in eight tries. After each guess you only learn three numbers: letters in the right spot, letters in the word but in the wrong spot, and letters not in the word. You never learn which letters they are. Mark any letter green, yellow or red to keep track (each letter on its own), and use working rows with blanks such as _ A _ E _ to try ideas. Marks and working rows are your notes, never guesses or hints.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 180 + lv * 30; }, timeLimit: function (lv) { return 600; },
    _candidates: candidates, _spec: spec, _upgrade: upgrade, _letterState: letterState
  };
})();

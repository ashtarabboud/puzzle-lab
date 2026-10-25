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
  function init() { return { rows: [], cur: '', mk: {}, markMode: false, told: [] }; }
  function candidates(p, gs) {
    var list = answers(spec(p.lv)).filter(function (w) { return !p.pool || fits(w, p.pool); });
    return list.filter(function (w) { return gs.rows.every(function (r) { return X.counts(r.g, w).join() === r.c.join(); }); });
  }
  var MK = ['', 'maybe', 'out', 'in']; // letter marks: unmarked, possible, excluded, confirmed
  function view(api) {
    var p = api.p, gs = api.gs, F = X.data(), over = api.done;
    var allowed = p.pool ? new Set(p.pool.split('')) : null;
    function submit() {
      var g = gs.cur;
      if (g.length < 5) { api.toast('Not enough letters.', ''); return; }
      if (!F.guess.has(g)) { api.toast('“' + g.toUpperCase() + '” isn’t in the word list.', 'bad'); return; }
      if (p.pool && X.repeats(g)) { api.toast('In this puzzle, guesses can’t repeat letters.', ''); return; }
      if (gs.rows.some(function (r) { return r.g === g; })) { api.toast('Already guessed.', ''); return; }
      gs.rows.push({ g: g, c: X.counts(g, p.w) }); gs.cur = '';
      if (g === p.w) { api.update(gs); api.finish('solved'); return; }
      api.wrong();
      if (gs.rows.length >= p.max) { api.update(gs); api.finish('failed'); return; }
      api.update(gs);
    }
    function cycle(ch) { gs.mk[ch] = ((gs.mk[ch] || 0) + 1) % 4; api.save(gs); api.update(gs); }
    function onKey(k) {
      if (over) return;
      if (gs.markMode && k.length === 1) return cycle(k);
      if (k === 'enter') return submit();
      if (k === 'del') { gs.cur = gs.cur.slice(0, -1); api.save(gs); api.update(gs); return; }
      if (allowed && !allowed.has(k)) return;
      if (gs.cur.length < 5) { gs.cur += k; api.save(gs); api.update(gs); }
    }
    X.setKeyHandler(onKey);
    var rows = gs.rows.map(function (r) {
      return h('div', { class: 'wc-row' },
        h('div', { class: 'wc-word' }, r.g.split('').map(function (ch) { return h('button', { class: 'wc-l ' + MK[gs.mk[ch] || 0], 'aria-label': ch.toUpperCase() + ' (tap to mark)', disabled: over, onclick: function () { cycle(ch); } }, ch.toUpperCase()); })),
        h('div', { class: 'wc-counts', 'aria-label': r.c[0] + ' right spot, ' + r.c[1] + ' wrong spot, ' + r.c[2] + ' absent' },
          h('span', { class: 'wc-c g' }, String(r.c[0])), h('span', { class: 'wc-c y' }, String(r.c[1])), h('span', { class: 'wc-c x' }, String(r.c[2]))));
    });
    if (!over) rows.push(h('div', { class: 'wc-row cur' }, h('div', { class: 'wc-word' }, [0, 1, 2, 3, 4].map(function (i) { return h('span', { class: 'wc-l typed' }, (gs.cur[i] || '').toUpperCase()); })), h('div', { class: 'muted small' }, (p.max - gs.rows.length) + ' left')));
    return h('div', { class: 'wordcount five' },
      h('div', { class: 'wc-legend small' }, h('span', { class: 'wc-c g' }, '#'), ' right letter, right spot  ', h('span', { class: 'wc-c y' }, '#'), ' in the word, wrong spot  ', h('span', { class: 'wc-c x' }, '#'), ' not in the word'),
      p.pool ? h('div', { class: 'muted small' }, 'Letters in play: ' + p.pool.toUpperCase().split('').join(' ') + '. Guesses use only these letters, with no repeats.') : p.repeats ? h('div', { class: 'muted small' }, 'The hidden word may repeat a letter.') : h('div', { class: 'muted small' }, 'The hidden word has five different letters.'),
      gs.told.length ? h('div', { class: 'wc-told small' }, gs.told.join(' · ')) : null,
      h('div', { class: 'wc-rows' }, rows),
      over ? null : h('div', { class: 'row-actions' },
        h('label', { class: 'switch small' }, h('input', { type: 'checkbox', checked: gs.markMode, onchange: function () { gs.markMode = this.checked; api.update(gs); } }), ' Mark letters'),
        h('span', { class: 'muted small' }, gs.markMode ? 'Tap letters: maybe → out → in → clear' : 'Tap any letter in your guesses to mark it')),
      over ? null : X.keyboard({ onKey: onKey, allowed: allowed, state: function (ch) { return MK[gs.mk[ch] || 0]; } }));
  }
  /* Hints alternate between confirming a letter that is in the word and placing a letter in its spot; each also says
     how many words still fit the feedback. */
  function remaining(p, gs) {
    var letters = p.w.split('').filter(function (c, i, a) { return a.indexOf(c) === i; });
    return candidates(p, gs).filter(function (w) { return (gs.placed || []).every(function (i) { return w[i] === p.w[i]; }) && letters.filter(function (c) { return gs.mk[c] === 3; }).every(function (c) { return w.indexOf(c) >= 0; }); });
  }
  function hint(p, gs) {
    gs.hn = gs.hn || 0; gs.placed = gs.placed || [];
    var letters = p.w.split('').filter(function (c, i, a) { return a.indexOf(c) === i; });
    if (remaining(p, gs).length <= 1) return { msg: 'Only one word fits everything you know now — you can get it!', noCount: true };
    var confirmed = letters.filter(function (c) { return gs.mk[c] === 3; }).length;
    var msg = null;
    if (gs.hn % 2 === 0 && confirmed < letters.length - 1) {
      var c = letters.filter(function (x) { return gs.mk[x] !== 3; })[0];
      gs.mk[c] = 3; msg = c.toUpperCase() + ' is in the word (marked “in”).';
    } else if (gs.placed.length < 3) {
      var i = [0, 1, 2, 3, 4].filter(function (k) { return gs.placed.indexOf(k) < 0; })[0];
      gs.placed.push(i); gs.mk[p.w[i]] = 3; msg = 'Letter ' + (i + 1) + ' is ' + p.w[i].toUpperCase() + '.';
    } else return { msg: 'No more hints for this word.', noCount: true };
    gs.hn++;
    gs.told.push(msg.replace(' (marked “in”)', ''));
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
    rules: 'Guess the hidden five-letter word in eight tries. After each guess you only learn three numbers: letters in the right spot, letters in the word but in the wrong spot, and letters not in the word. You never learn which letters they are. Mark letters on the keyboard as maybe, out or in to keep track.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 180 + lv * 30; }, timeLimit: function (lv) { return 600; },
    _candidates: candidates, _spec: spec
  };
})();

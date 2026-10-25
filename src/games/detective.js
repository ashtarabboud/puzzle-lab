/* ===== GAME 7: WORD DETECTIVE ===== */
(function () {
  var h = PL.h;
  function lenRange(lv) { return lv <= 2 ? [4, 5] : lv <= 4 ? [5, 6] : lv <= 6 ? [5, 7] : lv <= 8 ? [6, 8] : [7, 10]; }
  function costs(lv) {
    return { len: 1, vow: 1, has: 1, pos: 3, at: 4, rep: 1, half: 1, cat: 2 + Math.floor(lv / 5), assoc: 3 + Math.floor(lv / 4), def: 6 + Math.floor(lv / 3), wrong: 3 };
  }
  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10), lr = lenRange(lv);
    var seen = {}; ((ctx && ctx.seenWords) || []).forEach(function (w) { seen[w] = 1; });
    var pool = PL.passwordBank().filter(function (e) { return e.w.length >= lr[0] && e.w.length <= lr[1] && /^[A-Z]+$/.test(e.w); });
    var fresh = pool.filter(function (e) { return !seen[e.w]; });
    var e = rng.pick(fresh.length ? fresh : pool);
    return { w: e.w, cat: e.cat, def: e.def, assoc: rng.shuffle(e.assoc).slice(0, 3), costs: costs(lv), par: 4 + e.w.length + Math.floor(lv / 2) };
  }
  function init() { return { facts: [], cost: 0, guesses: [], mode: null, assocUsed: 0 }; }
  var VOW = 'AEIOU';
  function ask(p, gs, kind, arg) {
    var w = p.w, c = p.costs, f = null;
    if (kind === 'len') f = { k: 'len', t: 'It has ' + w.length + ' letters.' };
    if (kind === 'vow') { var n = w.split('').filter(function (x) { return VOW.indexOf(x) >= 0; }).length; f = { k: 'vow', t: 'It has ' + n + ' vowel letter' + (n === 1 ? '' : 's') + ' (A E I O U).' }; }
    if (kind === 'has') f = { k: 'has:' + arg, t: arg + (w.indexOf(arg) >= 0 ? ' is in the word.' : ' is not in the word.'), yes: w.indexOf(arg) >= 0, letter: arg };
    if (kind === 'pos') { var ps = []; w.split('').forEach(function (x, i) { if (x === arg) ps.push(i + 1); }); f = { k: 'pos:' + arg, t: ps.length ? arg + ' is at position' + (ps.length > 1 ? 's ' : ' ') + ps.join(' and ') + '.' : arg + ' is not in the word.', letter: arg, at: ps }; }
    if (kind === 'at') f = { k: 'at:' + arg, t: 'Letter ' + arg + ' is ' + w[arg - 1] + '.', at: arg, letter: w[arg - 1] };
    if (kind === 'rep') { var rep = w.split('').filter(function (x, i) { return w.indexOf(x) !== i; }); f = { k: 'rep', t: rep.length ? 'Yes, some letter appears more than once.' : 'No letter appears more than once.' }; }
    if (kind === 'half') f = { k: 'half', t: 'It starts with a letter in ' + (w[0] <= 'M' ? 'A–M.' : 'N–Z.') };
    if (kind === 'cat') f = { k: 'cat', t: 'Broad category: ' + p.cat + '.' };
    if (kind === 'assoc') { if (gs.assocUsed >= p.assoc.length) return null; f = { k: 'assoc' + gs.assocUsed, t: 'Associated with: ' + p.assoc[gs.assocUsed] + '.' }; gs.assocUsed++; }
    if (kind === 'def') f = { k: 'def', t: 'Definition: ' + p.def };
    if (!f) return null;
    if (gs.facts.some(function (x) { return x.k === f.k; })) return 'dup';
    f.cost = c[kind]; gs.facts.push(f); gs.cost += c[kind];
    return f;
  }
  function pattern(p, gs) {
    var lenKnown = gs.facts.some(function (f) { return f.k === 'len'; });
    var known = {};
    gs.facts.forEach(function (f) { if (f.k.indexOf('pos:') === 0) f.at.forEach(function (i) { known[i] = f.letter; }); if (f.k.indexOf('at:') === 0) known[f.at] = f.letter; });
    if (!lenKnown && !Object.keys(known).length) return null;
    var L = lenKnown ? p.w.length : null;
    if (!L) return null;
    var out = []; for (var i = 1; i <= L; i++) out.push(known[i] || '·');
    return out;
  }
  function view(api) {
    var p = api.p, gs = api.gs, c = p.costs;
    var L = p.w.length, lenKnown = gs.facts.some(function (f) { return f.k === 'len'; });
    var pat = pattern(p, gs);
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    var yes = {}, no = {};
    gs.facts.forEach(function (f) { if (f.letter && f.k.indexOf('has:') === 0) (f.yes ? yes : no)[f.letter] = 1; if (f.k.indexOf('pos:') === 0) (f.at.length ? yes : no)[f.letter] = 1; if (f.k.indexOf('at:') === 0) yes[f.letter] = 1; });
    function doAsk(kind, arg) {
      var r = ask(p, gs, kind, arg);
      if (r === 'dup') { api.toast('You already know that.', ''); return; }
      if (!r) { api.toast('Nothing more of that kind.', ''); return; }
      gs.mode = null; api.update(gs);
    }
    var picker = null;
    if (gs.mode === 'has' || gs.mode === 'pos') {
      picker = h('div', { class: 'keys' }, letters.map(function (ch) {
        return h('button', { class: 'key' + (yes[ch] ? ' yes' : no[ch] ? ' no' : ''), onclick: function () { doAsk(gs.mode, ch); } }, ch);
      }).concat([h('button', { class: 'key wide ghost', onclick: function () { gs.mode = null; api.update(gs); } }, 'Cancel')]));
    }
    if (gs.mode === 'at') {
      var nums = []; for (var i = 1; i <= L; i++) nums.push(i);
      picker = h('div', { class: 'keys' }, nums.map(function (n) { return h('button', { class: 'key', onclick: function () { doAsk('at', n); } }, String(n)); }).concat([h('button', { class: 'key wide ghost', onclick: function () { gs.mode = null; api.update(gs); } }, 'Cancel')]));
    }
    var act = function (kind, label, cost, opts) {
      var used = gs.facts.some(function (f) { return f.k === kind; }) || (kind === 'assoc' && gs.assocUsed >= p.assoc.length);
      return h('button', { class: 'btn act', disabled: api.done || used || (opts && opts.needLen && !lenKnown), onclick: function () { if (opts && opts.mode) { gs.mode = opts.mode; api.update(gs); } else doAsk(kind); } },
        h('span', null, label), h('span', { class: 'cost' }, cost));
    };
    var inp = h('input', { id: 'det-in', class: 'txt', type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'Your guess', enterkeyhint: 'go' });
    return h('div', { class: 'detective' },
      h('div', { class: 'det-top' },
        h('div', null, h('span', { class: 'lbl' }, 'Information cost '), h('b', { class: 'big mono' }, String(gs.cost))),
        h('div', { class: 'muted small' }, 'Par ' + p.par + '. Wrong guess +' + c.wrong + '.')),
      pat ? h('div', { class: 'det-pat mono' }, pat.map(function (x) { return h('span', { class: 'lt' + (x !== '·' ? ' lt-ch' : '') }, x); })) : null,
      h('div', { class: 'det-acts' },
        act('len', 'Word length', c.len), act('vow', 'Vowel count', c.vow), act('rep', 'Any repeated letter?', c.rep), act('half', 'First letter A–M or N–Z?', c.half),
        act('has', 'Is letter … in it?', c.has, { mode: 'has' }), act('pos', 'Where is letter …?', c.pos, { mode: 'pos' }), act('at', 'Letter at position …', c.at, { mode: 'at', needLen: true }),
        act('cat', 'Broad category', c.cat), act('assoc', 'An association', c.assoc), act('def', 'Definition', c.def)),
      picker,
      h('ol', { class: 'facts' }, gs.facts.map(function (f) { return h('li', null, h('span', null, f.t), h('span', { class: 'cost' }, f.hint ? 'hint' : '+' + f.cost)); })),
      api.done ? null : h('form', { class: 'row-in', onsubmit: function (e) {
        e.preventDefault();
        var g = inp.value.trim().toUpperCase().replace(/[^A-Z]/g, ''); if (!g) return;
        gs.guesses.push(g);
        if (g === p.w) { api.update(gs); api.finish('solved'); return; }
        gs.cost += c.wrong; api.wrong();
        var info = g.length !== p.w.length ? ' (and the length is different)' : '';
        api.toast('Not ' + g + info + '. +' + c.wrong, 'bad'); api.update(gs);
      } }, inp, h('button', { class: 'btn primary', type: 'submit' }, 'Guess')),
      gs.guesses.length ? h('div', { class: 'muted small' }, 'Guesses: ' + gs.guesses.join(', ')) : null);
  }
  /* Hint: reveals a letter in its position (free of information cost, but counted as a hint).
     First the word length if unknown, then unknown positions, choosing the letter that is rarest (most informative). */
  function hint(p, gs) {
    var w = p.w;
    if (!gs.facts.some(function (f) { return f.k === 'len'; })) { gs.facts.push({ k: 'len', t: 'It has ' + w.length + ' letters.', cost: 0, hint: true }); return { msg: 'The word has ' + w.length + ' letters.', gs: gs }; }
    var known = {};
    gs.facts.forEach(function (f) { if (f.k.indexOf('pos:') === 0) f.at.forEach(function (i) { known[i] = 1; }); if (f.k.indexOf('at:') === 0) known[f.at] = 1; });
    var freq = 'ETAOINSHRDLCUMWFGYPBVKJXQZ';
    var cand = []; for (var i = 1; i <= w.length; i++) if (!known[i]) cand.push(i);
    if (cand.length <= 1) return { msg: 'Only one letter is still hidden — you can do it!', noCount: true };
    cand.sort(function (a, b) { return freq.indexOf(w[b - 1]) - freq.indexOf(w[a - 1]); });
    var at = cand[0];
    gs.facts.push({ k: 'at:' + at, t: 'Letter ' + at + ' is ' + w[at - 1] + '.', at: at, letter: w[at - 1], cost: 0, hint: true });
    return { msg: 'Letter ' + at + ' is ' + w[at - 1] + '.', gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var q = solved ? PL.clamp(100 - Math.max(0, gs.cost - p.par) * 4 - ctx.hints * 10, 10, 100) : 0;
    return { quality: Math.round(q), metrics: { cost: gs.cost, par: p.par, clues: gs.facts.length, wrong: ctx.wrong, len: p.w.length, usedDef: gs.facts.some(function (f) { return f.k === 'def'; }) },
      lines: [['Information cost', gs.cost + ' (par ' + p.par + ')'], ['Questions asked', gs.facts.length], ['Wrong guesses', ctx.wrong]] };
  }
  function review(p, gs) {
    return h('div', { class: 'review' }, h('div', null, h('span', { class: 'lbl' }, 'The word '), h('b', { class: 'mono' }, p.w)), h('p', { class: 'muted small' }, p.def + ' Category: ' + p.cat + '. Associations: ' + p.assoc.join(', ') + '.'),
      h('div', { class: 'lbl' }, 'Your questions'), h('ol', { class: 'facts' }, gs.facts.map(function (f) { return h('li', null, h('span', null, f.t), h('span', { class: 'cost' }, f.hint ? 'hint' : '+' + f.cost)); })),
      gs.guesses.length ? h('p', { class: 'muted small' }, 'Guesses: ' + gs.guesses.join(', ')) : null);
  }
  function stats(atts) {
    var s = atts.filter(function (a) { return a.outcome === 'solved'; });
    return [['Average information cost', s.length ? PL.mean(s.map(function (a) { return a.metrics.cost; })).toFixed(1) : '—'],
      ['Average cost over par', s.length ? PL.mean(s.map(function (a) { return a.metrics.cost - a.metrics.par; })).toFixed(1) : '—'],
      ['Solved without the definition', s.length ? Math.round(100 * s.filter(function (a) { return !a.metrics.usedDef; }).length / s.length) + '%' : '—'],
      ['Average questions asked', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.clues; })).toFixed(1) : '—']];
  }
  PL.games.detective = {
    id: 'detective', name: 'Word Detective', blurb: 'Buy only the clues you need to name a hidden word.',
    rules: 'A hidden word is waiting. Each question costs points: cheap ones about letters and length, pricier ones about meaning. Choose your questions wisely, then guess. Lower total cost is better; wrong guesses add to the cost.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 60 + lv * 15; }, timeLimit: function (lv) { return 180 + lv * 20; },
    _ask: ask
  };
})();

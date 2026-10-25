/* ===== Shared five-letter word helpers (Word Grid, Word Count) ===== */
(function () {
  var h = PL.h;
  var F = null;
  function unpack(s) { var out = []; for (var i = 0; i < s.length; i += 5) out.push(s.substr(i, 5)); return out; }
  function data() {
    if (F) return F;
    var d = PL.data.five || { t1: '', t2: '', t3: '', g: '' };
    F = { t1: unpack(d.t1), t2: unpack(d.t2), t3: unpack(d.t3), guess: new Set(unpack(d.g)) };
    F.t1.concat(F.t2, F.t3).forEach(function (w) { F.guess.add(w); });
    F.neighbors = {}; // words in t1+t2 that differ from w in exactly one position (traps like _ight)
    var common = F.t1.concat(F.t2), bucket = {};
    common.forEach(function (w) { for (var i = 0; i < 5; i++) { var k = w.slice(0, i) + '_' + w.slice(i + 1); (bucket[k] = bucket[k] || []).push(w); } });
    common.forEach(function (w) { var n = 0; for (var i = 0; i < 5; i++) n += bucket[w.slice(0, i) + '_' + w.slice(i + 1)].length - 1; F.neighbors[w] = n; });
    return F;
  }
  function repeats(w) { return new Set(w.split('')).size < 5; }
  /* Wordle-style marks with correct duplicate handling: each answer letter is used at most once. 2 = right spot, 1 = elsewhere, 0 = absent */
  function marks(guess, answer) {
    var m = [0, 0, 0, 0, 0], left = {};
    for (var i = 0; i < 5; i++) { if (guess[i] === answer[i]) m[i] = 2; else left[answer[i]] = (left[answer[i]] || 0) + 1; }
    for (i = 0; i < 5; i++) if (m[i] !== 2 && left[guess[i]]) { m[i] = 1; left[guess[i]]--; }
    return m;
  }
  function counts(guess, answer) { var m = marks(guess, answer), c = [0, 0, 0]; m.forEach(function (x) { c[x === 2 ? 0 : x === 1 ? 1 : 2]++; }); return c; } // [right spot, wrong spot, absent]
  var ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  function keyboard(opts) { // opts: state(letter)->class, onKey(k), allowed (Set|null)
    return h('div', { class: 'kb', role: 'group', 'aria-label': 'Keyboard' }, ROWS.map(function (row, ri) {
      var keys = row.split('').map(function (ch) {
        var dis = opts.allowed && !opts.allowed.has(ch);
        return h('button', { class: 'kbk ' + (opts.state ? opts.state(ch) : '') + (dis ? ' off' : ''), disabled: dis || opts.disabled, 'aria-label': ch.toUpperCase(), onclick: function () { opts.onKey(ch); } }, ch.toUpperCase());
      });
      if (ri === 2) { keys.unshift(h('button', { class: 'kbk wide', disabled: opts.disabled, onclick: function () { opts.onKey('enter'); } }, 'Enter')); keys.push(h('button', { class: 'kbk wide', disabled: opts.disabled, 'aria-label': 'Delete', onclick: function () { opts.onKey('del'); } }, '⌫')); }
      return h('div', { class: 'kbr' }, keys);
    }));
  }
  /* physical keyboard support (one listener for the whole app; routed to whichever game registered last) */
  var keyHandler = null;
  if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('keydown', function (e) {
    if (!keyHandler || !document.querySelector('.five')) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'Enter') { e.preventDefault(); keyHandler('enter'); } else if (e.key === 'Backspace') { e.preventDefault(); keyHandler('del'); } else if (e.key === ' ') { e.preventDefault(); keyHandler('blank'); } else if (/^[a-zA-Z]$/.test(e.key)) keyHandler(e.key.toLowerCase());
  });
  function streaks(atts) {
    var cur = 0, best = 0;
    atts.forEach(function (a) { if (a.outcome === 'solved') { cur++; best = Math.max(best, cur); } else cur = 0; });
    return { cur: cur, best: best };
  }
  function pickAnswer(rng, pool, avoid) {
    var fresh = pool.filter(function (w) { return !avoid[w]; });
    return rng.pick(fresh.length > 20 ? fresh : pool);
  }
  PL.five = { data: data, marks: marks, counts: counts, repeats: repeats, keyboard: keyboard, setKeyHandler: function (f) { keyHandler = f; }, streaks: streaks, pickAnswer: pickAnswer };
})();

/* ===== Calculator: safe expression parser (no eval) with exact fractions ===== */
(function () {
  var h = PL.h;
  /* Grammar: expr := term (('+'|'-') term)* ; term := power (('*'|'/'|implicit) power)* ;
     power := unary ('^' power)? ; unary := '-' unary | power ; power := postfix ('^' unary)? ; primary := number | '(' expr ')' | 'sqrt' primary | primary '%'
     Values are {q: rational | null, f: float}; rationals stay exact until a non-rational operation. */
  function V(q, f) { return { q: q, f: q ? PL.qval(q) : f }; }
  function fromNum(str) { var q = PL.parseNum(str); return q ? V(q) : V(null, parseFloat(str)); }
  function safeQ(fn, a, b) {
    if (!a.q || (b && !b.q)) return null;
    try { var r = fn(a.q, b && b.q); if (Math.abs(r.n) > 9e15 || r.d > 9e15) return null; return r; } catch (e) { return null; }
  }
  function op(sym, a, b) {
    if (sym === '+') { var q = safeQ(PL.qadd, a, b); return q ? V(q) : V(null, a.f + b.f); }
    if (sym === '-') { var q2 = safeQ(PL.qsub, a, b); return q2 ? V(q2) : V(null, a.f - b.f); }
    if (sym === '*') { var q3 = safeQ(PL.qmul, a, b); return q3 ? V(q3) : V(null, a.f * b.f); }
    if (sym === '/') { if (b.f === 0) throw new Error('Division by zero'); var q4 = safeQ(PL.qdiv, a, b); return q4 ? V(q4) : V(null, a.f / b.f); }
    if (sym === '^') {
      if (a.q && b.q && b.q.d === 1 && Math.abs(b.q.n) <= 64) {
        var r = PL.Q(1), base = b.q.n < 0 ? PL.qdiv(PL.Q(1), a.q) : a.q, ok = true;
        for (var i = 0; i < Math.abs(b.q.n); i++) { r = PL.qmul(r, base); if (Math.abs(r.n) > 9e15 || r.d > 9e15) { ok = false; break; } }
        if (ok) return V(r);
      }
      var f = Math.pow(a.f, b.f); if (isNaN(f)) throw new Error('Not a real number'); return V(null, f);
    }
    throw new Error('Unknown operator');
  }
  function tokenize(s) {
    s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/√/g, 'sqrt').replace(/\s+/g, '');
    var out = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/[0-9.]/.test(c)) { var j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; var num = s.slice(i, j); if ((num.match(/\./g) || []).length > 1) throw new Error('Bad number'); out.push({ t: 'n', v: num }); i = j; continue; }
      if (s.substr(i, 4) === 'sqrt') { out.push({ t: 'f', v: 'sqrt' }); i += 4; continue; }
      if ('+-*/^()%'.indexOf(c) >= 0) { out.push({ t: c }); i++; continue; }
      throw new Error('Unexpected “' + c + '”');
    }
    return out;
  }
  function parse(src) {
    var tk = tokenize(src), pos = 0;
    function peek() { return tk[pos]; }
    function eat(t) { if (!tk[pos] || tk[pos].t !== t) throw new Error('Expected ' + t); pos++; }
    function expr() { var v = term(); while (peek() && (peek().t === '+' || peek().t === '-')) { var o = tk[pos++].t; v = op(o, v, term()); } return v; }
    function startsPrimary(t) { return t && (t.t === 'n' || t.t === '(' || t.t === 'f'); }
    function term() {
      var v = unary();
      while (peek() && (peek().t === '*' || peek().t === '/' || startsPrimary(peek()))) {
        var o = (peek().t === '*' || peek().t === '/') ? tk[pos++].t : '*';
        v = op(o, v, unary());
      }
      return v;
    }
    function power() { var b = postfix(primary()); if (peek() && peek().t === '^') { pos++; return op('^', b, unary()); } return b; }
    function unary() { if (peek() && peek().t === '-') { pos++; var v = unary(); return op('*', V(PL.Q(-1)), v); } if (peek() && peek().t === '+') { pos++; return unary(); } return power(); }
    function postfix(v) { while (peek() && peek().t === '%') { pos++; v = op('/', v, V(PL.Q(100))); } return v; }
    function primary() {
      var t = peek(); if (!t) throw new Error('Incomplete expression');
      if (t.t === 'n') { pos++; return fromNum(t.v); }
      if (t.t === '(') { pos++; var v = expr(); eat(')'); return v; }
      if (t.t === 'f') { pos++; var a = primary(); if (a.f < 0) throw new Error('Not a real number'); var r = Math.sqrt(a.f), ri = Math.round(r); if (a.q && a.q.d === 1 && ri * ri === a.q.n) return V(PL.Q(ri)); if (a.q) { var rn = Math.round(Math.sqrt(a.q.n)), rd = Math.round(Math.sqrt(a.q.d)); if (rn * rn === a.q.n && rd * rd === a.q.d) return V(PL.Q(rn, rd)); } return V(null, r); }
      throw new Error('Unexpected “' + t.t + '”');
    }
    var res = expr();
    if (pos !== tk.length) throw new Error('Unexpected “' + tk[pos].t + '”');
    return res;
  }
  function fmt(v) {
    if (v.q) {
      if (v.q.d === 1) return String(v.q.n);
      var dd = v.q.d; while (dd % 2 === 0) dd /= 2; while (dd % 5 === 0) dd /= 5;
      var dec = v.q.n / v.q.d;
      if (dd === 1 && String(dec).length <= 12) return String(dec); // terminating decimal: show it exactly (7.5)
      return PL.qstr(v.q) + ' ≈ ' + (Math.round(dec * 1e8) / 1e8);
    }
    if (!isFinite(v.f)) return 'Error';
    return String(Math.round(v.f * 1e10) / 1e10);
  }
  PL.calc = { evaluate: function (s) { return fmt(parse(s)); }, parse: parse };

  /* ---- calculator state machine ----
     A freshly typed expression is evaluated with normal precedence (5 + 5 ÷ 2 = 7.5).
     After "=", the result becomes the accumulator: an operator key continues from it (5 + 5 = then ÷ 2 = gives 5),
     while a digit, decimal point, "(" or "√" starts a new expression. */
  function resultToken(r) { // exact value as an expression fragment; fractions and negatives are bracketed
    var v = r.split(' ≈')[0];
    return /^-?\d+$/.test(v) && v[0] !== '-' ? v : '(' + v + ')';
  }
  var OPS = { '+': 1, '−': 1, '×': 1, '÷': 1, '^': 1, '/': 1 };
  function newState() { return { expr: '', result: '', acc: null, justEval: false, err: false }; }
  function press(st, k) {
    if (k === 'AC') { st.expr = ''; st.result = ''; st.acc = null; st.justEval = false; return; }
    if (k === 'CE') { // clear the current entry: the trailing number (or the whole pending result)
      if (st.justEval) { st.expr = ''; st.result = ''; st.justEval = false; return; }
      var m = st.expr.match(/(\d*\.?\d*)$/); st.expr = st.expr.slice(0, st.expr.length - (m && m[1] ? m[1].length : 1)); return;
    }
    if (k === '⌫') { if (st.justEval) { st.justEval = false; st.result = ''; return; } st.expr = st.expr.slice(0, -1); return; }
    if (k === '=') {
      if (!st.expr) return;
      try { var r = PL.calc.evaluate(st.expr); st.result = r; st.acc = r; st.justEval = true; st.err = false; st.lastExpr = st.expr; return r; }
      catch (e) { st.result = e.message; st.err = true; st.justEval = false; return null; }
    }
    if (k === 'ans') { if (st.acc == null) return; if (st.justEval) { st.expr = ''; st.justEval = false; } st.expr += resultToken(st.acc); return; }
    if (st.justEval) {
      st.justEval = false;
      if (OPS[k]) st.expr = resultToken(st.acc); // continue from the result
      else st.expr = '';                          // start fresh
      st.result = '';
    }
    st.expr += k;
  }
  PL.calc.newState = newState; PL.calc.press = press;
  /* convenience for tests: run a sequence of keys and return the last displayed result */
  PL.calc.run = function (keys) { var st = newState(); keys.forEach(function (k) { press(st, k); }); return st; };

  /* ---- calculator UI (rendered inside the docked tool panel) ---- */
  var cs = null;
  PL.calcSheet = {
    isOpen: function () { return !!cs; },
    open: function (key) { PL.dock.open('calc', key); },
    close: function () { PL.dock.close(); },
    mount: function (container, key) {
      var saved = PL.model.scratch(key);
      cs = { key: key, el: container, st: Object.assign(newState(), saved.calcState || {}), hist: (saved.calc || []).slice(-12) };
      render();
    },
    unmount: function () { if (cs) persist(); cs = null; }
  };
  function persist() { var d = PL.model.scratch(cs.key); d.calc = cs.hist.slice(-20); d.calcState = { expr: cs.st.expr, result: cs.st.result, acc: cs.st.acc, justEval: cs.st.justEval }; PL.model.saveScratch(cs.key, d); }
  function render() {
    var c = cs, st = c.st; c.el.innerHTML = '';
    var shown = st.justEval ? (st.lastExpr || '') : st.expr;
    var disp = h('div', { class: 'calc-disp' },
      h('div', { class: 'calc-expr mono' + (st.justEval ? ' dim' : '') }, shown || '0'),
      h('div', { class: 'calc-res mono' + (st.err ? ' err' : '') }, st.result ? (st.err ? st.result : '= ' + st.result) : (st.acc != null ? 'Ans = ' + st.acc : '')));
    var keys = ['AC', 'CE', '⌫', '(', ')', '7', '8', '9', '÷', '√', '4', '5', '6', '×', '^', '1', '2', '3', '−', '/', '0', '.', 'ans', '+', '='];
    var labels = { '/': 'a/b', 'ans': 'Ans' };
    var pad = h('div', { class: 'calc-pad' }, keys.map(function (k) {
      return h('button', { class: 'ckey' + (k === '=' ? ' eq' : OPS[k] ? ' op' : /^(AC|CE|⌫)$/.test(k) ? ' fn' : ''), 'aria-label': k === '/' ? 'fraction bar' : k === 'CE' ? 'clear entry' : k === 'AC' ? 'clear all' : k === '⌫' ? 'delete' : k, onclick: function () {
        var r = press(st, k);
        if (k === '=' && r != null) { c.hist.push({ e: st.lastExpr, r: r }); }
        persist(); render();
      } }, labels[k] || k);
    }));
    c.el.appendChild(h('div', { class: 'sheet-body calc-body' }, disp, pad,
      c.hist.length ? h('div', { class: 'calc-hist' }, c.hist.slice().reverse().map(function (x) { return h('button', { class: 'linkbtn mono small', onclick: function () { st.expr = x.e; st.justEval = false; st.result = ''; persist(); render(); } }, x.e + ' = ' + x.r); })) : null,
      h('div', { class: 'muted small' }, 'After =, an operator continues from the answer; a number starts fresh. AC clears all, CE clears the current entry. Using the calculator never affects your score.')));
  }
})();

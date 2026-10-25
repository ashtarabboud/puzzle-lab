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
    if (v.q) { if (v.q.d === 1) return String(v.q.n); var dec = v.q.n / v.q.d; return PL.qstr(v.q) + ' ≈ ' + (Math.round(dec * 1e8) / 1e8); }
    if (!isFinite(v.f)) return 'Error';
    return String(Math.round(v.f * 1e10) / 1e10);
  }
  PL.calc = { evaluate: function (s) { return fmt(parse(s)); }, parse: parse };

  /* ---- calculator sheet ---- */
  var openC = null;
  PL.calcSheet = {
    isOpen: function () { return !!openC; },
    open: function (key) {
      if (openC) PL.calcSheet.close();
      var st = { key: key, expr: '', hist: (PL.model.scratch(key).calc || []).slice(-8), result: '' };
      openC = st;
      st.bg = h('div', { class: 'sheet-bg', onclick: PL.calcSheet.close });
      st.el = h('div', { class: 'sheet calc-sheet', role: 'dialog', 'aria-label': 'Calculator' });
      document.body.appendChild(st.bg); document.body.appendChild(st.el); document.body.classList.add('sheet-open');
      render();
    },
    close: function () { if (!openC) return; openC.el.remove(); openC.bg.remove(); openC = null; document.body.classList.remove('sheet-open'); }
  };
  function persist() { var d = PL.model.scratch(openC.key); d.calc = openC.hist.slice(-20); PL.model.saveScratch(openC.key, d); }
  function render() {
    var st = openC; st.el.innerHTML = '';
    var disp = h('div', { class: 'calc-disp' }, h('div', { class: 'calc-expr mono' }, st.expr || '0'), h('div', { class: 'calc-res mono' }, st.result));
    var press = function (k) {
      if (k === 'C') { st.expr = ''; st.result = ''; }
      else if (k === '⌫') st.expr = st.expr.slice(0, -1);
      else if (k === '=') {
        if (!st.expr) return;
        try { var r = PL.calc.evaluate(st.expr); st.result = '= ' + r; st.hist.push({ e: st.expr, r: r }); persist(); }
        catch (e) { st.result = e.message; }
      } else if (k === 'ans') { var last = st.hist[st.hist.length - 1]; if (last) st.expr += '(' + last.r.split(' ≈')[0] + ')'; }
      else st.expr += k;
      render();
    };
    var keys = ['C', '(', ')', '⌫', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '^', '+', '√', '/', 'ans', '='];
    var pad = h('div', { class: 'calc-pad' }, keys.map(function (k) {
      return h('button', { class: 'ckey' + (k === '=' ? ' eq' : /[÷×−+^\/]/.test(k) ? ' op' : ''), 'aria-label': k === '/' ? 'fraction bar' : k, onclick: function () { press(k); } }, k === '/' ? 'a/b' : k);
    }));
    st.el.appendChild(h('div', { class: 'sheet-head' }, h('div', { class: 'sheet-grab' }), h('div', { class: 'sheet-bar' }, h('b', null, 'Calculator'), h('button', { class: 'btn ghost sm', onclick: PL.calcSheet.close }, 'Done'))));
    st.el.appendChild(h('div', { class: 'sheet-body' }, disp, pad,
      st.hist.length ? h('div', { class: 'calc-hist' }, st.hist.slice().reverse().map(function (x) { return h('button', { class: 'linkbtn mono small', onclick: function () { st.expr = x.e; st.result = '= ' + x.r; render(); } }, x.e + ' = ' + x.r); })) : null,
      h('div', { class: 'muted small' }, 'Fractions stay exact (3/4 + 1/6 = 11/12). Using the calculator never affects your score.')));
  }
})();

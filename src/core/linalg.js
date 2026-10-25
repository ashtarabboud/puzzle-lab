/* ===== Exact linear algebra + Fourier–Motzkin entailment over rationals ===== */
(function () {
  var Q = PL.Q, add = PL.qadd, sub = PL.qsub, mul = PL.qmul, div = PL.qdiv;
  var Z = Q(0), ONE = Q(1);
  function isZ(a) { return a.n === 0; }
  PL.la = {};
  /* Row-reduce matrix of rationals (array of rows, each array of Q, last column = constant). Returns RREF + pivot columns */
  PL.la.rref = function (M, ncols) {
    var A = M.map(function (r) { return r.slice(); });
    var piv = [], row = 0;
    for (var c = 0; c < ncols && row < A.length; c++) {
      var p = -1;
      for (var r = row; r < A.length; r++) if (!isZ(A[r][c])) { p = r; break; }
      if (p < 0) continue;
      var t = A[p]; A[p] = A[row]; A[row] = t;
      var inv = div(ONE, A[row][c]);
      A[row] = A[row].map(function (x) { return mul(x, inv); });
      for (r = 0; r < A.length; r++) {
        if (r !== row && !isZ(A[r][c])) {
          var f = A[r][c];
          A[r] = A[r].map(function (x, j) { return sub(x, mul(f, A[row][j])); });
        }
      }
      piv.push(c); row++;
    }
    return { A: A, piv: piv };
  };
  /* Given equations rows [coef_0..coef_{n-1}, const] meaning sum coef_i x_i = const,
     decide whether linear form f (array of n Q) has a determined value. Returns Q value or null.
     Method: f is determined iff f lies in the row space of the coefficient matrix. */
  PL.la.determined = function (rows, n, f) {
    var R = PL.la.rref(rows, n);
    // consistency check: no row 0 = nonzero
    for (var i = 0; i < R.A.length; i++) {
      var allz = true; for (var j = 0; j < n; j++) if (!isZ(R.A[i][j])) { allz = false; break; }
      if (allz && !isZ(R.A[i][n])) return { inconsistent: true };
    }
    // reduce f by pivot rows
    var g = f.slice(), val = Z;
    R.piv.forEach(function (c, k) {
      if (!isZ(g[c])) {
        var coef = g[c];
        for (var j = 0; j < n; j++) g[j] = sub(g[j], mul(coef, R.A[k][j]));
        val = add(val, mul(coef, R.A[k][n]));
      }
    });
    for (var j2 = 0; j2 < n; j2++) if (!isZ(g[j2])) return null;
    return val;
  };
  /* Find coefficients lambda such that sum lambda_k * rows_k (coef part) = f. Returns array of Q or null */
  PL.la.combo = function (rows, n, f) {
    var m = rows.length;
    // unknowns lambda (m of them); equations: for each j<n: sum_k lambda_k rows[k][j] = f[j]
    var M = [];
    for (var j = 0; j < n; j++) {
      var r = []; for (var k = 0; k < m; k++) r.push(rows[k][j]); r.push(f[j]); M.push(r);
    }
    var R = PL.la.rref(M, m);
    for (var i = 0; i < R.A.length; i++) {
      var allz = true; for (var c = 0; c < m; c++) if (!isZ(R.A[i][c])) { allz = false; break; }
      if (allz && !isZ(R.A[i][m])) return null;
    }
    var lam = []; for (var k2 = 0; k2 < m; k2++) lam.push(Z);
    R.piv.forEach(function (c, idx) { lam[c] = R.A[idx][m]; });
    return lam;
  };

  /* Fourier–Motzkin feasibility for constraints {a:[Q..], op:'>'|'>='|'=', b:Q} meaning a·x op b. */
  function fmFeasible(cons, n) {
    // normalise '=' into two '>='
    var C = [];
    cons.forEach(function (c) {
      if (c.op === '=') {
        C.push({ a: c.a.slice(), b: c.b, s: false });
        C.push({ a: c.a.map(function (x) { return Q(-x.n, x.d); }), b: Q(-c.b.n, c.b.d), s: false });
      } else C.push({ a: c.a.slice(), b: c.b, s: c.op === '>' });
    });
    for (var v = 0; v < n; v++) {
      var pos = [], neg = [], zero = [];
      C.forEach(function (c) { if (c.a[v].n > 0) pos.push(c); else if (c.a[v].n < 0) neg.push(c); else zero.push(c); });
      var next = zero;
      // a·x >= b with a_v>0 gives lower bound; with a_v<0 gives upper bound. Combine each pair.
      for (var i = 0; i < pos.length; i++) for (var j = 0; j < neg.length; j++) {
        var p = pos[i], q = neg[j];
        var fp = div(ONE, p.a[v]), fq = div(ONE, Q(-q.a[v].n, q.a[v].d));
        var a = p.a.map(function (x, k) { return add(mul(x, fp), mul(q.a[k], fq)); });
        a[v] = Z;
        next.push({ a: a, b: add(mul(p.b, fp), mul(q.b, fq)), s: p.s || q.s });
      }
      // de-duplicate to limit growth
      var seen = {}; C = [];
      next.forEach(function (c) { var key = c.a.map(PL.qstr).join(',') + '|' + PL.qstr(c.b) + c.s; if (!seen[key]) { seen[key] = 1; C.push(c); } });
      if (C.length > 4000) return true; // give up conservatively (treat as feasible → not entailed)
    }
    // all coefficients zero: need 0 >= b (or 0 > b if strict)
    for (var t = 0; t < C.length; t++) {
      var bv = PL.qval(C[t].b);
      if (C[t].s ? !(0 > bv) : !(0 >= bv)) return false;
    }
    return true;
  }
  PL.la.feasible = fmFeasible;
  /* Does the system (with all variables > 0) entail f·x op 0 ? op in '>','<','=' */
  PL.la.entails = function (cons, n, f, op) {
    var base = cons.slice();
    for (var i = 0; i < n; i++) { var a = []; for (var j = 0; j < n; j++) a.push(j === i ? ONE : Z); base.push({ a: a, op: '>', b: Z }); }
    var neg = function (x) { return Q(-x.n, x.d); };
    if (op === '>') return !fmFeasible(base.concat([{ a: f.map(neg), op: '>=', b: Z }]), n); // f<=0 infeasible
    if (op === '<') return !fmFeasible(base.concat([{ a: f, op: '>=', b: Z }]), n);
    if (op === '=') return !fmFeasible(base.concat([{ a: f, op: '>', b: Z }]), n) && !fmFeasible(base.concat([{ a: f.map(neg), op: '>', b: Z }]), n);
    return false;
  };
  PL.la.consistent = function (cons, n) {
    var base = cons.slice();
    for (var i = 0; i < n; i++) { var a = []; for (var j = 0; j < n; j++) a.push(j === i ? ONE : Z); base.push({ a: a, op: '>', b: Z }); }
    return fmFeasible(base, n);
  };
})();

/* ===== Shared letter-grid tracing (Word Rush, Word Trails) =====
   Drag a finger across adjacent letters (including diagonals) to build a word, or tap letters one by one and press
   Enter. Each cell can be used once per word. Hit areas are circles a little smaller than the cell, so diagonal moves
   do not accidentally pick up neighbouring cells. */
(function () {
  var h = PL.h;
  function adj(a, b, cols) { var ra = Math.floor(a / cols), ca = a % cols, rb = Math.floor(b / cols), cb = b % cols; return a !== b && Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1; }
  /* opts: rows, cols, letters (array of strings, may be 'QU'), cellClass(i) -> string, onSubmit(path) -> void, disabled,
           lines: array of {path, cls} drawn as connectors (found words) */
  function traceGrid(opts) {
    var path = [], cells = [];
    var wrap = h('div', { class: 'tr-wrap' });
    var word = h('div', { class: 'tr-word mono', 'aria-live': 'polite' }, ' ');
    var grid = h('div', { class: 'tr-grid', style: { 'grid-template-columns': 'repeat(' + opts.cols + ', 1fr)' } });
    var svg = PL.svg('svg', { class: 'tr-lines', 'aria-hidden': 'true' });
    opts.letters.forEach(function (L, i) {
      var c = h('div', { class: 'tr-cell ' + (opts.cellClass ? opts.cellClass(i) : ''), 'data-i': i, role: 'button', 'aria-label': L + ' row ' + (Math.floor(i / opts.cols) + 1) + ' column ' + (i % opts.cols + 1) }, h('span', null, L.length > 1 ? L[0] + L.slice(1).toLowerCase() : L));
      cells.push(c); grid.appendChild(c);
    });
    wrap.appendChild(grid); wrap.appendChild(svg);
    function centre(i) { var g = grid.getBoundingClientRect(), b = cells[i].getBoundingClientRect(); return [b.left - g.left + b.width / 2, b.top - g.top + b.height / 2]; }
    function drawLines() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var g = grid.getBoundingClientRect(); svg.setAttribute('viewBox', '0 0 ' + g.width + ' ' + g.height); svg.style.width = g.width + 'px'; svg.style.height = g.height + 'px';
      (opts.lines || []).concat(path.length > 1 ? [{ path: path, cls: 'cur' }] : []).forEach(function (ln) {
        if (ln.path.length < 2) return;
        var pts = ln.path.map(function (i) { return centre(i).map(function (v) { return v.toFixed(1); }).join(','); }).join(' ');
        svg.appendChild(PL.svg('polyline', { points: pts, class: 'tr-line ' + (ln.cls || '') }));
      });
    }
    function refresh() {
      cells.forEach(function (c, i) { c.classList.toggle('on', path.indexOf(i) >= 0); c.classList.toggle('last', path[path.length - 1] === i); });
      word.textContent = path.length ? path.map(function (i) { return opts.letters[i]; }).join('') : ' ';
      drawLines();
    }
    function hit(x, y) {
      for (var i = 0; i < cells.length; i++) {
        var b = cells[i].getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        if (Math.hypot(x - cx, y - cy) <= b.width * 0.42) return i;
      }
      return -1;
    }
    function extend(i) {
      if (i < 0) return;
      var n = path.length;
      if (n >= 2 && path[n - 2] === i) { path.pop(); refresh(); return; } // slide back to undo the last letter
      if (path.indexOf(i) >= 0) return;
      if (n && !adj(path[n - 1], i, opts.cols)) return;
      path.push(i); refresh();
    }
    function submit() { if (!path.length) return; var p = path.slice(); path = []; refresh(); opts.onSubmit(p); }
    var dragging = false, moved = false, startCell = -1;
    grid.addEventListener('pointerdown', function (e) {
      if (opts.disabled) return;
      e.preventDefault();
      try { grid.setPointerCapture(e.pointerId); } catch (x) { }
      var i = hit(e.clientX, e.clientY); dragging = true; moved = false; startCell = i;
      if (i < 0) return;
      if (path.length && path[path.length - 1] === i) return; // tapping the last letter again submits on release
      if (path.length && !adj(path[path.length - 1], i, opts.cols)) path = [];
      extend(i);
    });
    grid.addEventListener('pointermove', function (e) {
      if (!dragging) return; e.preventDefault();
      var i = hit(e.clientX, e.clientY);
      if (i >= 0 && i !== path[path.length - 1]) { moved = true; extend(i); }
    });
    function up(e) {
      if (!dragging) return; dragging = false;
      if (moved && path.length >= 2) submit();                       // traced a word in one stroke
      else if (!moved && startCell >= 0 && path.length > 1 && path[path.length - 1] === startCell && wrap.dataset.lastTap === String(startCell)) submit(); // double-tap last letter
      wrap.dataset.lastTap = String(startCell);
    }
    grid.addEventListener('pointerup', up); grid.addEventListener('pointercancel', up);
    var controls = h('div', { class: 'row-actions tr-controls' },
      h('button', { class: 'btn ghost sm', onclick: function () { path = []; refresh(); } }, 'Clear'),
      h('button', { class: 'btn sm primary', onclick: submit }, 'Enter'));
    setTimeout(drawLines, 0);
    window.addEventListener('resize', drawLines);
    return { el: h('div', { class: 'trace' }, word, wrap, opts.disabled ? null : controls), submit: submit, select: function (p) { path = p.slice(); refresh(); } };
  }
  PL.trace = { grid: traceGrid, adj: adj };
})();

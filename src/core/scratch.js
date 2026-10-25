/* ===== Universal scratchpad: draw / text / grid ===== */
(function () {
  var h = PL.h;
  var openState = null;
  /* The scratchpad renders into the docked tool panel (see dock.js); the puzzle stays visible above it. */
  PL.scratch = {
    isOpen: function () { return !!openState; },
    open: function (key) { PL.dock.open('scratch', key); },
    close: function () { PL.dock.close(); },
    mount: function (container, key) {
      if (openState) PL.scratch.unmount();
      var data = PL.model.scratch(key);
      openState = { key: key, data: data, tab: data.lastTab || 'draw', tool: 'pen', redo: [], el: container };
      render();
    },
    unmount: function () { if (!openState) return; save(true); openState = null; },
    refresh: function () { if (openState && openState.tab === 'draw') render(); }
  };
  var saveT = null;
  function save(now) {
    if (!openState) return;
    var st = openState;
    st.data.lastTab = st.tab;
    clearTimeout(saveT);
    var doIt = function () { PL.model.saveScratch(st.key, st.data); };
    if (now) doIt(); else saveT = setTimeout(doIt, 600);
  }
  function render() {
    var st = openState, el = st.el;
    el.innerHTML = '';
    var tabs = h('div', { class: 'seg sheet-tabs' }, [['draw', 'Draw'], ['text', 'Text'], ['grid', 'Grid']].map(function (t) {
      return h('button', { class: 'segb' + (st.tab === t[0] ? ' on' : ''), onclick: function () { st.tab = t[0]; save(); render(); } }, t[1]);
    }));
    el.appendChild(h('div', { class: 'dock-subbar' }, tabs));
    var body = h('div', { class: 'sheet-body' });
    el.appendChild(body);
    if (st.tab === 'draw') drawTab(body, st);
    else if (st.tab === 'text') textTab(body, st);
    else gridTab(body, st);

  }
  function textTab(body, st) {
    var ta = h('textarea', { id: 'scr-text', class: 'txt area scr-text', placeholder: 'Notes, calculations, hypotheses…', spellcheck: 'false' }, st.data.text || '');
    ta.addEventListener('input', function () { st.data.text = ta.value; save(); });
    body.appendChild(ta);
    body.appendChild(h('div', { class: 'row-actions' }, h('button', { class: 'btn ghost sm', onclick: function () { if (confirmInline(this)) { st.data.text = ''; save(); render(); } } }, 'Clear text')));
  }
  function confirmInline(btn) {
    if (btn.dataset.armed) return true;
    btn.dataset.armed = '1'; var t = btn.textContent; btn.textContent = 'Tap again to confirm';
    setTimeout(function () { if (btn.isConnected) { btn.textContent = t; delete btn.dataset.armed; } }, 2500);
    return false;
  }
  function gridTab(body, st) {
    if (!st.data.grid) st.data.grid = { r: 4, c: 4, cells: {}, heads: {} };
    var g = st.data.grid;
    var sizeSel = function (k, lab) {
      return h('label', { class: 'small' }, lab + ' ', h('select', { class: 'sel', onchange: function () { g[k] = +this.value; save(); render(); } }, [2, 3, 4, 5, 6, 7].map(function (n) { var o = h('option', { value: n }, String(n)); if (g[k] === n) o.selected = true; return o; })));
    };
    body.appendChild(h('div', { class: 'row-actions' }, sizeSel('r', 'Rows'), sizeSel('c', 'Columns'),
      h('button', { class: 'btn ghost sm', onclick: function () { if (confirmInline(this)) { g.cells = {}; save(); render(); } } }, 'Clear marks')));
    var tbl = h('table', { class: 'gtable scr-grid' });
    var head = h('tr', null, h('th', null, ''));
    for (var c = 0; c < g.c; c++) (function (c) {
      var inp = h('input', { class: 'hin', value: g.heads['c' + c] || '', placeholder: String.fromCharCode(65 + c), 'aria-label': 'Column ' + (c + 1) + ' label' });
      inp.addEventListener('input', function () { g.heads['c' + c] = inp.value; save(); });
      head.appendChild(h('th', null, inp));
    })(c);
    tbl.appendChild(head);
    for (var r = 0; r < g.r; r++) (function (r) {
      var inp = h('input', { class: 'hin', value: g.heads['r' + r] || '', placeholder: String(r + 1), 'aria-label': 'Row ' + (r + 1) + ' label' });
      inp.addEventListener('input', function () { g.heads['r' + r] = inp.value; save(); });
      var tr = h('tr', null, h('th', null, inp));
      for (var c2 = 0; c2 < g.c; c2++) (function (c2) {
        var k = r + ',' + c2, v = g.cells[k] || 0;
        tr.appendChild(h('td', { class: 'gcell' + (v === 2 ? ' yes' : v === 1 ? ' no' : ''), onclick: function () { g.cells[k] = ((g.cells[k] || 0) + 1) % 3; save(); render(); } }, v === 2 ? '●' : v === 1 ? '×' : ''));
      })(c2);
      tbl.appendChild(tr);
    })(r);
    body.appendChild(h('div', { class: 'scrollx' }, tbl));
    body.appendChild(h('div', { class: 'muted small' }, 'Type labels in the headers. Tap a cell: blank → × → ●.'));
  }
  function drawTab(body, st) {
    var wrap = h('div', { class: 'canvas-wrap' });
    var cv = h('canvas', { class: 'scr-canvas', 'aria-label': 'Drawing area' });
    wrap.appendChild(cv);
    var tools = h('div', { class: 'row-actions scr-tools' },
      h('div', { class: 'seg' }, [['pen', 'Pen'], ['arrow', 'Arrow'], ['erase', 'Eraser']].map(function (t) {
        return h('button', { class: 'segb' + (st.tool === t[0] ? ' on' : ''), onclick: function () { st.tool = t[0]; render(); } }, t[1]);
      })),
      h('button', { class: 'btn ghost sm', disabled: !st.data.draw.length, onclick: function () { st.redo.push(st.data.draw.pop()); save(); render(); } }, 'Undo'),
      h('button', { class: 'btn ghost sm', disabled: !st.redo.length, onclick: function () { st.data.draw.push(st.redo.pop()); save(); render(); } }, 'Redo'),
      h('button', { class: 'btn ghost sm', disabled: !st.data.draw.length, onclick: function () { if (confirmInline(this)) { st.redo = []; st.data.draw = []; save(); render(); } } }, 'Clear'));
    body.appendChild(tools); body.appendChild(wrap);
    requestAnimationFrame(function () { setupCanvas(cv, wrap, st); });
  }
  function ink() { return getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#222'; }
  function setupCanvas(cv, wrap, st) {
    var dpr = window.devicePixelRatio || 1;
    var W = wrap.clientWidth, H = wrap.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    // strokes stored in normalised coordinates of a 1000-wide virtual canvas so they survive size changes
    var scale = W / 1000;
    function drawStroke(s) {
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (s.t === 'erase') { ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 22 * scale + 6; }
      else { ctx.strokeStyle = ink(); ctx.lineWidth = 2.4; }
      var pts = s.p;
      if (s.t === 'arrow') {
        var x1 = pts[0] * scale, y1 = pts[1] * scale, x2 = pts[2] * scale, y2 = pts[3] * scale;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        var a = Math.atan2(y2 - y1, x2 - x1), L = 12;
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45));
        ctx.moveTo(x2, y2); ctx.lineTo(x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(pts[0] * scale, pts[1] * scale);
        for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] * scale, pts[i + 1] * scale);
        if (pts.length === 2) ctx.lineTo(pts[0] * scale + 0.1, pts[1] * scale + 0.1);
        ctx.stroke();
      }
      ctx.restore();
    }
    function redraw() { ctx.clearRect(0, 0, W, H); st.data.draw.forEach(drawStroke); }
    redraw();
    var cur = null;
    function pt(e) { var r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / scale * 10) / 10, Math.round((e.clientY - r.top) / scale * 10) / 10]; }
    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { }
      var p = pt(e);
      cur = { t: st.tool === 'erase' ? 'erase' : st.tool === 'arrow' ? 'arrow' : 'pen', p: st.tool === 'arrow' ? [p[0], p[1], p[0], p[1]] : [p[0], p[1]] };
    });
    cv.addEventListener('pointermove', function (e) {
      if (!cur) return; e.preventDefault();
      var p = pt(e);
      if (cur.t === 'arrow') { cur.p[2] = p[0]; cur.p[3] = p[1]; redraw(); drawStroke(cur); return; }
      var n = cur.p.length; if (Math.hypot(p[0] - cur.p[n - 2], p[1] - cur.p[n - 1]) < 2.5) return;
      cur.p.push(p[0], p[1]);
      ctx.save(); redrawPartial(cur); ctx.restore();
    });
    function redrawPartial(s) { // draw only the last segment for responsiveness
      var n = s.p.length; if (n < 4) return;
      var seg = { t: s.t, p: [s.p[n - 4], s.p[n - 3], s.p[n - 2], s.p[n - 1]] }; drawStroke(seg);
    }
    function end() {
      if (!cur) return;
      if (cur.t !== 'arrow' || Math.hypot(cur.p[2] - cur.p[0], cur.p[3] - cur.p[1]) > 4) { st.data.draw.push(cur); st.redo = []; }
      cur = null; redraw(); save();
      var tools = openState && openState.el.querySelector('.scr-tools');
      if (tools) { var b = tools.querySelectorAll('button'); b[3].disabled = !st.data.draw.length; b[5].disabled = !st.data.draw.length; }
    }
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
})();

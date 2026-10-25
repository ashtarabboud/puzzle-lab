/* ===== Docked tool panel =====
   The scratchpad and calculator open in a panel docked to the bottom of the screen. The puzzle stays visible and
   usable above it: the page gets bottom padding equal to the panel height, so the question scrolls independently.
   The panel can be resized (compact / half / tall), switches between tools without closing, and follows the iPhone
   keyboard via visualViewport so typed notes are never covered. */
(function () {
  var h = PL.h;
  var D = null;
  var SIZES = { compact: 0.34, half: 0.5, tall: 0.7 };
  function vv() { return window.visualViewport; }
  function layout() {
    if (!D) return;
    var vh = window.innerHeight, kb = 0;
    if (vv()) kb = Math.max(0, vh - vv().height - vv().offsetTop);
    var avail = vh - kb;
    var hgt = Math.round(Math.min(avail - 120, Math.max(220, vh * SIZES[D.size])));
    if (kb > 0) hgt = Math.min(hgt, Math.max(180, avail - 140)); // keep some of the question visible above the keyboard
    D.el.style.height = hgt + 'px';
    D.el.style.bottom = kb + 'px';
    document.documentElement.style.setProperty('--dock-h', (hgt + kb) + 'px');
  }
  function mountTool() {
    if (D.mounted === 'scratch') PL.scratch.unmount();
    if (D.mounted === 'calc') PL.calcSheet.unmount();
    D.body.innerHTML = '';
    if (D.tool === 'scratch') PL.scratch.mount(D.body, D.key);
    else PL.calcSheet.mount(D.body, D.key);
    D.mounted = D.tool;
  }
  function renderHead() {
    D.head.innerHTML = '';
    var tabs = h('div', { class: 'seg' }, [['scratch', 'Scratchpad'], ['calc', 'Calculator']].filter(function (t) { return t[0] !== 'calc' || D.math; }).map(function (t) {
      return h('button', { class: 'segb' + (D.tool === t[0] ? ' on' : ''), onclick: function () { if (D.tool === t[0]) return; D.tool = t[0]; renderHead(); mountTool(); } }, t[1]);
    }));
    var next = D.size === 'compact' ? 'half' : D.size === 'half' ? 'tall' : 'compact';
    D.head.appendChild(h('div', { class: 'dock-bar' },
      h('div', { class: 'dock-grab', role: 'button', 'aria-label': 'Resize panel', onclick: function () { D.size = next; save(); layout(); renderHead(); if (D.tool === 'scratch') PL.scratch.refresh(); } }),
      tabs,
      h('button', { class: 'btn ghost sm', 'aria-label': D.size === 'tall' ? 'Make panel smaller' : 'Make panel larger', onclick: function () { D.size = next; save(); layout(); renderHead(); if (D.tool === 'scratch') PL.scratch.refresh(); } }, D.size === 'tall' ? 'Smaller' : 'Larger'),
      h('button', { class: 'btn ghost sm', onclick: PL.dock.close }, 'Close')));
  }
  function save() { try { localStorage.setItem('puzzlelab.dock', D.size); } catch (e) { } }
  function savedSize() { try { return localStorage.getItem('puzzlelab.dock') || 'half'; } catch (e) { return 'half'; } }
  PL.dock = {
    isOpen: function () { return !!D; },
    open: function (tool, key, opts) {
      if (D && D.key === key) { if (D.tool !== tool) { D.tool = tool; renderHead(); mountTool(); } return; }
      if (D) PL.dock.close();
      D = { tool: tool, key: key, math: !!(opts && opts.math), size: SIZES[savedSize()] ? savedSize() : 'half' };
      if (tool === 'calc') D.math = true;
      D.head = h('div', { class: 'dock-head' });
      D.body = h('div', { class: 'dock-body' });
      D.el = h('section', { class: 'dock', role: 'region', 'aria-label': 'Tools' }, D.head, D.body);
      document.body.appendChild(D.el);
      document.body.classList.add('dock-open');
      renderHead(); layout(); mountTool();
      // bring the question into view above the panel
      var target = document.querySelector('.play .gamebody') || document.querySelector('.play');
      if (target) { var top = target.getBoundingClientRect().top + window.scrollY - 70; if (window.scrollY > top) window.scrollTo(0, Math.max(0, top)); }
    },
    setMath: function (m) { if (D) { D.math = !!m; renderHead(); } },
    close: function () {
      if (!D) return;
      if (D.mounted === 'scratch') PL.scratch.unmount();
      if (D.mounted === 'calc') PL.calcSheet.unmount();
      D.el.remove(); D = null;
      document.body.classList.remove('dock-open');
      document.documentElement.style.setProperty('--dock-h', '0px');
    }
  };
  if (window.visualViewport) { vv().addEventListener('resize', layout); vv().addEventListener('scroll', layout); }
  window.addEventListener && window.addEventListener('resize', layout);
})();

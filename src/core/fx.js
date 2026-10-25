/* ===== Small rewards: haptics, a brief celebration, counting scores, one-shot animations =====
   Everything here is short (under a second), never blocks input, and does nothing visual when the person has asked
   the system for reduced motion. Haptics: navigator.vibrate where it exists; on iPhone (Safari 18+) a hidden switch
   control is toggled, which the system answers with a light tap. Haptics can be turned off in Settings. */
(function () {
  var h = PL.h;
  function reduced() { try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function hapticsOn() { try { return !PL.model || PL.model.settings().haptics !== false; } catch (e) { return true; } }
  var sw = null;
  function haptic(kind) {
    if (!hapticsOn()) return;
    try {
      if (navigator.vibrate) { navigator.vibrate(kind === 'success' ? [12, 60, 18] : kind === 'error' ? [30] : 8); return; }
      if (!sw) {
        sw = h('label', { 'aria-hidden': 'true', style: 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none' }, h('input', { type: 'checkbox', switch: '', tabindex: '-1' }));
        document.body.appendChild(sw);
      }
      sw.click();
      if (kind === 'success') setTimeout(function () { try { sw.click(); } catch (e) { } }, 90);
    } catch (e) { }
  }
  /* A light burst of a few dozen dots from a point (default: top centre of the element). ~0.9 s. */
  function celebrate(el, strength) {
    if (reduced() || !el || !el.getBoundingClientRect) return;
    var b = el.getBoundingClientRect(), n = strength === 'big' ? 34 : 20;
    var layer = h('div', { class: 'fx-layer', 'aria-hidden': 'true' });
    var colors = ['var(--accent)', 'var(--good)', 'var(--marker)', 'var(--g1)', 'var(--g4)', 'var(--g7)'];
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + Math.random() * 0.5, d = 60 + Math.random() * (strength === 'big' ? 120 : 80);
      var dot = h('span', { class: 'fx-dot' + (i % 3 === 0 ? ' sq' : '') });
      dot.style.left = (b.left + b.width / 2) + 'px'; dot.style.top = (b.top + 34) + 'px';
      dot.style.background = colors[i % colors.length];
      dot.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px'); dot.style.setProperty('--dy', Math.round(Math.sin(a) * d * 0.7 - 30) + 'px');
      dot.style.animationDelay = Math.round(Math.random() * 80) + 'ms';
      layer.appendChild(dot);
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 1200);
  }
  /* Count a number up to its value (about half a second); the final value is written immediately for screen readers. */
  function count(el, to) {
    if (!el) return; el.textContent = String(to);
    if (reduced() || !(to > 0)) return;
    el.setAttribute('aria-label', String(to));
    var t0 = null, dur = Math.min(650, 250 + to * 4);
    function step(t) {
      if (t0 == null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  /* Returns true the first time it is asked about `key`, so a re-render doesn't replay an animation. */
  var seen = {};
  function once(key) { if (seen[key]) return false; seen[key] = 1; return true; }
  PL.fx = { haptic: haptic, celebrate: celebrate, count: count, once: once, reduced: reduced, good: function () { haptic('light'); } };
})();

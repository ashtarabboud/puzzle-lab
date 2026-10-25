/* ===== Five-question sessions =====
   Wraps a single-question engine (Algebra Arcade, Balance, Word Links) so a standard game is a session of five
   questions. One session = one attempt record, so adaptive difficulty updates once per completed session; every
   question's own result (accuracy, attempts, hints, level, active time, quality) is kept inside metrics.questions.
   Puzzles without `qs` (daily puzzles and pre-v3 history) are passed straight to the original engine. */
(function () {
  var h = PL.h;
  var N = 5;
  var OFFSETS = [0, 0, 1, -1, 0]; // gentle variation within a session, never more than one level away

  function wrap(id) {
    var base = PL.games[id];
    if (!base || base.multi) return;
    var W = Object.assign({}, base);
    W.multi = N; W.base = base;

    W.generate = function (level, rng, ctx) {
      if (ctx && ctx.daily) return base.generate(level, rng, ctx);
      var qs = [], levels = [], fps = {}, recent = ((ctx && ctx.recent) || []).slice();
      var offs = rng.shuffle(OFFSETS);
      for (var i = 0; i < N; i++) {
        var lv = PL.clamp(level + offs[i], 1, 10), p = null;
        for (var t = 0; t < 12; t++) {
          var cand = base.generate(lv, rng, Object.assign({}, ctx, { recent: recent }));
          var fp = PL.hash(JSON.stringify(cand)), key = cand.tkey || cand.text || null;
          if (fps[fp] || (key && fps['k:' + key] && t < 8)) continue;
          fps[fp] = 1; if (key) fps['k:' + key] = 1; p = cand; break;
        }
        if (!p) throw new Error('Could not build five distinct questions');
        if (p.tkey) recent.push(p.tkey);
        qs.push(p); levels.push(lv);
      }
      return { qs: qs, levels: levels, format: 'session5', v: 1 };
    };
    function qInit(p, i, api) { return { gs: base.init(p.qs[i]), hints: 0, wrong: 0, ms: 0, start: api ? api.activeMs() : 0, outcome: null }; }
    W.init = function (p) {
      if (!p.qs) return base.init(p);
      return { i: 0, q: [{ gs: base.init(p.qs[0]), hints: 0, wrong: 0, ms: 0, start: 0, outcome: null }], showResult: false };
    };
    function current(gs) { return gs.q[gs.i]; }
    function endQuestion(p, gs, api, outcome) {
      var q = current(gs);
      if (q.outcome) return;
      q.outcome = outcome; q.ms = Math.max(0, api.activeMs() - (q.start || 0));
      gs.showResult = true;
    }
    function advance(p, gs, api) {
      gs.showResult = false;
      if (gs.i >= N - 1) return;
      gs.i++;
      gs.q[gs.i] = qInit(p, gs.i, api);
    }
    function sessionDone(gs) { return gs.q.length === N && gs.q.every(function (q) { return q.outcome; }); }

    W.view = function (api) {
      var p = api.p, gs = api.gs;
      if (!p.qs) return base.view(api);
      if (gs.q[gs.i] && gs.q[gs.i].start == null) gs.q[gs.i].start = api.activeMs();
      var q = current(gs), qp = p.qs[gs.i];
      var sub = {
        p: qp, gs: q.gs, level: p.levels[gs.i], daily: false, done: api.done || !!q.outcome,
        activeMs: api.activeMs,
        update: function (g) { q.gs = g; api.update(gs); },
        save: function (g) { q.gs = g; api.save(gs); },
        wrong: function (n) { q.wrong += (n || 1); api.wrong(n); },
        toast: api.toast,
        finish: function (outcome) {
          endQuestion(p, gs, api, outcome);
          if (sessionDone(gs)) { gs.showResult = false; api.update(gs); api.finish('solved'); }
          else api.update(gs);
        }
      };
      var dots = h('div', { class: 'q-dots', 'aria-hidden': 'true' }, p.qs.map(function (_, k) {
        var qq = gs.q[k];
        return h('span', { class: 'q-dot' + (k === gs.i ? ' cur' : '') + (qq && qq.outcome === 'solved' ? ' ok' : qq && qq.outcome ? ' bad' : '') });
      }));
      var head = h('div', { class: 'q-head' }, h('span', { class: 'lbl' }, 'Question ' + (gs.i + 1) + ' of ' + N), dots);
      var resultBar = null;
      if (gs.showResult && q.outcome && !api.done) {
        var ok = q.outcome === 'solved';
        var ev = base.evaluate(qp, q.gs, { outcome: q.outcome, hints: q.hints, wrong: q.wrong });
        resultBar = h('div', { class: 'q-result ' + (ok ? 'ok' : 'bad'), role: 'status' },
          h('div', null, h('b', null, ok ? (q.wrong || q.hints ? 'Correct' : 'Correct, first try') : 'Not solved'), h('span', { class: 'muted small' }, ' · ' + ev.quality + ' points · ' + PL.fmtTime(q.ms))),
          h('button', { class: 'btn primary', onclick: function () { advance(p, gs, api); api.update(gs); window.scrollTo(0, 0); } }, gs.i === N - 1 ? 'See results' : 'Next question'));
      }
      var body;
      try { body = base.view(sub); } catch (e) { body = h('div', { class: 'notice bad' }, e.message); }
      var parts = [head, resultBar, body];
      if (gs.showResult && q.outcome) parts.push(h('details', { class: 'card q-review' }, h('summary', null, 'Show the solution'), base.review(qp, q.gs)));
      return h('div', { class: 'session' }, parts);
    };
    W.hint = function (p, gs) {
      if (!p.qs) return base.hint(p, gs);
      var q = current(gs);
      if (q.outcome) return { msg: 'This question is finished. Tap Next question to continue.', noCount: true };
      var r = base.hint(p.qs[gs.i], q.gs) || { msg: 'No hint available.', noCount: true };
      if (r.gs) q.gs = r.gs;
      if (!r.noCount) q.hints++;
      return { msg: r.msg, gs: gs, noCount: r.noCount };
    };
    W.giveUp = function (p, gs, api) { // give up on the current question only; the session continues
      if (!p.qs) return false;
      var q = current(gs); if (q.outcome) return true;
      endQuestion(p, gs, api, 'failed');
      if (sessionDone(gs)) { gs.showResult = false; api.finish('solved'); }
      return true;
    };
    W.giveUpLabel = function (p) { return p.qs ? 'Give up on this question' : null; };
    W.evaluate = function (p, gs, ctx) {
      if (!p.qs) return base.evaluate(p, gs, ctx);
      var questions = p.qs.map(function (qp, k) {
        var q = gs.q[k];
        if (!q || !q.outcome) return { level: p.levels[k], outcome: 'unanswered', quality: 0, hints: q ? q.hints : 0, wrong: q ? q.wrong : 0, ms: q ? q.ms : 0 };
        var ev = base.evaluate(qp, q.gs, { outcome: q.outcome, hints: q.hints, wrong: q.wrong });
        return { level: p.levels[k], outcome: q.outcome, quality: ev.quality, hints: q.hints, wrong: q.wrong, ms: q.ms, metrics: ev.metrics };
      });
      var quality = Math.round(PL.mean(questions.map(function (x) { return x.quality; })));
      var correct = questions.filter(function (x) { return x.outcome === 'solved'; }).length;
      var answered = questions.filter(function (x) { return x.outcome !== 'unanswered'; }).length;
      var complete = answered === N;
      return {
        quality: quality,
        title: complete ? correct + ' of ' + N + ' correct' : 'Session ended early',
        complete: complete,
        metrics: { session: true, format: 'session5', correct: correct, answered: answered, complete: complete, questions: questions },
        lines: [['Questions correct', correct + ' / ' + N], ['Session score', quality + ' / 100']].concat(questions.map(function (x, k) {
          return ['Q' + (k + 1) + ' · level ' + x.level, x.outcome === 'solved' ? '✓ ' + x.quality + (x.hints ? ' · ' + PL.plural(x.hints, 'hint') : '') + (x.wrong ? ' · ' + x.wrong + ' wrong' : '') : x.outcome === 'failed' ? '✗ given up' : '—'];
        }))
      };
    };
    W.review = function (p, gs) {
      if (!p.qs) return base.review(p, gs);
      return h('div', { class: 'review' }, p.qs.map(function (qp, k) {
        var q = gs.q[k];
        return h('details', { class: 'card', open: k === 0 }, h('summary', null, 'Question ' + (k + 1) + ' · ' + (q && q.outcome === 'solved' ? 'correct' : q && q.outcome ? 'not solved' : 'not reached')),
          base.review(qp, q ? q.gs : base.init(qp)));
      }));
    };
    W.stats = function (atts) {
      // flatten sessions into question-level records so the game's own statistics include every question
      var flat = [], sessions = [];
      atts.forEach(function (a) {
        if (a.metrics && a.metrics.session) {
          sessions.push(a);
          a.metrics.questions.forEach(function (q) { if (q.outcome !== 'unanswered') flat.push({ outcome: q.outcome, quality: q.quality, perf: q.quality, hints: q.hints, wrong: q.wrong, level: q.level, activeMs: q.ms, metrics: q.metrics || {} }); });
        } else flat.push(a);
      });
      var rows = [];
      if (sessions.length) {
        var comp = sessions.filter(function (a) { return a.metrics.complete; });
        rows.push(['Five-question games', comp.length + ' completed' + (sessions.length > comp.length ? ' (' + (sessions.length - comp.length) + ' ended early)' : '')]);
        if (comp.length) {
          rows.push(['Average correct per game', PL.mean(comp.map(function (a) { return a.metrics.correct; })).toFixed(1) + ' / 5']);
          rows.push(['Best game score', Math.max.apply(null, comp.map(function (a) { return a.quality; }))]);
          rows.push(['Perfect games (5/5, no hints)', comp.filter(function (a) { return a.metrics.correct === 5 && !a.hints; }).length]);
        }
        rows.push(['Questions answered', flat.length]);
      }
      return rows.concat(base.stats(flat));
    };
    W.timeLimit = function (lv) { return base.timeLimit(lv) * N; };
    PL.games[id] = W;
  }
  ['algebra', 'balance', 'links'].forEach(wrap);
})();

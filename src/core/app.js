/* ===== App shell: navigation, play sessions, timers, summaries, daily quiz, stats, data ===== */
(function () {
  var h = PL.h, M = PL.model;
  var root, screen = { name: 'home' }, cur = null, toastT = null;
  var ICONS = {
    password: 'M4 7h16M4 12h10M4 17h7M17 15l3 3-3 3',
    island: 'M3 18c3-2 6-2 9 0s6 2 9 0M8 15c0-4 2-7 4-7s4 3 4 7M12 8V4l4 2',
    logic: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 17l2 2 4-4',
    bridges: 'M3 17h18M5 17V9m14 8V9M5 9c4 5 10 5 14 0M9 17v-4m6 4v-4',
    algebra: 'M4 7h6M7 4v6M14 7h6M4 17l5-5M4 12l5 5M14 15h6M14 19h6',
    loop: 'M6 6h8v4h4v8H6zM6 6v12',
    detective: 'M10 10m-6 0a6 6 0 1 0 12 0a6 6 0 1 0-12 0M14.5 14.5L20 20',
    shape: 'M4 4h8v8H4zM12 8h8v8h-8zM4 12h8v8H4z',
    balance: 'M12 4v16M5 20h14M4 9h16M4 9l-2 6h6zM20 9l-2 6h6z',
    reverse: 'M20 12H6M10 7l-5 5 5 5M20 5v14',
    links: 'M9 15l6-6M7.5 11.5l-2 2a3.5 3.5 0 0 0 5 5l2-2M16.5 12.5l2-2a3.5 3.5 0 0 0-5-5l-2 2',
    wordcount: 'M3 6h4v4H3zM10 6h4v4h-4zM17 6h4v4h-4zM5 17h2M11 15v4M17 15l2 2-2 2',
    wordgrid: 'M3 4h5v5H3zM9.5 4h5v5h-5zM16 4h5v5h-5zM3 15h5v5H3zM9.5 15h5v5h-5zM16 15h5v5h-5z',
    threads: 'M4 5h4v4H4zM10 5h4v4h-4zM16 5h4v4h-4zM4 15h16v4H4z',
    trails: 'M5 19l4-5 3 3 4-6 3 3M5 5h.01M12 5h.01M19 5h.01',
    wordrush: 'M13 3L5 14h6l-1 7 8-11h-6z',
    catlogic: 'M5 5l3 3h8l3-3v9a7 6 0 0 1-14 0zM9.5 12h.01M14.5 12h.01',
    survey: 'M4 6h12M4 12h9M4 18h6M18 14v6M15 17h6'
  };
  function icon(g, cls) { return PL.svg('svg', { viewBox: '0 0 24 24', class: 'gicon ' + (cls || ''), 'aria-hidden': 'true' }, PL.svg('path', { d: ICONS[g] || ICONS.logic })); }

  /* ---------- toasts ---------- */
  function toast(msg, kind) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.className = 'toast show ' + (kind || '');
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = 'toast'; }, kind === 'bad' ? 2600 : 2200);
  }
  PL.toast = toast;

  /* ---------- navigation ---------- */
  function go(s) {
    leavePlay();
    screen = s; render(); window.scrollTo(0, 0);
  }
  function render() {
    root.innerHTML = '';
    var view;
    if (screen.name === 'home') view = homeView();
    else if (screen.name === 'play') view = playView();
    else if (screen.name === 'daily') view = dailyView();
    else if (screen.name === 'stats') view = statsView();
    else if (screen.name === 'gstats') view = gameStatsView(screen.g);
    else if (screen.name === 'dstats') view = dailyStatsView();
    else if (screen.name === 'history') view = historyView();
    else if (screen.name === 'settings') view = settingsView();
    else if (screen.name === 'shuffle') view = shuffleView();
    else view = homeView();
    root.appendChild(view);
  }
  function topbar(title, back, right) {
    return h('header', { class: 'topbar' },
      back ? h('button', { class: 'iconbtn', 'aria-label': 'Back', onclick: back }, PL.svg('svg', { viewBox: '0 0 24 24', class: 'gicon' }, PL.svg('path', { d: 'M15 5l-7 7 7 7' }))) : h('span', { class: 'iconbtn ph' }),
      h('div', { class: 'tb-title' }, title), right || h('span', { class: 'iconbtn ph' }));
  }

  /* ---------- home ---------- */
  function homeView() {
    var today = PL.dateKey(), d = M.daily(today), diff = M.dailyDifficulty(today);
    var dt = d ? M.dailyTotals(d) : null;
    var st = PL.store.status();
    return h('main', { class: 'page home' },
      h('div', { class: 'brand' }, h('h1', null, 'Puzzle Lab'), h('button', { class: 'iconbtn', 'aria-label': 'Settings and data', onclick: function () { go({ name: 'settings' }); } }, PL.svg('svg', { viewBox: '0 0 24 24', class: 'gicon' }, PL.svg('path', { d: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6' })))),
      h('button', { class: 'daily-card', onclick: function () { go({ name: 'daily' }); } },
        h('div', null, h('div', { class: 'eyebrow' }, 'Daily Mini Quiz · ' + fmtDate(today)), h('div', { class: 'dc-title' }, d && d.complete ? 'Done — ' + dt.score + ' / ' + d.max : d && dt.done ? dt.done + ' of ' + dt.n + ' solved' : PL.order.length + ' puzzles, one from each game'),
          h('div', { class: 'muted small' }, diff + ' day' + (d && d.complete ? ' · ' + PL.fmtTime(dt.ms) : ''))),
        h('div', { class: 'dc-dots', style: { 'grid-template-columns': 'repeat(' + (d ? d.games : PL.order).length + ', 1fr)' } }, (d ? d.games : PL.order).map(function (g) { var pr = d && d.prog[g]; return h('span', { class: 'dc-dot' + (pr && pr.done ? (pr.outcome === 'solved' ? ' ok' : ' bad') : pr && pr.gs ? ' part' : '') }); }))),
      h('div', { class: 'quick' },
        h('button', { class: 'btn', onclick: function () { go({ name: 'shuffle' }); } }, 'Shuffle'),
        h('button', { class: 'btn', onclick: function () { go({ name: 'stats' }); } }, 'Statistics'),
        h('button', { class: 'btn', onclick: function () { go({ name: 'history' }); } }, 'History')),
      freshOffer(),
      M.settings().timed ? h('div', { class: 'notice' }, 'Timed mode is on for new puzzles. Timed results are kept separately. ', h('button', { class: 'linkbtn', onclick: function () { M.setSetting('timed', false); render(); } }, 'Turn off')) : null,
      PL.groups.map(function (grp) {
        return h('section', { class: 'ggroup' }, h('h2', { class: 'ggroup-h' }, grp.name),
          h('ul', { class: 'games tiles2' }, grp.games.map(function (g) {
            var G = PL.games[g], r = M.rating(g), act = M.active(g);
            return h('li', null, h('button', { class: 'gtile', onclick: function () { startUnlimited(g); }, 'aria-label': G.name + ', level ' + r.level + (act ? ', in progress' : '') },
              h('div', { class: 'gt-top' }, icon(g), h('span', { class: 'lvl' }, 'Lv ' + r.level)),
              h('div', { class: 'gc-name' }, G.name),
              h('div', { class: 'gt-blurb' }, act ? h('span', { class: 'resume' }, 'Resume') : G.blurb)));
          })));
      }),
      h('footer', { class: 'foot muted small' }, syncLine(st)));
  }
  /* One-time offer after the 17-game update (the owner asked for a clean slate). Also available in Settings. */
  function freshButton(label) {
    return h('button', { class: 'btn sm primary', onclick: function () {
      if (!this.dataset.armed) { this.dataset.armed = 1; this.textContent = 'Tap again to reset'; return; }
      var r = M.freshStart(PL.dateKey()); var c = M.core(); c.freshOffered = 1; M.saveCore(c);
      toast('Fresh start: ' + PL.plural(r.attempts, 'old result') + ' set aside, levels back to 3, today’s quiz rebuilt with all ' + PL.order.length + ' games.', 'good');
      go({ name: 'home' });
    } }, label);
  }
  function freshOffer() {
    var c = M.core();
    if (c.freshOffered || c.freshAt || !PL.store.keys('att:').length && !PL.store.keys('day:').length) return null;
    return h('div', { class: 'notice fresh' },
      h('p', null, h('b', null, 'Fresh start? '), 'Reset your statistics and levels, and rebuild today’s daily quiz with all ' + PL.order.length + ' games. Your old results are set aside (not deleted) and can be brought back from Settings.'),
      h('div', { class: 'row-actions' }, freshButton('Reset stats and today’s quiz'),
        h('button', { class: 'btn sm ghost', onclick: function () { var c2 = M.core(); c2.freshOffered = 1; M.saveCore(c2); render(); } }, 'Not now')));
  }
  function syncLine(st) {
    if (st.local === 'memory') return 'Storage is unavailable here, so progress will be lost when you close the app. Export your data from Settings.';
    return 'Saved on this iPhone' + (st.persisted ? ' (protected storage)' : '') + '. Export a backup from Settings now and then.';
  }
  function fmtDate(k) { var p = k.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }

  /* ---------- play sessions ---------- */
  var sidSeq = 0;
  function newSid() { return ++sidSeq; }
  function startUnlimited(g, opts) {
    var act = M.active(g);
    // self-heal: an "active" record that was already finished (older builds could resurrect one) is discarded
    if (act && (act.done || M.getAttempt(act.id))) { M.clearActive(g); act = null; }
    if (!act) {
      var r = M.rating(g), G = PL.games[g], set = M.settings();
      var ctx = M.genContext(g);
      var seed = PL.uid();
      var made;
      try { made = M.newPuzzle(g, r.level, g + ':' + seed, ctx); }
      catch (e) { toast('Could not build a valid puzzle. Please try again.', 'bad'); return; }
      act = { id: PL.uid(), game: g, mode: 'unlimited', timed: !!set.timed, timeLimit: set.timed ? G.timeLimit(r.level) : null, level: r.level, seed: made.seed, fp: made.fp, puzzle: made.puzzle,
        gs: G.init(made.puzzle), hints: 0, wrong: 0, activeMs: 0, startedAt: Date.now(), touched: false, hintLog: [], shuffle: !!(opts && opts.shuffle) };
      M.saveActive(g, act);
    } else if (opts && opts.shuffle) { act.shuffle = true; }
    cur = { sid: newSid(), kind: 'unlimited', g: g, rec: act, p: act.puzzle, level: act.level, paused: false, done: false, hint: null };
    lastTick = performance.now();
    screen = { name: 'play' }; render(); window.scrollTo(0, 0);
  }
  function startDaily(g, practice) {
    var d = M.ensureDaily(screen.date || PL.dateKey());
    var pz = d.puzzles[g];
    if (practice) {
      var rec = { id: PL.uid(), game: g, mode: 'practice', level: d.levels[g], seed: pz.seed, puzzle: pz.puzzle, gs: PL.games[g].init(pz.puzzle), hints: 0, wrong: 0, activeMs: 0, startedAt: Date.now(), hintLog: [], dailyDate: d.date };
      cur = { sid: newSid(), kind: 'practice', g: g, rec: rec, p: pz.puzzle, level: d.levels[g], paused: false, done: false, d: d };
    } else {
      var pr = d.prog[g];
      if (!pr.gs) { pr.gs = PL.games[g].init(pz.puzzle); pr.id = PL.uid(); pr.startedAt = Date.now(); pr.hintLog = []; M.saveDaily(d); }
      cur = { sid: newSid(), kind: 'daily', g: g, rec: pr, p: pz.puzzle, level: d.levels[g], paused: false, done: pr.done, d: d };
    }
    lastTick = performance.now();
    screen = { name: 'play', date: d.date }; render(); window.scrollTo(0, 0);
  }
  /* Lifecycle rule: a session's record is written only while that session is the current one AND unfinished.
     Finishing cancels pending writes, so a completed puzzle can never be saved back as "active" (the old Next Puzzle bug). */
  function persistRec() {
    if (!cur || cur.done) return;
    if (cur.kind === 'unlimited') M.saveActive(cur.g, cur.rec);
    else if (cur.kind === 'daily') M.saveDaily(cur.d);
  }
  var persistT = null;
  function persistSoon() { clearTimeout(persistT); var sid = cur && cur.sid; persistT = setTimeout(function () { if (cur && cur.sid === sid) persistRec(); }, 800); }
  function leavePlay() {
    if (PL.dock.isOpen()) PL.dock.close();
    clearTimeout(persistT);
    if (cur && !cur.done) { tickNow(); persistRec(); }
    cur = null;
  }

  /* ---------- active-time tracking ---------- */
  var lastTick = null;
  function tickNow() {
    var t = performance.now();
    if (cur && !cur.done && !cur.paused && !document.hidden && lastTick != null) {
      var dt = Math.min(t - lastTick, 5000); // cap: never credit long gaps (sleep, background)
      cur.rec.activeMs = (cur.rec.activeMs || 0) + dt;
    }
    lastTick = t;
  }
  setInterval(function () {
    tickNow();
    if (!cur || cur.done) return;
    var el = document.getElementById('clock');
    if (el) {
      if (cur.rec.timeLimit) { var left = cur.rec.timeLimit * 1000 - cur.rec.activeMs; el.textContent = PL.fmtTime(Math.max(0, left)); el.classList.toggle('warn', left < 30000); if (left <= 0) finish('timeout'); }
      else el.textContent = PL.fmtTime(cur.rec.activeMs);
    }
    if (Math.floor(cur.rec.activeMs / 1000) % 5 === 0) persistRec();
  }, 1000);
  document.addEventListener('visibilitychange', function () { tickNow(); if (document.hidden) { persistRec(); PL.store.flush(); } else lastTick = performance.now(); });
  window.addEventListener('pagehide', function () { tickNow(); persistRec(); });

  /* ---------- play view ---------- */
  function playView() {
    if (!cur) return homeView();
    var G = PL.games[cur.g], rec = cur.rec;
    var wrap = h('main', { class: 'page play' });
    var meta = cur.kind === 'unlimited' ? 'Level ' + cur.level + (rec.timed ? ' · timed' : '') + (rec.shuffle ? ' · shuffle' : '') : cur.kind === 'daily' ? 'Daily · ' + diffName(cur.level) : 'Daily practice (not scored)';
    var right = h('div', { class: 'tb-right' },
      h('span', { id: 'clock', class: 'clock mono' + (rec.timeLimit ? ' timed' : ''), 'aria-label': 'Active time' }, rec.timeLimit ? PL.fmtTime(rec.timeLimit * 1000 - rec.activeMs) : PL.fmtTime(rec.activeMs)),
      cur.done ? null : h('button', { class: 'iconbtn', 'aria-label': cur.paused ? 'Resume' : 'Pause', onclick: function () { tickNow(); cur.paused = !cur.paused; persistRec(); render(); } }, PL.svg('svg', { viewBox: '0 0 24 24', class: 'gicon' }, PL.svg('path', { d: cur.paused ? 'M8 5l11 7-11 7z' : 'M8 5v14M16 5v14' }))));
    wrap.appendChild(topbar(h('div', null, h('div', { class: 'tb-name' }, G.name), h('div', { class: 'tb-meta' }, meta)), function () { go(cur && cur.kind !== 'unlimited' ? { name: 'daily', date: cur.d && cur.d.date } : { name: 'home' }); }, right));
    var tools = h('div', { class: 'toolbar' },
      h('button', { class: 'btn sm', onclick: function () { PL.dock.open('scratch', scratchKey(), { math: isMath() }); } }, 'Scratchpad'),
      isMath() ? h('button', { class: 'btn sm', 'aria-label': 'Calculator', onclick: function () { PL.dock.open('calc', scratchKey(), { math: true }); } }, 'Calculator') : null,
      cur.done ? null : h('button', { id: 'hintbtn', class: 'btn sm', onclick: doHint }, 'Hint' + (rec.hints ? ' (' + rec.hints + ')' : '')),
      h('details', { class: 'rules' }, h('summary', { class: 'btn sm ghost' }, 'Rules'), h('div', { class: 'rules-pop' }, G.rules)),
      cur.done ? null : h('details', { class: 'more' }, h('summary', { class: 'btn sm ghost', 'aria-label': 'More actions' }, '•••'),
        h('div', { class: 'more-pop' },
          cur.kind === 'unlimited' ? h('button', { class: 'linkbtn', onclick: skip }, rec.touched || rec.activeMs > 30000 ? 'Skip this puzzle (counts as abandoned)' : 'Skip this puzzle') : null,
          G.giveUpLabel && G.giveUpLabel(cur.p) ? h('button', { class: 'linkbtn', onclick: function () { if (!this.dataset.armed) { this.dataset.armed = 1; this.textContent = 'Tap again to give up on this question'; return; } this.closest('details').open = false; giveUpQuestion(); } }, G.giveUpLabel(cur.p)) : null,
          h('button', { class: 'linkbtn', onclick: function () { if (this.dataset.armed) finish('failed'); else { this.dataset.armed = 1; this.textContent = G.multi && cur.p.qs ? 'Tap again to end the whole game now' : 'Tap again to give up and see the solution'; } } }, G.multi && cur.p.qs ? 'End this game' : 'Give up'))));
    wrap.appendChild(tools);
    if (cur.hint) wrap.appendChild(h('div', { class: 'hintbox', role: 'status' }, h('span', null, cur.hint), h('button', { class: 'linkbtn', onclick: function () { cur.hint = null; render(); } }, 'Dismiss')));
    if (cur.done && cur.summary) wrap.appendChild(summaryCard());
    var body = h('div', { id: 'gamebody', class: 'gamebody' + (cur.paused ? ' paused' : '') });
    try { body.appendChild(G.view(makeApi())); }
    catch (e) { body.appendChild(h('div', { class: 'notice bad' }, 'This puzzle failed to display: ' + e.message)); console.error(e); }
    wrap.appendChild(body);
    if (cur.paused) wrap.appendChild(h('div', { class: 'pause-cover' }, h('div', null, h('b', null, 'Paused'), h('div', { class: 'muted small' }, 'The timer is stopped.'), h('button', { class: 'btn primary', onclick: function () { lastTick = performance.now(); cur.paused = false; render(); } }, 'Resume'))));
    if (cur.done && cur.showReview) wrap.appendChild(h('section', { class: 'card' }, h('h2', null, 'Solution and review'), G.review(cur.p, rec.gs)));
    return wrap;
  }
  function isMath() { var G = PL.games[cur.g]; return cur.g === 'algebra' || cur.g === 'balance' || (G.math && G.math(cur.p)); }
  function diffName(lv) { return lv <= 3 ? 'Easy' : lv <= 6 ? 'Medium' : 'Hard'; }
  function scratchKey() { return cur.kind === 'daily' ? 'daily:' + cur.d.date + ':' + cur.g : cur.rec.id; }
  function makeApi() {
    var session = cur, rec = cur.rec;
    var live = function () { return cur === session && !session.done; };
    return {
      p: cur.p, gs: rec.gs, level: cur.level, daily: cur.kind !== 'unlimited', done: cur.done,
      activeMs: function () { if (cur === session) tickNow(); return rec.activeMs || 0; },
      update: function (gs) { if (!live()) { if (cur === session) rerenderBody(); return; } rec.gs = gs; rec.touched = true; persistSoon(); rerenderBody(); },
      save: function (gs) { if (!live()) return; rec.gs = gs; rec.touched = true; persistSoon(); },
      wrong: function (n) { if (!live()) return; rec.wrong = (rec.wrong || 0) + (n || 1); rec.touched = true; },
      toast: toast,
      finish: function (outcome) { setTimeout(function () { if (cur === session) finish(outcome); }, 0); }
    };
  }
  function rerenderBody() {
    var body = document.getElementById('gamebody');
    if (!body || !cur) { render(); return; }
    var y = window.scrollY;
    body.innerHTML = '';
    try { body.appendChild(PL.games[cur.g].view(makeApi())); } catch (e) { body.appendChild(h('div', { class: 'notice bad' }, e.message)); console.error(e); }
    window.scrollTo(0, y);
    var hb = document.getElementById('hintbtn'); if (hb && !cur.done) hb.textContent = 'Hint' + (cur.rec.hints ? ' (' + cur.rec.hints + ')' : '');
  }
  function doHint() {
    if (!cur || cur.done) return;
    var G = PL.games[cur.g], rec = cur.rec;
    var res = G.hint(cur.p, rec.gs) || { msg: 'No hint available.', noCount: true };
    if (!res.noCount) { rec.hints = (rec.hints || 0) + 1; rec.touched = true; (rec.hintLog = rec.hintLog || []).push(res.msg); }
    if (res.gs) rec.gs = res.gs;
    cur.hint = res.msg; persistRec(); render();
    if (res.after === 'solved') finish('solved');
  }
  function giveUpQuestion() {
    var G = PL.games[cur.g], api = makeApi();
    if (G.giveUp && G.giveUp(cur.p, cur.rec.gs, api)) { cur.rec.touched = true; persistRec(); rerenderBody(); }
  }
  function skip() {
    var rec = cur.rec;
    var outcome = (!rec.touched && rec.activeMs < 30000) ? 'skipped' : 'abandoned';
    finish(outcome, true);
  }

  function finish(outcome, leave) {
    if (!cur || cur.done) return;
    tickNow();
    clearTimeout(persistT);
    var G = PL.games[cur.g], rec = cur.rec, p = cur.p;
    var ev = G.evaluate(p, rec.gs, { outcome: outcome === 'timeout' ? 'failed' : outcome, hints: rec.hints || 0, wrong: rec.wrong || 0, activeMs: rec.activeMs });
    var perf = ev.quality;
    if (outcome === 'abandoned') perf = Math.min(perf, 20);
    var att = { id: rec.id, game: cur.g, mode: cur.kind, timed: !!rec.timed, timeLimit: rec.timeLimit || null, level: cur.level, startedAt: rec.startedAt, endedAt: Date.now(), activeMs: Math.round(rec.activeMs),
      outcome: outcome, perf: perf, quality: ev.quality, metrics: ev.metrics, lines: ev.lines, hints: rec.hints || 0, wrong: rec.wrong || 0, hintLog: rec.hintLog || [],
      puzzle: p, seed: rec.seed, fp: rec.fp || null, gs: rec.gs, gen: PL.GEN_VERSION, scratchKey: scratchKey() };
    cur.done = true; rec.done = true; // stops the clock and blocks any further writes from this session
    var sum = { outcome: outcome, perf: perf, lines: ev.lines, ms: rec.activeMs, hints: att.hints, wrong: att.wrong, title: ev.title };
    if (cur.kind === 'unlimited') {
      M.saveAttempt(att); M.clearActive(cur.g);
      if (M.eligible(att)) { var ad = M.adapt(cur.g); sum.adapt = ad; }
      else sum.note = att.timed ? 'Timed result: kept separately and not used for difficulty.' : outcome === 'skipped' ? 'Skipped before you started: not counted toward difficulty.' : '';
      var c = M.core(); c.shuffle.recent = (c.shuffle.recent || []).concat([cur.g]).slice(-6); M.saveCore(c);
    } else if (cur.kind === 'daily') {
      var ds = M.dailyScore(cur.g, cur.level, ev.quality, outcome === 'solved', rec.activeMs, p);
      rec.done = true; rec.outcome = outcome; rec.quality = ds.quality; rec.timeScore = ds.time; rec.score = ds.score; rec.endedAt = att.endedAt;
      att.dailyDate = cur.d.date; att.dailyDiff = cur.d.diff; att.dailyScore = ds;
      M.saveAttempt(att);
      var tt = M.dailyTotals(cur.d);
      if (tt.done === tt.n && !cur.d.complete) { cur.d.complete = true; cur.d.total = tt.score; cur.d.completedAt = Date.now(); }
      M.saveDaily(cur.d);
      sum.daily = ds; sum.dayDone = cur.d.complete; sum.nextDaily = cur.d.complete ? null : M.nextDailyGame(cur.d, cur.g);
    } else {
      M.saveAttempt(att);
      sum.note = 'Practice replay: recorded in your history, not in statistics or the official daily score.';
    }
    cur.summary = sum;
    if (leave && outcome === 'skipped') { var g = cur.g; cur = null; startUnlimited(g); toast('Skipped. Here is a fresh puzzle.', ''); return; }
    render(); window.scrollTo(0, 0);
  }
  function summaryCard() {
    var s = cur.summary, G = PL.games[cur.g];
    var title = s.title && (s.outcome === 'solved' || s.outcome === 'failed') ? s.title : s.outcome === 'solved' ? 'Solved' : s.outcome === 'timeout' ? 'Time is up' : s.outcome === 'abandoned' ? 'Abandoned' : s.outcome === 'skipped' ? 'Skipped' : 'Not solved';
    var rows = [['Active time', PL.fmtTime(s.ms)], ['Hints', s.hints]].concat(s.lines || []);
    var adapt = null;
    if (s.adapt) {
      var a = s.adapt;
      adapt = a.change > 0 ? 'Difficulty up to level ' + a.level + '.' : a.change < 0 ? 'Difficulty eased to level ' + a.level + '.' : a.roll.n ? 'Level ' + a.level + ' · recent performance ' + Math.round(a.roll.mean) + ' over ' + PL.plural(a.roll.n, 'puzzle') + '.' : '';
    }
    var next = cur.kind === 'unlimited' ? h('button', { class: 'btn primary', onclick: function () {
      var g = cur.g, sh = cur.rec.shuffle; cur = null;
      if (sh) startShuffle(); else startUnlimited(g);
    } }, cur.rec.shuffle ? 'Next shuffle' : 'Next puzzle') : cur.kind === 'daily' ? (s.nextDaily ? h('button', { class: 'btn primary', id: 'next-daily', onclick: function () { var g2 = s.nextDaily, dd = cur.d.date; cur = null; screen.date = dd; startDaily(g2, false); } }, 'Next puzzle: ' + PL.games[s.nextDaily].name)
        : h('button', { class: 'btn primary', onclick: function () { go({ name: 'daily', date: cur.d.date }); } }, s.dayDone ? 'See daily results' : 'Back to the daily quiz')) : h('button', { class: 'btn primary', onclick: function () { go({ name: 'daily', date: cur.d.date }); } }, 'Back');
    return h('section', { class: 'card summary ' + (s.outcome === 'solved' ? 'ok' : 'bad') },
      h('div', { class: 'sum-head' }, h('h2', null, title), h('div', { class: 'sum-score' }, s.daily ? h('span', null, h('b', null, String(s.daily.score)), ' / 100') : h('span', null, h('b', null, String(Math.round(s.perf))), ' performance'))),
      s.daily ? h('div', { class: 'muted small' }, 'Quality ' + s.daily.quality + ' × 0.8 + time credit ' + s.daily.time + ' × 0.2 (benchmark ' + PL.fmtTime(s.daily.bench * 1000) + ')') : null,
      h('dl', { class: 'kv' }, rows.map(function (r) { return [h('dt', null, r[0]), h('dd', null, String(r[1]))]; })),
      adapt ? h('div', { class: 'adapt' }, adapt) : null,
      s.note ? h('div', { class: 'muted small' }, s.note) : null,
      h('div', { class: 'row-actions' }, next, s.nextDaily ? h('button', { class: 'btn', onclick: function () { go({ name: 'daily', date: cur.d.date }); } }, 'Daily overview') : null, cur.showReview ? null : h('button', { class: 'btn', onclick: function () { cur.showReview = true; render(); setTimeout(function () { var r = document.querySelector('.play .card:last-child'); if (r) r.scrollIntoView({ behavior: 'smooth' }); }, 50); } }, 'Review solution'),
        h('button', { class: 'btn ghost', onclick: function () { go({ name: 'gstats', g: cur.g }); } }, G.name + ' stats')));
  }

  /* ---------- shuffle ---------- */
  function startShuffle() {
    var set = M.settings(), recent = M.core().shuffle.recent || [];
    var pool = PL.order.filter(function (g) { return set.excluded.indexOf(g) < 0; });
    if (!pool.length) { toast('Every game is excluded. Include at least one.', 'bad'); go({ name: 'shuffle' }); return; }
    // weight away from the last few games played
    var weights = pool.map(function (g) { var i = recent.lastIndexOf(g); return i < 0 ? 4 : i >= recent.length - 1 ? 0.15 : i >= recent.length - 3 ? 1 : 2.5; });
    var g = PL.rng(PL.uid()).weighted(pool, weights);
    startUnlimited(g, { shuffle: true });
  }
  function shuffleView() {
    var set = M.settings();
    return h('main', { class: 'page' }, topbar('Shuffle', function () { go({ name: 'home' }); }),
      h('p', { class: 'muted' }, 'Get a fresh puzzle from a random game at your current level for that game. Recently played games come up less often. Results count normally.'),
      h('div', { class: 'lbl' }, 'Include'),
      h('div', { class: 'chips' }, PL.order.map(function (g) {
        var on = set.excluded.indexOf(g) < 0;
        return h('button', { class: 'chip' + (on ? ' sel' : ''), 'aria-pressed': on ? 'true' : 'false', onclick: function () { var ex = set.excluded.slice(); var i = ex.indexOf(g); if (i >= 0) ex.splice(i, 1); else ex.push(g); M.setSetting('excluded', ex); render(); } }, PL.games[g].name);
      })),
      h('button', { class: 'btn primary wide', onclick: startShuffle }, 'Shuffle a puzzle'));
  }

  /* ---------- daily ---------- */
  function dailyView() {
    var date = screen.date || PL.dateKey();
    var isToday = date === PL.dateKey();
    var d = isToday ? M.ensureDaily(date) : M.daily(date);
    if (!d) return h('main', { class: 'page' }, topbar('Daily', function () { go({ name: 'home' }); }), h('p', null, 'No quiz was played on that date.'));
    var t = M.dailyTotals(d);
    // comparisons use percentages so nine-game (900) and ten-game (1000) days are comparable
    var prev = M.dailies().filter(function (x) { return x.complete && x.diff === d.diff && x.date !== d.date; });
    var avgPrev = prev.length ? Math.round(PL.mean(prev.map(M.dayPct))) : null;
    var bestPrev = prev.length ? Math.round(Math.max.apply(null, prev.map(M.dayPct))) : null;
    var myPct = Math.round(t.pct);
    return h('main', { class: 'page daily' }, topbar('Daily Mini Quiz', function () { go({ name: 'home' }); }),
      h('div', { class: 'daily-head' }, h('div', null, h('div', { class: 'eyebrow' }, fmtDate(date)), h('h2', null, d.diff + ' day')),
        h('div', { class: 'sum-score' }, h('b', null, String(t.score)), ' / ' + d.max)),
      isToday && !d.complete && M.nextDailyGame(d, null) ? h('button', { class: 'btn primary wide', id: 'daily-continue', onclick: function () { startDaily(M.nextDailyGame(d, null), false); } }, M.dayStarted(d) ? 'Continue: ' + PL.games[M.nextDailyGame(d, null)].name : 'Start with ' + PL.games[M.nextDailyGame(d, null)].name) : null,
      !isToday && !d.complete ? h('div', { class: 'notice' }, 'This day’s quiz was not finished. Only the current day’s quiz can be played for an official score.') : null,
      d.complete ? h('section', { class: 'card' },
        h('h3', null, 'Results'),
        h('dl', { class: 'kv' }, [['Total', t.score + ' / ' + d.max + ' (' + myPct + '%)'], ['Active time', PL.fmtTime(t.ms)], ['Hints', t.hints], ['Incorrect attempts', t.wrong],
          ['Your average on ' + d.diff + ' days', avgPrev != null ? avgPrev + '% (' + PL.plural(prev.length, 'day') + ')' : 'First ' + d.diff + ' day'],
          ['Previous best on ' + d.diff + ' days', bestPrev != null ? bestPrev + '%' + (myPct > bestPrev ? ' — new personal best!' : '') : '—']].map(function (r) { return [h('dt', null, r[0]), h('dd', null, String(r[1]))]; }))) : null,
      d.games.length !== PL.order.length ? h('div', { class: 'notice' }, 'This quiz is from an earlier version: ' + d.games.length + ' games, scored out of ' + d.max + '.') : null,
      h('ul', { class: 'dlist' }, M.dayOrder(d).map(function (g, k) {
        var G = PL.games[g], pr = d.prog[g];
        var status = pr.done ? (pr.outcome === 'solved' ? pr.score + ' pts' : 'Not solved · ' + (pr.score || 0) + ' pts') : pr.gs ? 'In progress · ' + PL.fmtTime(pr.activeMs) : d.diff === 'Mixed' ? diffName(d.levels[g]) : '';
        return h('li', null, h('button', { class: 'gcard' + (pr.done ? ' done' : ''), disabled: !isToday && !pr.done, onclick: function () { if (pr.done) { reviewDaily(d, g); } else startDaily(g, false); } },
          h('span', { class: 'dnum mono' }, String(k + 1)), icon(g), h('div', { class: 'gc-text' }, h('div', { class: 'gc-name' }, G.name), h('div', { class: 'gc-blurb' }, status || 'Not started')),
          pr.done ? h('span', { class: 'mark ' + (pr.outcome === 'solved' ? 'ok' : 'bad') }, pr.outcome === 'solved' ? '✓' : '×') : null));
      })),
      h('details', { class: 'card' }, h('summary', null, 'How daily scoring works'),
        h('p', { class: 'small' }, 'Each puzzle is worth up to 100 points: 80% solution quality and 20% time. Quality reflects the game (clues used in Password, moves versus the shortest route in Word Bridges, information cost in Word Detective, wrong answers and hints elsewhere). Time credit is full at or under a benchmark for that game and difficulty, falls linearly to zero at four times the benchmark, and is multiplied by your quality, so rushing a sloppy answer earns little. Unsolved puzzles get no time credit. Only active time counts: the clock stops when you pause, leave the puzzle or close the app. There is no time limit.'),
        h('p', { class: 'small muted' }, 'Formula: score = round(0.8·Q + 0.2·T), T = (solved ? 100·clamp((4B − t)/(3B), 0, 1) : 0) · Q/100. Benchmarks are provisional and will be recalibrated as data accumulates.')),
      h('p', { class: 'muted small' }, 'Today’s order is shuffled once for the day and stays the same; after each puzzle, Next puzzle takes you to the next unfinished one. You can still tap any game to play it first. Progress is saved. Daily results never change your unlimited-play levels.'));
  }
  function reviewDaily(d, g) {
    var pr = d.prog[g], G = PL.games[g];
    openModal(G.name + ' — daily', h('div', null,
      h('dl', { class: 'kv' }, [['Score', pr.score + ' / 100'], ['Quality', pr.quality], ['Time credit', pr.timeScore], ['Active time', PL.fmtTime(pr.activeMs)], ['Hints', pr.hints], ['Wrong attempts', pr.wrong]].map(function (r) { return [h('dt', null, r[0]), h('dd', null, String(r[1]))]; })),
      G.review(d.puzzles[g].puzzle, pr.gs),
      h('button', { class: 'btn', onclick: function () { closeModal(); screen.date = d.date; startDaily(g, true); } }, 'Practise this puzzle again (not scored)')));
  }

  /* ---------- modal ---------- */
  function openModal(title, content) {
    closeModal();
    var m = h('div', { class: 'modal', role: 'dialog', 'aria-label': title },
      h('div', { class: 'modal-card' }, h('div', { class: 'modal-head' }, h('b', null, title), h('button', { class: 'btn ghost sm', onclick: closeModal }, 'Close')), h('div', { class: 'modal-body' }, content)));
    m.addEventListener('click', function (e) { if (e.target === m) closeModal(); });
    document.body.appendChild(m); document.body.classList.add('sheet-open');
  }
  function closeModal() { var m = document.querySelector('.modal'); if (m) m.remove(); document.body.classList.remove('sheet-open'); }

  /* ---------- statistics ---------- */
  function spark(values, opts) {
    opts = opts || {};
    var W = 320, H = opts.h || 80, pad = 6;
    if (values.length < 2) return h('div', { class: 'muted small' }, 'A trend appears after a few more puzzles.');
    var min = opts.min != null ? opts.min : Math.min.apply(null, values), max = opts.max != null ? opts.max : Math.max.apply(null, values);
    if (max === min) max = min + 1;
    var x = function (i) { return pad + i * (W - 2 * pad) / (values.length - 1); }, y = function (v) { return H - pad - (v - min) * (H - 2 * pad) / (max - min); };
    var pts = values.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); });
    var kids = [];
    [0.25, 0.5, 0.75].forEach(function (f) { kids.push(PL.svg('line', { x1: pad, x2: W - pad, y1: (pad + f * (H - 2 * pad)).toFixed(1), y2: (pad + f * (H - 2 * pad)).toFixed(1), class: 'sp-grid' })); });
    kids.push(PL.svg('path', { d: 'M' + x(0) + ',' + (H - pad) + ' L' + pts.join(' L') + ' L' + x(values.length - 1) + ',' + (H - pad) + ' Z', class: 'sp-area' }));
    kids.push(PL.svg('polyline', { points: pts.join(' '), class: 'sp-line' }));
    kids.push(PL.svg('circle', { cx: x(values.length - 1), cy: y(values[values.length - 1]), r: 3.5, class: 'sp-end' }));
    return h('div', { class: 'spark' }, PL.svg('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', role: 'img', 'aria-label': opts.label || 'Trend' }, kids),
      h('div', { class: 'sp-axis small muted' }, h('span', null, opts.left || ''), h('span', null, opts.right || '')));
  }
  function rollingAvg(vals, k) { var out = []; for (var i = 0; i < vals.length; i++) { var s = vals.slice(Math.max(0, i - k + 1), i + 1); out.push(PL.mean(s)); } return out; }
  function pct(a, b) { return b ? Math.round(100 * a / b) + '%' : '—'; }
  function kvRows(rows) { return h('dl', { class: 'kv' }, rows.map(function (r) { return [h('dt', null, r[0]), h('dd', null, String(r[1]))]; })); }

  function statsView() {
    var atts = M.attempts(M.counts);
    var done = atts.filter(function (a) { return a.outcome === 'solved'; });
    var ms = atts.reduce(function (s, a) { return s + (a.activeMs || 0); }, 0);
    var real = atts.filter(function (a) { return a.outcome !== 'skipped'; });
    var timed = M.attempts(function (a) { return a.mode === 'unlimited' && a.timed; });
    var byLevel = {}; real.forEach(function (a) { (byLevel[a.level] = byLevel[a.level] || []).push(a); });
    return h('main', { class: 'page stats' }, topbar('Statistics', function () { go({ name: 'home' }); }),
      h('div', { class: 'tabs' }, h('button', { class: 'tab on' }, 'Unlimited play'), h('button', { class: 'tab', onclick: function () { go({ name: 'dstats' }); } }, 'Daily quiz')),
      !atts.length ? h('div', { class: 'empty' }, h('b', null, 'No puzzles yet.'), h('p', { class: 'muted' }, 'Every puzzle you finish, skip or abandon in unlimited play will appear here. Nothing is pre-filled.')) : h('div', null,
        h('div', { class: 'tiles' },
          tile('Attempted', real.length), tile('Completed', done.length), tile('Completion', pct(done.length, real.length)), tile('Avg perf', real.length ? Math.round(PL.mean(real.map(function (a) { return a.perf; }))) : '—')),
        h('section', { class: 'card' }, h('h3', null, 'Performance over time'), spark(rollingAvg(real.map(function (a) { return a.perf; }), 10), { min: 0, max: 100, left: 'oldest', right: 'latest · 10-puzzle average', label: 'Performance trend' })),
        h('section', { class: 'card' }, h('h3', null, 'Overall'), kvRows([
          ['Total active time', PL.fmtTime(ms)], ['Average time per completed puzzle', done.length ? PL.fmtTime(PL.mean(done.map(function (a) { return a.activeMs; }))) : '—'],
          ['Hints used', atts.reduce(function (s, a) { return s + (a.hints || 0); }, 0)], ['Failed', atts.filter(function (a) { return a.outcome === 'failed'; }).length],
          ['Abandoned', atts.filter(function (a) { return a.outcome === 'abandoned'; }).length], ['Skipped (not counted)', atts.filter(function (a) { return a.outcome === 'skipped'; }).length]]))),
      h('section', { class: 'card' }, h('h3', null, 'By game'), h('div', { class: 'scrollx' }, h('table', { class: 'dtable' },
        h('tr', null, h('th', null, 'Game'), h('th', null, 'Level'), h('th', null, 'Played'), h('th', null, 'Solved'), h('th', null, 'Perf')),
        PL.order.concat(PL.retired.filter(function (g) { return real.some(function (a) { return a.game === g; }); })).map(function (g) {
          var A = real.filter(function (a) { return a.game === g; }), r = M.rating(g), ret = PL.retired.indexOf(g) >= 0;
          return h('tr', { class: 'rowlink', onclick: function () { go({ name: 'gstats', g: g }); } }, h('td', null, PL.games[g].name + (ret ? ' (retired)' : '')), h('td', null, ret ? '—' : r.level + (r.highest > r.level ? ' (max ' + r.highest + ')' : '')), h('td', null, A.length), h('td', null, pct(A.filter(function (a) { return a.outcome === 'solved'; }).length, A.length)), h('td', null, A.length ? Math.round(PL.mean(A.map(function (a) { return a.perf; }))) : '—'));
        }))), h('div', { class: 'muted small' }, 'Tap a game for its detailed page.')),
      Object.keys(byLevel).length ? h('section', { class: 'card' }, h('h3', null, 'By difficulty level'), h('div', { class: 'scrollx' }, h('table', { class: 'dtable' },
        h('tr', null, h('th', null, 'Level'), h('th', null, 'Played'), h('th', null, 'Solved'), h('th', null, 'Avg perf')),
        Object.keys(byLevel).sort(function (a, b) { return a - b; }).map(function (lv) { var A = byLevel[lv]; return h('tr', null, h('td', null, lv), h('td', null, A.length), h('td', null, pct(A.filter(function (a) { return a.outcome === 'solved'; }).length, A.length)), h('td', null, Math.round(PL.mean(A.map(function (a) { return a.perf; }))))); })))) : null,
      timed.length ? h('section', { class: 'card' }, h('h3', null, 'Timed mode (kept separately)'), kvRows([['Timed attempts', timed.length], ['Beat the clock', pct(timed.filter(function (a) { return a.outcome === 'solved'; }).length, timed.length)], ['Average performance', Math.round(PL.mean(timed.map(function (a) { return a.perf; })))]])) : null);
  }
  function tile(label, val) { return h('div', { class: 'tile' }, h('div', { class: 'tile-v' }, String(val)), h('div', { class: 'tile-l' }, label)); }

  function gameStatsView(g) {
    var G = PL.games[g], r = M.rating(g);
    var atts = M.attempts(function (a) { return a.game === g && M.counts(a); });
    var real = atts.filter(function (a) { return a.outcome !== 'skipped'; });
    var roll = M.rollingFor(g);
    var byLevel = {}; real.forEach(function (a) { (byLevel[a.level] = byLevel[a.level] || []).push(a); });
    var recent = real.slice(-10), older = real.slice(-20, -10);
    var trend = recent.length >= 5 && older.length >= 5 ? Math.round(PL.mean(recent.map(function (a) { return a.perf; })) - PL.mean(older.map(function (a) { return a.perf; }))) : null;
    var timed = M.attempts(function (a) { return a.game === g && a.mode === 'unlimited' && a.timed; });
    var dailyA = M.attempts(function (a) { return a.game === g && a.mode === 'daily'; });
    return h('main', { class: 'page stats' }, topbar(G.name, function () { go({ name: 'stats' }); }),
      h('div', { class: 'tiles' }, tile('Current level', r.level), tile('Highest', r.highest), tile('Rolling', roll.mean != null ? Math.round(roll.mean) : '—'), tile('Lifetime avg', real.length ? Math.round(PL.mean(real.map(function (a) { return a.perf; }))) : '—')),
      h('section', { class: 'card' }, h('h3', null, 'Recent trend'), spark(real.slice(-40).map(function (a) { return a.perf; }), { min: 0, max: 100, left: 'last ' + Math.min(40, real.length) + ' puzzles', right: trend != null ? (trend >= 0 ? '+' : '') + trend + ' vs previous 10' : '', label: 'Performance per puzzle' }),
        h('div', { class: 'muted small' }, 'Rolling score uses up to 20 puzzles since the last level change, weighting recent ones more and crediting harder puzzles. ≥ 85 raises the level, below 65 lowers it.')),
      h('section', { class: 'card' }, h('h3', null, 'Game details'), kvRows([['Played', real.length], ['Solved', pct(real.filter(function (a) { return a.outcome === 'solved'; }).length, real.length)], ['Average solving time', real.filter(function (a) { return a.outcome === 'solved'; }).length ? PL.fmtTime(PL.mean(real.filter(function (a) { return a.outcome === 'solved'; }).map(function (a) { return a.activeMs; }))) : '—'], ['Hints used', real.reduce(function (s, a) { return s + (a.hints || 0); }, 0)]].concat(G.stats(real)))),
      Object.keys(byLevel).length ? h('section', { class: 'card' }, h('h3', null, 'Results by level'), h('div', { class: 'scrollx' }, h('table', { class: 'dtable' }, h('tr', null, h('th', null, 'Level'), h('th', null, 'Played'), h('th', null, 'Solved'), h('th', null, 'Avg perf')),
        Object.keys(byLevel).sort(function (a, b) { return a - b; }).map(function (lv) { var A = byLevel[lv]; return h('tr', null, h('td', null, lv), h('td', null, A.length), h('td', null, pct(A.filter(function (a) { return a.outcome === 'solved'; }).length, A.length)), h('td', null, Math.round(PL.mean(A.map(function (a) { return a.perf; }))))); })))) : null,
      r.changes.length ? h('section', { class: 'card' }, h('h3', null, 'Difficulty changes'), h('ul', { class: 'steps' }, r.changes.slice(-12).reverse().map(function (c) { return h('li', null, new Date(c.t).toLocaleDateString() + ': ' + c.from + ' → ' + c.to + ' · ' + c.reason); }))) : null,
      timed.length ? h('section', { class: 'card' }, h('h3', null, 'Timed mode'), kvRows([['Attempts', timed.length], ['Beat the clock', pct(timed.filter(function (a) { return a.outcome === 'solved'; }).length, timed.length)]])) : null,
      dailyA.length ? h('section', { class: 'card' }, h('h3', null, 'In the daily quiz'), kvRows([['Played', dailyA.length], ['Average daily points', Math.round(PL.mean(dailyA.map(function (a) { return a.dailyScore ? a.dailyScore.score : 0; })))]])) : null,
      h('section', { class: 'card' }, h('h3', null, 'Recent attempts'), attemptList(atts.slice(-15).reverse())));
  }
  function attemptList(list) {
    if (!list.length) return h('div', { class: 'muted small' }, 'Nothing yet.');
    return h('ul', { class: 'alist' }, list.map(function (a) {
      return h('li', null, h('button', { class: 'arow', onclick: function () { openAttempt(a.id); } },
        h('span', { class: 'mark ' + (a.outcome === 'solved' ? 'ok' : 'bad') }, a.outcome === 'solved' ? '✓' : a.outcome === 'skipped' ? '–' : '×'),
        h('span', { class: 'a-main' }, h('span', null, PL.games[a.game].name + (a.mode === 'daily' ? ' · daily' : a.mode === 'practice' ? ' · practice' : '') + ' · Lv ' + a.level), h('span', { class: 'muted small' }, new Date(a.endedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' · ' + PL.fmtTime(a.activeMs) + ' · ' + a.outcome)),
        h('span', { class: 'a-perf mono' }, a.mode === 'daily' && a.dailyScore ? a.dailyScore.score : Math.round(a.perf))));
    }));
  }
  function openAttempt(id) {
    var a = M.getAttempt(id); if (!a) return;
    var G = PL.games[a.game];
    var body;
    try { body = G.review(a.puzzle, a.gs); } catch (e) { body = h('div', { class: 'notice bad' }, 'This record could not be displayed: ' + e.message); }
    openModal(G.name, h('div', null,
      kvRows([['Played', new Date(a.endedAt).toLocaleString()], ['Mode', a.mode + (a.timed ? ' (timed)' : '')], ['Level', a.level], ['Result', a.outcome], [a.mode === 'daily' ? 'Daily points' : 'Performance', a.mode === 'daily' && a.dailyScore ? a.dailyScore.score : Math.round(a.perf)], ['Active time', PL.fmtTime(a.activeMs)], ['Hints', a.hints], ['Wrong attempts', a.wrong]].concat(a.lines || []).concat([['Puzzle ID', a.seed || a.id]])),
      a.hintLog && a.hintLog.length ? h('div', null, h('div', { class: 'lbl' }, 'Hints you saw'), h('ul', { class: 'steps small' }, a.hintLog.map(function (x) { return h('li', null, x); }))) : null,
      body,
      scratchPreview(a.scratchKey)));
  }
  function scratchPreview(key) {
    if (!key) return null; var s = PL.store.get('scr:' + key); if (!s || (!s.text && !(s.draw && s.draw.length))) return null;
    return h('div', null, h('div', { class: 'lbl' }, 'Your scratchpad'), s.text ? h('pre', { class: 'small scr-pre' }, s.text) : null, s.draw && s.draw.length ? h('div', { class: 'muted small' }, PL.plural(s.draw.length, 'drawn stroke') + ' saved.') : null);
  }
  function historyView() {
    var f = screen.filter || 'all';
    var list = M.attempts(function (a) { return f === 'all' || a.game === f || (f === 'daily' && a.mode !== 'unlimited'); }).reverse();
    return h('main', { class: 'page' }, topbar('History', function () { go({ name: 'home' }); }),
      h('div', { class: 'chips' }, [['all', 'All']].concat([['daily', 'Daily']]).concat(PL.order.concat(PL.retired.filter(function (g) { return PL.store.keys('att:').some(function (k) { return (PL.store.get(k) || {}).game === g; }); })).map(function (g) { return [g, PL.games[g].name]; })).map(function (o) {
        return h('button', { class: 'chip' + (f === o[0] ? ' sel' : ''), onclick: function () { screen.filter = o[0]; render(); } }, o[1]);
      })),
      list.length ? attemptList(list.slice(0, 200)) : h('div', { class: 'empty' }, h('p', { class: 'muted' }, 'Finished puzzles appear here. Open one to see the original puzzle, your answers and the full solution.')),
      list.length > 200 ? h('p', { class: 'muted small' }, 'Showing the latest 200. Export your data for the complete record.') : null);
  }

  function dailyStatsView() {
    var days = M.dailies().filter(function (d) { return d.date <= PL.dateKey(); });
    var f = screen.diff || 'All';
    var show = days.filter(function (d) { return f === 'All' || d.diff === f; });
    var comp = show.filter(function (d) { return d.complete; });
    var useAdj = M.settings().adjIndex;
    var FACT = { Easy: 0.85, Medium: 1, Hard: 1.2, Mixed: 1 };
    var P = function (d) { return M.dayPct(d); };
    var adj = function (d) { return Math.round(P(d) * FACT[d.diff]); };
    var cats = ['Easy', 'Medium', 'Hard', 'Mixed'];
    return h('main', { class: 'page stats' }, topbar('Statistics', function () { go({ name: 'home' }); }),
      h('div', { class: 'tabs' }, h('button', { class: 'tab', onclick: function () { go({ name: 'stats' }); } }, 'Unlimited play'), h('button', { class: 'tab on' }, 'Daily quiz')),
      h('div', { class: 'chips' }, ['All'].concat(cats).map(function (c) { return h('button', { class: 'chip' + (f === c ? ' sel' : ''), onclick: function () { screen.diff = c; render(); } }, c); })),
      !show.length ? h('div', { class: 'empty' }, h('p', { class: 'muted' }, 'Daily results will appear here once you start a daily quiz.')) : h('div', null,
        h('div', { class: 'tiles' }, tile('Attempted', show.length), tile('Completed', comp.length), tile('Average', comp.length ? Math.round(PL.mean(comp.map(P))) + '%' : '—'), tile('Best', comp.length ? Math.round(Math.max.apply(null, comp.map(P))) + '%' : '—')),
        h('section', { class: 'card' }, h('h3', null, 'Score history' + (f !== 'All' ? ' · ' + f : '')), spark(comp.map(function (d) { return useAdj ? adj(d) : P(d); }), { min: 0, max: useAdj ? 120 : 100, left: comp.length ? comp[0].date : '', right: comp.length ? comp[comp.length - 1].date : '', label: 'Daily scores' }),
          h('div', { class: 'muted small' }, 'Scores are shown as a percentage of the day’s maximum, so 900-point and 1,000-point days compare fairly.'),
          kvRows([['Completion rate', pct(comp.length, show.length)], ['Average active time', comp.length ? PL.fmtTime(PL.mean(comp.map(function (d) { return M.dailyTotals(d).ms; }))) : '—']])),
        h('section', { class: 'card' }, h('h3', null, 'By difficulty'), h('div', { class: 'scrollx' }, h('table', { class: 'dtable' },
          h('tr', null, h('th', null, ''), h('th', null, 'Days'), h('th', null, 'Done'), h('th', null, 'Avg'), h('th', null, 'Best'), h('th', null, 'Avg time')),
          cats.map(function (c) {
            var D = days.filter(function (d) { return d.diff === c; }), C = D.filter(function (d) { return d.complete; });
            return h('tr', null, h('td', null, c), h('td', null, D.length), h('td', null, pct(C.length, D.length)), h('td', null, C.length ? Math.round(PL.mean(C.map(P))) + '%' : '—'), h('td', null, C.length ? Math.round(Math.max.apply(null, C.map(P))) + '%' : '—'), h('td', null, C.length ? PL.fmtTime(PL.mean(C.map(function (d) { return M.dailyTotals(d).ms; }))) : '—'));
          })))),
        h('section', { class: 'card' }, h('h3', null, 'Per game' + (f !== 'All' ? ' on ' + f + ' days' : '')), h('div', { class: 'scrollx' }, h('table', { class: 'dtable' },
          h('tr', null, h('th', null, 'Game'), h('th', null, 'Avg pts'), h('th', null, 'Solved')),
          PL.order.concat(PL.retired).filter(function (g) { return show.some(function (d) { return d.games.indexOf(g) >= 0; }); }).map(function (g) {
            var PG = show.map(function (d) { return d.prog[g]; }).filter(function (p) { return p && p.done; });
            return h('tr', null, h('td', null, PL.games[g].name + (PL.retired.indexOf(g) >= 0 ? ' (retired)' : '')), h('td', null, PG.length ? Math.round(PL.mean(PG.map(function (p) { return p.score; }))) : '—'), h('td', null, pct(PG.filter(function (p) { return p.outcome === 'solved'; }).length, PG.length)));
          })))),
        h('section', { class: 'card' }, h('h3', null, 'Difficulty-adjusted index'),
          h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: useAdj, onchange: function () { M.setSetting('adjIndex', this.checked); render(); } }), ' Show adjusted scores in the chart'),
          h('p', { class: 'muted small' }, 'An optional, estimated index (percentage of maximum, weighted by difficulty): Easy × 0.85, Medium × 1.0, Hard × 1.2, Mixed × 1.0. It is a rough convenience, not a validated measure of ability. Raw scores are always kept and shown elsewhere.'),
          comp.length ? kvRows([['Average adjusted index', Math.round(PL.mean(comp.map(adj)))]]) : null),
        h('section', { class: 'card' }, h('h3', null, 'Days'), h('ul', { class: 'alist' }, show.slice().reverse().map(function (d) {
          var t = M.dailyTotals(d);
          return h('li', null, h('button', { class: 'arow', onclick: function () { go({ name: 'daily', date: d.date }); } }, h('span', { class: 'mark ' + (d.complete ? 'ok' : 'bad') }, d.complete ? '✓' : '…'), h('span', { class: 'a-main' }, h('span', null, fmtDate(d.date) + ' · ' + d.diff), h('span', { class: 'muted small' }, t.done + '/' + t.n + ' · ' + PL.fmtTime(t.ms) + ' · ' + Math.round(t.pct) + '%')), h('span', { class: 'a-perf mono' }, (d.complete ? d.total : t.score) + '/' + d.max)));
        })))));
  }

  /* ---------- settings & data ---------- */
  function settingsView() {
    var set = M.settings(), st = PL.store.status();
    var ta = h('textarea', { id: 'imp-text', class: 'txt area', rows: 4, placeholder: 'Or paste exported JSON here' });
    var fileIn = h('input', { id: 'imp-file', type: 'file', accept: 'application/json,.json', class: 'file' });
    var pending = null, impMsg = h('div', { class: 'small' });
    function readImport(text) {
      try { var obj = JSON.parse(text); var err = M.validateImport(obj); if (err) { impMsg.textContent = err; return; } pending = obj; var n = Object.keys(obj.data).filter(function (k) { return k.indexOf('att:') === 0; }).length; impMsg.textContent = 'Ready: ' + PL.plural(n, 'attempt') + ' from ' + obj.exportedAt.slice(0, 10) + '. Choose how to restore below.'; impBtns.hidden = false; }
      catch (e) { impMsg.textContent = 'That is not valid JSON.'; }
    }
    fileIn.addEventListener('change', function () { var f = fileIn.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { readImport(r.result); }; r.readAsText(f); });
    ta.addEventListener('input', function () { if (ta.value.trim().length > 20) readImport(ta.value.trim()); });
    var impBtns = h('div', { class: 'row-actions', hidden: true },
      h('button', { class: 'btn', onclick: function () { if (!pending) return; var c1 = M.importData(pending, 'merge'); toast('Merged ' + PL.plural(c1.attempts, 'attempt') + '.', 'good'); go({ name: 'home' }); } }, 'Merge with current data'),
      h('button', { class: 'btn ghost', onclick: function () { if (!pending) return; if (!this.dataset.armed) { this.dataset.armed = 1; this.textContent = 'Tap again: this replaces everything'; return; } M.importData(pending, 'replace'); toast('Restored.', 'good'); go({ name: 'home' }); } }, 'Replace all data'));
    var exportOut = h('div');
    return h('main', { class: 'page' }, topbar('Settings and data', function () { go({ name: 'home' }); }),
      h('section', { class: 'card' }, h('h3', null, 'Play'),
        h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: set.timed, onchange: function () { M.setSetting('timed', this.checked); render(); } }), ' Timed mode for new unlimited puzzles'),
        h('p', { class: 'muted small' }, 'Each game sets a time limit based on its level, shown as a countdown. Timed results are stored separately and never change your difficulty level. The daily quiz is never timed.')),
      h('section', { class: 'card' }, h('h3', null, 'Where your data lives'),
        h('p', { class: 'small' }, syncLine(st)),
        kvRows([['On this device', st.local === 'indexeddb' ? 'IndexedDB' : st.local === 'localstorage' ? 'Browser storage (limited space)' : 'Not available'], ['Protected from automatic clean-up', st.persisted ? 'Yes' : 'Not granted'], ['Puzzles recorded', PL.store.keys('att:').length], ['App version', PL.VERSION || 'dev']]),
        h('p', { class: 'muted small' }, 'Everything stays on this iPhone; nothing is uploaded. Opening Puzzle Lab from the Home Screen icon keeps its storage separate from Safari tabs. Export a backup now and then, especially before deleting the icon.')),
      h('section', { class: 'card' }, h('h3', null, 'Fresh start'),
        h('p', { class: 'small' }, 'Clears statistics, levels, daily results and unfinished puzzles, and rebuilds today’s daily quiz. Settings stay. The cleared records are kept aside on this iPhone and included in exports.'),
        freshButton('Reset stats and today’s quiz'),
        M.lastArchive() ? h('p', { class: 'small' }, 'Last reset: ' + new Date(M.lastArchive().at).toLocaleString() + '. ',
          h('button', { class: 'linkbtn', onclick: function () { if (!this.dataset.armed) { this.dataset.armed = 1; this.textContent = 'Tap again to bring them back'; return; } var r = M.undoFreshStart(); toast('Restored ' + PL.plural(r.attempts, 'result') + ' and your previous levels.', 'good'); go({ name: 'home' }); } }, 'Bring back the old results')) : null),
      h('section', { class: 'card' }, h('h3', null, 'Export'),
        h('p', { class: 'small' }, 'A versioned JSON file with every attempt, daily result, level and scratchpad. On iPhone, choose “Save to Files”.'),
        h('button', { class: 'btn', onclick: async function () {
          var data = JSON.stringify(M.exportData());
          var name = 'puzzle-lab-' + PL.dateKey() + '.json';
          try {
            var file = new File([data], name, { type: 'application/json' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Puzzle Lab backup' }); toast('Backup shared.', 'good'); return; }
          } catch (e) { if (e && e.name === 'AbortError') return; }
          exportOut.innerHTML = '';
          var out = h('textarea', { class: 'txt area mono', rows: 5, readonly: true }, data);
          exportOut.appendChild(h('div', null, h('p', { class: 'small' }, 'Copy this text and save it somewhere safe:'), out, h('button', { class: 'btn sm', onclick: function () { out.select(); try { navigator.clipboard.writeText(data).then(function () { toast('Copied.', 'good'); }, function () { toast('Select the text and copy it manually.', ''); }); } catch (e) { toast('Select the text and copy it manually.', ''); } } }, 'Copy')));
        } }, 'Export data'), exportOut),
      h('section', { class: 'card' }, h('h3', null, 'Restore or import'), h('p', { class: 'small' }, 'Pick a backup file, or one exported from the earlier Claude version of Puzzle Lab. Logic Lab history is kept for review; its puzzles are no longer offered.'), fileIn, ta, impMsg, impBtns),
      h('section', { class: 'card' }, h('h3', null, 'About'), h('p', { class: 'small muted' }, 'Puzzles are generated on the phone from seeds and checked before you see them: loop puzzles by an exhaustive solver, word bridges by shortest-path search, maths, balance and reverse puzzles by exact arithmetic and exhaustive search, and island rules by fixed tests. Word games use curated banks; The Island also uses WordNet (Princeton University) and the CMU Pronouncing Dictionary. Works offline. Data format version ' + PL.SCHEMA + '.')));
  }

  // test hooks (used by the automated browser tests)
  PL._cur = function () { return cur; };
  PL._go = function (sc) { go(sc); };
  PL._testFinish = function (o) { finish(o); };
  /* ---------- boot ---------- */
  PL.showUpdate = function (apply) {
    if (document.getElementById('upd')) return;
    var bar = h('div', { id: 'upd', class: 'update-bar', role: 'status' }, h('span', null, 'A new version of Puzzle Lab is ready.'), h('button', { class: 'btn sm primary', onclick: function () { if (cur && !cur.done) { tickNow(); persistRec(); } PL.store.flush(); apply(); } }, 'Update'));
    document.body.appendChild(bar);
  };
  PL.boot = async function () {
    root = document.getElementById('app');
    root.appendChild(h('div', { class: 'boot muted' }, 'Loading your puzzles…'));
    await PL.store.init();
    M.core();
    try { M.upgradeRecords(); } catch (e) { console.error(e); }
    render();
    PL.store.onChange(function (ev) { if (ev === 'error') toast('Saving failed on this device. Export a backup from Settings.', 'bad'); });
    M.pruneScratch();
  };
})();

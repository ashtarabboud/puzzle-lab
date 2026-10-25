/* ===== Data model: settings, ratings (adaptive difficulty), attempts, daily quiz ===== */
(function () {
  var S = function () { return PL.store; };
  var GEN_VERSION = 1;
  PL.GEN_VERSION = GEN_VERSION;

  function defaultCore() {
    var ratings = {};
    PL.order.concat(PL.retired).forEach(function (g) { ratings[g] = { level: 3, highest: 3, changes: [], since: 0 }; });
    return { schema: PL.SCHEMA, settings: { timed: false, excluded: [], adjIndex: false }, ratings: ratings, shuffle: { recent: [] }, created: Date.now() };
  }
  PL.migrate = function (core) { // schema migrations for exported/stored data
    if (!core) return defaultCore();
    if (!core.schema) core.schema = 1;
    if (core.schema < 2) { // v2: ten games; Logic Lab retired (its rating is kept for the record); Reverse Engineer and Word Links added
      core.schema = 2;
      if (core.settings && core.settings.excluded) core.settings.excluded = core.settings.excluded.filter(function (g) { return PL.order.indexOf(g) >= 0; });
    }
    if (core.schema < 3) core.schema = 3; // v3: seven new games (ratings created below at the default level, independent of other games)
    var d = defaultCore();
    core.settings = Object.assign({}, d.settings, core.settings || {});
    core.ratings = core.ratings || {};
    PL.order.concat(PL.retired).forEach(function (g) { if (!core.ratings[g]) core.ratings[g] = d.ratings[g]; });
    core.shuffle = core.shuffle || { recent: [] };
    return core;
  };
  var M = PL.model = {};
  M.core = function () { var c = S().get('core'); if (!c) { c = defaultCore(); S().put('core', c); } return PL.migrate(c); };
  M.saveCore = function (c) { S().put('core', c); };
  M.settings = function () { return M.core().settings; };
  M.setSetting = function (k, v) { var c = M.core(); c.settings[k] = v; M.saveCore(c); };
  M.rating = function (g) { return M.core().ratings[g]; };

  /* ---- attempts ---- */
  M.attempts = function (filter) {
    var out = [];
    S().keys('att:').forEach(function (k) { var a = S().get(k); if (a && (!filter || filter(a))) out.push(a); });
    out.sort(function (a, b) { return (a.endedAt || 0) - (b.endedAt || 0); });
    return out;
  };
  M.saveAttempt = function (a) { S().put('att:' + a.id, a); };
  M.getAttempt = function (id) { return S().get('att:' + id); };
  // which attempts count toward ordinary statistics
  M.counts = function (a) { return a.mode === 'unlimited' && !a.timed; };
  M.eligible = function (a) { return M.counts(a) && a.outcome !== 'skipped'; };

  /* ---- adaptive difficulty ----
     Effective performance credits harder puzzles: eff = perf + 6 × (attempt level − current level), clamped 0–100.
     Window: eligible attempts since the last level change (at most 20), weighted 0.85^age (newest weight 1).
     Rise: weighted mean ≥ 85 with ≥ 4 attempts (3 during the first 8 attempts of a game) and the latest eff ≥ 70.
     Drop: weighted mean < 65 with ≥ 4 attempts (3 during calibration) and the latest eff < 75.
     The 65–85 band, the reset of the window after each change, and the one-level step provide hysteresis. */
  M.ADAPT = { up: 85, down: 65, minN: 4, calibN: 3, calibAttempts: 8, decay: 0.85, window: 20, levelCredit: 6 };
  M.rollingFor = function (g, rating) {
    rating = rating || M.rating(g);
    var A = M.ADAPT;
    var all = M.attempts(function (a) { return a.game === g && M.eligible(a); });
    var lastChange = rating.changes.length ? rating.changes[rating.changes.length - 1].t : 0;
    var win = all.filter(function (a) { return a.endedAt > lastChange; }).slice(-A.window);
    var effs = win.map(function (a) { return PL.clamp(a.perf + A.levelCredit * (a.level - rating.level), 0, 100); });
    var wsum = 0, tot = 0;
    for (var i = 0; i < effs.length; i++) { var w = Math.pow(A.decay, effs.length - 1 - i); wsum += w; tot += w * effs[i]; }
    return { n: effs.length, mean: effs.length ? tot / wsum : null, latest: effs.length ? effs[effs.length - 1] : null, total: all.length };
  };
  M.adapt = function (g) {
    var c = M.core(), r = c.ratings[g], A = M.ADAPT;
    var roll = M.rollingFor(g, r);
    var minN = roll.total <= A.calibAttempts ? A.calibN : A.minN;
    var change = 0, reason = '';
    if (roll.n >= minN && roll.mean >= A.up && roll.latest >= 70 && r.level < 10) { change = 1; reason = 'Recent performance ' + Math.round(roll.mean) + ' over ' + roll.n + ' puzzles'; }
    else if (roll.n >= minN && roll.mean < A.down && roll.latest < 75 && r.level > 1) { change = -1; reason = 'Recent performance ' + Math.round(roll.mean) + ' over ' + roll.n + ' puzzles'; }
    if (change) {
      var from = r.level; r.level += change; r.highest = Math.max(r.highest, r.level);
      r.changes.push({ t: Date.now(), from: from, to: r.level, reason: reason });
      M.saveCore(c);
    }
    return { change: change, level: r.level, roll: roll };
  };

  /* ---- active unlimited sessions (resumable) ---- */
  M.active = function (g) { return S().get('act:' + g); };
  M.saveActive = function (g, s) { S().put('act:' + g, s); };
  M.clearActive = function (g) { S().del('act:' + g); };

  /* ---- repeat avoidance context ---- */
  M.genContext = function (g) {
    var atts = M.attempts(function (a) { return a.game === g; }).slice(-60);
    var ctx = { recent: [], seenWords: [] };
    atts.forEach(function (a) {
      var p = a.puzzle || {};
      if (p.tkey) ctx.recent.push(p.tkey);
      if (p.words) p.words.forEach(function (w) { ctx.seenWords.push(w.w); });
      if (p.w) ctx.seenWords.push(p.w);
    });
    // words seen in either word game count as seen for both
    if (g === 'password' || g === 'detective') {
      M.attempts(function (a) { return (a.game === 'password' || a.game === 'detective'); }).slice(-80).forEach(function (a) {
        var p = a.puzzle || {}; if (p.words) p.words.forEach(function (w) { ctx.seenWords.push(w.w); }); if (p.w) ctx.seenWords.push(p.w);
      });
    }
    ctx.fingerprints = {}; M.attempts(function (a) { return a.game === g; }).slice(-500).forEach(function (a) { if (a.fp) ctx.fingerprints[a.fp] = 1; });
    return ctx;
  };
  M.newPuzzle = function (g, level, seed, ctx) {
    var G = PL.games[g];
    ctx = ctx || {};
    for (var t = 0; t < 6; t++) {
      var s = seed + (t ? ':' + t : '');
      var p = G.generate(level, PL.rng(s), ctx);
      var fp = PL.hash(JSON.stringify(p)).toString(36);
      if (ctx.fingerprints && ctx.fingerprints[fp]) continue;
      return { puzzle: p, seed: s, fp: fp };
    }
    var p2 = G.generate(level, PL.rng(seed + ':x'), ctx);
    return { puzzle: p2, seed: seed + ':x', fp: PL.hash(JSON.stringify(p2)).toString(36) };
  };

  /* ---- daily quiz ---- */
  var LEVEL = { Easy: 2, Medium: 5, Hard: 8 };
  M.DAILY_LEVEL = LEVEL;
  M.dailyDifficulty = function (date) {
    var cycle = ['Easy', 'Medium', 'Hard', 'Easy', 'Medium', 'Hard', 'Mixed'];
    var n = PL.dayNumber(date);
    return cycle[((n % 7) + 7) % 7];
  };
  M.migrateDay = function (d) { // days created before v2 have nine games scored out of 900
    if (d && !d.games) { d.games = PL.OLD_DAILY_ORDER.slice(); d.max = 900; }
    if (d && !d.max) d.max = d.games.length * 100;
    return d;
  };
  M.daily = function (date) { return M.migrateDay(S().get('day:' + date)); };
  M.saveDaily = function (d) { S().put('day:' + d.date, d); };
  M.ensureDaily = function (date) {
    var d = M.daily(date);
    if (d) return d;
    var diff = M.dailyDifficulty(date), levels = {}, puzzles = {}, prog = {};
    var rng = PL.rng('daily-mix:' + date);
    var games = PL.order.slice(), skipped = [];
    games.forEach(function (g) {
      levels[g] = diff === 'Mixed' ? rng.pick([2, 5, 8]) : LEVEL[diff];
      var seed = 'daily:' + date + ':' + g, p = null;
      for (var t = 0; t < 4 && !p; t++) { try { p = PL.games[g].generate(levels[g], PL.rng(seed + (t ? ':' + t : '')), { daily: true }); if (t) seed += ':' + t; } catch (e) { p = null; } }
      if (!p) { skipped.push(g); return; } // a game whose daily puzzle cannot be built is left out of that day (max adjusts)
      puzzles[g] = { puzzle: p, seed: seed };
      prog[g] = { gs: null, activeMs: 0, hints: 0, wrong: 0, done: false };
    });
    games = games.filter(function (g) { return skipped.indexOf(g) < 0; });
    d = { date: date, diff: diff, games: games, max: games.length * 100, levels: levels, puzzles: puzzles, prog: prog, created: Date.now(), complete: false, v: GEN_VERSION };
    M.saveDaily(d);
    return d;
  };
  /* Daily scoring (documented in the app):
     score = round(0.8 × Q + 0.2 × T), where Q is the game's solution quality (0–100) and
     T = (solved ? 100 × clamp((4B − t) / 3B, 0, 1) : 0) × Q / 100, with t the active seconds and B the benchmark
     seconds for that game and level (full time credit at or under B, none at 4B or beyond). Scaling T by Q means
     fast but sloppy answers earn little time credit, and unsolved puzzles earn none. */
  M.dailyScore = function (g, level, quality, solved, activeMs) {
    var B = PL.games[g].benchmark(level, true), t = activeMs / 1000;
    var T = solved ? 100 * PL.clamp((4 * B - t) / (3 * B), 0, 1) : 0;
    T = T * quality / 100;
    return { score: Math.round(0.8 * quality + 0.2 * T), time: Math.round(T), quality: Math.round(quality), bench: B };
  };
  M.dailyTotals = function (d) {
    var tot = 0, ms = 0, hints = 0, wrong = 0, done = 0;
    M.migrateDay(d);
    d.games.forEach(function (g) { var pr = d.prog[g]; if (!pr) return; if (pr.done) { tot += pr.score || 0; done++; } ms += pr.activeMs || 0; hints += pr.hints || 0; wrong += pr.wrong || 0; });
    return { score: tot, ms: ms, hints: hints, wrong: wrong, done: done, n: d.games.length, max: d.max, pct: d.max ? 100 * tot / d.max : 0 };
  };
  M.dailies = function () { return S().keys('day:').map(function (k) { return M.migrateDay(S().get(k)); }).filter(Boolean).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); };
  M.dayPct = function (d) { return d.max ? 100 * (d.total != null ? d.total : M.dailyTotals(d).score) / d.max : 0; };

  /* ---- scratchpad ---- */
  M.scratch = function (key) { return S().get('scr:' + key) || { draw: [], text: '', grid: null }; };
  M.saveScratch = function (key, v) { S().put('scr:' + key, v); };
  M.pruneScratch = function () { // keep scratch for the newest 300 keys
    var ks = S().keys('scr:'); if (ks.length <= 300) return;
    ks.map(function (k) { return { k: k, u: (S().get(k) || {}).u || 0 }; }).sort(function (a, b) { return a.u - b.u; }).slice(0, ks.length - 300).forEach(function (x) { S().del(x.k); });
  };

  /* ---- export / import ---- */
  M.exportData = function () {
    var raw = S().raw(), out = { app: 'puzzle-lab', schema: PL.SCHEMA, exportedAt: new Date().toISOString(), data: {} };
    Object.keys(raw).forEach(function (k) { out.data[k] = raw[k]; });
    return out;
  };
  M.validateImport = function (obj) {
    if (!obj || obj.app !== 'puzzle-lab' || !obj.data || typeof obj.data !== 'object') return 'This is not a Puzzle Lab export.';
    if (obj.schema > PL.SCHEMA) return 'This export comes from a newer version of Puzzle Lab.';
    return null;
  };
  M.importData = function (obj, mode) {
    var data = PL.deep(obj.data), counts = { attempts: 0, days: 0 };
    if (data.core) data.core = PL.migrate(data.core);
    Object.keys(data).forEach(function (k) {
      if (k.indexOf('day:') === 0) { M.migrateDay(data[k]); counts.days++; }
      if (k.indexOf('att:') === 0) counts.attempts++;
      // in-progress puzzles of retired games cannot be resumed
      if (k.indexOf('act:') === 0 && PL.order.indexOf(k.slice(4)) < 0) delete data[k];
    });
    if (mode === 'replace') { S().replaceAll(data); return counts; }
    var hadAttempts = S().keys('att:').length > 0;
    Object.keys(data).forEach(function (k) {
      if (k === 'core') return;
      var cur = S().get(k), inc = data[k];
      if (!cur || ((inc && inc.u) || 0) > ((cur && cur.u) || 0)) S().put(k, inc);
    });
    if (data.core) {
      var c = M.core();
      if (!hadAttempts) { c.ratings = data.core.ratings; c.shuffle = data.core.shuffle || c.shuffle; }
      else Object.keys(data.core.ratings).forEach(function (g) {
        var a = c.ratings[g], b = data.core.ratings[g];
        var ta = a && a.changes.length ? a.changes[a.changes.length - 1].t : 0, tb = b.changes.length ? b.changes[b.changes.length - 1].t : 0;
        if (!a || tb > ta) c.ratings[g] = b;
      });
      M.saveCore(c);
    }
    return counts;
  };
})();

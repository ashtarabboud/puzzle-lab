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
    if (core.schema < 4) core.schema = 4; // v4: Word Rush scoring v2; old results are re-scored by M.upgradeRecords (originals kept in a.v1); daily order lists
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

  /* ---- record upgrades (idempotent; run at start-up, after import and after bringing back reset results) ----
     Word Rush v1 scores compared points with a small target, so almost every round scored 100 and pushed the level up.
     Each v1 unlimited round is re-scored with v2 from its stored board, words found and hints. The original numbers stay
     on the record (a.v1 = {quality, perf, target, points}) and the round's review says it was re-scored. Daily quiz
     results are never changed. Then the Word Rush level is recalibrated by replaying the normal adaptive rules over the
     re-scored rounds, so the level reflects real coverage across many games rather than the old inflated scores. */
  M.replayLevel = function (g) {
    var A = M.ADAPT, atts = M.attempts(function (a) { return a.game === g && M.eligible(a); });
    if (!atts.length) return null;
    var L = atts[0].level, since = 0, ups = 0, downs = 0;
    atts.forEach(function (a, idx) {
      var win = atts.slice(since, idx + 1).slice(-A.window);
      var effs = win.map(function (x) { return PL.clamp(x.perf + A.levelCredit * (x.level - L), 0, 100); });
      var wsum = 0, tot = 0; for (var i = 0; i < effs.length; i++) { var w = Math.pow(A.decay, effs.length - 1 - i); wsum += w; tot += w * effs[i]; }
      var mean = tot / wsum, latest = effs[effs.length - 1], minN = idx + 1 <= A.calibAttempts ? A.calibN : A.minN;
      if (effs.length >= minN && mean >= A.up && latest >= 70 && L < 10) { L++; ups++; since = idx + 1; }
      else if (effs.length >= minN && mean < A.down && latest < 75 && L > 1) { L--; downs++; since = idx + 1; }
    });
    return { level: L, n: atts.length };
  };
  M.upgradeRecords = function () {
    var G = PL.games.wordrush, n = 0;
    if (G && G.rescore) M.attempts(function (a) { return a.game === 'wordrush' && a.mode === 'unlimited'; }).forEach(function (a) {
      var r = null; try { r = G.rescore(a); } catch (e) { r = null; } // a damaged record is left exactly as it was
      if (!r) return;
      a.v1 = r.v1; a.quality = r.quality; a.perf = r.perf; a.metrics = Object.assign({}, a.metrics, r.metrics); a.rescoredAt = Date.now();
      a.lines = (a.lines || []).concat([['Scoring', 'Re-scored with Word Rush scoring v2: ' + r.perf + ' (was ' + r.v1.perf + ' under v1, kept on record)']]);
      M.saveAttempt(a); n++;
    });
    var c0 = M.core(), rt0 = c0.ratings.wordrush;
    if (rt0 && (n || (!rt0.v2cal && M.attempts(function (a) { return a.game === 'wordrush' && a.v1; }).length))) {
      var rep = M.replayLevel('wordrush'), c = M.core(), rt = c.ratings.wordrush;
      if (rep && rep.level !== rt.level) {
        rt.changes.push({ t: Date.now(), from: rt.level, to: rep.level, reason: 'Recalibrated after re-scoring Word Rush rounds with scoring v2' });
        rt.level = rep.level;
      }
      rt.v2cal = true; M.saveCore(c);
    }
    return n;
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
  /* Daily order: each new day gets its own shuffled order (seeded by the date, stored on the day, so it never changes
     while the day lasts). Days created before this have no order and keep the fixed order they were shown in. */
  M.dayOrder = function (d) { var o = (d.order || []).filter(function (g) { return d.games.indexOf(g) >= 0; }); return o.length === d.games.length ? o : d.games.slice(); };
  M.dayStarted = function (d) { return d.games.some(function (g) { var pr = d.prog[g]; return pr && (pr.gs || pr.done || pr.activeMs); }); };
  M.nextDailyGame = function (d, after) { // the next unfinished game in the day's order after `after`, wrapping round; null when all are done
    var o = M.dayOrder(d), i = o.indexOf(after);
    for (var k = 1; k <= o.length; k++) { var g = o[(i + k + o.length) % o.length]; if (g !== after && d.prog[g] && !d.prog[g].done) return g; }
    return null;
  };
  function dailyPuzzle(date, g, level) {
    var seed = 'daily:' + date + ':' + g, p = null;
    for (var t = 0; t < 4 && !p; t++) { try { p = PL.games[g].generate(level, PL.rng(seed + (t ? ':' + t : '')), { daily: true }); if (t) seed += ':' + t; } catch (e) { p = null; } }
    return p ? { puzzle: p, seed: seed } : null;
  }
  /* A day created earlier today that nobody has started yet is brought up to the current format (shuffled order,
     five-word Password). A day that has been started is never changed: same puzzles, same order. */
  M.upgradeDay = function (d) {
    if (!d) return d;
    // today's quiz was marked finished after nine puzzles by an old check, even with games left: reopen it (scores kept)
    if (d.complete && d.date === PL.dateKey() && d.games.some(function (g) { return d.prog[g] && !d.prog[g].done; })) { d.complete = false; delete d.total; delete d.completedAt; d.reopened = Date.now(); M.saveDaily(d); }
    if (d.fmt >= 2 || d.complete) return d;
    if (M.dayStarted(d)) { d.fmt = 1; M.saveDaily(d); return d; }
    d.order = PL.rng('daily-order:' + d.date).shuffle(d.games.slice());
    if (d.puzzles.password && (d.puzzles.password.puzzle.n || 1) < 5) { var np = dailyPuzzle(d.date, 'password', d.levels.password); if (np) d.puzzles.password = np; }
    d.fmt = 2; M.saveDaily(d);
    return d;
  };
  M.saveDaily = function (d) { S().put('day:' + d.date, d); };
  M.ensureDaily = function (date) {
    var d = M.daily(date);
    if (d) return date === PL.dateKey() ? M.upgradeDay(d) : d;
    var diff = M.dailyDifficulty(date), levels = {}, puzzles = {}, prog = {};
    var rng = PL.rng('daily-mix:' + date);
    var games = PL.order.slice(), skipped = [];
    games.forEach(function (g) {
      levels[g] = diff === 'Mixed' ? rng.pick([2, 5, 8]) : LEVEL[diff];
      var dp = dailyPuzzle(date, g, levels[g]);
      if (!dp) { skipped.push(g); return; } // a game whose daily puzzle cannot be built is left out of that day (max adjusts)
      puzzles[g] = dp;
      prog[g] = { gs: null, activeMs: 0, hints: 0, wrong: 0, done: false };
    });
    games = games.filter(function (g) { return skipped.indexOf(g) < 0; });
    d = { date: date, diff: diff, games: games, order: PL.rng('daily-order:' + date).shuffle(games.slice()), fmt: 2, max: games.length * 100, levels: levels, puzzles: puzzles, prog: prog, created: Date.now(), complete: false, v: GEN_VERSION };
    M.saveDaily(d);
    return d;
  };
  /* Daily scoring (documented in the app):
     score = round(0.8 × Q + 0.2 × T), where Q is the game's solution quality (0–100) and
     T = (solved ? 100 × clamp((4B − t) / 3B, 0, 1) : 0) × Q / 100, with t the active seconds and B the benchmark
     seconds for that game and level (full time credit at or under B, none at 4B or beyond). Scaling T by Q means
     fast but sloppy answers earn little time credit, and unsolved puzzles earn none. */
  M.dailyScore = function (g, level, quality, solved, activeMs, p) {
    var B = PL.games[g].benchmark(level, true, p), t = activeMs / 1000;
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

  /* ---- fresh start ----
     Clears statistics, difficulty levels, daily results and in-progress puzzles, then rebuilds today's daily quiz
     with the current game list. Nothing is destroyed: the cleared records are kept under 'arc:<time>' (included in
     exports, ignored by statistics) so M.undoFreshStart can put them back. Settings are kept. */
  var CLEARED = ['att:', 'day:', 'act:'];
  M.freshStart = function (today) {
    var c = M.core(), arc = { at: Date.now(), ratings: PL.deep(c.ratings), recent: (c.shuffle.recent || []).slice(), data: {} };
    CLEARED.forEach(function (pre) { S().keys(pre).forEach(function (k) { arc.data[k] = S().get(k); }); });
    var n = Object.keys(arc.data).filter(function (k) { return k.indexOf('att:') === 0; }).length;
    S().put('arc:' + arc.at, arc);
    Object.keys(arc.data).forEach(function (k) { S().del(k); });
    c.ratings = defaultCore().ratings; c.shuffle.recent = []; c.freshAt = arc.at; M.saveCore(c);
    M.ensureDaily(today || PL.dateKey());
    return { attempts: n, archive: 'arc:' + arc.at };
  };
  M.lastArchive = function () { var ks = S().keys('arc:').sort(); return ks.length ? S().get(ks[ks.length - 1]) : null; };
  M.undoFreshStart = function () { // puts the archived records back; anything played since the reset is kept too
    var ks = S().keys('arc:').sort(); if (!ks.length) return null;
    var arc = S().get(ks[ks.length - 1]), c = M.core(), back = 0;
    Object.keys(arc.data).forEach(function (k) {
      if (k.indexOf('att:') === 0) { S().put(k, arc.data[k]); back++; }
      else if (!S().get(k)) S().put(k, arc.data[k]); // a daily or active puzzle started after the reset wins
    });
    c.ratings = PL.migrate({ schema: PL.SCHEMA, ratings: arc.ratings }).ratings; c.shuffle.recent = arc.recent || []; delete c.freshAt; M.saveCore(c);
    S().del(ks[ks.length - 1]);
    M.upgradeRecords();
    return { attempts: back };
  };

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
    if (mode === 'replace') { S().replaceAll(data); M.upgradeRecords(); return counts; }
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
    M.upgradeRecords();
    return counts;
  };
})();

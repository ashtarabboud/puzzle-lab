/* ===== GAME 5: ALGEBRA ARCADE ===== */
(function () {
  var h = PL.h, Q = PL.Q;
  var NAMES = ['Ava', 'Ben', 'Chloe', 'Dev', 'Elena', 'Farid', 'Grace', 'Hugo', 'Iris', 'Jonah', 'Kira', 'Leo', 'Maya', 'Nico', 'Omar', 'Priya', 'Quinn', 'Rosa', 'Sam', 'Tara', 'Umar', 'Vera', 'Wes', 'Yara', 'Zane'];
  function names(rng, k) { return rng.shuffle(NAMES).slice(0, k); }
  function money(x) { var v = typeof x === 'number' ? x : PL.qval(x); return '$' + (Math.round(v * 100) % 100 ? v.toFixed(2) : String(Math.round(v))); }
  function frac(q) { return PL.qstr(q); }
  function between(x, lo, hi) { return x >= lo && x <= hi; }

  /* Each template: function(rng, lv) -> object or null.
     Common fields: topic, text, ask, ans (Q) | ansIdx, unit, steps[], optional: eq + eqWrong (for equation format), ask2/ans2 (multi-part) */
  var T = {};

  T.consecutive = { topic: 'Number relationships', lv: [1, 4], f: function (rng, lv) {
    var k = rng.int(3, lv >= 3 ? 5 : 4), kind = rng.pick(['', 'even ', 'odd ']), step = kind ? 2 : 1;
    var first = rng.int(5, 40); if (kind === 'even ' && first % 2) first++; if (kind === 'odd ' && !(first % 2)) first++;
    var sum = 0; for (var i = 0; i < k; i++) sum += first + i * step;
    var largest = first + (k - 1) * step;
    var offs = []; for (i = 0; i < k; i++) offs.push(i * step);
    var offSum = offs.reduce(function (a, b) { return a + b; }, 0);
    return { text: 'The sum of ' + k + ' consecutive ' + kind + 'integers is ' + sum + '.', ask: 'What is the largest of them?', ans: Q(largest), unit: '',
      eq: 'n' + offs.slice(1).map(function (o) { return ' + (n + ' + o + ')'; }).join('') + ' = ' + sum,
      eqWrong: ['n' + offs.slice(1).map(function (o, j) { return ' + (n + ' + (j + 1) + ')'; }).join('') + ' = ' + sum, k + 'n = ' + sum, 'n + ' + (k - 1) * step + ' = ' + sum].filter(function (e, j) { return !(step === 1 && j === 0); }),
      eqVar: 'n = the smallest integer',
      steps: ['Let the smallest be n. The integers are ' + offs.map(function (o) { return o ? 'n + ' + o : 'n'; }).join(', ') + '.', 'Their sum is ' + k + 'n + ' + offSum + ' = ' + sum + ', so ' + k + 'n = ' + (sum - offSum) + ' and n = ' + first + '.', 'The largest is ' + first + ' + ' + (k - 1) * step + ' = ' + largest + '.'] };
  } };

  T.ratioShare = { topic: 'Ratios and proportions', lv: [1, 4], f: function (rng, lv) {
    var nm = names(rng, 3), parts = [rng.int(1, 5), rng.int(2, 6), rng.int(1, 7)];
    if (lv < 3) parts = parts.slice(0, 2);
    var unitV = rng.int(3, 15) * (lv < 3 ? 5 : 4), tot = parts.reduce(function (a, b) { return a + b; }, 0) * unitV;
    var who = rng.int(0, parts.length - 1);
    var ratio = parts.join(':');
    return { text: nm.slice(0, parts.length).join(lv < 3 ? ' and ' : ', ').replace(/, ([^,]*)$/, ' and $1') + ' share ' + money(tot) + ' in the ratio ' + ratio + ' (in that order).', ask: 'How much does ' + nm[who] + ' get?', ans: Q(parts[who] * unitV), unit: '$',
      steps: ['The ratio has ' + parts.join(' + ') + ' = ' + (tot / unitV) + ' equal parts.', 'One part is ' + money(tot) + ' ÷ ' + (tot / unitV) + ' = ' + money(unitV) + '.', nm[who] + ' gets ' + parts[who] + ' parts: ' + parts[who] + ' × ' + money(unitV) + ' = ' + money(parts[who] * unitV) + '.'] };
  } };

  T.agesTimes = { topic: 'Ages', lv: [2, 6], f: function (rng) {
    for (var t = 0; t < 200; t++) {
      var b = rng.int(4, 16), k = rng.int(2, 5), n = rng.int(2, 15), a = k * b;
      var num = a + n, den = b + n; if (num % den) continue;
      var m = num / den; if (m < 2 || m >= k) continue;
      var nm = names(rng, 2);
      return { text: nm[0] + ' is ' + k + ' times as old as ' + nm[1] + '. In ' + n + ' years, ' + nm[0] + ' will be ' + (m === 2 ? 'twice' : m + ' times') + ' as old as ' + nm[1] + '.', ask: 'How old is ' + nm[1] + ' now?', ans: Q(b), unit: 'years',
        eq: k + 'x + ' + n + ' = ' + m + '(x + ' + n + ')', eqWrong: [k + 'x + ' + n + ' = ' + m + 'x + ' + n, k + '(x + ' + n + ') = ' + m + '(x + ' + n + ')', k + 'x = ' + m + '(x + ' + n + ')'], eqVar: 'x = ' + nm[1] + '’s age now',
        steps: ['Let ' + nm[1] + ' be x now, so ' + nm[0] + ' is ' + k + 'x.', 'In ' + n + ' years: ' + k + 'x + ' + n + ' = ' + m + '(x + ' + n + ').', 'Expand: ' + k + 'x + ' + n + ' = ' + m + 'x + ' + (m * n) + ', so ' + (k - m) + 'x = ' + (m * n - n) + ' and x = ' + b + '.'] };
    }
    return null;
  } };

  T.agesSumDiff = { topic: 'Ages', lv: [3, 7], f: function (rng) {
    var a = rng.int(20, 60), b = rng.int(8, a - 6), y = rng.int(2, Math.min(b - 1, 12));
    var nm = names(rng, 2);
    var S = a + b, ago = (a - y) - (b - y);
    var r = (a - y) / (b - y);
    if (Number.isInteger(r) && r >= 2 && r <= 6) {
      return { text: 'The sum of ' + nm[0] + '’s and ' + nm[1] + '’s ages is ' + S + '. ' + y + ' years ago, ' + nm[0] + ' was ' + (r === 2 ? 'twice' : r + ' times') + ' as old as ' + nm[1] + '.', ask: 'How old is ' + nm[0] + ' now?', ans: Q(a), unit: 'years',
        ask2: 'How old is ' + nm[1] + ' now?', ans2: Q(b),
        eq: '(' + S + ' − x) − ' + y + ' = ' + r + '(x − ' + y + ')', eqWrong: [S + ' − x − ' + y + ' = ' + r + 'x', '(' + S + ' − x) = ' + r + '(x − ' + y + ')', '(' + S + ' − x) − ' + y + ' = ' + r + 'x − ' + y], eqVar: 'x = ' + nm[1] + '’s age now',
        steps: ['Let ' + nm[1] + ' be x; then ' + nm[0] + ' is ' + S + ' − x.', y + ' years ago: (' + S + ' − x) − ' + y + ' = ' + r + '(x − ' + y + ').', 'So ' + (S - y) + ' − x = ' + r + 'x − ' + (r * y) + ', giving ' + (r + 1) + 'x = ' + (S - y + r * y) + ' and x = ' + b + '.', nm[0] + ' is ' + S + ' − ' + b + ' = ' + a + '.'] };
    }
    return null;
  } };

  T.coins = { topic: 'Systems of equations', lv: [3, 6], f: function (rng) {
    var items = rng.pick([['adult tickets', 'child tickets', 'tickets'], ['large boxes', 'small boxes', 'boxes'], ['quarters', 'dimes', 'coins']]);
    var p1, p2;
    if (items[2] === 'coins') { p1 = 25; p2 = 10; } else { p1 = rng.int(8, 18); p2 = rng.int(3, p1 - 2); }
    var x = rng.int(5, 30), y = rng.int(5, 30), n = x + y, v = p1 * x + p2 * y;
    var fmt = items[2] === 'coins' ? function (c) { return money(c / 100); } : money;
    var priceTxt = items[2] === 'coins' ? '' : ' ' + PL.cap(items[0]) + ' cost ' + money(p1) + ' each and ' + items[1] + ' cost ' + money(p2) + ' each.';
    return { text: 'A total of ' + n + ' ' + items[2] + ' were ' + (items[2] === 'coins' ? 'in a jar, all quarters and dimes, worth ' : 'sold for ') + fmt(v) + '.' + priceTxt, ask: 'How many ' + items[0] + ' were there?', ans: Q(x), unit: '',
      ask2: 'How many ' + items[1] + '?', ans2: Q(y),
      eq: p1 + 'x + ' + p2 + '(' + n + ' − x) = ' + v, eqWrong: [p1 + 'x + ' + p2 + 'x = ' + v, p2 + 'x + ' + p1 + '(' + n + ' − x) = ' + v, p1 + 'x + ' + p2 + '(' + n + ' + x) = ' + v], eqVar: 'x = number of ' + items[0] + (items[2] === 'coins' ? ' (values in cents)' : ''),
      steps: ['Let x be the ' + items[0] + '; then there are ' + n + ' − x ' + items[1] + '.', 'Value: ' + p1 + 'x + ' + p2 + '(' + n + ' − x) = ' + v + (items[2] === 'coins' ? ' (in cents)' : '') + '.', (p1 - p2) + 'x + ' + (p2 * n) + ' = ' + v + ', so ' + (p1 - p2) + 'x = ' + (v - p2 * n) + ' and x = ' + x + '.', items[1] + ': ' + n + ' − ' + x + ' = ' + y + '.'] };
  } };

  T.mixture = { topic: 'Mixtures', lv: [4, 7], f: function (rng) {
    for (var t = 0; t < 300; t++) {
      var p = rng.int(1, 6) * 5, q = rng.int(p / 5 + 2, 18) * 5, x = rng.int(2, 12) * (rng.chance(0.5) ? 5 : 2);
      var r = rng.int(p / 5 + 1, q / 5 - 1) * 5;
      var y = Q(x * (r - p), q - r); // p x + q y = r (x+y)
      if (y.d !== 1 || y.n <= 0 || y.n > 200) continue;
      var sub = rng.pick(['salt solution', 'acid solution', 'juice blend (percent juice)', 'alloy (percent copper)']);
      var u = sub.indexOf('alloy') >= 0 ? 'kg' : 'litres';
      return { text: 'You have ' + x + ' ' + u + ' of a ' + p + '% ' + sub + '. You want to add some ' + q + '% ' + sub.replace(/ \(.*\)/, '') + ' so the mixture is ' + r + '%.', ask: 'How many ' + u + ' of the ' + q + '% mixture should you add?', ans: y, unit: u,
        eq: '0.' + pad(p) + '(' + x + ') + 0.' + pad(q) + 'y = 0.' + pad(r) + '(' + x + ' + y)', eqWrong: ['0.' + pad(p) + '(' + x + ') + 0.' + pad(q) + 'y = 0.' + pad(r) + 'y', '0.' + pad(p) + ' + 0.' + pad(q) + ' = 0.' + pad(r) + '(' + x + ' + y)', '0.' + pad(p) + '(' + x + ') + 0.' + pad(q) + 'y = 0.' + pad(r) + '(' + x + ')'], eqVar: 'y = ' + u + ' added',
        steps: ['Track the pure ingredient. Start: ' + p + '% of ' + x + ' = ' + fmtNum(p * x / 100) + '.', 'Added: ' + q + '% of y. Final: ' + r + '% of (' + x + ' + y).', p * x / 100 + ' + ' + q / 100 + 'y = ' + r / 100 + '(' + x + ' + y) → ' + fmtNum((q - r) / 100) + 'y = ' + fmtNum((r - p) * x / 100) + ' → y = ' + y.n + '.'] };
    }
    return null;
  } };
  function pad(p) { return (p < 10 ? '0' : '') + p; }
  function fmtNum(v) { return String(Math.round(v * 1000) / 1000); }

  T.meet = { topic: 'Distance, speed, and time', lv: [3, 6], f: function (rng) {
    for (var t = 0; t < 200; t++) {
      var v1 = rng.int(4, 16) * 5, v2 = rng.int(4, 16) * 5, tm = Q(rng.int(1, 8), rng.pick([1, 2, 4]));
      var D = PL.qmul(Q(v1 + v2), tm); if (D.d !== 1) continue;
      var nm = names(rng, 2), mode = rng.pick(['meet', 'chase']);
      if (mode === 'meet') {
        return { text: 'Two towns are ' + D.n + ' km apart. ' + nm[0] + ' drives from one toward the other at ' + v1 + ' km/h; at the same moment ' + nm[1] + ' drives from the other town toward the first at ' + v2 + ' km/h.', ask: 'After how many hours do they meet?', ans: tm, unit: 'hours',
          eq: v1 + 't + ' + v2 + 't = ' + D.n, eqWrong: [v1 + 't − ' + v2 + 't = ' + D.n, '(' + v1 + ' + ' + v2 + ')/t = ' + D.n, v1 + 't = ' + v2 + 't + ' + D.n], eqVar: 't = hours until they meet',
          steps: ['They close the gap at ' + v1 + ' + ' + v2 + ' = ' + (v1 + v2) + ' km/h.', 'Time = ' + D.n + ' ÷ ' + (v1 + v2) + ' = ' + frac(tm) + ' hours.'] };
      }
      if (v1 <= v2) continue;
      var head = rng.int(1, 3);
      var gap = v2 * head, ct = Q(gap, v1 - v2);
      if (ct.d > 4) continue;
      return { text: nm[1] + ' leaves home cycling at ' + v2 + ' km/h. ' + head + ' hour' + (head > 1 ? 's' : '') + ' later ' + nm[0] + ' sets off along the same road at ' + v1 + ' km/h.', ask: 'How many hours after ' + nm[0] + ' starts does ' + nm[0] + ' catch up?', ans: ct, unit: 'hours',
        eq: v1 + 't = ' + v2 + '(t + ' + head + ')', eqWrong: [v1 + 't = ' + v2 + 't', v1 + '(t + ' + head + ') = ' + v2 + 't', v1 + 't + ' + v2 + 't = ' + gap], eqVar: 't = hours after ' + nm[0] + ' starts',
        steps: [nm[1] + ' has a head start of ' + v2 + ' × ' + head + ' = ' + gap + ' km.', nm[0] + ' gains ' + v1 + ' − ' + v2 + ' = ' + (v1 - v2) + ' km each hour.', 'Time = ' + gap + ' ÷ ' + (v1 - v2) + ' = ' + frac(ct) + ' hours.'] };
    }
    return null;
  } };

  T.roundTrip = { topic: 'Distance, speed, and time', lv: [6, 9], f: function (rng) {
    for (var t = 0; t < 200; t++) {
      var a = rng.int(3, 15) * 5, b = rng.int(3, 15) * 5; if (a === b) continue;
      var avg = Q(2 * a * b, a + b); if (avg.d !== 1) continue;
      var d = rng.int(2, 12) * 30;
      return { text: 'A courier drives ' + d + ' km to a depot at ' + a + ' km/h and returns by the same road at ' + b + ' km/h.', ask: 'What is the average speed for the whole round trip, in km/h?', ans: avg, unit: 'km/h',
        steps: ['Time out: ' + d + ' ÷ ' + a + ' = ' + frac(Q(d, a)) + ' h. Time back: ' + d + ' ÷ ' + b + ' = ' + frac(Q(d, b)) + ' h.', 'Total distance ' + (2 * d) + ' km over ' + frac(PL.qadd(Q(d, a), Q(d, b))) + ' h.', 'Average = ' + (2 * d) + ' ÷ ' + frac(PL.qadd(Q(d, a), Q(d, b))) + ' = ' + avg.n + ' km/h (not ' + (a + b) / 2 + ', the simple mean of the speeds).'] };
    }
    return null;
  } };

  T.work = { topic: 'Work rates', lv: [4, 7], f: function (rng, lv) {
    for (var t = 0; t < 200; t++) {
      var a = rng.int(2, 12), b = rng.int(2, 15); if (a === b) continue;
      var nm = names(rng, 2), job = rng.pick(['paint a fence', 'grade a stack of exams', 'clear a garden', 'assemble a batch of shelves']);
      if (lv < 6 || rng.chance(0.5)) {
        var tt = Q(a * b, a + b); if (tt.d > 6) continue;
        return { text: nm[0] + ' can ' + job + ' alone in ' + a + ' hours. ' + nm[1] + ' can do it alone in ' + b + ' hours.', ask: 'How many hours does it take if they work together? (A fraction is fine.)', ans: tt, unit: 'hours',
          eq: 't/' + a + ' + t/' + b + ' = 1', eqWrong: [a + 't + ' + b + 't = 1', 't = (' + a + ' + ' + b + ')/2', '1/' + a + ' + 1/' + b + ' = t'], eqVar: 't = hours together',
          steps: ['Rates: ' + nm[0] + ' does 1/' + a + ' of the job per hour, ' + nm[1] + ' 1/' + b + '.', 'Together: 1/' + a + ' + 1/' + b + ' = ' + frac(Q(a + b, a * b)) + ' per hour.', 'Time = 1 ÷ ' + frac(Q(a + b, a * b)) + ' = ' + frac(tt) + ' hours.'] };
      }
      var s = rng.int(1, a - 1); // A works s hours alone, then both finish
      var rem = PL.qsub(Q(1), Q(s, a)); var tt2 = PL.qdiv(rem, Q(a + b, a * b));
      if (tt2.d > 6 || tt2.n <= 0) continue;
      return { text: nm[0] + ' can ' + job + ' alone in ' + a + ' hours; ' + nm[1] + ' alone takes ' + b + ' hours. ' + nm[0] + ' works alone for ' + s + ' hour' + (s > 1 ? 's' : '') + ', then ' + nm[1] + ' joins and they finish together.', ask: 'How many hours do they work together?', ans: tt2, unit: 'hours',
        steps: ['In ' + s + ' h, ' + nm[0] + ' completes ' + frac(Q(s, a)) + ' of the job, leaving ' + frac(rem) + '.', 'Together they do 1/' + a + ' + 1/' + b + ' = ' + frac(Q(a + b, a * b)) + ' per hour.', 'Time = ' + frac(rem) + ' ÷ ' + frac(Q(a + b, a * b)) + ' = ' + frac(tt2) + ' hours.'] };
    }
    return null;
  } };

  T.pipes = { topic: 'Work rates', lv: [7, 10], f: function (rng) {
    for (var t = 0; t < 300; t++) {
      var a = rng.int(2, 10), b = rng.int(2, 10), c = rng.int(4, 24);
      var rate = PL.qsub(PL.qadd(Q(1, a), Q(1, b)), Q(1, c)); if (rate.n <= 0) continue;
      var tt = PL.qdiv(Q(1), rate); if (tt.d > 4 || PL.qval(tt) > 20) continue;
      return { text: 'Pipe A fills a tank in ' + a + ' hours and pipe B fills it in ' + b + ' hours. A drain empties the full tank in ' + c + ' hours. All three are opened on an empty tank.', ask: 'How many hours until the tank is full?', ans: tt, unit: 'hours',
        eq: 't/' + a + ' + t/' + b + ' − t/' + c + ' = 1', eqWrong: ['t/' + a + ' + t/' + b + ' + t/' + c + ' = 1', a + ' + ' + b + ' − ' + c + ' = t', 't/' + a + ' + t/' + b + ' = t/' + c], eqVar: 't = hours to fill',
        steps: ['Net rate = 1/' + a + ' + 1/' + b + ' − 1/' + c + ' = ' + frac(rate) + ' tank per hour.', 'Time = 1 ÷ ' + frac(rate) + ' = ' + frac(tt) + ' hours.'] };
    }
    return null;
  } };

  T.percentSeq = { topic: 'Percentages', lv: [2, 6], f: function (rng, lv) {
    for (var t = 0; t < 200; t++) {
      var up = rng.int(1, 6) * 5, down = rng.int(1, 6) * 5;
      var final = rng.int(4, 40) * 10;
      var orig = PL.qdiv(Q(final), PL.qmul(Q(100 + up, 100), Q(100 - down, 100)));
      if (orig.d !== 1 || (100 + up) * (100 - down) === 10000 || lv < 3 && orig.n > 500) continue;
      var item = rng.pick(['jacket', 'bicycle', 'lamp', 'printer', 'desk chair']);
      return { text: 'A store raises the price of a ' + item + ' by ' + up + '%, then later puts it on sale at ' + down + '% off the new price. The sale price is ' + money(final) + '.', ask: 'What was the original price?', ans: orig, unit: '$',
        eq: 'p × ' + fmtNum(1 + up / 100) + ' × ' + fmtNum(1 - down / 100) + ' = ' + final, eqWrong: ['p × ' + fmtNum(1 + (up - down) / 100) + ' = ' + final, 'p + ' + up + ' − ' + down + ' = ' + final, 'p × ' + fmtNum(1 + up / 100) + ' − ' + fmtNum(down / 100) + ' = ' + final], eqVar: 'p = original price',
        steps: ['Each change multiplies the price: × ' + fmtNum(1 + up / 100) + ' then × ' + fmtNum(1 - down / 100) + '.', 'p × ' + fmtNum((1 + up / 100) * (1 - down / 100)) + ' = ' + final + '.', 'p = ' + final + ' ÷ ' + fmtNum((1 + up / 100) * (1 - down / 100)) + ' = ' + orig.n + '.'] };
    }
    return null;
  } };

  T.percentOf = { topic: 'Percentages', lv: [1, 3], f: function (rng) {
    var tot = rng.int(4, 30) * 20, pct = rng.pick([5, 10, 15, 20, 25, 30, 35, 40, 45, 60, 75]), part = tot * pct / 100;
    var what = rng.pick(['students in a school play an instrument', 'trees in an orchard are apple trees', 'emails received this month were spam']);
    if (rng.chance(0.5)) return { text: pct + '% of the ' + what.replace(/ (play|are|were) /, ' $1 ') + '. There are ' + tot + ' in total.', ask: 'How many is that?', ans: Q(part), unit: '', steps: [pct + '% means ' + pct + '/100.', pct + '/100 × ' + tot + ' = ' + part + '.'] };
    return { text: 'Of ' + tot + ' ' + what.split(' ')[0] + ', ' + part + ' ' + what.split(' ').slice(1).join(' ').replace(/^in (a|an) [a-z]+ /, '').replace(/^this month /, '') + (what.indexOf('school') >= 0 ? ' (in this school).' : '.'), ask: 'What percent is that?', ans: Q(pct), unit: '%', steps: ['Percent = part ÷ whole × 100.', part + ' ÷ ' + tot + ' × 100 = ' + pct + '%.'] };
  } };

  T.netChange = { topic: 'Percentages', lv: [5, 8], f: function (rng) {
    var x = rng.int(2, 8) * 5; var net = Q(-x * x, 100);
    return { text: 'A share price rises ' + x + '% on Monday and falls ' + x + '% on Tuesday.', ask: 'What is the overall percent change? (Use a negative number for a decrease.)', ans: net, unit: '%',
      steps: ['Multiply the factors: ' + fmtNum(1 + x / 100) + ' × ' + fmtNum(1 - x / 100) + ' = ' + fmtNum(1 - x * x / 10000) + '.', 'That is a change of ' + fmtNum(-x * x / 100) + '%. The two moves do not cancel, because the fall applies to a larger amount.'] };
  } };

  T.probBag = { topic: 'Probability', lv: [4, 8], f: function (rng, lv) {
    var r = rng.int(2, 7), b = rng.int(2, 7), g = lv >= 6 ? rng.int(1, 5) : 0, n = r + b + g;
    var kind = rng.pick(lv >= 6 ? ['both', 'one', 'diff'] : ['both', 'single']);
    var ans, steps;
    if (kind === 'single') { ans = Q(r, n); steps = ['There are ' + n + ' marbles and ' + r + ' are red.', 'P(red) = ' + r + '/' + n + ' = ' + frac(ans) + '.']; }
    else if (kind === 'both') { ans = PL.qmul(Q(r, n), Q(r - 1, n - 1)); steps = ['First draw red: ' + r + '/' + n + '.', 'Second draw red (one red removed): ' + (r - 1) + '/' + (n - 1) + '.', 'Multiply: ' + frac(ans) + '.']; }
    else if (kind === 'one') { ans = PL.qadd(PL.qmul(Q(r, n), Q(n - r, n - 1)), PL.qmul(Q(n - r, n), Q(r, n - 1))); steps = ['Red then not-red: ' + r + '/' + n + ' × ' + (n - r) + '/' + (n - 1) + '.', 'Not-red then red: ' + (n - r) + '/' + n + ' × ' + r + '/' + (n - 1) + '.', 'Add: ' + frac(ans) + '.']; }
    else { var same = PL.qadd(PL.qadd(PL.qmul(Q(r, n), Q(r - 1, n - 1)), PL.qmul(Q(b, n), Q(b - 1, n - 1))), g > 1 ? PL.qmul(Q(g, n), Q(g - 1, n - 1)) : Q(0)); ans = PL.qsub(Q(1), same); steps = ['Find P(same colour) and subtract from 1.', 'P(same) = ' + frac(same) + '.', 'P(different) = 1 − ' + frac(same) + ' = ' + frac(ans) + '.']; }
    var ask = { single: 'What is the probability that one marble drawn at random is red?', both: 'Two marbles are drawn without replacement. What is the probability both are red?', one: 'Two marbles are drawn without replacement. What is the probability that exactly one is red?', diff: 'Two marbles are drawn without replacement. What is the probability they are different colours?' }[kind];
    return { text: 'A bag holds ' + r + ' red, ' + b + ' blue' + (g ? ' and ' + g + ' green' : '') + ' marbles.', ask: ask + ' (Give a fraction.)', ans: ans, unit: '', steps: steps };
  } };

  T.dice = { topic: 'Probability', lv: [5, 9], f: function (rng) {
    var kind = rng.pick(['sum', 'atleast', 'greater']), cnt = 0, s = rng.int(4, 10);
    for (var i = 1; i <= 6; i++) for (var j = 1; j <= 6; j++) {
      if (kind === 'sum' && i + j === s) cnt++;
      if (kind === 'atleast' && (i === 6 || j === 6)) cnt++;
      if (kind === 'greater' && i > j) cnt++;
    }
    var ans = Q(cnt, 36);
    var ask = { sum: 'What is the probability the total is ' + s + '?', atleast: 'What is the probability at least one die shows a 6?', greater: 'What is the probability the red die shows a higher number than the blue die?' }[kind];
    var st = { sum: ['There are 36 equally likely outcomes.', 'Pairs that total ' + s + ': ' + cnt + '.', 'Probability = ' + cnt + '/36 = ' + frac(ans) + '.'], atleast: ['P(no 6) = 5/6 × 5/6 = 25/36.', 'P(at least one 6) = 1 − 25/36 = 11/36.'], greater: ['36 outcomes; 6 are ties.', 'The other 30 split evenly between red higher and blue higher: 15.', 'Probability = 15/36 = 5/12.'] }[kind];
    return { text: 'A red die and a blue die, both fair and six-sided, are rolled together.', ask: ask + ' (Give a fraction.)', ans: ans, unit: '', steps: st };
  } };

  T.digits = { topic: 'Number relationships', lv: [5, 8], f: function (rng) {
    for (var t = 0; t < 100; t++) {
      var a = rng.int(1, 9), b = rng.int(0, 9); if (a === b || b === 0) continue;
      var n = 10 * a + b, rev = 10 * b + a, d = rev - n, s = a + b;
      return { text: 'A two-digit number has digits that add up to ' + s + '. Reversing its digits ' + (d > 0 ? 'increases' : 'decreases') + ' the number by ' + Math.abs(d) + '.', ask: 'What is the number?', ans: Q(n), unit: '',
        eq: '(10b + a) − (10a + b) = ' + d, eqWrong: ['(10a + b) − (10b + a) = ' + d, 'b − a = ' + d, '10(b − a) = ' + d], eqVar: 'a = tens digit, b = ones digit',
        steps: ['Write the number as 10a + b with a + b = ' + s + '.', 'Reversed minus original: (10b + a) − (10a + b) = 9(b − a) = ' + d + ', so b − a = ' + (d / 9) + '.', 'With a + b = ' + s + ': a = ' + a + ', b = ' + b + ', so the number is ' + n + '.'] };
    }
    return null;
  } };

  T.rectangle = { topic: 'Multi-step algebra', lv: [3, 6], f: function (rng) {
    var w = rng.int(3, 20), k = rng.int(2, 3), c = rng.int(1, 9) * (rng.chance(0.5) ? 1 : -1), L = k * w + c;
    if (L <= w) return null;
    var P = 2 * (L + w);
    return { text: 'A rectangle’s length is ' + (c > 0 ? c + ' more than ' : (-c) + ' less than ') + k + ' times its width. Its perimeter is ' + P + ' cm.', ask: 'What is its area in square centimetres?', ans: Q(L * w), unit: 'cm²',
      ask2: null,
      steps: ['Let the width be w, so the length is ' + k + 'w ' + (c > 0 ? '+ ' + c : '− ' + (-c)) + '.', 'Perimeter: 2(w + ' + k + 'w ' + (c > 0 ? '+ ' + c : '− ' + (-c)) + ') = ' + P + ', so ' + (k + 1) + 'w ' + (c > 0 ? '+ ' + c : '− ' + (-c)) + ' = ' + (P / 2) + ' and w = ' + w + '.', 'Length = ' + L + '. Area = ' + L + ' × ' + w + ' = ' + (L * w) + '.'] };
  } };

  T.plans = { topic: 'Practical scenarios', lv: [2, 5], f: function (rng) {
    for (var t = 0; t < 200; t++) {
      var f1 = rng.int(0, 10) * 5, r1 = rng.int(10, 30), f2 = f1 + rng.int(2, 12) * 5, r2 = rng.int(2, r1 - 2);
      var m = Q((f2 - f1) * 100, r1 - r2); if (m.d !== 1 || m.n > 400) continue;
      var it = rng.pick([['gym', 'visit', 'visits'], ['car-share', 'kilometre', 'kilometres'], ['phone', 'gigabyte', 'gigabytes']]);
      return { text: 'Plan A for a ' + it[0] + ' membership costs ' + money(f1) + ' per month plus ' + r1 + '¢ per ' + it[1] + '. Plan B costs ' + money(f2) + ' per month plus ' + r2 + '¢ per ' + it[1] + '.', ask: 'At how many ' + it[2] + ' per month do the plans cost the same?', ans: m, unit: '',
        eq: f1 * 100 + ' + ' + r1 + 'x = ' + f2 * 100 + ' + ' + r2 + 'x', eqWrong: [f1 + ' + ' + r1 + 'x = ' + f2 + ' + ' + r2 + 'x', f1 * 100 + ' + ' + r2 + 'x = ' + f2 * 100 + ' + ' + r1 + 'x', (f1 + f2) * 100 + ' = (' + r1 + ' + ' + r2 + ')x'], eqVar: 'x = ' + it[2] + ', amounts in cents',
        steps: ['In cents: ' + (f1 * 100) + ' + ' + r1 + 'x = ' + (f2 * 100) + ' + ' + r2 + 'x.', (r1 - r2) + 'x = ' + ((f2 - f1) * 100) + ', so x = ' + m.n + '.'] };
    }
    return null;
  } };

  T.average = { topic: 'Practical scenarios', lv: [2, 5], f: function (rng) {
    for (var t = 0; t < 100; t++) {
      var n = rng.int(3, 6), avg = rng.int(70, 88), target = avg + rng.int(1, 4);
      var need = target * (n + 1) - avg * n; if (need > 100 || need < 50) continue;
      var nm = names(rng, 1)[0];
      return { text: nm + '’s average over ' + n + ' tests is ' + avg + '.', ask: 'What score on the next test would raise the average to exactly ' + target + '?', ans: Q(need), unit: '',
        eq: '(' + (avg * n) + ' + x) / ' + (n + 1) + ' = ' + target, eqWrong: ['(' + avg + ' + x) / 2 = ' + target, '(' + (avg * n) + ' + x) / ' + n + ' = ' + target, avg + ' + x = ' + target * (n + 1)], eqVar: 'x = next score',
        steps: ['Current total: ' + n + ' × ' + avg + ' = ' + (avg * n) + '.', 'Needed total for ' + (n + 1) + ' tests: ' + (n + 1) + ' × ' + target + ' = ' + (target * (n + 1)) + '.', 'Next score = ' + (target * (n + 1)) + ' − ' + (avg * n) + ' = ' + need + '.'] };
    }
    return null;
  } };

  T.ratioChange = { topic: 'Ratios and proportions', lv: [5, 8], f: function (rng) {
    for (var t = 0; t < 300; t++) {
      var a = rng.int(1, 6), b = rng.int(a + 1, 9), k = rng.int(2, 12), add = rng.int(2, 20);
      if (PL.gcd(a, b) !== 1) continue;
      var x = a * k + add, y = b * k + add, g = PL.gcd(x, y), c = x / g, d = y / g;
      if (c > 12 || d > 12 || c * b === d * a) continue;
      var nm = rng.pick([['cats', 'dogs', 'a shelter'], ['novels', 'biographies', 'a bookcase'], ['red tiles', 'blue tiles', 'a box']]);
      return { text: 'In ' + nm[2] + ' the ratio of ' + nm[0] + ' to ' + nm[1] + ' is ' + a + ':' + b + '. After ' + add + ' more of each are added, the ratio becomes ' + c + ':' + d + '.', ask: 'How many ' + nm[0] + ' were there at first?', ans: Q(a * k), unit: '',
        eq: '(' + a + 'k + ' + add + ')/(' + b + 'k + ' + add + ') = ' + c + '/' + d, eqWrong: ['(' + a + ' + ' + add + ')/(' + b + ' + ' + add + ') = ' + c + '/' + d, a + 'k/' + b + 'k = ' + c + '/' + d, '(' + a + 'k + ' + add + ')/(' + b + 'k) = ' + c + '/' + d], eqVar: 'there are ' + a + 'k ' + nm[0] + ' and ' + b + 'k ' + nm[1] + ' at first',
        steps: ['Let the original counts be ' + a + 'k and ' + b + 'k.', 'Cross-multiply: ' + d + '(' + a + 'k + ' + add + ') = ' + c + '(' + b + 'k + ' + add + ').', (d * a) + 'k + ' + (d * add) + ' = ' + (c * b) + 'k + ' + (c * add) + ' → ' + (c * b - d * a) + 'k = ' + (d * add - c * add) + ' → k = ' + k + '.', 'Original ' + nm[0] + ': ' + a + ' × ' + k + ' = ' + (a * k) + '.'] };
    }
    return null;
  } };

  /* ---- format: identify missing information ---- */
  var MISSING = [
    function (rng) {
      var v = rng.int(40, 80), tm = rng.int(2, 5);
      return { topic: 'Distance, speed, and time', text: 'A train leaves the station and travels at a steady speed until it reaches the next city. Then it rests for 20 minutes.', ask: 'Which single extra fact would let you find the distance between the cities?',
        opts: ['The train’s speed and how long it travelled', 'The time it left the station', 'How long it rested', 'The number of passengers'], ans: 0,
        steps: ['Distance = speed × time; the problem gives neither.', 'Only the first option supplies both. The departure time alone or the rest period does not give travel time.'] };
    },
    function (rng) {
      var nm = names(rng, 2), s = rng.int(30, 60);
      return { topic: 'Ages', text: 'The sum of ' + nm[0] + '’s and ' + nm[1] + '’s ages is ' + s + '.', ask: 'Which additional fact is enough to find both ages?',
        opts: [nm[0] + ' is ' + rng.int(2, 9) + ' years older than ' + nm[1], 'In 5 years the sum of their ages will be ' + (s + 10), 'They were both born in spring', 'Five years ago the sum of their ages was ' + (s - 10)], ans: 0,
        steps: ['One equation (x + y = ' + s + ') with two unknowns needs a second, independent equation.', 'The age-difference fact gives x − y = constant, which is independent.', 'The future and past sums follow automatically from the first fact, so they add nothing.'] };
    },
    function (rng) {
      var p = rng.int(2, 6) * 5;
      return { topic: 'Percentages', text: 'A laptop is discounted by ' + p + '%.', ask: 'What do you need to know to find how much money the discount saves?',
        opts: ['The original price', 'The discount percentage', 'The sales tax rate', 'Which store sells it'], ans: 0,
        steps: ['Savings = ' + p + '% × original price.', 'The percentage is already given; the original price is the missing quantity.'] };
    },
    function (rng) {
      var a = rng.int(3, 9);
      return { topic: 'Work rates', text: 'Two printers working together finish a print job in ' + a + ' hours.', ask: 'What extra fact lets you find how long the first printer takes alone?',
        opts: ['How long the second printer takes alone', 'That both printers are the same brand', 'How many pages the job has', 'That they started at 9 a.m.'], ans: 0,
        steps: ['1/A + 1/B = 1/' + a + ' has two unknowns.', 'Knowing B gives 1/A = 1/' + a + ' − 1/B. Page count alone does not help without a printing rate.'] };
    },
    function (rng) {
      return { topic: 'Mixtures', text: 'A chemist mixes some 10% saline with some 30% saline.', ask: 'Which extra information is enough to find the concentration of the mixture?',
        opts: ['The volume of each solution used', 'The total volume only', 'The temperature of each solution', 'The cost per litre of each'], ans: 0,
        steps: ['The concentration depends on the proportion of each solution.', 'Total volume alone does not fix the proportion; the separate volumes do.'] };
    },
    function (rng) {
      var n = rng.int(20, 40);
      return { topic: 'Systems of equations', text: 'A farmer has chickens and cows, ' + n + ' animals in all.', ask: 'Which extra fact is enough to find how many cows there are?',
        opts: ['The total number of legs', 'The number of heads', 'That chickens have two legs', 'The farm’s size in acres'], ans: 0,
        steps: ['Heads give the same equation as the animal count. Legs give a second, independent equation: 2c + 4k = legs.', 'With c + k = ' + n + ' you can solve for k.'] };
    }
  ];

  /* ---- format: does the conclusion follow? ---- */
  function genFollows(rng, lv) {
    var nm = names(rng, 3), a = rng.int(3, 12), k = rng.int(2, 4);
    var kind = rng.int(0, 3);
    if (kind === 0) {
      // x > k*y, y >= a => x > k*a (yes); conclusion x >= k*a+? etc
      var c = rng.pick([k * a, k * a + rng.int(1, 6), k * a - rng.int(1, 4)]);
      var ans = c <= k * a ? 0 : 2; // strictly: x > k y >= k a so x > ka >= c → Yes if c <= ka. If c > ka can't tell
      return { topic: 'Number relationships', text: nm[0] + ' has more than ' + k + ' times as many stamps as ' + nm[1] + '. ' + nm[1] + ' has at least ' + a + ' stamps.', ask: 'Conclusion: “' + nm[0] + ' has more than ' + c + ' stamps.” Does it follow?', opts: ['Yes, it must be true', 'No, it must be false', 'Cannot be determined'], ans: ans,
        steps: [nm[0] + ' > ' + k + ' × ' + nm[1] + ' ≥ ' + k + ' × ' + a + ' = ' + (k * a) + '.', ans === 0 ? 'So ' + nm[0] + ' has more than ' + (k * a) + ', which is at least ' + c + '. It follows.' : nm[0] + ' must exceed ' + (k * a) + ', but could have ' + (k * a + 1) + ', which is not more than ' + c + '. It might be true or not.'] };
    }
    if (kind === 1) {
      var s = rng.int(20, 60), d = rng.int(2, 10);
      var big = (s + d) / 2;
      if (!Number.isInteger(big)) { s++; big = (s + d) / 2; }
      var claim = rng.pick([big, big + 1, big - 1]);
      var ans1 = claim === big ? 0 : 1;
      return { topic: 'Systems of equations', text: 'Two numbers add to ' + s + ' and differ by ' + d + '.', ask: 'Conclusion: “The larger number is ' + claim + '.” Does it follow?', opts: ['Yes, it must be true', 'No, it must be false', 'Cannot be determined'], ans: ans1,
        steps: ['Larger = (sum + difference) ÷ 2 = (' + s + ' + ' + d + ') ÷ 2 = ' + big + '.', ans1 === 0 ? 'The conclusion is exactly right.' : 'The larger number is ' + big + ', so the claim is false.'] };
    }
    if (kind === 2) {
      var avg = rng.int(60, 85), n = rng.int(3, 6);
      var claimB = rng.chance(0.5);
      return { topic: 'Practical scenarios', text: 'The average of ' + n + ' test scores is ' + avg + '. All scores are whole numbers from 0 to 100.', ask: claimB ? 'Conclusion: “At least one score is ' + avg + ' or higher.” Does it follow?' : 'Conclusion: “At least one score is exactly ' + avg + '.” Does it follow?', opts: ['Yes, it must be true', 'No, it must be false', 'Cannot be determined'], ans: claimB ? 0 : 2,
        steps: claimB ? ['If every score were below ' + avg + ', the average would be below ' + avg + '.', 'So at least one score is ' + avg + ' or more.'] : ['Scores of ' + (avg - 1) + ' and ' + (avg + 1) + ' (with the rest at ' + avg + ' or similar pairs) can average ' + avg + ' with no score equal to ' + avg + '.', 'But all scores could also be ' + avg + '. So it cannot be determined.'] };
    }
    var p = rng.int(2, 6) * 10;
    return { topic: 'Percentages', text: 'Store A cuts all prices by ' + p + '%. Store B raises its prices by ' + p + '% and then cuts the new prices by ' + p + '%. Both stores started with identical prices.', ask: 'Conclusion: “Prices at the two stores are now the same.” Does it follow?', opts: ['Yes, it must be true', 'No, it must be false', 'Cannot be determined'], ans: 1,
      steps: ['Store A: × ' + fmtNum(1 - p / 100) + '. Store B: × ' + fmtNum(1 + p / 100) + ' × ' + fmtNum(1 - p / 100) + ' = × ' + fmtNum((1 + p / 100) * (1 - p / 100)) + '.', 'These factors differ, so the prices differ (Store A is cheaper).'] };
  }

  /* ---- format: find the error ---- */
  function genError(rng, lv) {
    var pool = ['agesTimes', 'coins', 'consecutive', 'plans', 'average'];
    for (var t = 0; t < 20; t++) {
      var key = rng.pick(pool), tp = T[key], base = tp.f(rng, lv);
      if (!base || !base.eq) continue;
      // Build a 3-4 line solution where one line is wrong
      var steps = base.steps.slice();
      var wrongIdx = rng.int(1, steps.length - 1);
      var mutated = steps[wrongIdx].replace(/(=\s*)(\d+)(?!.*=\s*\d)/, function (m0, pre, num) { var nv = +num + rng.pick([-3, -2, 2, 3, 5]); if (nv <= 0) nv = +num + 4; return pre + nv; });
      if (mutated === steps[wrongIdx]) continue;
      steps[wrongIdx] = mutated;
      var nm = names(rng, 1)[0];
      return { topic: tp.topic, text: base.text + ' ' + base.ask, ask: nm + ' wrote the solution below. Which line contains the first mistake?', work: steps, opts: steps.map(function (_, i) { return 'Line ' + (i + 1); }).concat(['No mistake']), ans: wrongIdx,
        steps: ['Line ' + (wrongIdx + 1) + ' should read: ' + base.steps[wrongIdx], 'Correct answer: ' + PL.qstr(base.ans) + (base.unit && base.unit !== '$' ? ' ' + base.unit : '') + '.'] };
    }
    return null;
  }

  var FORMAT_BY_LEVEL = {
    1: { num: 10 }, 2: { num: 8, eq: 2 }, 3: { num: 7, eq: 2, multi: 1 }, 4: { num: 6, eq: 2, multi: 1, missing: 1 },
    5: { num: 5, eq: 2, multi: 1, missing: 1, follows: 1 }, 6: { num: 5, eq: 1, multi: 1, missing: 1, follows: 1, error: 1 },
    7: { num: 5, eq: 1, multi: 1, follows: 1, error: 2 }, 8: { num: 5, eq: 1, multi: 1, follows: 1, error: 2 },
    9: { num: 6, multi: 1, follows: 1, error: 2 }, 10: { num: 6, multi: 2, error: 2 }
  };

  function generate(level, rng, ctx) {
    var lv = PL.clamp(level, 1, 10);
    var fmts = FORMAT_BY_LEVEL[lv], keys = Object.keys(fmts);
    var recentTopics = (ctx && ctx.recent) || [];
    for (var t = 0; t < 80; t++) {
      var fmt = rng.weighted(keys, keys.map(function (k) { return fmts[k]; }));
      var p = null;
      if (fmt === 'missing') { var m = rng.pick(MISSING)(rng); p = { format: 'mc', topic: m.topic, text: m.text, ask: m.ask, opts: m.opts, ans: m.ans, steps: m.steps, sub: 'Missing information' }; }
      else if (fmt === 'follows') { var f = genFollows(rng, lv); p = { format: 'mc', topic: f.topic, text: f.text, ask: f.ask, opts: f.opts, ans: f.ans, steps: f.steps, sub: 'Does it follow?', fixedOrder: true }; }
      else if (fmt === 'error') { var e = genError(rng, lv); if (e) p = { format: 'mc', topic: e.topic, text: e.text, ask: e.ask, work: e.work, opts: e.opts, ans: e.ans, steps: e.steps, sub: 'Find the error', fixedOrder: true }; }
      else {
        var cands = Object.keys(T).filter(function (k) { var r = T[k].lv; return lv >= r[0] - (fmt === 'eq' ? 1 : 0) && lv <= r[1] + 1; });
        if (fmt === 'eq') cands = cands.filter(function (k) { return k !== 'roundTrip' && k !== 'probBag' && k !== 'dice' && k !== 'netChange' && k !== 'percentOf' && k !== 'rectangle' && k !== 'ratioShare'; });
        if (fmt === 'multi') cands = cands.filter(function (k) { return k === 'coins' || k === 'agesSumDiff'; });
        if (!cands.length) continue;
        var fresh = cands.filter(function (k) { return recentTopics.indexOf(k) < 0; });
        var key = rng.pick(fresh.length ? fresh : cands);
        var b = T[key].f(rng, lv);
        if (!b) continue;
        if (fmt === 'eq') {
          if (!b.eq) continue;
          var rootC = eqRoot(b.eq);
          var wrong = b.eqWrong.filter(function (x) { if (x === b.eq) return false; var r = eqRoot(x); return !(rootC != null && r != null && Math.abs(r - rootC) < 1e-9) && r !== 'same'; }).slice(0, 3);
          if (wrong.length < 2) continue;
          var opts = rng.shuffle([b.eq].concat(wrong));
          p = { format: 'mc', topic: T[key].topic, text: b.text, ask: 'Which equation correctly models this situation? Let ' + b.eqVar + '.', opts: opts, ans: opts.indexOf(b.eq), steps: ['Correct model: ' + b.eq].concat(b.steps).concat(['Answer to the question: ' + PL.qstr(b.ans) + (b.unit && b.unit !== '$' ? ' ' + b.unit : '') + '.']), sub: 'Choose the equation', tkey: key, mono: true };
        } else if (fmt === 'multi') {
          if (!b.ans2) continue;
          p = { format: 'multi', topic: T[key].topic, text: b.text, ask: b.ask, ask2: b.ask2, ans: b.ans, ans2: b.ans2, unit: b.unit, steps: b.steps, sub: 'Multi-part', tkey: key };
        } else {
          p = { format: 'num', topic: T[key].topic, text: b.text, ask: b.ask, ans: b.ans, unit: b.unit, steps: b.steps, sub: 'Solve', tkey: key };
        }
      }
      if (!p) continue;
      if (p.format === 'mc' && !p.fixedOrder && p.sub === 'Missing information') {
        var correct = p.opts[p.ans]; p.opts = rng.shuffle(p.opts); p.ans = p.opts.indexOf(correct);
      }
      if (!verify(p)) continue;
      return p;
    }
    throw new Error('algebra generation failed');
  }

  /* numeric root of a one-variable equation string (null if not parseable or not unique). Used to reject distractor
     equations that happen to share the correct equation's solution. */
  function eqRoot(eq) {
    try {
      var sides = eq.replace(/−/g, '-').replace(/×/g, '*').split('=');
      if (sides.length !== 2) return null;
      var fix = function (x) { return x.replace(/(\d|\))\s*\(/g, '$1*(').replace(/(\d)([a-z])/g, '$1*$2').replace(/\)([a-z\d])/g, ')*$1'); };
      var vars = (sides[0] + sides[1]).match(/[a-z]/g) || [];
      var uniq = vars.filter(function (v, i) { return vars.indexOf(v) === i; });
      if (uniq.length !== 1) return null;
      var f = new Function(uniq[0], 'return (' + fix(sides[0]) + ')-(' + fix(sides[1]) + ');');
      var found = null;
      for (var n = 1; n <= 3000; n++) {
        var dens = [1, 2, 3, 4, 5, 6, 8, 10, 12];
        for (var di = 0; di < dens.length; di++) { var v = n / dens[di]; if (Math.abs(f(v)) < 1e-9) { if (found != null && Math.abs(found - v) > 1e-9) return null; found = v; } }
      }
      return found;
    } catch (e) { return null; }
  }
  PL._eqRoot = eqRoot;

  function verify(p) {
    if (p.format === 'num' || p.format === 'multi') {
      if (!p.ans || !isFinite(PL.qval(p.ans))) return false;
      if (p.ans.d > 12) return false;
      if (p.format === 'multi' && (!p.ans2 || p.ans2.n <= 0)) return false;
      // the stated answer must appear in the final solution step (consistency of the worked solution)
      var last = p.steps.join(' ');
      var show = PL.qstr(p.ans), alt = String(PL.qval(p.ans));
      if (last.indexOf(show) < 0 && last.indexOf(alt) < 0 && last.indexOf(money(p.ans).replace('$', '')) < 0) return false;
      return true;
    }
    if (p.format === 'mc') return p.ans >= 0 && p.ans < p.opts.length && new Set(p.opts).size === p.opts.length;
    return false;
  }

  function init() { return { tries: [] }; }
  function view(api) {
    var p = api.p, gs = api.gs;
    function done(ok, label) {
      gs.tries.push(label);
      if (ok) { api.update(gs); api.finish('solved'); }
      else { api.wrong(); api.toast('Not quite. Try again or use the scratchpad.', 'bad'); api.update(gs); }
    }
    var body;
    if (p.format === 'mc') {
      body = h('div', { class: 'opts' }, p.opts.map(function (o, i) {
        return h('button', { class: 'btn opt' + (p.mono ? ' mono' : ''), disabled: api.done || gs.tries.indexOf(o) >= 0, onclick: function () { done(i === p.ans, o); } }, o);
      }));
    } else {
      var i1 = h('input', { id: 'alg-1', class: 'txt', type: 'text', inputmode: 'text', autocomplete: 'off', placeholder: 'Answer' + (p.unit && p.unit !== '$' && p.unit !== '%' ? ' (' + p.unit + ')' : p.unit === '$' ? ' ($)' : p.unit === '%' ? ' (%)' : '') });
      var i2 = p.format === 'multi' ? h('input', { id: 'alg-2', class: 'txt', type: 'text', inputmode: 'text', autocomplete: 'off', placeholder: 'Second answer' }) : null;
      body = h('form', { class: 'alg-form', onsubmit: function (e) {
        e.preventDefault();
        var v1 = i1.value.trim(); if (!v1) return;
        var ok = PL.numMatch(v1, p.ans, { percentOk: p.unit === '%' });
        var label = v1;
        if (i2) { var v2 = i2.value.trim(); if (!v2) { api.toast('Fill in both answers.', ''); return; } ok = ok && PL.numMatch(v2, p.ans2); label += ' / ' + v2; }
        done(ok, label);
      } },
        h('label', { class: 'lbl', for: 'alg-1' }, p.ask), i1,
        i2 ? h('label', { class: 'lbl', for: 'alg-2' }, p.ask2) : null, i2,
        h('button', { class: 'btn primary', type: 'submit', disabled: api.done }, 'Check'),
        h('div', { class: 'muted small' }, 'Fractions (3/4), mixed numbers (1 1/2) and decimals rounded to at least two places are accepted.'));
    }
    return h('div', { class: 'algebra' },
      h('div', { class: 'tagrow' }, h('span', { class: 'tag' }, p.topic), h('span', { class: 'tag ghost' }, p.sub)),
      h('p', { class: 'prob' }, p.text),
      p.work ? h('ol', { class: 'work mono' }, p.work.map(function (l) { return h('li', null, l); })) : null,
      p.format === 'mc' ? h('p', { class: 'q' }, p.ask) : null,
      body,
      gs.tries.length ? h('div', { class: 'muted small' }, 'Tried: ' + gs.tries.join(' · ')) : null);
  }
  function hint(p, gs) {
    // reveal the worked solution one step at a time, never the final line
    var max = Math.max(1, p.steps.length - 1);
    if ((gs.h || 0) >= max) return { msg: 'All intermediate steps are shown; the last step is yours.', noCount: true };
    gs.h = (gs.h || 0) + 1;
    return { msg: 'Step ' + gs.h + ': ' + p.steps[gs.h - 1], gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved';
    var pen = p.format === 'mc' ? (p.opts.length <= 3 ? 40 : 30) : 15;
    var q = solved ? PL.clamp(100 - ctx.wrong * pen - ctx.hints * 15, 10, 100) : 0;
    return { quality: Math.round(q), metrics: { topic: p.topic, format: p.sub, wrong: ctx.wrong, firstTry: solved && !ctx.wrong && !ctx.hints },
      lines: [['Topic', p.topic], ['Format', p.sub], ['Wrong answers', ctx.wrong]] };
  }
  function answerText(p) {
    if (p.format === 'mc') return p.opts[p.ans];
    var u = p.unit && p.unit !== '$' ? ' ' + p.unit : '';
    var a = p.unit === '$' ? money(p.ans) : PL.qmixed(p.ans) + u;
    if (p.format === 'multi') a += '; ' + PL.qmixed(p.ans2);
    return a;
  }
  function review(p, gs) {
    return h('div', { class: 'review' },
      h('p', { class: 'prob' }, p.text), p.work ? h('ol', { class: 'work mono' }, p.work.map(function (l) { return h('li', null, l); })) : null,
      h('p', null, p.ask),
      h('div', null, h('span', { class: 'lbl' }, 'Answer '), h('b', null, answerText(p))),
      h('div', { class: 'lbl' }, 'Solution'),
      h('ol', { class: 'steps' }, p.steps.map(function (s) { return h('li', null, s); })),
      gs.tries.length ? h('div', { class: 'muted small' }, 'Your answers: ' + gs.tries.join(' · ')) : null);
  }
  function stats(atts) {
    var by = {};
    atts.forEach(function (a) { var t = a.metrics && a.metrics.topic; if (!t) return; (by[t] = by[t] || { n: 0, ok: 0, q: 0 }); by[t].n++; by[t].q += a.quality || 0; if (a.outcome === 'solved') by[t].ok++; });
    var rows = [['Accuracy', atts.length ? Math.round(100 * atts.filter(function (a) { return a.outcome === 'solved'; }).length / atts.length) + '%' : '—'],
      ['First-try, no-hint rate', atts.length ? Math.round(100 * atts.filter(function (a) { return a.metrics && a.metrics.firstTry; }).length / atts.length) + '%' : '—']];
    Object.keys(by).sort().forEach(function (t) { rows.push([t, by[t].ok + '/' + by[t].n + ' solved · avg ' + Math.round(by[t].q / by[t].n)]); });
    return rows;
  }
  PL.games.algebra = {
    id: 'algebra', name: 'Algebra Arcade', blurb: 'Word problems: model, solve, and check reasoning.',
    rules: 'Read the problem and answer. Some ask for a number, some for the equation that models the situation, the missing fact, whether a conclusion follows, or the first wrong line in someone’s working. Use the scratchpad freely; it never counts against you.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 60 + lv * 20; }, timeLimit: function (lv) { return 120 + lv * 30; },
    _T: T, _answerText: answerText
  };
})();

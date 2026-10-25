/* ===== Survey Says answer matching =====
   Decides which answer on THIS question's board (if any) a typed guess means. Deterministic and conservative:
   it only accepts genuine equivalents, never "looks similar" matches between two different real words.

   1. Normalise both sides: case, accents, apostrophes, punctuation, "&" → "and", filler words (a, the, my, to, of...),
      number words → digits ("seven" → 7, "midnight"/"noon" → 12), and units after a bare number ("10 pm", "$30").
   2. Curated aliases (ALIASES below): vet = veterinarian, TV = television, bike = bicycle, cell phone = mobile phone,
      spelling variants (theatre/theater, donut/doughnut) and irregular plurals (teeth/tooth, children/kid).
   3. Word forms: regular plurals (tattoos → tattoo), and -ing/-ed verb forms when the shorter form is itself a real
      word (cooking → cook, but "cookies" stays "cookie" and never meets "cook").
   Match levels, best first, for each answer on the board:
      4  same words (any order) after 1–3                        "Brush Teeth" = "teeth brushing"
      3  same letters ignoring spaces                            "r2d2" = "R2-D2", "door bell" = "doorbell"
      2  one small typo per word, only when the guess word is NOT a different real word
         (or the answer word isn't a dictionary word, e.g. a name)  "tatoo" → "Tattoo", "oprha" → "Oprah"
      1  a shorter or longer phrase with the same head word      "price tag" → "Remove Price Tag", "a big pumpkin" → "Pumpkin"
   Ambiguity: if two answers tie at the best level ≤ 2 the guess is NOT matched (the player is asked to be more specific);
   at level 3–4 a tie (two answers worded the same) goes to the one whose own label matched, then the more popular one. */
(function () {
  var NUM = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
    fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, midnight: 12, noon: 12, dozen: 12 };
  var STOP = { a: 1, an: 1, the: 1, some: 1, my: 1, your: 1, their: 1, his: 1, her: 1, its: 1, it: 1, to: 1, of: 1, and: 1, our: 1 };
  var UNITS = { am: 1, pm: 1, oclock: 1, o: 1, clock: 1, dollar: 1, dollars: 1, buck: 1, bucks: 1, cent: 1, cents: 1, year: 1, years: 1, yr: 1, yrs: 1,
    old: 1, minute: 1, minutes: 1, min: 1, mins: 1, hour: 1, hours: 1, hr: 1, hrs: 1, time: 1, times: 1, pound: 1, pounds: 1, lb: 1, lbs: 1,
    percent: 1, day: 1, days: 1, week: 1, weeks: 1, month: 1, months: 1, people: 1, guest: 1, guests: 1, pair: 1, pairs: 1, mph: 1, inch: 1, inches: 1, feet: 1, foot: 1, ft: 1 };
  /* Genuine equivalents only: the same thing under another name, spelling or abbreviation. The first entry is the
     canonical form. Near-synonyms that mean different things (tired/sleepy, toilet/bathroom) are deliberately absent. */
  var ALIASES = [
    ['veterinarian', 'vet', 'animal doctor'], ['television', 'tv', 'telly', 't v'], ['cell phone', 'cellphone', 'mobile phone', 'smartphone', 'smart phone', 'cell phones'],
    ['bicycle', 'bike', 'pushbike'], ['refrigerator', 'fridge', 'icebox', 'ice box'], ['automobile', 'car'], ['airplane', 'plane', 'aeroplane'],
    ['mother', 'mom', 'mommy', 'mum', 'mama', 'momma', 'mummy'], ['father', 'dad', 'daddy', 'papa'], ['grandmother', 'grandma', 'granny', 'nana', 'grammy', 'gran'],
    ['grandfather', 'grandpa', 'granddad', 'grandad', 'gramps'], ['child', 'kid', 'children', 'kiddo'], ['husband', 'hubby'], ['baby', 'infant', 'newborn'],
    ['police officer', 'cop', 'policeman', 'police', 'policewoman', 'police man'], ['firefighter', 'fireman', 'firemen', 'fire fighter'],
    ['mail carrier', 'mailman', 'postman', 'mail man', 'letter carrier', 'postal worker', 'mailmen'], ['doctor', 'doc', 'dr', 'physician'],
    ['lawyer', 'attorney'], ['sofa', 'couch', 'settee'], ['movie', 'film', 'flick', 'motion picture'], ['photograph', 'photo', 'picture', 'pic', 'snapshot'],
    ['restroom', 'bathroom', 'washroom', 'lavatory', 'loo', 'rest room', 'powder room'], ['stomach', 'tummy', 'belly'], ['birthday', 'bday', 'b day'],
    ['christmas', 'xmas', 'x mas'], ['sneaker', 'tennis shoe', 'running shoe', 'gym shoe', 'trainer'], ['eyeglasses', 'spectacles', 'eye glasses'],
    ['sunglasses', 'shades', 'sun glasses'], ['gasoline', 'gas', 'petrol'], ['mathematics', 'math', 'maths'], ['physical education', 'pe', 'phys ed', 'p e', 'gym class'],
    ['identification', 'id', 'i d'], ['air conditioning', 'air conditioner', 'ac', 'a c', 'aircon'], ['barbecue', 'bbq', 'barbeque', 'bar b que', 'b b q', 'bar b q'],
    ['doughnut', 'donut'], ['theater', 'theatre'], ['color', 'colour'], ['gray', 'grey'], ['axe', 'ax'], ['jewelry', 'jewellery'], ['mustache', 'moustache'],
    ['pajamas', 'pyjamas', 'pjs', 'jammies', 'pj', 'p j'], ['catalog', 'catalogue'], ['okay', 'ok'], ['favorite', 'favourite'], ['neighbor', 'neighbour'],
    ['ketchup', 'catsup'], ['yogurt', 'yoghurt'], ['hamburger', 'burger'], ['hot dog', 'hotdog', 'wiener', 'frankfurter'], ['computer', 'pc'],
    ['email', 'e mail'], ['new york city', 'nyc', 'big apple'], ['los angeles', 'la', 'l a'], ['united states', 'usa', 'u s a', 'u s', 'united states of america', 'america'],
    ['washington dc', 'dc', 'd c', 'washington d c'], ['las vegas', 'vegas'], ['disney world', 'disneyworld', 'walt disney world'], ['mcdonalds', 'mcdonald s', 'mickey ds'],
    ['vacuum cleaner', 'vacuum', 'hoover'], ['tissue', 'kleenex'], ['bandage', 'band aid', 'bandaid'], ['cotton swab', 'q tip', 'qtip'], ['flashlight', 'torch'],
    ['diaper', 'nappy'], ['pacifier', 'binky'], ['money', 'cash'], ['big', 'large'], ['small', 'little'], ['fat', 'overweight'],
    ['tooth', 'teeth'], ['foot', 'feet'], ['man', 'men'], ['woman', 'women'], ['mouse', 'mice'], ['goose', 'geese'], ['person', 'people'], ['garbage', 'trash', 'rubbish'],
    ['swimsuit', 'bathing suit', 'swimming suit', 'swim suit'], ['tuxedo', 'tux'], ['limousine', 'limo'], ['microwave', 'microwave oven'], ['popsicle', 'ice pop', 'ice lolly'],
    ['soda', 'soft drink', 'soda pop', 'fizzy drink'], ['restaurant', 'eatery'], ['television show', 'tv show', 'tv program', 'television program'],
    ['mister', 'mr'], ['doctor', 'dr'], ['mount', 'mt'], ['santa', 'santa claus', 'father christmas', 'saint nick', 'st nick'],
    ['ice cream', 'icecream'], ['french fries', 'fries', 'french fry'], ['candy', 'sweets'], ['alcohol', 'booze', 'liquor'], ['present', 'gift']
  ];
  var IRREG = { children: 'child', teeth: 'tooth', feet: 'foot', men: 'man', women: 'woman', mice: 'mouse', geese: 'goose', people: 'person', knives: 'knife', wives: 'wife', leaves: 'leaf', loaves: 'loaf', wolves: 'wolf', shelves: 'shelf', lives: 'life', halves: 'half', calves: 'calf' };
  var NOSTEM = { news: 1, glasses: 1, pants: 1, jeans: 1, shorts: 1, scissors: 1, series: 1, species: 1, physics: 1, mathematics: 1, politics: 1, economics: 1, gymnastics: 1, chess: 1, bus: 1, gas: 1, yes: 1, this: 1, is: 1, his: 1, was: 1, has: 1, us: 1, plus: 1, bonus: 1, virus: 1, circus: 1, cactus: 1, octopus: 1, campus: 1, status: 1, lens: 1, christmas: 1, texas: 1, vegas: 1, paris: 1, dallas: 1, mcdonalds: 1, ss: 1, kiss: 1, dress: 1, glass: 1, grass: 1, class: 1, boss: 1, tennis: 1, means: 1, always: 1, sometimes: 1 };
  var ING_KEEP = { evening: 1, wedding: 1, nothing: 1, something: 1, anything: 1, everything: 1, ring: 1, king: 1, thing: 1, during: 1, ceiling: 1, lightning: 1, darling: 1, sterling: 1, morning: 1, spring: 1, string: 1, sing: 1, wing: 1, bring: 1, sibling: 1, pudding: 1, stuffing: 1, icing: 1, frosting: 1, clothing: 1, building: 1, painting: 1, drawing: 1, meeting: 1, feeling: 1, earring: 1, tired: 1, scared: 1, bored: 1, married: 1, excited: 1, worried: 1, teething: 1, interested: 1, boxing: 1, bowling: 1, parking: 1, dressing: 1, kidding: 1, bedding: 1, filling: 1, topping: 1, siding: 1, flooring: 1, roofing: 1, plumbing: 1, wiring: 1, timing: 1, training: 1, setting: 1, being: 1, swing: 1, sling: 1, dumpling: 1, sapling: 1, offspring: 1, savings: 1, belongings: 1, housing: 1, crossing: 1, banking: 1, landing: 1, heading: 1, booking: 1, listing: 1, rating: 1, spelling: 1, lighting: 1, sweeping: 1, posting: 1, crooked: 1, wicked: 1, naked: 1, rugged: 1, ragged: 1, jagged: 1, aged: 1, blessed: 1, beloved: 1, sacred: 1, wretched: 1, legged: 1, dogged: 1, bed: 1, red: 1, need: 1, seed: 1, speed: 1, weed: 1, feed: 1, breed: 1, shed: 1, sled: 1, wed: 1, fed: 1, led: 1, hundred: 1 };

  var VOCAB = null; // every word used in the question bank's answers counts as a real word too (brands, names: Lego, Chex)
  var GENERIC = { thing: 1, stuff: 1, person: 1, way: 1, time: 1, place: 1, one: 1, lot: 1, kind: 1, type: 1, something: 1, someone: 1, them: 1, they: 1, you: 1, me: 1, him: 1, do: 1, be: 1, get: 1, go: 1, make: 1, have: 1 };
  var EXTRA_OK = {}; ('big large huge giant tiny small little new old nice good great bad real fake favorite own lot lots many more few extra whole cute pretty ugly dirty clean '
    + 'fresh free cheap expensive fancy special every any other another very really too much just also all most best worst same different '
    + 'buy get have eat drink wear go use take make give do play see watch hear wash fix clean find bring keep put need want like love hate try '
    + 'warm hot cold nice cool long short tall wild young cell mobile smart cordless electric digital wrist pocket').split(' ').forEach(function (w) { EXTRA_OK[w] = 1; });
  var DROP_OK = {}; ('buy get have eat drink wear go use take make give do play see watch hear wash fix clean find bring keep put need want like love hate try '
    + 'cell mobile smart cordless electric digital wrist pocket favorite own lots lot many more extra whole every any other another very really too much just also all').split(' ').forEach(function (w) { DROP_OK[w] = 1; });
  function hasWord(w) { return !!((PL.dict && PL.dict.has(w)) || (VOCAB && VOCAB[w])); }
  function setVocab(labels) { VOCAB = {}; labels.forEach(function (l) { rawTokens(l).forEach(function (w) { VOCAB[w] = 1; }); }); cache = {}; }
  function rawTokens(s) {
    s = String(s == null ? '' : s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.replace(/[’'`]/g, '').replace(/&/g, ' and ').replace(/\$/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2');
    return s.split(' ').filter(Boolean).map(function (w) { return NUM[w] != null ? String(NUM[w]) : w; });
  }
  // alias table → token sequences, longest first
  var AL = [];
  // a spelling that loses a word to the filler list ("a c" -> "c") would rewrite unrelated text, so it is skipped
  ALIASES.forEach(function (g) { var canon = rawTokens(g[0]).filter(function (w) { return !STOP[w]; }); g.forEach(function (v) { var raw = rawTokens(v), t = raw.filter(function (w) { return !STOP[w]; }); if (t.length && t.length === raw.length && !(t.length === 1 && t[0].length === 1)) AL.push({ from: t, to: canon }); }); });
  AL.sort(function (a, b) { return b.from.length - a.from.length; });
  function base(w) { // canonical word form: irregular plurals, regular plurals; verb -ing/-ed only to a real shorter word
    if (/^\d+$/.test(w) || w.length <= 3) return w;
    if (IRREG[w]) return IRREG[w];
    if (!NOSTEM[w]) {
      // plurals: drop the "s" when that leaves a word (shoes -> shoe, cookies -> cookie), else "es" (boxes -> box), else ies -> y
      if (/[^su]s$/.test(w) && hasWord(w.slice(0, -1))) return w.slice(0, -1);
      if (/(ch|sh|x|ss|z|o)es$/.test(w) && hasWord(w.slice(0, -2))) return w.slice(0, -2);
      if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
      if (/[^su]s$/.test(w)) return w.slice(0, -1);
    }
    if (!ING_KEEP[w]) {
      var m = /^(.{3,}?)(ing|ed)$/.exec(w);
      if (m) {
        // hating -> hate (not hat), riding -> ride, running -> run, cooking -> cook: after a vowel + single consonant the
        // silent-e form is tried first; a doubled consonant is undone before the bare stem
        var s = m[1], cands = (/[aeiou][^aeiouwxy]$/.test(s) && !/[aeiou]{2}[^aeiou]$/.test(s) ? [s + 'e'] : []).concat([s.replace(/([^aeiou])\1$/, '$1'), s, s.replace(/i$/, 'y')]);
        for (var i = 0; i < cands.length; i++) if (cands[i].length >= 3 && hasWord(cands[i])) return cands[i];
      }
    }
    return w;
  }
  function tokens(s, plain) {
    var t = rawTokens(s), all = t.slice();
    t = t.filter(function (w) { return !STOP[w]; });
    if (!t.length) t = all.length ? all : [];               // answers like "A" or "Her" are only filler words
    var out = [], i = 0;
    while (i < t.length) {
      var hit = null;
      for (var k = 0; k < AL.length && !hit && !plain; k++) {
        var f = AL[k].from; if (i + f.length > t.length) continue;
        var ok = true; for (var j = 0; j < f.length; j++) if (t[i + j] !== f[j] && base(t[i + j]) !== f[j]) { ok = false; break; }
        if (ok) hit = AL[k];
      }
      if (hit) { out = out.concat(hit.to); i += hit.from.length; } else { out.push(base(t[i])); i++; }
    }
    return out;
  }
  function numberOnly(tk) { // [30] from "30", "$30", "30 dollars", "10 pm"; null otherwise
    var nums = tk.filter(function (w) { return /^\d+$/.test(w); });
    if (nums.length !== 1) return null;
    return tk.every(function (w) { return /^\d+$/.test(w) || UNITS[w]; }) ? nums[0] : null;
  }
  function bareNumber(tk) { return tk.length === 1 && /^\d+$/.test(tk[0]) ? tk[0] : null; }
  function damerau(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; } for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
      var c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[a.length][b.length];
  }
  function typoOk(g, a) { // one guessed word vs one answer word
    if (g === a) return true;
    if (/\d/.test(g) || /\d/.test(a)) return false;          // numbers must be exact
    var L = Math.max(g.length, a.length); if (L < 5 || Math.min(g.length, a.length) < 4) return false;
    if (hasWord(g) && hasWord(a)) return false;               // two different real words ("cold" vs "cook") are never a typo
    if (g[0] !== a[0] && !(g[0] === a[1] && g[1] === a[0])) return false;
    return damerau(g, a) <= (L >= 8 ? 2 : 1);
  }
  function sameBag(x, y) { return x.length === y.length && x.slice().sort().join(' ') === y.slice().sort().join(' '); }
  function contains(big, small) { var pool = big.slice(); return small.every(function (w) { var k = pool.indexOf(w); if (k < 0) return false; pool.splice(k, 1); return true; }); }
  function level(gt, at) {
    if (!gt.length || !at.length) return 0;
    var an = bareNumber(at);                                                // "7", "30": the guess must be that number
    if (an != null) return numberOnly(gt) === an ? 4 : 0;                   // ("seven", "$30", "10 pm" are fine)
    if (numberOnly(gt) != null && !at.some(function (w) { return /^\d+$/.test(w); })) return 0;
    if (sameBag(gt, at)) return 4;
    if (gt.join('') === at.join('')) return 3;
    if (gt.length === at.length) { var all = true, any = false; for (var i = 0; i < gt.length; i++) { if (gt[i] === at[i]) continue; if (typoOk(gt[i], at[i])) any = true; else { all = false; break; } } if (all && any) return 2; }
    if (gt.length === 1 && at.length === 1) return 0;
    var head = at[at.length - 1], ghead = gt[gt.length - 1];
    if (head !== ghead || GENERIC[head]) return 0;
    // shorter guess: must keep the head word and at least half of the answer's words ("price tag" → "remove price tag", "hat" → "top hat")
    if (gt.length < at.length) {
      if (!contains(at, gt) || gt.length * 2 < at.length || gt.join('').length < 3) return 0;
      var dropped = at.slice(); gt.forEach(function (w) { dropped.splice(dropped.indexOf(w), 1); });
      return gt.length >= 2 || dropped.every(function (w) { return DROP_OK[w]; }) ? 1 : 0;   // "dog" is not "hot dog"
    }
    // longer guess: the extra words may only be plain describing or doing words ("a big pumpkin", "buy flowers"), never another
    // noun that makes it a different thing ("garlic bread" is not "bread", "onion rings" is not "ring")
    if (gt.length <= at.length + 2 && contains(gt, at) && at.join('').length >= 3) {
      var extra = gt.slice(); at.forEach(function (w) { extra.splice(extra.indexOf(w), 1); });
      return extra.every(function (w) { return EXTRA_OK[w]; }) ? 1 : 0;
    }
    return 0;
    return 0;
  }
  var cache = {};
  function tk(s, plain) { var k = (plain ? '1' : '0') + String(s); if (!cache[k]) cache[k] = tokens(String(s), plain); return cache[k]; }
  /* board: [{label, n, answers:[...]}]. Returns {i, level, via} or {i:-1, ambiguous:[...]}.
     Each answer is scored twice: on the words as typed (plain) and with aliases. A plain match ranks above an alias
     match of the same level, so when a board has both "Dad" and "Daddy", "daddy" opens Daddy, not Dad. */
  function match(board, guess, open) {
    var gp = tokens(guess, true), ga = tokens(guess, false), per = [];
    board.forEach(function (c, i) {
      var best = 0, own = false;
      [c.label].concat(c.answers || []).forEach(function (a, k) {
        var l = Math.max(2 * level(gp, tk(a, true)) + 1, 2 * level(ga, tk(a, false))); if (l === 1) l = 0;
        if (l > best) { best = l; own = k === 0; }
      });
      per.push({ i: i, key: best, own: own, n: c.n });
    });
    var top = Math.max.apply(null, per.map(function (x) { return x.key; }));
    if (!top) return { i: -1, level: 0 };
    var lvl = top >> 1, cands = per.filter(function (x) { return x.key === top; });
    if (open && cands.length > 1) { var closed = cands.filter(function (x) { return !open[x.i]; }); if (closed.length) cands = closed; } // fish, then fishing
    // a tie is only resolved when both answers are worded the same (plain level 3–4); anything looser is ambiguous
    if (cands.length > 1 && !(top % 2 === 1 && lvl >= 3)) return { i: -1, level: lvl, ambiguous: cands.map(function (x) { return x.i; }) };
    cands.sort(function (a, b) { return (b.own - a.own) || (b.n - a.n) || (a.i - b.i); });
    return { i: cands[0].i, level: lvl, plain: top % 2 === 1 };
  }
  PL.surveyMatch = { setVocab: setVocab, match: match, tokens: tokens, level: level, typoOk: typoOk, ALIASES: ALIASES };
})();

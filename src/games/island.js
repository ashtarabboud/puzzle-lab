/* ===== GAME 2: THE ISLAND =====
   Evaluation architecture (v2):
   - Every submission is normalised: lower case, punctuation removed, spaces collapsed, a leading article
     ("a", "an", "the", "some") dropped. Up to four words are accepted.
   - Spelling and structure rules are evaluated directly on the submitted letters (spaces ignored), with no dictionary check,
     so any submission gets a definite YES or NO.
   - Meaning rules use an offline lexicon: the curated island catalogue first, then WordNet categories (a word counts if any
     ordinary meaning fits). Plurals are reduced to singular forms and multi-word phrases fall back to their last word.
   - Sound rules use the CMU pronouncing dictionary with a deterministic fallback syllable counter. */
(function () {
  var h = PL.h;
  var V = null, LEX = null, CAT = null;
  function vocab() { if (!V) { V = {}; (PL.data.island_vocab || []).forEach(function (e) { V[e.w] = e; }); } return V; }
  function lex() { if (!LEX) { LEX = (PL.data.lexicon && PL.data.lexicon.w) || {}; CAT = {}; ((PL.data.lexicon && PL.data.lexicon.cats) || []).forEach(function (c, i) { CAT[c] = i; }); } return LEX; }

  /* ---------- normalisation ---------- */
  var ARTICLES = { a: 1, an: 1, the: 1, some: 1, my: 1 };
  function normalize(raw) {
    var s = String(raw || '').toLowerCase().replace(/&/g, ' and ').replace(/[’']/g, '').replace(/[^a-z\s-]/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    var words = s ? s.split(' ') : [];
    while (words.length > 1 && ARTICLES[words[0]]) words.shift();
    var text = words.join(' ');
    return { text: text, letters: words.join(''), words: words };
  }
  PL.islandNormalize = normalize;
  var IRREG = { mice: 'mouse', geese: 'goose', teeth: 'tooth', feet: 'foot', children: 'child', men: 'man', women: 'woman', people: 'person', oxen: 'ox', lice: 'louse', dice: 'die', knives: 'knife', wives: 'wife', leaves: 'leaf', loaves: 'loaf', wolves: 'wolf', halves: 'half', shelves: 'shelf', calves: 'calf', thieves: 'thief', scarves: 'scarf', hooves: 'hoof', potatoes: 'potato', tomatoes: 'tomato', heroes: 'hero', echoes: 'echo', cacti: 'cactus', fungi: 'fungus', octopi: 'octopus' };
  function singulars(w) {
    var out = [w];
    if (IRREG[w]) out.push(IRREG[w]);
    if (/ies$/.test(w) && w.length > 4) out.push(w.slice(0, -3) + 'y');
    if (/ves$/.test(w)) { out.push(w.slice(0, -3) + 'f'); out.push(w.slice(0, -3) + 'fe'); }
    if (/(ches|shes|xes|sses|zes|oes)$/.test(w)) out.push(w.slice(0, -2));
    if (/s$/.test(w) && !/ss$/.test(w)) out.push(w.slice(0, -1));
    return out;
  }
  /* ---------- meaning lookup ---------- */
  var CURATED_MAP = { animal: ['animal', 'mammal'], bird: ['animal', 'bird'], fish_sea: ['animal', 'fish'], insect: ['animal', 'insect'], fruit: ['food', 'fruit'], vegetable: ['food', 'vegetable'], food: ['food', 'dish'], drink: ['food', 'drink'], plant: ['plant'], tool: ['artifact', 'tool'], kitchen: ['artifact', 'tool'], furniture: ['artifact', 'furniture'], clothing: ['artifact', 'clothing'], instrument: ['artifact', 'instrument'], vehicle: ['artifact', 'vehicle'], sport: ['sport'], toy: ['artifact', 'toy'], stationery: ['artifact'], electronic: ['artifact', 'device'], container: ['artifact', 'container'], jewelry: ['artifact', 'clothing'], body_care: ['artifact'], weather_nature: ['nature'], building: ['artifact', 'building'] };
  function catsFromCurated(e) { var s = {}; (CURATED_MAP[e.cat] || []).forEach(function (c) { s[c] = 1; }); if (e.edible) s.food = 1; if (e.living && e.cat === 'plant') s.plant = 1; return s; }
  function catsFromMask(mask) { var s = {}; Object.keys(CAT).forEach(function (c) { if (mask & (1 << CAT[c])) s[c] = 1; }); return s; }
  // returns {cats, src, key} or null
  function meaning(n) {
    lex(); var voc = vocab();
    var keys = [n.text, n.letters];
    var last = n.words[n.words.length - 1];
    singulars(n.text).concat(singulars(n.letters)).forEach(function (k) { keys.push(k); });
    if (n.words.length > 1) { var head = n.words.slice(0, -1).join(' '); singulars(last).forEach(function (s2) { keys.push(head + ' ' + s2); keys.push(n.words.slice(0, -1).join('') + s2); }); }
    for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (voc[k]) return { cats: catsFromCurated(voc[k]), src: 'catalogue', key: k }; }
    for (i = 0; i < keys.length; i++) { var v = LEX[keys[i]]; if (v != null) { var m = parseInt(String(v).split(',')[0], 36); if (m) return { cats: catsFromMask(m), src: 'dictionary', key: keys[i] }; } }
    if (n.words.length > 1) { var hs = singulars(last); for (i = 0; i < hs.length; i++) { if (voc[hs[i]]) return { cats: catsFromCurated(voc[hs[i]]), src: 'catalogue', key: hs[i] }; var v2 = LEX[hs[i]]; if (v2 != null) { var m2 = parseInt(String(v2).split(',')[0], 36); if (m2) return { cats: catsFromMask(m2), src: 'dictionary', key: hs[i] }; } } }
    return null;
  }
  /* ---------- sound ---------- */
  function heuristicSyl(w) {
    w = w.toLowerCase(); if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    var m = w.match(/[aeiouy]{1,2}/g); return m ? m.length : 1;
  }
  function wordPhon(w) {
    lex(); var v = LEX[w];
    if (v != null) { var p = String(v).split(','); if (p.length >= 3) return { syl: +p[1], vstart: p[2] === '1' }; }
    var sg = singulars(w); for (var i = 1; i < sg.length; i++) { var v2 = LEX[sg[i]]; if (v2 != null) { var q = String(v2).split(','); if (q.length >= 3) return { syl: +q[1] + (/(ches|shes|xes|sses|zes|ges)$/.test(w) ? 1 : 0), vstart: q[2] === '1' }; } }
    return { syl: heuristicSyl(w), vstart: /^[aeiou]/.test(w) && !/^(uni|use|eu|one|once)/.test(w) };
  }
  function syllables(n) { return n.words.reduce(function (s, w) { return s + wordPhon(w).syl; }, 0); }
  function vowelSoundStart(n) { return n.words.length ? wordPhon(n.words[0]).vstart : false; }
  /* ---------- structure helpers ---------- */
  var VOW = 'aeiou';
  function isV(ch) { return VOW.indexOf(ch) >= 0; }
  function vowels(w) { var c = 0; for (var i = 0; i < w.length; i++) if (isV(w[i])) c++; return c; }
  function compoundish(n) { // two or more words, or splittable into two dictionary words of 3+ letters
    if (n.words.length >= 2) return true;
    var w = n.letters; for (var i = 3; i <= w.length - 3; i++) if (PL.dict.has(w.slice(0, i)) && PL.dict.has(w.slice(i)) && PL.dict.tier(w.slice(0, i)) !== 'C' && PL.dict.tier(w.slice(i)) !== 'C') return true;
    return false;
  }

  /* kind: 'spell' (letters only), 'sem' (meaning), 'sound', 'rel' (depends on the previous accepted item)
     f(n, prev, ctx, param) -> true | false | null (null only when a meaning rule cannot identify the item) */
  function hasCat(n, c) { var m = meaning(n); return m ? !!m.cats[c] : null; }
  var CATN = { animal: 'animals of any kind (including birds, fish and insects)', bird: 'birds', insect: 'insects, spiders and other bugs', fruit: 'fruits', food: 'things people eat or drink', drink: 'drinks', instrument: 'musical instruments', furniture: 'furniture', clothing: 'clothing, shoes and accessories', vehicle: 'vehicles', building: 'buildings and structures', fish: 'fish and sea creatures' };
  var RULES = [
    { id: 'dbl', d: 2, kind: 'spell', text: 'Items with a double letter (two identical letters side by side).', f: function (n) { return /(.)\1/.test(n.letters); } },
    { id: 'startvowel', d: 1, kind: 'spell', text: 'Items whose first letter is a vowel (A, E, I, O, U).', f: function (n) { return isV(n.letters[0]); } },
    { id: 'endvowel', d: 2, kind: 'spell', text: 'Items whose last letter is a vowel (A, E, I, O, U).', f: function (n) { return isV(n.letters[n.letters.length - 1]); } },
    { id: 'len4', d: 2, kind: 'spell', text: 'Items with exactly four letters.', f: function (n) { return n.letters.length === 4; } },
    { id: 'len6p', d: 2, kind: 'spell', text: 'Items with six or more letters.', f: function (n) { return n.letters.length >= 6; } },
    { id: 'noe', d: 3, kind: 'spell', text: 'Items that contain no letter E.', f: function (n) { return n.letters.indexOf('e') < 0; } },
    { id: 'hasa', d: 2, kind: 'spell', text: 'Items that contain the letter A.', f: function (n) { return n.letters.indexOf('a') >= 0; } },
    { id: 'samefl', d: 4, kind: 'spell', text: 'Items that start and end with the same letter.', f: function (n) { return n.letters[0] === n.letters[n.letters.length - 1]; } },
    { id: 'onevowel', d: 4, kind: 'spell', text: 'Items with exactly one vowel letter (Y does not count).', f: function (n) { return vowels(n.letters) === 1; } },
    { id: 'secondhalf', d: 4, kind: 'spell', text: 'Items whose first letter is in the second half of the alphabet (N–Z).', f: function (n) { return n.letters[0] >= 'n'; } },
    { id: 'repeat', d: 4, kind: 'spell', text: 'Items in which some letter appears at least twice (anywhere).', f: function (n) { return new Set(n.letters.split('')).size < n.letters.length; } },
    { id: 'evenlen', d: 5, kind: 'spell', text: 'Items with an even number of letters.', f: function (n) { return n.letters.length % 2 === 0; } },
    { id: 'firstlast', d: 6, kind: 'spell', text: 'Items whose first letter comes earlier in the alphabet than their last letter.', f: function (n) { return n.letters[0] < n.letters[n.letters.length - 1]; } },
    { id: 'abc', d: 7, kind: 'spell', text: 'Items containing two neighbouring letters that are also consecutive in the alphabet, in order (like ST in “stop”).', f: function (n) { for (var i = 1; i < n.letters.length; i++) if (n.letters.charCodeAt(i) - n.letters.charCodeAt(i - 1) === 1) return true; return false; } },
    { id: 'vgtc', d: 7, kind: 'spell', text: 'Items where vowels make up at least half the letters.', f: function (n) { return vowels(n.letters) * 2 >= n.letters.length; } },
    { id: 'cvc', d: 8, kind: 'spell', text: 'Items whose vowels and consonants strictly alternate (Y counts as a consonant).', f: function (n) { var w = n.letters; for (var i = 1; i < w.length; i++) if (isV(w[i]) === isV(w[i - 1])) return false; return true; } },
    { id: 'c_len5', d: 8, kind: 'spell', text: 'Items that start with a consonant AND have exactly five letters.', f: function (n) { return !isV(n.letters[0]) && n.letters.length === 5; } },
    { id: 'dbl_or_y', d: 8, kind: 'spell', text: 'Items with a double letter OR ending in Y (either is enough).', f: function (n) { return /(.)\1/.test(n.letters) || n.letters.slice(-1) === 'y'; } },
    { id: 'compound', d: 5, kind: 'spell', text: 'Items made of two words, written together or apart (“toothbrush”, “ice cream”).', f: function (n) { return compoundish(n); } },
    { id: 'syl1', d: 4, kind: 'sound', text: 'Items with exactly one syllable.', f: function (n) { return syllables(n) === 1; } },
    { id: 'syl3', d: 5, kind: 'sound', text: 'Items with three or more syllables.', f: function (n) { return syllables(n) >= 3; } },
    { id: 'syl2', d: 6, kind: 'sound', text: 'Items with exactly two syllables.', f: function (n) { return syllables(n) === 2; } },
    { id: 'vsound', d: 6, kind: 'sound', text: 'Items that begin with a vowel sound (so “hour” counts and “unicorn” does not).', f: function (n) { return vowelSoundStart(n); } },
    { id: 'chain', d: 6, kind: 'rel', text: 'Each item must start with the last letter of the previous accepted item. (The first item is always welcome.)', f: function (n, prev) { return !prev || n.letters[0] === prev[prev.length - 1]; } },
    { id: 'longer', d: 7, kind: 'rel', text: 'Each item must have more letters than the previous accepted item. (The first item is always welcome.)', f: function (n, prev) { return !prev || n.letters.length > prev.length; } },
    { id: 'shareletter', d: 8, kind: 'rel', text: 'Each item must share a letter with the previous accepted item, but not its first letter. (The first item is always welcome.)', f: function (n, prev) { if (!prev) return true; if (n.letters[0] === prev[0]) return false; for (var i = 0; i < n.letters.length; i++) if (prev.indexOf(n.letters[i]) >= 0) return true; return false; } },
    { id: 'alphaafter', d: 9, kind: 'rel', text: 'Each item must come later in alphabetical order than the previous accepted item. (The first item is always welcome.)', f: function (n, prev) { return !prev || n.letters > prev; } },
    { id: 'cat', d: 1, kind: 'sem', param: ['fruit', 'animal', 'clothing', 'instrument', 'vehicle', 'food'], text: function (k) { return 'Only ' + CATN[k] + '.'; }, f: function (n, p, c, k) { return hasCat(n, k); } },
    { id: 'cat2', d: 3, kind: 'sem', param: ['bird', 'insect', 'furniture', 'building', 'drink'], text: function (k) { return 'Only ' + CATN[k] + '.'; }, f: function (n, p, c, k) { return hasCat(n, k); } },
    { id: 'notfood', d: 4, kind: 'sem', text: 'Anything that is NOT something people eat or drink.', f: function (n) { var x = hasCat(n, 'food'); return x == null ? null : !x; } },
    { id: 'food_syl', d: 7, kind: 'sem', text: 'Only things people eat or drink whose names have two or more syllables.', f: function (n) { var x = hasCat(n, 'food'); return x == null ? null : x && syllables(n) >= 2; } },
    { id: 'animal_short', d: 8, kind: 'sem', text: 'Only animals whose names have five letters or fewer.', f: function (n) { var x = hasCat(n, 'animal'); return x == null ? null : x && n.letters.length <= 5; } },
    { id: 'animal_or_vowel', d: 8, kind: 'sem', text: 'Animals, or anything at all that starts with a vowel letter (either is enough).', f: function (n) { if (isV(n.letters[0])) return true; return hasCat(n, 'animal'); } },
    { id: 'cat_consonant', d: 9, kind: 'sem', param: ['food', 'clothing', 'animal'], text: function (k) { return 'Only ' + CATN[k] + ' whose names start with a consonant.'; }, f: function (n, p, c, k) { var x = hasCat(n, k); return x == null ? null : x && !isV(n.letters[0]); } },
    { id: 'notanimal_dbl', d: 9, kind: 'sem', text: 'Items with a double letter that are NOT animals.', f: function (n) { if (!/(.)\1/.test(n.letters)) return false; var x = hasCat(n, 'animal'); return x == null ? null : !x; } }
  ];
  function ruleById(id) { for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i]; }
  function ruleText(r, param) { return typeof r.text === 'function' ? r.text(param) : r.text; }
  function judgeWith(r, param, raw, prevLetters) { var n = typeof raw === 'string' ? normalize(raw) : raw; return r.f(n, prevLetters, null, param); }
  function judge(p, raw, prevLetters) { return judgeWith(ruleById(p.rule), p.param, raw, prevLetters); }
  var KINDS = { spell: 'the letters of the item', sem: 'what the item is (its meaning)', sound: 'how the item sounds', rel: 'how each item relates to the previous accepted one' };

  /* ---------- generation ---------- */
  function catalogue() { return Object.keys(vocab()); }
  function generate(level, rng) {
    var lv = PL.clamp(level, 1, 10), words = catalogue();
    var pool = RULES.filter(function (r) { return Math.abs(r.d - lv) <= 1; });
    for (var t = 0; t < 150; t++) {
      var r = rng.pick(pool.length ? pool : RULES), param = r.param ? rng.pick(r.param) : null;
      var P = { rule: r.id, param: param, kind: r.kind, d: r.d, v: 2 };
      if (r.kind !== 'rel') {
        var known = words.map(function (w) { return r.f(normalize(w), null, null, param); }).filter(function (x) { return x != null; });
        var yes = known.filter(Boolean).length;
        if (yes < 15 || yes > known.length * 0.65) continue;
      }
      var cands = rng.shuffle(words);
      if (r.kind === 'rel') {
        var first = cands[0], second = null, bad = null;
        for (var j = 1; j < cands.length && !second; j++) if (r.f(normalize(cands[j]), first, null, param) === true) second = cands[j];
        if (!second) continue;
        var sl = normalize(second).letters;
        for (j = 1; j < cands.length && !bad; j++) if (cands[j] !== second && r.f(normalize(cands[j]), sl, null, param) === false) bad = cands[j];
        if (!bad) continue;
        P.seed = [{ w: first, ok: true, prev: null }, { w: second, ok: true, prev: normalize(first).letters }, { w: bad, ok: false, prev: sl }];
      } else {
        var yesW = null, noW = null;
        for (var i = 0; i < cands.length && (!yesW || !noW); i++) { var res = r.f(normalize(cands[i]), null, null, param); if (res === true && !yesW) yesW = cands[i]; else if (res === false && !noW) noW = cands[i]; }
        if (!yesW || !noW) continue;
        P.seed = [{ w: yesW, ok: true }, { w: noW, ok: false }];
      }
      P.par = 6 + r.d * 2;
      P.options = nameOptions(P, rng);
      P.ruleText = ruleText(r, param);
      return P;
    }
    throw new Error('island generation failed');
  }
  /* candidate rule statements for "Name the rule": the true rule plus five that behave differently */
  function instances() {
    var out = [];
    RULES.forEach(function (r) { (r.param || [null]).forEach(function (pm) { out.push({ id: r.id, param: pm }); }); });
    return out;
  }
  function signature(inst, sample) {
    var r = ruleById(inst.id);
    return sample.map(function (w, i) { var prev = r.kind === 'rel' ? normalize(sample[(i + 5) % sample.length]).letters : null; var x = r.f(normalize(w), prev, null, inst.param); return x == null ? '?' : x ? '1' : '0'; }).join('');
  }
  function nameOptions(P, rng) {
    var sample = catalogue().slice(0, 160);
    var truth = { id: P.rule, param: P.param }, tsig = signature(truth, sample);
    var r0 = ruleById(P.rule);
    var others = rng.shuffle(instances().filter(function (x) { return !(x.id === truth.id && x.param === truth.param); }));
    // prefer the same kind, then different kinds; drop rules that sort the sample identically to the truth
    others.sort(function (a, b) { return (ruleById(a.id).kind === r0.kind ? 0 : 1) - (ruleById(b.id).kind === r0.kind ? 0 : 1); });
    var picked = [], sigs = {}; sigs[tsig] = 1;
    for (var i = 0; i < others.length && picked.length < 5; i++) { var s = signature(others[i], sample); if (sigs[s]) continue; sigs[s] = 1; picked.push(others[i]); }
    return rng.shuffle([truth].concat(picked)).map(function (x) { return { id: x.id, param: x.param, text: ruleText(ruleById(x.id), x.param) }; });
  }

  /* ---------- play ---------- */
  function init(p) { return { log: PL.deep(p.seed), tests: 0, phase: 'explore', test: null, guesses: [], named: [], hintN: 0 }; }
  function lastAccepted(gs) { for (var i = gs.log.length - 1; i >= 0; i--) if (gs.log[i].ok) return normalize(gs.log[i].w).letters; return null; }
  function buildTest(p, gs, rng) {
    var r = ruleById(p.rule), words = rng.shuffle(catalogue()), used = {};
    gs.log.forEach(function (x) { used[normalize(x.w).text] = 1; });
    var n = p.d >= 7 ? 8 : 6, yes = [], no = [];
    for (var i = 0; i < words.length && (yes.length < n / 2 || no.length < n / 2); i++) {
      var w = words[i]; if (used[w]) continue;
      var prev = r.kind === 'rel' ? words[(i + 7) % words.length] : null;
      var res = r.f(normalize(w), prev ? normalize(prev).letters : null, null, p.param);
      var item = { w: w, prev: prev, ok: res };
      if (res === true && yes.length < n / 2) yes.push(item);
      else if (res === false && no.length < n / 2) no.push(item);
    }
    return rng.shuffle(yes.concat(no)).map(function (x) { x.ans = null; return x; });
  }
  function view(api) {
    var p = api.p, gs = api.gs;
    var acc = gs.log.filter(function (x) { return x.ok; }), rej = gs.log.filter(function (x) { return !x.ok; });
    var chip = function (x, cls) { return h('span', { class: 'wchip ' + cls + (x.fromHint ? ' hinted' : '') }, x.w + (p.kind === 'rel' && x.prevW ? ' (after ' + x.prevW + ')' : '')); };
    var lists = h('div', { class: 'isl-lists' },
      h('div', { class: 'isl-col yes' }, h('div', { class: 'lbl' }, 'Allowed'), h('div', { class: 'wordchips' }, acc.map(function (x) { return chip(x, 'yes'); }))),
      h('div', { class: 'isl-col no' }, h('div', { class: 'lbl' }, 'Turned away'), h('div', { class: 'wordchips' }, rej.map(function (x) { return chip(x, 'no'); }))));
    if (p.kind === 'rel') lists.appendChild(h('div', { class: 'muted small isl-seq' }, 'Order of play: ' + gs.log.map(function (x) { return (x.ok ? '✓ ' : '✗ ') + x.w; }).join(' · ')));
    if (gs.phase === 'test' && !api.done) return h('div', { class: 'island' }, lists, testView(api));
    if (gs.phase === 'name' && !api.done) return h('div', { class: 'island' }, lists, nameView(api));
    var inp = h('input', { id: 'isl-in', class: 'txt', type: 'text', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', placeholder: 'Suggest something to bring', enterkeyhint: 'go' });
    function submit(e) {
      e.preventDefault();
      var n = normalize(inp.value);
      if (n.letters.length < 2) { api.toast('Type a word or short phrase.', ''); return; }
      if (n.words.length > 4) { api.toast('Keep it to four words or fewer.', ''); return; }
      var prev = lastAccepted(gs);
      if (p.kind !== 'rel' && gs.log.some(function (x) { return normalize(x.w).text === n.text; })) { api.toast('Already tried “' + n.text + '”.', ''); return; }
      var res = judge(p, n, prev);
      if (res === null) { api.toast('The island doesn’t recognise “' + n.text + '”, so it isn’t counted. Try another everyday thing.', ''); return; }
      var prevW = null; for (var i = gs.log.length - 1; i >= 0; i--) if (gs.log[i].ok) { prevW = gs.log[i].w; break; }
      gs.log.push({ w: n.text, ok: res, prev: prev, prevW: prevW }); gs.tests++;
      api.update(gs);
      setTimeout(function () { var el = document.getElementById('isl-in'); if (el) el.focus(); }, 30);
    }
    return h('div', { class: 'island' },
      h('div', { class: 'muted small' }, 'A secret rule decides what may come ashore. Suggest any word or short phrase; the island answers yes or no. Rules can be about letters, sound, meaning, or the previous accepted item.'),
      lists,
      api.done ? null : h('form', { class: 'row-in', onsubmit: submit }, inp, h('button', { class: 'btn primary', type: 'submit' }, 'Ask')),
      api.done ? null : h('div', { class: 'row-actions' }, h('span', { class: 'muted' }, PL.plural(gs.tests, 'test') + ' so far'),
        h('button', { class: 'btn primary', onclick: function () { gs.phase = 'name'; api.update(gs); } }, 'Name the rule'),
        h('button', { class: 'btn', onclick: function () { gs.test = { items: buildTest(p, gs, PL.rng(p.rule + ':' + gs.guesses.length + ':' + gs.tests)), note: '' }; gs.phase = 'test'; api.update(gs); } }, 'Prove it with a test')),
      h('details', { class: 'muted small' }, h('summary', null, 'How items are judged'), h('p', null, 'Capitals, punctuation and a leading “a”, “an” or “the” are ignored; letter rules ignore spaces. Meaning rules use a built-in dictionary: a word counts if any ordinary meaning fits, plurals are treated as singular, and a phrase is judged by its last word. Sound rules use standard American pronunciation.')));
  }
  function nameView(api) {
    var p = api.p, gs = api.gs;
    return h('div', { class: 'isl-test' },
      h('p', { class: 'q' }, 'Which rule is the island using?'),
      h('div', { class: 'opts' }, p.options.map(function (o, i) {
        var tried = gs.named.indexOf(i) >= 0;
        return h('button', { class: 'btn opt', disabled: tried, onclick: function () {
          gs.named.push(i);
          if (o.id === p.rule && o.param === p.param) { gs.phase = 'done'; gs.solvedBy = 'name'; api.update(gs); api.finish('solved'); return; }
          api.wrong(); api.toast('Not that one. Keep testing if you like.', 'bad'); api.update(gs);
        } }, o.text + (tried ? ' ✗' : ''));
      })),
      h('button', { class: 'btn ghost', onclick: function () { gs.phase = 'explore'; api.update(gs); } }, 'Back to testing'));
  }
  function testView(api) {
    var p = api.p, gs = api.gs, T = gs.test;
    var note = h('textarea', { id: 'isl-note', class: 'txt area', rows: 2, placeholder: 'Optional: your rule in your own words' }, T.note || '');
    note.addEventListener('input', function () { T.note = note.value; api.save(gs); });
    var all = T.items.every(function (x) { return x.ans != null; });
    return h('div', { class: 'isl-test' },
      h('p', { class: 'q' }, 'Prove it: which of these would the island accept?'),
      h('p', { class: 'muted small' }, 'Classify every item correctly to pass.' + (p.kind === 'rel' ? ' Each item shows the item accepted just before it.' : '')),
      note,
      T.items.map(function (it) {
        return h('div', { class: 'srow' }, h('span', { class: 'sname' }, it.w + (it.prev ? ' (after ' + it.prev + ')' : '')), h('div', { class: 'seg' }, [[true, 'Allowed'], [false, 'Not allowed']].map(function (o) {
          return h('button', { class: 'segb' + (it.ans === o[0] ? ' on' : ''), onclick: function () { it.ans = o[0]; api.update(gs); } }, o[1]);
        })));
      }),
      h('div', { class: 'row-actions' },
        h('button', { class: 'btn ghost', onclick: function () { gs.phase = 'explore'; gs.test = null; api.update(gs); } }, 'Back'),
        h('button', { class: 'btn primary', disabled: !all, onclick: function () {
          var wrong = T.items.filter(function (x) { return x.ans !== x.ok; });
          gs.guesses.push({ note: T.note || '', score: (T.items.length - wrong.length) + '/' + T.items.length });
          if (!wrong.length) { gs.phase = 'done'; gs.solvedBy = 'test'; api.update(gs); api.finish('solved'); return; }
          api.wrong();
          T.items.forEach(function (x) { gs.log.push({ w: x.w, ok: x.ok, prev: x.prev ? normalize(x.prev).letters : null, prevW: x.prev, fromTest: true }); });
          api.toast(wrong.length + ' of ' + T.items.length + ' wrong. The answers were added to your lists.', 'bad');
          gs.phase = 'explore'; gs.test = null; api.update(gs);
        } }, 'Submit')));
  }
  /* Hint: a strategically useful example with its verdict. It targets a rival rule that still fits the evidence. */
  function hint(p, gs) {
    var r = ruleById(p.rule), prev = lastAccepted(gs);
    var evidence = gs.log.map(function (x) { return x; });
    var rivals = instances().filter(function (inst) {
      if (inst.id === p.rule && inst.param === p.param) return false;
      var rr = ruleById(inst.id);
      return evidence.every(function (x) { var v = rr.f(normalize(x.w), x.prev || null, null, inst.param); return v === x.ok; });
    });
    var used = {}; gs.log.forEach(function (x) { used[normalize(x.w).text] = 1; });
    var words = PL.rng('isl-h' + gs.hintN + ':' + gs.tests).shuffle(catalogue()).filter(function (w) { return !used[w]; });
    var wantYes = gs.hintN % 2 === 0;
    var pick = null;
    for (var k = 0; k < rivals.length && !pick; k++) {
      var rv = ruleById(rivals[k].id);
      for (var i = 0; i < words.length; i++) {
        var n = normalize(words[i]), t = r.f(n, prev, null, p.param), o = rv.f(n, prev, null, rivals[k].param);
        if (t == null || o == null || t === o) continue;
        if (t === wantYes || i > 200) { pick = { w: words[i], ok: t }; break; }
      }
    }
    if (!pick) for (var j = 0; j < words.length; j++) { var t2 = r.f(normalize(words[j]), prev, null, p.param); if (t2 === wantYes) { pick = { w: words[j], ok: t2 }; break; } }
    if (!pick) return { msg: 'The rule is about ' + KINDS[p.kind] + '.' };
    gs.hintN++;
    var prevW = null; for (var q = gs.log.length - 1; q >= 0; q--) if (gs.log[q].ok) { prevW = gs.log[q].w; break; }
    gs.log.push({ w: pick.w, ok: pick.ok, prev: prev, prevW: prevW, fromHint: true });
    return { msg: '“' + pick.w + '” would be ' + (pick.ok ? 'allowed' : 'turned away') + (rivals.length ? ' — that separates the true rule from another rule your evidence still allows.' : '.'), gs: gs };
  }
  function evaluate(p, gs, ctx) {
    var solved = ctx.outcome === 'solved', over = Math.max(0, gs.tests - p.par);
    var q = solved ? PL.clamp(100 - over * 3 - ctx.wrong * 15 - ctx.hints * 10, 15, 100) : 0;
    return { quality: Math.round(q), metrics: { tests: gs.tests, hypotheses: (gs.guesses || []).length + (gs.named || []).length, wrongHyp: ctx.wrong, kind: p.kind, rule: p.rule, discovered: solved, noHint: solved && !ctx.hints, by: gs.solvedBy || null },
      lines: [['Examples tested', gs.tests + ' (par ' + p.par + ')'], ['Rule guesses and tests', (gs.guesses || []).length + (gs.named || []).length], ['Wrong guesses', ctx.wrong]] };
  }
  function review(p, gs) {
    var r = ruleById(p.rule);
    return h('div', { class: 'review' },
      h('div', { class: 'lbl' }, 'The rule'), h('p', null, h('b', null, p.ruleText || (r ? ruleText(r, p.param) : p.rule))),
      (gs.guesses || []).some(function (g) { return g.note; }) ? h('div', null, h('div', { class: 'lbl' }, 'Your wording'), gs.guesses.filter(function (g) { return g.note; }).map(function (g) { return h('p', { class: 'muted' }, '“' + g.note + '” (' + g.score + ')'); })) : null,
      h('div', { class: 'lbl' }, 'Evidence'), h('p', { class: 'small' }, gs.log.map(function (x) { return (x.ok ? '✓ ' : '✗ ') + x.w; }).join(' · ')),
      h('p', { class: 'muted small' }, 'The rule was fixed before you started and every answer came from the same test.'));
  }
  function stats(atts) {
    var by = {}; atts.forEach(function (a) { var k = a.metrics && a.metrics.kind; if (!k) return; (by[k] = by[k] || { n: 0, ok: 0 }); by[k].n++; if (a.outcome === 'solved') by[k].ok++; });
    var rows = [['Average examples tested', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.tests; })).toFixed(1) : '—'],
      ['Average guesses', atts.length ? PL.mean(atts.map(function (a) { return a.metrics.hypotheses || 0; })).toFixed(1) : '—'],
      ['Discovered without hints', atts.length ? Math.round(100 * atts.filter(function (a) { return a.metrics.noHint; }).length / atts.length) + '%' : '—']];
    var names = { spell: 'Letter rules', sem: 'Meaning rules', sound: 'Sound rules', rel: 'Sequence rules' };
    Object.keys(by).forEach(function (k) { rows.push([names[k] || k, by[k].ok + '/' + by[k].n + ' discovered']); });
    return rows;
  }
  PL.games.island = {
    id: 'island', name: 'The Island', blurb: 'Discover the secret rule for what may come ashore.',
    rules: 'A hidden rule, fixed before you begin, decides what may come to the island. Suggest words or short phrases and watch the yes/no answers. When you think you know it, name the rule from a short list, or prove it by sorting fresh items. Fewer examples means a better score.',
    generate: generate, init: init, view: view, hint: hint, evaluate: evaluate, review: review, stats: stats,
    benchmark: function (lv) { return 90 + lv * 30; }, timeLimit: function (lv) { return 240 + lv * 30; },
    _rules: RULES, _judge: judge, _normalize: normalize, _meaning: meaning, _syllables: syllables, _buildTest: buildTest, _ruleById: ruleById
  };
})();

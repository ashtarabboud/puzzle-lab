/* Build the offline lexicon used by The Island.
   Sources: WordNet 3.1 (Princeton, nouns) for categories; CMU Pronouncing Dictionary for syllables and initial sounds.
   Output: src/data/lexicon.js defining PL.data.lexicon = { cats: [...], w: { word: "mask36,syllables,vowelSound" } }
   Category policy: a word belongs to a category if any of its ordinary noun senses does (stated to the player). */
const fs = require('fs'), path = require('path');
const DICT = require('wordnet-db').path;
const { dictionary: CMU } = require('cmu-pronouncing-dictionary');

const LEXFILE = { 5: 'animal', 13: 'food', 20: 'plant', 6: 'artifact', 8: 'body', 18: 'person', 17: 'object', 15: 'location', 27: 'substance', 19: 'phenomenon' };
// categories: name -> anchors [lemma, lexfile] (synsets whose hyponym closure defines the category) or lexfile
const CATS = [
  ['animal', { lex: 5 }], ['bird', { anchor: [['bird', 5]] }], ['fish', { anchor: [['fish', 5]] }], ['insect', { anchor: [['insect', 5], ['spider', 5], ['worm', 5]] }],
  ['mammal', { anchor: [['mammal', 5]] }], ['plant', { lex: 20 }], ['tree', { anchor: [['tree', 20]] }], ['flower', { anchor: [['flower', 20]] }],
  ['food', { lex: 13 }], ['fruit', { anchor: [['edible fruit', 13], ['fruit', 20]] }], ['vegetable', { anchor: [['vegetable', 13]] }], ['drink', { anchor: [['beverage', 13]] }],
  ['dish', { anchor: [['dish', 13], ['sandwich', 13], ['baked goods', 13], ['dessert', 13], ['soup', 13]] }],
  ['artifact', { lex: 6 }], ['tool', { anchor: [['tool', 6], ['implement', 6], ['utensil', 6]] }], ['vehicle', { anchor: [['vehicle', 6], ['craft', 6]] }],
  ['instrument', { anchor: [['musical instrument', 6]] }], ['furniture', { anchor: [['furniture', 6]] }], ['clothing', { anchor: [['clothing', 6], ['footwear', 6], ['headdress', 6], ['garment', 6], ['jewelry', 6]] }],
  ['container', { anchor: [['container', 6]] }], ['building', { anchor: [['building', 6], ['structure', 6]] }], ['device', { anchor: [['device', 6]] }],
  ['weapon', { anchor: [['weapon', 6]] }], ['toy', { anchor: [['plaything', 6]] }], ['body', { lex: 8 }], ['person', { lex: 18 }],
  ['place', { lex: 15 }], ['nature', { lexes: [17, 19] }], ['substance', { lex: 27 }], ['sport', { anchor: [['sport', 4], ['game', 4]] }]
];

function readData() {
  const data = {};
  for (const line of fs.readFileSync(path.join(DICT, 'data.noun'), 'utf8').split('\n')) {
    if (!line || line[0] === ' ') continue;
    const [head, gloss = ''] = line.split(' | ');
    const t = head.split(' ');
    const off = t[0], lex = parseInt(t[1], 10), wcnt = parseInt(t[3], 16);
    const words = []; let i = 4;
    for (let k = 0; k < wcnt; k++) { words.push(t[i].toLowerCase()); i += 2; }
    const pcnt = parseInt(t[i], 10); i++;
    const hyper = []; let instance = false;
    for (let k = 0; k < pcnt; k++) { const sym = t[i], o = t[i + 1], pos = t[i + 2]; if ((sym === '@' || sym === '@i') && pos === 'n') hyper.push(o); if (sym === '@i') instance = true; i += 4; }
    data[off] = { lex, words, hyper, instance, offensive: /\((offensive|ethnic slur|disparaging|vulgar|obscene)/i.test(gloss) };
  }
  return data;
}
const tagged = {};
function readIndex() {
  const idx = {};
  for (const line of fs.readFileSync(path.join(DICT, 'index.noun'), 'utf8').split('\n')) {
    if (!line || line[0] === ' ') continue;
    const t = line.trim().split(' ');
    const lemma = t[0], scnt = parseInt(t[2], 10);
    idx[lemma] = t.slice(t.length - scnt); tagged[lemma] = parseInt(t[t.length - scnt - 1], 10) || 0;
  }
  return idx;
}
const data = readData(), idx = readIndex();
// resolve anchors
function anchorOffsets(lemma, lex) { return (idx[lemma.replace(/ /g, '_')] || []).filter(o => data[o] && data[o].lex === lex); }
const catDefs = CATS.map(([name, d]) => ({ name, lex: d.lex, lexes: d.lexes, anchors: new Set((d.anchor || []).flatMap(([l, x]) => anchorOffsets(l, x))) }));
catDefs.forEach(c => { if (c.lex == null && !c.lexes && !c.anchors.size) console.warn('No anchor for', c.name); });
const closureCache = {};
function closure(off) {
  if (closureCache[off]) return closureCache[off];
  const seen = new Set(), stack = [off];
  while (stack.length) { const o = stack.pop(); if (seen.has(o) || !data[o]) continue; seen.add(o); data[o].hyper.forEach(x => stack.push(x)); }
  return (closureCache[off] = seen);
}
function catsOfSense(off) {
  const d = data[off], cl = closure(off); let mask = 0;
  catDefs.forEach((c, i) => {
    if ((c.lex != null && d.lex === c.lex) || (c.lexes && c.lexes.indexOf(d.lex) >= 0)) mask |= (1 << i);
    else if (c.anchors.size) { for (const a of c.anchors) if (cl.has(a)) { mask |= (1 << i); break; } }
  });
  return mask;
}
// candidate vocabulary: lemmas made of common words (tiers up to 50 from SCOWL) — keeps the file small and avoids obscure terms
const wl = require('wordlist-english');
const common = new Set(['10', '20', '35', '40', '50'].flatMap(lv => [...wl['english/' + lv], ...(wl['english/american/' + lv] || [])]).filter(x => /^[a-z]+$/.test(x)));
const out = {};
let n = 0;
for (const lemma in idx) {
  if (!/^[a-z]+(_[a-z]+)?$/.test(lemma)) continue;
  const parts = lemma.split('_');
  if (!parts.every(p => common.has(p))) continue;
  // senses attested in tagged text (frequency-ordered); if none are attested, all senses count
  // policy: a word belongs to a category if ANY of its ordinary (non-offensive, non-proper-name) noun senses does
  const senses = idx[lemma].filter(o => data[o] && !data[o].instance && !data[o].offensive);
  if (!senses.length) continue;
  let mask = 0; senses.forEach(o => { mask |= catsOfSense(o); });
  if (!mask) continue;
  out[lemma.replace('_', ' ')] = mask; n++;
}
// pronunciations for every common word plus lexicon words
function phon(word) {
  const p = CMU[word]; if (!p) return null;
  const ph = p.split(' ');
  const syl = ph.filter(x => /\d/.test(x)).length;
  const vowelStart = /\d/.test(ph[0]) ? 1 : 0;
  return [syl, vowelStart];
}
const W = {};
const common35 = new Set(['10', '20', '35'].flatMap(lv => [...wl['english/' + lv], ...(wl['english/american/' + lv] || [])]).filter(x => /^[a-z]+$/.test(x)));
const allWords = new Set([...common35, ...Object.keys(out).flatMap(k => k.split(' '))]);
let withPhon = 0;
for (const w of allWords) {
  const mask = out[w] || 0, ph = phon(w);
  if (!mask && !ph) continue;
  W[w] = mask.toString(36) + (ph ? ',' + ph[0] + ',' + ph[1] : '');
  if (ph) withPhon++;
}
for (const k in out) if (k.indexOf(' ') > 0) W[k] = out[k].toString(36);
const js = '/* Generated by tools/build-lexicon.js from WordNet 3.1 (Princeton University) and the CMU Pronouncing Dictionary. Do not edit by hand. */\nPL.data.lexicon=' + JSON.stringify({ cats: catDefs.map(c => c.name), w: W }) + ';\n';
fs.writeFileSync('src/data/lexicon.js', js);
console.log('nouns', n, 'entries', Object.keys(W).length, 'with phonetics', withPhon, (js.length / 1024).toFixed(0) + 'KB');

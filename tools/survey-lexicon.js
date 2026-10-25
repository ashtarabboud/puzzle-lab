/* Shared lexicon for the Survey Says data audit: every word known to SCOWL (English + American, sizes 10-70,
   proper names included) or to WordNet 3.1 (all lemmas, including multi-word names), lower-cased.
   Used only at build time; nothing here ships to the phone except what tools/build-survey-ff.py writes. */
const fs = require('fs'), path = require('path');
module.exports = function lexicon() {
  const set = new Set(), nm = path.join(__dirname, '..', 'node_modules');
  for (const v of ['english', 'american']) for (const n of [10, 20, 35, 40, 50, 55, 60, 70]) {
    const f = path.join(nm, 'wordlist-english', `${v}-words-${n}.json`);
    if (fs.existsSync(f)) JSON.parse(fs.readFileSync(f, 'utf8')).forEach(w => set.add(w.toLowerCase().replace(/[’']/g, '')));
  }
  for (const pos of ['noun', 'verb', 'adj', 'adv']) {
    for (const line of fs.readFileSync(path.join(nm, 'wordnet-db', 'dict', 'index.' + pos), 'utf8').split('\n')) {
      if (!line || line[0] === ' ') continue;
      const lemma = line.split(' ')[0]; set.add(lemma.replace(/_/g, ' ')); lemma.split('_').forEach(w => set.add(w.replace(/[’']/g, '')));
    }
  }
  return set;
};

# Puzzle data

| File | Used by | Source / licence |
|---|---|---|
| `password_v2_a.json`, `password_v2_b.json` | Password, Word Detective | Original curated content (v3 bank). `password_a/b.json` are the retired v1 bank. |
| `island_vocab.json` | The Island | Original curated catalogue. |
| `wordlinks.json` | Word Links | Original curated phrase bank. |
| `trails.json` | Word Trails | Original curated themes. |
| `threads.json` | Common Threads | Original curated categories with complete membership lists. |
| `survey.json` | Survey Says | **ProtoQA crowdsourced evaluation set** (Boratko et al., 2020, "ProtoQA: A Question Answering Dataset for Prototypical Common-Sense Reasoning", EMNLP), https://github.com/iesl/protoqa-data, licensed **CC BY 4.0** (`SURVEY-LICENSE-CC-BY-4.0.txt`). Built with `tools/build-survey.py`: answers and counts are unchanged; some cluster display labels were replaced with clearer wording taken from the cluster's own answers. Only the crowdsourced set is used (the scraped Family Feud training data is deliberately excluded). |
| `survey_ff.json` | Survey Says | **Family Feud question database supplied by the owner** (`source/Family_Feud_Question_Database.xlsx`, provided for use in this app). Built with `tools/build-survey-ff.py`: only the sheets that list a count for every answer ("3 Answers" to "7 Answers", "Sheet1") are used; answer text and counts are unchanged (out of 100). Labels such as "Island/Beach" also accept each part. Rows with missing counts, totals above 100, conflicting duplicate answers or repeated questions are skipped. The "No Points" and "Fast Money" sheets are not used because they lack full counts. |
| `src/data/words.js`, `src/data/five.js` | many | SCOWL word lists via `wordlist-english`. |
| `src/data/lexicon.js` | The Island | WordNet 3.1 (Princeton University licence) and the CMU Pronouncing Dictionary. |

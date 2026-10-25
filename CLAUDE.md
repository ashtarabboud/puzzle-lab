# Puzzle Lab — notes for Claude

Personal puzzle arcade, installed on the owner's iPhone as a Home Screen web app (PWA) served by GitHub Pages.
The owner works only from an iPhone: never ask them to run commands, edit files, or use a computer.

## Layout
- `src/core/` shared services: `base.js` (namespace, RNG, rationals, dictionary), `linalg.js`, `store.js` (IndexedDB),
  `model.js` (ratings/adaptive difficulty, attempts, daily quiz, migrations, import/export), `scratch.js`, `calc.js`, `app.js` (UI shell).
- `src/games/<id>.js` one engine per game. Interface: `generate(level, rng, ctx)`, `init(p)`, `view(api)`, `hint(p, gs)` →
  `{msg, gs?, noCount?, after?}`, `evaluate(p, gs, ctx)` → `{quality, metrics, lines}`, `review(p, gs)`, `stats(atts)`, `benchmark(lv)`, `timeLimit(lv)`.
- Active games: `PL.order` in base.js. `logic.js` is retired (kept only to review old records).
- `data/*.json` curated banks; `src/data/words.js` and `src/data/lexicon.js` are generated (`npm run data`).
- `tools/build.js` → `dist/` (hashed assets, manifest, service worker). `public/` holds icons and fonts.

## Rules
- Every puzzle must be validated before display (solvers / exhaustive search / exact arithmetic). Add a unit test for any new generator.
- A finished session must never be written back as active (see lifecycle comments in app.js: session ids, `live()` guard).
- Data changes need a schema bump + migration in `PL.migrate` / `M.migrateDay`; never drop user history.
- No paid APIs. Everything runs offline on the phone.

## Commands
- `npm test` — unit tests for all engines and core logic.
- `npm run build` — build `dist/`.
- `npm run e2e` — iPhone-sized browser tests (Playwright Chromium; needs `npm run build` first).
- Deploy: `npm run deploy` publishes `dist/` to the `gh-pages` branch.

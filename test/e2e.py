"""iPhone-sized browser tests (Playwright Chromium, 390x844, touch) against a local build of dist/.
Covers: five consecutive puzzles per game through the real UI, Next Puzzle transitions, timer stop/start,
no duplicate attempts, hints, wrong answers, give up, leave/return, reload/resume, daily quiz, calculator,
scratchpad drawing, Island phrase input, offline reload, export/import of an old-format backup."""
import asyncio, json, os, sys, subprocess, time, http.server, threading, functools
from playwright.async_api import async_playwright

ROOT = os.path.join(os.path.dirname(__file__), '..')
DIST = os.path.join(ROOT, 'dist')
OUT = os.environ.get('E2E_OUT', '/tmp/puzzle-e2e')
os.makedirs(OUT, exist_ok=True)
PORT = 8766
results = []
def check(cond, msg):
    results.append((bool(cond), msg))
    print(('  ok   ' if cond else '  FAIL ') + msg, flush=True)

def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    httpd.log_message = lambda *a: None
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

URL = f'http://localhost:{PORT}/index.html'
GAMES = ['password', 'island', 'bridges', 'algebra', 'loop', 'detective', 'shape', 'balance', 'reverse', 'links',
         'wordcount', 'wordgrid', 'threads', 'trails', 'wordrush', 'catlogic', 'survey']

async def open_game(page, g):
    await page.locator(f'.gtile:has(.gc-name:text-is("{NAMES[g]}"))').click()
NAMES = {'password': 'Password', 'island': 'The Island', 'bridges': 'Word Bridges', 'algebra': 'Algebra Arcade', 'loop': 'Loop Logic',
         'detective': 'Word Detective', 'shape': 'Shape Shift', 'balance': 'Balance', 'reverse': 'Reverse Engineer', 'links': 'Word Links',
         'wordcount': 'Word Count', 'wordgrid': 'Word Grid', 'threads': 'Common Threads', 'trails': 'Word Trails', 'wordrush': 'Word Rush',
         'catlogic': 'Cat Logic', 'survey': 'Survey Says'}

async def type_word(page, w):
    for ch in w:
        await page.locator(f'.kbk[aria-label="{ch.upper()}"]').click()
    await page.locator('.kbk.wide:has-text("Enter")').click(); await page.wait_for_timeout(60)

async def trace_path(page, path):
    cells = page.locator('.tr-cell')
    for i in path:
        b = await cells.nth(i).bounding_box()
        await page.mouse.click(b['x'] + b['width'] / 2, b['y'] + b['height'] / 2)
    await page.locator('.tr-controls button:has-text("Enter")').click(); await page.wait_for_timeout(60)

async def cur(page, expr):
    return await page.evaluate('(() => { const c = PL._cur(); return ' + expr + '; })()')

async def solve_current(page, g, with_wrong=False):
    """Solve the puzzle on screen through the UI (shape uses a placement hook because drag is pointer-gesture based)."""
    p = await cur(page, 'c.p.qs ? c.p.qs[c.rec.gs.i] : c.p')
    if g == 'password':
        for i, w in enumerate(p['words']):
            if with_wrong and i == 0:
                await page.fill('#pw-in', 'zzzz'); await page.press('#pw-in', 'Enter'); await page.wait_for_timeout(60)
            await page.fill('#pw-in', w['w'].lower()); await page.press('#pw-in', 'Enter'); await page.wait_for_timeout(60)
    elif g == 'island':
        await page.fill('#isl-in', 'a fireplace'); await page.press('#isl-in', 'Enter'); await page.wait_for_timeout(60)
        await page.click('.island button:has-text("Name the rule")')
        opts = p['options']; idx = next(i for i, o in enumerate(opts) if o['id'] == p['rule'] and o['param'] == p['param'])
        if with_wrong:
            await page.locator('.opts .btn').nth((idx + 1) % len(opts)).click(); await page.wait_for_timeout(60)
        await page.locator('.opts .btn').nth(idx).click()
    elif g == 'bridges':
        if with_wrong:
            await page.fill('#bridge-in', 'qqqq'); await page.press('#bridge-in', 'Enter'); await page.wait_for_timeout(60)
        for w in p['solution'][1:]:
            await page.fill('#bridge-in', w); await page.press('#bridge-in', 'Enter'); await page.wait_for_timeout(60)
    elif g == 'algebra':
        if p['format'] == 'mc':
            if with_wrong: await page.locator('.opts .btn').nth((p['ans'] + 1) % len(p['opts'])).click(); await page.wait_for_timeout(60)
            await page.locator('.opts .btn').nth(p['ans']).click()
        else:
            a = await cur(page, 'PL.qstr((c.p.qs ? c.p.qs[c.rec.gs.i] : c.p).ans)')
            if with_wrong:
                await page.fill('#alg-1', '99999');
                if p['format'] == 'multi': await page.fill('#alg-2', '1')
                await page.click('.alg-form button[type=submit]'); await page.wait_for_timeout(60)
            await page.fill('#alg-1', a)
            if p['format'] == 'multi': await page.fill('#alg-2', await cur(page, 'PL.qstr((c.p.qs ? c.p.qs[c.rec.gs.i] : c.p).ans2)'))
            await page.click('.alg-form button[type=submit]')
    elif g == 'loop':
        for e, v in enumerate(p['sol']):
            if v: await page.locator(f'.lp-hit[data-e="{e}"]').dispatch_event('click')
        if with_wrong:
            # add a stray line then remove it again after a failed check
            extra = next(e for e, v in enumerate(p['sol']) if not v)
            await page.locator(f'.lp-hit[data-e="{extra}"]').dispatch_event('click')
            await page.click('.loop button:has-text("Check loop")'); await page.wait_for_timeout(60)
            await page.locator(f'.lp-hit[data-e="{extra}"]').dispatch_event('click'); await page.locator(f'.lp-hit[data-e="{extra}"]').dispatch_event('click')
        await page.click('.loop button:has-text("Check loop")')
    elif g == 'detective':
        wl = page.locator('.det-acts button:has-text("Word length")')
        if await wl.is_enabled(): await wl.click(); await page.wait_for_timeout(40)
        if with_wrong: await page.fill('#det-in', 'xyzzy'); await page.press('#det-in', 'Enter'); await page.wait_for_timeout(60)
        await page.fill('#det-in', p['w'].lower()); await page.press('#det-in', 'Enter')
    elif g == 'shape':
        await page.evaluate("""(() => { const c = PL._cur(); const p = c.p; c.rec.gs.pcs.forEach(s => { const d = p.pieces.find(x => x.id === s.id); s.cells = d.sol.cells; s.at = { r: d.sol.r, c: d.sol.c }; }); c.rec.gs.moves = p.target_moves; PL._testFinish('solved'); })()""")
    elif g == 'balance':
        k = p['kind']; ans = p['answer']
        if with_wrong and k in ('value', 'ratio'):
            await page.fill('#bal-in', '777'); await page.press('#bal-in', 'Enter'); await page.wait_for_timeout(60)
        if k in ('value', 'ratio'): await page.fill('#bal-in', str(ans)); await page.press('#bal-in', 'Enter')
        elif k == 'insufficient': await page.click('.balance button:has-text("Not enough information")')
        elif k == 'compare': await page.locator('.opts .btn').nth({'x': 0, 'y': 1, 'eq': 2, 'unk': 3}[ans]).click()
        else: await page.locator('.opts .btn').nth(ans).click()
    elif g == 'reverse':
        t = p['type']
        if t in ('num', 'constraint'):
            if with_wrong: await page.fill('#re-in', str(p['answer'] + 1)); await page.press('#re-in', 'Enter'); await page.wait_for_timeout(60)
            await page.fill('#re-in', str(p['answer'])); await page.press('#re-in', 'Enter')
        elif t == 'multi' and p['mode'] == 'list':
            await page.fill('#re-in', ', '.join(map(str, p['answer']))); await page.press('#re-in', 'Enter')
        elif t == 'multi':
            await page.locator('.opts .btn').nth(p['answer']).click()
        elif t == 'seq':
            row = await cur(page, 'c.rec.gs.tws ? c.rec.gs.tws.rows[0] : c.p.final')
            target = p['answer']; row = list(row)
            tiles = page.locator('.tws-row').first.locator('.tws-tile')
            for i in range(len(target)):
                if row[i] == target[i]: continue
                j = next(j for j in range(i + 1, len(row)) if row[j] == target[i])
                await tiles.nth(i).click(); await tiles.nth(j).click(); await page.wait_for_timeout(40)
                row[i], row[j] = row[j], row[i]
                tiles = page.locator('.tws-row').first.locator('.tws-tile')
            await page.locator('.tws-row').first.locator('button:has-text("Check")').click()
        elif t == 'grid':
            cells = await cur(page, 'c.rec.gs.cells'); target = p['answer']; n = len(cells)
            for i in range(n):
                if cells[i] == target[i]: continue
                j = next(j for j in range(i + 1, n) if cells[j] == target[i])
                grid = page.locator('.re-boards > div').nth(1).locator('.re-cell')
                await grid.nth(i).click(); await grid.nth(j).click()
                cells[i], cells[j] = cells[j], cells[i]
            await page.click('.reverse button:has-text("Check this board")')
        elif t == 'missing':
            for q, mi in enumerate(p['answer']):
                await page.locator('.srow.col').nth(q).locator('.btn').nth(mi).click()
            await page.click('.reverse button.wide.primary')
    elif g in ('wordgrid', 'wordcount'):
        if with_wrong:
            wrong = await page.evaluate('''() => { const c = PL._cur(), p = c.p.qs ? c.p.qs[c.rec.gs.i] : c.p;
                for (const g of PL.five.data().guess) { if (g !== p.w && (!p.pool || (g.split('').every(x => p.pool.includes(x)) && !PL.five.repeats(g)))) return g; } }''')
            await type_word(page, wrong)
        await type_word(page, p['w'])
    elif g == 'threads':
        for grp in p['groups']:
            for w in grp['words']:
                await page.locator(f'.th-tile:text-is("{w}")').click()
            await page.locator('.th-actions button:has-text("Submit")').click(); await page.wait_for_timeout(80)
    elif g == 'trails':
        for pl in p['words']:
            await trace_path(page, pl['path'])
    elif g == 'wordrush':
        if await page.locator('button:has-text("Start untimed")').count():
            await page.click('button:has-text("Start untimed")'); await page.wait_for_timeout(80)
        w = p['common'][0] if p.get('common') else p['words'][0]
        path = await page.evaluate('''(w) => { const c = PL._cur(), p = c.p, cols = p.size; let res = null;
            (function find(pos, k, used) { if (res) return; const L = p.letters[pos].toLowerCase(); if (w.substr(k, L.length) !== L) return;
              used.push(pos); if (k + L.length === w.length) { res = used.slice(); return; }
              for (let j = 0; j < p.letters.length; j++) if (used.indexOf(j) < 0 && PL.trace.adj(pos, j, cols)) find(j, k + L.length, used);
              used.pop(); })
            ; for (let i = 0; i < p.letters.length && !res; i++) (function f(){ const used=[]; (function find(pos, k){ if (res) return; const L = p.letters[pos].toLowerCase(); if (w.substr(k, L.length) !== L) return; used.push(pos); if (k + L.length === w.length) { res = used.slice(); return; } for (let j = 0; j < p.letters.length; j++) if (used.indexOf(j) < 0 && PL.trace.adj(pos, j, cols)) find(j, k + L.length); used.pop(); })(i, 0); })();
            return res; }''', w)
        await trace_path(page, path)
        b = page.locator('button:has-text("Finish round")'); await b.click(); await page.locator('button:has-text("Tap again to finish")').click()
    elif g == 'catlogic':
        n = p['n']
        for r, c in enumerate(p['sol']):
            cell = page.locator('.cl-cell').nth(r * n + c)
            await cell.click(); await cell.click(); await page.wait_for_timeout(30)
    elif g == 'survey':
        if with_wrong:
            await page.fill('#sv-in', 'zzqqxx'); await page.press('#sv-in', 'Enter'); await page.wait_for_timeout(60)
        for c in p['board']:
            if await page.locator('.summary').count(): break
            await page.fill('#sv-in', c['label']); await page.press('#sv-in', 'Enter'); await page.wait_for_timeout(60)
    elif g == 'links':
        for li in p['order']:
            L = p['links'][li]
            if with_wrong and li == p['order'][0]:
                await page.fill(f'#wl-{li}', 'nonsense'); await page.press(f'#wl-{li}', 'Enter'); await page.wait_for_timeout(60)
            await page.fill(f'#wl-{li}', L['text']); await page.press(f'#wl-{li}', 'Enter'); await page.wait_for_timeout(60)

async def go_home(page):
    await page.evaluate('PL._go({name:"home"})'); await page.wait_for_selector('.games')

async def main():
    httpd = serve()
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        page = await ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await page.goto(URL); await page.wait_for_selector('.gtile')
        check(await page.locator('.gtile').count() == 17, 'home shows 17 games')
        names = await page.locator('.gtile .gc-name').all_inner_texts()
        check('Logic Lab' not in names and 'Reverse Engineer' in names and 'Word Links' in names, 'Logic Lab removed, new games present')
        await page.screenshot(path=f'{OUT}/home.png', full_page=True)

        # ---- five consecutive puzzles per game through Next Puzzle ----
        only = os.environ.get('E2E_GAMES')
        for gi, g in enumerate(GAMES):
            if only and g not in only.split(','): continue
            await open_game(page, g); await page.wait_for_selector('#gamebody')
            ids = []
            for k in range(5):
                await page.wait_for_selector('#gamebody'); await page.wait_for_timeout(120)
                rid = await cur(page, 'c.rec.id'); done0 = await cur(page, 'c.done')
                check(not done0, f'{g} #{k+1}: new puzzle is interactive (not marked done)')
                ms0 = await cur(page, 'c.rec.activeMs')
                check(ms0 < 1500, f'{g} #{k+1}: fresh timer ({int(ms0)} ms)')
                if k == 1:  # use a hint on the second puzzle
                    if g == 'wordrush' and await page.locator('button:has-text("Start untimed")').count():
                        await page.click('button:has-text("Start untimed")'); await page.wait_for_timeout(80)
                    await page.click('#hintbtn'); await page.wait_for_timeout(80)
                    check(await cur(page, 'c.rec.hints') >= 1, f'{g}: hint recorded')
                await page.wait_for_timeout(1100)
                multi = await cur(page, '!!c.p.qs')
                for qi in range(5 if multi else 1):
                    await solve_current(page, g, with_wrong=(k == 2 and qi == 0))
                    if multi and qi < 4:
                        await page.wait_for_selector('.q-result', timeout=8000)
                        await page.click('.q-result .btn'); await page.wait_for_timeout(80)
                await page.wait_for_selector('.summary', timeout=8000)
                title = await page.locator('.summary h2').inner_text()
                check(('5 of 5 correct' in title) if multi else ('Solved' in title), f'{g} #{k+1}: solved ({title})')
                ms1 = await cur(page, 'c.rec.activeMs'); await page.wait_for_timeout(1300); ms2 = await cur(page, 'c.rec.activeMs')
                check(ms1 == ms2, f'{g} #{k+1}: timer stopped on completion')
                ids.append(rid)
                if k == 0: await page.screenshot(path=f'{OUT}/g_{g}_done.png', full_page=True)
                await page.wait_for_timeout(900)  # let any pending debounced writes fire (the old bug)
                await page.click('.summary .btn.primary')
            check(len(set(ids)) == 5, f'{g}: five different puzzle instances')
            n_att = await page.evaluate(f"PL.model.attempts(a => a.game === '{g}').length")
            check(n_att == 5, f'{g}: exactly five attempts saved (got {n_att})')
            await page.screenshot(path=f'{OUT}/g_{g}_play.png', full_page=True)
            await go_home(page)

        # ---- give up, leave/return, reload/resume ----
        await open_game(page, 'bridges'); await page.wait_for_selector('#bridge-in')
        sol = await cur(page, 'c.p.solution'); rid = await cur(page, 'c.rec.id')
        await page.fill('#bridge-in', sol[1]); await page.press('#bridge-in', 'Enter'); await page.wait_for_timeout(1500)
        await go_home(page)
        check(await page.locator('.resume').count() >= 1, 'leaving keeps the puzzle resumable')
        await page.reload(); await page.wait_for_selector('.games')
        await open_game(page, 'bridges'); await page.wait_for_selector('#bridge-in')
        check(await cur(page, 'c.rec.id') == rid and len(await cur(page, 'c.rec.gs.path')) == 2, 'reload resumes the same attempt with its moves')
        await page.click('summary[aria-label="More actions"]'); await page.click('text=Give up'); await page.click('text=Tap again to give up and see the solution')
        await page.wait_for_selector('.summary'); check('Not solved' in await page.locator('.summary h2').inner_text(), 'give up records a failure')
        await page.click('.summary .btn.primary'); await page.wait_for_selector('#bridge-in')
        check(await cur(page, 'c.rec.id') != rid and not await cur(page, 'c.done'), 'next puzzle after giving up is fresh')
        # pause/resume
        await page.wait_for_timeout(1200); await page.click('[aria-label="Pause"]'); a = await cur(page, 'c.rec.activeMs'); await page.wait_for_timeout(1500); b2 = await cur(page, 'c.rec.activeMs')
        check(a == b2, 'pause stops the clock'); await page.click('.pause-cover .btn'); await page.wait_for_timeout(1500)
        check(await cur(page, 'c.rec.activeMs') > b2, 'resume restarts the clock')

        # ---- calculator & scratchpad ----
        await go_home(page); await open_game(page, 'algebra'); await page.wait_for_selector('#gamebody')
        await page.click('[aria-label="Calculator"]'); await page.wait_for_selector('.calc-pad')
        for k in ['3', '÷', '4', '+', '1', 'a/b', '6', '=']:
            await page.locator('.ckey', has_text=k).first.click() if k not in ('+', '÷', '=') else await page.locator(f'.ckey[aria-label="{k}"]').click()
        res = await page.locator('.calc-res').inner_text(); check('11/12' in res, 'calculator: 3÷4+1/6 = 11/12 (' + res + ')')
        await page.screenshot(path=f'{OUT}/calculator.png')
        await page.click('.dock button:has-text("Close")')
        await page.click('.toolbar button:has-text("Scratchpad")'); await page.wait_for_selector('.scr-canvas')
        box = await page.locator('.scr-canvas').bounding_box()
        await page.mouse.move(box['x'] + 40, box['y'] + 40); await page.mouse.down()
        for i in range(12): await page.mouse.move(box['x'] + 40 + i * 12, box['y'] + 40 + i * 6)
        await page.mouse.up(); await page.wait_for_timeout(800)
        key = await cur(page, 'c.rec.id')
        check(await page.evaluate(f"PL.model.scratch('{key}').draw.length") == 1, 'scratchpad stroke saved')
        await page.screenshot(path=f'{OUT}/scratchpad.png')
        await page.click('.dock button:has-text("Close")')

        # ---- Island ordinary input ----
        await go_home(page); await open_game(page, 'island'); await page.wait_for_selector('#isl-in')
        before = len(await cur(page, 'c.rec.gs.log'))
        for w in ['tacos', 'a fireplace', 'Ice Cream!', 'mice', 'the Eiffel tower']:
            await page.fill('#isl-in', w); await page.press('#isl-in', 'Enter'); await page.wait_for_timeout(80)
        after = await cur(page, 'c.rec.gs.log.map(x => x.w)')
        check(all(x in after for x in ['tacos', 'fireplace', 'ice cream', 'mice']), 'Island accepts plurals, articles and phrases: ' + ', '.join(after[before:]))
        await page.screenshot(path=f'{OUT}/island.png', full_page=True)

        # ---- daily quiz ----
        await go_home(page); await page.click('.daily-card'); await page.wait_for_selector('.dlist')
        check(await page.locator('.dlist .gcard').count() == 17, 'daily quiz has 17 puzzles')
        for i, g in enumerate(GAMES[:3]):
            await page.locator('.dlist .gcard').nth(i).click(); await page.wait_for_selector('#gamebody'); await page.wait_for_timeout(300)
            await solve_current(page, g); await page.wait_for_selector('.summary')
            sc = await page.locator('.summary .sum-score').inner_text(); check('/ 100' in sc, f'daily {g} scored out of 100 ({sc.strip()})')
            await page.click('.summary .btn.primary'); await page.wait_for_selector('.dlist')
        lv0 = await page.evaluate("PL.model.rating('password').level")
        check('/ 1700' in await page.locator('.daily-head').inner_text(), 'daily total out of 1700')
        await page.screenshot(path=f'{OUT}/daily.png', full_page=True)

        # ---- tools keep the question visible; calculator chaining ----
        await go_home(page); await open_game(page, 'algebra'); await page.wait_for_selector('#gamebody')
        await page.click('[aria-label="Calculator"]'); await page.wait_for_selector('.dock .calc-pad')
        prob = await page.locator('.gamebody .prob').first.bounding_box(); dock = await page.locator('.dock').bounding_box()
        check(prob and prob['y'] >= 0 and prob['y'] + 20 < dock['y'], 'question stays visible above the open calculator')
        for k in ['5', '+', '5', '=', '÷', '2', '=']:
            await page.locator(f'.dock .ckey[aria-label="{k}"]').click()
        res = await page.locator('.calc-res').inner_text(); check(res.strip() == '= 5', 'calculator chains 5 + 5 = ÷ 2 = → 5 (' + res + ')')
        await page.click('.dock .segb:has-text("Scratchpad")'); await page.wait_for_selector('.dock .scr-canvas')
        check(await page.locator('.gamebody .prob').first.is_visible(), 'question visible with scratchpad open')
        before_ms = await cur(page, 'c.rec.activeMs'); await page.wait_for_timeout(1200)
        check(await cur(page, 'c.rec.activeMs') > before_ms, 'timer keeps running while tools are open')
        await page.screenshot(path=f'{OUT}/dock.png')
        await page.click('.dock button:has-text("Close")')
        # ---- Reverse Engineer tile drag ----
        await go_home(page)
        await page.evaluate("PL.model.clearActive('reverse')")
        found = False
        for attempt in range(25):
            await open_game(page, 'reverse'); await page.wait_for_selector('#gamebody')
            if await cur(page, 'c.p.type') == 'seq': found = True; break
            await page.click('summary[aria-label="More actions"]'); await page.click('text=Skip this puzzle'); await page.wait_for_timeout(150)
            await go_home(page)
        if found:
            row0 = await cur(page, 'c.rec.gs.tws ? c.rec.gs.tws.rows[0].join("") : c.p.final.join("")')
            tiles = page.locator('.tws-row').first.locator('.tws-tile')
            b0 = await tiles.nth(0).bounding_box(); b2 = await tiles.nth(2).bounding_box()
            await page.mouse.move(b0['x'] + 10, b0['y'] + 20); await page.mouse.down()
            for i in range(8): await page.mouse.move(b0['x'] + 10 + (b2['x'] - b0['x'] + 12) * (i + 1) / 8, b0['y'] + 20)
            await page.mouse.up(); await page.wait_for_timeout(150)
            row1 = await cur(page, 'c.rec.gs.tws.rows[0].join("")')
            check(row1 == row0[1:3] + row0[0] + row0[3:], f'dragging a tile moves it ({row0} → {row1})')
            await page.click('.workspace button:has-text("Undo")'); await page.wait_for_timeout(80)
            check(await cur(page, 'c.rec.gs.tws.rows[0].join("")') == row0, 'workspace undo')
            check(await cur(page, 'c.rec.hints') == 0 and await cur(page, 'c.rec.wrong') == 0, 'workspace use is not a hint or attempt')
            await page.screenshot(path=f'{OUT}/reverse_ws.png', full_page=True)
        else: check(False, 'found a sequence puzzle to test dragging')

        # ---- stats pages render ----
        await go_home(page); await page.click('text=Statistics'); await page.wait_for_selector('.tiles')
        await page.screenshot(path=f'{OUT}/stats.png', full_page=True)
        await page.click('text=Daily quiz'); await page.wait_for_selector('.tabs'); await page.screenshot(path=f'{OUT}/dstats.png', full_page=True)

        # ---- offline reload (service worker) ----
        await page.goto(URL); await page.wait_for_timeout(1500)
        await page.evaluate('navigator.serviceWorker.ready'); await page.reload(); await page.wait_for_timeout(800)
        await ctx.set_offline(True); await page.reload(); await page.wait_for_selector('.gtile', timeout=8000)
        check(await page.locator('.gtile').count() == 17, 'app loads offline from the service worker cache')
        await open_game(page, 'loop'); await page.wait_for_selector('#gamebody')
        check(await page.locator('#gamebody .loop').count() == 1, 'a new puzzle can be started offline')
        await ctx.set_offline(False)

        # ---- import an old-format (Claude artifact) backup into a fresh install ----
        old = {'app': 'puzzle-lab', 'schema': 1, 'exportedAt': '2026-10-24T22:00:00Z', 'data': {
            'core': {'schema': 1, 'settings': {'timed': False, 'excluded': []}, 'ratings': {'logic': {'level': 6, 'highest': 6, 'changes': []}, 'bridges': {'level': 5, 'highest': 5, 'changes': []}}},
            'att:old1': {'id': 'old1', 'game': 'bridges', 'mode': 'unlimited', 'timed': False, 'level': 5, 'endedAt': 1761300000000, 'activeMs': 40000, 'outcome': 'solved', 'perf': 100, 'quality': 100, 'metrics': {'moves': 4, 'optimal': 4, 'excess': 0, 'optimalHit': True}, 'hints': 0, 'wrong': 0, 'puzzle': {'L': 4, 'start': 'cold', 'target': 'warm', 'cons': {}, 'optimal': 4, 'solution': ['cold', 'cord', 'card', 'ward', 'warm'], 'paths': 1}, 'gs': {'path': ['cold', 'cord', 'card', 'ward', 'warm'], 'invalid': 0}},
            'att:old2': {'id': 'old2', 'game': 'logic', 'mode': 'unlimited', 'timed': False, 'level': 6, 'endedAt': 1761300100000, 'activeMs': 90000, 'outcome': 'solved', 'perf': 90, 'quality': 90, 'metrics': {'type': 'number'}, 'hints': 0, 'wrong': 1, 'puzzle': {'type': 'number', 'title': 'Find the number', 'intro': 'x', 'lo': 10, 'hi': 60, 'clues': [{'id': 'odd'}], 'clueText': ['It is odd.'], 'sol': 33, 'typeName': 'Elimination', 'tkey': 'number'}, 'gs': {'struck': [], 'tries': [33]}},
            'day:2026-10-24': {'date': '2026-10-24', 'diff': 'Hard', 'levels': {}, 'puzzles': {}, 'prog': {g: {'done': True, 'score': 70, 'outcome': 'solved', 'activeMs': 60000, 'hints': 0, 'wrong': 0} for g in ['password', 'island', 'logic', 'bridges', 'algebra', 'loop', 'detective', 'shape', 'balance']}, 'complete': True, 'total': 630}}}
        ctx2 = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        p2 = await ctx2.new_page(); p2.on('pageerror', lambda e: errs.append('p2 ' + str(e)))
        await p2.goto(URL); await p2.wait_for_selector('.games')
        await p2.click('[aria-label="Settings and data"]'); await p2.fill('#imp-text', json.dumps(old)); await p2.wait_for_timeout(200)
        await p2.click('text=Merge with current data'); await p2.wait_for_selector('.games')
        check(await p2.evaluate("PL.model.rating('bridges').level") == 5, 'import keeps difficulty ratings')
        check(await p2.evaluate("PL.store.keys('att:').length") == 2, 'import keeps attempts (including Logic Lab)')
        check(await p2.evaluate("PL.model.daily('2026-10-24').max") == 900, 'old daily keeps its 900-point maximum')
        await p2.click('text=History'); await p2.wait_for_selector('.arow')
        await p2.locator('.arow', has_text='Logic Lab').click(); await p2.wait_for_selector('.modal')
        check('Find the number' in await p2.locator('.modal').inner_text() or 'odd' in await p2.locator('.modal').inner_text(), 'retired Logic Lab record still reviewable')
        await p2.screenshot(path=f'{OUT}/import_review.png')
        await p2.click('.modal >> text=Close')
        # export round trip
        await p2.evaluate('PL._go({name:"settings"})'); await p2.wait_for_selector('text=Export data')
        exp = await p2.evaluate('JSON.stringify(PL.model.exportData())')
        check(json.loads(exp)['schema'] == 3 and len([k for k in json.loads(exp)['data'] if k.startswith('att:')]) == 2, 'export contains everything (schema 3)')

        bad_errs = [e for e in errs if 'favicon' not in e]
        check(not bad_errs, 'no page errors' + ('' if not bad_errs else ': ' + ' | '.join(bad_errs[:5])))
        await b.close()
    httpd.shutdown()
    failed = [m for ok, m in results if not ok]
    print(f'\n{len(results) - len(failed)}/{len(results)} checks passed')
    if failed: print('FAILED:\n' + '\n'.join(failed))
    sys.exit(1 if failed else 0)

asyncio.run(main())

"""Builds data/survey_ff.json from the owner-supplied question bank (data/source/Family_Feud_Question_Database.xlsx).

Output (compact, to keep the phone download small): [[id, question, [[answer, count, other accepted spellings...], ...]], ...]

What is used
  Only sheets that list a count next to every answer ("3 Answers" .. "7 Answers" and "Sheet1"). The "No Points" sheets and
  the two-answer "Fast Money" sheets are skipped: a board needs real counts, and nothing here invents numbers.

What is never changed
  Which answers a question has, their order, and their counts. Corrections only touch WORDING.

Clean-up (every change is logged to data/survey_ff_changes.tsv with the original text, so provenance is kept)
  1. Curated spelling fixes from data/survey_ff_fixes.json (whole words, exact answers, question phrases). These were found by
     auditing every word against SCOWL + WordNet (tools/survey-lexicon.js) and reading the unknown and rare words by hand.
  2. Formatting: spacing around "/", stray trailing punctuation, ALL-CAPS or all-lowercase answers put in Title Case
     (acronyms such as TV, DVD, GPS stay upper case), numbers stored as 7.0 written as 7.
  3. Accepted spellings: "Island/Beach" also accepts "island" and "beach"; "Bachelor/Bachelorette Party" also accepts both
     parts; the original misspelling is NOT kept as an accepted spelling. A part that is itself another answer on the same
     board is dropped from the alternatives so one guess can't open two answers.

Rows are rejected (and reported) when an answer has no whole-number count, fewer than 3 answers remain, the counts add up to
more than 100, or the same answer appears twice with different counts. An exact repeated entry keeps the first copy.
Repeated questions keep the first complete copy.
Usage: python3 tools/build-survey-ff.py [path/to/workbook.xlsx]"""
import hashlib, json, re, sys
from collections import Counter
import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else 'data/source/Family_Feud_Question_Database.xlsx'
SHEETS = ['3 Answers', '4 Answers', '5 Answers', '6 Answers', '7 Answers', 'Sheet1']
FIX = json.load(open('data/survey_ff_fixes.json'))
ACRONYMS = {'tv', 'dvd', 'dvds', 'cd', 'cds', 'gps', 'atm', 'dmv', 'usa', 'us', 'uk', 'ufo', 'vip', 'ceo', 'irs', 'ira', 'kfc', 'bbq',
            'mp3', 'vcr', 'dna', 'abc', 'nfl', 'nba', 'nyc', 'pe', 'pc', 'id', 'ac', 'aaa', 'msg', 'mph', 'wwf', 'wwe', 'wnba',
            'mci', 'mgm', 'rca', 'fao', 'wic', 'sf', 'la', 'dc', 'jfk', 'fbi', 'cia', 'pta', 'suv', 'rv', 'bmw', 'ipod', 'aa', 'ok',
            'pjs', 'diy', 'atv', 'er', 'icu', 'hbo', 'mtv', 'espn', 'cnn', 'pbs', 'nbc', 'cbs', 'hiv', 'std', 'ymca', 'ups', 'ii', 'iii'}
SMALL = {'a', 'an', 'the', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'as', 'from', 'into', 'per'}
changes = []

def text(v):
    if v is None: return ''
    if isinstance(v, float) and v.is_integer(): v = int(v)
    return re.sub(r'\s+', ' ', str(v)).strip()

def key(q):
    return re.sub(r'[^a-z0-9]+', ' ', q.lower().replace('’', '').replace("'", '')).strip()

def match_case(src, new):
    if src.isupper() and len(src) > 1: return new.upper()
    if src[:1].isupper(): return new[:1].upper() + new[1:]
    return new

def fix_words(s):
    def rep(m):
        w = m.group(0); lw = w.lower().replace("'", '’')
        if lw in FIX['words']:
            new = FIX['words'][lw]
            return ' '.join(match_case(w, x) if i == 0 else (x.capitalize() if w[:1].isupper() else x) for i, x in enumerate(new.split(' ')))
        return w
    return re.sub(r"[A-Za-z][A-Za-z’']*", rep, s)

def title_word(w, first):
    lw = w.lower()
    if re.search(r'[^A-Za-z’\']', w) and w.isupper(): return w      # M&M, 3PM, C-3PO
    if re.search(r'\d', w): return w.upper() if re.fullmatch(r'\d+[a-z]{1,2}', lw) and lw[-2:] in ('am', 'pm') else w
    core = re.sub(r'[^a-z0-9]', '', lw)
    if core.endswith('s') and core[:-1] in ACRONYMS and core not in ACRONYMS: return core[:-1].upper() + 's'   # DVDS -> DVDs
    if core in ACRONYMS: return w.upper() if re.fullmatch(r'[A-Za-z]+', w) and core != 'ipod' else w
    if not first and lw in SMALL: return lw
    if w.isupper() or w.islower(): return lw[:1].upper() + lw[1:]
    return w  # mixed case such as McDonald’s, iPod: keep

def tidy_answer(a):
    a = re.sub(r'\s*/\s*', '/', a)                       # "Work/ School" -> "Work/School"
    a = re.sub(r'\s+–\s+', '/', a) if '–' in a else a
    a = re.sub(r'(?<!\b[A-Z])(?<!\bDr)(?<!\bMr)(?<!\bMrs)(?<!\bSt)(?<!\bJr)[.,;:]+$', '', a).strip()
    a = re.sub(r'\s+', ' ', a)
    if a.isupper() or a.islower() or any(t.islower() and len(t) > 3 and t not in SMALL for t in re.split(r'[ /]', a)[1:]) or a[:1].islower():
        parts = re.split(r'([ /-])', a); out = []
        for i, t in enumerate(parts):
            out.append(t if t in (' ', '/', '-') else title_word(t, i == 0 or (i > 0 and parts[i - 1] == '/')))
        a = ''.join(out)
    # acronyms are upper case wherever they appear ("Tv Guide" -> "TV Guide")
    return re.sub(r"[A-Za-z]+", lambda m: m.group(0).upper() if m.group(0).lower() in ACRONYMS and m.group(0).lower() not in ('us', 'id', 'ok', 'la', 'pe', 'er', 'aa', 'ups', 'ira') and m.group(0) != m.group(0).upper() and not m.group(0).islower() else m.group(0), a)

def tidy_question(q):
    for a, b in FIX['questions'].items(): q = q.replace(a, b)
    q = fix_words(q)
    q = q.replace('\u009d', '').replace('\x9d', '')
    q = re.sub(r'\b([A-Z]{2,})\b', lambda m: m.group(1) if m.group(1).lower() in ACRONYMS or len(m.group(1)) <= 1 else m.group(1).capitalize(), q)
    return re.sub(r'\s+', ' ', q).strip()

def clean_answer(a):
    if a in FIX['answers']: return FIX['answers'][a]
    return tidy_answer(fix_words(a))

def variants(label, others):
    out = {label.lower()}
    for part in re.split(r'\s*(?:/|\s–\s|\bor\b)\s*', label, flags=re.I):
        part = part.strip()
        if part and part.lower() not in others: out.add(part.lower())
    if '(' in label: out.add(re.sub(r'\s*\([^)]*\)\s*', ' ', label).strip().lower())
    if '-' in label: out.add(label.replace('-', ' ').lower()); out.add(label.replace('-', '').lower())
    return sorted(v for v in out if v)

wb = openpyxl.load_workbook(SRC, read_only=True)
out, seen, rejects = [], {}, Counter()
for name in SHEETS:
    rows = list(wb[name].iter_rows(values_only=True))
    for r in rows[1:]:
        if not r or not text(r[0]): continue
        q0 = text(r[0]); cells = list(r[1:]); pairs = []
        for i in range(0, len(cells) - 1, 2):
            a, n = text(cells[i]), cells[i + 1]
            if not a and n is None: continue
            pairs.append((a, n))
        if not pairs: rejects['no answers'] += 1; continue
        if any(not a or not isinstance(n, (int, float)) or n < 1 or n != int(n) for a, n in pairs): rejects['answer without a whole-number count'] += 1; continue
        seen_a, clusters, bad = {}, [], False
        for a, n in pairs:
            k = key(a)
            if k in seen_a:
                if seen_a[k] != int(n): bad = True
                continue
            seen_a[k] = int(n); clusters.append((a, int(n)))
        if bad: rejects['same answer listed twice with different counts'] += 1; continue
        if len(clusters) < 3: rejects['fewer than 3 answers'] += 1; continue
        if sum(n for _, n in clusters) > 100: rejects['counts add up to more than 100'] += 1; continue
        k = key(q0)
        if k in seen: rejects['repeated question'] += 1; continue
        seen[k] = 1
        qid = 'ff' + hashlib.sha1(k.encode()).hexdigest()[:8]   # id from the ORIGINAL text, so ids never change
        q = tidy_question(q0)
        if q != q0: changes.append((qid, 'question', q0, q))
        fixed = []
        for a, n in clusters:
            b = clean_answer(a)
            if b != a: changes.append((qid, 'answer', a, b))
            fixed.append((b, n))
        fixed.sort(key=lambda c: -c[1])  # stable: ties keep the file's order
        labels = [b.lower() for b, _ in fixed]
        out.append([qid, q, [[b, n] + [v for v in variants(b, set(labels) - {b.lower()}) if v != b.lower()] for b, n in fixed]])

json.dump(out, open('data/survey_ff.json', 'w'), ensure_ascii=False, separators=(',', ':'))
with open('data/survey_ff_changes.tsv', 'w') as f:
    f.write('question_id\tfield\toriginal\tcorrected\n')
    for c in changes: f.write('\t'.join(c) + '\n')
print(len(out), 'questions kept;', len(changes), 'wording corrections logged')
for why, n in rejects.most_common(): print(' rejected', n, '-', why)
print(' answers per question:', dict(sorted(Counter(len(q[2]) for q in out).items())))

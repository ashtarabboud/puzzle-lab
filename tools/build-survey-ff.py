"""Builds data/survey_ff.json (compact: [id, question, [[answer, count, other accepted spellings...]]]) from the owner-supplied question bank (data/source/Family_Feud_Question_Database.xlsx).

Only sheets that list a count next to every answer are used ("3 Answers" .. "7 Answers" and "Sheet1"). Sheets with no
counts ("No Points ...") and the two-answer "Fast Money" sheets are skipped, because a board needs real counts to score and
nothing here invents numbers. Answer text and counts are kept exactly as listed; the only clean-up is whitespace, turning
numbers stored as decimals (7.0) back into "7", and splitting labels such as "Island/Beach" into extra accepted spellings.

Rows are rejected (and reported) when: an answer has no count or a count < 1, fewer than 3 answers remain, the counts add
up to more than 100, or the same answer appears twice with a different count. An exact repeated entry (same answer, same
count) keeps the first copy. Repeated questions keep the first complete copy.
Usage: python3 tools/build-survey-ff.py [path/to/workbook.xlsx]"""
import hashlib, json, re, sys
import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else 'data/source/Family_Feud_Question_Database.xlsx'
SHEETS = ['3 Answers', '4 Answers', '5 Answers', '6 Answers', '7 Answers', 'Sheet1']

def text(v):
    if v is None: return ''
    if isinstance(v, float) and v.is_integer(): v = int(v)
    return re.sub(r'\s+', ' ', str(v)).strip()

def key(q):
    return re.sub(r'[^a-z0-9]+', ' ', q.lower().replace('’', '').replace("'", '')).strip()

def variants(label):
    out = {label.lower()}
    parts = [p.strip() for p in re.split(r'\s*(?:/|\s[–-]\s|\bor\b)\s*', label, flags=re.I) if p.strip()]
    if len(parts) > 1: out |= {p.lower() for p in parts}
    return sorted(out)

wb = openpyxl.load_workbook(SRC, read_only=True)
out, seen, rejects = [], {}, {}
def reject(why): rejects[why] = rejects.get(why, 0) + 1
for name in SHEETS:
    ws = wb[name]
    rows = list(ws.iter_rows(values_only=True))
    off = 1  # answers start in column B, alternating answer / count
    for r in rows[1:]:
        if not r or not text(r[0]): continue
        q = text(r[0])
        cells = list(r[off:])
        pairs = []
        for i in range(0, len(cells) - 1, 2):
            a, n = text(cells[i]), cells[i + 1]
            if not a and n is None: continue
            pairs.append((a, n))
        if not pairs: reject('no answers'); continue
        if any(not a or not isinstance(n, (int, float)) or n < 1 or n != int(n) for a, n in pairs): reject('answer without a whole-number count'); continue
        clusters, labels, bad = [], {}, False
        for a, n in pairs:
            k = key(a)
            if k in labels:
                if labels[k] != int(n): bad = True
                continue
            labels[k] = int(n)
            clusters.append({'label': a, 'n': int(n), 'answers': variants(a)})
        if bad: reject('same answer listed twice with different counts'); continue
        if len(clusters) < 3: reject('fewer than 3 answers'); continue
        if sum(c['n'] for c in clusters) > 100: reject('counts add up to more than 100'); continue
        k = key(q)
        if k in seen: reject('repeated question'); continue
        seen[k] = 1
        clusters.sort(key=lambda c: -c['n'])  # stable: ties keep the file's order
        out.append({'id': 'ff' + hashlib.sha1(k.encode()).hexdigest()[:8], 'q': q, 'total': 100, 'src': 'ff', 'clusters': clusters})
# compact form to keep the phone download small: [id, question, [[label, count, extra accepted spellings...], ...]]
compact = [[q['id'], q['q'], [[c['label'], c['n']] + [a for a in c['answers'] if a != c['label'].lower()] for c in q['clusters']]] for q in out]
json.dump(compact, open('data/survey_ff.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'questions kept')
for why, n in sorted(rejects.items(), key=lambda x: -x[1]): print(' rejected', n, '-', why)
from collections import Counter
print(' answers per question:', dict(sorted(Counter(len(q['clusters']) for q in out).items())))

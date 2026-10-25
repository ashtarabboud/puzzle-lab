"""Builds data/survey.json from the ProtoQA crowdsourced dev set (CC BY 4.0, https://github.com/iesl/protoqa-data).
Answers and counts are used exactly as published. Only the DISPLAY LABEL of some clusters is replaced with a clearer
name chosen from that cluster's own answers (or a plain summary of them); matching still uses every original answer string.
Usage: python3 tools/build-survey.py path/to/dev.crowdsourced.jsonl"""
import json, sys
LABELS = {
 ('r1q1','favorite color'):'favorite things', ('r1q2','disease'):'sickness or injury', ('r1q5','bath'):'shower or bath',
 ('r1q5','brush'):'brush hair', ('r1q5','say gooobye'):'say goodbye', ('r1q8','house'):'own bed', ('r1q8','eat'):'home cooking',
 ('r1q10','room'):'game or play room', ('r1q10','store'):'shop', ('r1q11','cot'):'crib', ('r1q11','watch'):'rules',
 ('r1q12','street'):'street corner', ('r1q14','hair comb'):'comb or brush', ('r1q14','hook'):'jewelry or accessories',
 ('r1q17','bat'):'sports gear', ('r1q19','dead'):'AIDS research', ('r2q7','antics'):'misbehave', ('r2q8','vigilant'):'security guard',
 ('r2q10','sloth'):'laziness', ('r2q10','disorder'):'bad behavior', ('r2q10','shout'):'responsibilities', ('r2q10','couples'):'partners',
 ('r2q11','play'):'go out together', ('r2q12','pruner'):'gardening tools', ('r2q18','violence'):'crime and abuse', ('r2q18','work'):'everyday routines',
 ('r2q23','fault'):'referee', ('r2q30','needs'):'bathroom break', ('r2q37','treason'):'betrayal', ('r2q42','lag'):'delay',
 ('r2q43','sons'):'naked people', ('r2q43','closed'):'closed gate', ('r2q43','fish'):'wild animal', ('r2q49','cine'):'movie theater',
}
out = []
for line in open(sys.argv[1]):
    d = json.loads(line); raw = d['answers']['raw']; total = sum(raw.values()); qid = d['metadata']['id']
    cl = []
    for cid, c in d['answers']['clusters'].items():
        ans = [a for a in c['answers'] if a]
        label = max(ans, key=lambda a: (raw.get(a, 0), -len(a))) if ans else cid
        label = LABELS.get((qid, label), label)
        cl.append({'label': label, 'n': c['count'], 'answers': sorted(set(a.lower() for a in ans) | {label.lower()})})
    cl.sort(key=lambda x: -x['n'])
    out.append({'id': qid, 'q': d['question']['original'].strip().replace('athelete', 'athlete').replace('an cage', 'a cage'), 'total': total, 'clusters': [c for c in cl if c['n'] >= 2]})
json.dump(out, open('data/survey.json', 'w'), indent=0)
print(len(out), 'questions')

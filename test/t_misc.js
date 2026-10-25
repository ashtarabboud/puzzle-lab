// Password, Detective, Loop Logic, Shape Shift, Calculator
const PL=require('./load.js')(['core/base.js','data/words.js','../data/password_v2_a.json','../data/password_v2_b.json','games/password.js','games/detective.js','games/loop.js','games/shape.js','core/calc.js']);
let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}};
const P=PL.games.password;
for(let lv=1;lv<=10;lv++){const p=P.generate(lv,PL.rng('pw'+lv));ok(p.words.length===10&&new Set(p.words.map(w=>w.w)).size===10,'10 distinct words');}
const pd=P.generate(5,PL.rng('d'),{daily:true});ok(pd.n===5&&new Set(pd.words.map(w=>w.w)).size===5,'daily has five different words');{const gs=P.init(pd);gs.res[0].solved=true;gs.res[0].shown=1;gs.res[1].solved=true;gs.res[1].shown=3;gs.res[1].hints=1;gs.res[2].passed=true;const ev=P.evaluate(pd,gs,{});ok(ev.quality===Math.round((100+62)/5)&&ev.metrics.perWord[1].hints===1&&ev.lines.length===8,'one combined score out of 100, per-word clues and hints');ok(P.benchmark(5,true,pd)===5*P.benchmark(5,true,{n:1}),'daily time benchmark scales with words');}
// letter hints: progressive, never the whole word, never repeating
{const p=P.generate(4,PL.rng('h'));const gs=P.init(p);const seen=new Set();let last='';for(let i=0;i<20;i++){const r=P.hint(p,gs);if(r.noCount)break;ok(!seen.has(r.msg),'no repeat');seen.add(r.msg);last=r.msg;}
 const w=p.words[0].w;ok(last.replace('Letters:','').replace(/[^A-Z]/g,'').length===w.length-1,'reveals all but one letter: '+last+' for '+w);}
const D=PL.games.detective;
for(let lv=1;lv<=10;lv++){const p=D.generate(lv,PL.rng('dt'+lv));const gs=D.init(p);const msgs=[];for(let i=0;i<15;i++){const r=D.hint(p,gs);if(r.noCount)break;msgs.push(r.msg);}ok(new Set(msgs).size===msgs.length,'detective hints unique');
 // every hinted letter is correct
 gs.facts.filter(f=>f.k.startsWith('at:')).forEach(f=>ok(p.w[f.at-1]===f.letter,'hint letter correct'));}
const LP=PL.games.loop;
for(const lv of [1,4,7,10])for(let k=0;k<4;k++){const p=LP.generate(lv,PL.rng('lp'+lv+k));const r=LP._solve(p.R,p.C,p.clues,3);ok(r.count===1&&r.sol.join()===p.sol.join(),'loop unique');
 const gs=LP.init(p);for(let i=0;i<6;i++){const hr=LP.hint(p,gs);if(hr.gs){const e=hr.gs.hintEdge;ok((gs.e[e]===1)===!!p.sol[e],'loop hint correct');}}}
const SH=PL.games.shape;
for(let lv=1;lv<=10;lv++)for(let k=0;k<5;k++){const p=SH.generate(lv,PL.rng('sh'+lv+k));ok(SH._verify(p),'shape verified');const gs=SH.init(p);let n=0;while(!SH._solved(p,gs)&&n<20){SH.hint(p,gs);n++;}ok(SH._solved(p,gs),'shape hints complete the puzzle');}
for(const [e,v] of [['3/4+1/6','11/12 ≈ 0.91666667'],['-3^2','-9'],['2(3+4)','14'],['√16','4']])ok(PL.calc.evaluate(e)===v,'calc '+e);
let threw=false;try{PL.calc.evaluate('alert(1)');}catch(e){threw=true;}ok(threw,'calc rejects code');
console.log('bad',bad);

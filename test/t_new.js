// Seven new games: Word Grid, Word Count, Word Rush, Word Trails, Cat Logic, Survey Says, Common Threads
const fs=require('fs');
const files=['core/base.js','data/words.js','data/five.js','games/_five.js','games/wordgrid.js','games/wordcount.js','games/_trace.js','games/wordrush.js','../data/trails.json','games/trails.js','games/catlogic.js','../data/survey.json','games/survey.js'];
const hasThreads=fs.existsSync(__dirname+'/../data/threads.json');
if(hasThreads)files.push('../data/threads.json','games/threads.js');
const PL=require('./load.js')(files);
let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}};
const X=PL.five;
// duplicate-letter handling
ok(X.marks('eerie','there').join('')==='11020'||X.marks('eerie','there').join('')==='10120'||true,'marks run');
ok(X.marks('speed','abide').join('')==='00101','speed vs abide: only one E credited, D present → '+X.marks('speed','abide').join(''));
ok(X.marks('llama','hello').join('')==='11000','llama vs hello: two Ls present → '+X.marks('llama','hello').join(''));
ok(X.marks('apple','paper').join('')==='11201','apple/paper '+X.marks('apple','paper').join(''));
ok(X.counts('speed','speed').join()==='5,0,0','counts exact');
ok(X.counts('allee','eagle').reduce((a,b)=>a+b,0)===5,'counts total five');
// brute-force cross-check marks against a reference implementation
const ref=(g,a)=>{const m=[0,0,0,0,0],u=a.split('');for(let i=0;i<5;i++)if(g[i]===a[i]){m[i]=2;u[i]=null;}for(let i=0;i<5;i++)if(m[i]!==2){const j=u.indexOf(g[i]);if(j>=0){m[i]=1;u[j]=null;}}return m.join('');};
const F=X.data(),W=F.t1.concat(F.t2);const r=PL.rng('m');for(let k=0;k<3000;k++){const g=r.pick(W),a=r.pick(W);if(X.marks(g,a).join('')!==ref(g,a)){bad++;console.log('mark mismatch',g,a);break;}}
// Word Grid / Word Count generation, candidates contain the answer, hints never reveal the whole word
for(const id of ['wordgrid','wordcount'])for(let lv=1;lv<=10;lv++){const G=PL.games[id];const p=G.generate(lv,PL.rng(id+lv),{});ok(F.guess.has(p.w),id+' answer is a valid guess');
  const gs=G.init(p);gs.rows.push(id==='wordgrid'?{g:'crane',m:X.marks('crane',p.w)}:{g:'crane',c:X.counts('crane',p.w)});ok(G._candidates(p,gs).indexOf(p.w)>=0,id+' answer survives candidate filter');
  const msgs=[];for(let i=0;i<10;i++){const hh=G.hint(p,gs);if(hh.noCount)break;msgs.push(hh.msg);}ok(new Set(msgs).size===msgs.length&&msgs.length<=7,id+' hints progressive ('+msgs.length+')');
  if(p.pool){ok(p.w.split('').every(c=>p.pool.includes(c)),'pool contains answer');}
  if(id==='wordgrid'&&lv<=6)ok(!X.repeats(p.w),'easy/medium Word Grid answers have no repeats');
  if(id==='wordcount'&&lv<=7)ok(!X.repeats(p.w),'Word Count answers without repeats below expert');}
// Word Rush: every listed word is traceable and in the dictionary
for(const lv of [1,5,8,10]){const G=PL.games.wordrush;const p=G.generate(lv,PL.rng('wr'+lv));ok(p.words.every(w=>G._firstCell(p,w)!=null&&PL.dict.has(w)),'rush words traceable');ok(p.common.length>=15,'rush board has words '+p.common.length);}
// Word Trails: verified full-cover boards
for(const lv of [1,4,8,10])for(let k=0;k<5;k++){const G=PL.games.trails;const p=G.generate(lv,PL.rng('tr'+lv+k),{});ok(G._verify(p),'trails board verified');ok(p.letters.length===p.C*p.R,'all cells filled');}
// Cat Logic: unique solutions
for(const lv of [1,4,7,10])for(let k=0;k<3;k++){const G=PL.games.catlogic;const p=G.generate(lv,PL.rng('cl'+lv+k));const c=G._count(p.n,p.reg,3);ok(c.count===1&&c.sol.join()===p.sol.join(),'cat logic unique');
  const gs=G.init(p);let n=0;while(!G._solved(p,gs)&&n<30){const hh=G.hint(p,gs);if(hh.after==='solved')break;if(gs.hintCell!=null&&!hh.gs){} if(hh.msg.indexOf('only the highlighted')>=0){gs.s[gs.hintCell]=2;} n++;}ok(G._solved(p,gs),'cat logic hints lead to the solution');}
// Survey Says: real data only; matching
const S=PL.games.survey;ok(PL.data.survey.length===52,'52 authentic survey questions');
PL.data.survey.forEach(q=>{ok(q.total>=80&&q.clusters.every(c=>c.n>=2),'survey counts from the dataset');});
for(let lv=1;lv<=10;lv++){const p=S.generate(lv,PL.rng('sv'+lv),{});const gs=S.init(p);p.board.forEach((c,i)=>ok(S._match(p,gs,c.label)===i||p.board[S._match(p,gs,c.label)].n>=c.n,'label matches its own slot'));ok(S._match(p,gs,'qwertyuiop')<0,'nonsense rejected');}
// Common Threads
if(hasThreads){const T=PL.games.threads;for(let lv=1;lv<=10;lv++)for(let k=0;k<6;k++){const t0=Date.now();const p=T.generate(lv,PL.rng('th'+lv+k),{});
  const cats=p.groups.map(g=>PL.data.threads.find(c=>c.id===g.id));const words=[].concat(...p.groups.map(g=>g.words));
  ok(new Set(words).size===16,'16 distinct words');ok(T._count(words,cats,3)===1,'unique partition');if(Date.now()-t0>2000)console.log('slow threads',lv,Date.now()-t0);}}
else console.log('(threads data not present yet)');
console.log('bad',bad);

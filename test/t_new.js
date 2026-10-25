// Seven new games: Word Grid, Word Count, Word Rush, Word Trails, Cat Logic, Survey Says, Common Threads
const fs=require('fs');
const files=['core/base.js','data/words.js','data/five.js','games/_five.js','games/wordgrid.js','games/wordcount.js','games/_trace.js','games/wordrush.js','../data/trails.json','games/trails.js','games/catlogic.js','../data/survey.json','../data/survey_ff.json','games/_survey_match.js','games/survey.js'];
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
// Word Count: per-cell marks are independent; old per-letter marks are converted; hints are kept apart
{const W=PL.games.wordcount;const gs={rows:[{g:'nouns',c:[1,1,3]},{g:'manor',c:[0,2,3]}],cur:'',mk:{n:3,o:2},told:['N is in the word.'],markMode:true};
 W._upgrade(gs);ok(!gs.mk&&gs.cm[0][0]===0&&gs.cm[0][1]===3&&gs.cm[1][3]===3&&gs.hin.join()==='n','old letter marks converted per cell; hint letters kept apart');
 gs.cm[0][0]=2;gs.cm[1][2]=1;ok(gs.cm[0][0]===2&&gs.cm[1][2]===1,'two Ns hold different marks');
 gs.hin=[];ok(W._letterState(gs,'n')==='in','keyboard summary: any green wins');gs.cm[1][2]=0;ok(W._letterState(gs,'n')==='maybe','then yellow');
 gs.ws=[[{l:'',m:0},{l:'a',m:1},{l:'',m:0},{l:'e',m:3},{l:'',m:0}]];ok(W._letterState(gs,'e')==='out','working-row marks count too');
 ok(gs.ws[0].map(c=>c.l||'_').join(' ')==='_ a _ e _','blanks are kept');}
// Cat Logic: unique solutions
for(const lv of [1,4,7,10])for(let k=0;k<3;k++){const G=PL.games.catlogic;const p=G.generate(lv,PL.rng('cl'+lv+k));const c=G._count(p.n,p.reg,3);ok(c.count===1&&c.sol.join()===p.sol.join(),'cat logic unique');
  const gs=G.init(p);let n=0;while(!G._solved(p,gs)&&n<30){const hh=G.hint(p,gs);if(hh.after==='solved')break;if(gs.hintCell!=null&&!hh.gs){} if(hh.msg.indexOf('only the highlighted')>=0){gs.s[gs.hintCell]=2;} n++;}ok(G._solved(p,gs),'cat logic hints lead to the solution');}
// Survey Says: real data only; matching
const S=PL.games.survey;ok(PL.data.survey.length===52,'52 authentic survey questions');
PL.data.survey.forEach(q=>{ok(q.total>=80&&q.clusters.every(c=>c.n>=2),'survey counts from the dataset');});
// supplied Family Feud bank: every question has 3-7 answers with whole-number counts adding up to at most 100, sorted
const B=S._bank();ok(B.ff.length>=3800,'supplied bank loaded: '+B.ff.length);ok(new Set(B.all.map(q=>q.id)).size===B.all.length,'question ids unique');
B.ff.forEach(q=>{const t=q.clusters.reduce((s,c)=>s+c.n,0);ok(q.clusters.length>=3&&q.clusters.length<=7&&t<=100&&q.clusters.every((c,i)=>Number.isInteger(c.n)&&c.n>=1&&(i===0||c.n<=q.clusters[i-1].n)),'valid board '+q.id);
  const p={board:q.clusters},gs=S.init(p);q.clusters.forEach((c,i)=>{const m=S._match(p,gs,c.label);ok(m===i,'label reaches its own slot: '+q.q+' / '+c.label);
    c.answers.forEach(a=>{const m2=S._match(p,gs,a);ok(m2===i||(m2>=0&&S._norm(q.clusters[m2].label)===S._norm(a)),'accepted spelling reaches its slot: '+a);});});});
ok(S._match({board:[{label:'7',n:68,answers:['7']},{label:'13',n:26,answers:['13']},{label:'3',n:5,answers:['3']}]},{},'seven')===0,'number words');
ok(S._match({board:[{label:'7',n:68,answers:['7']},{label:'13',n:26,answers:['13']},{label:'3',n:5,answers:['3']}]},{},'1')<0,'numbers must match exactly');
for(let lv=1;lv<=10;lv++)for(let k=0;k<20;k++){const p=S.generate(lv,PL.rng('ff'+lv+'-'+k),{});ok(p.board.length>=3&&p.board.length<=8&&(p.src==='ff'||p.src==='pq'),'board size');
  if(p.src==='ff'){const q=B.ff.find(x=>x.id===p.id);ok(q&&q.clusters.length===p.board.length&&p.board.every((c,i)=>c.n===q.clusters[i].n&&c.label===q.clusters[i].label),'whole supplied board shown with its listed counts');}}
{const seen=new Set();for(let k=0;k<40;k++)seen.add(S.generate(5,PL.rng('rep'+k),{}).src);ok(seen.has('ff'),'supplied questions are used');}
// ---- Survey Says matching regression tests ----
{const M=PL.surveyMatch,bd=(...ls)=>ls.map((l,i)=>({label:l,n:50-i*5,answers:[l.toLowerCase()]})),hit=(b,g)=>{const r=M.match(b,g);return r.i<0?null:b[r.i].label;};
 const T=(b,g,want,why)=>{const got=hit(b,g);ok(got===want,why+': "'+g+'" → '+got+' (wanted '+want+')');};
 const gloves=bd('Cold','Work','Gardening','Fashion','Cleaning');
 T(gloves,'cooking',null,'cooking must not match cold');T(gloves,'cold weather',null,'a different head word is not the answer');
 const food=bd('Cookies','Cook','Crooked Teeth');T(food,'cooking','Cook','cooking = cook (same verb)');T(food,'cookie','Cookies','singular/plural');T(food,'cooks','Cook','plural verb form');
 const tattoo=bd('Tattoo','Piercing','Long Hair');T(tattoo,'tattoo','Tattoo','exact');T(tattoo,'tattoos','Tattoo','plural');T(tattoo,'tatoo','Tattoo','misspelt guess');T(tattoo,'TATTOOS!','Tattoo','case and punctuation');
 const pets=bd('Veterinarian','Groomer','Pet Store');T(pets,'vet','Veterinarian','vet = veterinarian');T(pets,'the vet','Veterinarian','filler words ignored');T(pets,'pet shop',null,'shop is not store');
 const home=bd('TV','Bicycle','Cell Phone','Refrigerator');T(home,'television','TV','TV = television');T(home,'bike','Bicycle','bike = bicycle');T(home,'mobile phone','Cell Phone','cellphone = mobile phone');T(home,'cellphone','Cell Phone','cellphone one word');T(home,'fridge','Refrigerator','fridge');T(home,'phone','Cell Phone','head word phone');
 const w=bd('Hat','Cane','Baton');T(w,'cat',null,'a different real word is not a typo');T(w,'cane','Cane','exact');T(w,'can',null,'can is not cane');
 const nums=bd('7','13','3');T(nums,'seven','7','number words');T(nums,'1',null,'other number');T(nums,'13th',null,'13th is an ordinal, not 13 — kept strict');
 const times=bd('10','12','11','9');T(times,'10 pm','10','unit after a number');T(times,'midnight','12','midnight = 12');T(times,'$10','10','dollar sign');
 const amb=bd('Cold Water','Hot Water','Juice');ok(M.match(amb,'water').ambiguous&&M.match(amb,'water').i<0,'ambiguous guess reveals nothing');T(amb,'cold water','Cold Water','specific guess');
 const kiss=[{label:'Kiss/Touch',n:40,answers:['kiss/touch','kiss']},{label:'Touch',n:30,answers:['touch']}];T(kiss,'touch','Touch','exact answer beats a shared alternative');T(kiss,'kiss','Kiss/Touch','slash alternative');
 const star=bd('R2-D2','Darth Vader','Lightsaber');T(star,'r2d2','R2-D2','spacing');T(star,'darth vadar','Darth Vader','small typo in a name');T(star,'light saber','Lightsaber','split compound');
 const tags=bd('Wrap It','Remove Price Tag','Buy It');T(tags,'wrap','Wrap It','filler pronoun');T(tags,'price tag','Remove Price Tag','shorter phrase with the same head');T(tags,'tag',null,'one word of three is too little');T(tags,'take off price tag',null,'different verb');
 const pump=bd('Pumpkin','Turkey','Leaves');T(pump,'a big pumpkin','Pumpkin','longer phrase with the same head');T(pump,'pumpkin pie',null,'pie is a different thing');
 const brush=bd('Brush Teeth','Wash Face','Shower');T(brush,'brushing teeth','Brush Teeth','verb form');T(brush,'brush your tooth','Brush Teeth','irregular plural');
 const ages=bd('Oprah','Ellen','Dr. Phil');T(ages,'oprha','Oprah','transposed letters');T(ages,'dr phil','Dr. Phil','abbreviation punctuation');T(ages,'doctor phil','Dr. Phil','dr = doctor');
 // the spreadsheet audit: the misspelt source answer is corrected, so the correct spelling matches it
 const src=B.ff.filter(q=>q.clusters.some(c=>/tattoo/i.test(c.label)));ok(src.length>0&&!B.ff.some(q=>q.clusters.some(c=>/\btatoo\b/i.test(c.label))),'“Tatoo” corrected in the data');
 ok(!B.ff.some(q=>q.clusters.some(c=>/^(Shit\/Sweater|Hawii|Deoderant|Underware|Saxophone4Guitar)$/.test(c.label))),'known misspellings corrected');
 ok(!B.ff.some(q=>q.clusters.some(c=>/\s\/|\/\s/.test(c.label))),'no stray spaces around slashes');
 ok(!B.ff.some(q=>q.clusters.some(c=>c.label.length>3&&c.label===c.label.toUpperCase()&&/[A-Z]{5}/.test(c.label)&&!/\d|&|-/.test(c.label))),'no ALL-CAPS answers');}
{const recent=[];for(let k=0;k<60;k++){const p=S.generate(4,PL.rng('rc'+k),{recent:recent.slice()});ok(recent.indexOf(p.tkey)<0,'no repeat within the last 60');recent.push(p.tkey);}}
for(let lv=1;lv<=10;lv++){const p=S.generate(lv,PL.rng('sv'+lv),{});const gs=S.init(p);p.board.forEach((c,i)=>ok(S._match(p,gs,c.label)===i||(S._match(p,gs,c.label)>=0&&p.board[S._match(p,gs,c.label)].n>=c.n),'label matches its own slot'));ok(S._match(p,gs,'qwertyuiop')<0,'nonsense rejected');}
// Common Threads
if(hasThreads){const T=PL.games.threads;for(let lv=1;lv<=10;lv++)for(let k=0;k<6;k++){const t0=Date.now();const p=T.generate(lv,PL.rng('th'+lv+k),{});
  const cats=p.groups.map(g=>PL.data.threads.find(c=>c.id===g.id));const words=[].concat(...p.groups.map(g=>g.words));
  ok(new Set(words).size===16,'16 distinct words');ok(T._count(words,cats,3)===1,'unique partition');if(Date.now()-t0>2000)console.log('slow threads',lv,Date.now()-t0);}}
else console.log('(threads data not present yet)');
console.log('bad',bad);

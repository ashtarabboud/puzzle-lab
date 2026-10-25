const PL=require('./load.js')(['core/base.js','games/logic.js']);
const G=PL.games.logic,C=G._check;let bad=0;const times={};
const types=['grid','order','sched','kk','cond','number','fut'];
for(const t of types){
 for(const lv of [1,3,5,7,10]){
  const t0=Date.now();let ok=0,fail=0;
  for(let k=0;k<8;k++){
   let p;try{p=G.generate(lv,PL.rng(t+lv+'-'+k),{forceType:t});}catch(e){fail++;continue;}
   if(p.tkey!==t)continue; ok++;
   // independent uniqueness verification
   if(['grid','order','sched'].includes(t)){
     const all=C.all(p);const sols=all.filter(s=>p.clues.every(c=>C.clueEval(p,c,s)));
     if(sols.length!==1||JSON.stringify(sols[0])!==JSON.stringify(p.sol)){bad++;console.log('NOT UNIQUE',t,lv,sols.length);}
   }
   if(t==='kk'){const n=p.n;let cnt=0;for(let m=0;m<(1<<n);m++){const s=[];for(let i=0;i<n;i++)s.push((m>>i)&1);if(p.stmts.every((st,i)=>C.kkEval(st,s)===!!s[i]))cnt++;}if(cnt!==1){bad++;console.log('kk not unique');}}
   if(t==='number'){let cnt=0;for(let y=p.lo;y<=p.hi;y++)if(p.clues.every(q=>C.numProp(q).f(y,q.k,q.r)))cnt++;if(cnt!==1){bad++;console.log('num not unique',cnt);}}
   if(t==='fut'){const r=C.futCount(p.n,p.givens,p.ineq,3);if(r.count!==1){bad++;console.log('fut not unique',r.count);}else if(r.sol.flat().join()!==p.sol.join()){bad++;console.log('fut sol mismatch');}}
   if(t==='cond'){const nv=p.nv;const models=[];for(let m=0;m<(1<<nv);m++){const s=[];for(let i=0;i<nv;i++)s.push((m>>i)&1);if(p.prem.every(q=>C.premEval(q,s)))models.push(s);}
     const val=p.opts.map(o=>p.askMust?models.every(s=>C.premEval(o,s)):models.some(s=>C.premEval(o,s)));
     if(val.filter(Boolean).length!==1||!val[p.ans]){bad++;console.log('cond wrong',val);} }
   const ex=C.explanation(p); if(!ex.length){console.log('no explanation',t);}
   if(lv===7&&k===0){console.log('\n['+t+' L7]',p.intro);(p.clueText||[]).forEach((c,i)=>console.log(' ',i+1,c));if(p.optText)console.log('  OPTS',p.optText,'ANS',p.ans);console.log('  EXPL:',ex.slice(0,4).join(' / '));}
  }
  times[t+lv]=(Date.now()-t0)/8|0; if(fail)console.log('fails',t,lv,fail);
 }
}
console.log(times);console.log('bad',bad);

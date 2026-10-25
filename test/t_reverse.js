const PL=require('./load.js')(['core/base.js','games/reverse.js']);const G=PL.games.reverse;let bad=0;const cnt={};
for(const t of ['num','seq','grid','missing','multi','constraint'])for(const lv of [1,3,5,7,10]){
 const t0=Date.now();
 for(let k=0;k<12;k++){let p;try{p=G.generate(lv,PL.rng('r'+t+lv+k),{forceType:t});}catch(e){continue;}
  if(p.type!==t)continue;cnt[t+lv]=(cnt[t+lv]||0)+1;
  // independent verification
  if(t==='num'){const s=G._starts(p.ops,p.final,p.dom);if(s.length!==1||s[0]!==p.answer){bad++;console.log('num not unique');}}
  if(t==='multi'){const s=G._starts(p.ops,p.final,p.dom);if(JSON.stringify(s)!==JSON.stringify(p.starts)){bad++;}}
  if(t==='constraint'){let inter=null;for(const m of p.machines){const s=G._starts(m.ops,m.out,p.dom);inter=inter?inter.filter(v=>s.includes(v)):s;}if(inter.length!==1||inter[0]!==p.answer){bad++;console.log('constraint');}}
  if(t==='seq'){let c=p.answer;p.ops.forEach(o=>c=G._seqApply(c,o));if(c.join('')!==p.final.join('')){bad++;}}
  if(t==='grid'){let c=p.answer;p.ops.forEach(o=>c=G._GRID[o.t].f(c,p.n,o.a,o.b));if(c.join('|')!==p.final.join('|')){bad++;}}
  // check() accepts the correct answer and rejects a wrong one
  const gs=G.init(p);
  if(t==='num'||t==='constraint'){gs.input=String(p.answer);if(!G._check(p,gs))bad++;gs.input=String(p.answer+1);if(G._check(p,gs))bad++;}
  if(t==='multi'){if(p.mode==='list'){gs.input=p.answer.slice().reverse().join(' , ');if(!G._check(p,gs))bad++;gs.input=p.answer.slice(1).join(',');if(G._check(p,gs))bad++;}else{gs.choice=p.answer;if(!G._check(p,gs))bad++;}}
  if(t==='seq'){p.answer.forEach((sym,i)=>{gs.slots[i]=gs.pool.indexOf(sym);});if(!G._check(p,gs))bad++;}
  if(t==='grid'){gs.cells=p.answer.slice();if(!G._check(p,gs))bad++;}
  if(t==='missing'){gs.picks=p.answer.slice();if(!G._check(p,gs))bad++;}
  // hints never repeat and are consistent
  const g2=G.init(p),msgs=[];for(let i=0;i<8;i++){const r=G.hint(p,g2);if(!r.noCount)msgs.push(r.msg);}if(new Set(msgs).size!==msgs.length){bad++;console.log('repeat hint',t);}
  if(lv===7&&k===0){console.log('\n['+t+']',p.intro);(p.steps||p.stepsShown||[]).forEach(s=>console.log('  -',s));if(p.machines)p.machines.forEach(m=>console.log('  ',m.name,m.steps.join('; '),'=>',m.out));console.log('  final',JSON.stringify(p.final),'answer',JSON.stringify(p.answer));console.log('  hints:',msgs.slice(0,3).join(' | '));}
 }
 if(Date.now()-t0>3000)console.log('slow',t,lv,Date.now()-t0);
}
console.log(cnt);console.log('bad',bad);

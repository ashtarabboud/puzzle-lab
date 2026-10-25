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
  if(t==='seq'){gs.guess=p.answer.slice();if(!G._check(p,gs))bad++;gs.guess=p.final.slice();if(p.final.join('')!==p.answer.join('')&&G._check(p,gs))bad++;}
  if(t==='grid'){gs.cells=p.answer.slice();if(!G._check(p,gs))bad++;}
  if(t==='missing'){gs.picks=p.answer.slice();if(!G._check(p,gs))bad++;}
  // hints never repeat and are consistent
  const g2=G.init(p),msgs=[];for(let i=0;i<8;i++){const r=G.hint(p,g2);if(!r.noCount)msgs.push(r.msg);}if(new Set(msgs).size!==msgs.length){bad++;console.log('repeat hint',t);}
  if(lv===7&&k===0){console.log('\n['+t+']',p.intro);(p.steps||p.stepsShown||[]).forEach(s=>console.log('  -',s));if(p.machines)p.machines.forEach(m=>console.log('  ',m.name,m.steps.join('; '),'=>',m.out));console.log('  final',JSON.stringify(p.final),'answer',JSON.stringify(p.answer));console.log('  hints:',msgs.slice(0,3).join(' | '));}
 }
 if(Date.now()-t0>3000)console.log('slow',t,lv,Date.now()-t0);
}
console.log(cnt);
// ---- workspace history: exact, deterministic undo/redo/reset ----
{const H=G._hist,ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}};
 const hs=H.make({rows:[[0,1,2,3]]}),S=['A','B','C','D'],show=()=>H.cur(hs).rows[0].map(i=>S[i]).join(' ');
 const mv=(f)=>{const n=JSON.parse(JSON.stringify(H.cur(hs)));f(n.rows[0]);return H.commit(hs,n);};
 mv(r=>{const t=r[0];r[0]=r[1];r[1]=t;});ok(show()==='B A C D','move 1');
 mv(r=>{const x=r.splice(1,1)[0];r.splice(2,0,x);});ok(show()==='B C A D','move 2');
 H.undo(hs);ok(show()==='B A C D','undo once');H.undo(hs);ok(show()==='A B C D','undo to start');ok(!H.undo(hs)&&show()==='A B C D','cannot undo past start');
 H.redo(hs);ok(show()==='B A C D','redo 1');H.redo(hs);ok(show()==='B C A D','redo 2');ok(!H.redo(hs),'nothing more to redo');
 H.undo(hs);mv(r=>r.reverse());ok(show()==='D C A B'&&!H.redo(hs),'new action clears redo');
 H.reset(hs);ok(show()==='A B C D','reset to start');H.undo(hs);ok(show()==='D C A B','reset is undoable');
 ok(JSON.stringify(hs.states[0])==='{"rows":[[0,1,2,3]]}','start is never modified');
 ok(!mv(r=>r),'no-op does not create history');
 // repeated letters keep independent identities
 const p={type:'seq',final:['A','B','A','C'],answer:['A','A','B','C']},gs={};G._ensureTiles(p,gs);
 const ws=gs.tws;H.commit(ws.hs,{rows:[[2,1,0,3]]});ok(G._tileRows(gs)[0].join('')==='ABAC'&&H.cur(ws.hs).rows[0][0]===2,'repeated letters tracked by id');
 H.undo(ws.hs);ok(H.cur(ws.hs).rows[0].join()==='0,1,2,3','undo restores ids, not just letters');
 // old saved format converts without losing the position in history
 const old={tws:{rows:[['B','A','A','C']],hist:[[['A','B','A','C']],[['A','A','B','C']]],fut:[[['C','A','B','A']]],sel:null}};G._ensureTiles(p,old);
 ok(G._tileRows(old)[0].join('')==='BAAC','old current row kept');H.undo(old.tws.hs);ok(G._tileRows(old)[0].join('')==='AABC','old undo history kept');
 H.redo(old.tws.hs);H.redo(old.tws.hs);ok(G._tileRows(old)[0].join('')==='CABA','old redo history kept');
 const gp={type:'grid',n:2,final:['a','b','c','d']},gg={cells:['b','a','c','d'],bh:[['a','b','c','d']],bf:[]};G._ensureBoard(gp,gg);ok(gg.cells.join('')==='bacd'&&gg.bhs.idx===1,'old board history converted');
}
console.log('bad',bad);

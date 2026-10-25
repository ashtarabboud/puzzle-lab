// five-question sessions (Algebra Arcade, Balance, Word Links)
const PL=require('./load.js')(['core/base.js','core/linalg.js','data/words.js','../data/wordlinks.json','games/algebra.js','games/balance.js','games/links.js','core/multi.js']);
let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}};
for(const g of ['algebra','balance','links']){
  const W=PL.games[g];ok(W.multi===5,g+' wrapped');
  for(let lv of [1,5,10]){
    const p=W.generate(lv,PL.rng(g+lv),{});
    ok(p.qs.length===5,'five questions');
    ok(new Set(p.qs.map(q=>JSON.stringify(q))).size===5,g+' questions distinct');
    ok(p.levels.every(l=>Math.abs(l-lv)<=1),g+' levels within one of '+lv+': '+p.levels);
    // play: q1 solved, q2 solved with hint, q3 failed via give up, q4 solved after wrong, q5 solved
    let t=0,finished=false;const api={activeMs:()=>t,finish:()=>{finished=true;}};
    const gs=W.init(p);
    for(let i=0;i<5;i++){
      t+=10000;const q=gs.q[gs.i];
      if(i===1){const r=W.hint(p,gs);if(!r.noCount)ok(q.hints===1,'hint counted on question');}
      if(i===3)q.wrong=1;
      if(i===2){W.giveUp(p,gs,api);} else {if(g==='links')q.gs.solved=q.gs.solved.map(()=>true);q.outcome='solved';q.ms=t-q.start;gs.showResult=true;}
      if(i<4){gs.showResult=false;gs.i++;gs.q[gs.i]={gs:W.base.init(p.qs[gs.i]),hints:0,wrong:0,ms:0,start:t,outcome:null};}
    }
    ok(gs.q.every(q=>q.outcome),'all questions have outcomes');
    const ev=W.evaluate(p,gs,{outcome:'solved',hints:1,wrong:1});
    ok(ev.metrics.session&&ev.metrics.questions.length===5&&ev.metrics.correct===4,g+' session metrics: '+ev.metrics.correct);
    ok(ev.quality>0&&ev.quality<100,'session quality normalized '+ev.quality);
    const st=W.stats([{outcome:'solved',quality:ev.quality,perf:ev.quality,hints:1,wrong:1,metrics:ev.metrics}]);
    ok(st.some(r=>r[0]==='Five-question games'),'session stats rows');
  }
  // daily stays single-question; old single attempts still evaluate/review through the base engine
  const d=W.generate(5,PL.rng('d'+g),{daily:true});ok(!d.qs,g+' daily is one question');
  const gi=W.init(d);if(g==='links')gi.solved=gi.solved.map(()=>true);const e1=W.evaluate(d,gi,{outcome:'solved',hints:0,wrong:0});ok(!e1.metrics.session&&e1.quality===100,'single evaluate unchanged');
}
console.log('bad',bad);

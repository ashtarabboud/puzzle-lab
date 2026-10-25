const PL=require('./load.js')(['core/base.js','data/words.js','games/bridges.js']);
const G=PL.games.bridges;let bad=0;
for(let lv=1;lv<=10;lv++){
  const t0=Date.now();const ex=[];
  for(let k=0;k<30;k++){
    const p=G.generate(lv,PL.rng('b'+lv+'-'+k));
    // verify solution path validity
    let gs=G.init(p);
    for(const w of p.solution.slice(1)){const e=G._validate(p,gs,w);if(e){bad++;console.log('BAD',lv,p.start,p.target,JSON.stringify(p.cons),w,e);}gs.path.push(w);}
    if(gs.path[gs.path.length-1]!==p.target)bad++;
    // optimal check: independent BFS without parents recomputed via solve from start
    const s2=G._solve(p,p.start,false); if(s2.length-1!==p.optimal){bad++;console.log('OPT mismatch');}
    if(k<3)ex.push(p.start+'>'+p.target+'('+p.optimal+(Object.keys(p.cons).length?' '+JSON.stringify(p.cons):'')+')');
  }
  console.log('L'+lv,(Date.now()-t0)+'ms',ex.join('  '));
}
console.log('bad',bad);

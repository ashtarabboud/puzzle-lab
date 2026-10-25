const PL=require('./load.js')(['core/base.js','games/algebra.js']);
const G=PL.games.algebra;let bad=0;const counts={};
function toFn(eq){ // returns f(v)=lhs-rhs
  let [l,r]=eq.replace(/−/g,'-').replace(/×/g,'*').split('=');
  const fix=s=>s.replace(/(\d|\))\s*\(/g,'$1*(').replace(/(\d)([a-z])/g,'$1*$2').replace(/\)([a-z\d])/g,')*$1');
  const vars=[...new Set((l+r).match(/[a-z]/g)||[])];
  if(vars.length!==1) return null;
  return new Function(vars[0],'return ('+fix(l)+')-('+fix(r)+');');
}
function root(f){ // scan rational candidates
  const sols=[];for(let n=1;n<=4000;n++){for(const d of [1,2,3,4,5,6,7,8,9,10,12]){const v=n/d; if(Math.abs(f(v))<1e-9){sols.push(v);} }}
  return [...new Set(sols.map(x=>+x.toFixed(6)))];
}
for(let lv=1;lv<=10;lv++){
 for(let k=0;k<150;k++){
  let p; try{p=G.generate(lv,PL.rng('alg'+lv+'-'+k));}catch(e){bad++;console.log('GENFAIL',lv,e.message);continue;}
  counts[lv+':'+p.sub]=(counts[lv+':'+p.sub]||0)+1;
  if(p.sub==='Choose the equation'){
    const f=toFn(p.opts[p.ans]); if(!f){console.log('cant parse',p.opts[p.ans]);continue;}
    const rs=root(f); if(rs.length!==1){bad++;console.log('eq roots',rs,p.opts[p.ans],p.text);continue;}
    // the variable value should appear in the steps
    const st=p.steps.join(' ');
    p.opts.forEach((o,i)=>{if(i===p.ans)return;const g=toFn(o);if(!g)return;const r2=root(g);if(r2.length===1&&r2[0]===rs[0]){bad++;console.log('distractor same root',o,'|',p.opts[p.ans]);}});
  }
  if(/[A-Za-z]+NaN|undefined|NaN/.test(JSON.stringify(p))){bad++;console.log('NaN/undefined',lv,JSON.stringify(p).slice(0,300));}
 }
}
console.log(counts);
// samples
for(const lv of [2,5,8,10]){const p=G.generate(lv,PL.rng('s'+lv));console.log('\nL'+lv,p.sub,'|',p.text,'|',p.ask,'|',G._answerText(p));p.work&&console.log(p.work);console.log(p.steps.join('\n  '));}
console.log('bad',bad);

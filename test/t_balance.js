const PL=require('./load.js')(['core/base.js','core/linalg.js','games/balance.js']);
const G=PL.games.balance;let bad=0;const kinds={};
for(let lv=1;lv<=10;lv++){const t0=Date.now();
 for(let k=0;k<40;k++){
  const p=G.generate(lv,PL.rng('bal'+lv+'-'+k));
  kinds[lv+':'+p.kind+(p.kind==='compare'?'/'+p.answer:'')]=(kinds[lv+':'+p.kind+(p.kind==='compare'?'/'+p.answer:'')]||0)+1;
  if(!G._fits(p,p.w)){bad++;console.log('hidden weights do not fit',lv,k);}
  // brute-force cross-check answers over integer weights 1..15
  const n=p.shapes.length;const sols=[];
  (function rec(i,w){if(i===n){if(G._fits(p,w))sols.push(w.slice());return;}for(let v=1;v<=15;v++){w[i]=v;rec(i+1,w);}})(0,[]);
  if(p.kind==='value'){ if(!sols.every(w=>w[p.target]===p.answer)){bad++;console.log('value mismatch',lv,k);} }
  if(p.kind==='ratio'){ if(!sols.every(w=>w[p.a]===p.answer*w[p.b])){bad++;console.log('ratio mismatch');} }
  if(p.kind==='insufficient'){ const s=new Set(sols.map(w=>w[p.target])); if(s.size<2){console.log('insufficient but integer-determined (ok by real rule)',lv,k,s.size);} }
  if(p.kind==='compare'){ const sg=new Set(sols.map(w=>Math.sign(w[p.x]-w[p.y])));
    const exp={x:[1],y:[-1],eq:[0]}[p.answer]; if(exp && !(sg.size===1&&sg.has(exp[0]))){bad++;console.log('compare mismatch',lv,k,p.answer,[...sg]);}
    if(p.answer==='unk'&&sg.size<2)console.log('unk but integers agree',lv,k); }
  if(p.kind==='must'){ // answer must hold for all integer sols
    const ok=(st,w)=>{let l=0,r=0;st.l.forEach(([c,i])=>l+=c*w[i]);st.r.forEach(([c,i])=>r+=c*w[i]);return st.op==='='?l===r:st.op==='>'?l>r:l<r;};
    if(!sols.every(w=>ok(p.stmts[p.answer],w))){bad++;console.log('must wrong');}
    p.stmts.forEach((st,i)=>{if(i!==p.answer&&sols.every(w=>ok(st,w)))console.log('distractor holds on integers',lv,k,p.options[i]);});
  }
  if(!p.expl||!p.expl.length){console.log('no expl',lv,p.kind);}
  if(lv===8&&k<2)console.log(p.kind,p.scales.map(s=>G._describe(s,p.shapes)).join(' | '),'=>',G._answerText(p),'\n  ',p.expl.join('\n   '));
 }
 console.log('L'+lv,Date.now()-t0+'ms');
}
console.log(kinds);console.log('bad',bad);

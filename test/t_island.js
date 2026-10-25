const PL=require('./load.js')(['core/base.js','data/words.js','data/lexicon.js','../data/island_vocab.json','games/island.js']);
const G=PL.games.island;let bad=0;
const R=id=>G._ruleById(id);
const j=(id,w,param,prev)=>R(id).f(G._normalize(w),prev||null,null,param);
// ordinary inputs are judged deterministically
const inputs=['tacos','a fireplace','The Fireplace!','ice cream','apples','mice','knives','hot dog','a pair of socks','an umbrella','Grandfather clock','sushi','smartphone','kites'];
for(const w of inputs){
  const n=G._normalize(w);
  for(const r of G._rules){ for(const pm of (r.param||[null])){ const v=r.f(n,'cat',null,pm); if(r.kind!=='sem'&&v===null){bad++;console.log('null for non-meaning rule',r.id,w);} } }
  const m=G._meaning(n);console.log(JSON.stringify(w).padEnd(22),'→',n.text.padEnd(18),'meaning:',m?Object.keys(m.cats).join('/')+' ['+m.src+' '+m.key+']':'UNRECOGNISED','syl',G._syllables(n));
}
console.log('tacos food?',j('cat','tacos','food'),' fireplace building?',j('cat2','a fireplace','building'),' mice animal?',j('cat','mice','animal'),' hot dog food?',j('cat','hot dog','food'),' socks clothing?',j('cat','a pair of socks','clothing'));
console.log('hour vowel sound?',j('vsound','an hour'),' unicorn?',j('vsound','unicorn'));
// consistency: same input always same answer
for(const w of inputs) for(const r of G._rules) for(const pm of (r.param||[null])) if(r.f(G._normalize(w),'x',null,pm)!==r.f(G._normalize(w),'x',null,pm))bad++;
// generator + seeds + test + options
for(let lv=1;lv<=10;lv++)for(let k=0;k<25;k++){const p=G.generate(lv,PL.rng('i'+lv+k));
 let prev=null;for(const s of p.seed){if(G._judge(p,s.w,s.prev!==undefined?s.prev:prev)!==s.ok){bad++;console.log('seed',p.rule,s);} }
 const opts=p.options;if(opts.filter(o=>o.id===p.rule&&o.param===p.param).length!==1){bad++;console.log('options missing truth',p.rule);} if(opts.length<5){console.log('few options',p.rule,opts.length);}
 const gs={log:p.seed.slice(),tests:0};const t=G._buildTest(p,gs,PL.rng('t'));t.forEach(x=>{if(G._judge(p,x.w,x.prev?G._normalize(x.prev).letters:null)!==x.ok){bad++;}});
 // hint returns an example consistent with the rule
 const g2=G.init(p);for(let h=0;h<3;h++){const r=G.hint(p,g2);const last=g2.log[g2.log.length-1];if(last.fromHint&&G._judge(p,last.w,last.prev)!==last.ok){bad++;console.log('hint wrong');}}
}
console.log('bad',bad);

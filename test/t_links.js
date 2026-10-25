const PL=require('./load.js')(['core/base.js','../data/wordlinks.json','games/links.js']);
const G=PL.games.links;let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}};
const B=PL.data.wordlinks;
// data validation
const keys=new Set();B.forEach(e=>{ok(/^[A-Z]+$/.test(e.a)&&/^[A-Z]+$/.test(e.b),'components uppercase '+e.text);ok(e.text.replace(/[^a-z]/g,'').toUpperCase()===e.a+e.b,'text matches components: '+e.text);
 const k=e.a+'+'+e.b;ok(!keys.has(k),'duplicate '+k);keys.add(k);
 ['easy','hard'].forEach(c=>{const t=(e[c]||'').toLowerCase();ok(t.length>5,'clue present '+e.text);[e.a,e.b].forEach(w=>{const lw=w.toLowerCase();const leak=lw.length<=3?new RegExp('\\b'+lw+'\\b').test(t):t.includes(lw);ok(!leak,'clue leak '+e.text+' / '+c);});});});
// generation: chains link correctly, lengths by level, answers accepted in several spellings
const lens={};
for(let lv=1;lv<=10;lv++)for(let k=0;k<30;k++){const p=G.generate(lv,PL.rng('wl'+lv+k));lens[lv+':'+p.len]=(lens[lv+':'+p.len]||0)+1;
 for(let i=1;i<p.links.length;i++)ok(p.links[i-1].b===p.links[i].a,'overlap');ok(new Set(p.parts).size===p.parts.length,'no repeated parts');
 p.links.forEach(L=>{ok(G._accepts(L,L.text),'accept text');ok(G._accepts(L,L.a+' '+L.b),'accept spaced');ok(G._accepts(L,(L.a+'-'+L.b).toLowerCase()),'accept hyphen');ok(!G._accepts(L,L.a),'reject part');});
 const gs=G.init(p);const msgs=[];for(let i=0;i<30;i++){const r=G.hint(p,gs);if(r.noCount)break;msgs.push(r.msg);}ok(new Set(msgs).size===msgs.length,'hints never repeat');
 if(lv===9&&k<2)console.log(p.parts.join(' → '),'|',p.links.map(l=>l.clue).join(' || '));}
console.log(JSON.stringify(lens));console.log('bad',bad);

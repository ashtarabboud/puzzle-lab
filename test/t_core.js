// adaptive difficulty, daily scoring, migrations and import (model.js with an in-memory store)
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Date,Object,Array,String,Number,Set,Error};vm.createContext(ctx);
vm.runInContext('var PL={data:{},games:{}};'+fs.readFileSync('src/core/base.js','utf8'),ctx);
vm.runInContext('var mem={};PL.SCHEMA=4;PL.store={get:function(k){return mem[k]},put:function(k,v){if(v&&typeof v==="object")v.u=Date.now();mem[k]=v},del:function(k){delete mem[k]},keys:function(p){return Object.keys(mem).filter(function(k){return k.indexOf(p)===0})},raw:function(){return mem},replaceAll:function(o){mem=o;}};'+fs.readFileSync('src/core/model.js','utf8'),ctx);
const PL=ctx.PL,M=PL.model;let bad=0;const ok=(c,m)=>{if(!c){bad++;console.log('FAIL',m);}};
// stub games for daily scoring benchmark
PL.order.concat(PL.retired).forEach(g=>{PL.games[g]={benchmark:()=>100,generate:()=>({g}),init:()=>({})};});
let t=1000;ctx.Date.now=()=>t;
function play(g,perf){const r=M.rating(g);t+=1000;M.saveAttempt({id:'a'+t,game:g,mode:'unlimited',timed:false,outcome:perf>30?'solved':'failed',perf,level:r.level,endedAt:t});return M.adapt(g).change;}
// 1. sustained strong performance raises the level one step at a time
let ups=0;for(let i=0;i<12;i++)ups+=play('bridges',95)>0?1:0;ok(ups>=2&&M.rating('bridges').level===3+ups,'rises gradually: '+ups);
// 2. one bad result does not change the level
const L0=M.rating('bridges').level;play('bridges',95);play('bridges',95);play('bridges',95);play('bridges',95);const L1=M.rating('bridges').level;play('bridges',5);ok(M.rating('bridges').level>=L1,'single bad result ignored');
// 3. sustained poor performance lowers it
const Lh=M.rating('bridges').level;for(let i=0;i<10;i++)play('bridges',40);ok(M.rating('bridges').level<Lh,'drops after slump');
// 4. no oscillation in the 65-84 band
const Lm=M.rating('bridges').level;for(let i=0;i<12;i++)play('bridges',75);ok(M.rating('bridges').level===Lm,'stable in middle band');
// 5. independent ratings, daily attempts ignored, timed ignored
const La=M.rating('algebra').level;t+=1000;M.saveAttempt({id:'d1',game:'algebra',mode:'daily',outcome:'solved',perf:100,level:8,endedAt:t});M.saveAttempt({id:'tm',game:'algebra',mode:'unlimited',timed:true,outcome:'solved',perf:100,level:8,endedAt:t});ok(M.rollingFor('algebra').n===0,'daily and timed excluded');ok(M.rating('algebra').level===La,'independent');
// 6. daily scoring formula
let s=M.dailyScore('bridges',5,100,true,50000);ok(s.score===100,'fast perfect = 100 got '+s.score);
s=M.dailyScore('bridges',5,100,true,400000);ok(s.score===80,'slow perfect = 80 got '+s.score);
s=M.dailyScore('bridges',5,50,true,50000);ok(s.score===50,'half quality fast = 0.8*50+0.2*50 = 50 got '+s.score);
s=M.dailyScore('bridges',5,0,false,10000);ok(s.score===0,'unsolved = 0');
// 7. ten-game daily with max 1000; old nine-game days keep 900
const d=M.ensureDaily('2026-10-25');ok(d.games.length===PL.order.length&&d.max===PL.order.length*100&&d.games.indexOf('logic')<0,'new daily has every active game');
PL.store.put('day:2026-10-20',{date:'2026-10-20',diff:'Easy',levels:{},puzzles:{},prog:Object.fromEntries(PL.OLD_DAILY_ORDER.map(g=>[g,{done:true,score:80,outcome:'solved',activeMs:1000}])),complete:true,total:720});
const od=M.daily('2026-10-20');ok(od.max===900&&od.games.length===9,'old day keeps 900');ok(M.dailyTotals(od).score===720&&Math.round(M.dayPct(od))===80,'old day 80%');
// 8. migration of a v1 core and import of a v1 export
const v1={app:'puzzle-lab',schema:1,exportedAt:'2026-10-24T00:00:00Z',data:{core:{schema:1,settings:{timed:false,excluded:['logic','shape']},ratings:{logic:{level:6,highest:7,changes:[]},password:{level:5,highest:5,changes:[]}}},'att:x1':{id:'x1',game:'logic',mode:'unlimited',outcome:'solved',perf:90,level:6,endedAt:5},'act:logic':{id:'z'},'day:2026-10-19':{date:'2026-10-19',diff:'Hard',prog:{},complete:false}}};
ok(!M.validateImport(v1),'v1 export accepted');
// import into a fresh store
vm.runInContext('mem={}',ctx);const counts=M.importData(v1,'merge');
ok(counts.attempts===1,'attempt imported');ok(!PL.store.get('act:logic'),'retired active dropped');
const c=M.core();ok(c.schema===4,'schema migrated');ok(c.ratings.password.level===5,'rating preserved');ok(c.ratings.reverse&&c.ratings.links,'new ratings');ok(c.settings.excluded.indexOf('logic')<0,'excluded cleaned');
ok(M.daily('2026-10-19').max===900,'imported old day migrated');
// fresh start: clears stats, levels and today's daily (an old 10-game day is rebuilt with every game); undo brings it all back
{PL.store.replaceAll({});M.core();PL.store.put('day:2026-10-25',{date:'2026-10-25',diff:'Easy',games:PL.order.slice(0,10),max:1000,levels:{},puzzles:{},prog:{}});
 for(let i=0;i<6;i++)play('algebra',95);M.saveActive('loop',{x:1});const lvl=M.rating('algebra').level;ok(lvl>3,'level rose before reset');
 t+=1000;const r=M.freshStart('2026-10-25');ok(r.attempts===6,'six results set aside');ok(M.attempts().length===0,'statistics empty');ok(M.rating('algebra').level===3,'levels back to 3');
 ok(!M.active('loop'),'unfinished puzzles cleared');ok(M.daily('2026-10-25').games.length===PL.order.length,'today rebuilt with every game');ok(PL.store.keys('arc:').length===1,'archive kept');
 ok(M.exportData().data[r.archive],'archive included in exports');
 play('bridges',90);const u=M.undoFreshStart();ok(u.attempts===6&&M.attempts().length===7,'undo restores old results and keeps new ones');ok(M.rating('algebra').level===lvl,'undo restores levels');
 ok(M.daily('2026-10-25').games.length===PL.order.length,'today keeps the rebuilt quiz after undo');ok(M.active('loop'),'undo restores unfinished puzzle');ok(!PL.store.keys('arc:').length,'archive consumed');}
// Word Rush v1 → v2: re-score unlimited rounds (originals kept), never dailies, and recalibrate the level by replay
{let n0=0;PL.games.wordrush={rescore:a=>(a.metrics&&a.metrics.sv>=2)?null:{quality:55,perf:55,metrics:{sv:2,mode:'timed'},v1:{quality:a.quality,perf:a.perf,target:9}}};
 const r=M.rating('wordrush');r.level=3;const c=M.core();c.ratings.wordrush={level:6,highest:6,changes:[{t:1,from:5,to:6}],since:0};M.saveCore(c);
 for(let i=0;i<10;i++){t+=1000;M.saveAttempt({id:'wr'+t,game:'wordrush',mode:'unlimited',timed:false,outcome:'solved',perf:100,quality:100,level:3+Math.min(3,Math.floor(i/3)),endedAt:t,metrics:{mode:'timed',target:9},lines:[]});}
 t+=1000;M.saveAttempt({id:'wrd'+t,game:'wordrush',mode:'daily',outcome:'solved',perf:100,quality:100,level:6,endedAt:t,metrics:{mode:'timed'},lines:[]});
 const n=M.upgradeRecords();ok(n===10,'ten unlimited rounds re-scored, daily untouched: '+n);
 const A=M.attempts(a=>a.game==='wordrush');ok(A.filter(a=>a.mode==='unlimited').every(a=>a.perf===55&&a.v1.perf===100&&a.lines.length===1),'v2 score in use, v1 kept and noted');
 ok(A.find(a=>a.mode==='daily').perf===100&&!A.find(a=>a.mode==='daily').v1,'daily result unchanged');
 const lv=M.rating('wordrush').level;ok(lv<6&&M.rating('wordrush').highest===6,'level recalibrated from the re-scored rounds ('+lv+'), history kept');
 ok(M.upgradeRecords()===0,'upgrade runs once');}
console.log('bad',bad);

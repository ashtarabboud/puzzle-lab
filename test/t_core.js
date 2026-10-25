// adaptive difficulty, daily scoring, migrations and import (model.js with an in-memory store)
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,JSON,Date,Object,Array,String,Number,Set,Error};vm.createContext(ctx);
vm.runInContext('var PL={data:{},games:{}};'+fs.readFileSync('src/core/base.js','utf8'),ctx);
vm.runInContext('var mem={};PL.SCHEMA=3;PL.store={get:function(k){return mem[k]},put:function(k,v){if(v&&typeof v==="object")v.u=Date.now();mem[k]=v},del:function(k){delete mem[k]},keys:function(p){return Object.keys(mem).filter(function(k){return k.indexOf(p)===0})},raw:function(){return mem},replaceAll:function(o){mem=o;}};'+fs.readFileSync('src/core/model.js','utf8'),ctx);
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
const c=M.core();ok(c.schema===3,'schema migrated');ok(c.ratings.password.level===5,'rating preserved');ok(c.ratings.reverse&&c.ratings.links,'new ratings');ok(c.settings.excluded.indexOf('logic')<0,'excluded cleaned');
ok(M.daily('2026-10-19').max===900,'imported old day migrated');
console.log('bad',bad);

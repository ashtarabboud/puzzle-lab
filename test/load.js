const fs=require('fs'),vm=require('vm'),path=require('path');
module.exports=function(files){
  const ctx={console,Set,Map,Math,JSON,Date,Array,Object,String,Number,Error,setTimeout};
  vm.createContext(ctx);
  vm.runInContext('var PL={data:{},games:{}};',ctx);
  for(const f of files){
    const p=path.join(__dirname,'..','src',f);
    let src=fs.readFileSync(p,'utf8');
    if(f.endsWith('.json')){ src='PL.data["'+path.basename(f,'.json')+'"]='+src+';'; }
    vm.runInContext(src,ctx,{filename:f});
  }
  return ctx.PL;
};

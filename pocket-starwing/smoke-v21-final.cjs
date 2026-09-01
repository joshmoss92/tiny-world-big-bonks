const fs=require('fs'),Module=require('module'),path=require('path');
const file=path.join(__dirname,'smoke-v21.cjs');
let code=fs.readFileSync(file,'utf8');
const from="boss.hp=0;advance(2);state=window.__STARWARD__.getState();let q=window.__STARWARD__.v21State();";
const to="boss.hp=0;let deathGuard=0;while(!window.__STARWARD__.v21State().transition.active&&deathGuard++<240)advance(1);state=window.__STARWARD__.getState();let q=window.__STARWARD__.v21State();";
if(!code.includes(from))throw Error('V21 base smoke boss hook changed');
code=code.replace(from,to);
const m=new Module(file,module);m.filename=file;m.paths=module.paths;m._compile(code,file);
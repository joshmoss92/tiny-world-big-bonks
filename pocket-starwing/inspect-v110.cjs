const fs=require('fs'),zlib=require('zlib'),transform=require('./v10-polish8.js');
const splitLines=s=>s.match(/[^\n]*\n|[^\n]+$/g)||[];
const base=fs.readFileSync(__dirname+'/game.js','utf8');
const parts=fs.readdirSync(__dirname+'/runtime_v9_patch').filter(f=>/^patch-\d+\.b64$/.test(f)).sort().map(f=>fs.readFileSync(__dirname+'/runtime_v9_patch/'+f,'utf8').trim()).join('');
const ops=JSON.parse(zlib.gunzipSync(Buffer.from(parts,'base64')).toString('utf8')),lines=splitLines(base),out=[];for(const op of ops){if(op[0]==='=')out.push(lines.slice(op[1],op[2]).join(''));else out.push(op[1]);}
function balance(source){let n=0;source=source.replace(/const ENEMIES\s*=\s*\{[\s\S]*?\n\};/,b=>b.replace(/\bhp:(\d+(?:\.\d+)?)/g,(_,v)=>{n++;return `hp:${Math.round(Number(v)*1.75*100)/100}`;}));source=source.replace(/S\.focusTimer=7\b/g,'S.focusTimer=8').replace(/for 7 seconds/g,'for 8 seconds');const a='const focusBonus=target===S.focusTarget&&S.focusTimer>0?1.25:1;',b='const focusBonus=target===S.focusTarget&&S.focusTimer>0?1.65:1;';if(!source.includes(a)||n<5)throw Error('balance hooks missing');return source.replace(a,b);}
const source=transform.apply(balance(out.join('')));
for(const term of ['function showResults','BUILD OF THE RUN','phase=\'dead\'','phase = \'dead\'','deathTimer']){
 const i=source.indexOf(term);console.log('\n### '+term+' @ '+i+' ###\n'+(i>=0?source.slice(Math.max(0,i-1300),i+3200):'NOT FOUND'));
}

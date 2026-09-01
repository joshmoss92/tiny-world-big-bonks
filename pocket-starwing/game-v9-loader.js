(() => {
'use strict';
const BASE='game.js';
const PATCHES=[
  'runtime_v9_patch/patch-00.b64',
  'runtime_v9_patch/patch-01.b64',
  'runtime_v9_patch/patch-02.b64',
  'runtime_v9_patch/patch-03.b64',
  'runtime_v9_patch/patch-04.b64',
  'runtime_v9_patch/patch-05.b64',
  'runtime_v9_patch/patch-06.b64',
  'runtime_v9_patch/patch-07.b64',
  'runtime_v9_patch/patch-08.b64',
  'runtime_v9_patch/patch-09.b64',
  'runtime_v9_patch/patch-10.b64',
  'runtime_v9_patch/patch-11.b64'
];
const splitLines=s=>s.match(/[^\n]*\n|[^\n]+$/g)||[];
async function gunzipBase64(text){
  const bin=atob(text), bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  if(typeof DecompressionStream!=='function')throw new Error('This browser does not support runtime decompression.');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}
function applyTargetingBalance(source){
  let hpValues=0, directHits=0;
  source=source.replace(/const ENEMIES\s*=\s*\{[\s\S]*?\n\};/,block=>block.replace(/\bhp:(\d+(?:\.\d+)?)/g,(_,raw)=>{
    hpValues++;
    const boosted=Number(raw)*1.75;
    const value=Math.round(boosted*100)/100;
    return `hp:${value}`;
  }));
  source=source.replace(/S\.focusTimer=7\b/g,'S.focusTimer=8');
  source=source.replace(/e\.hp-=sh\.damage([^;]*);/g,(match,tail)=>{
    directHits++;
    return `e.hp-=sh.damage${tail}*((S.focusTarget===e&&S.focusTimer>0)?1.45:1);`;
  });
  source=source.replace(/for 7 seconds/g,'for 8 seconds');
  if(hpValues<5||directHits<1)throw new Error(`Targeting balance patch incomplete (${hpValues} HP values, ${directHits} direct-hit paths)`);
  return source;
}
async function boot(){
  try{
    const [base,...patches]=await Promise.all([BASE,...PATCHES].map(async path=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(`Failed ${path} (${r.status})`);return r.text();}));
    const ops=JSON.parse(await gunzipBase64(patches.map(x=>x.trim()).join(''))), lines=splitLines(base), out=[];
    for(const op of ops){if(op[0]==='=')out.push(lines.slice(op[1],op[2]).join(''));else out.push(op[1]);}
    const source=applyTargetingBalance(out.join(''));
    (0,eval)(source);
  }catch(error){
    console.error('Starward Run V9 boot failure',error);
    const title=document.getElementById('overlayTitle'),text=document.getElementById('overlayText'),overlay=document.getElementById('overlay');
    if(title)title.textContent='Unable to start Starward Run';
    if(text)text.textContent='The game runtime could not be loaded. Refresh the page to try again.';
    if(overlay)overlay.classList.remove('hidden');
  }
}
boot();
})();

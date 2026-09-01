(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v10-balance.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V10 balance transform missing');
  const FINAL_BLOCK=String.raw`

// ---- Starward Run V10.4 final integration polish ----
let aaaFinalResultProbeArmed=false;
function aaaFinalAppendResults(){
  if(!S||!S.aaa?.p2||typeof overlayText==='undefined')return false;
  const html=overlayText.innerHTML||'';
  if(!/BUILD OF THE RUN/.test(html))return false;
  if(/TACTICAL COMMAND/.test(html))return true;
  const p=S.aaa.p2;
  const chain=Math.max(1,(p.maxFocusChain||0)+1);
  overlayText.innerHTML+=`<div class="tactical-results"><strong>TACTICAL COMMAND</strong><span>Priority kills <b>${S.aaa.focusKills||0}</b></span><span>Best focus chain <b>${chain}×</b></span><span>Capital ships <b>${S.aaa.capitalKills||0}</b></span><span>Systems destroyed <b>${p.systemKills||0}</b></span><span>Peak hostiles <b>${Math.max(S.maxEnemiesSeen||0,p.peakEnemies||0)}</b></span></div>`;
  return true;
}
function aaaFinalArmResults(){
  if(aaaFinalResultProbeArmed)return;
  aaaFinalResultProbeArmed=true;
  let tries=0;
  const probe=()=>{
    if(aaaFinalAppendResults())return;
    if(++tries<240)requestAnimationFrame(probe);
  };
  requestAnimationFrame(probe);
}
const __aaaFinalUpdate=update;
update=function(dt){
  __aaaFinalUpdate(dt);
  if(!S)return;
  if(S.phase==='running'&&S.time<1)aaaFinalResultProbeArmed=false;
  if(S.phase==='dying')aaaFinalArmResults();
  if(S.phase==='dead')aaaFinalAppendResults();
};
if(typeof window!=='undefined'&&window.__STARWARD__)window.__STARWARD__.aaaAppendResults=aaaFinalAppendResults;
// ---- end V10.4 final integration polish ----
`;
  function apply(source){
    let transformed=base.apply(source);
    if(!transformed.includes('P2_SYSTEM_META'))throw new Error('Starward V10.4 systems layer missing');
    transformed=transformed.replace('let best=null,bestD=26;','let best=null,bestD=34;');
    transformed=transformed.replace('const unit=Math.max(18,e.maxHp*.13);','const unit=Math.max(16,e.maxHp*.10);');
    const close=transformed.lastIndexOf('})();');
    if(close<0)throw new Error('Starward V10.4 runtime closure not found');
    return transformed.slice(0,close)+FINAL_BLOCK+'\n'+transformed.slice(close);
  }
  return {apply};
});

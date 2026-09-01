(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v10-polish8.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V10.10 transform missing');

  const POLISH9=String.raw`

// ---- Starward Run V10.11 mastery-feedback and battle-clarity layer ----
function aaa9Ensure(){
  aaaEnsureState();
  if(!S.aaa.v111)S.aaa.v111={perfectChains:0,chainFlash:null,staggerFrames:0,alertFrames:0,maxAlertsSeen:0,largeTouchLocks:0};
  return S.aaa.v111;
}

function aaa9TouchRadius(e){
  const role=aaaRole(e),base=e?.size||16;
  if(e?.aaaCapital||role.priority>=4)return Math.max(60,base+25);
  if(role.priority>=3||e?.elite)return Math.max(54,base+23);
  return Math.max(44,base+18);
}

function aaa9BestTouchTarget(x,y){
  if(!S)return null;
  let best=null,bestScore=-1e9;
  for(const e of S.enemies){
    if(!e||e.hp<=0)continue;
    const d=dist(x,y,e.x,e.y),radius=aaa9TouchRadius(e);
    if(d>radius)continue;
    const role=aaaRole(e),hp=clamp(e.hp/Math.max(1,e.maxHp),0,1);
    const score=role.priority*130+(e.aaaCapital?100:0)+(e.elite?30:0)+(1-hp)*10-d*1.30;
    if(score>bestScore){best=e;bestScore=score;}
  }
  return best;
}
aaa8BestTouchTarget=aaa9BestTouchTarget;

const __aaa9ClaimTarget=aaa8ClaimTarget;
aaa8ClaimTarget=function(e){const ok=__aaa9ClaimTarget(e);if(ok&&aaa9TouchRadius(e)>46)aaa9Ensure().largeTouchLocks++;return ok;};

const __aaa9Recommended=aaa3RecommendedTarget;
aaa3RecommendedTarget=function(){if(S?.aaa?.v110?.clarity)return null;return __aaa9Recommended();};

const __aaa9Urgency=aaa7DrawUrgency;
aaa7DrawUrgency=function(){};

function aaa9UrgentTargets(){
  if(!S)return [];
  return S.enemies.filter(e=>{
    if(!e||e.hp<=0||S.focusTarget===e)return false;
    const role=aaaRole(e);return role.priority>=3&&Number.isFinite(e.fire)&&e.fire<.72&&e.x<W-30&&e.x>S.ship.x+40;
  }).sort((a,b)=>{
    const ra=aaaRole(a),rb=aaaRole(b);
    return (rb.priority-ra.priority)||((a.fire||9)-(b.fire||9))||(a.x-b.x);
  }).slice(0,2);
}

const __aaa9KillEnemy=killEnemy;
killEnemy=function(e){
  const p=p2Ensure(),before=p.focusChain||0,wasFocused=!!(S&&S.focusTarget===e&&S.focusTimer>0&&!e?.byLaser),x=e?.x||0,y=e?.y||0;
  const r=__aaa9KillEnemy(e);
  if(!S)return r;
  const after=p.focusChain||0;
  if(wasFocused&&after>before&&after>=2&&S.focusTarget&&S.focusTarget.hp>0){
    const a=aaa9Ensure();a.perfectChains++;
    a.chainFlash={x1:x,y1:y,target:S.focusTarget,time:.55,max:.55,count:after+1};
    popup('PERFECT CHAIN ×'+(after+1),S.focusTarget.x,S.focusTarget.y-S.focusTarget.size-42,'#fff19a',1.0);
    aaa4Haptic([8,20,8]);
  }
  return r;
};

function aaa9DrawStagger(e){
  if(!S||!e||e.hp<=0||!(e.aaaStagger>0))return;
  const a=aaa9Ensure();a.staggerFrames++;
  const r=(e.size||18)+10+Math.sin(S.time*18)*2;
  ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=.72+.18*Math.sin(S.time*22);ctx.strokeStyle=e.aaaCapital?'#ffd96f':'#8ff7ff';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(0,0,r,-.15,1.20);ctx.stroke();ctx.beginPath();ctx.arc(0,0,r,1.75,3.15);ctx.stroke();ctx.beginPath();ctx.arc(0,0,r,3.55,5.65);ctx.stroke();
  ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;for(let i=0;i<3;i++){const a0=S.time*(5+i*.7)+i*2.1,x0=Math.cos(a0)*(r-3),y0=Math.sin(a0)*(r-3);ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x0+Math.cos(a0+1.2)*10,y0+Math.sin(a0+1.2)*10);ctx.lineTo(x0+Math.cos(a0+.2)*18,y0+Math.sin(a0+.2)*18);ctx.stroke();}
  ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='bold 8px monospace';ctx.fillText(e.aaaCapital?'WARSHIP STAGGERED':'STAGGERED',0,-r-9);ctx.restore();
}

const __aaa9DrawEnemy=drawEnemy;
drawEnemy=function(e){__aaa9DrawEnemy(e);aaa9DrawStagger(e);};

function aaa9DrawBossStagger(){
  const b=S?.boss;if(!b||!(b.aaaStagger>0))return;const a=aaa9Ensure();a.staggerFrames++;
  ctx.save();ctx.globalAlpha=.72+.18*Math.sin(S.time*18);ctx.strokeStyle='#ffe36f';ctx.lineWidth=4;ctx.beginPath();ctx.arc(b.x,b.y,b.size+27+Math.sin(S.time*13)*3,0,TWO_PI);ctx.stroke();ctx.fillStyle='#ffe36f';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText('SYSTEMS STAGGERED',b.x,b.y-b.size-36);ctx.restore();
}

function aaa9DrawChainFlash(){
  const f=aaa9Ensure().chainFlash;if(!f||f.time<=0||!f.target||f.target.hp<=0)return;
  const alpha=clamp(f.time/f.max,0,1);ctx.save();ctx.globalAlpha=alpha*.75;ctx.strokeStyle='#fff19a';ctx.lineWidth=2;ctx.setLineDash?.([8,7]);ctx.beginPath();ctx.moveTo(f.x1,f.y1);ctx.lineTo(f.target.x,f.target.y);ctx.stroke();ctx.setLineDash?.([]);ctx.fillStyle='#fff19a';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText('CHAIN ×'+f.count,f.target.x,f.target.y+f.target.size+33);ctx.restore();
}

const __aaa9Draw=draw;
draw=function(){
  __aaa9Draw();
  const urgent=aaa9UrgentTargets(),a=aaa9Ensure();a.alertFrames+=urgent.length;a.maxAlertsSeen=Math.max(a.maxAlertsSeen,urgent.length);
  for(const e of urgent)__aaa9Urgency(e);
  aaa9DrawBossStagger();aaa9DrawChainFlash();
};

const __aaa9Update=update;
update=function(dt){
  __aaa9Update(dt);if(!S)return;const a=aaa9Ensure();
  if(a.chainFlash){a.chainFlash.time=Math.max(0,a.chainFlash.time-dt);if(a.chainFlash.time<=0)a.chainFlash=null;}
};

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.aaa9State=()=>S?.aaa?.v111||null;
  window.__STARWARD__.aaa9TouchRadius=aaa9TouchRadius;
  window.__STARWARD__.aaa9UrgentTargets=aaa9UrgentTargets;
}
// ---- end V10.11 mastery-feedback layer ----
`;

  function apply(source){
    const transformed=base.apply(source);
    for(const hook of ['aaa8BestTouchTarget','aaa8ClaimTarget','aaa7DrawUrgency','aaa3RecommendedTarget','aaa8EnsureResultsStack'])if(!transformed.includes(hook))throw new Error('Starward V10.11 hook missing: '+hook);
    const close=transformed.lastIndexOf('})();');
    if(close<0)throw new Error('Starward V10.11 runtime closure not found');
    return transformed.slice(0,close)+POLISH9+'\n'+transformed.slice(close);
  }
  return {apply};
});

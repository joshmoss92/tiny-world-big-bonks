(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v10-polish3.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V10.5 transform missing');

  const POLISH4=String.raw`

// ---- Starward Run V10.6 input-and-subsystem polish ----
function aaa4Ensure(){
  aaaEnsureState();
  if(!S.aaa.v106)S.aaa.v106={targetClaims:0,eventAccepts:0,lostLocks:0,systemsExposed:0,haptics:0,recommendedTarget:null,recommendedUntil:0};
  return S.aaa.v106;
}

function aaa4Haptic(pattern){
  if(REDUCED_MOTION)return false;
  if(typeof navigator!=='undefined'&&navigator.vibrate){try{navigator.vibrate(pattern);aaa4Ensure().haptics++;return true;}catch(_){}}
  return false;
}

function aaa4InputClaimsTarget(x,y){
  if(!S||S.phase!=='running')return false;
  if(S.boss){
    if(Array.isArray(S.boss.parts))for(const p of S.boss.parts){if(p.hp>0&&dist(x,y,S.boss.x+(p.ox||0),S.boss.y+(p.oy||0))<34){aaa4Ensure().targetClaims++;return true;}}
    if(dist(x,y,S.boss.x,S.boss.y)<S.boss.size+24){aaa4Ensure().targetClaims++;return true;}
  }
  for(const e of S.enemies){
    if(!e||e.hp<=0)continue;
    if(e.aaaCapital){p2InitCapital(e);for(const [id,sys] of Object.entries(e.p2Systems||{})){if(sys.alive){const n=p2CapitalNode(e,id);if(dist(x,y,n.x,n.y)<34){aaa4Ensure().targetClaims++;return true;}}}}
    if(dist(x,y,e.x,e.y)<Math.max(34,e.size+14)){aaa4Ensure().targetClaims++;return true;}
  }
  return false;
}

function aaa4ExposeCapitalSystem(e,id,sys){
  if(!e||!sys||!sys.alive||sys.exposed)return false;
  sys.exposed=true;sys.hp=Math.min(sys.hp,Math.max(1,sys.maxHp*.35));aaa4Ensure().systemsExposed++;
  popup(sys.name+' EXPOSED',e.x+(sys.ox||0),e.y+(sys.oy||0)-20,'#ffd36f',1.05);
  return true;
}

const __aaa4Recommended=aaa3RecommendedTarget;
aaa3RecommendedTarget=function(){
  const t=__aaa4Recommended(),a=aaa4Ensure();
  if(!t){a.recommendedTarget=null;a.recommendedUntil=0;return null;}
  if(t!==a.recommendedTarget){a.recommendedTarget=t;a.recommendedUntil=S.time+2.8;}
  return S.time<=a.recommendedUntil?t:null;
};

const __aaa4ReleaseStarLaser=releaseStarLaser;
releaseStarLaser=function(){const ok=__aaa4ReleaseStarLaser.apply(this,arguments);if(ok)aaa4Haptic([18,28,38]);return ok;};

if(typeof drawEnemy==='function'){
  const __aaa4DrawEnemy=drawEnemy;
  drawEnemy=function(e){
    __aaa4DrawEnemy(e);
    if(!e?.aaaCapital||e.hp<=0||!e.p2Systems)return;
    ctx.save();ctx.lineWidth=1.5;
    for(const [id,sys] of Object.entries(e.p2Systems)){if(!sys.alive||!sys.exposed)continue;const n=p2CapitalNode(e,id);ctx.strokeStyle='#ffd36f';ctx.globalAlpha=.5+.25*Math.sin(S.time*7);ctx.beginPath();ctx.arc(n.x,n.y,11+Math.sin(S.time*5)*2,0,TWO_PI);ctx.stroke();}
    ctx.restore();
  };
}

const __aaa4Update=update;
update=function(dt){
  __aaa4Update(dt);
  if(!S)return;
  if(S.focusTarget&&S.focusTarget!==S.boss&&!S.enemies.includes(S.focusTarget)){
    S.focusTarget=null;S.focusBossPart=null;S.focusTimer=0;S.p2CapitalFocus=null;aaa4Ensure().lostLocks++;
  }
};

const __aaa4AcceptEvent=acceptLiveEvent;
acceptLiveEvent=function(){const ok=__aaa4AcceptEvent.apply(this,arguments);if(ok){aaa4Ensure().eventAccepts++;aaa4Haptic(10);}return ok;};

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.aaa4State=()=>S?.aaa?.v106||null;
  window.__STARWARD__.aaa4InputClaimsTarget=aaa4InputClaimsTarget;
  window.__STARWARD__.aaa4ExposeCapitalSystem=aaa4ExposeCapitalSystem;
}
// ---- end V10.6 polish ----
`;

  function apply(source){
    let transformed=base.apply(source);
    const eventHook='if(S.liveEvent)acceptLiveEvent();';
    if(!transformed.includes(eventHook))throw new Error('Starward V10.6 live-event input hook missing');
    transformed=transformed.replace(eventHook,'if(S.liveEvent&&!aaa4InputClaimsTarget(x,y))acceptLiveEvent();');
    const autoBreak="for(const [id,meta] of Object.entries(P2_SYSTEM_META))if(e.p2Systems[id].alive&&ratio<=meta.threshold)p2BreakSystem(e,id,'hull');";
    if(!transformed.includes(autoBreak))throw new Error('Starward V10.6 capital exposure hook missing');
    transformed=transformed.replace(autoBreak,"for(const [id,meta] of Object.entries(P2_SYSTEM_META)){const sys=e.p2Systems[id];if(sys.alive&&ratio<=meta.threshold)aaa4ExposeCapitalSystem(e,id,sys);}");
    transformed=transformed.replace(/TAP TO ACCEPT ·/g,'TAP EMPTY SPACE ·');
    transformed=transformed.replace(/sfx\('focus'\);/g,"sfx('focus');aaa4Haptic(12);");
    const close=transformed.lastIndexOf('})();');
    if(close<0)throw new Error('Starward V10.6 runtime closure not found');
    return transformed.slice(0,close)+POLISH4+'\n'+transformed.slice(close);
  }
  return {apply};
});

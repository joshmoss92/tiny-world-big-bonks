(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v10-polish4.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V10.6 transform missing');

  const POLISH5=String.raw`

// ---- Starward Run V10.7 tactical decision clarity ----
const AAA5_ROLE_DETAIL={
  HEALER:'Repairs damaged hostiles nearby',SNIPER:'High-damage precision fire',CARRIER:'Launches interceptor waves',BOMBER:'Heavy multi-shot pressure',GUARD:'Protects nearby hostiles',SPLITTER:'Creates interceptors when destroyed',COMMAND:'Buffs and repairs nearby hostiles',SHIELDED:'Extra defensive layer',BERSERK:'Escalating attack pressure',VAMPIRE:'Recovers through combat',ARMORED:'Reduces incoming damage',CLOAKED:'Harder to track',PHASE:'Intermittent damage resistance',SIEGE:'Heavy cannon pressure',BULWARK:'Projects a defensive guard aura'
};
const AAA5_SYSTEM_DETAIL={
  shield:'Protects the warship and nearby escorts',hangar:'Launches interceptor reinforcements',cannon:'Fires the warship heavy battery'
};
const AAA5_BOSS_DETAIL={
  WEAPONS:'Destroy to reduce attack volume',SHIELD:'Destroy to expose the boss core',ENGINES:'Destroy to slow boss movement',REACTOR:'Destroy to trigger continuous hull damage'
};

function aaa5Ensure(){
  aaaEnsureState();
  if(!S.aaa.v107)S.aaa.v107={expiredLocks:0,bossSystemsBroken:0,detailDraws:0,guideFrames:0,resultsAdded:false};
  return S.aaa.v107;
}

function aaa5FocusDetail(){
  if(!S||S.focusTimer<=0||!S.focusTarget)return '';
  if(S.p2CapitalFocus&&S.p2CapitalFocus.e===S.focusTarget){
    const id=S.p2CapitalFocus.id,sys=S.focusTarget.p2Systems?.[id];
    return (AAA5_SYSTEM_DETAIL[id]||'Disable this subsystem')+(sys?.exposed?' · EXPOSED':'')+' · body damage reduced while system locked';
  }
  if(S.focusBossPart){
    const role=S.focusBossPart.aaaRole||'';
    return AAA5_BOSS_DETAIL[role]||'Destroy this boss subsystem to weaken the encounter';
  }
  const role=aaaRole(S.focusTarget);
  return AAA5_ROLE_DETAIL[role.label]||'Priority target · focused weapons gain specialized bonuses';
}

function aaa5DrawDecisionStrip(){
  if(!S||S.phase!=='running')return;
  const a=aaa5Ensure();
  if(S.focusTimer>0&&S.focusTarget){
    const text=aaa5FocusDetail();if(text){a.detailDraws++;ctx.save();ctx.globalAlpha=.90;ctx.fillStyle='#020713dd';ctx.fillRect(14,100,340,19);ctx.strokeStyle='#39506e';ctx.strokeRect(14,100,340,19);ctx.fillStyle='#dceaff';ctx.font='8px monospace';ctx.fillText(text.slice(0,72),22,113);ctx.restore();}
  }
  if(S.time>2&&S.time<12){
    a.guideFrames++;ctx.save();ctx.globalAlpha=clamp((12-S.time)/3,0,.72);ctx.fillStyle='#050a17d9';ctx.fillRect(W/2-220,H-42,440,24);ctx.strokeStyle='#31516c';ctx.strokeRect(W/2-220,H-42,440,24);ctx.textAlign='center';ctx.fillStyle='#dceaff';ctx.font='bold 9px monospace';ctx.fillText('SHIP = STAR LASER   ·   TARGET = FOCUS   ·   EMPTY SPACE = EVENT',W/2,H-27);ctx.restore();
  }
}

function aaa5DrawBossSystems(){
  const b=S?.boss;if(!b||S.focusTarget!==b||S.focusTimer<=0||!Array.isArray(b.parts))return;
  ctx.save();ctx.textAlign='center';ctx.font='bold 8px monospace';
  for(const p of b.parts){if(p.hp<=0)continue;const x=b.x+(p.ox||0),y=b.y+(p.oy||0),role=p.aaaRole||'SYSTEM';ctx.fillStyle='#050914dd';ctx.fillRect(x-30,y-28,60,13);ctx.fillStyle='#ffe58c';ctx.fillText(role,x,y-18);}
  ctx.restore();
}

const __aaa5Draw=draw;
draw=function(){__aaa5Draw();aaa5DrawDecisionStrip();aaa5DrawBossSystems();};

if(typeof updateBoss==='function'){
  const __aaa5UpdateBoss=updateBoss;
  updateBoss=function(dt){
    const b=S?.boss,before=b&&Array.isArray(b.parts)?b.parts.map(p=>p.hp>0):null;
    const r=__aaa5UpdateBoss(dt);
    if(b&&before&&S?.boss===b){
      for(let i=0;i<b.parts.length;i++)if(before[i]&&b.parts[i].hp<=0&&!b.parts[i].aaa5Announced){
        const p=b.parts[i],role=p.aaaRole||'SYSTEM';p.aaa5Announced=true;aaa5Ensure().bossSystemsBroken++;burst(b.x+(p.ox||0),b.y+(p.oy||0),'#ffe58c',30,320,4);popup(role+' DISABLED',b.x+(p.ox||0),b.y+(p.oy||0)-26,'#ffe58c',1.1);aaa4Haptic([8,18,16]);
      }
    }
    return r;
  };
}

const __aaa5Update=update;
update=function(dt){
  const prev=S?.focusTarget||null,prevTimer=S?.focusTimer||0;
  __aaa5Update(dt);
  if(!S)return;
  const stillAlive=prev&&(prev===S.boss||S.enemies.includes(prev))&&prev.hp>0;
  if(prev&&prevTimer>0&&S.focusTimer<=0&&stillAlive){aaa5Ensure().expiredLocks++;popup('LOCK ENDED',prev.x,prev.y-(prev.size||22)-18,'#9fb4cf',.8);if(S.aaa?.v106){S.aaa.v106.recommendedTarget=null;S.aaa.v106.recommendedUntil=S.time+.65;}}
};

function aaa5AppendResults(){
  if(!S||typeof overlayText==='undefined')return;const a=aaa5Ensure();if(a.resultsAdded)return;a.resultsAdded=true;
  overlayText.innerHTML+='<div class="tactical-results"><strong>SYSTEM WARFARE</strong><span>Boss systems disabled '+a.bossSystemsBroken+'</span><span>Expired locks '+a.expiredLocks+'</span></div>';
}
if(typeof showResults==='function'){
  const __aaa5ShowResults=showResults;showResults=function(){const r=__aaa5ShowResults.apply(this,arguments);aaa5AppendResults();return r;};
}

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.aaa5State=()=>S?.aaa?.v107||null;
  window.__STARWARD__.aaa5FocusDetail=aaa5FocusDetail;
}
// ---- end V10.7 tactical decision clarity ----
`;

  function apply(source){
    const transformed=base.apply(source);
    for(const hook of ['aaa4InputClaimsTarget','aaa3DrawTargetDossier','aaaBossSystemRoles'])if(!transformed.includes(hook))throw new Error('Starward V10.7 hook missing: '+hook);
    const close=transformed.lastIndexOf('})();');
    if(close<0)throw new Error('Starward V10.7 runtime closure not found');
    return transformed.slice(0,close)+POLISH5+'\n'+transformed.slice(close);
  }
  return {apply};
});

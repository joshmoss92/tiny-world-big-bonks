(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v10-polish6.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V10.8 transform missing');

  const POLISH7=String.raw`

// ---- Starward Run V10.9 focus-break combat layer ----
const AAA7_STAGGER={normal:1.55,elite:1.90,capital:2.35,boss:2.55};

function aaa7Ensure(){
  aaaEnsureState();
  if(!S.aaa.v109)S.aaa.v109={focusTarget:null,focusAccum:0,lockStarts:0,staggers:0,bossStaggers:0,formationBreaks:0,cleanBreaks:0,smartHandoffs:0,warningFrames:0,breakFrames:0};
  return S.aaa.v109;
}

function aaa7Threshold(t){
  if(!t)return AAA7_STAGGER.normal;
  if(t===S.boss)return AAA7_STAGGER.boss;
  if(t.aaaCapital)return AAA7_STAGGER.capital;
  if(t.elite||aaaRole(t).priority>=4)return AAA7_STAGGER.elite;
  return AAA7_STAGGER.normal;
}

function aaa7AcquisitionVolley(t){
  if(!S||!t)return;
  const timings={pulse:.05,scatter:.09,missile:.05,rail:.10,flak:.12,arc:.08,drone:.04,beam:.03,nova:.16};
  for(const [k,limit] of Object.entries(timings)){
    if(!(S.weapons?.[k]>0))continue;
    const old=Number.isFinite(S.cooldowns?.[k])?S.cooldowns[k]:limit;
    S.cooldowns[k]=Math.min(old,limit);
  }
}

function aaa7ApplyStagger(t){
  if(!S||!t||t.hp<=0)return false;
  const a=aaa7Ensure();a.staggers++;t.aaaStagger=1.25;t.aaaSuppressedUntil=S.time+1.35;t.aaaNextStaggerAt=S.time+1.95;
  if(t===S.boss){
    a.bossStaggers++;t.aaaStagger=1.35;
    if(S.focusBossPart&&S.focusBossPart.hp>0){S.focusBossPart.hp=Math.max(0,S.focusBossPart.hp-S.focusBossPart.maxHp*.055);}
    popup('SYSTEM STAGGER',t.x,t.y-t.size-30,'#ffe36f',1.0);
  }else{
    t.fire=(t.fire||0)+1.15;
    if(t.aaaCapital){
      t.aaaLaunchAt=Math.max(t.aaaLaunchAt||0,S.time+2.2);
      const f=S.p2CapitalFocus&&S.p2CapitalFocus.e===t?S.p2CapitalFocus:null;
      if(f&&t.p2Systems?.[f.id]?.alive){const sys=t.p2Systems[f.id];sys.hp=Math.max(1,sys.hp-sys.maxHp*.07);}
    }
    popup(t.aaaCapital?'WARSHIP STAGGER':'TARGET STAGGER',t.x,t.y-t.size-26,'#ffe36f',.95);
  }
  S.screenShake=Math.max(S.screenShake,3.5);aaa4Haptic([7,16,9]);
  return true;
}

const __aaa7PriorityTarget=aaaPriorityTarget;
aaaPriorityTarget=function(){
  if(!S)return __aaa7PriorityTarget();
  let best=null,bestScore=-1e9;
  for(const e of S.enemies){
    if(!e||e.hp<=0)continue;
    const role=aaaRole(e),distance=clamp((e.x-S.ship.x)/Math.max(1,W-S.ship.x),0,1),hpRatio=clamp(e.hp/Math.max(1,e.maxHp),0,1);
    const support=(e.type==='healer'||e.affix?.id==='commander')?42:0;
    const imminent=(Number.isFinite(e.fire)&&e.fire<.80)?28:0;
    const exposed=e.aaaCapital&&Object.values(e.p2Systems||{}).some(s=>s.alive&&s.exposed)?20:0;
    const score=role.priority*100+(e.elite?24:0)+(e.aaaCapital?65:0)+(1-distance)*34+(1-hpRatio)*15+support+imminent+exposed;
    if(score>bestScore){bestScore=score;best=e;}
  }
  return best||__aaa7PriorityTarget();
};

const __aaa7EnemyFire=enemyFire;
enemyFire=function(e){if(e?.aaaStagger>0||e?.aaaSuppressedUntil>S.time)return;return __aaa7EnemyFire(e);};

if(typeof updateBoss==='function'){
  const __aaa7UpdateBoss=updateBoss;
  updateBoss=function(dt){
    const b=S?.boss,before=S?.bullets?.length||0,staggered=!!(b&&b.aaaStagger>0);
    if(b?.aaaStagger>0)b.aaaStagger=Math.max(0,b.aaaStagger-dt);
    const r=__aaa7UpdateBoss(dt);
    if(staggered&&b&&S?.boss===b&&S.bullets.length>before){
      const old=S.bullets.slice(0,before),fresh=S.bullets.slice(before).filter((_,i)=>i%2===0);S.bullets=old.concat(fresh);
    }
    return r;
  };
}

const __aaa7KillEnemy=killEnemy;
killEnemy=function(e){
  const focused=!!(S&&S.focusTarget===e&&S.focusTimer>0&&!e.byLaser),remaining=S?.focusTimer||0,role=aaaRole(e),anchor=!!e?.aaaFormationAnchor;
  const nearby=anchor&&S?S.enemies.filter(o=>o&&o!==e&&o.hp>0&&(o.aaaFormation||o.aaaEscort)&&dist(o.x,o.y,e.x,e.y)<260):[];
  const x=e?.x||0,y=e?.y||0;
  const r=__aaa7KillEnemy(e);
  if(!S)return r;
  const a=aaa7Ensure();
  if(anchor&&nearby.length){
    a.formationBreaks++;
    for(const o of nearby){o.hp=Math.max(1,o.hp-o.maxHp*.10);o.fire=(o.fire||0)+1.25;o.aaaGuarded=false;o.aaaSuppressedUntil=S.time+.9;}
    burst(x,y,'#8ff7ff',34,300,4);popup('FORMATION BROKEN',x,y-35,'#8ff7ff',1.05);
  }
  if(focused&&role.priority>=3&&remaining>=3){a.cleanBreaks++;addLaserCharge(.75);popup('CLEAN BREAK +CHARGE',x,y-48,'#ffe36f',.9);}
  return r;
};

const __aaa7TuneFocusedShot=aaa3TuneFocusedShot;
aaa3TuneFocusedShot=function(sh,target){
  __aaa7TuneFocusedShot(sh,target);
  if(!sh||!target)return;
  if(target.aaaStagger>0){sh.damage*=1.16;if(sh.kind==='rail')sh.pierce=(sh.pierce||0)+1;if(sh.kind==='missile'||sh.kind==='nova')sh.splash=(sh.splash||0)+.6;}
};

function aaa7DrawBreakMeter(){
  if(!S||S.phase!=='running'||!S.focusTarget||S.focusTimer<=0)return;
  const t=S.focusTarget,a=aaa7Ensure(),threshold=aaa7Threshold(t),ready=S.time>=(t.aaaNextStaggerAt||0),ratio=ready?clamp(a.focusAccum/threshold,0,1):0;
  const x=clamp(t.x,58,W-58),y=clamp(t.y+(t.size||28)+24,28,H-22),w=t===S.boss?92:t.aaaCapital?76:58;
  a.breakFrames++;ctx.save();ctx.globalAlpha=.88;ctx.fillStyle='#020713cc';ctx.fillRect(x-w/2,y,w,6);ctx.fillStyle=ready?'#ffe36f':'#526074';ctx.fillRect(x-w/2,y,w*ratio,6);ctx.strokeStyle='#ffffff55';ctx.strokeRect(x-w/2,y,w,6);ctx.textAlign='center';ctx.font='bold 7px monospace';ctx.fillStyle=ready?'#ffe36f':'#8c9aad';ctx.fillText(ready?'FOCUS BREAK':'RECOVERING',x,y+14);ctx.restore();
}

function aaa7DrawUrgency(e){
  if(!S||!e||e.hp<=0||S.focusTarget===e)return;
  const role=aaaRole(e),imminent=role.priority>=3&&Number.isFinite(e.fire)&&e.fire<.72&&e.x<W-30&&e.x>S.ship.x+40;
  if(!imminent)return;aaa7Ensure().warningFrames++;
  ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=.60+.30*Math.sin(S.time*12);ctx.strokeStyle='#ff6b79';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.size+13,0,TWO_PI);ctx.stroke();ctx.fillStyle='#ff8b94';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('FIRING',0,-e.size-22);ctx.restore();
}

const __aaa7DrawEnemy=drawEnemy;
drawEnemy=function(e){__aaa7DrawEnemy(e);aaa7DrawUrgency(e);};
const __aaa7Draw=draw;
draw=function(){__aaa7Draw();aaa7DrawBreakMeter();};

const __aaa7Update=update;
update=function(dt){
  __aaa7Update(dt);
  if(!S)return;
  const a=aaa7Ensure();
  for(const e of S.enemies){if(e?.aaaStagger>0){e.aaaStagger=Math.max(0,e.aaaStagger-dt);e.x+=ENEMIES[e.type].speed*S.combatSpeed*dt*.48;}}
  const t=S.focusTarget&&S.focusTimer>0&&S.focusTarget.hp>0?S.focusTarget:null;
  if(t){
    if(a.focusTarget!==t){if(a.focusTarget)a.smartHandoffs++;a.focusTarget=t;a.focusAccum=0;a.lockStarts++;aaa7AcquisitionVolley(t);}
    if(S.time>=(t.aaaNextStaggerAt||0)){a.focusAccum+=dt;const threshold=aaa7Threshold(t);if(a.focusAccum>=threshold){aaa7ApplyStagger(t);a.focusAccum=0;}}
  }else{a.focusTarget=null;a.focusAccum=0;}
};

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.aaa7State=()=>S?.aaa?.v109||null;
  window.__STARWARD__.aaa7PriorityTarget=aaaPriorityTarget;
  window.__STARWARD__.aaa7ApplyStagger=aaa7ApplyStagger;
}
// ---- end V10.9 focus-break layer ----
`;

  function apply(source){
    let transformed=base.apply(source);
    for(const hook of ['aaa3TuneFocusedShot','aaa4Haptic','aaaPriorityTarget','aaaFormationAnchor'])if(!transformed.includes(hook))throw new Error('Starward V10.9 hook missing: '+hook);
    if(!transformed.includes("if(e.type==='healer'){"))throw new Error('Starward V10.9 healer suppression hook missing');
    transformed=transformed.replace("if(e.type==='healer'){","if(e.type==='healer'&&!(e.aaaSuppressedUntil>S.time)){" );
    if(!transformed.includes("if(c.affix?.id==='commander'){"))throw new Error('Starward V10.9 commander suppression hook missing');
    transformed=transformed.replace("if(c.affix?.id==='commander'){","if(c.affix?.id==='commander'&&!(c.aaaSuppressedUntil>S.time)){" );
    const close=transformed.lastIndexOf('})();');
    if(close<0)throw new Error('Starward V10.9 runtime closure not found');
    return transformed.slice(0,close)+POLISH7+'\n'+transformed.slice(close);
  }
  return {apply};
});

(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v17-flow-choice.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V17 transform missing');

  const V18_BLOCK=String.raw`

// ---- Starward Run V18 expressive-control layer ----
const V18_DASH_GESTURE=92;
const V18_DASH_COOLDOWN=3.8;
const V18_PROTOCOL_MIN=68;
const V18_PROTOCOL_MAX=92;

function v18Ensure(){
  const v=v12Ensure();if(!v||!S)return null;
  if(!S.v18){
    S.v18={
      holdY:S.ship?.y||H/2,steerY:S.ship?.y||H/2,lastAimY:null,
      dashCooldown:0,dashTime:0,dashTarget:S.ship?.y||H/2,dashes:0,perfectEvades:0,
      grazes:0,grazeFlash:0,precision:0,bestPrecision:0,precisionBursts:0,burstWindow:0,
      protocol:'ace',protocolForks:0,protocolChoices:0,protocolSerial:0,nextProtocolAt:Math.max(48,S.time+48),
      wardenBank:0,lastDurability:(S.hull||S.hp||0)+(S.shield||0),tutorial:0,resultsAdded:false
    };
    if(S.v17)S.v17.tutorial=3;
  }
  return S.v18;
}

function v18ProtocolName(){const m=v18Ensure();return m?.protocol==='gunner'?'GUNNER':m?.protocol==='warden'?'WARDEN':'ACE';}
function v18FlowGain(x,label){if(typeof v17AddFlow==='function')return v17AddFlow(x,label||'');return 0;}

const V18_PROTOCOLS=[
  {id:'aceProtocol',name:'ACE PROTOCOL',icon:'↕',color:'#8ff7ff',v18Protocol:true,apply:()=>{const m=v18Ensure();m.protocol='ace';}},
  {id:'gunnerProtocol',name:'GUNNER PROTOCOL',icon:'⌖',color:'#ffbf72',v18Protocol:true,apply:()=>{const m=v18Ensure();m.protocol='gunner';}},
  {id:'wardenProtocol',name:'WARDEN PROTOCOL',icon:'⬡',color:'#9abaff',v18Protocol:true,apply:()=>{const m=v18Ensure();m.protocol='warden';}}
];
for(const p of V18_PROTOCOLS)if(!V12_POWER_TYPES.some(x=>x.id===p.id))V12_POWER_TYPES.push(p);

const __v18SpawnPower=v12SpawnPowerup;
v12SpawnPowerup=function(type=null,y=null,x=null){
  if(type==null){const pool=V12_POWER_TYPES.filter(p=>!p.v18Protocol);const def=pick(pool);return __v18SpawnPower(def?.id||null,y,x);}
  return __v18SpawnPower(type,y,x);
};

function v18ActiveProtocolFork(){const v=v12Ensure();return !!v?.powerups?.some(p=>p&&!p.dead&&p.v18ProtocolGroup);}
function v18SpawnProtocolFork(){
  const m=v18Ensure(),v=v12Ensure();if(!m||!v||S.phase!=='running'||S.boss||S.liveEvent||v17ActiveFork?.()||v18ActiveProtocolFork())return null;
  const serial='protocol-'+(++m.protocolSerial),ys=[H*.28,H*.50,H*.72],defs=V18_PROTOCOLS,spawned=[];
  for(let i=0;i<defs.length;i++){
    const p=v12SpawnPowerup(defs[i].id,ys[i],W+46+i*14);
    if(p){p.v18ProtocolGroup=serial;p.v18ProtocolLabel=defs[i].name;p.v18ProtocolChoice=true;p.size=Math.max(19,p.size||0);spawned.push(p);}
  }
  if(spawned.length===3){m.protocolForks++;banner('FLIGHT PROTOCOL','#d7e8ff','Shoot one · ACE mobility, GUNNER precision, or WARDEN defense');return spawned;}
  for(const p of spawned)p.dead=true;return null;
}

const __v18ApplyPower=v12ApplyPower;
v12ApplyPower=function(p){
  const group=p?.v18ProtocolGroup,label=p?.v18ProtocolLabel||'',ok=__v18ApplyPower(p);if(!ok||!group)return ok;
  const m=v18Ensure(),v=v12Ensure();for(const sibling of v.powerups)if(sibling!==p&&sibling.v18ProtocolGroup===group)sibling.dead=true;
  m.protocolChoices++;v18FlowGain(14,'protocol');addLaserCharge(.65);popup(label,p.x,p.y-46,'#d7e8ff',1.05);if(typeof aaa4Haptic==='function')aaa4Haptic([8,16,8]);return ok;
};

function v18TriggerDash(dir){
  const m=v18Ensure(),v=v12Ensure();if(!m||m.dashCooldown>0||S.phase!=='running')return false;
  dir=dir<0?-1:1;m.dashCooldown=m.protocol==='ace'?2.9:V18_DASH_COOLDOWN;m.dashTime=.28;m.dashTarget=clamp(S.ship.y+dir*(m.protocol==='ace'?158:132),58,H-58);m.holdY=m.dashTarget;m.dashes++;
  let danger=0;for(const b of S.bullets||[]){if(!b||b.life<=0)continue;if(dist(S.ship.x,S.ship.y,b.x,b.y)<92)danger++;}
  S.ship.inv=Math.max(S.ship.inv||0,.38);S.screenShake=Math.max(S.screenShake,2.8);burst(S.ship.x,S.ship.y,'#8ff7ff',14,230,2);
  if(danger){m.perfectEvades++;v18FlowGain(12+(m.protocol==='ace'?4:0),'evade');addLaserCharge(.75);popup('PERFECT EVADE',S.ship.x+46,S.ship.y-28,'#8ff7ff',.82);}
  else v18FlowGain(3,'dash');
  if(typeof aaa4Haptic==='function')aaa4Haptic([5,9,5]);return true;
}

const __v18SetAim=v12SetAim;
v12SetAim=function(x,y,active=true){
  const m=v18Ensure(),v=v12Ensure(),was=!!v?.aim?.active,prev=m?.lastAimY;
  const ok=__v18SetAim(x,y,active);if(!m||!ok)return ok;
  m.steerY=clamp(y,58,H-58);
  if(active&&was&&prev!=null&&Math.abs(y-prev)>=V18_DASH_GESTURE&&m.dashCooldown<=0)v18TriggerDash(y-prev);
  m.lastAimY=y;return ok;
};

const __v18ReleaseAim=v12ReleaseAim;
v12ReleaseAim=function(){
  const m=v18Ensure(),v=v12Ensure(),was=!!v?.aim?.active,charge=m?.precision||0;
  if(m&&S?.ship)m.holdY=S.ship.y;
  __v18ReleaseAim();
  if(m&&was&&charge>=.72){m.precisionBursts++;m.burstWindow=m.protocol==='gunner'?1.0:.68;v18FlowGain(10,'burst');addLaserCharge(.42);popup('LOCK BURST',S.ship.x+70,S.ship.y-34,'#ffe071',.82);S.screenShake=Math.max(S.screenShake,2.6);if(typeof aaa4Haptic==='function')aaa4Haptic([6,12,5]);}
  if(m)m.precision=0;
};

updateAutopilot=function(dt){
  const m=v18Ensure(),v=v12Ensure();if(!m||!v||!S?.ship)return;
  const ship=S.ship;ship.inv=Math.max(0,(ship.inv||0)-dt);m.dashCooldown=Math.max(0,m.dashCooldown-dt);m.dashTime=Math.max(0,m.dashTime-dt);
  let target=v.aim.active?clamp(v.aim.rawY,58,H-58):m.holdY;
  if(m.dashTime>0){target=m.dashTarget;ship.inv=Math.max(ship.inv,.10);}
  if(v.aim.active)m.holdY=target;
  let response=7.5+Math.max(0,(S.stats?.speed||1.2)-1)*5.5+(S.stats?.dodge||0)*4.2;
  if(m.protocol==='ace')response*=1.38;else if(m.protocol==='gunner')response*=.90;
  const before=ship.y;ship.targetY=target;ship.y+=clamp(target-ship.y,-250*dt,250*dt)*Math.min(1,dt*response*2.2);
  if(Math.abs(target-ship.y)>2)ship.y+=(target-ship.y)*Math.min(.42,dt*response);
  ship.y=clamp(ship.y,52,H-52);ship.tilt=clamp((ship.y-before)*.18,-.42,.42);
};

const __v18FindTarget=v12FindEnemyAimTarget;
v12FindEnemyAimTarget=function(){
  const v=v12Ensure(),m=v18Ensure();if(!v?.aim?.active)return null;
  const a=v.aim.angle,assist=(m?.protocol==='gunner' ? .155 : .125)+(v.buffs?.magnet>0 ? .035 : 0),px=v.aim.rawX,py=v.aim.rawY;let best=null,bestScore=-1e9;
  const score=(t,bonus)=>{if(!t||t.hp<=0)return;const dx=t.x-S.ship.x,dy=t.y-S.ship.y;if(dx<22)return;const ang=Math.atan2(dy,Math.max(18,dx)),diff=v12AngleDiff(ang,a);if(diff>assist)return;const pointer=dist(px,py,t.x,t.y),priority=v12RolePriority(t);const s=(bonus||0)+priority*46+(t.elite?18:0)+(t.aaaCapital?34:0)-diff*690-pointer*.055;if(s>bestScore){bestScore=s;best=t;}};
  if(S.boss)score(S.boss,82);for(const e of S.enemies)score(e,0);return best||__v18FindTarget();
};

function v18PrecisionUpdate(dt){
  const m=v18Ensure(),v=v12Ensure();if(!m||!v)return;
  m.burstWindow=Math.max(0,m.burstWindow-dt);m.grazeFlash=Math.max(0,m.grazeFlash-dt);
  if(v.aim.active){
    const t=v12FindEnemyAimTarget();
    if(t){const ang=Math.atan2(t.y-S.ship.y,Math.max(18,t.x-S.ship.x)),diff=v12AngleDiff(ang,v.aim.angle),rate=m.protocol==='gunner'?1.55:1.05;if(diff<.040)m.precision=clamp(m.precision+dt*rate,0,1);else m.precision=Math.max(0,m.precision-dt*.8);}else m.precision=Math.max(0,m.precision-dt*.6);
  }else m.precision=Math.max(0,m.precision-dt*1.4);
  m.bestPrecision=Math.max(m.bestPrecision,m.precision);
}

function v18GrazeUpdate(){
  const m=v18Ensure(),v=v12Ensure();if(!m||!v?.aim?.active||S.phase!=='running')return;
  const minR=20,maxR=m.protocol==='ace'?54:47;
  for(const b of S.bullets||[]){if(!b||b.life<=0||b.v18Grazed)continue;const d=dist(S.ship.x,S.ship.y,b.x,b.y);if(d>minR&&d<maxR){b.v18Grazed=true;m.grazes++;m.grazeFlash=.22;v18FlowGain(m.protocol==='ace'?3.6:2.4,'graze');addLaserCharge(m.protocol==='ace' ? .07 : .04);if(m.grazes%8===0)popup('GRAZE ×'+m.grazes,S.ship.x+42,S.ship.y+28,'#9ffcff',.65);}}
}

const __v18Shotdowns=v12ResolveShotdowns;
v12ResolveShotdowns=function(){
  const m=v18Ensure(),v=v12Ensure(),before=v?.shotdowns||0,r=__v18Shotdowns(),gain=(v?.shotdowns||0)-before;
  if(m&&gain>0&&m.protocol==='warden'){m.wardenBank+=gain;while(m.wardenBank>=6){m.wardenBank-=6;S.shield=Math.min(S.maxShield,S.shield+1);popup('WARDEN +SHIELD',S.ship.x+58,S.ship.y-34,'#9abaff',.72);}}
  return r;
};

const __v18Damage=damageMultiplier;
damageMultiplier=function(){let x=__v18Damage();const m=v18Ensure(),a=S?.v17;if(m?.protocol==='gunner')x*=1.10;if(m?.burstWindow>0)x*=1.24;if(a&&a.flowActive<=0&&a.flow>=60)x*=1.07;if(m?.protocol==='ace')x*=.97;return x;};
const __v18Rate=fireRateMultiplier;
fireRateMultiplier=function(){let x=__v18Rate();const m=v18Ensure(),a=S?.v17;if(m?.protocol==='gunner')x*=1.05;if(m?.burstWindow>0)x*=1.78;if(a&&a.flowActive<=0&&a.flow>=30)x*=1.04;if(a&&a.flowActive<=0&&a.flow>=60)x*=1.04;if(m?.protocol==='warden')x*=.96;return x;};

function v18DamageFeedback(){
  const m=v18Ensure();if(!m||!S)return;const d=(S.hull||S.hp||0)+(S.shield||0);
  if(d<m.lastDurability-.05&&S.v17){S.v17.flow=Math.max(0,S.v17.flow-26);S.v17.flowActive=Math.max(0,S.v17.flowActive-.8);m.precision=0;}
  m.lastDurability=d;
}

function v18Draw(){
  const m=v18Ensure(),v=v12Ensure();if(!m||!v||S.phase!=='running')return;ctx.save();
  const ship=S.ship,aim=v.aim;
  if(aim.active){ctx.globalAlpha=.20;ctx.strokeStyle='#8ff7ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(ship.x+18,ship.y);ctx.lineTo(aim.rawX,aim.rawY);ctx.stroke();ctx.globalAlpha=.45;ctx.beginPath();ctx.arc(aim.rawX,aim.rawY,11+Math.sin(S.time*8)*1.5,0,TWO_PI);ctx.stroke();}
  const px=26,py=H-34,pw=160;ctx.globalAlpha=.92;ctx.fillStyle='#020914cc';ctx.fillRect(px,py,pw,9);ctx.strokeStyle='#48607a';ctx.strokeRect(px,py,pw,9);ctx.fillStyle=m.precision>=.72?'#ffe071':'#8ff7ff';ctx.fillRect(px+2,py+2,(pw-4)*m.precision,5);ctx.fillStyle='#d7e8ff';ctx.font='bold 9px monospace';ctx.textAlign='left';ctx.fillText('LOCK '+Math.round(m.precision*100)+'%',px,py-5);
  const dashPct=1-clamp(m.dashCooldown/(m.protocol==='ace'?2.9:V18_DASH_COOLDOWN),0,1);ctx.fillStyle='#020914cc';ctx.fillRect(px+190,py,110,9);ctx.strokeStyle='#48607a';ctx.strokeRect(px+190,py,110,9);ctx.fillStyle='#9ffcff';ctx.fillRect(px+192,py+2,106*dashPct,5);ctx.fillStyle='#d7e8ff';ctx.fillText('DASH '+(m.dashCooldown<=0?'READY':m.dashCooldown.toFixed(1)+'s'),px+190,py-5);
  ctx.textAlign='right';ctx.fillStyle=m.protocol==='gunner'?'#ffbf72':m.protocol==='warden'?'#9abaff':'#8ff7ff';ctx.fillText('PROTOCOL · '+v18ProtocolName(),W-26,py+8);
  ctx.restore();
}
const __v18Draw=draw;draw=function(){__v18Draw();v18Draw();};

const __v18Update=update;
update=function(dt){const r=__v18Update(dt),m=v18Ensure();if(!m||S.phase!=='running')return r;
  v18PrecisionUpdate(dt);v18GrazeUpdate();v18DamageFeedback();
  if(m.tutorial===0&&S.time>3){m.tutorial=1;banner('PILOT + GUNNER','#8ff7ff','Drag vertically to fly · your arsenal follows your aim');}
  if(m.tutorial===1&&S.time>9){m.tutorial=2;banner('PHASE DASH','#9ffcff','Flick up or down to dash through danger');}
  if(m.tutorial===2&&S.time>15){m.tutorial=3;banner('GRAZE + LOCK','#ffe071','Skim enemy fire for Flow · steady aim then release for a Lock Burst');}
  if(S.time>=m.nextProtocolAt){if(v18SpawnProtocolFork())m.nextProtocolAt=S.time+rand(V18_PROTOCOL_MIN,V18_PROTOCOL_MAX);else m.nextProtocolAt=S.time+7;}
  return r;
};

function v18AppendResults(){if(!S||typeof overlayText==='undefined')return;const m=v18Ensure();if(!m||m.resultsAdded||/PILOTING MASTERY/.test(overlayText.innerHTML||''))return;m.resultsAdded=true;
  overlayText.innerHTML+='<div class="tactical-results"><strong>PILOTING MASTERY</strong><span>Phase dashes <b>'+m.dashes+'</b></span><span>Perfect evades <b>'+m.perfectEvades+'</b></span><span>Projectile grazes <b>'+m.grazes+'</b></span><span>Lock Bursts <b>'+m.precisionBursts+'</b></span><span>Flight protocols chosen <b>'+m.protocolChoices+'/'+m.protocolForks+'</b></span></div>';
}

if(typeof window!=='undefined'&&window.__STARWARD__){window.__STARWARD__.v18State=()=>S?.v18||null;window.__STARWARD__.v18SpawnProtocolFork=v18SpawnProtocolFork;window.__STARWARD__.v18Dash=v18TriggerDash;window.__STARWARD__.v12SetAim=v12SetAim;window.__STARWARD__.v12ReleaseAim=v12ReleaseAim;}
// ---- end V18 expressive-control layer ----
`;

  function apply(source){
    let transformed=base.apply(source);
    for(const hook of ['v17Ensure','v17SpawnPowerFork','v12SetAim','v12ReleaseAim','updateAutopilot','v12FindEnemyAimTarget'])if(!transformed.includes(hook))throw new Error('Starward V18 hook missing: '+hook);
    const resultHook="aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();v15AppendResults();v17AppendResults();choiceGrid.classList.add('hidden');";
    if(!transformed.includes(resultHook))throw new Error('Starward V18 results hook missing');
    transformed=transformed.replace(resultHook,"aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();v15AppendResults();v17AppendResults();v18AppendResults();choiceGrid.classList.add('hidden');");
    const close=transformed.lastIndexOf('})();');if(close<0)throw new Error('Starward V18 runtime closure not found');
    return transformed.slice(0,close)+V18_BLOCK+'\n'+transformed.slice(close);
  }
  return {apply};
});
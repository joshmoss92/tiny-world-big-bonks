(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v16-power-state.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V16 transform missing');

  const V17_BLOCK=String.raw`

// ---- Starward Run V17 research-informed engagement layer ----
const V17_FORK_MIN=34;
const V17_FORK_MAX=46;
const V17_RESUPPLY_MIN=64;
const V17_RESUPPLY_MAX=80;
const V17_FLOW_TRIGGER=100;
const V17_FLOW_DURATION=6.5;
const V17_POWER_POOLS={
  OFFENSE:['trident','rapid','overcharge','critical','barrage','ricochet'],
  DEFENSE:['aegis','shield','repair','timeshift'],
  UTILITY:['seeker','magnet','laser','xp','prism']
};

function v17Ensure(){
  const v=v12Ensure();if(!v||!S)return null;
  if(!S.v17)S.v17={
    flow:0,flowActive:0,bestFlow:0,flowBursts:0,
    forks:0,forkChoices:0,forkMisses:0,forkSerial:0,
    nextForkAt:Math.max(19,S.time+19),nextResupplyAt:Math.max(60,S.time+60),
    tutorial:0,lastSkillAt:-99,resultsAdded:false
  };
  return S.v17;
}

function v17AddFlow(amount,label=''){const a=v17Ensure();if(!a||S.phase!=='running')return 0;
  a.lastSkillAt=S.time;
  if(a.flowActive>0){a.flowActive=Math.min(8,a.flowActive+Math.max(0,amount)*.012);return a.flow;}
  a.flow=clamp(a.flow+Math.max(0,amount),0,V17_FLOW_TRIGGER);a.bestFlow=Math.max(a.bestFlow,a.flow);
  if(a.flow>=V17_FLOW_TRIGGER){a.flow=V17_FLOW_TRIGGER;a.flowActive=V17_FLOW_DURATION;a.flowBursts++;addLaserCharge(1.25);S.screenShake=Math.max(S.screenShake,4);banner('GUNNERY FLOW','#8ff7ff','Precision rhythm locked · fire rate and damage boosted');if(typeof aaa4Haptic==='function')aaa4Haptic([8,18,8]);}
  else if(label&&a.flow>=75&&a.flow-amount<75)popup('FLOW 75%',S.ship.x+100,S.ship.y-42,'#8ff7ff',.72);
  return a.flow;
}

function v17PickPower(pool,used){const ids=V17_POWER_POOLS[pool]||[];const candidates=ids.filter(id=>!used.has(id)&&V12_POWER_TYPES.some(p=>p.id===id));return candidates.length?pick(candidates):null;}
function v17ActiveFork(){const v=v12Ensure();return v?.powerups?.some(p=>p&&!p.dead&&p.v17Fork);}
function v17SpawnPowerFork(){
  const a=v17Ensure(),v=v12Ensure();if(!a||!v||S.phase!=='running'||v17ActiveFork())return null;
  const used=new Set(),serial='fork-'+(++a.forkSerial),ys=[H*.28,H*.50,H*.72],labels=['OFFENSE','DEFENSE','UTILITY'],defs=[];
  for(const label of labels){const id=v17PickPower(label,used);if(id){used.add(id);defs.push({label,id});}}
  if(defs.length<3)return null;
  const spawned=[];
  for(let i=0;i<defs.length;i++){const p=v12SpawnPowerup(defs[i].id,ys[i],W+42+i*12);if(p){p.v17Fork=serial;p.v17Label=defs[i].label;p.v17Born=S.time;p.v17Decision=true;spawned.push(p);}}
  if(spawned.length===3){a.forks++;banner('POWER FORK','#ffe071','Shoot ONE core · offense, defense or utility');return spawned;}
  for(const p of spawned)p.dead=true;return null;
}

const __v17ApplyPower=v12ApplyPower;
v12ApplyPower=function(p){const group=p?.v17Fork,label=p?.v17Label||'',ok=__v17ApplyPower(p);if(!ok||!group)return ok;
  const a=v17Ensure(),v=v12Ensure();for(const sibling of v.powerups)if(sibling!==p&&sibling.v17Fork===group)sibling.dead=true;
  a.forkChoices++;v17AddFlow(12,'choice');addLaserCharge(.5);popup(label+' LOCKED',p.x,p.y-44,'#ffe071',.9);return ok;
};

const __v17Kill=killEnemy;
killEnemy=function(e){const v=v12Ensure(),before=v?.aimedKills||0,r=__v17Kill(e);if(v&&v.aimedKills>before){const gain=e?.aaaCapital?14:e?.elite?9:4;v17AddFlow(gain,'kill');}return r;};

const __v17Shotdowns=v12ResolveShotdowns;
v12ResolveShotdowns=function(){const v=v12Ensure(),before=v?.shotdowns||0,r=__v17Shotdowns(),after=v?.shotdowns||0,gain=after-before;if(gain>0)v17AddFlow(Math.min(18,gain*2.4),'intercept');return r;};

const __v17Damage=damageMultiplier;
damageMultiplier=function(){let m=__v17Damage();const a=v17Ensure();if(a?.flowActive>0)m*=1.12;return m;};
const __v17Rate=fireRateMultiplier;
fireRateMultiplier=function(){let m=__v17Rate();const a=v17Ensure();if(a?.flowActive>0)m*=1.15;return m;};

function v17ResupplyBeat(){const a=v17Ensure();if(!a||S.phase!=='running'||S.boss||S.liveEvent)return false;
  const clear=Math.floor(S.bullets.length*.42);if(clear>0)S.bullets.splice(0,clear);S.shield=Math.min(S.maxShield,S.shield+2);S.grace=Math.max(S.grace,1.25);v17SpawnPowerFork();banner('RESUPPLY WINDOW','#8fffb0','Pressure break · choose a combat core');return true;
}

function v17Draw(){const a=v17Ensure(),v=v12Ensure();if(!a||!v||S.phase!=='running')return;
  ctx.save();
  const x=W/2-118,y=82,w=236,h=22,pct=a.flowActive>0?1:clamp(a.flow/V17_FLOW_TRIGGER,0,1);
  ctx.globalAlpha=.92;ctx.fillStyle='#020914d9';ctx.fillRect(x,y,w,h);ctx.strokeStyle=a.flowActive>0?'#8ff7ff':'#38506e';ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h);
  ctx.fillStyle=a.flowActive>0?'#8ff7ff':'#294564';ctx.fillRect(x+3,y+3,(w-6)*pct,h-6);
  ctx.fillStyle=a.flowActive>0?'#021018':'#d7e8ff';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText(a.flowActive>0?'GUNNERY FLOW · '+a.flowActive.toFixed(1)+'s':'GUNNERY FLOW · '+Math.round(a.flow)+'%',W/2,y+15);
  for(const p of v.powerups){if(!p||p.dead||!p.v17Fork)continue;ctx.strokeStyle=p.v17Label==='OFFENSE'?'#ffb071':p.v17Label==='DEFENSE'?'#91bfff':'#ffe071';ctx.lineWidth=2;ctx.globalAlpha=.78+.16*Math.sin(S.time*8+p.y);ctx.beginPath();ctx.arc(p.x,p.y,p.size+11,0,TWO_PI);ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText(p.v17Label,p.x,p.y-p.size-16);}
  ctx.restore();
}
const __v17Draw=draw;draw=function(){__v17Draw();v17Draw();};

const __v17Update=update;
update=function(dt){const r=__v17Update(dt),a=v17Ensure();if(!a||S.phase!=='running')return r;
  if(a.flowActive>0){a.flowActive=Math.max(0,a.flowActive-dt);a.flow=100;if(a.flowActive<=0)a.flow=42;}
  else{const decay=v12Ensure()?.aim?.active?.65:2.0;a.flow=Math.max(0,a.flow-decay*dt);}
  if(a.tutorial===0&&S.time>4){a.tutorial=1;banner('AIM THE ARSENAL','#8ff7ff','Hold + drag anywhere to steer every weapon');}
  if(a.tutorial===1&&S.time>11){a.tutorial=2;banner('ACTIVE DEFENSE','#8ff7ff','Aim through incoming fire to shoot projectiles down');}
  if(a.tutorial===2&&S.time>18){a.tutorial=3;if(!v17ActiveFork())v17SpawnPowerFork();}
  if(S.time>=a.nextForkAt){if(!S.liveEvent&&!S.boss&&!v17ActiveFork()){v17SpawnPowerFork();a.nextForkAt=S.time+rand(V17_FORK_MIN,V17_FORK_MAX);}else a.nextForkAt=S.time+5;}
  if(S.time>=a.nextResupplyAt){if(v17ResupplyBeat())a.nextResupplyAt=S.time+rand(V17_RESUPPLY_MIN,V17_RESUPPLY_MAX);else a.nextResupplyAt=S.time+7;}
  return r;
};

function v17AppendResults(){if(!S||typeof overlayText==='undefined')return;const a=v17Ensure();if(!a||a.resultsAdded||/PLAYER AGENCY/.test(overlayText.innerHTML||''))return;a.resultsAdded=true;
  overlayText.innerHTML+='<div class="tactical-results"><strong>PLAYER AGENCY</strong><span>Power forks chosen <b>'+a.forkChoices+'/'+a.forks+'</b></span><span>Gunnery Flow bursts <b>'+a.flowBursts+'</b></span><span>Best Flow charge <b>'+Math.round(a.bestFlow)+'%</b></span><span>Combat decisions stayed in-play, not in menus</span></div>';
}

if(typeof window!=='undefined'&&window.__STARWARD__){window.__STARWARD__.v12CollectPowerup=v12ApplyPower;window.__STARWARD__.v12ResolveShotdowns=v12ResolveShotdowns;window.__STARWARD__.v17State=()=>S?.v17||null;window.__STARWARD__.v17SpawnPowerFork=v17SpawnPowerFork;window.__STARWARD__.v17AddFlow=v17AddFlow;window.__STARWARD__.v17PowerPools=()=>V17_POWER_POOLS;}
// ---- end V17 engagement layer ----
`;

  function apply(source){
    let transformed=base.apply(source);
    for(const hook of ['V16_POWER_KEYS','v15BulletAtPointer','v14WrapAll','v13PowerTypes','v12ApplyPower'])if(!transformed.includes(hook))throw new Error('Starward V17 hook missing: '+hook);
    const resultHook="aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();v15AppendResults();choiceGrid.classList.add('hidden');";
    if(!transformed.includes(resultHook))throw new Error('Starward V17 results hook missing');
    transformed=transformed.replace(resultHook,"aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();v15AppendResults();v17AppendResults();choiceGrid.classList.add('hidden');");
    const close=transformed.lastIndexOf('})();');if(close<0)throw new Error('Starward V17 runtime closure not found');
    return transformed.slice(0,close)+V17_BLOCK+'\n'+transformed.slice(close);
  }
  return {apply};
});
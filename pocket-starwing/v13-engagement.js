(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v12-aim-controls.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V12 transform missing');

  const V13_BLOCK=String.raw`

// ---- Starward Run V13 engagement, power-mode and pacing layer ----
const V13_DECISION_GAP=28;
const V13_EVENT_MIN=20;
const V13_EVENT_MAX=29;

function v13Ensure(){
  const v=v12Ensure();if(!v)return null;
  if(v.buffs.trident===undefined)Object.assign(v.buffs,{trident:0,aegis:0,seeker:0,ricochet:0,timeshift:0,magnet:0});
  if(!S.v13)S.v13={combo:0,bestCombo:0,comboTimer:0,precisionBursts:0,decisionCount:0,eventChoices:0,powerModes:0,lastPowerCount:0,lastShotdowns:0,resultsAdded:false};
  return S.v13;
}

(function v13AddPowerModes(){
  const add=p=>{if(!V12_POWER_TYPES.some(x=>x.id===p.id))V12_POWER_TYPES.push(p);};
  add({id:'trident',name:'TRIDENT FIRE',icon:'≡',color:'#8ff7ff',duration:10,apply:v=>v.buffs.trident=Math.max(v.buffs.trident,10*v.powerDuration)});
  add({id:'aegis',name:'AEGIS FIELD',icon:'⬢',color:'#91bfff',duration:10,apply:v=>v.buffs.aegis=Math.max(v.buffs.aegis,10*v.powerDuration)});
  add({id:'seeker',name:'SEEKER ARRAY',icon:'◎',color:'#b7ff8e',duration:11,apply:v=>v.buffs.seeker=Math.max(v.buffs.seeker,11*v.powerDuration)});
  add({id:'ricochet',name:'PHASE ROUNDS',icon:'↯',color:'#e6a1ff',duration:11,apply:v=>v.buffs.ricochet=Math.max(v.buffs.ricochet,11*v.powerDuration)});
  add({id:'timeshift',name:'TIME DILATION',icon:'◷',color:'#d6f1ff',duration:8,apply:v=>v.buffs.timeshift=Math.max(v.buffs.timeshift,8*v.powerDuration)});
  add({id:'magnet',name:'MAGNETIC SIGHT',icon:'⊕',color:'#ffd478',duration:12,apply:v=>v.buffs.magnet=Math.max(v.buffs.magnet,12*v.powerDuration)});
})();

const __v13FindAim=v12FindEnemyAimTarget;
v12FindEnemyAimTarget=function(){
  const v=v12Ensure();if(!v||v.buffs.magnet<=0)return __v13FindAim();
  const old=S.stats.dodge;S.stats.dodge=Math.min(.96,old+.28);try{return __v13FindAim();}finally{S.stats.dodge=old;}
};

const __v13UpdateWeapons=updateWeapons;
updateWeapons=function(dt){
  const v=v12Ensure(),before=S.shots.length;__v13UpdateWeapons(dt);const fresh=S.shots.slice(before);
  if(!v||!fresh.length)return;
  if(v.buffs.seeker>0)for(const sh of fresh)sh.homing=true;
  if(v.buffs.ricochet>0)for(const sh of fresh){sh.pierce=(sh.pierce||0)+2;sh.damage*=1.08;}
  if(v.buffs.trident>0&&S.shots.length<230){
    const clones=[];
    for(const sh of fresh.slice(0,12)){
      const speed=Math.hypot(sh.vx,sh.vy),base=Math.atan2(sh.vy,sh.vx);
      for(const off of [-.075,.075])clones.push({...sh,vx:Math.cos(base+off)*speed,vy:Math.sin(base+off)*speed,damage:sh.damage*.62,trail:[],v13Split:true});
    }
    S.shots.push(...clones);
  }
};

const __v13Hurt=hurtShip;
hurtShip=function(amount){const v=v12Ensure();if(v?.buffs.aegis>0)amount=Math.max(.25,amount*.45);return __v13Hurt(amount);};

const __v13EnemyFire=enemyFire;
enemyFire=function(e){const before=S.bullets.length,r=__v13EnemyFire(e),v=v12Ensure();if(v?.buffs.timeshift>0)for(let i=before;i<S.bullets.length;i++){S.bullets[i].vx*=.58;S.bullets[i].vy*=.58;}return r;};
if(typeof updateBoss==='function'){
  const __v13Boss=updateBoss;
  updateBoss=function(dt){const before=S.bullets.length,r=__v13Boss(dt),v=v12Ensure();if(v?.buffs.timeshift>0)for(let i=before;i<S.bullets.length;i++){S.bullets[i].vx*=.62;S.bullets[i].vy*=.62;}return r;};
}

const __v13PowerUpdate=v12UpdatePowerups;
v12UpdatePowerups=function(dt){
  const v=v12Ensure();__v13PowerUpdate(dt);if(v&&v.nextPowerAt>S.time+12.5)v.nextPowerAt=S.time+rand(8.5,12.5)/Math.max(.75,v.powerFrequency);
};

maybeQueueBuildChoice=function(){
  if(!S.upgradeReady||S.buildChoiceQueued||S.phase!=='running')return;
  if(S.time-S.lastDecisionAt<V13_DECISION_GAP)return;
  if(S.liveEvent||S.boss&&S.boss.forced)return;
  S.buildChoiceQueued=true;v13Ensure().decisionCount++;showBuildChoice();
};

const __v13StartEvent=startLiveEvent;
startLiveEvent=function(){const r=__v13StartEvent();if(S.liveEvent)S.nextLiveEventAt=S.time+rand(V13_EVENT_MIN,V13_EVENT_MAX);return r;};
const __v13Accept=acceptLiveEvent;
acceptLiveEvent=function(){const had=!!S.liveEvent,r=__v13Accept();if(had&&r)v13Ensure().eventChoices++;return r;};

if(!LIVE_EVENTS.some(e=>e.kind==='precisionrun'))LIVE_EVENTS.push(
  {kind:'precisionrun',color:'#8ff7ff',title:'PRECISION WINDOW',body:'Accept a wave of snipers and gunners. Their shots are slower but much denser. Shoot down twelve projectiles before the wave passes for a power cache.',available:()=>S.time>=32,accept(){const v=v13Ensure();const start=v12Ensure().shotdowns;S.v13.precisionTrial={start,target:start+12,time:17};for(let i=0;i<10;i++)spawnEnemy(i%3===0?'sniper':'gunner',80+i*40,{elite:i===8,x:W+40+i*34});banner('PRECISION WINDOW','#8ff7ff','Intercept 12 shots in 17 seconds');}},
  {kind:'reactortrade',color:'#ffb071',title:'BREACH THE REACTOR',body:'Accept immediate hull damage to activate Trident Fire, Phase Rounds and Rapid Fire at once. High risk, huge manual-fire output.',available:()=>S.hull>S.maxHull*.42,accept(){const v=v12Ensure();S.hull=Math.max(1,S.hull-S.maxHull*.22);v.buffs.trident=Math.max(v.buffs.trident,13);v.buffs.ricochet=Math.max(v.buffs.ricochet,13);v.buffs.rapid=Math.max(v.buffs.rapid,13);banner('REACTOR BREACHED','#ffb071','Three weapon modes online');}},
  {kind:'aegisrun',color:'#91bfff',title:'TAKE THE FIRE',body:'Accept a defensive challenge. Enemy fire intensifies, but an Aegis Field activates and successful interceptions feed your shield.',available:()=>S.time>=42,accept(){const v=v12Ensure();v.buffs.aegis=Math.max(v.buffs.aegis,16);S.specials.bulletEater=1;for(let i=0;i<8;i++)spawnEnemy(i%2?'bomber':'gunner',rand(75,H-75),{x:W+40+i*42});banner('AEGIS CHALLENGE','#91bfff','Intercept fire to sustain the shield');}},
  {kind:'arsenalcache',color:'#ffd478',title:'ARSENAL CACHE',body:'Accept five power cores and an elite escort. Shoot the cores before they escape, then use the temporary modes to break the escort.',accept(){for(let i=0;i<5;i++)v12SpawnPowerup(null,82+i*92,W+35+i*58);for(let i=0;i<6;i++)spawnEnemy(i%2?'guardian':'gunner',80+i*70,{elite:i===5,x:W+110+i*46});banner('ARSENAL CACHE','#ffd478','Five combat cores inbound');}},
  {kind:'legendtrade',color:'#ff8fd0',title:'FORCE A MYTHIC DRAFT',body:'Accept an immediate elite reinforcement wave. Survive it and your next build choice is guaranteed Mythic-or-better.',available:()=>S.time>=80,accept(){S.nextUpgradeRarity=Math.max(S.nextUpgradeRarity||0,3);for(let i=0;i<9;i++)spawnEnemy(i%3===0?'carrier':i%2?'sniper':'guardian',70+i*48,{elite:true,x:W+45+i*38});banner('MYTHIC CONTRACT','#ff8fd0','Next draft upgraded · elites inbound');}}
);

V12_EVENT_INFO.precisionrun={risk:'RISK · DENSE PRECISION FIRE',reward:'REWARD · POWER CACHE'};
V12_EVENT_INFO.reactortrade={risk:'RISK · LOSE 22% MAX-HULL VALUE',reward:'REWARD · 3 WEAPON MODES'};
V12_EVENT_INFO.aegisrun={risk:'RISK · HEAVY ENEMY FIRE',reward:'REWARD · DEFENSE ENGINE'};
V12_EVENT_INFO.arsenalcache={risk:'RISK · ELITE ESCORT',reward:'REWARD · 5 POWER CORES'};
V12_EVENT_INFO.legendtrade={risk:'RISK · ELITE REINFORCEMENTS',reward:'REWARD · MYTHIC+ DRAFT'};

function v13ResolveTrial(dt){
  const a=v13Ensure();if(!a?.precisionTrial)return;
  a.precisionTrial.time-=dt;const v=v12Ensure();
  if(v.shotdowns>=a.precisionTrial.target){
    a.precisionTrial=null;a.precisionBursts++;for(let i=0;i<3;i++)v12SpawnPowerup(null,H*.32+i*95,W+40+i*65);addLaserCharge(3);banner('PRECISION COMPLETE','#8fffb0','Three power cores + Star charge');return;
  }
  if(a.precisionTrial.time<=0){a.precisionTrial=null;banner('PRECISION MISSED','#ff9d8e','No penalty · keep flying');}
}

const __v13Shotdowns=v12ResolveShotdowns;
v12ResolveShotdowns=function(){const v=v12Ensure(),before=v?.shotdowns||0,n=__v13Shotdowns();if(v&&v.shotdowns>before){const a=v13Ensure(),g=v.shotdowns-before;a.combo+=g;a.comboTimer=3.2;a.bestCombo=Math.max(a.bestCombo,a.combo);if(a.combo>0&&a.combo%8===0){addLaserCharge(.8);popup('INTERCEPT CHAIN ×'+a.combo,S.ship.x+80,S.ship.y-42,'#8ff7ff',.75);}}return n;};

const __v13Kill=killEnemy;
killEnemy=function(e){const v=v12Ensure(),before=v?.aimedKills||0,r=__v13Kill(e);if(v&&v.aimedKills>before){const a=v13Ensure();a.combo++;a.comboTimer=3.2;a.bestCombo=Math.max(a.bestCombo,a.combo);if(a.combo>0&&a.combo%10===0){v12SpawnPowerup(null,clamp(e?.y||H/2,60,H-60),Math.max(S.ship.x+270,e?.x||W*.7));popup('AIM CHAIN ×'+a.combo,e?.x||W*.7,(e?.y||H/2)-36,'#ffe071',.85);}}return r;};

function v13DrawHUD(){
  const a=v13Ensure(),v=v12Ensure();if(!a||!v||S.phase!=='running')return;
  ctx.save();
  if(a.combo>=3){ctx.fillStyle='#06101ddd';ctx.fillRect(W-170,38,154,34);ctx.strokeStyle=a.combo>=10?'#ffe071':'#8ff7ff';ctx.strokeRect(W-170,38,154,34);ctx.fillStyle=a.combo>=10?'#ffe071':'#dffcff';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('COMBAT CHAIN ×'+a.combo,W-93,59);}
  if(a.precisionTrial){ctx.fillStyle='#06101de8';ctx.fillRect(W/2-145,38,290,36);ctx.strokeStyle='#8ff7ff';ctx.strokeRect(W/2-145,38,290,36);ctx.fillStyle='#8ff7ff';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillText('INTERCEPT '+Math.min(12,v.shotdowns-a.precisionTrial.start)+'/12 · '+Math.ceil(a.precisionTrial.time)+'s',W/2,60);}
  ctx.restore();
}
const __v13Draw=draw;
draw=function(){__v13Draw();v13DrawHUD();};

const __v13Update=update;
update=function(dt){__v13Update(dt);if(!S||S.phase!=='running')return;const a=v13Ensure();if(a.comboTimer>0){a.comboTimer-=dt;if(a.comboTimer<=0)a.combo=0;}v13ResolveTrial(dt);};

function v13AppendResults(){
  if(!S||typeof overlayText==='undefined')return;const a=v13Ensure();if(!a||a.resultsAdded||/ACTIVE GUNNERY/.test(overlayText.innerHTML||''))return;a.resultsAdded=true;
  overlayText.innerHTML+='<div class="tactical-results"><strong>ACTIVE GUNNERY</strong><span>Best combat chain <b>'+a.bestCombo+'×</b></span><span>Decision drafts <b>'+a.decisionCount+'</b></span><span>Live choices <b>'+a.eventChoices+'</b></span><span>Precision trials <b>'+a.precisionBursts+'</b></span></div>';
}

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.v13State=()=>S?.v13||null;
  window.__STARWARD__.v13PowerTypes=()=>V12_POWER_TYPES.map(x=>x.id);
  window.__STARWARD__.v13ForceTrial=()=>{S.v13={...(S.v13||{}),combo:0,bestCombo:0,comboTimer:0,precisionBursts:0,decisionCount:0,eventChoices:0,powerModes:0,lastPowerCount:0,lastShotdowns:0,resultsAdded:false,precisionTrial:{start:v12Ensure().shotdowns,target:v12Ensure().shotdowns+12,time:17}};return S.v13.precisionTrial;};
}
// ---- end V13 engagement layer ----
`;

  function apply(source){
    let transformed=base.apply(source);
    for(const hook of ['V12_POWER_TYPES','v12ResolveShotdowns','v12UpdatePowerups','v12FindEnemyAimTarget','v12AppendResults'])if(!transformed.includes(hook))throw new Error('Starward V13 hook missing: '+hook);
    const resultHook='aaa8EnsureResultsStack();v12AppendResults();choiceGrid.classList.add(\'hidden\');';
    if(!transformed.includes(resultHook))throw new Error('Starward V13 results hook missing');
    transformed=transformed.replace(resultHook,'aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();choiceGrid.classList.add(\'hidden\');');
    const close=transformed.lastIndexOf('})();');if(close<0)throw new Error('Starward V13 runtime closure not found');
    return transformed.slice(0,close)+V13_BLOCK+'\n'+transformed.slice(close);
  }
  return {apply};
});
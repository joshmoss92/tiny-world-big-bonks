(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v20-mechanics-refresh.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V20 transform missing');

  const V21_BLOCK=String.raw`

// ---- Starward Run V21 sector-flow and consequence layer ----
const V21_CLEAR_TIME=1.85;
const V21_ENTRY_TIME=2.35;
let v21CollisionContext=false;

function v21Ensure(){
  if(!S)return null;
  if(!S.v21){
    S.v21={
      collisions:0,collisionDamage:0,eventPauses:0,eventTimeouts:0,eventAccepted:0,eventPaused:false,
      transition:{active:false,stage:'',time:0,max:0,bossName:'',fromSector:S.sector||1,toSector:(S.sector||1)+1},
      interceptBossReward:false,pendingBossReward:null,awaitingReward:false,sectorClears:0,sectorEntries:0,
      lastSectorBoss:'',resultAdded:false
    };
  }
  return S.v21;
}
function v21Durability(){return (S.hull||S.hp||0)+(S.shield||0);}
function v21SectorBiome(n){return BIOMES[(Math.max(1,n)-1)%BIOMES.length];}

// Sector progression is now boss-gated. The legacy time-based sector increment is intentionally disabled.
updateSector=function(){return S?.sector||1;};

const __v21ShowBossReward=showBossReward;
showBossReward=function(forced=false){
  const q=v21Ensure();
  if(q&&q.interceptBossReward&&!forced){q.pendingBossReward={forced:false};return false;}
  return __v21ShowBossReward(forced);
};

function v21BeginSectorClear(bossName){
  const q=v21Ensure();if(!q||q.transition.active)return false;
  q.sectorClears++;q.lastSectorBoss=bossName||'SECTOR BOSS';
  q.transition={active:true,stage:'clear',time:V21_CLEAR_TIME,max:V21_CLEAR_TIME,bossName:q.lastSectorBoss,fromSector:S.sector,toSector:S.sector+1};
  q.awaitingReward=false;
  S.liveEvent=null;S.bullets.length=0;S.shots.length=0;S.enemies.length=0;
  S.nextLiveEventAt=Math.max(S.nextLiveEventAt||0,S.time+12);
  S.buildChoiceQueued=true;S.grace=Math.max(S.grace||0,3);
  if(S.v20){S.v20.phase='recovery';S.v20.phaseTime=99;S.v20.phaseMax=99;}
  if(typeof v19Moment==='function')v19Moment('SECTOR CLEAR',q.lastSectorBoss+' DESTROYED','#ffe071',1.35,1.1);
  else banner('SECTOR CLEAR','#ffe071',q.lastSectorBoss+' destroyed');
  S.screenShake=Math.max(S.screenShake||0,8);
  return true;
}

function v21BeginEntry(){
  const q=v21Ensure();if(!q)return false;
  q.transition={active:true,stage:'entry',time:V21_ENTRY_TIME,max:V21_ENTRY_TIME,bossName:q.lastSectorBoss,fromSector:S.sector,toSector:S.sector+1};
  q.awaitingReward=false;S.liveEvent=null;S.bullets.length=0;S.enemies.length=0;S.shots.length=0;S.grace=Math.max(S.grace||0,2.5);
  return true;
}

function v21EnterNextSector(){
  const q=v21Ensure();if(!q)return false;
  S.sector=Math.max(1,S.sector+1);S.sectorStart=S.time;S.sectorPulse=1;S.stats.luck=Math.min(.75,(S.stats.luck||0)+.01);
  S.bullets.length=0;S.enemies.length=0;S.shots.length=0;S.grace=Math.max(S.grace||0,1.25);S.buildChoiceQueued=false;
  q.transition.active=false;q.transition.stage='';q.sectorEntries++;
  const d=S.v20||v20Ensure?.();
  if(d){d.phase='recovery';d.phaseTime=1.05;d.phaseMax=1.05;d.spawnTimer=.35;d.waveTimer=2.1;d.assaultProgress=0;d.assaultKills=0;d.assaultHits=0;d.assaultBroken=false;d.nextBossAt=S.time+Math.max(52,68-Math.min(10,(S.sector-1)*2.5));}
  const biome=v21SectorBiome(S.sector);banner('SECTOR '+S.sector+' START','#8ff7ff',biome.name+' · prepare for assault');
  if(typeof v19Moment==='function')v19Moment('SECTOR '+S.sector,biome.name.toUpperCase(),'#8ff7ff',.95,.72);
  return true;
}

function v21TickTransition(dt){
  const q=v21Ensure();if(!q?.transition.active)return false;
  q.transition.time=Math.max(0,q.transition.time-dt);
  if(q.transition.time>0)return true;
  if(q.transition.stage==='clear'){
    q.transition.active=false;
    if(q.pendingBossReward){const reward=q.pendingBossReward;q.pendingBossReward=null;q.awaitingReward=true;__v21ShowBossReward(!!reward.forced);}
    else v21BeginEntry();
    return true;
  }
  if(q.transition.stage==='entry'){v21EnterNextSector();return true;}
  q.transition.active=false;return true;
}

const __v21UpdateBoss=updateBoss;
updateBoss=function(dt){
  const q=v21Ensure(),before=S.boss,bossesBefore=S.bosses||0;
  const normalDeath=!!(before&&!before.forced&&before.hp<=0);
  q.interceptBossReward=normalDeath;
  const bossName=before?.type?.name||before?.name||'SECTOR BOSS';
  const r=__v21UpdateBoss(dt);
  q.interceptBossReward=false;
  if(normalDeath&&!S.boss&&(S.bosses||0)>bossesBefore)v21BeginSectorClear(bossName);
  return r;
};

const __v21HurtShip=hurtShip;
hurtShip=function(amount){
  const q=v21Ensure(),before=v21Durability();
  const scaled=v21CollisionContext?Math.max(2,Math.ceil((Number(amount)||1)*(1.60+((S.v20?.rank||1)-1)*.10))):amount;
  const r=__v21HurtShip(scaled),after=v21Durability();
  if(v21CollisionContext&&q&&after<before-.01){
    const dealt=before-after;q.collisions++;q.collisionDamage+=dealt;
    popup('COLLISION -'+Math.max(1,Math.ceil(dealt)),S.ship.x+30,S.ship.y-34,'#ff8e76',.82);
    S.screenShake=Math.max(S.screenShake||0,8);S.flash=Math.max(S.flash||0,.18);
    if(S.v20){S.v20.heat=Math.max(0,(S.v20.heat||0)-14);S.v20.assaultHits=(S.v20.assaultHits||0)+1;}
    if(typeof v19Impact==='function')v19Impact(S.ship.x,S.ship.y,'#ff725f',1.1);
  }
  return r;
};

const __v21UpdateEnemies=updateEnemies;
updateEnemies=function(dt){
  v21CollisionContext=true;
  try{return __v21UpdateEnemies(dt);}finally{v21CollisionContext=false;}
};

const __v21AcceptLiveEvent=acceptLiveEvent;
acceptLiveEvent=function(){const q=v21Ensure(),had=!!S.liveEvent,r=__v21AcceptLiveEvent();if(q&&had&&r!==false){q.eventAccepted++;q.eventPaused=false;}return r;};

function v21TickPausedEvent(dt){
  const q=v21Ensure(),e=S.liveEvent;if(!q||!e)return false;
  if(!q.eventPaused){q.eventPaused=true;q.eventPauses++;}
  e.time=Math.max(0,e.time-dt);
  if(e.time<=0){S.liveEvent=null;q.eventPaused=false;q.eventTimeouts++;banner('EVENT PASSED','#8ff7ff','Course maintained');}
  updateUI();return true;
}

const __v21Update=update;
update=function(dt){
  const q=v21Ensure();
  if(q?.transition.active){v21TickTransition(dt);updateUI();return;}
  if(q?.awaitingReward&&S.phase==='running'){v21BeginEntry();v21TickTransition(0);updateUI();return;}
  if(S.phase==='running'&&S.liveEvent){v21TickPausedEvent(dt);return;}
  q.eventPaused=false;
  return __v21Update(dt);
};

function v21DrawPauseBadge(){
  const q=v21Ensure();if(!q||!S.liveEvent||S.phase!=='running')return;
  ctx.save();ctx.globalAlpha=.98;ctx.fillStyle='rgba(2,8,18,.90)';ctx.fillRect(W*.5-118,24,236,32);ctx.strokeStyle='#ffe071';ctx.lineWidth=1.6;ctx.strokeRect(W*.5-118,24,236,32);ctx.fillStyle='#ffe071';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText('TACTICAL PAUSE · '+Math.max(0,S.liveEvent.time).toFixed(1)+'s',W*.5,44);ctx.restore();
}
function v21DrawTransition(){
  const q=v21Ensure();if(!q?.transition.active)return;
  const tr=q.transition,p=1-tr.time/Math.max(.001,tr.max),from=tr.fromSector,to=tr.toSector,biome=v21SectorBiome(to);
  ctx.save();ctx.globalAlpha=.94;ctx.fillStyle='#020711';ctx.fillRect(0,0,W,H);
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'rgba(60,130,255,.16)');g.addColorStop(1,'rgba(255,181,76,.10)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';ctx.fillStyle=tr.stage==='clear'?'#ffe071':'#8ff7ff';ctx.font='bold 34px system-ui, sans-serif';ctx.fillText(tr.stage==='clear'?'SECTOR CLEAR':'SECTOR '+to,W*.5,H*.41);
  ctx.fillStyle='#ffffff';ctx.font='bold 13px monospace';ctx.fillText(tr.stage==='clear'?'SECTOR '+from+' COMPLETE':biome.name.toUpperCase(),W*.5,H*.47);
  ctx.fillStyle='#b9c9df';ctx.font='11px monospace';ctx.fillText(tr.stage==='clear'?(tr.bossName+' DESTROYED'):'NEXT ASSAULT INBOUND',W*.5,H*.52);
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(W*.5-150,H*.58,300,5);ctx.fillStyle=tr.stage==='clear'?'#ffe071':'#8ff7ff';ctx.fillRect(W*.5-150,H*.58,300*v21Clamp(p,0,1),5);
  ctx.restore();
}
function v21Clamp(v,a,b){return Math.max(a,Math.min(b,v));}
const __v21Draw=draw;
draw=function(){__v21Draw();v21DrawPauseBadge();v21DrawTransition();};

function v21AppendResults(){
  if(!S||typeof overlayText==='undefined')return;const q=v21Ensure();if(!q||q.resultAdded||/SECTOR FLOW/.test(overlayText.innerHTML||''))return;q.resultAdded=true;
  overlayText.innerHTML+='<div class="tactical-results"><strong>SECTOR FLOW</strong><span>Sector clears <b>'+q.sectorClears+'</b></span><span>Enemy collisions <b>'+q.collisions+'</b> · collision damage <b>'+Math.round(q.collisionDamage)+'</b></span><span>Tactical event pauses <b>'+q.eventPauses+'</b> · accepted <b>'+q.eventAccepted+'</b></span><span>Sector transitions completed <b>'+q.sectorEntries+'</b></span></div>';
}

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.v21State=()=>S?.v21||null;
  window.__STARWARD__.v21ForceSectorClear=name=>v21BeginSectorClear(name||'TEST BOSS');
  window.__STARWARD__.v21SpawnSectorBoss=()=>spawnBoss(false);
  window.__STARWARD__.v21TestEvent=(seconds=5)=>{S.liveEvent={kind:'v21test',title:'TACTICAL TEST',body:'Pause validation',time:seconds,max:seconds,accept(){banner('TEST ACCEPTED','#8ff7ff','');}};return S.liveEvent;};
  window.__STARWARD__.v21UpdateSector=()=>updateSector();
}
// ---- end V21 sector-flow and consequence layer ----
`;

  function apply(source){
    let transformed=base.apply(source);
    for(const hook of ['v20Ensure','v20AppendResults','showBossReward','updateSector','acceptLiveEvent','updateEnemies','updateBoss'])if(!transformed.includes(hook))throw new Error('Starward V21 hook missing: '+hook);
    const resultHook="aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();v15AppendResults();v17AppendResults();v18AppendResults();v19AppendResults();v20AppendResults();choiceGrid.classList.add('hidden');";
    if(!transformed.includes(resultHook))throw new Error('Starward V21 results hook missing');
    transformed=transformed.replace(resultHook,"aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();v15AppendResults();v17AppendResults();v18AppendResults();v19AppendResults();v20AppendResults();v21AppendResults();choiceGrid.classList.add('hidden');");
    const close=transformed.lastIndexOf('})();');if(close<0)throw new Error('Starward V21 runtime closure not found');
    return transformed.slice(0,close)+V21_BLOCK+'\n'+transformed.slice(close);
  }
  return {apply};
});
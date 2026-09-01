(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v19-cinematic.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V19 transform missing');

  const V20_BLOCK=String.raw`

// ---- Starward Run V20 major mechanics refresh ----
const V20_MAX_RANK=5;
const V20_ASSAULT_MODS=['crossfire','hunter','rush','siege'];
const V20_MOD_INFO={
  crossfire:{name:'CROSSFIRE',desc:'Wider firing patterns · counter attackers before they shoot',color:'#ff9f7a'},
  hunter:{name:'HUNTER PACK',desc:'More elites · priority targets pay better',color:'#ff86b9'},
  rush:{name:'RUSH WAVE',desc:'Faster formations · movement matters more',color:'#8ff7ff'},
  siege:{name:'SIEGE LINE',desc:'Heavy ships and harder projectiles',color:'#ffd36b'}
};
function v20Clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function v20Rand(a,b){return a+Math.random()*(b-a);}
function v20Threshold(rank){return 88+Math.max(0,rank-1)*18;}
function v20RewardMult(){const d=v20Ensure();return d?1+(d.rank-1)*.10:1;}
function v20Ensure(){
  if(!S)return null;
  if(!S.v20){
    const now=S.time||0;
    S.v20={rank:1,heat:0,maxRank:1,rankUps:0,rankDowns:0,phase:'recovery',phaseTime:6.2,phaseMax:6.2,assault:0,assaultMod:'crossfire',assaultKills:0,assaultProgress:0,assaultQuota:0,assaultHits:0,assaultBroken:false,assaultsCleared:0,flawlessAssaults:0,spawnTimer:.7,waveTimer:4.8,nextBossAt:Math.max(70,now+70),escortTimer:4,counterKills:0,hits:0,hitWindow:0,hitWindowCount:0,lastGrazes:S.v18?.grazes||0,lastEvades:S.v18?.perfectEvades||0,lastBursts:S.v18?.precisionBursts||0,lastFlows:S.v17?.flowBursts||0,lastBosses:S.bosses||0,directorMoments:0,resultAdded:false};
    S.grace=Math.max(S.grace||0,1.5);
  }
  return S.v20;
}
function v20Moment(title,sub,color,intensity,duration){const d=v20Ensure();if(d)d.directorMoments++;if(typeof v19Moment==='function')v19Moment(title,sub,color||'#fff',intensity||.8,duration||.55);else banner(title,color||'#fff',sub||'');}
function v20AddHeat(amount,label){
  const d=v20Ensure();if(!d||S.phase!=='running'||!Number.isFinite(amount)||amount<=0)return d?.heat||0;d.heat+=amount;
  while(d.rank<V20_MAX_RANK&&d.heat>=v20Threshold(d.rank)){
    d.heat-=v20Threshold(d.rank);d.rank++;d.maxRank=Math.max(d.maxRank,d.rank);d.rankUps++;
    const title=d.rank===5?'APEX THREAT':'DANGER RANK '+d.rank,sub='Enemies escalate · rewards x'+v20RewardMult().toFixed(1);
    v20Moment(title,sub,d.rank>=4?'#ff817a':'#ffe071',d.rank===5?1.35:.9,d.rank===5?.9:.58);S.screenShake=Math.max(S.screenShake||0,d.rank===5?8:4.5);addLaserCharge(.7+d.rank*.15);
  }
  d.heat=Math.max(0,d.heat);return d.heat;
}
function v20SetRank(rank){const d=v20Ensure();if(!d)return 1;d.rank=v20Clamp(Math.round(rank)||1,1,V20_MAX_RANK);d.maxRank=Math.max(d.maxRank,d.rank);d.heat=Math.min(d.heat,v20Threshold(d.rank)-1);return d.rank;}
function v20PickMod(){const d=v20Ensure();if(!d)return 'crossfire';const pool=V20_ASSAULT_MODS.filter(x=>x!==d.assaultMod);return pick(pool.length?pool:V20_ASSAULT_MODS);}
function v20StartAssault(forcedMod){
  const d=v20Ensure();if(!d)return false;d.phase='assault';d.assault++;d.assaultMod=forcedMod&&V20_MOD_INFO[forcedMod]?forcedMod:v20PickMod();d.phaseTime=v20Rand(15.5,18.5)+Math.min(2,S.time/180);d.phaseMax=d.phaseTime;d.assaultKills=0;d.assaultProgress=0;d.assaultHits=0;d.assaultBroken=false;d.assaultQuota=Math.min(32,11+d.rank*4+Math.floor(S.time/150)*2);d.spawnTimer=.25;d.waveTimer=1.4;S.grace=Math.min(S.grace||0,.35);
  const info=V20_MOD_INFO[d.assaultMod];banner('ASSAULT '+d.assault,info.color,info.name+' · Break '+d.assaultQuota+' targets');if(d.assault===1||d.rank>=4||d.assault%3===0)v20Moment(info.name,'BREAK '+d.assaultQuota+' TARGETS FOR EARLY RECOVERY',info.color,.65,.48);return true;
}
function v20StartRecovery(reason){
  const d=v20Ensure();if(!d)return false;const cleared=d.phase==='assault'&&d.assaultProgress>=d.assaultQuota;if(cleared)d.assaultsCleared++;const flawless=cleared&&d.assaultHits===0;
  if(flawless){d.flawlessAssaults++;S.shield=Math.min(S.maxShield,S.shield+1);addLaserCharge(.9+d.rank*.16);gainXP(2+d.rank);v20AddHeat(6,'flawless');banner('FLAWLESS BREAK','#8fffb0','+shield · +laser · danger pressure preserved');}
  d.phase='recovery';d.phaseTime=Math.max(3.8,6.3-d.rank*.38)+(S.hull/S.maxHull<.30?1.4:0);d.phaseMax=d.phaseTime;d.spawnTimer=1;d.waveTimer=99;S.grace=Math.max(S.grace||0,1.45);const clear=Math.floor((S.bullets?.length||0)*.28);if(clear>0)S.bullets.splice(0,clear);if(!flawless)banner('RECOVERY WINDOW','#8ff7ff',reason||'Reposition · reload the dash · prepare for the next assault');return true;
}
function v20Pool(){
  const d=v20Ensure(),t=S.time,pool=[];
  if(d.assaultMod==='rush')pool.push('dart','dart','scout','splitter','gunner');else if(d.assaultMod==='hunter')pool.push('gunner','sniper','guardian','bomber','splitter');else if(d.assaultMod==='siege')pool.push('bomber','guardian','gunner','carrier');else pool.push('gunner','sniper','bomber','scout','dart');
  if(t<55)return pool.filter(x=>!['guardian','splitter','carrier'].includes(x));if(t>90)pool.push('guardian','splitter');if(t>135||d.rank>=4)pool.push('healer','carrier');return pool.length?pool:['scout','dart','gunner'];
}
function v20EliteChance(){const d=v20Ensure();if(!d)return .04;let p=.035+d.rank*.018+Math.min(.045,S.time/5000);if(d.assaultMod==='hunter')p+=.10;if(d.rank===5)p+=.035;return Math.min(.28,p);}
updateDirector=function(dt){
  const d=v20Ensure();if(!d||S.phase!=='running')return;if(S.grace>0)S.grace=Math.max(0,S.grace-dt);d.hitWindow=Math.max(0,d.hitWindow-dt);if(d.hitWindow<=0)d.hitWindowCount=0;S.threat*=1+(d.rank-1)*.105+(d.phase==='assault'?.075:0);
  if(S.boss){d.escortTimer-=dt;if(d.rank>=4&&d.escortTimer<=0&&S.enemies.length<65){const t=d.rank===5?pick(['gunner','sniper','guardian']):pick(['scout','gunner','dart']);spawnEnemy(t,rand(82,H-82),{elite:d.rank===5&&chance(.35),x:W+35});d.escortTimer=v20Rand(4.6,7.2);}return;}
  if(S.time>=d.nextBossAt&&d.phase==='recovery'&&d.phaseTime<1.65){spawnBoss(false);d.nextBossAt=S.time+Math.max(70,v20Rand(88,108)-d.rank*3.2);d.escortTimer=4;return;}
  d.phaseTime-=dt;if(d.phase==='recovery'){if(d.phaseTime<=0)v20StartAssault();return;}
  d.spawnTimer-=dt;d.waveTimer-=dt;
  if(d.spawnTimer<=0&&S.enemies.length<92){const pool=v20Pool(),type=pick(pool),elite=chance(v20EliteChance());spawnEnemy(type,rand(58,H-58),{elite,x:W+32});let cadence=.96-.075*(d.rank-1);if(d.assaultMod==='rush')cadence*=.76;if(d.assaultMod==='siege')cadence*=1.10;d.spawnTimer=v20Rand(cadence*.78,cadence*1.14);}
  if(d.waveTimer<=0&&S.enemies.length<82){let mult=1.0+d.rank*.075;if(d.assaultMod==='rush')mult+=.16;if(d.assaultMod==='hunter')mult+=.08;spawnFormation(mult);let gap=6.7-(d.rank-1)*.55;if(d.assaultMod==='siege')gap+=.65;if(d.assaultMod==='rush')gap-=.45;d.waveTimer=v20Rand(Math.max(3.6,gap*.85),Math.max(4.4,gap*1.12));}
  if(!d.assaultBroken&&d.assaultProgress>=d.assaultQuota){d.assaultBroken=true;d.phaseTime=Math.min(d.phaseTime,1.15);v20AddHeat(8,'break');addLaserCharge(.55);banner('FORMATION BROKEN','#ffe071','Early recovery earned · pressure bonus retained');if(typeof v19Impact==='function')v19Impact(S.ship.x+120,S.ship.y,'#ffe071',.85);}
  if(d.phaseTime<=0)v20StartRecovery(d.assaultBroken?'Wave broken':'Assault survived');
};
const __v20EnemyFire=enemyFire;
enemyFire=function(e){
  const d=v20Ensure(),r=__v20EnemyFire(e);if(!d||!e||S.bullets.length>=248)return r;const type=e.type,extra=[];
  if(d.rank>=2&&(type==='gunner'||type==='sniper'))extra.push(-.12,.12);if(d.rank>=3&&type==='bomber')extra.push(-.34,.34);if(d.rank>=3&&type==='guardian')extra.push(0,-.22,.22);if(d.rank>=3&&type==='carrier')extra.push(-.34,.34);if(d.assaultMod==='crossfire'&&['gunner','sniper','bomber'].includes(type))extra.push(-.18,.18);if(d.rank===5&&!['dart','healer'].includes(type))extra.push(-.28,.28);
  const room=Math.max(0,248-S.bullets.length);if(!room||!extra.length)return r;const base=Math.atan2(S.ship.y-e.y,S.ship.x-e.x),baseSpeed=(type==='sniper'?365:225+S.time*.10)*S.combatSpeed*(1+(d.rank-1)*.028);
  for(const off of extra.slice(0,room))S.bullets.push({x:e.x,y:e.y,vx:Math.cos(base+off)*baseSpeed,vy:Math.sin(base+off)*baseSpeed,damage:ENEMIES[type]?.damage||1,life:6,hot:d.rank>=4&&(e.elite||type==='sniper'),v20:true});return r;
};
const __v20UpdateEnemies=updateEnemies;
updateEnemies=function(dt){
  const d=v20Ensure();for(const e of S.enemies){const def=ENEMIES[e.type];e.v20Counter=!!(def&&def.fire<90&&!e.intro&&e.x<W-30&&e.fire>.10&&e.fire<.58);}const old=S.combatSpeed;let speed=1+(d.rank-1)*.022;if(d.assaultMod==='rush'&&d.phase==='assault')speed*=1.13;if(d.assaultMod==='siege'&&d.phase==='assault')speed*=1.04;S.combatSpeed=old*speed;const r=__v20UpdateEnemies(dt);S.combatSpeed=old;for(const e of S.enemies)if(e.fire>.62||e.fire<=0)e.v20Counter=false;return r;
};
const __v20UpdateBoss=updateBoss;
updateBoss=function(dt){const d=v20Ensure(),old=S.combatSpeed;S.combatSpeed=old*(1+(d.rank-1)*.038+(d.assaultMod==='siege'?.045:0));const r=__v20UpdateBoss(dt);S.combatSpeed=old;return r;};
const __v20GainXP=gainXP;
gainXP=function(n){return __v20GainXP(n*v20RewardMult());};
const __v20KillEnemy=killEnemy;
killEnemy=function(e){
  const d=v20Ensure(),counter=!!e?.v20Counter,elite=!!(e&&(e.elite||e.aaaCapital)),laser=!!e?.byLaser;const r=__v20KillEnemy(e);if(!d||!e)return r;if(d.phase==='assault'){d.assaultKills++;d.assaultProgress+=laser?.25:(elite?1.55:1);}v20AddHeat(laser?.08:(e.aaaCapital?7.5:e.elite?3.5:.55),'kill');if(counter&&!laser){d.counterKills++;v20AddHeat(6,'counter');addLaserCharge(.55);gainXP(1.5+d.rank*.6);popup('COUNTER!',e.x,e.y-24,'#ffe071',.72);if(typeof v19Impact==='function')v19Impact(e.x,e.y,'#ffe071',.72);}return r;
};
function v20RegisterHit(before,after){const d=v20Ensure();if(!d||after>=before-.01)return;d.hits++;if(d.phase==='assault')d.assaultHits++;d.heat=Math.max(0,d.heat-24);d.hitWindow=6;d.hitWindowCount++;if(d.rank>1&&d.hitWindowCount>=2){d.rank--;d.rankDowns++;d.heat=Math.min(d.heat,v20Threshold(d.rank)*.30);d.hitWindowCount=0;banner('DANGER RANK '+d.rank,'#8ff7ff','Pressure reduced after sustained damage');}}
const __v20HurtShip=hurtShip;
hurtShip=function(amount){const before=(S.hull||0)+(S.shield||0),r=__v20HurtShip(amount),after=(S.hull||0)+(S.shield||0);v20RegisterHit(before,after);return r;};
function v20PerformanceUpdate(){
  const d=v20Ensure();if(!d||S.phase!=='running')return;const m=S.v18,a=S.v17;
  if(m){const g=Math.max(0,(m.grazes||0)-d.lastGrazes),e=Math.max(0,(m.perfectEvades||0)-d.lastEvades),b=Math.max(0,(m.precisionBursts||0)-d.lastBursts);if(g)v20AddHeat(g*.34,'graze');if(e)v20AddHeat(e*4.8,'evade');if(b)v20AddHeat(b*1.8,'burst');d.lastGrazes=m.grazes||0;d.lastEvades=m.perfectEvades||0;d.lastBursts=m.precisionBursts||0;}
  if(a){const f=Math.max(0,(a.flowBursts||0)-d.lastFlows);if(f)v20AddHeat(f*7,'flow');d.lastFlows=a.flowBursts||0;}const bossGain=Math.max(0,(S.bosses||0)-d.lastBosses);if(bossGain)v20AddHeat(bossGain*18,'boss');d.lastBosses=S.bosses||0;
}
const __v20Update=update;
update=function(dt){const r=__v20Update(dt);v20PerformanceUpdate();return r;};
const __v20UpdateUI=updateUI;
updateUI=function(){const r=__v20UpdateUI(),d=v20Ensure();if(!d||!ui)return r;const pct=((d.rank-1)+v20Clamp(d.heat/Math.max(1,v20Threshold(d.rank)),0,1))/V20_MAX_RANK;ui.threatFill.style.width=(v20Clamp(pct,0,1)*100).toFixed(1)+'%';ui.threatStatus.textContent='R'+d.rank+' · '+(d.phase==='assault'?'ASSAULT':'RECOVERY');return r;};
function v20Draw(){
  const d=v20Ensure();if(!d||S.phase!=='running')return;ctx.save();const mod=V20_MOD_INFO[d.assaultMod]||V20_MOD_INFO.crossfire,x=W*.5-150,y=112,w=300,h=34;ctx.globalAlpha=.90;ctx.fillStyle='rgba(2,8,18,.72)';ctx.fillRect(x,y,w,h);ctx.strokeStyle=d.phase==='assault'?mod.color:'#8ff7ff';ctx.lineWidth=1.5;ctx.strokeRect(x,y,w,h);ctx.fillStyle='#dceaff';ctx.font='bold 10px monospace';ctx.textAlign='left';ctx.fillText('DANGER R'+d.rank+' · '+(d.phase==='assault'?mod.name:'RECOVERY'),x+9,y+13);ctx.textAlign='right';ctx.fillText('REWARD x'+v20RewardMult().toFixed(1),x+w-9,y+13);const phasePct=v20Clamp(d.phaseTime/Math.max(.001,d.phaseMax),0,1);ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(x+8,y+20,w-16,6);ctx.fillStyle=d.phase==='assault'?mod.color:'#8ff7ff';ctx.fillRect(x+8,y+20,(w-16)*(1-phasePct),6);if(d.phase==='assault'){ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='bold 9px monospace';ctx.fillText('BREAK '+Math.floor(d.assaultProgress)+' / '+d.assaultQuota,W*.5,y+32);}for(const e of S.enemies){if(!e||!e.v20Counter||e.hp<=0)continue;const pulse=1+Math.sin(S.time*13+e.y)*.10,r=(e.size||18)+10*pulse;ctx.globalAlpha=.78;ctx.strokeStyle='#ffe071';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,r,0,TWO_PI);ctx.stroke();ctx.fillStyle='#ffe071';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('COUNTER',e.x,e.y-r-7);}if(d.rank===5){ctx.globalAlpha=.10+.05*Math.sin(S.time*5);ctx.strokeStyle='#ff6f78';ctx.lineWidth=5;ctx.strokeRect(3,3,W-6,H-6);}ctx.restore();
}
const __v20Draw=draw;
draw=function(){__v20Draw();v20Draw();};
function v20AppendResults(){if(!S||typeof overlayText==='undefined')return;const d=v20Ensure();if(!d||d.resultAdded||/COMBAT DIRECTOR/.test(overlayText.innerHTML||''))return;d.resultAdded=true;overlayText.innerHTML+='<div class="tactical-results"><strong>COMBAT DIRECTOR</strong><span>Peak danger rank <b>'+d.maxRank+'/5</b></span><span>Assaults broken <b>'+d.assaultsCleared+'/'+d.assault+'</b></span><span>Flawless assault breaks <b>'+d.flawlessAssaults+'</b></span><span>Counter kills <b>'+d.counterKills+'</b></span><span>Rank climbs / drops <b>'+d.rankUps+' / '+d.rankDowns+'</b></span></div>';}
if(typeof window!=='undefined'&&window.__STARWARD__){window.__STARWARD__.v20State=()=>S?.v20||null;window.__STARWARD__.v20AddHeat=v20AddHeat;window.__STARWARD__.v20SetRank=v20SetRank;window.__STARWARD__.v20StartAssault=v20StartAssault;window.__STARWARD__.v20StartRecovery=v20StartRecovery;window.__STARWARD__.v20SpawnEnemy=(type,y,opts)=>spawnEnemy(type,y,opts||{});window.__STARWARD__.v20EnemyFire=e=>enemyFire(e);window.__STARWARD__.v20Hurt=n=>hurtShip(n);window.__STARWARD__.v20RewardMult=v20RewardMult;}
// ---- end V20 mechanics refresh ----
`;
  function apply(source){
    let transformed=base.apply(source);
    for(const hook of ['v19Moment','v18Ensure','v17AddFlow','updateDirector','enemyFire','updateEnemies','v19AppendResults'])if(!transformed.includes(hook))throw new Error('Starward V20 hook missing: '+hook);
    const resultHook="aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();v15AppendResults();v17AppendResults();v18AppendResults();v19AppendResults();choiceGrid.classList.add('hidden');";
    if(!transformed.includes(resultHook))throw new Error('Starward V20 results hook missing');
    transformed=transformed.replace(resultHook,"aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();v15AppendResults();v17AppendResults();v18AppendResults();v19AppendResults();v20AppendResults();choiceGrid.classList.add('hidden');");
    const close=transformed.lastIndexOf('})();');if(close<0)throw new Error('Starward V20 runtime closure not found');
    return transformed.slice(0,close)+V20_BLOCK+'\n'+transformed.slice(close);
  }
  return {apply};
});
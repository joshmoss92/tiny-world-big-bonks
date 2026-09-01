(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v10-polish9.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V10.11 transform missing');

  const V12_BLOCK=String.raw`

// ---- Starward Run V12 manual-aim control and power-core layer ----
const V12_DECISION_GAP=38;
const V12_EVENT_GAP_MIN=26;
const V12_EVENT_GAP_MAX=36;
const V12_LANE_Y=H/2;

const V12_POWER_TYPES=[
  {id:'rapid',name:'RAPID FIRE',icon:'»',color:'#7ff8ff',duration:12,apply:v=>v.buffs.rapid=Math.max(v.buffs.rapid,12*v.powerDuration)},
  {id:'overcharge',name:'OVERCHARGE',icon:'✦',color:'#ffe071',duration:11,apply:v=>v.buffs.overcharge=Math.max(v.buffs.overcharge,11*v.powerDuration)},
  {id:'prism',name:'PRISM AMMO',icon:'◇',color:'#d29cff',duration:13,apply:v=>v.buffs.prism=Math.max(v.buffs.prism,13*v.powerDuration)},
  {id:'critical',name:'CRIT SURGE',icon:'⌖',color:'#ff8fd0',duration:11,apply:v=>v.buffs.critical=Math.max(v.buffs.critical,11*v.powerDuration)},
  {id:'barrage',name:'BARRAGE',icon:'✣',color:'#ffad72',duration:9,apply:v=>v.buffs.barrage=Math.max(v.buffs.barrage,9*v.powerDuration)},
  {id:'shield',name:'SHIELD CELL',icon:'⬡',color:'#8ec8ff',apply:()=>{S.shield=Math.min(S.maxShield,S.shield+Math.max(4,S.maxShield*.34));S.shieldDelay=0;}},
  {id:'repair',name:'NANITE REPAIR',icon:'✚',color:'#8fffb0',apply:()=>S.hull=Math.min(S.maxHull,S.hull+Math.max(3,S.maxHull*.18))},
  {id:'laser',name:'STAR CHARGE',icon:'★',color:'#f5ffff',apply:()=>addLaserCharge(5)},
  {id:'xp',name:'DATA CACHE',icon:'▣',color:'#a6b9ff',apply:()=>gainXP(22)}
];

const V12_EVENT_INFO={
  swarm:{risk:'RISK · HEAVY SWARM',reward:'REWARD · LASER + BETTER UPGRADE'},
  boss:{risk:'RISK · IMMEDIATE BOSS',reward:'REWARD · HIGH-RARITY SALVAGE'},
  hunters:{risk:'RISK · ELITE HUNTERS',reward:'REWARD · LEGENDARY UPGRADE'},
  overdrive:{risk:'RISK · ENEMY FIRE ACCELERATES',reward:'REWARD · PERMANENT DAMAGE'},
  shield:{risk:'RISK · SHIELDS OFFLINE',reward:'REWARD · MAX SHIELD'},
  carrier:{risk:'RISK · CARRIER FLEET',reward:'REWARD · BUILD PROGRESS'},
  powercache:{risk:'RISK · CORES CAN ESCAPE',reward:'REWARD · 3 POWER CORES'},
  gunoverclock:{risk:'RISK · SHIELD DRAIN',reward:'REWARD · RAPID + OVERCHARGE'},
  bountyship:{risk:'RISK · ARMORED WARSHIP',reward:'REWARD · LASER + RARITY'},
  salvageburst:{risk:'RISK · REINFORCEMENTS',reward:'REWARD · INSTANT BUILD DATA'}
};

function v12Ensure(){
  if(!S)return null;
  if(!S.v12){
    S.v12={
      tuned:false,
      aim:{active:false,angle:0,rawX:W*.72,rawY:V12_LANE_Y,pointerId:null,fade:0,target:null},
      powerups:[],nextPowerAt:Math.max(9,S.time+9),
      buffs:{rapid:0,overcharge:0,prism:0,critical:0,barrage:0},
      powerDuration:1,powerFrequency:1,aimDamage:0,shotVelocity:1,shotdownCharge:0,
      shotdowns:0,powerCollected:0,aimedKills:0,bounties:0,eventAccepts:0,manualFrames:0,
      lastAimTarget:null,resultsAdded:false
    };
  }
  const v=S.v12;
  if(!v.tuned){S.shieldRegen=Math.max(S.shieldRegen,.20);v.tuned=true;}
  return v;
}

function v12AnyTimedBuff(v=v12Ensure()){return !!v&&Object.values(v.buffs).some(t=>t>0);}
function v12AngleDiff(a,b){return Math.abs(((a-b+Math.PI*3)%TWO_PI)-Math.PI);}
function v12Coords(ev){
  const r=canvas.getBoundingClientRect?canvas.getBoundingClientRect():{left:0,top:0,width:W,height:H};
  return {x:(((ev.clientX??0)-r.left)*W/r.width),y:(((ev.clientY??0)-r.top)*H/r.height)};
}
function v12SetAim(x,y,active=true){
  if(!S)return false;const v=v12Ensure(),a=v.aim;
  const dx=Math.max(70,x-S.ship.x),dy=y-S.ship.y,angle=clamp(Math.atan2(dy,dx),-1.12,1.12);
  a.active=active;a.angle=angle;a.rawX=clamp(x,S.ship.x+45,W-10);a.rawY=clamp(y,18,H-18);a.fade=1;
  return true;
}
function v12ReleaseAim(){const v=v12Ensure();if(!v)return;v.aim.active=false;v.aim.pointerId=null;v.aim.angle=0;v.aim.rawX=W*.76;v.aim.rawY=S.ship.y;}

function v12EventBox(){
  const x=104,y=H-184,w=752,h=170;
  return {x,y,w,h,accept:{x:x+w-154,y:y+h-45,w:138,h:30}};
}
function v12EventAcceptHit(x,y){const b=v12EventBox().accept;return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;}
function v12WrapText(text,maxChars=68,maxLines=3){
  const words=String(text||'').split(/\s+/),lines=[];let line='';
  for(const word of words){const next=line?line+' '+word:word;if(next.length>maxChars&&line){lines.push(line);line=word;if(lines.length===maxLines-1)break;}else line=next;}
  if(lines.length<maxLines&&line)lines.push(line);
  if(lines.length===maxLines){
    const used=lines.join(' ').split(/\s+/).length;
    if(used<words.length){let tail=lines[maxLines-1];while((tail+' …').length>maxChars)tail=tail.slice(0,-1);lines[maxLines-1]=tail.trim()+' …';}
  }
  return lines;
}
function v12EventLines(){return S?.liveEvent?v12WrapText(S.liveEvent.body,68,3):[];}

function v12PowerAtPointer(){
  const v=v12Ensure();if(!v?.aim.active)return null;
  let best=null,bestD=58;
  for(const p of v.powerups){if(p.dead)continue;const d=dist(v.aim.rawX,v.aim.rawY,p.x,p.y);if(d<bestD){best=p;bestD=d;}}
  return best;
}
function v12RolePriority(e){
  if(!e)return 0;
  if(typeof aaaRole==='function'){const r=aaaRole(e);return r?.priority||0;}
  return e.elite?2:0;
}
function v12FindEnemyAimTarget(){
  const v=v12Ensure();if(!v?.aim.active)return null;
  const a=v.aim.angle,cone=.075+clamp(S.stats.dodge||0,0,.86)*.35;
  let best=null,bestScore=-1e9;
  const scoreTarget=(t,bonus=0)=>{
    if(!t||t.hp<=0)return;
    const dx=t.x-S.ship.x,dy=t.y-S.ship.y;if(dx<30)return;
    const ang=Math.atan2(dy,Math.max(20,dx)),diff=v12AngleDiff(ang,a);if(diff>cone)return;
    const d=Math.hypot(dx,dy),score=bonus+v12RolePriority(t)*42+(t.elite?15:0)+(t.aaaCapital?30:0)-diff*900-d*.018;
    if(score>bestScore){best=t;bestScore=score;}
  };
  if(S.boss)scoreTarget(S.boss,70);
  for(const e of S.enemies)scoreTarget(e,0);
  return best;
}
function v12AimTarget(){
  const p=v12PowerAtPointer();if(p)return p;
  return v12FindEnemyAimTarget();
}
function v12VirtualTarget(){
  const v=v12Ensure(),target=v12AimTarget();if(target)return target;
  const a=v?.aim.active?v.aim.angle:0;
  return {x:S.ship.x+Math.cos(a)*1000,y:S.ship.y+Math.sin(a)*1000,hp:1,maxHp:1,size:1,v12Virtual:true};
}

function v12RefreshFocus(){
  const v=v12Ensure();if(!v)return;
  if(!v.aim.active){v.aim.target=null;return;}
  const target=v12FindEnemyAimTarget();v.aim.target=target;
  if(!target)return;
  if(target!==S.focusTarget){
    if(typeof aaa8ClaimTarget==='function')aaa8ClaimTarget(target);else S.focusTarget=target;
  }
  S.focusTimer=.38;
  const px=v.aim.rawX,py=v.aim.rawY;
  if(target===S.boss&&Array.isArray(S.boss?.parts)){
    let part=null;
    for(const p of S.boss.parts){if(p.hp>0&&dist(px,py,S.boss.x+(p.ox||0),S.boss.y+(p.oy||0))<50){part=p;break;}}
    if(part&&typeof focusEnemy==='function'){focusEnemy(S.boss,part);S.focusTimer=.38;}
  }else if(target.aaaCapital&&target.p2Systems&&typeof p2CapitalNode==='function'){
    let found=null;
    for(const [id,sys] of Object.entries(target.p2Systems)){if(!sys.alive)continue;const n=p2CapitalNode(target,id);if(dist(px,py,n.x,n.y)<48){found=id;break;}}
    S.p2CapitalFocus=found?{e:target,id:found}:null;
  }else S.p2CapitalFocus=null;
}

function v12SpawnPowerup(type=null,y=null,x=null){
  const v=v12Ensure();if(!v)return null;
  const def=type?V12_POWER_TYPES.find(p=>p.id===type):pick(V12_POWER_TYPES);
  if(!def)return null;
  const p={v12Power:true,id:def.id,x:x??W+34,y:y??rand(72,H-72),baseY:y??rand(72,H-72),size:17,t:rand(0,8),dead:false};
  p.baseY=p.y;v.powerups.push(p);return p;
}
function v12ApplyPower(p){
  const v=v12Ensure(),def=V12_POWER_TYPES.find(x=>x.id===p.id);if(!v||!def||p.collected)return false;
  p.collected=true;p.dead=true;def.apply(v);v.powerCollected++;
  popup(def.name,p.x,p.y-24,def.color,1.05);burst(p.x,p.y,def.color,24,260,4);S.screenShake=Math.max(S.screenShake,2.5);
  if(typeof aaa4Haptic==='function')aaa4Haptic([6,12,7]);if(typeof sfx==='function')sfx('focus');
  if(S.specials.powerCascade){for(const k of Object.keys(v.buffs))if(v.buffs[k]>0)v.buffs[k]+=2.5;}
  return true;
}
function v12UpdatePowerups(dt){
  const v=v12Ensure();if(!v||S.phase!=='running')return;
  if(S.time>=v.nextPowerAt){v12SpawnPowerup();v.nextPowerAt=S.time+rand(12.5,17.5)/Math.max(.7,v.powerFrequency);}
  for(const p of v.powerups){p.t+=dt;p.x-=92*dt*(1+S.threat*.025);p.y=p.baseY+Math.sin(p.t*2.3)*18;if(p.x<-35)p.dead=true;}
  v.powerups=v.powerups.filter(p=>!p.dead);
}
function v12UpdateBuffs(dt){const v=v12Ensure();if(!v)return;for(const k of Object.keys(v.buffs))v.buffs[k]=Math.max(0,v.buffs[k]-dt);}

function v12ResolveShotdowns(){
  const v=v12Ensure();if(!v)return 0;let hits=0;
  for(const b of S.bullets){
    if(b.life<=0)continue;
    for(const sh of S.shots){
      if(sh.life<=0)continue;
      if(dist(b.x,b.y,sh.x,sh.y)>11+(b.hot?3:0))continue;
      b.life=0;if(sh.pierce>0)sh.pierce--;else sh.life=0;hits++;v.shotdowns++;
      burst(b.x,b.y,b.hot?'#fff0a5':'#8ff7ff',b.hot?10:6,150,2);
      addLaserCharge(.05+v.shotdownCharge);
      if(S.specials.bulletEater&&v.shotdowns%5===0){S.shield=Math.min(S.maxShield,S.shield+1);addLaserCharge(.8);popup('DEFENSE CHAIN',S.ship.x,S.ship.y-35,'#8ff7ff',.8);}
      break;
    }
  }
  return hits;
}
function v12ResolvePowerupHits(){
  const v=v12Ensure();if(!v)return 0;let n=0;
  for(const p of v.powerups){
    if(p.dead)continue;
    for(const sh of S.shots){
      if(sh.life<=0||dist(p.x,p.y,sh.x,sh.y)>p.size+8)continue;
      if(sh.pierce>0)sh.pierce--;else sh.life=0;if(v12ApplyPower(p))n++;break;
    }
  }
  v.powerups=v.powerups.filter(p=>!p.dead);return n;
}

const __v12Autopilot=updateAutopilot;
updateAutopilot=function(dt){
  v12Ensure();S.ship.targetY=V12_LANE_Y;S.ship.y=V12_LANE_Y;S.ship.tilt=0;S.ship.inv=Math.max(0,S.ship.inv-dt);
};

const __v12DamageMultiplier=damageMultiplier;
damageMultiplier=function(){const v=v12Ensure();let m=__v12DamageMultiplier();if(v?.buffs.overcharge>0)m*=1.48;if(S.specials.arsenalBloom&&v12AnyTimedBuff(v))m*=1.20;return m;};
const __v12FireRateMultiplier=fireRateMultiplier;
fireRateMultiplier=function(){const v=v12Ensure();let m=__v12FireRateMultiplier();if(v?.buffs.rapid>0)m*=1.68;if(S.specials.arsenalBloom&&v12AnyTimedBuff(v))m*=1.12;return m;};

const __v12UpdateWeapons=updateWeapons;
updateWeapons=function(dt){
  const v=v12Ensure();v12RefreshFocus();const before=S.shots.length,target=v12AimTarget(),virtual=target||v12VirtualTarget(),oldNearest=nearestTarget;
  nearestTarget=()=>virtual;
  try{__v12UpdateWeapons(dt);}finally{nearestTarget=oldNearest;}
  const speedScale=Math.max(.86,1+(S.stats.speed-1.28)*.38+(v.shotVelocity-1));
  const fresh=S.shots.slice(before);
  for(const sh of fresh){
    sh.vx*=speedScale;sh.vy*=speedScale;sh.v12Manual=true;
    if(v.buffs.prism>0){sh.pierce=(sh.pierce||0)+2;sh.splash=(sh.splash||0)+1;}
    if(v.buffs.critical>0&&!sh.crit&&chance(.28)){sh.crit=true;sh.damage*=1.8;}
    if(v.aim.active&&v.aim.target){sh.damage*=1+v.aimDamage;if(S.specials.deadeyeCore)sh.damage*=1.35;}
  }
  if(v.buffs.barrage>0&&fresh.length&&S.shots.length<240){
    const clones=[];
    for(let i=0;i<Math.min(10,fresh.length);i+=2){const sh=fresh[i],a=Math.atan2(sh.vy,sh.vx)+(i%4?-.055:.055),speed=Math.hypot(sh.vx,sh.vy);clones.push({...sh,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,damage:sh.damage*.72,trail:[]});}
    S.shots.push(...clones);
  }
};

const __v12UpdateProjectiles=updateProjectiles;
updateProjectiles=function(dt){
  v12ResolveShotdowns();
  const v=v12Ensure(),oldNearest=nearestTarget,target=v?.aim.active?v12AimTarget():null;if(target)nearestTarget=()=>target;
  try{__v12UpdateProjectiles(dt);}finally{nearestTarget=oldNearest;}
  v12ResolveShotdowns();v12ResolvePowerupHits();
};

const __v12EnemyFire=enemyFire;
enemyFire=function(e){
  const before=S.bullets.length,r=__v12EnemyFire(e);
  for(let i=before;i<S.bullets.length;i++){const b=S.bullets[i],f=b.hot?.90:.80;b.vx*=f;b.vy*=f;b.v12Interceptable=true;}
  return r;
};
if(typeof updateBoss==='function'){
  const __v12UpdateBoss=updateBoss;
  updateBoss=function(dt){const before=S.bullets.length,r=__v12UpdateBoss(dt);for(let i=before;i<S.bullets.length;i++){const b=S.bullets[i],f=b.hot?.92:.84;b.vx*=f;b.vy*=f;b.v12Interceptable=true;}return r;};
}

const __v12GainXP=gainXP;
gainXP=function(n){return __v12GainXP(n*1.12);};
maybeQueueBuildChoice=function(){
  if(!S.upgradeReady||S.buildChoiceQueued||S.phase!=='running')return;
  if(S.time-S.lastDecisionAt<V12_DECISION_GAP)return;
  if(S.liveEvent||S.boss&&S.boss.forced)return;
  S.buildChoiceQueued=true;showBuildChoice();
};

const __v12StartLiveEvent=startLiveEvent;
startLiveEvent=function(){const r=__v12StartLiveEvent();if(S.liveEvent)S.nextLiveEventAt=S.time+rand(V12_EVENT_GAP_MIN,V12_EVENT_GAP_MAX);return r;};

if(!LIVE_EVENTS.some(e=>e.kind==='powercache'))LIVE_EVENTS.push(
  {kind:'powercache',color:'#8ff7ff',title:'POWER CACHE DETECTED',body:'Accept to release three power cores into the combat lane. Aim at the cores and shoot them before they escape.',accept(){v12SpawnPowerup(null,H*.28,W+30);v12SpawnPowerup(null,H*.50,W+92);v12SpawnPowerup(null,H*.72,W+154);banner('POWER CACHE OPEN','#8ff7ff','Three shoot-to-collect cores inbound');}},
  {kind:'gunoverclock',color:'#ffe071',title:'OVERCLOCK THE GUNS',body:'Accept to drain most of your current shield for fourteen seconds of Rapid Fire and Overcharge.',available:()=>S.shield>2,accept(){const v=v12Ensure();S.shield*=.35;S.shieldDelay=Math.max(S.shieldDelay,8);v.buffs.rapid=Math.max(v.buffs.rapid,14*v.powerDuration);v.buffs.overcharge=Math.max(v.buffs.overcharge,14*v.powerDuration);banner('GUNS OVERCLOCKED','#ffe071','Manual aim damage and fire rate surged');}},
  {kind:'bountyship',color:'#ff9b71',title:'MARK A WARSHIP',body:'Accept to call in a reinforced priority warship. Destroy it for Star Laser charge and a better next upgrade.',available:()=>S.time>=55,accept(){let e=spawnEnemy('carrier',rand(120,H-120),{elite:true,x:W+70});if(!e)e=spawnEnemy('gunner',H/2,{elite:true,x:W+70});if(e){e.v12Bounty=true;e.hp*=1.35;e.maxHp=e.hp;banner('BOUNTY MARKED','#ff9b71','Aim and hold fire on the marked warship');}}},
  {kind:'salvageburst',color:'#a6b9ff',title:'GRAB THE COMBAT DATA',body:'Accept an immediate burst of build progress, but enemy reinforcements arrive at the same time.',available:()=>S.time>=35,accept(){gainXP(24);for(let i=0;i<14;i++)spawnEnemy(i%4===0?'gunner':'dart',rand(65,H-65),{x:W+25+(i%6)*34});banner('DATA ACQUIRED','#a6b9ff','Build progress gained · reinforcements inbound');}}
);

const __v12KillEnemy=killEnemy;
killEnemy=function(e){
  const v=v12Ensure(),aimed=!!(v?.aim.active&&S.focusTarget===e&&S.focusTimer>0),bounty=!!e?.v12Bounty,x=e?.x||0,y=e?.y||0,r=__v12KillEnemy(e);
  if(!S)return r;
  if(aimed){v.aimedKills++;if(S.specials.kineticShield)S.shield=Math.min(S.maxShield,S.shield+.35);}
  if(bounty){v.bounties++;addLaserCharge(5);S.nextUpgradeRarity=Math.max(S.nextUpgradeRarity||0,2);v12SpawnPowerup(null,y,Math.max(S.ship.x+240,x));banner('BOUNTY DESTROYED','#ffe071','Star charge gained · next upgrade improved');}
  return r;
};

function v12DrawPowerups(){
  const v=v12Ensure();if(!v||S.phase!=='running')return;
  for(const p of v.powerups){const def=V12_POWER_TYPES.find(x=>x.id===p.id);if(!def)continue;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.t*1.4);ctx.shadowColor=def.color;ctx.shadowBlur=16;ctx.fillStyle='#07111f';ctx.strokeStyle=def.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(18,0);ctx.lineTo(0,18);ctx.lineTo(-18,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.rotate(-p.t*1.4);ctx.shadowBlur=0;ctx.fillStyle=def.color;ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText(def.icon,0,5);ctx.font='bold 8px monospace';ctx.fillText(def.name,0,32);ctx.restore();}
}

const __v12DrawLiveEvent=drawLiveEvent;
drawLiveEvent=function(){
  v12DrawPowerups();
  if(!S.liveEvent)return;
  const e=S.liveEvent,pct=clamp(e.time/e.max,0,1),box=v12EventBox(),info=V12_EVENT_INFO[e.kind]||{risk:'OPTIONAL · LIVE DECISION',reward:'REWARD · RUN ADVANTAGE'},lines=v12EventLines();
  ctx.save();ctx.globalAlpha=.97;ctx.fillStyle='#040914f2';ctx.fillRect(box.x,box.y,box.w,box.h);ctx.strokeStyle=e.color;ctx.lineWidth=3;ctx.strokeRect(box.x,box.y,box.w,box.h);
  ctx.fillStyle=e.color;ctx.font='bold 20px monospace';ctx.textAlign='left';ctx.fillText(e.title,box.x+18,box.y+28);
  ctx.fillStyle='#e6efff';ctx.font='14px monospace';for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],box.x+18,box.y+55+i*18);
  ctx.font='bold 11px monospace';ctx.fillStyle='#ff9d8e';ctx.fillText(info.risk,box.x+18,box.y+113);ctx.fillStyle='#8fffb0';ctx.fillText(info.reward,box.x+265,box.y+113);
  ctx.fillStyle='#1b2941';ctx.fillRect(box.x+18,box.y+137,box.w-196,8);ctx.fillStyle=e.color;ctx.fillRect(box.x+18,box.y+137,(box.w-196)*pct,8);
  const b=box.accept;ctx.fillStyle=e.color;ctx.globalAlpha=.95;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.globalAlpha=1;ctx.fillStyle='#04101a';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('ACCEPT · '+e.time.toFixed(1)+'s',b.x+b.w/2,b.y+20);ctx.restore();
};

const __v12DrawShip=drawShip;
drawShip=function(){
  __v12DrawShip();if(!S||S.phase!=='running')return;const v=v12Ensure(),a=v?.aim.active?v.aim.angle:0;
  ctx.save();ctx.translate(S.ship.x,S.ship.y);ctx.rotate(a);ctx.shadowColor='#bdfcff';ctx.shadowBlur=10;ctx.strokeStyle='#dfffff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(40,0);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.fillRect(36,-2,8,4);ctx.restore();
};

function v12DrawAim(){
  const v=v12Ensure();if(!v||S.phase!=='running')return;const a=v.aim,target=a.target;
  if(a.active){
    v.manualFrames++;const endX=S.ship.x+Math.cos(a.angle)*760,endY=S.ship.y+Math.sin(a.angle)*760;
    ctx.save();ctx.globalAlpha=.34;ctx.strokeStyle=target?'#fff19a':'#8ff7ff';ctx.lineWidth=2;ctx.setLineDash?.([7,9]);ctx.beginPath();ctx.moveTo(S.ship.x+35,S.ship.y);ctx.lineTo(endX,endY);ctx.stroke();ctx.setLineDash?.([]);
    const x=a.rawX,y=a.rawY,r=target?18:14;ctx.globalAlpha=.82;ctx.strokeStyle=target?'#ffe071':'#8ff7ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,TWO_PI);ctx.stroke();ctx.beginPath();ctx.moveTo(x-r-8,y);ctx.lineTo(x-r+2,y);ctx.moveTo(x+r-2,y);ctx.lineTo(x+r+8,y);ctx.moveTo(x,y-r-8);ctx.lineTo(x,y-r+2);ctx.moveTo(x,y+r-2);ctx.lineTo(x,y+r+8);ctx.stroke();ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=target?'#ffe071':'#bdefff';ctx.fillText(target?'LOCKED':'MANUAL AIM',x,y+r+18);ctx.restore();
  }else if(S.time<12&&!S.liveEvent){ctx.save();ctx.globalAlpha=clamp((12-S.time)/5,0,.9);ctx.fillStyle='#07111ee6';ctx.fillRect(W/2-205,H-54,410,31);ctx.fillStyle='#dffcff';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText('HOLD + DRAG TO AIM · RELEASE = FIRE FORWARD',W/2,H-34);ctx.restore();}
}
function v12DrawBuffs(){
  const v=v12Ensure();if(!v||S.phase!=='running')return;const active=Object.entries(v.buffs).filter(([,t])=>t>.05);if(!active.length)return;
  let y=S.focusTarget&&S.focusTimer>0?108:42;ctx.save();ctx.textAlign='left';ctx.font='bold 9px monospace';for(const [id,t] of active.slice(0,4)){const def=V12_POWER_TYPES.find(x=>x.id===id);ctx.fillStyle='#05101fdc';ctx.fillRect(14,y,128,19);ctx.strokeStyle=def?.color||'#8ff7ff';ctx.strokeRect(14,y,128,19);ctx.fillStyle=def?.color||'#fff';ctx.fillText((def?.name||id.toUpperCase())+' '+Math.ceil(t)+'s',21,y+13);y+=23;}ctx.restore();
}

const __v12Draw=draw;
draw=function(){__v12Draw();v12DrawBuffs();v12DrawAim();};

const __v12Update=update;
update=function(dt){
  __v12Update(dt);if(!S)return;const v=v12Ensure();if(S.phase!=='running')return;
  v12UpdateBuffs(dt);v12UpdatePowerups(dt);v12RefreshFocus();if(!v.aim.active)v.aim.fade=Math.max(0,v.aim.fade-dt*5);
};

function v12PointerDown(ev){
  if(!S||S.phase!=='running')return;const p=v12Coords(ev);ev.preventDefault?.();ev.stopImmediatePropagation?.();
  if(S.liveEvent&&v12EventAcceptHit(p.x,p.y)){v12Ensure().eventAccepts++;acceptLiveEvent();return;}
  const v=v12Ensure();v.aim.pointerId=ev.pointerId??0;v12SetAim(p.x,p.y,true);canvas.setPointerCapture?.(ev.pointerId);
}
function v12PointerMove(ev){const v=v12Ensure();if(!S||S.phase!=='running'||!v?.aim.active)return;if(v.aim.pointerId!==null&&ev.pointerId!==undefined&&ev.pointerId!==v.aim.pointerId)return;const p=v12Coords(ev);ev.preventDefault?.();ev.stopImmediatePropagation?.();v12SetAim(p.x,p.y,true);}
function v12PointerUp(ev){const v=v12Ensure();if(!v?.aim.active)return;ev.preventDefault?.();ev.stopImmediatePropagation?.();canvas.releasePointerCapture?.(ev.pointerId);v12ReleaseAim();}
canvas.removeEventListener?.('pointerdown',handlePointer);
canvas.addEventListener('pointerdown',v12PointerDown,true);canvas.addEventListener('pointermove',v12PointerMove,true);canvas.addEventListener('pointerup',v12PointerUp,true);canvas.addEventListener('pointercancel',v12PointerUp,true);

const v12LaserButton=typeof $==='function'?$('laserButton'):document.getElementById('laserButton');
if(v12LaserButton)v12LaserButton.addEventListener('click',()=>{const ok=releaseStarLaser();if(ok&&typeof aaa4Haptic==='function')aaa4Haptic([12,30,18]);});

function v12AppendResults(){
  if(!S||typeof overlayText==='undefined')return;const v=v12Ensure();if(!v||v.resultsAdded||/AIM CONTROL/.test(overlayText.innerHTML||''))return;v.resultsAdded=true;
  overlayText.innerHTML+='<div class="tactical-results"><strong>AIM CONTROL</strong><span>Manual-target kills <b>'+v.aimedKills+'</b></span><span>Power cores <b>'+v.powerCollected+'</b></span><span>Shots intercepted <b>'+v.shotdowns+'</b></span><span>Bounties destroyed <b>'+v.bounties+'</b></span></div>';
}

(function v12PatchUpgradeLanguage(){
  const dodge=UPGRADE_DEFS.find(x=>x.id==='dodge');if(dodge){dodge.category='CONTROL';dodge.name='Aim Assist';dodge.desc='Widen the magnetic cone around enemies close to your firing direction.';dodge.effect=v=>'+ '+Math.round(v*100)+'% targeting assist';}
  const speed=UPGRADE_DEFS.find(x=>x.id==='speed');if(speed){speed.category='CONTROL';speed.name='Projectile Velocity';speed.desc='Shots reach your manual aim point faster and intercept threats sooner.';speed.effect=v=>'+ '+Math.round(v*100)+'% projectile handling';}
  const agile=SYNERGIES.find(x=>x.id==='agile');if(agile){agile.name='Fire Control';agile.desc='Aim assist and projectile handling combine into a precision fire-control suite.';}
  const add=d=>{if(!UPGRADE_DEFS.some(x=>x.id===d.id))UPGRADE_DEFS.push(d);};
  add({id:'aimPower',category:'CONTROL',name:'Deadeye Calibration',group:'offense',base:.08,desc:'Deal more damage while your finger is actively holding aim on a target.',effect:v=>'+ '+Math.round(v*100)+'% manual-aim damage',apply:v=>v12Ensure().aimDamage+=v});
  add({id:'shotVelocity',category:'OFFENSE',name:'Accelerator Coils',group:'offense',base:.10,desc:'Increase the velocity of every projectile without increasing screen clutter.',effect:v=>'+ '+Math.round(v*100)+'% projectile velocity',apply:v=>v12Ensure().shotVelocity+=v});
  add({id:'powerDuration',category:'UTILITY',name:'Power Core Capacitor',group:'utility',base:.15,desc:'Temporary power-core effects stay active for longer.',effect:v=>'+ '+Math.round(v*100)+'% power-up duration',apply:v=>v12Ensure().powerDuration+=v});
  add({id:'powerFrequency',category:'UTILITY',name:'Salvage Scanner',group:'utility',base:.12,desc:'Power cores appear more frequently during combat.',effect:v=>'+ '+Math.round(v*100)+'% power-core frequency',apply:v=>v12Ensure().powerFrequency+=v});
  add({id:'shotdownCharge',category:'COMMAND',name:'Interceptor Dynamo',group:'utility',base:.035,desc:'Shooting down enemy projectiles contributes more Star Laser energy.',effect:v=>'+ '+Math.round(v*100)+' Star charge per interception',apply:v=>v12Ensure().shotdownCharge+=v});
  const addSpecial=s=>{if(!SPECIALS.some(x=>x.id===s.id))SPECIALS.push(s);};
  addSpecial({id:'deadeyeCore',name:'Deadeye Core',category:'SPECIAL',rarity:2,desc:'Manual aim becomes a true damage stance.',effect:'+35% damage while actively aimed at a target',apply(){S.specials.deadeyeCore=1;}});
  addSpecial({id:'bulletEater',name:'Bullet Eater',category:'SPECIAL',rarity:2,desc:'Precise defensive fire feeds the ship.',effect:'Every 5 projectile interceptions restore shield and Star charge',apply(){S.specials.bulletEater=1;}});
  addSpecial({id:'powerCascade',name:'Power Cascade',category:'SPECIAL',rarity:3,desc:'Every collected power core reinforces all currently active temporary buffs.',effect:'Power pickups extend active buffs by 2.5 seconds',apply(){S.specials.powerCascade=1;}});
  addSpecial({id:'arsenalBloom',name:'Arsenal Bloom',category:'SPECIAL',rarity:3,desc:'Any temporary power-up pushes the whole weapon system harder.',effect:'+20% damage and +12% fire rate while powered up',apply(){S.specials.arsenalBloom=1;}});
  addSpecial({id:'kineticShield',name:'Kinetic Shield',category:'SPECIAL',rarity:3,desc:'Manual-target eliminations feed energy directly back into the shield.',effect:'Aimed kills restore a small amount of shield',apply(){S.specials.kineticShield=1;}});
  if(typeof statPreview==='function'){
    const old=statPreview;statPreview=function(item,v){if(item.id==='dodge')return 'WIDER AIM ASSIST CONE';if(item.id==='speed')return '+'+Math.round(v*100)+'% PROJECTILE HANDLING';return old(item,v);};
  }
})();

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.v12State=()=>S?.v12||null;
  window.__STARWARD__.v12SetAim=(x,y)=>v12SetAim(x,y,true);
  window.__STARWARD__.v12ReleaseAim=v12ReleaseAim;
  window.__STARWARD__.v12AimTarget=v12AimTarget;
  window.__STARWARD__.v12SpawnPowerup=v12SpawnPowerup;
  window.__STARWARD__.v12CollectPowerup=v12ApplyPower;
  window.__STARWARD__.v12ResolveShotdowns=v12ResolveShotdowns;
  window.__STARWARD__.v12EventAcceptRect=()=>v12EventBox().accept;
  window.__STARWARD__.v12EventLines=v12EventLines;
  window.__STARWARD__.v12FireTick=()=>updateWeapons(.016);
}
// ---- end V12 manual-aim layer ----
`;

  function apply(source){
    let transformed=base.apply(source);
    for(const hook of ['updateAutopilot','updateWeapons','drawLiveEvent','aaa8EnsureResultsStack','V12'])void hook;
    if(!transformed.includes('function updateAutopilot'))throw new Error('Starward V12 autopilot hook missing');
    if(!transformed.includes('function drawLiveEvent'))throw new Error('Starward V12 live-event hook missing');
    const resultHook="aaa8EnsureResultsStack();choiceGrid.classList.add('hidden');";
    if(!transformed.includes(resultHook))throw new Error('Starward V12 results hook missing');
    transformed=transformed.replace(resultHook,"aaa8EnsureResultsStack();v12AppendResults();choiceGrid.classList.add('hidden');");
    transformed=transformed.replace('4 OF 5 · AUTOPILOT','4 OF 5 · FIRE CONTROL');
    transformed=transformed.replace('Autopilot engaged · survive the opening rush','Hold to aim · shoot threats and power cores');
    const close=transformed.lastIndexOf('})();');
    if(close<0)throw new Error('Starward V12 runtime closure not found');
    return transformed.slice(0,close)+V12_BLOCK+'\n'+transformed.slice(close);
  }
  return {apply};
});

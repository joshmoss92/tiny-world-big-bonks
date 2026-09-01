(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.StarwardV10Transform=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const ENHANCEMENT_BLOCK = String.raw`

// ---- Starward Run V10 tactical depth layer ----
const AAA_ROLE_INFO={
  healer:{icon:'✚',label:'HEALER',priority:3},
  sniper:{icon:'⌖',label:'SNIPER',priority:3},
  carrier:{icon:'▣',label:'CARRIER',priority:3},
  bomber:{icon:'◆',label:'BOMBER',priority:2},
  guardian:{icon:'⬡',label:'GUARD',priority:2},
  splitter:{icon:'✣',label:'SPLITTER',priority:2},
  gunner:{icon:'▰',label:'GUNNER',priority:1},
  scout:{icon:'›',label:'SCOUT',priority:0},
  dart:{icon:'»',label:'INTERCEPTOR',priority:0}
};
const AAA_AFFIX_ROLES={commander:'COMMAND',shielded:'SHIELDED',berserker:'BERSERK',vampire:'VAMPIRE',armored:'ARMORED',cloaked:'CLOAKED',phase:'PHASE',splitter:'SPLITTER'};

function aaaEnsureState(){
  if(!S)return;
  if(S.aaa)return;
  S.aaa={
    tutorialSpawned:false,nextFormationAt:22,nextCapitalAt:52,nextPriorityAlertAt:16,
    bossWasAlive:false,focusKills:0,capitalKills:0,lastTargetRewardAt:-99,performancePressure:0,focusCapitalSystem:null
  };
}

function aaaRole(e){
  if(!e)return {icon:'',label:'',priority:0};
  if(e.aaaCapital)return {icon:'⬢',label:'WARSHIP',priority:4};
  if(e.affix&&AAA_AFFIX_ROLES[e.affix.id])return {icon:'★',label:AAA_AFFIX_ROLES[e.affix.id],priority:e.affix.id==='commander'?4:3};
  return AAA_ROLE_INFO[e.type]||{icon:'•',label:String(e.type||'HOSTILE').toUpperCase(),priority:1};
}

function aaaWeaponFocusMultiplier(key,target){
  if(!target||S.focusTarget!==target||S.focusTimer<=0)return 1;
  if(key==='rail')return 1.32;
  if(key==='missile')return 1.16;
  if(key==='drone')return 1.22;
  if(key==='beam')return 1.10+Math.min(.28,(8-S.focusTimer)*.04);
  if(key==='arc')return 1.14;
  if(key==='nova'||key==='flak')return 1.10;
  return 1.06;
}

function aaaMarkEnemy(e){
  if(!e)return e;
  e.aaaBornAt=S?.time||0;
  e.aaaLaunchAt=(S?.time||0)+rand(3.2,5.2);
  e.aaaHitFlash=0;
  e.aaaLastHp=e.hp;
  return e;
}

const __aaaSpawnEnemy=spawnEnemy;
spawnEnemy=function(type,y,opts){return aaaMarkEnemy(__aaaSpawnEnemy(type,y,opts));};

function aaaSpawnPriorityFormation(){
  if(!S||S.enemies.length>MAX_ENEMIES-7)return false;
  const y=rand(125,H-125),x=W+90;
  const anchor=spawnEnemy(chance(.48)?'healer':'carrier',y,{x:x+70});
  if(anchor){anchor.aaaFormationAnchor=true;anchor.hp*=1.2;anchor.maxHp=anchor.hp;}
  const guards=[];
  for(const [dx,dy,type] of [[0,-72,'guardian'],[0,72,'guardian'],[-55,-108,'gunner'],[-55,108,'gunner'],[-90,-38,'scout'],[-90,38,'scout']]){
    const e=spawnEnemy(type,y+dy,{x:x+dx});if(e){e.aaaFormation=true;guards.push(e);}
  }
  banner('ESCORT FORMATION','#ffd96f',anchor?.type==='healer'?'Healer protected by a guard screen':'Carrier protected by a guard screen');
  return true;
}

function aaaSpawnCapital(){
  if(!S||S.enemies.length>MAX_ENEMIES-8)return false;
  const y=rand(150,H-150),e=spawnEnemy('carrier',y,{x:W+105});
  if(!e)return false;
  e.aaaCapital=true;e.elite=true;e.size=Math.max(e.size,45);e.hp*=2.7;e.maxHp=e.hp;e.fire=Math.min(e.fire||2,1.5);e.aaaLaunchAt=S.time+2.2;e.color='#ffd36f';
  e.aaaSystems=[
    {id:'weapons',label:'WEAPONS',ox:12,oy:-18,hp:e.maxHp*.22,maxHp:e.maxHp*.22},
    {id:'hangar',label:'HANGAR',ox:10,oy:18,hp:e.maxHp*.20,maxHp:e.maxHp*.20},
    {id:'engines',label:'ENGINES',ox:-27,oy:0,hp:e.maxHp*.18,maxHp:e.maxHp*.18}
  ];
  for(let i=0;i<4;i++){const g=spawnEnemy(i<2?'guardian':'gunner',y+(i-1.5)*62,{x:W+30+i*18});if(g){g.aaaEscort=true;g.hp*=1.15;g.maxHp=g.hp;}}
  banner('CAPITAL SHIP','#ffcf67','A fighter-launching warship has entered the lane');
  S.screenShake=Math.max(S.screenShake,6);
  return true;
}

function aaaPriorityTarget(){
  if(!S)return null;
  let best=null,bestScore=-1;
  for(const e of S.enemies){
    if(!e||e.hp<=0)continue;
    const r=aaaRole(e),score=r.priority*100+(e.elite?30:0)+(e.aaaCapital?80:0)-(e.x/W)*10;
    if(score>bestScore){bestScore=score;best=e;}
  }
  return best;
}

function aaaEnemySystems(dt){
  aaaEnsureState();
  const now=S.time;
  for(const e of S.enemies){
    if(!e||e.hp<=0)continue;
    e.aaaHitFlash=Math.max(0,(e.aaaHitFlash||0)-dt);
    if(e.aaaLastHp!=null&&e.hp<e.aaaLastHp)e.aaaHitFlash=.12;
    e.aaaLastHp=e.hp;
    e.aaaGuarded=false;
  }
  for(const g of S.enemies){
    if(!g||g.hp<=0||g.type!=='guardian')continue;
    for(const e of S.enemies)if(e!==g&&e.hp>0&&dist(g.x,g.y,e.x,e.y)<125)e.aaaGuarded=true;
  }
  for(const c of S.enemies){
    if(!c||c.hp<=0)continue;
    if(c.affix?.id==='commander'){
      for(const e of S.enemies){if(e!==c&&e.hp>0&&dist(c.x,c.y,e.x,e.y)<180){e.hp=Math.min(e.maxHp,e.hp+2.2*dt);e.fire=Math.max(.03,e.fire-.16*dt);}}
    }
    const capSystems=c.aaaCapital&&Array.isArray(c.aaaSystems)?Object.fromEntries(c.aaaSystems.map(x=>[x.id,x])):null;
    if(c.aaaCapital&&capSystems){
      if(capSystems.engines?.hp<=0)c.x+=ENEMIES[c.type].speed*S.combatSpeed*dt*.42;
      if(capSystems.weapons?.hp<=0)c.fire+=dt*.38;
    }
    const hangarOnline=!capSystems||capSystems.hangar?.hp>0;
    if((c.type==='carrier'||c.aaaCapital)&&hangarOnline&&now>=(c.aaaLaunchAt||0)&&S.enemies.length<MAX_ENEMIES-3){
      c.aaaLaunchAt=now+(c.aaaCapital?3.7:5.6);
      const n=c.aaaCapital?3:2;
      for(let i=0;i<n;i++){const d=spawnEnemy('dart',c.y+(i-(n-1)/2)*24,{x:c.x-12});if(d){d.aaaLaunched=true;d.baseY=d.y;}}
      if(c.aaaCapital)popup('FIGHTERS',c.x,c.y-42,'#ffd36f',.8);
    }
  }
}

const __aaaUpdateEnemies=updateEnemies;
updateEnemies=function(dt){__aaaUpdateEnemies(dt);if(S&&S.phase==='running')aaaEnemySystems(dt);};

const __aaaUpdateProjectiles=updateProjectiles;
updateProjectiles=function(dt){
  if(!S)return __aaaUpdateProjectiles(dt);
  const before=new Map(S.enemies.map(e=>[e,e.hp]));
  const bossBefore=S.boss?S.boss.hp:null;
  __aaaUpdateProjectiles(dt);
  for(const [e,hp] of before){
    if(e.hp<hp&&e.hp>0&&e.aaaGuarded&&S.focusTarget!==e){const lost=hp-e.hp;e.hp+=lost*.24;}
    if(e.hp<hp&&e.aaaCapital&&S.aaa?.focusCapitalSystem?.enemy===e&&S.focusTimer>0){
      const sys=S.aaa.focusCapitalSystem.system,lost=hp-e.hp;
      if(sys&&sys.hp>0){
        const was=sys.hp;sys.hp=Math.max(0,sys.hp-lost*1.35);
        if(was>0&&sys.hp<=0){
          addLaserCharge(1.5);gainXP(2);S.screenShake=Math.max(S.screenShake,7);burst(e.x+sys.ox,e.y+sys.oy,'#fff1a8',36,320,4);
          banner(sys.label+' OFFLINE','#ffe08a',sys.id==='weapons'?'Enemy fire rate crippled':sys.id==='hangar'?'Fighter launches stopped':'Warship movement crippled');
          const next=e.aaaSystems.find(x=>x.hp>0);S.aaa.focusCapitalSystem=next?{enemy:e,system:next}:null;
        }
      }
    }
  }
  if(S.boss&&bossBefore!=null&&S.boss.hp<bossBefore&&Array.isArray(S.boss.parts)){
    const lost=bossBefore-S.boss.hp;
    const alive=S.boss.parts.filter(p=>p.hp>0);
    const shield=S.boss.parts[1];
    if(shield&&shield.hp>0)S.boss.hp+=lost*.24;
    if(alive.length===0)S.boss.hp-=lost*.28;
  }
};

const __aaaKillEnemy=killEnemy;
killEnemy=function(e){
  const wasFocused=!!(S&&S.focusTarget===e&&S.focusTimer>0),role=aaaRole(e),capital=!!e.aaaCapital,elite=!!e.elite;
  __aaaKillEnemy(e);
  if(wasFocused&&role.priority>=2&&S&&S.phase!=='dead'){
    aaaEnsureState();S.aaa.focusKills++;
    addLaserCharge(capital?5:2.5);gainXP(capital?6:2);
    S.shield=Math.min(S.maxShield,S.shield+(capital?2:1));
    if(S.time-S.aaa.lastTargetRewardAt>2){banner('TARGET DESTROYED','#8ff7ff',capital?'Warship broken · laser + shield boosted':role.label+' removed · laser charge gained');S.aaa.lastTargetRewardAt=S.time;}
  }
  if(capital&&S){aaaEnsureState();S.aaa.capitalKills++;S.grace=Math.max(S.grace,4);S.bullets.length=0;burst(e.x,e.y,'#ffe08a',90,500,7);S.screenShake=Math.max(S.screenShake,15);}
  else if(elite&&S){burst(e.x,e.y,e.color||'#fff',28,300,4);S.screenShake=Math.max(S.screenShake,5);}
};

function aaaBossSystemRoles(b){
  if(!b||!Array.isArray(b.parts))return;
  const names=['WEAPONS','SHIELD','ENGINES','REACTOR'];
  for(let i=0;i<b.parts.length;i++)if(!b.parts[i].aaaRole)b.parts[i].aaaRole=names[i]||'SYSTEM '+(i+1);
}

if(typeof spawnBoss==='function'){
  const __aaaSpawnBoss=spawnBoss;
  spawnBoss=function(forced){const r=__aaaSpawnBoss(forced);aaaBossSystemRoles(S?.boss);return r;};
}

if(typeof updateBoss==='function'){
  const __aaaUpdateBoss=updateBoss;
  updateBoss=function(dt){
    const b=S?.boss,prevY=b?.y,beforeBullets=S?.bullets?.length||0;
    __aaaUpdateBoss(dt);
    const after=S?.boss;
    if(after&&Array.isArray(after.parts)){
      aaaBossSystemRoles(after);
      const weapons=after.parts[0],engines=after.parts[2];
      if(engines&&engines.hp<=0&&prevY!=null)after.y=prevY+(after.y-prevY)*.42;
      if(weapons&&weapons.hp<=0&&S.bullets.length>beforeBullets){
        const old=S.bullets.slice(0,beforeBullets),fresh=S.bullets.slice(beforeBullets).filter((_,i)=>i%3!==0);S.bullets=old.concat(fresh);
      }
    }
  };
}

function aaaUpdate(dt){
  aaaEnsureState();
  if(!S||S.phase!=='running')return;
  const a=S.aaa;
  if(!a.tutorialSpawned&&S.time>9){
    a.tutorialSpawned=true;
    const h=spawnEnemy('healer',H*.38,{x:W+35});if(h){h.hp*=1.35;h.maxHp=h.hp;h.aaaTutorial=true;}
    for(const dy of [-62,62]){const g=spawnEnemy('guardian',H*.38+dy,{x:W+5});if(g)g.aaaTutorial=true;}
    banner('PRIORITY TARGET','#8ff7ff','Tap the HEALER to focus the entire arsenal');
  }
  if(S.time>=a.nextFormationAt){a.nextFormationAt=S.time+rand(29,38);aaaSpawnPriorityFormation();}
  if(S.time>=a.nextCapitalAt){a.nextCapitalAt=S.time+rand(70,92);aaaSpawnCapital();}
  if(S.time>=a.nextPriorityAlertAt){
    a.nextPriorityAlertAt=S.time+rand(24,34);
    const t=aaaPriorityTarget();
    if(t&&aaaRole(t).priority>=3&&S.focusTarget!==t)banner('PRIORITY CONTACT','#ffdf83',aaaRole(t).label+' detected · tap to focus');
  }
  if(a.bossWasAlive&&!S.boss){S.grace=Math.max(S.grace,5);S.bullets.length=0;banner('CLEAR AIR','#8ff7ff','Boss destroyed · systems recovering');}
  a.bossWasAlive=!!S.boss;
  const load=S.enemies.length+S.bullets.length*.16+S.shots.length*.08;
  a.performancePressure=load;
  if(load>105)S.quality=Math.min(S.quality,.72);
  if(S.bullets.length>320)S.bullets.splice(0,S.bullets.length-320);
  if(S.shots.length>360)S.shots.splice(0,S.shots.length-360);
  if(Array.isArray(S.particles)&&S.particles.length>520)S.particles.splice(0,S.particles.length-520);
}

const __aaaUpdate=update;
update=function(dt){__aaaUpdate(dt);aaaUpdate(dt);};

function aaaCapitalSystemPoint(e,sys){return {x:e.x+sys.ox,y:e.y+sys.oy};}
function aaaFocusCapitalSystem(e,sys){
  if(!S||!e?.aaaCapital||!sys||sys.hp<=0)return false;
  aaaEnsureState();S.focusTarget=e;S.focusBossPart=null;S.focusTimer=8;S.aaa.focusCapitalSystem={enemy:e,system:sys};
  sfx('focus');popup(sys.label,e.x+sys.ox,e.y+sys.oy-24,'#fff1a8',.8);return true;
}
function aaaPointerCapital(ev){
  if(!S||S.phase!=='running')return;
  const rect=canvas.getBoundingClientRect(),x=(ev.clientX-rect.left)*(W/rect.width),y=(ev.clientY-rect.top)*(H/rect.height);
  for(const e of S.enemies){
    if(!e?.aaaCapital||e.hp<=0||!Array.isArray(e.aaaSystems))continue;
    for(const sys of e.aaaSystems){
      if(sys.hp<=0)continue;const p=aaaCapitalSystemPoint(e,sys);
      if(dist(x,y,p.x,p.y)<22){aaaFocusCapitalSystem(e,sys);return;}
    }
  }
}
canvas.addEventListener('pointerdown',aaaPointerCapital);

function aaaDrawTacticalAura(e){
  if(e.aaaGuarded){ctx.save();ctx.globalAlpha=.28;ctx.strokeStyle='#78d9ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,e.size+9+Math.sin(S.time*5)*2,0,TWO_PI);ctx.stroke();ctx.restore();}
  if(e.affix?.id==='commander'){ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle='#ffd76e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.size+15+Math.sin(S.time*4)*3,0,TWO_PI);ctx.stroke();ctx.restore();}
}
function aaaDrawCapitalSystems(e){
  if(!e.aaaCapital||!Array.isArray(e.aaaSystems))return;
  for(const sys of e.aaaSystems){
    const ratio=sys.maxHp?clamp(sys.hp/sys.maxHp,0,1):0;
    ctx.save();ctx.translate(sys.ox,sys.oy);ctx.globalAlpha=sys.hp>0?.95:.24;ctx.fillStyle=sys.hp>0?'#fff1a8':'#3d4148';ctx.fillRect(-6,-6,12,12);ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.strokeRect(-8,-8,16,16);
    if(sys.hp>0){ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(-12,10,24,3);ctx.fillStyle='#ffe08a';ctx.fillRect(-12,10,24*ratio,3);}
    if(S.aaa?.focusCapitalSystem?.enemy===e&&S.aaa.focusCapitalSystem.system===sys&&S.focusTimer>0){ctx.strokeStyle='#8ff7ff';ctx.lineWidth=2;ctx.strokeRect(-13,-13,26,26);ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.fillText(sys.label,0,-16);}
    ctx.restore();
  }
}

function aaaDrawHealthBar(e){
  if(!e||e.hp<=0||!e.maxHp)return;
  const role=aaaRole(e),ratio=clamp(e.hp/e.maxHp,0,1);
  const show=S.focusTarget===e||e.elite||e.aaaCapital||ratio<.68||role.priority>=3;
  if(!show)return;
  const width=e.aaaCapital?76:Math.max(32,e.size*2.2),y=-e.size-18;
  ctx.save();ctx.globalAlpha=.92;ctx.fillStyle='rgba(2,8,18,.78)';ctx.fillRect(-width/2,y,width,5);ctx.fillStyle=ratio>.55?'#8ff7ff':ratio>.25?'#ffd36f':'#ff6f86';ctx.fillRect(-width/2,y,width*ratio,5);
  if(role.priority>=2){ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=e.aaaCapital?'#ffd36f':'#f4fbff';ctx.fillText(role.icon+' '+role.label,0,y-5);}
  ctx.restore();
}

function aaaDrawDamageState(e){
  if(!e||!e.maxHp)return;const ratio=e.hp/e.maxHp;if(ratio>.72)return;
  ctx.save();ctx.globalAlpha=clamp((.78-ratio)*1.2,.16,.68);ctx.strokeStyle='#ffe1cf';ctx.lineWidth=1.2;
  ctx.beginPath();ctx.moveTo(-e.size*.45,-e.size*.2);ctx.lineTo(0,2);ctx.lineTo(e.size*.36,-e.size*.36);ctx.stroke();
  if(ratio<.42){ctx.fillStyle='rgba(135,155,175,.55)';for(let i=0;i<3;i++){const t=S.time*1.8+i*2.1;ctx.beginPath();ctx.arc(-e.size*.55-Math.sin(t)*5,-4-i*6-Math.cos(t)*4,3+i,0,TWO_PI);ctx.fill();}}
  if(e.aaaHitFlash>0){ctx.globalAlpha=Math.min(1,e.aaaHitFlash*7);ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,e.size+5,0,TWO_PI);ctx.stroke();}
  ctx.restore();
}

if(typeof drawEnemy==='function'){
  const __aaaDrawEnemy=drawEnemy;
  drawEnemy=function(e){__aaaDrawEnemy(e);if(!e||e.hp<=0)return;ctx.save();ctx.translate(e.x,e.y);aaaDrawTacticalAura(e);aaaDrawDamageState(e);aaaDrawCapitalSystems(e);aaaDrawHealthBar(e);ctx.restore();};
}

function aaaDrawFocusChoreography(){
  if(!S||S.phase!=='running'||!S.focusTarget||S.focusTimer<=0)return;
  const t=S.focusTarget;if(t.hp<=0)return;const cap=S.aaa?.focusCapitalSystem?.enemy===t?S.aaa.focusCapitalSystem.system:null,tx=cap?t.x+cap.ox:t.x,ty=cap?t.y+cap.oy:t.y;
  ctx.save();ctx.globalAlpha=.17+.07*Math.sin(S.time*12);ctx.strokeStyle='#8ff7ff';ctx.lineWidth=1;
  for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(S.ship.x+24,S.ship.y+i*6);ctx.lineTo(tx-(cap?0:t.size*.7),ty+i*4);ctx.stroke();}
  ctx.globalAlpha=.55;ctx.fillStyle='#8ff7ff';ctx.font='bold 10px monospace';ctx.textAlign='left';ctx.fillText('LOCK '+S.focusTimer.toFixed(1)+'s',S.ship.x+38,S.ship.y-28);ctx.restore();
}

if(typeof drawShip==='function'){
  const __aaaDrawShip=drawShip;
  drawShip=function(){__aaaDrawShip();aaaDrawFocusChoreography();};
}

if(typeof drawBoss==='function'){
  const __aaaDrawBoss=drawBoss;
  drawBoss=function(){
    __aaaDrawBoss();const b=S?.boss;if(!b||!Array.isArray(b.parts))return;
    ctx.save();ctx.font='bold 9px monospace';ctx.textAlign='center';
    for(const p of b.parts){if(p.hp<=0)continue;ctx.fillStyle='#ffffff';ctx.globalAlpha=.72;ctx.fillText(p.aaaRole||'SYSTEM',b.x+p.ox,b.y+p.oy-18);}
    ctx.restore();
  };
}

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.aaaSpawnCapital=aaaSpawnCapital;
  window.__STARWARD__.aaaSpawnFormation=aaaSpawnPriorityFormation;
  window.__STARWARD__.aaaRole=aaaRole;
  window.__STARWARD__.aaaFocusCapitalSystem=aaaFocusCapitalSystem;
}
// ---- end V10 tactical depth layer ----
`;

  function apply(source){
    if(typeof source!=='string')throw new TypeError('Starward V10 transform expects source text');
    const hooks=['function update(','function updateEnemies(','function updateProjectiles(','function killEnemy(','function spawnEnemy('];
    for(const hook of hooks)if(!source.includes(hook))throw new Error(`Starward V10 hook missing: ${hook}`);
    const damageLine='damage:(w.damage+level*1.35)*damageMultiplier()*(crit?2:1)*focusBonus,life:3.4,color:w.color,';
    if(!source.includes(damageLine))throw new Error('Starward V10 weapon-focus hook missing');
    source=source.replace(damageLine,'damage:(w.damage+level*1.35)*damageMultiplier()*(crit?2:1)*focusBonus*aaaWeaponFocusMultiplier(key,target),life:3.4,color:w.color,');
    const close=source.lastIndexOf('})();');
    if(close<0)throw new Error('Starward V10 runtime closure not found');
    return source.slice(0,close)+ENHANCEMENT_BLOCK+'\n'+source.slice(close);
  }
  return {apply};
});

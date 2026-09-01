;(()=>{
'use strict';

const ROLE_INFO={
  scout:{label:'FIGHTER',priority:0},dart:{label:'INTERCEPT',priority:0},gunner:{label:'GUNNER',priority:2},
  bomber:{label:'BOMBER',priority:3},sniper:{label:'SNIPER',priority:5},guardian:{label:'GUARD',priority:3},
  splitter:{label:'SPLITTER',priority:2},healer:{label:'HEALER',priority:5},carrier:{label:'CARRIER',priority:5}
};
const CAPITAL_SYSTEMS=[
  {id:'shield',name:'SHIELD RELAY',threshold:.76},
  {id:'launch',name:'LAUNCH BAY',threshold:.50},
  {id:'cannon',name:'HEAVY CANNON',threshold:.25}
];
const baseRole=e=>ROLE_INFO[e?.type]||{label:'HOSTILE',priority:1};
const roleInfo=e=>{
  if(e?.miniCapital)return{label:'CAPITAL',priority:8};
  if(e?.affix?.id==='commander')return{label:'COMMANDER',priority:7};
  if(e?.affix?.id==='vampire')return{label:'VAMPIRE',priority:6};
  if(e?.affix?.id==='shielded')return{label:'SHIELDED',priority:5};
  if(e?.elite)return{label:'ELITE '+baseRole(e).label,priority:Math.max(4,baseRole(e).priority)};
  return baseRole(e);
};
const priorityScore=e=>roleInfo(e).priority+(e?.protectedFormation?1:0)+(e?.hp&&e?.maxHp?Math.min(2,e.hp/e.maxHp):0);
const livingPriorities=(exclude=null)=>S.enemies.filter(e=>e&&e!==exclude&&e.hp>0&&priorityScore(e)>=4).sort((a,b)=>priorityScore(b)-priorityScore(a)||a.x-b.x);

function markCapital(e){
  if(!e||e.miniCapital)return e;
  e.miniCapital=true;
  e.maxHp*=2.6;e.hp=e.maxHp;e.size=Math.max(e.size,40);
  e.capitalSystems={shield:true,launch:true,cannon:true};
  e.capitalClock=2.8;
  e.roleLabel='CAPITAL';
  e.elite=true;
  return e;
}

const _spawnEnemy=spawnEnemy;
spawnEnemy=function(type,y,opts){
  const e=_spawnEnemy(type,y,opts);
  if(e){e.hitFlash=0;e.damageStage=0;e.roleLabel=baseRole(e).label;}
  return e;
};

if(typeof spawnWave==='function'){
  const _spawnWave=spawnWave;
  spawnWave=function(...args){
    const before=S.enemies.length;
    const result=_spawnWave.apply(this,args);
    const added=S.enemies.slice(before).filter(e=>e&&e.hp>0);
    const vip=added.slice().sort((a,b)=>priorityScore(b)-priorityScore(a))[0];
    if(vip&&priorityScore(vip)>=4){
      vip.x+=72;vip.protectedFormation=true;
      const escorts=added.filter(e=>e!==vip).slice(0,5);
      escorts.forEach((e,i)=>{
        e.x-=20+(i%2)*22;
        const offset=(i-Math.floor(escorts.length/2))*34;
        e.baseY=clamp(vip.y+offset,45,H-45);e.y=e.baseY;
      });
    }
    return result;
  };
}

if(typeof enemyFire==='function'){
  const _enemyFire=enemyFire;
  enemyFire=function(e){
    if(e?.miniCapital&&e.capitalSystems&&e.capitalSystems.cannon===false&&chance(.48))return;
    return _enemyFire(e);
  };
}

if(typeof updateWeapons==='function'){
  const _updateWeapons=updateWeapons;
  updateWeapons=function(dt){
    const before=S.shots.length;
    _updateWeapons(dt);
    if(!(S.focusTimer>0&&S.focusTarget))return;
    const elapsed=clamp(8-S.focusTimer,0,8);
    for(const sh of S.shots.slice(before)){
      if(sh.kind==='rail'){sh.damage*=1.40;sh.pierce+=1;sh.focusStyle='precision';}
      else if(sh.kind==='missile'){sh.damage*=1.22;sh.splash+=.8;sh.focusStyle='hunter';}
      else if(sh.kind==='drone'){sh.damage*=1.24;sh.focusStyle='swarm';}
      else if(sh.kind==='beam'){sh.damage*=1+Math.min(.55,elapsed*.07);sh.focusStyle='ramp';}
      else if(sh.kind==='arc'){sh.damage*=1.12;sh.focusStyle='network';}
      else if(sh.kind==='flak'||sh.kind==='nova'){sh.splash+=.65;sh.focusStyle='siege';}
    }
  };
}

if(typeof updateProjectiles==='function'){
  const _updateProjectiles=updateProjectiles;
  updateProjectiles=function(dt){
    const beforeHp=new Map();
    for(const e of S.enemies)if(e&&e.hp>0)beforeHp.set(e,e.hp);
    _updateProjectiles(dt);
    for(const e of S.enemies){
      if(!beforeHp.has(e))continue;
      const prior=beforeHp.get(e);
      if(e.hp<prior){
        const dealt=prior-e.hp;
        e.hitFlash=.13;
        e.recentDamage=(e.recentDamage||0)+dealt;
        if(e.miniCapital&&e.capitalSystems?.shield&&e.hp>0){
          e.hp=Math.min(e.maxHp,e.hp+dealt*.24);
        }
      }
    }
  };
}

function breakCapitalSystems(e){
  if(!e?.miniCapital||!e.capitalSystems||e.hp<=0)return;
  const ratio=e.hp/e.maxHp;
  for(const sys of CAPITAL_SYSTEMS){
    if(e.capitalSystems[sys.id]&&ratio<=sys.threshold){
      e.capitalSystems[sys.id]=false;
      burst(e.x,e.y,e.color,32,300,4);
      S.screenShake=Math.max(S.screenShake,5);
      popup(sys.name+' DESTROYED',e.x,e.y-e.size-34,'#ffe56b',1.25);
      if(sys.id==='shield')e.hitFlash=.35;
      if(sys.id==='launch')e.capitalClock=999;
      if(sys.id==='cannon')e.fire=Math.max(e.fire||0,3.5);
    }
  }
}

if(typeof updateEnemies==='function'){
  const _updateEnemies=updateEnemies;
  updateEnemies=function(dt){
    if(S.phase==='running'){
      if(!S._priorityLesson&&S.time>=13&&S.grace<=0){
        S._priorityLesson=true;
        const e=spawnEnemy('sniper',clamp(S.ship.y-115,70,H-70),{x:W+40});
        if(e){e.hp*=1.55;e.maxHp*=1.55;e.tutorialPriority=true;e.roleLabel='PRIORITY';}
        banner('PRIORITY TARGET','#8ff7ff','Tap the marked sniper to concentrate fire');
      }
      if(!S._nextCapitalAt)S._nextCapitalAt=54;
      if(S.time>=S._nextCapitalAt&&!S.boss&&S.enemies.length<MAX_ENEMIES-8){
        const cap=markCapital(spawnEnemy('carrier',rand(105,H-105),{x:W+90}));
        if(cap){
          cap.baseY=cap.y;
          banner('CAPITAL SHIP INBOUND','#ffd978','Break its systems before it floods the lane');
          for(let i=0;i<5;i++)spawnEnemy(i%2?'guardian':'gunner',clamp(cap.y+(i-2)*45,50,H-50),{x:W+30+i*18});
        }
        S._nextCapitalAt=S.time+rand(100,125);
      }
      for(const e of S.enemies){
        if(!e?.miniCapital||e.hp<=0)continue;
        breakCapitalSystems(e);
        if(e.capitalSystems?.launch){
          e.capitalClock-=dt;
          if(e.capitalClock<=0&&S.enemies.length<MAX_ENEMIES-4){
            e.capitalClock=rand(4.6,6.2);
            for(let i=0;i<3;i++)spawnEnemy('dart',clamp(e.y+(i-1)*26,42,H-42),{x:e.x+rand(-10,12)});
          }
        }
      }
      S.perf=S.perf||{peakBullets:0,peakShots:0,slowFrames:0};
      S.perf.peakBullets=Math.max(S.perf.peakBullets,S.bullets.length);
      S.perf.peakShots=Math.max(S.perf.peakShots,S.shots.length);
      if(dt>.028)S.perf.slowFrames++;
      if(S.bullets.length>430)S.bullets.splice(0,S.bullets.length-430);
      if(S.shots.length>340)S.shots.splice(0,S.shots.length-340);
      if(S.perf.slowFrames>80&&S.quality>.55){S.quality=Math.max(.55,S.quality-.05);S.perf.slowFrames=20;}
    }
    _updateEnemies(dt);
    for(const e of S.enemies)if(e?.hitFlash>0)e.hitFlash=Math.max(0,e.hitFlash-dt);
  };
}

if(typeof killEnemy==='function'){
  const _killEnemy=killEnemy;
  killEnemy=function(e){
    const wasFocused=!!(e&&S.focusTarget===e&&S.focusTimer>0);
    const role=roleInfo(e);
    const wasCapital=!!e?.miniCapital;
    const wasCommander=e?.affix?.id==='commander';
    const x=e?.x||S.ship.x,y=e?.y||S.ship.y,color=e?.color||'#ffffff';
    _killEnemy(e);
    if(wasCommander){
      for(const o of S.enemies){
        if(o&&o!==e&&o.hp>0&&dist(o.x,o.y,x,y)<230){o.hp-=o.maxHp*.12;o.fire=(o.fire||0)+.7;}
      }
      popup('COMMAND BROKEN',x,y-30,'#ffe56b',1.15);
    }
    if(wasFocused&&role.priority>=4){
      S.focusKills=(S.focusKills||0)+1;
      addLaserCharge(wasCapital?3:1.25);
      const next=livingPriorities(e)[0];
      if(next){
        S.focusTarget=next;S.focusBossPart=null;S.focusTimer=2.75;
        popup('FOCUS CHAIN',x,y-34,'#8ff7ff',1.05);
      }else{
        S.focusTimer=0;S.focusTarget=null;S.focusBossPart=null;
        popup('PRIORITY DOWN',x,y-34,'#8ff7ff',1.05);
      }
    }
    if(role.priority>=4)burst(x,y,color,22,270,4);
    if(wasCapital){
      S.grace=Math.max(S.grace||0,3.8);S.bullets.length=0;
      burst(x,y,'#fff0a5',70,440,6);burst(x-28,y-16,color,38,330,5);burst(x+30,y+18,color,38,330,5);
      banner('CAPITAL SHIP DESTROYED','#ffe56b','Lane cleared · Star Laser boosted');
    }
  };
}

if(typeof updateBoss==='function'){
  const _updateBoss=updateBoss;
  updateBoss=function(dt){
    const bossBefore=S.boss;
    const bulletStart=S.bullets.length;
    const partsBefore=bossBefore?.parts?.map(p=>p.hp>0)||[];
    const result=_updateBoss(dt);
    if(S.boss&&S.boss===bossBefore&&Array.isArray(S.boss.parts)){
      let dead=0;
      S.boss.parts.forEach((p,i)=>{
        if(p.hp<=0)dead++;
        if(partsBefore[i]&&p.hp<=0&&!p._systemAnnounced){
          p._systemAnnounced=true;
          popup((['WEAPON ARRAY','SHIELD NODE','ENGINE CORE'][i]||'SYSTEM')+' DOWN',S.boss.x+(p.ox||0),S.boss.y+(p.oy||0)-28,'#ffe56b',1.2);
        }
      });
      if(dead>0){
        for(const b of S.bullets.slice(bulletStart)){
          b.vx*=Math.max(.72,1-dead*.07);b.vy*=Math.max(.72,1-dead*.07);
          if(dead>=2&&b.damage>1)b.damage=Math.max(1,b.damage-1);
        }
      }
    }
    if(bossBefore&&!S.boss){
      S.grace=Math.max(S.grace||0,4.2);S.bullets.length=0;
      S._victoryBreather=4.2;
    }
    return result;
  };
}

if(typeof drawEnemy==='function'){
  const _drawEnemy=drawEnemy;
  drawEnemy=function(e){
    _drawEnemy(e);
    if(!e||e.hp<=0)return;
    const role=roleInfo(e),ratio=clamp(e.hp/e.maxHp,0,1);
    const important=role.priority>=4||e.elite||e===S.focusTarget||ratio<.82;
    if(!important)return;
    const w=e.miniCapital?88:e.elite?54:44;
    const y=e.y-e.size-17;
    ctx.save();
    ctx.globalAlpha=.9;
    ctx.fillStyle='rgba(3,9,20,.78)';ctx.fillRect(e.x-w/2,y,w,5);
    ctx.fillStyle=e===S.focusTarget?'#8ff7ff':ratio>.55?'#8fffb0':ratio>.28?'#ffd978':'#ff6d87';ctx.fillRect(e.x-w/2,y,w*ratio,5);
    ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=e===S.focusTarget?'#ffffff':'rgba(255,255,255,.82)';
    if(role.priority>=4)ctx.fillText(role.label,e.x,y-5);
    if(e.miniCapital&&e.capitalSystems){
      const systems=CAPITAL_SYSTEMS;
      systems.forEach((s,i)=>{ctx.fillStyle=e.capitalSystems[s.id]?'#ffe56b':'rgba(255,255,255,.18)';ctx.fillRect(e.x-25+i*22,y+10,14,4);});
    }
    if(ratio<.6){
      ctx.globalAlpha=.28+.12*Math.sin(S.time*7+e.y*.02);ctx.fillStyle='#b7c0ca';
      ctx.beginPath();ctx.arc(e.x+e.size*.2,e.y-e.size*.25,5+4*(1-ratio),0,TWO_PI);ctx.fill();
    }
    if(e.hitFlash>0){ctx.globalAlpha=clamp(e.hitFlash*5,0,1);ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.size+7,0,TWO_PI);ctx.stroke();}
    ctx.restore();
  };
}

if(typeof drawShip==='function'){
  const _drawShip=drawShip;
  drawShip=function(...args){
    _drawShip.apply(this,args);
    if(!(S.focusTimer>0&&S.focusTarget))return;
    const t=S.focusBossPart&&S.boss?{x:S.boss.x+(S.focusBossPart.ox||0),y:S.boss.y+(S.focusBossPart.oy||0)}:S.focusTarget;
    if(!t)return;
    ctx.save();ctx.globalAlpha=.16+.06*Math.sin(S.time*10);ctx.strokeStyle='#8ff7ff';ctx.lineWidth=1;
    for(const oy of [-11,11]){ctx.beginPath();ctx.moveTo(S.ship.x+24,S.ship.y+oy);ctx.lineTo(t.x,t.y);ctx.stroke();}
    ctx.restore();
  };
}

if(typeof drawBoss==='function'){
  const _drawBoss=drawBoss;
  drawBoss=function(...args){
    _drawBoss.apply(this,args);
    const b=S.boss;if(!b||!Array.isArray(b.parts)||b.intro>0)return;
    ctx.save();ctx.font='bold 8px monospace';ctx.textAlign='center';
    b.parts.forEach((p,i)=>{
      const x=b.x+(p.ox||0),y=b.y+(p.oy||0)+22,w=34,ratio=clamp(p.hp/(p.maxHp||p.hp||1),0,1);
      ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(x-w/2,y,w,4);ctx.fillStyle=p.hp>0?'#ffe56b':'rgba(255,255,255,.15)';ctx.fillRect(x-w/2,y,w*ratio,4);
      if(S.focusBossPart===p){ctx.fillStyle='#ffffff';ctx.fillText(['WEAPON','SHIELD','ENGINE'][i]||'SYSTEM',x,y+13);}
    });
    ctx.restore();
  };
}

if(typeof showResults==='function'){
  const _showResults=showResults;
  showResults=function(...args){
    const r=_showResults.apply(this,args);
    if(overlayText&&overlayText.innerHTML){
      const focus=S.focusKills||0,perf=S.perf||{};
      overlayText.innerHTML+=`<div class="result-line"><span>Priority targets</span><strong>${focus}</strong></div><div class="result-line"><span>Peak hostile fire</span><strong>${perf.peakBullets||0}</strong></div>`;
    }
    return r;
  };
}

})();

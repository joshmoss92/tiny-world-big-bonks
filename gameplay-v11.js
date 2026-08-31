'use strict';
/* v11 — seamless systems integration: fair pressure, meaningful contracts, smart loot, simple choices, run synergy. */
(function(){
const G={version:11,pressure:0,heat:0,calm:0,lastKill:0,frontierT:0,lastBiome:-1,lastWeapon:'',salvage:0,encounterGrace:0};window.GAMEPLAY_V11=G;

/* ---------- 1. SMART LOOT + DURABILITY ECONOMY ---------- */
const baseEquip=equipMaybe;
equipMaybe=function(next){
  if(!next)return;
  const current=weapon,curScore=weaponScore(current),newScore=weaponScore(next),dur=window.DEEP_V9&&DEEP_V9.weaponMax?DEEP_V9.weaponHits/DEEP_V9.weaponMax:1;
  /* A nearly broken weapon should not trap the player into rejecting a useful fresh replacement. */
  const emergency=dur<.22&&newScore>=curScore*.72;
  const sensible=dur<.45&&newScore>=curScore*.88;
  if((emergency||sensible)&&next!==current){
    weapon=next;
    if(window.DEEP_V9){DEEP_V9.weaponKey='';DEEP_V9.weaponMax=Math.round((26+weapon.rarity*13)*(weapon.cd>.65?1.3:weapon.cd<.3?.82:1));DEEP_V9.weaponHits=DEEP_V9.weaponMax;}
    toast('↻ Fresh '+rarity[next.rarity]+' '+next.name+' equipped');sound(next.rarity>=4?'mythic':'loot');hud();return;
  }
  const before=weapon;baseEquip(next);
  /* Rejected weapons are salvaged instead of being meaningless floor clutter. */
  if(weapon===before&&window.DEEP_V9&&DEEP_V9.weaponHits<DEEP_V9.weaponMax){
    const gain=Math.max(2,Math.round(2+next.rarity*1.5));DEEP_V9.weaponHits=Math.min(DEEP_V9.weaponMax,DEEP_V9.weaponHits+gain);G.salvage+=gain;toast('🔧 Salvaged '+next.name+' · +'+gain+' durability');hud();
  }
};

/* ---------- 2. CONTRACTS THAT ACTUALLY MEASURE THEIR PROMISE ---------- */
function contractProgressOnKill(q){
  const V=window.GAMEPLAY_V10;if(!V||!V.contract)return;
  const c=V.contract,def=mobDefs[q.type];
  if(c.name==='Cull')c.progress++;
  else if(c.name==='Elite Hunt'&&(q.elite||def.boss))c.progress++;
  else if(c.name==='Rampage'&&window.COMBAT_V8&&COMBAT_V8.killChain>=3)c.progress++;
}
const preKill=killMob;
killMob=function(q){contractProgressOnKill(q);const V=window.GAMEPLAY_V10,before=V&&V.contract?V.contract.progress:0;preKill(q);
  /* v10 increments every kill; undo that generic increment for specialised contracts. */
  if(V&&V.contract&&V.contract.name!=='Cull'&&V.contract.name!=='Frontier'){const intended=V.contract.progress; if(intended>before+1)V.contract.progress=before+1;}
  G.lastKill=run;G.heat=Math.min(100,G.heat+7+(q.elite?6:0)+(mobDefs[q.type].boss?18:0));
};

/* Frontier contracts progress through courageous time, not random kills. */
function tickContract(dt){const V=window.GAMEPLAY_V10;if(!V||!V.contract||V.contract.name!=='Frontier')return;const danger=dangerAt(player.x,player.y);if(danger>=2){G.frontierT+=dt;if(G.frontierT>=1){G.frontierT-=1;V.contract.progress++;if(V.contract.progress>=V.contract.goal){/* v10 completion happens on next kill otherwise; trigger a tiny safe completion hook */
      hp=Math.min(maxHp,hp+14);drops.push({x:player.x+30,y:player.y+18,type:'weapon',weapon:rollWeapon(2.2),t:55,bob:2});toast('✓ FRONTIER COMPLETE · reward cache');sound('discover');V.contract=null;
    }} } }

/* ---------- 3. ADAPTIVE PRESSURE: HARD, AGGRESSIVE, BUT NOT CHEAP ---------- */
function strengthScore(){
  const rarityPower=(weapon.rarity||0)*11,levelPower=Math.min(30,level*2.5),momentum=window.COMBAT_V8?COMBAT_V8.momentum*.18:0,dur=window.DEEP_V9&&DEEP_V9.weaponMax?DEEP_V9.weaponHits/DEEP_V9.weaponMax:1;
  return rarityPower+levelPower+momentum+dur*12;
}
const rawSpawn=spawnMob;
spawnMob=function(type,elite=false){
  const forced=!!type||elite;
  const hpRatio=hp/maxHp,strong=strengthScore()>48,hot=G.heat>55;
  if(!forced&&hpRatio<.25&&Math.random()<.58)return;
  if(!forced&&hpRatio<.42&&!strong&&Math.random()<.28)return;
  const before=mobs.length,ret=rawSpawn(type,elite||(!forced&&strong&&hot&&Math.random()<.12));
  for(let i=before;i<mobs.length;i++){
    const q=mobs[i],tier=dangerAt(q.x,q.y);q.deepDamage=(q.deepDamage||1)*(1.06+tier*.025+(strong?.08:0));q.deepSpeed=(q.deepSpeed||1)*(1.035+tier*.012+(hot?.045:0));
  }
  return ret;
};

/* ---------- 4. SYSTEM SYNERGY: EXPLORATION FEEDS COMBAT, COMBAT FEEDS EXPLORATION ---------- */
function biomePulse(){const b=biomeAtWorld(player.x,player.y);if(b===G.lastBiome)return;G.lastBiome=b;G.heat=Math.max(10,G.heat-18);if(window.COMBAT_V8)COMBAT_V8.momentum=Math.min(100,COMBAT_V8.momentum+12);if(window.DEEP_V9&&DEEP_V9.weaponMax)DEEP_V9.weaponHits=Math.min(DEEP_V9.weaponMax,DEEP_V9.weaponHits+4);toast('✦ '+biomeNames[b]+' · frontier bonus: momentum + repair');}
const oldDiscover=discover;
discover=function(l){const was=l&&l.found;oldDiscover(l);if(!was&&l&&l.found){G.heat=Math.max(0,G.heat-12);hp=Math.min(maxHp,hp+4);if(window.COMBAT_V8)COMBAT_V8.momentum=Math.min(100,COMBAT_V8.momentum+10)}};

/* Killing while hot improves loot slightly, making aggression itself part of the reward loop. */
const oldRoll=rollWeapon;
rollWeapon=function(b=0){const bonus=b+(G.heat>=70?.45:G.heat>=40?.2:0)+(window.GAMEPLAY_V10?GAMEPLAY_V10.shards*.035:0);return oldRoll(bonus)};

/* ---------- 5. ZERO-FRICTION COMMUNICATION ---------- */
function simpleStatus(){
  const co=document.getElementById('compass');if(!co||!started)return;
  const V=window.GAMEPLAY_V10;if(V&&V.contract){const c=V.contract;co.textContent='◇ '+c.name.toUpperCase()+' '+Math.min(c.progress,c.goal)+'/'+c.goal+' · '+(G.heat>=70?'HOT ZONE':biomeNames[biomeAtWorld(player.x,player.y)]);}
}
/* Remove stale joystick tutorial language left in the base update. */
function tutorialFix(){if(run>2&&run<6&&tutorialStep===1)toast('☝ Hold any screen edge to move · attacks are automatic');}

const oldUpdate=update;
update=function(dt){
  /* Level choices freeze gameplay while the player makes a single obvious tap. No hidden punishment for reading. */
  if(window.GAMEPLAY_V10&&GAMEPLAY_V10.choicePending){simpleStatus();return;}
  oldUpdate(dt);tickContract(dt);biomePulse();tutorialFix();
  G.heat=Math.max(0,G.heat-dt*(run-G.lastKill>6?3.2:.7));G.encounterGrace=Math.max(0,G.encounterGrace-dt);
  /* Low health creates breathing room but not invulnerability; recovery still requires movement. */
  if(hp/maxHp<.3&&G.calm<=0){G.calm=18;toast('♡ DANGER · break away to regenerate');}
  G.calm=Math.max(0,G.calm-dt);simpleStatus();
};

const oldHud=hud;
hud=function(){oldHud();const el=document.getElementById('danger');if(el){const d=dangerAt(player.x,player.y)+1;el.textContent='Danger '+d+(G.heat>=70?' · 🔥':G.heat>=40?' · !':'');}}

window.__TWBB_V11_TEST__={get:()=>({version:11,heat:Math.round(G.heat),strength:Math.round(strengthScore()),salvage:G.salvage,biome:G.lastBiome,contract:window.GAMEPLAY_V10&&GAMEPLAY_V10.contract?GAMEPLAY_V10.contract.name:null})};
})();
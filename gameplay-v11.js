'use strict';
/* v11 — seamless systems integration: fair pressure, meaningful contracts, smart loot, simple choices, run synergy. */
(function(){
const G={version:11,heat:0,calm:0,lastKill:0,frontierT:0,lastBiome:-1,salvage:0,choiceShown:false,lastDur:1};window.GAMEPLAY_V11=G;

/* SMART LOOT + DURABILITY ECONOMY */
const baseEquip=equipMaybe;
equipMaybe=function(next){
  if(!next)return;
  const current=weapon,curScore=weaponScore(current),newScore=weaponScore(next),dur=window.DEEP_V9&&DEEP_V9.weaponMax?DEEP_V9.weaponHits/DEEP_V9.weaponMax:1;
  const emergency=dur<.22&&newScore>=curScore*.72,sensible=dur<.45&&newScore>=curScore*.88;
  if((emergency||sensible)&&next!==current){
    weapon=next;
    if(window.DEEP_V9){DEEP_V9.weaponKey='';DEEP_V9.syncWeapon?DEEP_V9.syncWeapon(true):(DEEP_V9.weaponHits=DEEP_V9.weaponMax);}
    toast('↻ Fresh '+rarity[next.rarity]+' '+next.name+' equipped');sound(next.rarity>=4?'mythic':'loot');hud();return;
  }
  const before=weapon;baseEquip(next);
  if(weapon===before&&window.DEEP_V9&&DEEP_V9.weaponHits<DEEP_V9.weaponMax){
    const gain=Math.max(2,Math.round(2+next.rarity*1.5));DEEP_V9.weaponHits=Math.min(DEEP_V9.weaponMax,DEEP_V9.weaponHits+gain);G.salvage+=gain;toast('🔧 Salvaged '+next.name+' · +'+gain+' durability');hud();
  }
};

/* CONTRACTS THAT MATCH THEIR WORDING */
function finishContract(c){const V=window.GAMEPLAY_V10;if(!V||V.contract!==c)return;V.shards++;V.contract=null;hp=Math.min(maxHp,hp+14);drops.push({x:player.x+30,y:player.y+18,type:'weapon',weapon:rollWeapon(2+V.shards*.25),t:55,bob:2});toast('✓ '+c.name+' COMPLETE · reward cache');sound('discover');}
const preKill=killMob;
killMob=function(q){
  const V=window.GAMEPLAY_V10,c=V&&V.contract,def=mobDefs[q.type],special=c&&c.name!=='Cull';
  if(special)V.contract=null;
  preKill(q);
  if(special&&V&&!V.contract){V.contract=c;let qualifies=false;if(c.name==='Elite Hunt')qualifies=!!(q.elite||def.boss);else if(c.name==='Rampage')qualifies=!!(window.COMBAT_V8&&COMBAT_V8.killChain>=3);if(qualifies)c.progress++;if(c.progress>=c.goal)finishContract(c);}
  G.lastKill=run;G.heat=Math.min(100,G.heat+7+(q.elite?6:0)+(def.boss?18:0));
};
function tickContract(dt){const V=window.GAMEPLAY_V10;if(!V||!V.contract||V.contract.name!=='Frontier')return;const c=V.contract;if(dangerAt(player.x,player.y)>=2){G.frontierT+=dt;while(G.frontierT>=1&&V.contract===c){G.frontierT-=1;c.progress++;if(c.progress>=c.goal)finishContract(c)}}}

/* ADAPTIVE PRESSURE */
function strengthScore(){const rarityPower=(weapon.rarity||0)*11,levelPower=Math.min(30,level*2.5),momentum=window.COMBAT_V8?COMBAT_V8.momentum*.18:0,dur=window.DEEP_V9&&DEEP_V9.weaponMax?DEEP_V9.weaponHits/DEEP_V9.weaponMax:1;return rarityPower+levelPower+momentum+dur*12;}
const rawSpawn=spawnMob;
spawnMob=function(type,elite=false){
  const forced=!!type||elite,hpRatio=hp/maxHp,strong=strengthScore()>48,hot=G.heat>55;
  if(!forced&&hpRatio<.25&&Math.random()<.58)return;
  if(!forced&&hpRatio<.42&&!strong&&Math.random()<.28)return;
  const before=mobs.length,ret=rawSpawn(type,elite||(!forced&&strong&&hot&&Math.random()<.12));
  for(let i=before;i<mobs.length;i++){const q=mobs[i],tier=dangerAt(q.x,q.y);q.deepDamage=(q.deepDamage||1)*(1.06+tier*.025+(strong?.08:0));q.deepSpeed=(q.deepSpeed||1)*(1.035+tier*.012+(hot?.045:0));}
  return ret;
};

/* EXPLORATION <-> COMBAT SYNERGY */
function biomePulse(){const b=biomeAtWorld(player.x,player.y);if(b===G.lastBiome)return;G.lastBiome=b;G.heat=Math.max(10,G.heat-18);if(window.COMBAT_V8)COMBAT_V8.momentum=Math.min(100,COMBAT_V8.momentum+12);if(window.DEEP_V9&&DEEP_V9.weaponMax)DEEP_V9.weaponHits=Math.min(DEEP_V9.weaponMax,DEEP_V9.weaponHits+4);if(started)toast('✦ '+biomeNames[b]+' · frontier bonus: momentum + repair');}
const oldDiscover=discover;
discover=function(l){const was=l&&l.found;oldDiscover(l);if(!was&&l&&l.found){G.heat=Math.max(0,G.heat-12);hp=Math.min(maxHp,hp+4);if(window.COMBAT_V8)COMBAT_V8.momentum=Math.min(100,COMBAT_V8.momentum+10)}};
const oldRoll=rollWeapon;
rollWeapon=function(b=0){const lucky=weapon&&weapon.v10Luck?weapon.v10Luck:0,bonus=b+(G.heat>=70?.45:G.heat>=40?.2:0)+(window.GAMEPLAY_V10?GAMEPLAY_V10.shards*.035:0)+lucky;return oldRoll(bonus)};

/* SIMPLE LEVEL-UP PRESENTATION */
const panel=document.createElement('div');panel.id='v11choices';panel.style.cssText='position:fixed;left:10px;right:10px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:60;display:none;gap:8px;pointer-events:auto';document.body.appendChild(panel);
function showChoices(){const V=window.GAMEPLAY_V10;if(!V||!V.choicePending||V.choices.length<3){panel.style.display='none';G.choiceShown=false;return}if(G.choiceShown)return;G.choiceShown=true;panel.innerHTML='';V.choices.forEach((p,i)=>{const b=document.createElement('button');b.style.cssText='flex:1;min-height:78px;border:2px solid #ffffff99;border-radius:15px;background:#fffdf5f2;box-shadow:0 5px 0 #0002;padding:8px 5px;font:900 11px ui-rounded,system-ui;color:#303645';b.innerHTML='<b style="display:block;font-size:16px;margin-bottom:4px">'+p[0]+'</b><span style="font-size:9px;color:#6d7482">'+p[1]+'</span>';panel.appendChild(b)});panel.style.display='flex';}

/* ZERO-FRICTION STATUS */
function simpleStatus(){const co=document.getElementById('compass');if(!co||!started)return;const V=window.GAMEPLAY_V10;if(V&&V.contract){const c=V.contract;co.textContent='◇ '+c.name.toUpperCase()+' '+Math.min(c.progress,c.goal)+'/'+c.goal+' · '+(G.heat>=70?'HOT ZONE':biomeNames[biomeAtWorld(player.x,player.y)]);}}
function tutorialFix(){if(run>2&&run<6&&tutorialStep===1)toast('☝ Hold any screen edge to move · attacks are automatic');}
function syncDurabilityPerk(){const now=player.v10Dur||1;if(now===G.lastDur)return;const ratio=window.DEEP_V9&&DEEP_V9.weaponMax?DEEP_V9.weaponHits/DEEP_V9.weaponMax:1;G.lastDur=now;if(window.DEEP_V9&&DEEP_V9.syncWeapon){DEEP_V9.weaponKey='';DEEP_V9.syncWeapon(true);DEEP_V9.weaponHits=Math.max(1,Math.round(DEEP_V9.weaponMax*ratio));hud();}}

const oldUpdate=update;
update=function(dt){
  if(window.GAMEPLAY_V10&&GAMEPLAY_V10.choicePending){showChoices();simpleStatus();return;}
  panel.style.display='none';G.choiceShown=false;oldUpdate(dt);syncDurabilityPerk();tickContract(dt);biomePulse();tutorialFix();
  if(player.v10Regen&&regenDelay<=0&&hp<maxHp)hp=Math.min(maxHp,hp+player.v10Regen*dt);
  G.heat=Math.max(0,G.heat-dt*(run-G.lastKill>6?3.2:.7));if(hp/maxHp<.3&&G.calm<=0){G.calm=18;toast('♡ DANGER · break away to regenerate');}G.calm=Math.max(0,G.calm-dt);simpleStatus();
};
const oldHud=hud;
hud=function(){oldHud();const el=document.getElementById('danger');if(el){const d=dangerAt(player.x,player.y)+1;el.textContent='Danger '+d+(G.heat>=70?' · 🔥':G.heat>=40?' · !':'');}}
window.__TWBB_V11_TEST__={get:()=>({version:11,heat:Math.round(G.heat),strength:Math.round(strengthScore()),salvage:G.salvage,biome:G.lastBiome,contract:window.GAMEPLAY_V10&&GAMEPLAY_V10.contract?GAMEPLAY_V10.contract.name:null})};
})();
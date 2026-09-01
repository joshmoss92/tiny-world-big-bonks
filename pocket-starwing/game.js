(() => {
'use strict';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const overlay = $('overlay');
const overlayTitle = $('overlayTitle');
const overlayText = $('overlayText');
const eyebrow = $('eyebrow');
const choiceGrid = $('choiceGrid');
const startBtn = $('startBtn');

const ui = {
  time: $('time'), hull: $('hull'), shield: $('shield'), level: $('level'), salvage: $('salvage'),
  damage: $('statDamage'), rate: $('statRate'), dodge: $('statDodge'), thrust: $('statThrust'),
  repair: $('statRepair'), luck: $('statLuck'), xp: $('xpText'), xpBar: $('xpBar'), chips: $('buildChips')
};

const W = canvas.width;
const H = canvas.height;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const chance = (p) => Math.random() < p;
ctx.imageSmoothingEnabled = false;

const NORMAL_CHOICE_GAP = 68;
const QUEUED_CHOICE_GAP = 14;

const RARITIES = [
  { name: 'Rare', cls: 'rare', weight: 58, power: 1.00 },
  { name: 'Epic', cls: 'epic', weight: 25, power: 1.45 },
  { name: 'Legendary', cls: 'legendary', weight: 10, power: 2.00 },
  { name: 'Mythic', cls: 'mythic', weight: 5, power: 3.00 },
  { name: 'God', cls: 'god', weight: 2, power: 4.50 }
];

const BIOMES = [
  { name:'Cloudreach', top:'#081a39', bottom:'#4f9bb4', accent:'#c6ffab', fog:'#88e6ff12' },
  { name:'Ember Belt', top:'#1b1028', bottom:'#9b413c', accent:'#ffd071', fog:'#ff9b6715' },
  { name:'Silent Ruins', top:'#070e27', bottom:'#273b5c', accent:'#72f0e3', fog:'#72f0e310' },
  { name:'Stormglass', top:'#070d18', bottom:'#21394f', accent:'#dceeff', fog:'#c7e6ff12' },
  { name:'Violet Deep', top:'#160b28', bottom:'#5e3673', accent:'#ffc0ef', fog:'#d597ff14' }
];

const WEAPONS = {
  pulse:   { name:'Pulse Cannon', icon:'•', color:'#fff0a5', cool:.29, damage:5.4, speed:900 },
  scatter: { name:'Spread Shot', icon:'✣', color:'#ffb0df', cool:.66, damage:3.2, speed:780 },
  missile: { name:'Homing Missiles', icon:'◇', color:'#b9ff8e', cool:.90, damage:8.6, speed:620 },
  rail:    { name:'Railgun', icon:'━', color:'#ffffff', cool:1.06, damage:12.8, speed:1450 },
  flak:    { name:'Flak Cannon', icon:'✹', color:'#ff977d', cool:.78, damage:7.6, speed:720 },
  arc:     { name:'Chain Lightning', icon:'ϟ', color:'#9fc7ff', cool:.92, damage:6.5, speed:980 },
  drone:   { name:'Attack Drones', icon:'⊙', color:'#7fffc5', cool:.56, damage:4.2, speed:950 },
  laser:   { name:'Rapid Laser', icon:'▸', color:'#ff89ec', cool:.15, damage:2.55, speed:1750 },
  nova:    { name:'Heavy Bombs', icon:'✦', color:'#ffd27a', cool:1.24, damage:14.4, speed:590 }
};

const ENEMIES = {
  scout:    { hp:8,  speed:155, fire:2.8, damage:1, xp:1, salvage:1, size:15, color:'#a9ef8c' },
  dart:     { hp:6,  speed:235, fire:99,  damage:1, xp:1, salvage:1, size:12, color:'#ff879a' },
  gunner:   { hp:18, speed:120, fire:1.9, damage:1, xp:2, salvage:2, size:20, color:'#8ce6de' },
  tank:     { hp:46, speed:82,  fire:2.3, damage:2, xp:4, salvage:4, size:28, color:'#f2b96b' },
  sniper:   { hp:16, speed:92,  fire:3.9, damage:2, xp:3, salvage:3, size:18, color:'#ff9a78' },
  swarm:    { hp:4,  speed:265, fire:4.2, damage:1, xp:1, salvage:1, size:9, color:'#e8ff92' },
  bomber:   { hp:30, speed:98,  fire:3.2, damage:2, xp:3, salvage:4, size:23, color:'#ffa86e' },
  guardian: { hp:35, speed:90,  fire:2.7, damage:1, xp:4, salvage:4, size:24, color:'#73c9ff' },
  splitter: { hp:20, speed:130, fire:3.0, damage:1, xp:3, salvage:3, size:19, color:'#f09bd7' },
  charger:  { hp:22, speed:120, fire:99,  damage:2, xp:3, salvage:3, size:19, color:'#ff6687' },
  healer:   { hp:25, speed:88,  fire:99,  damage:1, xp:4, salvage:5, size:21, color:'#82ffbc' },
  weaver:   { hp:18, speed:125, fire:2.4, damage:1, xp:3, salvage:3, size:18, color:'#c7a8ff' }
};

const BOSSES = [
  { name:'Glimmer Maw', color:'#ff7198', accent:'#ffe6ee' },
  { name:'Cinder Throne', color:'#ff895b', accent:'#ffd27a' },
  { name:'Archive Crown', color:'#71e7df', accent:'#c8ffff' },
  { name:'Storm Seraph', color:'#8bb9ff', accent:'#ffffff' },
  { name:'Violet Oracle', color:'#cf7dff', accent:'#ffc0ef' }
];

const STAT_UPGRADES = [
  {
    id:'hull', name:'Reinforced Hull', group:'survival', base:3,
    desc:'The ship can take more damage before the run ends.',
    effect:v=>`+${v} maximum hull and heal ${Math.ceil(v/2)} hull`,
    apply:v=>{ S.maxHull+=v; S.hull=Math.min(S.maxHull,S.hull+Math.ceil(v/2)); }
  },
  {
    id:'shield', name:'Larger Shield', group:'survival', base:2,
    desc:'Increase the rechargeable shield around the ship.',
    effect:v=>`+${v} maximum shield and fully recharge it`,
    apply:v=>{ S.maxShield+=v; S.shield=S.maxShield; S.shieldRegen+=.012*v; }
  },
  {
    id:'repair', name:'Faster Repairs', group:'survival', base:.018,
    desc:'The ship slowly repairs hull damage on its own.',
    effect:v=>`Repair 1 hull every ${Math.max(5,Math.round(1/v))} seconds`,
    apply:v=>{ S.stats.repair+=v; }
  },
  {
    id:'dodge', name:'Better Dodging', group:'survival', base:.07,
    desc:'The autopilot notices incoming danger sooner.',
    effect:v=>`Autopilot reacts ${Math.round(v*100)}% earlier`,
    apply:v=>{ S.stats.dodge=Math.min(.82,S.stats.dodge+v); }
  },
  {
    id:'speed', name:'Faster Engines', group:'survival', base:.15,
    desc:'The ship moves between safe positions more quickly.',
    effect:v=>`+${Math.round(v*100)}% movement speed`,
    apply:v=>{ S.stats.speed+=v; }
  },
  {
    id:'armor', name:'Stronger Armor', group:'survival', base:.08,
    desc:'Incoming hits have a chance to deal less hull damage.',
    effect:v=>`+${Math.round(v*100)}% chance to reduce damage`,
    apply:v=>{ S.stats.armor=Math.min(.75,S.stats.armor+v); }
  },
  {
    id:'damage', name:'Weapon Damage', group:'offense', base:.18,
    desc:'Every installed weapon hits harder.',
    effect:v=>`+${Math.round(v*100)}% weapon damage`,
    apply:v=>{ S.stats.damage+=v; }
  },
  {
    id:'rate', name:'Fire Rate', group:'offense', base:.15,
    desc:'Every installed weapon fires more often.',
    effect:v=>`+${Math.round(v*100)}% fire rate`,
    apply:v=>{ S.stats.rate+=v; }
  },
  {
    id:'crit', name:'Critical Chance', group:'offense', base:.06,
    desc:'Some attacks deal double damage.',
    effect:v=>`+${Math.round(v*100)}% chance to deal double damage`,
    apply:v=>{ S.stats.crit=Math.min(.70,S.stats.crit+v); }
  },
  {
    id:'projectile', name:'Projectile Speed', group:'offense', base:.15,
    desc:'Shots reach enemies faster and miss less often.',
    effect:v=>`+${Math.round(v*100)}% projectile speed`,
    apply:v=>{ S.stats.projectile+=v; }
  },
  {
    id:'pierce', name:'Piercing Shots', group:'offense', base:1,
    desc:'Shots continue through additional enemies.',
    effect:v=>`Shots pass through ${v} extra ${v===1?'enemy':'enemies'}`,
    apply:v=>{ S.stats.pierce+=v; }
  },
  {
    id:'splash', name:'Blast Radius', group:'offense', base:1,
    desc:'Explosive weapons damage a wider area.',
    effect:v=>`+${v} blast radius level${v===1?'':'s'}`,
    apply:v=>{ S.stats.splash+=v; }
  },
  {
    id:'salvage', name:'Salvage Bonus', group:'utility', base:.20,
    desc:'Destroyed enemies drop more salvage for route events.',
    effect:v=>`+${Math.round(v*100)}% salvage earned`,
    apply:v=>{ S.stats.salvage+=v; }
  },
  {
    id:'xp', name:'Upgrade Progress', group:'utility', base:.15,
    desc:'Kills fill the upgrade meter faster. Choices still stay spaced out.',
    effect:v=>`+${Math.round(v*100)}% upgrade progress from kills`,
    apply:v=>{ S.stats.xp+=v; }
  },
  {
    id:'luck', name:'Rarity Luck', group:'utility', base:.05,
    desc:'Future choices are more likely to contain higher-rarity upgrades.',
    effect:v=>`+${Math.round(v*100)}% better high-rarity odds`,
    apply:v=>{ S.stats.luck=Math.min(.75,S.stats.luck+v); }
  }
];

const SPECIALS = [
  {
    id:'secondChance', name:'Second Chance', rarity:2,
    desc:'Survive one fatal hit instead of ending the run.',
    effect:'Once per run: revive at 40% hull',
    apply(){ S.specials.secondChance=(S.specials.secondChance||0)+1; }
  },
  {
    id:'glassCannon', name:'Glass Cannon', rarity:2,
    desc:'Deal much more damage, but permanently lose some hull capacity.',
    effect:'+60% damage, -3 maximum hull',
    apply(){ S.stats.damage+=.60; S.maxHull=Math.max(6,S.maxHull-3); S.hull=Math.min(S.hull,S.maxHull); }
  },
  {
    id:'emergency', name:'Emergency Power', rarity:2,
    desc:'The ship becomes much more dangerous when close to destruction.',
    effect:'Below 35% hull: +40% damage and fire rate',
    apply(){ S.specials.emergency=1; }
  },
  {
    id:'combatRepair', name:'Combat Repair', rarity:2,
    desc:'Destroying enough enemies restores hull automatically.',
    effect:'Every 15 kills: repair 1 hull',
    apply(){ S.specials.combatRepair=(S.specials.combatRepair||0)+1; }
  },
  {
    id:'pointDefense', name:'Point Defense', rarity:3,
    desc:'A defensive gun automatically destroys some incoming shots.',
    effect:'Destroy every 9th enemy projectile',
    apply(){ S.specials.pointDefense=(S.specials.pointDefense||0)+1; }
  },
  {
    id:'smartAI', name:'Smart Autopilot', rarity:3,
    desc:'The autopilot reacts sooner and reaches safe lanes faster.',
    effect:'+15% dodge reaction, +20% movement speed',
    apply(){ S.stats.dodge=Math.min(.82,S.stats.dodge+.15); S.stats.speed+=.20; }
  },
  {
    id:'arsenal', name:'Weapon Mastery', rarity:3,
    desc:'Improve every weapon already installed on the ship.',
    effect:'+1 level to every installed weapon',
    apply(){ for(const key of Object.keys(S.weapons)) if(S.weapons[key]) S.weapons[key]=Math.min(15,S.weapons[key]+1); }
  },
  {
    id:'balanced', name:'Perfect Tune-Up', rarity:4,
    desc:'A major all-round improvement with no downside.',
    effect:'+30% damage, +25% fire rate, +3 hull, +2 shield',
    apply(){ S.stats.damage+=.30; S.stats.rate+=.25; S.maxHull+=3; S.hull+=3; S.maxShield+=2; S.shield=S.maxShield; }
  }
];

const SYNERGIES = [
  { id:'regenShield', name:'Self-Recharging Defense', desc:'Strong shields and repair now reinforce each other.', test:s=>s.maxShield>=8&&s.stats.repair>=.05, apply:s=>{s.shieldRegen+=.035;s.stats.repair+=.012;} },
  { id:'agile', name:'Agile Autopilot', desc:'Fast engines and good dodging make movement much safer.', test:s=>s.stats.dodge>=.32&&s.stats.speed>=1.50, apply:s=>{s.stats.dodge=Math.min(.82,s.stats.dodge+.07);s.stats.speed+=.10;} },
  { id:'fullAuto', name:'Full Auto', desc:'High damage and fire rate boost one another.', test:s=>s.stats.damage>=1.70&&s.stats.rate>=1.45, apply:s=>{s.stats.damage+=.12;s.stats.rate+=.12;} },
  { id:'treasure', name:'Treasure Hunter', desc:'Luck and salvage make each kill more valuable.', test:s=>s.stats.luck>=.15&&s.stats.salvage>=1.50, apply:s=>{s.stats.salvage+=.20;s.stats.xp+=.08;} },
  { id:'blastCrit', name:'Explosive Criticals', desc:'Critical hits can trigger extra blast damage.', test:s=>s.stats.crit>=.18&&s.stats.splash>=2, apply:s=>{s.specials.blastCrit=1;} },
  { id:'pierceRain', name:'Piercing Barrage', desc:'Fast fire and piercing shots tear through groups.', test:s=>s.stats.pierce>=3&&s.stats.rate>=1.35, apply:s=>{s.stats.pierce+=1;s.stats.rate+=.08;} },
  { id:'tank', name:'Tank Build', desc:'Large hull and armor create steady self-repair.', test:s=>s.maxHull>=22&&s.stats.armor>=.22, apply:s=>{s.stats.repair+=.018;s.stats.armor=Math.min(.75,s.stats.armor+.04);} },
  { id:'droneDefense', name:'Escort Screen', desc:'Attack drones help intercept incoming fire.', test:s=>s.weapons.drone>=4&&s.stats.dodge>=.25, apply:s=>{s.specials.droneDefense=1;} },
  { id:'missileBarrage', name:'Missile Barrage', desc:'Homing missiles launch in pairs.', test:s=>s.weapons.missile>=4&&s.weapons.scatter>=3, apply:s=>{s.specials.missileBarrage=1;} },
  { id:'beamCannon', name:'Beam Cannon', desc:'Railgun shots gain extra power from the Rapid Laser.', test:s=>s.weapons.laser>=4&&s.weapons.rail>=3, apply:s=>{s.specials.beamCannon=1;} },
  { id:'chainBombs', name:'Chain Detonations', desc:'Heavy Bombs and Flak can trigger secondary explosions.', test:s=>s.weapons.nova>=4&&s.weapons.flak>=3, apply:s=>{s.specials.chainBombs=1;} }
];

const stars = Array.from({length:220},()=>({x:rand(0,W),y:rand(0,H),z:rand(.10,1),s:chance(.15)?2:1}));
let S;
let raf=0;
let last=0;

function freshState(){
  return {
    phase:'menu',
    time:0,
    level:1,
    xp:0,
    xpNeed:70,
    upgradeReady:false,
    upgradeQueued:false,
    nextUpgradeRarity:0,
    lastDecisionAt:0,
    salvage:0,
    hull:18,
    maxHull:18,
    shield:5,
    maxShield:5,
    shieldRegen:.085,
    shieldDelay:0,
    threat:.52,
    grace:12,
    kills:0,
    bosses:0,
    openingPick:0,
    worldSpeed:1.75,
    combatSpeed:1.16,
    stats:{damage:1,rate:1,dodge:.18,speed:1.22,repair:.014,luck:0,armor:.06,crit:.03,xp:1,salvage:1,projectile:1,pierce:0,splash:0},
    weapons:{pulse:1,scatter:0,missile:0,rail:0,flak:0,arc:0,drone:0,laser:0,nova:0},
    cooldowns:{},
    upgrades:{},
    specials:{},
    synergies:{},
    choiceQueue:[],
    queuedKeys:{},
    ship:{x:165,y:H/2,targetY:H/2,ai:0,inv:0,tilt:0},
    enemies:[],
    bullets:[],
    shots:[],
    particles:[],
    popups:[],
    banners:[],
    boss:null,
    director:{spawn:2.8,wave:12.5,event:135,boss:180,breather:52},
    combo:0,
    comboTimer:0,
    screenShake:0,
    flash:0,
    bulletsSeen:0,
    nextMilestone:60,
    best:Number(localStorage.getItem('starwardBest')||0)
  };
}

const formatTime = (t) => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const formatRepair = (v) => v<=0 ? 'OFF' : `1 / ${Math.max(1,Math.round(1/v))}s`;

function popup(text,x,y,color='#fff',life=.85){
  S.popups.push({text,x,y,color,life,max:life});
}
function banner(text,color='#fff',sub=''){
  S.banners.push({text,color,sub,life:2.6,max:2.6});
}
function burst(x,y,color,n=12,speed=180,size=3){
  for(let i=0;i<n;i++){
    const angle=rand(0,Math.PI*2);
    const velocity=rand(speed*.25,speed);
    S.particles.push({x,y,vx:Math.cos(angle)*velocity,vy:Math.sin(angle)*velocity,life:rand(.25,.7),max:.7,color,size:chance(.25)?size*2:size});
  }
}

function rollRarity(minIndex=0){
  const weights=RARITIES.map((rarity,index)=>{
    if(index<minIndex) return 0;
    return rarity.weight*(index===0?1:1+S.stats.luck*index*1.25);
  });
  let total=weights.reduce((a,b)=>a+b,0);
  let roll=Math.random()*total;
  for(let i=0;i<RARITIES.length;i++){
    roll-=weights[i];
    if(roll<=0) return RARITIES[i];
  }
  return RARITIES[minIndex];
}

function weaponCard(minRarity=0){
  const key=pick(Object.keys(WEAPONS));
  const weapon=WEAPONS[key];
  const rarity=rollRarity(minRarity);
  const current=S.weapons[key];
  const gain=Math.max(1,Math.round(rarity.power*.70));
  const next=Math.min(15,current+gain);
  return {
    rarity,
    title:current?`Upgrade ${weapon.name}`:`Unlock ${weapon.name}`,
    desc:current?`${weapon.name} is currently level ${current}.`:`Adds ${weapon.name} to the ship's automatic weapons.`,
    effect:current?`Level ${current} → ${next}`:`Install at level ${gain}`,
    apply(){ S.weapons[key]=next; }
  };
}

function statCard(group=null,minRarity=0){
  const pool=group?STAT_UPGRADES.filter(item=>item.group===group):STAT_UPGRADES;
  const item=pick(pool);
  const rarity=rollRarity(minRarity);
  let amount=item.base*rarity.power*rand(.92,1.08);
  if(['hull','shield','pierce','splash'].includes(item.id)) amount=Math.max(1,Math.round(amount));
  return {
    rarity,
    title:item.name,
    desc:item.desc,
    effect:item.effect(amount),
    apply(){ item.apply(amount); }
  };
}

function specialCard(minRarity=2){
  const available=SPECIALS.filter(item=>item.rarity>=minRarity&&!S.upgrades[`special:${item.id}`]);
  if(!available.length) return statCard(null,minRarity);
  const item=pick(available);
  const rarity=RARITIES[Math.max(minRarity,item.rarity)];
  return {
    rarity,
    title:item.name,
    desc:item.desc,
    effect:item.effect,
    apply(){ item.apply(); S.upgrades[`special:${item.id}`]=1; }
  };
}

function makeDraft(spec=['random','random','random'],minRarity=0){
  return spec.map(kind=>{
    if(kind==='weapon') return weaponCard(minRarity);
    if(['survival','offense','utility'].includes(kind)) return statCard(kind,minRarity);
    if(kind==='special') return specialCard(Math.max(2,minRarity));
    if(chance(.30)) return weaponCard(minRarity);
    if(chance(.08+S.stats.luck*.12)) return specialCard(Math.max(2,minRarity));
    return statCard(null,minRarity);
  });
}

function updateUI(){
  ui.time.textContent=formatTime(S.time);
  ui.hull.textContent=`${Math.max(0,Math.ceil(S.hull))}/${S.maxHull}`;
  ui.shield.textContent=`${Math.max(0,Math.floor(S.shield))}/${S.maxShield}`;
  ui.level.textContent=S.level;
  ui.salvage.textContent=Math.floor(S.salvage);
  ui.damage.textContent=`${Math.round(S.stats.damage*100)}%`;
  ui.rate.textContent=`${Math.round(S.stats.rate*100)}%`;
  ui.dodge.textContent=`${Math.round(S.stats.dodge*100)}%`;
  ui.thrust.textContent=`${Math.round(S.stats.speed*100)}%`;
  ui.repair.textContent=formatRepair(S.stats.repair);
  ui.luck.textContent=`${Math.round(S.stats.luck*100)}%`;

  if(S.upgradeReady){
    const wait=Math.max(0,NORMAL_CHOICE_GAP-(S.time-S.lastDecisionAt));
    ui.xp.textContent=wait>0?`NEXT CHOICE IN ${Math.ceil(wait)}s`:'UPGRADE READY';
  }else{
    ui.xp.textContent=`${Math.floor(S.xp)} / ${S.xpNeed}`;
  }
  ui.xpBar.style.width=`${clamp(S.xp/S.xpNeed*100,0,100)}%`;

  const chips=[];
  for(const [key,level] of Object.entries(S.weapons)){
    if(level>0) chips.push(`<span class="weapon-chip">${WEAPONS[key].icon} ${WEAPONS[key].name} Lv.${level}</span>`);
  }
  for(const synergy of SYNERGIES){
    if(S.synergies[synergy.id]) chips.push(`<span class="synergy-chip">★ ${synergy.name}</span>`);
  }
  for(const special of SPECIALS){
    if(S.upgrades[`special:${special.id}`]) chips.push(`<span class="special-chip">◆ ${special.name}</span>`);
  }
  ui.chips.innerHTML=chips.join('')||'<span class="weapon-chip">• Pulse Cannon Lv.1</span>';
}

function hideOverlay(){
  overlay.classList.add('hidden');
  choiceGrid.classList.add('hidden');
}

function showChoices({type,heading,body,cards,progress='',onPick}){
  S.phase='choice';
  eyebrow.textContent=type;
  overlayTitle.textContent=heading;
  overlayText.innerHTML=`${progress?`<div class="draft-progress">${progress}</div>`:''}${body}`;
  choiceGrid.innerHTML='';
  choiceGrid.classList.remove('hidden');
  startBtn.classList.add('hidden');
  overlay.classList.remove('hidden');

  cards.forEach(card=>{
    const button=document.createElement('button');
    button.className=`choice-card r-${card.rarity.cls}`;
    button.innerHTML=`<span class="rarity">${card.rarity.name.toUpperCase()}</span><h3>${card.title}</h3><p>${card.desc}</p><span class="effect">${card.effect}</span>`;
    button.addEventListener('click',()=>{
      card.apply();
      checkSynergies();
      updateUI();
      hideOverlay();
      onPick();
    },{once:true});
    choiceGrid.appendChild(button);
  });
}

function showOpeningChoice(){
  const index=S.openingPick;
  const specs=[
    ['weapon','survival','offense'],
    ['survival','weapon','utility'],
    ['offense','survival','weapon'],
    ['survival','offense','random'],
    ['weapon','special','survival']
  ];
  showChoices({
    type:'PRE-FLIGHT',
    heading:'Build your ship',
    body:'Pick one upgrade. The run starts after five choices.',
    cards:makeDraft(specs[index],index===4?1:0),
    progress:`STARTING CHOICE ${index+1} OF 5`,
    onPick(){
      S.openingPick++;
      if(S.openingPick<5) setTimeout(showOpeningChoice,50);
      else beginRun();
    }
  });
}

function startRun(){
  cancelAnimationFrame(raf);
  S=freshState();
  updateUI();
  showOpeningChoice();
}

function beginRun(){
  hideOverlay();
  S.phase='running';
  S.grace=12;
  S.lastDecisionAt=0;
  last=performance.now();
  banner('SHIP ONLINE','#8ff7ff','Autopilot engaged');
  raf=requestAnimationFrame(loop);
}

function queueChoice(key,fn,delay=0){
  if(S.queuedKeys[key]) return;
  S.queuedKeys[key]=1;
  S.choiceQueue.push({key,fn,readyAt:S.time+delay});
}

function resumeRun(){
  S.lastDecisionAt=S.time;
  S.phase='running';
  hideOverlay();
}

function showNormalUpgrade(){
  S.upgradeQueued=false;
  S.level++;
  S.xp=Math.max(0,S.xp-S.xpNeed);
  S.xpNeed=Math.round(S.xpNeed*1.16+10);
  S.upgradeReady=S.xp>=S.xpNeed;
  const minRarity=S.nextUpgradeRarity;
  S.nextUpgradeRarity=0;
  showChoices({
    type:'UPGRADE',
    heading:'Choose one upgrade',
    body:'Make one clear improvement, then let the ship run again.',
    cards:makeDraft(['random','survival','random'],minRarity),
    onPick:resumeRun
  });
}

function showBossReward(){
  showChoices({
    type:'BOSS REWARD',
    heading:'Choose a boss reward',
    body:'A rare reward for surviving the dreadnought.',
    cards:makeDraft(['weapon','special','random'],1),
    onPick:resumeRun
  });
}

function gainXP(amount){
  S.xp+=amount*S.stats.xp;
  if(S.xp>=S.xpNeed) S.upgradeReady=true;
}

function checkNormalUpgrade(){
  if(!S.upgradeReady||S.upgradeQueued||S.phase!=='running') return;
  if(S.time-S.lastDecisionAt<NORMAL_CHOICE_GAP) return;
  S.upgradeQueued=true;
  queueChoice('normal-upgrade',()=>{
    delete S.queuedKeys['normal-upgrade'];
    showNormalUpgrade();
  });
}

function processChoiceQueue(){
  if(S.phase!=='running'||!S.choiceQueue.length) return;
  const next=S.choiceQueue[0];
  if(S.time<next.readyAt) return;
  if(S.time-S.lastDecisionAt<QUEUED_CHOICE_GAP) return;
  S.choiceQueue.shift();
  delete S.queuedKeys[next.key];
  next.fn();
}

function checkSynergies(){
  for(const synergy of SYNERGIES){
    if(S.synergies[synergy.id]||!synergy.test(S)) continue;
    S.synergies[synergy.id]=1;
    synergy.apply(S);
    banner(`BUILD BONUS: ${synergy.name}`,'#ffe56b',synergy.desc);
    burst(S.ship.x,S.ship.y,'#ffe56b',30,240,3);
  }
}

function spawnEnemy(type,y=rand(65,H-65),elite=false){
  const data=ENEMIES[type];
  const scale=1+S.time/290;
  S.enemies.push({
    type,x:W+45,y,baseY:y,
    hp:data.hp*scale*(elite?2:1),maxHp:data.hp*scale*(elite?2:1),
    speed:data.speed,fire:rand(.7,Math.max(.9,data.fire)),elite,size:data.size,color:data.color,t:0,charge:0
  });
}

function spawnWave(){
  const pool=['scout','dart','gunner'];
  if(S.time>45) pool.push('swarm','weaver');
  if(S.time>95) pool.push('sniper','bomber','charger');
  if(S.time>165) pool.push('guardian','splitter','tank','healer');
  const count=Math.min(9,3+Math.floor(S.time/80));
  const pattern=pick(['line','sine','cluster']);
  for(let i=0;i<count;i++){
    const y=pattern==='line'
      ? 80+i*(H-160)/Math.max(1,count-1)
      : pattern==='sine'
        ? H/2+Math.sin(i*1.15)*155
        : rand(100,H-100);
    spawnEnemy(pick(pool),y,chance(.03+S.time/7500));
  }
}

function nearestTarget(){
  let best=S.boss||null;
  let x=best?best.x:Infinity;
  for(const enemy of S.enemies){
    if(enemy.hp>0&&enemy.x<x){best=enemy;x=enemy.x;}
  }
  return best;
}

function damageMultiplier(){
  return S.stats.damage*(S.specials.emergency&&S.hull/S.maxHull<.35?1.4:1);
}
function rateMultiplier(){
  return S.stats.rate*(S.specials.emergency&&S.hull/S.maxHull<.35?1.4:1);
}

function updateWeapons(dt){
  for(const key of Object.keys(WEAPONS)) S.cooldowns[key]=Math.max(0,(S.cooldowns[key]||0)-dt);
  const target=nearestTarget();
  if(!target) return;

  for(const [key,level] of Object.entries(S.weapons)){
    if(level<=0||S.cooldowns[key]>0) continue;
    const weapon=WEAPONS[key];
    S.cooldowns[key]=weapon.cool/(rateMultiplier()*Math.sqrt(level));
    let count=key==='scatter'?Math.min(9,2+level):key==='drone'?Math.min(5,level):1;
    if(key==='missile'&&S.specials.missileBarrage) count=2;

    for(let i=0;i<count;i++){
      const base=Math.atan2(target.y-S.ship.y,target.x-S.ship.x);
      const angle=base+(i-(count-1)/2)*(key==='scatter'?.105:.035);
      const speed=(weapon.speed+level*40)*S.stats.projectile;
      const crit=chance(S.stats.crit);
      S.shots.push({
        kind:key,x:S.ship.x+24,y:S.ship.y,
        vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
        damage:(weapon.damage+level*1.35)*damageMultiplier()*(crit?2:1),
        life:3.2,color:weapon.color,
        pierce:S.stats.pierce+(key==='rail'?2:0),
        splash:S.stats.splash+((key==='flak'||key==='nova')?1+level*.2:0),
        homing:key==='missile',crit,trail:[]
      });
    }
  }
}

function hurtShip(amount){
  if(S.ship.inv>0||S.phase!=='running') return;
  if(S.specials.pointDefense&&++S.bulletsSeen%9===0) return;
  let damage=amount;
  if(S.shield>0){
    const absorbed=Math.min(S.shield,damage);
    S.shield-=absorbed;
    damage-=absorbed;
  }
  if(damage>0&&chance(S.stats.armor)) damage=Math.max(0,damage-1);
  if(damage>0){
    S.hull-=damage;
    S.screenShake=Math.max(S.screenShake,5);
    S.flash=.12;
    popup(`-${damage}`,S.ship.x,S.ship.y-24,'#ff8095');
  }
  S.ship.inv=.55;
  S.shieldDelay=4;

  if(S.hull<=0){
    if(S.specials.secondChance){
      S.specials.secondChance--;
      S.hull=Math.max(1,S.maxHull*.4);
      S.shield=S.maxShield;
      S.ship.inv=2;
      banner('SECOND CHANCE','#ffe56b','Back in the fight');
    }else{
      endRun();
    }
  }
}

function killEnemy(enemy){
  const data=ENEMIES[enemy.type];
  S.salvage+=data.salvage*S.stats.salvage;
  S.kills++;
  S.combo++;
  S.comboTimer=2;
  gainXP(data.xp);
  burst(enemy.x,enemy.y,enemy.color,enemy.elite?26:14,enemy.elite?270:190,enemy.elite?4:3);
  S.screenShake=Math.max(S.screenShake,enemy.elite?3:1.4);

  if(S.specials.combatRepair&&S.kills%15===0){
    S.hull=Math.min(S.maxHull,S.hull+1);
    popup('+1 HULL',S.ship.x,S.ship.y-28,'#8fffb2',1.1);
  }

  if(enemy.type==='splitter'){
    spawnEnemy('swarm',enemy.y-18);
    spawnEnemy('swarm',enemy.y+18);
    const a=S.enemies[S.enemies.length-1];
    const b=S.enemies[S.enemies.length-2];
    if(a) a.x=enemy.x;
    if(b) b.x=enemy.x;
  }
}

function updateAutopilot(dt){
  S.ship.ai-=dt;
  if(S.ship.ai<=0){
    S.ship.ai=Math.max(.04,.19*(1-S.stats.dodge));
    let bestY=H/2;
    let bestRisk=Infinity;
    for(let y=58;y<H-48;y+=28){
      let risk=Math.abs(y-H/2)*.0013;
      for(const bullet of S.bullets){
        const dx=bullet.x-S.ship.x;
        if(dx>-25&&dx<410) risk+=Math.max(0,9-Math.abs(y-bullet.y)/10)*(1+S.stats.dodge*2.2);
      }
      for(const enemy of S.enemies){
        const dx=enemy.x-S.ship.x;
        if(dx>0&&dx<220) risk+=Math.max(0,8-Math.abs(y-enemy.y)/13);
      }
      if(risk<bestRisk){bestRisk=risk;bestY=y;}
    }
    S.ship.targetY=bestY;
  }

  const oldY=S.ship.y;
  const maxMove=325*S.stats.speed*dt;
  S.ship.y+=clamp(S.ship.targetY-S.ship.y,-maxMove,maxMove);
  S.ship.y=clamp(S.ship.y,42,H-38);
  S.ship.tilt=(S.ship.y-oldY)*.12;
  S.ship.inv=Math.max(0,S.ship.inv-dt);
}

function fireEnemy(enemy){
  const data=ENEMIES[enemy.type];
  const angle=Math.atan2(S.ship.y-enemy.y,S.ship.x-enemy.x);
  const speed=(enemy.type==='sniper'?320:190+S.time*.075)*S.combatSpeed;
  const spread=enemy.type==='bomber'?[-.17,0,.17]:enemy.type==='weaver'?[-.1,.1]:[0];
  for(const offset of spread){
    S.bullets.push({
      x:enemy.x,y:enemy.y,
      vx:Math.cos(angle+offset)*speed,vy:Math.sin(angle+offset)*speed,
      damage:data.damage,life:5.5,hot:enemy.type==='sniper'
    });
  }
}

function updateEnemies(dt){
  for(const enemy of S.enemies){
    const data=ENEMIES[enemy.type];
    enemy.t+=dt;
    let movement=data.speed*S.combatSpeed*dt*(.80+S.threat*.08);
    if(enemy.type==='charger'&&enemy.x<700){
      if(!enemy.charge) enemy.charge=.8;
      enemy.charge-=dt;
      if(enemy.charge<0) movement*=3.2;
    }
    enemy.x-=movement;
    if(enemy.type==='dart') enemy.y=enemy.baseY+Math.sin(enemy.t*5)*85;
    if(enemy.type==='swarm') enemy.y=enemy.baseY+Math.sin(enemy.t*6+enemy.x*.02)*48;
    if(enemy.type==='bomber') enemy.y=enemy.baseY+Math.sin(enemy.t*1.7)*60;
    if(enemy.type==='weaver') enemy.y=enemy.baseY+Math.sin(enemy.t*3.2)*105;
    if(enemy.type==='healer'){
      const ally=S.enemies.find(other=>other!==enemy&&other.hp>0&&other.hp<other.maxHp);
      if(ally) ally.hp=Math.min(ally.maxHp,ally.hp+3*dt);
    }
    enemy.fire-=dt;
    if(enemy.fire<=0&&enemy.x<W-45&&data.fire<90&&S.grace<=0){
      enemy.fire=data.fire*rand(.95,1.30)/Math.sqrt(S.threat);
      fireEnemy(enemy);
    }
    if(Math.hypot(enemy.x-S.ship.x,enemy.y-S.ship.y)<enemy.size+13){
      enemy.hp=0;
      hurtShip(data.damage);
    }
  }
}

function updateProjectiles(dt){
  for(const bullet of S.bullets){
    bullet.x+=bullet.vx*dt;
    bullet.y+=bullet.vy*dt;
    bullet.life-=dt;
    if(S.specials.droneDefense&&Math.hypot(bullet.x-S.ship.x,bullet.y-S.ship.y)<70&&chance(.04)){
      bullet.life=0;
      burst(bullet.x,bullet.y,'#7fffc5',4,80,2);
    }
    if(Math.hypot(bullet.x-S.ship.x,bullet.y-S.ship.y)<14){
      bullet.life=0;
      hurtShip(bullet.damage);
    }
  }

  for(const shot of S.shots){
    shot.trail.push({x:shot.x,y:shot.y});
    if(shot.trail.length>6) shot.trail.shift();
    if(shot.homing){
      const target=nearestTarget();
      if(target){
        const desired=Math.atan2(target.y-shot.y,target.x-shot.x);
        const speed=Math.hypot(shot.vx,shot.vy);
        const current=Math.atan2(shot.vy,shot.vx);
        const diff=((desired-current+Math.PI*3)%(Math.PI*2))-Math.PI;
        const angle=current+clamp(diff,-4.2*dt,4.2*dt);
        shot.vx=Math.cos(angle)*speed;
        shot.vy=Math.sin(angle)*speed;
      }
    }
    shot.x+=shot.vx*dt;
    shot.y+=shot.vy*dt;
    shot.life-=dt;

    for(const enemy of S.enemies){
      if(enemy.hp<=0) continue;
      if(Math.hypot(shot.x-enemy.x,shot.y-enemy.y)>=enemy.size+5) continue;
      enemy.hp-=shot.damage;

      if(shot.crit&&S.specials.blastCrit){
        for(const other of S.enemies){
          if(other!==enemy&&Math.hypot(other.x-enemy.x,other.y-enemy.y)<80) other.hp-=shot.damage*.35;
        }
      }
      if(shot.splash){
        const radius=45+shot.splash*17;
        for(const other of S.enemies){
          if(other!==enemy&&other.hp>0&&Math.hypot(other.x-enemy.x,other.y-enemy.y)<radius) other.hp-=shot.damage*.32;
        }
      }
      if(shot.kind==='arc'){
        const other=S.enemies.find(o=>o!==enemy&&o.hp>0&&Math.hypot(o.x-enemy.x,o.y-enemy.y)<120);
        if(other) other.hp-=shot.damage*.60;
      }
      if(shot.kind==='rail'&&S.specials.beamCannon) enemy.hp-=shot.damage*.35;
      if((shot.kind==='nova'||shot.kind==='flak')&&S.specials.chainBombs&&chance(.25)){
        for(const other of S.enemies){
          if(other!==enemy&&Math.hypot(other.x-enemy.x,other.y-enemy.y)<110) other.hp-=shot.damage*.25;
        }
      }
      if(shot.pierce>0) shot.pierce--;
      else shot.life=0;
      break;
    }

    if(S.boss&&Math.hypot(shot.x-S.boss.x,shot.y-S.boss.y)<S.boss.size){
      S.boss.hp-=shot.damage;
      if(shot.pierce<=0) shot.life=0;
    }
  }
}

function spawnBoss(){
  const type=BOSSES[S.bosses%BOSSES.length];
  const hp=235*(1+S.bosses*.55);
  S.boss={type,x:W+90,y:H/2,hp,maxHp:hp,size:64,fire:1.45,t:0,phase:1};
  banner('DREADNOUGHT INCOMING',type.color,type.name);
  S.screenShake=5;
}

function updateBoss(dt){
  if(!S.boss) return;
  const boss=S.boss;
  boss.t+=dt;
  boss.x+=(W-170-boss.x)*dt*.38;
  boss.y=H/2+Math.sin(boss.t*(1.2+boss.phase*.15))*135;
  boss.phase=boss.hp/boss.maxHp<.33?3:boss.hp/boss.maxHp<.66?2:1;
  boss.fire-=dt;

  if(boss.fire<=0&&S.grace<=0){
    boss.fire=Math.max(.46,1.36-boss.phase*.13-S.bosses*.035);
    const base=Math.atan2(S.ship.y-boss.y,S.ship.x-boss.x);
    const count=3+boss.phase*2;
    for(let i=0;i<count;i++){
      const offset=(i-(count-1)/2)*(.09+boss.phase*.018);
      const speed=(205+boss.phase*24)*S.combatSpeed;
      S.bullets.push({
        x:boss.x,y:boss.y,
        vx:Math.cos(base+offset)*speed,vy:Math.sin(base+offset)*speed,
        damage:boss.phase===3?2:1,life:7
      });
    }
  }

  if(boss.hp<=0){
    const name=boss.type.name;
    burst(boss.x,boss.y,boss.type.color,75,380,5);
    S.screenShake=12;
    S.boss=null;
    S.bosses++;
    S.salvage+=20;
    S.hull=Math.min(S.maxHull,S.hull+Math.max(3,S.maxHull*.22));
    S.shield=S.maxShield;
    gainXP(20);
    banner(`${name} DESTROYED`,'#ffe56b','Boss reward incoming');
    queueChoice(`boss-reward-${S.bosses}`,showBossReward,4);
  }
}

function showRouteEvent(){
  const economyCard=S.salvage>=12
    ? {
        rarity:RARITIES[1],
        title:'Weapon Workshop',
        desc:'Spend salvage to improve weapons without opening another menu.',
        effect:'Spend 12 salvage → +2 levels to installed weapons',
        apply(){
          S.salvage-=12;
          const installed=Object.keys(S.weapons).filter(key=>S.weapons[key]>0);
          for(let i=0;i<2;i++){
            const key=pick(installed);
            S.weapons[key]=Math.min(15,S.weapons[key]+1);
          }
          banner('WEAPONS IMPROVED','#8fffb2','Workshop complete');
        }
      }
    : {
        rarity:RARITIES[1],
        title:'Scavenge the Wreck',
        desc:'You do not have enough salvage for the workshop yet.',
        effect:'+8 salvage',
        apply(){S.salvage+=8;}
      };

  const cards=[
    {
      rarity:RARITIES[0],
      title:'Repair Stop',
      desc:'Take a safe maintenance stop before continuing.',
      effect:'Heal 45% hull and fully recharge shields',
      apply(){S.hull=Math.min(S.maxHull,S.hull+S.maxHull*.45);S.shield=S.maxShield;}
    },
    economyCard,
    {
      rarity:RARITIES[2],
      title:'Take the Risky Route',
      desc:'Face slightly more pressure for a better future upgrade.',
      effect:'+10% threat, +8 salvage, next upgrade is Legendary or better',
      apply(){
        S.threat+=.10;
        S.salvage+=8;
        S.nextUpgradeRarity=Math.max(S.nextUpgradeRarity,2);
      }
    }
  ];

  showChoices({
    type:'ROUTE EVENT',
    heading:'Choose the next route',
    body:'One decision, then the run continues automatically.',
    cards,
    onPick:resumeRun
  });
}

function pressureFactor(){
  const health=S.hull/S.maxHull;
  if(health<.25) return .48;
  if(health<.45) return .66;
  if(health<.65) return .84;
  if(health>.88&&S.shield>S.maxShield*.55) return 1.10;
  return 1;
}

function updateDirector(dt){
  if(S.grace>0){
    S.grace-=dt;
    return;
  }

  const pressure=pressureFactor();
  S.director.spawn-=dt;
  S.director.wave-=dt;
  S.director.event-=dt;
  S.director.boss-=dt;
  S.director.breather-=dt;

  if(S.director.spawn<=0){
    const pool=S.time<55
      ? ['scout','dart']
      : S.time<115
        ? ['scout','dart','gunner','weaver']
        : ['scout','dart','gunner','weaver','sniper','charger'];
    spawnEnemy(pick(pool));
    S.director.spawn=rand(1.9,2.9)/(S.threat*pressure);
  }

  if(S.director.wave<=0){
    spawnWave();
    S.director.wave=rand(9.5,13.5)/Math.sqrt(S.threat*pressure);
  }

  if(S.director.event<=0){
    if(S.time-S.lastDecisionAt>=55){
      queueChoice(`event-${Math.floor(S.time)}`,showRouteEvent,0);
      S.director.event=rand(125,155);
    }else{
      S.director.event=18;
    }
  }

  if(S.director.boss<=0&&!S.boss){
    S.director.boss=rand(180,220);
    spawnBoss();
  }

  if(S.director.breather<=0){
    S.grace=Math.max(S.grace,5);
    S.director.breather=rand(52,68);
    banner('CLEAR AIR','#8ff7ff','A few seconds to recover');
  }
}

function checkMilestones(){
  if(S.time<S.nextMilestone) return;
  const minutes=Math.floor(S.nextMilestone/60);
  banner(`${minutes} MINUTE${minutes===1?'':'S'} SURVIVED`,'#ffe56b',minutes%2===0?'Rarity luck increased':'The build keeps growing');
  if(minutes%2===0) S.stats.luck=Math.min(.75,S.stats.luck+.02);
  S.nextMilestone+=60;
}

function update(dt){
  S.time+=dt;
  S.worldSpeed=1.75+Math.min(.65,S.time/720);
  S.combatSpeed=1.16+Math.min(.22,S.time/1200);
  S.threat=.50+Math.min(2.55,S.time/185);
  S.hull=Math.min(S.maxHull,S.hull+S.stats.repair*dt);

  if(S.shieldDelay>0) S.shieldDelay-=dt;
  else S.shield=Math.min(S.maxShield,S.shield+S.shieldRegen*dt);

  if(S.comboTimer>0){
    S.comboTimer-=dt;
    if(S.comboTimer<=0) S.combo=0;
  }

  S.screenShake=Math.max(0,S.screenShake-dt*18);
  S.flash=Math.max(0,S.flash-dt);

  updateAutopilot(dt);
  updateWeapons(dt);
  updateDirector(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateBoss(dt);
  checkMilestones();
  checkNormalUpgrade();

  for(const enemy of S.enemies){
    if(enemy.hp<=0&&!enemy.dead){
      enemy.dead=true;
      killEnemy(enemy);
    }
  }

  S.enemies=S.enemies.filter(enemy=>!enemy.dead&&enemy.x>-80);
  S.bullets=S.bullets.filter(b=>b.life>0&&b.x>-80&&b.x<W+80&&b.y>-70&&b.y<H+70);
  S.shots=S.shots.filter(s=>s.life>0&&s.x<W+100&&s.y>-80&&s.y<H+80);

  for(const particle of S.particles){
    particle.x+=particle.vx*dt;
    particle.y+=particle.vy*dt;
    particle.vx*=.98;
    particle.vy*=.98;
    particle.life-=dt;
  }
  S.particles=S.particles.filter(p=>p.life>0);

  for(const item of S.popups){item.y-=26*dt;item.life-=dt;}
  S.popups=S.popups.filter(p=>p.life>0);
  for(const item of S.banners) item.life-=dt;
  S.banners=S.banners.filter(b=>b.life>0);

  updateUI();
  processChoiceQueue();
}

function drawEnemy(enemy){
  ctx.save();
  ctx.translate(enemy.x,enemy.y);
  ctx.fillStyle=enemy.color;
  ctx.shadowColor=enemy.color;
  ctx.shadowBlur=enemy.elite?14:5;

  if(enemy.type==='tank'){
    ctx.fillRect(-enemy.size,-12,enemy.size*2,24);
    ctx.fillRect(-8,-20,18,40);
  }else if(enemy.type==='swarm'){
    ctx.beginPath();
    ctx.moveTo(13,0);ctx.lineTo(-10,-8);ctx.lineTo(-5,0);ctx.lineTo(-10,8);ctx.closePath();ctx.fill();
  }else if(enemy.type==='guardian'){
    ctx.beginPath();ctx.arc(0,0,enemy.size,0,Math.PI*2);ctx.strokeStyle=enemy.color;ctx.lineWidth=4;ctx.stroke();ctx.fillRect(-9,-9,18,18);
  }else if(enemy.type==='healer'){
    ctx.fillRect(-5,-20,10,40);ctx.fillRect(-20,-5,40,10);
  }else{
    ctx.beginPath();ctx.moveTo(-enemy.size,0);ctx.lineTo(0,-enemy.size*.7);ctx.lineTo(enemy.size,0);ctx.lineTo(0,enemy.size*.7);ctx.closePath();ctx.fill();
  }

  ctx.shadowBlur=0;
  if(enemy.elite){
    ctx.strokeStyle='#ffe56b';ctx.lineWidth=2;ctx.strokeRect(-enemy.size-4,-enemy.size*.75,enemy.size*2+8,enemy.size*1.5);
  }
  ctx.restore();
}

function draw(){
  const biome=BIOMES[Math.floor(S.time/60)%BIOMES.length];
  ctx.save();
  if(S.screenShake) ctx.translate(rand(-S.screenShake,S.screenShake),rand(-S.screenShake,S.screenShake));

  const gradient=ctx.createLinearGradient(0,0,0,H);
  gradient.addColorStop(0,biome.top);
  gradient.addColorStop(1,biome.bottom);
  ctx.fillStyle=gradient;
  ctx.fillRect(-20,-20,W+40,H+40);

  ctx.fillStyle=biome.fog;
  for(let i=0;i<6;i++){
    const x=(W+260)-(S.time*(25+i*6)*S.worldSpeed+i*190)%(W+520)-210;
    const y=70+i*82;
    ctx.beginPath();ctx.arc(x,y,105+i*17,0,Math.PI*2);ctx.fill();
  }

  for(const star of stars){
    star.x-=star.z*4.4*S.worldSpeed;
    if(star.x<0) star.x=W;
    ctx.fillStyle=`rgba(255,255,255,${.18+star.z*.68})`;
    ctx.fillRect(star.x,star.y,star.s,star.s);
  }

  for(let i=0;i<9;i++){
    const x=W-((S.time*110*S.worldSpeed+i*145)%(W+240));
    ctx.fillStyle=`rgba(255,255,255,${.035+i*.005})`;
    ctx.fillRect(x,45+(i*59)%450,85+i*7,1);
  }

  ctx.fillStyle='#02061155';ctx.fillRect(0,0,W,31);
  ctx.fillStyle=biome.accent;ctx.font='bold 12px monospace';
  ctx.fillText(`${biome.name}  •  SPEED ${S.worldSpeed.toFixed(1)}×  •  THREAT ${S.threat.toFixed(1)}×${S.grace>0?`  •  SAFE ${Math.ceil(S.grace)}s`:''}`,15,20);

  ctx.save();
  ctx.translate(S.ship.x,S.ship.y);
  ctx.rotate(S.ship.tilt*.02);
  ctx.shadowColor='#76e8f1';ctx.shadowBlur=14;
  ctx.fillStyle=S.ship.inv>0?'#ffffff':'#75e8f2';
  ctx.beginPath();
  ctx.moveTo(30,0);ctx.lineTo(-12,-10);ctx.lineTo(-24,-24);ctx.lineTo(-15,-4);ctx.lineTo(-26,0);ctx.lineTo(-15,4);ctx.lineTo(-24,24);ctx.lineTo(-12,10);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle='#c8ffff';ctx.fillRect(6,-4,11,8);
  ctx.fillStyle='#ffd76e';
  const exhaust=16+S.worldSpeed*6+rand(0,8);
  ctx.fillRect(-30-exhaust+12,-4,exhaust,8);

  if(S.maxShield>0&&S.shield>0){
    ctx.strokeStyle=`rgba(125,225,255,${.20+.38*S.shield/S.maxShield})`;
    ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,32,0,Math.PI*2);ctx.stroke();
  }

  if(S.weapons.drone>0){
    const count=Math.min(3,S.weapons.drone);
    for(let i=0;i<count;i++){
      const a=S.time*2.4+i*Math.PI*2/count;
      ctx.fillStyle='#7fffc5';
      ctx.fillRect(Math.cos(a)*42-3,Math.sin(a)*25-3,6,6);
    }
  }
  ctx.restore();

  for(const enemy of S.enemies) drawEnemy(enemy);

  for(const shot of S.shots){
    ctx.globalAlpha=.28;
    for(const trail of shot.trail){ctx.fillStyle=shot.color;ctx.fillRect(trail.x-4,trail.y-1,8,2);}
    ctx.globalAlpha=1;
    ctx.shadowColor=shot.color;ctx.shadowBlur=9;ctx.fillStyle=shot.color;
    if(shot.kind==='missile'||shot.kind==='nova'){
      ctx.beginPath();ctx.arc(shot.x,shot.y,shot.kind==='nova'?6:4,0,Math.PI*2);ctx.fill();
    }else{
      ctx.fillRect(shot.x-6,shot.y-2,12,4);
    }
    ctx.shadowBlur=0;
  }

  for(const bullet of S.bullets){
    ctx.shadowColor=bullet.hot?'#ffffff':'#ff7890';ctx.shadowBlur=bullet.hot?12:6;
    ctx.fillStyle=bullet.hot?'#fff1b0':'#ff7890';ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.hot?5:4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  }

  for(const particle of S.particles){
    ctx.globalAlpha=Math.max(0,particle.life/particle.max);ctx.fillStyle=particle.color;ctx.fillRect(particle.x,particle.y,particle.size,particle.size);
  }
  ctx.globalAlpha=1;

  for(const item of S.popups){
    ctx.globalAlpha=Math.max(0,item.life/item.max);ctx.fillStyle=item.color;ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(item.text,item.x,item.y);
  }
  ctx.globalAlpha=1;ctx.textAlign='left';

  if(S.combo>=6){ctx.fillStyle='#ffe56b';ctx.font='bold 14px monospace';ctx.fillText(`${S.combo} KILL CHAIN`,15,H-18);}

  if(S.boss){
    const boss=S.boss;
    ctx.save();ctx.translate(boss.x,boss.y);ctx.shadowColor=boss.type.color;ctx.shadowBlur=24;ctx.fillStyle=boss.type.color;
    ctx.beginPath();ctx.moveTo(-68,0);ctx.lineTo(-35,-44);ctx.lineTo(28,-35);ctx.lineTo(64,0);ctx.lineTo(28,35);ctx.lineTo(-35,44);ctx.closePath();ctx.fill();
    ctx.fillStyle=boss.type.accent;ctx.beginPath();ctx.arc(5,0,13+boss.phase*2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.restore();
    ctx.fillStyle='#070b14cc';ctx.fillRect(W-300,43,260,13);ctx.fillStyle=boss.type.color;ctx.fillRect(W-297,46,254*clamp(boss.hp/boss.maxHp,0,1),7);
    ctx.fillStyle='#ffffff';ctx.font='bold 10px monospace';ctx.textAlign='right';ctx.fillText(`${boss.type.name}  PHASE ${boss.phase}`,W-42,39);ctx.textAlign='left';
  }

  const active=S.banners[0];
  if(active){
    const alpha=1-Math.abs(active.life/active.max-.5)*1.4;
    ctx.globalAlpha=clamp(alpha,0,1);ctx.textAlign='center';ctx.fillStyle='#020611bb';ctx.fillRect(W/2-230,H*.17-34,460,76);
    ctx.fillStyle=active.color;ctx.font='bold 24px monospace';ctx.fillText(active.text,W/2,H*.17);
    ctx.fillStyle='#ffffff';ctx.font='11px monospace';ctx.fillText(active.sub,W/2,H*.17+22);ctx.textAlign='left';ctx.globalAlpha=1;
  }

  if(S.flash){ctx.fillStyle=`rgba(255,255,255,${S.flash*1.3})`;ctx.fillRect(0,0,W,H);}
  ctx.restore();
}

function endRun(){
  S.phase='dead';
  cancelAnimationFrame(raf);
  S.best=Math.max(S.best,S.time);
  localStorage.setItem('starwardBest',S.best);
  eyebrow.textContent='RUN COMPLETE';
  overlayTitle.textContent=`Survived ${formatTime(S.time)}`;
  overlayText.textContent=`Build level ${S.level} • ${S.kills} enemies destroyed • ${S.bosses} bosses defeated • Best ${formatTime(S.best)}`;
  choiceGrid.classList.add('hidden');
  startBtn.textContent='Build Another Ship';
  startBtn.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function loop(now){
  if(S.phase==='dead'||S.phase==='menu') return;
  const dt=Math.min(.033,(now-last)/1000||.016);
  last=now;
  if(S.phase==='running') update(dt);
  draw();
  raf=requestAnimationFrame(loop);
}

startBtn.addEventListener('click',startRun);
S=freshState();
updateUI();
draw();
})();

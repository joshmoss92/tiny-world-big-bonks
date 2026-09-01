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
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const rand = (a,b) => a + Math.random()*(b-a);
const pick = (arr) => arr[(Math.random()*arr.length)|0];
const chance = (p) => Math.random() < p;
const lerp = (a,b,t) => a+(b-a)*t;
ctx.imageSmoothingEnabled = false;

const RARITIES = [
  { name:'Rare', cls:'rare', weight:55, power:1.00 },
  { name:'Epic', cls:'epic', weight:25, power:1.45 },
  { name:'Legendary', cls:'legendary', weight:12, power:2.10 },
  { name:'Mythic', cls:'mythic', weight:6, power:3.10 },
  { name:'God', cls:'god', weight:2, power:4.80 }
];

const BIOMES = [
  { name:'Cloudreach', top:'#10294f', bottom:'#67b6c8', accent:'#b8ef9a', haze:'#b8ef9a18' },
  { name:'Ember Belt', top:'#25162e', bottom:'#c55a47', accent:'#ffd06c', haze:'#ff9a691c' },
  { name:'Silent Ruins', top:'#0b1230', bottom:'#354467', accent:'#7ce6df', haze:'#7ce6df14' },
  { name:'Stormglass', top:'#0b1120', bottom:'#26394f', accent:'#d9efff', haze:'#92b7d418' },
  { name:'Violet Deep', top:'#211132', bottom:'#70407c', accent:'#ffc0ef', haze:'#ffc0ef18' }
];

const WEAPONS = {
  pulse:   { name:'Pulse Cannon', icon:'•', color:'#fff1a0', cooldown:.34, damage:5.0, speed:650 },
  scatter: { name:'Scatter Array', icon:'✣', color:'#ffb5e5', cooldown:.72, damage:3.1, speed:570 },
  missile: { name:'Seeker Rack', icon:'◇', color:'#b7ff8c', cooldown:.92, damage:8.0, speed:450 },
  rail:    { name:'Rail Lance', icon:'━', color:'#ffffff', cooldown:1.15, damage:12.0, speed:1050 },
  flak:    { name:'Flak Core', icon:'✹', color:'#ff9b77', cooldown:.82, damage:7.0, speed:520 },
  arc:     { name:'Arc Coil', icon:'ϟ', color:'#9fc5ff', cooldown:.98, damage:6.2, speed:700 },
  drone:   { name:'Escort Drones', icon:'⊙', color:'#7fffc3', cooldown:.62, damage:4.0, speed:680 },
  laser:   { name:'Prism Laser', icon:'▸', color:'#ff8df4', cooldown:.18, damage:2.4, speed:1200 },
  nova:    { name:'Nova Mortar', icon:'✦', color:'#ffd27a', cooldown:1.35, damage:13.0, speed:420 }
};

const ENEMIES = {
  scout:    { hp:8,  speed:118, fire:2.8, damage:1, xp:2, salvage:1, size:15, color:'#a9ef8c' },
  dart:     { hp:6,  speed:180, fire:99,  damage:1, xp:2, salvage:1, size:12, color:'#ff879a' },
  gunner:   { hp:17, speed:88,  fire:1.8, damage:1, xp:4, salvage:2, size:20, color:'#8ce6de' },
  tank:     { hp:42, speed:62,  fire:2.2, damage:2, xp:7, salvage:4, size:28, color:'#f2b96b' },
  sniper:   { hp:15, speed:72,  fire:3.7, damage:2, xp:5, salvage:3, size:18, color:'#ff9a78' },
  swarm:    { hp:4,  speed:205, fire:4.2, damage:1, xp:1, salvage:1, size:10, color:'#e8ff92' },
  bomber:   { hp:28, speed:76,  fire:3.2, damage:2, xp:6, salvage:4, size:23, color:'#ffa86e' },
  guardian: { hp:32, speed:68,  fire:2.6, damage:1, xp:7, salvage:4, size:24, color:'#73c9ff' },
  splitter: { hp:20, speed:98,  fire:2.8, damage:1, xp:5, salvage:3, size:19, color:'#f09bd7' },
  charger:  { hp:22, speed:90,  fire:99,  damage:2, xp:5, salvage:3, size:19, color:'#ff6687' },
  healer:   { hp:24, speed:67,  fire:99,  damage:1, xp:7, salvage:5, size:21, color:'#82ffbc' },
  weaver:   { hp:18, speed:95,  fire:2.2, damage:1, xp:5, salvage:3, size:18, color:'#c7a8ff' }
};

const BOSS_TYPES = [
  { name:'Glimmer Maw', color:'#ff7d9f', accent:'#ffe5ef' },
  { name:'Cinder Throne', color:'#ff925f', accent:'#ffd27a' },
  { name:'Archive Crown', color:'#77e6df', accent:'#c8ffff' },
  { name:'Storm Seraph', color:'#9fc5ff', accent:'#ffffff' },
  { name:'Violet Oracle', color:'#d58cff', accent:'#ffc0ef' }
];

const PREFIXES = [
  'Refined','Twin','Quantum','Adaptive','Ancient','Overclocked','Harmonic','Void-Touched','Stellar',
  'Recursive','Royal','Impossible','Astral','Mirrored','Hyperdense','Living','Fractal','Sovereign',
  'Resonant','Radiant','Predatory','Celestial','Perfect','Infinite'
];
const SUFFIXES = ['Mk II','Protocol','Core','Array','Engine','Matrix','Lattice','Directive','Catalyst','Circuit','Doctrine','Drive','Crown','Heart','Bloom'];

const STAT_FAMILIES = [
  { key:'hull', name:'Hull Matrix', group:'survival', base:2, desc:'maximum hull', format:v=>`+${v} max hull and repair ${Math.max(1,Math.ceil(v*.7))} hull` },
  { key:'dodge', name:'Evasive AI', group:'survival', base:1, desc:'evasion intelligence', format:v=>`+${v} evade intelligence` },
  { key:'thrust', name:'Vector Thrusters', group:'survival', base:.12, desc:'maneuver thrust', format:v=>`+${Math.round(v*100)}% thrust` },
  { key:'shield', name:'Shield Lattice', group:'survival', base:2, desc:'shield capacity', format:v=>`+${v} shield capacity and refill` },
  { key:'repair', name:'Repair Nanites', group:'survival', base:.018, desc:'hull regeneration', format:v=>`+${v.toFixed(3)} hull/sec repair` },
  { key:'armor', name:'Reactive Armor', group:'survival', base:.07, desc:'damage mitigation', format:v=>`+${Math.round(v*100)}% mitigation chance` },
  { key:'damage', name:'Targeting Uplink', group:'offense', base:.13, desc:'weapon damage', format:v=>`+${Math.round(v*100)}% weapon damage` },
  { key:'rate', name:'Cryo Cooling', group:'offense', base:.11, desc:'fire rate', format:v=>`+${Math.round(v*100)}% fire rate` },
  { key:'crit', name:'Critical Matrix', group:'offense', base:.055, desc:'critical chance', format:v=>`+${Math.round(v*100)}% critical chance` },
  { key:'projectile', name:'Accelerator', group:'offense', base:.14, desc:'projectile velocity', format:v=>`+${Math.round(v*100)}% projectile speed` },
  { key:'pierce', name:'Phase Bore', group:'offense', base:1, desc:'projectile penetration', format:v=>`+${v} projectile pierce` },
  { key:'splash', name:'Blast Geometry', group:'offense', base:1, desc:'explosive radius', format:v=>`+${v} splash power` },
  { key:'salvage', name:'Salvage Logic', group:'utility', base:.16, desc:'salvage yield', format:v=>`+${Math.round(v*100)}% salvage` },
  { key:'xp', name:'Combat Telemetry', group:'utility', base:.14, desc:'experience gain', format:v=>`+${Math.round(v*100)}% XP` },
  { key:'luck', name:'Lucky Star', group:'utility', base:.04, desc:'rarity luck', format:v=>`+${Math.round(v*100)}% luck` }
];

const SPECIALS = [
  { id:'phoenix', name:'Phoenix Kernel', min:2, desc:'Once per run, lethal damage restores the ship instead.', effect:'1 automatic revive at 35% hull', apply(){S.specials.phoenix=(S.specials.phoenix||0)+1;} },
  { id:'glass', name:'Glass Reactor', min:2, desc:'Convert durability into overwhelming firepower.', effect:'+55% damage, -2 max hull', apply(){S.stats.damage+=.55;S.maxHull=Math.max(5,S.maxHull-2);S.hull=Math.min(S.hull,S.maxHull);} },
  { id:'lastlight', name:'Last Light Protocol', min:2, desc:'The ship becomes more dangerous when badly damaged.', effect:'+60% damage below 40% hull', apply(){S.specials.lastlight=1;} },
  { id:'scavenger', name:'Scavenger Bloom', min:2, desc:'Sustained destruction feeds the repair systems.', effect:'Every 12 kills repairs 1 hull', apply(){S.specials.scavenger=(S.specials.scavenger||0)+1;} },
  { id:'mirror', name:'Mirror Shield', min:3, desc:'Shield geometry occasionally erases incoming fire.', effect:'Every 8th incoming shot is deleted', apply(){S.specials.mirror=(S.specials.mirror||0)+1;} },
  { id:'oracle', name:'Oracle Engine', min:3, desc:'Prediction routines improve both evasion and rarity.', effect:'+2 evade, +10% luck', apply(){S.stats.dodge+=2;S.stats.luck=Math.min(.8,S.stats.luck+.10);} },
  { id:'arsenal', name:'Impossible Arsenal', min:3, desc:'All installed weapons gain another evolution level.', effect:'+1 level to every installed weapon', apply(){for(const k of Object.keys(S.weapons))if(S.weapons[k]>0)S.weapons[k]=Math.min(15,S.weapons[k]+1);} },
  { id:'crown', name:'Sovereign Core', min:4, desc:'A near-mythical fusion of offense and survival.', effect:'+35% damage, +3 hull, +2 shield', apply(){S.stats.damage+=.35;S.maxHull+=3;S.hull+=3;S.maxShield+=2;S.shield=S.maxShield;} }
];

const SYNERGIES = [
  { id:'aegis', name:'Aegis Loop', desc:'Shield + repair reinforce each other.', test:s=>s.maxShield>=6&&s.stats.repair>=.05, apply:s=>{s.shieldRegen+=.035;s.stats.repair+=.012;} },
  { id:'ghost', name:'Ghost Vector', desc:'Evasion and thrust become predictive movement.', test:s=>s.stats.dodge>=4&&s.stats.thrust>=1.45, apply:s=>{s.stats.dodge+=1;s.stats.thrust+=.12;} },
  { id:'war', name:'War Engine', desc:'High damage and rate enter a stable firing loop.', test:s=>s.stats.damage>=1.7&&s.stats.rate>=1.45, apply:s=>{s.stats.damage+=.15;s.stats.rate+=.15;} },
  { id:'crown', name:'Scavenger Crown', desc:'Luck turns salvage into a compounding economy.', test:s=>s.stats.salvage>=1.45&&s.stats.luck>=.12, apply:s=>{s.stats.salvage+=.22;s.stats.xp+=.10;} },
  { id:'mass', name:'Critical Mass', desc:'Critical hits destabilize nearby enemies.', test:s=>s.stats.crit>=.18&&s.stats.splash>=2, apply:s=>{s.specials.criticalMass=1;} },
  { id:'needle', name:'Needle Storm', desc:'Piercing rounds accelerate the entire barrage.', test:s=>s.stats.pierce>=3&&s.stats.rate>=1.35, apply:s=>{s.stats.pierce+=1;s.stats.rate+=.10;} },
  { id:'fortress', name:'Repair Fortress', desc:'Armor converts pressure into sustainable endurance.', test:s=>s.stats.armor>=.22&&s.maxHull>=18, apply:s=>{s.stats.repair+=.018;s.stats.armor=Math.min(.8,s.stats.armor+.05);} },
  { id:'dronescreen', name:'Drone Screen', desc:'Escort drones intercept danger around the hull.', test:s=>s.weapons.drone>=4&&s.stats.dodge>=3, apply:s=>{s.specials.droneScreen=1;} },
  { id:'choir', name:'Missile Choir', desc:'Scatter telemetry lets seekers launch in pairs.', test:s=>s.weapons.missile>=4&&s.weapons.scatter>=3, apply:s=>{s.specials.missileChoir=1;} },
  { id:'prismrail', name:'Prism Rail', desc:'Laser coherence feeds the rail bore.', test:s=>s.weapons.laser>=4&&s.weapons.rail>=3, apply:s=>{s.specials.prismRail=1;} },
  { id:'starfall', name:'Starfall Engine', desc:'Flak and nova blasts chain across formations.', test:s=>s.weapons.nova>=4&&s.weapons.flak>=3, apply:s=>{s.specials.starfall=1;} }
];

const stars = Array.from({length:170},()=>({x:rand(0,W),y:rand(0,H),z:rand(.12,1),s:chance(.16)?2:1}));
let S;
let raf=0;
let last=0;

function freshState(){
  return {
    phase:'menu', time:0, level:1, xp:0, xpNeed:14, salvage:0,
    hull:12,maxHull:12,shield:2,maxShield:2,shieldRegen:.07,shieldDelay:0,
    threat:.58,grace:15,kills:0,bosses:0,openingPick:0,
    stats:{damage:1,rate:1,dodge:1,thrust:1.08,repair:.008,luck:0,armor:.05,crit:.03,xp:1,salvage:1,projectile:1,pierce:0,splash:0},
    weapons:{pulse:1,scatter:0,missile:0,rail:0,flak:0,arc:0,drone:0,laser:0,nova:0},
    weaponCooldowns:{}, upgradeLog:{}, specials:{}, synergies:{}, evolutions:{},
    ship:{x:165,y:H/2,targetY:H/2,aiTimer:0,inv:0,tilt:0},
    enemies:[],bullets:[],shots:[],particles:[],shockwaves:[],boss:null,
    director:{spawn:2.6,wave:10,event:38,boss:105,relief:0}, choiceQueue:[],
    milestone:30,banner:null,flash:0,shake:0,chain:0,chainTimer:0,recentDamage:0,recentDamageTimer:0,
    mirrorCounter:0,power:1,best:Number(localStorage.getItem('starwardBest')||0)
  };
}

function formatTime(t){return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
function rarityIndex(r){return RARITIES.indexOf(r);}
function rollRarity(minIndex=0){
  const weights=RARITIES.map((r,i)=>i<minIndex?0:r.weight*(i===0?1:1+S.stats.luck*i*.9));
  let roll=Math.random()*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<RARITIES.length;i++){roll-=weights[i];if(roll<=0)return RARITIES[i];}
  return RARITIES[minIndex];
}
function randomName(base){return `${pick(PREFIXES)} ${base}${chance(.46)?` ${pick(SUFFIXES)}`:''}`;}
function banner(main,sub='',color='#fff',life=2.1){S.banner={main,sub,color,life,max:life};}
function burst(x,y,color,n=12,speed=160){for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),v=rand(speed*.25,speed);S.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.3,.75),max:.75,size:chance(.35)?4:2,color});}}
function shock(x,y,color,max=70){S.shockwaves.push({x,y,r:6,max,life:.5,color});}

function applyStat(key,amount){
  switch(key){
    case'hull':S.maxHull+=amount;S.hull=Math.min(S.maxHull,S.hull+Math.max(1,Math.ceil(amount*.7)));break;
    case'dodge':S.stats.dodge+=amount;break;
    case'thrust':S.stats.thrust+=amount;break;
    case'shield':S.maxShield+=amount;S.shield=S.maxShield;S.shieldRegen+=.012*Math.max(1,amount/2);break;
    case'repair':S.stats.repair+=amount;break;
    case'armor':S.stats.armor=Math.min(.8,S.stats.armor+amount);break;
    case'damage':S.stats.damage+=amount;break;
    case'rate':S.stats.rate+=amount;break;
    case'crit':S.stats.crit=Math.min(.75,S.stats.crit+amount);break;
    case'projectile':S.stats.projectile+=amount;break;
    case'pierce':S.stats.pierce+=amount;break;
    case'splash':S.stats.splash+=amount;break;
    case'salvage':S.stats.salvage+=amount;break;
    case'xp':S.stats.xp+=amount;break;
    case'luck':S.stats.luck=Math.min(.8,S.stats.luck+amount);break;
  }
}

function makeStatEffect(family,rarity,scale=1){
  let amount=family.base*rarity.power*rand(.9,1.12)*scale;
  if(['hull','dodge','shield','pierce','splash'].includes(family.key))amount=Math.max(1,Math.round(amount));
  return {family,amount,text:family.format(amount)};
}

function generateStatCard(group=null,minRarity=0){
  const pool=group?STAT_FAMILIES.filter(f=>f.group===group):STAT_FAMILIES;
  const primary=pick(pool),rarity=rollRarity(minRarity),effects=[makeStatEffect(primary,rarity,1)];
  const idx=rarityIndex(rarity);
  if(idx>=2){const others=STAT_FAMILIES.filter(f=>f.key!==primary.key);effects.push(makeStatEffect(pick(others),rarity,.45));}
  if(idx>=4){const used=new Set(effects.map(e=>e.family.key));const others=STAT_FAMILIES.filter(f=>!used.has(f.key));effects.push(makeStatEffect(pick(others),rarity,.30));}
  const title=randomName(primary.name);
  return {
    id:`stat:${effects.map(e=>e.family.key).join('+')}:${rarity.name}:${Math.random()}`,
    title,rarity,
    desc:`${rarity.name} ${primary.desc} technology${effects.length>1?', fused with secondary systems.':'.'}`,
    effect:effects.map(e=>e.text).join('  •  '),
    synergy:effects.map(e=>e.family.group).filter((v,i,a)=>a.indexOf(v)===i).join(' + '),
    apply(){for(const e of effects)applyStat(e.family.key,e.amount);afterUpgrade(title,rarity);}
  };
}

function generateWeaponCard(minRarity=0){
  const key=pick(Object.keys(WEAPONS)),weapon=WEAPONS[key],rarity=rollRarity(minRarity),current=S.weapons[key];
  const gain=Math.max(1,Math.round(rarity.power*.72));
  const title=randomName(weapon.name);
  return {
    id:`weapon:${key}:${rarity.name}:${gain}:${Math.random()}`,
    title,rarity,
    desc:current?`Evolve ${weapon.name} beyond its current ★${current} configuration.`:`Install a new automatic ${weapon.name} system.`,
    effect:`${current?'Upgrade':'Install'} ${weapon.name} +${gain}`,
    synergy:`Weapon evolution • ${weapon.icon}`,
    apply(){S.weapons[key]=Math.min(15,current+gain);afterUpgrade(title,rarity);}
  };
}

function generateSpecialCard(minRarity=2){
  const spec=pick(SPECIALS.filter(s=>s.min>=minRarity||s.min<=4));
  const rarity=rollRarity(Math.max(minRarity,spec.min));
  const title=randomName(spec.name);
  return {id:`special:${spec.id}:${rarity.name}:${Math.random()}`,title,rarity,desc:spec.desc,effect:spec.effect,synergy:'Relic technology',apply(){spec.apply();afterUpgrade(title,rarity);}};
}

function generateCard(kind='random',minRarity=0){
  if(kind==='weapon')return generateWeaponCard(minRarity);
  if(kind==='special')return generateSpecialCard(Math.max(2,minRarity));
  if(kind==='survival'||kind==='offense'||kind==='utility')return generateStatCard(kind,minRarity);
  if(minRarity>=2&&chance(.18))return generateSpecialCard(minRarity);
  return chance(.34)?generateWeaponCard(minRarity):generateStatCard(null,minRarity);
}

function makeDraft(spec=['random','random','random'],minRarity=0){
  const out=[];let guard=0;
  while(out.length<3&&guard++<120){const card=generateCard(spec[out.length]||'random',minRarity);if(!out.some(c=>c.id.split(':').slice(0,2).join(':')===card.id.split(':').slice(0,2).join(':')))out.push(card);}
  while(out.length<3)out.push(generateCard('random',minRarity));
  return out;
}

function afterUpgrade(title,rarity){
  S.upgradeLog[title]=(S.upgradeLog[title]||0)+1;
  if(rarityIndex(rarity)>=2){S.flash=.18;banner(rarity.name.toUpperCase(),title,rarity.cls==='legendary'?'#ffb347':rarity.cls==='mythic'?'#ff5fa2':rarity.cls==='god'?'#ffe56b':'#bf73ff',1.35);}
  checkEvolutions();checkSynergies();recalcPower();
}

function checkEvolutions(){
  for(const [key,level] of Object.entries(S.weapons))for(const threshold of [4,8,12]){
    const id=`${key}:${threshold}`;
    if(level>=threshold&&!S.evolutions[id]){S.evolutions[id]=1;banner(`${WEAPONS[key].name.toUpperCase()} EVOLVED`,`★${threshold} signature unlocked`,WEAPONS[key].color,2.1);S.salvage+=2;}
  }
}

function checkSynergies(){
  for(const syn of SYNERGIES)if(!S.synergies[syn.id]&&syn.test(S)){S.synergies[syn.id]=1;syn.apply(S);banner('SYNERGY ONLINE',syn.name,'#7fffc3',2.4);S.flash=.12;S.salvage+=3;}
}

function recalcPower(){
  const weaponPower=Object.values(S.weapons).reduce((a,b)=>a+b,0)*.11;
  const statPower=(S.stats.damage-1)*1.4+(S.stats.rate-1)*1.2+(S.stats.thrust-1)*.5+S.stats.dodge*.15+S.stats.crit*2+S.stats.pierce*.12+S.stats.splash*.1+(S.maxHull-12)*.035+S.maxShield*.05;
  S.power=Math.max(1,1+weaponPower+statPower+Object.keys(S.synergies).length*.35);
}

function updateUI(){
  ui.time.textContent=formatTime(S.time);ui.hull.textContent=`${Math.max(0,Math.ceil(S.hull))}/${S.maxHull}`;ui.shield.textContent=`${Math.max(0,Math.floor(S.shield))}/${S.maxShield}`;ui.level.textContent=S.level;ui.salvage.textContent=Math.floor(S.salvage);
  ui.damage.textContent=`${Math.round(S.stats.damage*100)}%`;ui.rate.textContent=`${Math.round(S.stats.rate*100)}%`;ui.dodge.textContent=S.stats.dodge;ui.thrust.textContent=`${Math.round(S.stats.thrust*100)}%`;ui.repair.textContent=`${S.stats.repair.toFixed(3)}/s`;ui.luck.textContent=`${Math.round(S.stats.luck*100)}%`;
  ui.xp.textContent=`${Math.floor(S.xp)} / ${S.xpNeed} XP`;ui.xpBar.style.width=`${clamp(S.xp/S.xpNeed*100,0,100)}%`;
  const chips=[];for(const[key,level]of Object.entries(S.weapons))if(level>0)chips.push(`<span class="weapon-chip">${WEAPONS[key].icon} ${WEAPONS[key].name} ★${level}</span>`);for(const syn of SYNERGIES)if(S.synergies[syn.id])chips.push(`<span class="synergy-chip">✦ ${syn.name}</span>`);ui.chips.innerHTML=chips.join('')||'<span class="empty-chip">No upgrades yet</span>';
}

function hideOverlay(){overlay.classList.add('hidden');choiceGrid.classList.add('hidden');}
function showChoiceScreen({type,heading,body,cards,progress='',onPick}){
  S.phase='choice';eyebrow.textContent=type;overlayTitle.textContent=heading;overlayText.innerHTML=`${progress?`<div class="draft-progress">${progress}</div>`:''}${body}`;choiceGrid.innerHTML='';choiceGrid.classList.remove('hidden');startBtn.classList.add('hidden');overlay.classList.remove('hidden');
  cards.forEach(card=>{const b=document.createElement('button');b.className=`choice-card r-${card.rarity.cls}`;b.innerHTML=`<span class="rarity">${card.rarity.name.toUpperCase()}</span><h3>${card.title}</h3><p>${card.desc}</p><span class="effect">${card.effect}</span>${card.synergy?`<span class="synergy">${card.synergy}</span>`:''}`;b.addEventListener('click',()=>{card.apply();updateUI();hideOverlay();onPick();},{once:true});choiceGrid.appendChild(b);});
}

function showOpeningDraft(){
  const i=S.openingPick;const specs=[['weapon','survival','offense'],['survival','weapon','utility'],['survival','offense','random'],['weapon','survival','special'],['survival','offense','weapon']];let cards=makeDraft(specs[i],i===4?1:0);if(i===4&&!cards.some(c=>rarityIndex(c.rarity)>=2))cards[2]=generateCard('special',2);
  showChoiceScreen({type:'PRE-FLIGHT',heading:'Configure the ship',body:'Build the machine that will carry itself as far as possible.',cards,progress:`INITIAL UPGRADE ${i+1} / 5`,onPick:()=>{S.openingPick++;if(S.openingPick<5)setTimeout(showOpeningDraft,70);else beginCombat();}});
}
function startRun(){cancelAnimationFrame(raf);S=freshState();updateUI();showOpeningDraft();}
function beginCombat(){hideOverlay();S.phase='running';S.grace=15;banner('LAUNCH','15 seconds of clear space','#70e6ef',2);last=performance.now();raf=requestAnimationFrame(loop);}
function queueChoice(fn){S.choiceQueue.push(fn);}
function resumeOrNext(){if(S.choiceQueue.length){const fn=S.choiceQueue.shift();setTimeout(fn,50);}else{S.phase='running';hideOverlay();}}
function showLevelDraft(minRarity=0,label='LEVEL UP'){showChoiceScreen({type:label,heading:'Choose an upgrade',body:'Push the build toward a stronger identity.',cards:makeDraft(['random','survival','random'],minRarity),onPick:resumeOrNext});}
function gainXP(amount){S.xp+=amount*S.stats.xp;while(S.xp>=S.xpNeed){S.xp-=S.xpNeed;S.level++;S.xpNeed=Math.round(S.xpNeed*1.18+3);queueChoice(()=>showLevelDraft(S.level%6===0?1:0,'LEVEL UP'));}if(S.phase==='running'&&S.choiceQueue.length)S.choiceQueue.shift()();}

function spawnEnemy(type,y=rand(62,H-62),elite=false){const base=ENEMIES[type],hpScale=1+S.time/260;S.enemies.push({type,x:W+42,y,baseY:y,hp:base.hp*hpScale*(elite?2.15:1),maxHp:base.hp*hpScale*(elite?2.15:1),speed:base.speed,fireTimer:rand(.7,Math.max(.9,base.fire)),elite,size:base.size,color:base.color,t:0,charge:0});}
function spawnFormation(kind){const ys=[90,160,230,300,370,440];if(kind==='spear'){for(let i=0;i<5;i++)spawnEnemy(i===2?'gunner':'scout',H/2+(i-2)*56,chance(.025));}else if(kind==='swarm'){for(let i=0;i<7;i++)spawnEnemy('swarm',ys[i%ys.length]+rand(-18,18));}else if(kind==='escort'){spawnEnemy('guardian',H/2);spawnEnemy('gunner',H/2-75);spawnEnemy('gunner',H/2+75);}else if(kind==='bombline'){for(let i=0;i<4;i++)spawnEnemy(i%2?'bomber':'scout',105+i*105);}else if(kind==='hunt'){spawnEnemy('sniper',120);spawnEnemy('weaver',H/2);spawnEnemy('charger',H-120);}else{for(let i=0;i<4;i++)spawnEnemy(pick(['scout','dart','gunner']),100+i*105);}}
function spawnWave(){const kinds=['spear','basic'];if(S.time>45)kinds.push('swarm');if(S.time>80)kinds.push('escort','bombline');if(S.time>130)kinds.push('hunt');spawnFormation(pick(kinds));}
function nearestTarget(){let best=S.boss||null,bx=best?best.x:Infinity;for(const e of S.enemies)if(e.x<bx){best=e;bx=e.x;}return best;}

function weaponCount(key,level){if(key==='scatter')return Math.min(9,2+level+(level>=8?2:0));if(key==='drone')return Math.min(6,level+(level>=8?1:0));if(key==='missile'&&S.specials.missileChoir)return 2;if(key==='pulse'&&level>=8)return 2;return 1;}
function updateWeapons(dt){
  for(const k of Object.keys(WEAPONS))S.weaponCooldowns[k]=Math.max(0,(S.weaponCooldowns[k]||0)-dt);const target=nearestTarget();if(!target)return;const lowHull=S.hull/S.maxHull<.4,lastLight=lowHull&&S.specials.lastlight?1.6:1;
  for(const[key,level]of Object.entries(S.weapons)){if(level<=0||S.weaponCooldowns[key]>0)continue;const info=WEAPONS[key];let cooldown=info.cooldown/(S.stats.rate*Math.sqrt(level));if(key==='laser'&&level>=12)cooldown*=.72;S.weaponCooldowns[key]=cooldown;const count=weaponCount(key,level);
    for(let i=0;i<count;i++){const baseAngle=Math.atan2(target.y-S.ship.y,target.x-S.ship.x),angle=baseAngle+(i-(count-1)/2)*(key==='scatter'?.105:.035),speed=(info.speed+level*34)*S.stats.projectile,isCrit=chance(S.stats.crit);let damage=(info.damage+level*1.35)*S.stats.damage*(isCrit?2:1)*lastLight,splash=S.stats.splash+((key==='flak'||key==='nova')?1+level*.22:0)+(key==='nova'&&level>=8?1.5:0),pierce=S.stats.pierce+(key==='rail'?2:0)+(key==='rail'&&level>=8?2:0)+(S.specials.prismRail&&key==='laser'?2:0);S.shots.push({kind:key,x:S.ship.x+22,y:S.ship.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,damage,life:3.6,color:info.color,pierce,splash,homing:key==='missile',crit:isCrit,trail:[]});}
  }
}

function damageShip(amount){
  if(S.ship.inv>0||S.phase!=='running')return;if(S.specials.droneScreen&&S.bullets.length&&chance(.16)){S.ship.inv=.12;shock(S.ship.x,S.ship.y,'#7fffc3',45);return;}S.mirrorCounter++;if(S.specials.mirror&&S.mirrorCounter%8===0){shock(S.ship.x,S.ship.y,'#9fc5ff',55);return;}
  let damage=amount;if(S.shield>0){const absorbed=Math.min(S.shield,damage);S.shield-=absorbed;damage-=absorbed;}if(damage>0&&chance(S.stats.armor))damage=Math.max(0,damage-1);S.hull-=damage;S.ship.inv=.52;S.shieldDelay=4;S.shake=Math.max(S.shake,8);S.flash=Math.max(S.flash,.10);S.recentDamage+=damage;S.recentDamageTimer=8;S.chain=0;
  if(S.hull<=0&&S.specials.phoenix>0){S.specials.phoenix--;S.hull=Math.max(1,S.maxHull*.35);S.shield=S.maxShield;S.ship.inv=2;banner('PHOENIX KERNEL','Hull restored','#ffb347',2.3);shock(S.ship.x,S.ship.y,'#ffb347',160);return;}if(S.hull<=0)endRun();
}

function killEnemy(enemy){const d=ENEMIES[enemy.type];S.salvage+=d.salvage*S.stats.salvage*(1+Math.min(.5,S.chain*.025));S.kills++;S.chain++;S.chainTimer=2.4;gainXP(d.xp);burst(enemy.x,enemy.y,enemy.color,enemy.elite?18:9,enemy.elite?220:150);if(enemy.elite)shock(enemy.x,enemy.y,'#ffe56b',95);if(S.specials.scavenger&&S.kills%12===0){S.hull=Math.min(S.maxHull,S.hull+1);banner('SCAVENGER BLOOM','+1 hull','#82ffbc',1.2);}if(enemy.type==='splitter'){spawnEnemy('swarm',enemy.y-18);spawnEnemy('swarm',enemy.y+18);S.enemies[S.enemies.length-1].x=enemy.x;S.enemies[S.enemies.length-2].x=enemy.x;}}

function updateAutopilot(dt){
  S.ship.aiTimer-=dt;if(S.ship.aiTimer<=0){S.ship.aiTimer=Math.max(.045,.24-S.stats.dodge*.024);let bestY=H/2,bestRisk=Infinity;for(let y=58;y<H-48;y+=28){let risk=Math.abs(y-H/2)*.0015;for(const b of S.bullets){const dx=b.x-S.ship.x;if(dx>-10&&dx<350)risk+=Math.max(0,9-Math.abs(y-b.y)/10)*(1+S.stats.dodge*.3);}for(const e of S.enemies){const dx=e.x-S.ship.x;if(dx>0&&dx<210)risk+=Math.max(0,8-Math.abs(y-e.y)/13);}if(S.boss)risk+=Math.max(0,2-Math.abs(y-S.boss.y)/100);if(risk<bestRisk){bestRisk=risk;bestY=y;}}S.ship.targetY=bestY;}
  const py=S.ship.y,maxMove=235*S.stats.thrust*dt;S.ship.y+=clamp(S.ship.targetY-S.ship.y,-maxMove,maxMove);S.ship.y=clamp(S.ship.y,42,H-38);S.ship.tilt=(S.ship.y-py)*.09;S.ship.inv=Math.max(0,S.ship.inv-dt);
}

function updateEnemies(dt){
  for(const e of S.enemies){const info=ENEMIES[e.type];e.t+=dt;e.x-=e.speed*dt*(.74+S.threat*.085);if(e.type==='dart')e.y=e.baseY+Math.sin(e.t*4.2)*74;if(e.type==='swarm')e.y=e.baseY+Math.sin(e.t*5.4+e.x*.02)*42;if(e.type==='bomber')e.y=e.baseY+Math.sin(e.t*1.5)*55;if(e.type==='weaver')e.y=e.baseY+Math.sin(e.t*2.5)*95;if(e.type==='healer')for(const o of S.enemies)if(o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<130)o.hp=Math.min(o.maxHp,o.hp+2.2*dt);if(e.type==='charger'&&e.x<W*.72&&e.charge===0){e.charge=.7;e.baseY=S.ship.y;}if(e.type==='charger'&&e.charge>0){e.charge-=dt;e.y=lerp(e.y,e.baseY,dt*4);if(e.charge<=0)e.speed=330;}
    e.fireTimer-=dt;if(e.fireTimer<=0&&e.x<W-45&&info.fire<90&&S.grace<=0){e.fireTimer=info.fire*rand(.92,1.25)/Math.sqrt(S.threat);const angle=Math.atan2(S.ship.y-e.y,S.ship.x-e.x),speed=e.type==='sniper'?270:155+S.time*.07;let spread=[0];if(e.type==='bomber')spread=[-.18,0,.18];if(e.type==='weaver')spread=[-.10,.10];for(const off of spread)S.bullets.push({x:e.x,y:e.y,vx:Math.cos(angle+off)*speed,vy:Math.sin(angle+off)*speed,damage:info.damage,life:6});}if(Math.hypot(e.x-S.ship.x,e.y-S.ship.y)<e.size+13){e.hp=0;damageShip(info.damage);}
  }
}

function guardianReduction(enemy){for(const g of S.enemies)if(g.type==='guardian'&&g!==enemy&&g.hp>0&&Math.hypot(g.x-enemy.x,g.y-enemy.y)<125)return .58;return 1;}
function updateProjectiles(dt){
  for(const b of S.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-S.ship.x,b.y-S.ship.y)<14){b.life=0;damageShip(b.damage);}}
  for(const sh of S.shots){if(sh.homing){const t=nearestTarget();if(t){const desired=Math.atan2(t.y-sh.y,t.x-sh.x),sp=Math.hypot(sh.vx,sh.vy),cur=Math.atan2(sh.vy,sh.vx),diff=((desired-cur+Math.PI*3)%(Math.PI*2))-Math.PI,a=cur+clamp(diff,-4.2*dt,4.2*dt);sh.vx=Math.cos(a)*sp;sh.vy=Math.sin(a)*sp;}}sh.trail.push({x:sh.x,y:sh.y,life:.18});if(sh.trail.length>5)sh.trail.shift();for(const tr of sh.trail)tr.life-=dt;sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;sh.life-=dt;
    for(const e of S.enemies){if(e.hp<=0)continue;if(Math.hypot(sh.x-e.x,sh.y-e.y)<e.size+5){let dealt=sh.damage*guardianReduction(e);e.hp-=dealt;if(sh.splash>0){const radius=44+sh.splash*16;for(const o of S.enemies)if(o!==e&&o.hp>0&&Math.hypot(o.x-e.x,o.y-e.y)<radius)o.hp-=dealt*(S.specials.starfall?.48:.32);shock(e.x,e.y,sh.color,Math.min(100,radius));}if(sh.kind==='arc'){let jumps=S.weapons.arc>=8?2:1,from=e;while(jumps--){const other=S.enemies.find(o=>o!==from&&o.hp>0&&Math.hypot(o.x-from.x,o.y-from.y)<125);if(!other)break;other.hp-=dealt*.55;from=other;}}if(sh.crit&&S.specials.criticalMass){for(const o of S.enemies)if(o!==e&&o.hp>0&&Math.hypot(o.x-e.x,o.y-e.y)<75)o.hp-=dealt*.25;shock(e.x,e.y,'#fff',70);}if(sh.pierce>0)sh.pierce--;else sh.life=0;break;}}
    if(S.boss&&Math.hypot(sh.x-S.boss.x,sh.y-S.boss.y)<S.boss.size){S.boss.hp-=sh.damage;if(sh.pierce<=0)sh.life=0;}
  }
}

function spawnBoss(){const type=BOSS_TYPES[Math.floor(S.time/60)%BOSS_TYPES.length],hp=220*(1+S.bosses*.5)*(1+S.time/480);S.boss={type,x:W+90,y:H/2,size:62,hp,maxHp:hp,fireTimer:1.5,t:0,phase:1,lastPhase:1};banner('DREADNOUGHT INBOUND',type.name,type.color,2.6);S.shake=5;}
function updateBoss(dt){
  if(!S.boss)return;const b=S.boss;b.t+=dt;b.x+=(W-170-b.x)*dt*.32;b.y=H/2+Math.sin(b.t*(1.05+b.phase*.08))*125;b.phase=b.hp/b.maxHp>.66?1:b.hp/b.maxHp>.33?2:3;if(b.phase!==b.lastPhase){b.lastPhase=b.phase;S.bullets.length=0;banner(`${b.type.name.toUpperCase()} — PHASE ${b.phase}`,'Arena pattern changed',b.type.accent,1.8);shock(b.x,b.y,b.type.accent,150);S.shake=8;}
  b.fireTimer-=dt;if(b.fireTimer<=0&&S.grace<=0){b.fireTimer=Math.max(.42,1.5-b.phase*.18-S.bosses*.05);const base=Math.atan2(S.ship.y-b.y,S.ship.x-b.x);let offsets=b.phase===1?[-.16,0,.16]:b.phase===2?[-.28,-.14,0,.14,.28]:[-.38,-.25,-.12,0,.12,.25,.38];if((Math.floor(b.t*2)+S.bosses)%3===0&&b.phase>=2)offsets=Array.from({length:8},(_,i)=>i*Math.PI/4);for(const off of offsets){const angle=offsets.length===8?off:base+off;S.bullets.push({x:b.x,y:b.y,vx:Math.cos(angle)*(175+b.phase*18),vy:Math.sin(angle)*(175+b.phase*18),damage:1,life:7});}}
  if(b.hp<=0){burst(b.x,b.y,b.type.color,45,300);shock(b.x,b.y,b.type.accent,220);S.shake=13;S.boss=null;S.bosses++;S.salvage+=15;S.hull=Math.min(S.maxHull,S.hull+4);S.shield=S.maxShield;gainXP(16);banner('DREADNOUGHT DESTROYED',`Boss ${S.bosses} • salvage secured`,'#ffe56b',2.6);queueChoice(()=>showLevelDraft(2,'DREADNOUGHT RELIC'));}
}

function adaptivePressure(){const health=S.hull/S.maxHull;let relief=1;if(health<.35)relief=.70;else if(health<.55)relief=.84;if(S.recentDamageTimer>0)relief*=.90;const powerCatch=clamp(.88+(S.power-1)*.035,.88,1.30),rhythm=1+Math.sin(S.time/9)*.10;return relief*powerCatch*rhythm;}

const EVENT_FACTORIES = [
  ()=>({heading:'Derelict Foundry',body:'An automated forge still answers old military commands.',cards:[
    {rarity:RARITIES[0],title:'Patch the Hull',desc:'Take the safe maintenance cycle.',effect:'Repair 45% hull + refill shields',apply(){S.hull=Math.min(S.maxHull,S.hull+S.maxHull*.45);S.shield=S.maxShield;}},
    {rarity:RARITIES[1],title:'Recompile Weapons',desc:'Feed the forge your combat telemetry.',effect:'Epic-or-better weapon draft',apply(){queueChoice(()=>showCustomDraft(['weapon','weapon','weapon'],1,'FOUNDRY WEAPONS'));}},
    {rarity:RARITIES[2],title:'Open the Red Vault',desc:'Accept permanent danger for forbidden hardware.',effect:'+12% threat → Legendary+ draft',apply(){S.threat+=.12;queueChoice(()=>showLevelDraft(2,'RED VAULT'));}}
  ]}),
  ()=>({heading:'Refuge Convoy',body:'A damaged convoy requests escort through the next hostile lane.',cards:[
    {rarity:RARITIES[0],title:'Share Repairs',desc:'Exchange spare nanites and leave stronger together.',effect:'-2 salvage → +2 max hull',apply(){S.salvage=Math.max(0,S.salvage-2);S.maxHull+=2;S.hull+=2;}},
    {rarity:RARITIES[1],title:'Take Their Navigation Data',desc:'Improve the autopilot with civilian route maps.',effect:'+1 evade +12% thrust',apply(){S.stats.dodge++;S.stats.thrust+=.12;afterUpgrade('Convoy Navigation',RARITIES[1]);}},
    {rarity:RARITIES[2],title:'Hunt Their Pursuers',desc:'Turn defense into a high-value ambush.',effect:'Spawn elite wave → bonus relic on victory',apply(){for(let i=0;i<3;i++)spawnEnemy(pick(['gunner','sniper','guardian']),120+i*135,true);S.specials.eliteReward=(S.specials.eliteReward||0)+1;}}
  ]}),
  ()=>({heading:'Probability Garden',body:'A strange field predicts several possible versions of the ship.',cards:[
    {rarity:RARITIES[1],title:'Stable Future',desc:'Choose the timeline with the least variance.',effect:'+8% luck + 4 salvage',apply(){S.stats.luck=Math.min(.8,S.stats.luck+.08);S.salvage+=4;}},
    {rarity:RARITIES[2],title:'Violent Future',desc:'A stronger timeline with a harsher battlefield.',effect:'+30% damage, +10% threat',apply(){S.stats.damage+=.30;S.threat+=.10;afterUpgrade('Violent Future',RARITIES[2]);}},
    {rarity:RARITIES[3],title:'Impossible Future',desc:'Collapse multiple timelines into one machine.',effect:'Mythic-or-better random draft',apply(){queueChoice(()=>showLevelDraft(3,'IMPOSSIBLE FUTURE'));}}
  ]}),
  ()=>({heading:'Black-Signal Bazaar',body:'Autonomous traders offer upgrades priced in salvage and risk.',cards:[
    {rarity:RARITIES[0],title:'Buy Repairs',desc:'Spend salvage on immediate security.',effect:'6 salvage → full repair',apply(){if(S.salvage>=6){S.salvage-=6;S.hull=S.maxHull;S.shield=S.maxShield;}else S.hull=Math.min(S.maxHull,S.hull+2);}},
    {rarity:RARITIES[1],title:'Buy Prototype',desc:'Purchase a focused weapon evolution.',effect:'8 salvage → Epic weapon draft',apply(){S.salvage=Math.max(0,S.salvage-8);queueChoice(()=>showCustomDraft(['weapon','weapon','weapon'],1,'PROTOTYPE MARKET'));}},
    {rarity:RARITIES[3],title:'Sign the Impossible Contract',desc:'Trade hull capacity for extraordinary technology.',effect:'-2 max hull → Mythic+ relic',apply(){S.maxHull=Math.max(6,S.maxHull-2);S.hull=Math.min(S.hull,S.maxHull);queueChoice(()=>showCustomDraft(['special','special','special'],3,'IMPOSSIBLE CONTRACT'));}}
  ]})
];

function showCustomDraft(spec,min,label){showChoiceScreen({type:label,heading:'Choose one',body:'The opportunity will not repeat in this run.',cards:makeDraft(spec,min),onPick:resumeOrNext});}
function showEvent(){const ev=pick(EVENT_FACTORIES)();showChoiceScreen({type:'EVENT',heading:ev.heading,body:ev.body,cards:ev.cards,onPick:()=>{checkSynergies();recalcPower();resumeOrNext();}});}

function updateDirector(dt){
  if(S.grace>0){S.grace-=dt;return;}S.director.spawn-=dt;S.director.wave-=dt;S.director.event-=dt;S.director.boss-=dt;const pressure=adaptivePressure();
  if(S.director.spawn<=0){const pool=S.time<45?['scout','dart']:S.time<100?['scout','dart','gunner','swarm']:['scout','dart','gunner','swarm','sniper','bomber','weaver'];spawnEnemy(pick(pool),undefined,chance(.018+S.time/7000));S.director.spawn=rand(2.5,3.9)/(S.threat*pressure);}
  if(S.director.wave<=0){spawnWave();S.director.wave=rand(10,14)/Math.sqrt(S.threat*pressure);}
  if(S.director.event<=0){S.director.event=rand(40,54);queueChoice(showEvent);}
  if(S.director.boss<=0&&!S.boss){S.director.boss=105+rand(12,28);spawnBoss();}
}

function updateMilestones(){if(S.time>=S.milestone){const mins=Math.floor(S.milestone/30);S.salvage+=2+mins;S.hull=Math.min(S.maxHull,S.hull+.75);banner(`${formatTime(S.milestone)} SURVIVED`,`+${2+mins} salvage • hull stabilized`,'#70e6ef',2.1);S.milestone+=30;}}

function update(dt){
  S.time+=dt;S.threat=.58+Math.min(2.65,S.time/135);S.hull=Math.min(S.maxHull,S.hull+S.stats.repair*dt);if(S.shieldDelay>0)S.shieldDelay-=dt;else S.shield=Math.min(S.maxShield,S.shield+S.shieldRegen*dt);if(S.chainTimer>0){S.chainTimer-=dt;if(S.chainTimer<=0)S.chain=0;}if(S.recentDamageTimer>0){S.recentDamageTimer-=dt;if(S.recentDamageTimer<=0)S.recentDamage=0;}if(S.banner){S.banner.life-=dt;if(S.banner.life<=0)S.banner=null;}S.flash=Math.max(0,S.flash-dt);S.shake=Math.max(0,S.shake-dt*18);
  updateMilestones();updateAutopilot(dt);updateWeapons(dt);updateDirector(dt);updateEnemies(dt);updateProjectiles(dt);updateBoss(dt);
  const dead=S.enemies.filter(e=>e.hp<=0);for(const e of dead)killEnemy(e);S.enemies=S.enemies.filter(e=>e.hp>0&&e.x>-80);S.bullets=S.bullets.filter(b=>b.life>0&&b.x>-80&&b.x<W+100&&b.y>-80&&b.y<H+80);S.shots=S.shots.filter(s=>s.life>0&&s.x<W+120&&s.y>-90&&s.y<H+90);for(const p of S.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;p.vy*=.985;p.life-=dt;}S.particles=S.particles.filter(p=>p.life>0);for(const s of S.shockwaves){s.life-=dt;s.r=lerp(s.r,s.max,dt*7);}S.shockwaves=S.shockwaves.filter(s=>s.life>0);if(S.specials.eliteReward&&dead.some(e=>e.elite)){S.specials.eliteReward--;queueChoice(()=>showLevelDraft(2,'ELITE BOUNTY'));}updateUI();if(S.phase==='running'&&S.choiceQueue.length)S.choiceQueue.shift()();
}

function drawEnemy(e){
  ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle=e.color;ctx.strokeStyle=e.elite?'#ffe56b':'#ffffff22';ctx.lineWidth=e.elite?3:1;ctx.beginPath();if(e.type==='tank'||e.type==='guardian'){ctx.rect(-e.size,-e.size*.55,e.size*2,e.size*1.1);}else if(e.type==='swarm'){ctx.moveTo(-e.size,0);ctx.lineTo(0,-e.size*.9);ctx.lineTo(e.size,0);ctx.lineTo(0,e.size*.9);}else if(e.type==='sniper'){ctx.moveTo(-e.size,0);ctx.lineTo(e.size,-6);ctx.lineTo(e.size,6);}else if(e.type==='charger'){ctx.moveTo(-e.size,-e.size*.6);ctx.lineTo(e.size,0);ctx.lineTo(-e.size,e.size*.6);}else{ctx.moveTo(-e.size,0);ctx.lineTo(0,-e.size*.65);ctx.lineTo(e.size,0);ctx.lineTo(0,e.size*.65);}ctx.closePath();ctx.fill();ctx.stroke();if(e.type==='guardian'){ctx.strokeStyle='#73c9ff88';ctx.beginPath();ctx.arc(0,0,e.size+8,0,Math.PI*2);ctx.stroke();}if(e.type==='healer'){ctx.fillStyle='#fff';ctx.fillRect(-2,-8,4,16);ctx.fillRect(-8,-2,16,4);}if(e.elite){ctx.strokeStyle='#ffe56b';ctx.strokeRect(-e.size-4,-e.size*.75-4,e.size*2+8,e.size*1.5+8);}ctx.restore();
}

function drawShot(sh){ctx.save();ctx.globalAlpha=.35;ctx.strokeStyle=sh.color;ctx.lineWidth=sh.kind==='rail'?3:2;ctx.beginPath();for(let i=0;i<sh.trail.length;i++){const t=sh.trail[i];if(i===0)ctx.moveTo(t.x,t.y);else ctx.lineTo(t.x,t.y);}ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=sh.color;if(sh.kind==='missile'){ctx.beginPath();ctx.moveTo(sh.x+7,sh.y);ctx.lineTo(sh.x-6,sh.y-4);ctx.lineTo(sh.x-6,sh.y+4);ctx.fill();}else if(sh.kind==='nova'){ctx.beginPath();ctx.arc(sh.x,sh.y,7,0,Math.PI*2);ctx.fill();}else if(sh.kind==='rail'){ctx.fillRect(sh.x-9,sh.y-2,18,4);}else if(sh.kind==='laser'){ctx.fillRect(sh.x-10,sh.y-1,20,3);}else{ctx.fillRect(sh.x-5,sh.y-2,10,4);}ctx.restore();}

function draw(){
  const biome=BIOMES[Math.floor(S.time/60)%BIOMES.length],g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,biome.top);g.addColorStop(1,biome.bottom);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);const ox=S.shake?rand(-S.shake,S.shake):0,oy=S.shake?rand(-S.shake*.6,S.shake*.6):0;ctx.save();ctx.translate(ox,oy);ctx.fillStyle=biome.haze;for(let i=0;i<5;i++){const x=((i*220-S.time*(5+i))%(W+300))-150,y=90+(i%3)*150;ctx.beginPath();ctx.arc(x,y,90+i*10,0,Math.PI*2);ctx.fill();}
  for(const st of stars){st.x-=st.z*(1.1+S.time*.0015);if(st.x<0)st.x=W;ctx.fillStyle=`rgba(255,255,255,${.18+st.z*.62})`;ctx.fillRect(st.x,st.y,st.s,st.s);}ctx.fillStyle='#0006';ctx.fillRect(0,0,W,31);ctx.fillStyle=biome.accent;ctx.font='bold 12px monospace';ctx.textAlign='left';ctx.fillText(`${biome.name}  •  THREAT ${S.threat.toFixed(1)}×  •  POWER ${S.power.toFixed(1)}${S.grace>0?`  •  SAFE ${Math.ceil(S.grace)}s`:''}`,15,20);if(S.chain>=3){ctx.textAlign='right';ctx.fillStyle='#ffe56b';ctx.font='bold 13px monospace';ctx.fillText(`CHAIN ×${S.chain}`,W-18,20);}
  ctx.save();ctx.translate(S.ship.x,S.ship.y);ctx.rotate(S.ship.tilt*.02);if(S.maxShield>0&&S.shield>0){ctx.strokeStyle=`rgba(125,230,255,${.18+.35*S.shield/S.maxShield})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,27,0,Math.PI*2);ctx.stroke();}ctx.fillStyle=S.ship.inv>0?'#fff':'#76e8f1';ctx.beginPath();ctx.moveTo(26,0);ctx.lineTo(-15,-15);ctx.lineTo(-8,-4);ctx.lineTo(-20,0);ctx.lineTo(-8,4);ctx.lineTo(-15,15);ctx.closePath();ctx.fill();ctx.fillStyle='#b8f7ff';ctx.fillRect(-2,-5,10,10);ctx.fillStyle='#ffd876';ctx.fillRect(-25,-4,12,8);if(S.weapons.drone>=2){ctx.fillStyle='#7fffc3';for(let i=0;i<Math.min(4,Math.floor(S.weapons.drone/2));i++){const a=S.time*1.8+i*Math.PI*2/4;ctx.fillRect(Math.cos(a)*33-2,Math.sin(a)*23-2,5,5);}}ctx.restore();
  for(const e of S.enemies)drawEnemy(e);for(const sh of S.shots)drawShot(sh);for(const b of S.bullets){ctx.fillStyle='#ff879a';ctx.beginPath();ctx.arc(b.x,b.y,4.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff99';ctx.fillRect(b.x-1,b.y-1,2,2);}for(const p of S.particles){ctx.globalAlpha=Math.max(0,p.life/(p.max||.75));ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size||3,p.size||3);}ctx.globalAlpha=1;for(const s of S.shockwaves){ctx.globalAlpha=clamp(s.life/.5,0,1);ctx.strokeStyle=s.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
  if(S.boss){const b=S.boss;ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle=b.type.color;ctx.beginPath();ctx.moveTo(-b.size,0);ctx.lineTo(-b.size*.3,-b.size*.7);ctx.lineTo(b.size*.7,-b.size*.45);ctx.lineTo(b.size,0);ctx.lineTo(b.size*.7,b.size*.45);ctx.lineTo(-b.size*.3,b.size*.7);ctx.closePath();ctx.fill();ctx.strokeStyle=b.type.accent;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,18+b.phase*4,0,Math.PI*2);ctx.stroke();ctx.fillStyle=b.type.accent;ctx.fillRect(-7,-7,14,14);ctx.restore();ctx.fillStyle='#111827dd';ctx.fillRect(W-285,40,245,12);ctx.fillStyle=b.type.color;ctx.fillRect(W-282,43,239*clamp(b.hp/b.maxHp,0,1),6);ctx.fillStyle='#fff';ctx.font='bold 10px monospace';ctx.textAlign='right';ctx.fillText(`${b.type.name} • P${b.phase}`,W-42,62);}
  if(S.banner){const a=clamp(S.banner.life/.35,0,1)*clamp((S.banner.max-S.banner.life)/.18,0,1);ctx.globalAlpha=a;ctx.textAlign='center';ctx.fillStyle='#07101edd';ctx.fillRect(W/2-230,H*.18-32,460,65);ctx.fillStyle=S.banner.color;ctx.font='bold 22px monospace';ctx.fillText(S.banner.main,W/2,H*.18);ctx.fillStyle='#fff';ctx.font='11px monospace';ctx.fillText(S.banner.sub,W/2,H*.18+21);ctx.globalAlpha=1;}ctx.restore();if(S.flash>0){ctx.fillStyle=`rgba(255,255,255,${Math.min(.22,S.flash)})`;ctx.fillRect(0,0,W,H);}
}

function endRun(){S.phase='dead';cancelAnimationFrame(raf);S.best=Math.max(S.best,S.time);localStorage.setItem('starwardBest',S.best);eyebrow.textContent='RUN ENDED';overlayTitle.textContent=`Survived ${formatTime(S.time)}`;overlayText.textContent=`Level ${S.level} • ${S.kills} kills • ${S.bosses} dreadnoughts • ${Object.keys(S.synergies).length} synergies • Best ${formatTime(S.best)}`;choiceGrid.classList.add('hidden');startBtn.textContent='New Run';startBtn.classList.remove('hidden');overlay.classList.remove('hidden');}
function loop(now){if(S.phase==='dead'||S.phase==='menu')return;const dt=Math.min(.033,(now-last)/1000||.016);last=now;if(S.phase==='running')update(dt);draw();raf=requestAnimationFrame(loop);}

startBtn.addEventListener('click',startRun);
S=freshState();recalcPower();updateUI();draw();
})();

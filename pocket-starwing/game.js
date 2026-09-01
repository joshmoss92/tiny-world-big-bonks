(() => {
'use strict';

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const overlay = $('overlay');
const overlayTitle = $('overlayTitle');
const overlayText = $('overlayText');
const eyebrow = $('eyebrow');
const choiceGrid = $('choiceGrid');
const startBtn = $('startBtn');

const ui = {
  time:$('hudTime'), sector:$('hudSector'), hull:$('hudHull'), shield:$('hudShield'),
  laserStatus:$('laserStatus'), laserFill:$('laserFill'),
  threatStatus:$('threatStatus'), threatFill:$('threatFill'),
  upgradeStatus:$('upgradeStatus'), upgradeFill:$('upgradeFill'),
  chips:$('buildChips')
};

const W = canvas.width, H = canvas.height;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const rand = (a,b) => a + Math.random()*(b-a);
const pick = arr => arr[(Math.random()*arr.length)|0];
const chance = p => Math.random()<p;
const dist = (a,b,c,d) => Math.hypot(a-c,b-d);
const formatTime = t => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const TWO_PI = Math.PI*2;
const NORMAL_CHOICE_GAP = 58;
const LIVE_EVENT_WINDOW = 5;
const LASER_COOLDOWN = 30;
const SECTOR_LENGTH = 75;
const MAX_ENEMIES = 72;
const REDUCED_MOTION = typeof window!=='undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

ctx.imageSmoothingEnabled = true;

const RARITIES = [
  {name:'Rare',cls:'rare',weight:60,power:1},
  {name:'Epic',cls:'epic',weight:24,power:1.45},
  {name:'Legendary',cls:'legendary',weight:10,power:2.05},
  {name:'Mythic',cls:'mythic',weight:4.5,power:3.0},
  {name:'God',cls:'god',weight:1.5,power:4.5}
];

const BIOMES = [
  {name:'Cloudreach', top:'#06162f',bottom:'#2d7797',accent:'#8effcf',nebula:'#70d9ff',planet:'#78b9ce',ring:'#c6fff0'},
  {name:'Ember Belt',top:'#160b22',bottom:'#73343a',accent:'#ffd06b',nebula:'#ff6b64',planet:'#b96d4d',ring:'#ffd28a'},
  {name:'Silent Ruins',top:'#050b21',bottom:'#1b3858',accent:'#73eee1',nebula:'#4f83c8',planet:'#384b68',ring:'#79fff0'},
  {name:'Stormglass',top:'#06101d',bottom:'#233d55',accent:'#e3f4ff',nebula:'#8bbcff',planet:'#597a9d',ring:'#d9f2ff'},
  {name:'Violet Deep',top:'#12091e',bottom:'#59316f',accent:'#ffc4f2',nebula:'#b367ff',planet:'#765083',ring:'#ffb9ef'}
];

const WEAPONS = {
  pulse:{name:'Pulse Cannon',icon:'•',color:'#fff0a5',cool:.26,damage:7.1,speed:950},
  scatter:{name:'Spread Shot',icon:'✣',color:'#ffafe0',cool:.70,damage:3.25,speed:800},
  missile:{name:'Homing Missiles',icon:'◇',color:'#bcff91',cool:.92,damage:9.2,speed:650},
  rail:{name:'Railgun',icon:'━',color:'#ffffff',cool:1.05,damage:13.5,speed:1500},
  flak:{name:'Flak Cannon',icon:'✹',color:'#ff9a7d',cool:.81,damage:8.0,speed:740},
  arc:{name:'Chain Lightning',icon:'ϟ',color:'#9fc8ff',cool:.90,damage:6.8,speed:1020},
  drone:{name:'Attack Drones',icon:'⊙',color:'#7fffc5',cool:.58,damage:4.4,speed:980},
  beam:{name:'Rapid Laser',icon:'▸',color:'#ff89ec',cool:.16,damage:2.7,speed:1800},
  nova:{name:'Heavy Bombs',icon:'✦',color:'#ffd27a',cool:1.27,damage:15.0,speed:610}
};

const ENEMIES = {
  scout:{hp:9,speed:170,fire:2.7,damage:1,xp:1,charge:1,size:15,color:'#8ff4b0',kind:'fighter'},
  dart:{hp:7,speed:260,fire:99,damage:1,xp:1,charge:1,size:12,color:'#ff7d9a',kind:'interceptor'},
  gunner:{hp:21,speed:126,fire:1.65,damage:1,xp:2,charge:1,size:21,color:'#73e6df',kind:'gunship'},
  bomber:{hp:34,speed:104,fire:2.6,damage:2,xp:3,charge:2,size:24,color:'#ff9d68',kind:'bomber'},
  sniper:{hp:18,speed:100,fire:3.5,damage:2,xp:3,charge:2,size:19,color:'#ff8069',kind:'sniper'},
  guardian:{hp:42,speed:94,fire:2.2,damage:1,xp:4,charge:2,size:25,color:'#72c9ff',kind:'guardian'},
  splitter:{hp:24,speed:142,fire:2.7,damage:1,xp:3,charge:2,size:19,color:'#ee8bd9',kind:'splitter'},
  healer:{hp:28,speed:92,fire:99,damage:1,xp:4,charge:2,size:21,color:'#7dffb9',kind:'support'},
  carrier:{hp:65,speed:78,fire:2.6,damage:2,xp:6,charge:3,size:31,color:'#d9a0ff',kind:'carrier'}
};

const BOSSES = [
  {name:'Glimmer Maw',color:'#ff7198',accent:'#fff0f5'},
  {name:'Cinder Throne',color:'#ff875b',accent:'#ffe099'},
  {name:'Archive Crown',color:'#71e7df',accent:'#d9ffff'},
  {name:'Storm Seraph',color:'#8db8ff',accent:'#ffffff'},
  {name:'Violet Oracle',color:'#ce7dff',accent:'#ffd0f3'}
];

const UPGRADE_DEFS = [
  {id:'hull',category:'DEFENSE',name:'Reinforced Hull',group:'defense',base:3,desc:'Take more hull damage before the run ends.',
    effect:v=>`+${v} maximum hull and repair ${Math.ceil(v/2)} now`,apply:v=>{S.maxHull+=v;S.hull=Math.min(S.maxHull,S.hull+Math.ceil(v/2));}},
  {id:'shield',category:'DEFENSE',name:'Larger Shield',group:'defense',base:2,desc:'Increase the shield that recharges between hits.',
    effect:v=>`+${v} maximum shield and fully recharge`,apply:v=>{S.maxShield+=v;S.shield=S.maxShield;S.shieldRegen+=.012*v;}},
  {id:'repair',category:'DEFENSE',name:'Faster Repairs',group:'defense',base:.018,desc:'Restore hull automatically during the run.',
    effect:v=>`Repair 1 hull every ${Math.max(5,Math.round(1/v))} seconds`,apply:v=>S.stats.repair+=v},
  {id:'dodge',category:'AUTOPILOT',name:'Better Dodging',group:'mobility',base:.07,desc:'The autopilot reacts sooner to bullets and collisions.',
    effect:v=>`+${Math.round(v*100)}% dodge reaction`,apply:v=>S.stats.dodge=Math.min(.86,S.stats.dodge+v)},
  {id:'speed',category:'AUTOPILOT',name:'Faster Engines',group:'mobility',base:.14,desc:'The ship reaches safer lanes more quickly.',
    effect:v=>`+${Math.round(v*100)}% movement speed`,apply:v=>S.stats.speed+=v},
  {id:'armor',category:'DEFENSE',name:'Stronger Armor',group:'defense',base:.08,desc:'Some hull hits are reduced by one damage.',
    effect:v=>`+${Math.round(v*100)}% armor chance`,apply:v=>S.stats.armor=Math.min(.75,S.stats.armor+v)},
  {id:'damage',category:'OFFENSE',name:'Weapon Damage',group:'offense',base:.18,desc:'Every installed weapon hits harder.',
    effect:v=>`+${Math.round(v*100)}% weapon damage`,apply:v=>S.stats.damage+=v},
  {id:'rate',category:'OFFENSE',name:'Fire Rate',group:'offense',base:.15,desc:'Every installed weapon fires more often.',
    effect:v=>`+${Math.round(v*100)}% fire rate`,apply:v=>S.stats.rate+=v},
  {id:'crit',category:'OFFENSE',name:'Critical Hits',group:'offense',base:.06,desc:'Some attacks deal double damage.',
    effect:v=>`+${Math.round(v*100)}% critical chance`,apply:v=>S.stats.crit=Math.min(.7,S.stats.crit+v)},
  {id:'pierce',category:'OFFENSE',name:'Piercing Shots',group:'offense',base:1,desc:'Projectiles continue through extra enemies.',
    effect:v=>`Pass through ${v} extra ${v===1?'enemy':'enemies'}`,apply:v=>S.stats.pierce+=v},
  {id:'splash',category:'OFFENSE',name:'Bigger Explosions',group:'offense',base:1,desc:'Explosive weapons hit a wider area.',
    effect:v=>`+${v} blast radius level${v===1?'':'s'}`,apply:v=>S.stats.splash+=v},
  {id:'laserCharge',category:'COMMAND',name:'Faster Star Laser Charge',group:'utility',base:.12,desc:'Each kill fills more of the Star Laser meter. The 30-second firing lock still applies.',
    effect:v=>`+${Math.round(v*100)}% charge from kills`,apply:v=>S.stats.laserCharge+=v},
  {id:'rarity',category:'UTILITY',name:'Better Upgrade Odds',group:'utility',base:.05,desc:'Future upgrade choices are more likely to be high rarity.',
    effect:v=>`+${Math.round(v*100)}% rarity luck`,apply:v=>S.stats.luck=Math.min(.75,S.stats.luck+v)}
];

const SPECIALS = [
  {id:'secondChance',name:'Second Chance',category:'SPECIAL',rarity:2,desc:'Survive one fatal hit instead of ending the run.',effect:'Once per run: revive at 40% hull',
    apply(){S.specials.secondChance=(S.specials.secondChance||0)+1;}},
  {id:'glassCannon',name:'Glass Cannon',category:'SPECIAL',rarity:2,desc:'Trade durability for a much stronger arsenal.',effect:'+55% damage, -3 maximum hull',
    apply(){S.stats.damage+=.55;S.maxHull=Math.max(7,S.maxHull-3);S.hull=Math.min(S.hull,S.maxHull);}},
  {id:'combatRepair',name:'Combat Repair',category:'SPECIAL',rarity:2,desc:'Sustained destruction repairs the ship.',effect:'Every 18 kills: repair 1 hull',
    apply(){S.specials.combatRepair=1;}},
  {id:'pointDefense',name:'Point Defense',category:'SPECIAL',rarity:3,desc:'Automatically deletes a portion of enemy projectiles.',effect:'Destroy every 8th enemy shot',
    apply(){S.specials.pointDefense=1;}},
  {id:'weaponMastery',name:'Weapon Mastery',category:'SPECIAL',rarity:3,desc:'Improve every weapon already installed.',effect:'+1 level to every installed weapon',
    apply(){for(const k of Object.keys(S.weapons))if(S.weapons[k])S.weapons[k]=Math.min(15,S.weapons[k]+1);}},
  {id:'laserCore',name:'Star Laser Core',category:'SPECIAL',rarity:3,desc:'The command weapon reaches full charge with fewer kills.',effect:'+30% Star Laser charge from kills',
    apply(){S.stats.laserCharge+=.30;}},
  {id:'perfectTune',name:'Perfect Tune-Up',category:'SPECIAL',rarity:4,desc:'A major all-round improvement with no downside.',effect:'+30% damage, +25% fire rate, +3 hull, +2 shield',
    apply(){S.stats.damage+=.30;S.stats.rate+=.25;S.maxHull+=3;S.hull+=3;S.maxShield+=2;S.shield=S.maxShield;}}
];

const SYNERGIES = [
  {id:'fortress',name:'Fortress Build',desc:'Strong shields and repairs reinforce each other.',
    test:s=>s.maxShield>=9&&s.stats.repair>=.055,apply:s=>{s.shieldRegen+=.035;s.stats.repair+=.012;}},
  {id:'agile',name:'Ace Autopilot',desc:'High movement speed and dodge reaction unlock elite pathing.',
    test:s=>s.stats.dodge>=.37&&s.stats.speed>=1.52,apply:s=>{s.stats.dodge=Math.min(.86,s.stats.dodge+.07);s.stats.speed+=.1;}},
  {id:'fullAuto',name:'Full Auto',desc:'High damage and fire rate amplify each other.',
    test:s=>s.stats.damage>=1.72&&s.stats.rate>=1.48,apply:s=>{s.stats.damage+=.12;s.stats.rate+=.12;}},
  {id:'missileStorm',name:'Missile Storm',desc:'Spread Shot and Homing Missiles now launch a heavier missile volley.',
    test:s=>s.weapons.scatter>=3&&s.weapons.missile>=4,apply:s=>s.specials.missileStorm=1},
  {id:'beamLance',name:'Beam Lance',desc:'Railgun hits gain extra laser damage.',
    test:s=>s.weapons.rail>=3&&s.weapons.beam>=4,apply:s=>s.specials.beamLance=1},
  {id:'detonation',name:'Detonation Grid',desc:'Flak and Heavy Bombs trigger secondary explosions.',
    test:s=>s.weapons.flak>=3&&s.weapons.nova>=4,apply:s=>s.specials.detonation=1}
];

const stars = Array.from({length:260},()=>({x:rand(0,W),y:rand(0,H),z:rand(.12,1),size:chance(.15)?2:1}));
const debris = Array.from({length:22},()=>({x:rand(0,W),y:rand(0,H),z:rand(.25,.8),rot:rand(0,TWO_PI),spin:rand(-1,1)}));
const nebulae = Array.from({length:6},(_,i)=>({x:rand(0,W),y:70+i*82,r:rand(100,190),z:rand(.08,.22)}));
let S, raf=0, last=0;

function freshState(){
  return {
    phase:'menu',time:0,sector:1,sectorStart:0,level:1,xp:0,xpNeed:84,upgradeReady:false,lastDecisionAt:0,
    hull:24,maxHull:24,shield:8,maxShield:8,shieldRegen:.12,shieldDelay:0,
    stats:{damage:1.10,rate:1.08,dodge:.24,speed:1.26,repair:.019,armor:.08,crit:.03,pierce:0,splash:0,luck:0,laserCharge:1},
    weapons:{pulse:1,scatter:0,missile:0,rail:0,flak:0,arc:0,drone:0,beam:0,nova:0},
    cooldowns:{},upgrades:{},specials:{},synergies:{},
    openingPick:0,grace:4.5,worldSpeed:2.1,combatSpeed:1.18,threat:1,
    ship:{x:168,y:H/2,targetY:H/2,ai:0,inv:0,tilt:0},
    enemies:[],bullets:[],shots:[],particles:[],popups:[],banners:[],boss:null,
    spawnTimer:.6,waveTimer:3.8,bossTimer:118,breatherTimer:55,
    laserCharge:0,laserMax:20,nextLaserAt:LASER_COOLDOWN,laserBlast:null,laserTimes:[],
    liveEvent:null,nextLiveEventAt:26,eventSeq:0,challenge:null,overdrive:0,shieldTrial:null,
    buildChoiceQueued:false,killStreak:0,killTimer:0,kills:0,bosses:0,maxEnemiesSeen:0,
    screenShake:0,flash:0,sectorPulse:0,best:Number(localStorage.getItem('starwardBest')||0)
  };
}

function rollRarity(min=0){
  const weights=RARITIES.map((r,i)=>i<min?0:r.weight*(i?1+S.stats.luck*i*1.15:1));
  let total=weights.reduce((a,b)=>a+b,0),x=Math.random()*total;
  for(let i=0;i<RARITIES.length;i++){x-=weights[i];if(x<=0)return RARITIES[i];}
  return RARITIES[min];
}

function weaponCard(min=0){
  const key=pick(Object.keys(WEAPONS)),w=WEAPONS[key],r=rollRarity(min),current=S.weapons[key];
  const gain=Math.max(1,Math.round(r.power*.7)),next=Math.min(15,current+gain);
  return {
    rarity:r,category:'WEAPON',title:current?`Upgrade ${w.name}`:`Unlock ${w.name}`,
    desc:current?`${w.name} is level ${current}.`:`Add ${w.name} to the ship's automatic arsenal.`,
    effect:current?`Level ${current} → ${next}`:`Install at level ${gain}`,
    apply(){S.weapons[key]=next;}
  };
}

function statCard(group=null,min=0){
  const pool=group?UPGRADE_DEFS.filter(x=>x.group===group):UPGRADE_DEFS;
  const item=pick(pool),r=rollRarity(min);
  let value=item.base*r.power*rand(.94,1.07);
  if(['hull','shield','pierce','splash'].includes(item.id))value=Math.max(1,Math.round(value));
  return {rarity:r,category:item.category,title:item.name,desc:item.desc,effect:item.effect(value),apply(){item.apply(value);}};
}

function specialCard(min=2){
  const pool=SPECIALS.filter(x=>x.rarity>=min&&!S.upgrades[`special:${x.id}`]);
  if(!pool.length)return statCard(null,min);
  const item=pick(pool),r=RARITIES[Math.max(min,item.rarity)];
  return {rarity:r,category:item.category,title:item.name,desc:item.desc,effect:item.effect,
    apply(){item.apply();S.upgrades[`special:${item.id}`]=1;}};
}

function draft(spec,min=0){
  return spec.map(kind=>{
    if(kind==='weapon')return weaponCard(min);
    if(['offense','defense','mobility','utility'].includes(kind))return statCard(kind,min);
    if(kind==='special')return specialCard(Math.max(2,min));
    const roll=Math.random();
    if(roll<.33)return weaponCard(min);
    if(roll<.43)return specialCard(Math.max(2,min));
    return statCard(null,min);
  });
}

function showChoices({type,title,body,cards,progress='',onPick}){
  S.phase='choice';
  eyebrow.textContent=type;
  overlayTitle.textContent=title;
  overlayText.innerHTML=`${progress?`<div class="draft-progress">${progress}</div>`:''}${body}`;
  choiceGrid.innerHTML='';
  choiceGrid.classList.remove('hidden');
  startBtn.classList.add('hidden');
  overlay.classList.remove('hidden');
  cards.forEach(card=>{
    const b=document.createElement('button');
    b.className=`choice-card r-${card.rarity.cls}`;
    b.innerHTML=`<div class="card-top"><span class="rarity">${card.rarity.name.toUpperCase()}</span><span class="category">${card.category}</span></div><h3>${card.title}</h3><p>${card.desc}</p><span class="effect">${card.effect}</span>`;
    b.addEventListener('click',()=>{
      card.apply();
      checkSynergies();
      updateUI();
      onPick();
    },{once:true});
    choiceGrid.appendChild(b);
  });
}

function hideOverlay(){
  overlay.classList.add('hidden');
  choiceGrid.classList.add('hidden');
}

function showOpening(){
  const steps=[
    {label:'1 OF 5 · FIRST WEAPON',spec:['weapon','weapon','offense'],min:0},
    {label:'2 OF 5 · SURVIVAL',spec:['defense','defense','mobility'],min:0},
    {label:'3 OF 5 · SECOND SYSTEM',spec:['weapon','offense','weapon'],min:0},
    {label:'4 OF 5 · AUTOPILOT',spec:['mobility','defense','utility'],min:0},
    {label:'5 OF 5 · SIGNATURE UPGRADE',spec:['special','weapon','defense'],min:1}
  ];
  const step=steps[S.openingPick];
  showChoices({
    type:'PRE-FLIGHT',
    title:'Configure the ship',
    body:'Five clear choices define how this run begins.',
    progress:step.label,
    cards:draft(step.spec,step.min),
    onPick(){
      S.openingPick++;
      if(S.openingPick<steps.length)showOpening();
      else beginRun();
    }
  });
}

function startRun(){
  cancelAnimationFrame(raf);
  S=freshState();
  updateUI();
  showOpening();
}

function beginRun(){
  hideOverlay();
  S.phase='running';
  S.grace=4.5;
  S.lastDecisionAt=0;
  S.nextLiveEventAt=24;
  spawnOpeningAmbush();
  banner('CONTACT!','#ffe56b','Autopilot engaged · survive the opening rush');
  last=performance.now();
  raf=requestAnimationFrame(loop);
}

function resumeRun(){
  S.phase='running';
  S.lastDecisionAt=S.time;
  hideOverlay();
  last=performance.now();
}

function showBuildChoice(){
  S.buildChoiceQueued=false;
  S.level++;
  S.xp=Math.max(0,S.xp-S.xpNeed);
  S.xpNeed=Math.round(S.xpNeed*1.18+12);
  S.upgradeReady=S.xp>=S.xpNeed;
  showChoices({
    type:'BUILD CHOICE',
    title:'Improve one system',
    body:'One meaningful change, then back to the run.',
    cards:draft(['random','defense','random'],S.sector>=4?1:0),
    onPick:resumeRun
  });
}

function showBossReward(forced=false){
  showChoices({
    type:'BOSS SALVAGE',
    title:forced?'Claim the rift reward':'Choose one boss reward',
    body:'Boss victories are one of the few times the run stops.',
    cards:draft(['weapon','special','random'],forced?2:1),
    onPick:resumeRun
  });
}

function gainXP(n){
  S.xp+=n;
  if(S.xp>=S.xpNeed)S.upgradeReady=true;
}

function maybeQueueBuildChoice(){
  if(!S.upgradeReady||S.buildChoiceQueued||S.phase!=='running')return;
  if(S.time-S.lastDecisionAt<NORMAL_CHOICE_GAP)return;
  if(S.liveEvent||S.boss&&S.boss.forced)return;
  S.buildChoiceQueued=true;
  showBuildChoice();
}

function checkSynergies(){
  for(const syn of SYNERGIES){
    if(S.synergies[syn.id]||!syn.test(S))continue;
    S.synergies[syn.id]=1;
    syn.apply(S);
    banner(`BUILD ONLINE: ${syn.name}`,'#ffe56b',syn.desc);
    burst(S.ship.x,S.ship.y,'#ffe56b',32,250,3);
  }
}

function spawnEnemy(type,y=rand(58,H-58),opts={}){
  if(S.enemies.length>=MAX_ENEMIES)return null;
  const d=ENEMIES[type],scale=1+S.time/285;
  const e={
    type,x:opts.x??W+42,y,baseY:y,
    hp:d.hp*scale*(opts.elite?2.25:1),maxHp:d.hp*scale*(opts.elite?2.25:1),
    speed:d.speed,fire:rand(.5,Math.max(.8,d.fire)),size:d.size,color:d.color,
    elite:!!opts.elite,intro:!!opts.intro,eventTag:opts.eventTag||null,t:rand(0,8),charge:0,dead:false
  };
  S.enemies.push(e);
  return e;
}

function spawnOpeningAmbush(){
  const total=30;
  for(let i=0;i<total;i++){
    const y=56+(i%15)*(H-112)/14+Math.sin(i*1.6)*9;
    const type=i%7===0?'scout':'dart';
    spawnEnemy(type,y,{intro:true,x:W+20+(i%6)*52+Math.floor(i/6)*28,eventTag:'intro'});
  }
}

function spawnFormation(mult=1,eventTag=null){
  const pool=['scout','dart','gunner'];
  if(S.time>30)pool.push('bomber','sniper');
  if(S.time>80)pool.push('splitter','guardian');
  if(S.time>135)pool.push('healer','carrier');
  const base=8+Math.floor(S.time/45),count=Math.min(20,Math.round(base*mult));
  const pattern=pick(['wall','sine','double','cluster']);
  for(let i=0;i<count;i++){
    let y;
    if(pattern==='wall')y=58+i*(H-116)/Math.max(1,count-1);
    else if(pattern==='sine')y=H/2+Math.sin(i*1.07)*185;
    else if(pattern==='double')y=i%2?H*.28+Math.sin(i)*42:H*.72+Math.sin(i)*42;
    else y=rand(75,H-75);
    spawnEnemy(pick(pool),y,{elite:chance(.045+S.time/5000),eventTag,x:W+30+(i%5)*38});
  }
}

function nearestTarget(){
  let best=S.boss||null,bestX=best?best.x:Infinity;
  for(const e of S.enemies)if(!e.dead&&e.hp>0&&e.x<bestX){best=e;bestX=e.x;}
  return best;
}

function damageMultiplier(){
  let m=S.stats.damage;
  if(S.overdrive>0)m*=1.25;
  if(S.shieldTrial)m*=1.4;
  return m;
}
function fireRateMultiplier(){
  let m=S.stats.rate;
  if(S.overdrive>0)m*=1.5;
  return m;
}

function updateWeapons(dt){
  for(const k of Object.keys(WEAPONS))S.cooldowns[k]=Math.max(0,(S.cooldowns[k]||0)-dt);
  const target=nearestTarget();
  if(!target)return;
  for(const [key,level] of Object.entries(S.weapons)){
    if(level<=0||S.cooldowns[key]>0)continue;
    const w=WEAPONS[key];
    S.cooldowns[key]=w.cool/(fireRateMultiplier()*Math.sqrt(level));
    let count=key==='scatter'?Math.min(8,2+level):key==='drone'?Math.min(4,level):1;
    if(key==='missile'&&S.specials.missileStorm)count=2;
    for(let i=0;i<count;i++){
      const base=Math.atan2(target.y-S.ship.y,target.x-S.ship.x);
      const a=base+(i-(count-1)/2)*(key==='scatter'?.10:.03);
      const speed=w.speed+level*42;
      const crit=chance(S.stats.crit);
      S.shots.push({
        kind:key,x:S.ship.x+27,y:S.ship.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
        damage:(w.damage+level*1.35)*damageMultiplier()*(crit?2:1),life:3.4,color:w.color,
        pierce:S.stats.pierce+(key==='rail'?2:0),splash:S.stats.splash+((key==='flak'||key==='nova')?1+level*.22:0),
        homing:key==='missile',crit,trail:[]
      });
    }
  }
}

function hurtShip(amount){
  if(S.ship.inv>0||S.phase!=='running')return;
  if(S.specials.pointDefense){
    S.specials.pointCounter=(S.specials.pointCounter||0)+1;
    if(S.specials.pointCounter%8===0)return;
  }
  let d=amount;
  if(S.shield>0&&!S.shieldTrial){
    const absorbed=Math.min(S.shield,d);
    S.shield-=absorbed; d-=absorbed;
  }
  if(d>0&&chance(S.stats.armor))d=Math.max(0,d-1);
  if(d>0){
    S.hull-=d;
    S.screenShake=Math.max(S.screenShake,6);
    S.flash=.13;
    popup(`-${d}`,S.ship.x,S.ship.y-28,'#ff8096');
  }
  S.ship.inv=.68;
  S.shieldDelay=3.8;
  if(S.hull<=0){
    if(S.specials.secondChance){
      S.specials.secondChance--;
      S.hull=Math.max(1,S.maxHull*.4);
      S.shield=S.maxShield;
      S.ship.inv=2;
      banner('SECOND CHANCE','#ffe56b','Hull restored to 40%');
    }else endRun();
  }
}

function addLaserCharge(n){
  S.laserCharge=clamp(S.laserCharge+n*S.stats.laserCharge,0,S.laserMax);
}

function challengeKill(e){
  if(!S.challenge||!e.eventTag||e.eventTag!==S.challenge.tag)return;
  S.challenge.remaining--;
  if(S.challenge.remaining>0)return;
  const c=S.challenge;
  S.challenge=null;
  if(c.kind==='swarm'){S.nextUpgradeRarity=Math.max(S.nextUpgradeRarity||0,1);S.laserCharge=clamp(S.laserCharge+6,0,S.laserMax);banner('SWARM BROKEN','#ffe56b','Star Laser boosted · better next upgrade');}
  if(c.kind==='hunters'){S.nextUpgradeRarity=Math.max(S.nextUpgradeRarity||0,2);banner('HUNTERS DEFEATED','#ffe56b','Next upgrade Legendary or better');}
  if(c.kind==='carrier'){S.xp+=28;S.upgradeReady=S.xp>=S.xpNeed;banner('CARRIER FLEET DOWN','#ffe56b','Build progress surged');}
}

function killEnemy(e){
  const d=ENEMIES[e.type];
  S.kills++;
  S.killStreak++;
  S.killTimer=2.2;
  gainXP(d.xp);
  if(!e.byLaser)addLaserCharge(d.charge);
  challengeKill(e);
  burst(e.x,e.y,e.color,e.elite?28:14,e.elite?300:210,e.elite?4:3);
  S.screenShake=Math.max(S.screenShake,e.elite?3.5:1.3);
  if(S.specials.combatRepair&&S.kills%18===0){
    S.hull=Math.min(S.maxHull,S.hull+1);
    popup('+1 HULL',S.ship.x,S.ship.y-28,'#8fffb0',1.05);
  }
  if(e.type==='splitter'&&!e.byLaser){
    const a=spawnEnemy('dart',e.y-16,{eventTag:e.eventTag,x:e.x});
    const b=spawnEnemy('dart',e.y+16,{eventTag:e.eventTag,x:e.x});
    if(a)a.intro=e.intro;if(b)b.intro=e.intro;
  }
  if(e.type==='carrier'&&!e.byLaser){
    for(let i=0;i<4;i++)spawnEnemy('dart',e.y+(i-1.5)*16,{eventTag:e.eventTag,x:e.x+rand(-8,8)});
  }
}

function laserReady(){
  return S.laserCharge>=S.laserMax && S.time>=S.nextLaserAt;
}

function releaseStarLaser(){
  if(S.phase!=='running'||!laserReady())return false;
  S.laserCharge=0;
  S.nextLaserAt=S.time+LASER_COOLDOWN;
  S.laserTimes.push(S.time);
  S.laserBlast={radius:20,life:1.05,max:1.05};
  S.bullets.length=0;
  let destroyed=0;
  for(const e of S.enemies){
    if(e.hp>0){e.byLaser=true;e.hp=0;destroyed++;}
  }
  S.screenShake=16;S.flash=.38;
  banner('STAR LASER','#ffffff',destroyed?`${destroyed} enemies erased`:'Space cleared');
  burst(S.ship.x,S.ship.y,'#bafaff',70,450,5);
  return true;
}

function updateAutopilot(dt){
  S.ship.ai-=dt;
  if(S.ship.ai<=0){
    S.ship.ai=Math.max(.035,.18*(1-S.stats.dodge));
    let bestY=H/2,bestRisk=Infinity;
    for(let y=48;y<H-40;y+=24){
      let risk=Math.abs(y-H/2)*.001;
      for(const b of S.bullets){
        const dx=b.x-S.ship.x;
        if(dx>-30&&dx<440)risk+=Math.max(0,10-Math.abs(y-b.y)/9)*(1+S.stats.dodge*2.1);
      }
      for(const e of S.enemies){
        const dx=e.x-S.ship.x;
        if(dx>0&&dx<230)risk+=Math.max(0,8-Math.abs(y-e.y)/12);
      }
      if(risk<bestRisk){bestRisk=risk;bestY=y;}
    }
    S.ship.targetY=bestY;
  }
  const old=S.ship.y,maxMove=350*S.stats.speed*dt;
  S.ship.y+=clamp(S.ship.targetY-S.ship.y,-maxMove,maxMove);
  S.ship.y=clamp(S.ship.y,38,H-38);
  S.ship.tilt=(S.ship.y-old)*.12;
  S.ship.inv=Math.max(0,S.ship.inv-dt);
}

function enemyFire(e){
  const d=ENEMIES[e.type];
  const base=Math.atan2(S.ship.y-e.y,S.ship.x-e.x);
  const speed=(e.type==='sniper'?350:215+S.time*.10)*S.combatSpeed;
  let offsets=[0];
  if(e.type==='bomber')offsets=[-.18,0,.18];
  if(e.type==='guardian')offsets=[-.1,.1];
  if(e.type==='carrier')offsets=[-.22,-.08,.08,.22];
  for(const o of offsets){
    S.bullets.push({x:e.x,y:e.y,vx:Math.cos(base+o)*speed,vy:Math.sin(base+o)*speed,damage:d.damage,life:6,hot:e.type==='sniper'||e.elite});
  }
}

function updateEnemies(dt){
  for(const e of S.enemies){
    const d=ENEMIES[e.type];
    e.t+=dt;
    let move=d.speed*S.combatSpeed*dt*(.86+S.threat*.05);
    if(e.intro)move*=.88;
    e.x-=move;
    if(e.type==='dart')e.y=e.baseY+Math.sin(e.t*5.8)*78;
    if(e.type==='bomber')e.y=e.baseY+Math.sin(e.t*1.8)*55;
    if(e.type==='splitter')e.y=e.baseY+Math.sin(e.t*3.5)*70;
    if(e.type==='healer'){
      const ally=S.enemies.find(o=>o!==e&&o.hp>0&&o.hp<o.maxHp);
      if(ally)ally.hp=Math.min(ally.maxHp,ally.hp+3.5*dt);
    }
    e.fire-=dt;
    const relief=S.hull/S.maxHull<.28?1.45:S.hull/S.maxHull<.48?1.20:1;
    if(e.fire<=0&&e.x<W-30&&d.fire<90&&S.grace<=0&&!e.intro){
      e.fire=d.fire*rand(1.02,1.28)*relief/Math.sqrt(S.threat)*(S.overdrive>0?.80:1);
      enemyFire(e);
    }
    if(dist(e.x,e.y,S.ship.x,S.ship.y)<e.size+12){
      e.hp=0;
      if(S.grace<=0&&!e.intro)hurtShip(d.damage);
    }
  }
}

function updateProjectiles(dt){
  for(const b of S.bullets){
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(dist(b.x,b.y,S.ship.x,S.ship.y)<14){b.life=0;hurtShip(b.damage);}
  }
  for(const sh of S.shots){
    sh.trail.push({x:sh.x,y:sh.y});
    if(sh.trail.length>7)sh.trail.shift();
    if(sh.homing){
      const t=nearestTarget();
      if(t){
        const desired=Math.atan2(t.y-sh.y,t.x-sh.x),speed=Math.hypot(sh.vx,sh.vy),current=Math.atan2(sh.vy,sh.vx);
        const diff=((desired-current+Math.PI*3)%TWO_PI)-Math.PI;
        const a=current+clamp(diff,-4.4*dt,4.4*dt);
        sh.vx=Math.cos(a)*speed;sh.vy=Math.sin(a)*speed;
      }
    }
    sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;sh.life-=dt;
    for(const e of S.enemies){
      if(e.hp<=0||dist(sh.x,sh.y,e.x,e.y)>=e.size+6)continue;
      e.hp-=sh.damage;
      if(sh.splash){
        const r=48+sh.splash*18;
        for(const o of S.enemies)if(o!==e&&o.hp>0&&dist(o.x,o.y,e.x,e.y)<r)o.hp-=sh.damage*.32;
      }
      if(sh.kind==='arc'){
        const o=S.enemies.find(o=>o!==e&&o.hp>0&&dist(o.x,o.y,e.x,e.y)<125);
        if(o)o.hp-=sh.damage*.6;
      }
      if(sh.kind==='rail'&&S.specials.beamLance)e.hp-=sh.damage*.35;
      if((sh.kind==='flak'||sh.kind==='nova')&&S.specials.detonation&&chance(.27)){
        for(const o of S.enemies)if(o!==e&&o.hp>0&&dist(o.x,o.y,e.x,e.y)<115)o.hp-=sh.damage*.25;
      }
      if(sh.pierce>0)sh.pierce--;else sh.life=0;
      break;
    }
    if(S.boss&&dist(sh.x,sh.y,S.boss.x,S.boss.y)<S.boss.size){
      S.boss.hp-=sh.damage;if(sh.pierce<=0)sh.life=0;
    }
  }
}

function spawnBoss(forced=false){
  if(S.boss)return false;
  const type=forced?{name:'Rift Tyrant',color:'#ff4fd8',accent:'#ffffff'}:BOSSES[S.bosses%BOSSES.length];
  const hp=(forced?560:330)*(1+S.bosses*.5)*(1+S.time/700);
  S.boss={type,x:W+100,y:H/2,hp,maxHp:hp,size:forced?78:70,fire:forced?.72:1.18,t:0,phase:1,forced};
  banner(forced?'RIFT TYRANT INBOUND':'BOSS CONTACT',type.color,type.name);
  S.screenShake=6;
  return true;
}

function updateBoss(dt){
  const b=S.boss;if(!b)return;
  b.t+=dt;b.x+=(W-175-b.x)*dt*.42;b.y=H/2+Math.sin(b.t*(1.18+b.phase*.17))*145;
  b.phase=b.hp/b.maxHp<.33?3:b.hp/b.maxHp<.66?2:1;
  b.fire-=dt;
  if(b.fire<=0&&S.grace<=0){
    b.fire=Math.max(b.forced?.26:.4,(b.forced?.69:1.12)-b.phase*.13-S.bosses*.025);
    const base=Math.atan2(S.ship.y-b.y,S.ship.x-b.x),count=(b.forced?6:4)+b.phase*2;
    for(let i=0;i<count;i++){
      const off=(i-(count-1)/2)*(.075+b.phase*.018),speed=(245+b.phase*28+(b.forced?35:0))*S.combatSpeed;
      S.bullets.push({x:b.x,y:b.y,vx:Math.cos(base+off)*speed,vy:Math.sin(base+off)*speed,damage:b.phase===3?2:1,life:7,hot:b.forced});
    }
  }
  if(b.hp<=0){
    const forced=b.forced,name=b.type.name;
    burst(b.x,b.y,b.type.color,95,440,6);
    S.boss=null;S.bosses++;S.screenShake=14;
    S.hull=Math.min(S.maxHull,S.hull+Math.max(3,S.maxHull*.22));S.shield=S.maxShield;gainXP(forced?28:22);
    banner(`${name} DESTROYED`,'#ffe56b',forced?'Mythic salvage secured':'Boss salvage recovered');
    if(S.phase==='running')showBossReward(forced);
  }
}

const LIVE_EVENTS = [
  {kind:'swarm',color:'#ffd76e',title:'CALL THE SWARM',body:'Tap within 5 seconds to summon 32 extra enemies. Clear them all to boost the Star Laser and your next upgrade.',
    accept(){const tag=`swarm-${++S.eventSeq}`,count=32;S.challenge={kind:'swarm',tag,remaining:count};for(let i=0;i<count;i++)spawnEnemy(i%6===0?'gunner':'dart',60+(i%16)*(H-120)/15,{elite:i%13===0,eventTag:tag,x:W+30+(i%8)*42});banner('SWARM ACCEPTED','#ffe56b','Thirty-two hostiles added to the run');}},
  {kind:'boss',color:'#ff63db',title:'OPEN A RIFT',body:'Tap within 5 seconds to summon the Rift Tyrant immediately. It is far tougher than a normal boss.',
    available:()=>S.time>=65&&!S.boss,accept(){spawnBoss(true);}},
  {kind:'hunters',color:'#ff8ba8',title:'SIGNAL ELITE HUNTERS',body:'Tap within 5 seconds to call in eight elite ships. Beat them all for a Legendary-or-better next upgrade.',
    available:()=>S.time>=45,accept(){const tag=`hunters-${++S.eventSeq}`,types=['gunner','sniper','bomber','guardian','splitter','carrier','gunner','sniper'];S.challenge={kind:'hunters',tag,remaining:types.length};types.forEach((t,i)=>spawnEnemy(t,72+i*(H-144)/(types.length-1),{elite:true,eventTag:tag,x:W+40+i*36}));banner('HUNTERS LOCKED ON','#ff8ba8','Eight elites inbound');}},
  {kind:'overdrive',color:'#80f5ff',title:'PUSH THE REACTOR',body:'Tap within 5 seconds for 18 seconds of much faster fire. Enemies also fire faster. Survive it for permanent damage.',
    accept(){S.overdrive=18;banner('REACTOR OVERDRIVE','#80f5ff','Your weapons and theirs accelerate');}},
  {kind:'shield',color:'#9a9fff',title:'DROP THE SHIELDS',body:'Tap within 5 seconds to disable shields for 15 seconds and gain +40% damage. Survive for +2 maximum shield.',
    available:()=>S.time>=75&&!S.shieldTrial,accept(){S.shieldTrial={time:15};S.shield=0;banner('SHIELD GAMBIT','#9a9fff','No shields for 15 seconds');}},
  {kind:'carrier',color:'#d99cff',title:'INTERCEPT CARRIER FLEET',body:'Tap within 5 seconds to bring in three carriers and escorts. Destroy them for a huge burst of build progress.',
    available:()=>S.time>=95,accept(){const tag=`carrier-${++S.eventSeq}`,count=3;S.challenge={kind:'carrier',tag,remaining:count};for(let i=0;i<count;i++)spawnEnemy('carrier',120+i*145,{elite:i===2,eventTag:tag,x:W+70+i*85});for(let i=0;i<10;i++)spawnEnemy('dart',rand(70,H-70),{eventTag:null,x:W+20+(i%5)*35});banner('CARRIER FLEET','#d99cff','Three carriers entered the sector');}}
];

function startLiveEvent(){
  if(S.liveEvent||S.phase!=='running')return;
  let pool=LIVE_EVENTS.filter(e=>!e.available||e.available());
  if(!pool.length)return;
  const def=pick(pool);
  S.liveEvent={...def,time:LIVE_EVENT_WINDOW,max:LIVE_EVENT_WINDOW};
  S.nextLiveEventAt=S.time+rand(34,48);
}

function acceptLiveEvent(){
  if(!S.liveEvent)return false;
  const e=S.liveEvent;S.liveEvent=null;e.accept();return true;
}

function updateLiveEvents(dt){
  if(!S.liveEvent&&S.time>=S.nextLiveEventAt&&S.phase==='running')startLiveEvent();
  if(S.liveEvent){S.liveEvent.time-=dt;if(S.liveEvent.time<=0)S.liveEvent=null;}
  if(S.overdrive>0){
    S.overdrive-=dt;
    if(S.overdrive<=0){S.stats.damage+=.08;banner('OVERDRIVE SURVIVED','#8fffb0','Permanent +8% weapon damage');}
  }
  if(S.shieldTrial){
    S.shieldTrial.time-=dt;
    if(S.shieldTrial.time<=0){S.shieldTrial=null;S.maxShield+=2;S.shield=S.maxShield;banner('SHIELD GAMBIT WON','#8fffb0','+2 maximum shield');}
  }
}

function pressureRelief(){
  const h=S.hull/S.maxHull;
  if(h<.24)return .68;
  if(h<.42)return .82;
  if(h>.86&&S.shield>S.maxShield*.6)return 1.08;
  return 1;
}

function updateDirector(dt){
  if(S.grace>0){S.grace-=dt;return;}
  const relief=pressureRelief();
  S.spawnTimer-=dt;S.waveTimer-=dt;S.bossTimer-=dt;S.breatherTimer-=dt;
  if(S.spawnTimer<=0){
    const pool=S.time<35?['scout','dart','gunner']:S.time<90?['scout','dart','gunner','bomber','sniper']:['scout','dart','gunner','bomber','sniper','splitter','guardian'];
    if(S.time>150)pool.push('healer','carrier');
    spawnEnemy(pick(pool));
    S.spawnTimer=rand(.80,1.16)/(Math.sqrt(S.threat)*relief);
  }
  if(S.waveTimer<=0){
    spawnFormation(1.15);
    S.waveTimer=rand(5.0,7.0)/Math.sqrt(S.threat*relief);
  }
  if(S.bossTimer<=0&&!S.boss){
    spawnBoss(false);
    S.bossTimer=rand(112,135);
  }
  if(S.breatherTimer<=0){
    S.grace=Math.max(S.grace,2.4);
    S.breatherTimer=rand(58,70);
    banner('CLEAR AIR','#8ff7ff','A short gap in enemy fire');
  }
}

function updateSector(){
  const next=1+Math.floor(S.time/SECTOR_LENGTH);
  if(next!==S.sector){
    S.sector=next;S.sectorStart=S.time;S.sectorPulse=1;
    S.stats.luck=Math.min(.75,S.stats.luck+.01);
    S.grace=Math.max(S.grace,2.5);S.bullets.length=0;
    banner(`SECTOR ${S.sector}`,'#ffe56b',`${BIOMES[(S.sector-1)%BIOMES.length].name} · short transition breather`);
    spawnFormation(1.15);
  }
}

function update(dt){
  S.time+=dt;
  S.worldSpeed=2.15+Math.min(.8,S.time/600);
  S.combatSpeed=1.2+Math.min(.35,S.time/800);
  S.threat=1+S.time/115+(S.sector-1)*.15;
  S.maxEnemiesSeen=Math.max(S.maxEnemiesSeen,S.enemies.length);

  if(!S.shieldTrial)S.hull=Math.min(S.maxHull,S.hull+S.stats.repair*dt);
  if(S.shieldDelay>0)S.shieldDelay-=dt;else if(!S.shieldTrial)S.shield=Math.min(S.maxShield,S.shield+S.shieldRegen*dt);
  if(S.killTimer>0){S.killTimer-=dt;if(S.killTimer<=0)S.killStreak=0;}
  S.screenShake=Math.max(0,S.screenShake-dt*20);S.flash=Math.max(0,S.flash-dt);S.sectorPulse=Math.max(0,S.sectorPulse-dt*.8);

  updateSector();
  updateAutopilot(dt);
  updateWeapons(dt);
  updateDirector(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateBoss(dt);
  updateLiveEvents(dt);
  maybeQueueBuildChoice();

  if(S.laserBlast){
    S.laserBlast.radius+=920*dt;S.laserBlast.life-=dt;if(S.laserBlast.life<=0)S.laserBlast=null;
  }

  for(const e of S.enemies)if(e.hp<=0&&!e.dead){e.dead=true;killEnemy(e);}
  S.enemies=S.enemies.filter(e=>!e.dead&&e.x>-90);
  S.bullets=S.bullets.filter(b=>b.life>0&&b.x>-100&&b.x<W+100&&b.y>-90&&b.y<H+90);
  S.shots=S.shots.filter(s=>s.life>0&&s.x<W+120&&s.x>-70&&s.y>-90&&s.y<H+90);

  for(const p of S.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;p.vy*=.98;p.life-=dt;}
  S.particles=S.particles.filter(p=>p.life>0);
  for(const p of S.popups){p.y-=27*dt;p.life-=dt;}S.popups=S.popups.filter(p=>p.life>0);
  for(const b of S.banners)b.life-=dt;S.banners=S.banners.filter(b=>b.life>0);

  updateUI();
}

function burst(x,y,color,n=12,speed=190,size=3){
  for(let i=0;i<n;i++){
    const a=rand(0,TWO_PI),v=rand(speed*.25,speed);
    S.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.25,.75),max:.75,color,size:chance(.25)?size*2:size});
  }
}
function popup(text,x,y,color='#fff',life=.9){S.popups.push({text,x,y,color,life,max:life});}
function banner(text,color='#fff',sub=''){S.banners.push({text,color,sub,life:2.4,max:2.4});}

function updateUI(){
  ui.time.textContent=formatTime(S.time);
  ui.sector.textContent=S.sector;
  ui.hull.textContent=`${Math.max(0,Math.ceil(S.hull))}/${S.maxHull}`;
  ui.shield.textContent=`${Math.max(0,Math.floor(S.shield))}/${S.maxShield}`;

  const laserPct=clamp(S.laserCharge/S.laserMax,0,1);
  const wait=Math.max(0,S.nextLaserAt-S.time);
  ui.laserFill.style.width=`${laserPct*100}%`;
  if(laserPct<1)ui.laserStatus.textContent=`CHARGE ${Math.floor(laserPct*100)}%`;
  else if(wait>0)ui.laserStatus.textContent=`ONLINE IN ${Math.ceil(wait)}s`;
  else ui.laserStatus.textContent='READY · TAP SHIP';

  const threatPct=clamp((S.threat-1)/3.2,0,1);
  ui.threatFill.style.width=`${threatPct*100}%`;
  ui.threatStatus.textContent=threatPct>.72?'EXTREME':threatPct>.48?'HIGH':threatPct>.24?'RISING':'LOW';

  const xpPct=clamp(S.xp/S.xpNeed,0,1);
  ui.upgradeFill.style.width=`${xpPct*100}%`;
  if(S.upgradeReady){
    const gap=Math.max(0,NORMAL_CHOICE_GAP-(S.time-S.lastDecisionAt));
    ui.upgradeStatus.textContent=gap>0?`READY IN ${Math.ceil(gap)}s`:'READY';
  }else ui.upgradeStatus.textContent=`${Math.floor(S.xp)} / ${S.xpNeed}`;

  const chips=[];
  for(const [k,l] of Object.entries(S.weapons))if(l)chips.push(`<span class="weapon">${WEAPONS[k].icon} ${WEAPONS[k].name} Lv.${l}</span>`);
  for(const s of SYNERGIES)if(S.synergies[s.id])chips.push(`<span class="synergy">★ ${s.name}</span>`);
  for(const sp of SPECIALS)if(S.upgrades[`special:${sp.id}`])chips.push(`<span class="special">◆ ${sp.name}</span>`);
  ui.chips.innerHTML=chips.join('');
}

function path(points){
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();
}

function drawBackground(){
  const biome=BIOMES[(S.sector-1)%BIOMES.length];
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,biome.top);g.addColorStop(1,biome.bottom);ctx.fillStyle=g;ctx.fillRect(-20,-20,W+40,H+40);

  for(let i=0;i<nebulae.length;i++){
    const n=nebulae[i];
    const x=((n.x-S.time*18*n.z*S.worldSpeed)%(W+420)+W+420)%(W+420)-210;
    const rg=ctx.createRadialGradient(x,n.y,10,x,n.y,n.r);
    rg.addColorStop(0,biome.nebula+'24');rg.addColorStop(1,biome.nebula+'00');
    ctx.fillStyle=rg;ctx.beginPath();ctx.arc(x,n.y,n.r,0,TWO_PI);ctx.fill();
  }

  const sectorProgress=(S.time%SECTOR_LENGTH)/SECTOR_LENGTH;
  const planetX=W+120-sectorProgress*(W+260),planetY=105+Math.sin(S.sector*.8)*45;
  ctx.save();ctx.globalAlpha=.42;
  ctx.strokeStyle=biome.ring;ctx.lineWidth=7;ctx.beginPath();ctx.arc(planetX,planetY,72,Math.PI*.15,Math.PI*1.85);ctx.stroke();
  ctx.fillStyle=biome.planet;ctx.beginPath();ctx.arc(planetX,planetY,54,0,TWO_PI);ctx.fill();
  ctx.globalAlpha=.16;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(planetX-15,planetY-14,24,0,TWO_PI);ctx.fill();ctx.restore();

  for(const s of stars){
    s.x-=s.z*4.8*S.worldSpeed*(REDUCED_MOTION?.45:1);
    if(s.x<0)s.x=W;
    ctx.fillStyle=`rgba(255,255,255,${.14+s.z*.72})`;
    ctx.fillRect(s.x,s.y,s.size,s.size);
  }

  ctx.save();ctx.globalAlpha=.18;
  for(const d of debris){
    d.x-=d.z*1.5*S.worldSpeed*(REDUCED_MOTION?.45:1);
    d.rot+=d.spin*.006;
    if(d.x<-20){d.x=W+20;d.y=rand(40,H-40);}
    ctx.translate(d.x,d.y);ctx.rotate(d.rot);ctx.fillStyle=biome.accent;ctx.fillRect(-5,-1,10,2);ctx.rotate(-d.rot);ctx.translate(-d.x,-d.y);
  }
  ctx.restore();

  ctx.save();ctx.globalAlpha=.12;ctx.strokeStyle=biome.accent;ctx.lineWidth=2;
  for(let band=0;band<3;band++){
    ctx.beginPath();
    for(let x=0;x<=W;x+=18){
      const y=H*(.28+band*.22)+Math.sin(x*.012+S.time*(.7+band*.16))*18;
      if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }
  ctx.restore();

  if(!REDUCED_MOTION){
    const cometPhase=S.time%21;
    if(cometPhase<3.2){
      const x=W+160-cometPhase*380,y=85+((S.sector*73)%300);
      const cg=ctx.createLinearGradient(x-120,y+30,x,y);cg.addColorStop(0,'#ffffff00');cg.addColorStop(1,'#ffffffbb');
      ctx.strokeStyle=cg;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-120,y+30);ctx.lineTo(x,y);ctx.stroke();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,3,0,TWO_PI);ctx.fill();
    }
  }

  for(let i=0;i<12;i++){
    const x=W-((S.time*140*S.worldSpeed+i*127)%(W+280));
    ctx.fillStyle=`rgba(255,255,255,${.025+i*.004})`;
    ctx.fillRect(x,35+(i*47)%470,110+i*5,1);
  }
}

function drawEnemy(e){
  ctx.save();ctx.translate(e.x,e.y);
  const pulse=.75+.25*Math.sin(e.t*5);
  ctx.shadowColor=e.color;ctx.shadowBlur=e.elite?22:9;ctx.fillStyle=e.color;ctx.strokeStyle=e.color;ctx.lineWidth=2;

  if(e.type==='scout'){
    path([[-18,0],[-8,-10],[8,-7],[19,0],[8,7],[-8,10]]);ctx.fill();
    ctx.fillStyle='#eafff2';ctx.fillRect(2,-3,8,6);ctx.fillStyle='#ffd272';ctx.fillRect(-22,-3,7,6);
  }else if(e.type==='dart'){
    path([[21,0],[-16,-8],[-7,0],[-16,8]]);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(3,-2,8,4);
  }else if(e.type==='gunner'){
    path([[-21,0],[-10,-14],[9,-9],[21,0],[9,9],[-10,14]]);ctx.fill();ctx.fillRect(3,-19,14,4);ctx.fillRect(3,15,14,4);
  }else if(e.type==='bomber'){
    path([[-25,0],[-12,-18],[12,-13],[26,0],[12,13],[-12,18]]);ctx.fill();
    ctx.fillStyle='#4d2019';ctx.beginPath();ctx.arc(-5,-18,7,0,TWO_PI);ctx.fill();ctx.beginPath();ctx.arc(-5,18,7,0,TWO_PI);ctx.fill();
  }else if(e.type==='sniper'){
    path([[-19,0],[-7,-12],[12,-7],[21,0],[12,7],[-7,12]]);ctx.fill();ctx.fillRect(9,-2,31,4);
    ctx.globalAlpha=pulse;ctx.fillStyle='#fff';ctx.fillRect(30,-1,10,2);ctx.globalAlpha=1;
  }else if(e.type==='guardian'){
    ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(0,0,27+Math.sin(e.t*3)*2,0,TWO_PI);ctx.stroke();ctx.globalAlpha=1;
    ctx.save();ctx.rotate(e.t);ctx.fillRect(-22,-3,44,6);ctx.rotate(Math.PI/2);ctx.fillRect(-22,-3,44,6);ctx.restore();
    ctx.fillStyle='#f2ffff';ctx.beginPath();ctx.arc(0,0,9,0,TWO_PI);ctx.fill();
  }else if(e.type==='splitter'){
    ctx.save();ctx.rotate(e.t*.45);path([[0,-23],[11,-8],[23,0],[11,8],[0,23],[-11,8],[-23,0],[-11,-8]]);ctx.fill();ctx.restore();
  }else if(e.type==='healer'){
    ctx.save();ctx.rotate(-e.t*.8);ctx.fillRect(-5,-24,10,48);ctx.fillRect(-24,-5,48,10);ctx.restore();
    ctx.strokeStyle='#a6ffd0';ctx.beginPath();ctx.arc(0,0,28+Math.sin(e.t*4)*3,0,TWO_PI);ctx.stroke();
  }else if(e.type==='carrier'){
    path([[-32,0],[-22,-20],[5,-25],[31,-11],[36,0],[31,11],[5,25],[-22,20]]);ctx.fill();
    ctx.fillStyle='#fff';ctx.fillRect(8,-6,16,12);ctx.fillStyle='#6d427c';ctx.fillRect(-12,-19,10,8);ctx.fillRect(-12,11,10,8);
  }
  ctx.shadowBlur=0;
  if(e.elite){ctx.strokeStyle='#ffe56b';ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(0,0,e.size+9+Math.sin(e.t*4)*2,0,TWO_PI);ctx.stroke();ctx.globalAlpha=1;}
  ctx.restore();
}

function drawShip(){
  ctx.save();ctx.translate(S.ship.x,S.ship.y);ctx.rotate(S.ship.tilt*.018);
  ctx.shadowColor='#78eff7';ctx.shadowBlur=18;ctx.fillStyle=S.ship.inv>0?'#fff':'#75e8f2';
  path([[33,0],[-11,-10],[-25,-25],[-16,-5],[-29,0],[-16,5],[-25,25],[-11,10]]);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle='#d6ffff';ctx.fillRect(7,-4,12,8);
  ctx.fillStyle='#ffd76e';const exhaust=20+S.worldSpeed*7+rand(0,9);ctx.fillRect(-32-exhaust+12,-4,exhaust,8);
  if(S.shield>0&&!S.shieldTrial){
    ctx.strokeStyle=`rgba(125,225,255,${.2+.42*S.shield/S.maxShield})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,34,0,TWO_PI);ctx.stroke();
  }
  if(S.weapons.drone>0){
    const count=Math.min(3,S.weapons.drone);
    for(let i=0;i<count;i++){const a=S.time*2.6+i*TWO_PI/count;ctx.fillStyle='#7fffc5';ctx.fillRect(Math.cos(a)*44-3,Math.sin(a)*27-3,6,6);}
  }
  if(laserReady()){
    ctx.strokeStyle='#eaffff';ctx.shadowColor='#7ffaff';ctx.shadowBlur=24;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,41+Math.sin(S.time*8)*4,0,TWO_PI);ctx.stroke();ctx.shadowBlur=0;
  }
  ctx.restore();
}

function drawBoss(){
  const b=S.boss;if(!b)return;
  ctx.save();ctx.translate(b.x,b.y);ctx.shadowColor=b.type.color;ctx.shadowBlur=30;ctx.fillStyle=b.type.color;
  path([[-80,0],[-44,-52],[31,-39],[74,0],[31,39],[-44,52]]);ctx.fill();
  ctx.fillStyle=b.type.accent;ctx.beginPath();ctx.arc(9,0,14+b.phase*3,0,TWO_PI);ctx.fill();
  ctx.strokeStyle=b.type.accent;ctx.lineWidth=3;ctx.beginPath();ctx.arc(9,0,36+Math.sin(b.t*4)*4,0,TWO_PI);ctx.stroke();ctx.restore();

  ctx.fillStyle='#050a15dd';ctx.fillRect(W-330,42,290,16);ctx.fillStyle=b.type.color;ctx.fillRect(W-326,46,282*clamp(b.hp/b.maxHp,0,1),8);
  ctx.fillStyle='#fff';ctx.font='bold 10px monospace';ctx.textAlign='right';ctx.fillText(`${b.type.name} · PHASE ${b.phase}`,W-42,38);ctx.textAlign='left';
}

function drawLiveEvent(){
  if(!S.liveEvent)return;
  const e=S.liveEvent,pct=clamp(e.time/e.max,0,1),w=430,h=86,x=W/2-w/2,y=H-118;
  ctx.save();ctx.globalAlpha=.94;ctx.fillStyle='#050a17e8';ctx.fillRect(x,y,w,h);ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
  ctx.fillStyle=e.color;ctx.font='bold 14px monospace';ctx.fillText(e.title,x+15,y+23);
  ctx.fillStyle='#d8e6fb';ctx.font='10px monospace';ctx.fillText(e.body.slice(0,68)+(e.body.length>68?'…':''),x+15,y+43);
  ctx.fillStyle='#20304a';ctx.fillRect(x+15,y+60,w-30,8);ctx.fillStyle=e.color;ctx.fillRect(x+15,y+60,(w-30)*pct,8);
  ctx.fillStyle='#fff';ctx.font='bold 10px monospace';ctx.textAlign='right';ctx.fillText(`TAP TO ACCEPT · ${e.time.toFixed(1)}s`,x+w-15,y+76);ctx.textAlign='left';ctx.restore();
}

function draw(){
  ctx.save();
  if(S.screenShake&&!REDUCED_MOTION)ctx.translate(rand(-S.screenShake,S.screenShake),rand(-S.screenShake,S.screenShake));
  drawBackground();

  const biome=BIOMES[(S.sector-1)%BIOMES.length];
  ctx.fillStyle='#02061188';ctx.fillRect(0,0,W,31);
  ctx.fillStyle=biome.accent;ctx.font='bold 11px monospace';
  ctx.fillText(`SECTOR ${S.sector} · ${biome.name.toUpperCase()} · THREAT ${S.threat.toFixed(1)}×${S.grace>0?` · CLEAR AIR ${Math.ceil(S.grace)}s`:''}`,14,20);

  drawShip();
  for(const e of S.enemies)drawEnemy(e);

  for(const sh of S.shots){
    ctx.globalAlpha=.24;for(const t of sh.trail){ctx.fillStyle=sh.color;ctx.fillRect(t.x-5,t.y-1,10,2);}ctx.globalAlpha=1;
    ctx.shadowColor=sh.color;ctx.shadowBlur=9;ctx.fillStyle=sh.color;
    if(sh.kind==='missile'||sh.kind==='nova'){ctx.beginPath();ctx.arc(sh.x,sh.y,sh.kind==='nova'?6:4,0,TWO_PI);ctx.fill();}
    else ctx.fillRect(sh.x-6,sh.y-2,12,4);ctx.shadowBlur=0;
  }

  for(const b of S.bullets){
    ctx.shadowColor=b.hot?'#fff':'#ff6f8e';ctx.shadowBlur=b.hot?13:7;ctx.fillStyle=b.hot?'#fff1b0':'#ff6f8e';
    ctx.beginPath();ctx.arc(b.x,b.y,b.hot?5:4,0,TWO_PI);ctx.fill();ctx.shadowBlur=0;
  }

  drawBoss();

  for(const p of S.particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}
  ctx.globalAlpha=1;
  for(const p of S.popups){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(p.text,p.x,p.y);}
  ctx.globalAlpha=1;ctx.textAlign='left';

  if(S.killStreak>=8){ctx.fillStyle='#ffe56b';ctx.font='bold 13px monospace';ctx.fillText(`${S.killStreak} KILL CHAIN`,15,H-18);}

  if(S.laserBlast){
    const a=S.laserBlast.life/S.laserBlast.max;ctx.globalAlpha=a;ctx.strokeStyle='#dfffff';ctx.shadowColor='#79f4ff';ctx.shadowBlur=28;ctx.lineWidth=10*(a+.2);
    ctx.beginPath();ctx.arc(S.ship.x,S.ship.y,S.laserBlast.radius,0,TWO_PI);ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=1;
  }

  drawLiveEvent();

  const active=S.banners[0];
  if(active){
    const alpha=clamp(1-Math.abs(active.life/active.max-.5)*1.35,0,1);
    ctx.globalAlpha=alpha;ctx.textAlign='center';ctx.fillStyle='#020611d5';ctx.fillRect(W/2-230,66,460,65);
    ctx.fillStyle=active.color;ctx.font='bold 22px monospace';ctx.fillText(active.text,W/2,94);
    ctx.fillStyle='#fff';ctx.font='10px monospace';ctx.fillText(active.sub,W/2,113);ctx.textAlign='left';ctx.globalAlpha=1;
  }

  if(S.sectorPulse>0){ctx.fillStyle=`rgba(255,255,255,${S.sectorPulse*.12})`;ctx.fillRect(0,0,W,H);}
  if(S.flash){ctx.fillStyle=`rgba(255,255,255,${S.flash*1.15})`;ctx.fillRect(0,0,W,H);}
  ctx.restore();
}

function handlePointer(ev){
  if(S.phase!=='running')return;
  const r=canvas.getBoundingClientRect?canvas.getBoundingClientRect():{left:0,top:0,width:W,height:H};
  const x=((('clientX' in ev)?ev.clientX:0)-r.left)*W/r.width;
  const y=((('clientY' in ev)?ev.clientY:0)-r.top)*H/r.height;
  if(dist(x,y,S.ship.x,S.ship.y)<82){releaseStarLaser();return;}
  if(S.liveEvent)acceptLiveEvent();
}
canvas.addEventListener('pointerdown',handlePointer);

function endRun(){
  S.phase='dead';cancelAnimationFrame(raf);S.best=Math.max(S.best,S.time);localStorage.setItem('starwardBest',S.best);
  eyebrow.textContent='RUN COMPLETE';overlayTitle.textContent=`Survived ${formatTime(S.time)}`;
  overlayText.textContent=`Sector ${S.sector} · Build level ${S.level} · ${S.kills} enemies destroyed · ${S.bosses} bosses defeated · Best ${formatTime(S.best)}`;
  choiceGrid.classList.add('hidden');startBtn.textContent='Configure Another Run';startBtn.classList.remove('hidden');overlay.classList.remove('hidden');
}

function loop(now){
  if(S.phase==='dead'||S.phase==='menu')return;
  const dt=Math.min(.033,(now-last)/1000||.016);last=now;
  if(S.phase==='running')update(dt);
  draw();
  raf=requestAnimationFrame(loop);
}

startBtn.addEventListener('click',startRun);
S=freshState();
updateUI();
draw();

if(typeof window!=='undefined'){
  window.__STARWARD__={
    getState:()=>S,
    tapShip:()=>releaseStarLaser(),
    acceptEvent:()=>acceptLiveEvent()
  };
}
})();
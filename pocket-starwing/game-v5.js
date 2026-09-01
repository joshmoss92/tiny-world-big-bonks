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
  time:$('time'), hull:$('hull'), shield:$('shield'), level:$('level'), salvage:$('salvage'),
  damage:$('statDamage'), rate:$('statRate'), dodge:$('statDodge'), thrust:$('statThrust'),
  repair:$('statRepair'), luck:$('statLuck'), xp:$('xpText'), xpBar:$('xpBar'), chips:$('buildChips')
};

const W=canvas.width, H=canvas.height;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[(Math.random()*a.length)|0];
const chance=p=>Math.random()<p;
ctx.imageSmoothingEnabled=false;

const NORMAL_CHOICE_GAP=72;
const QUEUED_CHOICE_GAP=16;
const LASER_MAX=18;

const RARITIES=[
  {name:'Rare',cls:'rare',weight:58,power:1},
  {name:'Epic',cls:'epic',weight:25,power:1.45},
  {name:'Legendary',cls:'legendary',weight:10,power:2},
  {name:'Mythic',cls:'mythic',weight:5,power:3},
  {name:'God',cls:'god',weight:2,power:4.5}
];

const BIOMES=[
  {name:'Cloudreach',top:'#071a39',bottom:'#4d96b0',accent:'#c6ffab',fog:'#88e6ff13'},
  {name:'Ember Belt',top:'#1b0d28',bottom:'#9e4239',accent:'#ffd071',fog:'#ff9b6717'},
  {name:'Silent Ruins',top:'#050d26',bottom:'#273d60',accent:'#72f0e3',fog:'#72f0e312'},
  {name:'Stormglass',top:'#050c18',bottom:'#213b51',accent:'#dceeff',fog:'#c7e6ff14'},
  {name:'Violet Deep',top:'#160925',bottom:'#633678',accent:'#ffc0ef',fog:'#d597ff16'}
];

const WEAPONS={
  pulse:{name:'Pulse Cannon',icon:'•',color:'#fff0a5',cool:.26,damage:5.6,speed:950},
  scatter:{name:'Spread Shot',icon:'✣',color:'#ffb0df',cool:.60,damage:3.3,speed:820},
  missile:{name:'Homing Missiles',icon:'◇',color:'#b9ff8e',cool:.84,damage:8.8,speed:650},
  rail:{name:'Railgun',icon:'━',color:'#ffffff',cool:1.00,damage:13.2,speed:1500},
  flak:{name:'Flak Cannon',icon:'✹',color:'#ff977d',cool:.72,damage:7.8,speed:760},
  arc:{name:'Chain Lightning',icon:'ϟ',color:'#9fc7ff',cool:.86,damage:6.8,speed:1000},
  drone:{name:'Attack Drones',icon:'⊙',color:'#7fffc5',cool:.52,damage:4.3,speed:980},
  laser:{name:'Rapid Laser',icon:'▸',color:'#ff89ec',cool:.13,damage:2.6,speed:1800},
  nova:{name:'Heavy Bombs',icon:'✦',color:'#ffd27a',cool:1.16,damage:14.8,speed:620}
};

const ENEMIES={
  scout:{hp:8,speed:170,fire:2.5,damage:1,xp:1,salvage:1,size:15,color:'#a9ef8c'},
  dart:{hp:6,speed:260,fire:99,damage:1,xp:1,salvage:1,size:12,color:'#ff879a'},
  gunner:{hp:18,speed:132,fire:1.75,damage:1,xp:2,salvage:2,size:20,color:'#8ce6de'},
  tank:{hp:48,speed:90,fire:2.1,damage:2,xp:4,salvage:4,size:29,color:'#f2b96b'},
  sniper:{hp:16,speed:100,fire:3.5,damage:2,xp:3,salvage:3,size:18,color:'#ff9a78'},
  swarm:{hp:4,speed:290,fire:4,damage:1,xp:1,salvage:1,size:9,color:'#e8ff92'},
  bomber:{hp:31,speed:108,fire:2.8,damage:2,xp:3,salvage:4,size:23,color:'#ffa86e'},
  guardian:{hp:36,speed:98,fire:2.4,damage:1,xp:4,salvage:4,size:24,color:'#73c9ff'},
  splitter:{hp:20,speed:142,fire:2.7,damage:1,xp:3,salvage:3,size:19,color:'#f09bd7'},
  charger:{hp:22,speed:132,fire:99,damage:2,xp:3,salvage:3,size:19,color:'#ff6687'},
  healer:{hp:26,speed:96,fire:99,damage:1,xp:4,salvage:5,size:21,color:'#82ffbc'},
  weaver:{hp:18,speed:140,fire:2.15,damage:1,xp:3,salvage:3,size:18,color:'#c7a8ff'}
};

const BOSSES=[
  {name:'Glimmer Maw',color:'#ff7198',accent:'#ffe6ee'},
  {name:'Cinder Throne',color:'#ff895b',accent:'#ffd27a'},
  {name:'Archive Crown',color:'#71e7df',accent:'#c8ffff'},
  {name:'Storm Seraph',color:'#8bb9ff',accent:'#ffffff'},
  {name:'Violet Oracle',color:'#cf7dff',accent:'#ffc0ef'}
];

const STAT_UPGRADES=[
  {id:'hull',name:'Reinforced Hull',group:'survival',base:3,desc:'Take more damage before the run ends.',effect:v=>`+${v} maximum hull and heal ${Math.ceil(v/2)} hull`,apply:v=>{S.maxHull+=v;S.hull=Math.min(S.maxHull,S.hull+Math.ceil(v/2));}},
  {id:'shield',name:'Larger Shield',group:'survival',base:2,desc:'Increase the shield that recharges between hits.',effect:v=>`+${v} maximum shield and fully recharge it`,apply:v=>{S.maxShield+=v;S.shield=S.maxShield;S.shieldRegen+=.012*v;}},
  {id:'repair',name:'Faster Repairs',group:'survival',base:.018,desc:'Repair hull damage automatically over time.',effect:v=>`Repair 1 hull every ${Math.max(5,Math.round(1/v))} seconds`,apply:v=>S.stats.repair+=v},
  {id:'dodge',name:'Better Dodging',group:'survival',base:.07,desc:'The autopilot notices danger sooner.',effect:v=>`Autopilot reacts ${Math.round(v*100)}% earlier`,apply:v=>S.stats.dodge=Math.min(.84,S.stats.dodge+v)},
  {id:'speed',name:'Faster Engines',group:'survival',base:.15,desc:'Move between safe positions more quickly.',effect:v=>`+${Math.round(v*100)}% movement speed`,apply:v=>S.stats.speed+=v},
  {id:'armor',name:'Stronger Armor',group:'survival',base:.08,desc:'Some hits deal less hull damage.',effect:v=>`+${Math.round(v*100)}% damage-reduction chance`,apply:v=>S.stats.armor=Math.min(.78,S.stats.armor+v)},
  {id:'damage',name:'Weapon Damage',group:'offense',base:.18,desc:'Every installed weapon hits harder.',effect:v=>`+${Math.round(v*100)}% weapon damage`,apply:v=>S.stats.damage+=v},
  {id:'rate',name:'Fire Rate',group:'offense',base:.15,desc:'Every installed weapon fires more often.',effect:v=>`+${Math.round(v*100)}% fire rate`,apply:v=>S.stats.rate+=v},
  {id:'crit',name:'Critical Chance',group:'offense',base:.06,desc:'Some attacks deal double damage.',effect:v=>`+${Math.round(v*100)}% critical chance`,apply:v=>S.stats.crit=Math.min(.72,S.stats.crit+v)},
  {id:'pierce',name:'Piercing Shots',group:'offense',base:1,desc:'Shots continue through more enemies.',effect:v=>`Shots pass through ${v} extra ${v===1?'enemy':'enemies'}`,apply:v=>S.stats.pierce+=v},
  {id:'splash',name:'Blast Radius',group:'offense',base:1,desc:'Explosive weapons damage a wider area.',effect:v=>`+${v} blast radius level${v===1?'':'s'}`,apply:v=>S.stats.splash+=v},
  {id:'luck',name:'Rarity Luck',group:'utility',base:.05,desc:'Future choices are more likely to be high rarity.',effect:v=>`+${Math.round(v*100)}% high-rarity odds`,apply:v=>S.stats.luck=Math.min(.75,S.stats.luck+v)}
];

const SPECIALS=[
  {id:'secondChance',name:'Second Chance',rarity:2,desc:'Survive one fatal hit instead of ending the run.',effect:'Once per run: revive at 40% hull',apply(){S.specials.secondChance=(S.specials.secondChance||0)+1;}},
  {id:'glassCannon',name:'Glass Cannon',rarity:2,desc:'Trade durability for a major damage boost.',effect:'+60% damage, -3 maximum hull',apply(){S.stats.damage+=.6;S.maxHull=Math.max(6,S.maxHull-3);S.hull=Math.min(S.hull,S.maxHull);}},
  {id:'combatRepair',name:'Combat Repair',rarity:2,desc:'Destroying enemies repairs the ship.',effect:'Every 15 kills: repair 1 hull',apply(){S.specials.combatRepair=(S.specials.combatRepair||0)+1;}},
  {id:'pointDefense',name:'Point Defense',rarity:3,desc:'Automatically destroys some enemy shots.',effect:'Destroy every 9th enemy projectile',apply(){S.specials.pointDefense=(S.specials.pointDefense||0)+1;}},
  {id:'smartAI',name:'Smart Autopilot',rarity:3,desc:'React sooner and move between safe lanes faster.',effect:'+15% dodge reaction, +20% movement speed',apply(){S.stats.dodge=Math.min(.84,S.stats.dodge+.15);S.stats.speed+=.2;}},
  {id:'arsenal',name:'Weapon Mastery',rarity:3,desc:'Improve every weapon already installed.',effect:'+1 level to every installed weapon',apply(){for(const k of Object.keys(S.weapons))if(S.weapons[k])S.weapons[k]=Math.min(15,S.weapons[k]+1);}},
  {id:'laserBattery',name:'Faster Star Laser',rarity:3,desc:'The Star Laser needs fewer weapon kills to recharge.',effect:'Star Laser charges 25% faster',apply(){S.specials.laserBattery=(S.specials.laserBattery||0)+.25;}},
  {id:'balanced',name:'Perfect Tune-Up',rarity:4,desc:'A major all-round improvement with no downside.',effect:'+30% damage, +25% fire rate, +3 hull, +2 shield',apply(){S.stats.damage+=.3;S.stats.rate+=.25;S.maxHull+=3;S.hull+=3;S.maxShield+=2;S.shield=S.maxShield;}}
];

const SYNERGIES=[
  {id:'aegis',name:'Self-Recharging Defense',test:s=>s.maxShield>=9&&s.stats.repair>=.05,desc:'Strong shields and repairs reinforce each other.',apply:s=>{s.shieldRegen+=.035;s.stats.repair+=.012;}},
  {id:'agile',name:'Agile Autopilot',test:s=>s.stats.dodge>=.35&&s.stats.speed>=1.5,desc:'Fast engines and dodging make movement safer.',apply:s=>{s.stats.dodge=Math.min(.84,s.stats.dodge+.07);s.stats.speed+=.1;}},
  {id:'fullAuto',name:'Full Auto',test:s=>s.stats.damage>=1.7&&s.stats.rate>=1.45,desc:'High damage and fire rate reinforce each other.',apply:s=>{s.stats.damage+=.12;s.stats.rate+=.12;}},
  {id:'missiles',name:'Missile Barrage',test:s=>s.weapons.missile>=4&&s.weapons.scatter>=3,desc:'Homing missiles launch in pairs.',apply:s=>s.specials.missileBarrage=1},
  {id:'beam',name:'Beam Cannon',test:s=>s.weapons.laser>=4&&s.weapons.rail>=3,desc:'Railgun shots gain extra beam damage.',apply:s=>s.specials.beamCannon=1},
  {id:'chain',name:'Chain Detonations',test:s=>s.weapons.nova>=4&&s.weapons.flak>=3,desc:'Heavy explosions can trigger secondary blasts.',apply:s=>s.specials.chainBombs=1}
];

const stars=Array.from({length:240},()=>({x:rand(0,W),y:rand(0,H),z:rand(.1,1),s:chance(.16)?2:1}));
let S,raf=0,last=0;

function freshState(){return{
  phase:'menu',time:0,level:1,xp:0,xpNeed:62,upgradeReady:false,upgradeQueued:false,lastDecisionAt:0,nextUpgradeRarity:0,
  salvage:0,hull:22,maxHull:22,shield:7,maxShield:7,shieldRegen:.095,shieldDelay:0,threat:.58,grace:5,kills:0,bosses:0,openingPick:0,
  worldSpeed:2.0,combatSpeed:1.18,stats:{damage:1,rate:1,dodge:.22,speed:1.24,repair:.018,luck:0,armor:.07,crit:.03,pierce:0,splash:0},
  weapons:{pulse:1,scatter:0,missile:0,rail:0,flak:0,arc:0,drone:0,laser:0,nova:0},cooldowns:{},upgrades:{},specials:{},synergies:{},
  choiceQueue:[],queuedKeys:{},ship:{x:165,y:H/2,targetY:H/2,ai:0,inv:0,tilt:0},enemies:[],bullets:[],shots:[],particles:[],popups:[],banners:[],boss:null,
  laserCharge:0,laserMax:LASER_MAX,laserBlast:null,laserHintShown:false,
  liveEvent:null,nextLiveEventAt:24,eventSeq:0,challenge:null,surgeTimer:0,shieldTrial:null,
  director:{spawn:2.2,wave:6.5,event:170,boss:170,breather:62},combo:0,comboTimer:0,screenShake:0,flash:0,bulletsSeen:0,nextMilestone:60,
  best:Number(localStorage.getItem('starwardBest')||0)
};}

const formatTime=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const formatRepair=v=>v<=0?'OFF':`1 / ${Math.max(1,Math.round(1/v))}s`;
function popup(text,x,y,color='#fff',life=.85){S.popups.push({text,x,y,color,life,max:life});}
function banner(text,color='#fff',sub=''){S.banners.push({text,color,sub,life:2.6,max:2.6});}
function burst(x,y,color,n=12,speed=180,size=3){for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),v=rand(speed*.25,speed);S.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.25,.7),max:.7,color,size:chance(.25)?size*2:size});}}

function rollRarity(min=0){const ws=RARITIES.map((r,i)=>i<min?0:r.weight*(i?1+S.stats.luck*i*1.25:1));let total=ws.reduce((a,b)=>a+b,0),x=Math.random()*total;for(let i=0;i<RARITIES.length;i++){x-=ws[i];if(x<=0)return RARITIES[i]}return RARITIES[min];}
function weaponCard(min=0){const key=pick(Object.keys(WEAPONS)),w=WEAPONS[key],r=rollRarity(min),cur=S.weapons[key],gain=Math.max(1,Math.round(r.power*.7)),next=Math.min(15,cur+gain);return{rarity:r,title:cur?`Upgrade ${w.name}`:`Unlock ${w.name}`,desc:cur?`${w.name} is currently level ${cur}.`:`Adds ${w.name} to automatic fire.`,effect:cur?`Level ${cur} → ${next}`:`Install at level ${gain}`,apply(){S.weapons[key]=next;}};}
function statCard(group=null,min=0){const pool=group?STAT_UPGRADES.filter(x=>x.group===group):STAT_UPGRADES,item=pick(pool),r=rollRarity(min);let v=item.base*r.power*rand(.92,1.08);if(['hull','shield','pierce','splash'].includes(item.id))v=Math.max(1,Math.round(v));return{rarity:r,title:item.name,desc:item.desc,effect:item.effect(v),apply(){item.apply(v);}};}
function specialCard(min=2){const pool=SPECIALS.filter(x=>x.rarity>=min&&!S.upgrades[`special:${x.id}`]);if(!pool.length)return statCard(null,min);const item=pick(pool),r=RARITIES[Math.max(min,item.rarity)];return{rarity:r,title:item.name,desc:item.desc,effect:item.effect,apply(){item.apply();S.upgrades[`special:${item.id}`]=1;}};}
function draft(spec=['random','random','random'],min=0){return spec.map(k=>k==='weapon'?weaponCard(min):['survival','offense','utility'].includes(k)?statCard(k,min):k==='special'?specialCard(Math.max(2,min)):chance(.34)?weaponCard(min):chance(.10+S.stats.luck*.12)?specialCard(Math.max(2,min)):statCard(null,min));}

function updateUI(){
  ui.time.textContent=formatTime(S.time);ui.hull.textContent=`${Math.max(0,Math.ceil(S.hull))}/${S.maxHull}`;ui.shield.textContent=`${Math.max(0,Math.floor(S.shield))}/${S.maxShield}`;ui.level.textContent=S.level;ui.salvage.textContent=Math.floor(S.salvage);
  ui.damage.textContent=`${Math.round(S.stats.damage*100)}%`;ui.rate.textContent=`${Math.round(S.stats.rate*100)}%`;ui.dodge.textContent=`${Math.round(S.stats.dodge*100)}%`;ui.thrust.textContent=`${Math.round(S.stats.speed*100)}%`;ui.repair.textContent=formatRepair(S.stats.repair);ui.luck.textContent=`${Math.round(S.stats.luck*100)}%`;
  if(S.upgradeReady){const wait=Math.max(0,NORMAL_CHOICE_GAP-(S.time-S.lastDecisionAt));ui.xp.textContent=wait>0?`NEXT CHOICE IN ${Math.ceil(wait)}s`:'UPGRADE READY';}else ui.xp.textContent=`${Math.floor(S.xp)} / ${S.xpNeed}`;
  ui.xpBar.style.width=`${clamp(S.xp/S.xpNeed*100,0,100)}%`;
  const chips=[];for(const[k,l]of Object.entries(S.weapons))if(l)chips.push(`<span class="weapon-chip">${WEAPONS[k].icon} ${WEAPONS[k].name} Lv.${l}</span>`);for(const s of SYNERGIES)if(S.synergies[s.id])chips.push(`<span class="synergy-chip">★ ${s.name}</span>`);for(const s of SPECIALS)if(S.upgrades[`special:${s.id}`])chips.push(`<span class="special-chip">◆ ${s.name}</span>`);ui.chips.innerHTML=chips.join('');
}
function hideOverlay(){overlay.classList.add('hidden');choiceGrid.classList.add('hidden');}
function showChoices({type,heading,body,cards,progress='',onPick}){S.phase='choice';eyebrow.textContent=type;overlayTitle.textContent=heading;overlayText.innerHTML=`${progress?`<div class="draft-progress">${progress}</div>`:''}${body}`;choiceGrid.innerHTML='';choiceGrid.classList.remove('hidden');startBtn.classList.add('hidden');overlay.classList.remove('hidden');for(const c of cards){const b=document.createElement('button');b.className=`choice-card r-${c.rarity.cls}`;b.innerHTML=`<span class="rarity">${c.rarity.name.toUpperCase()}</span><h3>${c.title}</h3><p>${c.desc}</p><span class="effect">${c.effect}</span>`;b.addEventListener('click',()=>{c.apply();checkSynergies();updateUI();hideOverlay();onPick();},{once:true});choiceGrid.appendChild(b);}}
function showOpeningChoice(){const i=S.openingPick,spec=[['weapon','survival','offense'],['survival','weapon','utility'],['offense','survival','weapon'],['survival','offense','random'],['weapon','special','survival']];showChoices({type:'PRE-FLIGHT',heading:'Build your ship',body:'Pick one upgrade. The run starts after five choices.',cards:draft(spec[i],i===4?1:0),progress:`STARTING CHOICE ${i+1} OF 5`,onPick(){S.openingPick++;if(S.openingPick<5)setTimeout(showOpeningChoice,50);else beginRun();}});}
function startRun(){cancelAnimationFrame(raf);S=freshState();updateUI();showOpeningChoice();}
function queueChoice(key,fn,delay=0){if(S.queuedKeys[key])return;S.queuedKeys[key]=1;S.choiceQueue.push({key,fn,readyAt:S.time+delay});}
function resumeRun(){S.lastDecisionAt=S.time;S.phase='running';hideOverlay();}
function showNormalUpgrade(){S.upgradeQueued=false;S.level++;S.xp=Math.max(0,S.xp-S.xpNeed);S.xpNeed=Math.round(S.xpNeed*1.17+10);S.upgradeReady=S.xp>=S.xpNeed;const min=S.nextUpgradeRarity;S.nextUpgradeRarity=0;showChoices({type:'UPGRADE',heading:'Choose one upgrade',body:'Make one clear improvement, then let the ship run again.',cards:draft(['random','survival','random'],min),onPick:resumeRun});}
function showBossReward(){showChoices({type:'BOSS REWARD',heading:'Choose a boss reward',body:'A rare reward for surviving the dreadnought.',cards:draft(['weapon','special','random'],1),onPick:resumeRun});}
function gainXP(n){S.xp+=n;if(S.xp>=S.xpNeed)S.upgradeReady=true;}
function checkNormalUpgrade(){if(!S.upgradeReady||S.upgradeQueued||S.phase!=='running'||S.time-S.lastDecisionAt<NORMAL_CHOICE_GAP)return;S.upgradeQueued=true;queueChoice('normal-upgrade',()=>{delete S.queuedKeys['normal-upgrade'];showNormalUpgrade();});}
function processChoiceQueue(){if(S.phase!=='running'||!S.choiceQueue.length)return;const n=S.choiceQueue[0];if(S.time<n.readyAt||S.time-S.lastDecisionAt<QUEUED_CHOICE_GAP)return;S.choiceQueue.shift();delete S.queuedKeys[n.key];n.fn();}
function checkSynergies(){for(const s of SYNERGIES)if(!S.synergies[s.id]&&s.test(S)){S.synergies[s.id]=1;s.apply(S);banner(`BUILD BONUS: ${s.name}`,'#ffe56b',s.desc);burst(S.ship.x,S.ship.y,'#ffe56b',30,240,3);}}

function spawnEnemy(type,y=rand(65,H-65),elite=false,intro=false,eventTag=null){const d=ENEMIES[type],scale=1+S.time/250;S.enemies.push({type,x:W+45,y,baseY:y,hp:d.hp*scale*(elite?2.2:1),maxHp:d.hp*scale*(elite?2.2:1),speed:d.speed,fire:rand(.6,Math.max(.85,d.fire)),elite,size:d.size,color:d.color,t:rand(0,10),charge:0,intro,eventTag});}
function spawnIntroSwarm(){for(let i=0;i<26;i++){const y=62+(i%13)*(H-124)/12+Math.sin(i*1.8)*10,type=i%6===0?'scout':'swarm';spawnEnemy(type,y,false,true,'intro');const e=S.enemies.at(-1);e.x=W+20+(i%6)*58+Math.floor(i/6)*24;e.baseY=y;}banner('AMBUSH!','#ffe56b','Twenty-six hostiles already on your tail');}
function beginRun(){hideOverlay();S.phase='running';S.grace=5;S.lastDecisionAt=0;spawnIntroSwarm();last=performance.now();raf=requestAnimationFrame(loop);}
function spawnWave(mult=1,eventTag=null){const pool=['scout','dart','gunner'];if(S.time>35)pool.push('swarm','weaver','sniper');if(S.time>90)pool.push('bomber','charger','splitter');if(S.time>150)pool.push('guardian','tank','healer');const count=Math.min(15,Math.round((5+Math.floor(S.time/55))*mult)),pattern=pick(['line','sine','cluster','wall']);for(let i=0;i<count;i++){let y;if(pattern==='line'||pattern==='wall')y=65+i*(H-130)/Math.max(1,count-1);else if(pattern==='sine')y=H/2+Math.sin(i*1.12)*175;else y=rand(70,H-70);spawnEnemy(pick(pool),y,chance(.05+S.time/6000),false,eventTag);}}
function nearestTarget(){let best=S.boss||null,x=best?best.x:Infinity;for(const e of S.enemies)if(e.hp>0&&e.x<x){best=e;x=e.x}return best;}
function damageMultiplier(){return S.stats.damage*(S.surgeTimer>0?1.35:1)*(S.shieldTrial?1.4:1);}
function rateMultiplier(){return S.stats.rate*(S.surgeTimer>0?1.6:1);}
function updateWeapons(dt){for(const k of Object.keys(WEAPONS))S.cooldowns[k]=Math.max(0,(S.cooldowns[k]||0)-dt);const t=nearestTarget();if(!t)return;for(const[k,l]of Object.entries(S.weapons)){if(l<=0||S.cooldowns[k]>0)continue;const w=WEAPONS[k];S.cooldowns[k]=w.cool/(rateMultiplier()*Math.sqrt(l));let count=k==='scatter'?Math.min(9,2+l):k==='drone'?Math.min(5,l):1;if(k==='missile'&&S.specials.missileBarrage)count=2;for(let i=0;i<count;i++){const base=Math.atan2(t.y-S.ship.y,t.x-S.ship.x),a=base+(i-(count-1)/2)*(k==='scatter'?.105:.035),sp=w.speed+l*40,crit=chance(S.stats.crit);S.shots.push({kind:k,x:S.ship.x+25,y:S.ship.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,damage:(w.damage+l*1.35)*damageMultiplier()*(crit?2:1),life:3.2,color:w.color,pierce:S.stats.pierce+(k==='rail'?2:0),splash:S.stats.splash+((k==='flak'||k==='nova')?1+l*.2:0),homing:k==='missile',crit,trail:[]});}}}
function hurtShip(n){if(S.ship.inv>0||S.phase!=='running')return;if(S.specials.pointDefense&&++S.bulletsSeen%9===0)return;let d=n;if(S.shield>0){const a=Math.min(S.shield,d);S.shield-=a;d-=a;}if(d>0&&chance(S.stats.armor))d=Math.max(0,d-1);if(d>0){S.hull-=d;S.screenShake=Math.max(S.screenShake,6);S.flash=.12;popup(`-${d}`,S.ship.x,S.ship.y-24,'#ff8095');}S.ship.inv=.62;S.shieldDelay=4;if(S.hull<=0){if(S.specials.secondChance){S.specials.secondChance--;S.hull=Math.max(1,S.maxHull*.4);S.shield=S.maxShield;S.ship.inv=2;banner('SECOND CHANCE','#ffe56b','Back in the fight');}else endRun();}}
function addLaserCharge(amount=1){const mult=1+(S.specials.laserBattery||0),before=S.laserCharge;S.laserCharge=clamp(S.laserCharge+amount*mult,0,S.laserMax);if(before<S.laserMax&&S.laserCharge>=S.laserMax&&!S.laserHintShown){S.laserHintShown=true;banner('STAR LASER READY','#72f7ff','Tap the ship to erase normal enemies');burst(S.ship.x,S.ship.y,'#72f7ff',24,190,3);}}
function onChallengeKill(e){if(!S.challenge||!e.eventTag||e.eventTag!==S.challenge.tag)return;S.challenge.remaining--;if(S.challenge.remaining<=0){const c=S.challenge;S.challenge=null;if(c.kind==='swarm'){S.salvage+=20;S.laserCharge=clamp(S.laserCharge+6,0,S.laserMax);banner('SWARM CRUSHED','#ffe56b','+20 salvage • laser boosted');}else if(c.kind==='elites'){S.nextUpgradeRarity=Math.max(S.nextUpgradeRarity,2);S.salvage+=15;banner('HUNTERS DEFEATED','#ffe56b','Next upgrade Legendary or better');}}}
function killEnemy(e){const d=ENEMIES[e.type];S.salvage+=d.salvage;S.kills++;S.combo++;S.comboTimer=2;gainXP(d.xp);if(!e.byLaser)addLaserCharge(e.elite?2:1);onChallengeKill(e);burst(e.x,e.y,e.color,e.elite?30:16,e.elite?290:210,e.elite?4:3);S.screenShake=Math.max(S.screenShake,e.elite?3.5:1.4);if(S.specials.combatRepair&&S.kills%15===0){S.hull=Math.min(S.maxHull,S.hull+1);popup('+1 HULL',S.ship.x,S.ship.y-28,'#8fffb2',1.1);}if(e.type==='splitter'&&!e.byLaser){spawnEnemy('swarm',e.y-18,false,false,e.eventTag);spawnEnemy('swarm',e.y+18,false,false,e.eventTag);S.enemies.at(-1).x=e.x;S.enemies.at(-2).x=e.x;}}
function releaseStarLaser(){if(S.phase!=='running'||S.laserCharge<S.laserMax)return false;S.laserCharge=0;S.laserHintShown=false;S.laserBlast={radius:18,life:1,max:1};S.screenShake=16;S.flash=.38;S.bullets.length=0;let destroyed=0;for(const e of S.enemies){if(e.hp>0){e.byLaser=true;e.hp=0;destroyed++;}}banner('STAR LASER!','#ffffff',destroyed?`${destroyed} enemies erased`:'Blast wave released');burst(S.ship.x,S.ship.y,'#aafaff',70,440,5);return true;}

function updateAutopilot(dt){S.ship.ai-=dt;if(S.ship.ai<=0){S.ship.ai=Math.max(.035,.18*(1-S.stats.dodge));let bestY=H/2,bestRisk=Infinity;for(let y=52;y<H-42;y+=26){let risk=Math.abs(y-H/2)*.0012;for(const b of S.bullets){const dx=b.x-S.ship.x;if(dx>-25&&dx<420)risk+=Math.max(0,9-Math.abs(y-b.y)/10)*(1+S.stats.dodge*2.2);}for(const e of S.enemies){const dx=e.x-S.ship.x;if(dx>0&&dx<225)risk+=Math.max(0,8-Math.abs(y-e.y)/13);}if(risk<bestRisk){bestRisk=risk;bestY=y;}}S.ship.targetY=bestY;}const old=S.ship.y,maxMove=340*S.stats.speed*dt;S.ship.y+=clamp(S.ship.targetY-S.ship.y,-maxMove,maxMove);S.ship.y=clamp(S.ship.y,42,H-38);S.ship.tilt=(S.ship.y-old)*.12;S.ship.inv=Math.max(0,S.ship.inv-dt);}
function fireEnemy(e){const d=ENEMIES[e.type],a=Math.atan2(S.ship.y-e.y,S.ship.x-e.x),sp=(e.type==='sniper'?335:205+S.time*.09)*S.combatSpeed,spread=e.type==='bomber'?[-.18,0,.18]:e.type==='weaver'?[-.11,.11]:[0];for(const o of spread)S.bullets.push({x:e.x,y:e.y,vx:Math.cos(a+o)*sp,vy:Math.sin(a+o)*sp,damage:d.damage,life:5.5,hot:e.type==='sniper'});}
function updateEnemies(dt){for(const e of S.enemies){const d=ENEMIES[e.type];e.t+=dt;let mv=d.speed*S.combatSpeed*dt*(.82+S.threat*.09);if(e.intro)mv*=.94;if(e.type==='charger'&&e.x<700){if(!e.charge)e.charge=.75;e.charge-=dt;if(e.charge<0)mv*=3.4;}e.x-=mv;if(e.type==='dart')e.y=e.baseY+Math.sin(e.t*5.5)*90;if(e.type==='swarm')e.y=e.baseY+Math.sin(e.t*6.4+e.x*.02)*50;if(e.type==='bomber')e.y=e.baseY+Math.sin(e.t*1.8)*64;if(e.type==='weaver')e.y=e.baseY+Math.sin(e.t*3.4)*112;if(e.type==='healer'){const a=S.enemies.find(o=>o!==e&&o.hp>0&&o.hp<o.maxHp);if(a)a.hp=Math.min(a.maxHp,a.hp+3.5*dt);}e.fire-=dt;if(e.fire<=0&&e.x<W-45&&d.fire<90&&S.grace<=0){const relief=S.hull/S.maxHull<.35?1.45:S.hull/S.maxHull<.55?1.20:1;e.fire=d.fire*rand(.98,1.28)*relief/Math.sqrt(S.threat)*(S.surgeTimer>0?.74:1);fireEnemy(e);}if(Math.hypot(e.x-S.ship.x,e.y-S.ship.y)<e.size+13){e.hp=0;if(S.grace<=0)hurtShip(d.damage);}}}
function updateProjectiles(dt){for(const b of S.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-S.ship.x,b.y-S.ship.y)<14){b.life=0;hurtShip(b.damage);}}for(const sh of S.shots){sh.trail.push({x:sh.x,y:sh.y});if(sh.trail.length>6)sh.trail.shift();if(sh.homing){const t=nearestTarget();if(t){const desired=Math.atan2(t.y-sh.y,t.x-sh.x),sp=Math.hypot(sh.vx,sh.vy),cur=Math.atan2(sh.vy,sh.vx),diff=((desired-cur+Math.PI*3)%(Math.PI*2))-Math.PI,a=cur+clamp(diff,-4.4*dt,4.4*dt);sh.vx=Math.cos(a)*sp;sh.vy=Math.sin(a)*sp;}}sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;sh.life-=dt;for(const e of S.enemies){if(e.hp<=0||Math.hypot(sh.x-e.x,sh.y-e.y)>=e.size+5)continue;e.hp-=sh.damage;if(sh.splash){const r=45+sh.splash*17;for(const o of S.enemies)if(o!==e&&o.hp>0&&Math.hypot(o.x-e.x,o.y-e.y)<r)o.hp-=sh.damage*.32;}if(sh.kind==='arc'){const o=S.enemies.find(o=>o!==e&&o.hp>0&&Math.hypot(o.x-e.x,o.y-e.y)<120);if(o)o.hp-=sh.damage*.6;}if(sh.kind==='rail'&&S.specials.beamCannon)e.hp-=sh.damage*.35;if((sh.kind==='nova'||sh.kind==='flak')&&S.specials.chainBombs&&chance(.25))for(const o of S.enemies)if(o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<110)o.hp-=sh.damage*.25;if(sh.pierce>0)sh.pierce--;else sh.life=0;break;}if(S.boss&&Math.hypot(sh.x-S.boss.x,sh.y-S.boss.y)<S.boss.size){S.boss.hp-=sh.damage;if(sh.pierce<=0)sh.life=0;}}}

function spawnBoss(forced=false){if(S.boss)return false;const type=forced?{name:'Rift Tyrant',color:'#ff4fd8',accent:'#ffffff'}:BOSSES[S.bosses%BOSSES.length],hp=(forced?480:270)*(1+S.bosses*.48);S.boss={type,x:W+90,y:H/2,hp,maxHp:hp,size:forced?75:68,fire:(forced?.78:1.3),t:0,phase:1,forced};banner(forced?'RIFT TYRANT!':'DREADNOUGHT INCOMING',type.color,forced?'You asked for this.':'Boss contact');S.screenShake=6;return true;}
function updateBoss(dt){if(!S.boss)return;const b=S.boss;b.t+=dt;b.x+=(W-175-b.x)*dt*.42;b.y=H/2+Math.sin(b.t*(1.25+b.phase*.17))*145;b.phase=b.hp/b.maxHp<.33?3:b.hp/b.maxHp<.66?2:1;b.fire-=dt;if(b.fire<=0&&S.grace<=0){b.fire=Math.max(b.forced?.28:.42,(b.forced?.72:1.18)-b.phase*.13-S.bosses*.03);const base=Math.atan2(S.ship.y-b.y,S.ship.x-b.x),count=(b.forced?5:3)+b.phase*2;for(let i=0;i<count;i++){const off=(i-(count-1)/2)*(.085+b.phase*.018),sp=(230+b.phase*28+(b.forced?30:0))*S.combatSpeed;S.bullets.push({x:b.x,y:b.y,vx:Math.cos(base+off)*sp,vy:Math.sin(base+off)*sp,damage:b.phase===3?2:1,life:7,hot:b.forced});}}if(b.hp<=0){const name=b.type.name,forced=b.forced;burst(b.x,b.y,b.type.color,90,430,6);S.screenShake=14;S.boss=null;S.bosses++;S.salvage+=forced?35:22;S.hull=Math.min(S.maxHull,S.hull+Math.max(3,S.maxHull*.22));S.shield=S.maxShield;gainXP(forced?26:20);banner(`${name} DESTROYED`,'#ffe56b',forced?'Legendary reward unlocked':'Boss reward incoming');queueChoice(`boss-reward-${S.bosses}`,()=>{if(forced)S.nextUpgradeRarity=Math.max(S.nextUpgradeRarity,2);showBossReward();},4);}}

const LIVE_EVENTS=[
  {kind:'swarm',title:'VOLUNTARY SWARM',sub:'Tap anywhere in 5s to summon 28 enemies. Clear them for +20 salvage.',accept(){const tag=`swarm-${++S.eventSeq}`,count=28;S.challenge={kind:'swarm',tag,remaining:count};for(let i=0;i<count;i++){spawnEnemy(i%5===0?'gunner':'swarm',65+(i%14)*(H-130)/13,i%11===0,false,tag);const e=S.enemies.at(-1);e.x=W+40+(i%7)*45;}banner('SWARM ACCEPTED','#ffe56b','Clear all 28 for the reward');}},
  {kind:'boss',title:'RIFT BOSS CHALLENGE',sub:'Tap anywhere in 5s to summon a brutal boss immediately.',accept(){if(!spawnBoss(true)){S.salvage+=8;banner('RIFT COLLAPSED','#8ff7ff','Boss already present • +8 salvage');}}},
  {kind:'elites',title:'HUNTER PACK',sub:'Tap anywhere in 5s to call in 7 elite hunters. Win for a Legendary upgrade.',accept(){const tag=`elite-${++S.eventSeq}`,types=['gunner','sniper','charger','weaver','bomber','guardian','tank'];S.challenge={kind:'elites',tag,remaining:types.length};types.forEach((t,i)=>{spawnEnemy(t,80+i*(H-160)/(types.length-1),true,false,tag);S.enemies.at(-1).x=W+50+i*45;});banner('HUNTERS INBOUND','#ff9eea','Seven elites have locked on');}},
  {kind:'surge',title:'REACTOR SURGE',sub:'Tap anywhere in 5s for 20s of +60% fire rate — enemies fire faster too.',accept(){S.surgeTimer=20;banner('REACTOR SURGE','#72f7ff','20 seconds of chaos');}},
  {kind:'shield',title:'NO-SHIELD GAMBIT',sub:'Tap anywhere in 5s: lose shields for 18s, deal +40% damage, earn +2 max shield.',accept(){if(!S.shieldTrial){S.shieldTrial={time:18,saved:S.shield};S.shield=0;banner('SHIELDS OFFLINE','#ff9f75','Survive 18 seconds for +2 max shield');}}},
  {kind:'laser',title:'OVERLOAD THE LASER',sub:'Tap anywhere in 5s: instantly charge Star Laser, but summon an elite wave.',accept(){S.laserCharge=S.laserMax;S.laserHintShown=false;spawnWave(1.25,'overload');for(const e of S.enemies.slice(-8))e.elite=true;banner('LASER OVERLOADED','#ffffff','Star Laser ready • elites incoming');}}
];

function startLiveEvent(){if(S.liveEvent||S.phase!=='running')return;let pool=LIVE_EVENTS.filter(e=>!(e.kind==='boss'&&(S.boss||S.time<60))&&!(e.kind==='elites'&&S.time<45)&&!(e.kind==='shield'&&(S.shieldTrial||S.time<75)));if(!pool.length)return;const def=pick(pool);S.liveEvent={...def,time:5,max:5};S.nextLiveEventAt=S.time+rand(36,52);}
function acceptLiveEvent(){if(!S.liveEvent)return false;const e=S.liveEvent;S.liveEvent=null;e.accept();return true;}
function updateLiveEvents(dt){if(S.phase!=='running')return;if(!S.liveEvent&&S.time>=S.nextLiveEventAt&&!S.choiceQueue.length)startLiveEvent();if(S.liveEvent){S.liveEvent.time-=dt;if(S.liveEvent.time<=0)S.liveEvent=null;}if(S.surgeTimer>0){S.surgeTimer-=dt;if(S.surgeTimer<=0){S.stats.damage+=.08;banner('SURGE SURVIVED','#8fffb2','Permanent +8% weapon damage');}}if(S.shieldTrial){S.shieldTrial.time-=dt;if(S.shieldTrial.time<=0){S.shieldTrial=null;S.maxShield+=2;S.shield=S.maxShield;banner('GAMBIT SURVIVED','#8fffb2','+2 maximum shield');}}}

function pressureFactor(){const h=S.hull/S.maxHull;if(h<.25)return .58;if(h<.45)return .78;if(h>.86&&S.shield>S.maxShield*.5)return 1.12;return 1;}
function updateDirector(dt){if(S.grace>0){S.grace-=dt;return;}const p=pressureFactor();S.director.spawn-=dt;S.director.wave-=dt;S.director.event-=dt;S.director.boss-=dt;S.director.breather-=dt;if(S.director.spawn<=0){const pool=S.time<40?['scout','dart','swarm']:S.time<100?['scout','dart','swarm','gunner','weaver','sniper']:['scout','dart','swarm','gunner','weaver','sniper','charger','bomber'];spawnEnemy(pick(pool));S.director.spawn=rand(1.0,1.55)/(S.threat*p);}if(S.director.wave<=0){spawnWave(1.15);S.director.wave=rand(5.7,8.0)/Math.sqrt(S.threat*p);}if(S.director.boss<=0&&!S.boss){spawnBoss(false);S.director.boss=rand(145,175);}if(S.director.breather<=0){S.grace=Math.max(S.grace,3.2);S.director.breather=rand(58,72);banner('BREATHER','#8ff7ff','Three seconds of clear air');}}
function milestones(){if(S.time>=S.nextMilestone){const m=Math.floor(S.nextMilestone/60);banner(`${m} MINUTE${m===1?'':'S'} SURVIVED`,'#ffe56b',m%2===0?'Rarity luck improved':'Still flying');if(m%2===0)S.stats.luck=Math.min(.75,S.stats.luck+.02);S.nextMilestone+=60;}}

function update(dt){S.time+=dt;S.worldSpeed=2+Math.min(.55,S.time/700);S.combatSpeed=1.18+Math.min(.28,S.time/900);S.threat=.58+Math.min(3.0,S.time/155);if(!S.shieldTrial)S.hull=Math.min(S.maxHull,S.hull+S.stats.repair*dt);if(S.shieldDelay>0)S.shieldDelay-=dt;else if(!S.shieldTrial)S.shield=Math.min(S.maxShield,S.shield+S.shieldRegen*dt);if(S.comboTimer>0){S.comboTimer-=dt;if(S.comboTimer<=0)S.combo=0;}S.screenShake=Math.max(0,S.screenShake-dt*19);S.flash=Math.max(0,S.flash-dt);updateAutopilot(dt);updateWeapons(dt);updateDirector(dt);updateEnemies(dt);updateProjectiles(dt);updateBoss(dt);updateLiveEvents(dt);milestones();checkNormalUpgrade();if(S.laserBlast){S.laserBlast.radius+=900*dt;S.laserBlast.life-=dt;if(S.laserBlast.life<=0)S.laserBlast=null;}for(const e of S.enemies)if(e.hp<=0&&!e.dead){e.dead=true;killEnemy(e);}S.enemies=S.enemies.filter(e=>!e.dead&&e.x>-90);S.bullets=S.bullets.filter(b=>b.life>0&&b.x>-90&&b.x<W+90&&b.y>-80&&b.y<H+80);S.shots=S.shots.filter(s=>s.life>0&&s.x<W+110&&s.y>-90&&s.y<H+90);for(const p of S.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;p.vy*=.98;p.life-=dt;}S.particles=S.particles.filter(p=>p.life>0);for(const p of S.popups){p.y-=26*dt;p.life-=dt;}S.popups=S.popups.filter(p=>p.life>0);for(const b of S.banners)b.life-=dt;S.banners=S.banners.filter(b=>b.life>0);updateUI();processChoiceQueue();}

function poly(points){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fill();}
function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);const pulse=.7+.3*Math.sin(e.t*5);ctx.shadowColor=e.color;ctx.shadowBlur=e.elite?20:8;ctx.fillStyle=e.color;ctx.strokeStyle=e.color;ctx.lineWidth=2;if(e.type==='scout'){poly([[-17,0],[-8,-10],[7,-7],[18,0],[7,7],[-8,10]]);ctx.fillStyle='#dffff0';ctx.fillRect(1,-3,8,6);ctx.fillStyle='#ffcb6d';ctx.fillRect(-20,-3,6,6);}else if(e.type==='dart'){poly([[20,0],[-15,-7],[-7,0],[-15,7]]);ctx.fillStyle='#fff';ctx.fillRect(2,-2,8,4);ctx.fillStyle='#ffdd77';ctx.fillRect(-18,-2,6,4);}else if(e.type==='gunner'){poly([[-20,0],[-10,-13],[8,-9],[19,0],[8,9],[-10,13]]);ctx.fillStyle='#dfffff';ctx.fillRect(-1,-4,11,8);ctx.fillStyle=e.color;ctx.fillRect(3,-18,14,4);ctx.fillRect(3,14,14,4);}else if(e.type==='tank'){ctx.fillRect(-28,-13,48,26);ctx.fillRect(-14,-22,20,44);ctx.fillStyle='#fff0c0';ctx.fillRect(4,-6,16,12);ctx.fillStyle='#5a341d';ctx.fillRect(-31,-9,5,18);ctx.fillRect(-18,-27,8,8);ctx.fillRect(-18,19,8,8);}else if(e.type==='sniper'){poly([[-18,0],[-6,-12],[12,-7],[20,0],[12,7],[-6,12]]);ctx.fillRect(8,-2,30,4);ctx.fillStyle='#fff';ctx.globalAlpha=.45+.5*pulse;ctx.fillRect(27,-1,12,2);ctx.globalAlpha=1;}else if(e.type==='swarm'){poly([[13,0],[-8,-8],[-3,0],[-8,8]]);ctx.fillStyle='#fffbd0';ctx.fillRect(2,-2,5,4);}else if(e.type==='bomber'){poly([[-24,0],[-11,-17],[11,-12],[25,0],[11,12],[-11,17]]);ctx.fillStyle='#522319';ctx.beginPath();ctx.arc(-4,-17,7,0,7);ctx.fill();ctx.beginPath();ctx.arc(-4,17,7,0,7);ctx.fill();ctx.fillStyle='#ffe0a6';ctx.fillRect(4,-5,12,10);}else if(e.type==='guardian'){ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(0,0,26+Math.sin(e.t*3)*2,0,7);ctx.stroke();ctx.globalAlpha=1;ctx.save();ctx.rotate(e.t);ctx.fillRect(-22,-3,44,6);ctx.rotate(Math.PI/2);ctx.fillRect(-22,-3,44,6);ctx.restore();ctx.fillStyle='#e7fbff';ctx.beginPath();ctx.arc(0,0,9,0,7);ctx.fill();}else if(e.type==='splitter'){ctx.save();ctx.rotate(e.t*.4);poly([[0,-23],[10,-8],[22,0],[10,8],[0,23],[-10,8],[-22,0],[-10,-8]]);ctx.fillStyle='#fff';ctx.globalAlpha=.45;poly([[0,-15],[6,0],[0,15],[-6,0]]);ctx.globalAlpha=1;ctx.restore();}else if(e.type==='charger'){poly([[26,0],[4,-8],[-11,-18],[-7,-5],[-23,0],[-7,5],[-11,18],[4,8]]);ctx.fillStyle='#fff';ctx.fillRect(7,-3,9,6);ctx.fillStyle='#ffdb69';ctx.fillRect(-26,-3,7,6);}else if(e.type==='healer'){ctx.save();ctx.rotate(-e.t*.7);ctx.fillRect(-5,-24,10,48);ctx.fillRect(-24,-5,48,10);ctx.restore();ctx.fillStyle='#eafff3';ctx.beginPath();ctx.arc(0,0,9,0,7);ctx.fill();ctx.strokeStyle='#82ffbc88';ctx.beginPath();ctx.arc(0,0,29+Math.sin(e.t*4)*3,0,7);ctx.stroke();}else if(e.type==='weaver'){const flap=7*Math.sin(e.t*5);poly([[-17,0],[-4,-8],[13,-5],[20,0],[13,5],[-4,8]]);ctx.beginPath();ctx.moveTo(-5,-5);ctx.lineTo(-25,-18-flap);ctx.lineTo(-12,-3);ctx.stroke();ctx.beginPath();ctx.moveTo(-5,5);ctx.lineTo(-25,18+flap);ctx.lineTo(-12,3);ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(5,-3,7,6);}ctx.shadowBlur=0;if(e.elite){ctx.strokeStyle='#ffe56b';ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(0,0,e.size+8+Math.sin(e.t*4)*2,0,7);ctx.stroke();ctx.globalAlpha=1;}ctx.restore();}

function draw(){const biome=BIOMES[Math.floor(S.time/60)%BIOMES.length];ctx.save();if(S.screenShake)ctx.translate(rand(-S.screenShake,S.screenShake),rand(-S.screenShake,S.screenShake));const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,biome.top);g.addColorStop(1,biome.bottom);ctx.fillStyle=g;ctx.fillRect(-20,-20,W+40,H+40);ctx.fillStyle=biome.fog;for(let i=0;i<7;i++){const x=(W+280)-(S.time*(28+i*7)*S.worldSpeed+i*170)%(W+560)-220,y=60+i*72;ctx.beginPath();ctx.arc(x,y,105+i*14,0,7);ctx.fill();}for(const st of stars){st.x-=st.z*5.4*S.worldSpeed;if(st.x<0)st.x=W;ctx.fillStyle=`rgba(255,255,255,${.18+st.z*.7})`;ctx.fillRect(st.x,st.y,st.s,st.s);}for(let i=0;i<12;i++){const x=W-((S.time*135*S.worldSpeed+i*125)%(W+260));ctx.fillStyle=`rgba(255,255,255,${.03+i*.004})`;ctx.fillRect(x,40+(i*47)%465,100+i*5,1);}ctx.fillStyle='#02061166';ctx.fillRect(0,0,W,31);ctx.fillStyle=biome.accent;ctx.font='bold 12px monospace';ctx.fillText(`${biome.name} • SPEED ${S.worldSpeed.toFixed(1)}× • THREAT ${S.threat.toFixed(1)}×${S.grace>0?` • SAFE ${Math.ceil(S.grace)}s`:''}`,15,20);ctx.save();ctx.translate(S.ship.x,S.ship.y);ctx.rotate(S.ship.tilt*.02);ctx.shadowColor='#76e8f1';ctx.shadowBlur=16;ctx.fillStyle=S.ship.inv>0?'#fff':'#75e8f2';poly([[32,0],[-11,-10],[-24,-25],[-15,-5],[-28,0],[-15,5],[-24,25],[-11,10]]);ctx.shadowBlur=0;ctx.fillStyle='#c8ffff';ctx.fillRect(7,-4,12,8);ctx.fillStyle='#ffd76e';const exhaust=18+S.worldSpeed*7+rand(0,9);ctx.fillRect(-31-exhaust+12,-4,exhaust,8);if(S.maxShield>0&&S.shield>0){ctx.strokeStyle=`rgba(125,225,255,${.2+.4*S.shield/S.maxShield})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,33,0,7);ctx.stroke();}if(S.weapons.drone>0){const count=Math.min(3,S.weapons.drone);for(let i=0;i<count;i++){const a=S.time*2.6+i*Math.PI*2/count;ctx.fillStyle='#7fffc5';ctx.fillRect(Math.cos(a)*43-3,Math.sin(a)*26-3,6,6);}}if(S.laserCharge>=S.laserMax){ctx.strokeStyle='#e8ffff';ctx.shadowColor='#7ffaff';ctx.shadowBlur=22;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,39+Math.sin(S.time*8)*4,0,7);ctx.stroke();ctx.shadowBlur=0;}ctx.restore();for(const e of S.enemies)drawEnemy(e);for(const sh of S.shots){ctx.globalAlpha=.28;for(const t of sh.trail){ctx.fillStyle=sh.color;ctx.fillRect(t.x-4,t.y-1,8,2);}ctx.globalAlpha=1;ctx.shadowColor=sh.color;ctx.shadowBlur=9;ctx.fillStyle=sh.color;if(sh.kind==='missile'||sh.kind==='nova'){ctx.beginPath();ctx.arc(sh.x,sh.y,sh.kind==='nova'?6:4,0,7);ctx.fill();}else ctx.fillRect(sh.x-6,sh.y-2,12,4);ctx.shadowBlur=0;}for(const b of S.bullets){ctx.shadowColor=b.hot?'#fff':'#ff7890';ctx.shadowBlur=b.hot?12:6;ctx.fillStyle=b.hot?'#fff1b0':'#ff7890';ctx.beginPath();ctx.arc(b.x,b.y,b.hot?5:4,0,7);ctx.fill();ctx.shadowBlur=0;}for(const p of S.particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;for(const p of S.popups){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(p.text,p.x,p.y);}ctx.globalAlpha=1;ctx.textAlign='left';if(S.combo>=8){ctx.fillStyle='#ffe56b';ctx.font='bold 14px monospace';ctx.fillText(`${S.combo} KILL CHAIN`,15,H-18);}if(S.boss){const b=S.boss;ctx.save();ctx.translate(b.x,b.y);ctx.shadowColor=b.type.color;ctx.shadowBlur=28;ctx.fillStyle=b.type.color;poly([[-78,0],[-42,-50],[30,-38],[72,0],[30,38],[-42,50]]);ctx.fillStyle=b.type.accent;ctx.beginPath();ctx.arc(8,0,14+b.phase*3,0,7);ctx.fill();ctx.strokeStyle=b.type.accent;ctx.lineWidth=3;ctx.beginPath();ctx.arc(8,0,35+Math.sin(b.t*4)*4,0,7);ctx.stroke();ctx.shadowBlur=0;ctx.restore();ctx.fillStyle='#070b14dd';ctx.fillRect(W-320,43,280,14);ctx.fillStyle=b.type.color;ctx.fillRect(W-317,46,274*clamp(b.hp/b.maxHp,0,1),8);ctx.fillStyle='#fff';ctx.font='bold 10px monospace';ctx.textAlign='right';ctx.fillText(`${b.type.name} • PHASE ${b.phase}`,W-42,39);ctx.textAlign='left';}const laserPct=clamp(S.laserCharge/S.laserMax,0,1);ctx.fillStyle='#07101ddd';ctx.fillRect(15,42,210,18);ctx.fillStyle=laserPct>=1?'#ffffff':'#58ddeb';ctx.fillRect(18,45,204*laserPct,12);ctx.strokeStyle='#7cf6ff';ctx.strokeRect(15,42,210,18);ctx.fillStyle=laserPct>=1?'#07101d':'#d7fbff';ctx.font='bold 10px monospace';ctx.fillText(laserPct>=1?'STAR LASER READY — TAP SHIP':`STAR LASER ${Math.floor(laserPct*100)}%`,25,55);if(S.liveEvent){const e=S.liveEvent,p=S.liveEvent.time/S.liveEvent.max;ctx.fillStyle='#060b17ee';ctx.fillRect(W/2-270,72,540,80);ctx.strokeStyle='#ffdd6d';ctx.lineWidth=2;ctx.strokeRect(W/2-270,72,540,80);ctx.fillStyle='#ffe56b';ctx.font='bold 17px monospace';ctx.textAlign='center';ctx.fillText(e.title,W/2,98);ctx.fillStyle='#fff';ctx.font='11px monospace';ctx.fillText(e.sub,W/2,119);ctx.fillStyle='#ff7d91';ctx.fillText(`TAP SCREEN TO ACCEPT • ${Math.ceil(e.time)}`,W/2,140);ctx.fillStyle='#ffe56b';ctx.fillRect(W/2-250,145,500*p,3);ctx.textAlign='left';}if(S.challenge){ctx.fillStyle='#ffe56b';ctx.font='bold 11px monospace';ctx.fillText(`${S.challenge.kind==='swarm'?'SWARM':'HUNTERS'}: ${S.challenge.remaining} REMAINING`,W-205,H-18);}if(S.surgeTimer>0){ctx.fillStyle='#72f7ff';ctx.font='bold 11px monospace';ctx.fillText(`REACTOR SURGE ${Math.ceil(S.surgeTimer)}s`,15,H-38);}if(S.shieldTrial){ctx.fillStyle='#ff9f75';ctx.font='bold 11px monospace';ctx.fillText(`NO-SHIELD GAMBIT ${Math.ceil(S.shieldTrial.time)}s`,15,H-56);}if(S.laserBlast){ctx.globalAlpha=Math.max(0,S.laserBlast.life/S.laserBlast.max);ctx.strokeStyle='#dfffff';ctx.shadowColor='#7ffaff';ctx.shadowBlur=28;ctx.lineWidth=10;ctx.beginPath();ctx.arc(S.ship.x,S.ship.y,S.laserBlast.radius,0,7);ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=1;}const active=S.banners[0];if(active){const a=1-Math.abs(active.life/active.max-.5)*1.4;ctx.globalAlpha=clamp(a,0,1);ctx.textAlign='center';ctx.fillStyle='#020611bb';ctx.fillRect(W/2-235,H*.18-34,470,76);ctx.fillStyle=active.color;ctx.font='bold 24px monospace';ctx.fillText(active.text,W/2,H*.18);ctx.fillStyle='#fff';ctx.font='11px monospace';ctx.fillText(active.sub,W/2,H*.18+22);ctx.textAlign='left';ctx.globalAlpha=1;}if(S.flash){ctx.fillStyle=`rgba(255,255,255,${S.flash*1.3})`;ctx.fillRect(0,0,W,H);}ctx.restore();}

function handleCanvasPointer(ev){if(S.phase!=='running')return;const r=canvas.getBoundingClientRect?canvas.getBoundingClientRect():{left:0,top:0,width:W,height:H};const x=(('clientX'in ev?ev.clientX:0)-r.left)*W/r.width,y=(('clientY'in ev?ev.clientY:0)-r.top)*H/r.height;if(Math.hypot(x-S.ship.x,y-S.ship.y)<80){if(S.laserCharge>=S.laserMax)releaseStarLaser();return;}if(S.liveEvent)acceptLiveEvent();}
canvas.addEventListener('pointerdown',handleCanvasPointer);

function endRun(){S.phase='dead';cancelAnimationFrame(raf);S.best=Math.max(S.best,S.time);localStorage.setItem('starwardBest',S.best);eyebrow.textContent='RUN COMPLETE';overlayTitle.textContent=`Survived ${formatTime(S.time)}`;overlayText.textContent=`Build level ${S.level} • ${S.kills} enemies destroyed • ${S.bosses} bosses defeated • Best ${formatTime(S.best)}`;choiceGrid.classList.add('hidden');startBtn.textContent='Build Another Ship';startBtn.classList.remove('hidden');overlay.classList.remove('hidden');}
function loop(now){if(S.phase==='dead'||S.phase==='menu')return;const dt=Math.min(.033,(now-last)/1000||.016);last=now;if(S.phase==='running')update(dt);draw();raf=requestAnimationFrame(loop);}

startBtn.addEventListener('click',startRun);
S=freshState();updateUI();draw();
})();

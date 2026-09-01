(() => {
'use strict';

const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d');
const overlay=$('overlay'),overlayTitle=$('overlayTitle'),overlayText=$('overlayText'),eyebrow=$('eyebrow'),choiceGrid=$('choiceGrid'),startBtn=$('startBtn');
const ui={time:$('time'),hull:$('hull'),shield:$('shield'),level:$('level'),salvage:$('salvage'),damage:$('statDamage'),rate:$('statRate'),dodge:$('statDodge'),thrust:$('statThrust'),repair:$('statRepair'),luck:$('statLuck'),xp:$('xpText'),xpBar:$('xpBar'),chips:$('buildChips')};
const W=canvas.width,H=canvas.height;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0],chance=p=>Math.random()<p;
ctx.imageSmoothingEnabled=false;

const NORMAL_CHOICE_GAP=72;
const QUEUED_CHOICE_GAP=16;
const LASER_MAX=16;

const RARITIES=[
  {name:'Rare',cls:'rare',weight:58,power:1},
  {name:'Epic',cls:'epic',weight:25,power:1.45},
  {name:'Legendary',cls:'legendary',weight:10,power:2},
  {name:'Mythic',cls:'mythic',weight:5,power:3},
  {name:'God',cls:'god',weight:2,power:4.5}
];
const BIOMES=[
  {name:'Cloudreach',top:'#06162f',bottom:'#3c7897',accent:'#c9ffb2',fog:'#8aeaff12'},
  {name:'Ember Belt',top:'#1a0d23',bottom:'#8f352f',accent:'#ffd06d',fog:'#ff9b6717'},
  {name:'Silent Ruins',top:'#050b21',bottom:'#20334f',accent:'#77f4e5',fog:'#77f4e510'},
  {name:'Stormglass',top:'#050a15',bottom:'#1b354d',accent:'#e1f3ff',fog:'#c8e8ff13'},
  {name:'Violet Deep',top:'#120723',bottom:'#553269',accent:'#ffc2f0',fog:'#db94ff15'}
];
const WEAPONS={
  pulse:{name:'Pulse Cannon',icon:'•',color:'#fff0a5',cool:.29,damage:5.5,speed:930},
  scatter:{name:'Spread Shot',icon:'✣',color:'#ffafe0',cool:.65,damage:3.2,speed:800},
  missile:{name:'Homing Missiles',icon:'◇',color:'#baff91',cool:.90,damage:8.7,speed:650},
  rail:{name:'Railgun',icon:'━',color:'#ffffff',cool:1.05,damage:13,speed:1500},
  flak:{name:'Flak Cannon',icon:'✹',color:'#ff977d',cool:.78,damage:7.7,speed:740},
  arc:{name:'Chain Lightning',icon:'ϟ',color:'#9fc8ff',cool:.92,damage:6.6,speed:1000},
  drone:{name:'Attack Drones',icon:'⊙',color:'#7fffc5',cool:.55,damage:4.3,speed:980},
  laser:{name:'Rapid Laser',icon:'▸',color:'#ff89ed',cool:.15,damage:2.6,speed:1800},
  nova:{name:'Heavy Bombs',icon:'✦',color:'#ffd27a',cool:1.22,damage:14.6,speed:610}
};
const ENEMIES={
  scout:{hp:8,speed:160,fire:2.9,damage:1,xp:1,salvage:1,size:16,color:'#a9ef8c'},
  dart:{hp:6,speed:245,fire:99,damage:1,xp:1,salvage:1,size:13,color:'#ff7791'},
  gunner:{hp:18,speed:124,fire:2.0,damage:1,xp:2,salvage:2,size:21,color:'#7fe6dd'},
  tank:{hp:48,speed:84,fire:2.4,damage:2,xp:4,salvage:4,size:29,color:'#f0b766'},
  sniper:{hp:16,speed:94,fire:4.0,damage:2,xp:3,salvage:3,size:19,color:'#ff9271'},
  swarm:{hp:4,speed:285,fire:99,damage:1,xp:1,salvage:1,size:10,color:'#eaff91'},
  bomber:{hp:31,speed:100,fire:3.3,damage:2,xp:3,salvage:4,size:24,color:'#ff9f65'},
  guardian:{hp:36,speed:92,fire:2.8,damage:1,xp:4,salvage:4,size:25,color:'#6ecbff'},
  splitter:{hp:20,speed:135,fire:3.1,damage:1,xp:3,salvage:3,size:20,color:'#ee92d5'},
  charger:{hp:23,speed:124,fire:99,damage:2,xp:3,salvage:3,size:20,color:'#ff587d'},
  healer:{hp:26,speed:90,fire:99,damage:1,xp:4,salvage:5,size:22,color:'#77ffb7'},
  weaver:{hp:19,speed:130,fire:2.5,damage:1,xp:3,salvage:3,size:19,color:'#c39cff'}
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
  {id:'shield',name:'Larger Shield',group:'survival',base:2,desc:'Increase the rechargeable shield around the ship.',effect:v=>`+${v} maximum shield and fully recharge it`,apply:v=>{S.maxShield+=v;S.shield=S.maxShield;S.shieldRegen+=.012*v;}},
  {id:'repair',name:'Faster Repairs',group:'survival',base:.018,desc:'Repair hull damage automatically during the run.',effect:v=>`Repair 1 hull every ${Math.max(5,Math.round(1/v))} seconds`,apply:v=>S.stats.repair+=v},
  {id:'dodge',name:'Better Dodging',group:'survival',base:.07,desc:'The autopilot reacts earlier to incoming danger.',effect:v=>`Autopilot reacts ${Math.round(v*100)}% earlier`,apply:v=>S.stats.dodge=Math.min(.82,S.stats.dodge+v)},
  {id:'speed',name:'Faster Engines',group:'survival',base:.15,desc:'Reach safer positions more quickly.',effect:v=>`+${Math.round(v*100)}% movement speed`,apply:v=>S.stats.speed+=v},
  {id:'armor',name:'Stronger Armor',group:'survival',base:.08,desc:'Incoming hits sometimes deal less hull damage.',effect:v=>`+${Math.round(v*100)}% chance to reduce damage`,apply:v=>S.stats.armor=Math.min(.75,S.stats.armor+v)},
  {id:'damage',name:'Weapon Damage',group:'offense',base:.18,desc:'Every installed weapon hits harder.',effect:v=>`+${Math.round(v*100)}% weapon damage`,apply:v=>S.stats.damage+=v},
  {id:'rate',name:'Fire Rate',group:'offense',base:.15,desc:'Every installed weapon fires more often.',effect:v=>`+${Math.round(v*100)}% fire rate`,apply:v=>S.stats.rate+=v},
  {id:'crit',name:'Critical Chance',group:'offense',base:.06,desc:'Some attacks deal double damage.',effect:v=>`+${Math.round(v*100)}% critical chance`,apply:v=>S.stats.crit=Math.min(.70,S.stats.crit+v)},
  {id:'pierce',name:'Piercing Shots',group:'offense',base:1,desc:'Shots continue through additional enemies.',effect:v=>`Shots pass through ${v} extra ${v===1?'enemy':'enemies'}`,apply:v=>S.stats.pierce+=v},
  {id:'splash',name:'Blast Radius',group:'offense',base:1,desc:'Explosive weapons damage a wider area.',effect:v=>`+${v} blast radius level${v===1?'':'s'}`,apply:v=>S.stats.splash+=v},
  {id:'luck',name:'Rarity Luck',group:'utility',base:.05,desc:'Future choices are more likely to have better rarity.',effect:v=>`+${Math.round(v*100)}% high-rarity odds`,apply:v=>S.stats.luck=Math.min(.75,S.stats.luck+v)}
];
const SPECIALS=[
  {id:'secondChance',name:'Second Chance',rarity:2,desc:'Survive one fatal hit instead of ending the run.',effect:'Once per run: revive at 40% hull',apply(){S.specials.secondChance=(S.specials.secondChance||0)+1;}},
  {id:'glassCannon',name:'Glass Cannon',rarity:2,desc:'Trade durability for a major damage boost.',effect:'+60% damage, -3 maximum hull',apply(){S.stats.damage+=.6;S.maxHull=Math.max(6,S.maxHull-3);S.hull=Math.min(S.hull,S.maxHull);}},
  {id:'combatRepair',name:'Combat Repair',rarity:2,desc:'Destroying enemies repairs the ship.',effect:'Every 15 kills: repair 1 hull',apply(){S.specials.combatRepair=(S.specials.combatRepair||0)+1;}},
  {id:'pointDefense',name:'Point Defense',rarity:3,desc:'A defense gun automatically destroys some enemy shots.',effect:'Destroy every 9th enemy projectile',apply(){S.specials.pointDefense=(S.specials.pointDefense||0)+1;}},
  {id:'smartAI',name:'Smart Autopilot',rarity:3,desc:'React sooner and move between safe lanes faster.',effect:'+15% dodge reaction, +20% movement speed',apply(){S.stats.dodge=Math.min(.82,S.stats.dodge+.15);S.stats.speed+=.2;}},
  {id:'arsenal',name:'Weapon Mastery',rarity:3,desc:'Improve every weapon already installed.',effect:'+1 level to every installed weapon',apply(){for(const k of Object.keys(S.weapons))if(S.weapons[k])S.weapons[k]=Math.min(15,S.weapons[k]+1);}},
  {id:'laserBattery',name:'Faster Star Laser',rarity:3,desc:'The screen-clearing laser needs fewer kills to recharge.',effect:'Star Laser charges 25% faster',apply(){S.specials.laserBattery=(S.specials.laserBattery||0)+.25;}},
  {id:'balanced',name:'Perfect Tune-Up',rarity:4,desc:'A major all-round improvement with no downside.',effect:'+30% damage, +25% fire rate, +3 hull, +2 shield',apply(){S.stats.damage+=.3;S.stats.rate+=.25;S.maxHull+=3;S.hull+=3;S.maxShield+=2;S.shield=S.maxShield;}}
];
const SYNERGIES=[
  {id:'aegis',name:'Self-Recharging Defense',test:s=>s.maxShield>=8&&s.stats.repair>=.05,desc:'Strong shields and repairs now reinforce each other.',apply:s=>{s.shieldRegen+=.035;s.stats.repair+=.012;}},
  {id:'agile',name:'Agile Autopilot',test:s=>s.stats.dodge>=.34&&s.stats.speed>=1.5,desc:'Fast engines and good dodging make movement much safer.',apply:s=>{s.stats.dodge=Math.min(.82,s.stats.dodge+.07);s.stats.speed+=.1;}},
  {id:'fullAuto',name:'Full Auto',test:s=>s.stats.damage>=1.7&&s.stats.rate>=1.45,desc:'High damage and fire rate reinforce each other.',apply:s=>{s.stats.damage+=.12;s.stats.rate+=.12;}},
  {id:'missiles',name:'Missile Barrage',test:s=>s.weapons.missile>=4&&s.weapons.scatter>=3,desc:'Homing missiles launch in pairs.',apply:s=>s.specials.missileBarrage=1},
  {id:'beam',name:'Beam Cannon',test:s=>s.weapons.laser>=4&&s.weapons.rail>=3,desc:'Railgun shots gain extra beam damage.',apply:s=>s.specials.beamCannon=1},
  {id:'chain',name:'Chain Detonations',test:s=>s.weapons.nova>=4&&s.weapons.flak>=3,desc:'Heavy explosions can trigger secondary blasts.',apply:s=>s.specials.chainBombs=1}
];

const stars=Array.from({length:220},()=>({x:rand(0,W),y:rand(0,H),z:rand(.1,1),s:chance(.16)?2:1}));
let S,raf=0,last=0;

function freshState(){return{
  phase:'menu',time:0,level:1,xp:0,xpNeed:58,upgradeReady:false,upgradeQueued:false,lastDecisionAt:0,nextUpgradeRarity:0,
  salvage:0,hull:18,maxHull:18,shield:5,maxShield:5,shieldRegen:.085,shieldDelay:0,threat:.52,grace:5,kills:0,bosses:0,openingPick:0,
  worldSpeed:1.85,combatSpeed:1.15,stats:{damage:1,rate:1,dodge:.18,speed:1.22,repair:.014,luck:0,armor:.06,crit:.03,pierce:0,splash:0},
  weapons:{pulse:1,scatter:0,missile:0,rail:0,flak:0,arc:0,drone:0,laser:0,nova:0},cooldowns:{},upgrades:{},specials:{},synergies:{},
  choiceQueue:[],queuedKeys:{},ship:{x:165,y:H/2,targetY:H/2,ai:0,inv:0,tilt:0},enemies:[],bullets:[],shots:[],particles:[],popups:[],banners:[],boss:null,
  laserCharge:0,laserMax:LASER_MAX,laserBlast:null,laserHintShown:false,
  director:{spawn:3.2,wave:13,event:145,boss:190,breather:56},combo:0,comboTimer:0,screenShake:0,flash:0,bulletsSeen:0,nextMilestone:60,
  best:Number(localStorage.getItem('starwardBest')||0)
};}
const formatTime=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const formatRepair=v=>v<=0?'OFF':`1 / ${Math.max(1,Math.round(1/v))}s`;
function popup(text,x,y,color='#fff',life=.85){S.popups.push({text,x,y,color,life,max:life});}
function banner(text,color='#fff',sub=''){S.banners.push({text,color,sub,life:2.6,max:2.6});}
function burst(x,y,color,n=12,speed=180,size=3){for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),v=rand(speed*.25,speed);S.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.25,.7),max:.7,color,size:chance(.25)?size*2:size});}}

function rollRarity(min=0){const ws=RARITIES.map((r,i)=>i<min?0:r.weight*(i?1+S.stats.luck*i*1.25:1));let t=ws.reduce((a,b)=>a+b,0),x=Math.random()*t;for(let i=0;i<RARITIES.length;i++){x-=ws[i];if(x<=0)return RARITIES[i]}return RARITIES[min]}
function weaponCard(min=0){const key=pick(Object.keys(WEAPONS)),w=WEAPONS[key],r=rollRarity(min),cur=S.weapons[key],gain=Math.max(1,Math.round(r.power*.7)),next=Math.min(15,cur+gain);return{rarity:r,title:cur?`Upgrade ${w.name}`:`Unlock ${w.name}`,desc:cur?`${w.name} is currently level ${cur}.`:`Adds ${w.name} to the ship's automatic weapons.`,effect:cur?`Level ${cur} → ${next}`:`Install at level ${gain}`,apply(){S.weapons[key]=next;}}}
function statCard(group=null,min=0){const pool=group?STAT_UPGRADES.filter(x=>x.group===group):STAT_UPGRADES,item=pick(pool),r=rollRarity(min);let v=item.base*r.power*rand(.92,1.08);if(['hull','shield','pierce','splash'].includes(item.id))v=Math.max(1,Math.round(v));return{rarity:r,title:item.name,desc:item.desc,effect:item.effect(v),apply(){item.apply(v);}}}
function specialCard(min=2){const pool=SPECIALS.filter(x=>x.rarity>=min&&!S.upgrades[`special:${x.id}`]);if(!pool.length)return statCard(null,min);const item=pick(pool),r=RARITIES[Math.max(min,item.rarity)];return{rarity:r,title:item.name,desc:item.desc,effect:item.effect,apply(){item.apply();S.upgrades[`special:${item.id}`]=1;}}}
function draft(spec=['random','random','random'],min=0){return spec.map(k=>k==='weapon'?weaponCard(min):['survival','offense','utility'].includes(k)?statCard(k,min):k==='special'?specialCard(Math.max(2,min)):chance(.32)?weaponCard(min):chance(.09+S.stats.luck*.12)?specialCard(Math.max(2,min)):statCard(null,min));}

function updateUI(){
  ui.time.textContent=formatTime(S.time);ui.hull.textContent=`${Math.max(0,Math.ceil(S.hull))}/${S.maxHull}`;ui.shield.textContent=`${Math.max(0,Math.floor(S.shield))}/${S.maxShield}`;ui.level.textContent=S.level;ui.salvage.textContent=Math.floor(S.salvage);
  ui.damage.textContent=`${Math.round(S.stats.damage*100)}%`;ui.rate.textContent=`${Math.round(S.stats.rate*100)}%`;ui.dodge.textContent=`${Math.round(S.stats.dodge*100)}%`;ui.thrust.textContent=`${Math.round(S.stats.speed*100)}%`;ui.repair.textContent=formatRepair(S.stats.repair);ui.luck.textContent=`${Math.round(S.stats.luck*100)}%`;
  if(S.upgradeReady){const wait=Math.max(0,NORMAL_CHOICE_GAP-(S.time-S.lastDecisionAt));ui.xp.textContent=wait>0?`NEXT CHOICE IN ${Math.ceil(wait)}s`:'UPGRADE READY';}else ui.xp.textContent=`${Math.floor(S.xp)} / ${S.xpNeed}`;
  ui.xpBar.style.width=`${clamp(S.xp/S.xpNeed*100,0,100)}%`;
  const chips=[];for(const[k,l]of Object.entries(S.weapons))if(l)chips.push(`<span class="weapon-chip">${WEAPONS[k].icon} ${WEAPONS[k].name} Lv.${l}</span>`);for(const s of SYNERGIES)if(S.synergies[s.id])chips.push(`<span class="synergy-chip">★ ${s.name}</span>`);for(const s of SPECIALS)if(S.upgrades[`special:${s.id}`])chips.push(`<span class="special-chip">◆ ${s.name}</span>`);ui.chips.innerHTML=chips.join('');
}
function hideOverlay(){overlay.classList.add('hidden');choiceGrid.classList.add('hidden');}
function showChoices({type,heading,body,cards,progress='',onPick}){S.phase='choice';eyebrow.textContent=type;overlayTitle.textContent=heading;overlayText.innerHTML=`${progress?`<div class="draft-progress">${progress}</div>`:''}${body}`;choiceGrid.innerHTML='';choiceGrid.classList.remove('hidden');startBtn.classList.add('hidden');overlay.classList.remove('hidden');for(const c of cards){const b=document.createElement('button');b.className=`choice-card r-${c.rarity.cls}`;b.innerHTML=`<span class="rarity">${c.rarity.name.toUpperCase()}</span><h3>${c.title}</h3><p>${c.desc}</p><span class="effect">${c.effect}</span>`;b.addEventListener('click',()=>{c.apply();checkSynergies();updateUI();hideOverlay();onPick();},{once:true});choiceGrid.appendChild(b);}}
function showOpeningChoice(){const i=S.openingPick,spec=[['weapon','survival','offense'],['survival','weapon','utility'],['offense','survival','weapon'],['survival','offense','random'],['weapon','special','survival']];showChoices({type:'PRE-FLIGHT',heading:'Build your ship',body:'Pick one upgrade. The run starts after five choices.',cards:draft(spec[i],i===4?1:0),progress:`STARTING CHOICE ${i+1} OF 5`,onPick(){S.openingPick++;if(S.openingPick<5)setTimeout(showOpeningChoice,50);else beginRun();}})}
function startRun(){cancelAnimationFrame(raf);S=freshState();updateUI();showOpeningChoice();}
function spawnIntroSwarm(){
  const total=20;
  for(let i=0;i<total;i++){
    const y=75+(i%10)*(H-150)/9+Math.sin(i*1.7)*12;
    const type=i%5===0?'scout':'swarm';
    spawnEnemy(type,y,false,true);
    const e=S.enemies[S.enemies.length-1];e.x=W+40+(i%5)*68+Math.floor(i/5)*28;e.baseY=y;e.intro=true;
  }
  banner('AMBUSH!','#ffe56b','The Star Laser charges with every weapon kill');
}
function beginRun(){hideOverlay();S.phase='running';S.grace=5;S.lastDecisionAt=0;spawnIntroSwarm();last=performance.now();raf=requestAnimationFrame(loop);}
function queueChoice(key,fn,delay=0){if(S.queuedKeys[key])return;S.queuedKeys[key]=1;S.choiceQueue.push({key,fn,readyAt:S.time+delay});}
function resumeRun(){S.lastDecisionAt=S.time;S.phase='running';hideOverlay();}
function showNormalUpgrade(){S.upgradeQueued=false;S.level++;S.xp=Math.max(0,S.xp-S.xpNeed);S.xpNeed=Math.round(S.xpNeed*1.16+10);S.upgradeReady=S.xp>=S.xpNeed;const min=S.nextUpgradeRarity;S.nextUpgradeRarity=0;showChoices({type:'UPGRADE',heading:'Choose one upgrade',body:'Make one clear improvement, then let the ship run again.',cards:draft(['random','survival','random'],min),onPick:resumeRun});}
function showBossReward(){showChoices({type:'BOSS REWARD',heading:'Choose a boss reward',body:'A rare reward for surviving the dreadnought.',cards:draft(['weapon','special','random'],1),onPick:resumeRun});}
function gainXP(n){S.xp+=n;if(S.xp>=S.xpNeed)S.upgradeReady=true;}
function checkNormalUpgrade(){if(!S.upgradeReady||S.upgradeQueued||S.phase!=='running'||S.time-S.lastDecisionAt<NORMAL_CHOICE_GAP)return;S.upgradeQueued=true;queueChoice('normal-upgrade',()=>{delete S.queuedKeys['normal-upgrade'];showNormalUpgrade();});}
function processChoiceQueue(){if(S.phase!=='running'||!S.choiceQueue.length)return;const n=S.choiceQueue[0];if(S.time<n.readyAt||S.time-S.lastDecisionAt<QUEUED_CHOICE_GAP)return;S.choiceQueue.shift();delete S.queuedKeys[n.key];n.fn();}
function checkSynergies(){for(const s of SYNERGIES)if(!S.synergies[s.id]&&s.test(S)){S.synergies[s.id]=1;s.apply(S);banner(`BUILD BONUS: ${s.name}`,'#ffe56b',s.desc);burst(S.ship.x,S.ship.y,'#ffe56b',30,240,3);}}

function spawnEnemy(type,y=rand(65,H-65),elite=false,intro=false){const d=ENEMIES[type],scale=1+S.time/300;S.enemies.push({type,x:W+45,y,baseY:y,hp:d.hp*scale*(elite?2:1),maxHp:d.hp*scale*(elite?2:1),speed:d.speed,fire:rand(.7,Math.max(.9,d.fire)),elite,size:d.size,color:d.color,t:rand(0,10),charge:0,intro});}
function spawnWave(){const pool=['scout','dart','gunner'];if(S.time>45)pool.push('swarm','weaver');if(S.time>100)pool.push('sniper','bomber','charger');if(S.time>170)pool.push('guardian','splitter','tank','healer');const count=Math.min(9,3+Math.floor(S.time/85)),pattern=pick(['line','sine','cluster']);for(let i=0;i<count;i++){const y=pattern==='line'?80+i*(H-160)/Math.max(1,count-1):pattern==='sine'?H/2+Math.sin(i*1.15)*155:rand(100,H-100);spawnEnemy(pick(pool),y,chance(.03+S.time/8000));}}
function nearestTarget(){let best=S.boss||null,x=best?best.x:Infinity;for(const e of S.enemies)if(e.hp>0&&e.x<x){best=e;x=e.x}return best;}
function damageMultiplier(){return S.stats.damage;}
function rateMultiplier(){return S.stats.rate;}
function updateWeapons(dt){for(const k of Object.keys(WEAPONS))S.cooldowns[k]=Math.max(0,(S.cooldowns[k]||0)-dt);const t=nearestTarget();if(!t)return;for(const[k,l]of Object.entries(S.weapons)){if(l<=0||S.cooldowns[k]>0)continue;const w=WEAPONS[k];S.cooldowns[k]=w.cool/(rateMultiplier()*Math.sqrt(l));let count=k==='scatter'?Math.min(9,2+l):k==='drone'?Math.min(5,l):1;if(k==='missile'&&S.specials.missileBarrage)count=2;for(let i=0;i<count;i++){const base=Math.atan2(t.y-S.ship.y,t.x-S.ship.x),a=base+(i-(count-1)/2)*(k==='scatter'?.105:.035),sp=(w.speed+l*40),crit=chance(S.stats.crit);S.shots.push({kind:k,x:S.ship.x+25,y:S.ship.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,damage:(w.damage+l*1.35)*damageMultiplier()*(crit?2:1),life:3.2,color:w.color,pierce:S.stats.pierce+(k==='rail'?2:0),splash:S.stats.splash+((k==='flak'||k==='nova')?1+l*.2:0),homing:k==='missile',crit,trail:[]});}}}
function hurtShip(n){if(S.ship.inv>0||S.phase!=='running')return;if(S.specials.pointDefense&&++S.bulletsSeen%9===0)return;let d=n;if(S.shield>0){const a=Math.min(S.shield,d);S.shield-=a;d-=a;}if(d>0&&chance(S.stats.armor))d=Math.max(0,d-1);if(d>0){S.hull-=d;S.screenShake=Math.max(S.screenShake,5);S.flash=.12;popup(`-${d}`,S.ship.x,S.ship.y-24,'#ff8095');}S.ship.inv=.55;S.shieldDelay=4;if(S.hull<=0){if(S.specials.secondChance){S.specials.secondChance--;S.hull=Math.max(1,S.maxHull*.4);S.shield=S.maxShield;S.ship.inv=2;banner('SECOND CHANCE','#ffe56b','Back in the fight');}else endRun();}}
function addLaserCharge(amount=1){const mult=1+(S.specials.laserBattery||0);const before=S.laserCharge;S.laserCharge=clamp(S.laserCharge+amount*mult,0,S.laserMax);if(before<S.laserMax&&S.laserCharge>=S.laserMax&&!S.laserHintShown){S.laserHintShown=true;banner('STAR LASER READY','#72f7ff','Tap the ship to clear the screen');burst(S.ship.x,S.ship.y,'#72f7ff',22,180,3);}}
function killEnemy(e){const d=ENEMIES[e.type];S.salvage+=d.salvage;S.kills++;S.combo++;S.comboTimer=2;gainXP(d.xp);if(!e.byLaser)addLaserCharge(e.elite?2:1);burst(e.x,e.y,e.color,e.elite?28:15,e.elite?280:200,e.elite?4:3);S.screenShake=Math.max(S.screenShake,e.elite?3:1.3);if(S.specials.combatRepair&&S.kills%15===0){S.hull=Math.min(S.maxHull,S.hull+1);popup('+1 HULL',S.ship.x,S.ship.y-28,'#8fffb2',1.1);}if(e.type==='splitter'&&!e.byLaser){spawnEnemy('swarm',e.y-18);spawnEnemy('swarm',e.y+18);S.enemies.at(-1).x=e.x;S.enemies.at(-2).x=e.x;}}
function releaseStarLaser(){if(S.phase!=='running'||S.laserCharge<S.laserMax)return false;S.laserCharge=0;S.laserHintShown=false;S.laserBlast={radius:18,life:1,max:1};S.screenShake=15;S.flash=.36;S.bullets.length=0;let destroyed=0;for(const e of S.enemies){if(e.hp>0){e.byLaser=true;e.hp=0;destroyed++;}}banner('STAR LASER!','#ffffff',destroyed?`${destroyed} enemies erased`:'Blast wave released');burst(S.ship.x,S.ship.y,'#aafaff',65,420,5);return true;}

function updateAutopilot(dt){S.ship.ai-=dt;if(S.ship.ai<=0){S.ship.ai=Math.max(.04,.19*(1-S.stats.dodge));let bestY=H/2,bestRisk=Infinity;for(let y=58;y<H-48;y+=28){let risk=Math.abs(y-H/2)*.0013;for(const b of S.bullets){const dx=b.x-S.ship.x;if(dx>-25&&dx<410)risk+=Math.max(0,9-Math.abs(y-b.y)/10)*(1+S.stats.dodge*2.2);}for(const e of S.enemies){const dx=e.x-S.ship.x;if(dx>0&&dx<220)risk+=Math.max(0,8-Math.abs(y-e.y)/13);}if(risk<bestRisk){bestRisk=risk;bestY=y;}}S.ship.targetY=bestY;}const old=S.ship.y,maxMove=325*S.stats.speed*dt;S.ship.y+=clamp(S.ship.targetY-S.ship.y,-maxMove,maxMove);S.ship.y=clamp(S.ship.y,42,H-38);S.ship.tilt=(S.ship.y-old)*.12;S.ship.inv=Math.max(0,S.ship.inv-dt);}
function fireEnemy(e){const d=ENEMIES[e.type],a=Math.atan2(S.ship.y-e.y,S.ship.x-e.x),sp=(e.type==='sniper'?320:190+S.time*.075)*S.combatSpeed,spread=e.type==='bomber'?[-.17,0,.17]:e.type==='weaver'?[-.1,.1]:[0];for(const o of spread)S.bullets.push({x:e.x,y:e.y,vx:Math.cos(a+o)*sp,vy:Math.sin(a+o)*sp,damage:d.damage,life:5.5,hot:e.type==='sniper'});}
function updateEnemies(dt){for(const e of S.enemies){const d=ENEMIES[e.type];e.t+=dt;let mv=d.speed*S.combatSpeed*dt*(.80+S.threat*.08);if(e.intro)mv*=.92;if(e.type==='charger'&&e.x<700){if(!e.charge)e.charge=.8;e.charge-=dt;if(e.charge<0)mv*=3.2;}e.x-=mv;if(e.type==='dart')e.y=e.baseY+Math.sin(e.t*5)*85;if(e.type==='swarm')e.y=e.baseY+Math.sin(e.t*6+e.x*.02)*48;if(e.type==='bomber')e.y=e.baseY+Math.sin(e.t*1.7)*60;if(e.type==='weaver')e.y=e.baseY+Math.sin(e.t*3.2)*105;if(e.type==='healer'){const a=S.enemies.find(o=>o!==e&&o.hp>0&&o.hp<o.maxHp);if(a)a.hp=Math.min(a.maxHp,a.hp+3*dt);}e.fire-=dt;if(e.fire<=0&&e.x<W-45&&d.fire<90&&S.grace<=0){e.fire=d.fire*rand(.95,1.30)/Math.sqrt(S.threat);fireEnemy(e);}if(Math.hypot(e.x-S.ship.x,e.y-S.ship.y)<e.size+13){e.hp=0;if(S.grace<=0)hurtShip(d.damage);}}}
function updateProjectiles(dt){for(const b of S.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-S.ship.x,b.y-S.ship.y)<14){b.life=0;hurtShip(b.damage);}}for(const sh of S.shots){sh.trail.push({x:sh.x,y:sh.y});if(sh.trail.length>6)sh.trail.shift();if(sh.homing){const t=nearestTarget();if(t){const desired=Math.atan2(t.y-sh.y,t.x-sh.x),sp=Math.hypot(sh.vx,sh.vy),cur=Math.atan2(sh.vy,sh.vx),diff=((desired-cur+Math.PI*3)%(Math.PI*2))-Math.PI,a=cur+clamp(diff,-4.2*dt,4.2*dt);sh.vx=Math.cos(a)*sp;sh.vy=Math.sin(a)*sp;}}sh.x+=sh.vx*dt;sh.y+=sh.vy*dt;sh.life-=dt;for(const e of S.enemies){if(e.hp<=0||Math.hypot(sh.x-e.x,sh.y-e.y)>=e.size+5)continue;e.hp-=sh.damage;if(sh.splash){const r=45+sh.splash*17;for(const o of S.enemies)if(o!==e&&o.hp>0&&Math.hypot(o.x-e.x,o.y-e.y)<r)o.hp-=sh.damage*.32;}if(sh.kind==='arc'){const o=S.enemies.find(o=>o!==e&&o.hp>0&&Math.hypot(o.x-e.x,o.y-e.y)<120);if(o)o.hp-=sh.damage*.6;}if(sh.kind==='rail'&&S.specials.beamCannon)e.hp-=sh.damage*.35;if((sh.kind==='nova'||sh.kind==='flak')&&S.specials.chainBombs&&chance(.25))for(const o of S.enemies)if(o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<110)o.hp-=sh.damage*.25;if(sh.pierce>0)sh.pierce--;else sh.life=0;break;}if(S.boss&&Math.hypot(sh.x-S.boss.x,sh.y-S.boss.y)<S.boss.size){S.boss.hp-=sh.damage;if(sh.pierce<=0)sh.life=0;}}}

function spawnBoss(){const type=BOSSES[S.bosses%BOSSES.length],hp=245*(1+S.bosses*.55);S.boss={type,x:W+90,y:H/2,hp,maxHp:hp,size:66,fire:1.45,t:0,phase:1};banner('DREADNOUGHT INCOMING',type.color,type.name);S.screenShake=5;}
function updateBoss(dt){if(!S.boss)return;const b=S.boss;b.t+=dt;b.x+=(W-175-b.x)*dt*.38;b.y=H/2+Math.sin(b.t*(1.2+b.phase*.15))*135;b.phase=b.hp/b.maxHp<.33?3:b.hp/b.maxHp<.66?2:1;b.fire-=dt;if(b.fire<=0&&S.grace<=0){b.fire=Math.max(.48,1.38-b.phase*.13-S.bosses*.035);const base=Math.atan2(S.ship.y-b.y,S.ship.x-b.x),count=3+b.phase*2;for(let i=0;i<count;i++){const off=(i-(count-1)/2)*(.09+b.phase*.018),sp=(205+b.phase*24)*S.combatSpeed;S.bullets.push({x:b.x,y:b.y,vx:Math.cos(base+off)*sp,vy:Math.sin(base+off)*sp,damage:b.phase===3?2:1,life:7});}}if(b.hp<=0){const name=b.type.name;burst(b.x,b.y,b.type.color,80,390,5);S.screenShake=12;S.boss=null;S.bosses++;S.salvage+=20;S.hull=Math.min(S.maxHull,S.hull+Math.max(3,S.maxHull*.22));S.shield=S.maxShield;gainXP(20);banner(`${name} DESTROYED`,'#ffe56b','Boss reward incoming');queueChoice(`boss-${S.bosses}`,showBossReward,5);}}
function showRouteEvent(){const economy=S.salvage>=12?{rarity:RARITIES[1],title:'Weapon Workshop',desc:'Spend salvage to improve equipment without another menu.',effect:'Spend 12 salvage → +2 weapon levels',apply(){S.salvage-=12;const a=Object.keys(S.weapons).filter(k=>S.weapons[k]>0);for(let i=0;i<2;i++){const k=pick(a);S.weapons[k]=Math.min(15,S.weapons[k]+1);}}}:{rarity:RARITIES[1],title:'Scavenge Wreckage',desc:'Collect useful materials from a ruined convoy.',effect:'+8 salvage',apply(){S.salvage+=8;}};showChoices({type:'ROUTE EVENT',heading:'Choose the next route',body:'One decision, then the run continues automatically.',cards:[{rarity:RARITIES[0],title:'Repair Stop',desc:'Take the safer path and repair.',effect:'Heal 45% hull and fully recharge shields',apply(){S.hull=Math.min(S.maxHull,S.hull+S.maxHull*.45);S.shield=S.maxShield;}},economy,{rarity:RARITIES[2],title:'Risky Route',desc:'Face more pressure for a stronger future upgrade.',effect:'+10% threat, +8 salvage, next upgrade Legendary+',apply(){S.threat+=.1;S.salvage+=8;S.nextUpgradeRarity=Math.max(S.nextUpgradeRarity,2);}}],onPick:resumeRun});}
function pressureFactor(){const h=S.hull/S.maxHull;if(h<.25)return .48;if(h<.45)return .66;if(h<.65)return .84;if(h>.88&&S.shield>S.maxShield*.55)return 1.08;return 1;}
function updateDirector(dt){if(S.grace>0){S.grace-=dt;return;}const p=pressureFactor();S.director.spawn-=dt;S.director.wave-=dt;S.director.event-=dt;S.director.boss-=dt;S.director.breather-=dt;if(S.director.spawn<=0){const pool=S.time<60?['scout','dart']:S.time<120?['scout','dart','gunner','weaver']:['scout','dart','gunner','weaver','sniper','charger'];spawnEnemy(pick(pool));S.director.spawn=rand(2.0,3.0)/(S.threat*p);}if(S.director.wave<=0){spawnWave();S.director.wave=rand(10,14)/Math.sqrt(S.threat*p);}if(S.director.event<=0){if(S.time-S.lastDecisionAt>=60){queueChoice(`event-${Math.floor(S.time)}`,showRouteEvent);S.director.event=rand(135,165);}else S.director.event=20;}if(S.director.boss<=0&&!S.boss){S.director.boss=190+rand(20,35);spawnBoss();}if(S.director.breather<=0){S.grace=Math.max(S.grace,4.5);S.director.breather=rand(55,70);banner('CLEAR AIR','#8ff7ff','A short recovery window');}}
function milestones(){if(S.time>=S.nextMilestone){const m=Math.floor(S.nextMilestone/60);banner(`${m} MINUTE${m===1?'':'S'} SURVIVED`,'#ffe56b',m%2===0?'Rarity luck improved':'The build keeps growing');if(m%2===0)S.stats.luck=Math.min(.75,S.stats.luck+.02);S.nextMilestone+=60;}}
function update(dt){S.time+=dt;S.worldSpeed=1.85+Math.min(.45,S.time/1000);S.combatSpeed=1.15+Math.min(.12,S.time/1200);S.threat=.52+Math.min(2.7,S.time/175);S.hull=Math.min(S.maxHull,S.hull+S.stats.repair*dt);if(S.shieldDelay>0)S.shieldDelay-=dt;else S.shield=Math.min(S.maxShield,S.shield+S.shieldRegen*dt);if(S.comboTimer>0){S.comboTimer-=dt;if(S.comboTimer<=0)S.combo=0;}S.screenShake=Math.max(0,S.screenShake-dt*18);S.flash=Math.max(0,S.flash-dt);if(S.laserBlast){S.laserBlast.radius+=1250*dt;S.laserBlast.life-=dt;if(S.laserBlast.life<=0)S.laserBlast=null;}updateAutopilot(dt);updateWeapons(dt);updateDirector(dt);updateEnemies(dt);updateProjectiles(dt);updateBoss(dt);milestones();checkNormalUpgrade();for(const e of S.enemies)if(e.hp<=0&&!e.dead){e.dead=true;killEnemy(e);}S.enemies=S.enemies.filter(e=>!e.dead&&e.x>-90);S.bullets=S.bullets.filter(b=>b.life>0&&b.x>-90&&b.x<W+90&&b.y>-80&&b.y<H+80);S.shots=S.shots.filter(s=>s.life>0&&s.x<W+120&&s.y>-90&&s.y<H+90);for(const p of S.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;p.vy*=.98;p.life-=dt;}S.particles=S.particles.filter(p=>p.life>0);for(const p of S.popups){p.y-=26*dt;p.life-=dt;}S.popups=S.popups.filter(p=>p.life>0);for(const b of S.banners)b.life-=dt;S.banners=S.banners.filter(b=>b.life>0);updateUI();processChoiceQueue();}

function polygon(points,fill,stroke=null,line=1){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function engineFlame(x,y,len,color='#ffe56b'){ctx.fillStyle=color;polygon([[x,y],[x-len,y-4],[x-len+5,y],[x-len,y+4]],color);}
function drawEnemy(e){
  const s=e.size,t=e.t;ctx.save();ctx.translate(e.x,e.y);ctx.shadowColor=e.color;ctx.shadowBlur=e.elite?18:8;const dark='#07101b',hi='#ffffffcc';
  if(e.type==='scout'){
    engineFlame(-s*.9,0,10+Math.sin(t*12)*3);polygon([[s,0],[2,-8],[-s,-13],[-s*.55,0],[-s,13],[2,8]],e.color,dark,2);ctx.fillStyle=dark;ctx.fillRect(-3,-4,10,8);ctx.fillStyle=hi;ctx.fillRect(8,-2,6,4);
  }else if(e.type==='dart'){
    engineFlame(-s,0,13,'#ffcf70');polygon([[s*1.5,0],[-s*.2,-5],[-s,-13],[-s*.55,0],[-s,13],[-s*.2,5]],e.color,dark,2);ctx.fillStyle='#fff';ctx.fillRect(s*.45-1,-2,7,4);
  }else if(e.type==='gunner'){
    engineFlame(-s,0,10);polygon([[s,0],[s*.25,-11],[-s*.65,-16],[-s,-5],[-s,5],[-s*.65,16],[s*.25,11]],e.color,dark,2);ctx.fillStyle=dark;ctx.fillRect(0,-14,5,9);ctx.fillRect(0,5,5,9);ctx.fillStyle=hi;ctx.fillRect(8,-3,7,6);
  }else if(e.type==='tank'){
    engineFlame(-s,0,9,'#ffb15a');polygon([[s,0],[s*.55,-17],[-s*.55,-21],[-s,-11],[-s,11],[-s*.55,21],[s*.55,17]],e.color,dark,3);ctx.fillStyle=dark;ctx.fillRect(-10,-12,22,24);ctx.fillRect(8,-3,22,6);ctx.fillStyle='#ffe4ac';ctx.fillRect(-4,-4,11,8);
  }else if(e.type==='sniper'){
    engineFlame(-s*.8,0,8);polygon([[s*1.6,0],[0,-6],[-s,-12],[-s*.6,0],[-s,12],[0,6]],e.color,dark,2);ctx.fillStyle=dark;ctx.fillRect(0,-3,25,6);ctx.fillStyle='#fff2b6';ctx.beginPath();ctx.arc(s*.45,0,3,0,7);ctx.fill();
  }else if(e.type==='swarm'){
    ctx.rotate(Math.sin(t*7)*.22);polygon([[s*1.25,0],[2,-5],[-s,-11],[-s*.45,0],[-s,11],[2,5]],e.color,dark,1.5);ctx.fillStyle='#fff';ctx.fillRect(3,-2,4,4);ctx.fillStyle='#ffba62';ctx.fillRect(-s-5,-2,6,4);
  }else if(e.type==='bomber'){
    engineFlame(-s*.9,0,8);polygon([[s,0],[s*.4,-15],[-s*.45,-20],[-s,-8],[-s,8],[-s*.45,20],[s*.4,15]],e.color,dark,2);ctx.fillStyle=dark;ctx.beginPath();ctx.arc(-2,0,9,0,7);ctx.fill();ctx.fillStyle='#ffd6ad';ctx.fillRect(8,-4,8,8);ctx.fillStyle='#ff6f5c';ctx.beginPath();ctx.arc(-10,-15,4,0,7);ctx.arc(-10,15,4,0,7);ctx.fill();
  }else if(e.type==='guardian'){
    ctx.rotate(t*.45);ctx.strokeStyle=e.color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,s,0,7);ctx.stroke();ctx.rotate(-t*.9);polygon([[13,0],[0,-13],[-13,0],[0,13]],'#d8f5ff',dark,2);ctx.fillStyle='#23669b';ctx.beginPath();ctx.arc(0,0,5,0,7);ctx.fill();
  }else if(e.type==='splitter'){
    ctx.rotate(Math.sin(t*3)*.15);polygon([[s,0],[4,-6],[-s*.85,-18],[-s*.55,0],[-s*.85,18],[4,6]],e.color,dark,2);ctx.fillStyle='#fff';polygon([[8,0],[-2,-5],[-2,5]],'#fff');ctx.strokeStyle='#ffdcfa';ctx.beginPath();ctx.moveTo(-s*.5,-12);ctx.lineTo(s*.2,0);ctx.lineTo(-s*.5,12);ctx.stroke();
  }else if(e.type==='charger'){
    engineFlame(-s,0,12,'#ffbf58');polygon([[s*1.45,0],[s*.45,-7],[-s*.25,-18],[-s,-12],[-s*.55,0],[-s,12],[-s*.25,18],[s*.45,7]],e.color,dark,2);ctx.fillStyle='#fff';ctx.fillRect(9,-2,12,4);ctx.fillStyle=dark;ctx.fillRect(-7,-4,10,8);
  }else if(e.type==='healer'){
    ctx.rotate(Math.sin(t*2)*.08);polygon([[s,0],[7,-7],[0,-s],[-7,-7],[-s,0],[-7,7],[0,s],[7,7]],e.color,dark,2);ctx.fillStyle='#ecfff5';ctx.fillRect(-4,-14,8,28);ctx.fillRect(-14,-4,28,8);ctx.strokeStyle=`rgba(130,255,188,${.45+.25*Math.sin(t*5)})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,s+7+Math.sin(t*4)*3,0,7);ctx.stroke();
  }else if(e.type==='weaver'){
    ctx.rotate(Math.sin(t*4)*.2);ctx.strokeStyle=e.color;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-s,-14);ctx.lineTo(-4,0);ctx.lineTo(s,-14);ctx.moveTo(-s,14);ctx.lineTo(-4,0);ctx.lineTo(s,14);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(5,0,5,0,7);ctx.fill();ctx.fillStyle=dark;ctx.beginPath();ctx.arc(5,0,2,0,7);ctx.fill();
  }
  ctx.shadowBlur=0;if(e.elite){ctx.strokeStyle='#ffe56b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,s+8+Math.sin(t*5)*2,0,7);ctx.stroke();}ctx.restore();
}
function drawShip(){ctx.save();ctx.translate(S.ship.x,S.ship.y);ctx.rotate(S.ship.tilt*.02);const full=S.laserCharge>=S.laserMax;ctx.shadowColor=full?'#aafaff':'#76e8f1';ctx.shadowBlur=full?24:14;polygon([[31,0],[-10,-10],[-25,-25],[-16,-5],[-28,0],[-16,5],[-25,25],[-10,10]],S.ship.inv>0?'#fff':'#75e8f2','#10263e',2);ctx.fillStyle='#d8ffff';ctx.fillRect(6,-4,12,8);const exhaust=18+S.worldSpeed*7+rand(0,10);engineFlame(-27,0,exhaust,'#ffd76e');if(S.shield>0){ctx.strokeStyle=`rgba(125,225,255,${.18+.38*S.shield/S.maxShield})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,33,0,7);ctx.stroke();}if(full){ctx.strokeStyle=`rgba(180,255,255,${.55+.35*Math.sin(S.time*8)})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,40+Math.sin(S.time*6)*3,0,7);ctx.stroke();}if(S.weapons.drone>0){const n=Math.min(3,S.weapons.drone);for(let i=0;i<n;i++){const a=S.time*2.5+i*Math.PI*2/n;ctx.fillStyle='#7fffc5';ctx.fillRect(Math.cos(a)*44-3,Math.sin(a)*27-3,6,6);}}ctx.restore();}
function drawLaserHUD(){const pct=clamp(S.laserCharge/S.laserMax,0,1),x=W/2-150,y=H-30,w=300,h=12;ctx.fillStyle='#020814cc';ctx.fillRect(x-3,y-3,w+6,h+6);ctx.fillStyle='#16344d';ctx.fillRect(x,y,w,h);const g=ctx.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#47b9ff');g.addColorStop(1,'#c8ffff');ctx.fillStyle=g;ctx.fillRect(x,y,w*pct,h);ctx.strokeStyle=pct>=1?'#ffffff':'#5da7cf';ctx.lineWidth=pct>=1?2:1;ctx.strokeRect(x,y,w,h);ctx.textAlign='center';ctx.font='bold 10px monospace';ctx.fillStyle=pct>=1?'#ffffff':'#a7c8df';ctx.fillText(pct>=1?'STAR LASER READY — TAP SHIP':`STAR LASER ${Math.floor(pct*100)}%`,W/2,y-5);ctx.textAlign='left';}
function draw(){const biome=BIOMES[Math.floor(S.time/65)%BIOMES.length];ctx.save();if(S.screenShake)ctx.translate(rand(-S.screenShake,S.screenShake),rand(-S.screenShake,S.screenShake));const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,biome.top);g.addColorStop(1,biome.bottom);ctx.fillStyle=g;ctx.fillRect(-20,-20,W+40,H+40);ctx.fillStyle=biome.fog;for(let i=0;i<6;i++){const x=(W+260)-(S.time*(28+i*6)*S.worldSpeed+i*190)%(W+520)-210,y=70+i*82;ctx.beginPath();ctx.arc(x,y,105+i*17,0,7);ctx.fill();}for(const st of stars){st.x-=st.z*4.9*S.worldSpeed;if(st.x<0)st.x=W;ctx.fillStyle=`rgba(255,255,255,${.18+st.z*.7})`;ctx.fillRect(st.x,st.y,st.s,st.s);}for(let i=0;i<11;i++){const x=W-((S.time*125*S.worldSpeed+i*126)%(W+260));ctx.fillStyle=`rgba(255,255,255,${.03+i*.004})`;ctx.fillRect(x,40+(i*47)%460,95+i*6,1);}ctx.fillStyle='#02061155';ctx.fillRect(0,0,W,31);ctx.fillStyle=biome.accent;ctx.font='bold 12px monospace';ctx.fillText(`${biome.name}  •  SPEED ${S.worldSpeed.toFixed(1)}×  •  THREAT ${S.threat.toFixed(1)}×${S.grace>0?`  •  OPENING ${Math.ceil(S.grace)}s`:''}`,15,20);drawShip();for(const e of S.enemies)drawEnemy(e);for(const sh of S.shots){ctx.globalAlpha=.24;for(const t of sh.trail){ctx.fillStyle=sh.color;ctx.fillRect(t.x-5,t.y-1,10,2);}ctx.globalAlpha=1;ctx.shadowColor=sh.color;ctx.shadowBlur=10;ctx.fillStyle=sh.color;if(sh.kind==='missile'||sh.kind==='nova'){ctx.beginPath();ctx.arc(sh.x,sh.y,sh.kind==='nova'?6:4,0,7);ctx.fill();}else ctx.fillRect(sh.x-7,sh.y-2,14,4);ctx.shadowBlur=0;}for(const b of S.bullets){ctx.shadowColor=b.hot?'#fff':'#ff7890';ctx.shadowBlur=b.hot?12:6;ctx.fillStyle=b.hot?'#fff1b0':'#ff7890';ctx.beginPath();ctx.arc(b.x,b.y,b.hot?5:4,0,7);ctx.fill();ctx.shadowBlur=0;}for(const p of S.particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;for(const p of S.popups){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(p.text,p.x,p.y);}ctx.globalAlpha=1;ctx.textAlign='left';if(S.combo>=7){ctx.fillStyle='#ffe56b';ctx.font='bold 14px monospace';ctx.fillText(`${S.combo} KILL CHAIN`,15,H-18);}if(S.boss){const b=S.boss;ctx.save();ctx.translate(b.x,b.y);ctx.shadowColor=b.type.color;ctx.shadowBlur=28;polygon([[-72,0],[-40,-48],[22,-42],[68,-14],[76,0],[68,14],[22,42],[-40,48]],b.type.color,'#1a1026',3);ctx.fillStyle='#0a0e1d';ctx.fillRect(-28,-21,38,42);ctx.fillStyle=b.type.accent;ctx.beginPath();ctx.arc(10,0,14+b.phase*2,0,7);ctx.fill();ctx.strokeStyle=b.type.accent;ctx.lineWidth=2;ctx.beginPath();ctx.arc(10,0,26+Math.sin(b.t*4)*4,0,7);ctx.stroke();ctx.restore();ctx.fillStyle='#070b14cc';ctx.fillRect(W-300,43,260,13);ctx.fillStyle=b.type.color;ctx.fillRect(W-297,46,254*clamp(b.hp/b.maxHp,0,1),7);ctx.fillStyle='#fff';ctx.font='bold 10px monospace';ctx.textAlign='right';ctx.fillText(`${b.type.name}  PHASE ${b.phase}`,W-42,39);ctx.textAlign='left';}if(S.laserBlast){const a=clamp(S.laserBlast.life/S.laserBlast.max,0,1);ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#d8ffff';ctx.lineWidth=18*a+3;ctx.shadowColor='#72f7ff';ctx.shadowBlur=30;ctx.beginPath();ctx.arc(S.ship.x,S.ship.y,S.laserBlast.radius,0,7);ctx.stroke();ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(S.ship.x,S.ship.y,S.laserBlast.radius*.78,0,7);ctx.stroke();ctx.restore();}drawLaserHUD();const active=S.banners[0];if(active){const a=1-Math.abs(active.life/active.max-.5)*1.4;ctx.globalAlpha=clamp(a,0,1);ctx.textAlign='center';ctx.fillStyle='#020611bb';ctx.fillRect(W/2-235,H*.17-34,470,76);ctx.fillStyle=active.color;ctx.font='bold 24px monospace';ctx.fillText(active.text,W/2,H*.17);ctx.fillStyle='#fff';ctx.font='11px monospace';ctx.fillText(active.sub,W/2,H*.17+22);ctx.textAlign='left';ctx.globalAlpha=1;}if(S.flash){ctx.fillStyle=`rgba(255,255,255,${S.flash*1.25})`;ctx.fillRect(0,0,W,H);}ctx.restore();}
function endRun(){S.phase='dead';cancelAnimationFrame(raf);S.best=Math.max(S.best,S.time);localStorage.setItem('starwardBest',S.best);eyebrow.textContent='RUN COMPLETE';overlayTitle.textContent=`Survived ${formatTime(S.time)}`;overlayText.textContent=`Build level ${S.level} • ${S.kills} enemies destroyed • ${S.bosses} bosses defeated • Best ${formatTime(S.best)}`;choiceGrid.classList.add('hidden');startBtn.textContent='Build Another Ship';startBtn.classList.remove('hidden');overlay.classList.remove('hidden');}
function loop(now){if(S.phase==='dead'||S.phase==='menu')return;const dt=Math.min(.033,(now-last)/1000||.016);last=now;if(S.phase==='running')update(dt);draw();raf=requestAnimationFrame(loop);}
function canvasPoint(ev){const r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height};}
canvas.addEventListener('pointerdown',ev=>{if(S.phase!=='running')return;const p=canvasPoint(ev);if(Math.hypot(p.x-S.ship.x,p.y-S.ship.y)<=62&&S.laserCharge>=S.laserMax){ev.preventDefault();releaseStarLaser();}});
startBtn.addEventListener('click',startRun);
S=freshState();updateUI();draw();
})();

'use strict';
/* v12 REBUILD — biome-owned ecology, harsher survival, distinct enemy behaviors, unified simple run loop. */
(function(){
const R={version:12,biome:-1,pressure:0,eventT:24,grace:5,choice:null,choiceShown:false,killsBiome:0};window.REBUILD_V12=R;

/* ---------- BIOME ECOLOGIES ---------- */
const E=[
 {name:'Meadow',hazard:'Open pursuit',bases:['slime','bee','frog','boar','mushroom','wolf'],roles:['swarm','dart','hop','ram','spore','pack'],boss:'king',event:['Slime Tide','Bee Swarm','Boar Stampede']},
 {name:'Blossom Woods',hazard:'Ambush forest',bases:['pink','moth','mushroom','wolf','treant','wisp'],roles:['swarm','orbit','spore','pack','root','hex'],boss:'king',event:['Petal Ambush','Moth Bloom','Root Awakening']},
 {name:'Moon Fields',hazard:'Ranged pressure',bases:['wisp','ghost','moth','skeleton','wolf','starbeast'],roles:['hex','phase','orbit','hunter','pack','sniper'],boss:'wraithQueen',event:['Moon Hunt','Wisp Crossfire','Ghost Procession']},
 {name:'Misty Marsh',hazard:'Slow + surround',bases:['frog','crab','ghost','mushroom','serpent','wisp'],roles:['hop','guard','phase','spore','coil','hex'],boss:'wraithQueen',event:['Bog Surge','Leech Mist','Marsh Ring']},
 {name:'Emberlands',hazard:'Burst damage',bases:['emberling','boar','cactus','golem','serpent','magmaToad'],roles:['caster','ram','turret','tank','coil','boss'],boss:'magmaToad',event:['Ash Storm','Ember Rush','Magma Breach']},
 {name:'Frostvale',hazard:'Fast hunters',bases:['snowbun','frostling','wolf','golem','frostStag','wisp'],roles:['hop','caster','pack','tank','ram','hex'],boss:'frostStag',event:['Whiteout Hunt','Ice Pack','Frozen Stampede']},
 {name:'Crystal Steppe',hazard:'Projectile lattice',bases:['crystalbeetle','moth','golem','wisp','starbeast','cactus'],roles:['guard','orbit','tank','hex','sniper','turret'],boss:'frostStag',event:['Prism Crossfire','Crystal Nest','Shardstorm']},
 {name:'Sunken Garden',hazard:'Control + attrition',bases:['crab','mushroom','serpent','treant','ghost','frog'],roles:['guard','spore','coil','root','phase','hop'],boss:'wraithQueen',event:['Drowned Bloom','Vine Siege','Sunken Procession']},
 {name:'Duskwild',hazard:'Aggressive ambush',bases:['bat','ghost','skeleton','riftHound','voidling','treant'],roles:['dart','phase','hunter','pack','assassin','root'],boss:'worldEater',event:['Night Hunt','Rift Pack','Grave Rising']},
 {name:'Starfall Reach',hazard:'Endgame chaos',bases:['starbeast','voidling','riftHound','wisp','golem','worldEater'],roles:['sniper','assassin','pack','hex','tank','boss'],boss:'worldEater',event:['Starfall Siege','Void Breach','Astral Hunt']}
];
const adjectives=[['Soft','Sunny','Pollen','Clover'],['Petal','Sakura','Rose','Lantern'],['Lunar','Pale','Silver','Dream'],['Bog','Mire','Reed','Fen'],['Ash','Cinder','Molten','Scorch'],['Frost','Rime','Snow','Glacier'],['Prism','Shard','Gem','Glass'],['Lotus','Vine','Drowned','Moss'],['Gloom','Grave','Hollow','Night'],['Astral','Comet','Void','Star']];
const nouns=['Mite','Puff','Stalker','Guardian','Sprite','Hound','Drake','Knight'];
const aliases={};
function makeSpecies(){for(let b=0;b<E.length;b++){const eco=E[b];eco.types=[];for(let i=0;i<8;i++){const base=eco.bases[i%eco.bases.length],bd=mobDefs[base],key='v12_'+b+'_'+i,name=adjectives[b][i%4]+' '+nouns[i];mobDefs[key]={hp:Math.round(bd.hp*(1+b*.055+(i%3)*.08)),spd:bd.spd*(1+(i%4)*.035),dmg:Math.round(bd.dmg*(1.18+b*.07+(i%2)*.09)),xp:Math.max(1,bd.xp+Math.floor(b/2)),r:bd.r,ai:bd.ai,tier:Math.min(5,Math.max(bd.tier,Math.floor(b/2))),v12:true,v12Name:name,v12Biome:b,v12Role:eco.roles[i%eco.roles.length],spriteBase:base};eco.types.push(key);aliases[key]=base;}}}
makeSpecies();

/* ---------- SPAWNING BELONGS TO THE BIOME ---------- */
function weightedType(b){const eco=E[b],tier=dangerAt(player.x,player.y),r=Math.random();let i=(r*eco.types.length)|0;if(tier<=1)i=Math.min(i,4);return eco.types[i%eco.types.length]}
function spawnOwned(type,elite=false){const b=biomeAtWorld(player.x,player.y),chosen=type||weightedType(b);const def=mobDefs[chosen];if(!def)return null;const pt=safeSpawnAround(player.x,player.y,210,430);const q={x:pt.x,y:pt.y,type:chosen,hp:def.hp,max:def.hp,seed:Math.random()*99,hit:0,contact:0,charge:0,telegraph:0,hop:Math.random()*3,elite:!!elite,ph:Math.random()*6.28,v12Cd:.3+Math.random(),v12State:'seek',v12Side:Math.random()<.5?-1:1};if(elite){q.hp*=1.75;q.max=q.hp}mobs.push(q);return q}
spawnMob=function(type,elite=false){if(type&&mobDefs[type]&&!mobDefs[type].v12)return spawnOwned(type,elite);return spawnOwned(type,elite)};

/* ---------- DISTINCT BEHAVIORS ---------- */
const oldAi=aiMove;
function enemyShot(q,speed,dmg,count=1,spread=.18){if(!window.AI_DIRECTOR)return;for(let i=0;i<count;i++){const a=Math.atan2(player.y-q.y,player.x-q.x)+(i-(count-1)/2)*spread;AI_DIRECTOR.enemyShots.push({x:q.x,y:q.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,t:2.8,dmg,kind:q.type,r:4})}}
aiMove=function(q,def,dt,dx,dy,d){if(!def.v12)return oldAi(q,def,dt,dx,dy,d);q.v12Cd=Math.max(0,(q.v12Cd||0)-dt);const role=def.v12Role,r=def.r*.68,nx=dx/d,ny=dy/d,side=q.v12Side||1;
 const move=(vx,vy,s)=>moveBody(q,vx*s*dt,vy*s*dt,r);
 if(role==='swarm'){move(nx-side*ny*.35,ny+side*nx*.35,def.spd*1.2)}
 else if(role==='dart'){if(q.v12Cd<=0&&d<210){q.v12Cd=1.25;q.v12State='burst';q.v12Burst=.28}if(q.v12Burst>0){q.v12Burst-=dt;move(nx,ny,def.spd*2.5)}else move(-ny*side,nx*side,def.spd*.8)}
 else if(role==='ram'){if(q.v12Cd<=0&&d<230){q.v12Cd=1.8;q.v12Burst=.34;q.v12Aim=Math.atan2(dy,dx);q.telegraph=.42}if(q.v12Burst>0){q.v12Burst-=dt;move(Math.cos(q.v12Aim),Math.sin(q.v12Aim),def.spd*3.0)}else move(nx,ny,def.spd*.75)}
 else if(role==='hop'){const pulse=(Math.sin(run*7+q.seed)>.05)?1.45:.18;move(nx,ny,def.spd*pulse)}
 else if(role==='pack'){move(nx-side*ny*.82,ny+side*nx*.82,def.spd*1.08)}
 else if(role==='phase'||role==='assassin'){const s=role==='assassin'?1.55:1.12;move(nx,ny,def.spd*s);if(role==='assassin'&&q.v12Cd<=0&&d<95){q.v12Cd=1.4;move(nx,ny,def.spd*2.7)}}
 else if(role==='tank'||role==='guard'){move(nx,ny,def.spd*.78);if(q.v12Cd<=0&&d<100){q.v12Cd=1.8;q.telegraph=.48}}
 else if(role==='root'){if(d>105)move(nx,ny,def.spd*.62);if(q.v12Cd<=0&&d<180){q.v12Cd=2.1;enemyShot(q,145,def.dmg*.65,5,.32)}}
 else if(role==='coil'){move(nx-side*ny*.45,ny+side*nx*.45,def.spd*1.15);if(q.v12Cd<=0&&d<135){q.v12Cd=1.5;q.v12Burst=.18}}
 else if(role==='spore'){if(d<130)move(-nx,-ny,def.spd*.7);else if(d>190)move(nx,ny,def.spd*.5);if(q.v12Cd<=0&&d<250){q.v12Cd=2;enemyShot(q,120,def.dmg*.55,3,.4)}}
 else if(role==='turret'){if(d<160)move(-nx,-ny,def.spd*.45);if(q.v12Cd<=0&&d<330){q.v12Cd=1.55;enemyShot(q,185,def.dmg*.72,3,.16)}}
 else if(role==='caster'||role==='hex'){if(d<145)move(-nx,-ny,def.spd*.8);else move(-ny*side,nx*side,def.spd*.55);if(q.v12Cd<=0&&d<300){q.v12Cd=1.35;enemyShot(q,210,def.dmg*.78,role==='hex'?2:1,.2)}}
 else if(role==='orbit'){move(nx*.15-side*ny,ny*.15+side*nx,def.spd*.9);if(q.v12Cd<=0&&d<280){q.v12Cd=1.7;enemyShot(q,175,def.dmg*.65,3,.28)}}
 else if(role==='sniper'){if(d<210)move(-nx,-ny,def.spd*.75);else if(d>310)move(nx,ny,def.spd*.45);if(q.v12Cd<=0&&d<390){q.v12Cd=1.8;q.telegraph=.55;setTimeout(()=>{if(started&&q.hp>0)enemyShot(q,300,def.dmg*.95,1)},420)}}
 else oldAi(q,def,dt,dx,dy,d);
};

/* ---------- SURVIVAL IS INTENTIONALLY HARDER ---------- */
const baseHurt=hurt;
hurt=function(amount,from){if(invuln>0||spawnShield>0||dead)return;const tier=dangerAt(player.x,player.y),pressure=1.08+tier*.08+Math.min(.22,run/360*.12);baseHurt(amount*pressure,from);regenDelay=Math.max(regenDelay,5.4)};
const baseUpdate=update;
update=function(dt){baseUpdate(dt);if(!started||dead)return;R.grace=Math.max(0,R.grace-dt);const b=biomeAtWorld(player.x,player.y);if(b!==R.biome){R.biome=b;R.killsBiome=0;R.eventT=12;toast('⚠ '+E[b].name+' · '+E[b].hazard)}
 /* No passive safety: population rises quickly and stays threatening. */
 const tier=dangerAt(player.x,player.y),target=10+tier*3+Math.min(8,Math.floor(run/50));if(mobs.length<target&&R.grace<=0&&Math.random()<dt*(1.4+tier*.22))spawnOwned(null,Math.random()<(.05+tier*.025));
 R.eventT-=dt;if(R.eventT<=0){biomeEvent(b,tier);R.eventT=22+Math.random()*18;}
};

function biomeEvent(b,tier){const eco=E[b],name=eco.event[(Math.random()*eco.event.length)|0];toast('⚠ '+eco.name.toUpperCase()+' · '+name);sound('boss');const n=4+tier*2;for(let i=0;i<n;i++)spawnOwned(null,i===0&&tier>=2);if(tier>=3&&Math.random()<.3)spawnOwned(eco.boss,true)}

/* ---------- SIMPLER, REAL LEVEL CHOICES ---------- */
const perks=[
 ['HEART','+10 max HP, heal 10',()=>{maxHp+=10;hp=Math.min(maxHp,hp+10)}],
 ['HASTE','+8% movement',()=>player.v12Speed=(player.v12Speed||1)*1.08],
 ['POWER','+10% damage',()=>player.v12Power=(player.v12Power||1)*1.10],
 ['REPAIR','Restore weapon durability',()=>{if(window.DEEP_V9){DEEP_V9.weaponHits=DEEP_V9.weaponMax}}],
 ['DASH','Dash cooldown -15%',()=>player.v10Dash=(player.v10Dash||1)*.85],
 ['SCAVENGE','Weapons last +20%',()=>{player.v10Dur=(player.v10Dur||1)*1.2;if(window.DEEP_V9&&DEEP_V9.syncWeapon){DEEP_V9.weaponKey='';DEEP_V9.syncWeapon(true)}}]
];
const oldGain=gainXp;
gainXp=function(n){const before=level;oldGain(n);if(level>before&&!R.choice){const opts=[];while(opts.length<3){const p=perks[(Math.random()*perks.length)|0];if(!opts.includes(p))opts.push(p)}R.choice=opts;toast('★ LEVEL UP · pick one');showChoice()}};
function showChoice(){let p=document.getElementById('v12choice');if(!p){p=document.createElement('div');p.id='v12choice';p.style.cssText='position:fixed;left:8px;right:8px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:90;display:flex;gap:7px';document.body.appendChild(p)}p.innerHTML='';R.choice.forEach(x=>{const b=document.createElement('button');b.style.cssText='flex:1;min-height:72px;border:2px solid #fff8;border-radius:14px;background:#fffdf5f5;font:900 11px system-ui;padding:8px';b.innerHTML='<b style="font-size:15px">'+x[0]+'</b><br><span style="font-size:9px">'+x[1]+'</span>';b.onpointerdown=e=>{e.preventDefault();x[2]();R.choice=null;p.remove();sound('level');hud()};p.appendChild(b)})}

/* Player perk hooks. */
const oldPlayer=updatePlayer;updatePlayer=function(dt){const x=player.x,y=player.y;oldPlayer(dt);if(player.v12Speed&&player.v12Speed!==1){const dx=player.x-x,dy=player.y-y;moveBody(player,dx*(player.v12Speed-1),dy*(player.v12Speed-1),PLAYER_R)}};
const oldDamage=damageMob;damageMob=function(q,d,k){return oldDamage(q,d*(player.v12Power||1),k)};

/* ---------- VISUAL IDENTITY FOR NEW SPECIES ---------- */
const prevDraw=drawMobSprite;
drawMobSprite=function(q,t,cx,cy){const def=mobDefs[q.type];if(!def||!def.v12)return prevDraw(q,t,cx,cy);const original=q.type;q.type=def.spriteBase;prevDraw(q,t,cx,cy);q.type=original;const sx=q.x-player.x+cx,sy=q.y-player.y+cy;ctx.save();ctx.textAlign='center';ctx.font='900 8px ui-rounded,system-ui';ctx.fillStyle='#1b2130cc';ctx.fillText(def.v12Name,sx,sy-def.r-25);ctx.strokeStyle=palettes[def.v12Biome].detail;ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx,sy,def.r+6,0,Math.PI*2);ctx.stroke();ctx.restore()};

/* Reset removes legacy run-state advantages. */
const oldReset=reset;reset=function(){oldReset();R.biome=-1;R.pressure=0;R.eventT=18;R.grace=5;R.choice=null;player.v12Speed=1;player.v12Power=1;maxHp=44;hp=44;spawnShield=5;bossTimer=70};

window.__TWBB_V12_TEST__={get:()=>({version:12,biome:R.biome,biomeSpecies:E[R.biome]?.types.length||0,totalSpecies:E.reduce((s,e)=>s+e.types.length,0),hp,maxHp,mobs:mobs.length,eventIn:Math.round(R.eventT)})};
})();
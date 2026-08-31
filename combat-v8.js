'use strict';
/* v8 combat: momentum, executions, weapon masteries, danger rewards and reactive defensive play. */
(function(){
const X={version:8,momentum:0,grace:0,execution:0,killChain:0,killT:0,pulse:0};window.COMBAT_V8=X;
const mastery={sword:'Riposte',blade:'Execution',axe:'Cleave',mace:'Stagger',hammer:'Quake',spear:'Impale',glaive:'Cyclone',daggers:'Flurry',bow:'Piercing Shot',wand:'Arcane Burst',staff:'Nova',cannon:'Blast',chakram:'Ricochet',scythe:'Soul Reap',bell:'Resonance'};
const baseKill=killMob;killMob=function(q){const def=mobDefs[q.type],boss=!!def.boss;X.killChain++;X.killT=4;X.momentum=Math.min(100,X.momentum+(boss?35:q.elite?18:7));if(X.killChain===3||X.killChain===6||X.killChain===10){toast('🔥 '+X.killChain+' BONK RAMPAGE · momentum surging');hp=Math.min(maxHp,hp+Math.max(3,maxHp*.05));sound('level')}baseKill(q)};
const baseHurt=hurt;hurt=function(amount,from){const before=hp;baseHurt(amount,from);if(hp<before){X.momentum=Math.max(0,X.momentum-16);X.killChain=0;X.grace=.7}};
const baseDamage=damageMob;damageMob=function(q,dmg,kb){const def=mobDefs[q.type];let mult=1;if(q.hp/q.max<.22){mult=1.38;X.execution=.18}if(X.momentum>=75)mult*=1.16;if(def.boss&&X.momentum>=50)mult*=1.08;baseDamage(q,dmg*mult,kb*(X.momentum>=75?1.14:1));if(X.execution>0)puff(q.x,q.y,'#fff0a0',12,150)};
const baseFire=fireAttack;fireAttack=function(target){const kind=weapon.kind;baseFire(target);if(!target)return;const a=player.dir,px=player.x,py=player.y,pow=(5.2+level)*weapon.power;
 if(kind==='spear'&&Math.random()<.32){for(const q of mobs.slice())if(q!==target&&angleDelta(Math.atan2(q.y-py,q.x-px),a)<.20&&Math.hypot(q.x-px,q.y-py)<weapon.range*1.35)damageMob(q,pow*.55,weapon.kb*.5)}
 if(kind==='chakram'&&Math.random()<.28){let near=mobs.filter(q=>q!==target&&q.hp>0&&Math.hypot(q.x-target.x,q.y-target.y)<145).sort((a,b)=>Math.hypot(a.x-target.x,a.y-target.y)-Math.hypot(b.x-target.x,b.y-target.y))[0];if(near)damageMob(near,pow*.6,weapon.kb*.45)}
 if((kind==='wand'||kind==='staff'||kind==='bell')&&X.momentum>=90){for(const q of mobs.slice())if(q!==target&&Math.hypot(q.x-target.x,q.y-target.y)<105)damageMob(q,pow*.38,20);X.momentum=Math.max(55,X.momentum-18);puff(target.x,target.y,'#d8c2ff',22,190)}
 if(kind==='scythe'&&target.hp<=0)hp=Math.min(maxHp,hp+2.5);
};
/* Wider, more reliable auto targeting: combat should feel aggressive rather than hesitant. */
const baseTarget=targetForAttack;targetForAttack=function(range){let q=baseTarget(range);if(q)return q;let best=null,bd=Infinity;for(const m of mobs){const d=Math.hypot(m.x-player.x,m.y-player.y);if(d<=range&&d<bd&&lineClear(player.x,player.y,m.x,m.y)){best=m;bd=d}}return best};
function tick(dt){X.killT=Math.max(0,X.killT-dt);if(X.killT<=0)X.killChain=0;X.execution=Math.max(0,X.execution-dt);X.grace=Math.max(0,X.grace-dt);X.pulse+=dt;X.momentum=Math.max(0,X.momentum-dt*(X.momentum>70?2.4:.65));}
const prevUpdate=updatePlayer;updatePlayer=function(dt){tick(dt);prevUpdate(dt)};
/* Reward committed exploration: danger zones accelerate momentum and drops without raw stat bloat. */
const baseDrop=maybeDrop;maybeDrop=function(x,y,boss=false,elite=false){const before=drops.length;baseDrop(x,y,boss,elite);if(dangerAt(x,y)>=3&&Math.random()<.045+dangerAt(x,y)*.012&&drops.length===before)drops.push({x,y,type:'food',t:24,bob:Math.random()*6})};
function drawV8(t){if(!started||dead)return;const cx=w/2,cy=h/2;if(X.momentum>15){ctx.save();ctx.strokeStyle=X.momentum>=75?'#ffd86dcc':'#ffffff44';ctx.lineWidth=2;ctx.globalAlpha=.18+X.momentum/220;ctx.beginPath();ctx.arc(cx,cy,29+Math.sin(t*5)*2,0,Math.PI*2);ctx.stroke();ctx.restore()}if(X.killChain>=2){ctx.save();ctx.textAlign='center';ctx.font='900 10px ui-rounded,system-ui';ctx.fillStyle='#fff7c8';ctx.fillText(X.killChain+'× RAMPAGE',cx,cy-47);ctx.restore()}}
const oldDraw=draw;draw=function(t){oldDraw(t);drawV8(t)};
window.__TWBB_COMBAT_V8_TEST__={get:()=>({version:8,momentum:X.momentum,chain:X.killChain,mastery:mastery[weapon.kind]||'Bonk'})};
})();
'use strict';
/* v7 SMART ENEMY DIRECTOR — coordinated, telegraphed, role-aware enemy combat. */
(function(){
const A={version:7,enemyShots:[],signals:[],threat:0,lastCall:0};window.AI_DIRECTOR=A;
const baseAiMove=aiMove,baseUpdateMobs=updateMobs,baseUpdateShots=updateShots;
const ranged=new Set(['bee','moth','ghost','wisp','frostling','emberling','voidling','starbeast','wraithQueen']);
const tanks=new Set(['golem','treant','king','magmaToad','worldEater']);
const skirmish=new Set(['wolf','riftHound','boar','serpent','frostStag','bat']);
const support=new Set(['mushroom','shroomknight','crystalbeetle','cactus']);
function brain(q){if(q.brain)return q.brain;const p=mobDefs[q.type];q.brain={state:'seek',timer:.2+Math.random()*.8,cool:Math.random(),side:Math.random()<.5?-1:1,role:ranged.has(q.type)?'ranged':tanks.has(q.type)?'tank':skirmish.has(q.type)?'skirmish':support.has(q.type)?'support':'chaser',phase:0,targetX:0,targetY:0,confidence:.7+Math.random()*.6};return q.brain}
function norm(x,y){const d=Math.hypot(x,y)||1;return[x/d,y/d,d]}
function move(q,x,y,s,dt,r){const[nx,ny]=norm(x,y);moveBody(q,nx*s*dt,ny*s*dt,r)}
function predict(q,lead=.32){const vx=(player.vx||0)*164,vy=(player.vy||0)*164;return{x:player.x+vx*lead,y:player.y+vy*lead}}
function alliesNear(q,rad=170){let n=0;for(const o of mobs)if(o!==q&&Math.hypot(o.x-q.x,o.y-q.y)<rad)n++;return n}
function tankNear(q,rad=220){return mobs.some(o=>o!==q&&tanks.has(o.type)&&Math.hypot(o.x-q.x,o.y-q.y)<rad)}
function tele(q,t=.5,kind='strike'){q.telegraph=Math.max(q.telegraph||0,t);q.aiTelegraph=kind}
function fireEnemy(q,speed=190,damage=6,count=1,spread=.16){const p=predict(q,.28),a0=Math.atan2(p.y-q.y,p.x-q.x);for(let i=0;i<count;i++){const a=a0+(i-(count-1)/2)*spread;A.enemyShots.push({x:q.x,y:q.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,t:3,dmg:damage,kind:q.type})}sound('hurt')}
function intelligentMove(q,def,dt,dx,dy,d){const b=brain(q),tier=Math.max(def.tier||0,dangerAt(q.x,q.y));b.timer-=dt;b.cool=Math.max(0,b.cool-dt);const hpRatio=q.hp/q.max,ar=alliesNear(q),rr=def.r*.68;
 if(hpRatio<.25&&!def.boss&&!tanks.has(q.type)){b.state='retreat';b.timer=Math.max(b.timer,.7)}
 if(b.state==='retreat'){move(q,-dx,-dy,def.spd*1.22,dt,rr);if(b.timer<=0||d>270){b.state='seek';b.timer=.7}return}
 if(b.role==='ranged'){
   const ideal=145+tier*10;if(d<ideal*.68)move(q,-dx,-dy,def.spd*1.05,dt,rr);else if(d>ideal*1.25)move(q,dx,dy,def.spd*.72,dt,rr);else{const s=b.side;move(q,dx/d*.12-dy/d*s,dy/d*.12+dx/d*s,def.spd*.72,dt,rr)}
   if(b.cool<=0&&d<310&&lineClear(q.x,q.y,player.x,player.y)){tele(q,.48,'projectile');b.state='windup';b.timer=.48;b.cool=1.7-Math.min(.5,tier*.08)}
 } else if(b.role==='skirmish'){
   if(b.cool<=0&&d<210){const p=predict(q,.2);b.targetX=p.x;b.targetY=p.y;b.state='windupDash';b.timer=.42;tele(q,.42,'dash');b.cool=1.55-Math.min(.35,tier*.05)}
   else {const flank=b.side*(ar>0?1:.45);move(q,dx/d-dy/d*flank,dy/d+dx/d*flank,def.spd*.78,dt,rr)}
 } else if(b.role==='tank'){
   if(d>72)move(q,dx,dy,def.spd*(ar>1?.82:1),dt,rr);if(b.cool<=0&&d<125){b.state='slam';b.timer=.62;tele(q,.62,'slam');b.cool=2.2-Math.min(.4,tier*.05)}
 } else if(b.role==='support'){
   const protect=tankNear(q);const ideal=protect?115:80;if(d<ideal)move(q,-dx,-dy,def.spd*.72,dt,rr);else if(d>ideal+80)move(q,dx,dy,def.spd*.55,dt,rr);else move(q,-dy,dx,def.spd*.35*b.side,dt,rr);
   if(b.cool<=0&&tier>=2&&d<260){b.state='burst';b.timer=.5;tele(q,.5,'burst');b.cool=2.4}
 } else {
   const side=(Math.sin(run*1.8+q.seed)>0?1:-1)*(.22+tier*.035);move(q,dx/d-dy/d*side,dy/d+dx/d*side,def.spd,dt,rr)
 }
 if(b.state==='windup'){if(b.timer<=0){fireEnemy(q,205+tier*12,def.dmg*.72,tier>=4?3:1,.18);b.state='seek'}}
 if(b.state==='windupDash'){if(b.timer<=0){b.state='dash';b.timer=.28}}
 if(b.state==='dash'){move(q,b.targetX-q.x,b.targetY-q.y,def.spd*3.1,dt,rr);if(b.timer<=0)b.state='seek'}
 if(b.state==='slam'){if(b.timer<=0){if(d<110)hurt(def.dmg*1.25,q);puff(q.x,q.y,'#ffd9a0',16,150);screenShake=Math.max(screenShake,10);b.state='seek'}}
 if(b.state==='burst'){if(b.timer<=0){fireEnemy(q,175+tier*8,def.dmg*.55,tier>=3?5:3,.34);b.state='seek'}}
}
aiMove=function(q,def,dt,dx,dy,d){const b=brain(q);if(b.state==='windup'||b.state==='windupDash'||b.state==='slam'||b.state==='burst'){b.timer-=dt;if(b.state==='windup'&&b.timer<=0){fireEnemy(q,205+(def.tier||0)*12,def.dmg*.72,(def.tier||0)>=4?3:1,.18);b.state='seek'}else if(b.state==='windupDash'&&b.timer<=0){b.state='dash';b.timer=.28}else if(b.state==='slam'&&b.timer<=0){if(d<110)hurt(def.dmg*1.25,q);puff(q.x,q.y,'#ffd9a0',16,150);screenShake=Math.max(screenShake,10);b.state='seek'}else if(b.state==='burst'&&b.timer<=0){fireEnemy(q,175+(def.tier||0)*8,def.dmg*.55,(def.tier||0)>=3?5:3,.34);b.state='seek'}return}if(b.state==='dash'){b.timer-=dt;move(q,b.targetX-q.x,b.targetY-q.y,def.spd*3.1,dt,def.r*.68);if(b.timer<=0)b.state='seek';return}intelligentMove(q,def,dt,dx,dy,d)};
updateMobs=function(dt){baseUpdateMobs(dt);A.threat=mobs.reduce((s,q)=>s+(mobDefs[q.type].tier||0)+(mobDefs[q.type].boss?5:0),0);if(run-A.lastCall>7&&mobs.length>=5){A.lastCall=run;const pack=mobs.filter(q=>skirmish.has(q.type));if(pack.length>=3){const side=Math.random()<.5?-1:1;pack.slice(0,4).forEach((q,i)=>{const b=brain(q);b.side=i%2?side:-side;b.cool=Math.min(b.cool,.35+i*.08)})}}};
updateShots=function(dt){baseUpdateShots(dt);for(let i=A.enemyShots.length-1;i>=0;i--){const s=A.enemyShots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.t-=dt;if(blockedCircle(s.x,s.y,4)){A.enemyShots.splice(i,1);continue}if(Math.hypot(s.x-player.x,s.y-player.y)<PLAYER_R+6){hurt(s.dmg,{x:s.x-s.vx*.04,y:s.y-s.vy*.04});A.enemyShots.splice(i,1);continue}if(s.t<=0)A.enemyShots.splice(i,1)}};
A.draw=function(t,cx,cy){ctx.save();for(const s of A.enemyShots){const x=s.x-player.x+cx,y=s.y-player.y+cy;ctx.globalCompositeOperation='lighter';ctx.fillStyle=s.kind==='emberling'?'#ff9b69':s.kind==='frostling'?'#a7edff':'#d9a8ff';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over'}for(const q of mobs){const b=q.brain;if(!b)continue;const x=q.x-player.x+cx,y=q.y-player.y+cy;if(q.aiTelegraph&&q.telegraph>0){ctx.strokeStyle=q.aiTelegraph==='projectile'?'#d8a1ff':q.aiTelegraph==='dash'?'#ff8b9e':'#ffd071';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,(mobDefs[q.type].r||12)+12+Math.sin(t*10)*3,0,Math.PI*2);ctx.stroke();if(q.aiTelegraph==='dash'){const p=predict(q,.18);ctx.strokeStyle='#ff8b9e88';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(p.x-player.x+cx,p.y-player.y+cy);ctx.stroke()}}}ctx.restore()};
window.__TWBB_AI_TEST__={brain,fireEnemy,get:()=>({version:A.version,shots:A.enemyShots.length,threat:A.threat})};
})();
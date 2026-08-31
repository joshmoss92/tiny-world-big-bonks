'use strict';
/* v7 tactical enemy intelligence. Enemies read spacing, health, allies, terrain and player motion. */
(function(){
const memory=new WeakMap();
function brain(q){let b=memory.get(q);if(!b){b={state:'idle',think:0,strafe:Math.random()<.5?-1:1,confidence:.5+Math.random()*.5,windup:0,recover:0,tx:q.x,ty:q.y};memory.set(q,b)}return b}
function alliesNear(q,r){let n=0;for(const o of mobs)if(o!==q&&Math.hypot(o.x-q.x,o.y-q.y)<r)n++;return n}
function clearStep(q,vx,vy,r){const nx=q.x+vx,ny=q.y+vy;if(!blockedCircle(nx,ny,r)){moveBody(q,vx,vy,r);return true}return false}
function tacticalMove(q,def,dt,dx,dy,d){const b=brain(q),r=def.r*.66,px=player.x,py=player.y;b.think-=dt;b.recover=Math.max(0,b.recover-dt);
 if(b.think<=0){b.think=.28+Math.random()*.32;const hp=q.hp/(q.maxHp||q.hp||1),friends=alliesNear(q,125);if(hp<.28&&!def.boss&&friends<2)b.state='retreat';else if(def.ai==='charge'&&d<240)b.state='windup';else if(['strafe','orbit','phase'].includes(def.ai))b.state=d<95?'retreat':'circle';else if(def.ai==='pack')b.state=friends>=1?'flank':'pursue';else if(def.ai==='zig')b.state=d<70?'circle':'pursue';else b.state='pursue'}
 const ux=dx/d,uy=dy/d,sideX=-uy*b.strafe,sideY=ux*b.strafe;
 if(b.state==='retreat'){clearStep(q,(-ux+sideX*.28)*def.spd*dt,(-uy+sideY*.28)*def.spd*dt,r);return}
 if(b.state==='circle'){const ideal=def.ai==='orbit'?150:95,radial=d>ideal?0.42:d<ideal*.72?-.55:0;clearStep(q,(ux*radial+sideX*.88)*def.spd*dt,(uy*radial+sideY*.88)*def.spd*dt,r);return}
 if(b.state==='flank'){const leadX=player.vx*48,leadY=player.vy*48;const a=Math.atan2((py+leadY)-q.y,(px+leadX)-q.x)+b.strafe*.72;clearStep(q,Math.cos(a)*def.spd*1.05*dt,Math.sin(a)*def.spd*1.05*dt,r);return}
 if(b.state==='windup'){if(b.windup<=0){b.windup=.58;q.telegraph=.58;q.chargeDir=Math.atan2(dy+player.vy*34,dx+player.vx*34)}b.windup-=dt;if(b.windup<=0){b.state='lunge';b.recover=.5}return}
 if(b.state==='lunge'){clearStep(q,Math.cos(q.chargeDir)*def.spd*3.2*dt,Math.sin(q.chargeDir)*def.spd*3.2*dt,r);if(b.recover<=0){b.state='circle';b.think=.45}return}
 // pursue predicts the player's near-future position and bends around blocked direct paths
 const lead=Math.min(70,d*.16),tx=px+player.vx*lead,ty=py+player.vy*lead,a=Math.atan2(ty-q.y,tx-q.x);let vx=Math.cos(a)*def.spd*dt,vy=Math.sin(a)*def.spd*dt;if(!clearStep(q,vx,vy,r)){b.strafe*=-1;clearStep(q,sideX*def.spd*.85*dt,sideY*def.spd*.85*dt,r)}
}
const baseAI=aiMove;aiMove=function(q,def,dt,dx,dy,d){if(d>430&&!def.boss)return;const tier=dangerAt(q.x,q.y);if(tier===0&&run<45)return baseAI(q,def,dt,dx,dy,d);tacticalMove(q,def,dt,dx,dy,d)};
// Correct stale contact-distance behaviour after movement and reward dodging telegraphed lunges.
const baseUpdate=updateMobs;updateMobs=function(dt){baseUpdate(dt);for(const q of mobs){const b=memory.get(q);if(!b)continue;if(b.state==='lunge'&&Math.hypot(player.x-q.x,player.y-q.y)>110&&b.recover<.18){b.state='recover';b.think=.55}}};
window.ENEMY_AI_V7={brain,alliesNear,tacticalMove};
})();
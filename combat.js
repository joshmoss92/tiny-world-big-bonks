'use strict';
/* Tiny World, Big Bonks v6 — combat feel layer.
   Adds weapon identities, combo/fury, dash, crits, status effects, telegraphs and combat juice
   without changing the exploration-first control philosophy. */
(function(){
const C={combo:0,comboT:0,fury:0,dashCd:0,dashT:0,dashVX:0,dashVY:0,critFlash:0,impact:0,streakBest:0,lastTarget:null};window.COMBAT=C;
const traits={
 sword:{crit:.13,arc:1.05,combo:1.00,label:'balanced'},blade:{crit:.19,arc:1.12,combo:1.12,label:'precision'},axe:{crit:.18,arc:1.28,combo:.82,label:'cleave'},mace:{crit:.10,arc:1.18,combo:.72,label:'stagger'},hammer:{crit:.08,arc:1.34,combo:.58,label:'crush'},spear:{crit:.15,arc:.62,combo:.92,label:'reach'},glaive:{crit:.16,arc:1.05,combo:.88,label:'sweep'},daggers:{crit:.24,arc:.72,combo:1.55,label:'flurry'},bow:{crit:.17,arc:.5,combo:.92,label:'pierce'},wand:{crit:.14,arc:.7,combo:1.02,label:'magic'},staff:{crit:.16,arc:.78,combo:.92,label:'magic'},cannon:{crit:.08,arc:.9,combo:.55,label:'blast'},chakram:{crit:.18,arc:.9,combo:1.08,label:'ricochet'},scythe:{crit:.20,arc:1.55,combo:.8,label:'reap'},bell:{crit:.12,arc:1.5,combo:.8,label:'resonance'}};
function tr(){return traits[weapon.kind]||traits.sword}
function statusFor(){if(/Frost|Aurora/.test(weapon.name))return['slow',1.8];if(/Ember|Sun/.test(weapon.name))return['burn',2.2];if(/Void|Worldstar|Comet/.test(weapon.name))return['void',1.5];if(/Sakura|Heart/.test(weapon.name))return['bleed',2.0];return null}
function addCombo(n=1){C.combo=Math.min(30,C.combo+n);C.comboT=2.6;C.streakBest=Math.max(C.streakBest,C.combo);C.fury=Math.min(100,C.fury+4+n*.5)}
function critRoll(){return Math.random()<tr().crit+Math.min(.10,C.combo*.003)}
function modDamage(base,crit){const comboBoost=1+Math.min(.28,C.combo*.012),furyBoost=C.fury>=100?1.22:1;return base*comboBoost*furyBoost*(crit?1.72:1)}
function applyStatus(q){const s=statusFor();if(!s)return;q.status=s[0];q.statusT=s[1];if(s[0]==='burn')q.burnTick=.35}
const oldDamageMob=damageMob;damageMob=function(q,dmg,kb){const crit=critRoll(),amount=modDamage(dmg,crit);applyStatus(q);addCombo(crit?2:1);C.lastTarget=q;C.impact=crit?.14:.07;screenShake=Math.max(screenShake,crit?11:5);oldDamageMob(q,amount,kb*(crit?1.28:1));if(crit){puff(q.x,q.y,'#fff2a1',12,145);sound('level')}};
const oldDamageWanderer=damageWanderer;damageWanderer=function(q,dmg,kb){if(!q.hostile)return;const crit=critRoll(),amount=modDamage(dmg,crit);addCombo(crit?2:1);C.impact=crit?.14:.07;oldDamageWanderer(q,amount,kb*(crit?1.2:1));};
const oldHurt=hurt;hurt=function(amount,from){C.combo=0;C.comboT=0;C.fury=Math.max(0,C.fury-18);oldHurt(amount,from)};
const oldFire=fireAttack;fireAttack=function(target){oldFire(target);const k=weapon.kind;if(['axe','hammer','mace','glaive','scythe'].includes(k)&&target){const radius=k==='scythe'?weapon.range*1.05:weapon.range*.78;for(const q of mobs.slice()){if(q===target||q.hp<=0)continue;const d=Math.hypot(q.x-player.x,q.y-player.y);if(d<=radius&&angleDelta(Math.atan2(q.y-player.y,q.x-player.x),player.dir)<tr().arc)damageMob(q,(6.2+level*1.25)*weapon.power*(k==='hammer'?.55:.68),weapon.kb*.55)}}
 if(k==='daggers'&&target&&Math.random()<.38){setTimeout(()=>{if(started&&!dead&&target.hp>0&&Math.hypot(target.x-player.x,target.y-player.y)<weapon.range+18)damageMob(target,(4.2+level)*weapon.power,weapon.kb*.35)},85)}
 if(k==='cannon'&&target){puff(target.x,target.y,'#ffc27a',18,180);for(const q of mobs.slice()){if(q!==target&&Math.hypot(q.x-target.x,q.y-target.y)<72)damageMob(q,(4.5+level)*weapon.power,35)}}};
function dash(){if(!started||dead||C.dashCd>0)return;let x=player.vx,y=player.vy;if(Math.hypot(x,y)<.12){x=Math.cos(player.dir);y=Math.sin(player.dir)}const d=Math.hypot(x,y)||1;C.dashVX=x/d;C.dashVY=y/d;C.dashT=.17;C.dashCd=1.7;invuln=Math.max(invuln,.24);spawnShield=0;puff(player.x,player.y,'#ffffffaa',8,90);sound('loot')}
C.dash=dash;
const oldUpdatePlayer=updatePlayer;updatePlayer=function(dt){if(C.dashT>0){C.dashT-=dt;player.dir=Math.atan2(C.dashVY,C.dashVX);moveBody(player,C.dashVX*405*dt,C.dashVY*405*dt,PLAYER_R);return}oldUpdatePlayer(dt)};
const oldUpdateMobs=updateMobs;updateMobs=function(dt){oldUpdateMobs(dt);for(const q of mobs){if(!q.statusT)continue;q.statusT-=dt;if(q.status==='slow'){q.x-=0;q.hit=Math.max(q.hit,.02)}else if(q.status==='burn'){q.burnTick=(q.burnTick||.3)-dt;if(q.burnTick<=0){q.burnTick=.42;q.hp-=1.5+level*.12;puff(q.x,q.y,'#ff9a67',3,45);if(q.hp<=0)killMob(q)}}else if(q.status==='void'){q.hit=Math.max(q.hit,.04)}else if(q.status==='bleed'){q.hp-=dt*(.7+level*.08);if(q.hp<=0)killMob(q)}}};
const oldLoop=loop; // loop itself is already scheduled; wrap update via autoBonk cadence hooks instead.
const oldAuto=autoBonk;autoBonk=function(){if(C.fury>=100&&attackCd>0)attackCd=Math.max(0,attackCd-.012);oldAuto()};
function tick(dt){C.comboT=Math.max(0,C.comboT-dt);if(C.comboT<=0)C.combo=Math.max(0,C.combo-dt*7);C.dashCd=Math.max(0,C.dashCd-dt);C.impact=Math.max(0,C.impact-dt);if(C.fury>=100)C.fury=Math.max(0,C.fury-dt*8)}
const oldUpdatePlayerWrapped=updatePlayer;updatePlayer=function(dt){tick(dt);oldUpdatePlayerWrapped(dt)};
function drawCombatHUD(t){if(!started||dead)return;const x=w/2,y=h-42-(window.innerHeight<650?8:0);ctx.save();ctx.textAlign='center';ctx.font='900 11px ui-rounded,system-ui';if(C.combo>=3){ctx.fillStyle='#1f2434bb';ctx.fillRect(x-42,y-18,84,18);ctx.fillStyle=C.combo>=15?'#ffe06d':'#fff';ctx.fillText(Math.floor(C.combo)+' BONK COMBO',x,y-5)}const bw=112,bx=x-bw/2,by=y+2;ctx.fillStyle='#1c243388';ctx.fillRect(bx,by,bw,6);ctx.fillStyle=C.fury>=100?'#ffd96b':'#ef94bd';ctx.fillRect(bx,by,bw*(C.fury/100),6);if(C.fury>=100){ctx.fillStyle='#fff4b0';ctx.fillText('BONK FRENZY',x,by+19)}ctx.restore()}
C.drawHUD=drawCombatHUD;
window.addEventListener('keydown',e=>{if((e.code==='ShiftLeft'||e.code==='ShiftRight')&&!e.repeat)dash()});
window.__TWBB_COMBAT_TEST__={traits,addCombo,dash,get:()=>({combo:C.combo,fury:C.fury,dashCd:C.dashCd,weapon:weapon.name,trait:tr().label})};
})();
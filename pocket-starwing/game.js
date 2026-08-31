(() => {
  'use strict';
  const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  const $=id=>document.getElementById(id);
  const scoreEl=$('score'),hullEl=$('hull'),levelEl=$('level'),weaponEl=$('weapon');
  const overlay=$('overlay'),overlayTitle=$('overlayTitle'),overlayText=$('overlayText'),startBtn=$('startBtn'),routeChoice=$('routeChoice');
  const fireBtn=$('fireBtn'),bombBtn=$('bombBtn');
  const W=canvas.width,H=canvas.height;
  const keys=new Set(),touch={up:false,down:false,left:false,right:false};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const hit=(a,b)=>a.x-a.w/2<b.x+b.w/2&&a.x+a.w/2>b.x-b.w/2&&a.y-a.h/2<b.y+b.h/2&&a.y+a.h/2>b.y-b.h/2;

  const BIOMES={
    meadow:{name:'Cloudberry Run',sky1:'#183866',sky2:'#70b7c8',ground:'#496a58',accent:'#b6e68d'},
    canyon:{name:'Ember Canyon',sky1:'#301b36',sky2:'#d06f52',ground:'#6a3d35',accent:'#ffcf70'},
    ruins:{name:'Moonlit Ruins',sky1:'#101637',sky2:'#3e4a75',ground:'#323d59',accent:'#8ce6de'},
    storm:{name:'Thunder Reach',sky1:'#111827',sky2:'#334155',ground:'#253248',accent:'#d9ecff'},
    nebula:{name:'Candy Nebula',sky1:'#281440',sky2:'#8c4b96',ground:'#4a285c',accent:'#ffc4f4'}
  };

  const routes=[
    ['meadow','canyon'],['ruins','storm'],['nebula','canyon'],['storm','meadow'],['ruins','nebula']
  ];

  let raf=0,last=0,running=false,paused=false,state;
  let stars=[];
  for(let i=0;i<110;i++)stars.push({x:rand(0,W),y:rand(0,H),z:rand(.2,1),s:Math.random()<.8?1:2});

  const freshState=()=>({
    score:0,hull:5,maxHull:5,level:1,biome:'meadow',time:0,sectionTime:0,boss:false,bossDefeated:false,
    spawn:0,terrainSpawn:2,powerSpawn:6,combo:0,comboTimer:0,bombs:2,shield:0,shake:0,flash:0,
    player:{x:145,y:H/2,w:32,h:20,vx:0,vy:0,cool:0,inv:0,weapon:1},
    shots:[],enemyShots:[],enemies:[],terrain:[],powers:[],particles:[],bossObj:null
  });

  function reset(){state=freshState();updateHud();}
  function updateHud(){
    scoreEl.textContent=state.score.toLocaleString();
    hullEl.textContent='♥'.repeat(state.hull)+'♡'.repeat(state.maxHull-state.hull);
    levelEl.textContent=state.level;
    weaponEl.textContent='Pulse '+['I','II','III','IV'][state.player.weapon-1];
  }

  function begin(){reset();running=true;paused=false;overlay.classList.add('hidden');routeChoice.classList.add('hidden');last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);canvas.focus();}

  function shoot(){
    const p=state.player;if(!running||paused||p.cool>0)return;
    const speed=650;
    if(p.weapon===1) state.shots.push({x:p.x+18,y:p.y,vx:speed,vy:0,w:10,h:4,d:1});
    if(p.weapon===2){state.shots.push({x:p.x+18,y:p.y-5,vx:speed,vy:0,w:11,h:4,d:1},{x:p.x+18,y:p.y+5,vx:speed,vy:0,w:11,h:4,d:1});}
    if(p.weapon===3){[-.1,0,.1].forEach(a=>state.shots.push({x:p.x+18,y:p.y,vx:speed,vy:speed*a,w:12,h:4,d:1}));}
    if(p.weapon===4){[-.16,-.05,.05,.16].forEach(a=>state.shots.push({x:p.x+18,y:p.y,vx:speed,vy:speed*a,w:13,h:5,d:1}));}
    p.cool=Math.max(.075,.17-p.weapon*.02);
  }

  function bomb(){
    if(!running||paused||state.bombs<=0)return;
    state.bombs--;state.shake=20;state.flash=.25;
    state.enemyShots.length=0;
    state.enemies.forEach(e=>{e.hp-=5;if(e.hp<=0){e.dead=true;award(e.points||100)}});
    if(state.bossObj)state.bossObj.hp-=18;
  }

  function award(points){state.combo=Math.min(8,state.combo+1);state.comboTimer=2;state.score+=Math.round(points*(1+state.combo*.12));updateHud();}
  function damage(amount=1){
    const p=state.player;if(p.inv>0)return;
    if(state.shield>0){state.shield--;p.inv=.7;state.shake=8;return;}
    state.hull-=amount;p.inv=1.25;state.shake=14;state.flash=.12;updateHud();if(state.hull<=0)gameOver();
  }

  function spawnEnemy(){
    const r=Math.random();let type='scout';if(state.level>1&&r<.26)type='zig';if(state.level>2&&r<.11)type='tank';
    const spec=type==='tank'?{hp:5,w:40,h:30,v:95,pts:400,rate:1.2}:type==='zig'?{hp:2,w:27,h:19,v:145,pts:180,rate:1.7}:{hp:1,w:24,h:18,v:175,pts:100,rate:2.2};
    state.enemies.push({type,x:W+40,y:rand(60,H-60),w:spec.w,h:spec.h,hp:spec.hp,vx:-(spec.v+state.level*6),t:rand(0,5),fire:rand(.4,1.3),rate:spec.rate,points:spec.pts});
  }

  function spawnTerrain(){
    const top=Math.random()<.5,h=rand(65,150),gap=Math.random()<.25;
    state.terrain.push({x:W+60,y:top?0:H-h,w:rand(55,105),h,top,vx:-(170+state.level*7),spike:gap});
  }

  function spawnPower(){
    const roll=Math.random();const kind=roll<.25?'heal':roll<.5?'weapon':roll<.72?'shield':roll<.9?'bomb':'score';
    state.powers.push({kind,x:W+30,y:rand(80,H-80),w:22,h:22,vx:-120,t:0});
  }

  function spawnBoss(){
    state.boss=true;state.enemies=[];state.enemyShots=[];
    const hp=50+state.level*18;
    state.bossObj={x:W+120,y:H/2,w:104,h:84,hp,maxHp:hp,t:0,fire:.7,phase:0,name:['Glimmerjaw','Cinder Crown','Archive Warden','Storm Koi','Sugar Comet'][Math.min(4,state.level-1)]};
  }

  function enemyFire(e){
    const p=state.player,dx=p.x-e.x,dy=p.y-e.y,len=Math.hypot(dx,dy)||1,speed=170+state.level*9;
    state.enemyShots.push({x:e.x-12,y:e.y,vx:dx/len*speed,vy:dy/len*speed,w:8,h:8});
  }

  function bossFire(b){
    const p=state.player;
    if(b.phase%3===0){for(let i=-2;i<=2;i++){const a=Math.atan2(p.y-b.y,p.x-b.x)+i*.18;state.enemyShots.push({x:b.x-45,y:b.y,vx:Math.cos(a)*220,vy:Math.sin(a)*220,w:9,h:9});}}
    else if(b.phase%3===1){for(let i=0;i<10;i++){const a=i*Math.PI*2/10;state.enemyShots.push({x:b.x-40,y:b.y,vx:Math.cos(a)*150,vy:Math.sin(a)*150,w:8,h:8});}}
    else{[-120,-60,0,60,120].forEach(vy=>state.enemyShots.push({x:b.x-45,y:b.y,vx:-230,vy,w:10,h:10}));}
    b.phase++;
  }

  function collect(kind){
    if(kind==='heal')state.hull=Math.min(state.maxHull,state.hull+2);
    if(kind==='weapon')state.player.weapon=Math.min(4,state.player.weapon+1);
    if(kind==='shield')state.shield=Math.min(3,state.shield+2);
    if(kind==='bomb')state.bombs=Math.min(5,state.bombs+1);
    if(kind==='score')state.score+=1500;
    updateHud();
  }

  function finishLevel(){
    running=false;cancelAnimationFrame(raf);state.boss=false;state.bossDefeated=true;
    if(state.level>=5){overlayTitle.textContent='Galaxy Saved!';overlayText.textContent=`Final score: ${state.score.toLocaleString()}. You cleared all five sectors.`;startBtn.textContent='Play Again';routeChoice.classList.add('hidden');overlay.classList.remove('hidden');return;}
    const opts=routes[state.level-1];routeChoice.innerHTML='';routeChoice.classList.remove('hidden');
    opts.forEach(key=>{const b=BIOMES[key],btn=document.createElement('button');btn.textContent=`${b.name}`;btn.addEventListener('click',()=>nextLevel(key));routeChoice.appendChild(btn);});
    overlayTitle.textContent='Route Select';overlayText.textContent='Guardian destroyed. Choose the next sector.';startBtn.classList.add('hidden');overlay.classList.remove('hidden');
  }

  function nextLevel(key){
    state.level++;state.biome=key;state.sectionTime=0;state.boss=false;state.bossDefeated=false;state.bossObj=null;state.enemyShots=[];state.enemies=[];state.terrain=[];state.powers=[];state.player.x=145;state.player.y=H/2;state.player.inv=1.5;
    state.hull=Math.min(state.maxHull,state.hull+1);state.score+=1000*state.level;updateHud();
    routeChoice.classList.add('hidden');startBtn.classList.remove('hidden');overlay.classList.add('hidden');running=true;last=performance.now();raf=requestAnimationFrame(loop);canvas.focus();
  }

  function gameOver(){running=false;cancelAnimationFrame(raf);overlayTitle.textContent='Ship Lost';overlayText.textContent=`Score ${state.score.toLocaleString()} · reached sector ${state.level}.`;startBtn.textContent='Retry Mission';startBtn.classList.remove('hidden');routeChoice.classList.add('hidden');overlay.classList.remove('hidden');}

  function update(dt){
    const s=state,p=s.player;s.time+=dt;s.sectionTime+=dt;p.cool=Math.max(0,p.cool-dt);p.inv=Math.max(0,p.inv-dt);s.flash=Math.max(0,s.flash-dt);s.shake*=Math.pow(.02,dt);s.comboTimer-=dt;if(s.comboTimer<=0)s.combo=0;
    const left=keys.has('arrowleft')||keys.has('a')||touch.left,right=keys.has('arrowright')||keys.has('d')||touch.right,up=keys.has('arrowup')||keys.has('w')||touch.up,down=keys.has('arrowdown')||keys.has('s')||touch.down;
    p.vx+=((right?1:0)-(left?1:0))*900*dt;p.vy+=((down?1:0)-(up?1:0))*900*dt;const drag=Math.pow(.001,dt);p.vx*=drag;p.vy*=drag;const sp=Math.hypot(p.vx,p.vy);if(sp>300){p.vx=p.vx/sp*300;p.vy=p.vy/sp*300}p.x=clamp(p.x+p.vx*dt,36,W-190);p.y=clamp(p.y+p.vy*dt,35,H-35);
    if(keys.has(' '))shoot();
    stars.forEach(st=>{st.x-=(35+170*st.z)*dt;if(st.x<0){st.x=W;st.y=rand(0,H)}});
    if(!s.boss&&s.sectionTime>28)spawnBoss();
    if(!s.boss){s.spawn-=dt;if(s.spawn<=0){spawnEnemy();s.spawn=Math.max(.25,.95-state.level*.07)+rand(0,.45)}s.terrainSpawn-=dt;if(s.terrainSpawn<=0){spawnTerrain();s.terrainSpawn=rand(1.9,3.3)}s.powerSpawn-=dt;if(s.powerSpawn<=0){spawnPower();s.powerSpawn=rand(7,11)}}

    s.shots.forEach(o=>{o.x+=o.vx*dt;o.y+=o.vy*dt});
    s.enemies.forEach(e=>{e.x+=e.vx*dt;e.t+=dt;if(e.type==='zig')e.y+=Math.sin(e.t*5)*85*dt;e.fire-=dt;if(e.fire<=0&&e.x<W-70){enemyFire(e);e.fire=rand(.7,1.5)*e.rate}});
    s.enemyShots.forEach(o=>{o.x+=o.vx*dt;o.y+=o.vy*dt});s.terrain.forEach(o=>o.x+=o.vx*dt);s.powers.forEach(o=>{o.x+=o.vx*dt;o.t+=dt;o.y+=Math.sin(o.t*4)*16*dt});
    if(s.bossObj){const b=s.bossObj;b.t+=dt;b.x+=(W-150-b.x)*Math.min(1,dt*1.8);b.y=H/2+Math.sin(b.t*1.4)*155;b.fire-=dt;if(b.fire<=0){bossFire(b);b.fire=Math.max(.42,1.15-state.level*.08)}}

    for(const sh of s.shots){for(const e of s.enemies){if(!sh.dead&&!e.dead&&hit(sh,e)){sh.dead=true;e.hp-=sh.d;if(e.hp<=0){e.dead=true;award(e.points)}}}if(s.bossObj&&!sh.dead&&hit(sh,s.bossObj)){sh.dead=true;s.bossObj.hp-=sh.d;if(s.bossObj.hp<=0){award(5000*state.level);state.bossObj=null;finishLevel();return}}}
    for(const e of s.enemies)if(!e.dead&&hit(p,e)){e.dead=true;damage()}
    for(const sh of s.enemyShots)if(!sh.dead&&hit(p,sh)){sh.dead=true;damage()}
    for(const o of s.terrain)if(hit(p,{x:o.x+o.w/2,y:o.y+o.h/2,w:o.w,h:o.h}))damage();
    for(const pow of s.powers)if(!pow.dead&&hit(p,pow)){pow.dead=true;collect(pow.kind)}
    if(s.bossObj&&hit(p,s.bossObj))damage(2);

    s.shots=s.shots.filter(o=>!o.dead&&o.x<W+30&&o.y>-30&&o.y<H+30);s.enemies=s.enemies.filter(o=>!o.dead&&o.x>-70&&o.y>-80&&o.y<H+80);s.enemyShots=s.enemyShots.filter(o=>!o.dead&&o.x>-40&&o.x<W+40&&o.y>-40&&o.y<H+40);s.terrain=s.terrain.filter(o=>o.x+o.w>-20);s.powers=s.powers.filter(o=>!o.dead&&o.x>-40);
  }

  function drawShip(x,y){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.fillStyle='#dff8ff';ctx.fillRect(-14,-6,21,12);ctx.fillRect(-4,-12,12,24);ctx.fillStyle='#65d8ff';ctx.fillRect(-1,-5,12,10);ctx.fillStyle='#24304f';ctx.fillRect(8,-2,10,4);ctx.fillStyle='#ffd46a';ctx.fillRect(-20,-5,6,4);ctx.fillRect(-20,1,6,4);ctx.restore()}
  function drawEnemy(e){ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));ctx.fillStyle=e.type==='tank'?'#f2b96b':e.type==='zig'?'#ee9bd0':'#a9ef8c';ctx.fillRect(-e.w/2,-e.h/2,e.w*.8,e.h);ctx.fillRect(-4,-e.h/2-4,9,e.h+8);ctx.fillStyle='#23304a';ctx.fillRect(-e.w/2-5,-4,7,8);ctx.fillStyle='#fff';ctx.fillRect(1,-3,4,4);ctx.restore()}
  function drawBoss(b){ctx.save();ctx.translate(Math.round(b.x),Math.round(b.y));ctx.fillStyle='#ff9ab7';ctx.fillRect(-50,-28,72,56);ctx.fillStyle='#ffd36e';ctx.fillRect(-18,-42,32,84);ctx.fillStyle='#6de4dc';ctx.fillRect(-4,-12,34,24);ctx.fillStyle='#29304e';ctx.fillRect(-58,-10,18,20);ctx.restore();ctx.fillStyle='#111827cc';ctx.fillRect(W-330,18,300,18);ctx.fillStyle='#ff7a9c';ctx.fillRect(W-328,20,296*(b.hp/b.maxHp),14);ctx.fillStyle='#fff';ctx.font='bold 14px monospace';ctx.textAlign='right';ctx.fillText(b.name,W-30,52)}
  function powerColor(k){return({heal:'#79ec8f',weapon:'#ffe071',shield:'#73c9ff',bomb:'#ff9bd1',score:'#ffffff'})[k]}

  function draw(){
    const s=state,b=BIOMES[s.biome],sx=s.shake?(Math.random()-.5)*s.shake:0,sy=s.shake?(Math.random()-.5)*s.shake:0;ctx.save();ctx.translate(sx,sy);const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,b.sky1);g.addColorStop(1,b.sky2);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#fff';stars.forEach(st=>{ctx.globalAlpha=.2+.8*st.z;ctx.fillRect(Math.round(st.x),Math.round(st.y),st.s,st.s)});ctx.globalAlpha=1;
    ctx.fillStyle=b.ground;ctx.fillRect(0,0,W,20);ctx.fillRect(0,H-20,W,20);ctx.fillStyle=b.accent;for(let x=0;x<W;x+=64){ctx.fillRect(x,18,34,4);ctx.fillRect(x+24,H-22,34,4)}
    s.terrain.forEach(o=>{ctx.fillStyle=b.ground;ctx.fillRect(o.x,o.y,o.w,o.h);ctx.fillStyle=b.accent;for(let y=o.y+10;y<o.y+o.h-7;y+=20)ctx.fillRect(o.x+10,y,Math.max(8,o.w-25),4)});
    s.powers.forEach(o=>{ctx.fillStyle=powerColor(o.kind);ctx.fillRect(o.x-10,o.y-10,20,20);ctx.fillStyle='#111827';ctx.fillRect(o.x-3,o.y-3,6,6)});
    s.shots.forEach(o=>{ctx.fillStyle='#fff5a1';ctx.fillRect(o.x-5,o.y-2,o.w,o.h)});s.enemyShots.forEach(o=>{ctx.fillStyle='#ff7a9c';ctx.fillRect(o.x-4,o.y-4,o.w,o.h)});s.enemies.forEach(drawEnemy);
    if(s.bossObj)drawBoss(s.bossObj);if(s.player.inv<=0||Math.floor(s.player.inv*12)%2===0)drawShip(s.player.x,s.player.y);
    ctx.fillStyle='#ffffffdd';ctx.font='14px monospace';ctx.textAlign='left';ctx.fillText(BIOMES[s.biome].name,18,44);ctx.fillText('Bombs: '+s.bombs+'   Shield: '+s.shield,18,64);if(s.combo>1)ctx.fillText('Combo x'+s.combo,18,84);
    if(s.flash>0){ctx.fillStyle='#ffffff55';ctx.fillRect(0,0,W,H)}if(paused){ctx.fillStyle='#0009';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 34px monospace';ctx.textAlign='center';ctx.fillText('PAUSED',W/2,H/2)}ctx.restore();
  }

  function loop(now){if(!running)return;const dt=Math.min(.033,(now-last)/1000||0);last=now;if(!paused)update(dt);draw();if(running)raf=requestAnimationFrame(loop)}

  startBtn.addEventListener('click',()=>{startBtn.classList.remove('hidden');startBtn.textContent='Start Mission';begin()});
  canvas.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','x','p'].includes(k))e.preventDefault();if(k==='p'){paused=!paused;return}if(k==='x')bomb();keys.add(k);if(k===' ')shoot()});
  canvas.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  fireBtn.addEventListener('pointerdown',e=>{e.preventDefault();shoot()});bombBtn.addEventListener('pointerdown',e=>{e.preventDefault();bomb()});
  document.querySelectorAll('[data-move]').forEach(btn=>{const d=btn.dataset.move;const on=e=>{e.preventDefault();touch[d]=true};const off=()=>touch[d]=false;btn.addEventListener('pointerdown',on);btn.addEventListener('pointerup',off);btn.addEventListener('pointercancel',off);btn.addEventListener('pointerleave',off)});
  reset();draw();
})();

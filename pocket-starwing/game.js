(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const $ = id => document.getElementById(id);
  const scoreEl=$('score'), hullEl=$('hull'), levelEl=$('level'), weaponEl=$('weapon'), energyEl=$('energy');
  const overlay=$('overlay'), overlayTitle=$('overlayTitle'), overlayText=$('overlayText'), startBtn=$('startBtn'), routeChoice=$('routeChoice');
  const fireBtn=$('fireBtn'), bombBtn=$('bombBtn'), dodgeBtn=$('dodgeBtn');
  const W=canvas.width,H=canvas.height,TOP=30,BOTTOM=H-30;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const rectHit=(a,b)=>a.x-a.w/2<b.x+b.w/2&&a.x+a.w/2>b.x-b.w/2&&a.y-a.h/2<b.y+b.h/2&&a.y+a.h/2>b.y-b.h/2;
  const circleHit=(a,b,r=0)=>Math.hypot(a.x-b.x,a.y-b.y)<(a.r||Math.max(a.w,a.h)/2)+(b.r||Math.max(b.w,b.h)/2)+r;

  const BIOMES={
    meadow:{name:'Cloudberry Run',sky1:'#183866',sky2:'#70b7c8',ground:'#496a58',accent:'#b6e68d',hazard:'wind'},
    canyon:{name:'Ember Canyon',sky1:'#301b36',sky2:'#d06f52',ground:'#6a3d35',accent:'#ffcf70',hazard:'rocks'},
    ruins:{name:'Moonlit Ruins',sky1:'#101637',sky2:'#3e4a75',ground:'#323d59',accent:'#8ce6de',hazard:'gate'},
    storm:{name:'Thunder Reach',sky1:'#111827',sky2:'#334155',ground:'#253248',accent:'#d9ecff',hazard:'lightning'},
    nebula:{name:'Candy Nebula',sky1:'#281440',sky2:'#8c4b96',ground:'#4a285c',accent:'#ffc4f4',hazard:'gravity'}
  };
  const ROUTES=[['meadow','canyon'],['ruins','storm'],['nebula','canyon'],['storm','meadow'],['ruins','nebula']];
  const BOSSES=['Glimmerjaw','Cinder Crown','Archive Warden','Storm Koi','Sugar Comet'];
  const WEAPONS={
    pulse:{name:'Pulse Cannon',color:'#fff1a0',cool:.13,desc:'Fast, accurate all-rounder'},
    scatter:{name:'Star Scatter',color:'#ffb5e5',cool:.22,desc:'Wide spread for swarms'},
    beam:{name:'Prism Beam',color:'#8ef5ff',cool:.085,desc:'Rapid piercing line fire'},
    seeker:{name:'Firefly Seekers',color:'#b7ff8c',cool:.32,desc:'Homing shots chase agile targets'},
    nova:{name:'Nova Lance',color:'#ffd06e',cool:.42,desc:'Slow heavy shots smash armour'}
  };
  const WEAPON_ORDER=['pulse','scatter','beam','seeker','nova'];
  const keys=new Set();
  const pointer={id:null,active:false,targetX:150,targetY:H/2,grabX:0,grabY:0};
  const touch={fire:false};
  let running=false,paused=false,raf=0,last=0,state,audioCtx=null;
  const stars=Array.from({length:120},()=>({x:rand(0,W),y:rand(0,H),z:rand(.2,1),s:Math.random()<.82?1:2}));

  function freshState(){return{
    score:0,hull:6,maxHull:6,level:1,biome:'meadow',time:0,sectionTime:0,boss:false,
    combo:0,comboTimer:0,bombs:2,shield:0,energy:100,maxEnergy:100,dodgeCooldown:0,shake:0,flash:0,hitStop:0,
    director:{waveAt:1.1,terrainAt:2.8,hazardAt:6,setPieceAt:9,beat:0},
    player:{x:150,y:H/2,w:31,h:19,vx:0,vy:0,cool:0,inv:0,tilt:0,weapon:'pulse',weaponLevel:1},
    shots:[],enemyShots:[],enemies:[],terrain:[],powers:[],hazards:[],particles:[],popups:[],bossObj:null
  }};
  function reset(){state=freshState();pointer.active=false;pointer.id=null;updateHud();}
  function updateHud(){
    scoreEl.textContent=state.score.toLocaleString();
    hullEl.textContent='♥'.repeat(Math.max(0,state.hull))+'♡'.repeat(Math.max(0,state.maxHull-state.hull));
    levelEl.textContent=state.level;
    weaponEl.textContent=`${WEAPONS[state.player.weapon].name} ${'★'.repeat(state.player.weaponLevel)}`;
    energyEl.textContent=Math.round(state.energy)+'%';
  }
  function ensureAudio(){if(!audioCtx){const A=window.AudioContext||window.webkitAudioContext;if(A)audioCtx=new A()}if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume()}
  function sfx(freq,d=.05,type='square',gain=.018,slide=0){if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain(),n=audioCtx.currentTime;o.type=type;o.frequency.setValueAtTime(freq,n);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),n+d);g.gain.setValueAtTime(gain,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);o.connect(g).connect(audioCtx.destination);o.start(n);o.stop(n+d)}
  function popup(text,x,y,color='#fff'){state.popups.push({text,x,y,color,t:.85,max:.85})}
  function burst(x,y,color,count=10,speed=170){for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),v=rand(speed*.3,speed);state.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:rand(.22,.62),max:.62,color,size:Math.random()<.7?3:5})}}

  function begin(){ensureAudio();reset();running=true;paused=false;overlay.classList.add('hidden');last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);canvas.focus()}
  function toCanvasPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
  function startDrag(e){if(!running||paused||pointer.active)return;const q=toCanvasPoint(e),p=state.player;const radius=e.pointerType==='touch'?72:48;if(Math.hypot(q.x-p.x,q.y-p.y)>radius)return;e.preventDefault();ensureAudio();pointer.active=true;pointer.id=e.pointerId;pointer.targetX=p.x;pointer.targetY=p.y;pointer.grabX=q.x-p.x;pointer.grabY=q.y-p.y;canvas.setPointerCapture?.(e.pointerId);popup('DRAG',p.x,p.y-28,'#8ef5ff')}
  function moveDrag(e){if(!pointer.active||e.pointerId!==pointer.id)return;e.preventDefault();const q=toCanvasPoint(e);pointer.targetX=clamp(q.x-pointer.grabX,35,W-165);pointer.targetY=clamp(q.y-pointer.grabY,TOP+16,BOTTOM-16)}
  function endDrag(e){if(pointer.active&&e.pointerId===pointer.id){pointer.active=false;pointer.id=null;canvas.releasePointerCapture?.(e.pointerId)}}

  function makeShot(x,y,vx,vy,w,h,d,color,extra={}){state.shots.push({x,y,vx,vy,w,h,d,color,...extra})}
  function nearestTarget(x,y,max=650){let best=null,bd=max;for(const e of state.enemies){if(e.dead)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<bd){bd=d;best=e}}if(state.bossObj){const d=Math.hypot(state.bossObj.x-x,state.bossObj.y-y);if(d<bd)best=state.bossObj}return best}
  function shoot(){
    const p=state.player;if(!running||paused||p.cool>0)return;const lvl=p.weaponLevel,w=WEAPONS[p.weapon];
    if(p.weapon==='pulse'){for(let i=0;i<lvl;i++)makeShot(p.x+20,p.y+(i-(lvl-1)/2)*7,720,0,12,4,1,w.color)}
    if(p.weapon==='scatter'){const n=3+lvl*2;for(let i=0;i<n;i++){const a=(i-(n-1)/2)*.075;makeShot(p.x+18,p.y,640,640*a,10,4,.75,w.color)}}
    if(p.weapon==='beam'){makeShot(p.x+20,p.y,860,0,20+lvl*8,3+lvl,0.55,w.color,{pierce:1+lvl})}
    if(p.weapon==='seeker'){const n=1+lvl;for(let i=0;i<n;i++)makeShot(p.x+18,p.y+(i-(n-1)/2)*9,520,rand(-35,35),9,7,.8,w.color,{homing:true,turn:4.5})}
    if(p.weapon==='nova'){makeShot(p.x+22,p.y,500,0,18+lvl*4,10+lvl*2,2.7+lvl*1.2,w.color,{pierce:1,blast:30+lvl*8})}
    p.cool=Math.max(.05,w.cool-(lvl-1)*.018);sfx(p.weapon==='nova'?180:p.weapon==='beam'?950:620, .04, p.weapon==='seeker'?'sine':'square',.016,p.weapon==='nova'?-80:100)
  }
  function dodge(){const s=state,p=s.player;if(!running||paused||s.energy<32||s.dodgeCooldown>0)return;let dx=0,dy=0;if(pointer.active){dx=pointer.targetX-p.x;dy=pointer.targetY-p.y}else{dx=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0);dy=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0)}const len=Math.hypot(dx,dy)||1;if(Math.abs(dx)+Math.abs(dy)<.1)dx=1;p.vx+=(dx/len)*500;p.vy+=(dy/len)*500;p.inv=Math.max(p.inv,.48);s.energy-=32;s.dodgeCooldown=.38;s.shake=5;burst(p.x-12,p.y,'#79ecff',10,120);popup('DODGE!',p.x,p.y-28,'#79ecff');sfx(250,.09,'sawtooth',.025,650);updateHud()}
  function bomb(){if(!running||paused||state.bombs<=0)return;state.bombs--;state.enemyShots=[];state.shake=25;state.flash=.26;state.hitStop=.07;for(const e of state.enemies){e.hp-=7;if(e.hp<=0)killEnemy(e,true)}for(const o of state.terrain){if(o.destructible){o.hp-=7;if(o.hp<=0)destroyTerrain(o)}}if(state.bossObj)state.bossObj.hp-=22;burst(state.player.x,state.player.y,'#fff',34,330);popup('SCREEN CLEAR!',state.player.x+80,state.player.y-30,'#fff2a6');sfx(90,.4,'sawtooth',.05,50);updateHud()}

  function award(points,x=state.player.x,y=state.player.y){state.combo=Math.min(14,state.combo+1);state.comboTimer=3;const gain=Math.round(points*(1+state.combo*.09));state.score+=gain;popup('+'+gain,x,y,'#fff5a1');updateHud()}
  function damage(amount=1,source=null){const p=state.player;if(p.inv>0)return;if(state.shield>0){state.shield--;p.inv=.8;state.combo=0;state.shake=8;popup('SHIELD!',p.x,p.y-25,'#73c9ff');sfx(170,.12,'triangle',.03,280);updateHud();return}state.hull-=amount;state.combo=0;p.inv=1.1;state.shake=18;state.flash=.14;state.hitStop=.055;if(source){const dx=p.x-source.x,dy=p.y-source.y,l=Math.hypot(dx,dy)||1;p.vx+=(dx/l)*260-80;p.vy+=(dy/l)*260}burst(p.x,p.y,'#ff9aa9',18,230);popup('-'+amount+' HULL',p.x,p.y-28,'#ff9aa9');sfx(95,.16,'sawtooth',.04,45);updateHud();if(state.hull<=0)gameOver()}
  function graze(sh){if(sh.grazed)return;sh.grazed=true;state.energy=Math.min(100,state.energy+6);state.score+=40;state.combo=Math.min(14,state.combo+.25);state.comboTimer=Math.max(state.comboTimer,1.4);popup('GRAZE',state.player.x+20,state.player.y-18,'#8ce6de')}

  const ENEMY={
    scout:{hp:1,w:25,h:18,v:185,pts:100,rate:1.8},zig:{hp:2,w:29,h:20,v:155,pts:190,rate:1.5},diver:{hp:2,w:28,h:20,v:140,pts:240,rate:99},
    turret:{hp:4,w:34,h:26,v:126,pts:340,rate:.95},tank:{hp:7,w:45,h:32,v:100,pts:500,rate:1.15},mine:{hp:1,w:24,h:24,v:120,pts:170,rate:99},
    splitter:{hp:3,w:34,h:24,v:135,pts:300,rate:1.8},carrier:{hp:9,w:52,h:36,v:82,pts:700,rate:2.2}
  };
  function spawnEnemy(type,x,y,extra={}){const s=ENEMY[type];state.enemies.push({type,x,y,baseY:y,w:s.w,h:s.h,hp:s.hp,maxHp:s.hp,vx:-(s.v+state.level*7),t:rand(0,4),fire:rand(.45,1.15),rate:s.rate,points:s.pts,...extra})}
  function spawnWave(kind){const y=rand(95,H-95),L=state.level;
    if(kind==='line')for(let i=0;i<5;i++)spawnEnemy('scout',W+60+i*44,y+(i-2)*24);
    else if(kind==='vee')for(let i=0;i<5;i++)spawnEnemy(i===2&&L>1?'zig':'scout',W+55+i*45,y+Math.abs(i-2)*35-35);
    else if(kind==='divers'){spawnEnemy('diver',W+80,75);spawnEnemy('diver',W+150,H-75);if(L>3)spawnEnemy('diver',W+220,y)}
    else if(kind==='mines')for(let i=0;i<6;i++)spawnEnemy('mine',W+70+i*70,80+(i%3)*150,{phase:i*.7});
    else if(kind==='armour'){spawnEnemy('tank',W+80,y);spawnEnemy('turret',W+150,clamp(y-80,70,H-70));spawnEnemy('turret',W+190,clamp(y+80,70,H-70))}
    else if(kind==='split'){spawnEnemy('splitter',W+80,y);spawnEnemy('splitter',W+155,clamp(y+90,80,H-80))}
    else if(kind==='carrier'){spawnEnemy('carrier',W+100,y)}
  }
  function chooseWave(){const L=state.level,pool=['line','vee','line'];if(L>=2)pool.push('divers','mines');if(L>=3)pool.push('armour','split');if(L>=4)pool.push('carrier','mines','divers');return pool[Math.floor(Math.random()*pool.length)]}

  function spawnTunnel(style='normal'){
    const s=state,d=Math.min(1,s.level*.12+s.sectionTime/150),gap=rand(190,232)-d*22,width=rand(90,145),speed=-(176+s.level*8);let center=rand(140,H-140);if(style==='high')center=135;if(style==='low')center=H-135;const topH=Math.max(30,center-gap/2),bottomY=center+gap/2,bottomH=H-bottomY,group=Math.random().toString(36).slice(2);
    s.terrain.push({type:'wall',group,x:W+width/2+25,y:topH/2,w:width,h:topH,vx:speed,hp:999,solid:true});
    s.terrain.push({type:'wall',group,x:W+width/2+25,y:bottomY+bottomH/2,w:width,h:bottomH,vx:speed,hp:999,solid:true});
    s.hazards.push({type:'gateBonus',group,x:W+width/2+25,y:center,w:width+10,h:gap-18,vx:speed,scored:false,harmless:true});
  }
  function spawnBreakables(count=3){const speed=-(185+state.level*8);for(let i=0;i<count;i++){const r=rand(16,27);state.terrain.push({type:state.biome==='canyon'?'rock':'crystal',x:W+80+i*100,y:rand(75,H-75),w:r*2,h:r*2,r,vx:speed-rand(0,30),vy:rand(-18,18),hp:2+Math.floor(state.level/2),maxHp:4,destructible:true,solid:true,spin:rand(0,6)})}}
  function spawnSetPiece(){const b=state.biome,beat=state.director.beat++%4;if(b==='meadow'){spawnTunnel(beat%2?'high':'low');state.hazards.push({type:'wind',x:W+260,y:beat%2?H-145:145,w:260,h:120,vx:-125,force:beat%2?-115:115,t:0,harmless:true})}
    else if(b==='canyon'){spawnTunnel();spawnBreakables(4+beat%2)}
    else if(b==='ruins'){spawnTunnel();state.hazards.push({type:'movingGate',x:W+280,y:H/2,w:58,h:165,vx:-170,baseY:H/2,t:0,solid:true})}
    else if(b==='storm'){spawnTunnel(beat%2?'high':'low');for(let i=0;i<2;i++)state.hazards.push({type:'lightning',x:W+240+i*150,y:H/2,w:30,h:H-60,vx:-115,warn:1.25+i*.22,live:.42,t:0})}
    else {spawnTunnel();state.hazards.push({type:'gravity',x:W+260,y:beat%2?150:H-150,r:48,w:96,h:96,vx:-105,pull:310,t:0})}}
  function spawnHazard(){const h=BIOMES[state.biome].hazard;if(h==='rocks')spawnBreakables(3);else if(h==='wind')state.hazards.push({type:'wind',x:W+110,y:rand(110,H-110),w:230,h:rand(90,145),vx:-120,force:Math.random()<.5?-95:95,t:0,harmless:true});else if(h==='gate')state.hazards.push({type:'movingGate',x:W+100,y:rand(140,H-140),w:55,h:155,vx:-165,baseY:H/2,t:0,solid:true});else if(h==='lightning')state.hazards.push({type:'lightning',x:W+100,y:H/2,w:32,h:H-60,vx:-110,warn:1.3,live:.42,t:0});else state.hazards.push({type:'gravity',x:W+110,y:rand(110,H-110),r:46,w:92,h:92,vx:-105,pull:300,t:0})}

  function spawnPower(x=W+30,y=rand(85,H-85),forced=null,weaponType=null){const r=Math.random(),kind=forced||(r<.18?'heal':r<.52?'weapon':r<.7?'shield':r<.86?'bomb':'score');if(kind==='weapon'&&!weaponType){const unlocked=WEAPON_ORDER.slice(0,Math.min(WEAPON_ORDER.length,2+state.level));weaponType=unlocked[Math.floor(Math.random()*unlocked.length)]}state.powers.push({kind,weaponType,x,y,w:25,h:25,vx:-125,t:0})}
  function collect(pow){if(pow.kind==='heal')state.hull=Math.min(state.maxHull,state.hull+2);if(pow.kind==='shield')state.shield=Math.min(3,state.shield+2);if(pow.kind==='bomb')state.bombs=Math.min(5,state.bombs+1);if(pow.kind==='score')state.score+=1800;if(pow.kind==='weapon'){if(state.player.weapon===pow.weaponType)state.player.weaponLevel=Math.min(3,state.player.weaponLevel+1);else{state.player.weapon=pow.weaponType;state.player.weaponLevel=1}popup(WEAPONS[state.player.weapon].name,state.player.x,state.player.y-38,WEAPONS[state.player.weapon].color)}state.energy=Math.min(100,state.energy+18);burst(state.player.x,state.player.y,powerColor(pow),14,140);sfx(540,.1,'triangle',.025,600);updateHud()}
  function powerColor(p){if(p.kind==='weapon')return WEAPONS[p.weaponType||'pulse'].color;return({heal:'#79ec8f',shield:'#73c9ff',bomb:'#ff9bd1',score:'#fff'})[p.kind]||'#fff'}

  function enemyFire(e){const p=state.player,base=Math.atan2(p.y-e.y,p.x-e.x),speed=185+state.level*10,spread=e.type==='turret'?[-.16,0,.16]:e.type==='carrier'?[-.1,.1]:[0];for(const a of spread)state.enemyShots.push({x:e.x-12,y:e.y,vx:Math.cos(base+a)*speed,vy:Math.sin(base+a)*speed,w:9,h:9,grazed:false})}
  function killEnemy(e,bombKill=false){if(e.dead)return;e.dead=true;burst(e.x,e.y,e.type==='tank'||e.type==='carrier'?'#ffd27f':'#ff9bd1',e.type==='carrier'?24:12,e.type==='carrier'?250:170);award(e.points,e.x,e.y-12);if(e.type==='splitter'&&!bombKill){spawnEnemy('scout',e.x,e.y-18,{vx:-230});spawnEnemy('scout',e.x,e.y+18,{vx:-230})}if(e.type==='carrier'&&!bombKill){spawnEnemy('diver',e.x,e.y-25);spawnEnemy('diver',e.x,e.y+25);spawnPower(e.x,e.y,'weapon')}else if(!bombKill&&Math.random()<.07)spawnPower(e.x,e.y);state.hitStop=Math.max(state.hitStop,e.type==='tank'||e.type==='carrier'?.045:.02);sfx(145,.08,'square',.02,-50)}
  function destroyTerrain(o){if(o.dead)return;o.dead=true;award(180+state.level*30,o.x,o.y-10);burst(o.x,o.y,'#ffd37b',14,220);if(Math.random()<.14)spawnPower(o.x,o.y);sfx(120,.08,'square',.02,-45)}

  function spawnBoss(){state.boss=true;state.enemies=[];state.enemyShots=[];state.hazards=state.hazards.filter(h=>h.harmless);const hp=70+state.level*24;state.bossObj={x:W+140,y:H/2,w:118,h:92,hp,maxHp:hp,t:0,fire:.8,phase:0,name:BOSSES[state.level-1]};popup('WARNING',W/2,H/2-70,'#ff8ca8');sfx(110,.5,'square',.04,-20)}
  function bossFire(b){const p=state.player,ratio=b.hp/b.maxHp,phase=b.phase%(ratio<.45?4:3);if(phase===0){const base=Math.atan2(p.y-b.y,p.x-b.x);for(let i=-3;i<=3;i++){const a=base+i*.16;state.enemyShots.push({x:b.x-48,y:b.y,vx:Math.cos(a)*245,vy:Math.sin(a)*245,w:10,h:10})}}else if(phase===1){for(let i=0;i<14;i++){const a=i*Math.PI*2/14+b.t*.4;state.enemyShots.push({x:b.x-38,y:b.y,vx:Math.cos(a)*170,vy:Math.sin(a)*170,w:9,h:9})}}else if(phase===2){[-145,-85,-28,28,85,145].forEach(vy=>state.enemyShots.push({x:b.x-50,y:b.y,vx:-255,vy,w:10,h:10}))}else{for(let i=-2;i<=2;i++)state.enemyShots.push({x:b.x-50,y:clamp(p.y+i*42,45,H-45),vx:-315,vy:0,w:16,h:6})}b.phase++;sfx(140,.045,'square',.015,70)}

  function separatePlayer(o){const p=state.player,dx=p.x-o.x,dy=p.y-o.y,px=(p.w+o.w)/2-Math.abs(dx),py=(p.h+o.h)/2-Math.abs(dy);if(px<py){p.x+=dx<0?-px:px;p.vx=dx<0?-120:120}else{p.y+=dy<0?-py:py;p.vy=dy<0?-120:120}}
  function updateHazards(dt){const p=state.player;for(const h of state.hazards){h.t=(h.t||0)+dt;h.x+=(h.vx||0)*dt;if(h.type==='wind'&&rectHit(p,h)){p.vy+=h.force*dt;if(pointer.active)pointer.targetY=clamp(pointer.targetY+h.force*.18*dt,TOP+16,BOTTOM-16)}if(h.type==='movingGate'){h.y=h.baseY+Math.sin(h.t*1.8)*115;const top={x:h.x,y:(h.y-h.h/2)/2,w:h.w,h:Math.max(0,h.y-h.h/2)},bottomY=h.y+h.h/2,bottom={x:h.x,y:bottomY+(H-bottomY)/2,w:h.w,h:Math.max(0,H-bottomY)};if(rectHit(p,top)||rectHit(p,bottom))damage(1,h)}if(h.type==='lightning'){h.warn-=dt;if(h.warn<=0)h.live-=dt;if(h.warn<=0&&h.live>0&&Math.abs(p.x-h.x)<20)damage(1,h)}if(h.type==='gravity'){const dx=h.x-p.x,dy=h.y-p.y,d=Math.hypot(dx,dy)||1;if(d<220){const f=h.pull*(1-d/220);p.vx+=dx/d*f*dt;p.vy+=dy/d*f*dt;if(pointer.active){pointer.targetX+=dx/d*f*.12*dt;pointer.targetY+=dy/d*f*.12*dt}}if(d<h.r+10)damage(1,h)}if(h.type==='gateBonus'&&!h.scored&&h.x<p.x-25){h.scored=true;if(Math.abs(p.y-h.y)<h.h/2){award(400+state.level*70,p.x,p.y-35);state.energy=Math.min(100,state.energy+10);popup('THREAD THE NEEDLE!',p.x+55,p.y-35,'#b6e68d')}}}state.hazards=state.hazards.filter(h=>h.x+(h.w||h.r*2||100)>-80&&(h.type!=='lightning'||h.warn>0||h.live>0))}

  function updateDirector(){const d=state.director,t=state.sectionTime;if(!state.boss&&t>=36){spawnBoss();return}if(state.boss)return;if(t>=d.waveAt){spawnWave(chooseWave());d.waveAt=t+rand(2.2,3.2)}if(t>=d.terrainAt){spawnTunnel();d.terrainAt=t+rand(5.2,7.2)}if(t>=d.hazardAt){spawnHazard();d.hazardAt=t+rand(7,10)}if(t>=d.setPieceAt){spawnSetPiece();d.setPieceAt=t+rand(11,14)}}

  function update(dt){const s=state,p=s.player;s.time+=dt;s.sectionTime+=dt;p.cool=Math.max(0,p.cool-dt);p.inv=Math.max(0,p.inv-dt);s.flash=Math.max(0,s.flash-dt);s.dodgeCooldown=Math.max(0,s.dodgeCooldown-dt);s.energy=Math.min(100,s.energy+8*dt);s.comboTimer-=dt;if(s.comboTimer<=0)s.combo=Math.max(0,s.combo-dt*2);
    let ax=0,ay=0;if(!pointer.active){ax=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0);ay=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);p.vx+=ax*980*dt;p.vy+=ay*980*dt;const drag=Math.pow(.0012,dt);p.vx*=drag;p.vy*=drag;const sp=Math.hypot(p.vx,p.vy);if(sp>315){p.vx=p.vx/sp*315;p.vy=p.vy/sp*315}p.x+=p.vx*dt;p.y+=p.vy*dt}else{const follow=1-Math.pow(.00002,dt);const ox=p.x,oy=p.y;p.x+=(pointer.targetX-p.x)*follow;p.y+=(pointer.targetY-p.y)*follow;p.vx=(p.x-ox)/Math.max(dt,.001);p.vy=(p.y-oy)/Math.max(dt,.001)}p.x=clamp(p.x,35,W-165);p.y=clamp(p.y,TOP+15,BOTTOM-15);p.tilt=clamp(p.vy/230,-1,1);
    if(keys.has(' ')||touch.fire)shoot();stars.forEach(st=>{st.x-=(35+180*st.z)*dt;if(st.x<0){st.x=W;st.y=rand(0,H)}});updateDirector();
    for(const sh of s.shots){if(sh.homing){const t=nearestTarget(sh.x,sh.y);if(t){const desired=Math.atan2(t.y-sh.y,t.x-sh.x),current=Math.atan2(sh.vy,sh.vx);let diff=((desired-current+Math.PI*3)%(Math.PI*2))-Math.PI;const a=current+clamp(diff,-sh.turn*dt,sh.turn*dt),speed=Math.hypot(sh.vx,sh.vy);sh.vx=Math.cos(a)*speed;sh.vy=Math.sin(a)*speed}}sh.x+=sh.vx*dt;sh.y+=sh.vy*dt}
    for(const e of s.enemies){e.t+=dt;e.x+=e.vx*dt;if(e.type==='zig')e.y=e.baseY+Math.sin(e.t*5)*72;if(e.type==='diver'){const dx=p.x-e.x,dy=p.y-e.y,l=Math.hypot(dx,dy)||1;e.vx+=dx/l*65*dt;e.y+=dy/l*140*dt}if(e.type==='mine'){e.y=e.baseY+Math.sin(e.t*2.6+(e.phase||0))*40;if(e.x<p.x+230&&e.x>p.x+80)e.vx=-75}if(e.type==='carrier'&&Math.floor(e.t*1.2)!==Math.floor((e.t-dt)*1.2)&&e.x<W-100&&Math.random()<.35)spawnEnemy('scout',e.x-25,e.y+rand(-25,25),{vx:-240});e.fire-=dt;if(e.fire<=0&&e.x<W-60&&!['diver','mine'].includes(e.type)){enemyFire(e);e.fire=rand(.75,1.35)*e.rate}}
    for(const sh of s.enemyShots){sh.x+=sh.vx*dt;sh.y+=sh.vy*dt}for(const o of s.terrain){o.x+=o.vx*dt;if(o.vy)o.y+=o.vy*dt;o.spin=(o.spin||0)+dt}for(const pow of s.powers){pow.x+=pow.vx*dt;pow.t+=dt;pow.y+=Math.sin(pow.t*4)*14*dt}updateHazards(dt);
    if(s.bossObj){const b=s.bossObj;b.t+=dt;b.x+=(W-155-b.x)*Math.min(1,dt*1.8);b.y=H/2+Math.sin(b.t*1.35)*145;b.fire-=dt;if(b.fire<=0){bossFire(b);b.fire=Math.max(.34,1-state.level*.07-(b.hp/b.maxHp<.45?.22:0))}}

    for(const sh of s.shots){for(const e of s.enemies){if(sh.dead||e.dead||!rectHit(sh,e))continue;e.hp-=sh.d;burst(sh.x,sh.y,sh.color,3,70);if(sh.blast&&e.hp<=0){for(const other of s.enemies)if(!other.dead&&Math.hypot(other.x-e.x,other.y-e.y)<sh.blast)other.hp-=sh.d*.6}if(!sh.pierce||--sh.pierce<0)sh.dead=true;if(e.hp<=0)killEnemy(e)}for(const o of s.terrain){if(sh.dead||o.dead||!o.destructible)continue;const h=o.r?circleHit(sh,o,-5):rectHit(sh,o);if(h){o.hp-=sh.d;if(!sh.pierce||--sh.pierce<0)sh.dead=true;if(o.hp<=0)destroyTerrain(o)}}if(s.bossObj&&!sh.dead&&rectHit(sh,s.bossObj)){s.bossObj.hp-=sh.d;if(!sh.pierce||--sh.pierce<0)sh.dead=true;if(s.bossObj.hp<=0){award(5500*state.level,s.bossObj.x,s.bossObj.y);burst(s.bossObj.x,s.bossObj.y,'#fff',55,350);s.bossObj=null;finishLevel();return}}}
    for(const e of s.enemies)if(!e.dead&&rectHit(p,e)){e.dead=true;damage(e.type==='tank'||e.type==='carrier'?2:1,e)}
    for(const sh of s.enemyShots){if(sh.dead)continue;if(rectHit(p,sh)){sh.dead=true;damage(1,sh)}else{const d=Math.hypot(p.x-sh.x,p.y-sh.y);if(d<28&&d>13)graze(sh)}}
    for(const o of s.terrain){if(o.dead||!o.solid)continue;const hit=o.r?circleHit(p,o,-4):rectHit(p,o);if(hit){if(!o.r)separatePlayer(o);damage(1,o)}}
    for(const pow of s.powers)if(!pow.dead&&rectHit(p,pow)){pow.dead=true;collect(pow)}if(s.bossObj&&rectHit(p,s.bossObj))damage(2,s.bossObj);
    for(const q of s.particles){q.t-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=Math.pow(.05,dt);q.vy*=Math.pow(.05,dt)}for(const q of s.popups){q.t-=dt;q.y-=28*dt}
    s.shots=s.shots.filter(o=>!o.dead&&o.x<W+70&&o.y>-60&&o.y<H+60);s.enemies=s.enemies.filter(o=>!o.dead&&o.x>-100&&o.y>-120&&o.y<H+120);s.enemyShots=s.enemyShots.filter(o=>!o.dead&&o.x>-60&&o.x<W+60&&o.y>-60&&o.y<H+60);s.terrain=s.terrain.filter(o=>!o.dead&&o.x+(o.w||40)/2>-70);s.powers=s.powers.filter(o=>!o.dead&&o.x>-60);s.particles=s.particles.filter(o=>o.t>0);s.popups=s.popups.filter(o=>o.t>0);updateHud()
  }

  function finishLevel(){running=false;cancelAnimationFrame(raf);state.boss=false;if(state.level>=5){overlayTitle.textContent='Galaxy Saved!';overlayText.textContent=`Final score ${state.score.toLocaleString()}. Five sectors cleared.`;routeChoice.classList.add('hidden');startBtn.classList.remove('hidden');startBtn.textContent='Play Again';overlay.classList.remove('hidden');return}const opts=ROUTES[state.level-1];routeChoice.innerHTML='';routeChoice.classList.remove('hidden');for(const key of opts){const btn=document.createElement('button');btn.innerHTML=`<strong>${BIOMES[key].name}</strong><small>${routeFlavor(key)}</small>`;btn.addEventListener('click',()=>nextLevel(key));routeChoice.appendChild(btn)}overlayTitle.textContent='Choose Your Route';overlayText.textContent='New sectors introduce different hazards, enemy mixes and weapon drops.';startBtn.classList.add('hidden');overlay.classList.remove('hidden')}
  function routeFlavor(k){return({meadow:'Wind lanes · fast formations',canyon:'Asteroids · armoured enemies',ruins:'Moving gates · turrets',storm:'Lightning · aggressive divers',nebula:'Gravity wells · mines & seekers'})[k]}
  function nextLevel(key){state.level++;state.biome=key;state.sectionTime=0;state.boss=false;state.bossObj=null;state.enemyShots=[];state.enemies=[];state.terrain=[];state.hazards=[];state.powers=[];state.director={waveAt:1.1,terrainAt:2.6,hazardAt:5,setPieceAt:8,beat:0};state.player.x=150;state.player.y=H/2;state.player.inv=1.4;state.hull=Math.min(state.maxHull,state.hull+1);state.score+=1000*state.level;spawnPower(W+100,H/2,'weapon',WEAPON_ORDER[Math.min(WEAPON_ORDER.length-1,state.level)]);routeChoice.classList.add('hidden');startBtn.classList.remove('hidden');overlay.classList.add('hidden');running=true;last=performance.now();raf=requestAnimationFrame(loop);updateHud()}
  function gameOver(){running=false;pointer.active=false;cancelAnimationFrame(raf);overlayTitle.textContent='Ship Lost';overlayText.textContent=`Score ${state.score.toLocaleString()} · reached sector ${state.level}.`;startBtn.textContent='Retry Mission';startBtn.classList.remove('hidden');routeChoice.classList.add('hidden');overlay.classList.remove('hidden')}

  function drawShip(){const p=state.player;ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.rotate(p.tilt*.13);ctx.fillStyle='#dff8ff';ctx.fillRect(-14,-6,21,12);ctx.fillRect(-4,-12,12,24);ctx.fillStyle='#65d8ff';ctx.fillRect(-1,-5,12,10);ctx.fillStyle='#24304f';ctx.fillRect(8,-2,10,4);ctx.fillStyle='#ffd46a';const flame=5+Math.floor(Math.random()*5);ctx.fillRect(-20-flame,-5,6+flame,4);ctx.fillRect(-20-flame,1,6+flame,4);if(state.shield>0){ctx.strokeStyle='#73c9ff';ctx.lineWidth=2;ctx.strokeRect(-24,-17,49,34)}if(pointer.active){ctx.strokeStyle='#fff';ctx.globalAlpha=.75;ctx.strokeRect(-27,-20,54,40)}ctx.restore()}
  function drawEnemy(e){ctx.save();ctx.translate(Math.round(e.x),Math.round(e.y));const colors={scout:'#a9ef8c',zig:'#ee9bd0',diver:'#ff7f8e',turret:'#8ce6de',tank:'#f2b96b',mine:'#ffca6e',splitter:'#c7a8ff',carrier:'#f6a86b'};ctx.fillStyle=colors[e.type]||'#fff';if(e.type==='mine'){ctx.rotate(e.t);ctx.fillRect(-10,-10,20,20);ctx.fillStyle='#fff';ctx.fillRect(-3,-3,6,6)}else{ctx.fillRect(-e.w/2,-e.h/2,e.w*.8,e.h);ctx.fillRect(-4,-e.h/2-4,9,e.h+8);ctx.fillStyle='#23304a';ctx.fillRect(-e.w/2-5,-4,7,8);ctx.fillStyle='#fff';ctx.fillRect(1,-3,4,4)}ctx.restore()}
  function drawTerrain(o,b){ctx.save();if(o.type==='wall'){ctx.fillStyle=b.ground;ctx.fillRect(o.x-o.w/2,o.y-o.h/2,o.w,o.h);ctx.fillStyle=b.accent;for(let y=o.y-o.h/2+12;y<o.y+o.h/2-8;y+=22)ctx.fillRect(o.x-o.w/2+10,y,Math.max(8,o.w-25),4)}else{ctx.translate(o.x,o.y);ctx.rotate((o.spin||0)*.8);ctx.fillStyle=o.type==='crystal'?b.accent:'#a06f51';ctx.fillRect(-o.w/2,-o.h/2,o.w,o.h);ctx.fillStyle='#ffffff55';ctx.fillRect(-o.w/5,-o.h/2,Math.max(3,o.w/5),o.h/2)}ctx.restore()}
  function drawHazard(h,b){ctx.save();if(h.type==='wind'){ctx.globalAlpha=.22;ctx.fillStyle=b.accent;ctx.fillRect(h.x-h.w/2,h.y-h.h/2,h.w,h.h);ctx.globalAlpha=.8;ctx.strokeStyle=b.accent;for(let y=h.y-h.h/2+15;y<h.y+h.h/2;y+=22){ctx.beginPath();ctx.moveTo(h.x-h.w/2+15,y);ctx.lineTo(h.x+h.w/2-15,y+Math.sign(h.force)*10);ctx.stroke()}}else if(h.type==='movingGate'){ctx.fillStyle=b.ground;const topH=Math.max(0,h.y-h.h/2),bottomY=h.y+h.h/2;ctx.fillRect(h.x-h.w/2,0,h.w,topH);ctx.fillRect(h.x-h.w/2,bottomY,h.w,H-bottomY);ctx.fillStyle=b.accent;ctx.fillRect(h.x-h.w/2,topH-6,h.w,6);ctx.fillRect(h.x-h.w/2,bottomY,h.w,6)}else if(h.type==='lightning'){if(h.warn>0){ctx.globalAlpha=.35+Math.sin(h.t*20)*.2;ctx.fillStyle='#fff1a0';ctx.fillRect(h.x-18,TOP,36,BOTTOM-TOP)}else if(h.live>0){ctx.fillStyle='#fff';ctx.fillRect(h.x-13,TOP,26,BOTTOM-TOP);ctx.fillStyle='#9ee9ff';ctx.fillRect(h.x-7,TOP,14,BOTTOM-TOP)}}else if(h.type==='gravity'){const pulse=1+Math.sin(h.t*4)*.08;ctx.translate(h.x,h.y);ctx.fillStyle='#11162f';ctx.beginPath();ctx.arc(0,0,h.r*pulse,0,Math.PI*2);ctx.fill();ctx.strokeStyle=b.accent;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,h.r*1.35,h.t,h.t+Math.PI*1.4);ctx.stroke()}ctx.restore()}
  function drawBoss(b){ctx.save();ctx.translate(b.x,b.y);const rage=b.hp/b.maxHp<.45;ctx.fillStyle=rage?'#ff6d87':'#ff9ab7';ctx.fillRect(-52,-30,74,60);ctx.fillStyle='#ffd36e';ctx.fillRect(-18,-44,32,88);ctx.fillStyle='#6de4dc';ctx.fillRect(-4,-12,36,24);ctx.restore();ctx.fillStyle='#111827cc';ctx.fillRect(W-350,18,320,18);ctx.fillStyle=rage?'#ff5575':'#ff7a9c';ctx.fillRect(W-348,20,316*(b.hp/b.maxHp),14);ctx.fillStyle='#fff';ctx.font='bold 14px monospace';ctx.textAlign='right';ctx.fillText(b.name+(rage?' · RAGE':''),W-30,52)}
  function draw(){const s=state,b=BIOMES[s.biome],sx=s.shake?(Math.random()-.5)*s.shake:0,sy=s.shake?(Math.random()-.5)*s.shake:0;s.shake*=.88;ctx.save();ctx.translate(sx,sy);const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,b.sky1);g.addColorStop(1,b.sky2);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';for(const st of stars){ctx.globalAlpha=.2+.8*st.z;ctx.fillRect(st.x,st.y,st.s,st.s)}ctx.globalAlpha=1;ctx.fillStyle=b.ground;ctx.fillRect(0,0,W,TOP);ctx.fillRect(0,BOTTOM,W,H-BOTTOM);ctx.fillStyle=b.accent;for(let x=-((s.time*150)%64);x<W;x+=64){ctx.fillRect(x,TOP-5,34,4);ctx.fillRect(x+24,BOTTOM+1,34,4)}for(const h of s.hazards)drawHazard(h,b);for(const o of s.terrain)drawTerrain(o,b);for(const pow of s.powers){const c=powerColor(pow),pulse=1+Math.sin(pow.t*6)*.12;ctx.save();ctx.translate(pow.x,pow.y);ctx.scale(pulse,pulse);ctx.fillStyle=c;ctx.fillRect(-11,-11,22,22);ctx.fillStyle='#10162a';ctx.fillRect(-3,-3,6,6);if(pow.kind==='weapon'){ctx.fillStyle='#fff';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText((WEAPONS[pow.weaponType].name.split(' ')[0]||'W')[0],0,4)}ctx.restore()}for(const sh of s.shots){ctx.fillStyle=sh.color;ctx.fillRect(sh.x-sh.w/2,sh.y-sh.h/2,sh.w,sh.h)}for(const sh of s.enemyShots){ctx.fillStyle=sh.grazed?'#ffb0c1':'#ff6f93';ctx.fillRect(sh.x-sh.w/2,sh.y-sh.h/2,sh.w,sh.h)}for(const e of s.enemies)drawEnemy(e);if(s.bossObj)drawBoss(s.bossObj);for(const q of s.particles){ctx.globalAlpha=clamp(q.t/q.max,0,1);ctx.fillStyle=q.color;ctx.fillRect(q.x-q.size/2,q.y-q.size/2,q.size,q.size)}ctx.globalAlpha=1;if(s.player.inv<=0||Math.floor(s.player.inv*16)%2===0)drawShip();ctx.fillStyle='#ffffffdd';ctx.font='14px monospace';ctx.textAlign='left';ctx.fillText(b.name,18,50);ctx.fillText('Bombs: '+s.bombs+'   Shield: '+s.shield,18,70);ctx.fillText(WEAPONS[s.player.weapon].name+' ★'.repeat(s.player.weaponLevel),18,90);if(s.combo>=1)ctx.fillText('Combo x'+(1+s.combo*.09).toFixed(1),18,110);ctx.fillStyle='#111827aa';ctx.fillRect(18,122,150,9);ctx.fillStyle=s.energy>=32?'#70e6ff':'#ff9a9a';ctx.fillRect(20,124,146*s.energy/100,5);ctx.fillStyle='#fff';ctx.font='11px monospace';ctx.fillText('DODGE ENERGY',18,145);if(!pointer.active&&running){ctx.globalAlpha=.7;ctx.strokeStyle='#fff';ctx.strokeRect(s.player.x-26,s.player.y-19,52,38);ctx.font='11px monospace';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText('HOLD + DRAG SHIP',s.player.x+5,s.player.y+35);ctx.globalAlpha=1}for(const q of s.popups){ctx.globalAlpha=clamp(q.t/q.max,0,1);ctx.fillStyle=q.color;ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText(q.text,q.x,q.y)}ctx.globalAlpha=1;if(s.flash>0){ctx.fillStyle='#ffffff55';ctx.fillRect(0,0,W,H)}if(paused){ctx.fillStyle='#0009';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 34px monospace';ctx.textAlign='center';ctx.fillText('PAUSED',W/2,H/2)}ctx.restore()}
  function loop(now){if(!running)return;const dt=Math.min(.033,(now-last)/1000||0);last=now;if(!paused){if(state.hitStop>0)state.hitStop-=dt;else update(dt)}draw();if(running)raf=requestAnimationFrame(loop)}

  startBtn.addEventListener('click',()=>{startBtn.textContent='Start Mission';startBtn.classList.remove('hidden');begin()});
  canvas.addEventListener('pointerdown',startDrag);canvas.addEventListener('pointermove',moveDrag);canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
  canvas.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','x','p','shift','c'].includes(k))e.preventDefault();if(k==='p'){paused=!paused;return}if(k==='x')bomb();if(k==='shift'||k==='c')dodge();keys.add(k);if(k===' ')shoot()});canvas.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  fireBtn.addEventListener('pointerdown',e=>{e.preventDefault();ensureAudio();touch.fire=true;canvas.focus()});['pointerup','pointercancel','pointerleave'].forEach(ev=>fireBtn.addEventListener(ev,()=>touch.fire=false));bombBtn.addEventListener('pointerdown',e=>{e.preventDefault();ensureAudio();bomb();canvas.focus()});dodgeBtn.addEventListener('pointerdown',e=>{e.preventDefault();ensureAudio();dodge();canvas.focus()});
  reset();draw();
})();

'use strict';
const WORLD_SEED=731927,TILE=48,PLAYER_R=11,MAX_MOBS=24;
const c=document.getElementById('g'),ctx=c.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=false;
let DPR=Math.min(2,window.devicePixelRatio||1),w=0,h=0,last=performance.now(),started=false,dead=false;
let player,mobs=[],drops=[],landmarks=[],particles=[],shots=[],run=0,kills=0,relics=0,level=1,xp=0,xpNeed=5,maxHp=45,hp=45,invuln=0,attackCd=0,regenDelay=0,spawnShield=0,screenShake=0,bossTimer=0,regionCount=0,lastRegionKey='',tutorialStep=0;
const keys={}, discovered=new Set(); let holdAttack=false,audioOn=true,audioCtx=null,toastTimer=0;
const rarity=['Common','Uncommon','Rare','Epic','Legendary'];
const weapons=[
{name:'Twig Sword',rarity:0,power:1,range:64,cd:.38,kb:25,type:'melee',kind:'sword'},
{name:'Iron Sword',rarity:1,power:1.45,range:69,cd:.34,kb:29,type:'melee',kind:'sword'},
{name:'Pink Spear',rarity:2,power:1.72,range:98,cd:.46,kb:34,type:'melee',kind:'spear'},
{name:'Moon Bow',rarity:2,power:1.52,range:305,cd:.48,kb:16,type:'ranged',kind:'bow'},
{name:'Bonk Hammer',rarity:3,power:2.45,range:75,cd:.72,kb:67,type:'melee',kind:'hammer'},
{name:'Star Wand',rarity:3,power:1.72,range:285,cd:.55,kb:19,type:'ranged',kind:'wand'},
{name:'Sakura Blade',rarity:4,power:3.15,range:80,cd:.30,kb:38,type:'melee',kind:'blade'},
{name:'Comet Wand',rarity:4,power:2.72,range:345,cd:.44,kb:30,type:'ranged',kind:'wand'}];
let weapon=weapons[0];
const mobDefs={
slime:{hp:13,spd:35,dmg:5,xp:1,r:13,ai:'chase'},pink:{hp:16,spd:38,dmg:6,xp:1,r:14,ai:'chase'},bee:{hp:10,spd:62,dmg:5,xp:1,r:11,ai:'zig'},
boar:{hp:25,spd:45,dmg:8,xp:2,r:16,ai:'charge'},mushroom:{hp:19,spd:30,dmg:7,xp:2,r:14,ai:'chase'},ghost:{hp:22,spd:48,dmg:7,xp:2,r:15,ai:'phase'},
bat:{hp:13,spd:69,dmg:6,xp:1,r:11,ai:'zig'},frog:{hp:17,spd:42,dmg:6,xp:1,r:12,ai:'hop'},crab:{hp:25,spd:34,dmg:8,xp:2,r:15,ai:'strafe'},
wisp:{hp:14,spd:56,dmg:6,xp:2,r:10,ai:'orbit'},skeleton:{hp:31,spd:41,dmg:9,xp:3,r:15,ai:'chase'},cactus:{hp:32,spd:26,dmg:10,xp:3,r:16,ai:'chase'},king:{hp:165,spd:31,dmg:12,xp:12,r:28,ai:'boss'}};
const landmarkDefs=[
{name:'Ancient Ruins',kind:'ruins',text:'Old magic sparks beneath the stones.'},{name:'Fairy Grove',kind:'grove',text:'Tiny lights mend your wounds.'},{name:'Moon Obelisk',kind:'obelisk',text:'Moonlight fills you with resolve.'},{name:'Starfall Crater',kind:'crater',text:'A star left something valuable behind.'},
{name:'Elder Tree',kind:'elder',text:'The old tree makes you tougher.'},{name:'Hidden Spring',kind:'spring',text:'Cold water restores you completely.'},{name:'Lost Camp',kind:'camp',text:'Someone abandoned useful supplies.'},{name:'Forgotten Vault',kind:'vault',text:'A sealed cache cracks open.'}];
const biomeNames=['Meadow','Blossom Woods','Moon Fields','Misty Marsh','Emberlands','Frostvale'];
const palettes=[
{a:'#cde7aa',b:'#c4dda1',edge:'#9dc985',tree:'#6d9b5f',detail:'#f2a8c4',water:'#88ccdf'},
{a:'#e9cbd9',b:'#e2bfd1',edge:'#c99fb6',tree:'#8c7195',detail:'#fff0a6',water:'#a7d5e3'},
{a:'#b7d6c5',b:'#adccbc',edge:'#8ab39f',tree:'#638a7b',detail:'#bfa9e9',water:'#8bc9d7'},
{a:'#a8c6b5',b:'#9ebaaa',edge:'#819f90',tree:'#617a70',detail:'#83d1e1',water:'#78b7c9'},
{a:'#e6b19b',b:'#dca28c',edge:'#c18471',tree:'#876456',detail:'#ffd083',water:'#a8a0aa'},
{a:'#d7eaf0',b:'#cde2e9',edge:'#abcbd7',tree:'#7697a1',detail:'#a6c5ee',water:'#a8d5e5'}];
function resize(){w=innerWidth;h=innerHeight;c.width=Math.floor(w*DPR);c.height=Math.floor(h*DPR);c.style.width=w+'px';c.style.height=h+'px';ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=false} addEventListener('resize',resize,{passive:true});resize();
function hash(a,b,s=0){let n=Math.sin((a+WORLD_SEED*.001)*127.1+(b-WORLD_SEED*.002)*311.7+s*74.7)*43758.5453123;return n-Math.floor(n)}
function noise(x,y,s=0){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,sm=t=>t*t*(3-2*t),ux=sm(fx),uy=sm(fy),a=hash(ix,iy,s),b=hash(ix+1,iy,s),d=hash(ix,iy+1,s),e=hash(ix+1,iy+1,s);return a+(b-a)*ux+((d+(e-d)*ux)-(a+(b-a)*ux))*uy}
function biomeAtWorld(x,y){const n=noise(x/720,y/720,8);return n<.15?3:n<.29?5:n<.48?0:n<.66?1:n<.83?2:4}
function terrainAt(tx,ty){if(Math.abs(tx)<=2&&Math.abs(ty)<=2)return 'grass';const wx=tx*TILE,wy=ty*TILE,b=biomeAtWorld(wx,wy),large=noise(tx/5.2,ty/5.2,13),small=hash(tx,ty,2),path=noise(tx/14,ty/14,21);if(large<.105 && path>.27)return 'water';if(small>.948)return b===4?'rock':b===5?'pine':'tree';if(b===2&&small>.912)return'crystal';if(small>.875)return'flower';return'grass'}
function colliderForTile(tx,ty){const t=terrainAt(tx,ty),x=tx*TILE,y=ty*TILE;if(t==='water')return{x,y,w:TILE,h:TILE,type:'rect'};if(t==='tree'||t==='pine')return{x:x+17,y:y+24,w:14,h:20,type:'rect'};if(t==='rock')return{x:x+10,y:y+16,w:28,h:24,type:'rect'};if(t==='crystal')return{x:x+14,y:y+11,w:20,h:28,type:'rect'};return null}
function circleRect(cx,cy,r,box){const nx=Math.max(box.x,Math.min(cx,box.x+box.w)),ny=Math.max(box.y,Math.min(cy,box.y+box.h)),dx=cx-nx,dy=cy-ny;return dx*dx+dy*dy<r*r}
function blockedCircle(x,y,r=PLAYER_R){const minTx=Math.floor((x-r)/TILE),maxTx=Math.floor((x+r)/TILE),minTy=Math.floor((y-r)/TILE),maxTy=Math.floor((y+r)/TILE);for(let ty=minTy;ty<=maxTy;ty++)for(let tx=minTx;tx<=maxTx;tx++){const box=colliderForTile(tx,ty);if(box&&circleRect(x,y,r,box))return true}return false}
function moveBody(body,dx,dy,r){const dist=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(dist/5));dx/=steps;dy/=steps;for(let i=0;i<steps;i++){const nx=body.x+dx;if(!blockedCircle(nx,body.y,r))body.x=nx;const ny=body.y+dy;if(!blockedCircle(body.x,ny,r))body.y=ny}return body}
function lineClear(ax,ay,bx,by){const d=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.ceil(d/12));for(let i=1;i<n;i++){const t=i/n;if(blockedCircle(ax+(bx-ax)*t,ay+(by-ay)*t,4))return false}return true}
function toast(text){const el=document.getElementById('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1450)}
function sound(type){if(!audioOn)return;try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();const now=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();let f=type==='hurt'?105:type==='loot'?610:type==='level'?490:type==='discover'?720:type==='boss'?82:190;o.type=type==='hurt'||type==='boss'?'sawtooth':'square';o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(65,f*(type==='loot'||type==='discover'?1.45:.68)),now+.1);g.gain.setValueAtTime(.035,now);g.gain.exponentialRampToValueAtTime(.001,now+.13);o.connect(g);g.connect(audioCtx.destination);o.start(now);o.stop(now+.14)}catch(_){}}
function puff(x,y,col,n=6,speed=95){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=Math.random()*speed;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:.28+Math.random()*.28,col,size:2+Math.random()*2})}}
function hud(){document.getElementById('hp').textContent=Math.max(0,Math.ceil(hp));document.getElementById('maxhp').textContent=maxHp;document.getElementById('lv').textContent=level;document.getElementById('xp').textContent=xp+'/'+xpNeed;document.getElementById('wp').textContent=rarity[weapon.rarity]+' · '+weapon.name;document.getElementById('relic').textContent=relics;document.getElementById('hpfill').style.width=Math.max(0,hp/maxHp*100)+'%'}
function safeSpawnAround(x,y,minD=280,maxD=650){for(let tries=0;tries<24;tries++){const a=Math.random()*Math.PI*2,d=minD+Math.random()*(maxD-minD),sx=x+Math.cos(a)*d,sy=y+Math.sin(a)*d;if(!blockedCircle(sx,sy,22))return{x:sx,y:sy}}return{x:x+maxD,y}}
function spawnMob(forceType,near=false){if(mobs.length>=MAX_MOBS)return;const pt=safeSpawnAround(player.x,player.y,near?180:310,near?330:680),dist=Math.hypot(pt.x,pt.y),danger=Math.min(1,run/190+dist/6200);let list=danger>.72?['skeleton','cactus','ghost','boar','wisp']:danger>.36?['boar','mushroom','ghost','bat','frog','crab','wisp']:['slime','pink','bee','frog','bat'];const type=forceType||list[(Math.random()*list.length)|0],def=mobDefs[type],scale=type==='king'?1:1+Math.min(.55,run/500+dist/11000);mobs.push({x:pt.x,y:pt.y,type,hp:def.hp*scale,max:def.hp*scale,ph:Math.random()*6.28,hit:0,contact:0,charge:0,chargeDir:0,seed:Math.random()*8,hop:Math.random()})}
function landmarkForCell(cx,cy){const r=hash(cx,cy,51);if(r<.56)return null;const x=(cx+.18+hash(cx,cy,52)*.64)*820,y=(cy+.18+hash(cx,cy,53)*.64)*820;if(blockedCircle(x,y,34))return null;const far=Math.hypot(x,y),roll=hash(cx,cy,54);let type=Math.floor(roll*landmarkDefs.length);if(far<1000&&(type===7||type===3))type=type%6;return{id:cx+','+cy,x,y,type,found:discovered.has(cx+','+cy),pulse:hash(cx,cy,55)*6.28}}
function refreshLandmarks(){landmarks.length=0;const cx=Math.floor(player.x/820),cy=Math.floor(player.y/820);for(let yy=cy-2;yy<=cy+2;yy++)for(let xx=cx-2;xx<=cx+2;xx++){const l=landmarkForCell(xx,yy);if(l)landmarks.push(l)}}
function reset(){player={x:0,y:0,vx:0,vy:0,dir:0};mobs=[];drops=[];landmarks=[];particles=[];shots=[];discovered.clear();run=0;kills=0;relics=0;level=1;xp=0;xpNeed=5;maxHp=45;hp=45;weapon=weapons[0];invuln=0;attackCd=0;regenDelay=0;spawnShield=8;screenShake=0;bossTimer=70;regionCount=1;lastRegionKey='0,0';tutorialStep=0;refreshLandmarks();for(let i=0;i<6;i++)spawnMob();hud();updateCompass()}

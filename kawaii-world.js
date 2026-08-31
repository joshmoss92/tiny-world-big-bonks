'use strict';
/* v7.1 KAWAII WORLD RENDERER — replaces the dominant old tile look with lush illustrated terrain. */
(function(){
const K={version:'7.1',petals:[],sparkles:[]};window.KAWAII_WORLD=K;
const TAU=Math.PI*2;
function rr(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function blob(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TAU);ctx.fill()}
function glow(x,y,r,c,a=.28){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore()}
function grassDetail(sx,sy,p,n,b){
  if(n>.22){ctx.strokeStyle=b===1?'#ffb4d1aa':b===5?'#dff8ffaa':b===9?'#b8aaffaa':'#ffffff42';ctx.lineWidth=1.5;for(let i=0;i<3;i++){const x=sx+8+((n*997+i*17)%31),y=sy+10+((n*613+i*13)%27);ctx.beginPath();ctx.moveTo(x,y+5);ctx.quadraticCurveTo(x-2,y+1,x,y-2);ctx.stroke()}}
  if(n>.58){const c=b===1?'#ff99c3':b===6?'#bda7ff':b===7?'#8fe2bb':b===9?'#a8b8ff':p.detail;for(let i=0;i<2;i++){const x=sx+12+((n*401+i*23)%27),y=sy+12+((n*733+i*19)%24);blob(x,y,2.4,2.1,c);blob(x+3,y+1,2,1.8,'#fff1bf')}}
}
function lushGround(tx,ty,sx,sy,t){
  const b=biomeAtWorld(tx*TILE,ty*TILE),p=palettes[b],z=terrainAt(tx,ty),n=hash(tx,ty,120);
  const base=(b===1?'#b8d985':b===5?'#c8e9e7':b===4?'#a87558':b===6?'#9ea6c9':b===7?'#91c7a2':b===8?'#736d82':b===9?'#707ba9':p.a);
  rect(sx,sy,TILE+1,TILE+1,base);
  // organic cross-tile patches erase the old checkerboard feeling
  if(n>.36){ctx.globalAlpha=.18;blob(sx+8+(n*41)%34,sy+13+(n*73)%27,18+(n*9)%10,12+(n*7)%8,p.b);ctx.globalAlpha=1}
  if(z==='water'||z==='icewater'||z==='lava'){
    const top=z==='lava'?'#f38a50':z==='icewater'?'#bdeeff':b===7?'#67c8bd':'#59b8d0',bot=z==='lava'?'#9d3f42':z==='icewater'?'#6db9d1':'#397fa8';
    const g=ctx.createLinearGradient(sx,sy,sx,sy+TILE);g.addColorStop(0,top);g.addColorStop(1,bot);ctx.fillStyle=g;ctx.fillRect(sx,sy,TILE+1,TILE+1);
    ctx.strokeStyle=z==='lava'?'#ffd78cbb':'#eaffffbb';ctx.lineWidth=1.5;for(let i=0;i<2;i++){const yy=sy+12+i*18+Math.sin(t*2+tx*.7+ty)*2;ctx.beginPath();ctx.moveTo(sx+5,yy);ctx.bezierCurveTo(sx+15,yy-3,sx+27,yy+3,sx+42,yy);ctx.stroke()}
    if(z==='lava'&&n>.55)glow(sx+24,sy+24,28,'#ff9a52',.15);
    return;
  }
  grassDetail(sx,sy,p,n,b);
  if(z==='flower'){for(let i=0;i<5;i++){const a=i/5*TAU+n*5,x=sx+24+Math.cos(a)*8,y=sy+23+Math.sin(a)*6;blob(x,y,3.5,3,b===1?'#ff96c4':p.detail)}blob(sx+24,sy+23,3,3,'#fff0a3')}
  if(z==='reeds'){for(let i=0;i<6;i++){const x=sx+10+i*5;ctx.strokeStyle=i%2?p.tree:p.edge;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,sy+40);ctx.quadraticCurveTo(x-2,sy+25,x+Math.sin(t+i)*2,sy+15-i%3*3);ctx.stroke()}}
  if(z==='lotus'){blob(sx+24,sy+28,12,6,'#4c9e70');for(let i=0;i<5;i++){const a=i/5*TAU;blob(sx+24+Math.cos(a)*4,sy+24+Math.sin(a)*3,3.5,3,'#ffb1ce')}}
}
function canopy(sx,sy,p,b,n,t,pine=false,dead=false){
  shadow(sx+24,sy+43,19);
  // trunk with highlight
  rr(sx+18,sy+19,12,27,5,dead?'#5f4c50':'#7b543f');rect(sx+21,sy+21,3,22,dead?'#806369':'#a87852');
  if(dead){ctx.strokeStyle='#655057';ctx.lineWidth=6;ctx.lineCap='round';for(let a of [-1.1,-.5,.2,.8]){ctx.beginPath();ctx.moveTo(sx+24,sy+23);ctx.lineTo(sx+24+Math.cos(a)*22,sy+7+Math.sin(a)*10);ctx.stroke()}ctx.lineCap='butt';return}
  const cols=b===1?['#d96f9d','#ee90b6','#ffb3cf']:b===5?['#5f8b91','#79a9ac','#a3c9c8']:b===8?['#4f5365','#6b6680','#88769a']:b===9?['#596c8f','#7283aa','#8fa0c8']:[p.tree,p.edge,'#8fbe74'];
  if(pine){for(let i=0;i<3;i++){const yy=sy+25-i*11,ww=36-i*8;ctx.fillStyle=cols[i%3];ctx.beginPath();ctx.moveTo(sx+24,yy-28);ctx.lineTo(sx+24-ww/2,yy+8);ctx.lineTo(sx+24+ww/2,yy+8);ctx.closePath();ctx.fill()}return}
  const sway=Math.sin(t*1.2+n*8)*1.2;for(let i=0;i<7;i++){const a=i/7*TAU+n*3,rx=17+(i%2)*4,ry=13+(i%3)*2,x=sx+24+Math.cos(a)*17+sway,y=sy+9+Math.sin(a)*10;blob(x,y,rx,ry,cols[i%3])}
  ctx.globalAlpha=.3;blob(sx+17,sy-1,9,6,'#ffffff');ctx.globalAlpha=1;
  if(b===1){for(let i=0;i<5;i++){const a=i*1.3+n*5;blob(sx+24+Math.cos(a)*21,sy+7+Math.sin(a)*13,2.5,2.5,'#ffd3e5')}}
}
function lushObstacle(tx,ty,sx,sy,t){
  const b=biomeAtWorld(tx*TILE,ty*TILE),p=palettes[b],z=terrainAt(tx,ty),n=hash(tx,ty,211);if(!['tree','pine','deadtree','basalt','starrock','crystal','mooncrystal'].includes(z))return;
  if(z==='tree'||z==='pine'||z==='deadtree'){canopy(sx,sy,p,b,n,t,z==='pine',z==='deadtree');return}
  shadow(sx+24,sy+41,15);
  if(z==='crystal'||z==='mooncrystal'){
    const c=z==='mooncrystal'?'#8fb9ff':b===6?'#a987ff':'#c89cff';glow(sx+24,sy+23,34,c,.2);for(let i=0;i<5;i++){const x=sx+12+i*6,h=17+(i%3)*9;ctx.fillStyle=i%2?c:'#d9c6ff';ctx.beginPath();ctx.moveTo(x,sy+39);ctx.lineTo(x+4,sy+39-h);ctx.lineTo(x+8,sy+39);ctx.closePath();ctx.fill();ctx.globalAlpha=.45;rect(x+4,sy+39-h+4,2,h-7,'#fff');ctx.globalAlpha=1}return;
  }
  const c=z==='starrock'?'#536687':b===4?'#634c48':'#74666a';blob(sx+23,sy+34,17,11,c);blob(sx+19,sy+27,12,11,b===4?'#8b6458':'#918188');blob(sx+29,sy+30,10,9,z==='starrock'?'#7890bd':'#807075');ctx.globalAlpha=.28;blob(sx+17,sy+24,6,3,'#fff');ctx.globalAlpha=1;
}
function landmarkArt(l,t,cx,cy){
 const sx=l.x-player.x+cx,sy=l.y-player.y+cy;if(sx<-140||sx>w+140||sy<-160||sy>h+160)return;const k=landmarkDefs[l.type].kind,pulse=.5+.5*Math.sin(t*2+(l.pulse||0));ctx.save();ctx.translate(sx,sy);ctx.globalAlpha=l.found?.55:1;shadow(0,28,34);
 if(k==='grove'||k==='elder'){ctx.fillStyle='#75523f';rr(-8,-3,16,36,7,'#75523f');for(let i=0;i<8;i++){const a=i/8*TAU;blob(Math.cos(a)*28,Math.sin(a)*18-25,24,19,i%2?'#7eb47a':'#96ca88')}glow(0,-25,55,'#b8ffb0',.18)}
 else if(k==='spring'){const g=ctx.createRadialGradient(0,5,2,0,5,40);g.addColorStop(0,'#d7ffff');g.addColorStop(.55,'#6ed0df');g.addColorStop(1,'#3a8fbe');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,7,38,22,0,0,TAU);ctx.fill();for(let i=0;i<7;i++){const a=i/7*TAU;blob(Math.cos(a)*30,10+Math.sin(a)*15,4,3,'#ffb9db')}}
 else if(k==='obelisk'||k==='gate'||k==='worldheart'){glow(0,-10,60,k==='worldheart'?'#73d4ff':'#b48cff',.22);ctx.fillStyle='#5f5b88';ctx.beginPath();ctx.moveTo(0,-56);ctx.lineTo(17,-32);ctx.lineTo(12,29);ctx.lineTo(-12,29);ctx.lineTo(-17,-32);ctx.closePath();ctx.fill();ctx.fillStyle='#d7c5ff';ctx.beginPath();ctx.moveTo(0,-43);ctx.lineTo(5,-18);ctx.lineTo(0,7);ctx.lineTo(-5,-18);ctx.closePath();ctx.fill()}
 else {rr(-30,-12,60,42,10,'#7e8582');rr(-22,-28,15,28,6,'#a7aaa3');rr(8,-34,15,34,6,'#a7aaa3');rect(-4,3,8,26,'#4b5051');ctx.globalAlpha=.25;blob(-12,-8,13,6,'#fff');ctx.globalAlpha=l.found?.55:1}
 if(!l.found){ctx.strokeStyle=`rgba(255,239,162,${.5+.4*pulse})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-5,45+pulse*4,0,TAU);ctx.stroke()}ctx.restore();
}
drawGroundTile=lushGround;drawObstacleTile=lushObstacle;drawLandmarkSprite=landmarkArt;
// richer player-centered atmospheric depth layer
const oldDraw=draw;draw=function(t){oldDraw(t);if(!started||dead)return;ctx.save();const b=biomeAtWorld(player.x,player.y);const edge=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.25,w/2,h/2,Math.max(w,h)*.68);edge.addColorStop(0,'rgba(255,255,255,0)');edge.addColorStop(1,b>=8?'rgba(19,13,39,.16)':'rgba(22,31,39,.10)');ctx.fillStyle=edge;ctx.fillRect(0,0,w,h);ctx.restore()};
window.__TWBB_KAWAII_WORLD_TEST__={get:()=>({version:K.version,biome:biomeAtWorld(player.x,player.y)})};
})();
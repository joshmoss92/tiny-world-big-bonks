(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v18-mechanics.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V18 transform missing');

  const V19_BLOCK=String.raw`

// ---- Starward Run V19 cinematic spectacle layer ----
const V19_RING_CAP=30;
const V19_DEBRIS_CAP=170;
const V19_STREAK_CAP=120;

function v19Ensure(){
  if(!S)return null;
  if(!S.v19){
    S.v19={
      slowmo:0,slowScale:1,flash:0,whiteFlash:0,redFlash:0,
      zoom:0,zoomTarget:0,letterbox:0,title:'',subtitle:'',titleTime:0,titleMax:0,
      rings:[],debris:[],streaks:[],
      lastBoss:null,lastBossPhase:0,lastSector:S.sector||1,
      lastFlowBurst:S.v17?.flowBursts||0,lastPerfectEvades:S.v18?.perfectEvades||0,
      lastPrecisionBursts:S.v18?.precisionBursts||0,lastForkChoices:S.v17?.forkChoices||0,
      lastProtocolChoices:S.v18?.protocolChoices||0,
      capitalKills:0,bossIntroductions:0,bossPhaseBreaks:0,heroMoments:0,
      resultAdded:false
    };
  }
  return S.v19;
}

function v19Clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function v19Rand(a,b){return a+Math.random()*(b-a);}
function v19Moment(title,subtitle,color,intensity,duration){
  const c=v19Ensure();if(!c)return;
  intensity=intensity||1;duration=duration||.9;
  c.title=title||'';c.subtitle=subtitle||'';c.titleTime=duration;c.titleMax=duration;
  c.letterbox=Math.max(c.letterbox,Math.min(1,intensity*.8));c.flash=Math.max(c.flash,.10*intensity);c.zoomTarget=Math.max(c.zoomTarget,.018*intensity);c.heroMoments++;
  if(color&&S.ship)v19Ring(S.ship.x,S.ship.y,38+22*intensity,color,.55+duration*.18,3+intensity);
}
function v19Ring(x,y,r,color,life,width){
  const c=v19Ensure();if(!c)return;c.rings.push({x,y,r:r||18,vr:v19Rand(80,190),color:color||'#8ff7ff',life:life||.5,max:life||.5,width:width||2});
  if(c.rings.length>V19_RING_CAP)c.rings.splice(0,c.rings.length-V19_RING_CAP);
}
function v19Debris(x,y,color,count,power){
  const c=v19Ensure();if(!c)return;count=Math.max(1,Math.round(count||8));power=power||1;
  for(let i=0;i<count;i++){const a=Math.random()*TWO_PI,s=v19Rand(70,260)*power;c.debris.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,rot:Math.random()*TWO_PI,vr:v19Rand(-7,7),size:v19Rand(1.5,5.2)*Math.min(1.5,power),color:color||'#ffe9a0',life:v19Rand(.25,.95),max:1});}
  if(c.debris.length>V19_DEBRIS_CAP)c.debris.splice(0,c.debris.length-V19_DEBRIS_CAP);
}
function v19StreakBurst(x,y,color,count,power){
  const c=v19Ensure();if(!c)return;count=Math.max(2,count||8);power=power||1;
  for(let i=0;i<count;i++){const a=Math.random()*TWO_PI,len=v19Rand(20,74)*power,s=v19Rand(80,260)*power;c.streaks.push({x,y,dx:Math.cos(a),dy:Math.sin(a),len,speed:s,color:color||'#ffffff',life:v19Rand(.16,.45),max:.45,width:v19Rand(1,3)*power});}
  if(c.streaks.length>V19_STREAK_CAP)c.streaks.splice(0,c.streaks.length-V19_STREAK_CAP);
}
function v19Impact(x,y,color,intensity){const c=v19Ensure();if(!c)return;intensity=intensity||1;v19Ring(x,y,10+12*intensity,color,.28+.14*intensity,1.8+intensity);v19Debris(x,y,color,5+Math.round(intensity*5),.7+intensity*.25);v19StreakBurst(x,y,color,5+Math.round(intensity*4),.6+intensity*.22);c.flash=Math.max(c.flash,.04+.04*intensity);S.screenShake=Math.max(S.screenShake||0,1.5+intensity*2.2);}
function v19Slow(seconds,scale){const c=v19Ensure();if(!c)return;c.slowmo=Math.max(c.slowmo,seconds||.15);c.slowScale=Math.min(c.slowScale,scale||.42);}

if(typeof spawnBoss==='function'){
  const __v19SpawnBoss=spawnBoss;
  spawnBoss=function(forced){const r=__v19SpawnBoss(forced),c=v19Ensure(),b=S&&S.boss;if(c&&b){c.lastBoss=b;c.lastBossPhase=1;c.bossIntroductions++;c.whiteFlash=Math.max(c.whiteFlash,.24);c.zoomTarget=Math.max(c.zoomTarget,.065);c.letterbox=1;v19Slow(.48,.38);v19Moment('HOSTILE SIGNATURE',b.name||'CAPITAL THREAT',b.color||'#ffb070',1.7,1.35);v19Ring(b.x||W*.82,b.y||H*.5,64,b.color||'#ffb070',1.15,5);v19StreakBurst(b.x||W*.82,b.y||H*.5,b.color||'#ffb070',22,1.5);S.screenShake=Math.max(S.screenShake||0,10);}return r;};
}
if(typeof updateBoss==='function'){
  const __v19UpdateBoss=updateBoss;
  updateBoss=function(dt){const c=v19Ensure(),r=__v19UpdateBoss(dt),after=S&&S.boss;if(c&&after&&after.maxHp){const ratio=after.hp/after.maxHp,phase=ratio>.66?1:ratio>.33?2:3;if(phase>c.lastBossPhase){c.lastBossPhase=phase;c.bossPhaseBreaks++;c.whiteFlash=Math.max(c.whiteFlash,.17);c.zoomTarget=Math.max(c.zoomTarget,.042);v19Slow(.28,.46);v19Moment('PHASE '+phase,'THREAT PATTERN SHIFT',after.color||'#ffb070',1.25,.78);v19Ring(after.x,after.y,48,after.color||'#ffb070',.72,4);v19Debris(after.x,after.y,after.color||'#ffb070',22,1.2);v19StreakBurst(after.x,after.y,'#ffffff',18,1.1);}c.lastBoss=after;}else if(c&&c.lastBoss&&!after){c.lastBoss=null;c.lastBossPhase=0;}return r;};
}

const __v19KillEnemy=killEnemy;
killEnemy=function(e){const wasCapital=!!(e&&e.aaaCapital),elite=!!(e&&(e.elite||e.aaaCapital)),x=e&&e.x||W*.7,y=e&&e.y||H*.5,color=e&&e.color||(wasCapital?'#ffe071':elite?'#ffb070':'#9ffcff');const r=__v19KillEnemy(e),c=v19Ensure();if(c){if(wasCapital){c.capitalKills++;c.whiteFlash=Math.max(c.whiteFlash,.22);c.zoomTarget=Math.max(c.zoomTarget,.055);v19Slow(.34,.40);v19Moment('WARSHIP DESTROYED','FORMATION COLLAPSE',color,1.45,.86);v19Ring(x,y,58,color,.95,5);v19Debris(x,y,color,42,1.5);v19StreakBurst(x,y,'#fff8cf',26,1.35);}else if(elite)v19Impact(x,y,color,1.35);else if(Math.random()<.20)v19Impact(x,y,color,.48);}return r;};

if(typeof releaseStarLaser==='function'){
  const __v19Laser=releaseStarLaser;
  releaseStarLaser=function(){const before=S&&S.laserCharge,r=__v19Laser();if(r!==false&&before>0){const c=v19Ensure();if(c){c.whiteFlash=1;c.zoomTarget=Math.max(c.zoomTarget,.085);c.letterbox=.65;v19Slow(.30,.30);v19Moment('STAR LASER','SYSTEM PURGE','#fff2a8',1.7,.75);v19Ring(S.ship.x,S.ship.y,54,'#fff2a8',1.0,5);v19StreakBurst(S.ship.x,S.ship.y,'#fff2a8',36,1.8);}}return r;};
}

function v19HeroEvents(){
  const c=v19Ensure();if(!c||S.phase!=='running')return;const m=S.v18,a=S.v17;
  if(a&&a.flowBursts>c.lastFlowBurst){c.lastFlowBurst=a.flowBursts;c.zoomTarget=Math.max(c.zoomTarget,.024);v19Moment('GUNNERY FLOW','WEAPONS SYNCHRONIZED','#8ff7ff',.85,.5);v19StreakBurst(S.ship.x,S.ship.y,'#8ff7ff',12,.9);}
  if(m&&m.perfectEvades>c.lastPerfectEvades){c.lastPerfectEvades=m.perfectEvades;c.zoomTarget=Math.max(c.zoomTarget,.018);v19Slow(.10,.62);v19Ring(S.ship.x,S.ship.y,26,'#9ffcff',.36,2.5);v19StreakBurst(S.ship.x,S.ship.y,'#9ffcff',10,.75);}
  if(m&&m.precisionBursts>c.lastPrecisionBursts){c.lastPrecisionBursts=m.precisionBursts;c.zoomTarget=Math.max(c.zoomTarget,.022);v19Ring(S.ship.x+36,S.ship.y,20,'#ffe071',.3,2.5);v19StreakBurst(S.ship.x+46,S.ship.y,'#ffe071',9,.8);}
  if(a&&a.forkChoices>c.lastForkChoices){c.lastForkChoices=a.forkChoices;c.flash=Math.max(c.flash,.13);v19Ring(S.ship.x,S.ship.y,34,'#ffe071',.42,2.6);}
  if(m&&m.protocolChoices>c.lastProtocolChoices){c.lastProtocolChoices=m.protocolChoices;c.whiteFlash=Math.max(c.whiteFlash,.10);v19Moment('PROTOCOL '+v18ProtocolName(),'FLIGHT SYSTEMS RECONFIGURED','#d7e8ff',.72,.55);}
  if(S.sector!==c.lastSector){c.lastSector=S.sector;c.whiteFlash=Math.max(c.whiteFlash,.12);v19Moment('SECTOR '+S.sector,'DEEPER INTO THE RUN','#9fb8ff',.95,.72);v19StreakBurst(W*.5,H*.5,'#9fb8ff',24,1.2);}
}
function v19UpdateParticles(dt){const c=v19Ensure();if(!c)return;for(let i=c.rings.length-1;i>=0;i--){const p=c.rings[i];p.life-=dt;p.r+=p.vr*dt;if(p.life<=0)c.rings.splice(i,1);}for(let i=c.debris.length-1;i>=0;i--){const p=c.debris[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.986;p.vy*=.986;p.rot+=p.vr*dt;if(p.life<=0)c.debris.splice(i,1);}for(let i=c.streaks.length-1;i>=0;i--){const p=c.streaks[i];p.life-=dt;p.x+=p.dx*p.speed*dt;p.y+=p.dy*p.speed*dt;if(p.life<=0)c.streaks.splice(i,1);}}

const __v19Update=update;
update=function(dt){const c=v19Ensure(),realDt=dt;if(c&&c.slowmo>0){c.slowmo=Math.max(0,c.slowmo-realDt);dt*=c.slowScale;if(c.slowmo<=0)c.slowScale=1;}const r=__v19Update(dt);if(!c)return r;c.flash=Math.max(0,c.flash-realDt*.75);c.whiteFlash=Math.max(0,c.whiteFlash-realDt*1.35);c.redFlash=Math.max(0,c.redFlash-realDt*1.1);c.titleTime=Math.max(0,c.titleTime-realDt);c.letterbox=Math.max(0,c.letterbox-realDt*.9);c.zoomTarget=Math.max(0,c.zoomTarget-realDt*.065);c.zoom+=(c.zoomTarget-c.zoom)*Math.min(1,realDt*8);v19UpdateParticles(realDt);v19HeroEvents();return r;};

function v19DrawBackdrop(){const c=v19Ensure();if(!c||S.phase!=='running')return;const flow=S.v17&&S.v17.flowActive>0?1:0,threat=v19Clamp(((S.enemies?.length||0)+(S.bullets?.length||0)*.5+(S.boss?18:0))/72,0,1);ctx.save();ctx.globalCompositeOperation='screen';if(flow||threat>.38){const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.55,flow?'rgba(92,235,255,.055)':'rgba(255,120,88,.025)');g.addColorStop(1,flow?'rgba(117,170,255,.12)':'rgba(255,88,120,.07)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}const count=Math.round(7+threat*16+flow*8);ctx.strokeStyle=flow?'#9ffcff':'#dfeaff';ctx.lineWidth=1.1;ctx.globalAlpha=.12+.12*threat+.1*flow;for(let i=0;i<count;i++){const yy=(i*73+S.time*31*(1+i%3))%H,xx=(i*117+S.time*180*(.35+(i%5)*.08))%W,len=15+threat*36+flow*22;ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx-len,yy);ctx.stroke();}ctx.restore();}
function v19DrawParticles(){const c=v19Ensure();if(!c)return;ctx.save();ctx.globalCompositeOperation='screen';for(const p of c.rings){const a=v19Clamp(p.life/(p.max||.5),0,1);ctx.globalAlpha=a*.8;ctx.strokeStyle=p.color;ctx.lineWidth=p.width;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TWO_PI);ctx.stroke();}for(const p of c.debris){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=v19Clamp(p.life/(p.max||1),0,1);ctx.fillStyle=p.color;ctx.fillRect(-p.size*.5,-p.size*.35,p.size,p.size*.7);ctx.restore();}for(const p of c.streaks){const a=v19Clamp(p.life/(p.max||.45),0,1);ctx.globalAlpha=a*.75;ctx.strokeStyle=p.color;ctx.lineWidth=p.width;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.dx*p.len,p.y-p.dy*p.len);ctx.stroke();}ctx.restore();}
function v19DrawTitle(){const c=v19Ensure();if(!c||c.titleTime<=0)return;const t=c.titleTime/Math.max(.001,c.titleMax),fade=Math.min(1,(1-t)*5,t*5);ctx.save();ctx.globalAlpha=v19Clamp(fade,0,1);const y=H*.27;ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font='bold 25px system-ui, sans-serif';ctx.shadowColor='rgba(100,210,255,.65)';ctx.shadowBlur=18;ctx.fillText(c.title,W*.5,y);ctx.shadowBlur=0;ctx.fillStyle='#dbe8ff';ctx.font='bold 10px monospace';ctx.fillText(c.subtitle||'',W*.5,y+21);ctx.restore();}
function v19DrawLetterbox(){const c=v19Ensure();if(!c||c.letterbox<=0)return;const h=28*c.letterbox;ctx.save();ctx.globalAlpha=.72*c.letterbox;ctx.fillStyle='#00040b';ctx.fillRect(0,0,W,h);ctx.fillRect(0,H-h,W,h);ctx.restore();}
function v19DrawFlashes(){const c=v19Ensure();if(!c)return;ctx.save();if(c.flash>0){ctx.globalAlpha=Math.min(.18,c.flash);ctx.fillStyle='#9fdcff';ctx.fillRect(0,0,W,H);}if(c.whiteFlash>0){ctx.globalAlpha=Math.min(.58,c.whiteFlash);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);}if(c.redFlash>0){ctx.globalAlpha=Math.min(.26,c.redFlash);ctx.fillStyle='#ff3e62';ctx.fillRect(0,0,W,H);}ctx.restore();}
function v19DrawLowHull(){const c=v19Ensure();if(!c||S.phase!=='running')return;const max=S.maxHull||S.maxHp||1,now=S.hull||S.hp||max,low=v19Clamp(1-now/max,0,1);if(low<.62)return;ctx.save();const a=(low-.62)/.38,beat=.55+.45*Math.sin(S.time*7),g=ctx.createRadialGradient(W*.5,H*.5,H*.22,W*.5,H*.5,H*.72);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.72,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(255,28,66,'+(a*(.12+.12*beat))+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();}

const __v19Draw=draw;
draw=function(){const c=v19Ensure();if(c&&c.zoom>0&&ctx.save&&ctx.translate&&ctx.scale){ctx.save();ctx.translate(W*.5,H*.5);ctx.scale(1+c.zoom,1+c.zoom);ctx.translate(-W*.5,-H*.5);__v19Draw();ctx.restore();}else __v19Draw();v19DrawBackdrop();v19DrawParticles();v19DrawLowHull();v19DrawTitle();v19DrawLetterbox();v19DrawFlashes();};

function v19AppendResults(){if(!S||typeof overlayText==='undefined')return;const c=v19Ensure();if(!c||c.resultAdded||/CINEMATIC MOMENTS/.test(overlayText.innerHTML||''))return;c.resultAdded=true;overlayText.innerHTML+='<div class="tactical-results"><strong>CINEMATIC MOMENTS</strong><span>Hero moments <b>'+c.heroMoments+'</b></span><span>Boss entrances <b>'+c.bossIntroductions+'</b></span><span>Boss phase breaks <b>'+c.bossPhaseBreaks+'</b></span><span>Capital ships destroyed <b>'+c.capitalKills+'</b></span></div>';}

if(typeof window!=='undefined'&&window.__STARWARD__){window.__STARWARD__.v19State=function(){return S&&S.v19||null;};window.__STARWARD__.v19Moment=v19Moment;window.__STARWARD__.v19Impact=v19Impact;}
// ---- end V19 cinematic spectacle layer ----
`;

  function apply(source){
    let transformed=base.apply(source);
    for(const hook of ['v18Ensure','v18TriggerDash','v18AppendResults','releaseStarLaser','spawnBoss'])if(!transformed.includes(hook))throw new Error('Starward V19 hook missing: '+hook);
    const resultHook="aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();v15AppendResults();v17AppendResults();v18AppendResults();choiceGrid.classList.add('hidden');";
    if(!transformed.includes(resultHook))throw new Error('Starward V19 results hook missing');
    transformed=transformed.replace(resultHook,"aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();v15AppendResults();v17AppendResults();v18AppendResults();v19AppendResults();choiceGrid.classList.add('hidden');");
    const close=transformed.lastIndexOf('})();');if(close<0)throw new Error('Starward V19 runtime closure not found');
    return transformed.slice(0,close)+V19_BLOCK+'\n'+transformed.slice(close);
  }
  return {apply};
});
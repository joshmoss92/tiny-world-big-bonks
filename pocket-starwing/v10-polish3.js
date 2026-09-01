(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v10-final.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V10.4 transform missing');

  const POLISH3=String.raw`

// ---- Starward Run V10.5 tactical presentation layer ----
const AAA3_CAPITAL_CLASSES={
  carrier:{name:'FLEET CARRIER',short:'CARRIER',color:'#ffd36f'},
  siege:{name:'SIEGE FRIGATE',short:'SIEGE',color:'#ff9b71'},
  bulwark:{name:'BULWARK CRUISER',short:'BULWARK',color:'#8fe8ff'}
};

function aaa3Ensure(){
  aaaEnsureState();
  if(!S.aaa.v105)S.aaa.v105={frames:0,focusFrames:0,focusedShots:0,dossierDraws:0,recommendedCues:0,capitalClasses:{},avgUpdateMs:0,slowFrames:0,qualityInterventions:0,resultsAdded:false};
  return S.aaa.v105;
}

function aaa3ClassifyCapital(e,forced){
  if(!e?.aaaCapital)return null;
  const id=forced&&AAA3_CAPITAL_CLASSES[forced]?forced:pick(['carrier','siege','bulwark']);
  e.aaaCapitalClass=id;e.aaaCapitalMeta=AAA3_CAPITAL_CLASSES[id];e.color=e.aaaCapitalMeta.color;
  p2InitCapital(e);
  if(id==='siege'){
    e.fire=Math.min(e.fire||1.5,.82);
    if(e.p2Systems?.cannon){e.p2Systems.cannon.hp*=1.25;e.p2Systems.cannon.maxHp=e.p2Systems.cannon.hp;}
    if(e.p2Systems?.hangar){e.p2Systems.hangar.hp*=.78;e.p2Systems.hangar.maxHp=e.p2Systems.hangar.hp;}
  }else if(id==='bulwark'){
    e.hp*=1.10;e.maxHp=e.hp;
    if(e.p2Systems?.shield){e.p2Systems.shield.hp*=1.45;e.p2Systems.shield.maxHp=e.p2Systems.shield.hp;}
  }else if(e.p2Systems?.hangar){
    e.p2Systems.hangar.hp*=1.18;e.p2Systems.hangar.maxHp=e.p2Systems.hangar.hp;
  }
  const a=aaa3Ensure();a.capitalClasses[id]=(a.capitalClasses[id]||0)+1;
  popup(e.aaaCapitalMeta.short,e.x,e.y-e.size-24,e.aaaCapitalMeta.color,1.15);
  return e;
}

const __aaa3Role=aaaRole;
aaaRole=function(e){
  if(e?.aaaCapital&&e.aaaCapitalMeta)return {icon:'⬢',label:e.aaaCapitalMeta.short,priority:4};
  return __aaa3Role(e);
};

const __aaa3SpawnCapital=aaaSpawnCapital;
aaaSpawnCapital=function(){
  const before=new Set(S?.enemies||[]),ok=__aaa3SpawnCapital();
  if(ok&&S){const e=S.enemies.find(x=>!before.has(x)&&x.aaaCapital);if(e&&!e.aaaCapitalClass)aaa3ClassifyCapital(e);}
  return ok;
};

const __aaa3EnemySystems=aaaEnemySystems;
aaaEnemySystems=function(dt){
  __aaa3EnemySystems(dt);
  if(!S)return;
  for(const c of S.enemies){
    if(!c?.aaaCapital||c.hp<=0)continue;
    if(!c.aaaCapitalClass)aaa3ClassifyCapital(c);
    if(c.aaaCapitalClass==='siege')c.fire=Math.min(c.fire||1.5,1.62);
    if(c.aaaCapitalClass==='carrier'&&c.p2Systems?.hangar?.alive&&c.aaaLaunchAt>S.time+5.4)c.aaaLaunchAt=S.time+5.4;
    if(c.aaaCapitalClass==='bulwark'&&c.p2Systems?.shield?.alive){
      for(const e of S.enemies)if(e!==c&&e.hp>0&&dist(c.x,c.y,e.x,e.y)<165)e.aaaGuarded=true;
    }
  }
};

const __aaa3EnemyFire=enemyFire;
enemyFire=function(e){
  const before=S?.bullets?.length||0,r=__aaa3EnemyFire(e);
  if(S&&e){const role=aaaRole(e);for(let i=before;i<S.bullets.length;i++){const b=S.bullets[i];b.aaaSourceRole=role.label;b.aaaPriority=role.priority>=3;if(e.aaaCapitalClass==='siege')b.hot=true;}}
  return r;
};

function aaa3TuneFocusedShot(sh,target){
  if(!sh||!target)return;
  sh.aaaFocused=true;aaa3Ensure().focusedShots++;
  if(sh.kind==='rail'){sh.damage*=1.12;sh.pierce=(sh.pierce||0)+2;}
  else if(sh.kind==='missile'){sh.damage*=1.08;sh.splash=(sh.splash||0)+1.25;}
  else if(sh.kind==='drone'){sh.damage*=1.14;sh.life+=.45;}
  else if(sh.kind==='beam'){sh.damage*=1.05+Math.min(.15,(8-S.focusTimer)*.025);}
  else if(sh.kind==='arc'){sh.damage*=1.08;sh.splash=(sh.splash||0)+.35;}
  else if(sh.kind==='flak'||sh.kind==='nova'){sh.splash=(sh.splash||0)+1;}
  else if(sh.kind==='scatter'){
    const desired=Math.atan2(target.y-sh.y,target.x-sh.x),speed=Math.hypot(sh.vx,sh.vy),current=Math.atan2(sh.vy,sh.vx);
    const diff=((desired-current+Math.PI*3)%TWO_PI)-Math.PI,a=current+diff*.38;sh.vx=Math.cos(a)*speed;sh.vy=Math.sin(a)*speed;
  }else sh.damage*=1.04;
}

const __aaa3UpdateWeapons=updateWeapons;
updateWeapons=function(dt){
  const before=S?.shots?.length||0,target=S?.focusTarget&&S.focusTimer>0?S.focusTarget:null;
  __aaa3UpdateWeapons(dt);
  if(!S||!target)return;
  for(let i=before;i<S.shots.length;i++)aaa3TuneFocusedShot(S.shots[i],target);
};

function aaa3RecommendedTarget(){
  if(!S||S.focusTimer>0)return null;
  const t=aaaPriorityTarget();
  return t&&t.hp>0&&t.x<W+20&&aaaRole(t).priority>=3?t:null;
}

function aaa3DrawCornerReticle(x,y,r,color,alpha){
  ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=2;
  for(let q=0;q<4;q++){ctx.save();ctx.translate(x,y);ctx.rotate(q*Math.PI/2);ctx.beginPath();ctx.moveTo(r,-7);ctx.lineTo(r+10,-7);ctx.lineTo(r+10,7);ctx.stroke();ctx.restore();}
  ctx.restore();
}

function aaa3DrawTargetDossier(){
  if(!S||S.phase!=='running')return;
  const a=aaa3Ensure(),t=S.focusTarget&&S.focusTimer>0&&S.focusTarget.hp>0?S.focusTarget:null;
  if(t){
    a.dossierDraws++;
    const role=aaaRole(t),capital=!!t.aaaCapital,sys=S.p2CapitalFocus?.e===t?S.p2CapitalFocus:null;
    let hp=t.hp,max=t.maxHp,label=role.label,sub=capital&&t.aaaCapitalMeta?t.aaaCapitalMeta.name:'PRIORITY LOCK';
    if(sys&&t.p2Systems?.[sys.id]){const s=t.p2Systems[sys.id];hp=s.hp;max=s.maxHp;label=s.name;sub=(t.aaaCapitalMeta?.name||'CAPITAL SHIP')+' SYSTEM';}
    const ratio=clamp(hp/Math.max(1,max),0,1),x=14,y=42,w=244,h=55;
    ctx.save();ctx.globalAlpha=.94;ctx.fillStyle='#030815e8';ctx.fillRect(x,y,w,h);ctx.strokeStyle=capital?'#ffd36f':'#8ff7ff';ctx.strokeRect(x,y,w,h);
    ctx.fillStyle=capital?'#ffd36f':'#8ff7ff';ctx.font='bold 10px monospace';ctx.fillText(label,x+10,y+16);
    ctx.fillStyle='#aebdd3';ctx.font='8px monospace';ctx.fillText(sub,x+10,y+29);
    ctx.fillStyle='#1c2a40';ctx.fillRect(x+10,y+36,w-72,7);ctx.fillStyle=ratio<.28?'#ff7c91':capital?'#ffd36f':'#8ff7ff';ctx.fillRect(x+10,y+36,(w-72)*ratio,7);
    ctx.fillStyle='#fff';ctx.font='bold 9px monospace';ctx.textAlign='right';ctx.fillText(Math.ceil(ratio*100)+'% · '+S.focusTimer.toFixed(1)+'s',x+w-8,y+43);ctx.textAlign='left';ctx.restore();
    aaa3DrawCornerReticle(t.x,t.y,t.size+13,capital?'#ffd36f':'#ffffff',.75+.2*Math.sin(S.time*8));
    if(S.weapons.beam>0){ctx.save();ctx.globalAlpha=.10+.05*Math.sin(S.time*10);ctx.strokeStyle='#8ff7ff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(S.ship.x+24,S.ship.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.restore();}
  }else{
    const r=aaa3RecommendedTarget();
    if(r){a.recommendedCues++;aaa3DrawCornerReticle(r.x,r.y,r.size+16,'#ffd36f',.46+.15*Math.sin(S.time*5));ctx.save();ctx.fillStyle='#ffd36f';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('RECOMMENDED',r.x,r.y-r.size-24);ctx.restore();}
  }
}

const __aaa3Draw=draw;
draw=function(){__aaa3Draw();aaa3DrawTargetDossier();};

function aaa3AppendResults(){
  if(!S||typeof overlayText==='undefined')return;const a=aaa3Ensure();if(a.resultsAdded)return;a.resultsAdded=true;
  const uptime=a.frames?Math.round(a.focusFrames/a.frames*100):0,classes=Object.keys(a.capitalClasses).map(x=>AAA3_CAPITAL_CLASSES[x]?.short||x).join(' · ')||'NONE';
  overlayText.innerHTML+='<div class="tactical-results"><strong>LOCK DISCIPLINE</strong><span>Focus uptime '+uptime+'%</span><span>Focused volleys '+a.focusedShots+'</span><span>Warship intel '+classes+'</span></div>';
}

if(typeof showResults==='function'){
  const __aaa3ShowResults=showResults;
  showResults=function(){const r=__aaa3ShowResults.apply(this,arguments);aaa3AppendResults();return r;};
}

const __aaa3Update=update;
update=function(dt){
  const a=aaa3Ensure(),t0=typeof performance!=='undefined'&&performance.now?performance.now():0;
  __aaa3Update(dt);
  if(!S)return;
  a.frames++;if(S.focusTimer>0&&S.focusTarget)a.focusFrames++;
  const t1=typeof performance!=='undefined'&&performance.now?performance.now():t0,cost=Math.max(0,t1-t0);a.avgUpdateMs=a.avgUpdateMs*.96+cost*.04;
  if(cost>12)a.slowFrames++;if(a.avgUpdateMs>10.5&&S.quality>.66){S.quality=Math.max(.66,S.quality-.04);a.qualityInterventions++;}
  if(S.enemies.length>58&&S.aaa?.nextFormationAt<S.time+7)S.aaa.nextFormationAt=S.time+7;
  if(S.phase==='dead'&&!a.resultsAdded&&typeof overlayText!=='undefined'&&/BUILD OF THE RUN/.test(overlayText.innerHTML||''))aaa3AppendResults();
};

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.aaa3State=()=>S?.aaa?.v105||null;
  window.__STARWARD__.aaa3ClassifyCapital=aaa3ClassifyCapital;
  window.__STARWARD__.aaa3RecommendedTarget=aaa3RecommendedTarget;
  window.__STARWARD__.aaa3FireTick=()=>updateWeapons(.016);
}
// ---- end V10.5 tactical presentation layer ----
`;

  function apply(source){
    const transformed=base.apply(source);
    for(const hook of ['aaaPriorityTarget','aaaSpawnCapital','p2InitCapital','function draw()','function updateWeapons'])if(!transformed.includes(hook))throw new Error('Starward V10.5 hook missing: '+hook);
    const close=transformed.lastIndexOf('})();');
    if(close<0)throw new Error('Starward V10.5 runtime closure not found');
    return transformed.slice(0,close)+POLISH3+'\n'+transformed.slice(close);
  }
  return {apply};
});

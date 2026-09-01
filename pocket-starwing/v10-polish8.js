(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v10-polish7.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V10.9 transform missing');

  const POLISH8=String.raw`

// ---- Starward Run V10.10 precision-input and clarity layer ----
function aaa8Ensure(){
  aaaEnsureState();
  if(!S.aaa.v110)S.aaa.v110={precisionLocks:0,correctedLocks:0,clarityFrames:0,lockPulse:null,grade:null,resultsAdded:false};
  return S.aaa.v110;
}

function aaa8TouchScore(e,x,y){
  if(!e||e.hp<=0)return -1e9;
  const role=aaaRole(e),d=dist(x,y,e.x,e.y),hp=clamp(e.hp/Math.max(1,e.maxHp),0,1);
  return role.priority*120+(e.aaaCapital?90:0)+(e.elite?28:0)+(1-hp)*12-d*1.45;
}

function aaa8BestTouchTarget(x,y){
  if(!S)return null;
  let best=null,bestScore=-1e9;
  for(const e of S.enemies){
    if(!e||e.hp<=0)continue;
    const radius=Math.max(42,e.size+18),d=dist(x,y,e.x,e.y);
    if(d>radius)continue;
    const score=aaa8TouchScore(e,x,y);if(score>bestScore){bestScore=score;best=e;}
  }
  return best;
}

const __aaa8Claims=aaa4InputClaimsTarget;
aaa4InputClaimsTarget=function(x,y){if(__aaa8Claims(x,y))return true;return !!aaa8BestTouchTarget(x,y);};

function aaa8SystemWasClaimed(x,y){
  if(S.focusBossPart&&S.boss){const p=S.focusBossPart;if(dist(x,y,S.boss.x+(p.ox||0),S.boss.y+(p.oy||0))<40)return true;}
  const f=S.p2CapitalFocus;if(f?.e&&f.e.hp>0&&f.e.p2Systems?.[f.id]){const n=p2CapitalNode(f.e,f.id);if(dist(x,y,n.x,n.y)<40)return true;}
  return false;
}

function aaa8ClaimTarget(e){
  if(!S||!e||e.hp<=0)return false;
  const previous=S.focusTarget;
  S.focusTarget=e;S.focusBossPart=null;S.p2CapitalFocus=null;S.focusTimer=8;
  const a=aaa8Ensure();a.precisionLocks++;if(previous&&previous!==e)a.correctedLocks++;
  a.lockPulse={target:e,time:.34,max:.34};
  if(typeof sfx==='function')sfx('focus');aaa4Haptic(10);return true;
}

canvas.addEventListener('pointerdown',ev=>{
  if(!S||S.phase!=='running')return;
  const rect=canvas.getBoundingClientRect(),x=(ev.clientX-rect.left)*W/rect.width,y=(ev.clientY-rect.top)*H/rect.height;
  if(dist(x,y,S.ship.x,S.ship.y)<80||aaa8SystemWasClaimed(x,y))return;
  const best=aaa8BestTouchTarget(x,y);if(best)aaa8ClaimTarget(best);
});

const __aaa8HealthBar=aaaDrawHealthBar;
aaaDrawHealthBar=function(e){
  const a=aaa8Ensure(),clarity=a.clarity===true,role=aaaRole(e);
  if(clarity&&S.focusTarget!==e&&!e?.aaaCapital&&!e?.elite&&role.priority<3)return;
  return __aaa8HealthBar(e);
};

function aaa8DrawLockPulse(){
  const a=aaa8Ensure(),p=a.lockPulse;if(!p?.target||p.target.hp<=0||p.time<=0)return;
  const t=p.target,progress=1-p.time/p.max,r=(t.size||18)+10+(1-progress)*28;
  ctx.save();ctx.globalAlpha=clamp(p.time/p.max,0,1)*.8;ctx.strokeStyle='#8ff7ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x,t.y,r,0,TWO_PI);ctx.stroke();ctx.restore();
}

const __aaa8Draw=draw;
draw=function(){__aaa8Draw();aaa8DrawLockPulse();};

function aaa8Grade(){
  if(!S)return {letter:'D',score:0};
  const p2=S.aaa?.p2||{},v9=S.aaa?.v109||{};
  const score=Math.round(Math.min(42,S.time/6)+Math.min(22,(S.aaa?.focusKills||0)*2)+(S.bosses||0)*7+(p2.systemKills||0)*2.5+(v9.staggers||0)*1.2+(p2.maxFocusChain||0)*3+(v9.cleanBreaks||0)*2);
  const letter=score>=76?'S':score>=58?'A':score>=42?'B':score>=28?'C':'D';
  return {letter,score};
}

function aaa8AppendResults(){
  if(!S||typeof overlayText==='undefined')return;const a=aaa8Ensure();if(a.resultsAdded&&/COMMAND GRADE/.test(overlayText.innerHTML||''))return;a.resultsAdded=true;
  const g=aaa8Grade();a.grade=g;
  overlayText.innerHTML+='<div class="tactical-results"><strong>COMMAND GRADE '+g.letter+'</strong><span>Tactical score '+g.score+'</span><span>Precision locks '+a.precisionLocks+'</span><span>Focus staggers '+(S.aaa?.v109?.staggers||0)+'</span></div>';
}

function aaa8EnsureResultsStack(){
  if(!S||typeof overlayText==='undefined'||!/BUILD OF THE RUN/.test(overlayText.innerHTML||''))return false;
  let html=overlayText.innerHTML||'';
  if(!/TACTICAL COMMAND/.test(html)&&typeof p2AppendResults==='function'){if(S.aaa?.p2)S.aaa.p2.resultsAdded=false;p2AppendResults();html=overlayText.innerHTML||'';}
  if(!/LOCK DISCIPLINE/.test(html)&&typeof aaa3AppendResults==='function'){if(S.aaa?.v105)S.aaa.v105.resultsAdded=false;aaa3AppendResults();html=overlayText.innerHTML||'';}
  if(!/SYSTEM WARFARE/.test(html)&&typeof aaa5AppendResults==='function'){if(S.aaa?.v107)S.aaa.v107.resultsAdded=false;aaa5AppendResults();html=overlayText.innerHTML||'';}
  if(!/COMMAND GRADE/.test(html)){aaa8Ensure().resultsAdded=false;aaa8AppendResults();}
  return true;
}

const __aaa8Update=update;
update=function(dt){
  __aaa8Update(dt);
  if(!S)return;const a=aaa8Ensure();
  const pressure=S.enemies.length+(S.bullets?.length||0)*.16+(S.shots?.length||0)*.08;
  a.clarity=pressure>82||S.enemies.length>44||S.bullets.length>175;
  if(a.clarity)a.clarityFrames++;
  if(a.lockPulse){a.lockPulse.time=Math.max(0,a.lockPulse.time-dt);if(a.lockPulse.time<=0)a.lockPulse=null;}
};

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.aaa8State=()=>S?.aaa?.v110||null;
  window.__STARWARD__.aaa8BestTouchTarget=aaa8BestTouchTarget;
  window.__STARWARD__.aaa8ClaimTarget=aaa8ClaimTarget;
  window.__STARWARD__.aaa8Grade=aaa8Grade;
  window.__STARWARD__.aaa8EnsureResultsStack=aaa8EnsureResultsStack;
}
// ---- end V10.10 precision-input layer ----
`;

  function apply(source){
    let transformed=base.apply(source);
    for(const hook of ['AAA7_STAGGER','aaa4InputClaimsTarget','aaaDrawHealthBar','aaa7PriorityTarget'])if(!transformed.includes(hook))throw new Error('Starward V10.10 hook missing: '+hook);
    const finalHook="p2AppendResults();choiceGrid.classList.add('hidden');";
    if(!transformed.includes(finalHook))throw new Error('Starward V10.10 finalizeRun results hook missing');
    transformed=transformed.replace(finalHook,"p2AppendResults();aaa8EnsureResultsStack();choiceGrid.classList.add('hidden');");
    const close=transformed.lastIndexOf('})();');
    if(close<0)throw new Error('Starward V10.10 runtime closure not found');
    return transformed.slice(0,close)+POLISH8+'\n'+transformed.slice(close);
  }
  return {apply};
});

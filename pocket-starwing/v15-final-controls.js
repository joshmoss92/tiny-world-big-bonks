(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v14-ui-fairness.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V14 transform missing');

  const V15_BLOCK=String.raw`

// ---- Starward Run V15 final manual-fire polish ----
function v15Ensure(){const v=v12Ensure();if(v&&!v.v15)v.v15={manualShotdowns:0,interceptChain:0,bestInterceptChain:0,lastInterceptAt:-99};return v?.v15||null;}

function v15BulletAtPointer(){
  const v=v12Ensure();if(!v?.aim.active)return null;let best=null,bestD=64;
  for(const b of S.bullets){if(!b||b.life<=0||b.x<S.ship.x+24)continue;const d=dist(v.aim.rawX,v.aim.rawY,b.x,b.y);if(d<bestD){best=b;bestD=d;}}
  if(best)best.v15InterceptTarget=true;return best;
}

const __v15AimTarget=v12AimTarget;
v12AimTarget=function(){const p=v12PowerAtPointer();if(p)return p;const b=v15BulletAtPointer();if(b)return b;return v12FindEnemyAimTarget();};

const __v15Weapons=updateWeapons;
updateWeapons=function(dt){
  const before=S.shots.length,activelyAimed=!!v12Ensure()?.aim.active,r=__v15Weapons(dt);
  for(let i=before;i<S.shots.length;i++)if(S.shots[i]?.v12Manual)S.shots[i].v15Aimed=activelyAimed;
  return r;
};

v12ResolveShotdowns=function(){
  const v=v12Ensure(),p=v15Ensure();if(!v||!p)return 0;let hits=0;
  for(const b of S.bullets){
    if(!b||b.life<=0)continue;
    for(const sh of S.shots){
      if(!sh||sh.life<=0||!sh.v15Aimed)continue;
      if(dist(b.x,b.y,sh.x,sh.y)>13+(b.hot?3:0))continue;
      b.life=0;if(sh.pierce>0)sh.pierce--;else sh.life=0;hits++;v.shotdowns++;p.manualShotdowns++;
      p.interceptChain=S.time-p.lastInterceptAt<1.15?p.interceptChain+1:1;p.bestInterceptChain=Math.max(p.bestInterceptChain,p.interceptChain);p.lastInterceptAt=S.time;
      const a=typeof v13Ensure==='function'?v13Ensure():null;if(a){a.combo++;a.comboTimer=3.2;a.bestCombo=Math.max(a.bestCombo,a.combo);}
      burst(b.x,b.y,b.hot?'#fff0a5':'#8ff7ff',b.hot?10:7,170,2);addLaserCharge(.05+v.shotdownCharge);
      if(p.interceptChain>1&&p.interceptChain%5===0){popup('INTERCEPT ×'+p.interceptChain,b.x,b.y-18,'#8ff7ff',.72);addLaserCharge(.35);}
      if(a&&a.combo>0&&a.combo%8===0){addLaserCharge(.8);popup('COMBAT CHAIN ×'+a.combo,b.x,b.y+22,'#ffe071',.72);}
      if(S.specials.bulletEater&&v.shotdowns%5===0){S.shield=Math.min(S.maxShield,S.shield+1);addLaserCharge(.8);popup('DEFENSE CHAIN',S.ship.x,S.ship.y-35,'#8ff7ff',.8);}
      break;
    }
  }
  return hits;
};

function v15DrawAssist(){
  const v=v12Ensure();if(!v?.aim.active||S.phase!=='running')return;const t=v12AimTarget();if(!t||(!t.v15InterceptTarget&&!t.v12Power))return;
  const isPower=!!t.v12Power,color=isPower?(V12_POWER_TYPES.find(x=>x.id===t.id)?.color||'#ffe071'):(t.hot?'#fff0a5':'#8ff7ff'),label=isPower?'POWER CORE':'INTERCEPT';
  ctx.save();ctx.globalAlpha=.80+.15*Math.sin(S.time*12);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x,t.y,(t.size||5)+11,0,TWO_PI);ctx.stroke();ctx.fillStyle=color;ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText(label,t.x,t.y-(t.size||5)-15);ctx.restore();
}
const __v15Draw=draw;draw=function(){__v15Draw();v15DrawAssist();};

for(const e of LIVE_EVENTS){
  if(typeof e.body!=='string')continue;
  e.body=e.body.replace(/^Tap within 5 seconds to\s+/i,'').replace(/^Press within 5 seconds to\s+/i,'');
  if(e.body)e.body=e.body.charAt(0).toUpperCase()+e.body.slice(1);
}

function v15AppendResults(){
  if(!S||typeof overlayText==='undefined')return;const p=v15Ensure();if(!p||/MANUAL DEFENSE/.test(overlayText.innerHTML||''))return;
  overlayText.innerHTML+='<div class="tactical-results"><strong>MANUAL DEFENSE</strong><span>Manual interceptions <b>'+p.manualShotdowns+'</b></span><span>Best intercept chain <b>'+p.bestInterceptChain+'×</b></span><span>Power cores <b>'+(v12Ensure()?.powerCollected||0)+'</b></span><span>Aimed kills <b>'+(v12Ensure()?.aimedKills||0)+'</b></span></div>';
}

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.v12ResolveShotdowns=v12ResolveShotdowns;
  window.__STARWARD__.v15BulletAtPointer=v15BulletAtPointer;
  window.__STARWARD__.v15State=()=>v12Ensure()?.v15||null;
}
// ---- end V15 manual-fire polish ----
`;

  function apply(source){
    let transformed=base.apply(source);
    for(const hook of ['v14WrapAll','v13ResolveTrial','v12ResolveShotdowns','v12AimTarget','v13AppendResults'])if(!transformed.includes(hook))throw new Error('Starward V15 hook missing: '+hook);
    const resultHook="aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();choiceGrid.classList.add('hidden');";
    if(!transformed.includes(resultHook))throw new Error('Starward V15 results hook missing');
    transformed=transformed.replace(resultHook,"aaa8EnsureResultsStack();v12AppendResults();v13AppendResults();v15AppendResults();choiceGrid.classList.add('hidden');");
    const close=transformed.lastIndexOf('})();');if(close<0)throw new Error('Starward V15 runtime closure not found');
    return transformed.slice(0,close)+V15_BLOCK+'\n'+transformed.slice(close);
  }
  return {apply};
});

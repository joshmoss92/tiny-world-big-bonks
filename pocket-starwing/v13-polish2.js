(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v13-engagement.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V13 transform missing');

  const V13P=String.raw`

// ---- Starward Run V13.1 skill-based interception and readability polish ----
function v13pEnsure(){const v=v12Ensure();if(v&&!v.interceptPolish)v.interceptPolish={chain:0,best:0,lastAt:-99,manualShotdowns:0};return v?.interceptPolish||null;}

function v13pBulletAtPointer(){
  const v=v12Ensure();if(!v?.aim.active)return null;let best=null,bestD=62;
  for(const b of S.bullets){if(!b||b.life<=0||b.x<S.ship.x+25)continue;const d=dist(v.aim.rawX,v.aim.rawY,b.x,b.y);if(d<bestD){best=b;bestD=d;}}
  if(best)best.v13InterceptTarget=true;return best;
}
const __v13pAimTarget=v12AimTarget;
v12AimTarget=function(){const p=v12PowerAtPointer();if(p)return p;const b=v13pBulletAtPointer();if(b)return b;return v12FindEnemyAimTarget();};

const __v13pWeapons=updateWeapons;
updateWeapons=function(dt){const before=S.shots.length,aimed=!!v12Ensure()?.aim.active,r=__v13pWeapons(dt);for(let i=before;i<S.shots.length;i++)if(S.shots[i]?.v12Manual)S.shots[i].v13Aimed=aimed;return r;};

v12ResolveShotdowns=function(){
  const v=v12Ensure(),p=v13pEnsure();if(!v||!p)return 0;let hits=0;
  for(const b of S.bullets){
    if(!b||b.life<=0)continue;
    for(const sh of S.shots){
      if(!sh||sh.life<=0||!sh.v13Aimed)continue;
      if(dist(b.x,b.y,sh.x,sh.y)>11+(b.hot?3:0))continue;
      b.life=0;if(sh.pierce>0)sh.pierce--;else sh.life=0;hits++;v.shotdowns++;p.manualShotdowns++;
      p.chain=S.time-p.lastAt<1.15?p.chain+1:1;p.best=Math.max(p.best,p.chain);p.lastAt=S.time;
      burst(b.x,b.y,b.hot?'#fff0a5':'#8ff7ff',b.hot?10:7,170,2);addLaserCharge(.05+v.shotdownCharge);
      if(p.chain>1&&p.chain%5===0){popup('INTERCEPT ×'+p.chain,b.x,b.y-18,'#8ff7ff',.72);addLaserCharge(.35);}
      if(S.specials.bulletEater&&v.shotdowns%5===0){S.shield=Math.min(S.maxShield,S.shield+1);addLaserCharge(.8);popup('DEFENSE CHAIN',S.ship.x,S.ship.y-35,'#8ff7ff',.8);}
      break;
    }
  }
  return hits;
};

function v13pDrawAimObject(){
  const v=v12Ensure();if(!v?.aim.active||S.phase!=='running')return;const t=v12AimTarget();if(!t||(!t.v13InterceptTarget&&!t.v12Power))return;
  const isPower=!!t.v12Power,color=isPower?(V12_POWER_TYPES.find(x=>x.id===t.id)?.color||'#ffe071'):(t.hot?'#fff0a5':'#8ff7ff'),label=isPower?'POWER CORE':'INTERCEPT';
  ctx.save();ctx.globalAlpha=.78+.16*Math.sin(S.time*12);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x,t.y,(t.size||5)+10,0,TWO_PI);ctx.stroke();ctx.fillStyle=color;ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillText(label,t.x,t.y-(t.size||5)-15);ctx.restore();
}
const __v13pDraw=draw;draw=function(){__v13pDraw();v13pDrawAimObject();};

for(const e of LIVE_EVENTS){
  if(typeof e.body!=='string')continue;
  e.body=e.body.replace(/^Tap within 5 seconds to\s+/i,'').replace(/^Press within 5 seconds to\s+/i,'');
  if(e.body)e.body=e.body.charAt(0).toUpperCase()+e.body.slice(1);
}

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.v12ResolveShotdowns=v12ResolveShotdowns;
  window.__STARWARD__.v13InterceptTarget=v13pBulletAtPointer;
  window.__STARWARD__.v13InterceptState=()=>v12Ensure()?.interceptPolish||null;
}
// ---- end V13.1 polish ----
`;

  function apply(source){
    const transformed=base.apply(source);
    for(const hook of ['v12ResolveShotdowns','v12AimTarget','v13ResolveTrial','V13_DECISION_GAP'])if(!transformed.includes(hook))throw new Error('Starward V13.1 hook missing: '+hook);
    const close=transformed.lastIndexOf('})();');if(close<0)throw new Error('Starward V13.1 runtime closure not found');
    return transformed.slice(0,close)+V13P+'\n'+transformed.slice(close);
  }
  return {apply};
});

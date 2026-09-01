(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v13-engagement.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V13 transform missing');

  const V14_BLOCK=String.raw`

// ---- Starward Run V14 event-readability and fixed-lane fairness layer ----
function v14WrapAll(text,maxChars=82){
  const words=String(text||'').trim().split(/\s+/).filter(Boolean),lines=[];let line='';
  for(const word of words){const next=line?line+' '+word:word;if(line&&next.length>maxChars){lines.push(line);line=word;}else line=next;}
  if(line)lines.push(line);return lines.length?lines:[''];
}

v12EventLines=function(){return S?.liveEvent?v14WrapAll(S.liveEvent.body,82):[];};
v12EventBox=function(){
  const lines=v12EventLines(),w=824,h=132+lines.length*17,x=(W-w)/2,y=Math.max(38,H-h-10);
  return {x,y,w,h,accept:{x:x+w-174,y:y+h-42,w:156,h:30}};
};

function v14DrawLiveEvent(){
  v12DrawPowerups();if(!S.liveEvent)return;
  const e=S.liveEvent,pct=clamp(e.time/e.max,0,1),box=v12EventBox(),lines=v12EventLines(),info=V12_EVENT_INFO[e.kind]||{risk:'RISK · OPTIONAL CHALLENGE',reward:'REWARD · RUN ADVANTAGE'};
  const bodyY=box.y+53,afterBody=bodyY+lines.length*17,riskY=afterBody+9,rewardY=riskY+17,meterY=box.y+box.h-28,b=box.accept;
  ctx.save();ctx.globalAlpha=.975;ctx.fillStyle='#030812f4';ctx.fillRect(box.x,box.y,box.w,box.h);ctx.strokeStyle=e.color;ctx.lineWidth=3;ctx.strokeRect(box.x,box.y,box.w,box.h);
  ctx.fillStyle=e.color;ctx.font='bold 20px monospace';ctx.textAlign='left';ctx.fillText(e.title,box.x+18,box.y+28);
  ctx.fillStyle='#e8f1ff';ctx.font='13px monospace';for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],box.x+18,bodyY+i*17);
  ctx.font='bold 10px monospace';ctx.fillStyle='#ff9d8e';ctx.fillText(info.risk,box.x+18,riskY);ctx.fillStyle='#8fffb0';ctx.fillText(info.reward,box.x+18,rewardY);
  ctx.fillStyle='#1b2941';ctx.fillRect(box.x+18,meterY,box.w-218,8);ctx.fillStyle=e.color;ctx.fillRect(box.x+18,meterY,(box.w-218)*pct,8);
  ctx.fillStyle=e.color;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#04101a';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('ACCEPT · '+e.time.toFixed(1)+'s',b.x+b.w/2,b.y+20);
  ctx.fillStyle='#9caec4';ctx.font='9px monospace';ctx.textAlign='right';ctx.fillText('IGNORE = KEEP FLYING',box.x+box.w-18,box.y+20);ctx.restore();
}
drawLiveEvent=v14DrawLiveEvent;

const __v14Shotdowns=v12ResolveShotdowns;
v12ResolveShotdowns=function(){
  let hits=__v14Shotdowns(),v=v12Ensure();if(!v)return hits;
  for(const b of S.bullets){
    if(b.life<=0)continue;
    for(const sh of S.shots){
      if(sh.life<=0||dist(b.x,b.y,sh.x,sh.y)>17+(b.hot?4:0))continue;
      b.life=0;if(sh.pierce>0)sh.pierce--;else sh.life=0;hits++;v.shotdowns++;
      burst(b.x,b.y,b.hot?'#fff0a5':'#8ff7ff',b.hot?10:7,165,2);addLaserCharge(.07+v.shotdownCharge);
      if(S.specials.bulletEater&&v.shotdowns%5===0){S.shield=Math.min(S.maxShield,S.shield+1);addLaserCharge(.8);popup('DEFENSE CHAIN',S.ship.x,S.ship.y-35,'#8ff7ff',.8);}
      break;
    }
  }
  return hits;
};

const __v14Fresh=v12Ensure;
v12Ensure=function(){const v=__v14Fresh();if(v&&!v.v14Fairness){v.v14Fairness=true;S.maxShield=Math.max(S.maxShield,15);S.shield=Math.min(S.maxShield,Math.max(S.shield,15));S.shieldRegen=Math.max(S.shieldRegen,.24);S.stats.armor=Math.max(S.stats.armor,.13);}return v;};

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.v14EventLines=()=>v12EventLines();
  window.__STARWARD__.v14EventBox=()=>v12EventBox();
  window.__STARWARD__.v14FireTick=()=>updateWeapons(.016);
}
// ---- end V14 fairness layer ----
`;

  function apply(source){
    const transformed=base.apply(source);
    for(const hook of ['v12EventLines','v12EventBox','v12ResolveShotdowns','V13_DECISION_GAP'])if(!transformed.includes(hook))throw new Error('Starward V14 hook missing: '+hook);
    const close=transformed.lastIndexOf('})();');if(close<0)throw new Error('Starward V14 runtime closure not found');
    return transformed.slice(0,close)+V14_BLOCK+'\n'+transformed.slice(close);
  }
  return {apply};
});
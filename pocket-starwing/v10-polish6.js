(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v10-polish5.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V10.7 transform missing');

  const POLISH6=String.raw`

// ---- Starward Run V10.8 cinematic warship readability ----
function aaa6Ensure(){
  aaaEnsureState();
  if(!S.aaa.v108)S.aaa.v108={capitalVisualFrames:0,edgeWarnings:0,damageStateFrames:0,offscreenFocusFrames:0,criticalCapitalFrames:0};
  return S.aaa.v108;
}

function aaa6DrawCapitalIdentity(e){
  if(!e?.aaaCapital||e.hp<=0)return;
  const a=aaa6Ensure(),ratio=clamp(e.hp/Math.max(1,e.maxHp),0,1),cls=e.aaaCapitalClass||'carrier';a.capitalVisualFrames++;
  ctx.save();ctx.translate(e.x,e.y);ctx.lineWidth=2;
  if(cls==='siege'){
    ctx.strokeStyle='#ffb17f';ctx.shadowColor='#ff7f5e';ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(-22,-8);ctx.lineTo(42,-8);ctx.moveTo(-22,8);ctx.lineTo(42,8);ctx.stroke();
    ctx.fillStyle='#ffcf9b';ctx.fillRect(24,-12,28,5);ctx.fillRect(24,7,28,5);ctx.shadowBlur=0;
  }else if(cls==='bulwark'){
    const shield=e.p2Systems?.shield?.alive;ctx.strokeStyle=shield?'#8fe8ff':'#46677d';ctx.globalAlpha=shield?.85:.35;ctx.shadowColor='#8fe8ff';ctx.shadowBlur=shield?14:0;ctx.beginPath();
    for(let i=0;i<6;i++){const a1=i*TWO_PI/6,a2=(i+1)*TWO_PI/6,r=e.size+15;const x1=Math.cos(a1)*r,y1=Math.sin(a1)*r,x2=Math.cos(a2)*r,y2=Math.sin(a2)*r;if(i===0)ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);}ctx.closePath();ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=1;
    for(const y of [-18,0,18]){ctx.fillStyle='#8fe8ff';ctx.fillRect(-28,y-3,8,6);}
  }else{
    ctx.strokeStyle='#ffd36f';ctx.fillStyle='#ffd36f';ctx.globalAlpha=.85;ctx.strokeRect(-25,-27,35,13);ctx.strokeRect(-25,14,35,13);ctx.fillRect(-17,-24,18,4);ctx.fillRect(-17,20,18,4);ctx.globalAlpha=1;
    if(e.p2Systems?.hangar?.alive){const pulse=.55+.35*Math.sin(S.time*8);ctx.globalAlpha=pulse;ctx.fillRect(2,-24,11,4);ctx.fillRect(2,20,11,4);ctx.globalAlpha=1;}
  }
  for(const [id,sys] of Object.entries(e.p2Systems||{})){if(sys.alive)continue;const x=sys.ox||0,y=sys.oy||0;ctx.fillStyle='#080b12';ctx.beginPath();ctx.arc(x,y,8,0,TWO_PI);ctx.fill();ctx.strokeStyle='#ff7d68';ctx.globalAlpha=.5+.3*Math.sin(S.time*10);ctx.beginPath();ctx.arc(x,y,10,0,TWO_PI);ctx.stroke();ctx.globalAlpha=1;}
  if(ratio<.66){a.damageStateFrames++;ctx.globalAlpha=(1-ratio)*.9;ctx.fillStyle='#9aa5ae';for(let i=0;i<(ratio<.33?4:2);i++){const ox=-8+i*11,oy=-12+i*8;ctx.beginPath();ctx.arc(ox,oy,4+Math.sin(S.time*2+i)*2,0,TWO_PI);ctx.fill();}}
  if(ratio<.30){a.criticalCapitalFrames++;ctx.globalAlpha=.75+.2*Math.sin(S.time*13);ctx.fillStyle='#ff4f67';ctx.shadowColor='#ff4f67';ctx.shadowBlur=18;ctx.beginPath();ctx.arc(2,0,7,0,TWO_PI);ctx.fill();ctx.shadowBlur=0;}
  ctx.restore();
}

const __aaa6DrawEnemy=drawEnemy;
drawEnemy=function(e){__aaa6DrawEnemy(e);aaa6DrawCapitalIdentity(e);};

function aaa6DrawEdgeIntel(){
  if(!S||S.phase!=='running')return;const a=aaa6Ensure();
  const incoming=S.enemies.filter(e=>e&&e.hp>0&&e.x>W-8&&aaaRole(e).priority>=3).sort((x,y)=>aaaRole(y).priority-aaaRole(x).priority).slice(0,2);
  if(incoming.length){ctx.save();ctx.textAlign='right';ctx.font='bold 8px monospace';for(let i=0;i<incoming.length;i++){const e=incoming[i],role=aaaRole(e),y=clamp(e.y,34,H-50);a.edgeWarnings++;ctx.fillStyle='#050914dc';ctx.fillRect(W-116,y-10,104,20);ctx.strokeStyle='#ffd36f';ctx.strokeRect(W-116,y-10,104,20);ctx.fillStyle='#ffd36f';ctx.fillText('INBOUND '+role.label,W-20,y+3);ctx.beginPath();ctx.moveTo(W-10,y);ctx.lineTo(W-3,y-6);ctx.lineTo(W-3,y+6);ctx.closePath();ctx.fill();}ctx.restore();}
  const t=S.focusTarget;if(t&&S.focusTimer>0&&(t.x<0||t.x>W||t.y<0||t.y>H)){a.offscreenFocusFrames++;const x=clamp(t.x,16,W-16),y=clamp(t.y,24,H-24);ctx.save();ctx.translate(x,y);ctx.fillStyle='#8ff7ff';ctx.rotate(Math.atan2(t.y-H/2,t.x-W/2));ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-6,-7);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();}
}

const __aaa6Draw=draw;
draw=function(){__aaa6Draw();aaa6DrawEdgeIntel();};

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.aaa6State=()=>S?.aaa?.v108||null;
  window.__STARWARD__.aaa6DrawCapitalIdentity=aaa6DrawCapitalIdentity;
}
// ---- end V10.8 cinematic warship readability ----
`;

  function apply(source){
    const transformed=base.apply(source);
    for(const hook of ['AAA3_CAPITAL_CLASSES','aaa5FocusDetail','aaa4ExposeCapitalSystem'])if(!transformed.includes(hook))throw new Error('Starward V10.8 hook missing: '+hook);
    const close=transformed.lastIndexOf('})();');
    if(close<0)throw new Error('Starward V10.8 runtime closure not found');
    return transformed.slice(0,close)+POLISH6+'\n'+transformed.slice(close);
  }
  return {apply};
});

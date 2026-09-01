(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v10-transform.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V10 base transform missing');

  const POLISH_BLOCK=String.raw`

// ---- Starward Run V10.2 systems-and-focus polish ----
const P2_SYSTEM_META={
  shield:{name:'SHIELD RELAY',short:'S',threshold:.76,ox:-4,oy:-30},
  hangar:{name:'LAUNCH BAY',short:'H',threshold:.50,ox:14,oy:0},
  cannon:{name:'HEAVY CANNON',short:'C',threshold:.25,ox:-4,oy:30}
};

function p2Ensure(){
  aaaEnsureState();
  if(!S.aaa.p2)S.aaa.p2={focusChain:0,maxFocusChain:0,systemKills:0,commanderKills:0,peakPressure:0,peakBullets:0,peakEnemies:0,qualityDrops:0,lastQuality:S.quality,resultsAdded:false};
  return S.aaa.p2;
}

function p2InitCapital(e){
  if(!e||!e.aaaCapital)return e;
  if(e.p2Systems)return e;
  const unit=Math.max(18,e.maxHp*.13);
  e.p2Systems={
    shield:{...P2_SYSTEM_META.shield,hp:unit,maxHp:unit,alive:true},
    hangar:{...P2_SYSTEM_META.hangar,hp:unit,maxHp:unit,alive:true},
    cannon:{...P2_SYSTEM_META.cannon,hp:unit,maxHp:unit,alive:true}
  };
  return e;
}

function p2BreakSystem(e,id,reason='damage'){
  const sys=e?.p2Systems?.[id];
  if(!sys||!sys.alive)return false;
  sys.alive=false;sys.hp=0;p2Ensure().systemKills++;
  burst(e.x+(sys.ox||0),e.y+(sys.oy||0),'#ffe28a',28,300,4);
  popup(sys.name+' DOWN',e.x,e.y+(sys.oy||0)-18,'#ffe56b',1.2);
  S.screenShake=Math.max(S.screenShake,5.5);
  if(id==='hangar')e.aaaLaunchAt=1e9;
  if(id==='cannon')e.fire=Math.max(e.fire||0,3.8);
  if(reason==='focused')addLaserCharge(1.4);
  return true;
}

const __p2SpawnCapital=aaaSpawnCapital;
aaaSpawnCapital=function(){
  const before=new Set(S?.enemies||[]),ok=__p2SpawnCapital();
  if(ok&&S)for(const e of S.enemies)if(!before.has(e)&&e.aaaCapital)p2InitCapital(e);
  return ok;
};

const __p2EnemySystems=aaaEnemySystems;
aaaEnemySystems=function(dt){
  __p2EnemySystems(dt);
  if(!S)return;
  for(const e of S.enemies){
    if(!e?.aaaCapital||e.hp<=0)continue;
    p2InitCapital(e);
    const ratio=clamp(e.hp/e.maxHp,0,1);
    for(const [id,meta] of Object.entries(P2_SYSTEM_META))if(e.p2Systems[id].alive&&ratio<=meta.threshold)p2BreakSystem(e,id,'hull');
    if(!e.p2Systems.hangar.alive)e.aaaLaunchAt=1e9;
  }
};

if(typeof enemyFire==='function'){
  const __p2EnemyFire=enemyFire;
  enemyFire=function(e){
    if(e?.aaaCapital&&e.p2Systems&&!e.p2Systems.cannon.alive&&chance(.56))return;
    return __p2EnemyFire(e);
  };
}

const __p2UpdateProjectiles=updateProjectiles;
updateProjectiles=function(dt){
  if(!S)return __p2UpdateProjectiles(dt);
  const caps=S.enemies.filter(e=>e?.aaaCapital&&e.hp>0).map(e=>(p2InitCapital(e),[e,e.hp]));
  __p2UpdateProjectiles(dt);
  for(const [e,before] of caps){
    if(e.hp>=before||e.hp<=0)continue;
    const lost=before-e.hp,focus=S.p2CapitalFocus&&S.p2CapitalFocus.e===e?S.p2CapitalFocus:null;
    if(focus&&e.p2Systems?.[focus.id]?.alive&&S.focusTarget===e&&S.focusTimer>0){
      e.hp=Math.min(e.maxHp,e.hp+lost*.58);
      const sys=e.p2Systems[focus.id];sys.hp-=lost*1.35;
      if(sys.hp<=0){p2BreakSystem(e,focus.id,'focused');S.p2CapitalFocus=null;}
    }else if(e.p2Systems?.shield?.alive){
      e.hp=Math.min(e.maxHp,e.hp+lost*.18);
    }
  }
};

function p2CapitalNode(e,id){const s=e.p2Systems?.[id]||P2_SYSTEM_META[id];return{x:e.x+(s.ox||0),y:e.y+(s.oy||0)};}

canvas.addEventListener('pointerdown',ev=>{
  if(!S||S.phase!=='running')return;
  const rect=canvas.getBoundingClientRect(),x=(ev.clientX-rect.left)*W/rect.width,y=(ev.clientY-rect.top)*H/rect.height;
  let best=null,bestD=26;
  for(const e of S.enemies){
    if(!e?.aaaCapital||e.hp<=0)continue;p2InitCapital(e);
    for(const [id,sys] of Object.entries(e.p2Systems)){
      if(!sys.alive)continue;const n=p2CapitalNode(e,id),d=dist(x,y,n.x,n.y);
      if(d<bestD){bestD=d;best={e,id,sys,n};}
    }
  }
  if(best){
    S.focusTarget=best.e;S.focusBossPart=null;S.focusTimer=8;S.p2CapitalFocus={e:best.e,id:best.id};
    popup('FOCUS '+best.sys.name,best.n.x,best.n.y-18,'#8ff7ff',1.0);
    if(typeof sfx==='function')sfx('focus');
  }
});

const __p2KillEnemy=killEnemy;
killEnemy=function(e){
  const focused=!!(S&&S.focusTarget===e&&S.focusTimer>0),role=aaaRole(e),commander=e?.affix?.id==='commander',x=e?.x||0,y=e?.y||0;
  __p2KillEnemy(e);
  if(!S)return;
  const p=p2Ensure();
  if(commander){
    p.commanderKills++;
    for(const o of S.enemies){if(o&&o!==e&&o.hp>0&&dist(o.x,o.y,x,y)<235){o.hp-=o.maxHp*.11;o.fire=(o.fire||0)+1.0;o.aaaGuarded=false;}}
    burst(x,y,'#ffe56b',36,340,5);popup('COMMAND COLLAPSE',x,y-36,'#ffe56b',1.15);
  }
  if(focused&&role.priority>=2&&S.phase==='running'){
    const next=aaaPriorityTarget();
    if(next&&next!==e&&next.hp>0){
      p.focusChain++;p.maxFocusChain=Math.max(p.maxFocusChain,p.focusChain);
      S.focusTarget=next;S.focusBossPart=null;S.focusTimer=Math.max(3.0,S.focusTimer||0);S.p2CapitalFocus=null;
      popup('CHAIN LOCK x'+(p.focusChain+1),next.x,next.y-next.size-26,'#8ff7ff',1.0);
    }else p.focusChain=0;
  }else if(S.focusTimer<=0)p.focusChain=0;
};

if(typeof updateBoss==='function'){
  const __p2UpdateBoss=updateBoss;
  updateBoss=function(dt){
    __p2UpdateBoss(dt);
    const b=S?.boss;if(!b||!Array.isArray(b.parts))return;
    const reactor=b.parts[3];
    if(reactor&&reactor.hp<=0&&b.hp>0){
      if(!reactor.p2BleedShown){reactor.p2BleedShown=true;popup('REACTOR BREACH',b.x+(reactor.ox||0),b.y+(reactor.oy||0)-28,'#ffcf67',1.2);}
      b.hp-=Math.max(1,(b.maxHp||b.hp)*.010*dt);
    }
  };
}

if(typeof drawEnemy==='function'){
  const __p2DrawEnemy=drawEnemy;
  drawEnemy=function(e){
    __p2DrawEnemy(e);
    if(!e?.aaaCapital||e.hp<=0)return;p2InitCapital(e);
    ctx.save();ctx.font='bold 8px monospace';ctx.textAlign='center';
    for(const [id,sys] of Object.entries(e.p2Systems)){
      const n=p2CapitalNode(e,id),focused=S.p2CapitalFocus?.e===e&&S.p2CapitalFocus?.id===id;
      ctx.globalAlpha=sys.alive?1:.22;ctx.fillStyle=focused?'#ffffff':sys.alive?'#ffd66f':'#647080';
      ctx.beginPath();ctx.arc(n.x,n.y,focused?8:6,0,TWO_PI);ctx.fill();
      ctx.fillStyle='#08111c';ctx.fillText(sys.short,n.x,n.y+3);
      if(focused){
        const w=38,ratio=clamp(sys.hp/sys.maxHp,0,1);ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(n.x-w/2,n.y-16,w,4);ctx.fillStyle='#8ff7ff';ctx.fillRect(n.x-w/2,n.y-16,w*ratio,4);
      }
    }
    ctx.restore();
  };
}

function p2AppendResults(){
  if(!S||typeof overlayText==='undefined')return;
  const p=p2Ensure();if(p.resultsAdded)return;
  p.resultsAdded=true;
  overlayText.innerHTML+='<div class="tactical-results"><strong>TACTICAL COMMAND</strong><span>Priority kills '+(S.aaa.focusKills||0)+'</span><span>Best focus chain '+Math.max(1,p.maxFocusChain+1)+'×</span><span>Capital ships '+(S.aaa.capitalKills||0)+'</span><span>Systems destroyed '+p.systemKills+'</span></div>';
}

if(typeof showResults==='function'){
  const __p2ShowResults=showResults;
  showResults=function(){const r=__p2ShowResults.apply(this,arguments);p2AppendResults();return r;};
}

const __p2Update=update;
update=function(dt){
  __p2Update(dt);
  if(!S)return;const p=p2Ensure();
  const pressure=S.enemies.length+S.bullets.length*.16+S.shots.length*.08;
  p.peakPressure=Math.max(p.peakPressure,pressure);p.peakBullets=Math.max(p.peakBullets,S.bullets.length);p.peakEnemies=Math.max(p.peakEnemies,S.enemies.length);
  if(S.quality<p.lastQuality-.01)p.qualityDrops++;p.lastQuality=S.quality;
  if(S.phase==='dead'&&!p.resultsAdded&&typeof overlayText!=='undefined'&&/BUILD OF THE RUN/.test(overlayText.innerHTML||''))p2AppendResults();
};

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.aaaSpawnCapital=aaaSpawnCapital;
  window.__STARWARD__.p2InitCapital=p2InitCapital;
  window.__STARWARD__.p2BreakSystem=p2BreakSystem;
  window.__STARWARD__.p2State=()=>S?.aaa?.p2||null;
}
// ---- end V10.2 polish ----
`;

  function apply(source){
    const transformed=base.apply(source);
    for(const hook of ['aaaSpawnCapital','aaaEnemySystems','aaaRole','function updateBoss'])if(!transformed.includes(hook))throw new Error('Starward V10.2 hook missing: '+hook);
    const close=transformed.lastIndexOf('})();');
    if(close<0)throw new Error('Starward V10.2 runtime closure not found');
    return transformed.slice(0,close)+POLISH_BLOCK+'\n'+transformed.slice(close);
  }
  return {apply};
});

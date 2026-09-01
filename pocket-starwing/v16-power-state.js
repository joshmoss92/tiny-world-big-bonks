(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v15-final-controls.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V15 transform missing');

  const V16_BLOCK=String.raw`

// ---- Starward Run V16 power-state hardening ----
const V16_POWER_KEYS=['trident','aegis','seeker','ricochet','timeshift','magnet'];
const __v16Ensure=v12Ensure;
v12Ensure=function(){
  const v=__v16Ensure();if(!v)return v;
  for(const key of V16_POWER_KEYS)if(!Number.isFinite(v.buffs[key]))v.buffs[key]=0;
  return v;
};

const __v16ApplyPower=v12ApplyPower;
v12ApplyPower=function(p){v12Ensure();const ok=__v16ApplyPower(p);v12Ensure();return ok;};

const __v16Accept=acceptLiveEvent;
acceptLiveEvent=function(){v12Ensure();const ok=__v16Accept();v12Ensure();return ok;};

const __v16Update=update;
update=function(dt){v12Ensure();return __v16Update(dt);};

if(typeof window!=='undefined'&&window.__STARWARD__){
  window.__STARWARD__.v12CollectPowerup=v12ApplyPower;
  window.__STARWARD__.v16PowerState=()=>Object.fromEntries(V16_POWER_KEYS.map(k=>[k,v12Ensure()?.buffs?.[k]||0]));
  window.__STARWARD__.v16FireTick=()=>updateWeapons(.016);
}
// ---- end V16 power-state hardening ----
`;

  function apply(source){
    const transformed=base.apply(source);
    for(const hook of ['V12_POWER_TYPES','v15BulletAtPointer','v14WrapAll','v13PowerTypes'])if(!transformed.includes(hook))throw new Error('Starward V16 hook missing: '+hook);
    const close=transformed.lastIndexOf('})();');if(close<0)throw new Error('Starward V16 runtime closure not found');
    return transformed.slice(0,close)+V16_BLOCK+'\n'+transformed.slice(close);
  }
  return {apply};
});
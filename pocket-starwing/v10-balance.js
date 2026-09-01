(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v10-polish2.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V10.2 transform missing');
  function swap(source,from,to,label){
    if(!source.includes(from))throw new Error(`V10 balance hook missing: ${label}`);
    return source.replace(from,to);
  }
  function rebalance(source){
    source=swap(source,"nextFormationAt:24,nextCapitalAt:58","nextFormationAt:28,nextCapitalAt:70",'director start');
    source=swap(source,"e.hp*=2.3;e.maxHp=e.hp","e.hp*=1.65;e.maxHp=e.hp",'capital durability');
    source=swap(source,"[[0,-72,'guardian'],[0,72,'guardian'],[-55,-108,'gunner'],[-55,108,'gunner'],[-90,-38,'scout'],[-90,38,'scout']]","[[0,-70,'guardian'],[0,70,'guardian'],[-78,-35,'scout'],[-78,35,'scout']]",'formation size');
    source=swap(source,"for(let i=0;i<4;i++){const g=spawnEnemy(i<2?'guardian':'gunner',y+(i-1.5)*62,{x:W+30+i*18});if(g){g.aaaEscort=true;g.hp*=1.15;g.maxHp=g.hp;}}","for(let i=0;i<2;i++){const g=spawnEnemy(i===0?'guardian':'gunner',y+(i-.5)*78,{x:W+35+i*22});if(g){g.aaaEscort=true;g.maxHp=g.hp;}}",'capital escort count');
    source=swap(source,"e.hp+=lost*.18","e.hp+=lost*.10",'guard mitigation');
    source=swap(source,"e.hp=Math.min(e.maxHp,e.hp+1.4*dt);e.fire=Math.max(.03,e.fire-.10*dt)","e.hp=Math.min(e.maxHp,e.hp+.8*dt);e.fire=Math.max(.03,e.fire-.06*dt)",'commander aura');
    source=swap(source,"c.aaaLaunchAt=now+5.2","c.aaaLaunchAt=now+6.5",'capital launch cadence');
    source=swap(source,"a.nextFormationAt=S.time+rand(34,44)","a.nextFormationAt=S.time+rand(44,58)",'formation cadence');
    source=swap(source,"a.nextCapitalAt=S.time+rand(80,102)","a.nextCapitalAt=S.time+rand(100,130)",'capital cadence');
    source=swap(source,"addLaserCharge(capital?5:2.5);gainXP(capital?6:2);","addLaserCharge(capital?7:3.5);gainXP(capital?6:2);",'focus reward');
    source=swap(source,"addLaserCharge(1.5);gainXP(2);","addLaserCharge(2.5);gainXP(2);",'system reward');
    source=swap(source,"canvas.addEventListener('pointerdown',aaaPointerCapital);","// V10.2 owns capital-system pointer targeting.",'duplicate capital pointer');
    source=swap(source,"aaaDrawTacticalAura(e);aaaDrawDamageState(e);aaaDrawCapitalSystems(e);aaaDrawHealthBar(e);","aaaDrawTacticalAura(e);aaaDrawDamageState(e);aaaDrawHealthBar(e);",'duplicate capital system render');
    source=swap(source,"if(role.priority>=2){ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=e.aaaCapital?'#ffd36f':'#f4fbff';ctx.fillText(role.icon+' '+role.label,0,y-5);}","if(role.priority>=3||e.elite||e.aaaCapital||S.focusTarget===e){ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=e.aaaCapital?'#ffd36f':'#f4fbff';ctx.fillText(role.icon+' '+role.label,0,y-5);}",'role label clutter');
    if(!/laserCharge:1(?=[},])/.test(source))throw new Error('V10 balance hook missing: base laser charge');
    source=source.replace(/laserCharge:1(?=[},])/,'laserCharge:1.2');
    return source;
  }
  function apply(source){
    if(typeof source!=='string')throw new TypeError('Starward V10 balance expects source text');
    return rebalance(base.apply(source));
  }
  return {apply};
});

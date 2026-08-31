'use strict';
/* v12 final balance corrections: remove legacy hidden safety and make level choices fair. */
(function(){
const oldHurt=hurt;
hurt=function(amount,from){
  /* Base gameplay still contains old accessibility reductions (.62 early, .84 low HP).
     Cancel those here, then add v12 lethality. Spawn shield remains the only opening protection. */
  let correction=1.12;
  if(run<38)correction/=.62;
  if(hp<maxHp*.3)correction/=.84;
  oldHurt(amount*correction,from);
  /* Shorter post-hit immunity: dodging and positioning matter. */
  invuln=Math.min(invuln,.62);
};
const oldUpdate=update;
update=function(dt){
  /* No death while reading three simple level choices. */
  if(window.REBUILD_V12&&REBUILD_V12.choice)return;
  oldUpdate(dt);
};
window.__TWBB_V12_BALANCE_TEST__={get:()=>({earlySafetyRemoved:true,invulnCap:.62,choicePause:!!(window.REBUILD_V12&&REBUILD_V12.choice)})};
})();
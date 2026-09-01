(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./v10-balance.js'));
  else root.StarwardV10Transform=factory(root.StarwardV10Transform);
})(typeof globalThis!=='undefined'?globalThis:this,function(base){
  'use strict';
  if(!base||typeof base.apply!=='function')throw new Error('Starward V10 balance transform missing');
  function apply(source){
    let transformed=base.apply(source);
    if(!transformed.includes('P2_SYSTEM_META'))throw new Error('Starward V10.4 systems layer missing');
    if(!transformed.includes('p2AppendResults();choiceGrid.classList.add'))throw new Error('Starward V10.4 direct results hook missing');
    transformed=transformed.replace('let best=null,bestD=26;','let best=null,bestD=34;');
    transformed=transformed.replace('const unit=Math.max(18,e.maxHp*.13);','const unit=Math.max(16,e.maxHp*.10);');
    return transformed;
  }
  return {apply};
});

const fs=require('fs'),vm=require('vm');
class CL{constructor(){this.s=new Set()}add(...v){v.forEach(x=>this.s.add(x))}remove(...v){v.forEach(x=>this.s.delete(x))}contains(v){return this.s.has(v)}}
class El{constructor(id=''){this.id=id;this.textContent='';this._html='';this.className='';this.classList=new CL();this.children=[];this.style={};this.listeners={};this.width=960;this.height=540}set innerHTML(v){this._html=v;if(v==='')this.children=[]}get innerHTML(){return this._html}addEventListener(t,fn){this.listeners[t]=fn}appendChild(c){this.children.push(c)}click(){const f=this.listeners.click||this.onclick;if(f)f({clientX:165,clientY:270,preventDefault(){}})}trigger(t,e={}){const f=this.listeners[t];if(f)f(e)}getBoundingClientRect(){return{left:0,top:0,width:960,height:540}}}
const ids=['game','overlay','overlayTitle','overlayText','eyebrow','choiceGrid','startBtn','time','hull','shield','level','salvage','statDamage','statRate','statDodge','statThrust','statRepair','statLuck','xpText','xpBar','buildChips'];
const el=Object.fromEntries(ids.map(id=>[id,new El(id)]));
const ctx={imageSmoothingEnabled:false,fillStyle:'',strokeStyle:'',shadowColor:'',shadowBlur:0,lineWidth:1,font:'',textAlign:'',globalAlpha:1,createLinearGradient(){return{addColorStop(){}}},fillRect(){},strokeRect(){},beginPath(){},arc(){},ellipse(){},fill(){},stroke(){},save(){},restore(){},translate(){},rotate(){},moveTo(){},lineTo(){},closePath(){},fillText(){}};
el.game.getContext=()=>ctx;
const document={getElementById:id=>el[id],createElement:tag=>new El(tag)};
let raf=[],now=0;const requestAnimationFrame=fn=>(raf.push(fn),raf.length),cancelAnimationFrame=()=>{};
const localStorage={m:{},getItem(k){return this.m[k]||null},setItem(k,v){this.m[k]=String(v)}};
let seed=987654321;const gameMath=Object.create(Math);gameMath.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const sandbox={document,localStorage,requestAnimationFrame,cancelAnimationFrame,performance:{now:()=>now},setTimeout:fn=>(fn(),1),Math:gameMath,console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(__dirname+'/game-v6.js','utf8'),sandbox);
if(!el.startBtn.listeners.click)throw Error('Start button not registered');
if(!el.game.listeners.pointerdown)throw Error('Canvas pointer interaction not registered');
if(typeof sandbox.__starwardDebug!=='function')throw Error('Debug state unavailable');
el.startBtn.click();
for(let i=0;i<5;i++){
  if(el.choiceGrid.children.length!==3)throw Error(`Opening choice ${i+1} had ${el.choiceGrid.children.length} cards`);
  el.choiceGrid.children[Math.min(1,el.choiceGrid.children.length-1)].click();
}
if(!raf.length)throw Error('Combat did not start after five choices');
let laterChoices=0,maxEnemies=0;const laserFires=[];
for(let frame=0;frame<12000;frame++){
  if(!raf.length)break;
  const fn=raf.shift();now+=16.666;fn(now);
  const d=sandbox.__starwardDebug();maxEnemies=Math.max(maxEnemies,d.enemies);
  if(frame%60===0&&d.laserReady){
    const fireAt=d.time;
    el.game.trigger('pointerdown',{clientX:165,clientY:270,preventDefault(){}});
    if(!sandbox.__starwardDebug().laserReady)laserFires.push(fireAt);
  }
  if(el.choiceGrid.children.length===3&&!el.overlay.classList.contains('hidden')&&!el.choiceGrid.classList.contains('hidden')){
    laterChoices++;el.choiceGrid.children[0].click();
  }
}
const d=sandbox.__starwardDebug();
if(d.time<100)throw Error(`Run ended too early at ${d.time.toFixed(1)}s`);
if(maxEnemies<25)throw Error(`Enemy density too low: max ${maxEnemies}`);
if(laserFires.length<2)throw Error(`Expected at least two Star Laser releases, got ${laserFires.length}`);
for(let i=1;i<laserFires.length;i++)if(laserFires[i]-laserFires[i-1]<29.8)throw Error(`Star Laser cooldown violated: ${(laserFires[i]-laserFires[i-1]).toFixed(2)}s`);
if(laterChoices>4)throw Error(`Too many paused choices: ${laterChoices}`);
console.log(`Starward V6 smoke OK: ${d.time.toFixed(1)}s, max enemies ${maxEnemies}, Star Lasers ${laserFires.map(t=>t.toFixed(1)).join(', ')}, choices ${laterChoices}, hull ${d.hull.toFixed(1)}`);

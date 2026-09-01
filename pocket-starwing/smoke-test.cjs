const fs=require('fs'),vm=require('vm');

class CL{
  constructor(){this.s=new Set()}
  add(...v){v.forEach(x=>this.s.add(x))}
  remove(...v){v.forEach(x=>this.s.delete(x))}
  contains(v){return this.s.has(v)}
}
class El{
  constructor(id=''){
    this.id=id;this.textContent='';this._html='';this.className='';this.classList=new CL();this.children=[];this.style={};this.listeners={};
    this.width=960;this.height=540;
  }
  set innerHTML(v){this._html=v;if(v==='')this.children=[]}
  get innerHTML(){return this._html}
  addEventListener(t,fn){this.listeners[t]=fn}
  appendChild(c){this.children.push(c)}
  click(){const f=this.listeners.click||this.onclick;if(f)f({clientX:0,clientY:0})}
  dispatch(t,e){const f=this.listeners[t];if(f)f(e||{})}
  getBoundingClientRect(){return{left:0,top:0,width:960,height:540}}
}
const ids=['game','overlay','overlayTitle','overlayText','eyebrow','choiceGrid','startBtn','hudTime','hudSector','hudHull','hudShield','laserStatus','laserFill','threatStatus','threatFill','upgradeStatus','upgradeFill','buildChips'];
const el=Object.fromEntries(ids.map(id=>[id,new El(id)]));
const gradient=()=>({addColorStop(){}});
const ctx={
  imageSmoothingEnabled:true,fillStyle:'',strokeStyle:'',shadowColor:'',shadowBlur:0,lineWidth:1,font:'',textAlign:'',globalAlpha:1,
  createLinearGradient:gradient,createRadialGradient:gradient,fillRect(){},strokeRect(){},beginPath(){},arc(){},fill(){},stroke(){},save(){},restore(){},
  translate(){},rotate(){},moveTo(){},lineTo(){},closePath(){},fillText(){}
};
el.game.getContext=()=>ctx;
const document={getElementById:id=>el[id],createElement:tag=>new El(tag)};
let raf=[],now=0;
const requestAnimationFrame=fn=>(raf.push(fn),raf.length);
const cancelAnimationFrame=()=>{};
const localStorage={m:{},getItem(k){return this.m[k]||null},setItem(k,v){this.m[k]=String(v)}};
let seed=123456789;
const gameMath=Object.create(Math);
gameMath.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const window={matchMedia:()=>({matches:false})};
const sandbox={document,window,localStorage,requestAnimationFrame,cancelAnimationFrame,performance:{now:()=>now},Math:gameMath,console};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/game.js','utf8'),sandbox);

if(!el.startBtn.listeners.click)throw Error('Start button not registered');
if(!el.game.listeners.pointerdown)throw Error('Canvas interaction not registered');
if(!window.__STARWARD__)throw Error('Debug state unavailable');

el.startBtn.click();
for(let i=0;i<5;i++){
  if(el.choiceGrid.children.length!==3)throw Error(`Opening step ${i+1} has ${el.choiceGrid.children.length} cards`);
  const preferred=el.choiceGrid.children.find(c=>/Hull|Shield|Repair|Dodging|Engines|Armor|Second Chance/i.test(c.innerHTML))||el.choiceGrid.children[0];
  preferred.click();
}
if(!raf.length)throw Error('Run did not start after five choices');

let pausedChoices=0,eventSeen=false,eventAccepted=false;
for(let frame=0;frame<10500;frame++){
  if(!raf.length)break;
  const fn=raf.shift();
  now+=16.666;
  fn(now);

  const state=window.__STARWARD__.getState();
  if(state.liveEvent){eventSeen=true;if(!eventAccepted){window.__STARWARD__.acceptEvent();eventAccepted=true;}}

  if(frame%60===0){
    el.game.dispatch('pointerdown',{clientX:168,clientY:270});
  }

  if(!el.overlay.classList.contains('hidden')&&!el.choiceGrid.classList.contains('hidden')&&el.choiceGrid.children.length===3){
    pausedChoices++;
    const preferred=el.choiceGrid.children.find(c=>/Hull|Shield|Repair|Dodging|Engines|Armor|Second Chance/i.test(c.innerHTML))||el.choiceGrid.children[0];
    preferred.click();
  }
}
const state=window.__STARWARD__.getState();
if(state.time<90)throw Error(`Baseline run ended too early at ${state.time.toFixed(1)}s`);
if(!eventSeen)throw Error('No real-time event appeared');
if(!eventAccepted)throw Error('Live event could not be accepted');
if(state.maxEnemiesSeen<24)throw Error(`Enemy density too low: peak ${state.maxEnemiesSeen}`);
if(pausedChoices>5)throw Error(`Too many blocking choices: ${pausedChoices}`);

for(let i=1;i<state.laserTimes.length;i++){
  const gap=state.laserTimes[i]-state.laserTimes[i-1];
  if(gap<29.95)throw Error(`Star Laser cooldown violated: ${gap.toFixed(2)}s`);
}
if(state.laserTimes.length<2)throw Error(`Star Laser only fired ${state.laserTimes.length} time(s)`);

console.log(`Starward reboot smoke OK: ${state.time.toFixed(1)}s, peak enemies ${state.maxEnemiesSeen}, paused choices ${pausedChoices}, lasers ${state.laserTimes.map(x=>x.toFixed(1)).join(', ')}`);

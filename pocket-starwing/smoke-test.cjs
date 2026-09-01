const fs=require('fs'),vm=require('vm');
class ClassList{constructor(){this.s=new Set()}add(...v){v.forEach(x=>this.s.add(x))}remove(...v){v.forEach(x=>this.s.delete(x))}contains(v){return this.s.has(v)}}
class El{constructor(id=''){this.id=id;this.textContent='';this._html='';this.className='';this.classList=new ClassList();this.children=[];this.style={};this.listeners={}}set innerHTML(v){this._html=v;if(v==='')this.children=[]}get innerHTML(){return this._html}addEventListener(t,fn){this.listeners[t]=fn}appendChild(c){this.children.push(c)}click(){const fn=this.listeners.click||this.onclick;if(fn)fn()}}
const ids=['game','overlay','overlayTitle','overlayText','eyebrow','choiceGrid','startBtn','time','hull','shield','level','salvage','statDamage','statRate','statDodge','statThrust','statRepair','statLuck','xpText','xpBar','buildChips'];
const el=Object.fromEntries(ids.map(id=>[id,new El(id)]));
const ctx={imageSmoothingEnabled:false,fillStyle:'',strokeStyle:'',lineWidth:1,font:'',textAlign:'',globalAlpha:1,createLinearGradient(){return{addColorStop(){}}},fillRect(){},beginPath(){},arc(){},fill(){},stroke(){},save(){},restore(){},translate(){},rotate(){},moveTo(){},lineTo(){},closePath(){},strokeRect(){},rect(){},fillText(){}};
el.game.width=960;el.game.height=540;el.game.getContext=()=>ctx;
const document={getElementById:id=>el[id],createElement:tag=>new El(tag)};
let raf=[],now=0;const requestAnimationFrame=fn=>(raf.push(fn),raf.length);const cancelAnimationFrame=()=>{};
const localStorage={m:{},getItem(k){return this.m[k]||null},setItem(k,v){this.m[k]=String(v)}};
const sandbox={document,localStorage,requestAnimationFrame,cancelAnimationFrame,performance:{now:()=>now},setTimeout:fn=>(fn(),1),Math,console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(__dirname+'/game.js','utf8'),sandbox);
if(!el.startBtn.listeners.click)throw new Error('Start button not registered');
el.startBtn.click();
for(let i=0;i<5;i++){if(el.choiceGrid.children.length!==3)throw new Error(`Opening draft ${i+1} had ${el.choiceGrid.children.length} cards`);el.choiceGrid.children[0].click()}
if(!raf.length)throw new Error('Combat loop did not start after five picks');
for(let frame=0;frame<12000;frame++){if(!raf.length)break;const fn=raf.shift();now+=16.666;fn(now);if(el.choiceGrid.children.length===3&&!el.overlay.classList.contains('hidden'))el.choiceGrid.children[0].click()}
const seconds=parseInt(el.time.textContent.split(':')[0],10)*60+parseInt(el.time.textContent.split(':')[1],10);
if(seconds<150)throw new Error(`Run simulation stopped too early at ${el.time.textContent}`);
console.log(`Starward smoke OK: ${el.time.textContent}, hull ${el.hull.textContent}, level ${el.level.textContent}`);

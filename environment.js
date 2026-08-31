'use strict';
/* Tiny World, Big Bonks — Infinite World Immersion Layer v5
   Deterministic macro geography + scenic asset grammar + 2.5D occlusion + weather/lighting. */
(function(){
const ENV={version:5,macroCell:1320,sceneCell:144,features:[],seen:new Set(),weatherParts:[],lastMacro:'',assetVocabulary:384,featureVocabulary:28};
window.ENV=ENV;
const TAU=Math.PI*2;
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function H(a,b,s=0){return hash(a,b,700+s)}
function N(x,y,s=0){return noise(x,y,700+s)}
function rgba(hex,a){if(!hex||hex[0]!=='#')return `rgba(255,255,255,${a})`;let h=hex.slice(1);if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
function biomeBlend(x,y){
  const samples=[[0,0],[260,0],[-260,0],[0,260],[0,-260],[185,185],[-185,185],[185,-185],[-185,-185]];
  const weights=new Map();
  for(const [ox,oy] of samples){const b=biomeAtWorld(x+ox,y+oy),d=Math.hypot(ox,oy),wgt=1/(1+d/260);weights.set(b,(weights.get(b)||0)+wgt)}
  return [...weights.entries()].sort((a,b)=>b[1]-a[1]);
}
function macroKind(cx,cy){
  const r=H(cx,cy,1),tier=dangerAt(cx*ENV.macroCell,cy*ENV.macroCell);
  if(Math.abs(cx)<=1&&Math.abs(cy)<=1&&r<.72)return null;
  const pool=tier<=1?['giantTree','fairyPond','lake','ancientRoad','stoneCircle','blossomArch','oldBridge','waterfall']:
    tier===2?['canyon','mountainPass','crystalGarden','mushroomGrove','ruinedAqueduct','moonGate','hotSpring','giantTree','lake']:
    tier===3?['canyon','mountainPass','dragonBones','sunkenTemple','frozenFalls','obsidianSpire','skyPillars','witchMarsh','oldBridge']:
    ['starLake','voidChasm','skyPillars','worldTree','astralBridge','meteorField','dragonBones','obsidianSpire','moonGate'];
  return pool[Math.floor(r*pool.length)%pool.length];
}
function macroFeature(cx,cy){
  const kind=macroKind(cx,cy); if(!kind)return null;
  const size=ENV.macroCell,px=(cx+.17+H(cx,cy,2)*.66)*size,py=(cy+.17+H(cx,cy,3)*.66)*size;
  const rot=H(cx,cy,4)*TAU,scale=.78+H(cx,cy,5)*.62;
  return {id:`M${cx},${cy}`,cx,cy,x:px,y:py,kind,rot,scale,tier:dangerAt(px,py),seed:H(cx,cy,6)};
}
function nearbyFeatures(x,y,r=2){const cx=Math.floor(x/ENV.macroCell),cy=Math.floor(y/ENV.macroCell),out=[];for(let yy=cy-r;yy<=cy+r;yy++)for(let xx=cx-r;xx<=cx+r;xx++){const f=macroFeature(xx,yy);if(f)out.push(f)}return out}
ENV.nearbyFeatures=nearbyFeatures;
function featureDistance(f,x,y){return Math.hypot(x-f.x,y-f.y)}
function bridgeGap(f,x,y,width=58){const cs=Math.cos(f.rot),sn=Math.sin(f.rot),dx=x-f.x,dy=y-f.y,u=dx*cs+dy*sn,v=-dx*sn+dy*cs;return Math.abs(u)<width && Math.abs(v)<250*f.scale}
function blockedFeature(f,x,y,r){
  const dx=x-f.x,dy=y-f.y,d=Math.hypot(dx,dy);
  if(f.kind==='giantTree'||f.kind==='worldTree')return d<((f.kind==='worldTree'?92:58)*f.scale+r);
  if(f.kind==='lake'||f.kind==='fairyPond'||f.kind==='starLake'||f.kind==='hotSpring')return d<(f.kind==='fairyPond'?92:145)*f.scale+r && !bridgeGap(f,x,y,24);
  if(f.kind==='mountainPass'||f.kind==='skyPillars'){const cs=Math.cos(f.rot),sn=Math.sin(f.rot),u=dx*cs+dy*sn,v=-dx*sn+dy*cs;return Math.abs(v)<230*f.scale&&Math.abs(u)>58&&Math.abs(u)<300*f.scale;}
  if(f.kind==='canyon'||f.kind==='voidChasm'){const cs=Math.cos(f.rot),sn=Math.sin(f.rot),u=dx*cs+dy*sn,v=-dx*sn+dy*cs;const half=(f.kind==='voidChasm'?70:56)*f.scale;if(Math.abs(v)<half&&Math.abs(u)<430*f.scale){return !bridgeGap(f,x,y,48);} }
  if(f.kind==='obsidianSpire')return d<42*f.scale+r;
  return false;
}
ENV.blockedMacro=function(x,y,r=PLAYER_R){for(const f of nearbyFeatures(x,y,1))if(blockedFeature(f,x,y,r))return true;return false};
const oldBlocked=blockedCircle;blockedCircle=function(x,y,r=PLAYER_R){return oldBlocked(x,y,r)||ENV.blockedMacro(x,y,r)};
function scenicVariant(tx,ty){const b=biomeAtWorld(tx*ENV.sceneCell,ty*ENV.sceneCell),r=H(tx,ty,30),v=Math.floor(H(tx,ty,31)*8);let base;
 const pools={0:['grassTuft','daisyPatch','clover','fern','tinyRock','fallenLog','butterfly','wildFlowers'],1:['pinkShrub','blossomPile','bamboo','lanternFlower','mossRock','petalBush','tinyTorii','wisteria'],2:['moonGrass','lunarStone','violetFern','silverBush','mothBloom','moonMushroom','starPebbles','glowReed'],3:['reeds','mudStone','lilyPad','cattails','blueMushroom','bogFlower','driftwood','fireflyReed'],4:['emberGrass','charRock','ashShrub','lavaFlower','bonePile','obsidianChip','burntLog','fireFern'],5:['snowShrub','iceShard','frostFlower','pineCone','snowRock','frozenFern','iceBloom','tinySnowman'],6:['crystalSprig','gemRock','prismFlower','glassGrass','shardCluster','crystalFern','sparkStone','amethystBush'],7:['lotus','vinePatch','mossPillar','orchid','jadeRock','hangingVine','pondGrass','sunkenStatue'],8:['deadFern','purpleThorn','graveStone','blackMushroom','fogFlower','ravenPost','twistedRoot','witchHerb'],9:['starGrass','meteorPebble','astralFlower','blueCrystal','cometShrub','cosmicMushroom','stardustRock','voidFern']};
 base=pools[b][Math.floor(r*pools[b].length)];return {kind:base,variant:v,b};
}
function scenePropsAround(){const size=ENV.sceneCell,cx=Math.floor(player.x/size),cy=Math.floor(player.y/size),out=[];for(let yy=cy-5;yy<=cy+5;yy++)for(let xx=cx-5;xx<=cx+5;xx++){const density=H(xx,yy,32);if(density<.38)continue;const p=scenicVariant(xx,yy),jx=(H(xx,yy,33)-.5)*size*.7,jy=(H(xx,yy,34)-.5)*size*.7;out.push({x:(xx+.5)*size+jx,y:(yy+.5)*size+jy,...p,seed:H(xx,yy,35)});if(density>.82)out.push({x:(xx+.5)*size-jx*.45,y:(yy+.5)*size-jy*.45,...scenicVariant(xx+17,yy-11),seed:H(xx,yy,36)})}return out}
function drawPixelProp(p,t,cx,cy){const sx=Math.round(p.x-player.x+cx),sy=Math.round(p.y-player.y+cy);if(sx<-80||sx>w+80||sy<-100||sy>h+100)return;const v=p.variant,k=p.kind,b=p.b,pal=palettes[b],s=1+(v%3)*.12;ctx.save();ctx.translate(sx,sy);ctx.scale(s,s);const sway=Math.round(Math.sin(t*1.7+p.seed*7)*1.2);shadow(0,5,5+v%3);
 const r=(x,y,w,h,c)=>rect(x,y,w,h,c);
 if(/grass|fern|reed|herb|cattail|vine|clover/.test(k)){r(-1,0,2,9,pal.tree);r(-6+sway,-5,3,9,pal.tree);r(4-sway,-7,3,12,pal.edge);if(v%2)r(-3,-9,3,3,pal.detail)}
 else if(/flower|bloom|daisy|orchid|wisteria/.test(k)){r(-1,0,2,8,pal.tree);const c2=v%2?pal.detail:'#fff1b4';r(-5,-5,5,5,c2);r(1,-7,5,5,c2);r(-1,-3,4,4,'#fff0a0')}
 else if(/rock|stone|pebble|chip|shard|crystal|gem/.test(k)){r(-7,-2,14,8,pal.edge);r(-4,-6,9,7,v%2?pal.detail:'#a8a2ad');r(-2,-5,4,3,'#ffffff55')}
 else if(/mushroom/.test(k)){r(-2,-1,4,7,'#eadbc9');r(-7,-6,14,7,v%2?pal.detail:'#d67f9d');r(-3,-5,2,2,'#fff4d5')}
 else if(/log|driftwood|root/.test(k)){ctx.rotate((v%4)*.2);r(-11,-3,22,7,'#795846');r(-8,-1,5,2,'#a77b5f')}
 else if(k==='butterfly'){r(-6,-5,5,5,pal.detail);r(1,-5,5,5,'#fff0a6');r(-1,-4,2,8,'#564958')}
 else if(k==='lilyPad'||k==='lotus'){ctx.fillStyle='#5f9d73';ctx.beginPath();ctx.ellipse(0,0,9,5,0,0,TAU);ctx.fill();if(k==='lotus'){r(-3,-5,6,5,'#f3a9c5');r(-1,-7,3,4,'#fff1c4')}}
 else if(k==='bamboo'){for(let i=-5;i<=5;i+=5){r(i,-18-(v%3)*3,3,23+(v%3)*3,'#6b9b63');r(i-2,-11,7,2,'#84b378')}}
 else if(k==='tinyTorii'){r(-8,-10,3,15,'#b95d68');r(5,-10,3,15,'#b95d68');r(-12,-12,24,3,'#d97b84');r(-9,-16,18,3,'#d97b84')}
 else if(k==='tinySnowman'){r(-6,-5,12,10,'#f4fbff');r(-4,-12,8,8,'#f4fbff');r(1,-9,2,2,'#eaa266')}
 else if(/grave|statue|post|pillar/.test(k)){r(-6,-13,12,19,pal.edge);r(-3,-10,6,4,'#ffffff33')}
 else {r(-5,-5,10,10,pal.detail);r(-2,-8,4,4,'#ffffff44')}
 ctx.restore();}
function drawLake(f,t,cx,cy,star=false,fairy=false){const sx=f.x-player.x+cx,sy=f.y-player.y+cy,R=(fairy?92:145)*f.scale;ctx.save();ctx.translate(sx,sy);ctx.rotate(f.rot*.15);ctx.fillStyle=star?'#526aa8':fairy?'#79cbd3':'#72bdd0';ctx.beginPath();ctx.ellipse(0,0,R,R*.68,0,0,TAU);ctx.fill();ctx.strokeStyle='#ffffff33';ctx.lineWidth=3;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.arc(i*R*.25,Math.sin(t+i)*5,R*.12,0,Math.PI);ctx.stroke()}if(fairy){ctx.globalCompositeOperation='lighter';for(let i=0;i<11;i++){const a=i*.57+t*.18+f.seed*9,rr=R*.55+Math.sin(i*3.1)*18;rect(Math.cos(a)*rr-2,Math.sin(a)*rr*.64-2,4,4,i%2?'#fff0b0':'#ffb9e0')}}ctx.restore()}
function drawCanyon(f,t,cx,cy,voidy=false){const sx=f.x-player.x+cx,sy=f.y-player.y+cy,L=430*f.scale,W=(voidy?74:58)*f.scale;ctx.save();ctx.translate(sx,sy);ctx.rotate(f.rot);ctx.fillStyle=voidy?'#15142b':'#4f3940';ctx.fillRect(-L,-W,L*2,W*2);ctx.fillStyle=voidy?'#7d6bc233':'#e7b18d33';for(let x=-L;x<L;x+=36){ctx.fillRect(x,-W-5+(H(x|0,f.cx,90)-.5)*8,24,6);ctx.fillRect(x,W-1+(H(x|0,f.cy,91)-.5)*8,24,6)}ctx.fillStyle=voidy?'#a9a0cb':'#8b684d';ctx.fillRect(-52,-W-18,104,W*2+36);ctx.fillStyle='#d5b889';for(let y=-W-14;y<W+15;y+=13)ctx.fillRect(-48,y,96,7);ctx.fillStyle='#5e4637';ctx.fillRect(-55,-W-18,5,W*2+36);ctx.fillRect(50,-W-18,5,W*2+36);ctx.restore()}
function drawGiantTree(f,t,cx,cy,world=false){const sx=f.x-player.x+cx,sy=f.y-player.y+cy,S=f.scale*(world?1.45:1);ctx.save();ctx.translate(Math.round(sx),Math.round(sy));shadow(0,35*S,65*S);ctx.fillStyle='#674834';ctx.fillRect(-20*S,-10*S,40*S,66*S);ctx.fillStyle='#80573d';ctx.fillRect(-10*S,-40*S,20*S,60*S);const col=world?'#6d9ac0':'#62985e',hi=world?'#8eb8d2':'#7db271';for(let i=0;i<9;i++){const a=i/9*TAU,rr=34*S+(i%3)*13*S,px=Math.cos(a)*rr,py=Math.sin(a)*rr*.58-52*S;ctx.fillStyle=i%2?col:hi;ctx.beginPath();ctx.arc(px,py,30*S,0,TAU);ctx.fill()}if(world){ctx.globalCompositeOperation='lighter';for(let i=0;i<12;i++){const a=t*.1+i*.52;rect(Math.cos(a)*66*S-2,Math.sin(a)*27*S-64*S-2,4,4,'#9be8ff')}}ctx.restore()}
function drawMountain(f,t,cx,cy){const sx=f.x-player.x+cx,sy=f.y-player.y+cy,S=f.scale;ctx.save();ctx.translate(sx,sy);ctx.rotate(f.rot);for(let side of [-1,1]){ctx.fillStyle='#66707e';ctx.beginPath();ctx.moveTo(side*58,0);ctx.lineTo(side*300*S,-215*S);ctx.lineTo(side*300*S,215*S);ctx.closePath();ctx.fill();ctx.fillStyle='#8d98a5';ctx.beginPath();ctx.moveTo(side*84,-12);ctx.lineTo(side*260*S,-170*S);ctx.lineTo(side*260*S,20*S);ctx.closePath();ctx.fill()}ctx.restore()}
function drawFeature(f,t,cx,cy){if(featureDistance(f,player.x,player.y)>1100)return;switch(f.kind){case'lake':drawLake(f,t,cx,cy);break;case'fairyPond':drawLake(f,t,cx,cy,false,true);break;case'starLake':drawLake(f,t,cx,cy,true,false);break;case'hotSpring':drawLake(f,t,cx,cy,false,true);break;case'canyon':drawCanyon(f,t,cx,cy,false);break;case'voidChasm':drawCanyon(f,t,cx,cy,true);break;case'mountainPass':case'skyPillars':drawMountain(f,t,cx,cy);break;case'giantTree':drawGiantTree(f,t,cx,cy,false);break;case'worldTree':drawGiantTree(f,t,cx,cy,true);break;default:drawSpecial(f,t,cx,cy)}}
function drawSpecial(f,t,cx,cy){const sx=f.x-player.x+cx,sy=f.y-player.y+cy,S=f.scale;ctx.save();ctx.translate(Math.round(sx),Math.round(sy));shadow(0,18*S,28*S);const glow=Math.sin(t*2+f.seed*7)*.5+.5;
 if(f.kind==='waterfall'||f.kind==='frozenFalls'){rect(-35*S,-48*S,70*S,56*S,'#667481');rect(-22*S,-40*S,44*S,72*S,f.kind==='frozenFalls'?'#b9e8f2':'#8bd5e8');rect(-17*S,-35*S,9*S,60*S,'#ffffff55');}
 else if(f.kind==='blossomArch'||f.kind==='moonGate'||f.kind==='astralBridge'){rect(-26*S,-8*S,8*S,36*S,'#7d5d61');rect(18*S,-8*S,8*S,36*S,'#7d5d61');ctx.strokeStyle=f.kind==='astralBridge'?'#9cdcff':'#e9aac8';ctx.lineWidth=8*S;ctx.beginPath();ctx.arc(0,-5*S,25*S,Math.PI,TAU);ctx.stroke()}
 else if(f.kind==='dragonBones'){ctx.strokeStyle='#ded5c5';ctx.lineWidth=7*S;for(let i=-3;i<=3;i++){ctx.beginPath();ctx.arc(i*13*S,0,22*S,Math.PI,TAU);ctx.stroke()}rect(-60*S,1*S,120*S,6*S,'#c7bdad')}
 else if(f.kind==='crystalGarden'||f.kind==='meteorField'){for(let i=0;i<8;i++){const a=i*.8+f.seed*4,rr=12+(i%3)*14;ctx.save();ctx.translate(Math.cos(a)*rr*S,Math.sin(a)*rr*.7*S);ctx.rotate(a*.2);rect(-5*S,-22*S,10*S,29*S,i%2?'#a58aef':'#75d3df');rect(-2*S,-19*S,4*S,11*S,'#ffffff66');ctx.restore()}}
 else if(f.kind==='sunkenTemple'||f.kind==='ruinedAqueduct'||f.kind==='ancientRoad'||f.kind==='stoneCircle'){for(let i=0;i<7;i++){const a=i/7*TAU;rect(Math.cos(a)*30*S-7*S,Math.sin(a)*20*S-15*S,14*S,30*S,'#858985');rect(Math.cos(a)*30*S-4*S,Math.sin(a)*20*S-12*S,7*S,8*S,'#a9aea9')}}
 else if(f.kind==='obsidianSpire'){rect(-18*S,-55*S,36*S,75*S,'#3f384a');rect(-8*S,-75*S,16*S,88*S,'#564b67');rect(-3*S,-66*S,6*S,25*S,'#c085e9')}
 else if(f.kind==='mushroomGrove'||f.kind==='witchMarsh'){for(let i=0;i<10;i++){const a=i*.63,rr=12+(i%4)*10;rect(Math.cos(a)*rr*S-3,-4+Math.sin(a)*rr*.55*S,6*S,18*S,'#e5d5c4');rect(Math.cos(a)*rr*S-9,-10+Math.sin(a)*rr*.55*S,18*S,8*S,i%2?'#d66f9e':'#8060a8')}}
 else {for(let i=0;i<8;i++){const a=i/8*TAU;rect(Math.cos(a)*30*S-3,Math.sin(a)*20*S-3,6,6,i%2?'#f2c7dd':'#fff0a8')}}
 if(['astralBridge','meteorField','moonGate'].includes(f.kind)){ctx.globalCompositeOperation='lighter';ctx.fillStyle=`rgba(190,220,255,${.12+glow*.14})`;ctx.beginPath();ctx.arc(0,0,55*S,0,TAU);ctx.fill()}ctx.restore()}
function weatherFor(x,y){const b=biomeAtWorld(x,y),wet=N(x/900,y/900,80),wind=N(x/1400,y/1400,81);if(b===3||b===7)return wet>.46?'rain':'mist';if(b===5)return wet>.38?'snow':'clear';if(b===4)return'ash';if(b===8)return'mist';if(b===9)return'stardust';if(b===1)return wind>.45?'petals':'clear';return wet>.84?'rain':'clear'}
ENV.weatherFor=weatherFor;
function updateWeather(dt){const kind=weatherFor(player.x,player.y),rate=kind==='clear'?0:kind==='mist'?5:kind==='rain'?24:kind==='snow'?16:kind==='ash'?11:kind==='petals'?9:8;for(let i=0;i<rate*dt;i++)ENV.weatherParts.push({x:Math.random()*w,y:-10-Math.random()*30,vx:(kind==='snow'||kind==='petals'?Math.random()*22-11:kind==='ash'?8:kind==='rain'?-18:5),vy:kind==='rain'?250:kind==='snow'?42:kind==='ash'?36:kind==='petals'?30:22,t:3+Math.random()*4,k:kind,s:1+Math.random()*3});for(const p of ENV.weatherParts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.t-=dt}ENV.weatherParts=ENV.weatherParts.filter(p=>p.t>0&&p.y<h+30)}
function drawWeather(t){const kind=weatherFor(player.x,player.y);if(kind==='mist'){ctx.fillStyle='#dce9e622';for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse((i*197+t*8)% (w+220)-110,80+i*110,140,28,0,0,TAU);ctx.fill()}}for(const p of ENV.weatherParts){if(p.k==='rain'){ctx.strokeStyle='#d9f1ff77';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-5,p.y+16);ctx.stroke()}else{ctx.fillStyle=p.k==='snow'?'#f7fdffcc':p.k==='ash'?'#5e4d4aaa':p.k==='petals'?'#f2aecbba':'#d6e7ffbb';ctx.fillRect(p.x,p.y,p.s,p.s)}}}
function drawLighting(t){const blend=biomeBlend(player.x,player.y),b0=blend[0]?.[0]??0,b1=blend[1]?.[0]??b0,total=(blend[0]?.[1]||1)+(blend[1]?.[1]||0),secondary=(blend[1]?.[1]||0)/total;const p0=palettes[b0],p1=palettes[b1];ctx.save();ctx.globalCompositeOperation='source-over';if(b1!==b0&&secondary>.16){ctx.fillStyle=rgba(p1.sky,.035+secondary*.06);ctx.fillRect(0,0,w,h)}const day=(Math.sin(run/95)+1)/2,night=.02+(1-day)*.11;ctx.fillStyle=`rgba(28,38,65,${night})`;ctx.fillRect(0,0,w,h);if([4,9].includes(b0)){ctx.fillStyle=b0===4?'#ff956318':'#6e7dff16';ctx.fillRect(0,0,w,h)}ctx.restore()}
function discoverFeature(f){if(ENV.seen.has(f.id)||featureDistance(f,player.x,player.y)>95*f.scale)return;ENV.seen.add(f.id);relics++;const names={giantTree:'Titanroot',worldTree:'The World Tree',fairyPond:'Secret Fairy Pond',lake:'Mirror Lake',starLake:'Starwater Lake',canyon:'Whisper Canyon',voidChasm:'The Hollow Rift',mountainPass:'Cloudbreak Pass',skyPillars:'Sky Pillars',waterfall:'Silverveil Falls',frozenFalls:'Frozen Veil',blossomArch:'Blossom Gate',oldBridge:'Old Pilgrim Bridge',ancientRoad:'Lost King’s Road',stoneCircle:'Stone Choir',crystalGarden:'Crystal Garden',mushroomGrove:'Mushroom Cathedral',ruinedAqueduct:'Ruined Aqueduct',moonGate:'Moon Gate',hotSpring:'Spirit Hot Spring',dragonBones:'Dragon Graveyard',sunkenTemple:'Sunken Temple',obsidianSpire:'Obsidian Spire',witchMarsh:'Witchlight Marsh',astralBridge:'Astral Bridge',meteorField:'Meteor Garden'};toast('✦ DISCOVERED · '+(names[f.kind]||f.kind));sound('discover');puff(f.x,f.y,'#fff0a6',18,140);hud()}
function envUpdate(dt){updateWeather(dt);const key=Math.floor(player.x/ENV.macroCell)+','+Math.floor(player.y/ENV.macroCell);if(key!==ENV.lastMacro){ENV.lastMacro=key;ENV.features=nearbyFeatures(player.x,player.y,2)}for(const f of ENV.features)discoverFeature(f)}
function scenicSnapshot(){return scenePropsAround()}
ENV.groundKinds=new Set(['lake','fairyPond','starLake','hotSpring','canyon','voidChasm','ancientRoad','oldBridge','astralBridge']);ENV.drawScenic=function(obj,t,cx,cy){if(obj&&obj.kind&&obj.id&&obj.id[0]==='M')drawFeature(obj,t,cx,cy);else drawPixelProp(obj,t,cx,cy)};
ENV.scenicSnapshot=scenicSnapshot;ENV.drawWeatherLighting=function(t){drawWeather(t);drawLighting(t)};
const oldUpdate=update;update=function(dt){oldUpdate(dt);envUpdate(dt)};
const oldReset=reset;reset=function(){oldReset();ENV.seen.clear();ENV.weatherParts=[];ENV.features=nearbyFeatures(player.x,player.y,2);ENV.lastMacro='0,0'};
window.__TWBB_ENV_TEST__={macroFeature,nearbyFeatures,weatherFor,scenicVariant,blockedMacro:ENV.blockedMacro,assetVocabulary:ENV.assetVocabulary,featureVocabulary:ENV.featureVocabulary};
})();

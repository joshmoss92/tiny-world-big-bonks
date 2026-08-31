'use strict';
/* v8 — hard-bordered macro biomes. A coordinate belongs to exactly one biome province. */
(function(){
const B={version:8,CELL:1500,last:-1};window.BIOMES_V8=B;
const pools=[[0,1],[0,1,2,3],[2,3,4,5,6],[4,5,6,7,8],[6,7,8,9]];
function worldTier(x,y){return Math.max(0,Math.min(4,Math.floor(Math.hypot(x,y)/1550)))}
function province(x,y){const S=B.CELL,gx=Math.floor(x/S),gy=Math.floor(y/S);let best=null,bd=Infinity;for(let yy=gy-1;yy<=gy+1;yy++)for(let xx=gx-1;xx<=gx+1;xx++){const px=(xx+.18+hash(xx,yy,801)*.64)*S,py=(yy+.18+hash(xx,yy,802)*.64)*S,d=(x-px)*(x-px)+(y-py)*(y-py);if(d<bd){bd=d;best={gx:xx,gy:yy,x:px,y:py}}}return best}
function biomeForProvince(p){const tier=worldTier(p.x,p.y),pool=pools[tier],r=hash(p.gx,p.gy,803);return pool[Math.min(pool.length-1,Math.floor(r*pool.length))]}
biomeAtWorld=function(x,y){return biomeForProvince(province(x,y))};
/* Difficulty can rise slowly with time, but geography never changes with elapsed run time. */
dangerAt=function(x,y){return Math.max(0,Math.min(5,Math.floor(Math.hypot(x,y)/1250)+Math.min(1,Math.floor(run/420))))};
function borderDistance(x,y){const b=biomeAtWorld(x,y),step=55;let d=step*8;for(let r=step;r<=step*8;r+=step){for(let a=0;a<Math.PI*2;a+=Math.PI/4)if(biomeAtWorld(x+Math.cos(a)*r,y+Math.sin(a)*r)!==b)return r;d=r}return d}
B.worldTier=worldTier;B.province=province;B.borderDistance=borderDistance;
/* Strong entry callout makes every biome identity unmistakable. */
const oldUpdateRegions=updateRegions;updateRegions=function(){const before=biomeAtWorld(player.x,player.y);oldUpdateRegions();if(B.last!==before){B.last=before;if(started){regionBanner='✦ '+biomeNames[before].toUpperCase()+' ✦';regionBannerTimer=3.4;toast('Entering '+biomeNames[before]+' · '+['green refuge','petal forest','moonlit wilds','mist wetlands','burning frontier','frozen frontier','crystal frontier','drowned garden','haunted wilds','astral frontier'][before])}}};
window.__TWBB_BIOME_TEST__={get:()=>({version:8,biome:biomeAtWorld(player.x,player.y),tier:worldTier(player.x,player.y),border:borderDistance(player.x,player.y)})};
})();
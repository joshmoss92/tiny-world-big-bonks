'use strict';
// Abstract pacing/control model. This is NOT a substitute for human playtesting.
// It is a fast Monte Carlo guardrail used to compare control, pacing and survivability shapes.
const PROFILES={
  passive:{skill:.18,aim:.15,risk:.10,build:.45},
  novice:{skill:.38,aim:.42,risk:.28,build:.60},
  average:{skill:.62,aim:.68,risk:.48,build:.74},
  expert:{skill:.86,aim:.88,risk:.68,build:.88}
};
const RUNS=5000,DURATION=600;
function rng(seed){let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296)}
function between(r,a,b){return a+(b-a)*r()}
function one(p,candidate,r){
  let hp=100,power=1,pressure=0,decisions=0,feedback=0,flow=0,bursts=0,forks=0,t=0;
  let nextDraft=between(r,26,32),nextEvent=between(r,20,29),nextPower=between(r,9,13),nextFork=candidate?between(r,22,30):1e9,nextBreak=candidate?between(r,58,70):1e9;
  for(t=1;t<=DURATION;t++){
    const raw=.95+t/260+.22*Math.sin(t/16)+.12*Math.sin(t/5.5),defense=.38*p.skill*p.aim,offense=.30*p.skill*p.aim;
    let effective=Math.max(.2,raw)*(1-defense)/(1+offense)/Math.max(.62,power);
    if(candidate){const gain=p.skill*p.aim*3.2;flow=Math.max(0,Math.min(100,flow+gain-(p.aim<.3?1.8:1)));if(flow>=100){bursts++;flow=48}effective*=1-.03*Math.min(1,p.skill*p.aim)}
    pressure=.70*pressure+.30*effective;
    if(candidate&&t>=nextBreak){hp=Math.min(100,hp+2);pressure*=.72;feedback++;nextBreak=t+between(r,64,80)}
    hp-=Math.max(0,pressure-.62)*2.2;
    if(t>=nextEvent){decisions++;if(r()<p.risk){hp-=between(r,2,9);power*=1+between(r,.02,.05);feedback++}nextEvent=t+between(r,20,29)}
    if(t>=nextDraft){decisions++;power*=1+.045+.075*p.build;feedback++;nextDraft=t+between(r,26,30)}
    if(t>=nextPower){if(r()<.18+.72*p.aim){power*=1.014;feedback++}nextPower=t+between(r,candidate?8.5:9.5,candidate?12.5:14)}
    if(candidate&&t>=nextFork){if(r()<.12+.76*p.aim){forks++;decisions++;power*=1.02+.02*p.build;feedback+=1.5}nextFork=t+between(r,34,46)}
    if(hp<=0)break;
  }
  return {seconds:Math.min(t,DURATION),decisions,feedback,bursts,forks};
}
function simulate(candidate,seed){const r=rng(seed),out={};let totalSeconds=0;for(const [name,p] of Object.entries(PROFILES)){let sec=0,dec=0,fb=0,bursts=0,forks=0,full=0;for(let i=0;i<RUNS;i++){const x=one(p,candidate,r);sec+=x.seconds;dec+=x.decisions;fb+=x.feedback;bursts+=x.bursts;forks+=x.forks;if(x.seconds>=DURATION)full++}totalSeconds+=sec;out[name]={avgMin:sec/RUNS/60,survival10:full/RUNS,choicesMin:dec/Math.max(sec/60,1),feedbackMin:fb/Math.max(sec/60,1),bursts:bursts/RUNS,forks:forks/RUNS};}out.hours=totalSeconds/3600;return out}
const base=simulate(false,0x1234abcd),candidate=simulate(true,0x5eedc0de),hours=base.hours+candidate.hours;
if(hours<3000)throw Error('Synthetic coverage below 3000 hours: '+hours.toFixed(1));
if(candidate.novice.avgMin<base.novice.avgMin*1.25)throw Error('Candidate did not improve novice runway enough');
if(candidate.average.avgMin<8.5||candidate.expert.avgMin<8.5)throw Error('Skilled profiles lost long-run viability');
if(candidate.passive.avgMin>candidate.novice.avgMin*.75)throw Error('Passive play became too competitive with active aiming');
if(candidate.average.choicesMin<4.5||candidate.average.choicesMin>6.2)throw Error('Average decision cadence outside target range');
if(candidate.average.forks<2)throw Error('Power forks too rare in abstract model');
console.log('Starward V17 synthetic play model OK');
console.log('Equivalent simulated hours:',hours.toFixed(1));
for(const name of Object.keys(PROFILES))console.log(name,'baseline',JSON.stringify(base[name]),'V17',JSON.stringify(candidate[name]));
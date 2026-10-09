import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pairedInterval} from './league-runner.js';
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'docs/evaluations/ally-single-intervention');
const pairs=JSON.parse(gunzipSync(readFileSync(resolve(out,'pairs.json.gz'))).toString()) as any[];
const summary=JSON.parse(readFileSync(resolve(out,'summary.json'),'utf8')),design=JSON.parse(readFileSync(resolve(out,'design.json'),'utf8'));
const score=(g:any)=>g.winnerPolicy==='current'?1:g.winnerPolicy==='reference'?0:.5;
const seen=new Set<string>(),seedCounts=new Map<number,number>(),flipped:any[]=[],unfinished:any[]=[];
let matched=0,unchanged=0,choiceDifferent=0,timingDifferent=0;
for(const p of pairs){
 const key=JSON.stringify([p.fixture,p.style]);assert(!seen.has(key));seen.add(key);
 assert(p.fixture.seed>=94000&&p.fixture.seed<94016);seedCounts.set(p.fixture.seed,(seedCounts.get(p.fixture.seed)??0)+1);
 assert.equal(p.delta,score(p.candidate.game)-score(p.baseline.game));
 const a=p.baseline.intervention,b=p.candidate.intervention;assert.equal(!!a,!!b);
 if(a&&b){
  for(const k of ['player','character','at','cell','original','alternative','beforeHash','beforeMana'])assert.deepEqual(a[k],b[k]);matched++;
  assert.match(a.beforeHash,/^[a-f0-9]{64}$/);
  choiceDifferent+=Number(JSON.stringify(a.followups[0]?.action)!==JSON.stringify(b.followups[0]?.action));
  timingDifferent+=Number(a.followups[0]?.at!==b.followups[0]?.at);
 }else{assert.deepEqual(p.baseline.game,p.candidate.game);unchanged++;}
 if(p.delta!==0)flipped.push({fixture:p.fixture,style:p.style,delta:p.delta,player:a.player,at:a.at,original:a.original,alternative:a.alternative,manaDelta:b.result.manaSpent-a.result.manaSpent});
 if(p.baseline.game.winner===null||p.candidate.game.winner===null)unfinished.push({fixture:p.fixture,style:p.style,baseline:p.baseline.game.winner,candidate:p.candidate.game.winner,intervened:!!a});
}
assert.equal(pairs.length,768);assert.equal(seedCounts.size,16);assert([...seedCounts.values()].every(n=>n===48));
assert.equal(summary.intervened,matched);assert.equal(summary.unchangedWithoutIntervention,unchanged);
const diffs=Array.from({length:16},(_,i)=>pairs.filter(p=>p.fixture.seed===94000+i).reduce((n,p)=>n+p.delta,0)/48);
assert.deepEqual(summary.seedDifferences,diffs);assert.equal(summary.delta,diffs.reduce((a,b)=>a+b,0)/16);
assert.deepEqual(summary.seedBootstrap95,pairedInterval(diffs.map(x=>(x+1)/2)).map(x=>2*x-1));
for(const key of ['baseline','candidate']){
 const active=pairs.filter(p=>p[key].intervention);
 const computed={wins:pairs.filter(p=>p[key].game.winnerPolicy==='current').length,unfinished:pairs.filter(p=>p[key].game.winner===null).length,rejected:pairs.reduce((n,p)=>n+p[key].game.stats.current.rejected,0),earlyFailures:pairs.reduce((n,p)=>n+p[key].game.stats.current.earlyAttackFailures,0),interventionAccepted:active.filter(p=>p[key].intervention.result.ok).length,interventionMana:active.reduce((n,p)=>n+p[key].intervention.result.manaSpent,0),actorSurvived:active.filter(p=>p[key].intervention.actorSurvived).length,originalAllyEventually:active.filter(p=>p[key].intervention.firstOriginalAlly!==undefined).length};
 assert.deepEqual(summary[key],computed);
}
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const hashes=Object.fromEntries(Object.entries(summary.hashes as Record<string,string>).map(([p,h])=>[p,hash(resolve(root,'packages/rules',p))===h]));assert(Object.values(hashes).every(Boolean));
assert.equal(design.modelSha256,hash(resolve(root,'docs/evaluations/ally-context/model.json')));
const result={pairs:pairs.length,preInterventionMatches:matched,noInterventionResultMatches:unchanged,sourceHashesMatch:hashes,frozenModelMatches:true,summaryAndIntervalsMatch:true,nextActionChoiceDifferent:choiceDifferent,nextActionTimingDifferent:timingDifferent,flipped,unfinished};
writeFileSync(resolve(out,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

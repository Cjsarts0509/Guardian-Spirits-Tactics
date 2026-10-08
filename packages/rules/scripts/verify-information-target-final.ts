import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {summarize,pairedInterval,type MatchResult} from './league-runner.js';
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'docs/evaluations/information-target-final');
const results:Record<string,unknown>={};
for(const split of ['development','holdout']){
 if(!existsSync(resolve(out,split+'.json')))continue;
 const saved=JSON.parse(readFileSync(resolve(out,split+'.json'),'utf8'));
 const raw=JSON.parse(gunzipSync(readFileSync(resolve(out,split+'-matches.json.gz'))).toString()) as (MatchResult&{style:string;learned:boolean})[];
 for(const policy of ['baseline','candidate'] as const)for(const group of saved[policy]){
  const subset=raw.filter(g=>g.learned===(policy==='candidate')&&g.fixture.mode===group.mode&&g.style===group.style);
  assert.deepEqual({mode:group.mode,style:group.style,...summarize(subset)},group);
 }
 const d=Array.from({length:32},(_,i)=>saved.candidate.reduce((n:number,c:any,j:number)=>n+c.pairedScores[i].score-saved.baseline[j].pairedScores[i].score,0)/saved.candidate.length);
 assert.deepEqual(saved.seedDifferences,d);assert.equal(saved.delta,d.reduce((n,v)=>n+v,0)/d.length);
 assert.deepEqual(saved.seedBootstrap95,pairedInterval(d.map(x=>(x+1)/2)).map(x=>2*x-1));
 const sum=(rs:any[],key:string)=>rs.reduce((n,r)=>n+(key==='unfinished'?r.wins.unfinished:r.stats.current.earlyAttackFailures),0);
 const safe=sum(saved.candidate,'unfinished')<=sum(saved.baseline,'unfinished')&&sum(saved.candidate,'early')<=sum(saved.baseline,'early');
 assert.equal(saved.gatePassed,saved.delta>0&&safe);assert.equal(saved.promotionEvidence,saved.seedBootstrap95[0]>0&&safe);
 const hashes=Object.fromEntries(Object.entries(saved.hashes as Record<string,string>).map(([p,h])=>[p,createHash('sha256').update(readFileSync(resolve(root,'packages/rules',p))).digest('hex')===h]));assert(Object.values(hashes).every(Boolean));
 const start=split==='development'?100000:101000;assert(raw.every(g=>g.fixture.seed>=start&&g.fixture.seed<start+32));assert.equal(raw.length,3072);
 results[split]={games:raw.length,summaryAndIntervalMatch:true,sourceHashesMatch:hashes,gatePassed:saved.gatePassed,promotionEvidence:saved.promotionEvidence};
}
assert(results.development);
const final=results.holdout as {promotionEvidence:boolean}|undefined;
writeFileSync(resolve(out,'verification.json'),JSON.stringify({results,decision:final?.promotionEvidence?'eligible-for-integration':'not-adopted',policyRetuned:false},null,2)+'\n');
console.log(JSON.stringify(results));

import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fit,type Row} from './ally-context-model.js';
import {summarize,pairedInterval,type MatchResult} from './league-runner.js';
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'docs/evaluations/ally-context');
const read=(name:string)=>JSON.parse(readFileSync(resolve(out,name+'.json'),'utf8'));
const unzip=(name:string)=>JSON.parse(gunzipSync(readFileSync(resolve(out,name+'.json.gz'))).toString());
const rows=unzip('training-observations') as (Row&{seed:number;mode:string;style:string;reversed:boolean;currentSide:number;player:string;allies:number;knownFriend:boolean;alternative:unknown})[];
const games=unzip('training-matches') as (MatchResult&{style:string})[];
const key=(x:{mode:string;seed:number;reversed:boolean;currentSide:number},style:string)=>JSON.stringify([x.mode,x.seed,x.reversed,x.currentSide,style]);
const byKey=new Map(games.map(g=>[key(g.fixture,g.style),g]));assert.equal(byKey.size,games.length);
const seen=new Set<string>();
for(const row of rows){
 assert(row.seed>=91000&&row.seed<91048);const game=byKey.get(key(row,row.style));assert(game);
 const id=key(row,row.style)+':'+row.player;assert(!seen.has(id));seen.add(id);
 assert.equal(row.reward,game.winnerPolicy==='current'?1:game.winnerPolicy==='reference'?0:0.5);
 assert.equal(row.cell,`${row.allies?'some':'none'}-${row.knownFriend?'known':'uncertain'}-${row.alternative?'info':'noinfo'}`);
 if(row.arm==='information')assert(row.alternative);
 assert.deepEqual(Object.keys(row).sort(),['cell','arm','seed','mode','style','reversed','currentSide','player','allies','knownFriend','alternative','reward'].sort());
}
assert.deepEqual(fit(rows),read('model'));
const summary=read('training-summary');assert.equal(summary.games,games.length);assert.equal(summary.observations,rows.length);
const hashes=Object.fromEntries(Object.entries(summary.hashes as Record<string,string>).map(([p,h])=>[p,createHash('sha256').update(readFileSync(resolve(root,'packages/rules',p))).digest('hex')===h]));
assert(Object.values(hashes).every(Boolean));
const evaluations:Record<string,unknown>={};
for(const split of ['development','holdout']){
 if(!existsSync(resolve(out,split+'.json')))continue;
 const saved=read(split),raw=unzip(split+'-matches') as (MatchResult&{style:string;learned:boolean})[];
 for(const policy of ['baseline','candidate'] as const)for(const group of saved[policy]){
  const subset=raw.filter(g=>g.learned===(policy==='candidate')&&g.fixture.mode===group.mode&&g.style===group.style);
  assert.deepEqual({mode:group.mode,style:group.style,...summarize(subset)},group);
 }
 const d=Array.from({length:saved.count as number},(_,i)=>saved.candidate.reduce((n:number,c:any,j:number)=>n+c.pairedScores[i].score-saved.baseline[j].pairedScores[i].score,0)/saved.candidate.length);
 assert.deepEqual(saved.seedDifferences,d);assert.equal(saved.delta,d.reduce((n,v)=>n+v,0)/d.length);
 assert.deepEqual(saved.seedBootstrap95,pairedInterval(d.map(x=>(x+1)/2)).map(x=>2*x-1));
 assert.deepEqual(saved.hashes,summary.hashes);
 const expectedStart=split==='development'?92000:93000;
 assert(raw.every(g=>g.fixture.seed>=expectedStart&&g.fixture.seed<expectedStart+saved.count));
 evaluations[split]={matches:raw.length,summaryAndIntervalMatch:true,seedsDisjointFromTraining:true};
}
const result={games:games.length,observations:rows.length,uniqueFirstOpportunities:seen.size,refitMatches:true,rewardAndFeatureChecks:true,sourceHashesMatch:hashes,unfinished:games.filter(g=>!g.winner).map(g=>({fixture:g.fixture,style:g.style,elapsedMs:g.elapsedMs})),evaluations};
writeFileSync(resolve(out,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

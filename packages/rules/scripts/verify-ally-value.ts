import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fitAllyValue,type Observation} from './ally-value-model.js';
import type {MatchResult} from './league-runner.js';
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'docs/evaluations/ally-value');
const read=(name:string)=>JSON.parse(readFileSync(resolve(out,name+'.json'),'utf8'));
const unzip=(name:string)=>JSON.parse(gunzipSync(readFileSync(resolve(out,name+'.json.gz'))).toString());
const rows=unzip('training-observations') as (Observation&{seed:number;mode:string;style:string;reversed:boolean;currentSide:number;player:string;elapsedMs:number;mana:number})[];
const games=unzip('training-matches') as (MatchResult&{style:string})[];
const key=(x:{mode:string;seed:number;reversed:boolean;currentSide:number},style:string)=>JSON.stringify([x.mode,x.seed,x.reversed,x.currentSide,style]);
const byKey=new Map(games.map(g=>[key(g.fixture,g.style),g]));assert.equal(byKey.size,games.length);
const seen=new Set<string>();
for(const row of rows){
 assert(row.seed>=88000&&row.seed<88032);const game=byKey.get(key(row,row.style));assert(game);
 const id=key(row,row.style)+':'+row.player;assert(!seen.has(id));seen.add(id);
 assert.equal(row.reward,game.winnerPolicy==='current'?1:game.winnerPolicy==='reference'?0:0.5);
 assert.equal(row.cell,`${row.elapsedMs<360000?'early':'late'}-${row.mana<60?'low':'high'}`);
 assert.deepEqual(Object.keys(row).sort(),['cell','wait','seed','mode','style','reversed','currentSide','player','elapsedMs','mana','reward'].sort());
}
assert.deepEqual(fitAllyValue(rows),read('model'));
const summary=read('training-summary');assert.equal(summary.games,games.length);assert.equal(summary.observations,rows.length);
const hashes=Object.fromEntries(Object.entries(summary.hashes as Record<string,string>).map(([p,h])=>[p,createHash('sha256').update(readFileSync(resolve(root,'packages/rules',p))).digest('hex')===h]));
assert(Object.values(hashes).every(Boolean));
const result={games:games.length,observations:rows.length,uniqueFirstOpportunities:seen.size,refitMatches:true,rewardAndFeatureChecks:true,sourceHashesMatch:hashes,unfinished:games.filter(g=>!g.winner).map(g=>({fixture:g.fixture,style:g.style,elapsedMs:g.elapsedMs})),heldoutUsed:false};
writeFileSync(resolve(out,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

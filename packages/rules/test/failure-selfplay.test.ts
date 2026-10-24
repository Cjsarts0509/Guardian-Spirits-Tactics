import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {playFailureDevelopment,type FailureVariant} from '../scripts/failure-development.js';
import {playFailureSelfplay} from '../scripts/failure-selfplay.js';
import {playSelfplay} from '../scripts/selfplay-balance.js';
import {storeHash} from '../scripts/cooperative-store.js';
import type {Fixture,MatchResult} from '../scripts/league-runner.js';
import type {ClaimStyle} from '../scripts/claim-opponents.js';
import type {ModeId} from '../src/types.js';
const golden=JSON.parse(readFileSync(new URL('./fixtures/round062-default-path-golden.json',import.meta.url),'utf8'));
const canonicalGame=(game:MatchResult)=>({winner:game.winner,elapsedMs:game.elapsedMs,reason:game.reason,
 statsBySide:{[game.fixture.currentSide]:game.stats.current,[3-game.fixture.currentSide]:game.stats.reference},
 survivors:game.survivors.map(({character,alive})=>({character,alive}))});

describe('063 identical policy faction observation',()=>{
 it('the optional collector extension preserves all3 frozen062 real default paths',()=>{
  for(const expected of golden.rows){
   const actual=playFailureDevelopment(expected.fixture as Fixture,expected.style as ClaimStyle,expected.variant as FailureVariant);
   expect(actual.game).toEqual(expected.game);expect(actual.resources).toEqual(expected.resources);
   expect(storeHash(JSON.stringify(actual.actions))).toBe(expected.actionsSHA256);
   expect(actual.memoryTraceSHA256).toBe(expected.memoryTraceSHA256);expect(actual.counters).toEqual(expected.counters);
  }
 },180000);
 it('all4modes keep complete actions, outcomes, resource use and actual memory/RNG identical with observationOFF',()=>{
  for(const [index,mode] of (['civil_war','primordial','lidellut','troll'] as ModeId[]).entries()){
   const fixture:Fixture={mode,seed:900363+index,count:8+index,reversed:false,currentSide:1};
   const on=playFailureSelfplay(fixture,'candidate'),off=playFailureSelfplay(fixture,'candidate',undefined,false);
   for(const field of ['game','actions','resourcesBySide','memoryTraceSHA256'] as const)expect(on[field]).toEqual(off[field]);
   expect(on.counters.wrongKnown).toBe(0);expect(on.counters.wrongNewElimination).toBe(0);
   if(mode==='troll'){
    const relabel=playFailureSelfplay({...fixture,currentSide:2},'candidate');
    expect(canonicalGame(relabel.game)).toEqual(canonicalGame(on.game));
    for(const field of ['actions','resourcesBySide','memoryTraceSHA256','episodes','probes','followups','counters'] as const)expect(relabel[field]).toEqual(on[field]);
   }
  }
 },240000);
 it('main uses the existing same-policy engine path without claim-style rewriting or asymmetric chat',()=>{
  const fixture:Fixture={mode:'troll',seed:900363,count:8,reversed:true,currentSide:1};
  const prior=playSelfplay(fixture,'main'),current=playFailureSelfplay(fixture,'baseline');
  expect(current.game).toEqual(prior.game);
  expect(current.roles.map(({id,character,side})=>({id,character,side}))).toEqual(prior.roles);
 },90000);
});

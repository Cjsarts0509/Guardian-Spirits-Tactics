import {describe,it,expect} from 'vitest';
import {playFailureDevelopment} from '../scripts/failure-development.js';
import {playFailureSelfplay} from '../scripts/failure-selfplay.js';
import {replayFailureStalemate} from '../scripts/failure-stalemate-replay.js';

describe('read-only active-decision and protection replay',()=>{
 it('preserves the capped062 game and observes purge, restoration and paid guards without leaking target resources into own views',()=>{
  const row=playFailureDevelopment({mode:'troll',seed:152008,count:8,reversed:true,currentSide:1},'skill-aware-bluff','candidate');
  expect(row.game.winner).toBeNull();expect(row.actions).toHaveLength(121);
  const out=replayFailureStalemate(row);expect(out.wholeGameMatched).toBe(true);expect(out.memoryTraceSHA256).toBe(row.memoryTraceSHA256);
  expect(out.calls.activePrimary).toBe(out.decisions.length);expect(out.decisions.some(d=>d.chosenAction===null)).toBe(true);
  expect(out.protection.some(p=>p.ownEvents.some((e:any)=>e.kind==='skill.holy_binding.purge'))).toBe(true);
  expect(out.protection.some(p=>p.ownEvents.some((e:any)=>e.kind==='skill.destroyer_guidance.madness'))).toBe(true);
  const guards=out.protection.filter(p=>p.ownEvents.some((e:any)=>e.kind==='attack.guarded'));
  expect(guards.length).toBeGreaterThan(0);
  for(const g of guards){expect(g.externalTargetAfter.mana-g.externalTargetBefore.mana).toBe(-25);expect(g.externalGradingOnly).toBe(true);}
  for(const d of out.decisions){
   expect(d.view.me.id).toBe(d.actor);expect(d.view.phase).toBe('running');expect(d.view.me.alive).toBe(true);
   expect(d.events.every((e:any)=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(d.actor))).toBe(true);
   for(const p of d.view.players)for(const key of ['mana','character','flags','skills','extraLives'])expect(p).not.toHaveProperty(key);
  }
 },180000);
 it('keeps both controllers identical in the same-policy path',()=>{
  const row=playFailureSelfplay({mode:'civil_war',seed:900363,count:8,reversed:false,currentSide:1},'candidate');
  const out=replayFailureStalemate({...row,style:'truthful'},undefined,true);
  expect(out.memoryTraceSHA256).toBe(row.memoryTraceSHA256);expect(out.wholeGameMatched).toBe(true);
  expect(new Set(out.decisions.map(d=>d.view.me.side))).toEqual(new Set([1,2]));
 },90000);
});

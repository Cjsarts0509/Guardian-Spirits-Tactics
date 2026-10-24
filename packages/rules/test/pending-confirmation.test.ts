import {describe,it,expect} from 'vitest';
import {pendingOwn,pendingReplay} from '../scripts/pending-confirmation.js';
import {playSenderDevelopment} from '../scripts/sender-development.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
const event=(kind:string,seq:number,at:number,target='p2',ids=['p1'])=>({kind,seq,at,data:{target},vis:{to:'players' as const,ids},text:''});
describe('057 own pending delayed confirmation',()=>{
 it('only own private receipt creates pending, exact due/result closes it without assuming success',()=>{
  const cast=event('skill.chaos_hex.self',1,1000);
  expect(pendingOwn([cast],'p1',1000)).toHaveLength(1);expect(pendingOwn([cast],'p1',60999)).toHaveLength(1);expect(pendingOwn([cast],'p1',61000)).toEqual([]);
  expect(pendingOwn([cast],'p3',2000)).toEqual([]);expect(pendingOwn([{...cast,vis:{to:'all'}}],'p1',2000)).toEqual([]);
  expect(pendingOwn([cast,event('skill.chaos_hex.result',2,2000)],'p1',2000)).toEqual([]);
  expect(pendingOwn([cast,event('skill.chaos_hex.result',2,2000,'p3')],'p1',2000)).toHaveLength(1);
 });
 it('future/earlier-sequence/other-recipient results cannot close the current request',()=>{
  const cast=event('skill.chaos_hex.self',10,1000);
  for(const e of [event('skill.chaos_hex.result',9,1000),event('skill.chaos_hex.result',11,5000),event('skill.chaos_hex.result',11,2000,'p2',['p3'])])expect(pendingOwn([cast,e],'p1',3000)).toHaveLength(1);
 });
 it('real engine own windows preserve all original commands, complete memory/RNG and own event boundary',()=>{
  const s={...DEFAULT_SETTINGS,limitMs:400000};let observed=0;
  for(const variant of ['control','candidate'] as const){
   const r=playSenderDevelopment({mode:'troll',seed:900257,count:10,reversed:false,currentSide:2},'truthful',variant,s),on=pendingReplay(r,s),off=pendingReplay(r,s,false);
   expect({...on,choices:[],requests:[],extra:[],receipts:[]}).toEqual(off);observed+=on.choices.length;
   for(const c of on.choices){expect(c.ownKnowledgeRebuilt).toBe(true);expect(c.memoryAndEngineUnchanged).toBe(true);expect(c.events.every((e:any)=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(c.player))).toBe(true);}
  }
  expect(observed).toBeGreaterThan(0);
 },60000);
});

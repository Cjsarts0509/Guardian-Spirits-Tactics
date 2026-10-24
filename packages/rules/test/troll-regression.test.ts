import {describe,it,expect} from 'vitest';
import {playSenderDevelopment} from '../scripts/sender-development.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {commandTrace,observeTrajectory,readyKnownAttacks} from '../scripts/troll-regression-replay.js';
const settings={...DEFAULT_SETTINGS,limitMs:120000};
const fixture={mode:'troll' as const,seed:900156,count:10,reversed:false,currentSide:2 as const};
describe('056 frozen trajectory diagnosis',()=>{
 it('own observer uses visible events, reconstructs working knowledge and preserves complete games/receipts',()=>{
  for(const variant of ['control','candidate'] as const){
   const r=playSenderDevelopment(fixture,'bluff',variant,settings),on=observeTrajectory(r,settings,0),off=observeTrajectory(r,settings,0,false);
   expect({...on,choices:[]}).toEqual(off);expect(on.choices.length).toBeGreaterThan(0);
   for(const d of on.choices){expect(d.ownInputRebuilt).toBe(true);expect(d.memoryAndEngineUnchanged).toBe(true);expect(d.events.every((e:any)=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(d.player))).toBe(true);expect(d.wrongKnown).toEqual([]);}
  }
 },60000);
 it('command observation preserves terminal state/log and rejects tampered mana/receipts',()=>{
  const r=playSenderDevelopment(fixture,'bluff','candidate',settings),on=commandTrace(r,settings,0),off=commandTrace(r,settings,0,false);
  expect({...on,rows:[]}).toEqual(off);expect(on.rows.length).toBeGreaterThan(0);
  const wrong=structuredClone(r);wrong.actions[0]!.beforeMana++;expect(()=>commandTrace(wrong,settings,0)).toThrow();
  const wrongEvent=structuredClone(r);wrongEvent.actions[0]!.receiptKinds.push('hidden.fabrication');expect(()=>commandTrace(wrongEvent,settings,0)).toThrow();
 },30000);
 it('ready-known attack denominator excludes living public guards/unknown targets and blocked skills',()=>{
  const v:any={mode:'troll',me:{id:'me',side:2,skills:[{key:'supreme_attack',mana:40,blocked:null,passive:false,nameOptions:['chis','tokra']}]},roster:[{key:'chis',side:1},{key:'tokra',side:1}],players:[{id:'chief',alive:true,statuses:[]},{id:'guard',alive:true,statuses:[]},{id:'other',alive:true,statuses:[]}]};
  expect(readyKnownAttacks(v,new Map([['chief','chis']]))).toEqual([]);
  v.players.push({id:'s',alive:false,revealed:'satoshi',statuses:[]},{id:'z',alive:false,revealed:'zwinra',statuses:[]});
  expect(readyKnownAttacks(v,new Map([['chief','chis']]))).toHaveLength(1);
  v.me.skills[0].blocked='mana';expect(readyKnownAttacks(v,new Map([['chief','chis']]))).toEqual([]);
 });
});

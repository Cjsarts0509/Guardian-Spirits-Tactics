import {describe,it,expect} from 'vitest';
import {playFailureSelfplay} from '../scripts/failure-selfplay.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {replayFailureCommanderCommands,replayFailureCommanderDeaths} from '../scripts/failure-commander-death-replay.js';
const fixture={mode:'primordial' as const,seed:27,count:12,reversed:false,currentSide:1 as const};
describe('current identical-policy commander death accounting',()=>{
 it.each(['baseline','control','candidate'] as const)('%s preserves full policy and observed/unobserved engine paths',variant=>{
  const original=playFailureSelfplay(fixture,variant),on=replayFailureCommanderDeaths(original,DEFAULT_SETTINGS);
  const off=replayFailureCommanderCommands(original,DEFAULT_SETTINGS,false);
  expect(on.memoryTraceSHA256).toBe(original.memoryTraceSHA256);
  expect(on.receipts).toBe(original.actions.length);
  expect(on.fullStateSHA256).toBe(off.fullStateSHA256);
  expect(on.engineLogSHA256).toBe(off.engineLogSHA256);
  expect(on.deaths.map(d=>d.character).sort()).toEqual(on.finalCommanders.filter(p=>!p.alive).map(p=>p.character).sort());
  expect(off.deaths).toEqual([]);
  expect(on.newResearchExecutions).toBe(0);
 },180000);
 it('rejects modified receipts and role assignments even if the final winner is untouched',()=>{
  const original=playFailureSelfplay(fixture,'candidate');
  const badMana=structuredClone(original);badMana.actions[0]!.afterMana++;
  expect(()=>replayFailureCommanderCommands(badMana,DEFAULT_SETTINGS)).toThrow();
  const badRole=structuredClone(original);badRole.roles[0]!.character='kanulla';
  expect(()=>replayFailureCommanderCommands(badRole,DEFAULT_SETTINGS)).toThrow();
 },180000);
});

import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {playFailureDevelopment,FAILURE_OPTIONS} from '../scripts/failure-development.js';
import {playSenderDevelopment} from '../scripts/sender-development.js';
it('062 observer preserves all commands/resources and actual policy memory/RNG in four real modes',()=>{
 for(const mode of ['civil_war','primordial','lidellut','troll'] as const)for(const variant of ['control','candidate'] as const){
  const f={mode,count:12,seed:900262,reversed:false,currentSide:2 as const};
  const on=playFailureDevelopment(f,'truthful',variant),off=playFailureDevelopment(f,'truthful',variant,undefined,false);
  for(const key of ['game','actions','resources','memoryTraceSHA256'] as const)expect(on[key]).toEqual(off[key]);
  expect(on.counters.wrongKnown).toBe(0);expect(on.counters.wrongNewElimination).toBe(0);
 }
},60000);
it('062 control preserves previous055 candidate complete match/commands with the passive ledger only',()=>{
 const {record}=JSON.parse(gunzipSync(readFileSync(new URL('../scripts/baselines/round061-first-failure-sample.json.gz',import.meta.url))).toString());
 const f=record.fixture;
 const next=playFailureDevelopment(f,'truthful','control'),old=playSenderDevelopment(f,'truthful','candidate');
 expect(next.game).toEqual(old.game);
 expect(next.actions.map(a=>[a.player,a.at,a.action,a.accepted,a.beforeMana,a.afterMana])).toEqual(old.actions.map(a=>[a.player,a.at,a.action,a.accepted,a.beforeMana,a.afterMana]));
 expect(next.counters.firstFailures).toBeGreaterThan(0);expect(next.counters.eligible).toBeGreaterThan(0);
 expect(FAILURE_OPTIONS.candidate).toEqual({...FAILURE_OPTIONS.control,learnOwnDelayedFailureFaction:true});
 const on=playFailureDevelopment(f,'truthful','candidate'),off=playFailureDevelopment(f,'truthful','candidate',undefined,false);
 for(const key of ['game','actions','resources','memoryTraceSHA256'] as const)expect(on[key]).toEqual(off[key]);
 expect(on.counters.firstFailures).toBeGreaterThan(0);expect(on.counters.wrongNewElimination).toBe(0);
 // The intake produced no command, so its ordinal is the next real command, not an earlier action.
 const first=on.probes[0]!;expect(first.chosenAction).toBe(null);
 expect(on.followups.some(x=>x.ordinal===first.ordinal&&x.kind==='direct_report'&&x.knownName===x.actualName)).toBe(true);
},30000);

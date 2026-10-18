import {readFileSync,writeFileSync} from 'node:fs';
import {deepStrictEqual,strictEqual} from 'node:assert';
import {execFileSync} from 'node:child_process';
import {playSenderDevelopment} from './sender-development.js';
import {commandTrace,observeTrajectory,firstSignal,hash,type Record055} from './troll-regression-replay.js';
import {storeHash} from './cooperative-store.js';
const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('input output required');
const bytes=readFileSync(input),data=JSON.parse(bytes.toString());strictEqual(data.executions,1152);strictEqual(data.sourceRef,'1b7bbf1512218be16ae3d8a8f432407b79226751');strictEqual(storeHash(bytes),'ee3a619c0c0d453174dd64533a838068acc6f8c4523fee4560c97774f34a8e77');
const specs=[{seed:152007,style:'truthful',side:1},{seed:152002,style:'bluff',side:2},{seed:152005,style:'skill-aware-bluff',side:2}],records:any[]=[];
for(const spec of specs){
 const pair=data.records.filter((r:Record055)=>r.fixture.mode==='troll'&&r.fixture.seed===spec.seed&&r.style===spec.style&&r.fixture.currentSide===spec.side&&!r.fixture.reversed&&r.variant!=='baseline') as Record055[];strictEqual(pair.length,2);
 const candidate=pair.find(r=>r.variant==='candidate')!,control=pair.find(r=>r.variant==='control')!,driver=firstSignal(candidate)!;if(!driver)throw Error('missing signal');
 strictEqual(control.game.winnerPolicy,'current');strictEqual(candidate.game.winnerPolicy,'reference');deepStrictEqual(control.actions.slice(0,driver.ordinal),candidate.actions.slice(0,driver.ordinal));
 for(const r of pair){
  deepStrictEqual(playSenderDevelopment(r.fixture,r.style,r.variant,data.settings,true),r,'original whole collector differs');
  const on=observeTrajectory(r,data.settings,driver.ordinal),off=observeTrajectory(r,data.settings,driver.ordinal,false);deepStrictEqual({...on,choices:[]},off);
  const trace=commandTrace(r,data.settings,driver.ordinal),traceOff=commandTrace(r,data.settings,driver.ordinal,false);deepStrictEqual({...trace,rows:[]},traceOff);
  records.push({fixture:r.fixture,style:r.style,variant:r.variant,originalSHA256:hash(r),driver,prefixMatched:driver.ordinal,originalCollectorMatched:true,observerOnOffMatched:true,commandObserverOnOffMatched:true,own:on,trace});
  console.log(JSON.stringify({seed:r.fixture.seed,variant:r.variant,actions:on.matchedActions,activeChoices:on.choices.length,traceBoundaries:trace.rows.length}));
 }
}
const paths=['packages/rules/scripts/troll-regression-replay.ts','packages/rules/scripts/troll-regression-run.ts'],sourceHashes=Object.fromEntries(paths.map(p=>[p,storeHash(readFileSync(p))]));
writeFileSync(out,JSON.stringify({kind:'round056-troll-regression-posthoc',sourceRef:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,inputSHA256:storeHash(bytes),settings:data.settings,candidateOptions:data.options.candidate,newResearchExecutions:0,policyCollectorPasses:6,ownObserverPasses:12,commandPasses:12,records,limitations:['Three outcome-selected existing pairs; descriptive diagnosis, not causal effect or independent performance sample.','Own-input resource proposals are not proof of reaching that policy stage.','Grader mechanical snapshots and all-recipient events are not policy inputs.','Working knowledge may contain constraint deductions absent from stored known map.']},null,2)+'\n');

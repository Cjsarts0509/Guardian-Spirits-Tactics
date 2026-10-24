import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {strictEqual,ok} from 'node:assert';
import {failureConsequence,successConsequence} from './chaos-failure-consequence.js';
import {digest058} from './own-delayed-memory.js';
import {storeHash} from './cooperative-store.js';
const [out,sourceRef]=process.argv.slice(2);ok(out&&sourceRef&&!existsSync(out));
strictEqual(execFileSync('git',['rev-parse','HEAD']).toString().trim(),sourceRef);
const files=['packages/rules/src/modes/troll.ts','packages/rules/scripts/own-delayed-memory.ts',
 'packages/rules/scripts/chaos-failure-consequence.ts','packages/rules/scripts/chaos-failure-consequence-run.ts'];
const sourceHashes=Object.fromEntries(files.map(p=>{const b=readFileSync(p);strictEqual(storeHash(b),storeHash(execFileSync('git',['show',sourceRef+':'+p])));return[p,storeHash(b)];}));
const negativeControls=[false,true].map(existing=>{
 const on=failureConsequence(existing),off=failureConsequence(existing,false);
 strictEqual(on.fullStateSHA256,off.fullStateSHA256);strictEqual(on.engineLogSHA256,off.engineLogSHA256);
 return {on,offStateSHA256:off.fullStateSHA256,offLogSHA256:off.engineLogSHA256,observerOnOffIdentical:true};
});
const positiveControl=successConsequence();
writeFileSync(out,JSON.stringify({kind:'exact-failure-purify-consequence-engine-proof',sourceRef,sourceHashes,
 complete:true,synthetic:true,newResearchExecutions:0,policyNotCalled:true,negativeControls,positiveControl,
 evidenceSHA256:digest058({negativeControls,positiveControl})},null,2)+'\n');
console.log(JSON.stringify({complete:true,newResearchExecutions:0,negativeControls:2,positiveControls:1,observerOnOffIdentical:true}));

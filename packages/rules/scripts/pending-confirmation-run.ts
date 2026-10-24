import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {strictEqual,deepStrictEqual} from 'node:assert';
import {storeHash} from './cooperative-store.js';
import {verifiedPendingReplay,EXTRA_CHECKS} from './pending-confirmation.js';
import type {Record055} from './troll-regression-replay.js';
const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('input output required');const bytes=readFileSync(input),data=JSON.parse(bytes.toString());
strictEqual(storeHash(bytes),'ee3a619c0c0d453174dd64533a838068acc6f8c4523fee4560c97774f34a8e77');strictEqual(data.executions,1152);
const records:any[]=[],replays:any[]=[];
for(const original of data.records as Record055[]){
 if(!['control','candidate'].includes(original.variant))continue;
 const requests=original.actions.flatMap((a,i)=>a.side===original.fixture.currentSide&&a.accepted&&a.action.type==='skill'&&a.action.skill==='chaos_hex'?[{actor:a.player,target:a.action.target,at:a.at,due:a.at+60000,ordinal:i}]:[]);
 const extra=original.actions.flatMap((a,i)=>{const act=a.action;return a.side===original.fixture.currentSide&&act.type==='skill'&&EXTRA_CHECKS.has(act.skill)&&requests.some(q=>q.actor===a.player&&q.target===act.target&&q.ordinal<i&&a.at<q.due)?[{ordinal:i,actor:a.player,target:act.target,at:a.at,action:act,accepted:a.accepted,beforeMana:a.beforeMana,afterMana:a.afterMana}]:[];});
 const row={fixture:original.fixture,style:original.style,variant:original.variant,totalActiveChoices:original.counters.activeChoices,storedReportChoices:original.decisions.length,requests,extra};
 records.push(row);
 if(requests.length){const replay=verifiedPendingReplay(original,data.settings);deepStrictEqual(replay.requests,requests);deepStrictEqual(replay.extra.map(e=>Object.fromEntries(Object.keys(extra[0]??{}).map(k=>[k,e[k]]))),extra);replays.push(replay);console.log(JSON.stringify({game:records.length,seed:original.fixture.seed,v:original.variant,requests:requests.length,choices:replay.choices.length,extra:extra.length,actions:replay.matchedActions}));}
}
strictEqual(records.length,768);for(const v of ['control','candidate'])strictEqual(records.filter(r=>r.variant===v).length,384);
const files=['packages/rules/scripts/pending-confirmation.ts','packages/rules/scripts/pending-confirmation-run.ts'];
writeFileSync(out,JSON.stringify({kind:'round057-all-games-pending-census',sourceRef:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:Object.fromEntries(files.map(p=>[p,storeHash(readFileSync(p))])),inputSHA256:storeHash(bytes),options:data.options,optionsSHA256:data.candidateOptionsSHA256,settings:data.settings,newResearchExecutions:0,records,replays,limitations:['All384candidate games, with384control games descriptive only; no outcome-based selection.','Every request-bearing game is replayed with original collector and own observer ON/OFF; active denominator is complete within own pending windows only.','An extra confirmation during a pending check can have legitimate early-information value. No policy tuning or causal performance claim.']},null,2)+'\n');

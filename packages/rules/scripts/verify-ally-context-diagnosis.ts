import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {getMode} from '../src/modes/index.js';
import type {ModeId} from '../src/types.js';
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'docs/evaluations/ally-context-diagnosis'),source=resolve(root,'docs/evaluations/ally-context');
const rows=JSON.parse(gunzipSync(readFileSync(resolve(out,'records.json.gz'))).toString()) as any[];
const summary=JSON.parse(readFileSync(resolve(out,'summary.json'),'utf8'));
assert.equal(rows.length,246);assert(rows.every(r=>r.ok&&r.afterKnowledge&&r.endAfterMs!==undefined));
const seen=new Set<string>(),skills:Record<string,number>={},followupSkills:Record<string,number>={};
let enemyIdentity=0,friendlyIdentity=0,mixedIdentity=0;
for(const r of rows){
 const key=JSON.stringify([r.fixture,r.style,r.player]);assert(!seen.has(key));seen.add(key);
 const sides=new Map(getMode(r.fixture.mode as ModeId).characters.map(c=>[c.key,c.side]));
 const learned=Object.values(r.newIdentities??{}) as string[];
 const enemy=learned.some(c=>sides.get(c)!==r.fixture.currentSide),friend=learned.some(c=>sides.get(c)===r.fixture.currentSide);
 enemyIdentity+=Number(enemy);friendlyIdentity+=Number(friend);mixedIdentity+=Number(enemy&&friend);
 const changed=Object.entries(r.beforeKnowledge).filter(([id,b]:[string,any])=>{const a=r.afterKnowledge[id];return a&&(a.count<b.count||a.known!==null&&b.known===null);}).map(([id])=>id);
 assert.deepEqual(changed,r.changedTargets);skills[r.alternative.skill]=(skills[r.alternative.skill]??0)+1;
 for(const f of r.followups){
  assert(f.afterMs>=0&&f.afterMs<=r.endAfterMs);
  assert.equal(f.onChangedTarget,!!f.action.target&&r.changedTargets.includes(f.action.target));
 }
 for(const key of new Set<string>(r.followups.filter((f:any)=>f.ok&&f.onChangedTarget).map((f:any)=>f.action.skill??f.action.type)))followupSkills[key]=(followupSkills[key]??0)+1;
}
assert.deepEqual(skills,summary.skills);
const n=(fn:(r:any)=>boolean)=>rows.filter(fn).length;
const checks={accepted:n(r=>r.ok),rejected:n(r=>!r.ok),knowledgeNarrowed:n(r=>r.changedTargets.length>0),identityLearned:n(r=>Object.keys(r.newIdentities).length>0),followupOnChangedTarget60s:n(r=>r.followups.some((f:any)=>f.afterMs<=60000&&f.ok&&f.onChangedTarget)),followupOnChangedTargetAny:n(r=>r.followups.some((f:any)=>f.ok&&f.onChangedTarget)),manaSpent:rows.reduce((s,r)=>s+r.manaSpent,0),counterfactualAllyManaSpent:rows.reduce((s,r)=>s+r.allyCounterfactual.manaSpent,0),counterfactualAllyAccepted:n(r=>r.allyCounterfactual.ok),immediateAdditionalManaBlock:n(r=>r.manaBlockedVsAlly.length>0),originalAllyLater:n(r=>r.firstOriginalAlly!==undefined),anyAllyLater:n(r=>r.firstAlly!==undefined)};
for(const [k,v] of Object.entries(checks))assert.equal(summary[k],v);
const historical=JSON.parse(gunzipSync(readFileSync(resolve(source,'holdout-matches.json.gz'))).toString()) as any[];
const pairs=new Map<string,any>();for(const g of historical){const key=JSON.stringify([g.fixture,g.style]),pair=pairs.get(key)??{};pair[g.learned?'candidate':'baseline']=g;pairs.set(key,pair);}
const flipped=[];for(const [key,p] of pairs){if(p.baseline.winnerPolicy===p.candidate.winnerPolicy)continue;flipped.push({fixture:p.baseline.fixture,style:p.baseline.style,baseline:p.baseline.winnerPolicy,candidate:p.candidate.winnerPolicy,interventions:rows.filter(r=>JSON.stringify([r.fixture,r.style])===key).map(r=>({player:r.player,at:r.at,original:r.original,alternative:r.alternative,manaDelta:r.manaSpent-r.allyCounterfactual.manaSpent,changedTargets:r.changedTargets,firstOriginalAlly:r.firstOriginalAlly}))});}
const hashes=Object.fromEntries(Object.entries(summary.hashes as Record<string,string>).map(([p,h])=>[p,createHash('sha256').update(readFileSync(resolve(root,'packages/rules',p))).digest('hex')===h]));assert(Object.values(hashes).every(Boolean));
const result={records:rows.length,sourceHashesMatch:hashes,summaryRecountMatches:true,uniqueActorsPerMatch:seen.size,inputs:Object.fromEntries(['model.json','holdout-matches.json.gz'].map(p=>[p,createHash('sha256').update(readFileSync(resolve(source,p))).digest('hex')])),identityContext:{enemyIdentity,friendlyIdentity,mixedIdentity},followupSkillsByIntervention:followupSkills,flippedMatches:flipped};
writeFileSync(resolve(out,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

/** Post-hoc finite diagnostic: working knowledge vs stored known-map at actual chat choices. */
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {deepStrictEqual} from 'node:assert';
import {smartBotAction,botCommunicationAction,botKnowledge,eventsFor,viewFor,type Action,type BotMemory,type Knowledge} from '../src/index.js';
import {createBotMemory,updateBotKnowledge} from '../src/bot-memory.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {playMatch,type Policy} from './league-runner.js';
import {opponentClaim} from './claim-opponents.js';
import {SENDER_OPTIONS} from './sender-development.js';
import {storeHash} from './cooperative-store.js';
const [input,out]=process.argv.slice(2),data=JSON.parse(readFileSync(input!,'utf8'));if(!out||data.executions!==1152||data.sourceRef!=='1b7bbf1512218be16ae3d8a8f432407b79226751')throw Error('complete055 raw and output required');
const selected=[];
for(const mode of ['civil_war','primordial','lidellut','troll'])for(const variant of ['control','candidate']){
 const r=data.records.find((r:any)=>r.fixture.mode===mode&&r.variant===variant&&r.actions.some((a:any)=>a.side===r.fixture.currentSide&&a.grade.reportTarget&&a.grade.reportKnownName===null));
 if(!r)throw Error('missing proof sample');selected.push(r);
}
const records=[];
for(const original of selected){
 const options=original.variant==='candidate'?SENDER_OPTIONS:{},pending=new Map<string,ReturnType<typeof viewFor>>(),actions:any[]=[],proofs:any[]=[];
 const remember=(s:Parameters<Policy>[0],id:string,a:Action|null)=>{if(a)pending.set(id,viewFor(s,id));return a;};
 const current:Policy=(s,id,m,o)=>remember(s,id,smartBotAction(s,id,m,{...o,...options}));
 const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return remember(s,id,a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,original.style,a.name)}:a);};
 const chat:Policy=(s,id,m,o)=>{
  const a=botCommunicationAction(s,id,m,{...o,...options});
  if(a?.type==='chat'){
   const pre=structuredClone(m),v=viewFor(s,id),k=botKnowledge(s,id,v,structuredClone(m)),match=/^확인 정보: \[(\d{1,2})\] (.+)$/.exec(a.text);
   const rebuilt=updateBotKnowledge(v,eventsFor(s,id),createBotMemory(0),{learnOwnAttackOutcome:false});deepStrictEqual(rebuilt.known,k.known);deepStrictEqual(rebuilt.candidates,k.candidates);
   deepStrictEqual(m,pre,'working-knowledge diagnostic changed actual memory/RNG');
   const target=v.players.find(p=>p.seat===Number(match?.[1]))?.id;
   const name=v.roster.find(r=>r.name===match?.[2])?.key;
   if(!target||!name||k.known.get(target)!==name)throw Error('actual outgoing report lacks own confirmed working knowledge');
   proofs.push({player:id,at:v.elapsedMs,ordinal:actions.length,action:a,target,reportedName:name,storedKnown:[...(m.perception?.known??[])],workingKnown:[...k.known],workingCandidates:[...k.candidates],view:structuredClone(v),events:structuredClone(eventsFor(s,id)),memoryUnchanged:true});
  }
  return remember(s,id,a);
 };
 const game=playMatch(original.fixture,{current,reference},data.settings,(s,id,a,r)=>{
  const v=pending.get(id)!;pending.delete(id);const after=viewFor(s,id);
  actions.push({player:id,at:v.elapsedMs,action:a,accepted:r.ok,error:r.ok?null:r.error??'unknown rejection',side:v.me.side,character:v.me.character,beforeMana:v.me.mana,afterMana:after.me.mana,maxMana:v.me.maxMana,nominalMana:a.type==='skill'?v.me.skills.find(z=>z.key===a.skill)?.mana??0:0,receiptKinds:r.events.map(e=>e.kind)});
 },{current:chat});
 deepStrictEqual(game,original.game);const keys=Object.keys(actions[0]??{});deepStrictEqual(actions,original.actions.map((a:any)=>Object.fromEntries(keys.map(k=>[k,a[k]]))));
 const sparse=proofs.filter(p=>!new Map(p.storedKnown).has(p.target));
 records.push({fixture:original.fixture,variant:original.variant,style:original.style,wholeGameAndReceiptsMatched:true,matchedActions:actions.length,actionsSHA256:storeHash(JSON.stringify(actions)),reportProofs:proofs.length,sparseStoredMapCases:sparse.length,proofs:sparse});
}
const result={analysisSourceSHA256:storeHash(readFileSync(fileURLToPath(import.meta.url))),kind:'round055-stored-map-vs-working-knowledge-replay',inputSHA256:storeHash(readFileSync(input!)),newResearchExecutions:0,replayedGames:records.length,records,limitations:['Eight predeclared coverage cells chosen after evaluation only to diagnose a grading-field ambiguity, not for policy tuning.','Full original game and receipt equality is verified; no counterfactual wins or population-wide causal benefit is inferred.']};
writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({replayedGames:records.length,matchedActions:records.reduce((n,r)=>n+r.matchedActions,0),reportsChecked:records.reduce((n,r)=>n+r.reportProofs,0),sparseStoredMapCases:records.reduce((n,r)=>n+r.sparseStoredMapCases,0)}));

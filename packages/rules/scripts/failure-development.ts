/** 062 fixed-opponent development. Observer clones never enter actual policy memory. */
import {createHash} from 'node:crypto';
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {smartBotAction,botCommunicationAction,updateBotKnowledge,viewFor,eventsFor,serializeHostMemories,
 type BotMemory,type PlayerView,type Action,type GameEvent} from '../src/index.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {playMatch,prepareMatch,DEFAULT_SETTINGS,type Fixture,type Settings,type Policy} from './league-runner.js';
import {opponentClaim,type ClaimStyle} from './claim-opponents.js';
import {SENDER_OPTIONS} from './sender-development.js';
import {storeHash} from './cooperative-store.js';
export const FAILURE_VARIANTS=['baseline','control','candidate'] as const;
export type FailureVariant=typeof FAILURE_VARIANTS[number];
export const FAILURE_OPTIONS={baseline:{},control:{...SENDER_OPTIONS,rememberOwnDelayedCheck:true},candidate:{...SENDER_OPTIONS,rememberOwnDelayedCheck:true,learnOwnDelayedFailureFaction:true}};
type Episode={actor:string;receipt:GameEvent;due:number;result:GameEvent|null;aliveAtResultCollection:boolean|null;
 firstReceiptSeen:{at:number;stage:string;record:unknown}|null;firstResultSeen:{at:number;stage:string;record:unknown}|null;classification:string};
export function playFailureDevelopment(fixture:Fixture,style:ClaimStyle,variant:FailureVariant,settings:Settings=DEFAULT_SETTINGS,observe=true){
 const options=FAILURE_OPTIONS[variant],roles=prepareMatch(fixture).state.players.map(p=>({id:p.id,character:p.character,side:p.side,seat:p.seat}));
 const pending=new Map<string,{view:PlayerView;known:Map<string,string>;stage:string}>(),episodes:Episode[]=[],probes:any[]=[],followups:any[]=[],actions:any[]=[];
 const received=new Set<number>(),failedSeen=new Set<string>(),memoryHash=createHash('sha256');
 const counters={knownChecks:0,wrongKnown:0,wrongNewElimination:0,eligible:0,reduced:0,firstFailures:0,choiceChanged:0,rngChanged:0};
 const collect=(s:Parameters<Policy>[0])=>{
  if(!observe)return;
  for(const event of s.log){
   if(received.has(event.seq))continue;received.add(event.seq);
   if(event.vis.to!=='players'||event.vis.ids.length!==1||!['skill.chaos_hex.self','skill.chaos_hex.result'].includes(event.kind))continue;
   const actor=event.vis.ids[0]!,player=s.players.find(p=>p.id===actor);if(player?.side!==fixture.currentSide)continue;
   if(event.kind==='skill.chaos_hex.self')episodes.push({actor,receipt:structuredClone(event),due:event.at+60000,result:null,aliveAtResultCollection:null,firstReceiptSeen:null,firstResultSeen:null,classification:'pending'});
   else{const ep=episodes.find(e=>e.actor===actor&&e.receipt.data?.target===event.data?.target&&e.due===event.at&&!e.result);
    if(ep){ep.result=structuredClone(event);ep.aliveAtResultCollection=player.alive;}}
  }
 };
 const wrap=(fn:Policy,stage:string,current:boolean):Policy=>(s,id,m,o)=>{
  const view=viewFor(s,id),pre=observe&&current&&variant!=='baseline'&&view.mode==='troll'&&view.me.character==='kanulla'?structuredClone(m):null;
  const events=pre?eventsFor(s,id,pre.perception?.lastSeq??0).filter(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(id)):[];
  const a=fn(s,id,m,{...o,...(current?options:{})});
  memoryHash.update(JSON.stringify([id,view.elapsedMs,stage,a,serializeHostMemories(new Map([[id,m]]))]));
  const k=m.perception?updateBotKnowledge(view,[],structuredClone(m),current?options:{}):null;
  if(a)pending.set(id,{view,known:k?.known??new Map(),stage});
  if(!observe)return a;
  collect(s);
  if(current&&k&&m.perception?.lastElapsedMs===view.elapsedMs&&view.me.alive&&view.phase==='running'){
   for(const [target,name] of k.known){counters.knownChecks++;if(s.players.find(p=>p.id===target)?.character!==name)counters.wrongKnown++;}
   const records=m.perception.ownDelayedChecks?.records??[];
   for(const rec of records){
    const ep=episodes.find(e=>e.actor===id&&e.receipt.seq===rec.receiptSeq);if(!ep)continue;
    ep.firstReceiptSeen??={at:view.elapsedMs,stage,record:structuredClone(rec)};
    if(rec.result&&!ep.firstResultSeen)ep.firstResultSeen={at:view.elapsedMs,stage,record:structuredClone(rec)};
   }
   const failures=records.filter(rec=>rec.status==='failed'&&!failedSeen.has(`${id}:${rec.receiptSeq}`));
   if(failures.length&&pre){
    const beforeState=storeHash(JSON.stringify(s)),actualMemory=storeHash(JSON.stringify(serializeHostMemories(new Map([[id,m]]))));
    const off=structuredClone(pre),on=structuredClone(pre);
    const offAction=fn(s,id,off,{...o,...FAILURE_OPTIONS.control}),onAction=fn(s,id,on,{...o,...FAILURE_OPTIONS.candidate});
    deepStrictEqual(a,variant==='candidate'?onAction:offAction);deepStrictEqual(m,variant==='candidate'?on:off);
    const old=updateBotKnowledge(view,[],structuredClone(off),FAILURE_OPTIONS.control),next=updateBotKnowledge(view,[],structuredClone(on),FAILURE_OPTIONS.candidate);
    const evidence=failures.map(rec=>{
     failedSeen.add(`${id}:${rec.receiptSeq}`);const names=old.candidates.get(rec.target)??[],remaining=next.candidates.get(rec.target)??[];
     const eligible=names.some(n=>view.roster.find(r=>r.key===n)!.side===1)&&names.some(n=>view.roster.find(r=>r.key===n)!.side===2);
     const removed=names.filter(n=>!remaining.includes(n));counters.firstFailures++;counters.eligible+=Number(eligible);counters.reduced+=Number(eligible&&removed.length>0);
     return {receiptSeq:rec.receiptSeq,target:rec.target,result:rec.result,oldCandidates:names,newCandidates:remaining,eligible,removed};
    });
    const newExact=[...next.known].filter(([target,name])=>old.known.get(target)!==name);
    const removals=[...old.candidates].flatMap(([target,names])=>{const removed=names.filter(n=>!next.candidates.get(target)?.includes(n));return removed.length?[{target,removed,actual:s.players.find(p=>p.id===target)!.character}]:[];});
    for(const r of removals)counters.wrongNewElimination+=Number(r.removed.includes(r.actual));
    for(const [target,name] of newExact)strictEqual(s.players.find(p=>p.id===target)!.character,name);
    strictEqual(storeHash(JSON.stringify(s)),beforeState);strictEqual(storeHash(JSON.stringify(serializeHostMemories(new Map([[id,m]])))),actualMemory);
    const changed=JSON.stringify(offAction)!==JSON.stringify(onAction),rngChanged=off.rng!==on.rng;counters.choiceChanged+=Number(changed);counters.rngChanged+=Number(rngChanged);
    probes.push({actor:id,at:view.elapsedMs,stage,ordinal:actions.length,view,events,preMemory:serializeHostMemories(new Map([[id,pre]])),
     oldKnown:[...old.known],newKnown:[...next.known],newExact,removals,evidence,offAction,onAction,chosenAction:a,offRng:off.rng,onRng:on.rng,changed,rngChanged,actualMemoryUnchanged:true});
   }
  }
  return a;
 };
 const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,style,a.name)}:a;};
 const current=wrap(variant==='baseline'?((s,id,m,o)=>previous(s,id,m,{activity:o.activity})):smartBotAction,'primary',true),ref=wrap(reference,'primary',false),chat=wrap(botCommunicationAction,'chat',true);
 const game=playMatch(fixture,{current,reference:ref},settings,(s,id,a,result)=>{
  const b=pending.get(id);ok(b);pending.delete(id);const after=viewFor(s,id),ordinal=actions.length;
  const match=a.type==='chat'?/^확인 정보: \[(\d{1,2})\] (.+)$/.exec(a.text):null,reportTarget=match?b.view.players.find(p=>p.seat===Number(match[1]))?.id??null:null;
  const reportedName=match?b.view.roster.find(r=>r.name===match[2])?.key??null:null;
  actions.push({player:id,at:b.view.elapsedMs,stage:b.stage,action:a,accepted:result.ok,error:result.ok?null:result.error,
   side:b.view.me.side,character:b.view.me.character,beforeMana:b.view.me.mana,afterMana:after.me.mana,maxMana:b.view.me.maxMana,
   nominalMana:a.type==='skill'?b.view.me.skills.find(x=>x.key===a.skill)?.mana??0:0,receiptKinds:result.events.map(e=>e.kind),
   reportTarget,reportedName,reportKnown:reportTarget?b.known.get(reportTarget)??null:null,reportActual:reportTarget?s.players.find(p=>p.id===reportTarget)!.character:null});
  collect(s);
  if(observe&&b.view.me.side===fixture.currentSide)for(let i=0;i<probes.length;i++){
   const probe=probes[i];if(probe.actor!==id||ordinal<probe.ordinal||ordinal===probe.ordinal&&probe.chosenAction!==null)continue;
   const targets=new Set([...probe.evidence.map((e:any)=>e.target),...probe.newExact.map((e:any)=>e[0])]);
   const target=a.type==='skill'?a.target:reportTarget;if(!target||!targets.has(target))continue;
   const name=b.known.get(target)??null;followups.push({probe:i,ordinal,actor:id,at:b.view.elapsedMs,target,action:a,accepted:result.ok,knownName:name,
    actualName:s.players.find(p=>p.id===target)!.character,kind:a.type==='chat'?'direct_report':a.skill});
  }
 },variant==='baseline'?{}:{current:chat},collect);
 for(const ep of episodes)ep.classification=ep.firstResultSeen?'observed':ep.result?(ep.aliveAtResultCollection?'no-later-live-update':'postmortem-result'):'ended-before-result';
 const mine=actions.filter(a=>a.side===fixture.currentSide),resources={nominalSkillMana:mine.filter(a=>a.accepted&&a.action.type==='skill').reduce((n,a)=>n+a.nominalMana,0),
 netSkillManaDelta:mine.filter(a=>a.accepted&&a.action.type==='skill').reduce((n,a)=>n+a.afterMana-a.beforeMana,0),attackFailures:mine.filter(a=>a.receiptKinds.includes('attack.fail.self')).length,
 rejected:mine.filter(a=>!a.accepted).length,reports:mine.filter(a=>a.reportTarget).length,falseReports:mine.filter(a=>a.reportTarget&&(a.reportedName!==a.reportActual||a.reportKnown!==a.reportActual)).length};
 return {fixture,style,variant,game,roles,actions,resources,episodes,probes,followups,counters,memoryTraceSHA256:memoryHash.digest('hex')};
}

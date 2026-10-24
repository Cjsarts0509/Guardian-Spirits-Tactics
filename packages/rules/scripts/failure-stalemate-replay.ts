/** Read-only active-decision and protection-resource witnesses for capped games. */
import {createHash} from 'node:crypto';
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {smartBotAction,botCommunicationAction,updateBotKnowledge,viewFor,eventsFor,serializeHostMemories,
 type BotMemory,type PlayerView} from '../src/index.js';
import {nextRandom} from '../src/rng.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {playMatch,DEFAULT_SETTINGS,type Settings,type Policy} from './league-runner.js';
import {opponentClaim} from './claim-opponents.js';
import {FAILURE_OPTIONS,type playFailureDevelopment} from './failure-development.js';
import {storeHash} from './cooperative-store.js';

type Row=ReturnType<typeof playFailureDevelopment>;
const wire=(id:string,m:BotMemory)=>serializeHostMemories(new Map([[id,m]]));

/** Observes both controllers, including inactive/actionless choices. Does not change policies. */
export function replayFailureStalemate(original:Row,settings:Settings=DEFAULT_SETTINGS,identicalPolicy=false){
 const options=FAILURE_OPTIONS[original.variant],pending=new Map<string,{view:PlayerView;known:Map<string,string>;stage:string;externalTargetBefore:unknown}>();
 const actions:any[]=[],decisions:any[]=[],protection:any[]=[],memoryHash=createHash('sha256');
 const calls={primary:0,activePrimary:0,inactivePrimary:0,chat:0};
 const targetState=(s:Parameters<Policy>[0],id:string)=>{
  const p=s.players.find(p=>p.id===id);ok(p);
  return {id:p.id,character:p.character,side:p.side,alive:p.alive,mana:p.mana,extraLives:p.extraLives};
 };
 const wrap=(fn:Policy,stage:'primary'|'chat',current:boolean):Policy=>(s,id,m,o)=>{
  const enabled=current||identicalPolicy,v=viewFor(s,id);
  const active=stage==='primary'&&v.phase==='running'&&v.me.alive&&nextRandom({rng:m.rng})<=(o.activity??.5);
  const pre=active?structuredClone(m):null;
  const incoming=pre?eventsFor(s,id,pre.perception?.lastSeq??0).filter(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(id)):[];
  const a=fn(s,id,m,{...o,...(enabled?options:{})});
  memoryHash.update(JSON.stringify([id,v.elapsedMs,stage,a,wire(id,m)]));
  const k=m.perception?updateBotKnowledge(v,[],structuredClone(m),enabled?options:{}):null;
  if(stage==='primary'){calls.primary++;if(active)calls.activePrimary++;else calls.inactivePrimary++;}else calls.chat++;
  if(a){
   // Target resource facts are external grading AFTER choice. Never passed to fn or own memory.
   const externalTargetBefore=a.type==='skill'&&a.target?targetState(s,a.target):null;
   pending.set(id,{view:v,known:k?.known??new Map(),stage,externalTargetBefore});
  }
  if(active){
   ok(pre);strictEqual(m.perception?.lastElapsedMs,v.elapsedMs,'active decision did not update own perception');
   decisions.push({actor:id,at:v.elapsedMs,stage,ordinal:actions.length,chosenAction:a,
    view:structuredClone(v),events:structuredClone(incoming),preMemory:wire(id,pre),postMemory:wire(id,m),
    persistedKnownAfter:[...(m.perception?.known??[])],reconstructedKnownAfter:[...(k?.known??[])],
    reconstructedCandidatesAfter:[...(k?.candidates??[])],
    nominallyReadySkills:v.me.skills.filter(s=>!s.passive&&s.blocked===null).map(s=>s.key),
    knowledgeScope:enabled&&original.variant!=='baseline'?'current-policy-own-update':'observer-reconstruction-from-legacy-own-memory'});
  }
  return a;
 };
 const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,original.style,a.name)}:a;};
 const own:Policy=original.variant==='baseline'?((s,id,m,o)=>previous(s,id,m,{activity:o.activity})):smartBotAction;
 const current=wrap(own,'primary',true),ref=wrap(identicalPolicy?own:reference,'primary',false);
 const chat=wrap(botCommunicationAction,'chat',true),refChat=wrap(botCommunicationAction,'chat',false);
 const game=playMatch(original.fixture,{current,reference:ref},settings,(s,id,a,result)=>{
  const b=pending.get(id);ok(b);pending.delete(id);const after=viewFor(s,id),ordinal=actions.length;
  const match=a.type==='chat'?/^확인 정보: \[(\d{1,2})\] (.+)$/.exec(a.text):null;
  const reportTarget=match?b.view.players.find(p=>p.seat===Number(match[1]))?.id??null:null;
  const reportedName=match?b.view.roster.find(r=>r.name===match[2])?.key??null:null;
  actions.push({player:id,at:b.view.elapsedMs,stage:b.stage,action:a,accepted:result.ok,error:result.ok?null:result.error,
   side:b.view.me.side,character:b.view.me.character,beforeMana:b.view.me.mana,afterMana:after.me.mana,maxMana:b.view.me.maxMana,
   nominalMana:a.type==='skill'?b.view.me.skills.find(x=>x.key===a.skill)?.mana??0:0,receiptKinds:result.events.map(e=>e.kind),
   reportTarget,reportedName,reportKnown:reportTarget?b.known.get(reportTarget)??null:null,reportActual:reportTarget?s.players.find(p=>p.id===reportTarget)!.character:null});
  if(a.type==='skill'&&a.target&&result.events.some(e=>['attack.guarded','skill.holy_binding.purge','skill.destroyer_guidance.madness'].includes(e.kind))){
   const ownEvents=result.events.filter(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(id));
   protection.push({ordinal,actor:id,at:b.view.elapsedMs,action:a,accepted:result.ok,ownView:b.view,ownEvents:structuredClone(ownEvents),
    externalTargetBefore:b.externalTargetBefore,externalTargetAfter:targetState(s,a.target),externalGradingOnly:true});
  }
 },original.variant==='baseline'?{}:identicalPolicy?{current:chat,reference:refChat}:{current:chat});
 deepStrictEqual(game,original.game,'replay changed whole game');deepStrictEqual(actions,original.actions,'replay changed any actual command/receipt/resource/report');
 const trace=memoryHash.digest('hex');strictEqual(trace,original.memoryTraceSHA256,'replay changed actual per-call memory/RNG');
 strictEqual(calls.activePrimary,decisions.length);strictEqual(calls.primary,calls.activePrimary+calls.inactivePrimary);
 return {fixture:original.fixture,style:original.style,variant:original.variant,identicalPolicy,newResearchExecutions:0,
  game,matchedActions:actions.length,actionsSHA256:storeHash(JSON.stringify(actions)),memoryTraceSHA256:trace,wholeGameMatched:true,
  calls,decisions,protection,
  limitations:['Active primary calls are activity-gate successes, not necessarily legal skill opportunities.',
   'Nominally ready skills exclude passive/blocked entries but do not establish target-specific legality or priority.',
   'Legacy working knowledge is an observer reconstruction; persisted own memory is stored separately.',
   'Target resource facts are separate external grading after the command choice, never policy inputs.',
   'Protection consumption is not an attack-name failure; repeated guards may still drain a resource.',
   'A capped game and its paired policies are selected failure diagnostics, not population win estimates.']};
}

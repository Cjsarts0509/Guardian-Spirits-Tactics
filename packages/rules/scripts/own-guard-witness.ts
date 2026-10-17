/** Round049 observer. It never returns diagnostic suggestions to the policy. */
import {deepStrictEqual,strictEqual} from 'node:assert';
import {isDeepStrictEqual} from 'node:util';
import {smartBotAction,botCommunicationAction,botKnowledge,viewFor,eventsFor,type PlayerView,type Action,type Knowledge} from '../src/index.js';
import {knownCommanderGuard} from '../src/bot-commander-guard.js';
import {NAME_ATTACKS} from '../src/bot-tactics.js';
import {playMatch,type Policy,type Settings} from './league-runner.js';
import {playReportSelfplay} from './report-selfplay.js';
import {replayHash,type OriginalRecord} from './commander-death-replay.js';
export function inspectOwnGuard(view:PlayerView,k:Knowledge){
 const pair=view.me.character==='consume'?['consume_master_guard','eltas']:view.me.character==='kumarin'?['kumarin_commander_guard','rael']:null;
 if(view.mode!=='primordial'||!pair)return null;
 const [key,name]=pair as [string,string],skill=view.me.skills.find(s=>s.key===key),target=view.players.find(p=>k.known.get(p.id)===name);
 const enemies=view.players.filter(p=>p.alive&&!p.statuses.some(e=>e.kind==='invulnerable')&&k.known.has(p.id)&&view.roster.some(r=>r.key===k.known.get(p.id)&&r.side!==view.me.side));
 const reservedAttacks=view.me.skills.filter(s=>NAME_ATTACKS.includes(s.key)&&s.cooldownRemainingMs>0&&s.cooldownRemainingMs<=20000&&view.me.mana>=s.mana&&enemies.some(p=>s.nameOptions?.includes(k.known.get(p.id)!))).map(s=>({skill:s.key,cost:s.mana,cooldown:s.cooldownRemainingMs}));
 const reserve=Math.max(0,...reservedAttacks.map(s=>s.cost));
 const usable=new Map(view.me.skills.filter(s=>!s.passive&&s.blocked===null&&(NAME_ATTACKS.includes(s.key)||s.key==='break_ally'||s.mana<=view.me.mana-reserve)).map(s=>[s.key,s]));
 const suggestion=knownCommanderGuard(view,k,usable);
 const reason=!skill||skill.passive||skill.blocked!==null||skill.usesLeft===0||skill.cooldownRemainingMs>0||view.me.mana<skill.mana?'skill_unavailable':
  !target?'identity_unconfirmed':!target.alive?'known_target_dead':target.statuses.some(e=>e.kind==='invulnerable')&&!skill.ignoresInvulnerable?'known_target_protected':skill.mana>view.me.mana-reserve?'attack_reserve':'own_guard_ready';
 strictEqual(suggestion!==null,reason==='own_guard_ready');
 return {guardSkill:key,targetRole:name,skill:skill??null,target:target?.id??null,targetAlive:target?.alive??null,reserve,reservedAttacks,reason,suggestion};
}
export function guardWitness(original:OriginalRecord,settings:Settings,observe=true){
 const records:Array<{player:string;at:number;beforeAppliedActions:number;view:PlayerView;events:ReturnType<typeof eventsFor>;known:Array<[string,string]>;diagnostic:NonNullable<ReturnType<typeof inspectOwnGuard>>;chosenAction:Action|null;selected:boolean;memoryUnchanged:true;engineUnchanged:true}>=[];
 const pending=new Map<string,PlayerView>(),actions:Array<Record<string,unknown>>=[];
 let guardCalls=0,activeCalls=0,inactiveCalls=0;
 const remember=(s:Parameters<Policy>[0],id:string,a:Action|null)=>{if(a)pending.set(id,viewFor(s,id));return a;};
 const options=original.variant==='reportedSupreme'?{reportedSupreme:true}:{};
 const policy:Policy=(s,id,m,o)=>{
  const a=smartBotAction(s,id,m,{...o,...options}),v=viewFor(s,id);remember(s,id,a);
  if(!['consume','kumarin'].includes(v.me.character))return a;
  guardCalls++;if(m.communicationAt!==v.elapsedMs){inactiveCalls++;return a;}activeCalls++;
  if(observe){
   const before=structuredClone(m),stateHash=replayHash(s),memory=structuredClone(m),k=botKnowledge(s,id,v,memory,{learnOwnAttackOutcome:false});
   const diagnostic=inspectOwnGuard(v,k)!;deepStrictEqual(m,before,'observer mutated original own memory');strictEqual(replayHash(s),stateHash,'observer mutated engine');
   records.push({player:id,at:v.elapsedMs,beforeAppliedActions:actions.length,view:structuredClone(v),events:structuredClone(eventsFor(s,id)),known:[...k.known],diagnostic,chosenAction:structuredClone(a),selected:!!diagnostic.suggestion&&isDeepStrictEqual(a,diagnostic.suggestion),memoryUnchanged:true,engineUnchanged:true});
  }
  return a;
 };
 const chat:Policy=(s,id,m,o)=>remember(s,id,botCommunicationAction(s,id,m,{...o,...options}));
 const game=playMatch(original.result.game.fixture,{current:policy,reference:policy},settings,(s,id,a,r)=>{
  const v=pending.get(id)!;if(!v)throw Error('missing actual pre-action own view');pending.delete(id);const after=viewFor(s,id),act=a;
  actions.push({player:id,at:v.elapsedMs,action:a,accepted:r.ok,error:r.ok?null:r.error??'알 수 없는 거절',beforeMana:v.me.mana,afterMana:after.me.mana,maxMana:v.me.maxMana,
   nominalMana:act.type==='skill'?v.me.skills.find(z=>z.key===act.skill)?.mana??0:0,character:v.me.character,side:v.me.side,beforeTrueName:v.me.trueName,beforePublished:v.me.published,receiptKinds:r.events.map(e=>e.kind)});
 },{current:chat,reference:chat});
 deepStrictEqual(game,original.result.game,'witness whole game mismatch');
 const keys=['player','at','action','accepted','error','beforeMana','afterMana','maxMana','nominalMana','character','side','beforeTrueName','beforePublished','receiptKinds'];
 deepStrictEqual(actions,original.result.actions.map(a=>Object.fromEntries(keys.map(k=>[k,(a as unknown as Record<string,unknown>)[k]]))),'witness full actions/resources/receipts mismatch');
 return {fixture:game.fixture,variant:original.variant,game,actionsSHA256:replayHash(actions),matchedActions:actions.length,wholeGameAndAllActionsMatched:true,guardCalls,activeCalls,inactiveCalls,decisions:records};
}
export function verifiedGuardWitness(original:OriginalRecord,settings:Settings){
 const collector=playReportSelfplay(original.result.game.fixture,original.variant,settings,true);deepStrictEqual(collector,original,'full original collector mismatch');
 return {...guardWitness(original,settings),originalRecordSHA256:replayHash(original),originalCollectorMatched:true,originalCollectorPasses:1,witnessPasses:1};
}

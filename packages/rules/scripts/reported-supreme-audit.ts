/** Same-point counterfactuals only; actual match always follows its original OFF policy. */
import {isDeepStrictEqual} from 'node:util';
import {smartBotAction,botCommunicationAction,viewFor,eventsFor,applyAction,type PlayerView,type GameEvent,type BotMemory,type Action} from '../src/index.js';
import {updateBotKnowledge} from '../src/bot-memory.js';
import {reportedSupremeAttack,trustedIntel} from '../src/bot-intel.js';
import {nextRandom} from '../src/rng.js';
import {playMatch,DEFAULT_SETTINGS,type Fixture,type Policy,type Settings} from './league-runner.js';
import type {GuardVariant} from './guard-selfplay.js';
import type {playGuardRealization} from './guard-realization.js';

/** Own-view boundary. Neither a hidden assignment nor another player's memory is accepted. */
export function reportAttackOpportunity(view:PlayerView,events:readonly GameEvent[],memory:BotMemory){
 if(view.mode!=='primordial')throw Error('primordial-only audit');
 const copy=structuredClone(memory),knowledge=updateBotKnowledge(view,events,copy),trusted=trustedIntel(view,knowledge,copy);
 const skill=view.me.skills.find(s=>s.key==='supreme_attack');
 const targets=[...trusted].map(([id,name])=>{
  const p=view.players.find(p=>p.id===id)!,role=view.roster.find(r=>r.key===name)!;
  const failed=copy.perception!.lastAttackNameFailure.get(id)?.has(name)??false;
  const reason=!skill?'no_skill':skill.blocked!==null?'skill_blocked':view.elapsedMs<240000?'before_four_minutes':view.me.mana<Math.max(100,skill.mana)?'reserve_mana':role.side===view.me.side?'friendly_report':!skill.nameOptions?.includes(name)?'name_unavailable':!skill.ignoresInvulnerable&&p.statuses.some(s=>s.kind==='invulnerable')?'public_invulnerable':failed?'own_same_name_failure':'eligible';
  const senders=[...copy.perception!.intel!.reports.get(id)!].filter(([sender,r])=>r.character===name&&view.players.some(p=>p.id===sender&&p.alive)&&view.roster.some(r=>r.key===knowledge.known.get(sender)&&r.side===view.me.side)).map(([sender,r])=>({id:sender,knownRole:knowledge.known.get(sender)!,at:r.at,seq:r.seq}));
  return {id,name,commander:role.commander,side:role.side,alive:p.alive,known:knowledge.known.has(id),nameAllowed:!!skill?.nameOptions?.includes(name),invulnerable:p.statuses.some(s=>s.kind==='invulnerable'),ownSameNameFailure:failed,reason,senders};
 });
 const suggestion=reportedSupremeAttack(view,knowledge,copy,new Map(view.me.skills.filter(s=>!s.passive&&s.blocked===null).map(s=>[s.key,s])),name=>view.roster.find(r=>r.key===name)!.side!==view.me.side);
 const eligible=targets.filter(t=>t.reason==='eligible').sort((a,b)=>Number(b.commander)-Number(a.commander)||view.players.find(p=>p.id===a.id)!.seat-view.players.find(p=>p.id===b.id)!.seat);
 const expected=eligible[0]?{type:'skill',skill:'supreme_attack',target:eligible[0].id,name:eligible[0].name}:null;
 if(!isDeepStrictEqual(suggestion,expected))throw Error('independent own-view eligibility mismatch');
 return {player:view.me.id,at:view.elapsedMs,character:view.me.character,side:view.me.side,mana:view.me.mana,
  skill:skill?{mana:skill.mana,blocked:skill.blocked,cooldownRemainingMs:skill.cooldownRemainingMs,ignoresInvulnerable:skill.ignoresInvulnerable}:null,targets,suggestion};
}

export function playReportedSupremeAudit(fixture:Fixture,variant:GuardVariant,settings:Settings=DEFAULT_SETTINGS,observe=true){
 if(fixture.mode!=='primordial'||!['cooperative','knownCommanderGuardBeforeAlly'].includes(variant))throw Error('invalid reported audit');
 const options=variant==='cooperative'?{}:{knownCommanderGuardBeforeAlly:true};
 const decisions:Array<ReturnType<typeof reportAttackOpportunity>&{off:Action|null;on:Action|null;changed:boolean;knowledgeUnchanged:boolean;hypothetical:null|{accepted:boolean;error:string|null;receiptKinds:string[];manaDelta:number;wrongName:boolean;targetActualRole:string|null;attackFailure:boolean}}>=[];
 const pending=new Map<string,PlayerView>();
 const remember=(s:Parameters<Policy>[0],id:string,a:Action|null)=>{if(observe&&a)pending.set(id,viewFor(s,id));return a;};
 const policy:Policy=(s,id,m,o)=>{
  // This corpus has no early reaction option. Peek a copied own RNG to avoid cloning inactive polls.
  const predicted=observe&&s.phase==='running'&&nextRandom({rng:m.rng})<=(o.activity??0.5);
  const before=predicted?structuredClone(m):null;
  const off=smartBotAction(s,id,m,{...o,...options});
  if(observe&&m.communicationAt===s.now-s.startedAt){
   if(!before)throw Error('active gate prediction mismatch');
   const alternative=structuredClone(before),on=smartBotAction(s,id,alternative,{...o,...options,reportedSupreme:true});
   const own=reportAttackOpportunity(viewFor(s,id),eventsFor(s,id,m.perception?.lastSeq??0),m),changed=!isDeepStrictEqual(off,on);
   const knowledgeUnchanged=isDeepStrictEqual(m.perception?.known,alternative.perception?.known);
   if(!knowledgeUnchanged||changed&&(!on||!isDeepStrictEqual(on,own.suggestion)))throw Error('report fact promotion or unexpected option divergence');
   let hypothetical=null;
   if(changed){
    const proposed=on!,copy=structuredClone(s),mana=viewFor(copy,id).me.mana,r=applyAction(copy,id,proposed,copy.now);
    const target=proposed.type==='skill'?copy.players.find(p=>p.id===proposed.target):undefined;
    hypothetical={accepted:r.ok,error:r.ok?null:r.error??'unknown',receiptKinds:r.events.map(e=>e.kind),manaDelta:viewFor(copy,id).me.mana-mana,
     wrongName:on!.type==='skill'&&target?.character!==on!.name,targetActualRole:target?.character??null,attackFailure:r.events.some(e=>['attack.fail.self','attack.fail','attack.fail.death'].includes(e.kind))};
   }
   decisions.push({...own,off:structuredClone(off),on:structuredClone(on),changed,knowledgeUnchanged,hypothetical});
  }
  return remember(s,id,off);
 };
 const chat:Policy=(s,id,m,o)=>remember(s,id,botCommunicationAction(s,id,m,{...o,...options}));
 const actions:ReturnType<typeof playGuardRealization>['actions']=[];
 const game=playMatch(fixture,{current:policy,reference:policy},settings,(s,id,a,r)=>{
  if(!observe)return;const before=pending.get(id);if(!before)throw Error('missing own view');pending.delete(id);
  const after=viewFor(s,id);
  actions.push({player:id,at:before.elapsedMs,action:structuredClone(a),accepted:r.ok,error:r.ok?null:r.error??'알 수 없는 거절',beforeMana:before.me.mana,afterMana:after.me.mana,
   nominalMana:a.type==='skill'?before.me.skills.find(x=>x.key===a.skill)?.mana??0:0,character:before.me.character,side:before.me.side,receiptKinds:r.events.map(e=>e.kind)});
 },{current:chat,reference:chat});
 return {game,actions,decisions};
}

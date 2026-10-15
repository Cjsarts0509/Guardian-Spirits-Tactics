/** Evaluation only: the feature builder accepts own view/events/memory, never hidden state. */
import {smartBotAction,botCommunicationAction,viewFor,eventsFor,type PlayerView,type GameEvent,type Action,type BotMemory} from '../src/index.js';
import {updateBotKnowledge} from '../src/bot-memory.js';
import {trustedIntel} from '../src/bot-intel.js';
import {NAME_ATTACKS,estimatedHits} from '../src/bot-tactics.js';
import {playMatch,DEFAULT_SETTINGS,type Fixture,type Policy,type Settings} from './league-runner.js';
import type {GuardVariant} from './guard-selfplay.js';
import type {playGuardRealization} from './guard-realization.js';

const SPECIAL=['rael_master_power','kilder_master_power','consume_slaughter','kane_wolfs_slash'];
export function commanderChoice(view:PlayerView,events:readonly GameEvent[],memory:BotMemory,action:Action|null){
 if(view.mode!=='primordial'||view.phase!=='running'||!view.me.alive)throw Error('running primordial actor required');
 const copy=structuredClone(memory),knowledge=updateBotKnowledge(view,events,copy),intel=trustedIntel(view,knowledge,copy),battle=copy.perception!.battle;
 const skills=view.me.skills.filter(s=>NAME_ATTACKS.includes(s.key)||SPECIAL.includes(s.key)).map(s=>({key:s.key,blocked:s.blocked,mana:s.mana,cooldownRemainingMs:s.cooldownRemainingMs,usesLeft:s.usesLeft,nameOptions:s.nameOptions,ignoresInvulnerable:s.ignoresInvulnerable}));
 const targets=view.roster.filter(r=>r.inGame&&r.commander&&r.side!==view.me.side).map(role=>{
  const matches=[...knowledge.known].filter(([,c])=>c===role.key);if(matches.length>1)throw Error('duplicate known commander');
  const id=matches[0]?.[0]??null,p=view.players.find(p=>p.id===id);
  const named=skills.filter(s=>NAME_ATTACKS.includes(s.key)),names=named.filter(s=>s.nameOptions?.includes(role.key));
  const available=names.filter(s=>s.blocked===null&&p?.alive&&(s.ignoresInvulnerable||!p.statuses.some(x=>x.kind==='invulnerable'))).map(s=>s.key);
  const status=!p?'unknown':!p.alive?'known_dead':p.statuses.some(s=>s.kind==='invulnerable')&&!names.some(s=>s.ignoresInvulnerable)?'known_invulnerable':!named.length?'no_named_skill':!names.length?'name_unavailable':!available.length?'named_blocked':'ready';
  const reports=[...copy.perception?.intel?.reports??[]].flatMap(([target,senders])=>[...senders].filter(([,r])=>r.character===role.key).map(([sender,r])=>({target,sender,at:r.at,seq:r.seq,senderKnown:knowledge.known.get(sender)??null,senderAlive:!!view.players.find(p=>p.id===sender)?.alive,targetAlive:!!view.players.find(p=>p.id===target)?.alive,compatible:!!knowledge.candidates.get(target)?.includes(r.character)})));
  return {role:role.key,id,status,provenance:!p?'unknown':p.revealed===role.key?'public_reveal':copy.perception!.known.get(id!)===role.key?'received_fact':'constraint_inference',
   alive:p?.alive??null,invulnerable:p?.statuses.some(x=>x.kind==='invulnerable')??null,available,
   candidateIds:[...knowledge.candidates].filter(([,cs])=>cs.includes(role.key)).map(([id])=>id),
   claimIds:view.players.filter(p=>p.alive&&p.published===role.key).map(p=>p.id),reports,
   trustedReportIds:[...intel].filter(([,c])=>c===role.key).map(([id])=>id),
   estimatedHits:estimatedHits(view,battle,role.key),observedGuardCharges:battle.guardCharges.get(role.key)??null};
 });
 const target=action?.type==='skill'?action.target:null;
 return {player:view.me.id,at:view.elapsedMs,character:view.me.character,side:view.me.side,mana:view.me.mana,
  skills,targets,action:structuredClone(action),selectedKnownRole:target?knowledge.known.get(target)??null:null,
  selectedKind:action?.type!=='skill'?'none':NAME_ATTACKS.includes(action.skill)?'named_attack':SPECIAL.includes(action.skill)?'special_attack':action.skill==='publish'?'publish':action.skill==='break_ally'?'break_ally':'other'};
}

export function playCommanderOpportunities(fixture:Fixture,variant:GuardVariant,settings:Settings=DEFAULT_SETTINGS,observe=true){
 if(fixture.mode!=='primordial'||!['cooperative','knownCommanderGuardBeforeAlly'].includes(variant))throw Error('invalid commander replay');
 const options=variant==='cooperative'?{}:{knownCommanderGuardBeforeAlly:true};
 type Choice=ReturnType<typeof commanderChoice>;
 const decisions:Array<Choice&{grading:{knownWrong:number;selectedActualRole:string|null;selectedActualSide:number|null}}>=[];
 const pending=new Map<string,PlayerView>();
 const remember=(s:Parameters<Policy>[0],id:string,a:Action|null)=>{if(observe&&a)pending.set(id,viewFor(s,id));return a;};
 const policy:Policy=(s,id,m,o)=>{
  const a=smartBotAction(s,id,m,{...o,...options});
  if(observe&&m.communicationAt===s.now-s.startedAt){
   const own=commanderChoice(viewFor(s,id),eventsFor(s,id,m.perception?.lastSeq??0),m,a);
   // Hidden identity is graded only after the actual choice and own-only feature construction.
   const actual=a?.type==='skill'?s.players.find(p=>p.id===a.target):null;
   decisions.push({...own,grading:{knownWrong:own.targets.filter(t=>t.id&&s.players.find(p=>p.id===t.id)?.character!==t.role).length,selectedActualRole:actual?.character??null,selectedActualSide:actual?.side??null}});
  }
  return remember(s,id,a);
 };
 const chat:Policy=(s,id,m,o)=>remember(s,id,botCommunicationAction(s,id,m,{...o,...options}));
 const actions:ReturnType<typeof playGuardRealization>['actions']=[];
 const game=playMatch(fixture,{current:policy,reference:policy},settings,(s,id,a,r)=>{
  if(!observe)return;const before=pending.get(id);if(!before)throw Error('missing own pre-action view');pending.delete(id);
  const after=viewFor(s,id);
  actions.push({player:id,at:before.elapsedMs,action:structuredClone(a),accepted:r.ok,error:r.ok?null:r.error??'알 수 없는 거절',beforeMana:before.me.mana,afterMana:after.me.mana,
   nominalMana:a.type==='skill'?before.me.skills.find(x=>x.key===a.skill)?.mana??0:0,character:before.me.character,side:before.me.side,receiptKinds:r.events.map(e=>e.kind)});
 },{current:chat,reference:chat});
 return {game,actions,decisions};
}

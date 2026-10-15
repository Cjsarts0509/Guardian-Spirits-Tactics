import {isDeepStrictEqual} from 'node:util';
import type {PlayerView,GameEvent,BotMemory} from '../src/index.js';
import {updateBotKnowledge} from '../src/bot-memory.js';
import {reportedSupremeAttack,trustedIntel} from '../src/bot-intel.js';
import {KNOWN_ATTACK_GUARDS} from '../src/bot-attack-budget.js';

/** Own-view boundary. Neither a hidden assignment nor another player's memory is accepted. */
export function supremeReportOpportunity(view:PlayerView,events:readonly GameEvent[],memory:BotMemory){
 const dead=new Set(view.players.filter(p=>!p.alive&&p.revealed).map(p=>p.revealed!)),guards=KNOWN_ATTACK_GUARDS[view.mode]??{};
 const copy=structuredClone(memory),knowledge=updateBotKnowledge(view,events,copy),trusted=trustedIntel(view,knowledge,copy);
 const skill=view.me.skills.find(s=>s.key==='supreme_attack');
 const targets=[...trusted].map(([id,name])=>{
  const p=view.players.find(p=>p.id===id)!,role=view.roster.find(r=>r.key===name)!;
  const guardsAlive=(guards[name]??[]).filter(g=>!dead.has(g));
  const failed=copy.perception!.lastAttackNameFailure.get(id)?.has(name)??false;
  const reason=!skill?'no_skill':skill.blocked!==null?'skill_blocked':view.elapsedMs<240000?'before_four_minutes':view.me.mana<Math.max(100,skill.mana)?'reserve_mana':role.side===view.me.side?'friendly_report':guardsAlive.length?'mandatory_guard_alive':!skill.nameOptions?.includes(name)?'name_unavailable':!skill.ignoresInvulnerable&&p.statuses.some(s=>s.kind==='invulnerable')?'public_invulnerable':failed?'own_same_name_failure':'eligible';
  const senders=[...copy.perception!.intel!.reports.get(id)!].filter(([sender,r])=>r.character===name&&view.players.some(p=>p.id===sender&&p.alive)&&view.roster.some(r=>r.key===knowledge.known.get(sender)&&r.side===view.me.side)).map(([sender,r])=>({id:sender,knownRole:knowledge.known.get(sender)!,at:r.at,seq:r.seq,event:events.find(e=>e.seq===r.seq)}));
  if(senders.some(s=>!s.event))throw Error('missing own received report');
  return {id,name,seat:p.seat,label:role.name,guardsAlive,commander:role.commander,side:role.side,alive:p.alive,known:knowledge.known.has(id),nameAllowed:!!skill?.nameOptions?.includes(name),invulnerable:p.statuses.some(s=>s.kind==='invulnerable'),ownSameNameFailure:failed,reason,senders};
 });
 const suggestion=reportedSupremeAttack(view,knowledge,copy,new Map(view.me.skills.filter(s=>!s.passive&&s.blocked===null).map(s=>[s.key,s])),name=>view.roster.find(r=>r.key===name)!.side!==view.me.side&&!(guards[name]??[]).some(g=>!dead.has(g)));
 const eligible=targets.filter(t=>t.reason==='eligible').sort((a,b)=>Number(b.commander)-Number(a.commander)||view.players.find(p=>p.id===a.id)!.seat-view.players.find(p=>p.id===b.id)!.seat);
 const expected=eligible[0]?{type:'skill',skill:'supreme_attack',target:eligible[0].id,name:eligible[0].name}:null;
 if(!isDeepStrictEqual(suggestion,expected))throw Error('independent own-view eligibility mismatch');
 return {mode:view.mode,observedDead:[...dead],player:view.me.id,at:view.elapsedMs,character:view.me.character,side:view.me.side,mana:view.me.mana,
  skill:skill?{mana:skill.mana,blocked:skill.blocked,cooldownRemainingMs:skill.cooldownRemainingMs,ignoresInvulnerable:skill.ignoresInvulnerable}:null,targets,suggestion};
}

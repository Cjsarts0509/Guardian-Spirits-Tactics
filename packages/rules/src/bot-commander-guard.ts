import type {Action} from './types.js';
import type {PlayerView,SkillView} from './engine/view.js';
import type {Knowledge} from './bot-memory.js';

/** Called only when the policy would otherwise create a new alliance.
 * Published claims and reports are not confirmed identity evidence. */
export function knownCommanderGuard(view:PlayerView,knowledge:Knowledge,usable:ReadonlyMap<string,SkillView>):Action|null {
  if(view.mode!=='primordial')return null;
  const pair=view.me.character==='consume'?['consume_master_guard','eltas']:
    view.me.character==='kumarin'?['kumarin_commander_guard','rael']:null;
  if(!pair)return null;
  const [key,name]=pair as [string,string],skill=usable.get(key);
  if(!skill)return null;
  const role=view.roster.find(r=>r.key===name);
  if(!role?.commander||role.side!==view.me.side)return null;
  const target=view.players.find(p=>p.id!==view.me.id&&p.alive&&knowledge.known.get(p.id)===name&&
    (skill.ignoresInvulnerable||!p.statuses.some(s=>s.kind==='invulnerable')));
  return target?{type:'skill',skill:key,target:target.id}:null;
}

import {smartBotAction,botCommunicationAction,type ModeId} from '../src/index.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {playMatch,DEFAULT_SETTINGS,type Fixture,type Policy,type Settings} from './league-runner.js';

export type SelfplayVariant='main'|'cooperative'|'ownOutcome';
/** Identical policy, information boundary, activity and role RNG on both teams. */
export function playSelfplay(fixture:Fixture,variant:SelfplayVariant,settings:Settings=DEFAULT_SETTINGS){
 const options=variant==='ownOutcome'?{learnOwnAttackOutcome:true}:{};
 const policy:Policy=variant==='main'?(s,id,m,o)=>previous(s,id,m,{activity:o.activity}):(s,id,m,o)=>smartBotAction(s,id,m,{...o,...options});
 const chat:Policy=(s,id,m,o)=>botCommunicationAction(s,id,m,{...o,...options});
 const roles:Array<{id:string;character:string;side:1|2}>=[];
 const skills:Record<string,Record<string,{attempts:number;accepted:number;failedAttacks:number}>>={};
 const game=playMatch(fixture,{current:policy,reference:policy},settings,(s,id,a,r)=>{
  if(a.type!=='skill')return;const role=s.players.find(p=>p.id===id)!.character;
  const cell=(skills[role]??={})[a.skill]??={attempts:0,accepted:0,failedAttacks:0};
  cell.attempts++;cell.accepted+=Number(r.ok);cell.failedAttacks+=Number(r.events.some(e=>e.kind==='attack.fail.self'||e.kind==='attack.fail.death'));
 },variant==='main'?{}:{current:chat,reference:chat},s=>{
  if(!roles.length)for(const p of s.players)roles.push({id:p.id,character:p.character,side:p.side});
 });
 return {variant,game,roles,skills};
}
export const SELFPLAY_MODES:ModeId[]=['civil_war','primordial','lidellut','troll'];

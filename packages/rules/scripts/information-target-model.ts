import type {PlayerView} from '../src/engine/view.js';
import type {Action} from '../src/types.js';
import {assignmentBelief,checkInformation} from '../src/bot-belief.js';
import {createBotMemory,type Knowledge} from '../src/bot-memory.js';
const CHECKS=['advanced_ally_check','ally_check','advanced_enemy_check','enemy_check'];
const SCANS=['advanced_scan','scan','ally_scan','enemy_scan','troll_scan','troll_ally_scan','troll_enemy_scan'];
export const CELLS=['gem','check','scan'].flatMap(k=>['early','late'].map(t=>`${k}-${t}`));
export interface Row {cell:string;arm:'act'|'information';reward:number}
export type Model=Record<string,{arms:Record<Row['arm'],{n:number;sum:number;value:number}>;choice:Row['arm']}>;
export function context(view:PlayerView,knowledge:Knowledge,action:Action|null){
 if(action?.type!=='skill'||!action.target)return null;
 const group=action.skill==='truth_gem'?'gem':CHECKS.includes(action.skill)?'check':SCANS.includes(action.skill)?'scan':null;
 if(!group)return null;
 const skill=view.me.skills.find(s=>s.key===action.skill);if(!skill||skill.blocked!==null||skill.passive)return null;
 const belief=assignmentBelief(view,knowledge,createBotMemory(0));if(!belief.consistent)return null;
 const enemies=new Set(view.roster.filter(r=>r.side!==view.me.side).map(r=>r.key));
 const enemy=(id:string)=>[...belief.probabilities.get(id)??[]].reduce((n,[r,p])=>n+(enemies.has(r)?p:0),0);
 const originalInfo=checkInformation(view,belief,action.target,action.skill,action.name),originalEnemy=enemy(action.target);
 if(originalInfo<=0)return null;
 let alternative:Action|null=null,alternativeInfo=0,alternativeEnemy=originalEnemy;
 for(const p of view.players){
  if(!p.alive||p.id===view.me.id||p.id===action.target||knowledge.known.has(p.id)||(!skill.ignoresInvulnerable&&p.statuses.some(s=>s.kind==='invulnerable')))continue;
  const info=checkInformation(view,belief,p.id,action.skill,action.name),mass=enemy(p.id);
  if(info<=0||info<originalInfo*.5||mass<=alternativeEnemy+1e-9)continue;
  alternative={...action,target:p.id};alternativeInfo=info;alternativeEnemy=mass;
 }
 if(!alternative)return null;
 return {cell:`${group}-${view.elapsedMs<360000?'early':'late'}`,alternative,originalInfo,originalEnemy,alternativeInfo,alternativeEnemy};
}
export function fit(rows:readonly Row[]):Model {
 const model:Model=Object.fromEntries(CELLS.map(c=>[c,{arms:{act:{n:0,sum:0,value:.5},information:{n:0,sum:0,value:.5}},choice:'act'}]));
 for(const r of rows){if(!CELLS.includes(r.cell)||!['act','information'].includes(r.arm)||!Number.isFinite(r.reward)||r.reward<0||r.reward>1)throw Error('잘못된 학습행');const a=model[r.cell]!.arms[r.arm];a.n++;a.sum+=r.reward;}
 for(const c of Object.values(model)){for(const a of Object.values(c.arms))a.value=(a.sum+2)/(a.n+4);if(c.arms.act.n>=32&&c.arms.information.n>=32&&c.arms.information.value>c.arms.act.value+.03)c.choice='information';}
 return model;
}
export function select(action:Action,ctx:NonNullable<ReturnType<typeof context>>,arm:Row['arm']):Action{return arm==='information'?ctx.alternative:action;}

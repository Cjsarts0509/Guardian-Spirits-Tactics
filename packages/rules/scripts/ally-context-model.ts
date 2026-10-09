import type {PlayerView} from '../src/engine/view.js';
import type {Action} from '../src/types.js';
import {assignmentBelief,checkInformation} from '../src/bot-belief.js';
import {createBotMemory,type Knowledge} from '../src/bot-memory.js';
export const ARMS=['act','wait','information'] as const;
export type Arm=typeof ARMS[number];
export const CELLS=['none','some'].flatMap(a=>['known','uncertain'].flatMap(k=>['info','noinfo'].map(i=>`${a}-${k}-${i}`)));
export interface Context {cell:string;alternative:Action|null;allies:number;knownFriend:boolean}
export interface Row {cell:string;arm:Arm;reward:number}
export type Model=Record<string,{arms:Record<Arm,{n:number;sum:number;value:number}>;choice:Arm}>;
const checks=['advanced_ally_check','ally_check','advanced_enemy_check','enemy_check'];
const scans=['advanced_scan','scan','ally_scan','enemy_scan','troll_scan','troll_ally_scan','troll_enemy_scan'];
/** 자기 뷰/정당한 관찰 지식만 입력. 숨은 보호의 허용 여부를 엔진으로 조회하지 않는다. */
export function context(view:PlayerView,knowledge:Knowledge,action:Action|null):Context|null {
 if(action?.type!=='skill'||action.skill!=='ally'||!action.target)return null;
 const allies=view.me.allies.filter(id=>view.players.some(p=>p.id===id&&p.alive)).length;
 const role=knowledge.known.get(action.target);
 const knownFriend=role!==undefined&&view.roster.some(r=>r.key===role&&r.side===view.me.side);
 const belief=assignmentBelief(view,knowledge,createBotMemory(0));
 let alternative:Action|null=null,best=0;
 if(belief.consistent)for(const skill of view.me.skills){
  if(skill.blocked!==null||skill.passive||!checks.includes(skill.key)&&!scans.includes(skill.key))continue;
  for(const p of view.players){
   if(!p.alive||p.id===view.me.id||knowledge.known.has(p.id)||(!skill.ignoresInvulnerable&&p.statuses.some(s=>s.kind==='invulnerable')))continue;
   const names=checks.includes(skill.key)?[undefined]:(knowledge.candidates.get(p.id)??[]).filter(n=>skill.nameOptions?.includes(n));
   for(const name of names){
    const value=checkInformation(view,belief,p.id,skill.key,name);
    if(value>best){best=value;alternative={type:'skill',skill:skill.key,target:p.id,...(name===undefined?{}:{name})};}
   }
  }
 }
 return {cell:`${allies?'some':'none'}-${knownFriend?'known':'uncertain'}-${alternative?'info':'noinfo'}`,alternative,allies,knownFriend};
}
export function fit(rows:readonly Row[]):Model {
 const model:Model=Object.fromEntries(CELLS.map(c=>[c,{arms:Object.fromEntries(ARMS.map(a=>[a,{n:0,sum:0,value:0.5}])) as Model[string]['arms'],choice:'act'}]));
 for(const row of rows){
  if(!CELLS.includes(row.cell)||!ARMS.includes(row.arm)||!Number.isFinite(row.reward)||row.reward<0||row.reward>1||row.arm==='information'&&row.cell.endsWith('noinfo'))throw Error('잘못된 학습행');
  const a=model[row.cell]!.arms[row.arm];a.n++;a.sum+=row.reward;
 }
 for(const c of Object.values(model)){
  for(const a of Object.values(c.arms))a.value=(a.sum+2)/(a.n+4);
  for(const arm of ['wait','information'] as const)if(c.arms.act.n>=32&&c.arms[arm].n>=32&&c.arms[arm].value>c.arms.act.value+0.03&&c.arms[arm].value>c.arms[c.choice].value)c.choice=arm;
 }
 return model;
}
export function select(action:Action,ctx:Context,arm:Arm):Action|null {
 return arm==='wait'?null:arm==='information'?ctx.alternative??action:action;
}

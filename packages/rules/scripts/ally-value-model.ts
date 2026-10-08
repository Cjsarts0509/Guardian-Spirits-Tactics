// 오프라인 실험 전용. 학습 입력은 자기 뷰에서 추출한 두 값과 무작위 처치뿐이다.
import type {PlayerView} from '../src/engine/view.js';
import type {Action} from '../src/types.js';
export const CELLS=['early-low','early-high','late-low','late-high'] as const;
export type Cell=typeof CELLS[number];
export interface Observation {cell:Cell;wait:boolean;reward:number}
export interface Arm {n:number;rewardSum:number;value:number}
export interface AllyValueModel {version:1;minPerArm:number;margin:number;cells:Record<Cell,{act:Arm;wait:Arm;chooseWait:boolean}>}
export function allyCell(view:Pick<PlayerView,'elapsedMs'|'me'>,action:Action|null):Cell|null {
 if(action?.type!=='skill'||action.skill!=='ally'||!action.target)return null;
 return `${view.elapsedMs<360_000?'early':'late'}-${view.me.mana<60?'low':'high'}`;
}
/** Beta(2,2) 사전 평균. 최종 승패만으로 학습하며 미종료는 0.5점이다. */
export function fitAllyValue(rows:readonly Observation[],minPerArm=32,margin=0.03):AllyValueModel {
 if(!Number.isSafeInteger(minPerArm)||minPerArm<1||!Number.isFinite(margin)||margin<0||margin>1)throw Error('학습 설정 오류');
 const cells=Object.fromEntries(CELLS.map(k=>[k,{act:{n:0,rewardSum:0,value:0.5},wait:{n:0,rewardSum:0,value:0.5},chooseWait:false}])) as AllyValueModel['cells'];
 for(const r of rows){
  if(!CELLS.includes(r.cell)||typeof r.wait!=='boolean'||!Number.isFinite(r.reward)||r.reward<0||r.reward>1)throw Error('학습 관찰 오류');
  const arm=cells[r.cell][r.wait?'wait':'act'];arm.n++;arm.rewardSum+=r.reward;
 }
 for(const c of Object.values(cells)){
  for(const arm of [c.act,c.wait])arm.value=(arm.rewardSum+2)/(arm.n+4);
  c.chooseWait=c.act.n>=minPerArm&&c.wait.n>=minPerArm&&c.wait.value-c.act.value>margin;
 }
 return {version:1,minPerArm,margin,cells};
}
export const chooseAllyWait=(model:AllyValueModel,cell:Cell):boolean=>model.cells[cell].chooseWait;

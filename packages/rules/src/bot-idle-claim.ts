import type {PlayerView} from './engine/view.js';
import type {BotMemory} from './bot-memory.js';
import type {Action} from './types.js';
import {PUBLISH_MANA} from './constants.js';

/** 자기 공개 상태/사용 가능 스킬만 본다. 다음40초의 안전이나 미래 마나는 보장하지 않는다. */
export function idleClaimViewEligible(view:PlayerView):boolean{
  const me=view.me,publish=me.skills.find(s=>s.key==='publish'&&!s.passive&&s.blocked===null);
  return view.phase==='running'&&me.alive&&me.trueName&&me.published===me.character&&
    !me.skills.some(s=>s.key==='disguise')&&!!publish?.nameOptions?.includes(me.character)&&
    Number.isFinite(me.mana)&&Number.isFinite(me.maxMana)&&me.mana>=0&&me.mana+PUBLISH_MANA<=me.maxMana;
}

/** 원래 null인 실제 활동 기회에서만 이미 수동 공표한 진명을 재공표한다. 기억/RNG는 수정하지 않는다. */
export function idleManualTrueClaim(view:PlayerView,memory:BotMemory,original:Action|null):Action|null{
  const p=memory.perception;
  if(original!==null||memory.communicationAt!==view.elapsedMs||!idleClaimViewEligible(view)||
    !p||p.playerId!==view.me.id||p.mode!==view.mode||p.character!==view.me.character||p.lastElapsedMs>view.elapsedMs||
    p.automaticClaims.has(view.me.id)||p.manualClaims.get(view.me.id)?.name!==view.me.character)return null;
  return {type:'skill',skill:'publish',name:view.me.character};
}

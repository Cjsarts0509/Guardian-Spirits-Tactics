import type { PlayerView } from './engine/view.js';
import type { BotMemory, Knowledge } from './bot-memory.js';
import { wantsTrueName } from './bot-claims.js';

/** 플레이어마다 최신 수동 공표 하나. 확정된 적 정체로만 성향을 분류한다. */
export function observedClaimStyle(view: PlayerView, knowledge: Knowledge, memory: BotMemory) {
  let truthful = 0, bluffing = 0;
  for (const p of view.players) {
    if (p.id === view.me.id) continue;
    const role = knowledge.known.get(p.id);
    if (!role || !view.roster.some((r) => r.key === role && r.side !== view.me.side)) continue;
    const claim = memory.perception?.manualClaims.get(p.id);
    if (!claim || memory.perception?.automaticClaims.has(p.id) || claim.name !== p.published) continue;
    if (claim.name === role) truthful++; else bluffing++;
  }
  return { truthful, bluffing, bluffHeavy: bluffing >= 2 && bluffing * 3 >= (truthful + bluffing) * 2 };
}

/** 약한 성향 증거만으로 필수 진명·패시브·공개 정체의 자원 이익을 포기하지 않는다. */
export function adaptiveClaimName(view: PlayerView, knowledge: Knowledge, memory: BotMemory): string {
  const me = view.me;
  if (!me.commander || wantsTrueName(view) || (memory.perception?.trueNameUntil ?? 0) > view.elapsedMs ||
    view.players.find((p) => p.id === me.id)?.revealed || !observedClaimStyle(view, knowledge, memory).bluffHeavy) return me.character;
  const names = me.skills.find((s) => s.key === 'publish')?.nameOptions ?? [];
  const decoys = names.filter((n) => view.roster.some((r) => r.key === n && r.side === me.side && !r.commander));
  return decoys.includes(me.published ?? '') ? me.published! : decoys[0] ?? me.character;
}

/** 정체 숨김과 자원 이익을 구분. 진명 스킬·공개된 정체는 유지하고 지휘관/변장은 위장한다. */
export function strategicClaimName(view: PlayerView, knowledge: Knowledge, memory: BotMemory): string {
  const me=view.me, names=me.skills.find(s=>s.key==='publish')?.nameOptions??[];
  if(wantsTrueName(view)||(memory.perception?.trueNameUntil??0)>view.elapsedMs||view.players.find(p=>p.id===me.id)?.revealed)return me.character;
  const disguise=me.skills.some(s=>s.key==='disguise');
  // 일반 인물은 보석 성장·공격/지원 예산을 보호하며 확정 적이 생긴 여유 자원 상황에만 위장한다.
  const turnWindow=view.nextTurnInMs<=43_000;
  const attacks=me.skills.filter(s=>['attack','advanced_attack','supreme_attack'].includes(s.key)&&s.usesLeft!==0);
  const neededMana=attacks.length?Math.max(...attacks.map(s=>s.mana)):30;
  const threatened=view.players.some(p=>p.alive&&p.id!==me.id&&view.roster.some(r=>r.key===knowledge.known.get(p.id)&&r.side!==me.side));
  if(!disguise && ((!me.commander&&(me.gem<2||me.mana<neededMana+40||!threatened))||
     (me.commander&&turnWindow&&me.mana<neededMana)))return me.character;
  const decoys=names.filter(n=>n!==me.character&&view.roster.some(r=>r.key===n&&r.inGame&&!r.commander&&
    (disguise?r.side!==me.side:r.side===me.side)));
  if(decoys.includes(me.published??''))return me.published!;
  // 동료의 알려진 정체와 겹치지 않는 이름 우선. 자기 관찰만으로 결정한다.
  const available=decoys.filter(n=>![...knowledge.known.values()].includes(n));
  const pool=available.length?available:decoys;
  let hash=0;for(const c of me.id)hash=(hash*31+c.charCodeAt(0))>>>0;
  return pool[hash%Math.max(1,pool.length)]??me.character;
}

import type { PlayerView } from './engine/view.js';
import type { BotMemory, Knowledge } from './bot-memory.js';
import { wantsTrueName } from './bot-claims.js';
import { NAME_ATTACKS } from './bot-tactics.js';

/** 자기 자원만 확인한다. 상대 마나나 비공개 쿨다운은 추정하지 않는다. */
export function preserveClaimResources(view: PlayerView): boolean {
  const me = view.me;
  if (me.gem < 3) return true;
  // 다음 턴까지 돌아오는 이름 공격을 공표 비용 때문에 지연시키지 않는다.
  const publishCost = me.skills.find((s) => s.key === 'publish')?.mana ?? 0;
  return me.skills.some((s) => NAME_ATTACKS.includes(s.key) && !s.passive && s.usesLeft !== 0 &&
    s.cooldownRemainingMs <= view.nextTurnInMs && me.mana - publishCost < s.mana);
}

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
export function adaptiveClaimName(view: PlayerView, knowledge: Knowledge, memory: BotMemory, protectResources = false): string {
  const me = view.me;
  if (!me.commander || wantsTrueName(view) || (memory.perception?.trueNameUntil ?? 0) > view.elapsedMs ||
    view.players.find((p) => p.id === me.id)?.revealed || !observedClaimStyle(view, knowledge, memory).bluffHeavy ||
    (protectResources && preserveClaimResources(view))) return me.character;
  const names = me.skills.find((s) => s.key === 'publish')?.nameOptions ?? [];
  const decoys = names.filter((n) => view.roster.some((r) => r.key === n && r.side === me.side && !r.commander));
  return decoys.includes(me.published ?? '') ? me.published! : decoys[0] ?? me.character;
}

import type { PlayerView } from './engine/view.js';
import type { BotMemory, Knowledge } from './bot-memory.js';
import { wantsTrueName } from './bot-claims.js';
import { NAME_ATTACKS } from './bot-tactics.js';

/** 자기 자원만 확인한다. 상대 마나나 비공개 쿨다운은 추정하지 않는다. */
export function preserveClaimResources(view: PlayerView): boolean {
  const me = view.me;
  if (me.gem < 3) return true;
  // 공격 마나를 확보하기 전에는 진명 턴 보너스를 포기하지 않는다. 공표 자체의 비용은 0이다.
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
export function adaptiveClaimName(view: PlayerView, knowledge: Knowledge, memory: BotMemory, protectResources: boolean | 'entry-only' = false): string {
  const me = view.me;
  if (!me.commander || wantsTrueName(view) || (memory.perception?.trueNameUntil ?? 0) > view.elapsedMs ||
    view.players.find((p) => p.id === me.id)?.revealed || !observedClaimStyle(view, knowledge, memory).bluffHeavy) return me.character;
  const names = me.skills.find((s) => s.key === 'publish')?.nameOptions ?? [];
  const decoys = names.filter((n) => view.roster.some((r) => r.key === n && r.side === me.side && !r.commander));
  const maintaining = protectResources === 'entry-only' && me.gem === 3 && decoys.includes(me.published ?? '') &&
    memory.perception?.manualClaims.get(me.id)?.name === me.published;
  if (protectResources && !maintaining && preserveClaimResources(view)) return me.character;
  return decoys.includes(me.published ?? '') ? me.published! : decoys[0] ?? me.character;
}

/** 다음 턴 전에 진명 복귀를 시도할 시간을 남긴다. 호출 지연으로 복귀 성공을 보장하지는 않는다. */
export function turnAwareClaimName(view: PlayerView, knowledge: Knowledge, memory: BotMemory): string {
  const desired = adaptiveClaimName(view, knowledge, memory, 'entry-only');
  if (desired === view.me.character) return desired;
  const publish = view.me.skills.find((s) => s.key === 'publish');
  if (!publish) return view.me.character;
  const cooldownMs = publish.cooldown * 1000;
  const maintaining = view.me.published === desired && memory.perception?.manualClaims.get(view.me.id)?.name === desired;
  // 진입은 가명 유지와 진명 복귀 두 공표 구간을 확보했을 때만 한다.
  if (view.nextTurnInMs <= cooldownMs * (maintaining ? 1 : 2)) return view.me.character;
  return desired;
}

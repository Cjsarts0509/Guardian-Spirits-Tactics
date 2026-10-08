import type { Action, ActionResult } from './types.js';
import type { BotMemory } from './bot-memory.js';

export const PROTECTION_RETRY_MS = 10_000;
const protectionError = '대상이 보호받고 있어 지정할 수 없습니다.';
const keyOf = (action: Action): string | undefined => action.type === 'skill' && action.target
  ? JSON.stringify([action.skill, action.target, action.name ?? null]) : undefined;

/** 결과 관측 경계: 엔진 상태/이벤트 없이 본인 행동과 본인 응답만 받는다. */
export function observeBotActionResult(memory: BotMemory, action: Action,
  result: Pick<ActionResult, 'ok' | 'error'>, elapsedMs: number): void {
  if (!memory.protectionRetries) return;
  const key = keyOf(action);
  if (!key || !Number.isFinite(elapsedMs)) return;
  memory.protectionRetries = memory.protectionRetries.filter(r => r.key !== key && elapsedMs >= r.at && elapsedMs - r.at < PROTECTION_RETRY_MS);
  if (!result.ok && result.error === protectionError) memory.protectionRetries.push({ key, at: elapsedMs });
}

/** 같은 행동만 미룬다. 다른 대상/스킬/이름, 특히 보호 무시 스킬은 묶지 않는다.
 * 만료 시 성공을 가정하지 않으며 다시 응답을 관측한다. 대체 행동 탐색은 하지 않는다.
 */
export function filterProtectionRetry(memory: BotMemory, action: Action | null, elapsedMs: number): Action | null {
  memory.protectionRetries = (memory.protectionRetries ?? []).filter(r => elapsedMs >= r.at && elapsedMs - r.at < PROTECTION_RETRY_MS);
  const key = action && keyOf(action);
  return key && memory.protectionRetries.some(r => r.key === key) ? null : action;
}

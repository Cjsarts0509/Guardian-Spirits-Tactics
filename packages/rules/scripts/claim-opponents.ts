// 평가용 상대. 공표 수정에 자기 뷰만 사용하고 나머지 행동은 현재 봇을 유지한다.
import { smartBotAction, viewFor, type PlayerView } from '../src/index.js';
import { wantsTrueName } from '../src/bot-claims.js';
import type { BotMemory } from '../src/bot-memory.js';
import type { Policy } from './league-runner.js';

export type ClaimStyle = 'truthful' | 'bluff' | 'skill-aware-bluff';
export function opponentClaim(view: PlayerView, memory: BotMemory, style: ClaimStyle, original?: string): string | undefined {
  const names = view.me.skills.find((s) => s.key === 'publish' && !s.passive && s.blocked === null)?.nameOptions ?? [];
  if (!names.length) return original;
  const needsTruth = style === 'truthful' || (style === 'skill-aware-bluff' &&
    (wantsTrueName(view) || (memory.perception?.trueNameUntil ?? 0) > view.elapsedMs));
  if (needsTruth && names.includes(view.me.character)) return view.me.character;
  // 적 진영 이름을 우선하되 실제 상대 정체는 읽지 않는다.
  return names.find((n) => n !== view.me.character && view.roster.some((r) => r.key === n && r.side !== view.me.side)) ??
    names.find((n) => n !== view.me.character) ?? original;
}
export function claimOpponent(style: ClaimStyle): Policy {
  return (state, id, memory, options) => {
    const action = smartBotAction(state, id, memory, options);
    if (action?.type !== 'skill' || action.skill !== 'publish') return action;
    return { ...action, name: opponentClaim(viewFor(state, id), memory, style, action.name) };
  };
}

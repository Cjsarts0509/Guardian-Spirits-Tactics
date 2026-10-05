// 테스트·개발용 무작위 봇. 쓸 수 있는 스킬 중 하나를 골라 무작위 대상/이름으로 사용한다.
import { randomInt, nextRandom } from './rng.js';
import type { Action, GameState, PlayerId } from './types.js';
import { viewFor } from './engine/view.js';

export interface BotOptions {
  /** 행동 확률 (0~1). 호출될 때마다 이 확률로만 행동 */
  activity?: number;
}

export function randomBotAction(state: GameState, playerId: PlayerId, rng: { rng: number }, opts: BotOptions = {}): Action | null {
  if (state.phase !== 'running') return null;
  const me = state.players.find((p) => p.id === playerId);
  if (!me || !me.alive) return null;
  if (nextRandom(rng) > (opts.activity ?? 0.5)) return null;

  const view = viewFor(state, playerId);
  const usable = view.me.skills.filter((s) => !s.passive && s.blocked === null);
  if (usable.length === 0) return null;

  // 공표는 진명/가짜를 섞는다
  const skill = usable[randomInt(rng, usable.length)];
  if (!skill) return null;
  const others = view.players.filter((p) => p.id !== playerId && p.alive);
  const target = skill.target === 'none' ? undefined : others[randomInt(rng, others.length)]?.id;
  if (skill.target !== 'none' && !target) return null;

  let name: string | undefined;
  if (skill.nameOptions && skill.nameOptions.length > 0) {
    if (skill.key === 'publish' && nextRandom(rng) < 0.5) name = view.me.character;
    else name = skill.nameOptions[randomInt(rng, skill.nameOptions.length)];
  }
  const action: Action = { type: 'skill', skill: skill.key };
  if (target) action.target = target;
  if (name) action.name = name;
  return action;
}

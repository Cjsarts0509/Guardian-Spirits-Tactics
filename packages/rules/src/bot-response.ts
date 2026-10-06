import type { Action, GameState } from './types.js';
import { createBotMemory, updateBotKnowledge } from './bot-memory.js';
import { eventsFor, viewFor } from './engine/view.js';
import { applyAction } from './engine/actions.js';
import { NAME_ATTACKS } from './bot-tactics.js';

/** 가설 엔진 안에서만 실행한다. 상대도 자기 뷰/수신 이벤트로 확인한 대상만 공격한다.
 * 실제 상대 기억이나 가설 배정 전체를 상대의 정체 지식으로 전달하지 않는다.
 * 한 대응 시점에 살아 있는 적들이 순서대로 최대 한 번씩 공격하는 스트레스 조건이다.
 */
export function respondToKnownEnemies(state: GameState, self: string): number {
  const side = state.players.find((p) => p.id === self)!.side;
  let accepted = 0;
  for (const player of state.players) {
    if (state.phase !== 'running') break;
    if (!player.alive || player.side === side) continue;
    const view = viewFor(state, player.id);
    const knowledge = updateBotKnowledge(view, eventsFor(state, player.id), createBotMemory(0));
    const roles = new Map(view.roster.map((r) => [r.key, r]));
    const targets = view.players.filter((p) => p.alive && knowledge.known.has(p.id) &&
      roles.get(knowledge.known.get(p.id)!)?.side !== view.me.side &&
      !p.statuses.some((s) => s.kind === 'invulnerable'));
    targets.sort((a, b) => Number(roles.get(knowledge.known.get(b.id)!)!.commander) -
      Number(roles.get(knowledge.known.get(a.id)!)!.commander) || a.seat - b.seat);
    const target = targets[0];
    if (!target) continue;
    const skill = view.me.skills.find((s) => NAME_ATTACKS.includes(s.key) && !s.passive &&
      s.blocked === null && s.nameOptions?.includes(knowledge.known.get(target.id)!));
    if (!skill) continue;
    const action: Action = { type: 'skill', skill: skill.key, target: target.id, name: knowledge.known.get(target.id)! };
    accepted += Number(applyAction(state, player.id, action, state.now).ok);
  }
  return accepted;
}

import { CHAT_MAX_LENGTH } from '../constants.js';
import { getMode } from '../modes/index.js';
import type { SkillDef } from '../modes/types.js';
import type { Action, ActionResult, CharKey, GameState, PlayerId, PlayerState, SkillKey } from '../types.js';
import { Game } from './game.js';
import { advanceTo } from './time.js';

/** 시간 진행만 (서버 틱). 처리된 이벤트를 돌려준다 */
export function advance(state: GameState, now: number) {
  const g = new Game(state, getMode(state.mode));
  advanceTo(g, now);
  return g.events;
}

/**
 * 플레이어 행동 처리. 먼저 now 까지 시간을 진행한 뒤 행동을 검증·처리한다.
 * 검증에 실패하면 비용 없이 거절한다 (DECISIONS A12).
 */
export function applyAction(state: GameState, playerId: PlayerId, action: Action, now: number): ActionResult {
  const g = new Game(state, getMode(state.mode));
  advanceTo(g, now);
  if (g.ended) return fail(g, '게임이 종료되었습니다.');
  const actor = g.player(playerId);
  if (!actor) return fail(g, '이 게임의 참가자가 아닙니다.');
  if (action.type === 'skill') return useSkill(g, actor, action.skill, action.target ?? null, action.name ?? null);
  if (action.type === 'chat') return chat(g, actor, action.channel, action.text, action.to ?? null);
  return fail(g, '알 수 없는 행동입니다.');
}

/** 플레이어 이탈 (재접속 유예 만료 등). 원본: 영웅이 살아 있으면 사망 처리 */
export function playerLeft(state: GameState, playerId: PlayerId, now: number) {
  const g = new Game(state, getMode(state.mode));
  advanceTo(g, now);
  const p = g.player(playerId);
  if (!p || p.left) return g.events;
  p.left = true;
  if (p.alive && !g.ended) {
    g.toAll('player.left', `${g.label(p)}님께서 나가셨습니다!`, { player: p.id });
    g.kill(p, 'left');
  }
  return g.events;
}

function fail(g: Game, error: string): ActionResult {
  return { ok: false, error, events: g.events };
}

/** 스킬을 지금 쓸 수 있는지 (대상 무관 조건). 쓸 수 있으면 null */
export function skillBlocker(g: Game, actor: PlayerState, key: SkillKey): string | null {
  if (g.ended) return '게임이 종료되었습니다.';
  if (!actor.alive) return '사망한 상태에서는 사용할 수 없습니다.';
  let def: SkillDef;
  try {
    def = g.skillDef(key);
  } catch {
    return '알 수 없는 스킬입니다.';
  }
  if (def.passive) return '패시브 스킬입니다.';
  if (def.item) {
    if (actor.gem < 2) return '사용할 수 있는 진실의 보석이 없습니다.';
    if (actor.gemCooldownUntil > g.now) return `재사용 대기 중입니다. (${Math.ceil((actor.gemCooldownUntil - g.now) / 1000)}초)`;
  } else {
    const inst = g.skill(actor, key);
    if (!inst) return '보유하지 않은 스킬입니다.';
    if (inst.usesLeft !== null && inst.usesLeft <= 0) return '더 이상 사용할 수 없습니다.';
    if (inst.cooldownUntil > g.now) return `재사용 대기 중입니다. (${Math.ceil((inst.cooldownUntil - g.now) / 1000)}초)`;
  }
  if (g.isIncapacitated(actor)) return '행동 불능 상태입니다.';
  const cost = def.manaFor ? def.manaFor(actor) : def.mana;
  if (actor.mana < cost) return `마나가 부족합니다. (${cost} 필요)`;
  // 시전자 쪽 사전 조건(진명 공표·조각 보유 등)은 미리 보여준다. 대상이 필요한 조건은 target=null 이면 통과시켜야 한다
  if (def.precheck) {
    const pre = def.precheck({ g, actor, target: null, name: null, skill: def });
    if (pre) return pre;
  }
  return null;
}

function useSkill(g: Game, actor: PlayerState, key: SkillKey, targetId: PlayerId | null, name: CharKey | null): ActionResult {
  const blocked = skillBlocker(g, actor, key);
  if (blocked) return fail(g, blocked);
  const def = g.skillDef(key);

  let target: PlayerState | null = null;
  if (def.target !== 'none') {
    if (!targetId) return fail(g, '대상을 선택해야 합니다.');
    const tp = g.player(targetId);
    if (!tp) return fail(g, '대상이 없습니다.');
    if (tp.id === actor.id) return fail(g, '자신에게 사용할 수 없습니다.');
    if (!tp.alive) return fail(g, '이미 사망한 대상입니다.');
    if (g.isInvulnerable(tp) && !def.ignoresInvulnerable) return fail(g, '대상이 보호받고 있어 지정할 수 없습니다.');
    target = tp;
  }

  let chosen: CharKey | null = null;
  if (def.nameOptions) {
    const options = def.nameOptions(g, actor);
    if (!name) return fail(g, '이름을 선택해야 합니다.');
    if (!options.includes(name)) return fail(g, '선택할 수 없는 이름입니다.');
    chosen = name;
  }

  const ctx = { g, actor, target, name: chosen, skill: def };
  const pre = def.precheck?.(ctx) ?? null;
  if (pre) return fail(g, pre);

  // 비용 지불
  const cost = def.manaFor ? def.manaFor(actor) : def.mana;
  actor.mana -= cost;
  let exhausted = false;
  if (def.item) {
    actor.gemCooldownUntil = g.now + def.cooldown * 1000;
  } else {
    const inst = g.skill(actor, key);
    if (inst) {
      inst.cooldownUntil = g.now + def.cooldown * 1000;
      if (inst.usesLeft !== null) {
        inst.usesLeft -= 1;
        exhausted = inst.usesLeft <= 0;
      }
    }
  }

  def.resolve?.(ctx);
  if (exhausted) g.removeSkill(actor, key);
  return { ok: true, events: g.events };
}

function chat(g: Game, actor: PlayerState, channel: string, raw: string, to: PlayerId | null): ActionResult {
  const text = String(raw ?? '').trim();
  if (!text) return fail(g, '내용이 없습니다.');
  if (text.length > CHAT_MAX_LENGTH) return fail(g, `메시지는 ${CHAT_MAX_LENGTH}자까지입니다.`);
  const label = g.label(actor);

  if (channel === 'dead') {
    if (actor.alive) return fail(g, '사망자 채널은 사망한 플레이어만 사용할 수 있습니다.');
    g.emit({ to: 'dead' }, 'chat.dead', `${label}: ${text}`, { from: actor.id, channel, text });
    return { ok: true, events: g.events };
  }
  if (!actor.alive) return fail(g, '사망자는 사망자 채널만 사용할 수 있습니다.');

  switch (channel) {
    case 'all':
      g.toAll('chat.all', `${label}: ${text}`, { from: actor.id, channel, text });
      return { ok: true, events: g.events };

    case 'ally': {
      const recipients = [actor, ...actor.allies.map((id) => g.player(id)).filter((p): p is PlayerState => !!p && p.alive)];
      g.toPlayers(recipients, 'chat.ally', `(동맹) ${label}: ${text}`, { from: actor.id, channel, text });
      return { ok: true, events: g.events };
    }

    case 'whisper': {
      const target = to ? g.player(to) : undefined;
      if (!target || target.id === actor.id) return fail(g, '귓속말 대상을 선택해야 합니다.');
      if (!target.alive) return fail(g, '사망한 플레이어에게는 귓속말을 보낼 수 없습니다.');
      g.toPlayers([actor, target], 'chat.whisper', `${label}의 귓속말 → ${g.label(target)}: ${text}`, {
        from: actor.id,
        to: target.id,
        channel,
        text,
      });
      return { ok: true, events: g.events };
    }

    case 'global': {
      if (!g.hasSkill(actor, 'global_chat')) return fail(g, '전체 방송 권한이 없습니다.');
      const cost = g.mode.globalChat.mana;
      if (actor.mana < cost) return fail(g, '마나가 모자랍니다.');
      actor.mana -= cost;
      if (g.mode.globalChat.anonymous) {
        g.toAll('chat.global', `|전체 채팅|: ${text}`, { channel, text });
      } else {
        const who = g.charName(actor.character);
        g.toAll('chat.global', `${who}: ${text}`, { character: actor.character, channel, text });
      }
      return { ok: true, events: g.events };
    }
  }
  return fail(g, '알 수 없는 채널입니다.');
}

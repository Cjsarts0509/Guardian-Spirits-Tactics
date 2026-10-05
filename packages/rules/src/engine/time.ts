import { TURN_BASE_MANA, TURN_MANA_PER_ALLY, TURN_TRUE_NAME_MANA } from '../constants.js';
import { randomInt } from '../rng.js';
import { josa } from '../text.js';
import type { ScheduledTask } from '../types.js';
import type { Game } from './game.js';

/** now 까지 예약된 일(턴, 해금, 효과 종료, 지연 공개)을 시간 순서대로 처리한다 */
export function advanceTo(g: Game, now: number): void {
  const s = g.state;
  while (!g.ended && s.queue.length > 0 && (s.queue[0] as ScheduledTask).at <= now) {
    const task = s.queue.shift() as ScheduledTask;
    s.now = Math.max(s.now, task.at);
    runTask(g, task);
  }
  s.now = Math.max(s.now, now);
}

function runTask(g: Game, task: ScheduledTask): void {
  switch (task.kind) {
    case 'turn':
      runTurn(g);
      if (!g.ended) {
        g.state.nextTurnAt = task.at + g.state.turnMs;
        g.schedule(g.state.nextTurnAt, 'turn', {});
      }
      return;

    case 'unlock': {
      const p = g.player(String(task.payload.player));
      const skill = String(task.payload.skill);
      if (p && p.alive && !g.hasSkill(p, skill)) {
        g.grantSkill(p, skill);
        g.toPlayer(p, 'skill.grant', `-비공개: ${g.skillDef(skill).name} 스킬을 획득하였습니다.`, { skill });
      }
      return;
    }

    case 'reveal': {
      const p = g.player(String(task.payload.player));
      if (p) {
        g.revealPublic(p);
        g.toAll('reveal', String(task.payload.text), { player: p.id, character: p.character });
      }
      return;
    }

    case 'effectEnd': {
      const p = g.player(String(task.payload.player));
      if (!p) return;
      const id = Number(task.payload.effect);
      const eff = p.effects.find((e) => e.id === id);
      p.effects = p.effects.filter((e) => e.id !== id && e.until > g.now);
      if (!eff || !p.alive) return;
      if (eff.kind === 'incapacitated' && !g.isIncapacitated(p)) {
        g.toPlayer(p, 'status.recovered', '-비공개: 행동 불능 상태가 풀렸습니다.');
      }
      if (eff.kind === 'invulnerable' && !g.isInvulnerable(p)) {
        g.toPlayer(p, 'status.unprotected', '-비공개: 무적 상태가 끝났습니다.');
      }
      return;
    }

    case 'flagEnd': {
      const p = g.player(String(task.payload.player));
      const flag = String(task.payload.flag);
      if (!p || p.flags[flag] !== task.payload.until) return;
      delete p.flags[flag];
      if (p.alive && task.payload.text) g.toPlayer(p, 'status.flagEnd', String(task.payload.text), { flag });
      return;
    }
  }
}

/** 턴 처리 (원본 qi) */
export function runTurn(g: Game): void {
  const s = g.state;
  g.mode.checkVictory(g);
  if (g.ended) return;
  s.turn += 1;

  // 황금공표: 한 번도 공표하지 않은 생존자 → 배정된 캐릭터 이름 중 무작위 (DECISIONS A14)
  const roster = g.rosterInGame();
  for (const p of g.alivePlayers()) {
    if (p.published !== null) continue;
    const pick = roster[randomInt(s, roster.length)];
    if (!pick) continue;
    p.published = pick.key;
    g.toAll('publish.auto', `${g.label(p)} : ${josa(pick.name, '으로/로')} 자동 공표되었습니다.`, {
      player: p.id,
      name: pick.key,
      prev: null,
      auto: true,
    });
  }

  for (const p of g.alivePlayers()) {
    const allies = g.alliedBy(p).length;
    const trueName = p.published === p.character;
    let gain = TURN_BASE_MANA + allies * TURN_MANA_PER_ALLY;
    const lines = [`새로운 턴이 시작되었습니다. 마나가 ${TURN_BASE_MANA} 회복되었습니다.`];
    if (allies > 0) lines.push(`동맹으로 인해 마나를 ${allies * TURN_MANA_PER_ALLY} 추가로 회복하였습니다.`);
    if (trueName) {
      gain += TURN_TRUE_NAME_MANA;
      lines.push(`진실된 이름으로 인해 마나가 추가로 ${TURN_TRUE_NAME_MANA} 회복됩니다.`);
      if (p.gem < 3) {
        p.gem = (p.gem + 1) as 1 | 2 | 3;
        lines.push(
          p.gem === 3 ? '진실된 이름이 결실을 맺어 보석이 완성되었습니다.' : `진실된 이름으로 인해 진실의 조각 ${p.gem}/3 을 획득했습니다.`,
        );
      }
    }
    g.addMana(p, gain);
    g.toPlayer(p, 'turn', lines.join('\n'), { turn: s.turn, gain, allies, trueName, gem: p.gem });
  }
}

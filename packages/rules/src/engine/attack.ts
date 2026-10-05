import { josa } from '../text.js';
import type { SkillCtx } from '../modes/types.js';
import type { CharKey, PlayerState } from '../types.js';
import type { Game } from './game.js';

export type AttackKind = 'normal' | 'advanced' | 'supreme' | 'chain';

/** 살해 시 공격자 마나 보너스 패시브 (적을 죽였을 때만, DECISIONS A9) */
const ON_KILL_MANA: Record<string, number> = {
  essence_absorb: 50, // 카스파 정기 흡수 S003 (내전)
  essence_drain: 50, // 카스파 정기 흡수 S003 (황야)
  kilder_vampiric: 50, // 킬데르 뱀파이어릭 S004 (태초)
};
/** 명중(목숨 감소 포함) 시 마나 보너스 (적 대상만, DECISIONS A9b) */
const ON_HIT_MANA: Record<string, number> = {
  eltas_bloody_heart: 30, // 엘타스 블러디 하트 S006 (태초)
};

function heroName(g: Game, p: PlayerState): string {
  return g.charName(p.character);
}

/**
 * 공격 판정 (원본 rn → cn → Pr/qr).
 * 웹판은 대상과 이름을 한 번에 받는다 (원본: 대상 지정 후 6초 다이얼로그).
 */
export function resolveAttack(c: SkillCtx, kind: AttackKind): void {
  const { g, actor } = c;
  const target = c.target as PlayerState;
  const name = c.name as CharKey;

  const correct = target.character === name;
  if (!correct) {
    failAttack(g, actor, target, kind, 'wrong', name);
  } else if (g.mode.isAbsolutelyGuarded(g, target)) {
    failAttack(g, actor, target, kind, 'bodyguard', name);
  } else {
    // 횟수제 보디가드 (태초): 막히면 공격자 페널티도 목숨 감소도 없다
    const guarded = g.mode.chargedGuard?.(g, actor, target) ?? null;
    if (guarded !== null) {
      if (guarded) g.toAll('attack.guarded', guarded, { attacker: actor.character, target: target.character });
    } else {
      hitAttack(g, actor, target, kind);
    }
  }
  if (!g.ended) g.mode.checkVictory(g);
}

function hitAttack(g: Game, actor: PlayerState, target: PlayerState, kind: AttackKind): void {
  const a = heroName(g, actor);
  const t = heroName(g, target);
  const chainTag = kind === 'chain' ? '(연쇄살인!)' : '';
  const enemy = actor.side !== target.side;

  if (target.extraLives > 0) {
    const remaining = target.extraLives;
    target.extraLives -= 1;
    if (kind === 'chain') {
      g.toAll('attack.hit', `-${josa(a, '이/가')} ${josa(t, '을/를')} 공격하였으나 살해하지 못했습니다.${chainTag}`, {
        attacker: actor.character,
        target: target.character,
        remaining,
      });
      g.removeSkill(actor, 'soen_chain_murder');
    } else {
      g.toAll('attack.hit', `-${josa(a, '이/가')} ${josa(t, '을/를')} 공격하였습니다.`, {
        attacker: actor.character,
        target: target.character,
        remaining,
      });
    }
    g.toAll('attack.lives', `-${josa(t, '은/는')} ${remaining}회 더 공격받으면 사망합니다.`, {
      target: target.character,
      remaining,
    });
    if (enemy) for (const [k, v] of Object.entries(ON_HIT_MANA)) if (g.hasSkill(actor, k)) g.addMana(actor, v);
    return;
  }

  g.toAll('attack.kill', `-${josa(a, '이/가')} ${josa(t, '을/를')} 공격하여 살해했습니다.${chainTag}`, {
    attacker: actor.character,
    target: target.character,
  });
  g.mode.onAttackKill?.(g, actor, target);
  g.kill(target, 'attack');
  if (enemy) {
    for (const [k, v] of Object.entries(ON_KILL_MANA)) if (g.hasSkill(actor, k)) g.addMana(actor, v);
    for (const [k, v] of Object.entries(ON_HIT_MANA)) if (g.hasSkill(actor, k)) g.addMana(actor, v);
  }
}

function failAttack(
  g: Game,
  actor: PlayerState,
  target: PlayerState,
  kind: AttackKind,
  reason: 'wrong' | 'bodyguard',
  name: CharKey,
): void {
  const a = heroName(g, actor);

  if (kind === 'chain') {
    g.toAll('attack.fail', `-${josa(a, '이/가')} 연쇄살인에 실패하였습니다!`, { attacker: actor.character });
    g.removeSkill(actor, 'soen_chain_murder');
    return;
  }

  g.toPlayer(target, 'attack.fail.target', `${josa(a, '이/가')} 당신을 공격하였으나 실패하였습니다.`, {
    attacker: actor.character,
  });
  // 공격자는 자기가 고른 이름이 틀렸다는 것을 안다 (보디가드에 막힌 경우는 구별할 수 없으므로 같은 문구, 추론 정보 없음)
  g.toPlayer(
    actor,
    'attack.fail.self',
    `-비공개: ${josa(g.label(target), '은/는')} ${josa(g.charName(name), '이/가')} 아니거나, 보디가드가 지키고 있습니다.`,
    { target: target.id, name },
    reason === 'wrong' ? [{ player: target.id, character: null, not: name }] : undefined,
  );

  const soulRecovery = Number(actor.flags.soulRecoveryUntil ?? 0) > g.now;
  if (soulRecovery) {
    g.toAll('attack.fail', `-${josa(a, '이/가')} 누군가를 공격하였으나 실패하였습니다.`, { attacker: actor.character });
    g.toAll('attack.fail.protected', '-영혼의 회복으로 인해 공격 실패 페널티를 받지 않습니다.', {
      attacker: actor.character,
    });
    return;
  }

  if (kind === 'advanced') {
    const inst = g.skill(actor, 'advanced_attack');
    if (inst && inst.level === 1) {
      inst.level = 2;
      g.toAll('attack.fail', `-${josa(a, '이/가')} 누군가를 공격하였으나 실패하였습니다.`, { attacker: actor.character });
      g.toAll('attack.fail.warn', '-공격에 한번 더 실패하면 사망합니다.', { attacker: actor.character });
      return;
    }
  }

  if (kind === 'supreme') {
    g.toAll('attack.fail', `-${josa(a, '이/가')} 누군가를 공격하였으나 실패하였습니다.`, { attacker: actor.character });
    return;
  }

  g.toAll('attack.fail.death', `-${josa(a, '이/가')} 누군가를 공격하였으나 실패하여 살해당하였습니다.`, {
    attacker: actor.character,
  });
  g.kill(actor, 'attack-fail');
}

import { josa } from '../text.js';
import type { SkillCtx } from '../modes/types.js';
import type { CharKey, PlayerState } from '../types.js';
import type { Game } from './game.js';

/** 확인·스캔 시전 시 전체 공지 (대상 플레이어 공개, 시전자 비공개) */
export function announceInspect(g: Game, target: PlayerState): void {
  g.toAll('inspect', `누군가가 ${josa(g.label(target), '을/를')} 살피고 있습니다.`, { target: target.id });
}

/** 변장 규칙에 의해 '거짓 성공'이 나와야 하는가 */
function disguiseFools(g: Game, actor: PlayerState, target: PlayerState, shownName: CharKey | null): boolean {
  if (!shownName) return false;
  return g.mode.disguises.some(
    (r) =>
      target.character === r.character &&
      actor.side === r.fooledSide &&
      target.side !== actor.side &&
      g.charDef(shownName).side === r.fooledSide,
  );
}

function hidden(g: Game, key: CharKey): boolean {
  return g.mode.hiddenFromChecks.includes(key);
}

function successFact(target: PlayerState, character: CharKey) {
  return [{ player: target.id, character }];
}

/** 아군 확인 / 상급 아군 확인 (원본 Ca) */
export function resolveAllyCheck(c: SkillCtx): void {
  const { g, actor } = c;
  const target = c.target as PlayerState;
  announceInspect(g, target);

  if (disguiseFools(g, actor, target, target.published)) {
    const shown = target.published as CharKey;
    g.toPlayer(
      actor,
      'inspect.result',
      `확인에 성공했습니다. ${josa(g.label(target), '은/는')} ${josa(g.charName(shown), '이다/다')}.`,
      { target: target.id, success: true, character: shown },
      successFact(target, shown),
    );
    return;
  }

  const trueName = target.published === target.character;
  if (!hidden(g, target.character) && trueName && target.side === actor.side) {
    g.toPlayer(
      actor,
      'inspect.result',
      `확인에 성공했습니다. ${josa(g.label(target), '은/는')} ${josa(g.charName(target.character), '이다/다')}.`,
      { target: target.id, success: true, character: target.character },
      successFact(target, target.character),
    );
    return;
  }
  g.toPlayer(actor, 'inspect.result', '확인에 실패하였습니다.', { target: target.id, success: false });
}

/** 적군 확인 / 상급 적군 확인 (원본 Fa) */
export function resolveEnemyCheck(c: SkillCtx): void {
  const { g, actor } = c;
  const target = c.target as PlayerState;
  announceInspect(g, target);

  const trueName = target.published === target.character;
  if (trueName && target.side !== actor.side && !hidden(g, target.character)) {
    g.toPlayer(
      actor,
      'inspect.result',
      `확인에 성공했습니다. ${josa(g.label(target), '은/는')} ${josa(g.charName(target.character), '이다/다')}.`,
      { target: target.id, success: true, character: target.character },
      successFact(target, target.character),
    );
    return;
  }
  g.toPlayer(actor, 'inspect.result', '확인에 실패하였습니다.', { target: target.id, success: false });
}

/**
 * 스캔 계열 (원본 Ua/Pa). 대상과 이름을 골라, 그 이름의 주인이 대상이면 성공.
 * 변장에 속는 경우 '성공' 한 줄만 보인다 (원본 두 줄 버그 수정, DECISIONS A1).
 */
export function resolveScan(c: SkillCtx): void {
  const { g, actor } = c;
  const target = c.target as PlayerState;
  const name = c.name as CharKey;
  announceInspect(g, target);

  const fail = (): void => {
    g.toPlayer(actor, 'inspect.result', '스캔에 실패하였습니다.', { target: target.id, success: false, name });
  };

  if (hidden(g, name)) return fail();
  const holder = g.byChar(name);
  if (holder && holder.id === target.id) {
    g.toPlayer(
      actor,
      'inspect.result',
      `스캔에 성공했습니다. ${josa(g.label(target), '은/는')} ${josa(g.charName(name), '이다/다')}.`,
      { target: target.id, success: true, character: name },
      successFact(target, name),
    );
    return;
  }
  if (target.published === name && disguiseFools(g, actor, target, name)) {
    g.toPlayer(
      actor,
      'inspect.result',
      `스캔에 성공했습니다. ${josa(g.label(target), '은/는')} ${josa(g.charName(name), '이다/다')}.`,
      { target: target.id, success: true, character: name },
      successFact(target, name),
    );
    return;
  }
  fail();
}

/** 지휘관이면 정체 대신 '지휘관'으로만 알려주는 결과 (진실의 보석, 저주) */
export function identityOrCommander(g: Game, target: PlayerState): { text: string; facts: { player: string; character: CharKey | null; commander?: boolean }[] } {
  if (g.isCommander(target.character)) {
    const names = g.mode.characters.filter((x) => x.commander).map((x) => x.name).join(', ');
    return {
      text: `${josa(g.label(target), '은/는')} 지휘관(${names})이다.`,
      facts: [{ player: target.id, character: null, commander: true }],
    };
  }
  return {
    text: `${josa(g.label(target), '은/는')} ${josa(g.charName(target.character), '이다/다')}!`,
    facts: [{ player: target.id, character: target.character }],
  };
}

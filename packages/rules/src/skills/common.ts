// 모든 모드에서 공통인 스킬 (docs/spec/core.json 기준, web_overrides 반영)
import { josa } from '../text.js';
import { PUBLISH_MANA } from '../constants.js';
import { resolveAttack } from '../engine/attack.js';
import {
  announceInspect,
  identityOrCommander,
  resolveAllyCheck,
  resolveEnemyCheck,
  resolveScan,
} from '../engine/checks.js';
import type { Game } from '../engine/game.js';
import type { SkillDef } from '../modes/types.js';
import type { CharKey, PlayerState } from '../types.js';

const opponentNames = (g: Game, actor: PlayerState): CharKey[] =>
  g.sideRoster(actor.side === 1 ? 2 : 1).map((c) => c.key);

const scanNames = (g: Game): CharKey[] =>
  g
    .rosterInGame()
    .filter((c) => !c.commander)
    .map((c) => c.key);

export const commonSkills: Record<string, SkillDef> = {
  publish: {
    key: 'publish',
    name: '공표',
    code: 'A000',
    hotkey: 'Q',
    mana: 0,
    cooldown: 40,
    uses: null,
    target: 'none',
    description: `이름 하나를 골라 공표한다. 공표 시 마나 +${PUBLISH_MANA}. 자기 진짜 이름(진명)으로 공표한 채 턴을 넘기면 마나 +10과 진실의 조각을 얻는다.`,
    nameOptions: (g) => g.rosterInGame().map((c) => c.key),
    resolve({ g, actor, name }) {
      const n = name as CharKey;
      const prev = actor.published;
      actor.published = n;
      g.addMana(actor, PUBLISH_MANA);
      const label = g.label(actor);
      const text = prev
        ? `${label} : ${g.charName(prev)} -> ${josa(g.charName(n), '으로/로')} 공표를 하였습니다.`
        : `${label} : ${josa(g.charName(n), '으로/로')} 공표를 하였습니다.`;
      g.toAll('publish', text, { player: actor.id, name: n, prev });
    },
  },

  ally: {
    key: 'ally',
    name: '동맹',
    code: 'A004',
    hotkey: 'E',
    mana: 10,
    cooldown: 10,
    uses: null,
    target: 'player',
    description:
      '대상에게 동맹을 선언한다(단방향). 나에게 동맹을 건 생존 플레이어 1명당 매 턴 마나 +10. 내가 동맹을 건 사람은 내 동맹 채팅을 본다.',
    precheck: ({ g, actor, target }) => (g.isAllied(actor, target as PlayerState) ? '그 대상과는 이미 동맹을 맺고 있습니다.' : null),
    resolve({ g, actor, target }) {
      const t = target as PlayerState;
      g.setAlly(actor, t, true);
      g.toPlayer(actor, 'ally.set', `${g.label(t)}에게 동맹 관계를 설정하였습니다.`, { from: actor.id, to: t.id });
      g.toPlayer(t, 'ally.incoming', `${josa(g.label(actor), '이/가')} 당신에게 동맹 관계를 설정하였습니다.`, {
        from: actor.id,
        to: t.id,
      });
    },
  },

  break_ally: {
    key: 'break_ally',
    name: '동맹 파기',
    code: 'A005',
    hotkey: 'R',
    mana: 10,
    cooldown: 10,
    uses: null,
    target: 'player',
    description: '내가 건 동맹을 해제한다.',
    precheck: ({ g, actor, target }) => (g.isAllied(actor, target as PlayerState) ? null : '그 대상과는 동맹 관계가 아닙니다.'),
    resolve({ g, actor, target }) {
      const t = target as PlayerState;
      g.setAlly(actor, t, false);
      g.toPlayer(actor, 'ally.unset', `${josa(g.label(t), '과/와')}의 동맹관계를 파기하였습니다.`, { from: actor.id, to: t.id });
      g.toPlayer(t, 'ally.incoming.unset', `${josa(g.label(actor), '이/가')} 당신과의 동맹관계를 파기하였습니다.`, {
        from: actor.id,
        to: t.id,
      });
    },
  },

  attack: {
    key: 'attack',
    name: '공격',
    code: 'A002',
    hotkey: 'A',
    mana: 50,
    cooldown: 60,
    uses: null,
    target: 'player+name',
    description: '대상의 정체를 맞히면 살해한다. 틀리거나 보디가드가 있는 대상이면 실패하고 공격자가 사망한다.',
    nameOptions: opponentNames,
    resolve: (c) => resolveAttack(c, 'normal'),
  },

  advanced_attack: {
    key: 'advanced_attack',
    name: '상급 공격',
    code: 'A003',
    hotkey: 'A',
    mana: 50,
    cooldown: 60,
    uses: null,
    target: 'player+name',
    description: '공격과 같으나 첫 실패는 경고로 끝난다. 두 번째 실패 시 사망.',
    nameOptions: opponentNames,
    resolve: (c) => resolveAttack(c, 'advanced'),
  },

  supreme_attack: {
    key: 'supreme_attack',
    name: '최상급 공격',
    code: 'A01Z',
    hotkey: 'A',
    mana: 50,
    cooldown: 60,
    uses: null,
    target: 'player+name',
    description: '공격과 같으나 실패해도 사망하지 않는다.',
    nameOptions: opponentNames,
    resolve: (c) => resolveAttack(c, 'supreme'),
  },

  ally_check: {
    key: 'ally_check',
    name: '아군 확인',
    code: 'A009',
    hotkey: 'F',
    mana: 15,
    cooldown: 45,
    uses: null,
    target: 'player',
    description: '대상이 아군이고 진명을 공표하고 있으면 정체를 알아낸다.',
    resolve: resolveAllyCheck,
  },

  advanced_ally_check: {
    key: 'advanced_ally_check',
    name: '상급 아군 확인',
    code: 'A02J',
    hotkey: 'F',
    mana: 15,
    cooldown: 30,
    uses: null,
    target: 'player',
    description: '아군 확인과 같고 쿨다운이 짧다.',
    resolve: resolveAllyCheck,
  },

  enemy_check: {
    key: 'enemy_check',
    name: '적군 확인',
    code: 'A008',
    hotkey: 'F',
    mana: 20,
    cooldown: 60,
    uses: null,
    target: 'player',
    description: '대상이 적군이고 진명을 공표하고 있으면 정체를 알아낸다.',
    resolve: resolveEnemyCheck,
  },

  advanced_enemy_check: {
    key: 'advanced_enemy_check',
    name: '상급 적군 확인',
    code: 'A03H',
    hotkey: 'F',
    mana: 20,
    cooldown: 45,
    uses: null,
    target: 'player',
    description: '적군 확인과 같고 쿨다운이 짧다.',
    resolve: resolveEnemyCheck,
  },

  scan: {
    key: 'scan',
    name: '스캔',
    code: 'A016',
    hotkey: 'D',
    mana: 20,
    cooldown: 40,
    uses: null,
    target: 'player+name',
    description: '대상과 이름을 골라, 대상이 그 캐릭터면 알아낸다. 지휘관 이름은 고를 수 없다.',
    nameOptions: (g) => scanNames(g),
    resolve: resolveScan,
  },

  advanced_scan: {
    key: 'advanced_scan',
    name: '상급 스캔',
    code: 'A017',
    hotkey: 'D',
    mana: 20,
    cooldown: 30,
    uses: null,
    target: 'player+name',
    description: '스캔과 같고 쿨다운이 짧다.',
    nameOptions: (g) => scanNames(g),
    resolve: resolveScan,
  },

  ally_scan: {
    key: 'ally_scan',
    name: '아군 스캔',
    code: 'A00T',
    hotkey: 'D',
    mana: 20,
    cooldown: 40,
    uses: null,
    target: 'player+name',
    description: '자기 진영 이름(지휘관 제외) 중에서 골라 스캔한다.',
    nameOptions: (g, actor) => g.sideRoster(actor.side).filter((c) => !c.commander).map((c) => c.key),
    resolve: resolveScan,
  },

  enemy_scan: {
    key: 'enemy_scan',
    name: '적군 스캔',
    code: 'A040',
    hotkey: 'D',
    mana: 20,
    cooldown: 40,
    uses: null,
    target: 'player+name',
    description: '상대 진영 이름(지휘관 제외) 중에서 골라 스캔한다.',
    nameOptions: (g, actor) =>
      g
        .sideRoster(actor.side === 1 ? 2 : 1)
        .filter((c) => !c.commander)
        .map((c) => c.key),
    resolve: resolveScan,
  },

  truth_gem: {
    key: 'truth_gem',
    name: '진실의 보석',
    code: 'A01B/A01A',
    mana: 50,
    cooldown: 240,
    uses: null,
    target: 'player',
    item: true,
    description:
      '진실의 조각 2/3: 마나 50, 1회 사용 후 소멸. 완성된 보석: 마나 75, 무제한. 대상의 정체를 알아낸다(지휘관은 지휘관이라는 것만). 쿨다운 240초 공유.',
    manaFor: (actor) => (actor.gem === 3 ? 75 : 50),
    resolve({ g, actor, target }) {
      const t = target as PlayerState;
      g.toAll('gem.use', `누군가가 ${g.label(t)}에게 진실의 보석을 사용하였습니다.`, { target: t.id });
      const r = identityOrCommander(g, t);
      g.toPlayer(actor, 'gem.result', `-비공개: ${r.text}`, { target: t.id }, r.facts);
      if (actor.gem === 2) actor.gem = 0;
    },
  },

  // ── 패시브/권한 표시용 ──
  global_chat: {
    key: 'global_chat',
    name: '전체 채팅',
    code: 'A00D',
    mana: 35,
    cooldown: 0,
    uses: null,
    target: 'none',
    passive: true,
    description: '정체를 숨긴 채 캐릭터 이름으로 모든 참가자에게 말한다 (전체 방송 채널, 1회당 마나 소모).',
  },
};

export { announceInspect };

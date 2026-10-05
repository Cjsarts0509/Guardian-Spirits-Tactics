// 왕자들의 내전 (docs/spec/civil_war.md · civil_war.json, web_overrides 반영)
import { resolveAttack } from '../engine/attack.js';
import { identityOrCommander } from '../engine/checks.js';
import type { Game } from '../engine/game.js';
import { josa } from '../text.js';
import type { CharKey, PlayerState } from '../types.js';
import type { CharacterDef, ModeDef, SkillCtx, SkillDef } from './types.js';

const T1 = '단테스를 도와 카이의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.';
const T2 = '카이를 도와 단테스의 세력을 파멸시켜야 합니다.\n단테스를 살해하면 승리합니다.';
const BASE = ['publish', 'ally', 'break_ally'];

const characters: CharacterDef[] = [
  {
    key: 'dantes', name: '단테스', title: '석세서 오브 다크니스', unitId: 'H005', slot: 1, side: 1, commander: true, extraLives: 0,
    skills: [...BASE, 'ally_check', 'attack', 'dantes_command', 'dantes_successor', 'global_chat'],
    objective: '카이의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.\n\n당신이 살해당하면 단테스측은 게임에서 패배합니다.',
  },
  {
    key: 'mertz', name: '메르츠키엘', title: '세컨드 프린스', unitId: 'H006', slot: 2, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'advanced_attack', 'mertz_spouse', 'shadow_jail'],
    objective: T1,
  },
  {
    key: 'kelhu', name: '켈후', title: '오우거 로드', unitId: 'H00A', slot: 3, side: 1, commander: false, extraLives: 2,
    skills: [...BASE, 'advanced_attack', 'warrior_scent', 'bodyguard_kelhu', 'kelhu_loyal', 'hard_skin'],
    objective: T1,
  },
  {
    key: 'freya', name: '프레이아', title: '프리스티스 오브 그리드', unitId: 'H009', slot: 4, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'scan'],
    skillCodes: { scan: 'A016' },
    unlocks: [{ at: 180, skill: 'oracle' }],
    objective: T1,
  },
  {
    key: 'soen', name: '소엔', title: '드로우 어쌔신', unitId: 'H00B', slot: 5, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'enemy_check', 'backstab', 'disguise', 'advice'],
    objective: T1,
  },
  {
    key: 'reindila', name: '레인딜라', title: '소울 팔로어', unitId: 'H008', slot: 6, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'ally_check', 'libido_priestess', 'reindila_spouse', 'soul_wall', 'soul_recovery'],
    objective: T1,
  },
  {
    key: 'sephy', name: '세피', title: '카오스 위치', unitId: 'H007', slot: 7, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'ally_check', 'burning_magic', 'confusion', 'curse'],
    objective: T1,
  },
  {
    key: 'kai', name: '카이', title: '프린스 오브 다크니스', unitId: 'H000', slot: 8, side: 2, commander: true, extraLives: 0,
    skills: [...BASE, 'advanced_attack', 'ally_check', 'soul_reaver', 'global_chat'],
    objective: '단테스의 세력을 파멸시켜야 합니다.\n단테스를 살해하면 승리합니다.\n\n당신이 살해당하면 카이측은 게임에서 패배합니다.',
  },
  {
    key: 'arin', name: '아린', title: '다크 템플러', unitId: 'H002', slot: 9, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'attack', 'advanced_enemy_check', 'rune_protection', 'bodyguard_arin', 'kai_loyal'],
    objective: T2,
  },
  {
    key: 'tuma', name: '투마', title: '플레임 블레이더', unitId: 'H001', slot: 10, side: 2, commander: false, extraLives: 1,
    skills: [...BASE, 'advanced_attack', 'valiant_charge', 'flame_source', 'warrior_scent'],
    objective: T2,
  },
  {
    key: 'krate', name: '크레이트', title: '둠 로드', unitId: 'H003', slot: 11, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'advanced_scan', 'nightmare'],
    skillCodes: { advanced_scan: 'A017' },
    objective: T2,
  },
  {
    key: 'kaspa', name: '카스파', title: '다크 샤먼', unitId: 'H004', slot: 12, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'attack', 'ally_check', 'kai_loyal', 'essence_absorb'],
    unlocks: [{ at: 300, skill: 'shadow_eye' }],
    objective: T2,
  },
];

// ───────────── 고유 스킬 헬퍼 ─────────────

function t(c: SkillCtx): PlayerState {
  return c.target as PlayerState;
}

/** "대상이 X 인가" 확인형 (배우자·충복). 성공하면 스킬 제거 */
function identityProbe(key: string, name: string, code: string, want: CharKey, wantName: string): SkillDef {
  return {
    key, name, code, hotkey: 'Z', mana: 25, cooldown: 40, uses: null, target: 'player',
    description: `대상이 ${josa(wantName, '이다/다')}면 알아낸다. 성공하면 이 스킬은 사라진다.`,
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === want) {
        g.toPlayer(actor, 'probe.result', `-비공개: ${josa(g.label(tg), '은/는')} ${josa(wantName, '이다/다')}!`,
          { target: tg.id, success: true, character: want }, [{ player: tg.id, character: want }]);
        g.removeSkill(actor, key);
      } else {
        g.toPlayer(actor, 'probe.result', `-비공개: ${josa(g.label(tg), '은/는')} ${josa(wantName, '이/가')} 아니다.`,
          { target: tg.id, success: false }, [{ player: tg.id, character: null, not: want }]);
      }
    },
  };
}

function incapacitate(key: string, name: string, code: string, mana: number, who: string): SkillDef {
  return {
    key, name, code, hotkey: key === 'confusion' ? 'X' : 'Z', mana, cooldown: 120, uses: null, target: 'player',
    description: '대상을 45초 동안 행동 불능으로 만든다. 시전자는 공개되지 않는다.',
    resolve(c) {
      const { g } = c;
      const tg = t(c);
      g.addEffect(tg, 'incapacitated', 45, key, true);
      g.toAll('status.incapacitated', `누군가가 ${g.label(tg)}에게 행동 불능 주문을 시전하였습니다.`, { target: tg.id, seconds: 45 });
      g.toPlayer(tg, 'status.incapacitated.self', '행동 불능 상태가 되었습니다. (45초)', { source: who });
    },
  };
}

const passive = (key: string, name: string, code: string, description: string): SkillDef => ({
  key, name, code, mana: 0, cooldown: 0, uses: null, target: 'none', passive: true, description,
});

// ───────────── 고유 스킬 ─────────────

const skills: Record<string, SkillDef> = {
  dantes_command: {
    key: 'dantes_command', name: '마황자의 명령', code: 'A00A', hotkey: 'V', mana: 0, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 카이면 즉시 처형한다(보디가드·목숨 무시). 카이가 아니면 단테스가 살해당한다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.toAll('skill.dantes_command', `-단테스 : 카이는 ${josa(g.label(tg), '이다/다')}! 놈을 체포하라!`, { target: tg.id });
      if (tg.character === 'kai') {
        g.toAll('skill.dantes_command.success', `-${g.label(tg)}의 정체는 카이였습니다. 카이가 처형당했습니다!`, { target: tg.id });
        g.kill(tg, 'dantes_command');
      } else {
        g.toAll('skill.dantes_command.fail', `-${josa(g.label(tg), '은/는')} 카이가 아닙니다! 카이 : "어리석군..." - 카이가 단테스를 살해하였습니다!`, { target: tg.id });
        g.kill(actor, 'dantes_command');
      }
    },
  },

  dantes_successor: {
    key: 'dantes_successor', name: '후계자 임명', code: 'A00C', hotkey: 'Z', mana: 30, cooldown: 0, uses: 1, target: 'player',
    description: '1회(성공 여부 무관). 대상이 메르츠키엘이면 후계자로 임명한다. 단테스가 죽어도 후계자가 살아 있으면 패배하지 않는다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'mertz') {
        g.grantSkill(tg, 'successor');
        g.toAll('skill.successor', '단테스가 메르츠키엘을 후계자로 임명하였습니다!');
        g.toPlayer(actor, 'skill.successor.self', `-비공개: ${josa(g.label(tg), '을/를')} 후계자로 설정하였습니다.`, { target: tg.id }, [{ player: tg.id, character: 'mertz' }]);
        g.toPlayer(tg, 'skill.successor.target', '-비공개: 단테스가 당신을 후계자로 임명하였습니다!', {}, [{ player: actor.id, character: 'dantes' }]);
      } else {
        g.toPlayer(actor, 'skill.successor.fail', '-비공개: 그 대상은 메르츠키엘이 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'mertz' }]);
      }
    },
  },

  successor: passive('successor', '후계자', 'A00E', '단테스가 사망해도 메르츠키엘이 살아 있으면 단테스측은 패배하지 않는다.'),

  mertz_spouse: identityProbe('mertz_spouse', '배우자', 'A01C', 'reindila', '레인딜라'),
  reindila_spouse: identityProbe('reindila_spouse', '배우자', 'A00R', 'mertz', '메르츠키엘'),
  kelhu_loyal: { ...identityProbe('kelhu_loyal', '충복', 'A00L', 'dantes', '단테스'), hotkey: 'F' },
  kai_loyal: identityProbe('kai_loyal', '충복', 'A00V', 'kai', '카이'),

  shadow_jail: {
    key: 'shadow_jail', name: '쉐도우 자일', code: 'A00H', hotkey: 'X', mana: 35, cooldown: 180, uses: null, target: 'player',
    description: '대상을 45초 동안 무적 및 행동 불능으로 만든다. 시전 사실이 공개된다.',
    resolve(c) {
      const { g } = c;
      const tg = t(c);
      g.addEffect(tg, 'incapacitated', 45, 'shadow_jail', true);
      g.addEffect(tg, 'invulnerable', 45, 'shadow_jail', true);
      g.toAll('status.shadow_jail', `메르츠키엘이 ${g.label(tg)}에게 쉐도우 자일을 시전하였습니다.`, { target: tg.id, seconds: 45 });
    },
  },

  bodyguard_kelhu: passive('bodyguard_kelhu', '보디가드', 'A00K', '켈후가 살아 있으면 단테스는 일반 공격으로 죽지 않는다 (정답 공격자는 실패 처리).'),
  bodyguard_arin: passive('bodyguard_arin', '보디가드', 'A00X', '아린이 살아 있으면 카이는 일반 공격으로 죽지 않는다 (정답 공격자는 실패 처리).'),
  hard_skin: passive('hard_skin', '하드스킨', 'S000', '켈후는 일반 공격을 3번 맞아야 사망한다.'),
  flame_source: passive('flame_source', '화염의 근원', 'S002', '투마는 일반 공격을 2번 맞아야 사망한다.'),
  disguise: passive('disguise', '변장', 'S001', '카이측 이름으로 공표하면 카이측의 아군 확인·스캔 결과를 그 이름으로 속인다.'),
  calmness: passive('calmness', '냉정함', 'A02I', '투마의 용맹한 돌진에 사망하지 않는다.'),
  essence_absorb: passive('essence_absorb', '정기 흡수', 'S003', '일반 공격으로 적을 살해하면 마나 50을 회복한다.'),

  warrior_scent: {
    key: 'warrior_scent', name: '전사의 후각', code: 'A019', hotkey: 'X', mana: 40, cooldown: 180, uses: null, target: 'player',
    description: '대상이 상급 전사(상급 공격 또는 최상급 공격 보유)인지 알아낸다. 투마나 켈후의 이름을 공표한 대상에게는 쓸 수 없다.',
    precheck: ({ target }) =>
      target && (target.published === 'tuma' || target.published === 'kelhu') ? '투마나 켈후의 이름을 공표한 사람에게 사용할 수 없습니다.' : null,
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      // DECISIONS A13: 이름 목록이 아니라 보유 스킬로 판정
      const yes = g.hasSkill(tg, 'advanced_attack') || g.hasSkill(tg, 'supreme_attack');
      g.toPlayer(actor, 'skill.warrior_scent', `-비공개: ${josa(g.label(tg), '은/는')} ${yes ? '상급 전사이다.' : '상급 전사가 아니다.'}`, { target: tg.id, result: yes });
    },
  },

  advice: {
    key: 'advice', name: '조언', code: 'A02H', hotkey: 'C', mana: 50, cooldown: 0, uses: 1, target: 'player',
    description: '1회(성공 여부 무관). 대상이 켈후면 냉정함을 부여하고 소엔과 켈후가 서로 동맹이 된다. 켈후는 소엔의 정체를 알게 된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'kelhu') {
        g.grantSkill(tg, 'calmness');
        g.setAlly(actor, tg, true);
        g.setAlly(tg, actor, true);
        g.toAll('skill.advice', '-소엔이 켈후를 보좌하기 시작합니다.');
        g.toPlayer(actor, 'skill.advice.self', `-비공개: ${josa(g.label(tg), '은/는')} 켈후다. 서로 동맹이 되었습니다.`, { target: tg.id }, [{ player: tg.id, character: 'kelhu' }]);
        g.toPlayer(tg, 'skill.advice.target', `-비공개: 소엔의 정체는 ${josa(g.label(actor), '이다/다')}! 냉정함을 얻었습니다.`, {}, [{ player: actor.id, character: 'soen' }]);
      } else {
        g.toPlayer(actor, 'skill.advice.fail', '-비공개: 그 대상은 켈후가 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'kelhu' }]);
      }
    },
  },

  backstab: {
    key: 'backstab', name: '백스탭', code: 'A00M', hotkey: 'Z', mana: 10, cooldown: 1, uses: null, target: 'player',
    description: '대상이 소엔에게 동맹을 걸어 둔 상태면 진영과 관계없이 살해한다(목숨·보디가드 무시). 성공하면 연쇄살인을 얻는다.',
    precheck: ({ g, actor, target }) => (target && g.isAllied(target, actor) ? null : '이 사람은 당신에게 동맹설정을 하지 않았습니다.'),
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const name = g.charName(tg.character);
      g.toAll('skill.backstab', `-소엔이 ${josa(name, '을/를')} 암살하였습니다!`, { target: tg.id, character: tg.character });
      g.kill(tg, 'backstab');
      if (!g.ended && actor.alive && !g.hasSkill(actor, 'soen_chain_murder')) {
        g.grantSkill(actor, 'soen_chain_murder');
        g.toPlayer(actor, 'skill.grant', '-비공개: 연쇄살인 스킬을 획득했습니다!', { skill: 'soen_chain_murder' });
      }
    },
  },

  soen_chain_murder: {
    key: 'soen_chain_murder', name: '연쇄살인', code: 'A01D', hotkey: 'V', mana: 30, cooldown: 10, uses: null, target: 'player+name',
    description: '정체를 맞히면 살해한다. 틀리거나 보디가드가 있거나 목숨이 남은 대상이면 이 스킬을 잃는다(소엔은 죽지 않는다).',
    nameOptions: (g, actor) => g.sideRoster(actor.side === 1 ? 2 : 1).map((c) => c.key),
    resolve: (c) => resolveAttack(c, 'chain'),
  },

  burning_magic: {
    key: 'burning_magic', name: '버닝 매직', code: 'A00O', hotkey: 'Z', mana: 40, cooldown: 100, uses: null, target: 'player',
    description: '대상의 마나를 70 감소시킨다. 대상은 공개되지 않는다.',
    resolve(c) {
      const { g } = c;
      const tg = t(c);
      g.addMana(tg, -70);
      g.toAll('skill.burning_magic', '-세피가 누군가에게 버닝 매직을 시전하였습니다.');
      g.toPlayer(tg, 'skill.burning_magic.target', '-비공개: 버닝 매직으로 인하여 마나가 70 감소하였습니다.');
    },
  },

  confusion: incapacitate('confusion', '교란', 'A00Y', 25, 'sephy'),
  nightmare: incapacitate('nightmare', '나이트메어', 'A00P', 30, 'krate'),

  curse: {
    key: 'curse', name: '저주', code: 'A007', hotkey: 'C', mana: 30, cooldown: 200, uses: null, target: 'player',
    description: '진명(세피)을 공표하고 있어야 사용 가능. 대상의 마나가 50 이하면 정체를 알아낸다(지휘관은 지휘관이라는 것만).',
    precheck: ({ actor }) => (actor.published === 'sephy' ? null : '자신의 진명을 공표해야 합니다.'),
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.mana <= 50) {
        const r = identityOrCommander(g, tg);
        g.toPlayer(actor, 'skill.curse', `-비공개: ${r.text}`, { target: tg.id, success: true }, r.facts);
      } else {
        g.toPlayer(actor, 'skill.curse', '-비공개: 목표 대상의 마나가 50 이하가 아닙니다.', { target: tg.id, success: false });
      }
    },
  },

  libido_priestess: {
    key: 'libido_priestess', name: '리비도의 여사제', code: 'A00F', hotkey: 'C', mana: 100, cooldown: 0, uses: 1, target: 'none',
    description: '1회. 진명(레인딜라)을 공표하고 있어야 사용 가능. 프레이아의 정체를 알아낸다.',
    precheck: ({ actor }) => (actor.published === 'reindila' ? null : '자신의 진명을 공표하고 있어야 합니다.'),
    resolve(c) {
      const { g, actor } = c;
      const freya = g.byChar('freya');
      if (freya) {
        g.toPlayer(actor, 'skill.libido', `-비공개: 프레이아는 ${josa(g.label(freya), '이다/다')}!`, { target: freya.id }, [{ player: freya.id, character: 'freya' }]);
      }
    },
  },

  soul_recovery: {
    key: 'soul_recovery', name: '영혼의 회복', code: 'A00S', hotkey: 'X', mana: 40, cooldown: 70, uses: null, target: 'player',
    description: '대상은 60초 동안 공격에 실패해도 페널티(사망·상급 공격 단계 상승)를 받지 않는다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const until = Math.max(Number(tg.flags.soulRecoveryUntil ?? 0), g.now + 60_000);
      tg.flags.soulRecoveryUntil = until;
      g.schedule(until, 'flagEnd', { player: tg.id, flag: 'soulRecoveryUntil', until, text: '-비공개: 영혼의 회복 효과가 끝났습니다.' });
      g.toPlayer(actor, 'skill.soul_recovery.self', `-비공개: ${g.label(tg)}에게 영혼의 회복을 시전합니다.`, { target: tg.id });
      g.toPlayer(tg, 'skill.soul_recovery.target', '-비공개: 레인딜라가 당신에게 영혼의 회복을 시전합니다. 60초 동안 공격 실패시 페널티를 입지 않습니다.', { until }, [{ player: actor.id, character: 'reindila' }]);
    },
  },

  soul_wall: {
    key: 'soul_wall', name: '영혼의 벽', code: 'A00U', hotkey: 'V', mana: 50, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 레인딜라가 스스로를 희생해 대상에게 영혼의 벽을 건다. 영혼의 벽을 가진 대상은 카이의 소울 리버에 죽지 않는다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      tg.flags.soulWall = true;
      g.toAll('skill.soul_wall', '-레인딜라가 스스로를 희생하여 영혼의 벽을 시전하였습니다. 누군가가 이 영혼의 벽의 보호를 받고 있습니다.');
      g.toPlayer(tg, 'skill.soul_wall.target', '-비공개: 당신은 영혼의 벽의 보호를 받고 있습니다.', {}, [{ player: actor.id, character: 'reindila' }]);
      g.kill(actor, 'soul_wall');
    },
  },

  soul_reaver: {
    key: 'soul_reaver', name: '소울 리버', code: 'A00B', hotkey: 'V', mana: 50, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상을 즉시 살해한다(보디가드·목숨 무시, 영혼의 벽에는 막힘). 20초 후 카이의 정체가 모두에게 공개된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.flags.soulWall) {
        g.toAll('skill.soul_reaver.blocked', `-카이가 ${g.label(tg)}에게 소울 리버를 시전합니다. 그러나 ${josa(g.label(tg), '은/는')} 영혼의 벽으로 보호받고 있습니다!`, { target: tg.id });
      } else {
        g.toAll('skill.soul_reaver', `-카이가 ${g.label(tg)}에게 소울 리버를 시전하여 살해합니다!`, { target: tg.id });
        g.kill(tg, 'soul_reaver');
      }
      if (!g.ended) {
        g.toAll('skill.soul_reaver.reveal_notice', '-카이의 정체가 20초 후 드러납니다.');
        g.schedule(g.now + 20_000, 'reveal', { player: actor.id, text: `-카이의 정체는 ${josa(g.label(actor), '이다/다')}!` });
      }
    },
  },

  rune_protection: {
    key: 'rune_protection', name: '룬 프로텍션', code: 'A00W', hotkey: 'X', mana: 40, cooldown: 60, uses: null, target: 'player',
    description: '대상을 45초 동안 무적으로 만든다(어떤 스킬의 대상도 될 수 없음). 공지되지 않는다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.addEffect(tg, 'invulnerable', 45, 'rune_protection', false);
      g.toPlayer(actor, 'skill.rune_protection.self', `-비공개: ${g.label(tg)}에게 룬 프로텍션을 시전했습니다. (45초)`, { target: tg.id });
      g.toPlayer(tg, 'skill.rune_protection.target', '-비공개: 룬 프로텍션의 보호를 받고 있습니다. (45초)');
    },
  },

  valiant_charge: {
    key: 'valiant_charge', name: '용맹한 돌진', code: 'A00Z', hotkey: 'Z', mana: 75, cooldown: 0, uses: 1, target: 'player',
    description: '1회(성공 여부 무관). 대상이 냉정함이 없는 켈후면 즉사시키고(목숨 무시), 카이와 투마가 서로 정체를 알고 동맹이 된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'kelhu' && !g.hasSkill(tg, 'calmness')) {
        g.toAll('skill.valiant_charge', `-투마가 켈후에게 돌진하여 쓰러뜨렸습니다.`, { target: tg.id });
        g.kill(tg, 'valiant_charge');
        if (g.ended) return;
        g.toAll('skill.valiant_charge.kai', '-투마의 용맹함이 카이의 귀에 전해집니다.');
        const kai = g.byChar('kai');
        if (kai && kai.alive) {
          g.setAlly(kai, actor, true);
          g.setAlly(actor, kai, true);
          g.toPlayer(kai, 'skill.valiant_charge.reveal', `-비공개: 투마의 정체는 ${josa(g.label(actor), '이다/다')}!`, {}, [{ player: actor.id, character: 'tuma' }]);
          g.toPlayer(actor, 'skill.valiant_charge.reveal', `-비공개: 카이의 정체는 ${josa(g.label(kai), '이다/다')}!`, {}, [{ player: kai.id, character: 'kai' }]);
        }
      } else {
        g.toAll('skill.valiant_charge.fail', `-투마가 ${g.label(tg)}에게 돌진을 시도하였으나 실패하였습니다.`, { target: tg.id });
        g.toPlayer(actor, 'skill.valiant_charge.fail.self', '-비공개: 그 대상은 켈후가 아니거나, 냉정함 스킬을 가지고 있습니다.', { target: tg.id });
      }
    },
  },

  oracle: {
    key: 'oracle', name: '신탁', code: 'A006', hotkey: 'Z', mana: 40, cooldown: 90, uses: null, target: 'player',
    description: '(게임 시작 3분 후 획득) 대상의 진실의 보석 보유 여부와 단계를 알아낸다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const text = ['진실의 보석을 가지고 있지 않습니다!', '진실의 조각 1/3을 가지고 있습니다.', '진실의 조각 2/3을 가지고 있습니다.', '합쳐진 진실의 보석을 가지고 있습니다!'][tg.gem];
      g.toPlayer(actor, 'skill.oracle', `-비공개: ${josa(g.label(tg), '은/는')} ${text}`, { target: tg.id, gem: tg.gem });
    },
  },

  shadow_eye: {
    key: 'shadow_eye', name: '그림자의 눈', code: 'A018', hotkey: 'X', mana: 50, cooldown: 0, uses: 1, target: 'player',
    description: '(게임 시작 5분 후 획득) 1회. 보유한 진실의 조각/보석을 모두 소모해 대상의 정체를 정확히 알아낸다.',
    precheck: ({ actor }) => (actor.gem >= 1 ? null : '진실의 조각이 있어야 사용할 수 있습니다.'),
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      actor.gem = 0;
      g.toPlayer(actor, 'skill.shadow_eye', `-비공개: ${josa(g.label(tg), '은/는')} ${josa(g.charName(tg.character), '이다/다')}!`, { target: tg.id }, [{ player: tg.id, character: tg.character }]);
    },
  },
};

// ───────────── 승리 판정 (원본 tb → Tb → ub → Ub) ─────────────

function checkVictory(g: Game): void {
  if (g.ended) return;
  if (!g.charAlive('kai')) {
    g.endGame(1, '단테스측이 승리했습니다.');
    return;
  }
  if (!g.charAlive('dantes')) {
    const mertz = g.byChar('mertz');
    const heir = !!mertz && g.hasSkill(mertz, 'successor');
    if (heir && !mertz.alive) {
      g.endGame(2, '단테스가 사망하고, 후계자인 메르츠키엘도 사망했습니다. 카이측이 승리했습니다.');
    } else if (!heir) {
      g.endGame(2, '카이측이 승리했습니다.');
    } else if (!g.state.modeState.successionAnnounced) {
      g.state.modeState.successionAnnounced = true; // 원본은 매 판정마다 반복 출력 (DECISIONS B)
      g.toAll('succession', '메르츠키엘이 단테스의 뒤를 이어받았습니다.');
    }
  }
}

export const civilWar: ModeDef = {
  id: 'civil_war',
  displayName: '왕자들의 내전',
  sideNames: { 1: '단테스측', 2: '카이측' },
  characters,
  masks: {
    12: '111111111111',
    11: '111111011111',
    10: '111111011110',
    9: '111110011110',
    8: '111110011010',
  },
  skills,
  globalChat: { characters: ['dantes', 'kai'], mana: 35 },
  disguises: [{ character: 'soen', fooledSide: 2 }],
  hiddenFromChecks: [],
  isAbsolutelyGuarded(g, target) {
    if (target.character === 'kai') return g.charAlive('arin');
    if (target.character === 'dantes') return g.charAlive('kelhu');
    return false;
  },
  checkVictory,
};

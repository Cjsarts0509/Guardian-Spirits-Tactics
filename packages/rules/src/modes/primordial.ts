// 태초의 전쟁 (docs/spec/primordial.md · primordial.json, DECISIONS 반영)
import type { Game } from '../engine/game.js';
import { josa } from '../text.js';
import type { CharKey, PlayerState } from '../types.js';
import type { CharacterDef, ModeDef, SkillCtx, SkillDef } from './types.js';

const BASE = ['publish', 'ally', 'break_ally'];
const CORE_CODES = { publish: 'A000', ally: 'A004', break_ally: 'A005' };
const T_EARTH = '지상연합의 세력원으로서 다크니스의 세력을 파멸시켜야 합니다.\n엘타스를 살해하면 승리합니다.';
const T_DARK = '다크니스의 세력원으로서 지상연합의 세력을 파멸시켜야 합니다.\n케인과 라엘을 모두 살해하면 승리합니다.';

const characters: CharacterDef[] = [
  {
    key: 'rael', name: '라엘', title: '엘프 히어로', unitId: 'H00D', slot: 1, side: 1, commander: true, extraLives: 0,
    skills: [...BASE, 'attack', 'ally_check', 'rael_leadership'],
    skillCodes: { ...CORE_CODES, attack: 'A002', ally_check: 'A009' },
    unlocks: [{ at: 360, skill: 'rael_adv_leadership', requires: 'rael_leadership', replaces: 'rael_leadership' }],
    objective: '다크니스의 세력을 파멸시켜야 합니다.\n엘타스를 살해하면 승리합니다.\n\n당신과 케인이 모두 살해당하면 지상 연합군은 게임에서 패배합니다.',
  },
  {
    key: 'kane', name: '케인', title: '문 울프', unitId: 'H00C', slot: 2, side: 1, commander: true, extraLives: 1,
    skills: [...BASE, 'attack', 'advanced_enemy_check', 'kane_wolfs_slash', 'kane_moon_protection'],
    skillCodes: { ...CORE_CODES, attack: 'A002', advanced_enemy_check: 'A03H' },
    objective: '다크니스의 세력을 파멸시켜야 합니다.\n엘타스를 살해하면 승리합니다.\n\n당신과 라엘이 모두 살해당하면 지상 연합군은 게임에서 패배합니다.',
  },
  {
    key: 'eoril', name: '에오릴', title: '피닉스 퀸', unitId: 'H00E', slot: 3, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'ally_check', 'eoril_trial', 'eoril_flame_shackle', 'eoril_phoenix_flame', 'eoril_queens_eye'],
    skillCodes: { ...CORE_CODES, ally_check: 'A009' },
    objective: T_EARTH,
  },
  {
    key: 'nukelius', name: '뉴켈리어스', title: '엘더 드루이드', unitId: 'H00F', slot: 4, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'scan', 'nukelius_chakra_magic', 'global_chat'],
    skillCodes: { ...CORE_CODES, scan: 'A01L', global_chat: 'A025' },
    objective: T_EARTH,
  },
  {
    key: 'tachin', name: '타친', title: '트롤 치프틴', unitId: 'H00G', slot: 5, side: 1, commander: false, extraLives: 1,
    skills: [...BASE, 'advanced_attack', 'tachin_union', 'tachin_neutralize', 'tachin_troll_regen'],
    skillCodes: { ...CORE_CODES, advanced_attack: 'A003' },
    objective: T_EARTH,
  },
  {
    key: 'kumarin', name: '쿠마린', title: '타우리안 치프틴', unitId: 'H00H', slot: 6, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'attack', 'ally_check', 'kumarin_union', 'kumarin_binding', 'kumarin_commander_guard'],
    skillCodes: { ...CORE_CODES, attack: 'A002', ally_check: 'A009' },
    objective: T_EARTH,
  },
  {
    key: 'eltas', name: '엘타스', title: '블랙 나이트', unitId: 'H00I', slot: 7, side: 2, commander: true, extraLives: 2,
    skills: [...BASE, 'supreme_attack', 'ally_check', 'eltas_leadership', 'eltas_shield', 'eltas_bloody_heart'],
    skillCodes: { ...CORE_CODES, supreme_attack: 'A01Z', ally_check: 'A009' },
    unlocks: [{ at: 360, skill: 'eltas_adv_leadership', requires: 'eltas_leadership', replaces: 'eltas_leadership' }],
    objective: '지상연합의 세력을 파멸시켜야 합니다.\n케인과 라엘을 모두 살해하면 승리합니다.\n\n당신이 살해당하면 다크니스는 게임에서 패배합니다.',
  },
  {
    key: 'sasint', name: '사신트', title: '오버로드', unitId: 'H00J', slot: 8, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'attack', 'advanced_ally_check', 'sasint_support', 'sasint_training', 'sasint_battle_mastery'],
    skillCodes: { ...CORE_CODES, attack: 'A002', advanced_ally_check: 'A02J' },
    objective: T_DARK,
  },
  {
    key: 'kilder', name: '킬데르', title: '로열 뱀파이어', unitId: 'H00K', slot: 9, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'attack', 'ally_check', 'kilder_vampiric'],
    skillCodes: { ...CORE_CODES, attack: 'A002', ally_check: 'A009' },
    unlocks: [{ at: 120, skill: 'kilder_casanova' }],
    objective: T_DARK,
  },
  {
    key: 'drakan', name: '드라칸', title: '블랙타워 위자드', unitId: 'H00L', slot: 10, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'enemy_check', 'drakan_black_spell', 'drakan_enchant_muscle', 'global_chat'],
    skillCodes: { ...CORE_CODES, enemy_check: 'A008', global_chat: 'A025' },
    objective: T_DARK,
  },
  {
    key: 'hermilly', name: '허밀리', title: '다크 프리스트', unitId: 'H00M', slot: 11, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'scan', 'hermilly_libido_protection', 'hermilly_seeing_libido'],
    skillCodes: { ...CORE_CODES, scan: 'A01L' },
    objective: T_DARK,
  },
  {
    key: 'consume', name: '컨슘', title: '미트 골렘', unitId: 'H00N', slot: 12, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'attack', 'consume_slave_instinct', 'consume_master_guard', 'consume_final_evolution'],
    skillCodes: { ...CORE_CODES, attack: 'A002' },
    objective: T_DARK,
  },
];

// ───────────── 헬퍼 ─────────────

const t = (c: SkillCtx): PlayerState => c.target as PlayerState;

const passive = (key: string, name: string, code: string, description: string): SkillDef => ({
  key, name, code, mana: 0, cooldown: 0, uses: null, target: 'none', passive: true, description,
});

/** "대상이 X 인가" (연합 결성·노예 본능). 성공하면 소멸, 실패하면 쿨 후 재사용 */
function probe(key: string, name: string, code: string, want: CharKey, wantName: string): SkillDef {
  return {
    key, name, code, hotkey: 'Z', mana: 25, cooldown: 40, uses: null, target: 'player',
    description: `대상이 ${josa(wantName, '이다/다')}면 알아낸다. 성공하면 이 스킬은 사라진다.`,
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === want) {
        g.toPlayer(actor, 'probe.result', `-비공개: ${josa(g.label(tg), '은/는')} ${josa(wantName, '이다/다')}!`, { target: tg.id, success: true, character: want }, [{ player: tg.id, character: want }]);
        g.removeSkill(actor, key);
      } else {
        g.toPlayer(actor, 'probe.result', `-비공개: ${josa(g.label(tg), '은/는')} ${josa(wantName, '이/가')} 아니다.`, { target: tg.id, success: false }, [{ player: tg.id, character: null, not: want }]);
      }
    },
  };
}

/** 리더쉽: 자기 진영(지휘관 제외) 이름 하나를 골라 그 캐릭터가 누구인지 알아낸다 */
function leadership(key: string, name: string, code: string, selfName: CharKey | null, description: string): SkillDef {
  return {
    key, name, code, hotkey: 'Z', mana: 50, cooldown: 0, uses: 1, target: 'none',
    description,
    nameOptions: (g, actor) => g.sideRoster(actor.side).filter((c) => !c.commander).map((c) => c.key),
    precheck: ({ actor }) => (selfName && actor.published !== selfName ? '자신의 진명을 공표하고 있어야 합니다.' : null),
    resolve(c) {
      const { g, actor } = c;
      const want = c.name as CharKey;
      const holder = g.byChar(want);
      if (holder) {
        g.toPlayer(actor, 'skill.leadership', `-비공개: ${g.charName(want)}의 정체는 ${josa(g.label(holder), '이다/다')}.`, { target: holder.id, character: want }, [{ player: holder.id, character: want }]);
      }
    },
  };
}

/** 무조건 살해 (목숨·보디가드 무시) */
function execute(key: string, name: string, code: string, hotkey: string, mana: number, cooldown: number, uses: number | null, text: (g: Game, actor: PlayerState, tg: PlayerState) => string, cause: string, description: string): SkillDef {
  return {
    key, name, code, hotkey, mana, cooldown, uses, target: 'player', description,
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.toAll(`skill.${key}`, text(g, actor, tg), { target: tg.id, attacker: actor.character });
      g.kill(tg, cause);
    },
  };
}

/** 횟수제 보디가드: 보호자가 살아 있고 방어 횟수가 남았으면 2회까지 막는다 */
function guardedBy(g: Game, guardianKey: CharKey, skill: string, attacker: PlayerState, targetName: string): string | null {
  const guardian = g.byChar(guardianKey);
  if (!guardian || !guardian.alive || !g.hasSkill(guardian, skill)) return null;
  const left = Number(guardian.flags.guardCharges ?? 0);
  if (left <= 0) return null;
  guardian.flags.guardCharges = left - 1;
  return `-${josa(g.charName(attacker.character), '이/가')} ${josa(targetName, '을/를')} 공격하였으나 살해하지 못했습니다. (보디가드)`;
}

// ───────────── 고유 스킬 ─────────────

const skills: Record<string, SkillDef> = {
  // 라엘
  rael_leadership: leadership('rael_leadership', '리더쉽', 'A01H', 'rael', '1회. 진명(라엘)을 공표하고 있어야 사용 가능. 지상 연합 이름 하나를 골라 그 캐릭터가 누구인지 알아낸다.'),
  rael_adv_leadership: leadership('rael_adv_leadership', '상급 리더쉽', 'A02F', null, '(6분 시점까지 리더쉽을 쓰지 않았으면 대체 획득) 1회. 진명 조건 없이 지상 연합 이름 하나를 골라 누구인지 알아낸다.'),
  rael_eoril_test: {
    key: 'rael_eoril_test', name: '에오릴의 시험', code: 'A01I', hotkey: 'X', mana: 60, cooldown: 0, uses: 1, target: 'player',
    description: '(에오릴의 시련 1분 후 획득) 1회. 대상이 에오릴이면 마스터가 되어 마스터의 권능을 얻는다. 실패해도 소멸한다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'eoril') {
        g.toAll('skill.rael_eoril_test', '-라엘이 에오릴의 시험을 통과하여 마스터가 되었습니다!');
        g.toPlayer(actor, 'skill.rael_eoril_test.self', `-비공개: ${josa(g.label(tg), '은/는')} 에오릴이다.`, { target: tg.id }, [{ player: tg.id, character: 'eoril' }]);
        g.grantSkill(actor, 'rael_master_power');
        g.toPlayer(actor, 'skill.grant', '-비공개: 마스터의 권능 스킬을 획득하였습니다.', { skill: 'rael_master_power' });
      } else {
        g.toPlayer(actor, 'skill.rael_eoril_test.fail', '-비공개: 그 대상은 에오릴이 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'eoril' }]);
      }
    },
  },
  rael_master_power: execute('rael_master_power', '마스터의 권능', 'A01J', 'X', 10, 0, 1, (g, _a, tg) => `-라엘이 마스터의 권능으로 ${josa(g.label(tg), '을/를')} 살해합니다!`, 'master_power', '1회. 대상을 정체·목숨·보디가드와 무관하게 살해한다.'),

  // 케인
  kane_moon_protection: passive('kane_moon_protection', '문 프로텍션', 'A01F', '케인은 일반 공격을 2번 맞아야 사망한다.'),
  kane_wolfs_slash: {
    key: 'kane_wolfs_slash', name: '울프스 슬러쉬', code: 'A01G', hotkey: 'Z', mana: 60, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 이름을 맞힐 필요 없이 대상을 즉시 1회 공격한다(보디가드 무시, 목숨이 남으면 1 감소). 사용하면 케인의 정체가 모두에게 공개된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const name = g.charName(tg.character);
      if (tg.extraLives > 0) {
        const remaining = tg.extraLives;
        tg.extraLives -= 1;
        g.toAll('attack.hit', `-케인이 울프스 슬러쉬를 시전하여 ${josa(name, '을/를')} 공격합니다!`, { attacker: 'kane', target: tg.character, remaining });
        g.toAll('attack.lives', `-${josa(name, '은/는')} ${remaining}회 더 공격받으면 사망합니다.`, { target: tg.character, remaining });
      } else {
        g.toAll('attack.kill', `-케인이 울프스 슬러쉬를 시전하여 ${josa(name, '을/를')} 살해합니다!`, { attacker: 'kane', target: tg.character });
        g.kill(tg, 'wolfs_slash');
      }
      if (!g.ended) {
        g.revealPublic(actor);
        g.toAll('reveal', `-케인은 ${josa(g.label(actor), '이다/다')}!`, { player: actor.id, character: 'kane' });
      }
    },
  },

  // 에오릴
  eoril_queens_eye: passive('eoril_queens_eye', '여왕의 눈', 'A01P', '킬데르가 카사노바를 쓰면 에오릴은 그 대상을 항상 통보받는다. 에오릴이 진명을 공표 중이면 킬데르의 정체까지 알게 된다.'),
  eoril_flame_shackle: {
    key: 'eoril_flame_shackle', name: '플레임 쉐클', code: 'A01K', hotkey: 'Z', mana: 30, cooldown: 120, uses: null, target: 'player',
    description: '대상을 45초 동안 행동 불능으로 만든다. 시전자는 공개되지 않는다.',
    resolve(c) {
      const { g } = c;
      const tg = t(c);
      g.addEffect(tg, 'incapacitated', 45, 'eoril_flame_shackle', true);
      g.toAll('status.incapacitated', `누군가가 ${g.label(tg)}에게 행동 불능 주문을 시전하였습니다.`, { target: tg.id, seconds: 45 });
      g.toPlayer(tg, 'status.incapacitated.self', '행동 불능 상태가 되었습니다. (45초)');
    },
  },
  eoril_trial: {
    key: 'eoril_trial', name: '시련', code: 'A01N', hotkey: 'X', mana: 60, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 라엘이면 1분 후 라엘이 에오릴의 시험 스킬을 얻는다. 실패해도 소멸한다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'rael') {
        g.toAll('skill.eoril_trial', '-에오릴이 라엘에게 시련을 부여하였습니다.');
        g.toPlayer(actor, 'skill.eoril_trial.self', `-비공개: ${josa(g.label(tg), '은/는')} 라엘이다.`, { target: tg.id }, [{ player: tg.id, character: 'rael' }]);
        g.toPlayer(tg, 'skill.eoril_trial.target', '-비공개: 1분 후 에오릴의 시험 스킬을 획득합니다.', {}, [{ player: actor.id, character: 'eoril' }]);
        g.schedule(g.now + 60_000, 'unlock', { player: tg.id, skill: 'rael_eoril_test' });
      } else {
        g.toPlayer(actor, 'skill.eoril_trial.fail', '-비공개: 그 대상은 라엘이 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'rael' }]);
      }
    },
  },
  eoril_phoenix_flame: {
    key: 'eoril_phoenix_flame', name: '피닉스의 불꽃', code: 'A01O', hotkey: 'C', mana: 10, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 레지스턴스가 없는 컨슘이면 살해한다(목숨·보디가드 무시). 성공·실패 모두 에오릴의 사용 사실이 공개된다.',
    resolve(c) {
      const { g } = c;
      const tg = t(c);
      if (tg.character === 'consume' && g.hasSkill(tg, 'consume_resistance')) {
        g.toAll('skill.eoril_phoenix_flame.fail', `-에오릴이 ${g.label(tg)}에게 피닉스의 불꽃을 시전하였으나 실패했습니다. -컨슘은 플레임 레지스턴스를 가지고 있습니다.`, { target: tg.id });
      } else if (tg.character === 'consume') {
        g.toAll('skill.eoril_phoenix_flame', '-에오릴이 컨슘에게 피닉스의 불꽃을 시전하여 살해합니다.', { target: tg.id });
        g.kill(tg, 'phoenix_flame');
      } else {
        g.toAll('skill.eoril_phoenix_flame.fail', `-에오릴이 ${g.label(tg)}에게 피닉스의 불꽃을 시전하였으나 실패했습니다.`, { target: tg.id });
      }
    },
  },

  // 뉴켈리어스
  nukelius_chakra_magic: {
    key: 'nukelius_chakra_magic', name: '차크라 매직', code: 'A01Q', hotkey: 'Z', mana: 20, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상의 마나를 100 회복한다. 60초 후 뉴켈리어스의 정체가 모두에게 공개된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.addMana(tg, 100);
      g.toAll('skill.nukelius_chakra_magic', '-뉴켈리어스가 차크라 매직을 시전합니다. - 이 마법에 영향을 받은 영웅의 마나가 100 회복됩니다. - 60초 후 뉴켈리어스의 정체가 드러납니다.');
      g.toPlayer(tg, 'skill.nukelius_chakra_magic.target', '-비공개: 뉴켈리어스가 당신에게 차크라 매직을 시전합니다.', {}, [{ player: actor.id, character: 'nukelius' }]);
      g.schedule(g.now + 60_000, 'reveal', { player: actor.id, text: `-뉴켈리어스의 정체는 ${josa(g.label(actor), '이다/다')}!` });
    },
  },

  // 타친
  tachin_troll_regen: passive('tachin_troll_regen', '트롤 리제너레이션', 'A01T', '타친은 일반 공격을 2번 맞아야 사망한다.'),
  tachin_union: probe('tachin_union', '연합 결성', 'A01R', 'kumarin', '쿠마린'),
  tachin_neutralize: {
    key: 'tachin_neutralize', name: '중화의 주술', code: 'A01U', hotkey: 'X', mana: 50, cooldown: 0, uses: 1, target: 'player', ignoresInvulnerable: true,
    description: '1회. 대상에게 걸린 효과를 전부 제거한다(행동 불능 해제, 시잉 오브 리비도 무산). 시전 사실이 공개된다.',
    resolve(c) {
      const { g } = c;
      const tg = t(c);
      tg.effects = [];
      delete tg.flags.seeingLibido;
      g.toAll('skill.tachin_neutralize', `-타친이 ${g.label(tg)}에게 중화의 주술을 시전하였습니다.`, { target: tg.id });
      g.toPlayer(tg, 'status.recovered', '-비공개: 걸려 있던 효과가 모두 사라졌습니다.');
    },
  },

  // 쿠마린
  kumarin_union: probe('kumarin_union', '연합 결성', 'A01S', 'tachin', '타친'),
  kumarin_binding: {
    key: 'kumarin_binding', name: '포박의 주술', code: 'A01V', hotkey: 'X', mana: 10, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 레지스턴스를 가지고 있으면 없앤다. 성공·실패 모두 공개되며 소멸한다.',
    resolve(c) {
      const { g } = c;
      const tg = t(c);
      if (g.hasSkill(tg, 'consume_resistance')) {
        g.removeSkill(tg, 'consume_resistance');
        g.toAll('skill.kumarin_binding', '-쿠마린이 컨슘에게 포박의 주술을 시전하였습니다. -컨슘의 레지스턴스 능력이 소멸했습니다.', { target: tg.id });
      } else {
        g.toAll('skill.kumarin_binding.fail', `-쿠마린이 ${g.label(tg)}에게 포박의 주술을 시전하였으나 실패했습니다.`, { target: tg.id });
      }
    },
  },
  kumarin_commander_guard: {
    key: 'kumarin_commander_guard', name: '지휘관 보호', code: 'A01W', hotkey: 'C', mana: 50, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 라엘이면 쿠마린이 살아 있는 동안 라엘에게 오는 정답 공격을 2번 막는다. 실패해도 소멸한다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'rael') {
        g.grantSkill(actor, 'kumarin_bodyguard');
        actor.flags.guardCharges = 2;
        g.toAll('skill.kumarin_commander_guard', '-쿠마린이 라엘을 보호하기 시작합니다! -라엘에게 향하는 2번의 공격을 방어합니다!');
        g.toPlayer(actor, 'skill.kumarin_commander_guard.self', `-비공개: ${josa(g.label(tg), '은/는')} 라엘이다.`, { target: tg.id }, [{ player: tg.id, character: 'rael' }]);
      } else {
        g.toPlayer(actor, 'skill.kumarin_commander_guard.fail', '-비공개: 그 대상은 라엘이 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'rael' }]);
      }
    },
  },
  kumarin_bodyguard: passive('kumarin_bodyguard', '보디가드', 'A01X', '쿠마린이 살아 있는 동안 라엘에게 오는 정답 공격을 2번 막는다.'),

  // 엘타스
  eltas_leadership: leadership('eltas_leadership', '리더쉽', 'A021', 'eltas', '1회. 진명(엘타스)을 공표하고 있어야 사용 가능. 다크니스 이름 하나를 골라 그 캐릭터가 누구인지 알아낸다.'),
  eltas_adv_leadership: leadership('eltas_adv_leadership', '상급 리더쉽', 'A02G', null, '(6분 시점까지 리더쉽을 쓰지 않았으면 대체 획득) 1회. 진명 조건 없이 다크니스 이름 하나를 골라 누구인지 알아낸다.'),
  eltas_shield: passive('eltas_shield', '엘타스의 방패', 'A020', '엘타스는 일반 공격을 3번 맞아야 사망한다.'),
  eltas_bloody_heart: passive('eltas_bloody_heart', '블러디 하트', 'S006', '적에게 이름 공격을 성공할 때마다(목숨만 깎아도) 마나 30을 회복한다.'),

  // 사신트
  sasint_support: {
    key: 'sasint_support', name: '지원', code: 'A00G', hotkey: 'Z', mana: 10, cooldown: 90, uses: null, target: 'player',
    description: '대상의 마나를 30 회복한다. 누군가를 지원했다는 사실만 공개된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.addMana(tg, 30);
      g.toAll('skill.sasint_support', '-사신트가 누군가를 지원하고 있습니다.');
      g.toPlayer(actor, 'skill.sasint_support.self', `-비공개: ${g.label(tg)}의 마나가 30 증가합니다.`, { target: tg.id });
      g.toPlayer(tg, 'skill.sasint_support.target', '-비공개: 사신트가 당신을 지원합니다. 마나가 30 증가합니다.', {}, [{ player: actor.id, character: 'sasint' }]);
    },
  },
  sasint_training: {
    key: 'sasint_training', name: '트레이닝', code: 'A00I', hotkey: 'X', mana: 40, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 컨슘이면 컨슘의 공격이 상급 공격으로 바뀐다. 실패해도 소멸한다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'consume') {
        g.removeSkill(tg, 'attack');
        if (!g.hasSkill(tg, 'advanced_attack')) g.grantSkill(tg, 'advanced_attack');
        g.toAll('skill.sasint_training', '-사신트가 컨슘을 훈련시키는 데 성공하였습니다. -컨슘이 상급공격 스킬을 획득하였습니다.');
        g.toPlayer(actor, 'skill.sasint_training.self', `-비공개: ${josa(g.label(tg), '은/는')} 컨슘이다.`, { target: tg.id }, [{ player: tg.id, character: 'consume' }]);
        g.toPlayer(tg, 'skill.grant', '-비공개: 상급 공격 스킬을 획득하였습니다.', { skill: 'advanced_attack' }, [{ player: actor.id, character: 'sasint' }]);
      } else {
        g.toPlayer(actor, 'skill.sasint_training.fail', '-비공개: 그 대상은 컨슘이 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'consume' }]);
      }
    },
  },
  sasint_battle_mastery: {
    key: 'sasint_battle_mastery', name: '배틀 마스터리', code: 'A02E', hotkey: 'C', mana: 50, cooldown: 0, uses: 1, target: 'none',
    description: '1회. 공격과 지원을 버리고 상급 공격을 얻는다. 시전 사실이 공개된다.',
    resolve(c) {
      const { g, actor } = c;
      g.removeSkill(actor, 'attack');
      g.removeSkill(actor, 'sasint_support');
      if (!g.hasSkill(actor, 'advanced_attack')) g.grantSkill(actor, 'advanced_attack');
      g.toAll('skill.sasint_battle_mastery', '-사신트가 배틀 마스터리를 익혔습니다! -상급 공격 스킬을 획득하였습니다.');
    },
  },

  // 킬데르
  kilder_vampiric: passive('kilder_vampiric', '뱀파이어릭', 'S004', '이름 공격으로 적을 살해하면 마나 50을 회복한다. 자신의 공격으로 에오릴을 살해하면 마스터의 권능을 얻는다.'),
  kilder_casanova: {
    key: 'kilder_casanova', name: '카사노바', code: 'A00Q', hotkey: 'Z', mana: 30, cooldown: 60, uses: null, target: 'player',
    description: '(2분 후 획득) 8초 후 대상이 에오릴인지 알아낸다. 에오릴은 그때마다 대상을 통보받고, 진명을 공표 중이면 킬데르의 정체도 알게 된다. 킬데르 이름을 공표한 대상에게는 쓸 수 없다.',
    precheck: ({ target }) => (target && target.published === 'kilder' ? '킬데르의 이름을 공표한 사람에게 사용할 수 없습니다.' : null),
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const eoril = g.byChar('eoril');
      if (eoril) {
        if (eoril.published === 'eoril') {
          g.toPlayer(eoril, 'skill.kilder_casanova.eye', `-비공개: 뱀파이어의 정체는 ${josa(g.label(actor), '이다/다')}!`, {}, [{ player: actor.id, character: 'kilder' }]);
        }
        g.toPlayer(eoril, 'skill.kilder_casanova.eye', `-비공개: 뱀파이어가 ${g.label(tg)}에게서 당신의 흔적을 찾고 있습니다.`, { target: tg.id });
        if (tg.id === eoril.id) g.toPlayer(eoril, 'skill.kilder_casanova.eye', '-비공개: 당신의 정체가 킬데르에게 드러났습니다!');
      }
      g.schedule(g.now + 8_000, 'mode', { kind: 'casanova', actor: actor.id, target: tg.id });
    },
  },
  kilder_master_power: execute('kilder_master_power', '마스터의 권능', 'A00N', 'C', 10, 0, 1, (g, _a, tg) => `-킬데르가 마스터의 권능으로 ${josa(g.label(tg), '을/를')} 살해합니다!`, 'master_power', '(에오릴 흡수 후 획득) 1회. 대상을 정체·목숨·보디가드와 무관하게 살해한다.'),

  // 드라칸
  drakan_black_spell: {
    key: 'drakan_black_spell', name: '블랙 스펠', code: 'A02D', hotkey: 'Z', mana: 80, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상의 마나를 50 줄이고 100초 동안 행동 불능으로 만든다. 시전 사실이 공개된다.',
    resolve(c) {
      const { g } = c;
      const tg = t(c);
      g.addMana(tg, -50);
      g.addEffect(tg, 'incapacitated', 100, 'drakan_black_spell', true);
      g.toAll('skill.drakan_black_spell', `-드라칸이 ${g.label(tg)}에게 블랙 스펠을 시전하였습니다. -${g.label(tg)}의 마나가 50 감소하였습니다.`, { target: tg.id, seconds: 100 });
      g.toPlayer(tg, 'status.incapacitated.self', '행동 불능 상태가 되었습니다. (100초)');
    },
  },
  drakan_enchant_muscle: {
    key: 'drakan_enchant_muscle', name: '인챈트먼트 머슬', code: 'A026', hotkey: 'C', mana: 40, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 컨슘이면 아이언 스킨을 부여해 3번 맞아야 죽게 한다. 실패해도 소멸한다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'consume') {
        g.grantSkill(tg, 'consume_iron_skin');
        tg.extraLives = 2;
        g.toAll('skill.drakan_enchant_muscle', '-드라칸이 컨슘에게 인챈트먼트 머슬을 시전하였습니다. -컨슘이 아이언 스킨을 획득하였습니다.');
        g.toPlayer(actor, 'skill.drakan_enchant_muscle.self', `-비공개: ${josa(g.label(tg), '은/는')} 컨슘이다.`, { target: tg.id }, [{ player: tg.id, character: 'consume' }]);
        g.toPlayer(tg, 'skill.grant', '-비공개: 아이언 스킨 스킬을 획득하였습니다.', { skill: 'consume_iron_skin' }, [{ player: actor.id, character: 'drakan' }]);
      } else {
        g.toPlayer(actor, 'skill.drakan_enchant_muscle.fail', '-비공개: 그 대상은 컨슘이 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'consume' }]);
      }
    },
  },

  // 허밀리
  hermilly_seeing_libido: {
    key: 'hermilly_seeing_libido', name: '시잉 오브 리비도', code: 'A02C', hotkey: 'Z', mana: 40, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상을 35초 동안 무적(스킬 대상 불가)으로 만들고, 30초 뒤까지 효과가 남아 있으면 대상의 정체를 알아낸다. 중화의 주술로 무산된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const eff = g.addEffect(tg, 'invulnerable', 35, 'hermilly_seeing_libido', true);
      g.toAll('skill.hermilly_seeing_libido', `-허밀리가 ${g.label(tg)}에게 시잉 오브 리비도를 시전하였습니다.`, { target: tg.id, seconds: 35 });
      g.schedule(g.now + 30_000, 'mode', { kind: 'seeing', actor: actor.id, target: tg.id, effect: eff.id });
    },
  },
  hermilly_libido_protection: {
    key: 'hermilly_libido_protection', name: '리비도의 보호', code: 'A024', hotkey: 'V', mana: 30, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 컨슘이면 레지스턴스를 부여한다(피닉스의 불꽃 무효). 실패해도 소멸한다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'consume') {
        g.grantSkill(tg, 'consume_resistance');
        g.toAll('skill.hermilly_libido_protection', '-허밀리가 컨슘에게 리비도의 보호를 시전하였습니다. -컨슘이 레지스턴스를 획득하였습니다.');
        g.toPlayer(actor, 'skill.hermilly_libido_protection.self', `-비공개: ${josa(g.label(tg), '은/는')} 컨슘이다.`, { target: tg.id }, [{ player: tg.id, character: 'consume' }]);
        g.toPlayer(tg, 'skill.grant', '-비공개: 레지스턴스 스킬을 획득하였습니다.', { skill: 'consume_resistance' }, [{ player: actor.id, character: 'hermilly' }]);
      } else {
        g.toPlayer(actor, 'skill.hermilly_libido_protection.fail', '-비공개: 그 대상은 컨슘이 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'consume' }]);
      }
    },
  },

  // 컨슘
  consume_slave_instinct: probe('consume_slave_instinct', '노예 본능', 'A02B', 'eltas', '엘타스'),
  consume_master_guard: {
    key: 'consume_master_guard', name: '주인 보호', code: 'A027', hotkey: 'X', mana: 50, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 엘타스면 컨슘이 살아 있는 동안 엘타스에게 오는 정답 공격을 2번 막는다. 실패해도 소멸한다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'eltas') {
        g.grantSkill(actor, 'consume_bodyguard');
        actor.flags.guardCharges = 2;
        g.toAll('skill.consume_master_guard', '-컨슘이 엘타스를 보호하기 시작합니다! -엘타스에게 향하는 2번의 공격을 방어합니다!');
        g.toPlayer(actor, 'skill.consume_master_guard.self', `-비공개: ${josa(g.label(tg), '은/는')} 엘타스다.`, { target: tg.id }, [{ player: tg.id, character: 'eltas' }]);
      } else {
        g.toPlayer(actor, 'skill.consume_master_guard.fail', '-비공개: 그 대상은 엘타스가 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'eltas' }]);
      }
    },
  },
  consume_bodyguard: passive('consume_bodyguard', '보디가드', 'S005', '컨슘이 살아 있는 동안 엘타스에게 오는 정답 공격을 2번 막는다.'),
  consume_resistance: passive('consume_resistance', '레지스턴스', 'A01Y', '피닉스의 불꽃에 죽지 않는다. 포박의 주술로 사라진다.'),
  consume_iron_skin: passive('consume_iron_skin', '아이언 스킨', 'A028', '컨슘은 일반 공격을 3번 맞아야 사망한다.'),
  consume_final_evolution: {
    key: 'consume_final_evolution', name: '최종 진화', code: 'A029', hotkey: 'F', mana: 50, cooldown: 0, uses: 1, target: 'none',
    description: '1회. 레지스턴스·아이언 스킨·상급 공격을 모두 갖추고 있으면 학살을 얻는다. 실패해도 소멸한다.',
    resolve(c) {
      const { g, actor } = c;
      if (g.hasSkill(actor, 'consume_resistance') && g.hasSkill(actor, 'consume_iron_skin') && g.hasSkill(actor, 'advanced_attack')) {
        g.grantSkill(actor, 'consume_slaughter');
        g.toAll('skill.consume_final_evolution', '-컨슘이 최종 진화에 성공하였습니다! -학살의 시간이 다가왔습니다.');
      } else {
        g.toPlayer(actor, 'skill.consume_final_evolution.fail', '-비공개: 진화에 실패하였습니다. (레지스턴스·아이언 스킨·상급 공격이 모두 필요합니다)');
      }
    },
  },
  consume_slaughter: execute('consume_slaughter', '학살', 'A02A', 'V', 10, 30, null, (g, _a, tg) => `-컨슘이 학살을 시작합니다! ${josa(g.label(tg), '이/가')} 살해당했습니다.`, 'slaughter', '(최종 진화 후 획득) 대상을 정체·목숨·보디가드와 무관하게 살해한다.'),
};

// ───────────── 승리 판정 (원본 wb: sb → Sb) ─────────────

function checkVictory(g: Game): void {
  if (g.ended) return;
  if (!g.charAlive('rael') && !g.charAlive('kane')) {
    g.endGame(2, '다크니스측이 승리했습니다.');
    return;
  }
  if (!g.charAlive('eltas')) g.endGame(1, '지상 연합측이 승리했습니다.');
}

export const primordial: ModeDef = {
  id: 'primordial',
  displayName: '태초의 전쟁',
  sideNames: { 1: '지상 연합', 2: '다크니스' },
  characters,
  masks: {
    12: '111111111111',
    11: '111111111110',
    10: '111110111110',
    9: '111110111100',
    8: '111100101110',
  },
  skills,
  globalChat: { characters: ['nukelius', 'drakan'], mana: 25, anonymous: true },
  disguises: [],
  hiddenFromChecks: [],
  scanExcludes: ['rael', 'eltas'],
  isAbsolutelyGuarded: () => false,
  chargedGuard(g, attacker, target) {
    if (target.character === 'eltas') return guardedBy(g, 'consume', 'consume_bodyguard', attacker, '엘타스');
    if (target.character === 'rael') return guardedBy(g, 'kumarin', 'kumarin_bodyguard', attacker, '라엘');
    return null;
  },
  onAttackKill(g, attacker, target) {
    if (attacker.character === 'kilder' && target.character === 'eoril') {
      g.removeSkill(attacker, 'kilder_casanova');
      if (!g.hasSkill(attacker, 'kilder_master_power')) g.grantSkill(attacker, 'kilder_master_power');
      g.toAll('skill.kilder_absorb', '-킬데르가 피닉스의 여왕이 가진 힘을 흡수하였습니다.');
      g.toPlayer(attacker, 'skill.grant', '-비공개: 마스터의 권능 스킬을 획득하였습니다.', { skill: 'kilder_master_power' });
    }
  },
  onTask(g, payload) {
    const actor = g.player(String(payload.actor));
    const target = g.player(String(payload.target));
    if (!actor || !target) return;
    if (payload.kind === 'casanova') {
      if (target.character === 'eoril') {
        g.toPlayer(actor, 'skill.kilder_casanova', `-비공개: ${josa(g.label(target), '은/는')} 에오릴이다!`, { target: target.id, success: true }, [{ player: target.id, character: 'eoril' }]);
      } else {
        g.toPlayer(actor, 'skill.kilder_casanova', `-비공개: ${josa(g.label(target), '은/는')} 에오릴이 아니다.`, { target: target.id, success: false }, [{ player: target.id, character: null, not: 'eoril' }]);
      }
    } else if (payload.kind === 'seeing') {
      const still = target.effects.some((e) => e.id === Number(payload.effect) && e.until > g.now);
      if (still) {
        g.toPlayer(actor, 'skill.hermilly_seeing_libido.result', `-비공개: ${josa(g.label(target), '은/는')} ${josa(g.charName(target.character), '이다/다')}!`, { target: target.id, success: true }, [{ player: target.id, character: target.character }]);
      }
    }
  },
  checkVictory,
};

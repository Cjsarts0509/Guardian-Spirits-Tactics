// 트롤 부족의 반란 (docs/spec/troll.md · troll.json, DECISIONS A1·A3·A4·B·G1·G2 반영)
import type { Game } from '../engine/game.js';
import { resolveScan } from '../engine/checks.js';
import { MAX_MANA } from '../constants.js';
import { josa } from '../text.js';
import type { CharKey, PlayerState } from '../types.js';
import type { CharacterDef, ModeDef, SkillCtx, SkillDef } from './types.js';

const BASE = ['publish', 'ally', 'break_ally'];
const T_ICE = '치스를 도와 그즐리카 트롤을 파멸시켜야 합니다.\n데카를 살해하면 승리합니다.';
const T_ICE_CORE = `${T_ICE}\n\n사토시·즈윈라·울디안이 모두 살해당하면 얼음 부족은 게임에서 패배합니다.`;
const T_REBEL = '데카를 도와 얼음 일족을 파멸시켜야 합니다.\n치스를 살해하면 승리합니다.';

const characters: CharacterDef[] = [
  {
    key: 'chis', name: '치스', title: '트롤 치프틴', unitId: 'H010', slot: 1, side: 1, commander: true, extraLives: 0,
    skills: [...BASE, 'troll_ally_scan', 'holy_binding', 'global_chat'],
    skillCodes: { global_chat: 'A025' },
    unlocks: [{ at: 180, skill: 'spirit_hex' }],
    objective: '그즐리카 트롤의 반란군을 패배시켜야 합니다.\n데카를 살해하면 승리합니다.\n\n당신이 살해당하면 얼음 일족은 게임에서 패배합니다.',
  },
  {
    key: 'satoshi', name: '사토시', title: '아이스 가드', unitId: 'H011', slot: 2, side: 1, commander: false, extraLives: 1,
    skills: [...BASE, 'advanced_attack', 'troll_regeneration', 'bodyguard_chief', 'brothers', 'chief_protection'],
    skillCodes: { advanced_attack: 'A003', brothers: 'A03C' },
    objective: T_ICE_CORE,
  },
  {
    key: 'zwinra', name: '즈윈라', title: '아이스 워로드', unitId: 'H012', slot: 3, side: 1, commander: false, extraLives: 1,
    skills: [...BASE, 'advanced_attack', 'troll_regeneration', 'brothers', 'bodyguard_chief'],
    skillCodes: { advanced_attack: 'A003', brothers: 'A03D' },
    unlocks: [{ at: 180, skill: 'chief_search' }],
    objective: T_ICE_CORE,
  },
  {
    key: 'hachi', name: '하치', title: '엘더 헤드헌터', unitId: 'H013', slot: 4, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'troll_venom', 'ancient_hex_hachi', 'hide', 'hunters_mark'],
    objective: T_ICE,
  },
  {
    key: 'tokra', name: '토크라', title: '아이스 샤먼', unitId: 'H014', slot: 5, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'support', 'troll_scan'],
    skillCodes: { support: 'A02U' },
    unlocks: [{ at: 120, skill: 'wild_essence' }],
    objective: T_ICE,
  },
  {
    key: 'uldian', name: '울디안', title: '와일드 휴먼', unitId: 'H015', slot: 6, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'attack', 'ally_check', 'wild_bond', 'wild_path'],
    skillCodes: { attack: 'A002', ally_check: 'A009' },
    objective: T_ICE_CORE,
  },
  {
    key: 'ulpian', name: '울피안', title: '와일드 휴먼', unitId: 'H016', slot: 7, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'enemy_check', 'wild_bond', 'purify_hex'],
    skillCodes: { enemy_check: 'A008' },
    objective: T_ICE,
  },
  {
    key: 'deka', name: '데카', title: '트롤 버서커', unitId: 'H017', slot: 8, side: 2, commander: true, extraLives: 0,
    skills: [...BASE, 'supreme_attack', 'advanced_ally_check', 'bloody_madness'],
    skillCodes: { supreme_attack: 'A01Z', advanced_ally_check: 'A02J' },
    objective: '얼음 일족을 파멸시켜야 합니다.\n치스를 살해하면 승리합니다.\n\n당신이 살해당하면 그즐리카 트롤은 게임에서 패배합니다.',
  },
  {
    key: 'neonis', name: '네오니스', title: '쉐도우 시프', unitId: 'H018', slot: 9, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'attack', 'enemy_check', 'global_chat', 'support', 'disguise', 'neviathan_avatar'],
    skillCodes: { attack: 'A002', enemy_check: 'A008', global_chat: 'A025', support: 'A03X' },
    objective: T_REBEL,
  },
  {
    key: 'kanulla', name: "카'눌라", title: '카오스 샤먼', unitId: 'H019', slot: 10, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'troll_enemy_scan', 'chaos_hex', 'destroyer_guidance'],
    objective: T_REBEL,
  },
  {
    key: 'kazrow', name: '카즈로우', title: '카오스 어설트', unitId: 'H01A', slot: 11, side: 2, commander: false, extraLives: 1,
    skills: [...BASE, 'advanced_attack', 'berserk_kazrow', 'reckless_charge', 'assault_bond', 'dark_skin'],
    skillCodes: { advanced_attack: 'A003', dark_skin: 'S00B' },
    objective: T_REBEL,
  },
  {
    key: 'seirow', name: '세이로우', title: '파나틱 어설트', unitId: 'H01B', slot: 12, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'advanced_ally_check', 'berserk_seirow', 'battle_sense', 'reckless_charge', 'assault_bond'],
    skillCodes: { advanced_ally_check: 'A02J' },
    objective: T_REBEL,
  },
];

// ───────────── 헬퍼 ─────────────

const t = (c: SkillCtx): PlayerState => c.target as PlayerState;
const passive = (key: string, name: string, code: string, description: string): SkillDef => ({
  key, name, code, mana: 0, cooldown: 0, uses: null, target: 'none', passive: true, description,
});
const trueName = ({ actor }: SkillCtx): string | null => (actor.published !== actor.character ? '자신의 진명을 공표하고 있어야 합니다.' : null);
const REBELS: CharKey[] = ['deka', 'neonis', 'kanulla', 'kazrow', 'seirow'];
const BERSERK_TEXT = '-누군가가 광폭화 스킬을 사용하였습니다!';

/** 치스의 정체를 알려주는 지연 결과 (족장 탐색·야생의 길) */
function tellChief(g: Game, p: PlayerState): void {
  const chis = g.byChar('chis');
  if (!chis) return;
  g.toPlayer(p, 'skill.chief_found', `-비공개: 치스는 ${g.label(chis)}입니다!`, { target: chis.id }, [{ player: chis.id, character: 'chis' }]);
}

/** 공통 스캔 판정을 그대로 쓰고 이름 목록·코드만 바꾼 스캔 */
function scanLike(key: string, name: string, code: string, description: string, nameOptions: SkillDef['nameOptions']): SkillDef {
  return { key, name, code, hotkey: 'D', mana: 20, cooldown: 40, uses: null, target: 'player+name', description, nameOptions, resolve: resolveScan };
}

// ───────────── 고유 스킬 ─────────────

const skills: Record<string, SkillDef> = {
  // 공통 스캔의 트롤판 (이름 목록만 다르다)
  troll_ally_scan: scanLike('troll_ally_scan', '아군 스캔', 'A015', '얼음 부족 이름(치스 제외) 중에서 골라 스캔한다. 하치는 맞힐 수 없다.', (g, actor) => g.sideRoster(actor.side).filter((c) => !c.commander).map((c) => c.key)),
  troll_scan: scanLike('troll_scan', '스캔', 'A02Q', '대상과 이름을 골라 스캔한다. 치스·데카·하치는 고를 수 없거나 맞힐 수 없다.', (g) => g.rosterInGame().filter((c) => !c.commander).map((c) => c.key)),
  troll_enemy_scan: scanLike('troll_enemy_scan', '적군 스캔', 'A03T', '얼음 부족 이름(치스 제외) 중에서 골라 스캔한다. 하치는 맞힐 수 없다.', (g, actor) => g.sideRoster(actor.side === 1 ? 2 : 1).filter((c) => !c.commander).map((c) => c.key)),

  // 치스
  holy_binding: {
    key: 'holy_binding', name: '홀리 바인딩', code: 'A03J', hotkey: 'X', mana: 60, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 데카면 정체를 모두에게 공개하고 블러디 매드니스를 없앤다(광폭화 상태면 마나 −80). 성공·실패 모두 공개된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.toAll('skill.holy_binding', `-치스가 ${g.label(tg)}에게 홀리 바인딩을 시전합니다!`, { target: tg.id });
      if (tg.character === 'deka') {
        g.revealPublic(tg);
        g.toAll('reveal', `-데카는 ${josa(g.label(tg), '이다/다')}!`, { player: tg.id, character: 'deka' });
        if (g.hasSkill(tg, 'berserk_deka')) {
          g.addMana(tg, -80);
          g.toAll('skill.holy_binding.mana', '-데카의 마나가 80 감소합니다!', { target: tg.id });
        } else {
          g.removeSkill(tg, 'bloody_madness');
          g.toAll('skill.holy_binding.purge', '-데카의 블러디 매드니스가 정화되어 사라졌습니다!', { target: tg.id });
        }
      } else {
        g.toAll('skill.holy_binding.fail', `-${josa(g.label(tg), '은/는')} 데카가 아닙니다!`, { target: tg.id });
        g.toPlayer(actor, 'skill.holy_binding.fail.self', '-비공개: 그 대상은 데카가 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'deka' }]);
      }
    },
  },
  spirit_hex: {
    key: 'spirit_hex', name: '정령의 주술', code: 'A03P', hotkey: 'C', mana: 40, cooldown: 60, uses: null, target: 'player',
    description: '(3분 후 획득) 진명을 공표하고 있어야 사용 가능. 대상이 반란자이고 진실의 조각·보석을 하나도 갖고 있지 않으면 정체를 알아낸다.',
    precheck: trueName,
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.toAll('skill.spirit_hex', '-치스가 누군가에게 정령의 주술을 시전하였습니다.');
      g.toPlayer(tg, 'skill.spirit_hex.target', '-비공개: 치스가 당신에게 정령의 주술을 사용하였습니다!');
      if (tg.side === 2 && tg.gem === 0) {
        g.toPlayer(actor, 'skill.spirit_hex.result', `-비공개: 주술이 성공하였습니다. ${josa(g.label(tg), '은/는')} ${josa(g.charName(tg.character), '이다/다')}.`, { target: tg.id, success: true }, [{ player: tg.id, character: tg.character }]);
      } else {
        g.toPlayer(actor, 'skill.spirit_hex.result', '-비공개: 정령의 주술이 실패했습니다.', { target: tg.id, success: false });
      }
    },
  },

  // 사토시·즈윈라
  troll_regeneration: passive('troll_regeneration', '트롤 리제너레이션', 'A010', '일반 공격을 2번 맞아야 사망한다.'),
  bodyguard_chief: passive('bodyguard_chief', '보디가드', 'A022', '사토시 또는 즈윈라 중 한 명이라도 살아 있으면 치스는 일반 공격으로 죽지 않는다 (정답 공격자는 실패 처리). 즉사기는 막지 못한다.'),
  brothers: {
    key: 'brothers', name: '형제', code: 'A03C', hotkey: 'Z', mana: 35, cooldown: 40, uses: null, target: 'player',
    description: '사토시는 즈윈라에게, 즈윈라는 사토시에게 써서 맞히면 둘이 서로 동맹이 되고 둘 다 아군 확인을 얻는다 (양쪽의 형제 스킬 소멸).',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const want: CharKey = actor.character === 'satoshi' ? 'zwinra' : 'satoshi';
      if (tg.character === want) {
        g.setAlly(actor, tg, true);
        g.setAlly(tg, actor, true);
        g.toPlayer(actor, 'skill.brothers', `-비공개: ${josa(g.charName(want), '과/와')} 당신이 동맹이 되었습니다! ${josa(g.charName(want), '은/는')} ${josa(g.label(tg), '이다/다')}.`, { target: tg.id }, [{ player: tg.id, character: want }]);
        g.toPlayer(tg, 'skill.brothers', `-비공개: ${josa(g.charName(actor.character), '과/와')} 당신이 동맹이 되었습니다! ${josa(g.charName(actor.character), '은/는')} ${josa(g.label(actor), '이다/다')}.`, { target: actor.id }, [{ player: actor.id, character: actor.character }]);
        for (const p of [actor, tg]) {
          g.removeSkill(p, 'brothers');
          if (!g.hasSkill(p, 'ally_check')) {
            g.grantSkill(p, 'ally_check');
            g.toPlayer(p, 'skill.grant', '-비공개: 아군 확인 스킬을 획득하였습니다.', { skill: 'ally_check' });
          }
        }
      } else {
        g.toPlayer(actor, 'skill.brothers.fail', `-비공개: ${josa(g.label(tg), '은/는')} ${josa(g.charName(want), '이/가')} 아닙니다.`, { target: tg.id }, [{ player: tg.id, character: null, not: want }]);
      }
    },
  },
  chief_protection: {
    key: 'chief_protection', name: '족장 보호', code: 'A03F', hotkey: 'V', mana: 40, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 치스면 공개적으로 보호를 선언한다. 이후 사토시가 살아 있는 동안 치스를 향한 무모한 돌진을 모두 막는다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'chis') {
        g.state.modeState.chiefProtected = true;
        g.toAll('skill.chief_protection', '-사토시가 치스를 보호하기 시작합니다! 치스에게 향하는 무모한 돌진을 방어합니다!');
        g.toPlayer(actor, 'skill.chief_protection.self', `-비공개: 치스는 ${josa(g.label(tg), '이다/다')}.`, { target: tg.id }, [{ player: tg.id, character: 'chis' }]);
      } else {
        g.toPlayer(actor, 'skill.chief_protection.fail', '-비공개: 그 대상은 치스가 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'chis' }]);
      }
    },
  },
  chief_search: {
    key: 'chief_search', name: '족장 탐색', code: 'A044', hotkey: 'V', mana: 50, cooldown: 0, uses: 1, target: 'none',
    description: '(3분 후 획득) 1회. 진명을 공표하고 있어야 사용 가능. 60초 후 치스가 누구인지 알게 된다.',
    precheck: trueName,
    resolve({ g, actor }) {
      g.toPlayer(actor, 'skill.chief_search.self', '-비공개: 족장을 찾기 시작합니다. 60초 후 결과를 알 수 있습니다.');
      g.schedule(g.now + 60_000, 'mode', { kind: 'chiefSearch', player: actor.id });
    },
  },

  // 하치
  hide: passive('hide', '하이드', 'A033', '아군·적군 확인은 하치에게 항상 실패하고, 스캔에서 하치 이름을 고르면 항상 실패한다.'),
  troll_venom: {
    key: 'troll_venom', name: '트롤 부족의 맹독', code: 'A03G', hotkey: 'Z', mana: 20, cooldown: 70, uses: null, target: 'player',
    description: '대상의 마나를 30 감소시킨다. 시전 사실이 공개된다.',
    resolve(c) {
      const { g } = c;
      const tg = t(c);
      g.addMana(tg, -30);
      g.toAll('skill.troll_venom', `-하치가 ${g.label(tg)}에게 트롤 부족의 맹독을 시전하였습니다. ${g.label(tg)}의 마나가 30 감소하였습니다.`, { target: tg.id });
    },
  },
  ancient_hex_hachi: {
    key: 'ancient_hex_hachi', name: '고대의 주술', code: 'A03I', hotkey: 'X', mana: 50, cooldown: 150, uses: null, target: 'none',
    description: '자신의 진실의 조각을 한 단계 올린다(1/3 → 2/3 → 완성). 조각이 없거나 이미 완성이면 쓸 수 없다. 시전 사실이 공개된다.',
    precheck: ({ actor }) => (actor.gem === 0 ? '진실의 보석이 없으면 사용할 수 없습니다.' : actor.gem >= 3 ? '더 이상 등급을 상승시킬 수 없습니다.' : null),
    resolve({ g, actor }) {
      actor.gem = (actor.gem + 1) as 1 | 2 | 3;
      g.toAll('skill.ancient_hex', '-하치가 고대의 주술을 사용하여 소유한 진실의 보석의 등급을 한 단계 올렸습니다!');
      g.toPlayer(actor, 'skill.ancient_hex.self', `-비공개: 진실의 보석이 ${['', '조각 1/3', '조각 2/3', '완성'][actor.gem]} 이 되었습니다.`, { gem: actor.gem });
    },
  },
  hunters_mark: {
    key: 'hunters_mark', name: '사냥꾼의 표식', code: 'A03U', hotkey: 'A', mana: 50, cooldown: 60, uses: null, target: 'player+name',
    description: '대상과 반란자 이름을 골라 맞히면 대상의 정체가 모두에게 공개된다. 틀리면 하치 자신의 정체가 모두에게 공개된다.',
    nameOptions: (g) => REBELS.filter((k) => g.charInGame(k)),
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const name = c.name as CharKey;
      if (tg.character === name) {
        g.revealPublic(tg);
        g.toAll('reveal', `-사냥꾼의 표식이 새겨져 ${g.label(tg)}의 정체가 공개되었습니다! 그는 ${josa(g.charName(name), '이다/다').replace(/이다$/, '이었다').replace(/다$/, '였다')}!`, { player: tg.id, character: name });
      } else {
        g.revealPublic(actor);
        g.toAll('reveal', `-사냥꾼의 표식이 실패하여 하치의 정체가 드러납니다! 하치의 정체는 ${josa(g.label(actor), '이다/다')}!`, { player: actor.id, character: 'hachi' });
        g.toPlayer(actor, 'skill.hunters_mark.fail', `-비공개: ${josa(g.label(tg), '은/는')} ${josa(g.charName(name), '이/가')} 아닙니다.`, { target: tg.id }, [{ player: tg.id, character: null, not: name }]);
      }
    },
  },

  // 토크라·네오니스
  support: {
    key: 'support', name: '지원', code: 'A02U', hotkey: 'Z', mana: 10, cooldown: 90, uses: null, target: 'player',
    description: '대상의 마나를 30 회복시킨다. 대상에게는 누군가의 지원이라고만 알려진다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.addMana(tg, 30);
      g.toPlayer(actor, 'skill.support.self', `-비공개: ${g.label(tg)}의 마나가 30 증가합니다.`, { target: tg.id });
      g.toPlayer(tg, 'skill.support.target', '-비공개: 누군가가 당신을 지원합니다. 당신의 마나가 30 증가합니다.');
    },
  },
  wild_essence: {
    key: 'wild_essence', name: '야생의 정기', code: 'A02X', hotkey: 'X', mana: 25, cooldown: 40, uses: null, target: 'player',
    description: '(2분 후 획득) 대상이 울디안이나 울피안이면 느낄 수 있다(둘 중 누구인지는 모른다). 성공하면 소멸하고 10초 후 야생의 축복을 얻는다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'uldian' || tg.character === 'ulpian') {
        g.toPlayer(actor, 'skill.wild_essence', `-비공개: ${g.label(tg)}에게서 야생의 기운이 느껴집니다! 10초 후 야생의 축복 스킬을 획득합니다!`, { target: tg.id, success: true });
        g.removeSkill(actor, 'wild_essence');
        g.schedule(g.now + 10_000, 'unlock', { player: actor.id, skill: 'wild_blessing' });
      } else {
        g.toPlayer(actor, 'skill.wild_essence', `-비공개: ${g.label(tg)}에게서는 야생의 기운이 느껴지지 않습니다.`, { target: tg.id, success: false }, [{ player: tg.id, character: null, not: 'uldian' }, { player: tg.id, character: null, not: 'ulpian' }]);
      }
    },
  },
  wild_blessing: {
    key: 'wild_blessing', name: '야생의 축복', code: 'A042', hotkey: 'X', mana: 70, cooldown: 90, uses: null, target: 'player',
    description: '대상이 울디안이면 공격이 상급 공격이 되고, 울피안이면 배틀 센스를 얻는다. 성공해도 남아 다른 한 명에게도 줄 수 있다. 실패하면 소멸한다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'uldian') {
        g.toAll('skill.wild_blessing', '-토크라가 누군가에게 야생의 축복을 시전하였습니다!');
        g.removeSkill(tg, 'attack');
        if (!g.hasSkill(tg, 'advanced_attack')) g.grantSkill(tg, 'advanced_attack');
        g.toPlayer(tg, 'skill.grant', '-비공개: 야생의 축복을 받아 상급 공격 스킬을 획득하였습니다!', { skill: 'advanced_attack' });
      } else if (tg.character === 'ulpian') {
        g.toAll('skill.wild_blessing', '-토크라가 누군가에게 야생의 축복을 시전하였습니다!');
        if (!g.hasSkill(tg, 'battle_sense')) g.grantSkill(tg, 'battle_sense');
        g.toPlayer(tg, 'skill.grant', '-비공개: 야생의 축복을 받아 배틀 센스 스킬을 획득하였습니다!', { skill: 'battle_sense' });
      } else {
        g.toAll('skill.wild_blessing.fail', '-토크라가 야생의 축복에 실패하였습니다!');
        g.removeSkill(actor, 'wild_blessing');
        g.toPlayer(actor, 'skill.wild_blessing.fail.self', `-비공개: ${josa(g.label(tg), '은/는')} 울디안도 울피안도 아닙니다. 야생의 축복을 잃었습니다.`, { target: tg.id }, [{ player: tg.id, character: null, not: 'uldian' }, { player: tg.id, character: null, not: 'ulpian' }]);
        return;
      }
      g.toPlayer(actor, 'skill.wild_blessing.self', `-비공개: ${josa(g.label(tg), '은/는')} ${josa(g.charName(tg.character), '이다/다')}.`, { target: tg.id }, [{ player: tg.id, character: tg.character }]);
    },
  },

  // 울디안·울피안
  wild_bond: passive('wild_bond', '야생의 결속', 'A02L', '울디안과 울피안은 시작부터 서로 동맹이다.'),
  wild_path: {
    key: 'wild_path', name: '야생의 길', code: 'A03O', hotkey: 'Z', mana: 50, cooldown: 0, uses: 1, target: 'none',
    description: '1회. 진명을 공표하고 있어야 사용 가능. 20초 후에도 진명을 유지하고 있으면 치스가 누구인지 알게 된다.',
    precheck: trueName,
    resolve({ g, actor }) {
      g.toPlayer(actor, 'skill.wild_path.self', '-비공개: 야생의 길을 걷기 시작합니다. 20초 동안 진명을 유지하면 치스를 알게 됩니다.');
      g.schedule(g.now + 20_000, 'mode', { kind: 'wildPath', player: actor.id });
    },
  },
  purify_hex: {
    key: 'purify_hex', name: '정화의 주술', code: 'A03Q', hotkey: 'Z', mana: 40, cooldown: 90, uses: 1, target: 'player',
    description: "1회. 대상이 카'눌라이거나, 가장 최근에 혼돈의 주술에 걸린 사람이면 즉시 살해한다(목숨·블러디 매드니스 무시). 성공·실패가 공개된다.",
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'kanulla' || g.state.modeState.chaosTarget === tg.id) {
        g.toAll('skill.purify_hex', `-울피안이 ${g.label(tg)}에게 정화의 주술을 시전하여 혼돈의 힘을 정화합니다!`, { target: tg.id });
        g.kill(tg, 'purify_hex');
      } else {
        g.toAll('skill.purify_hex.fail', `-울피안이 ${g.label(tg)}에게 정화의 주술을 시전하였으나 실패했습니다.`, { target: tg.id });
        g.toPlayer(actor, 'skill.purify_hex.fail.self', "-비공개: 그 대상은 카'눌라가 아닙니다.", { target: tg.id }, [{ player: tg.id, character: null, not: 'kanulla' }]);
      }
    },
  },

  // 데카
  bloody_madness: passive('bloody_madness', '블러디 매드니스', 'A03K', '마나가 25 이상이면 일반 공격을 맞아도 죽지 않고 마나 25를 잃는다 (횟수 무제한). 홀리 바인딩으로 사라진다.'),
  berserk_deka: passive('berserk_deka', '광폭화', 'A043', "(파괴자의 인도로 획득) 홀리 바인딩을 받아도 블러디 매드니스가 사라지지 않고 마나만 80 잃는다."),

  // 네오니스
  disguise: passive('disguise', '위장', 'S00A', '얼음 부족의 이름을 공표하고 있으면 얼음 부족의 아군 확인·스캔에 그 이름으로 성공한 것처럼 보인다. 적군 확인은 속이지 못한다.'),
  neviathan_avatar: {
    key: 'neviathan_avatar', name: '네비아탄의 화신', code: 'A03E', hotkey: 'C', mana: 0, cooldown: 30, uses: null, target: 'player',
    description: "대상이 카'눌라인지 알아낸다. 마나 소모 없음.",
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const yes = tg.character === 'kanulla';
      g.toPlayer(actor, 'skill.neviathan_avatar', `-비공개: ${josa(g.label(tg), '은/는')} ${yes ? "카'눌라이다!" : "카'눌라가 아니다."}`, { target: tg.id, result: yes }, yes ? [{ player: tg.id, character: 'kanulla' }] : [{ player: tg.id, character: null, not: 'kanulla' }]);
    },
  },

  // 카'눌라
  chaos_hex: {
    key: 'chaos_hex', name: '혼돈의 주술', code: 'A03V', hotkey: 'C', mana: 40, cooldown: 70, uses: null, target: 'player',
    description: '진명을 공표하고 있어야 사용 가능. 60초 후 대상이 반란자면 정체를 알아낸다(시전 사실이 공개). 그 대상은 울피안의 정화의 주술에 당할 수 있게 된다.',
    precheck: trueName,
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.toPlayer(actor, 'skill.chaos_hex.self', `-비공개: ${g.label(tg)}에게 혼돈의 주술을 걸었습니다. 60초 후 결과를 알 수 있습니다.`, { target: tg.id });
      g.schedule(g.now + 60_000, 'mode', { kind: 'chaosHex', actor: actor.id, target: tg.id });
    },
  },
  destroyer_guidance: {
    key: 'destroyer_guidance', name: '파괴자의 인도', code: 'A03Y', hotkey: 'V', mana: 10, cooldown: 30, uses: 1, target: 'player',
    description: "1회. 대상이 데카면 스스로를 희생하여 데카에게 광폭화와 마나 전부를 주고(블러디 매드니스가 없으면 되돌려 준다) 카'눌라는 사망한다. 데카가 아니면 비공개 실패.",
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'deka') {
        g.toAll('skill.destroyer_guidance', "-카'눌라가 스스로를 희생하여 금단의 주술을 시전하였습니다!", { target: tg.id });
        if (g.hasSkill(tg, 'bloody_madness')) {
          tg.mana = MAX_MANA;
          if (!g.hasSkill(tg, 'berserk_deka')) g.grantSkill(tg, 'berserk_deka');
          g.toAll('skill.destroyer_guidance.berserk', '-데카가 광폭화 스킬을 획득하고 모든 마나를 회복하였습니다!', { target: tg.id });
        } else {
          g.grantSkill(tg, 'bloody_madness');
          g.toAll('skill.destroyer_guidance.madness', '-데카가 블러디 매드니스를 다시 획득하였습니다!', { target: tg.id });
        }
        g.toPlayer(tg, 'skill.destroyer_guidance.target', `-비공개: 카'눌라는 ${josa(g.label(actor), '이다/다').replace(/이다$/, '이었다').replace(/다$/, '였다')}.`, {}, [{ player: actor.id, character: 'kanulla' }]);
        g.kill(actor, 'destroyer_guidance');
      } else {
        g.toPlayer(actor, 'skill.destroyer_guidance.fail', '-비공개: 그 대상은 데카가 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'deka' }]);
      }
    },
  },

  // 카즈로우·세이로우
  dark_skin: passive('dark_skin', '다크 스킨', 'S00B', '일반 공격을 2번 맞아야 사망한다.'),
  assault_bond: passive('assault_bond', '돌격대의 결속', 'A039', '카즈로우와 세이로우는 시작부터 서로 동맹이다.'),
  berserk_kazrow: {
    key: 'berserk_kazrow', name: '광폭화', code: 'A03R', hotkey: 'Z', mana: 0, cooldown: 0, uses: 1, target: 'none',
    description: '1회. 진명을 공표하고 있어야 사용 가능. 자신의 모든 스킬 쿨다운을 초기화한다. 누군가 광폭화를 썼다는 사실이 공개된다.',
    precheck: trueName,
    resolve({ g, actor }) {
      for (const s of actor.skills) s.cooldownUntil = 0;
      g.toAll('skill.berserk', BERSERK_TEXT);
      g.toPlayer(actor, 'skill.berserk.self', '-비공개: 모든 스킬의 쿨다운이 초기화되었습니다.');
    },
  },
  reckless_charge: {
    key: 'reckless_charge', name: '무모한 돌진', code: 'A03Z', hotkey: 'C', mana: 40, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상을 즉시 살해하고(목숨·보디가드·블러디 매드니스 무시, 아군이어도) 자신도 사망한다. 시전자의 캐릭터명과 대상이 공개된다. 족장 보호 중인 치스에게 쓰면 사토시에게 막히고 서로의 정체를 알게 된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const me = g.charName(actor.character);
      g.toAll('skill.reckless_charge', `-${josa(me, '이/가')} ${g.label(tg)}에게 무모한 돌진을 시전하였습니다!`, { target: tg.id, character: actor.character });
      const satoshi = g.byChar('satoshi');
      if (tg.character === 'chis' && satoshi && satoshi.alive && g.state.modeState.chiefProtected) {
        g.toAll('skill.reckless_charge.blocked', '-하지만 무모한 돌진은 사토시에 의해 가로막혔습니다!', { target: tg.id });
        g.toPlayer(actor, 'skill.reckless_charge.blocked.self', `-비공개: 당신의 돌격은 사토시에 의해 가로막혔습니다! 사토시의 정체는 ${josa(g.label(satoshi), '이다/다')}!`, { target: satoshi.id }, [{ player: satoshi.id, character: 'satoshi' }, { player: tg.id, character: 'chis' }]);
        g.toPlayer(satoshi, 'skill.reckless_charge.blocked.guard', `-비공개: 당신은 그즐리카 돌격대의 돌격으로부터 치스를 보호했습니다! 돌격한 자의 정체는 ${josa(g.label(actor), '이다/다')}!`, { target: actor.id }, [{ player: actor.id, character: actor.character }]);
        return;
      }
      g.kill(tg, 'reckless_charge');
      if (!g.ended) g.kill(actor, 'reckless_charge');
    },
  },
  berserk_seirow: {
    key: 'berserk_seirow', name: '광폭화', code: 'A03S', hotkey: 'Z', mana: 0, cooldown: 0, uses: 1, target: 'none',
    description: '1회. 진명을 공표하고 있어야 사용 가능. 상급 아군 확인을 잃고 상급 공격과 다크 스킨(2번 맞아야 사망)을 얻는다. 20초 후 누군가 광폭화를 썼다는 사실이 공개된다.',
    precheck: trueName,
    resolve({ g, actor }) {
      g.removeSkill(actor, 'advanced_ally_check');
      if (!g.hasSkill(actor, 'advanced_attack')) g.grantSkill(actor, 'advanced_attack');
      if (!g.hasSkill(actor, 'dark_skin')) g.grantSkill(actor, 'dark_skin');
      actor.extraLives = Math.max(actor.extraLives, 1);
      g.toPlayer(actor, 'skill.grant', '-비공개: 광폭화! 상급 공격과 다크 스킨을 얻고 상급 아군 확인을 잃었습니다.', { skill: 'advanced_attack' });
      g.schedule(g.now + 20_000, 'mode', { kind: 'berserkNotice' });
    },
  },
  battle_sense: {
    key: 'battle_sense', name: '배틀 센스', code: 'A03B', hotkey: 'X', mana: 30, cooldown: 60, uses: null, target: 'player',
    description: '대상이 상급 전사(상급·최상급 공격 보유)인지, 일반 전사(공격 보유)인지, 전사가 아닌지 알아낸다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const tier = g.hasSkill(tg, 'advanced_attack') || g.hasSkill(tg, 'supreme_attack') ? '상급 전사이다.' : g.hasSkill(tg, 'attack') ? '일반 전사이다.' : '전사가 아니다.';
      g.toPlayer(actor, 'skill.battle_sense', `-비공개: ${josa(g.label(tg), '은/는')} ${tier}`, { target: tg.id, tier });
    },
  },
};

// ───────────── 승리 판정 (원본 wb: mb → Mb → pb) ─────────────

function checkVictory(g: Game): void {
  if (g.ended) return;
  const dead = (k: CharKey) => !g.charAlive(k); // 제외된 슬롯은 사망으로 취급 (DECISIONS G2)
  if (dead('satoshi') && dead('zwinra') && dead('uldian')) {
    g.endGame(2, '얼음 트롤에는 더 이상 공격할 힘이 남아 있지 않습니다! 트롤 반란자측이 승리했습니다.');
    return;
  }
  if (dead('deka')) {
    g.endGame(1, '얼음 부족이 승리했습니다.');
    return;
  }
  if (dead('chis')) g.endGame(2, '트롤 반란자측이 승리했습니다.');
}

export const troll: ModeDef = {
  id: 'troll',
  displayName: '트롤 부족의 반란',
  sideNames: { 1: '얼음 부족', 2: '트롤 반란자' },
  characters,
  masks: {
    12: '111111111111',
    11: '111011111111',
    10: '111011111110',
    9: '111110011110',
    8: '111010011110',
  },
  skills,
  globalChat: { characters: ['chis', 'neonis'], mana: 25, anonymous: true },
  disguises: [{ character: 'neonis', fooledSide: 1 }],
  hiddenFromChecks: ['hachi'],
  onStart(g) {
    for (const [a, b] of [['uldian', 'ulpian'], ['kazrow', 'seirow']] as [CharKey, CharKey][]) {
      const pa = g.byChar(a);
      const pb = g.byChar(b);
      if (!pa || !pb) continue;
      g.setAlly(pa, pb, true);
      g.setAlly(pb, pa, true);
      g.toPlayer(pa, 'ally.start', `-비공개: ${josa(g.charName(b), '과/와')} 처음부터 동맹입니다. ${josa(g.charName(b), '은/는')} ${josa(g.label(pb), '이다/다')}.`, { target: pb.id }, [{ player: pb.id, character: b }]);
      g.toPlayer(pb, 'ally.start', `-비공개: ${josa(g.charName(a), '과/와')} 처음부터 동맹입니다. ${josa(g.charName(a), '은/는')} ${josa(g.label(pa), '이다/다')}.`, { target: pa.id }, [{ player: pa.id, character: a }]);
    }
  },
  isAbsolutelyGuarded(g, target) {
    return target.character === 'chis' && (g.charAlive('satoshi') || g.charAlive('zwinra'));
  },
  chargedGuard(g, attacker, target) {
    // 블러디 매드니스: 마나 25 이상이면 공격을 버티고 25 를 잃는다. 공격자 페널티·목숨 감소 없음
    if (!g.hasSkill(target, 'bloody_madness') || target.mana < 25) return null;
    g.addMana(target, -25);
    return `-${josa(g.charName(attacker.character), '이/가')} ${josa(g.charName(target.character), '을/를')} 공격하였으나 살해하지 못했습니다.(블러디 매드니스!)`;
  },
  onTask(g, payload) {
    switch (payload.kind) {
      case 'chiefSearch': {
        const p = g.player(String(payload.player));
        if (p) tellChief(g, p);
        return;
      }
      case 'wildPath': {
        const p = g.player(String(payload.player));
        if (!p) return;
        if (p.published === p.character) tellChief(g, p);
        else g.toPlayer(p, 'skill.wild_path.fail', '-비공개: 자신의 진명을 공표하고 있지 않아 야생의 길이 실패했습니다.');
        return;
      }
      case 'chaosHex': {
        const actor = g.player(String(payload.actor));
        const target = g.player(String(payload.target));
        if (!actor || !target) return;
        if (target.side === 2) {
          g.state.modeState.chaosTarget = target.id;
          g.toAll('skill.chaos_hex', "-카'눌라가 혼돈의 주술을 사용해 누군가의 정체를 알아내었습니다!");
          g.toPlayer(actor, 'skill.chaos_hex.result', `-비공개: ${josa(g.label(target), '은/는')} ${josa(g.charName(target.character), '이다/다')}!`, { target: target.id, success: true }, [{ player: target.id, character: target.character }]);
        } else {
          g.toPlayer(actor, 'skill.chaos_hex.result', '-비공개: 혼돈의 주술이 실패한 모양입니다.', { target: target.id, success: false });
        }
        return;
      }
      case 'berserkNotice':
        g.toAll('skill.berserk', BERSERK_TEXT);
        return;
    }
  },
  checkVictory,
};

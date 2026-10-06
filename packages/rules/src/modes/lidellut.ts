// 리델루트 황야 (docs/spec/lidellut.md · lidellut.json, DECISIONS A3·A4·A8·B 반영)
import type { Game } from '../engine/game.js';
import { identityOrCommander } from '../engine/checks.js';
import { josa } from '../text.js';
import type { CharKey, PlayerState } from '../types.js';
import type { CharacterDef, ModeDef, SkillCtx, SkillDef } from './types.js';

const BASE = ['publish', 'ally', 'break_ally'];
const T_DARK = '가디언의 세력을 파멸시켜야 합니다.\n샤이닝과 기사단을 모두 살해하면 승리합니다.';
const T_GUARD = '다크니스의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.';
const T_GUARD_CORE = `${T_GUARD}\n\n샤이닝과 기사단이 살해당하면 가디언은 게임에서 패배합니다.`;
const KNIGHTS: CharKey[] = ['yui', 'loneris', 'supra'];
/** 수프라 추가 목숨 상한 (DECISIONS A8: 디펜드 레벨 4 = 4번 맞아야 사망) */
const SUPRA_MAX_LIVES = 3;

const characters: CharacterDef[] = [
  {
    key: 'kai', name: '카이', title: '프린스 오브 다크니스', unitId: 'H00O', slot: 1, side: 1, commander: true, extraLives: 0,
    skills: [...BASE, 'advanced_attack', 'ally_check', 'global_chat', 'soul_reaver'],
    skillCodes: { advanced_attack: 'A003', ally_check: 'A009' },
    objective: `${T_DARK}\n\n당신이 살해당하면 다크니스는 게임에서 패배합니다.`,
  },
  {
    key: 'arin', name: '아린', title: '다크 템플러', unitId: 'H00S', slot: 2, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'attack', 'enemy_check', 'loyal_servant', 'rune_protection', 'bodyguard'],
    skillCodes: { attack: 'A002', enemy_check: 'A008' },
    objective: T_DARK,
  },
  {
    key: 'kaspa', name: '카스파', title: '다크 샤먼', unitId: 'H00R', slot: 3, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'attack', 'ally_check', 'loyal_servant', 'essence_drain', 'religious_alliance'],
    skillCodes: { attack: 'A002', ally_check: 'A009', religious_alliance: 'A02Y' },
    unlocks: [{ at: 300, skill: 'oracle' }],
    objective: T_DARK,
  },
  {
    key: 'freia', name: '프레이아', title: '프리스티스 오브 그리드', unitId: 'H00T', slot: 4, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'advanced_scan', 'religious_alliance', 'dawn_mist'],
    skillCodes: { advanced_scan: 'A036', religious_alliance: 'A02Z' },
    objective: T_DARK,
  },
  {
    key: 'tuma', name: '투마', title: '플레임 블레이더', unitId: 'H00P', slot: 5, side: 1, commander: false, extraLives: 1,
    skills: [...BASE, 'advanced_attack', 'valiant_charge', 'charge_sense', 'flame_source'],
    skillCodes: { advanced_attack: 'A003' },
    objective: T_DARK,
  },
  {
    key: 'sepi', name: '세피', title: '카오스 위치', unitId: 'H00Q', slot: 6, side: 1, commander: false, extraLives: 0,
    skills: [...BASE, 'ally_check', 'confusion', 'curse', 'burning_magic', 'distortion'],
    skillCodes: { ally_check: 'A009' },
    objective: T_DARK,
  },
  {
    key: 'shining', name: '샤이닝', title: '그랜드 제너럴', unitId: 'H00U', slot: 7, side: 2, commander: true, extraLives: 0,
    skills: [...BASE, 'ally_scan', 'global_chat', 'great_will', 'kinship_shining', 'join'],
    skillCodes: { ally_scan: 'A00T' },
    objective: T_GUARD_CORE,
  },
  {
    key: 'chizuko', name: '치즈코', title: '하프 엔젤릭', unitId: 'H00Y', slot: 8, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'enemy_scan', 'diplomacy', 'angel_baptism', 'kinship_chizuko', 'join'],
    skillCodes: { enemy_scan: 'A040' },
    objective: T_GUARD,
  },
  {
    key: 'yui', name: '유이', title: '디바인 나이트', unitId: 'H00V', slot: 9, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'attack', 'chivalry'],
    skillCodes: { attack: 'A002', scan: 'A037', advanced_scan: 'A036' },
    objective: T_GUARD_CORE,
  },
  {
    key: 'loneris', name: '로네리스', title: '크루스닉', unitId: 'H00X', slot: 10, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'attack', 'chivalry', 'order_founding', 'join'],
    skillCodes: { attack: 'A002', enemy_check: 'A008' },
    objective: T_GUARD_CORE,
  },
  {
    key: 'supra', name: '수프라', title: '블러디 나이트', unitId: 'H00W', slot: 11, side: 2, commander: false, extraLives: 0,
    skills: [...BASE, 'advanced_attack', 'defend', 'chivalry', 'join'],
    skillCodes: { advanced_attack: 'A003' },
    objective: T_GUARD_CORE,
  },
  {
    key: 'kamikaze', name: '카미카제', title: '그레이트 워로드', unitId: 'H00Z', slot: 12, side: 2, commander: false, extraLives: 2,
    skills: [...BASE, 'attack', 'battle_sense', 'commander_search', 'ancient_sorcery', 'hard_skin', 'join'],
    skillCodes: { attack: 'A002', advanced_ally_check: 'A02J' },
    objective: T_GUARD,
  },
];

// ───────────── 헬퍼 ─────────────

const t = (c: SkillCtx): PlayerState => c.target as PlayerState;
const passive = (key: string, name: string, code: string, description: string): SkillDef => ({
  key, name, code, mana: 0, cooldown: 0, uses: null, target: 'none', passive: true, description,
});
const num = (g: Game, k: string) => Number(g.state.modeState[k] ?? 0);

/** 성공하면 소멸하는 정체 확인 (충복·혈족·사령관 탐색) */
function probe(key: string, name: string, code: string, want: CharKey, wantName: string, extra?: (g: Game, actor: PlayerState) => void, hotkey = 'Z'): SkillDef {
  return {
    key, name, code, hotkey, mana: 25, cooldown: 40, uses: null, target: 'player',
    description: `대상이 ${josa(wantName, '이다/다')}면 알아낸다. 성공하면 이 스킬은 사라진다.`,
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === want) {
        g.toPlayer(actor, 'probe.result', `-비공개: ${josa(g.label(tg), '은/는')} ${josa(wantName, '이다/다')}!`, { target: tg.id, success: true, character: want }, [{ player: tg.id, character: want }]);
        g.removeSkill(actor, key);
        extra?.(g, actor);
      } else {
        g.toPlayer(actor, 'probe.result', `-비공개: ${josa(g.label(tg), '은/는')} ${josa(wantName, '이/가')} 아니다.`, { target: tg.id, success: false }, [{ player: tg.id, character: null, not: want }]);
      }
    },
  };
}

function execute(g: Game, target: PlayerState, kind: string, text: string, attacker: PlayerState, cause: string): void {
  g.toAll(kind, text, { target: target.id, attacker: attacker.character });
  g.kill(target, cause);
}

/** 전략 포인트 4 도달 → 10초 후 유이에게 매스 텔레포트 */
function onStrategyFull(g: Game): void {
  g.toAll('skill.join.full', '-유이의 전략 포인트가 4 가 되었습니다. 10초 후 매스 텔레포트 스킬을 획득합니다.');
  // 더 이상 쓸 수 없는 합류는 남은 사람에게서 거둔다 (웹판: 쓸모없는 버튼을 남기지 않음)
  for (const p of g.state.players) if (g.hasSkill(p, 'join')) g.removeSkill(p, 'join');
  const yui = g.byChar('yui');
  if (yui) g.schedule(g.now + 10_000, 'mode', { kind: 'massTeleport', player: yui.id });
}

function grantInquisition(g: Game, loneris: PlayerState): void {
  if (g.hasSkill(loneris, 'order_inquisition')) return;
  g.grantSkill(loneris, 'order_inquisition');
  g.toAll('skill.order_inquisition.grant', '-로네리스가 기사단의 심문 스킬을 획득했습니다.');
  g.toPlayer(loneris, 'skill.grant', '-비공개: 기사단의 심문 스킬을 획득하였습니다.', { skill: 'order_inquisition' });
}

function yuiScanUpgrade(g: Game, yui: PlayerState): void {
  if (g.hasSkill(yui, 'scan')) {
    g.removeSkill(yui, 'scan');
    if (!g.hasSkill(yui, 'advanced_scan')) g.grantSkill(yui, 'advanced_scan');
    g.toPlayer(yui, 'skill.grant', '-비공개: 스캔이 상급 스캔으로 바뀌었습니다.', { skill: 'advanced_scan' });
  } else if (!g.hasSkill(yui, 'advanced_scan')) {
    g.grantSkill(yui, 'scan');
    g.toPlayer(yui, 'skill.grant', '-비공개: 스캔 스킬을 획득하였습니다.', { skill: 'scan' });
  }
}

// ───────────── 고유 스킬 ─────────────

const skills: Record<string, SkillDef> = {
  // 다크니스
  soul_reaver: {
    key: 'soul_reaver', name: '소울 리버', code: 'A00B', hotkey: 'V', mana: 50, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상을 즉시 살해한다(보디가드·목숨 무시). 20초 후 카이의 정체가 모두에게 공개된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      execute(g, tg, 'skill.soul_reaver', `-카이가 ${g.label(tg)}에게 소울 리버를 시전하여 살해합니다!`, actor, 'soul_reaver');
      if (!g.ended) {
        g.toAll('skill.soul_reaver.reveal_notice', '-카이의 정체가 20초 후 드러납니다.');
        g.schedule(g.now + 20_000, 'reveal', { player: actor.id, text: `-카이의 정체는 ${josa(g.label(actor), '이다/다')}!` });
      }
    },
  },
  loyal_servant: probe('loyal_servant', '충복', 'A00V', 'kai', '카이'),
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
  bodyguard: passive('bodyguard', '보디가드', 'A00X', '아린이 살아 있으면 카이는 일반 공격으로 죽지 않는다 (정답 공격자는 실패 처리). 즉사기는 막지 못한다.'),
  essence_drain: passive('essence_drain', '정기 흡수', 'S003', '이름 공격으로 적을 살해하면 마나 50을 회복한다.'),
  religious_alliance: {
    key: 'religious_alliance', name: '종교 동맹', code: 'A02Y', hotkey: 'X', mana: 50, cooldown: 0, uses: 1, target: 'none',
    description: '1회. 진명을 공표하고 있어야 사용 가능. 60초 후 프레이아와 카스파가 서로의 정체를 알게 된다(전체에는 체결 사실만 공개). 둘 중 먼저 쓴 쪽만 유효하다.',
    precheck: ({ g, actor }) => {
      if (actor.published !== actor.character) return '자신의 진명을 공표하고 있어야 합니다.';
      if (g.state.modeState.religiousAllianceBy) return '이미 상대방 측에서 종교 동맹의 서신을 보냈습니다.';
      return null;
    },
    resolve(c) {
      const { g, actor } = c;
      g.state.modeState.religiousAllianceBy = actor.character;
      g.toPlayer(actor, 'skill.religious_alliance.self', '-비공개: 종교 동맹의 서신을 보냈습니다. 60초 후 체결됩니다.');
      g.schedule(g.now + 60_000, 'mode', { kind: 'religiousAlliance' });
    },
  },
  oracle: {
    key: 'oracle', name: '신탁', code: 'A02K', hotkey: 'V', mana: 10, cooldown: 0, uses: 1, target: 'player',
    description: '(게임 시작 5분 후 획득) 1회. 대상의 진실의 보석 보유 여부와 단계를 알아낸다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const text = ['진실의 보석을 가지고 있지 않습니다!', '진실의 조각 1/3을 가지고 있습니다.', '진실의 조각 2/3을 가지고 있습니다.', '합쳐진 진실의 보석을 가지고 있습니다!'][tg.gem];
      g.toPlayer(actor, 'skill.oracle', `-비공개: ${josa(g.label(tg), '은/는')} ${text}`, { target: tg.id, gem: tg.gem });
    },
  },
  dawn_mist: {
    key: 'dawn_mist', name: '미명의 안개', code: 'A00J', hotkey: 'Z', mana: 25, cooldown: 45, uses: null, target: 'player',
    description: '대상에게 안개를 건다. 다음 1회의 적군 확인·배틀 센스가 대상에게 쓰이면 무산되고, 프레이아가 그 사실을 통보받는다. 지속시간 없음.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      tg.flags.dawnMist = true;
      g.toPlayer(actor, 'skill.dawn_mist.self', `-비공개: ${g.label(tg)}에게 미명의 안개를 걸었습니다.`, { target: tg.id });
      g.toPlayer(tg, 'skill.dawn_mist.target', '-비공개: 미명의 안개에 가려졌습니다. 다음 적군 확인·배틀 센스가 무산됩니다.');
    },
  },
  valiant_charge: {
    key: 'valiant_charge', name: '용맹한 돌진', code: 'A035', hotkey: 'Z', mana: 75, cooldown: 0, uses: 1, target: 'player',
    description: '1회(성공 여부 무관). 대상이 카미카제면 즉사시키고(목숨 무시) 투마는 최상급 공격을 얻으며, 카이와 서로 정체를 알고 동맹이 된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'kamikaze') {
        g.toAll('skill.valiant_charge', `-투마가 카미카제에게 돌진하여 쓰러뜨렸습니다. 카미카제는 ${josa(g.label(tg), '이다/다')}.`, { target: tg.id });
        g.kill(tg, 'valiant_charge');
        if (g.ended) return;
        g.toAll('skill.valiant_charge.kai', '-투마의 용맹함이 카이의 귀에 전해집니다.');
        g.removeSkill(actor, 'advanced_attack');
        if (!g.hasSkill(actor, 'supreme_attack')) g.grantSkill(actor, 'supreme_attack');
        g.toPlayer(actor, 'skill.grant', '-비공개: 최상급 공격 스킬을 획득하였습니다.', { skill: 'supreme_attack' });
        const kai = g.byChar('kai');
        if (kai && kai.alive) {
          g.setAlly(kai, actor, true);
          g.setAlly(actor, kai, true);
          g.toPlayer(kai, 'skill.valiant_charge.reveal', `-비공개: 투마의 정체는 ${josa(g.label(actor), '이다/다')}!`, {}, [{ player: actor.id, character: 'tuma' }]);
          g.toPlayer(actor, 'skill.valiant_charge.reveal', `-비공개: 카이의 정체는 ${josa(g.label(kai), '이다/다')}!`, {}, [{ player: kai.id, character: 'kai' }]);
        }
      } else {
        g.toAll('skill.valiant_charge.fail', `-투마가 ${g.label(tg)}에게 돌진을 시도하였으나 실패하였습니다.`, { target: tg.id });
        g.toPlayer(actor, 'skill.valiant_charge.fail.self', '-비공개: 그 대상은 카미카제가 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'kamikaze' }]);
      }
    },
  },
  charge_sense: {
    key: 'charge_sense', name: '돌격 감각', code: 'A02M', hotkey: 'X', mana: 30, cooldown: 100, uses: null, target: 'player',
    description: '대상이 카미카제인지 알아낸다. 투마나 카미카제의 이름을 공표한 대상에게는 쓸 수 없다.',
    precheck: ({ target }) => (target && (target.published === 'tuma' || target.published === 'kamikaze') ? '투마나 카미카제의 이름을 공표한 사람에게 사용할 수 없습니다.' : null),
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const yes = tg.character === 'kamikaze';
      g.toPlayer(actor, 'skill.charge_sense', `-비공개: ${josa(g.label(tg), '은/는')} ${yes ? '카미카제이다!' : '카미카제가 아니다.'}`, { target: tg.id, result: yes }, yes ? [{ player: tg.id, character: 'kamikaze' }] : [{ player: tg.id, character: null, not: 'kamikaze' }]);
    },
  },
  flame_source: passive('flame_source', '화염의 근원', 'S002', '투마는 일반 공격을 2번 맞아야 사망한다.'),
  confusion: {
    key: 'confusion', name: '교란', code: 'A00Y', hotkey: 'X', mana: 25, cooldown: 120, uses: null, target: 'player',
    description: '대상을 45초 동안 행동 불능으로 만든다. 시전자는 공개되지 않는다.',
    resolve(c) {
      const { g } = c;
      const tg = t(c);
      g.addEffect(tg, 'incapacitated', 45, 'confusion', true);
      g.toAll('status.incapacitated', `누군가가 ${g.label(tg)}에게 행동 불능 주문을 시전하였습니다.`, { target: tg.id, seconds: 45 });
      g.toPlayer(tg, 'status.incapacitated.self', '행동 불능 상태가 되었습니다. (45초)');
    },
  },
  burning_magic: {
    key: 'burning_magic', name: '버닝 매직', code: 'A03L', hotkey: 'Z', mana: 40, cooldown: 60, uses: null, target: 'player',
    description: '대상의 마나를 50 감소시킨다. 대상은 공개되지 않는다.',
    resolve(c) {
      const { g } = c;
      const tg = t(c);
      g.addMana(tg, -50);
      g.toAll('skill.burning_magic', '-세피가 누군가에게 버닝 매직을 시전하였습니다.');
      g.toPlayer(c.actor, 'skill.burning_magic.self', '-비공개: 버닝 매직을 시전했습니다.', { target: tg.id });
      g.toPlayer(tg, 'skill.burning_magic.target', '-비공개: 버닝 매직으로 인하여 마나가 50 감소하였습니다.');
    },
  },
  curse: {
    key: 'curse', name: '저주', code: 'A03M', hotkey: 'C', mana: 30, cooldown: 300, uses: null, target: 'player',
    description: '대상의 마나가 50 이하면 정체를 알아낸다(지휘관은 지휘관이라는 것만).',
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
  distortion: {
    key: 'distortion', name: '왜곡', code: 'A030', hotkey: 'V', mana: 20, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상의 진실의 보석을 한 단계 내린다. 시전 사실이 공개된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.toAll('skill.distortion', `-세피가 ${g.label(tg)}에게 왜곡을 시전하였습니다.`, { target: tg.id });
      if (tg.gem > 0) {
        tg.gem = (tg.gem - 1) as 0 | 1 | 2;
        g.toPlayer(actor, 'skill.distortion.self', `-비공개: 왜곡에 성공하여 ${g.label(tg)}의 보석이 한 단계 내려갔습니다.`, { target: tg.id, gem: tg.gem });
        g.toPlayer(tg, 'skill.distortion.target', '-비공개: 왜곡으로 진실의 보석이 한 단계 내려갔습니다.', { gem: tg.gem });
      } else {
        g.toPlayer(actor, 'skill.distortion.self', `-비공개: ${josa(g.label(tg), '은/는')} 진실의 보석을 가지고 있지 않습니다!`, { target: tg.id, gem: 0 });
      }
    },
  },

  // 가디언
  great_will: {
    key: 'great_will', name: '위대한 의지', code: 'A02N', hotkey: 'C', mana: 50, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 카이면 처형한다(보디가드·목숨 무시). 카이가 아니면 20초 후 샤이닝의 정체가 공개되고, 이후 기사단과 카미카제가 전멸하면 샤이닝이 살아 있어도 다크니스가 승리한다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.toAll('skill.great_will', `-샤이닝 : 카이는 ${josa(g.label(tg), '이다/다')}! 지상의 수호자들이여, 그를 처단하라!`, { target: tg.id });
      if (tg.character === 'kai') {
        g.toAll('skill.great_will.success', `-${g.label(tg)}의 정체는 카이였습니다. 카이가 사망했습니다!`, { target: tg.id });
        g.kill(tg, 'great_will');
      } else {
        g.toAll('skill.great_will.fail', `-${josa(g.label(tg), '은/는')} 카이가 아닙니다! 샤이닝의 정체가 20초 후 드러납니다.`, { target: tg.id });
        g.toPlayer(actor, 'skill.great_will.fail.self', '-비공개: 그 대상은 카이가 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'kai' }]);
        g.state.modeState.greatWillFailed = true;
        g.schedule(g.now + 3_000, 'mode', { kind: 'victoryCheck' });
        g.schedule(g.now + 20_000, 'reveal', { player: actor.id, text: `-샤이닝의 정체는 ${josa(g.label(actor), '이다/다')}!` });
      }
    },
  },
  kinship_shining: probe('kinship_shining', '혈족', 'A02P', 'chizuko', '치즈코'),
  kinship_chizuko: probe('kinship_chizuko', '혈족', 'A02S', 'shining', '샤이닝'),
  join: {
    key: 'join', name: '합류', code: 'A02O', hotkey: 'V', mana: 20, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 유이면 유이의 전략 포인트가 1 오른다(4가 되면 유이가 매스 텔레포트를 얻는다). 유이가 아니면 실패하고 내 정체가 모두에게 공개된다.',
    precheck: ({ g }) => (num(g, 'Z') >= 4 ? '더 이상 합류할 수 없습니다.' : null),
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const me = g.charName(actor.character);
      if (tg.character === 'yui') {
        const z = num(g, 'Z') + 1;
        g.state.modeState.Z = z;
        g.toAll('skill.join', `-${josa(me, '이/가')} 유이와 합류에 성공했습니다. 유이의 전략 포인트가 1 증가하였습니다. (현재 전략 포인트 : ${z})`, { character: actor.character, points: z });
        g.toPlayer(actor, 'skill.join.self', `-비공개: ${josa(g.label(tg), '은/는')} 유이다.`, { target: tg.id }, [{ player: tg.id, character: 'yui' }]);
        if (actor.character === 'loneris') {
          const rv = num(g, 'rv') + 1;
          g.state.modeState.rv = rv;
          if (rv >= 2) grantInquisition(g, actor);
        }
        if (z === 4) onStrategyFull(g);
      } else {
        g.toAll('skill.join.fail', `-${josa(me, '이/가')} 합류에 실패했습니다!`, { character: actor.character });
        g.revealPublic(actor);
        g.toAll('reveal', `-${me}의 정체는 ${josa(g.label(actor), '이다/다')}!`, { player: actor.id, character: actor.character });
        g.toPlayer(actor, 'skill.join.fail.self', '-비공개: 그 대상은 유이가 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'yui' }]);
      }
    },
  },
  chivalry: {
    key: 'chivalry', name: '기사도', code: 'A03A', hotkey: 'Z', mana: 35, cooldown: 35, uses: null, target: 'player',
    description: '대상이 기사(유이·로네리스·수프라)이고 대상이나 내가 진명을 공표 중이면 정체를 알아낸다. 성공하면 보상(로네리스: 적군 확인, 수프라: 목숨 +1, 유이: 스캔 → 상급 스캔)을 받고 소멸한다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const trueName = tg.published === tg.character || actor.published === actor.character;
      if (trueName && KNIGHTS.includes(tg.character)) {
        g.toPlayer(actor, 'inspect.result', `확인에 성공했습니다. ${josa(g.label(tg), '은/는')} ${josa(g.charName(tg.character), '이다/다')}.`, { target: tg.id, success: true, character: tg.character }, [{ player: tg.id, character: tg.character }]);
        if (actor.character === 'loneris' && !g.hasSkill(actor, 'enemy_check')) {
          g.grantSkill(actor, 'enemy_check');
          g.toPlayer(actor, 'skill.grant', '-비공개: 적군 확인 스킬을 획득하였습니다.', { skill: 'enemy_check' });
        } else if (actor.character === 'supra') {
          actor.extraLives = Math.min(SUPRA_MAX_LIVES, actor.extraLives + 1);
          g.toPlayer(actor, 'skill.lives', `-비공개: 디펜드가 강화되었습니다. (${actor.extraLives + 1}번 공격받아야 사망)`, { extraLives: actor.extraLives });
        } else if (actor.character === 'yui') {
          yuiScanUpgrade(g, actor);
        }
        g.removeSkill(actor, 'chivalry');
      } else {
        g.toPlayer(actor, 'inspect.result', '확인에 실패하였습니다.', { target: tg.id, success: false });
      }
    },
  },
  defend: passive('defend', '디펜드', 'S007', '기사도 성공 +1, 천사의 세례 +2 만큼 추가 목숨을 얻는다 (최대 3, 4번 맞아야 사망).'),
  angel_baptism: {
    key: 'angel_baptism', name: '천사의 세례', code: 'A02R', hotkey: 'X', mana: 40, cooldown: 30, uses: null, target: 'player+name',
    description: '대상과 기사 이름(유이·로네리스·수프라)을 골라 맞히면 세례를 준다(유이: 스캔 강화·매스 텔레포트 강화, 로네리스: 이단 심판, 수프라: 목숨 +2). 기사 1명당 1회. 틀리면 이 스킬을 영구히 잃는다.',
    nameOptions: (g) => KNIGHTS.filter((k) => g.charInGame(k)),
    precheck: ({ target }) => (target && target.flags.baptized ? '이미 세례를 받은 기사입니다.' : null),
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      const name = c.name as CharKey;
      if (tg.character === name) {
        tg.flags.baptized = true;
        g.toAll('skill.angel_baptism', `-치즈코가 ${g.charName(name)}에게 천사의 세례를 사용했습니다!`, { character: name });
        g.toPlayer(actor, 'skill.angel_baptism.self', `-비공개: ${josa(g.label(tg), '은/는')} ${josa(g.charName(name), '이다/다')}.`, { target: tg.id }, [{ player: tg.id, character: name }]);
        if (name === 'yui') {
          yuiScanUpgrade(g, tg);
          if (g.hasSkill(tg, 'mass_teleport')) {
            g.removeSkill(tg, 'mass_teleport');
            g.grantSkill(tg, 'greater_mass_teleport');
            g.toPlayer(tg, 'skill.grant', '-비공개: 매스 텔레포트가 상급 매스 텔레포트로 바뀌었습니다.', { skill: 'greater_mass_teleport' });
          }
        } else if (name === 'loneris') {
          if (!g.hasSkill(tg, 'heresy_judgment')) g.grantSkill(tg, 'heresy_judgment');
          g.toPlayer(tg, 'skill.grant', '-비공개: 이단 심판 스킬을 획득하였습니다.', { skill: 'heresy_judgment' });
        } else if (name === 'supra') {
          tg.extraLives = Math.min(SUPRA_MAX_LIVES, tg.extraLives + 2);
          g.toPlayer(tg, 'skill.lives', `-비공개: 천사의 세례로 디펜드가 강화되었습니다. (${tg.extraLives + 1}번 공격받아야 사망)`, { extraLives: tg.extraLives });
        }
      } else {
        g.removeSkill(actor, 'angel_baptism');
        g.toAll('skill.angel_baptism.fail', '-치즈코가 천사의 세례에 실패하였습니다.');
        g.toPlayer(actor, 'skill.angel_baptism.fail.self', `-비공개: ${josa(g.label(tg), '은/는')} ${josa(g.charName(name), '이/가')} 아닙니다. 천사의 세례를 잃었습니다.`, { target: tg.id }, [{ player: tg.id, character: null, not: name }]);
      }
    },
  },
  diplomacy: {
    key: 'diplomacy', name: '외교', code: 'A02T', hotkey: 'C', mana: 50, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상에게 치즈코의 정체를 알리고, 15초 후 치즈코가 대상의 정체를 알게 된다(무조건 성공).',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.toAll('skill.diplomacy', '-치즈코가 누군가와 외교를 하고 있습니다.');
      g.toPlayer(tg, 'skill.diplomacy.target', `-비공개: 치즈코가 당신에게 외교를 사용했습니다. 치즈코의 정체는 ${josa(g.label(actor), '이다/다')}!`, {}, [{ player: actor.id, character: 'chizuko' }]);
      g.schedule(g.now + 15_000, 'mode', { kind: 'diplomacy', actor: actor.id, target: tg.id });
    },
  },
  mass_teleport: {
    key: 'mass_teleport', name: '매스 텔레포트', code: 'A031', hotkey: 'V', mana: 10, cooldown: 0, uses: 1, target: 'player',
    description: '(전략 포인트 4 달성 시 획득) 1회. 대상을 즉시 살해한다(보디가드·목숨 무시). 유이의 정체가 공개된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      execute(g, tg, 'skill.mass_teleport', `-유이가 매스 텔레포트를 시전하여 ${josa(g.label(tg), '을/를')} 살해합니다!`, actor, 'mass_teleport');
      if (!g.ended) {
        g.revealPublic(actor);
        g.toAll('reveal', `-유이의 정체는 ${josa(g.label(actor), '이다/다')}!`, { player: actor.id, character: 'yui' });
      }
    },
  },
  greater_mass_teleport: {
    key: 'greater_mass_teleport', name: '상급 매스 텔레포트', code: 'A02V', hotkey: 'V', mana: 0, cooldown: 0, uses: 1, target: 'player',
    description: '(세례를 받은 유이가 전략 포인트 4 달성 시 획득) 1회. 대상을 즉시 살해한다. 정체는 공개되지 않는다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      execute(g, tg, 'skill.mass_teleport', `-유이가 매스 텔레포트를 시전하여 ${josa(g.label(tg), '을/를')} 살해합니다!`, actor, 'mass_teleport');
    },
  },
  order_founding: {
    key: 'order_founding', name: '기사단 창설', code: 'A038', hotkey: 'X', mana: 25, cooldown: 0, uses: 1, target: 'player',
    description: '1회. 대상이 수프라면 기사단 창설에 성공한다. 유이 합류까지 성공하면 기사단의 심문을 얻는다. 성공·실패가 공개된다(정체는 비공개).',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'supra') {
        g.toAll('skill.order_founding', '-로네리스가 기사단 창설에 성공했습니다.');
        g.toPlayer(actor, 'skill.order_founding.self', `-비공개: ${josa(g.label(tg), '은/는')} 수프라다.`, { target: tg.id }, [{ player: tg.id, character: 'supra' }]);
        const rv = num(g, 'rv') + 1;
        g.state.modeState.rv = rv;
        if (rv >= 2) grantInquisition(g, actor);
      } else {
        g.toAll('skill.order_founding.fail', '-로네리스가 기사단 창설에 실패했습니다.');
        g.toPlayer(actor, 'skill.order_founding.fail.self', '-비공개: 그 대상은 수프라가 아닙니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'supra' }]);
      }
    },
  },
  order_inquisition: {
    key: 'order_inquisition', name: '기사단의 심문', code: 'A02W', hotkey: 'X', mana: 60, cooldown: 0, uses: 1, target: 'player',
    description: '(유이 합류 + 기사단 창설 성공 시 획득) 1회. 60초 후 대상의 정체를 알아낸다. 시전 사실이 공개된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      g.toAll('skill.order_inquisition', `-로네리스가 ${g.label(tg)}에게 기사단의 심문을 사용했습니다! ${g.label(tg)}의 정체가 60초 후 로네리스에게 드러납니다!`, { target: tg.id });
      g.schedule(g.now + 60_000, 'mode', { kind: 'inquisition', actor: actor.id, target: tg.id });
    },
  },
  heresy_judgment: {
    key: 'heresy_judgment', name: '이단 심판', code: 'A032', hotkey: 'C', mana: 20, cooldown: 60, uses: null, target: 'player',
    description: '(천사의 세례 후 획득) 대상이 카스파나 프레이아면 살해한다(목숨 무시). 성공 시 공격이 상급 공격으로 바뀐다. 실패해도 페널티 없음.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (tg.character === 'kaspa' || tg.character === 'freia') {
        if (g.hasSkill(actor, 'attack')) {
          g.removeSkill(actor, 'attack');
          if (!g.hasSkill(actor, 'advanced_attack')) g.grantSkill(actor, 'advanced_attack');
          g.toPlayer(actor, 'skill.grant', '-비공개: 공격이 상급 공격으로 바뀌었습니다.', { skill: 'advanced_attack' });
        }
        execute(g, tg, 'skill.heresy_judgment', `-로네리스가 이단 심판을 사용하여 ${josa(g.label(tg), '을/를')} 살해합니다!`, actor, 'heresy_judgment');
      } else {
        g.toPlayer(actor, 'skill.heresy_judgment.fail', '-비공개: 이단 심판에 실패했습니다.', { target: tg.id }, [{ player: tg.id, character: null, not: 'kaspa' }, { player: tg.id, character: null, not: 'freia' }]);
      }
    },
  },
  battle_sense: {
    key: 'battle_sense', name: '배틀 센스', code: 'A03B', hotkey: 'X', mana: 30, cooldown: 60, uses: null, target: 'player',
    description: '대상이 상급 전사(상급·최상급 공격 보유)인지, 일반 전사(공격 보유)인지, 전사가 아닌지 알아낸다. 미명의 안개에 걸린 대상에게는 무산된다.',
    resolve(c) {
      const { g, actor } = c;
      const tg = t(c);
      if (g.mode.beforeEnemyCheck?.(g, actor, tg, 'battle_sense')) return;
      const tier = g.hasSkill(tg, 'advanced_attack') || g.hasSkill(tg, 'supreme_attack') ? '상급 전사이다.' : g.hasSkill(tg, 'attack') ? '일반 전사이다.' : '전사가 아니다.';
      g.toPlayer(actor, 'skill.battle_sense', `-비공개: ${josa(g.label(tg), '은/는')} ${tier}`, { target: tg.id, tier });
    },
  },
  commander_search: probe('commander_search', '사령관 탐색', 'A03N', 'shining', '샤이닝', (g, actor) => {
    if (!g.hasSkill(actor, 'advanced_ally_check')) g.grantSkill(actor, 'advanced_ally_check');
    g.toPlayer(actor, 'skill.grant', '-비공개: 상급 아군 확인 스킬을 획득하였습니다.', { skill: 'advanced_ally_check' });
  }, 'C'),
  ancient_sorcery: {
    key: 'ancient_sorcery', name: '고대의 주술', code: 'A034', hotkey: 'Z', mana: 50, cooldown: 150, uses: null, target: 'none',
    description: '자신의 진실의 조각을 한 단계 올린다(1/3 → 2/3 → 완성). 조각이 없거나 이미 완성이면 쓸 수 없다. 시전 사실이 공개된다.',
    precheck: ({ actor }) => (actor.gem === 0 ? '진실의 조각이 없습니다.' : actor.gem >= 3 ? '이미 완성된 보석입니다.' : null),
    resolve(c) {
      const { g, actor } = c;
      actor.gem = (actor.gem + 1) as 1 | 2 | 3;
      g.toAll('skill.ancient_sorcery', '-카미카제가 고대의 주술을 사용하여 소유한 진실의 보석의 등급을 한 단계 올렸습니다!');
      g.toPlayer(actor, 'skill.ancient_sorcery.self', `-비공개: 진실의 보석이 ${['', '조각 1/3', '조각 2/3', '완성'][actor.gem]} 이 되었습니다.`, { gem: actor.gem });
    },
  },
  hard_skin: passive('hard_skin', '하드스킨', 'S008', '카미카제는 일반 공격을 3번 맞아야 사망한다.'),
};

// ───────────── 승리 판정 (원본 wb: Pb → qb → Qb) ─────────────

function checkVictory(g: Game): void {
  if (g.ended) return;
  const dead = (k: CharKey) => !g.charAlive(k); // 제외된 슬롯은 사망으로 취급 (DECISIONS G2)
  if (dead('shining') && dead('yui') && dead('loneris') && dead('supra')) {
    g.endGame(1, '다크니스측이 승리했습니다.');
    return;
  }
  if (g.state.modeState.greatWillFailed && dead('yui') && dead('loneris') && dead('supra') && dead('kamikaze')) {
    g.endGame(1, '가디언에는 더 이상 공격할 힘이 남아 있지 않습니다! 다크니스측이 승리했습니다.');
    return;
  }
  if (dead('kai')) g.endGame(2, '가디언측이 승리했습니다.');
}

export const lidellut: ModeDef = {
  id: 'lidellut',
  displayName: '리델루트 황야',
  sideNames: { 1: '다크니스', 2: '가디언' },
  characters,
  masks: {
    12: '111111111111',
    11: '111110111111',
    10: '111110111110',
    9: '111100111110',
    8: '111100111010',
  },
  skills,
  globalChat: { characters: ['kai', 'shining'], mana: 35 },
  disguises: [],
  hiddenFromChecks: [],
  scanExcludes: ['kai', 'shining'],
  isAbsolutelyGuarded(g, target) {
    return target.character === 'kai' && g.charAlive('arin');
  },
  beforeEnemyCheck(g, actor, target, skill) {
    if (!target.flags.dawnMist) return false;
    delete target.flags.dawnMist;
    g.toPlayer(actor, 'inspect.result', '미명의 안개에 가려져 정확한 탐색이 불가능하다.', { target: target.id, success: false });
    const freia = g.byChar('freia');
    if (freia && freia.alive) {
      g.toPlayer(freia, 'skill.dawn_mist.triggered', `-비공개: ${josa(g.charName(actor.character), '이/가')} ${josa(g.label(target), '을/를')} ${g.skillDef(skill).name}(으)로 확인하려 했습니다!`, { actor: actor.id, target: target.id, skill });
    }
    return true;
  },
  onTask(g, payload) {
    switch (payload.kind) {
      case 'religiousAlliance': {
        const kaspa = g.byChar('kaspa');
        const freia = g.byChar('freia');
        g.toAll('skill.religious_alliance', '-프레이아와 카스파 사이에 종교 동맹이 체결되었습니다!');
        if (kaspa && freia) {
          g.toPlayer(kaspa, 'skill.religious_alliance.result', `-비공개: 프레이아는 ${josa(g.label(freia), '이다/다')}!`, { target: freia.id }, [{ player: freia.id, character: 'freia' }]);
          g.toPlayer(freia, 'skill.religious_alliance.result', `-비공개: 카스파는 ${josa(g.label(kaspa), '이다/다')}!`, { target: kaspa.id }, [{ player: kaspa.id, character: 'kaspa' }]);
        }
        return;
      }
      case 'massTeleport': {
        const yui = g.player(String(payload.player));
        if (!yui || !yui.alive) return;
        const key = yui.flags.baptized ? 'greater_mass_teleport' : 'mass_teleport';
        if (g.hasSkill(yui, 'mass_teleport') || g.hasSkill(yui, 'greater_mass_teleport')) return;
        g.grantSkill(yui, key);
        g.toPlayer(yui, 'skill.grant', `-비공개: ${g.skillDef(key).name} 스킬을 획득하였습니다.`, { skill: key });
        return;
      }
      case 'victoryCheck':
        g.mode.checkVictory(g);
        return;
      case 'diplomacy':
      case 'inquisition': {
        const actor = g.player(String(payload.actor));
        const target = g.player(String(payload.target));
        if (!actor || !target) return;
        const kind = payload.kind === 'diplomacy' ? 'skill.diplomacy.result' : 'skill.order_inquisition.result';
        const prefix = payload.kind === 'diplomacy' ? '외교에 성공했습니다. ' : '';
        g.toPlayer(actor, kind, `-비공개: ${prefix}${josa(g.label(target), '은/는')} ${josa(g.charName(target.character), '이다/다')}!`, { target: target.id }, [{ player: target.id, character: target.character }]);
        return;
      }
    }
  },
  checkVictory,
};

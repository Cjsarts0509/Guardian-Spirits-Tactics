// 엔진 데이터가 원본 역분석 명세(docs/spec)와 원본 오브젝트 데이터(docs/spec/source)와 일치하는지 검증한다.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { civilWar, skillRegistry } from '../src/index.js';
import type { SkillDef } from '../src/index.js';

const load = (rel: string) => JSON.parse(readFileSync(new URL(`../../../docs/spec/${rel}`, import.meta.url), 'utf8'));

const spec = load('civil_war.json');
const core = load('core.json');
const abilities: { code: string; manaCost: number | null; cooldown: number | null }[] = load('source/abilities.json');
const units: { id: string; name: string; title: string; abilities: string[] }[] = load('source/units.json');
const overrides = load('web_overrides.json');

const ability = (code: string) => abilities.find((a) => a.code === code);
const def = (key: string): SkillDef => {
  const d = civilWar.skills[key] ?? skillRegistry[key];
  if (!d) throw new Error(`missing skill ${key}`);
  return d;
};
const sideOf = (s: string) => (s === 'dantes' ? 1 : 2);

/** 원본 오브젝트에 값이 없어 WC3 베이스 기본값으로 확정한 항목 (DECISIONS E) */
const BASE_DEFAULTS: Record<string, { mana?: number; cooldown?: number }> = {
  A005: { cooldown: 10 },
  A00O: { mana: 40 },
  A00P: { cooldown: 120 },
  A00Y: { cooldown: 120 },
  A01E: { mana: 0 },
};

describe('내전 캐릭터 = 명세', () => {
  it('12명 슬롯·진영·지휘관·목숨·유닛 ID가 명세와 같다', () => {
    expect(civilWar.characters).toHaveLength(12);
    for (const sc of spec.characters) {
      const c = civilWar.characters.find((x) => x.key === sc.key);
      expect(c, sc.key).toBeDefined();
      expect(c!.name).toBe(sc.name);
      expect(c!.title).toBe(sc.title);
      expect(c!.unitId).toBe(sc.unitId);
      expect(c!.slot).toBe(sc.role);
      expect(c!.side).toBe(sideOf(sc.side));
      expect(c!.commander).toBe(sc.commander);
      expect(c!.extraLives + 1).toBe(sc.lives);
    }
  });

  it('캐릭터별 보유 스킬 목록이 명세와 같다', () => {
    for (const sc of spec.characters) {
      const c = civilWar.characters.find((x) => x.key === sc.key)!;
      expect([...c.skills].sort(), sc.key).toEqual([...sc.skills].sort());
    }
  });

  it('보유 스킬의 원본 코드가 유닛 데이터(uabi)와 같다', () => {
    for (const c of civilWar.characters) {
      const unit = units.find((u) => u.id === c.unitId)!;
      expect(unit.name).toBe(c.name);
      const ours = c.skills.map((k) => c.skillCodes?.[k] ?? def(k).code).sort();
      const theirs = unit.abilities.filter((a) => a !== 'AInv' && a !== 'A001').sort();
      expect(ours, c.key).toEqual(theirs);
    }
  });

  it('시간 해금이 명세와 같다', () => {
    for (const sc of spec.characters) {
      const c = civilWar.characters.find((x) => x.key === sc.key)!;
      const want = (sc.timedSkills ?? []).map((t: { skill: string; at: number }) => ({ at: t.at, skill: t.skill }));
      expect(c.unlocks ?? [], sc.key).toEqual(want);
    }
  });

  it('인원별 마스크·제외 캐릭터가 명세와 같다', () => {
    for (const n of [8, 9, 10, 11, 12]) {
      expect(civilWar.masks[n], `${n}명`).toBe(spec.playerCountRules.masks[String(n)]);
      const excluded = civilWar.characters.filter((c) => civilWar.masks[n]![c.slot - 1] === '0').map((c) => c.name).sort();
      expect(excluded).toEqual([...spec.playerCountRules.excludedByCount[String(n)]].sort());
    }
  });
});

describe('스킬 수치 = 명세 = 원본 오브젝트', () => {
  const allKeys = new Set(civilWar.characters.flatMap((c) => c.skills).concat(['oracle', 'shadow_eye', 'successor', 'calmness', 'soen_chain_murder']));

  it('내전 고유 스킬의 마나·쿨·횟수가 명세와 같다 (3600초 쿨 = 1회용)', () => {
    for (const [key, s] of Object.entries<Record<string, unknown>>(spec.skills)) {
      const d = def(key);
      expect(d.code, key).toBe(s.abilityCode);
      if (s.manaCost === null) {
        expect(d.passive, `${key} passive`).toBe(true);
        continue;
      }
      expect(d.mana, `${key} mana`).toBe(s.manaCost);
      if (s.cooldown === 3600) {
        expect(d.uses, `${key} uses`).toBe(1);
      } else {
        expect(d.cooldown, `${key} cooldown`).toBe(s.cooldown);
        expect(d.uses, `${key} uses`).toBe(s.uses ?? null);
      }
    }
  });

  it('공통 스킬의 마나·쿨이 core 명세와 같다', () => {
    for (const key of ['publish', 'ally', 'break_ally', 'attack', 'advanced_attack', 'supreme_attack', 'ally_check', 'advanced_ally_check', 'enemy_check', 'advanced_enemy_check', 'scan', 'advanced_scan']) {
      const s = core.skills[key];
      const d = def(key);
      expect(d.mana, `${key} mana`).toBe(s.manaCost);
      expect(d.cooldown, `${key} cooldown`).toBe(s.cooldown);
      const code = typeof s.abilityCode === 'string' ? s.abilityCode : s.abilityCode.civil_war;
      expect(d.code, `${key} code`).toBe(code);
    }
    const gem = core.skills.truth_gem;
    expect(skillRegistry.truth_gem!.manaFor!({ gem: 2 } as never)).toBe(gem.manaCost.I002);
    expect(skillRegistry.truth_gem!.manaFor!({ gem: 3 } as never)).toBe(gem.manaCost.I000);
    expect(skillRegistry.truth_gem!.cooldown).toBe(gem.cooldown.I000);
    expect(civilWar.globalChat.mana).toBe(core.skills.global_chat.manaCost);
  });

  it('원본 오브젝트 데이터(amcs1/acdn1)와 같다', () => {
    for (const key of allKeys) {
      const d = def(key);
      if (d.passive || d.item) continue;
      const codes = civilWar.characters.flatMap((c) => (c.skills.includes(key) ? [c.skillCodes?.[key] ?? d.code] : []));
      for (const code of new Set(codes.length ? codes : [d.code])) {
        const a = ability(code);
        expect(a, code).toBeDefined();
        const mana = a!.manaCost ?? BASE_DEFAULTS[code]?.mana;
        const cd = a!.cooldown ?? BASE_DEFAULTS[code]?.cooldown;
        expect(mana, `${key}(${code}) mana`).toBe(d.mana);
        if (cd === 3600) expect(d.uses, `${key}(${code}) 1회용`).toBe(1);
        else expect(cd, `${key}(${code}) cooldown`).toBe(d.cooldown);
      }
    }
  });
});

describe('web_overrides 반영', () => {
  it('내전 관련 오버라이드 항목이 모두 정의되어 있다', () => {
    const ids = overrides.overrides.map((o: { id: string }) => o.id);
    for (const id of ['A1', 'A6', 'A9', 'A11', 'A12', 'A13', 'A14', 'G6']) expect(ids).toContain(id);
  });
});

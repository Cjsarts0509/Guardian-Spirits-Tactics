// 추가 모드(태초·황야·트롤) 데이터가 명세(docs/spec/*.json)와 원본 오브젝트 데이터와 일치하는지 검증
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { modes, skillRegistry } from '../src/index.js';
import type { ModeDef, SkillDef } from '../src/index.js';

const load = (rel: string) => JSON.parse(readFileSync(new URL(`../../../docs/spec/${rel}`, import.meta.url), 'utf8'));
const abilities: { code: string; manaCost: number | null; cooldown: number | null }[] = load('source/abilities.json');
const units: { id: string; name: string; title: string; abilities: string[] }[] = load('source/units.json');
const ability = (code: string) => abilities.find((a) => a.code === code);

/** 원본 오브젝트에 값이 없어 베이스 기본값으로 확정한 항목 (DECISIONS E) */
const BASE_DEFAULTS: Record<string, { mana?: number; cooldown?: number }> = {
  A005: { cooldown: 10 },
  A01K: { cooldown: 120 },
  A01U: { mana: 50, cooldown: 0 },
  A03L: { mana: 40 },
  A02R: { mana: 40 },
  A03P: { mana: 40 },
  A03Q: { mana: 40 },
  A03F: { mana: 40 },
  A03Z: { mana: 40 },
  A03U: { mana: 50 },
  A034: { cooldown: 150 },
  A00P: { cooldown: 120 },
  A00Y: { cooldown: 120 },
};

function checkMode(modeId: string, specFile: string, sideIds: string[]) {
  const spec = load(specFile);
  const mode = modes[modeId as keyof typeof modes] as ModeDef;
  const def = (key: string): SkillDef => {
    const d = mode.skills[key] ?? skillRegistry[key];
    if (!d) throw new Error(`missing skill ${key}`);
    return d;
  };
  const sideOf = (s: string) => sideIds.indexOf(s) + 1;
  const specSkills = spec.skills as Record<string, Record<string, unknown>>;
  const grantedKeys = new Set(Object.entries(specSkills).filter(([, s]) => (s.availableFrom as { type: string })?.type !== 'start').map(([k]) => k));

  describe(`${mode.displayName} 캐릭터 = 명세`, () => {
    it('12명 슬롯·진영·지휘관·목숨·유닛 ID', () => {
      expect(mode.characters).toHaveLength(12);
      for (const sc of spec.characters) {
        const c = mode.characters.find((x) => x.key === sc.key);
        expect(c, sc.key).toBeDefined();
        expect(c!.name).toBe(sc.name);
        expect(c!.unitId).toBe(sc.unitId);
        expect(c!.slot).toBe(sc.slot);
        expect(c!.side, sc.key).toBe(sideOf(sc.side));
        expect(!!c!.commander, sc.key).toBe(!!sc.commander);
        if (typeof sc.lives === 'number') expect(c!.extraLives + 1, `${sc.key} lives`).toBe(sc.lives);
      }
    });
    it('시작 스킬 = 명세 스킬 중 시작 보유분', () => {
      for (const sc of spec.characters) {
        const c = mode.characters.find((x) => x.key === sc.key)!;
        const want = (sc.skills as string[]).filter((k) => !grantedKeys.has(k)).sort();
        expect([...c.skills].sort(), sc.key).toEqual(want);
      }
    });
    it('시작 스킬의 원본 코드 = 유닛 데이터(uabi)', () => {
      for (const c of mode.characters) {
        const unit = units.find((u) => u.id === c.unitId)!;
        expect(unit.name, c.unitId).toBe(c.name);
        const ours = c.skills.map((k) => c.skillCodes?.[k] ?? def(k).code).sort();
        const theirs = unit.abilities.filter((a) => a !== 'AInv' && a !== 'A001').sort();
        expect(ours, c.key).toEqual(theirs);
      }
    });
    it('인원별 마스크', () => {
      const masks = spec.playerCountRules.slotMask ?? spec.playerCountRules.masks;
      for (const n of [8, 9, 10, 11, 12]) expect(mode.masks[n], `${n}명`).toBe(masks[String(n)]);
    });
  });

  describe(`${mode.displayName} 스킬 수치 = 명세 = 원본 오브젝트`, () => {
    it('고유 스킬의 코드·마나·쿨·횟수', () => {
      for (const [key, s] of Object.entries(specSkills)) {
        const d = def(key);
        // 'A02Y|A02Z' 처럼 캐릭터별 코드가 갈리는 스킬은 skillCodes 로 덮어쓴다
        expect(String(s.abilityCode).split('|'), key).toContain(d.code);
        if (s.manaCost === null || s.manaCost === undefined) {
          expect(!!d.passive, `${key} passive`).toBe(true);
          continue;
        }
        expect(d.mana, `${key} mana`).toBe(s.manaCost);
        if (s.cooldown === 3600) {
          expect(d.uses, `${key} uses`).toBe(1);
          expect(d.cooldown, `${key} cooldown`).toBe(0);
        } else {
          expect(d.cooldown, `${key} cooldown`).toBe(s.cooldown);
          const uses = typeof s.uses === 'number' ? s.uses : null;
          expect(d.uses, `${key} uses`).toBe(uses);
        }
      }
    });
    it('원본 오브젝트 데이터(amcs1/acdn1)와 같다', () => {
      const keys = new Set<string>([...mode.characters.flatMap((c) => c.skills), ...Object.keys(mode.skills)]);
      for (const key of keys) {
        const d = def(key);
        if (d.passive || d.item) continue;
        const code = mode.characters.find((c) => c.skillCodes?.[key])?.skillCodes?.[key] ?? d.code;
        const a = ability(code);
        expect(a, `${key} (${code}) 원본 어빌리티`).toBeDefined();
        const base = BASE_DEFAULTS[code] ?? {};
        const mana = a!.manaCost ?? base.mana;
        if (mana !== undefined) expect(d.mana, `${key} mana`).toBe(mana);
        const cd = a!.cooldown ?? base.cooldown;
        if (cd !== undefined) {
          if (cd === 3600) expect(d.uses, `${key} uses`).toBe(1);
          else expect(d.cooldown, `${key} cooldown`).toBe(cd);
        }
      }
    });
  });
}

checkMode('primordial', 'primordial.json', ['earth', 'darkness']);
checkMode('lidellut', 'lidellut.json', ['darkness', 'guardian']);

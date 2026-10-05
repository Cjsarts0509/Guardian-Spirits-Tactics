// 아이콘 경로. 없는 아이콘은 null → 화면에선 글자만 표시
import { CHARACTER_ALIAS, GEN_ONLY, ICON_NAMES } from './icons.gen.js';

type Size = 128 | 256;
const BASE = (import.meta.env.BASE_URL as string | undefined) ?? '/';

function url(name: string, size: Size): string | null {
  return ICON_NAMES.has(name) ? `${BASE}icons/${size}/${name}.webp` : null;
}

/** 진실의 보석: 1 = 조각 1/3, 2 = 조각 2/3, 3 = 완성 */
export function gemIcon(gem: number, size: Size = 128): string | null {
  if (gem <= 0) return null;
  return url(gem >= 3 ? 'item_truth_gem' : `item_truth_shard_${gem}`, size);
}

/** 같은 개념의 스킬은 한 아이콘을 같이 쓴다 (docs/art/skill_icon_aliases.json 과 동일). 전용 아이콘이 있으면 그게 우선 */
const SKILL_ICON_ALIAS: Readonly<Record<string, string>> = {
  loyal_servant: 'kai_loyal', essence_drain: 'essence_absorb', bodyguard: 'bodyguard_arin',
  kumarin_union: 'tachin_union', kumarin_bodyguard: 'consume_bodyguard', kinship_chizuko: 'kinship_shining',
  greater_mass_teleport: 'mass_teleport', troll_regeneration: 'tachin_troll_regen', ancient_hex_hachi: 'ancient_sorcery',
  support: 'sasint_support', berserk_deka: 'berserk_kazrow', berserk_seirow: 'berserk_kazrow',
  troll_ally_scan: 'ally_scan', troll_scan: 'scan', troll_enemy_scan: 'enemy_scan',
};

export function skillIcon(key: string, gem = 0, size: Size = 128): string | null {
  if (key === 'truth_gem') return gemIcon(Math.max(gem, 2), size);
  const alias = SKILL_ICON_ALIAS[key];
  // 원본 아이콘(대체용)은 전용 키로 들어와 있을 수 있으니, 리마스터 별칭이 있으면 그쪽을 먼저 본다
  if (alias && ICON_NAMES.has(`skill_${alias}`) && !GEN_ONLY.has(`skill_${key}`)) return url(`skill_${alias}`, size);
  return url(`skill_${key}`, size) ?? (alias ? url(`skill_${alias}`, size) : null);
}

export function portrait(character: string | null | undefined, size: Size = 128): string | null {
  if (!character) return null;
  return url(`char_${CHARACTER_ALIAS[character] ?? character}`, size);
}

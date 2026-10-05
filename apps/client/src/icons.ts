// 아이콘 경로. 없는 아이콘은 null → 화면에선 글자만 표시
import { CHARACTER_ALIAS, ICON_NAMES } from './icons.gen.js';

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

export function skillIcon(key: string, gem = 0, size: Size = 128): string | null {
  if (key === 'truth_gem') return gemIcon(Math.max(gem, 2), size);
  return url(`skill_${key}`, size);
}

export function portrait(character: string | null | undefined, size: Size = 128): string | null {
  if (!character) return null;
  return url(`char_${CHARACTER_ALIAS[character] ?? character}`, size);
}

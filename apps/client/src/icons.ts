import { skillArt } from './skill-art.js';
// 아이콘 경로. 없는 아이콘은 null → 화면에선 글자만 표시
import { portraitArt } from './art.js';
type Size = 128 | 256;

/** 진실의 보석: 1 = 조각 1/3, 2 = 조각 2/3, 3 = 완성 */
export function gemIcon(gem: number, size: Size = 128): string | null {
  if (gem <= 0) return null;
  void size;
  return skillArt('truth_gem');
}

export function skillIcon(key: string, gem = 0, size: Size = 128): string | null {
  void gem; void size;
  return skillArt(key);
}

export function portrait(character: string | null | undefined, size: Size = 128): string | null {
  void size;
  return portraitArt(character);
}

// 결정적 난수 (mulberry32). 상태는 GameState.rng 에 숫자로 저장되어 리플레이가 재현된다.

export function nextRandom(stateHolder: { rng: number }): number {
  let t = (stateHolder.rng = (stateHolder.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** [0, n) 정수 */
export function randomInt(stateHolder: { rng: number }, n: number): number {
  return Math.floor(nextRandom(stateHolder) * n);
}

export function shuffle<T>(stateHolder: { rng: number }, items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(stateHolder, i + 1);
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

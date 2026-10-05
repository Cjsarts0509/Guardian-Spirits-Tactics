// 한국어 조사 처리. 원본은 "는(은)" 식으로 양쪽을 다 찍었지만 웹판은 받침에 맞춰 붙인다.

function hasFinalConsonant(word: string): boolean {
  const ch = word.trim().slice(-1);
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  // 숫자/영문 끝: 대략적인 처리
  if (/[136780lmnr]$/i.test(ch)) return true;
  return false;
}

type Pair = '은/는' | '이/가' | '을/를' | '과/와' | '으로/로' | '이다/다';

export function josa(word: string, pair: Pair): string {
  const fc = hasFinalConsonant(word);
  switch (pair) {
    case '은/는':
      return word + (fc ? '은' : '는');
    case '이/가':
      return word + (fc ? '이' : '가');
    case '을/를':
      return word + (fc ? '을' : '를');
    case '과/와':
      return word + (fc ? '과' : '와');
    case '으로/로': {
      const last = word.trim().slice(-1);
      const code = last.charCodeAt(0);
      const rieul = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8;
      return word + (fc && !rieul ? '으로' : '로');
    }
    case '이다/다':
      return word + (fc ? '이다' : '다');
  }
}

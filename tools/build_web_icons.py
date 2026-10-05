"""Gemini로 만든 마스터 아이콘(정사각 PNG) → 웹용 WebP + 클라이언트 목록 생성.

usage: python tools/build_web_icons.py <master_dir>
  <master_dir>/<name>.png  (name = docs/art/gemini_prompts.csv 의 file 열, 확장자 제외)
출력:
  apps/client/public/icons/128/<name>.webp, apps/client/public/icons/256/<name>.webp
  apps/client/src/icons.gen.ts  (있는 아이콘 목록 + 모드별 캐릭터 키 별칭)
"""
import csv, json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, 'apps/client/public/icons')

def main(master):
    names = sorted(f[:-4] for f in os.listdir(master) if f.endswith('.png'))
    for size in (128, 256):
        os.makedirs(f'{PUB}/{size}', exist_ok=True)
    for n in names:
        im = Image.open(os.path.join(master, n + '.png')).convert('RGB')
        assert im.size[0] == im.size[1], (n, im.size)
        for size in (128, 256):
            im.resize((size, size), Image.LANCZOS).save(f'{PUB}/{size}/{n}.webp', 'WEBP', quality=86, method=6)
    # 같은 인물인데 모드마다 키가 다른 경우 (예: 리델루트 freia → 내전 freya 그림)
    rows = list(csv.DictReader(open(os.path.join(ROOT, 'docs/art/manifest.csv'), encoding='utf-8-sig')))
    first = {}
    alias = {}
    for r in rows:
        if r['kind'] != 'character':
            continue
        first.setdefault(r['name'], r['key'])
        if first[r['name']] != r['key']:
            alias[r['key']] = first[r['name']]
    ts = ['// tools/build_web_icons.py 로 생성됨. 직접 수정하지 마세요.',
          f'export const ICON_NAMES: ReadonlySet<string> = new Set({json.dumps(names)});',
          f'export const CHARACTER_ALIAS: Readonly<Record<string, string>> = {json.dumps(alias, ensure_ascii=False, sort_keys=True)};', '']
    open(os.path.join(ROOT, 'apps/client/src/icons.gen.ts'), 'w', encoding='utf-8').write('\n'.join(ts))
    total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(PUB) for f in fs)
    print(f'{len(names)} icons, aliases {len(alias)}, public/icons {total // 1024} KB')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])

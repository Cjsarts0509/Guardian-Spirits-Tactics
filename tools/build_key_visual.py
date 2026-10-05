"""메인 화면 키 비주얼: 생성한 PNG/JPG → apps/client/public/art/key_visual.webp (가로 2048, q85).

usage: python tools/build_key_visual.py <image>
"""
import os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'apps/client/public/art/key_visual.webp')

def main(src):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    if w > 2048:
        im = im.resize((2048, round(h * 2048 / w)), Image.LANCZOS)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    im.save(OUT, 'WEBP', quality=85, method=6)
    print(f'{OUT} {im.size[0]}x{im.size[1]} {os.path.getsize(OUT) // 1024} KB')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])

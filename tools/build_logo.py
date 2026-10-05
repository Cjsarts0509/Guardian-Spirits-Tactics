"""로고 빌드: Gemini 로 만든 엠블럼/워드마크 → 투명 WebP 여러 크기 + 파비콘.

usage: python tools/build_logo.py <emblem.png> [<wordmark.png>]
  엠블럼: 정사각에 가까운 심볼. 배경이 마젠타(#FF00FF)면 키잉해서 투명으로 만들고, 이미 알파가 있으면 그대로 쓴다.
  워드마크: 가로로 긴 영문 로고타입. 배경 처리 동일.
출력 (apps/client/public/art/):
  logo_emblem_512.webp, logo_emblem_128.webp, logo_wordmark.webp (가로 1600), favicon.png (64), apple-touch-icon.png (180)
"""
import os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'apps/client/public/art')


def key_magenta(im: Image.Image) -> Image.Image:
    """마젠타 배경 → 알파. 경계는 마젠타 거리로 부드럽게, 색 번짐(despill)은 G 채널 기준으로 눌러준다."""
    a = np.asarray(im.convert('RGBA')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # 마젠타와의 거리: R·B 높고 G 낮을수록 배경
    dist = np.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2) / 255.0  # 0 = 순수 마젠타
    alpha = np.clip((dist - 0.12) / 0.25, 0, 1)  # 0.12 이하 완전 투명, 0.37 이상 완전 불투명
    # despill: 반투명 경계에서 R·B 가 G 보다 과하게 높으면 G 쪽으로 당긴다
    spill = (r + b) / 2 - g
    fix = np.clip(spill, 0, None) * (1 - alpha)
    a[..., 0] = np.clip(r - fix, 0, 255)
    a[..., 2] = np.clip(b - fix, 0, 255)
    a[..., 3] = alpha * 255
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def load(path: str) -> Image.Image:
    im = Image.open(path)
    has_alpha = im.mode in ('RGBA', 'LA') and np.asarray(im.convert('RGBA'))[..., 3].min() < 250
    im = im.convert('RGBA') if has_alpha else key_magenta(im)
    bbox = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(bbox) if bbox else im


def square(im: Image.Image, pad=0.06) -> Image.Image:
    w, h = im.size
    s = int(max(w, h) * (1 + pad * 2))
    canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    canvas.paste(im, ((s - w) // 2, (s - h) // 2), im)
    return canvas


def save(im: Image.Image, name: str, width: int, fmt='WEBP'):
    w, h = im.size
    out = im.resize((width, max(1, round(h * width / w))), Image.LANCZOS)
    path = os.path.join(OUT, name)
    if fmt == 'WEBP':
        out.save(path, 'WEBP', quality=90, method=6)
    else:
        out.save(path, 'PNG', optimize=True)
    print(f'{path} {out.size[0]}x{out.size[1]} {os.path.getsize(path) // 1024} KB')


def main(emblem: str, wordmark: str | None):
    os.makedirs(OUT, exist_ok=True)
    e = square(load(emblem))
    save(e, 'logo_emblem_512.webp', 512)
    save(e, 'logo_emblem_128.webp', 128)
    save(e, 'favicon.png', 64, 'PNG')
    save(e, 'apple-touch-icon.png', 180, 'PNG')
    if wordmark:
        save(load(wordmark), 'logo_wordmark.webp', 1600)


if __name__ == '__main__':
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)

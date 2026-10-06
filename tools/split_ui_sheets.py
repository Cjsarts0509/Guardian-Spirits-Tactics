"""UI 아트 시트 분할 (docs/art/GEMINI_UI_가이드.md 기준).

usage: python tools/split_ui_sheets.py <sheets_dir> [out_dir]
  <sheets_dir>/U1.png, P3.png … (가이드의 시트 id). 없는 시트는 건너뛴다.
  - '마젠타 키잉' 시트: 마젠타 배경·그림 창을 투명으로, 물체별로 잘라 그리드 순서대로 이름 붙임 → PNG (알파)
  - '칸 분할만' 시트: 마젠타 줄 격자를 잘라 칸별 이미지 → PNG
  출력 기본: apps/client/public/ui/  (웹용 WebP 로도 저장)
"""
import os, re, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUIDE = open(os.path.join(ROOT, 'docs/art/GEMINI_UI_가이드.md'), encoding='utf-8').read()


def sheets():
    for m in re.finditer(r'## ((?:U|P)\d+) — .*?\((\d)×(\d), (.*?)\)\n.*?파일명: (.*?)\n', GUIDE, re.S):
        yield m.group(1), int(m.group(2)), int(m.group(3)), 'keyed' if '키잉' in m.group(4) else 'full', re.findall(r'`([a-z0-9_]+)`', m.group(5))


def magenta_dist(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return np.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2) / 255.0


def key(im: Image.Image) -> Image.Image:
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    d = magenta_dist(a)
    alpha = np.clip((d - 0.14) / 0.22, 0, 1)
    spill = np.clip((a[..., 0] + a[..., 2]) / 2 - a[..., 1], 0, None) * (1 - alpha)
    out = np.dstack([np.clip(a[..., 0] - spill, 0, 255), a[..., 1], np.clip(a[..., 2] - spill, 0, 255), alpha * 255])
    return Image.fromarray(out.astype(np.uint8), 'RGBA')


def runs(frac, thresh, minlen):
    good = list(frac < thresh) + [False]
    out, start = [], None
    for i, g in enumerate(good):
        if g and start is None:
            start = i
        if not g and start is not None:
            if i - start >= minlen:
                out.append((start, i))
            start = None
    return out


def split_keyed(im, rows, cols):
    """물체가 있는 열·행 구간을 찾아 rows×cols 셀로 자른다 (배경이 전부 마젠타)."""
    a = np.asarray(im.convert('RGB')).astype(int)
    obj = magenta_dist(a) > 0.3
    W, H = im.size
    xs = runs(1 - obj.mean(axis=0) * 50, 0.999, max(8, W // (cols * 6)))  # 물체가 조금이라도 있는 열
    ys = runs(1 - obj.mean(axis=1) * 50, 0.999, max(8, H // (rows * 6)))
    if len(xs) != cols or len(ys) != rows:
        # 장식이 셀을 넘어 붙어 있으면 균등 분할로 대체
        xs = [(W * i // cols, W * (i + 1) // cols) for i in range(cols)]
        ys = [(H * i // rows, H * (i + 1) // rows) for i in range(rows)]
    cells = []
    for y0, y1 in ys:
        for x0, x1 in xs:
            sub = obj[y0:y1, x0:x1]
            yy, xx = np.where(sub)
            if len(yy) == 0:
                cells.append(None)
                continue
            pad = 2
            box = (x0 + max(0, xx.min() - pad), y0 + max(0, yy.min() - pad), x0 + min(x1 - x0, xx.max() + pad + 1), y0 + min(y1 - y0, yy.max() + pad + 1))
            cells.append(key(im.crop(box)))
    return cells


def split_full(im, rows, cols):
    a = np.asarray(im.convert('RGB')).astype(int)
    mag = magenta_dist(a) < 0.3
    xs = runs(mag.mean(axis=0), 0.5, 60)
    ys = runs(mag.mean(axis=1), 0.5, 60)
    assert len(xs) == cols and len(ys) == rows, (len(ys), len(xs))
    cells = []
    for y0, y1 in ys:
        for x0, x1 in xs:
            t = im.crop((x0 + 3, y0 + 3, x1 - 3, y1 - 3)).convert('RGB')
            cells.append(t)
    return cells


def main(src, out):
    os.makedirs(out, exist_ok=True)
    done = 0
    for sid, rows, cols, kind, names in sheets():
        path = os.path.join(src, f'{sid}.png')
        if not os.path.exists(path):
            continue
        im = Image.open(path)
        cells = split_keyed(im, rows, cols) if kind == 'keyed' else split_full(im, rows, cols)
        for name, c in zip(names, cells):
            if c is None:
                print(f'{sid} {name}: 비어 있음')
                continue
            c.save(os.path.join(out, f'{name}.png'))
            w = 720 if kind == 'keyed' or name.startswith('card_art') or name.startswith('mode_') else 1600
            c2 = c.resize((w, round(c.size[1] * w / c.size[0])), Image.LANCZOS) if c.size[0] > w else c
            c2.save(os.path.join(out, f'{name}.webp'), 'WEBP', quality=88, method=6)
            print(f'{sid} {name} {c.size[0]}x{c.size[1]}')
            done += 1
    print('total', done)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'apps/client/public/ui'))

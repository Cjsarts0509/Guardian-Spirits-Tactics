"""Gemini 시트(마젠타 줄 격자)를 칸별로 잘라 정사각 PNG 로 저장하고 가이드의 파일명을 붙인다.

usage: python tools/split_sheets.py <sheets_dir> <out_dir>
  <sheets_dir>/S6.png 처럼 가이드의 시트 id 를 파일명으로. 없는 시트는 건너뛴다.
  파일명 목록은 docs/art/GEMINI_가이드*.md 의 '파일명:' 줄에서 읽는다.
  이후: python tools/build_web_icons.py <out_dir> <icons_pack>
"""
import glob, os, re, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = sys.argv[1] if len(sys.argv) > 1 else 'gen_sheets'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'gen_icons/master'
guide = ''.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(ROOT, 'docs/art/GEMINI_가이드*.md'))))
files = {}
for m in re.finditer(r'## (S\d+|C\d+) — .*?\n파일명: (.*?)\n', guide, re.S):
    files[m.group(1)] = re.findall(r'`([a-z0-9_]+)`', m.group(2))
os.makedirs(OUT, exist_ok=True)

def runs(mask_frac, thresh=0.5, minlen=80):
    good = mask_frac < thresh
    out, start = [], None
    for i, g in enumerate(list(good) + [False]):
        if g and start is None: start = i
        if not g and start is not None:
            if i - start >= minlen: out.append((start, i))
            start = None
    return out

report = []
for sid, names in sorted(files.items()):
    path = os.path.join(SHEETS, f'{sid}.png')
    if not os.path.exists(path):
        continue
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(int)
    mag = (a[..., 0] > 190) & (a[..., 1] < 90) & (a[..., 2] > 190)
    cols = runs(mag.mean(axis=0)); rows = runs(mag.mean(axis=1))
    assert len(cols) * len(rows) == len(names), (sid, len(rows), len(cols), len(names))
    k = 0
    for (y0, y1) in rows:
        for (x0, x1) in cols:
            t = mag[y0:y1, x0:x1]
            # 가장자리에 남은 마젠타 깎기
            while t.shape[0] > 10 and t[0].mean() > 0.02: y0 += 1; t = mag[y0:y1, x0:x1]
            while t.shape[0] > 10 and t[-1].mean() > 0.02: y1 -= 1; t = mag[y0:y1, x0:x1]
            while t.shape[1] > 10 and t[:, 0].mean() > 0.02: x0 += 1; t = mag[y0:y1, x0:x1]
            while t.shape[1] > 10 and t[:, -1].mean() > 0.02: x1 -= 1; t = mag[y0:y1, x0:x1]
            w, h = x1 - x0, y1 - y0; s = min(w, h)
            cx0 = x0 + (w - s) // 2; cy0 = y0 + (h - s) // 2
            tile = im.crop((cx0, cy0, cx0 + s, cy0 + s))
            # 2px 안쪽으로 한 번 더 (마젠타 번짐 방지)
            tile = tile.crop((2, 2, s - 2, s - 2))
            name = names[k]; k += 1
            tile.save(os.path.join(OUT, f'{name}.png'))
            ta = np.asarray(tile).astype(int)
            residual = ((ta[..., 0] > 190) & (ta[..., 1] < 90) & (ta[..., 2] > 190)).mean()
            report.append((sid, name, w, h, tile.size[0], round(float(residual), 4)))
for r in report: print(*r)
print('total', len(report))

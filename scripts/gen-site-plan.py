#!/usr/bin/env python3
"""
Regenerate the festival site-plan map assets from the official organiser PDF.

100%-identical approach: we DO NOT redraw the plan. We render the actual PDF
artwork to a compressed WebP and extract every stall label's exact coordinates,
then the portal overlays interactive hotspots on top of the real artwork.

Tool: PyMuPDF (fitz). Run:  python3 scripts/gen-site-plan.py /path/to/SiteLayout.pdf
Outputs: public/site-plan.webp + public/site-plan-stalls.json
"""
import sys, re, json, os
import fitz  # PyMuPDF

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads/CTH2026 Draft Site Layout.pdf')
OUT = os.path.join(os.path.dirname(__file__), '..', 'public')
SCALE = 3  # 3x render -> ~2376x1836, sharp on retina, ~230KB as WebP

doc = fitz.open(SRC)
page = doc[0]
W, H = page.rect.width, page.rect.height

pix = page.get_pixmap(matrix=fitz.Matrix(SCALE, SCALE))
tmp_png = '/tmp/_site-plan.png'
pix.save(tmp_png)

from PIL import Image
Image.open(tmp_png).save(os.path.join(OUT, 'site-plan.webp'), 'WEBP', quality=88, method=6)

stalls = []
for x0, y0, x1, y1, t, *_ in page.get_text('words'):
    if re.match(r'^(FS|TS|FT|BS)\d*$', t):
        stalls.append({'code': t, 'type': t[:2],
                       'x': round(x0 / W, 4), 'y': round(y0 / H, 4),
                       'w': round((x1 - x0) / W, 4), 'h': round((y1 - y0) / H, 4)})

json.dump({'image': '/site-plan.webp', 'w': pix.width, 'h': pix.height, 'stalls': stalls},
          open(os.path.join(OUT, 'site-plan-stalls.json'), 'w'))
print(f'wrote public/site-plan.webp ({pix.width}x{pix.height}) + {len(stalls)} stalls')

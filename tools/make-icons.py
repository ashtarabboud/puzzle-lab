# Generates the Home Screen icons: an ink-indigo tile with a 3x3 puzzle grid, one cell in ochre.
from PIL import Image, ImageDraw
import os
def icon(size, maskable=False):
    S = size * 4  # supersample
    im = Image.new('RGB', (S, S), (59, 63, 168))
    d = ImageDraw.Draw(im)
    pad = int(S * (0.26 if maskable else 0.2))
    grid = S - 2 * pad; gap = int(grid * 0.07); cell = (grid - 2 * gap) / 3
    for r in range(3):
        for c in range(3):
            x0 = pad + c * (cell + gap); y0 = pad + r * (cell + gap)
            col = (233, 176, 75) if (r, c) == (0, 2) else (244, 245, 242)
            if (r, c) in [(1, 1)]: col = (157, 162, 230)
            d.rounded_rectangle([x0, y0, x0 + cell, y0 + cell], radius=int(cell * 0.18), fill=col)
    return im.resize((size, size), Image.LANCZOS)
os.makedirs('public/icons', exist_ok=True)
icon(180).save('public/icons/apple-touch-icon.png')
icon(192).save('public/icons/icon-192.png')
icon(512).save('public/icons/icon-512.png')
icon(512, True).save('public/icons/icon-maskable-512.png')
icon(32).save('public/icons/favicon-32.png')
print('icons ok')

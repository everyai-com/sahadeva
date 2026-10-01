#!/usr/bin/env python3
"""Generate Sahadeva icon set: indigo rounded square, gold crescent + stars."""
from PIL import Image, ImageDraw

BG = (34, 29, 77, 255)      # deep indigo
GOLD = (245, 185, 66, 255)  # gold
WHITE = (255, 255, 255, 255)
S = 512

img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([0, 0, S, S], radius=112, fill=BG)
# crescent: gold disc minus offset bg disc
d.ellipse([106, 96, 106 + 300, 96 + 300], fill=GOLD)
d.ellipse([176, 66, 176 + 280, 66 + 280], fill=BG)
# sun dot in crescent opening
d.ellipse([318, 300, 318 + 64, 300 + 64], fill=GOLD)

def star(cx, cy, r):
    d.polygon([(cx, cy - r), (cx + r * 0.22, cy - r * 0.22), (cx + r, cy),
               (cx + r * 0.22, cy + r * 0.22), (cx, cy + r),
               (cx - r * 0.22, cy + r * 0.22), (cx - r, cy),
               (cx - r * 0.22, cy - r * 0.22)], fill=WHITE)

star(368, 150, 34); star(300, 96, 18); star(414, 232, 16)
img.save("icon-512.png")
img.resize((128, 128), Image.LANCZOS).save("icon-small.png")
img.save("icon-large.png")
print("wrote icon-512.png icon-large.png icon-small.png")

# Генерує icon.png (512) та icon-180.png (180): темний градієнт + три «рядки коду»
from PIL import Image, ImageDraw

W = 512
TOP = (26, 29, 44)      # темно-синій
BOT = (13, 66, 60)      # темно-бірюзовий
WHITE = (242, 244, 248)
MINT = (52, 217, 184)

def gradient(size):
    col = Image.new("RGB", (1, size))
    px = []
    for y in range(size):
        t = y / (size - 1)
        px.append(tuple(int(TOP[i] * (1 - t) + BOT[i] * t) for i in range(3)))
    col.putdata(px)
    return col.resize((size, size))

def make(size, path):
    img = gradient(size)
    dr = ImageDraw.Draw(img)
    h = round(size * 0.075)           # висота «рядка»
    gap = round(size * 0.058)
    widths = [0.64, 0.40, 0.52]
    colors = [WHITE, MINT, WHITE]
    total = 3 * h + 2 * gap
    y0 = round(size * 0.5 - total / 2 - size * 0.02)
    for w_frac, colr in zip(widths, colors):
        w = round(size * w_frac)
        x0 = (size - w) // 2
        dr.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=h // 2, fill=colr)
        y0 += h + gap
    img.save(path)
    print("ok", path, img.size)

make(512, "icon.png")
make(180, "icon-180.png")

# Іконки Тотки: 512/192 (any), 180 (apple-touch), 512 maskable (Android adaptive)
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

def bars(dr, size, scale=1.0):
    h = round(size * 0.075 * scale)
    gap = round(size * 0.058 * scale)
    widths = [0.64, 0.40, 0.52]
    colors = [WHITE, MINT, WHITE]
    total = 3 * h + 2 * gap
    y0 = round(size * 0.5 - total / 2 - size * 0.02 * scale)
    for w_frac, colr in zip(widths, colors):
        w = round(size * w_frac * scale)
        x0 = (size - w) // 2
        dr.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=max(h // 2, 1), fill=colr)
        y0 += h + gap

def make(size, path, maskable=False):
    img = gradient(size)
    dr = ImageDraw.Draw(img)
    bars(dr, size, 0.72 if maskable else 1.0)
    img.save(path)
    print("ok", path, img.size)

make(512, "icon.png")
make(192, "icon-192.png")
make(180, "icon-180.png")
make(512, "icon-maskable.png", maskable=True)

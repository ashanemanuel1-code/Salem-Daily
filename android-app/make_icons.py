from PIL import Image, ImageDraw
import os
src = Image.open('../public/icons/icon.png').convert('RGBA')
res = 'android/app/src/main/res'
sizes = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for d, px in sizes.items():
    folder = f'{res}/mipmap-{d}'
    os.makedirs(folder, exist_ok=True)
    icon = src.resize((px, px), Image.LANCZOS)
    icon.save(f'{folder}/ic_launcher.png')
    mask = Image.new('L', (px, px), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, px - 1, px - 1), fill=255)
    rnd = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    rnd.paste(icon, (0, 0), mask)
    rnd.save(f'{folder}/ic_launcher_round.png')
    fg = px * 108 // 48
    inner = int(fg * 0.66)
    canvas = Image.new('RGBA', (fg, fg), (0, 0, 0, 0))
    canvas.paste(src.resize((inner, inner), Image.LANCZOS), ((fg - inner) // 2, (fg - inner) // 2))
    canvas.save(f'{folder}/ic_launcher_foreground.png')
os.makedirs(f'{res}/values', exist_ok=True)
open(f'{res}/values/ic_launcher_background.xml', 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0B0B0F</color>\n</resources>\n')
print('icons done')

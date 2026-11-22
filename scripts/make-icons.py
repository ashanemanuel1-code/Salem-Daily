from PIL import Image
src = Image.open('public/icons/icon.png').convert('RGBA')
for n in (192, 512):
    src.resize((n, n), Image.LANCZOS).save(f'public/icons/icon-{n}.png')
print('pwa icons done')

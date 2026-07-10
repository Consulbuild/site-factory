# Crea una versione degradata di uno screenshot (simula un design rotto):
# contrasto crushed + saturazione alterata + blur leggero.
# Uso: uv run python scripts/degrade.py <input.png> <output.png>
import sys

from PIL import Image, ImageEnhance, ImageFilter


def degrade(src: str, dst: str) -> None:
    img = Image.open(src).convert("RGB")
    img = ImageEnhance.Contrast(img).enhance(0.45)   # contrasto crushed
    img = ImageEnhance.Color(img).enhance(2.4)       # saturazione sparata
    img = ImageEnhance.Brightness(img).enhance(1.15)
    img = img.filter(ImageFilter.GaussianBlur(radius=1.2))  # blur leggero
    img.save(dst)


if __name__ == "__main__":
    degrade(sys.argv[1], sys.argv[2])

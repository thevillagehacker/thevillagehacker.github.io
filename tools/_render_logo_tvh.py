"""Render TheVillageHacker TVH app-icon logo (exact letters, site palette)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / "assets" / "images"
BG = (5, 5, 5, 255)
RED = (255, 59, 77, 255)  # --accent #ff3b4d
WHITE = (244, 244, 245, 255)
FONT = Path(r"C:\Windows\Fonts\ariblk.ttf")


def _rounded_mask(size: int, radius: int) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def render(size: int, mode: str) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    draw = ImageDraw.Draw(img)
    font_size = int(size * 0.28)
    font = ImageFont.truetype(str(FONT), font_size)

    letters = [
        ("T", WHITE if mode == "accent" else RED),
        ("V", RED),
        ("H", WHITE if mode == "accent" else RED),
    ]
    if mode == "white":
        letters = [(ch, WHITE) for ch, _ in letters]

    glyphs = []
    total_w = 0
    spacing = int(size * 0.018)
    for ch, color in letters:
        bbox = font.getbbox(ch)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        glyphs.append((ch, color, w, h, bbox))
        total_w += w
    total_w += spacing * (len(glyphs) - 1)

    x = (size - total_w) / 2
    # Optical vertical center for Arial Black caps
    sample = font.getbbox("H")
    cap_h = sample[3] - sample[1]
    y = (size - cap_h) / 2 - sample[1]

    for ch, color, w, h, bbox in glyphs:
        draw.text((x - bbox[0], y), ch, font=font, fill=color)
        x += w + spacing

    radius = int(size * 0.18)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0))
    out.putalpha(_rounded_mask(size, radius))
    return out


def render_crisp(size: int, mode: str) -> Image.Image:
    """Supersample small favicon sizes so TVH stays sharp in browser tabs."""
    if size >= 180:
        return render(size, mode)
    hi = render(size * 8, mode)
    return hi.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    variants = {
        "logo-tvh.png": "red",
        "logo-tvh-accent.png": "accent",
        "logo-tvh-white.png": "white",
    }
    for name, mode in variants.items():
        render(1024, mode).save(ROOT / name, "PNG")
        print("wrote", ROOT / name)

    # Favicon set matches logo-tvh-white
    favicons = {
        "favicon-32.png": 32,
        "apple-touch-icon.png": 180,
        "favicon-192.png": 192,
        "favicon-512.png": 512,
    }
    for name, size in favicons.items():
        render_crisp(size, "white").save(ROOT / name, "PNG")
        print("wrote", ROOT / name)


if __name__ == "__main__":
    main()

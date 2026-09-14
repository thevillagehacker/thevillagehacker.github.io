"""Render favicon SVG geometry to PNG sizes (32, 180, 192, 512)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "assets" / "images"
BG = (5, 5, 5, 255)
WHITE = (244, 244, 245, 255)
RED = (255, 42, 61, 255)


def _poly(draw: ImageDraw.ImageDraw, pts: list[tuple[float, float]], fill) -> None:
    draw.polygon([(round(x), round(y)) for x, y in pts], fill=fill)


def render(size: int, *, rounded: bool, supersample: int = 8) -> Image.Image:
    # Draw large, then lanczos-down so 16/32px tabs stay sharp.
    src = size * supersample
    scale = src / 64.0
    img = Image.new("RGBA", (src, src), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    def s(x: float, y: float) -> tuple[float, float]:
        return x * scale, y * scale

    radius = int(14 * scale) if rounded else 0
    draw.rounded_rectangle([0, 0, src - 1, src - 1], radius=radius, fill=BG)

    _poly(draw, [s(32, 6), s(58, 58), s(32, 44), s(6, 58)], WHITE)
    # Inner chevron cut — skip below 48px logical so the tab icon stays a clean delta
    if size >= 48:
        _poly(draw, [s(32, 22), s(44, 50), s(32, 42), s(20, 50)], BG)
    _poly(draw, [s(32, 10), s(35.6, 19.2), s(32, 42), s(28.4, 19.2)], RED)
    return img.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    # Browser tab: slightly rounded, 32px
    render(32, rounded=True).save(ROOT / "favicon-32.png", "PNG")
    # iOS home screen: iOS applies mask; keep modest rounding
    render(180, rounded=True).save(ROOT / "apple-touch-icon.png", "PNG")
    render(192, rounded=True).save(ROOT / "favicon-192.png", "PNG")
    render(512, rounded=True).save(ROOT / "favicon-512.png", "PNG")
    print("wrote", list(ROOT.glob("favicon*.png")), ROOT / "apple-touch-icon.png")


if __name__ == "__main__":
    main()

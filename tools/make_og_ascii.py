"""Generate legacy-shell ASCII Open Graph preview (1200x630)."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "images" / "og-image.png"

W, H = 1200, 630
BG = (6, 8, 6)
PHOS = (70, 210, 90)
PHOS_DIM = (36, 110, 50)
PHOS_BRIGHT = (175, 255, 185)
AMBER = (220, 175, 70)
RED = (255, 80, 90)
BORDER = (28, 72, 38)


def mono_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for p in (
        r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\CascadiaMono.ttf",
        r"C:\Windows\Fonts\lucon.ttf",
        r"C:\Windows\Fonts\cour.ttf",
    ):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main() -> None:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # CRT scanlines
    for y in range(0, H, 2):
        if y % 4 == 0:
            draw.line([(0, y), (W, y)], fill=(4, 6, 4), width=1)

    m = 32
    draw.rectangle([m, m, W - m - 1, H - m - 1], outline=PHOS_DIM, width=2)
    draw.rectangle([m + 3, m + 3, W - m - 4, H - m - 4], outline=BORDER, width=1)

    bar_h = 34
    draw.rectangle(
        [m + 4, m + 4, W - m - 5, m + 4 + bar_h],
        fill=(12, 18, 12),
        outline=PHOS_DIM,
    )
    for i, c in enumerate([(190, 70, 70), (190, 150, 50), (55, 150, 70)]):
        x = m + 16 + i * 18
        draw.ellipse([x, m + 13, x + 12, m + 25], fill=c)

    f_bar = mono_font(15)
    f_body = mono_font(18)
    f_small = mono_font(15)

    draw.text(
        (m + 78, m + 12),
        "tvh@research-node: ~  —  bash  —  80x24",
        font=f_bar,
        fill=PHOS_DIM,
    )

    x0 = m + 26
    y = m + 54
    line_h = 21

    # Pure ASCII — FIGlet-style TVH + shell transcript
    lines: list[tuple[tuple[int, int, int], str]] = [
        (PHOS_DIM, "Last login: on pts/0 from 0.0.0.0"),
        (PHOS_DIM, ""),
        (PHOS, "tvh@node:~$ whoami"),
        (PHOS_BRIGHT, "thevillagehacker"),
        (PHOS_DIM, ""),
        (PHOS, "tvh@node:~$ cat banner.ascii"),
        (PHOS_BRIGHT, r"  _____ __     __ _   _"),
        (PHOS_BRIGHT, r" |_   _|\ \   / /| | | |"),
        (PHOS_BRIGHT, r"   | |   \ \ / / | |_| |"),
        (PHOS_BRIGHT, r"   | |    \ V /  |  _  |"),
        (PHOS_BRIGHT, r"   |_|     \_/   |_| |_|   sec"),
        (PHOS_DIM, ""),
        (AMBER, "  +--------------------------------------------------+"),
        (RED, "  |  thevillagehacker                                |"),
        (PHOS, "  |  > security researcher                           |"),
        (PHOS_DIM, "  |  vuln research · analysis · defensive work       |"),
        (AMBER, "  +--------------------------------------------------+"),
        (PHOS_DIM, ""),
        (PHOS, "tvh@node:~$ hostname -f; status"),
        (PHOS_BRIGHT, "thevillagehacker.com"),
        (PHOS_BRIGHT, "[*] session active  [*] cases  [*] projects  [*] writeups"),
        (PHOS_DIM, ""),
        (PHOS, "tvh@node:~$ "),
    ]

    for color, text in lines:
        if text == "":
            y += max(8, line_h // 2)
            continue
        if text == "tvh@node:~$ ":
            draw.text((x0, y), text, font=f_body, fill=color)
            tw = draw.textlength(text, font=f_body)
            draw.rectangle([x0 + tw + 2, y + 2, x0 + tw + 12, y + 16], fill=PHOS)
        else:
            draw.text((x0, y), text, font=f_body, fill=color)
        y += line_h

    draw.rectangle(
        [m + 4, H - m - 28, W - m - 5, H - m - 5],
        fill=(10, 14, 10),
        outline=BORDER,
    )
    draw.text(
        (m + 12, H - m - 22),
        "[ NORMAL ]  og-image.png  utf-8  1200x630  -- INSERT --  thevillagehacker.com",
        font=f_small,
        fill=PHOS_DIM,
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()

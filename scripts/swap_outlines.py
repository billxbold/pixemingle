"""
Swap outline pixels (dark pixels adjacent to transparency) to a specified color.
Only affects pixels on the EDGE of the sprite, not internal dark pixels.

Usage:
  python swap_outlines.py <input.png> [output.png]
  python swap_outlines.py --dir <folder>
  python swap_outlines.py --color "#FFFFFF" <input.png> [output.png]
  python swap_outlines.py --color "#2A2A2A" --dir <folder>
"""
import sys
import os
from PIL import Image

DEFAULT_COLOR = (61, 64, 91)   # #3D405B slate blue
LUMA_THRESHOLD = 55            # perceived brightness: 0.299R + 0.587G + 0.114B


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def luma(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b


def is_transparent(pixels, x, y, w, h):
    """Check if pixel is transparent or out of bounds."""
    if x < 0 or x >= w or y < 0 or y >= h:
        return True
    return pixels[x, y][3] < 10


def is_outline_pixel(pixels, x, y, w, h):
    """An outline pixel is a dark opaque pixel adjacent to at least one transparent pixel."""
    r, g, b, a = pixels[x, y]
    # Must be opaque and dark
    if a <= 10 or luma(r, g, b) >= LUMA_THRESHOLD:
        return False
    # Must touch transparency (4-connected neighbors)
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        if is_transparent(pixels, x + dx, y + dy, w, h):
            return True
    return False


def swap_outlines(src_path, dst_path=None, target_color=DEFAULT_COLOR):
    img = Image.open(src_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    # First pass: find all outline pixels
    outline_coords = []
    for y in range(h):
        for x in range(w):
            if is_outline_pixel(pixels, x, y, w, h):
                outline_coords.append((x, y))

    # Second pass: swap colors
    for x, y in outline_coords:
        a = pixels[x, y][3]
        pixels[x, y] = (*target_color, a)

    out = dst_path or src_path
    img.save(out)
    color_hex = "#{:02X}{:02X}{:02X}".format(*target_color)
    print(f"  {os.path.basename(src_path)}: {len(outline_coords)} outline pixels -> {color_hex}")


if __name__ == "__main__":
    args = sys.argv[1:]

    # Parse --color flag
    target_color = DEFAULT_COLOR
    if "--color" in args:
        ci = args.index("--color")
        target_color = hex_to_rgb(args[ci + 1])
        args = args[:ci] + args[ci + 2:]

    if "--dir" in args:
        di = args.index("--dir")
        folder = args[di + 1]
        pngs = sorted(f for f in os.listdir(folder) if f.lower().endswith(".png"))
        for f in pngs:
            swap_outlines(os.path.join(folder, f), target_color=target_color)
    elif args:
        src = args[0]
        dst = args[1] if len(args) > 1 else None
        swap_outlines(src, dst, target_color=target_color)
    else:
        print("Usage: python swap_outlines.py [--color '#HEX'] <file.png> [output.png]")
        print("       python swap_outlines.py [--color '#HEX'] --dir <folder>")

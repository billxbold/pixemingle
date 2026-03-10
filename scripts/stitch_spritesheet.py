"""
Stitch individual PixelLab frames into a pixel-agents 56×41 grid spritesheet (2688×1968 px).

Input directory should contain named PNGs following this convention:

  Static directions (from create_character):
    idle_south.png, idle_west.png, idle_east.png, idle_north.png

  Animations (from animate_character — strip or individual frames):
    walk_south.png       (strip: 4 frames side-by-side = 192×48)
    walk_south_0.png ... walk_south_3.png  (individual 48×48 frames)

  Single-row animations (no direction):
    idleAnim.png         (strip: 6 frames = 288×48)
    idleAnim_0.png ... idleAnim_5.png

Animation names match spritesheetLoader.ts ANIM_ROWS:
  idle(1), walk(4), sit(2), sit2(2), phone(6), idleAnim(6),
  pushCart(4), pickUp(2), gift(2), lift(2), hit(2), hurt(2)

Direction names: south(DOWN=0), west(LEFT=1), east(RIGHT=2), north(UP=3)

Minimum viable: idle + walk + idleAnim + gift + hit + hurt
Missing animations are left transparent (engine falls back to idle).

Usage:
  python stitch_spritesheet.py --input-dir pixellab-output/char_01/ --output Premade_Character_48x48_01.png
  python stitch_spritesheet.py --input-dir pixellab-output/char_01/  (outputs to same dir as spritesheet.png)
  python stitch_spritesheet.py --input-dir dir/ --output out.png --preview  (also saves a labeled preview)
"""

import sys
import os
import glob
from PIL import Image, ImageDraw, ImageFont

FRAME = 48
COLS = 56
ROWS = 41
SHEET_W = COLS * FRAME  # 2688
SHEET_H = ROWS * FRAME  # 1968

# Grid layout from spritesheetLoader.ts
# { anim_name: (start_row, num_frames, has_directions) }
ANIM_LAYOUT = {
    'idle':     (2,  1, True),
    'walk':     (6,  4, True),
    'sit':      (12, 2, True),
    'sit2':     (16, 2, True),
    'phone':    (20, 6, True),
    'idleAnim': (24, 6, False),   # single row, no directions
    'pushCart': (25, 4, True),
    'pickUp':   (29, 2, True),
    'gift':     (33, 2, True),
    'lift':     (37, 2, True),
    'hit':      (38, 2, True),
    'hurt':     (39, 2, True),
}

# Direction mapping: PixelLab name → row offset
DIR_MAP = {
    'south': 0,  # DOWN
    'west':  1,  # LEFT
    'east':  2,  # RIGHT
    'north': 3,  # UP
}

DIR_NAMES = ['south', 'west', 'east', 'north']


def find_frames(input_dir, anim, direction=None):
    """
    Find frame images for an animation+direction.
    Returns list of PIL Images, or empty list if not found.

    Tries in order:
    1. Strip image: {anim}_{dir}.png (width = N*48)
    2. Individual frames: {anim}_{dir}_0.png, {anim}_{dir}_1.png, ...
    3. For no-direction anims: {anim}.png or {anim}_0.png, ...
    """
    prefix = f"{anim}_{direction}" if direction else anim

    # Try strip image first
    strip_path = os.path.join(input_dir, f"{prefix}.png")
    if os.path.exists(strip_path):
        strip = Image.open(strip_path).convert("RGBA")
        if strip.width > FRAME:
            # It's a strip — split into individual frames
            num = strip.width // FRAME
            frames = []
            for i in range(num):
                frame = strip.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME))
                frames.append(frame)
            return frames
        else:
            # Single frame
            return [strip]

    # Try individual frames
    frames = []
    for i in range(20):  # max 20 frames, more than any animation needs
        path = os.path.join(input_dir, f"{prefix}_{i}.png")
        if os.path.exists(path):
            frames.append(Image.open(path).convert("RGBA"))
        else:
            break

    # Fallback: mirror east↔west if one is missing
    if not frames and direction in ('east', 'west'):
        mirror_dir = 'west' if direction == 'east' else 'east'
        mirror_frames = find_frames.__wrapped__(input_dir, anim, mirror_dir) if hasattr(find_frames, '__wrapped__') else []
        if not mirror_frames:
            # Direct call without recursion guard
            mirror_prefix = f"{anim}_{mirror_dir}"
            mirror_strip = os.path.join(input_dir, f"{mirror_prefix}.png")
            if os.path.exists(mirror_strip):
                strip = Image.open(mirror_strip).convert("RGBA")
                if strip.width > FRAME:
                    for i in range(strip.width // FRAME):
                        mirror_frames.append(strip.crop((i * FRAME, 0, (i + 1) * FRAME, FRAME)))
                else:
                    mirror_frames = [strip]
        if mirror_frames:
            frames = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in mirror_frames]
            print(f"    mirrored {anim}_{mirror_dir} -> {anim}_{direction}")

    return frames


def fit_frame(frame_img, target=FRAME):
    """
    Fit a frame into target×target cell.
    Crop to non-transparent pixels, uniform scale to fill 95% of target height,
    keep aspect ratio. Anchor to bottom-center.
    """
    bbox = frame_img.getbbox()
    if not bbox:
        return Image.new("RGBA", (target, target), (0, 0, 0, 0))

    cropped = frame_img.crop(bbox)
    cw, ch = cropped.size

    # Uniform scale to fill 95% of target height
    scale = (target * 0.95) / max(ch, 1)
    new_w = max(1, round(cw * scale))
    new_h = max(1, round(ch * scale))

    # Clamp to target
    if new_w > target:
        scale = target / cw
        new_w = target
        new_h = max(1, round(ch * scale))

    scaled = cropped.resize((new_w, new_h), Image.NEAREST)

    result = Image.new("RGBA", (target, target), (0, 0, 0, 0))
    ox = (target - new_w) // 2
    oy = target - new_h  # anchor to bottom
    result.paste(scaled, (ox, oy), scaled)
    return result


def stitch(input_dir, output_path, preview=False):
    """Stitch frames into a 56×41 grid spritesheet."""
    sheet = Image.new("RGBA", (SHEET_W, SHEET_H), (0, 0, 0, 0))
    placed = 0
    missing = []

    for anim, (start_row, num_frames, has_dirs) in ANIM_LAYOUT.items():
        if has_dirs:
            for dir_name in DIR_NAMES:
                dir_offset = DIR_MAP[dir_name]
                row = start_row + dir_offset
                frames = find_frames(input_dir, anim, dir_name)

                if not frames:
                    missing.append(f"{anim}_{dir_name}")
                    continue

                for f_idx, frame_img in enumerate(frames[:num_frames]):
                    frame_img = fit_frame(frame_img)
                    x = f_idx * FRAME
                    y = row * FRAME
                    sheet.paste(frame_img, (x, y), frame_img)
                    placed += 1
        else:
            # Single-row animation (idleAnim)
            row = start_row
            frames = find_frames(input_dir, anim)

            if not frames:
                missing.append(anim)
                continue

            for f_idx, frame_img in enumerate(frames[:num_frames]):
                frame_img = fit_frame(frame_img)
                x = f_idx * FRAME
                y = row * FRAME
                sheet.paste(frame_img, (x, y), frame_img)
                placed += 1

    # Save spritesheet
    sheet.save(output_path)
    print(f"Stitched {placed} frames -> {output_path} ({SHEET_W}×{SHEET_H})")

    if missing:
        print(f"Missing ({len(missing)}): {', '.join(missing)}")
    else:
        print("All animations present!")

    # Optional: labeled preview (scaled up 2x with grid lines + labels)
    if preview:
        preview_path = output_path.replace('.png', '_preview.png')
        make_preview(sheet, preview_path)
        print(f"Preview -> {preview_path}")

    return placed, missing


def make_preview(sheet, preview_path):
    """Create a 2x scaled preview with grid lines and animation labels."""
    scale = 2
    pw = SHEET_W * scale
    ph = SHEET_H * scale
    preview = sheet.resize((pw, ph), Image.NEAREST)
    draw = ImageDraw.Draw(preview)

    # Draw grid lines
    for r in range(ROWS + 1):
        y = r * FRAME * scale
        draw.line([(0, y), (pw, y)], fill=(100, 100, 100, 80), width=1)
    for c in range(COLS + 1):
        x = c * FRAME * scale
        draw.line([(x, 0), (x, ph)], fill=(100, 100, 100, 80), width=1)

    # Label animation rows
    for anim, (start_row, num_frames, has_dirs) in ANIM_LAYOUT.items():
        y = start_row * FRAME * scale + 4
        label = f"{anim} ({num_frames}f)"
        # Draw text background
        draw.rectangle([(2, y), (len(label) * 7 + 4, y + 14)], fill=(0, 0, 0, 180))
        draw.text((4, y + 1), label, fill=(255, 255, 255, 255))

    preview.save(preview_path)


def populate_idle_from_static(input_dir):
    """
    If idle_south.png etc. don't exist but south.png / char_south.png do,
    rename them to idle_south.png convention.
    """
    for dir_name in DIR_NAMES:
        idle_path = os.path.join(input_dir, f"idle_{dir_name}.png")
        if os.path.exists(idle_path):
            continue
        # Try common PixelLab output names
        for pattern in [f"{dir_name}.png", f"char_{dir_name}.png",
                        f"character_{dir_name}.png", f"static_{dir_name}.png"]:
            alt = os.path.join(input_dir, pattern)
            if os.path.exists(alt):
                print(f"  Using {pattern} as idle_{dir_name}.png")
                img = Image.open(alt).convert("RGBA")
                img.save(idle_path)
                break


if __name__ == "__main__":
    args = sys.argv[1:]

    # Parse flags
    input_dir = None
    output_path = None
    preview = "--preview" in args
    if "--preview" in args:
        args.remove("--preview")

    if "--input-dir" in args:
        idx = args.index("--input-dir")
        input_dir = args[idx + 1]
        args = args[:idx] + args[idx + 2:]

    if "--output" in args:
        idx = args.index("--output")
        output_path = args[idx + 1]
        args = args[:idx] + args[idx + 2:]

    # Fallback: positional args
    if not input_dir and args:
        input_dir = args[0]
    if not output_path and len(args) > 1:
        output_path = args[1]

    if not input_dir:
        print("Usage: python stitch_spritesheet.py --input-dir <dir> [--output <file.png>] [--preview]")
        sys.exit(1)

    if not os.path.isdir(input_dir):
        print(f"Error: {input_dir} is not a directory")
        sys.exit(1)

    if not output_path:
        output_path = os.path.join(input_dir, "spritesheet.png")

    # Auto-detect idle frames from common naming
    populate_idle_from_static(input_dir)

    placed, missing = stitch(input_dir, output_path, preview)

    if placed == 0:
        print("\nERROR: No frames were placed! Check your input file names.")
        print("Expected: idle_south.png, walk_south.png (strip), walk_south_0.png (individual), etc.")
        sys.exit(1)

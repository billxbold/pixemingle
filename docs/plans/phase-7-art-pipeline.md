# Phase 7 — Art Pipeline Design Doc

**Status:** In Progress (style probe passed)
**Dependencies:** None (art pipeline is independent of all other phases)
**Budget:** ~$12 PixelLab subscription (1 month Tier 1) + Python/Pillow (free)
**Brand:** Golden Hour SF (see `docs/brand/golden-hour-sf.md`)
**Estimated duration:** 10-14 working days (solo, with validation gates)

---

## 1. Brand Identity — Golden Hour SF

Modern San Francisco aesthetic with warm afternoon palette. Contemporary, not vintage.
Think: SoMa coffee shops, Mission living rooms, rooftop bars, Ferry Building.

### Palette (locked)

| Role       | Name         | Hex     | RGB         | Usage                              |
|------------|--------------|---------|-------------|------------------------------------|
| Primary    | Golden Honey | #F2C078 | 242,192,120 | Sunlight, warmth, optimism         |
| Secondary  | Terracotta   | #E07A5F | 224,122,95  | Energy, accent furniture, warmth   |
| Accent     | Sage Green   | #81B29A | 129,178,154 | Plants, calm, nature, growth       |
| Background | Parchment    | #F4F1DE | 244,241,222 | Walls, floors, UI backgrounds      |
| Pop        | Honey        | #F2CC8F | 242,204,143 | Highlights, rewards, notifications |
| Depth      | Deep Green   | #5B8C5A | 91,140,90   | Foliage shadows, success states    |
| Shadow     | Sienna       | #BC6C4C | 188,108,76  | Wood, leather, warm shadows        |
| UI Border  | Slate Blue   | #3D405B | 61,64,91    | UI panels, speech bubbles, frames  |

### Outline System (visual hierarchy)

| Element | Outline color | Hex | Purpose |
|---------|--------------|-----|---------|
| **Main characters** (players) | White | #FFFFFF | Pop against any background, instant focus |
| **NPCs** (venue filler) | Dark gray / black | #2A2A2A | Fade into background, don't compete |
| **UI panels** | Slate blue | #3D405B | Brand consistency on UI chrome |
| **Props / furniture** | Black | #000000 or near-black | Blend with environment |

**Rule:** Main characters are ALWAYS the visual focus. White outlines make them unmissable. NPCs and environment use darker outlines to recede.

### Signature Visual Elements

1. **White outlines** on player characters — the single most distinctive brand signal. Characters glow against any backdrop.
2. **Ambient dust motes** — floating golden (#F2CC8F) particles at 30-50% opacity in every scene. Always on, slow upward drift.
3. **Golden hour window** — every venue interior has a large window casting diagonal golden light on the floor.
4. **Parchment UI chrome** — all UI surfaces (chat bar, panels, buttons) use #F4F1DE background with #3D405B borders. No generic white/dark UI.
5. **Cherry blossom/falling petals** — terracotta + golden petals drifting in select scenes. Ambient, not reactive.
6. **Share card frame** — parchment-bordered polaroid-style card for match moments (viral sharing asset).
7. **Portrait frame** — slate blue outer frame with golden corner ornaments for 128x128 portraits.

### Typography Rule
All in-game text uses a single pixel font (Silkscreen) in #3D405B on #F4F1DE. One font everywhere, no mixing.

### Color Language (replaces generic red/green)
| State             | Color        | Hex     |
|-------------------|--------------|---------|
| Warm / positive   | Golden Honey | #F2C078 |
| Neutral           | Parchment    | #F4F1DE |
| Growing / success | Sage Green   | #81B29A |
| Tense / uncertain | Terracotta   | #E07A5F |
| Deep / serious    | Slate Blue   | #3D405B |

---

## 2. Decisions (resolved)

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| 4 vs 8 directions | **4 directions** | Engine only uses 4 (DOWN/LEFT/RIGHT/UP). 8 is 2x cost for zero gameplay benefit. |
| Pixel font | **Silkscreen** | Free (OFL), designed for pixel art, readable at small sizes. Google Fonts. |
| Venue backgrounds | **PixelLab MCP tiled** | Compose from 320x256 quadrants, stitch with Node `sharp`. |
| Portrait expressions | **Python/Pillow region swap** | Swap eye+mouth pixel regions in <1s per portrait. Deterministic. |
| Outline threshold | **Luminosity < 55** | 65 catches too many dark shadows. 55 targets only near-black outlines. |
| Pipeline B tool | **Python/Pillow** (not Godot) | Zero setup, same capabilities at 48px resolution. |
| Character outline | **White (#FFFFFF)** | Players pop against any background. NPCs get dark gray (#2A2A2A). |
| Character split | **10 masc, 10 fem** | No NB design category — at 48px chibi there's no visual difference. Androgynous designs work for anyone. Gender identity lives in profile/SOUL.md, not sprite. |
| NB characters | **Not a sprite category** | Users pick any character regardless of gender. Several designs are androgynous enough for anyone. |
| NPCs | **10 generic NPCs** for venue population | 5 masc, 5 fem. Muted clothes, dark outlines, simple animations. |
| Monetization model | **Freemium + Pixel Me/Pet** | See section 18 |

---

## 3. Two-Pipeline Architecture

### Pipeline A: PixelLab (AI-generated, creative assets)

**What it is:** AI model trained on pixel art. Describe what you want, get pixel art back in 30-180s.

**Available via MCP tools:**
- `create_character` — 16-128px canvas, 4/8 directions, chibi/default proportions
- `animate_character` — 49 template animations (walk, idle, kick, drink, backflip...)
- `create_map_object` — transparent-bg objects up to 400x400px
- `create_tiles_pro` — 1-16 tile variations, square/hex/iso
- `create_topdown_tileset` — 16-tile Wang tileset with auto-transitions
- `get_*` — poll for completion, download results

**Strengths:**
- Generates visually appealing pixel art from text descriptions
- Fast ideation (~2 min per character, ~30s per tile)
- Built-in animation templates (walk, idle, kick, etc.)
- Wang tileset generation with proper autotiling
- Style consistency via `style_images` parameter

**Limitations:**
- Cannot specify exact hex colors — interprets text descriptions loosely
- Outline color always near-black (requires post-processing for white outlines)
- Max 400x400px for map objects, 128px for characters
- Cannot generate compositable layers (body, eyes, outfit as separate PNGs)
- Non-deterministic — same prompt gives different results
- 8 concurrent jobs max

**Cost:** $12/mo Tier 1 (Pixel Apprentice) = 2,000 images/month, max 320x320px

### Pipeline B: Python/Pillow (programmatic, systematic assets)

**What it is:** Python scripts using Pillow to draw pixel art programmatically, export as PNGs.

**How it works:**
1. Claude writes Python that places pixels using the locked palette
2. Run `python scripts/generate_<asset>.py`
3. Output PNGs to disk — layers, expressions, frames
4. Deterministic: same script = same output every time

**Strengths:**
- Free — zero cost, zero setup (Python + Pillow already available)
- Deterministic and reproducible (version control the scripts)
- Perfect for compositable layers (render each layer separately, pixel-perfect alignment)
- Can enforce exact hex colors from the palette
- Claude can write and iterate on these scripts in the same session

**Limitations:**
- Not AI art — procedural/algorithmic pixel placement
- Quality depends on Claude's pixel art ability (functional, not artistic)
- At 48x48, procedural art is adequate; at 128x128, it's less polished

### Pipeline C: "Pixel Me / Pixel My Pet" (runtime, user-driven)

**What it is:** User uploads a photo → Claude Vision describes it → PixelLab generates pixel art character.

**How it works:**
1. User uploads photo (selfie, pet, anything) via app
2. Claude Haiku Vision analyzes image, writes optimized PixelLab prompt
3. Two parallel PixelLab calls:
   - `create_character` (48×48, 4 dirs) → game sprite
   - `create_map_object` (128×128) → portrait + profile pic
4. Post-process: outline swap to white
5. User gets both assets

**Cost per generation:** ~$0.04 (Haiku vision $0.01 + PixelLab ×2 $0.03)
**Sell price:** $1.99
**Margin:** 97%

See section 18 for full monetization model.

---

## 4. Migration Plan — Placeholder Art → Golden Hour SF

### Current state
The project ships with **placeholder** pixel art assets (extracted from pixel-agents):
- 20 premade character spritesheets (pixel-agents format: 56 cols × 41 rows, 48px frames)
- 9 body, 7 eye, 40 outfit, 70 hairstyle compositable layers
- 7 venue backgrounds (layer1 + layer2 PNGs)
- Per-venue furniture tilesets
- UI emote sprites

### Migration strategy: **Incremental replacement, not big bang**

1. **Keep placeholders as fallback** — don't delete until Golden Hour SF assets are validated
2. **New assets go to same paths** — `buildCharacterSheet()` and `venueAssets.ts` don't change their URL patterns
3. **Premade characters: full replacement** — 20 new PixelLab characters replace 20 placeholder ones
4. **Compositable layers: full replacement** — new Pillow-generated layers replace placeholder layers (same filenames)
5. **Venue backgrounds: full replacement** — new compositions replace placeholder layer1/layer2
6. **Furniture: keep placeholders initially** — furniture pieces are small enough that outline swap alone makes them passable
7. **Spritesheet format constraint:** New premade characters MUST use the same pixel-agents 56×41 grid format

### Filename compatibility matrix

| Asset type | Current pattern | New pattern | Changes needed |
|-----------|----------------|------------|----------------|
| Premade chars | `Premade_Character_48x48_01.png` | Same | None |
| Bodies | `Body_48x48_01.png` | Same | None |
| Eyes | `Eyes_48x48_01.png` | Same | None |
| Outfits | `Outfit_01_48x48_01.png` | Same | None |
| Hairstyles | `Hairstyle_01_48x48_01.png` | Same | None |
| Venues | `{venue}_layer1.png` / `_layer2.png` | Same | None |
| Props | N/A (empty dir) | `guitar.png`, `flowers.png`, etc. | Update `propRenderer.ts` |
| Portraits | N/A (placeholders) | `portraits/premade/{charId}/{expression}_{variant}.png` | Already expected by `portraitLoader.ts` |
| NPCs | N/A (don't exist) | `npcs/NPC_48x48_01.png` | New loader needed |

---

## 5. Character-to-Tile Ratio (LOCKED)

**Validated via ratio test (`art-tests/ratio-test/tile_ratio_comparison.png`).**

The pixel-agents engine renders characters in a **48×96 frame** (1 tile wide, 2 tiles tall).
PixelLab's `~60% of canvas height` rule means:

| PixelLab canvas | Character content | In 48×96 frame | Tiles tall | Status |
|-----------------|-------------------|-----------------|------------|--------|
| 48×48 | ~12×34px | 0.71 tiles | **TOO SMALL** | Rejected |
| 80×80 | ~20×57px | 1.19 tiles | Too short | Rejected |
| **96×96** | **~28×67px** | **1.40 tiles** | **CORRECT** | **Approved** |
| 96×96 (default) | ~27×70px | 1.46 tiles | Slightly tall | Backup option |

**Locked pipeline:** Generate at **96px canvas** → crop center 48px horizontally → **48×96 frame**.

- Original pixel-agents character: 42×66px content, 1.38 tiles tall
- PixelLab 96px chibi cropped: 28×67px content, 1.40 tiles tall — **1px delta, perfect match**
- Character is narrower (28px vs 42px) — correct for chibi proportions (big head, slim body)

**Engine code stays unchanged:** `srcH = CHAR_FRAME_SIZE * 2` (48×96 frame) is correct.

---

## 6. Asset Inventory & Pipeline Assignment

### Main Characters — 48×96 sprites (WHITE outlines)

| Asset | Count | Pipeline | Notes |
|-------|-------|----------|-------|
| 20 premade character bases | 20 | PixelLab | **96px canvas**, 4 directions, chibi, high detail |
| Walk animation per character | 20 | PixelLab | `animate_character` template "walking" |
| Idle animation per character | 20 | PixelLab | `animate_character` template "breathing-idle" |
| Crop 96×96 → 48×96 | 20 | Script | Center-crop horizontally, keep full height |
| Spritesheet stitching | 20 | Script | Compose into pixel-agents 56×41 grid (48×96 per cell) |
| White outline | N/A | Engine runtime | `drawWithWhiteOutline()` in renderer — no sprite post-processing |
| **Subtotal** | **~80 jobs** | — | ~3hrs PixelLab generation |

### NPCs — 48×96 sprites (DARK GRAY outlines)

| Asset | Count | Pipeline | Notes |
|-------|-------|----------|-------|
| 10 NPC character bases | 10 | PixelLab | **96px canvas**, 4 directions, chibi, **medium** detail |
| Walk + idle animations | 10 | PixelLab | Simple walk + breathing-idle only |
| Crop 96×96 → 48×96 | 10 | Script | Same crop as main characters |
| Dark gray outline swap | 10 | Script | Post-process: outlines → #2A2A2A |
| **Subtotal** | **~30 jobs** | — | ~1hr generation |

**NPC design rules:**
- Muted clothing: grays, tans, beige, soft brown — NO terracotta/sage/golden (reserved for main characters)
- Simpler silhouettes: no accessories, basic hairstyles
- Lower detail level than main characters
- 2 behaviors only: sitting idle, standing idle (occasionally walking)
- ~4-6 NPCs placed per venue to fill the space

### Compositable Character Layers — 48x48 sprites

| Asset | Free | Paid | Total | Pipeline |
|-------|------|------|-------|----------|
| Body types | 3 | 7 | 10 | Pillow |
| Skin tone variants | 3 | 3 | 6 | Pillow |
| Eye types | 3 | 5 | 8 | Pillow |
| Hairstyles | 5 | 25 | 30 | Pillow |
| Outfits | 5 | 35 | 40 | Pillow |
| Shoes | 0 | 10 | 10 | Pillow |
| Accessories | 0 | 15 | 15 | Pillow |
| **Subtotal** | **19 free** | **100 paid** | **119** | — |

All layers generated once, stored as static PNGs. Zero runtime cost. Gated by `purchases` table.

### Portraits — 128x128

| Asset | Count | Pipeline | Notes |
|-------|-------|----------|-------|
| 20 premade portrait bases (neutral) | 20 | PixelLab | One neutral expression per character |
| 15 expression variants per char | 300 | Pillow | Swap eye+mouth pixel regions on base |
| 3 portrait variants (soft/sharp/neutral) | ×3 | Pillow | HSL shift for lighting warmth |
| **Subtotal** | **~920 PNGs** | — | Pillow handles the systematic variants |

### Venues — 960x528

| Asset | Count | Pipeline | Notes |
|-------|-------|----------|-------|
| 6 venue interiors | 6 | PixelLab (tiled) | 4 quadrants each, stitched |
| 6 venue exteriors | 6 | PixelLab (tiled) | 4 quadrants each, stitched |
| Window light overlay | 6 | Pillow / Canvas | Golden diagonal light patch |
| **Subtotal** | **~18 images** | — | |

Venue list: `lounge | gallery | japanese | icecream | studio | museum`

### Props — 32-48px

| Asset | Pipeline | Notes |
|-------|----------|-------|
| Guitar, Flowers, Phone, Mirror, Drink, Menu, Heart balloon, Rose, Book, Camera, Sunglasses, Coffee cup, Vinyl record, Skateboard, Boombox | PixelLab | 15 items, ~15 min |
| Helicopter, Skateboard (vehicle), Parachute | PixelLab | 3 entrance atom vehicles |

### Floor Tiles — 32x32

| Asset | Count | Pipeline | Notes |
|-------|-------|----------|-------|
| Per-venue floor set | 6×4 = 24 | PixelLab | 4 variations per venue |
| Light shaft tile | 6 | PixelLab | Golden light on floor per venue |
| Wang transition sets | 6 | PixelLab | 16-tile autotile per venue |
| Outdoor tiles | 12 | PixelLab | Sidewalk, grass, paths |
| **Subtotal** | **~138 tiles** | — | ~1hr generation |

### UI / Brand Assets (done)

| Asset | Status |
|-------|--------|
| Portrait frame | Done (in art-tests/) |
| Share card frame | Done (in art-tests/) |
| Chat panel bg | Done (in art-tests/) |
| Dust mote sprites | Done (in art-tests/) |
| Petal sprites | Done (in art-tests/) |

### Comedy Atom Frames — NOT NEEDED

The `atomPlayer.ts` applies offset/scale adjustments to existing spritesheet frames. No separate frame PNGs required. Only entrance vehicle props needed (listed under Props).

---

## 7. NPC System

### Purpose
Venues feel empty and creepy without other people. NPCs populate the space so it feels like a real coffee shop / gallery / restaurant.

### Design Spec

| Aspect | Main Characters | NPCs |
|--------|----------------|------|
| Outline | White (#FFFFFF) | Dark gray (#2A2A2A) |
| Clothing | Full brand palette, distinctive | Muted: gray, tan, beige, soft brown |
| Detail level | High | Medium |
| Animations | Walk, idle, sit, gift, hit, hurt, etc. | Walk, idle only (2 behaviors) |
| Hair | Distinctive styles | Generic: short, medium, ponytail |
| Accessories | Yes (paid cosmetics) | None |
| Interactivity | Full FSM, pathfinding | Simple: sit at table, stand near wall, occasionally walk |

### NPC Placement Per Venue

| Venue | NPCs | Placement |
|-------|------|-----------|
| Lounge | 4-5 | 2 sitting on sofa, 1 at bar, 1-2 standing |
| Gallery | 3-4 | 2-3 looking at art (standing), 1 walking |
| Japanese | 4-5 | 2-3 sitting at tables, 1 at counter, 1 standing |
| Icecream | 3-4 | 2 sitting, 1-2 at counter |
| Studio | 3-4 | 2 sitting at equipment, 1-2 standing |
| Museum | 3-4 | 2-3 walking slowly, 1 standing at exhibit |

### 10 NPC Designs

| # | Presentation | Clothing | Hair |
|---|-------------|----------|------|
| N01 | Masc | Gray sweater, dark pants | Short brown |
| N02 | Fem | Beige blouse, tan skirt | Medium brown, down |
| N03 | Masc | Tan jacket, gray shirt | Short black |
| N04 | Fem | Light gray dress | Ponytail, dark |
| N05 | Masc | Brown polo, khaki pants | Neat parted |
| N06 | Fem | Cream cardigan, gray pants | Bob cut |
| N07 | Masc | Charcoal tee, jeans | Messy brown |
| N08 | Fem | Taupe sweater, dark skirt | Bun |
| N09 | Masc | Olive shirt, brown pants | Buzzcut |
| N10 | Fem | Sand colored top, gray jeans | Wavy, shoulder length |

All skin tones distributed. No brand palette colors (no terracotta, sage, golden honey, etc.)

---

## 8. Outline Swap Scripts

### Main characters: WHITE outlines rendered by ENGINE at runtime

**No sprite post-processing needed.** The renderer (`src/engine/engine/renderer.ts` → `drawWithWhiteOutline()`) draws white pixel-perfect outlines around main characters at render time. Raw PixelLab sprites keep their original dark outlines.

### NPCs: dark → dark gray

**Existing script with different target:** `scripts/swap_outlines.py` modified to accept `--color` parameter.

```bash
python scripts/swap_outlines.py --color "#2A2A2A" --dir public/sprites/characters/npcs/
```

### UI assets: dark → slate blue

```bash
python scripts/swap_outlines.py --color "#3D405B" --dir public/sprites/ui/
```

### Post-process rule
- **Every main character** → NO post-processing (engine renders white outlines at runtime)
- **Every NPC** → `swap_outlines.py --color "#2A2A2A"`
- **Every UI asset** → `swap_outlines.py --color "#3D405B"`
- **Props / furniture** → keep black outlines (no swap)

---

## 9. PixelLab Generation Settings (locked)

All PixelLab MCP calls MUST use these settings for consistency:

```
# Main Characters (96px canvas → crop to 48×96 frame)
size: 96
view: "low top-down"
outline: "single color outline"
shading: "medium shading"
detail: "high detail"
proportions: {"type": "preset", "name": "chibi"}
ai_freedom: 400-500
# Post-process: crop center 48px horizontally → 48×96 frame

# NPCs (96px canvas → crop to 48×96 frame)
size: 96
view: "low top-down"
outline: "single color outline"
shading: "medium shading"
detail: "medium detail"          ← lower than main characters
proportions: {"type": "preset", "name": "chibi"}
ai_freedom: 300-400              ← less creative freedom, more generic
# Post-process: crop to 48×96, then outline swap to #2A2A2A

# Characters (128px portraits)
size: 128
view: "front"
outline: "single color outline"
shading: "detailed shading"
detail: "high detail"
proportions: {"type": "preset", "name": "chibi"}

# Map objects / props
view: "low top-down"
outline: "single color outline"
shading: "detailed shading"
detail: "high detail"

# Tiles
tile_type: "square_topdown"
tile_size: 32
tile_view: "high top-down"

# "Pixel Me / Pixel My Pet" (runtime)
# Character sprite:
size: 96, view: "low top-down", outline: "single color outline",
shading: "medium shading", detail: "high detail", chibi
# Post-process: crop 96×96 → 48×96
# Portrait:
create_map_object at 128×128, view: "side" or "front", detailed shading
```

### Prompt Template for Main Characters
```
"[Description using palette color names]. White outlines.
Warm San Francisco golden hour palette. Modern contemporary fashion.
Comedy dating sim character."
```

### Prompt Template for NPCs
```
"[Generic description using muted colors: gray, tan, beige, brown].
Simple clothing, no accessories. Background character.
Modern pixel art, low top-down view."
```

### Prompt Template for Pixel Me (runtime)
```
"[Claude Vision description of user's photo].
Chibi pixel art character. Warm golden hour palette.
Comedy dating sim character."
```

### Prompt Template for Pixel My Pet (runtime)
```
"Cute pixel art [breed/species], [color/pattern description from photo].
Chibi cartoon style, friendly expression. Transparent background.
[size] pixel art."
```

---

## 10. Spritesheet Stitcher Script

**Problem:** PixelLab generates 96×96 frames. The engine expects 48×96 frames in a pixel-agents 56×41 grid spritesheet.

**Solution:** `scripts/stitch_spritesheet.py`

**Two-step pipeline per frame:**
1. **Crop** 96×96 → 48×96 (center 48px horizontally, keep full 96px height)
2. **Place** cropped frame into correct grid position in 2688×1968 spritesheet

```python
python scripts/stitch_spritesheet.py --input-dir pixellab-output/char_01/ --output premade/Premade_Character_48x48_01.png
```

**Grid layout (from spritesheetLoader.ts):**
Each cell is 48×96 (1 col × 2 rows). Row numbers refer to the top row of each 2-row cell.
```
Row 2:  idle      (4 dirs × 1 frame)
Row 6:  walk      (4 dirs × 4 frames)
Row 12: sit       (4 dirs × 2 frames)
Row 20: phone     (4 dirs × 6 frames)
Row 24: idleAnim  (1 row × 6 frames)
Row 29: pickUp    (4 dirs × 2 frames)
Row 33: gift      (4 dirs × 2 frames)
Row 38: hit       (4 dirs × 2 frames)
Row 39: hurt      (4 dirs × 2 frames)
```

**Minimum viable spritesheet:** Only rows 2 (idle), 6 (walk), 24 (idleAnim), 33 (gift/deliver_line), 38 (hit/angry_kick), 39 (hurt/despair) are used by the game.

**Build this script BEFORE generating characters.**

---

## 11. Implementation Order (with validation gates)

### Step 0: Pipeline Tooling (day 1)

**Tasks:**
- [x] Update `scripts/swap_outlines.py` to accept `--color` parameter (default #3D405B) — DONE
- [x] ~~`swap_outlines_white.py`~~ — NOT NEEDED (engine renders white outlines at runtime via `drawWithWhiteOutline()`)
- [ ] Write `scripts/stitch_spritesheet.py` (pixel-agents grid stitcher)
- [ ] Write `scripts/generate_portrait_variants.py` (expression region swap + HSL variants)
- [ ] Write `scripts/asset_audit.py` (validates all expected files exist, correct dimensions)

**Gate 0:** Run all scripts on test data (art-tests/ files). All produce valid output.

### Step 1: Style Probe — 2 Characters + 1 NPC (day 2) ✅ PASSED

**Status:** Characters generated and approved.

**Completed:**
- [x] Generate character_01 (Tech Casual masc) — approved
- [x] Generate character_02 (Boho fem) — approved
- [x] Slate blue outline swap tested — works but slate blue rejected for characters
- [x] White outlines — engine renders at runtime via `drawWithWhiteOutline()`, done
- [ ] Generate 1 NPC with dark gray outlines — pending
- [ ] Side-by-side comparison: NPC (dark gray) vs main char vs venue background

**Gate 1 (style approval):**
- [x] Characters look good from PixelLab
- [ ] Dark gray outlines make NPCs recede visually
- [ ] Clear visual hierarchy: main chars > NPCs > environment

### Step 2: Batch Main Characters (days 3-4)

**Prerequisite:** Gate 1 passed.

**Tasks:**
- [ ] Generate 20 characters (see Character Diversity Spec, section 11)
- [ ] Batches of 8 (PixelLab concurrent limit)
- [ ] Walk + idle animations per character
- [ ] Stitch into pixel-agents grid spritesheets (engine handles white outlines at runtime)
- [ ] Place in `public/sprites/characters/premade/`

**Gate 2:**
- [ ] All 20 render correctly in canvas
- [ ] Walk + idle animations play for all 20
- [ ] Visual diversity: no duplicates
- [ ] All outlines are white
- **Retry budget:** Up to 5 re-generations

### Step 3: NPCs (day 4, parallel)

**Tasks:**
- [ ] Generate 10 NPCs with muted clothing
- [ ] Walk + idle animations only
- [ ] Dark gray outline swap
- [ ] Place in `public/sprites/characters/npcs/`
- [ ] Build NPC placement system (per-venue spawn positions)

**Gate 3:**
- [ ] NPCs visually recede compared to main characters
- [ ] NPCs make venues feel populated, not empty
- [ ] No NPC outfit competes with main character palette

### Step 4: Props (day 5)

**Tasks:**
- [ ] Generate 15 dating props via `create_map_object` at 48×96 scale
- [ ] Generate 3 entrance vehicle props (helicopter, skateboard, parachute)
- [ ] Keep black outlines on props (no swap)
- [ ] Place in `public/sprites/props/`
- [ ] Update `propRenderer.ts`

**Gate 4:**
- [ ] All 18 props render at correct scale
- [ ] Transparent backgrounds
- [ ] Props don't visually compete with characters

### Step 5: Floor Tiles (day 5)

**Tasks:**
- [ ] Generate 6 venue tile sets (4 variations each)
- [ ] Generate 6 golden light shaft tiles
- [ ] Generate 6 Wang transition tilesets
- [ ] Generate 12 outdoor tiles
- [ ] Place in `public/sprites/venues/` subdirectories

**Gate 5:**
- [ ] Tiles seamlessly repeat
- [ ] Wang transitions smooth
- [ ] Light shaft tiles convincing

### Step 6: Venue Backgrounds (days 6-7)

**Tasks:**
- [ ] 6 venue interiors (4 quadrants each, stitched)
- [ ] 6 venue exteriors
- [ ] Golden light overlay per venue
- [ ] Output as `{venue}_layer1.png` / `{venue}_layer2.png`

**Fallback:** Keep placeholder backgrounds for problematic venues.

**Gate 6:**
- [ ] All 6 venues render without seam artifacts
- [ ] Characters + NPCs look natural in venues
- [ ] Each venue feels distinct

### Step 7: Compositable Layers (days 8-9)

**Tasks:**
- [ ] Python/Pillow scripts for all layer categories
- [ ] Free layers: 3 bodies, 3 eyes, 5 outfits, 5 hairstyles, 3 skin tones
- [ ] Paid layers: remaining counts per category
- [ ] All layers verified with `buildCharacterSheet()`
- [ ] Update `characterAssets.ts`

**Gate 7:**
- [ ] 5+ random combinations render correctly
- [ ] No layer bleed
- [ ] Custom character preview works in onboarding

### Step 8: Portraits (days 9-10)

**Tasks:**
- [ ] Generate 20 neutral portrait bases at 128x128
- [ ] Define expression regions per character
- [ ] Generate 16 expression × 3 lighting variants per character (960 PNGs)
- [ ] Verify `portraitLoader.ts` loads real portraits

**Fallback:** Generate 3 key expressions (neutral/happy/sad) via PixelLab directly.

**Gate 8:**
- [ ] Portrait panel shows real images
- [ ] Expressions visually distinguishable
- [ ] Portraits match their 48px counterparts

### Step 9: Wire Assets + Engine Integration (day 11)

**Tasks:**
- [ ] Verify all asset paths work
- [ ] NPC spawning system in `officeState.ts`
- [ ] Move UI brand assets from art-tests/ to public/sprites/ui/
- [ ] Full journey test (visual only)
- [ ] Run `scripts/asset_audit.py`

**Gate 9:**
- [ ] `npm run build` succeeds
- [ ] No 404s on any sprite URL
- [ ] Canvas renders characters + NPCs + venue + props

### Step 10: Brand Polish (days 12-13)

**Tasks:**
- [ ] Install Silkscreen font
- [ ] Parchment + slate blue UI chrome via Tailwind
- [ ] Ambient dust mote particles
- [ ] Golden light shaft floor rendering
- [ ] Share card generator
- [ ] Portrait frame overlay
- [ ] Speech bubbles: slate blue outlines + parchment fill
- [ ] Falling petal particles

**Gate 10:**
- [ ] UI cohesive (no generic panels)
- [ ] Dust motes visible, not annoying
- [ ] Share card shareable quality

### Step 11: Final Audit + Cleanup (day 14)

**Tasks:**
- [ ] `scripts/asset_audit.py` — all files present
- [ ] Delete placeholder originals (backup in .gitignore'd folder)
- [ ] Build passes clean
- [ ] Visual walkthrough
- [ ] Bundle size < 50MB

---

## 12. Character Diversity Spec (20 premade, 10 masc + 10 fem)

| # | Presentation | Fashion style | Hair | Palette emphasis |
|---|-------------|--------------|------|-----------------|
| 01 | Masc | Casual tech | Short dark | Sage green jacket |
| 02 | Fem | Boho | Long flowing auburn | Terracotta dress |
| 03 | Masc | Business casual | Neat parted | Parchment shirt + sienna blazer |
| 04 | Fem | Streetwear | Pixie cut | Golden honey hoodie |
| 05 | Masc | Athletic | Buzzcut | Terracotta tank top |
| 06 | Fem | Vintage | Pin curls | Honey blouse + sage skirt |
| 07 | Masc | Hipster | Man bun + beard | Sienna flannel |
| 08 | Fem | Professional | Sleek bob | Slate blue blazer |
| 09 | Masc | Preppy | Side swept | Sage green polo |
| 10 | Fem | Cottagecore | Braids | Parchment sundress + golden hat |
| 11 | Masc | Skater | Messy | Deep green tee + sienna shorts |
| 12 | Fem | Goth-lite | Straight dark | Slate blue everything |
| 13 | Masc | Cozy | Curly | Golden honey sweater |
| 14 | Fem | Sporty | Ponytail | Sage green tracksuit |
| 15 | Masc | Formal | Slicked back | Sienna suit + golden tie |
| 16 | Fem | Y2K | Two-toned hair | Honey crop top + terracotta pants |
| 17 | Masc | Artsy (androgynous) | Colorful medium | Deep green vest |
| 18 | Fem | Minimalist (androgynous) | Shaved side | Slate blue turtleneck |
| 19 | Masc | Punk | Spiked mohawk | Terracotta leather jacket |
| 20 | Fem | Eclectic | Asymmetric | Mixed palette accessories |

All skin tones distributed across the 20. Characters 17-18 deliberately androgynous — work for any gender identity.

---

## 13. Pet System — "Pixel My Pet"

### How It Works

1. User uploads pet photo → pays $1.99
2. Claude Haiku Vision describes the pet (breed, color, features)
3. Two PixelLab generations (parallel):
   - `create_map_object` at 128×128 → portrait/profile pic
   - `create_map_object` at 48×48 → game sprite (4 directions if possible, or single facing)
4. White outline swap (pet is "yours" = same visual treatment as your character)
5. Both assets saved to user's account

### Pet Scaling (real world → pixel world)

Character sprite is ~28px tall within the 48×48 canvas. Pets scale relative:

| Pet type | Real world height | Pixel height | Notes |
|----------|------------------|-------------|-------|
| Hamster / rabbit | Ankle | ~5-6px | Tiny blob, still cute at 48px |
| Cat | Knee | ~10-12px | Walks beside character |
| Small dog (poodle, corgi) | Knee | ~10-12px | Walks beside character |
| Medium dog (lab, husky) | Thigh | ~14-16px | Walks beside character |
| Large dog (great dane) | Waist | ~18-20px | Big presence |
| Parrot / bird | Shoulder | ~8px | Sits ON character's shoulder |

### Pet in Venue

- User toggles "bring pet to date" before theater starts
- Pet sprite follows character (trails 1-2 tiles behind, simpler pathfinding)
- Pet has 2 animations: idle + walk
- Gatekeeper's agent can REACT to the pet (comedy gold)
- Pet does NOT count as an NPC — it's attached to the player character

### Pet Generation Cost

| Asset | Tool | Size | Cost |
|-------|------|------|------|
| Portrait | `create_map_object` | 128×128 | ~$0.01 |
| Game sprite | `create_map_object` | 48×48 | ~$0.01 |
| Claude Vision | Haiku | — | ~$0.01 |
| **Total** | — | — | **~$0.03-0.04** |

Sell at $1.99 → **97% margin**

---

## 14. "Pixel Me" System

### How It Works

1. User uploads selfie or character reference → pays $1.99
2. Claude Haiku Vision describes: clothing, hair, skin tone, accessories, style
3. Two PixelLab generations (parallel):
   - `create_character` (48×48, 4 dirs, chibi) → game sprite with walk/idle
   - `create_map_object` (128×128) → portrait
4. White outline swap on both
5. User gets a custom character that looks like them (or their reference)

### Proven — Test Results

| Test | Input | Result | Quality |
|------|-------|--------|---------|
| Cartoon T-Rex | Vector dinosaur image | Captured shape, color, expression | Good — recognizable |
| Real poodle | Pet photograph | Captured breed, coat color, posture | Excellent — instantly recognizable |

### Runtime API Route

```
POST /api/pixel-me
  Body: { image: base64, type: "character" | "pet" }
  Auth: required + purchase verified

  Flow:
  1. Validate purchase ($1.99 charged via Stripe)
  2. Send image to Claude Haiku Vision → get description
  3. Call PixelLab create_character (48px) + create_map_object (128px)
  4. Poll for completion
  5. Run outline swap (white for characters, white for pets)
  6. Save to user's account in Supabase Storage
  7. Return asset URLs

  Cost: ~$0.04
  Time: ~3-5 minutes (PixelLab generation)
```

---

## 15. Monetization Model

### Pricing (locked)

```
FREE:
  20 premade characters (pick one, no customization)
  Basic character builder:
    3 body types
    3 eye types
    5 basic outfits
    5 basic hairstyles
    3 skin tones
  = ~675 combinations (enough to feel personal)

PAID — Cosmetic Packs ($0.99 each):
  "Tokyo Streetwear" — 5 outfits
  "Beach Vibes" — 5 outfits
  "Vintage Charm" — 5 outfits
  "Dark Academia" — 5 outfits
  "Athleisure" — 5 outfits
  "Night Out" — 5 outfits
  "Cozy Season" — 5 outfits
  "Punk Rock Hair" — 5 hairstyles
  "Salon Fresh" — 5 hairstyles
  "Color Pop Hair" — 5 hairstyles
  "Bold Cuts" — 5 hairstyles
  "Festival Hair" — 5 hairstyles
  "Shades & Specs" — 5 accessories (glasses)
  "Hats & Caps" — 5 accessories (headwear)
  "Bling" — 5 accessories (jewelry)
  "Kicks" — 5 shoes
  "Boots & More" — 5 shoes

PAID — Individual Items:
  Single outfit — $0.49
  Single hairstyle — $0.29
  Single accessory — $0.29

PAID — Premium Features:
  "Pixel Me" — $1.99 — upload photo → pixel character (48px + 128px)
  "Pixel My Pet" — $1.99 — upload pet photo → pixel companion (48px + 128px)
  Re-roll (didn't like result) — $0.49

PAID — Seasonal/Limited (FOMO):
  "Valentine's Drop" — $0.99 — 3 outfits + 2 accessories (February only)
  "Halloween Special" — $0.99 — themed bundle (October only)
  "Holiday Cozy" — $0.99 — winter themed (December only)
```

### Revenue per user (projections)

| User type | Spend | % of users |
|-----------|-------|-----------|
| Free | $0 | 60% |
| Light spender (1-2 packs) | $1-2 | 25% |
| Medium (packs + Pixel Me) | $4-6 | 10% |
| Whale (everything) | $15-25 | 5% |

### Cost structure

| Asset type | Cost to us | Revenue | Margin |
|-----------|-----------|---------|--------|
| Cosmetic packs | $0.00 (pre-generated PNGs) | $0.99/pack | 100% |
| Individual items | $0.00 | $0.29-0.49 | 100% |
| Pixel Me | ~$0.04 | $1.99 | 97% |
| Pixel My Pet | ~$0.04 | $1.99 | 97% |
| Re-roll | ~$0.02 | $0.49 | 96% |

---

## 16. Scripts Inventory

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `swap_outlines.py` | Dark outlines → specified color (NPCs, UI) | PNG + `--color` | PNG |
| ~~`swap_outlines_white.py`~~ | NOT NEEDED — engine renders white outlines at runtime | — | — |
| `stitch_spritesheet.py` | Compose frames into pixel-agents 56×41 grid | Directory of 48px frames | Spritesheet PNG |
| `generate_portrait_variants.py` | Expression + lighting variants | 128px base portrait | 48 PNGs per character |
| `generate_bodies.py` | 10 body type layers | — | 10 spritesheet PNGs |
| `generate_skins.py` | 6 skin tone variants | body PNGs | 60 PNGs |
| `generate_eyes.py` | 8 eye type layers | — | 8 spritesheet PNGs |
| `generate_hairstyles.py` | 30 hairstyle layers | — | 30 spritesheet PNGs |
| `generate_outfits.py` | 40 outfit layers | — | 40 spritesheet PNGs |
| `generate_shoes.py` | 10 shoe type layers | — | 10 spritesheet PNGs |
| `generate_accessories.py` | 15 accessory layers | — | 15 spritesheet PNGs |
| `asset_audit.py` | Validate all assets | public/sprites/ | Report |
| `build_venue.mjs` | Stitch venue quadrants | 4 quadrant PNGs | Venue PNG |

---

## 17. Asset File Destinations

```
public/sprites/
├── characters/
│   ├── premade/              # 20 main chars (WHITE outlines)
│   ├── npcs/                 # 10 NPCs (DARK GRAY outlines)
│   ├── bodies/               # 10 body types
│   ├── eyes/                 # 8 eye types
│   ├── outfits/              # 40 outfits
│   ├── hairstyles/           # 30 hairstyles
│   ├── shoes/                # 10 shoes (NEW)
│   ├── accessories/          # 15 accessories (NEW)
│   └── portraits/
│       ├── premade/          # 20 chars × 16 expressions × 3 variants
│       └── generated/        # Pixel Me custom portraits (Supabase Storage)
├── pets/                     # Pixel My Pet sprites (Supabase Storage for user-generated)
│   └── templates/            # Example pets for marketing
├── props/                    # 15 + 3 vehicle props (BLACK outlines)
├── venues/
│   ├── lounge_layer1.png
│   ├── lounge_layer2.png
│   └── ...
├── tilesets/
│   └── {venue}/
└── ui/
    ├── portrait_frame.png
    ├── share_card.png
    ├── chat_panel.png
    └── particles/
```

---

## 18. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| White outlines look bad on light backgrounds | High | Medium | Test on parchment venue walls. May need 1px dark inner outline. |
| PixelLab style doesn't match brand | High | Low | Style probe passed (Step 1). Use `style_images`. |
| Spritesheet stitching misalignment | High | Medium | Build + test stitcher before character gen. |
| Compositable layers don't align | High | High | Test each category against `buildCharacterSheet()`. |
| PixelLab budget exhaustion | Medium | Low | ~295 jobs. Well under 2000 limit. |
| Venue quadrant seams | Medium | Medium | Fallback: keep placeholder backgrounds. |
| Portrait expression swap uncanny | Medium | High | Fallback: 3 key expressions via PixelLab. |
| Pixel Me quality inconsistent | Medium | Medium | Allow re-rolls ($0.49). Refund policy if unusable. |
| Pet scaling looks wrong at 48px | Low | Medium | Adjustable scale per pet type. |
| NPC outlines too similar to main chars | Medium | Low | Significant color diff: white vs #2A2A2A. |

---

## 19. Cost Summary

| Item | Cost | Notes |
|------|------|-------|
| PixelLab Tier 1 | $12/mo | 1 month. ~295 jobs (20 chars + 10 NPCs + 15 props + ~150 tiles + 20 portraits). |
| Python + Pillow | $0 | Already installed |
| Node + sharp | $0 | Already in devDependencies |
| Silkscreen font | $0 | Google Fonts (OFL) |
| **Total (one-time)** | **$12** | |

Runtime costs (Pixel Me / Pet):
| Per generation | ~$0.04 | Haiku vision + 2× PixelLab |
| Revenue per generation | $1.99 | 97% margin |

---

## 20. Test Assets (generated so far)

```
art-tests/
├── sf-golden-hour/           # FINAL STYLE REFERENCE — approved
│   ├── soma_coffee.png       # Venue style gold standard
│   ├── rooftop_bar.png       # Venue style gold standard
│   ├── male_slate.png        # Character reference (slate blue outlines)
│   └── female_slate.png      # Character reference (slate blue outlines)
├── golden-hour-sf-brand/     # Brand UI elements
│   ├── portrait_frame.png
│   ├── share_card.png
│   ├── chat_panel.png
│   └── petals_dustmotes.png
├── style-probe/              # Phase 7 style probe results
│   ├── char01_south.png      # PixelLab Char 01 (approved)
│   ├── char01_south_slate.png# With slate blue outlines (rejected for chars)
│   ├── char02_south.png      # PixelLab Char 02 (approved)
│   ├── char02_south_slate.png# With slate blue outlines (rejected for chars)
│   ├── dino_south.png        # Pixel Me test (T-Rex from reference image)
│   ├── dino_128.png          # 128px version — high quality
│   └── pixel_poodle.png      # Pixel My Pet test (poodle from photo) — excellent
├── ratio-test/              # Character-to-tile ratio validation — APPROVED
│   ├── 96px_chibi_south.png       # 96px canvas chibi (28×67px content)
│   ├── 96px_chibi_cropped_48x96.png  # Cropped to 48×96 frame — CORRECT RATIO (1.40 tiles)
│   ├── 96px_default_south.png     # 96px canvas default proportions
│   ├── 96px_default_cropped_48x96.png # Slightly too tall (1.46 tiles)
│   ├── 80px_chibi_south.png       # 80px canvas — too short
│   ├── comparison.png             # Side-by-side: original vs all tests
│   └── tile_ratio_comparison.png  # ON-GRID comparison — approved
├── warm-analog/              # Rejected — delete in Step 11
└── polaroid-party/           # Rejected — delete in Step 11
```

---

## 21. Success Criteria

Phase 7 is complete when:

1. All 20 premade characters render in canvas with walk + idle animations (white outlines)
2. 10 NPCs populate venues (dark gray outlines, muted clothing)
3. Custom character builder works with new compositable layers
4. All 6 venues render with Golden Hour SF style
5. Portrait panel shows real 128x128 portraits for at least neutral + happy + sad
6. All 15 dating props render at correct scale
7. UI uses parchment + slate blue chrome throughout
8. Ambient dust motes always visible
9. "Pixel Me" API route works end-to-end (upload → generation → delivery)
10. "Pixel My Pet" API route works end-to-end (with pet-in-venue toggle)
11. Cosmetic shop UI shows free vs locked items correctly
12. Build passes clean (`tsc`, `lint`, `next build`)
13. Total `public/sprites/` size < 50MB
14. Share card generator produces a shareable PNG

---

## 22. Next Immediate Actions

1. **Update `stitch_spritesheet.py`** to crop 96×96 → 48×96 before placing in grid
2. **Generate 1 NPC** at 96px with muted clothes + dark gray outlines
3. **Side-by-side screenshot:** NPC (dark gray) vs main char vs venue background
4. **Approve visual hierarchy** → then batch generate everything

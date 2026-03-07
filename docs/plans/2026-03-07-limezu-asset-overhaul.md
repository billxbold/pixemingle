# LimeZu Asset Overhaul Plan

## Goal
Replace all hand-coded pixel arrays with real LimeZu PNG sprites at 48x48. Make the app look like a polished pixel art game, not programmer art.

## What We Have (LimeZu folder inventory)

### `moderninteriors-win/` (Main asset pack - the goldmine)

**1_Interiors/48x48/**
- `Room_Builder_48x48.png` — walls, floors, windows, doors (tileset)
- `Interiors_48x48.png` — all furniture in one giant sheet
- `Theme_Sorter_Singles_48x48/` — individual furniture PNGs sorted by theme (BEST for us)
- `Theme_Sorter_48x48/` — themed tilesheets

**2_Characters/Character_Generator/** — Layered sprite system:
- `Bodies/48x48/` — 9 body types (skin tones), each is a full spritesheet
- `Eyes/48x48/` — 7 eye styles
- `Outfits/48x48/` — 132 outfit variants (9 outfit families x color variants)
- `Hairstyles/48x48/` — 200 hairstyle variants
- `Accessories/48x48/` — 84 accessories (backpacks, hats, etc.)
- `Smartphones/48x48/` — phone overlay sprites
- `Books/48x48/` — book overlay sprites
- `0_Premade_Characters/48x48/` — 20 ready-to-use character spritesheets
- **Spritesheet layout** (from guide): idle, walk, sleep, sit (2 types), phone (4-9 loop), idle anim (1-6 loop), push cart, pick up, gift, lift, throw, hit, punch, stab, grab gun, gun idle, shoot, hurt

**3_Animated_objects/48x48/** — animated furniture (spritesheets + gifs)

**4_User_Interface_Elements/**
- `UI_48x48.png` — speech bubbles, emote icons (heart, ?, !, music, anger, etc.)
- `UI_thinking_emotes_animation_48x48.png` — animated thinking/emote bubbles
- `Animated_Spritesheets/` — angry emote, tear drop, thinking dots, mail, arrows, timers (all 48x48)

**6_Home_Designs/** — PREMADE ROOM LAYOUTS (layered PNGs):
| Folder | Our Venue Match | Quality |
|--------|----------------|---------|
| Ice-Cream_Shop_Designs | icecream | Perfect match |
| Japanese_Interiors_Home_Designs | japanese | Perfect match |
| Museum_Designs | museum | Perfect match (4 rooms!) |
| TV_Studio_Designs | studio | Perfect match |
| Generic_Home_Designs | lounge | Good (cozy living room) |
| Condominium_Designs | gallery | Usable (open modern space) |
| Gym_Designs | (bonus?) | Available if needed |

Each has `layer_1` (floor/walls), `layer_2` (furniture), and `preview` (combined).

### `Modern tiles_Free/` (Free subset)
- `Characters_free/` — Adam, Alex, Amelia, Bob at 16x16 with idle, run, sit, phone actions
- `Interiors_free/` — subset tilesets at 16x16, 32x32, 48x48

### `Modern_Interiors_RPG_Maker_Version/` (RPG Maker formatted)
- Same assets reformatted for RPG Maker MV grid (768x768 tilesheets)
- Characters as RPG Maker spritesheets (48x48 grid per frame)
- Not directly useful for us — use moderninteriors-win instead

---

## The 4 Workstreams

### WS1: Standardize to 48x48 tile size
**Current state:** Engine uses 16x16 tiles, characters are hand-coded pixel arrays
**Target:** Everything renders at 48x48 base, scaled to canvas

**Tasks:**
1. Update `src/engine/constants.ts` — change TILE_SIZE from 16 to 48
2. Update `src/engine/types.ts` — any hardcoded 16x16 references
3. Update renderer to work with new tile size (camera, viewport calculations)
4. Update all position/movement math that assumes 16px tiles
5. Test that canvas viewport and scrolling still work

### WS2: Character system overhaul (PNG-based character generator)
**Current state:** Characters are `SpriteData` (2D hex color arrays) generated in code. Only walk (4 frames x 4 dirs) and typing (2 frames) exist. All other states fallback.
**Target:** PNG spritesheet characters using LimeZu's layered system

**Tasks:**
1. **Asset pipeline:** Copy needed character layers to `public/sprites/characters/`:
   - All 9 bodies, 7 eyes, select outfits (maybe 20-30), select hairstyles (maybe 30-40)
   - Also copy 20 premade characters as fallbacks
2. **Spritesheet loader:** Build `src/engine/sprites/spritesheetLoader.ts`
   - Load PNG spritesheet, parse grid (each frame is 48x48 within the sheet)
   - Support layered compositing: body + eyes + outfit + hairstyle + accessory
   - Cache composed spritesheets per character config
3. **Character config type:** Define character appearance as `{ body: number, eyes: number, outfit: string, hairstyle: string, accessory?: string }`
   - Map soul types to curated outfit/hairstyle combos
   - Or let users pick (future feature)
4. **Animation state mapping:** Map spritesheet rows to our FSM states:
   - Row 0: idle (4 dirs)
   - Row 1: walk (4 dirs, multi-frame)
   - Row 3-4: sit (2 variants — for venue seating)
   - Row 5: phone (for phone_check state)
   - Row 6: idle_anim (breathing/fidget loop)
   - Rows 8-9: gift (for flower_offer/accept)
   - Use particle overlays for emotions (existing system works)
5. **Replace getCharacterSprite()** in `src/engine/engine/characters.ts` to use PNG frames instead of SpriteData arrays
6. **Remove old SpriteData arrays** from `spriteData.ts` (or keep as fallback)

### WS3: Venue scenes using premade room PNGs
**Current state:** Scene layouts are flat arrays of `1`s. venueAssets.ts tries to load LimeZu Singles but scenes look empty.
**Target:** Use premade room layer PNGs as full background images

**Tasks:**
1. **Copy venue room PNGs** to `public/sprites/venues/`:
   - `icecream_layer1.png`, `icecream_layer2.png` (from Ice-Cream_Shop_Designs)
   - `japanese_layer1.png`, `japanese_layer2.png` (from Japanese_Interiors)
   - `museum_layer1.png`, `museum_layer2.png` (from Museum_Designs room 1)
   - `studio_layer1.png`, `studio_layer2.png` (from TV_Studio_Designs)
   - `lounge_layer1.png`, `lounge_layer2.png` (from Generic_Home_Designs)
   - `gallery_layer1.png`, `gallery_layer2.png` (from Condominium_Designs)
2. **Venue renderer:** Instead of tile-by-tile rendering, draw layer1 as background, then characters, then layer2 as foreground overlay
   - This gives depth — characters walk behind furniture tops
3. **Define walkable areas** per venue as simple polygon/rect arrays (characters can't walk through walls/counters)
4. **Define interaction points** per venue (seating positions, standing spots for dates)
5. **Scrap current venueAssets.ts Singles-based approach** — premade rooms look 100x better

### WS4: UI emotes, speech bubbles, and animated objects
**Current state:** Particles system draws simple shapes (hearts, confetti). No speech bubbles.
**Target:** LimeZu speech bubbles and emote icons above characters

**Tasks:**
1. **Copy UI assets** to `public/sprites/ui/`:
   - `UI_48x48.png` — speech bubbles + emote icon sheet
   - `UI_thinking_emotes_animation_48x48.png` — animated emotes
   - Animated GIFs from `Animated_Spritesheets/` (angry, teardrop, thinking dots)
2. **Speech bubble renderer:** Parse UI sheet for bubble frames, render above speaking character during DELIVER_LINE state
3. **Emote system:** Show emote bubbles (heart, !, ?, anger, music) above characters during emotional states
   - Maps to: REACT_EMOTION -> heart/anger/?, CELEBRATE -> music/star, DESPAIR -> teardrop
4. **Replace or augment particle system** with proper emote sprites for key emotions

---

## Execution Order

```
Phase 1: Foundation (WS1)
  - Change tile size to 48, fix all math
  - Everything still renders (just bigger/empty)

Phase 2: Venues (WS3)
  - Copy & load premade room PNGs
  - Instant visual upgrade — rooms look gorgeous
  - Define walkable areas

Phase 3: Characters (WS2)
  - Build spritesheet loader + compositor
  - Wire up animation states
  - Characters look professional

Phase 4: Polish (WS4)
  - Speech bubbles and emotes
  - Animated objects in venues
  - Final integration
```

## Files to Create/Modify

### New files:
- `src/engine/sprites/spritesheetLoader.ts` — PNG spritesheet parser + layer compositor
- `src/engine/sprites/characterConfig.ts` — character appearance definitions
- `src/engine/scenes/venueRenderer.ts` — new layer-based venue renderer
- `public/sprites/characters/` — character layer PNGs (from LimeZu)
- `public/sprites/venues/` — premade room layer PNGs (from LimeZu)
- `public/sprites/ui/` — UI emote/bubble sprites (from LimeZu)

### Modified files:
- `src/engine/constants.ts` — TILE_SIZE 16->48, related constants
- `src/engine/types.ts` — character appearance types, animation state mappings
- `src/engine/engine/characters.ts` — replace SpriteData rendering with PNG sprites
- `src/engine/engine/renderer.ts` — venue layer rendering, emote rendering
- `src/engine/scenes/index.ts` — venue walkable areas instead of tile grids
- `src/engine/particles.ts` — integrate emote sprites
- `src/engine/sequencePlayer.ts` — map actions to new animation states
- `src/engine/assetLoader.ts` — load venue PNGs + character sheets + UI sheet

### Deleted/deprecated:
- `src/engine/sprites/spriteData.ts` — most hand-coded arrays become unused
- `src/engine/scenes/venueAssets.ts` — replaced by premade room approach
- `src/engine/layout/furnitureCatalog.ts` — no longer placing individual furniture tiles

## Asset Copy Summary (what goes to public/)

Total estimated files to copy: ~80-100 PNGs
- 12 venue layer PNGs (6 venues x 2 layers)
- 20 premade character spritesheets (fallback/demo)
- ~40 character layers (9 bodies + 7 eyes + ~12 outfits + ~12 hairstyles)
- 3-5 UI sprite sheets
- All gitignored (already in .gitignore pattern)

## Key Decisions Needed
1. **48x48 vs 32x32?** — LimeZu has both. 48x48 is crispest and matches premade rooms. Recommend 48x48.
2. **Premade characters only vs full generator?** — Start with 20 premade, add generator later?
3. **Which 6 venues?** — Proposed mapping above. Gym could replace one?
4. **Canvas size?** — Premade rooms are ~500-900px wide. Our canvas viewport needs to match.

import { CharacterState, Direction } from '../types'
import type { CharacterAppearance } from '../types'

// ── Spritesheet layout ───────────────────────────────────────────
// LimeZu character sheets: 56 columns × 41 rows, each frame 48×48px
// Row groups (4 directions each: DOWN=+0, LEFT=+1, RIGHT=+2, UP=+3)

export const CHAR_FRAME_SIZE = 48

const ANIM_ROWS = {
  idle:     2,   // 4 dirs × 1 frame  (static stand)
  walk:     6,   // 4 dirs × 4 frames
  sit:      12,  // 4 dirs × 2 frames (sitting type 1)
  sit2:     16,  // 4 dirs × 2 frames (sitting type 2)
  phone:    20,  // 4 dirs × 6 frames (looking at phone)
  idleAnim: 24,  // 1 row  × 6 frames (subtle breathing loop)
  gift:     33,  // 4 dirs × 2 frames (giving gift/flowers)
} as const

const ANIM_FRAMES = {
  idle:     1,
  walk:     4,
  sit:      2,
  sit2:     2,
  phone:    6,
  idleAnim: 6,
  gift:     2,
} as const

const DIR_ROW: Record<Direction, number> = {
  [Direction.DOWN]:  0,
  [Direction.LEFT]:  1,
  [Direction.RIGHT]: 2,
  [Direction.UP]:    3,
}

/** Map a character FSM state to source pixel coordinates in its spritesheet */
export function getFrameCoords(
  state: (typeof CharacterState)[keyof typeof CharacterState],
  dir: Direction,
  frame: number,
): { sx: number; sy: number } {
  const d = DIR_ROW[dir]
  const fs = CHAR_FRAME_SIZE

  switch (state) {
    case CharacterState.WALK:
    case CharacterState.APPROACH:
    case CharacterState.WALK_AWAY:
      return { sx: (frame % ANIM_FRAMES.walk) * fs, sy: (ANIM_ROWS.walk + d) * fs }

    case CharacterState.TYPE:
      return { sx: (frame % ANIM_FRAMES.sit) * fs, sy: (ANIM_ROWS.sit + d) * fs }

    case CharacterState.CELEBRATE:
    case CharacterState.USE_PROP:
      return { sx: (frame % ANIM_FRAMES.idleAnim) * fs, sy: ANIM_ROWS.idleAnim * fs }

    case CharacterState.THINK:
      return { sx: (frame % ANIM_FRAMES.phone) * fs, sy: (ANIM_ROWS.phone + d) * fs }

    case CharacterState.DELIVER_LINE:
    case CharacterState.REACT_EMOTION:
    case CharacterState.BLUSH:
    case CharacterState.DESPAIR:
    case CharacterState.ANGRY_KICK:
    case CharacterState.IDLE:
    default:
      return { sx: (frame % ANIM_FRAMES.idle) * fs, sy: (ANIM_ROWS.idle + d) * fs }
  }
}

// ── Layer compositor ─────────────────────────────────────────────

const sheetCache = new Map<string, HTMLCanvasElement>()
const pendingLoads = new Map<string, Promise<HTMLCanvasElement>>()

function appearanceKey(a: CharacterAppearance): string {
  if (a.premadeIndex !== undefined) return `premade_${String(a.premadeIndex).padStart(2, '0')}`
  return `${a.body}_${a.eyes}_${a.outfit}_${a.hairstyle}_${a.accessory ?? ''}`
}

function loadImg(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** Build (or return cached) composited character spritesheet canvas */
export async function buildCharacterSheet(appearance: CharacterAppearance): Promise<HTMLCanvasElement> {
  const key = appearanceKey(appearance)
  const hit = sheetCache.get(key)
  if (hit) return hit
  const pending = pendingLoads.get(key)
  if (pending) return pending

  const promise = (async (): Promise<HTMLCanvasElement> => {
    let urls: string[]

    if (appearance.premadeIndex !== undefined) {
      const n = String(appearance.premadeIndex).padStart(2, '0')
      urls = [`/sprites/characters/premade/Premade_Character_48x48_${n}.png`]
    } else {
      const b = String(appearance.body).padStart(2, '0')
      const e = String(appearance.eyes).padStart(2, '0')
      urls = [
        `/sprites/characters/bodies/Body_48x48_${b}.png`,
        `/sprites/characters/eyes/Eyes_48x48_${e}.png`,
        `/sprites/characters/outfits/${appearance.outfit}.png`,
        `/sprites/characters/hairstyles/${appearance.hairstyle}.png`,
      ]
      if (appearance.accessory) urls.push(`/sprites/characters/accessories/${appearance.accessory}.png`)
    }

    const images = await Promise.all(urls.map(loadImg))
    const first = images.find(Boolean)
    if (!first) throw new Error(`No layers loaded for appearance: ${key}`)

    const canvas = document.createElement('canvas')
    canvas.width = first.naturalWidth
    canvas.height = first.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    for (const img of images) {
      if (img) ctx.drawImage(img, 0, 0)
    }

    // Boost saturation + contrast to match the vibrant pixel-agents style
    // Re-draw the composited result through a CSS filter
    const boost = document.createElement('canvas')
    boost.width = canvas.width
    boost.height = canvas.height
    const bCtx = boost.getContext('2d')!
    bCtx.filter = 'saturate(1.35) contrast(1.12)'
    bCtx.drawImage(canvas, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(boost, 0, 0)

    sheetCache.set(key, canvas)
    pendingLoads.delete(key)
    return canvas
  })()

  pendingLoads.set(key, promise)
  return promise
}

/** Return cached canvas immediately, or null if not yet loaded */
export function getCharacterSheetSync(appearance: CharacterAppearance): HTMLCanvasElement | null {
  return sheetCache.get(appearanceKey(appearance)) ?? null
}

/** Trigger async load of character sheet and store result on the character object */
export function ensureCharacterSheet(character: { appearance?: CharacterAppearance; sheetCanvas?: HTMLCanvasElement | null }): void {
  if (!character.appearance || character.sheetCanvas !== undefined) return
  character.sheetCanvas = null // mark loading
  buildCharacterSheet(character.appearance)
    .then(canvas => { character.sheetCanvas = canvas })
    .catch(() => { character.sheetCanvas = null })
}

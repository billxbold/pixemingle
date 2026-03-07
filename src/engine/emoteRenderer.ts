import type { Character } from './types'
import { CharacterState, TILE_SIZE } from './types'
import { loadSpriteSheet } from './assetLoader'

let uiSheet: HTMLImageElement | null = null
let uiSheetLoading = false

// UI_48x48.png emote positions (col, row in 48x48 grid)
// Row 0: cursor icons, then speech bubbles with icons
// The small bubble icons start around col 5 in row 0
const EMOTE_POSITIONS: Record<string, { col: number; row: number }> = {
  heart:    { col: 5, row: 0 },   // heart in bubble
  question: { col: 7, row: 0 },   // ? in bubble
  exclaim:  { col: 8, row: 0 },   // ! in bubble
  zzz:      { col: 9, row: 0 },   // Z sleep
  anger:    { col: 14, row: 0 },  // angry face
  music:    { col: 11, row: 0 },  // music note
  star:     { col: 13, row: 0 },  // star/sun
  teardrop: { col: 12, row: 0 },  // moon/sad
}

const EMOTION_TO_EMOTE: Record<string, string> = {
  happy: 'heart',
  sad: 'teardrop',
  angry: 'anger',
  nervous: 'question',
  excited: 'exclaim',
  bored: 'zzz',
  irritated: 'anger',
}

async function ensureUiSheet(): Promise<HTMLImageElement | null> {
  if (uiSheet) return uiSheet
  if (uiSheetLoading) return null
  uiSheetLoading = true
  try {
    uiSheet = await loadSpriteSheet('/sprites/ui/UI_48x48.png')
    return uiSheet
  } catch {
    uiSheetLoading = false
    return null
  }
}

export function renderEmotes(
  ctx: CanvasRenderingContext2D,
  characters: Character[],
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  // Trigger async load
  ensureUiSheet()
  if (!uiSheet) return

  for (const ch of characters) {
    if (!ch.emotion || ch.emotion === 'neutral') continue

    const emoteName = EMOTION_TO_EMOTE[ch.emotion]
    if (!emoteName) continue

    const pos = EMOTE_POSITIONS[emoteName]
    if (!pos) continue

    const sittingOff = ch.state === CharacterState.TYPE ? -18 : 0
    // Position above character head, offset to the right
    const emoteX = offsetX + ch.x * zoom + 8 * zoom / TILE_SIZE
    const emoteY = offsetY + (ch.y + sittingOff) * zoom - TILE_SIZE * zoom * 1.8

    const size = 24 * (zoom / 2)

    ctx.drawImage(
      uiSheet,
      pos.col * 48, pos.row * 48, 48, 48,
      emoteX, emoteY, size, size,
    )
  }
}

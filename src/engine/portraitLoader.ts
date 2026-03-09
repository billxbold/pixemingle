import type { PortraitExpression } from './types'

// ── Portrait URL resolution ──────────────────────────────────────

/**
 * Returns the URL for a character's portrait image.
 *
 * Path convention:
 *   premade:   /sprites/characters/portraits/premade/{charId}/{expression}_{variant}.png
 *   generated: /sprites/characters/portraits/generated/{charId}/{expression}_{variant}.png
 *
 * For MVP (before PixelLab assets): returns a placeholder data URL
 * generated programmatically (colored rectangle with emotion text).
 */
export function getPortraitUrl(
  characterId: string,
  expression: PortraitExpression,
  variant: 'soft' | 'sharp' | 'neutral',
): string {
  // Check if real portrait assets exist (future: PixelLab pipeline)
  // For now, always return placeholder path — the component handles fallback
  return `/sprites/characters/portraits/premade/${characterId}/${expression}_${variant}.png`
}

// ── Placeholder portrait generation ──────────────────────────────

const VARIANT_COLORS: Record<'soft' | 'sharp' | 'neutral', { bg: string; border: string }> = {
  soft: { bg: '#2d1b2e', border: '#e88fcf' },
  sharp: { bg: '#1b2533', border: '#6fa8dc' },
  neutral: { bg: '#252525', border: '#999999' },
}

const EMOTION_COLORS: Partial<Record<PortraitExpression, string>> = {
  genuine_smile: '#4ade80',
  shy_smile: '#f9a8d4',
  smug_grin: '#fbbf24',
  heart_eyes: '#f43f5e',
  starry_eyed: '#a78bfa',
  laughing: '#34d399',
  cringe: '#fb923c',
  shock: '#f87171',
  deadpan: '#94a3b8',
  crying: '#60a5fa',
  angry: '#ef4444',
  disgusted: '#84cc16',
  thinking: '#a78bfa',
  nervous: '#fbbf24',
  determined: '#f97316',
  neutral: '#9ca3af',
}

/**
 * Generates a 128x128 placeholder portrait on canvas.
 * Returns a data URL (PNG). Used until real PixelLab assets arrive.
 */
export function generatePlaceholderPortrait(
  expression: PortraitExpression,
  variant: 'soft' | 'sharp' | 'neutral',
  characterLabel?: string,
): string {
  // SSR safety: document is not available during server-side rendering
  if (typeof document === 'undefined') {
    return `/sprites/characters/portraits/premade/placeholder/${expression}_${variant}.png`
  }

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!

  const { bg, border } = VARIANT_COLORS[variant]
  const emotionColor = EMOTION_COLORS[expression] ?? '#9ca3af'

  // Background
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 128, 128)

  // Border (3px)
  ctx.strokeStyle = border
  ctx.lineWidth = 3
  ctx.strokeRect(2, 2, 124, 124)

  // Character circle indicator (top area)
  ctx.fillStyle = emotionColor
  ctx.beginPath()
  ctx.arc(64, 42, 24, 0, Math.PI * 2)
  ctx.fill()

  // Simple face in circle
  ctx.fillStyle = bg
  // Eyes
  ctx.fillRect(54, 36, 5, 5)
  ctx.fillRect(69, 36, 5, 5)
  // Mouth varies by expression
  drawMouth(ctx, expression)

  // Emotion label
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'center'
  const label = expression.replace(/_/g, ' ')
  ctx.fillText(label, 64, 84, 120)

  // Character label (if provided)
  if (characterLabel) {
    ctx.fillStyle = border
    ctx.font = '9px monospace'
    ctx.fillText(characterLabel, 64, 100, 120)
  }

  // Variant indicator (small text)
  ctx.fillStyle = border
  ctx.font = '8px monospace'
  ctx.fillText(variant, 64, 118)

  return canvas.toDataURL('image/png')
}

function drawMouth(ctx: CanvasRenderingContext2D, expression: PortraitExpression) {
  const cx = 64
  const my = 50

  ctx.strokeStyle = VARIANT_COLORS.neutral.bg
  ctx.lineWidth = 2
  ctx.beginPath()

  switch (expression) {
    case 'genuine_smile':
    case 'shy_smile':
    case 'heart_eyes':
    case 'starry_eyed':
      // Smile arc
      ctx.arc(cx, my - 2, 8, 0.1 * Math.PI, 0.9 * Math.PI)
      break
    case 'laughing':
      // Open mouth
      ctx.fillStyle = VARIANT_COLORS.neutral.bg
      ctx.ellipse(cx, my, 8, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'crying':
      // Sad arc
      ctx.arc(cx, my + 4, 8, 1.1 * Math.PI, 1.9 * Math.PI)
      break
    case 'shock':
      // O shape
      ctx.fillStyle = VARIANT_COLORS.neutral.bg
      ctx.arc(cx, my, 5, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'angry':
    case 'disgusted':
      // Wavy line
      ctx.moveTo(cx - 8, my)
      ctx.lineTo(cx - 3, my - 2)
      ctx.lineTo(cx + 3, my + 2)
      ctx.lineTo(cx + 8, my)
      break
    default:
      // Straight line
      ctx.moveTo(cx - 6, my)
      ctx.lineTo(cx + 6, my)
      break
  }
  ctx.stroke()
}

// ── Preloading ──────────────────────────────────────────────────

const ALL_EXPRESSIONS: PortraitExpression[] = [
  'neutral', 'genuine_smile', 'shy_smile', 'smug_grin',
  'heart_eyes', 'starry_eyed', 'laughing', 'cringe',
  'shock', 'deadpan', 'crying', 'angry',
  'disgusted', 'thinking', 'nervous', 'determined',
]

// Cache: characterId:expression:variant → data URL or loaded Image
const portraitCache = new Map<string, string>()

function cacheKey(charId: string, expression: PortraitExpression, variant: 'soft' | 'sharp' | 'neutral'): string {
  return `${charId}:${expression}:${variant}`
}

/**
 * Gets a portrait URL, returning a cached placeholder if the real asset
 * hasn't loaded or doesn't exist.
 */
export function getCachedPortraitUrl(
  characterId: string,
  expression: PortraitExpression,
  variant: 'soft' | 'sharp' | 'neutral',
  characterLabel?: string,
): string {
  const key = cacheKey(characterId, expression, variant)
  const cached = portraitCache.get(key)
  if (cached) return cached

  // Generate and cache placeholder
  const placeholder = generatePlaceholderPortrait(expression, variant, characterLabel)
  portraitCache.set(key, placeholder)
  return placeholder
}

/**
 * Preloads all 16 expression portraits for a character.
 * Attempts to load real PNGs first; falls back to placeholders.
 * Returns a promise that resolves when all images are ready.
 */
export async function preloadPortraits(
  characterId: string,
  variant: 'soft' | 'sharp' | 'neutral',
  characterLabel?: string,
): Promise<void> {
  const promises = ALL_EXPRESSIONS.map((expression) => {
    const key = cacheKey(characterId, expression, variant)
    if (portraitCache.has(key)) return Promise.resolve()

    return new Promise<void>((resolve) => {
      const url = getPortraitUrl(characterId, expression, variant)
      const img = new Image()

      img.onload = () => {
        // Real asset loaded successfully
        portraitCache.set(key, url)
        resolve()
      }

      img.onerror = () => {
        // No real asset — generate placeholder
        const placeholder = generatePlaceholderPortrait(expression, variant, characterLabel)
        portraitCache.set(key, placeholder)
        resolve()
      }

      img.src = url
    })
  })

  await Promise.all(promises)
}

/**
 * Clears portrait cache (useful when characters change).
 */
export function clearPortraitCache(): void {
  portraitCache.clear()
}

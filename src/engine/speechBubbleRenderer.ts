import type { Character } from './types'
import { CharacterState, TILE_SIZE } from './types'

const BUBBLE_PADDING = 8
const BUBBLE_MAX_WIDTH = 200
const BUBBLE_FONT_SIZE = 10
const BUBBLE_FONT = `${BUBBLE_FONT_SIZE}px monospace`
const BUBBLE_BG = 'rgba(255, 255, 255, 0.95)'
const BUBBLE_BORDER = '#333'
const BUBBLE_TEXT_COLOR = '#111'
const BUBBLE_TAIL_SIZE = 6
const BUBBLE_RADIUS = 6

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines
}

export function renderSpeechBubbles(
  ctx: CanvasRenderingContext2D,
  characters: Character[],
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  ctx.save()
  ctx.font = BUBBLE_FONT

  for (const ch of characters) {
    if (!ch.speechText || ch.speechTimer <= 0) continue

    const text = ch.speechText
    const lines = wrapText(ctx, text, BUBBLE_MAX_WIDTH)

    const lineHeight = BUBBLE_FONT_SIZE + 4
    const textWidth = Math.min(
      BUBBLE_MAX_WIDTH,
      Math.max(...lines.map(l => ctx.measureText(l).width))
    )
    const bubbleW = textWidth + BUBBLE_PADDING * 2
    const bubbleH = lines.length * lineHeight + BUBBLE_PADDING * 2

    const sittingOff = ch.state === CharacterState.TYPE ? -18 : 0
    const charScreenX = offsetX + ch.x * zoom
    const charScreenY = offsetY + (ch.y + sittingOff) * zoom

    const bubbleX = charScreenX - bubbleW / 2
    const bubbleY = charScreenY - (TILE_SIZE * zoom) - bubbleH - BUBBLE_TAIL_SIZE

    // Fade out in last 0.5s
    const alpha = ch.speechTimer < 0.5 ? ch.speechTimer / 0.5 : 1
    ctx.globalAlpha = alpha

    // Draw bubble background
    ctx.fillStyle = BUBBLE_BG
    ctx.strokeStyle = BUBBLE_BORDER
    ctx.lineWidth = 1.5

    // Rounded rect
    ctx.beginPath()
    ctx.moveTo(bubbleX + BUBBLE_RADIUS, bubbleY)
    ctx.lineTo(bubbleX + bubbleW - BUBBLE_RADIUS, bubbleY)
    ctx.arcTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + BUBBLE_RADIUS, BUBBLE_RADIUS)
    ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - BUBBLE_RADIUS)
    ctx.arcTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - BUBBLE_RADIUS, bubbleY + bubbleH, BUBBLE_RADIUS)
    ctx.lineTo(bubbleX + BUBBLE_RADIUS, bubbleY + bubbleH)
    ctx.arcTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - BUBBLE_RADIUS, BUBBLE_RADIUS)
    ctx.lineTo(bubbleX, bubbleY + BUBBLE_RADIUS)
    ctx.arcTo(bubbleX, bubbleY, bubbleX + BUBBLE_RADIUS, bubbleY, BUBBLE_RADIUS)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Draw tail
    const tailX = charScreenX
    const tailY = bubbleY + bubbleH
    ctx.beginPath()
    ctx.moveTo(tailX - BUBBLE_TAIL_SIZE, tailY)
    ctx.lineTo(tailX, tailY + BUBBLE_TAIL_SIZE)
    ctx.lineTo(tailX + BUBBLE_TAIL_SIZE, tailY)
    ctx.closePath()
    ctx.fillStyle = BUBBLE_BG
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(tailX - BUBBLE_TAIL_SIZE, tailY)
    ctx.lineTo(tailX, tailY + BUBBLE_TAIL_SIZE)
    ctx.lineTo(tailX + BUBBLE_TAIL_SIZE, tailY)
    ctx.strokeStyle = BUBBLE_BORDER
    ctx.stroke()

    // Draw text
    ctx.fillStyle = BUBBLE_TEXT_COLOR
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bubbleX + BUBBLE_PADDING, bubbleY + BUBBLE_PADDING + i * lineHeight)
    }
  }

  ctx.restore()
}

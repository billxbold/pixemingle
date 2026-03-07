'use client'

import { useEffect, useRef } from 'react'
import type { AgentAppearance } from '@/types/database'
import { buildCharacterSheet } from '@/engine/sprites/spritesheetLoader'
import type { CharacterAppearance } from '@/engine/types'

interface Props {
  appearance: AgentAppearance
  width?: number
  height?: number
}

const FRAME_SX = 0
const FRAME_SY = 2 * 48
const FRAME_W = 48
const CROP_Y = 20    // skip top empty space in the 96px two-row frame
const CROP_H = 72    // capture 72px of character content

export function CharacterPreviewCanvas({ appearance, width = 80, height = 120 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    buildCharacterSheet(appearance as CharacterAppearance)
      .then(sheet => {
        const c = canvasRef.current
        if (!c) return
        const cx = c.getContext('2d')
        if (!cx) return
        cx.clearRect(0, 0, width, height)
        cx.imageSmoothingEnabled = false
        cx.drawImage(sheet, FRAME_SX, FRAME_SY + CROP_Y, FRAME_W, CROP_H, 0, 0, width, height)
      })
      .catch(() => {
        const c = canvasRef.current
        if (!c) return
        const cx = c.getContext('2d')
        if (!cx) return
        cx.fillStyle = '#ec4899'
        cx.fillRect(width * 0.2, height * 0.1, width * 0.6, height * 0.8)
      })
  }, [appearance, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ imageRendering: 'pixelated', width, height }}
    />
  )
}

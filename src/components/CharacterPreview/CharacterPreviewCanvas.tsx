'use client'

import { useEffect, useRef } from 'react'
import type { AgentAppearance } from '@/types/database'
import { buildCharacterSheet } from '@/engine/sprites/spritesheetLoader'
import type { CharacterAppearance } from '@/engine/types'

interface Props {
  appearance: AgentAppearance
  size?: number
}

const FRAME_SX = 0
const FRAME_SY = 2 * 48
const FRAME_SIZE = 48

export function CharacterPreviewCanvas({ appearance, size = 96 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, size, size)

    buildCharacterSheet(appearance as CharacterAppearance)
      .then(sheet => {
        ctx.clearRect(0, 0, size, size)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(sheet, FRAME_SX, FRAME_SY, FRAME_SIZE, FRAME_SIZE, 0, 0, size, size)
      })
      .catch(() => {
        ctx.fillStyle = '#ec4899'
        ctx.fillRect(size * 0.2, size * 0.1, size * 0.6, size * 0.8)
      })
  }, [appearance, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', width: size, height: size }}
    />
  )
}

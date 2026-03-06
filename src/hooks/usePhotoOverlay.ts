'use client'

import { useMemo } from 'react'
import type { Candidate } from '@/types/database'
import { TILE_SIZE } from '@/engine/types'

export interface PhotoPosition {
  candidateIndex: number
  url: string
  screenX: number
  screenY: number
  size: number
  candidate: Candidate
}

// Gallery layout: photos arranged in a grid on the wall
const GALLERY_START_COL = 2
const GALLERY_START_ROW = 1
const PHOTOS_PER_ROW = 4
const PHOTO_SPACING = 2 // tiles between photos

export function usePhotoOverlay(
  candidates: Candidate[] | null,
  offsetX: number,
  offsetY: number,
  zoom: number,
): PhotoPosition[] {
  return useMemo(() => {
    if (!candidates) return []

    return candidates.slice(0, 12).map((candidate, i) => {
      const row = Math.floor(i / PHOTOS_PER_ROW)
      const col = i % PHOTOS_PER_ROW
      const worldX = (GALLERY_START_COL + col * PHOTO_SPACING) * TILE_SIZE + TILE_SIZE / 2
      const worldY = (GALLERY_START_ROW + row * PHOTO_SPACING) * TILE_SIZE + TILE_SIZE / 2
      const screenX = offsetX + worldX * zoom
      const screenY = offsetY + worldY * zoom
      const size = TILE_SIZE * zoom * 1.5
      const photo = candidate.user.photos?.[0] || ''

      return {
        candidateIndex: i,
        url: photo,
        screenX,
        screenY,
        size,
        candidate,
      }
    })
  }, [candidates, offsetX, offsetY, zoom])
}

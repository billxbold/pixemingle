import type { OfficeLayout, PlacedFurniture } from '../types'
import type { SceneName } from '../sceneManager'
import { VENUE_FURNITURE } from './venueAssets'
import type { VenueName } from '@/types/database'

export function createSceneLayouts(): Record<SceneName, OfficeLayout> {
  return {
    lounge: createVenueLayout('lounge', 10, 8),
    gallery: createVenueLayout('gallery', 12, 8),
    japanese: createVenueLayout('japanese', 10, 8),
    icecream: createVenueLayout('icecream', 10, 8),
    studio: createVenueLayout('studio', 14, 10),
    museum: createVenueLayout('museum', 12, 8),
  }
}

function createVenueLayout(venue: VenueName, cols: number, rows: number): OfficeLayout {
  const entries = VENUE_FURNITURE[venue]
  const furniture: PlacedFurniture[] = entries.map((entry, i) => ({
    uid: `${venue}_${entry.label}_${i}`,
    type: `venue_${venue}_${entry.number}`,
    col: entry.col,
    row: entry.row,
  }))

  return {
    version: 1,
    cols,
    rows,
    tiles: Array(cols * rows).fill(1),
    furniture,
  }
}

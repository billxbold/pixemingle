import type { OfficeLayout } from '../types'
import type { SceneName } from '../sceneManager'

// Venue dimensions (in tiles at 48px each) — must match the PNG layer sizes
// home:     672×642 = 14×13
// icecream: 576×480 = 12×10
// studio:   528×480 = 11×10
// gallery:  672×528 = 14×11
// lounge:   672×642 = 14×13 (642 = 13*48+18, use 13 rows)
// japanese: 912×642 = 19×13 (same floor height)
// museum:   960×816 = 20×17
const VENUE_DIMS: Record<SceneName, { cols: number; rows: number }> = {
  home:     { cols: 14, rows: 13 },
  icecream: { cols: 12, rows: 10 },
  studio:   { cols: 11, rows: 10 },
  gallery:  { cols: 14, rows: 11 },
  lounge:   { cols: 14, rows: 13 },
  japanese: { cols: 19, rows: 13 },
  museum:   { cols: 20, rows: 17 },
}

// Walkable tile sets per venue — tiles not in the set are VOID (8)
// Coordinates are "col,row" strings. Only the walkable floor tiles are listed.
function makeWalkableSet(regions: Array<{ c0: number; c1: number; r0: number; r1: number }>): Set<string> {
  const s = new Set<string>()
  for (const { c0, c1, r0, r1 } of regions) {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        s.add(`${c},${r}`)
      }
    }
  }
  return s
}

const WALKABLE_MASKS: Partial<Record<SceneName, Set<string>>> = {
  // Home: cross-shaped multi-room layout
  home: makeWalkableSet([
    { c0: 3, c1: 5, r0: 1, r1: 3 },   // top-left room
    { c0: 8, c1: 10, r0: 1, r1: 3 },  // top-right room
    { c0: 5, c1: 8, r0: 1, r1: 5 },   // top center corridor
    { c0: 1, c1: 12, r0: 4, r1: 8 },  // main center area
    { c0: 3, c1: 5, r0: 9, r1: 11 },  // bottom-left room
    { c0: 8, c1: 10, r0: 9, r1: 11 }, // bottom-right room
    { c0: 5, c1: 8, r0: 8, r1: 12 },  // bottom center corridor
  ]),
  // Icecream: rectangular open shop floor
  icecream: makeWalkableSet([
    { c0: 1, c1: 10, r0: 2, r1: 8 },
  ]),
  // Studio: rectangular open area
  studio: makeWalkableSet([
    { c0: 1, c1: 9, r0: 2, r1: 8 },
  ]),
  // Gallery: L-shaped gallery floor
  gallery: makeWalkableSet([
    { c0: 1, c1: 12, r0: 2, r1: 9 },
  ]),
  // Lounge: large open lounge area
  lounge: makeWalkableSet([
    { c0: 1, c1: 12, r0: 2, r1: 11 },
  ]),
  // Japanese: wide restaurant floor
  japanese: makeWalkableSet([
    { c0: 1, c1: 17, r0: 2, r1: 11 },
  ]),
  // Museum: large open hall
  museum: makeWalkableSet([
    { c0: 1, c1: 18, r0: 2, r1: 15 },
  ]),
}

export function createSceneLayouts(): Record<SceneName, OfficeLayout> {
  const result = {} as Record<SceneName, OfficeLayout>
  for (const [name, { cols, rows }] of Object.entries(VENUE_DIMS) as [SceneName, { cols: number; rows: number }][]) {
    const mask = WALKABLE_MASKS[name]
    const tiles = Array(cols * rows).fill(0).map((_, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      if (mask) return mask.has(`${col},${row}`) ? 1 : 8 // 1=floor, 8=VOID
      return 1
    })
    result[name] = {
      version: 1,
      cols,
      rows,
      tiles,
      furniture: [],
    }
  }
  return result
}

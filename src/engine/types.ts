export {
  TILE_SIZE,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  MAX_COLS,
  MAX_ROWS,
  MATRIX_EFFECT_DURATION_SEC as MATRIX_EFFECT_DURATION,
} from './constants'

export const TileType = {
  WALL: 0,
  FLOOR_1: 1,
  FLOOR_2: 2,
  FLOOR_3: 3,
  FLOOR_4: 4,
  FLOOR_5: 5,
  FLOOR_6: 6,
  FLOOR_7: 7,
  VOID: 8,
} as const
export type TileType = (typeof TileType)[keyof typeof TileType]

export interface FloorColor {
  h: number
  s: number
  b: number
  c: number
  colorize?: boolean
}

export const CharacterState = {
  IDLE: 'idle',
  WALK: 'walk',
  TYPE: 'type',
  // Dating states
  APPROACH: 'approach',
  DELIVER_LINE: 'deliver_line',
  REACT_EMOTION: 'react_emotion',
  USE_PROP: 'use_prop',
  CELEBRATE: 'celebrate',
  DESPAIR: 'despair',
} as const
export type CharacterState = (typeof CharacterState)[keyof typeof CharacterState]

export const Direction = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
} as const
export type Direction = (typeof Direction)[keyof typeof Direction]

export type SpriteData = string[][]

export interface Seat {
  uid: string
  seatCol: number
  seatRow: number
  facingDir: Direction
  assigned: boolean
}

export interface FurnitureInstance {
  sprite: SpriteData
  x: number
  y: number
  zY: number
}

export const FurnitureType = {
  DESK: 'desk',
  BOOKSHELF: 'bookshelf',
  PLANT: 'plant',
  COOLER: 'cooler',
  WHITEBOARD: 'whiteboard',
  CHAIR: 'chair',
  PC: 'pc',
  LAMP: 'lamp',
  // Dating scene furniture
  CAFE_TABLE: 'cafe_table',
  CAFE_CHAIR: 'cafe_chair',
  COFFEE_CUP: 'coffee_cup',
  BED: 'bed',
  WARDROBE: 'wardrobe',
  MIRROR: 'mirror',
  PARK_BENCH: 'park_bench',
  TREE: 'tree',
  FLOWER_POT: 'flower_pot',
  PHOTO_FRAME: 'photo_frame',
  STAGE_LIGHT: 'stage_light',
  // Dating props
  FLOWERS: 'flowers',
  GUITAR: 'guitar',
  DO_NOT_DISTURB: 'do_not_disturb',
  CAN: 'can',
} as const
export type FurnitureType = (typeof FurnitureType)[keyof typeof FurnitureType]

export interface FurnitureCatalogEntry {
  type: string
  label: string
  footprintW: number
  footprintH: number
  sprite: SpriteData
  isDesk: boolean
  category?: string
  orientation?: string
  canPlaceOnSurfaces?: boolean
  backgroundTiles?: number
  canPlaceOnWalls?: boolean
}

export interface PlacedFurniture {
  uid: string
  type: string
  col: number
  row: number
  color?: FloorColor
}

export interface OfficeLayout {
  version: 1
  cols: number
  rows: number
  tiles: TileType[]
  furniture: PlacedFurniture[]
  tileColors?: Array<FloorColor | null>
}

export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'nervous' | 'excited' | 'bored' | 'irritated'

export interface Character {
  id: number
  state: CharacterState
  dir: Direction
  x: number
  y: number
  tileCol: number
  tileRow: number
  path: Array<{ col: number; row: number }>
  moveProgress: number
  palette: number
  hueShift: number
  frame: number
  frameTimer: number
  wanderTimer: number
  wanderCount: number
  wanderLimit: number
  isActive: boolean
  seatId: string | null
  bubbleType: 'permission' | 'waiting' | null
  bubbleTimer: number
  seatTimer: number
  matrixEffect: 'spawn' | 'despawn' | null
  matrixEffectTimer: number
  matrixEffectSeeds: number[]
  // Dating state fields
  targetId: number | null
  approachSpeed: number
  stateDuration: number
  stateTimer: number
  emotion: Emotion
  propId: string | null
  speechText: string | null
  onStateComplete: (() => void) | null
}

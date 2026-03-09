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
  // Reaction states
  WALK_AWAY: 'walk_away',
  ANGRY_KICK: 'angry_kick',
  BLUSH: 'blush',
  THINK: 'think',
  SOUL_GHOST_ESCAPE: 'soul_ghost_escape',
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

export interface CharacterAppearance {
  body: number       // 1-9 (skin tone)
  eyes: number       // 1-7
  outfit: string     // e.g. 'Outfit_01_48x48_01'
  hairstyle: string  // e.g. 'Hairstyle_01_48x48_01'
  accessory?: string
  premadeIndex?: number // if set, use premade character PNG directly
}

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

/** @deprecated v1 emotion type — used by the character FSM (CharacterState).
 *  For v2 OpenClaw theater, use `EmotionState` from `@/types/database` via the `activeEmotion` field on Character. */
export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'nervous' | 'excited' | 'bored' | 'irritated'

// v2 body modifiers — driven by SOUL.md Expression Preferences
export type BodyModifier =
  // Posture
  | 'lean_forward' | 'lean_back' | 'lean_back_arms_crossed' | 'casual_lean'
  | 'stiff_pose' | 'slump' | 'slump_heavy' | 'open_posture' | 'puff_chest'
  // Hands/Arms
  | 'arms_crossed' | 'arms_crossed_smirk' | 'hands_in_pockets' | 'rub_back_of_neck'
  | 'cover_face_peek' | 'hand_on_hip' | 'chin_touch' | 'over_gesticulate' | 'finger_guns'
  // Head
  | 'slight_nod' | 'head_tilt' | 'look_away' | 'look_away_smile' | 'blush_look_away'
  | 'eyebrow_raise' | 'slow_blink' | 'deadpan_stare'
  // Full Body
  | 'slight_bounce' | 'slight_fidget' | 'slight_shift' | 'slight_wave' | 'shrink_slightly'
  | 'fist_pump' | 'hair_flip' | 'shrug_smile' | 'cover_mouth_laugh' | 'tap_foot'
  | 'determined_face' | 'relaxed_smile'
  // Special
  | 'none';

// v2 portrait expressions — 128x128 HTML overlay panel
export type PortraitExpression =
  | 'neutral' | 'genuine_smile' | 'shy_smile' | 'smug_grin'
  | 'heart_eyes' | 'starry_eyed' | 'laughing' | 'cringe'
  | 'shock' | 'deadpan' | 'crying' | 'angry'
  | 'disgusted' | 'thinking' | 'nervous' | 'determined';

// v2 expanded particle types
export type ParticleType =
  // Existing
  | 'heart' | 'confetti' | 'rain' | 'sweat' | 'lightbulb' | 'star' | 'music_note'
  // New
  | 'blush_tint' | 'blush_gradient' | 'slight_blush'
  | 'single_sweat_drop' | 'sweat_fountain'
  | 'small_sparkle' | 'small_star'
  | 'question_mark' | 'anger' | 'rain_cloud_personal'
  | 'tumbleweed' | 'tears';

export interface Character {
  id: number
  state: CharacterState
  dir: Direction
  x: number
  y: number
  appearance?: CharacterAppearance
  sheetCanvas?: HTMLCanvasElement | null // undefined=not requested, null=loading, canvas=ready
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
  speechTimer: number
  onStateComplete: (() => void) | null
  // v2 OpenClaw theater fields
  gender?: 'male' | 'female' | 'nonbinary'
  theaterRole?: 'chaser' | 'gatekeeper'
  activeBodyModifier?: BodyModifier
  activeEmotion?: import('@/types/database').EmotionState
  /** If true, character is an NPC (no white outline glow, muted visual priority) */
  isNpc?: boolean
}

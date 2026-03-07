import { CharacterState, Direction, TILE_SIZE } from '../types'
import type { Character, Seat, SpriteData, TileType as TileTypeVal } from '../types'
import type { CharacterSprites } from '../sprites/spriteData'
import { findPath } from '../layout/tileMap'
import {
  WALK_SPEED_PX_PER_SEC,
  WALK_FRAME_DURATION_SEC,
  TYPE_FRAME_DURATION_SEC,
  WANDER_PAUSE_MIN_SEC,
  WANDER_PAUSE_MAX_SEC,
  WANDER_MOVES_BEFORE_REST_MIN,
  WANDER_MOVES_BEFORE_REST_MAX,
  SEAT_REST_MIN_SEC,
  SEAT_REST_MAX_SEC,
  APPROACH_SPEED_NORMAL,
  DELIVER_LINE_FRAME_DURATION_SEC,
  REACT_EMOTION_FRAME_DURATION_SEC,
  CELEBRATE_FRAME_DURATION_SEC,
  DESPAIR_FRAME_DURATION_SEC,
} from '../constants'

function tileCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  }
}

function directionBetween(fromCol: number, fromRow: number, toCol: number, toRow: number): Direction {
  const dc = toCol - fromCol
  const dr = toRow - fromRow
  if (dc > 0) return Direction.RIGHT
  if (dc < 0) return Direction.LEFT
  if (dr > 0) return Direction.DOWN
  return Direction.UP
}

export function createCharacter(
  id: number,
  palette: number,
  seatId: string | null,
  seat: Seat | null,
  hueShift = 0,
): Character {
  const col = seat ? seat.seatCol : 1
  const row = seat ? seat.seatRow : 1
  const center = tileCenter(col, row)
  return {
    id,
    state: CharacterState.TYPE,
    dir: seat ? seat.facingDir : Direction.DOWN,
    x: center.x,
    y: center.y,
    tileCol: col,
    tileRow: row,
    path: [],
    moveProgress: 0,
    palette,
    hueShift,
    frame: 0,
    frameTimer: 0,
    wanderTimer: 0,
    wanderCount: 0,
    wanderLimit: randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX),
    isActive: true,
    seatId,
    bubbleType: null,
    bubbleTimer: 0,
    seatTimer: 0,
    matrixEffect: null,
    matrixEffectTimer: 0,
    matrixEffectSeeds: [],
    // Dating state fields
    targetId: null,
    approachSpeed: APPROACH_SPEED_NORMAL,
    stateDuration: 0,
    stateTimer: 0,
    emotion: 'neutral',
    propId: null,
    speechText: null,
    speechTimer: 0,
    onStateComplete: null,
  }
}

export function updateCharacter(
  ch: Character,
  dt: number,
  walkableTiles: Array<{ col: number; row: number }>,
  seats: Map<string, Seat>,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
): void {
  // Speech timer countdown
  if (ch.speechTimer > 0) {
    ch.speechTimer -= dt
    if (ch.speechTimer <= 0) {
      ch.speechText = null
      ch.speechTimer = 0
    }
  }

  ch.frameTimer += dt

  switch (ch.state) {
    case CharacterState.TYPE: {
      if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
        ch.frameTimer -= TYPE_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 2
      }
      if (!ch.isActive) {
        if (ch.seatTimer > 0) {
          ch.seatTimer -= dt
          break
        }
        ch.seatTimer = 0
        ch.state = CharacterState.IDLE
        ch.frame = 0
        ch.frameTimer = 0
        ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
        ch.wanderCount = 0
        ch.wanderLimit = randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX)
      }
      break
    }

    case CharacterState.IDLE: {
      ch.frame = 0
      if (ch.seatTimer < 0) ch.seatTimer = 0
      if (ch.isActive) {
        if (!ch.seatId) {
          ch.state = CharacterState.TYPE
          ch.frame = 0
          ch.frameTimer = 0
          break
        }
        const seat = seats.get(ch.seatId)
        if (seat) {
          const path = findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, tileMap, blockedTiles)
          if (path.length > 0) {
            ch.path = path
            ch.moveProgress = 0
            ch.state = CharacterState.WALK
            ch.frame = 0
            ch.frameTimer = 0
          } else {
            ch.state = CharacterState.TYPE
            ch.dir = seat.facingDir
            ch.frame = 0
            ch.frameTimer = 0
          }
        }
        break
      }
      ch.wanderTimer -= dt
      if (ch.wanderTimer <= 0) {
        if (ch.wanderCount >= ch.wanderLimit && ch.seatId) {
          const seat = seats.get(ch.seatId)
          if (seat) {
            const path = findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, tileMap, blockedTiles)
            if (path.length > 0) {
              ch.path = path
              ch.moveProgress = 0
              ch.state = CharacterState.WALK
              ch.frame = 0
              ch.frameTimer = 0
              break
            }
          }
        }
        if (walkableTiles.length > 0) {
          const target = walkableTiles[Math.floor(Math.random() * walkableTiles.length)]
          const path = findPath(ch.tileCol, ch.tileRow, target.col, target.row, tileMap, blockedTiles)
          if (path.length > 0) {
            ch.path = path
            ch.moveProgress = 0
            ch.state = CharacterState.WALK
            ch.frame = 0
            ch.frameTimer = 0
            ch.wanderCount++
          }
        }
        ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
      }
      break
    }

    case CharacterState.WALK: {
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 4
      }

      if (ch.path.length === 0) {
        const center = tileCenter(ch.tileCol, ch.tileRow)
        ch.x = center.x
        ch.y = center.y

        if (ch.isActive) {
          if (!ch.seatId) {
            ch.state = CharacterState.TYPE
          } else {
            const seat = seats.get(ch.seatId)
            if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
              ch.state = CharacterState.TYPE
              ch.dir = seat.facingDir
            } else {
              ch.state = CharacterState.IDLE
            }
          }
        } else {
          if (ch.seatId) {
            const seat = seats.get(ch.seatId)
            if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
              ch.state = CharacterState.TYPE
              ch.dir = seat.facingDir
              if (ch.seatTimer < 0) {
                ch.seatTimer = 0
              } else {
                ch.seatTimer = randomRange(SEAT_REST_MIN_SEC, SEAT_REST_MAX_SEC)
              }
              ch.wanderCount = 0
              ch.wanderLimit = randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX)
              ch.frame = 0
              ch.frameTimer = 0
              break
            }
          }
          ch.state = CharacterState.IDLE
          ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC)
        }
        ch.frame = 0
        ch.frameTimer = 0
        break
      }

      const nextTile = ch.path[0]
      ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row)

      ch.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt

      const fromCenter = tileCenter(ch.tileCol, ch.tileRow)
      const toCenter = tileCenter(nextTile.col, nextTile.row)
      const t = Math.min(ch.moveProgress, 1)
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t

      if (ch.moveProgress >= 1) {
        ch.tileCol = nextTile.col
        ch.tileRow = nextTile.row
        ch.x = toCenter.x
        ch.y = toCenter.y
        ch.path.shift()
        ch.moveProgress = 0
      }

      if (ch.isActive && ch.seatId) {
        const seat = seats.get(ch.seatId)
        if (seat) {
          const lastStep = ch.path[ch.path.length - 1]
          if (!lastStep || lastStep.col !== seat.seatCol || lastStep.row !== seat.seatRow) {
            const newPath = findPath(ch.tileCol, ch.tileRow, seat.seatCol, seat.seatRow, tileMap, blockedTiles)
            if (newPath.length > 0) {
              ch.path = newPath
              ch.moveProgress = 0
            }
          }
        }
      }
      break
    }

    case CharacterState.APPROACH: {
      // Like WALK but uses configurable approachSpeed
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 4
      }

      if (ch.path.length === 0) {
        const center = tileCenter(ch.tileCol, ch.tileRow)
        ch.x = center.x
        ch.y = center.y
        completeDatingState(ch)
        break
      }

      const nextTile = ch.path[0]
      ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row)
      ch.moveProgress += (ch.approachSpeed / TILE_SIZE) * dt

      const fromCenter = tileCenter(ch.tileCol, ch.tileRow)
      const toCenter = tileCenter(nextTile.col, nextTile.row)
      const t = Math.min(ch.moveProgress, 1)
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t

      if (ch.moveProgress >= 1) {
        ch.tileCol = nextTile.col
        ch.tileRow = nextTile.row
        ch.x = toCenter.x
        ch.y = toCenter.y
        ch.path.shift()
        ch.moveProgress = 0
      }
      break
    }

    case CharacterState.DELIVER_LINE: {
      if (ch.frameTimer >= DELIVER_LINE_FRAME_DURATION_SEC) {
        ch.frameTimer -= DELIVER_LINE_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 2
      }
      ch.stateTimer += dt
      if (ch.stateTimer >= ch.stateDuration) {
        completeDatingState(ch)
      }
      break
    }

    case CharacterState.REACT_EMOTION: {
      if (ch.frameTimer >= REACT_EMOTION_FRAME_DURATION_SEC) {
        ch.frameTimer -= REACT_EMOTION_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 2
      }
      ch.stateTimer += dt
      if (ch.stateTimer >= ch.stateDuration) {
        completeDatingState(ch)
      }
      break
    }

    case CharacterState.USE_PROP: {
      if (ch.frameTimer >= REACT_EMOTION_FRAME_DURATION_SEC) {
        ch.frameTimer -= REACT_EMOTION_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 2
      }
      ch.stateTimer += dt
      if (ch.stateTimer >= ch.stateDuration) {
        completeDatingState(ch)
      }
      break
    }

    case CharacterState.CELEBRATE: {
      if (ch.frameTimer >= CELEBRATE_FRAME_DURATION_SEC) {
        ch.frameTimer -= CELEBRATE_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 4
      }
      ch.stateTimer += dt
      if (ch.stateTimer >= ch.stateDuration) {
        completeDatingState(ch)
      }
      break
    }

    case CharacterState.DESPAIR: {
      if (ch.frameTimer >= DESPAIR_FRAME_DURATION_SEC) {
        ch.frameTimer -= DESPAIR_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 2
      }
      ch.stateTimer += dt
      if (ch.stateTimer >= ch.stateDuration) {
        completeDatingState(ch)
      }
      break
    }

    case CharacterState.ANGRY_KICK: {
      if (ch.frameTimer >= REACT_EMOTION_FRAME_DURATION_SEC) {
        ch.frameTimer -= REACT_EMOTION_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 2
      }
      ch.stateTimer += dt
      if (ch.stateTimer >= ch.stateDuration) {
        completeDatingState(ch)
      }
      break
    }

    case CharacterState.BLUSH: {
      if (ch.frameTimer >= REACT_EMOTION_FRAME_DURATION_SEC) {
        ch.frameTimer -= REACT_EMOTION_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 2
      }
      ch.stateTimer += dt
      if (ch.stateTimer >= ch.stateDuration) {
        completeDatingState(ch)
      }
      break
    }

    case CharacterState.THINK: {
      if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
        ch.frameTimer -= TYPE_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 2
      }
      ch.stateTimer += dt
      if (ch.stateTimer >= ch.stateDuration) {
        completeDatingState(ch)
      }
      break
    }

    case CharacterState.SOUL_GHOST_ESCAPE: {
      // Float upward + fade out over stateDuration
      ch.stateTimer += dt
      ch.y -= 30 * dt  // float up 30px per second
      ch.frameTimer += dt
      if (ch.frameTimer >= 0.15) {
        ch.frameTimer -= 0.15
        ch.frame = (ch.frame + 1) % 4
      }
      if (ch.stateTimer >= ch.stateDuration) {
        completeDatingState(ch)
      }
      break
    }

    case CharacterState.WALK_AWAY: {
      // Like WALK but completes and fires callback when path is done
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC
        ch.frame = (ch.frame + 1) % 4
      }

      if (ch.path.length === 0) {
        const center = tileCenter(ch.tileCol, ch.tileRow)
        ch.x = center.x
        ch.y = center.y
        completeDatingState(ch)
        break
      }

      const nextTile = ch.path[0]
      ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row)
      ch.moveProgress += (ch.approachSpeed / TILE_SIZE) * dt

      const fromCenter = tileCenter(ch.tileCol, ch.tileRow)
      const toCenter = tileCenter(nextTile.col, nextTile.row)
      const t = Math.min(ch.moveProgress, 1)
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t

      if (ch.moveProgress >= 1) {
        ch.tileCol = nextTile.col
        ch.tileRow = nextTile.row
        ch.x = toCenter.x
        ch.y = toCenter.y
        ch.path.shift()
        ch.moveProgress = 0
      }
      break
    }
  }
}

function completeDatingState(ch: Character): void {
  const callback = ch.onStateComplete
  ch.state = CharacterState.IDLE
  ch.frame = 0
  ch.frameTimer = 0
  ch.stateTimer = 0
  ch.stateDuration = 0
  ch.speechText = null
  ch.propId = null
  ch.onStateComplete = null
  callback?.()
}

export function triggerSoulGhostEscape(ch: Character, onComplete: () => void) {
  ch.state = CharacterState.SOUL_GHOST_ESCAPE
  ch.stateDuration = 2
  ch.stateTimer = 0
  ch.frame = 0
  ch.emotion = 'sad'
  ch.speechText = "Nooo..."
  ch.speechTimer = 1.5
  ch.onStateComplete = () => {
    ch.emotion = 'neutral'
    ch.speechText = null
    ch.speechTimer = 0
    onComplete()
  }
}

export function getCharacterSprite(ch: Character, sprites: CharacterSprites): SpriteData {
  switch (ch.state) {
    case CharacterState.TYPE:
      return sprites.typing[ch.dir][ch.frame % 2]
    case CharacterState.WALK:
    case CharacterState.APPROACH:
    case CharacterState.WALK_AWAY:
      return sprites.walk[ch.dir][ch.frame % 4]
    case CharacterState.DELIVER_LINE:
    case CharacterState.USE_PROP:
      return sprites.deliverLine[ch.frame % 2]
    case CharacterState.REACT_EMOTION:
    case CharacterState.BLUSH:
      return sprites.blush[ch.frame % 2]
    case CharacterState.CELEBRATE:
      return sprites.celebrate[ch.frame % 4]
    case CharacterState.DESPAIR:
      return sprites.despair[ch.frame % 2]
    case CharacterState.ANGRY_KICK:
      return sprites.angryKick[ch.frame % 2]
    case CharacterState.THINK:
      return sprites.think[ch.frame % 2]
    case CharacterState.SOUL_GHOST_ESCAPE:
      return sprites.walk[ch.dir][ch.frame % 4]
    case CharacterState.IDLE:
    default:
      return sprites.walk[ch.dir][1]
  }
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

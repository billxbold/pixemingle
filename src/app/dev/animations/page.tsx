'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { WorldState } from '@/engine/engine/officeState'
import { CharacterState, Direction } from '@/engine/types'
import type { CharacterState as CharacterStateType } from '@/engine/types'
import { renderFrame } from '@/engine/engine/renderer'
import { APPROACH_SPEED_NORMAL } from '@/engine/constants'

const DATING_STATES = [
  { key: CharacterState.IDLE,         label: 'IDLE' },
  { key: CharacterState.WALK,         label: 'WALK' },
  { key: CharacterState.TYPE,         label: 'TYPE' },
  { key: CharacterState.APPROACH,     label: 'APPROACH' },
  { key: CharacterState.DELIVER_LINE, label: 'DELIVER_LINE' },
  { key: CharacterState.REACT_EMOTION,label: 'REACT_EMOTION (blush)' },
  { key: CharacterState.USE_PROP,     label: 'USE_PROP' },
  { key: CharacterState.CELEBRATE,    label: 'CELEBRATE' },
  { key: CharacterState.DESPAIR,      label: 'DESPAIR' },
  { key: CharacterState.ANGRY_KICK,   label: 'ANGRY_KICK' },
  { key: CharacterState.BLUSH,        label: 'BLUSH' },
  { key: CharacterState.THINK,        label: 'THINK' },
  { key: CharacterState.WALK_AWAY,    label: 'WALK_AWAY' },
] as const

const EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'nervous', 'excited', 'bored', 'irritated'] as const

export default function AnimationsPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldStateRef = useRef<WorldState | null>(null)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const [currentState, setCurrentState] = useState<CharacterStateType>(CharacterState.IDLE)
  const [currentEmotion, setCurrentEmotion] = useState<typeof EMOTIONS[number]>('neutral')

  useEffect(() => {
    // Small 8x6 test layout so characters stay in view
    const testLayout = {
      version: 1 as const,
      cols: 8,
      rows: 6,
      tiles: Array(8 * 6).fill(1), // all floor
      furniture: [],
      tileColors: [],
    }
    const ws = new WorldState(testLayout)
    ws.addAgent(1, 0, 0, undefined, true)
    ws.addAgent(2, 1, 0, undefined, true)
    worldStateRef.current = ws

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Disable image smoothing for crisp pixel art
    ctx.imageSmoothingEnabled = false

    let running = true

    const loop = (time: number) => {
      if (!running) return
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = time

      const wsRef = worldStateRef.current
      if (wsRef) {
        wsRef.update(dt)

        const layout = wsRef.getLayout()
        const chars = Array.from(wsRef.characters.values())

        renderFrame(
          ctx,
          canvas.width,
          canvas.height,
          wsRef.tileMap,
          wsRef.furniture,
          chars,
          4, // zoom — 8x6 tiles * 16px * 4 = 512x384, fits in 640x480
          0,
          0,
          undefined,
          undefined,
          layout.tileColors,
        )
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      running = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const triggerState = useCallback((state: CharacterStateType) => {
    const ws = worldStateRef.current
    if (!ws) return
    const ch = ws.characters.get(1)
    if (!ch) return

    setCurrentState(state)
    ch.state = state
    ch.frame = 0
    ch.frameTimer = 0
    ch.stateTimer = 0
    ch.stateDuration = 999 // hold until manually changed
    ch.emotion = currentEmotion

    switch (state) {
      case CharacterState.APPROACH:
        ch.approachSpeed = APPROACH_SPEED_NORMAL
        ch.stateDuration = 3
        ch.path = [
          { col: ch.tileCol + 1, row: ch.tileRow },
          { col: ch.tileCol + 2, row: ch.tileRow },
        ]
        break
      case CharacterState.WALK_AWAY:
        ch.approachSpeed = APPROACH_SPEED_NORMAL
        ch.dir = Direction.LEFT
        ch.path = [
          { col: Math.max(0, ch.tileCol - 1), row: ch.tileRow },
          { col: Math.max(0, ch.tileCol - 2), row: ch.tileRow },
        ]
        break
      case CharacterState.DELIVER_LINE:
        ch.speechText = 'Are you a pixel? Because you make my world complete.'
        break
      case CharacterState.USE_PROP:
        ch.propId = 'flowers'
        break
    }
  }, [currentEmotion])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-1 font-mono">Animation State Tester</h1>
      <p className="text-gray-500 text-xs font-mono mb-6">Click a state to trigger it on character 1</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas preview */}
        <div className="lg:col-span-2">
          <p className="text-xs text-gray-500 font-mono mb-2">CANVAS PREVIEW (zoom 4x)</p>
          <div className="bg-black rounded-lg overflow-hidden border border-gray-800 inline-block">
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              style={{ imageRendering: 'pixelated', display: 'block', width: '100%' }}
            />
          </div>
          <div className="mt-3 p-3 bg-gray-900 rounded-lg font-mono text-xs">
            <p className="text-gray-400">
              State: <span className="text-pink-300">{currentState}</span>
            </p>
            <p className="text-gray-400 mt-1">
              Emotion: <span className="text-purple-300">{currentEmotion}</span>
            </p>
          </div>
        </div>

        {/* State buttons */}
        <div>
          <p className="text-xs text-gray-500 font-mono mb-2">CHARACTER STATES</p>
          <div className="space-y-1.5">
            {DATING_STATES.map(s => (
              <button
                key={s.key}
                onClick={() => triggerState(s.key)}
                className={`block w-full text-left py-2 px-3 rounded text-xs font-mono transition-colors ${
                  currentState === s.key
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Emotion buttons */}
        <div>
          <p className="text-xs text-gray-500 font-mono mb-2">EMOTIONS</p>
          <div className="space-y-1.5">
            {EMOTIONS.map(e => (
              <button
                key={e}
                onClick={() => setCurrentEmotion(e)}
                className={`block w-full text-left py-2 px-3 rounded text-xs font-mono transition-colors ${
                  currentEmotion === e
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

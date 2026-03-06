'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { WorldState } from '@/engine/engine/officeState'
import { CharacterState } from '@/engine/types'
import type { CharacterState as CharacterStateType } from '@/engine/types'
import { createSceneLayouts } from '@/engine/scenes'
import { APPROACH_SPEED_NORMAL } from '@/engine/constants'

const DATING_STATES = [
  { key: CharacterState.IDLE, label: 'IDLE' },
  { key: CharacterState.WALK, label: 'WALK' },
  { key: CharacterState.TYPE, label: 'TYPE' },
  { key: CharacterState.APPROACH, label: 'APPROACH' },
  { key: CharacterState.DELIVER_LINE, label: 'DELIVER_LINE' },
  { key: CharacterState.REACT_EMOTION, label: 'REACT_EMOTION' },
  { key: CharacterState.USE_PROP, label: 'USE_PROP' },
  { key: CharacterState.CELEBRATE, label: 'CELEBRATE' },
  { key: CharacterState.DESPAIR, label: 'DESPAIR' },
] as const

const EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'nervous', 'excited', 'bored', 'irritated'] as const

export default function AnimationsPage() {
  const worldStateRef = useRef<WorldState | null>(null)
  const [currentState, setCurrentState] = useState<CharacterStateType>(CharacterState.IDLE)
  const [currentEmotion, setCurrentEmotion] = useState<typeof EMOTIONS[number]>('neutral')

  useEffect(() => {
    const layouts = createSceneLayouts()
    const ws = new WorldState(layouts.theater)
    ws.addAgent(1, 0, 0, undefined, true)
    ws.addAgent(2, 1, 0, undefined, true)
    worldStateRef.current = ws
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
      case CharacterState.DELIVER_LINE:
        ch.stateDuration = 2
        ch.speechText = 'Are you a pixel? Because you make my world complete.'
        break
      case CharacterState.REACT_EMOTION:
        ch.stateDuration = 1.5
        break
      case CharacterState.USE_PROP:
        ch.stateDuration = 2
        ch.propId = 'flowers'
        break
      case CharacterState.CELEBRATE:
        ch.stateDuration = 2
        break
      case CharacterState.DESPAIR:
        ch.stateDuration = 2
        break
    }
  }, [currentEmotion])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Animation State Tester</h1>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-3">Character States</h2>
          <div className="space-y-2">
            {DATING_STATES.map(s => (
              <button
                key={s.key}
                onClick={() => triggerState(s.key)}
                className={`block w-full text-left py-2 px-3 rounded text-sm font-mono ${
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

        <div>
          <h2 className="text-lg font-semibold mb-3">Emotions</h2>
          <div className="space-y-2">
            {EMOTIONS.map(e => (
              <button
                key={e}
                onClick={() => setCurrentEmotion(e)}
                className={`block w-full text-left py-2 px-3 rounded text-sm font-mono ${
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

      <div className="mt-8 p-4 bg-gray-900 rounded-lg">
        <p className="text-sm text-gray-400">
          Current: <span className="text-white font-mono">{currentState}</span>
          {' | '}
          Emotion: <span className="text-white font-mono">{currentEmotion}</span>
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Note: Custom animation sprites need to be created in Piskel/Aseprite and placed in public/sprites/characters/.
          Currently using walk/typing fallback frames.
        </p>
      </div>
    </div>
  )
}

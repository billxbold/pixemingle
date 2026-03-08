'use client'

import { useState, useCallback } from 'react'
import type { JourneyState } from '@/hooks/useJourneyState'
import type { AgentAppearance } from '@/types/database'
import type { SceneName } from '@/engine/sceneManager'

interface DevToolbarProps {
  journeyState: JourneyState
  onTransition: (state: JourneyState, meta?: { matchId?: string; role?: 'chaser' | 'gatekeeper' }) => void
  onTransitionScene: (scene: SceneName) => void
  onSetPartner: (name: string, appearance: AgentAppearance | null) => void
}

export function DevToolbar({ journeyState, onTransition, onTransitionScene, onSetPartner }: DevToolbarProps) {
  const [loading, setLoading] = useState(false)
  const isDev = process.env.NODE_ENV === 'development'

  const handleDemoMatch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dev/demo-match', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        alert(`Demo match failed: ${data.error}`)
        return
      }
      onSetPartner(data.matchUser.name, data.matchUser.appearance)
      onTransition('PROPOSING', { matchId: data.matchId, role: 'chaser' })
    } catch (err) {
      alert(`Demo match error: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [onTransition, onSetPartner])

  const handleSkipToTheater = useCallback(() => {
    const enterTheater = (window as unknown as Record<string, unknown>).__enterTheater as ((venue: string) => void) | undefined
    if (enterTheater) {
      enterTheater('lounge')
    } else {
      alert('No __enterTheater on window. Need a matchId first — click Demo Match.')
    }
  }, [])

  const handleReset = useCallback(() => {
    onTransitionScene('home')
    onTransition('HOME_IDLE')
  }, [onTransition, onTransitionScene])

  if (!isDev) return null

  return (
    <div className="fixed top-2 right-2 z-[9999] flex flex-col gap-1 bg-black/80 border border-yellow-500/50 rounded-lg p-2 text-xs font-mono">
      <div className="text-yellow-400 text-center mb-1">DEV</div>
      <div className="text-gray-400 text-center mb-1">{journeyState}</div>
      <button
        onClick={handleDemoMatch}
        disabled={loading}
        className="bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded disabled:opacity-50"
      >
        {loading ? '...' : 'Demo Match'}
      </button>
      <button
        onClick={handleSkipToTheater}
        className="bg-purple-700 hover:bg-purple-600 text-white px-2 py-1 rounded"
      >
        Skip→Theater
      </button>
      <button
        onClick={handleReset}
        className="bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded"
      >
        Reset
      </button>
    </div>
  )
}

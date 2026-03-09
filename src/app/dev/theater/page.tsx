'use client'

import { useState, useCallback } from 'react'
import type { EmotionState, ActionType, ComedyIntent } from '@/types/database'
import { getAllAtomIds } from '@/engine/comedyAtoms'

const EMOTIONS: EmotionState[] = [
  'neutral', 'nervous', 'confident', 'embarrassed', 'excited',
  'dejected', 'amused', 'annoyed', 'hopeful', 'devastated',
  'smug', 'shy', 'trying_too_hard', 'genuinely_happy', 'cringing',
]

const ACTIONS: ActionType[] = [
  'deliver_line', 'react', 'use_prop', 'physical_comedy',
  'environment_interact', 'signature_move', 'entrance', 'exit',
]

const INTENTS: ComedyIntent[] = [
  'self_deprecating', 'witty', 'physical', 'observational',
  'deadpan', 'absurdist', 'romantic_sincere', 'teasing', 'callback',
]

const ALL_ATOMS = getAllAtomIds()

interface TurnLog {
  turn_number: number
  agent_role: 'chaser' | 'gatekeeper'
  action: string
  emotion: string
  text: string
  comedy_atoms: string[]
  status: 'sent' | 'error'
  response?: string
}

export default function DevTheaterPage() {
  const [matchId, setMatchId] = useState('')
  const [turnNumber, setTurnNumber] = useState(0)
  const [agentRole, setAgentRole] = useState<'chaser' | 'gatekeeper'>('chaser')
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState<ActionType>('deliver_line')
  const [emotion, setEmotion] = useState<EmotionState>('nervous')
  const [comedyIntent, setComedyIntent] = useState<ComedyIntent>('witty')
  const [text, setText] = useState('')
  const [confidence, setConfidence] = useState(5)
  const [selectedAtoms, setSelectedAtoms] = useState<string[]>([])
  const [turnLog, setTurnLog] = useState<TurnLog[]>([])
  const [theaterState, setTheaterState] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const toggleAtom = useCallback((atomId: string) => {
    setSelectedAtoms(prev => {
      if (prev.includes(atomId)) return prev.filter(a => a !== atomId)
      if (prev.length >= 3) return prev
      return [...prev, atomId]
    })
  }, [])

  const submitTurn = useCallback(async () => {
    if (!matchId || !userId) return
    setLoading(true)

    try {
      const res = await fetch(`/api/theater/${matchId}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turn_number: turnNumber,
          agent_role: agentRole,
          user_id: userId,
          action,
          emotion,
          comedy_intent: comedyIntent,
          comedy_atoms: selectedAtoms,
          text: text || undefined,
          confidence,
        }),
      })

      const data = await res.json()

      setTurnLog(prev => [...prev, {
        turn_number: turnNumber,
        agent_role: agentRole,
        action,
        emotion,
        text,
        comedy_atoms: selectedAtoms,
        status: res.ok ? 'sent' : 'error',
        response: JSON.stringify(data, null, 2),
      }])

      if (res.ok) {
        setTurnNumber(prev => prev + 1)
        setAgentRole(prev => prev === 'chaser' ? 'gatekeeper' : 'chaser')
        setText('')
        setSelectedAtoms([])
      }
    } catch (err) {
      setTurnLog(prev => [...prev, {
        turn_number: turnNumber,
        agent_role: agentRole,
        action,
        emotion,
        text,
        comedy_atoms: selectedAtoms,
        status: 'error',
        response: String(err),
      }])
    } finally {
      setLoading(false)
    }
  }, [matchId, userId, turnNumber, agentRole, action, emotion, comedyIntent, selectedAtoms, text, confidence])

  const startEntrance = useCallback(async () => {
    if (!matchId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/theater/${matchId}/entrance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: 'skateboard',
          complication: 'trip',
          recovery: 'brush_off',
          confidence: 7,
        }),
      })
      const data = await res.json()
      setTurnLog(prev => [...prev, {
        turn_number: 0,
        agent_role: 'chaser',
        action: 'entrance',
        emotion: 'nervous',
        text: '',
        comedy_atoms: [],
        status: res.ok ? 'sent' : 'error',
        response: JSON.stringify(data, null, 2),
      }])
      if (res.ok) {
        setTurnNumber(1)
        setAgentRole('gatekeeper')
      }
    } catch (err) {
      setTurnLog(prev => [...prev, {
        turn_number: 0, agent_role: 'chaser', action: 'entrance',
        emotion: 'nervous', text: '', comedy_atoms: [],
        status: 'error', response: String(err),
      }])
    } finally {
      setLoading(false)
    }
  }, [matchId])

  const fetchState = useCallback(async () => {
    if (!matchId) return
    setFetchError(null)
    try {
      const res = await fetch(`/api/theater/${matchId}/state`)
      const data = await res.json()
      if (!res.ok) {
        setFetchError(`Failed to fetch state: ${res.status} ${res.statusText}`)
      }
      setTheaterState(data)
    } catch (err) {
      setFetchError(String(err))
      setTheaterState(null)
    }
  }, [matchId])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-mono">
      <h1 className="text-2xl font-bold mb-4">Dev Theater Console</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Match & User Setup */}
          <div className="bg-gray-800 p-4 rounded-lg space-y-2">
            <h2 className="text-lg font-semibold text-yellow-400">Setup</h2>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-700 px-3 py-1.5 rounded text-sm"
                placeholder="Match ID (UUID)"
                value={matchId}
                onChange={e => setMatchId(e.target.value)}
                aria-label="Match ID"
              />
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-700 px-3 py-1.5 rounded text-sm"
                placeholder="User ID (dev cookie)"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                aria-label="User ID"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={startEntrance}
                disabled={loading || !matchId}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-3 py-1.5 rounded text-sm"
              >
                Start Entrance
              </button>
              <button
                onClick={fetchState}
                disabled={!matchId}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1.5 rounded text-sm"
              >
                Fetch State
              </button>
            </div>
          </div>

          {/* Turn Builder */}
          <div className="bg-gray-800 p-4 rounded-lg space-y-3">
            <h2 className="text-lg font-semibold text-green-400">
              Turn #{turnNumber} — {agentRole}
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400">Action</label>
                <select className="w-full bg-gray-700 px-2 py-1.5 rounded text-sm" value={action} onChange={e => setAction(e.target.value as ActionType)}>
                  {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Emotion</label>
                <select className="w-full bg-gray-700 px-2 py-1.5 rounded text-sm" value={emotion} onChange={e => setEmotion(e.target.value as EmotionState)}>
                  {EMOTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Comedy Intent</label>
                <select className="w-full bg-gray-700 px-2 py-1.5 rounded text-sm" value={comedyIntent} onChange={e => setComedyIntent(e.target.value as ComedyIntent)}>
                  {INTENTS.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">Confidence (0-10)</label>
                <input type="number" min={0} max={10} className="w-full bg-gray-700 px-2 py-1.5 rounded text-sm" value={confidence} onChange={e => setConfidence(Math.min(10, Math.max(0, Number(e.target.value))))} aria-label="Confidence" />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400">Speech Text</label>
              <input
                className="w-full bg-gray-700 px-3 py-1.5 rounded text-sm"
                placeholder="What the agent says..."
                value={text}
                onChange={e => setText(e.target.value)}
                aria-label="Speech text"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400">Comedy Atoms (max 3)</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {ALL_ATOMS.map(atomId => (
                  <button
                    key={atomId}
                    onClick={() => toggleAtom(atomId)}
                    className={`text-xs px-2 py-0.5 rounded ${
                      selectedAtoms.includes(atomId)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {atomId}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={submitTurn}
              disabled={loading || !matchId || !userId}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 py-2 rounded font-bold"
            >
              {loading ? 'Submitting...' : `Submit Turn #${turnNumber}`}
            </button>
          </div>
        </div>

        {/* Right: Logs */}
        <div className="space-y-4">
          {/* Fetch Error */}
          {fetchError && (
            <div className="bg-red-900/40 border border-red-600 p-3 rounded-lg text-red-300 text-sm">
              {fetchError}
            </div>
          )}

          {/* Theater State */}
          {theaterState && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-400 mb-2">Theater State</h2>
              <pre className="text-xs text-gray-300 overflow-auto max-h-60">
                {JSON.stringify(theaterState, null, 2)}
              </pre>
            </div>
          )}

          {/* Turn Log */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-pink-400 mb-2">Turn Log</h2>
            {turnLog.length === 0 && (
              <p className="text-gray-500 text-sm">No turns submitted yet.</p>
            )}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {turnLog.map((log, i) => (
                <div key={i} className={`p-2 rounded text-xs ${log.status === 'sent' ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
                  <div className="flex gap-2 mb-1">
                    <span className="font-bold">Turn #{log.turn_number}</span>
                    <span className={log.agent_role === 'chaser' ? 'text-blue-400' : 'text-pink-400'}>{log.agent_role}</span>
                    <span className="text-gray-400">{log.action}</span>
                    <span className="text-yellow-400">{log.emotion}</span>
                    {log.status === 'error' && (
                      <span className="text-red-400 font-bold ml-auto">ERROR</span>
                    )}
                  </div>
                  {log.text && <div className="text-gray-300 mb-1">&quot;{log.text}&quot;</div>}
                  {log.comedy_atoms.length > 0 && (
                    <div className="text-gray-400">atoms: {log.comedy_atoms.join(', ')}</div>
                  )}
                  {log.response && (
                    <details className="mt-1">
                      <summary className="text-gray-500 cursor-pointer">Response</summary>
                      <pre className="text-gray-400 mt-1 overflow-auto">{log.response}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

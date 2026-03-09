'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { resolveExpression, resolveOutcome } from '@/engine/expressionEngine'
import { parseExpressionPreferences } from '@/engine/soulMdParser'
import type { ExpressionPreferences } from '@/engine/soulMdParser'
import type { ExpressionConfig } from '@/engine/expressionEngine'
import type { TheaterTurn, TheaterState, EmotionState } from '@/types/database'
import type { PortraitExpression } from '@/engine/types'

// Module-scope supabase client to prevent infinite subscribe loops
const supabase = createClient()

export type TheaterHookStatus = 'idle' | 'loading' | 'entrance' | 'active' | 'complete'

export interface TheaterTurnRenderData {
  turn: TheaterTurn
  expression: ExpressionConfig
  role: 'chaser' | 'gatekeeper'
}

export interface UseTheaterReturn {
  state: TheaterState | null
  status: TheaterHookStatus
  currentTurn: TheaterTurn | null
  chaserExpression: ExpressionConfig | null
  gatekeeperExpression: ExpressionConfig | null
  chaserEmotion: PortraitExpression
  gatekeeperEmotion: PortraitExpression
  activeSpeaker: 'chaser' | 'gatekeeper' | null
  speechText: string | null
  isMyTurn: boolean
  outcome: 'accepted' | 'rejected' | null
  /** Called when atom playback for a turn completes — readies next turn */
  onTurnRendered: () => void
  /** Queue of turns waiting to be rendered */
  pendingTurns: TheaterTurn[]
  /** Current turn being rendered */
  renderingTurn: TheaterTurn | null
  /** SOUL.md prefs for each role */
  chaserSoulPrefs: ExpressionPreferences
  gatekeeperSoulPrefs: ExpressionPreferences
  /** Set SOUL.md prefs (used by parent to inject loaded prefs) */
  setChaserSoulPrefs: (prefs: ExpressionPreferences) => void
  setGatekeeperSoulPrefs: (prefs: ExpressionPreferences) => void
}

const defaultPrefs = parseExpressionPreferences('')

export function useTheater(matchId: string | null, myUserId?: string): UseTheaterReturn {
  const [state, setState] = useState<TheaterState | null>(null)
  const [status, setStatus] = useState<TheaterHookStatus>('idle')
  const statusRef = useRef<TheaterHookStatus>('idle')
  const [chaserSoulPrefs, setChaserSoulPrefs] = useState<ExpressionPreferences>(defaultPrefs)
  const [gatekeeperSoulPrefs, setGatekeeperSoulPrefs] = useState<ExpressionPreferences>(defaultPrefs)

  // Keep statusRef in sync with status state
  statusRef.current = status

  // Turn rendering queue
  const [pendingTurns, setPendingTurns] = useState<TheaterTurn[]>([])
  const [renderingTurn, setRenderingTurn] = useState<TheaterTurn | null>(null)
  const processedTurnCount = useRef(0)

  // Derived state from rendering turn
  const [chaserEmotion, setChaserEmotion] = useState<PortraitExpression>('neutral')
  const [gatekeeperEmotion, setGatekeeperEmotion] = useState<PortraitExpression>('neutral')
  const [chaserExpression, setChaserExpression] = useState<ExpressionConfig | null>(null)
  const [gatekeeperExpression, setGatekeeperExpression] = useState<ExpressionConfig | null>(null)
  const [activeSpeaker, setActiveSpeaker] = useState<'chaser' | 'gatekeeper' | null>(null)
  const [speechText, setSpeechText] = useState<string | null>(null)

  // Load initial theater state
  useEffect(() => {
    if (!matchId) {
      setState(null)
      setStatus('idle')
      processedTurnCount.current = 0
      setPendingTurns([])
      setRenderingTurn(null)
      return
    }

    let cancelled = false
    setStatus('loading')

    async function loadState() {
      try {
        const res = await fetch(`/api/theater/${matchId}/state`)
        if (!res.ok || cancelled) return
        const data: TheaterState = await res.json()
        if (cancelled) return

        setState(data)

        // Determine status from theater state
        if (data.status === 'completed_accepted' || data.status === 'completed_rejected') {
          setStatus('complete')
        } else if (data.status === 'entrance') {
          setStatus('entrance')
        } else if (data.status === 'active') {
          setStatus('active')
        } else {
          setStatus('entrance')
        }

        // Queue all existing turns for rapid replay
        if (data.turns.length > 0) {
          processedTurnCount.current = 0
          setPendingTurns(data.turns)
        }
      } catch (err) {
        console.error('[useTheater] Failed to load state:', err)
        if (!cancelled) setStatus('idle')
      }
    }

    loadState()
    return () => { cancelled = true }
  }, [matchId])

  // Subscribe to realtime theater_turns inserts
  useEffect(() => {
    if (!matchId) return

    const channel = supabase
      .channel(`theater:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'theater_turns',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const newTurn = payload.new as TheaterTurn

        // Update state with new turn
        setState(prev => {
          if (!prev) return prev
          const alreadyExists = prev.turns.some(t => t.turn_number === newTurn.turn_number)
          if (alreadyExists) return prev

          const updatedTurns = [...prev.turns, newTurn]
          const currentTurnRole = newTurn.agent_role === 'chaser' ? 'gatekeeper' : 'chaser'

          return {
            ...prev,
            turns: updatedTurns,
            turn_count: updatedTurns.length,
            current_turn_role: currentTurnRole,
          }
        })

        // Queue turn for rendering if not already processed
        setPendingTurns(prev => {
          if (prev.some(t => t.turn_number === newTurn.turn_number)) return prev
          return [...prev, newTurn]
        })

        // Update status
        if (newTurn.action === 'exit') {
          setStatus('complete')
          // Both chaser and gatekeeper exits use positive emotion check for outcome
          const positiveEmotions: EmotionState[] = ['genuinely_happy', 'excited', 'hopeful', 'amused', 'confident']
          const exitOutcome = positiveEmotions.includes(newTurn.emotion) ? 'accepted' : 'rejected'
          setState(prev => prev ? { ...prev, outcome: exitOutcome, status: exitOutcome === 'accepted' ? 'completed_accepted' : 'completed_rejected' } : prev)
        } else if (newTurn.action === 'entrance') {
          setStatus('entrance')
        } else if (statusRef.current === 'entrance') {
          setStatus('active')
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Process next pending turn for rendering
  useEffect(() => {
    if (renderingTurn || pendingTurns.length === 0) return

    // Filter out already-processed turns, then sort and pick the lowest turn_number
    const unprocessed = pendingTurns.filter(t => t.turn_number >= processedTurnCount.current)
    if (unprocessed.length === 0) {
      setPendingTurns([])
      return
    }
    const sorted = unprocessed.sort((a, b) => a.turn_number - b.turn_number)
    const next = sorted[0]

    setRenderingTurn(next)

    // Resolve expression
    const prefs = next.agent_role === 'chaser' ? chaserSoulPrefs : gatekeeperSoulPrefs
    const expr = resolveExpression(next.emotion, prefs)

    if (next.agent_role === 'chaser') {
      setChaserExpression(expr)
      setChaserEmotion(expr.portrait)
    } else {
      setGatekeeperExpression(expr)
      setGatekeeperEmotion(expr.portrait)
    }

    setActiveSpeaker(next.agent_role)
    setSpeechText(next.text ?? null)
  }, [pendingTurns, renderingTurn, chaserSoulPrefs, gatekeeperSoulPrefs])

  // Called when a turn's atom playback completes
  const onTurnRendered = useCallback(() => {
    setRenderingTurn(prev => {
      if (prev) {
        processedTurnCount.current = prev.turn_number + 1
        // Remove the rendered turn from pending by turn_number
        setPendingTurns(pending =>
          pending.filter(t => t.turn_number !== prev.turn_number)
        )
      }
      return null
    })
  }, [])

  // Determine if it's the user's turn
  const currentTurn = state?.turns[state.turns.length - 1] ?? null
  const myRole = myUserId && state
    ? (state.chaser.user_id === myUserId ? 'chaser' : 'gatekeeper')
    : null
  const isMyTurn = myRole ? state?.current_turn_role === myRole : false

  const outcome = state?.outcome ?? null

  // Resolve outcome expressions when theater completes
  useEffect(() => {
    if (status !== 'complete' || !outcome) return

    const chaserOutcome = resolveOutcome(outcome, chaserSoulPrefs)
    const gatekeeperOutcome = resolveOutcome(
      outcome === 'accepted' ? 'accepted' : 'rejected',
      gatekeeperSoulPrefs
    )

    setChaserExpression(chaserOutcome)
    setChaserEmotion(chaserOutcome.portrait)
    setGatekeeperExpression(gatekeeperOutcome)
    setGatekeeperEmotion(gatekeeperOutcome.portrait)
    setActiveSpeaker(null)
    setSpeechText(null)
  }, [status, outcome, chaserSoulPrefs, gatekeeperSoulPrefs])

  return {
    state,
    status,
    currentTurn,
    chaserExpression,
    gatekeeperExpression,
    chaserEmotion,
    gatekeeperEmotion,
    activeSpeaker,
    speechText,
    isMyTurn,
    outcome,
    onTurnRendered,
    pendingTurns,
    renderingTurn,
    chaserSoulPrefs,
    gatekeeperSoulPrefs,
    setChaserSoulPrefs,
    setGatekeeperSoulPrefs,
  }
}

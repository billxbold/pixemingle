'use client'

import { useState, useCallback, useEffect } from 'react'

export type JourneyState =
  | 'HOME_IDLE'
  | 'RESEARCHING'
  | 'BROWSING'
  | 'PROPOSING'
  | 'WAITING'
  | 'THEATER'
  | 'POST_MATCH'

export interface RecoveredProposal {
  dateStatus: 'proposed'
  venue: string
  inviteText: string
}

const VALID_TRANSITIONS: Record<JourneyState, JourneyState[]> = {
  HOME_IDLE: ['RESEARCHING'],
  RESEARCHING: ['BROWSING'],
  BROWSING: ['PROPOSING', 'HOME_IDLE'],
  PROPOSING: ['WAITING'],
  WAITING: ['THEATER', 'HOME_IDLE'],
  THEATER: ['POST_MATCH', 'HOME_IDLE'],
  POST_MATCH: ['HOME_IDLE'],
}

export function useJourneyState() {
  const [state, setState] = useState<JourneyState>('HOME_IDLE')
  const [matchId, setMatchId] = useState<string | null>(null)
  const [role, setRole] = useState<'chaser' | 'gatekeeper'>('chaser')
  const [recoveredProposal, setRecoveredProposal] = useState<RecoveredProposal | null>(null)
  const [recoveredVenue, setRecoveredVenue] = useState<string | null>(null)

  const transition = useCallback((to: JourneyState, meta?: { matchId?: string; role?: 'chaser' | 'gatekeeper' }) => {
    setState((current) => {
      const allowed = VALID_TRANSITIONS[current]
      if (!allowed.includes(to)) {
        console.warn(`[JourneyState] Invalid transition: ${current} → ${to}. Allowed: ${allowed.join(', ')}`)
        return current
      }
      return to
    })
    if (meta?.matchId !== undefined) setMatchId(meta.matchId)
    if (meta?.role !== undefined) setRole(meta.role)
  }, [])

  // State recovery on page reload — check for active match via API
  useEffect(() => {
    let cancelled = false

    async function recover() {
      try {
        const res = await fetch('/api/journey/state')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled || !data.matchId) return

        setState(data.state as JourneyState)
        setMatchId(data.matchId)
        setRole(data.role)

        // Recover proposal data for user who missed the realtime broadcast
        if (data.dateStatus === 'proposed' && data.venue) {
          setRecoveredProposal({
            dateStatus: 'proposed',
            venue: data.venue,
            inviteText: data.inviteText ?? '',
          })
        }
        // Recover venue for theater re-entry after page reload
        if (data.state === 'THEATER' && data.venue) {
          setRecoveredVenue(data.venue as string)
        }
      } catch { /* no recovery needed */ }
    }

    recover()
    return () => { cancelled = true }
  }, [])

  return { state, matchId, role, transition, recoveredProposal, recoveredVenue }
}

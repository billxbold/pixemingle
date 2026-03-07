'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export type JourneyState =
  | 'HOME_IDLE'
  | 'RESEARCHING'
  | 'BROWSING'
  | 'PROPOSING'
  | 'WAITING'
  | 'THEATER'
  | 'POST_MATCH'

export function useJourneyState() {
  const [state, setState] = useState<JourneyState>('HOME_IDLE')
  const [matchId, setMatchId] = useState<string | null>(null)
  const [role, setRole] = useState<'chaser' | 'gatekeeper'>('chaser')

  const transition = useCallback((to: JourneyState, meta?: { matchId?: string; role?: 'chaser' | 'gatekeeper' }) => {
    setState(to)
    if (meta?.matchId !== undefined) setMatchId(meta.matchId)
    if (meta?.role !== undefined) setRole(meta.role)
  }, [])

  // State recovery on page reload — check for active match
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function recover() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      // Find active match for this user
      const { data: match } = await supabase
        .from('matches')
        .select('id, user_a_id, user_b_id, status')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .in('status', ['active', 'pending_b'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!match || cancelled) return

      const isChaser = match.user_a_id === user.id
      const matchRole = isChaser ? 'chaser' as const : 'gatekeeper' as const

      // Check for existing scenario
      const { data: scenario } = await supabase
        .from('scenarios')
        .select('result')
        .eq('match_id', match.id)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (scenario?.result) {
        // Scenario completed → POST_MATCH
        setState('POST_MATCH')
      } else if (scenario) {
        // Scenario exists but no result → THEATER
        setState('THEATER')
      } else {
        return // No active state to recover
      }

      setMatchId(match.id)
      setRole(matchRole)
    }

    recover()
    return () => { cancelled = true }
  }, [])

  return { state, matchId, role, transition }
}

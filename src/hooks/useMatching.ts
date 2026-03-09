'use client'

import { useState, useCallback } from 'react'
import type { Candidate } from '@/types/database'

export function useMatching() {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/matching/search', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Search failed (${res.status})`)
      }
      const data = await res.json()
      setCandidates(data.candidates)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed'
      setError(message)
      setCandidates(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const approve = useCallback(async (candidateId: string, score?: number, reasons?: unknown) => {
    const res = await fetch('/api/matching/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, score, reasons }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return { matchId: data.match.id as string, match: data.match }
  }, [])

  const pass = useCallback(async () => {
    setSelectedCandidate(null)
  }, [])

  const proposeDate = useCallback(async (matchId: string, venue: string) => {
    const res = await fetch(`/api/matches/${matchId}/propose-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venue }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Failed to propose date (${res.status})`)
    }
    return res.json()
  }, [])

  const respondVenue = useCallback(async (matchId: string, action: string, venue?: string) => {
    const res = await fetch(`/api/matches/${matchId}/respond-venue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, venue }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Failed to respond to venue (${res.status})`)
    }
    return res.json()
  }, [])

  return { candidates, selectedCandidate, setSelectedCandidate, loading, error, search, approve, pass, proposeDate, respondVenue }
}

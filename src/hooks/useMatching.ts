'use client'

import { useState, useCallback } from 'react'
import type { Candidate } from '@/types/database'

export function useMatching() {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(false)

  const search = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/matching/search', { method: 'POST' })
      const data = await res.json()
      setCandidates(data.candidates)
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
    return res.json()
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
    return res.json()
  }, [])

  const respondVenue = useCallback(async (matchId: string, action: string, venue?: string) => {
    const res = await fetch(`/api/matches/${matchId}/respond-venue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, venue }),
    })
    return res.json()
  }, [])

  return { candidates, selectedCandidate, setSelectedCandidate, loading, search, approve, pass, proposeDate, respondVenue }
}

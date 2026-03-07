'use client'

import { useCallback } from 'react'
import { DateProposalCard } from '@/components/DateProposal/DateProposalCard'
import { DateInvitationCard } from '@/components/DateProposal/DateInvitationCard'
import type { VenueName } from '@/types/database'

interface DateProposalOverlayProps {
  matchId: string
  role: 'chaser' | 'gatekeeper'
  dateStatus: 'pending' | 'proposed' | 'accepted' | 'countered' | 'declined'
  venueProposal: { venue: string; text: string } | null
  chaserName: string
  onPropose: (matchId: string, venue: string) => Promise<{ text: string; venue: string }>
  onRespond: (matchId: string, action: string, venue?: string) => Promise<Record<string, unknown>>
  onBroadcastProposal: (venue: string, text: string) => void
  onBroadcastResponse: (event: string, payload: Record<string, unknown>) => void
}

export function DateProposalOverlay({
  matchId,
  role,
  dateStatus,
  venueProposal,
  chaserName,
  onPropose,
  onRespond,
  onBroadcastProposal,
  onBroadcastResponse,
}: DateProposalOverlayProps) {
  const handlePropose = useCallback(async (id: string, venue: VenueName) => {
    const result = await onPropose(id, venue)
    onBroadcastProposal(venue, result.text)
    return result
  }, [onPropose, onBroadcastProposal])

  const handleAccept = useCallback(async () => {
    const result = await onRespond(matchId, 'accept')
    onBroadcastResponse('venue_accepted', result)
  }, [matchId, onRespond, onBroadcastResponse])

  const handleCounter = useCallback(async (venue: VenueName) => {
    const result = await onRespond(matchId, 'counter', venue)
    onBroadcastResponse('venue_countered', result)
  }, [matchId, onRespond, onBroadcastResponse])

  const handleDecline = useCallback(async () => {
    const result = await onRespond(matchId, 'decline')
    onBroadcastResponse('date_declined', result)
  }, [matchId, onRespond, onBroadcastResponse])

  // Chaser: show venue picker when match is active but no proposal yet
  if (role === 'chaser' && dateStatus === 'pending') {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900/95 border border-gray-700 rounded-xl max-w-lg w-[90vw] shadow-2xl">
        <DateProposalCard matchId={matchId} onPropose={handlePropose} />
      </div>
    )
  }

  // Chaser: waiting for response
  if (role === 'chaser' && dateStatus === 'proposed') {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 border border-pink-500/30 rounded-lg px-6 py-3">
        <span className="text-sm font-mono text-pink-300 animate-pulse">
          Waiting for their response...
        </span>
      </div>
    )
  }

  // Gatekeeper: show invitation when proposal arrives
  if (role === 'gatekeeper' && dateStatus === 'proposed' && venueProposal) {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900/95 border border-gray-700 rounded-xl max-w-lg w-[90vw] shadow-2xl">
        <DateInvitationCard
          chaserName={chaserName}
          venue={venueProposal.venue as VenueName}
          inviteText={venueProposal.text}
          onAccept={handleAccept}
          onCounter={handleCounter}
          onDecline={handleDecline}
        />
      </div>
    )
  }

  // Status announcements for accepted/countered/declined
  if (dateStatus === 'accepted') {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-green-900/90 border border-green-500/50 rounded-lg px-6 py-3">
        <span className="text-sm font-mono text-green-300">
          Date spot confirmed! Setting the scene...
        </span>
      </div>
    )
  }

  if (dateStatus === 'countered') {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-900/90 border border-amber-500/50 rounded-lg px-6 py-3">
        <span className="text-sm font-mono text-amber-300">
          They picked a different spot! Changing plans...
        </span>
      </div>
    )
  }

  if (dateStatus === 'declined') {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/50 rounded-lg px-6 py-3">
        <span className="text-sm font-mono text-red-300">
          They passed on the date...
        </span>
      </div>
    )
  }

  return null
}

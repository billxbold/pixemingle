'use client'

import { useState } from 'react'
import type { VenueName } from '@/types/database'
import { VenueCard } from './VenueCard'

const VENUES: VenueName[] = ['lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum']

interface DateProposalCardProps {
  matchId: string
  onPropose: (matchId: string, venue: VenueName) => Promise<{ text: string }>
}

export function DateProposalCard({ matchId, onPropose }: DateProposalCardProps) {
  const [selected, setSelected] = useState<VenueName | null>(null)
  const [inviteText, setInviteText] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handlePropose = async () => {
    if (!selected) return
    setSending(true)
    const result = await onPropose(matchId, selected)
    setInviteText(result.text)
    setSending(false)
    setSent(true)
  }

  if (sent) {
    return (
      <div style={{ padding: 24, textAlign: 'center', fontFamily: 'monospace' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>Invite Sent!</div>
        <div style={{ fontSize: 14, opacity: 0.7, fontStyle: 'italic' }}>&ldquo;{inviteText}&rdquo;</div>
        <div style={{ fontSize: 12, opacity: 0.5, marginTop: 12 }}>Waiting for their response...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
        Pick a Date Spot
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
        marginBottom: 16,
      }}>
        {VENUES.map((v) => (
          <VenueCard key={v} venue={v} selected={selected === v} onClick={() => setSelected(v)} />
        ))}
      </div>
      <button
        onClick={handlePropose}
        disabled={!selected || sending}
        style={{
          width: '100%',
          padding: '12px 24px',
          background: selected ? '#e44' : '#555',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 16,
          fontFamily: 'monospace',
          cursor: selected ? 'pointer' : 'not-allowed',
          opacity: sending ? 0.5 : 1,
        }}
      >
        {sending ? 'Your agent is writing...' : 'Propose This Date'}
      </button>
    </div>
  )
}

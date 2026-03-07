'use client'

import { useState } from 'react'
import type { VenueName } from '@/types/database'
import { VenueCard } from './VenueCard'

const VENUES: VenueName[] = ['lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum']

interface DateInvitationCardProps {
  chaserName: string
  venue: VenueName
  inviteText: string
  onAccept: () => void
  onCounter: (venue: VenueName) => void
  onDecline: () => void
}

export function DateInvitationCard({
  chaserName, venue, inviteText, onAccept, onCounter, onDecline,
}: DateInvitationCardProps) {
  const [showPicker, setShowPicker] = useState(false)

  if (showPicker) {
    return (
      <div style={{ padding: 16, fontFamily: 'monospace' }}>
        <div style={{ fontSize: 16, marginBottom: 12 }}>Pick a different spot:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {VENUES.filter((v) => v !== venue).map((v) => (
            <VenueCard key={v} venue={v} onClick={() => onCounter(v)} compact />
          ))}
        </div>
        <button
          onClick={() => setShowPicker(false)}
          style={{
            marginTop: 12, padding: '8px 16px', background: 'transparent',
            color: '#aaa', border: '1px solid #555', borderRadius: 6,
            fontFamily: 'monospace', cursor: 'pointer', width: '100%',
          }}
        >
          Never mind, go back
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', textAlign: 'center' }}>
      <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 8 }}>
        {chaserName}&apos;s agent says:
      </div>
      <div style={{
        fontSize: 16, fontStyle: 'italic', marginBottom: 16,
        padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
        borderRadius: 8, borderLeft: '3px solid #e44',
      }}>
        &ldquo;{inviteText}&rdquo;
      </div>
      <VenueCard venue={venue} />
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={onAccept} style={{
          flex: 1, padding: 12, background: '#4a4', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', cursor: 'pointer',
        }}>
          Let&apos;s go!
        </button>
        <button onClick={() => setShowPicker(true)} style={{
          flex: 1, padding: 12, background: '#e90', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', cursor: 'pointer',
        }}>
          I&apos;d rather go to...
        </button>
        <button onClick={onDecline} style={{
          flex: 1, padding: 12, background: '#a33', color: '#fff',
          border: 'none', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', cursor: 'pointer',
        }}>
          No thanks
        </button>
      </div>
    </div>
  )
}

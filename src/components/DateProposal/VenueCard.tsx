'use client'

import type { VenueName } from '@/types/database'
import { VENUE_INFO } from '@/types/database'

const VENUE_COLORS: Record<VenueName, string> = {
  lounge: '#1a1a2e',
  gallery: '#f5f5f0',
  japanese: '#2d1b0e',
  icecream: '#ffe4f0',
  studio: '#1c1c1c',
  museum: '#e8e0d0',
}

const VENUE_TEXT_COLORS: Record<VenueName, string> = {
  lounge: '#e0d0ff',
  gallery: '#333',
  japanese: '#ffcc80',
  icecream: '#d63384',
  studio: '#00ff88',
  museum: '#5c4033',
}

interface VenueCardProps {
  venue: VenueName
  selected?: boolean
  onClick?: () => void
  compact?: boolean
}

export function VenueCard({ venue, selected, onClick, compact }: VenueCardProps) {
  const info = VENUE_INFO[venue]
  return (
    <button
      onClick={onClick}
      style={{
        background: VENUE_COLORS[venue],
        color: VENUE_TEXT_COLORS[venue],
        border: selected ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
        borderRadius: 12,
        padding: compact ? '8px 12px' : '16px',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        width: '100%',
        fontFamily: 'monospace',
        imageRendering: 'pixelated' as const,
        transition: 'transform 0.1s, border-color 0.2s',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <div style={{ fontSize: compact ? 14 : 18, fontWeight: 'bold' }}>{info.label}</div>
      {!compact && (
        <>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{info.vibe}</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{info.description}</div>
        </>
      )}
    </button>
  )
}

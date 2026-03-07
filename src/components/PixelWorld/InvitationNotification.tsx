'use client'

import { useState, useEffect } from 'react'

interface InvitationNotificationProps {
  chaserName: string
  chaserPhoto?: string
  venue: string
  inviteText: string
  onOpen: () => void
}

export function InvitationNotification({ chaserName, chaserPhoto, venue, inviteText, onOpen }: InvitationNotificationProps) {
  const [pulse, setPulse] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 800)
    return () => clearInterval(interval)
  }, [])

  return (
    <button
      onClick={onOpen}
      className={`absolute top-1/4 right-1/4 z-30 bg-gray-900/90 border-2 rounded-xl p-4 transition-all cursor-pointer hover:scale-105 ${
        pulse ? 'border-pink-500 shadow-lg shadow-pink-500/30' : 'border-pink-300'
      }`}
    >
      <div className="flex items-center gap-3">
        {chaserPhoto ? (
          <img src={chaserPhoto} alt={chaserName} className="w-12 h-12 rounded-lg object-cover border-2 border-pink-500" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-xl border-2 border-pink-500">?</div>
        )}
        <div className="text-left font-mono">
          <div className="text-pink-300 text-sm font-bold">{chaserName} wants a date!</div>
          <div className="text-gray-400 text-xs mt-1 max-w-[200px] truncate">{inviteText}</div>
          <div className="text-gray-500 text-xs mt-1">at {venue}</div>
          <div className="text-pink-400 text-xs mt-1">Tap to see invite</div>
        </div>
      </div>
    </button>
  )
}

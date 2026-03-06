'use client'

import { useState } from 'react'
import type { Candidate } from '@/types/database'
import { ReportBlockModal } from './ReportBlockModal'

interface ProfilePanelProps {
  candidate: Candidate
  onApprove: () => void
  onPass: () => void
  onClose: () => void
}

export function ProfilePanel({ candidate, onApprove, onPass, onClose }: ProfilePanelProps) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [showReportModal, setShowReportModal] = useState(false)
  const { user, score, reasons } = candidate
  const photos = user.photos || []

  const scoreColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-orange-400'

  return (
    <div className="absolute inset-0 md:inset-auto md:right-0 md:top-0 md:h-full md:w-80 bg-gray-900/95 md:border-l border-gray-700 flex flex-col animate-slide-in-right z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <h3 className="font-bold text-lg">{user.name}, {user.age}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowReportModal(true)}
            className="text-gray-500 hover:text-red-400 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
            aria-label={`Report or block ${user.name}`}
            title="Report / Block"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 1v14M3 1h8l-2 3.5L11 8H3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl min-w-[44px] min-h-[44px] flex items-center justify-center">&times;</button>
        </div>
      </div>

      {/* Photo carousel */}
      <div className="relative bg-gray-800 aspect-square">
        {photos.length > 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[photoIndex]}
              alt={user.name}
              className="w-full h-full object-cover"
            />
            {photos.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIndex(i)}
                    className={`w-2 h-2 rounded-full ${
                      i === photoIndex ? 'bg-pink-500' : 'bg-gray-500'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600 text-4xl">?</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Match score */}
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${scoreColor}`}>{score}%</span>
          <span className="text-gray-400 text-sm">match</span>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-gray-300 text-sm">{user.bio}</p>
        )}

        {/* Match reasons */}
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Why you match</p>
          <p className="text-sm text-gray-300">{reasons.personality}</p>
          <p className="text-sm text-gray-300">{reasons.horoscope}</p>
          {reasons.shared.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {reasons.shared.map(s => (
                <span key={s} className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded">
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
          {reasons.explanation && (
            <p className="text-sm text-gray-400 italic">{reasons.explanation}</p>
          )}
        </div>

        {/* Details */}
        <div className="space-y-1 text-sm text-gray-400">
          {user.horoscope && <p>Sign: {user.horoscope}</p>}
          {user.location && <p>Location: {user.location}</p>}
          <p>Soul: {user.soul_type}</p>
          <p>Role: {user.role}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-800 space-y-2 pb-safe">
        <button
          onClick={onApprove}
          className="w-full py-3 min-h-[44px] bg-pink-500 text-white rounded-lg font-bold hover:bg-pink-600 transition-colors"
        >
          Send My Agent!
        </button>
        <button
          onClick={onPass}
          className="w-full py-2 min-h-[44px] bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors"
        >
          Keep Looking
        </button>
      </div>

      <ReportBlockModal
        targetUserId={user.id}
        targetName={user.name}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  )
}

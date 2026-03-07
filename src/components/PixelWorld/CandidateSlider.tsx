'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Candidate } from '@/types/database'

interface CandidateSliderProps {
  candidates: Candidate[]
  onSelect: (candidate: Candidate) => void
  onPass: (candidate: Candidate) => void
  onAgentComment: (text: string) => void
}

export function CandidateSlider({ candidates, onSelect, onPass, onAgentComment }: CandidateSliderProps) {
  const [index, setIndex] = useState(0)
  const current = candidates[index]

  useEffect(() => {
    if (!current) return
    const { reasons, score } = current
    const comments = [
      `${score}% match! ${reasons.personality}`,
      reasons.horoscope,
      reasons.explanation,
      reasons.shared.length > 0 ? `You both like: ${reasons.shared.join(', ')}` : null,
    ].filter(Boolean)
    const comment = comments[Math.floor(Math.random() * comments.length)] || `${score}% compatible!`
    onAgentComment(comment as string)
  }, [index, current, onAgentComment])

  const next = useCallback(() => {
    if (index < candidates.length - 1) {
      onPass(candidates[index])
      setIndex(i => i + 1)
    }
  }, [index, candidates, onPass])

  const prev = useCallback(() => {
    if (index > 0) setIndex(i => i - 1)
  }, [index])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev()
      if (e.key === 'Enter') onSelect(current)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev, current, onSelect])

  // Swipe gesture handling
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    touchStartRef.current = null
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
    if (dx < 0) next()
    else prev()
  }, [next, prev])

  if (!current) return null

  const photo = current.user.photos?.[0]
  const scoreColor = current.score >= 80 ? 'text-green-400' : current.score >= 60 ? 'text-yellow-400' : 'text-orange-400'

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={prev}
        disabled={index === 0}
        className="bg-gray-800/80 text-white w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-gray-700"
      >
        &lt;
      </button>

      <button
        onClick={() => onSelect(current)}
        className="bg-gray-900/90 border-2 border-gray-600 hover:border-pink-500 rounded-xl p-3 flex items-center gap-3 transition-colors min-w-[280px]"
      >
        {photo ? (
          <img src={photo} alt={current.user.name} className="w-16 h-16 rounded-lg object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center text-2xl">?</div>
        )}
        <div className="text-left font-mono">
          <div className="text-white text-sm font-bold">{current.user.name}, {current.user.age}</div>
          <div className={`text-lg font-bold ${scoreColor}`}>{current.score}%</div>
          <div className="text-gray-400 text-xs">{current.user.soul_type} soul</div>
        </div>
      </button>

      <button
        onClick={next}
        disabled={index === candidates.length - 1}
        className="bg-gray-800/80 text-white w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-gray-700"
      >
        &gt;
      </button>

      <div className="text-gray-500 text-xs font-mono">{index + 1}/{candidates.length}</div>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { PortraitExpression } from '@/engine/types'
import { getCachedPortraitUrl, preloadPortraits } from '@/engine/portraitLoader'

// ── Types ──────────────────────────────────────────────────────

export interface PortraitPanelProps {
  chaserCharacterId: string
  gatekeeperCharacterId: string
  chaserEmotion: PortraitExpression
  gatekeeperEmotion: PortraitExpression
  chaserVariant: 'soft' | 'sharp' | 'neutral'
  gatekeeperVariant: 'soft' | 'sharp' | 'neutral'
  activeSpeaker: 'chaser' | 'gatekeeper' | null
  speechText: string | null
  chaserName: string
  gatekeeperName: string
  visible: boolean
}

// ── Impact animation CSS class mapping ──────────────────────────

type ImpactType = 'shake' | 'bounce' | 'shrink' | null

function getImpactForEmotion(emotion: PortraitExpression): ImpactType {
  switch (emotion) {
    case 'shock':
    case 'angry':
      return 'shake'
    case 'laughing':
    case 'starry_eyed':
    case 'heart_eyes':
      return 'bounce'
    case 'cringe':
    case 'crying':
      return 'shrink'
    default:
      return null
  }
}

// ── Typewriter hook ─────────────────────────────────────────────

function useTypewriter(text: string | null, speed: number = 30): string {
  const [displayed, setDisplayed] = useState('')
  const prevTextRef = useRef<string | null>(null)

  useEffect(() => {
    if (text === prevTextRef.current) return
    prevTextRef.current = text

    if (!text) {
      setDisplayed('')
      return
    }

    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed])

  return displayed
}

// ── PortraitPanel Component ─────────────────────────────────────

export function PortraitPanel({
  chaserCharacterId,
  gatekeeperCharacterId,
  chaserEmotion,
  gatekeeperEmotion,
  chaserVariant,
  gatekeeperVariant,
  activeSpeaker,
  speechText,
  chaserName,
  gatekeeperName,
  visible,
}: PortraitPanelProps) {
  const [preloaded, setPreloaded] = useState(false)
  const [chaserImpact, setChaserImpact] = useState<ImpactType>(null)
  const [gatekeeperImpact, setGatekeeperImpact] = useState<ImpactType>(null)

  const displayedText = useTypewriter(speechText, 25)

  // Preload portraits when panel becomes visible
  useEffect(() => {
    if (!visible) return
    let cancelled = false

    Promise.all([
      preloadPortraits(chaserCharacterId, chaserVariant, chaserName),
      preloadPortraits(gatekeeperCharacterId, gatekeeperVariant, gatekeeperName),
    ]).then(() => {
      if (!cancelled) setPreloaded(true)
    })

    return () => { cancelled = true }
  }, [visible, chaserCharacterId, gatekeeperCharacterId, chaserVariant, gatekeeperVariant, chaserName, gatekeeperName])

  // Trigger impact animation on chaser emotion change
  useEffect(() => {
    const impact = getImpactForEmotion(chaserEmotion)
    if (impact) {
      setChaserImpact(impact)
      const timer = setTimeout(() => setChaserImpact(null), 500)
      return () => clearTimeout(timer)
    }
  }, [chaserEmotion])

  // Trigger impact animation on gatekeeper emotion change
  useEffect(() => {
    const impact = getImpactForEmotion(gatekeeperEmotion)
    if (impact) {
      setGatekeeperImpact(impact)
      const timer = setTimeout(() => setGatekeeperImpact(null), 500)
      return () => clearTimeout(timer)
    }
  }, [gatekeeperEmotion])

  const getPortraitSrc = useCallback((charId: string, emotion: PortraitExpression, variant: 'soft' | 'sharp' | 'neutral', label: string) => {
    return getCachedPortraitUrl(charId, emotion, variant, label)
  }, [])

  if (!visible) return null

  const chaserActive = activeSpeaker === 'chaser'
  const gatekeeperActive = activeSpeaker === 'gatekeeper'

  return (
    <div
      className={`
        w-full transition-all duration-300 ease-out
        ${preloaded ? 'opacity-100' : 'opacity-0'}
      `}
      style={{ height: visible ? undefined : 0 }}
    >
      {/* Panel container */}
      <div className="relative bg-[#0a0a0a] border-t border-gray-800 px-4 py-3">
        {/* Desktop layout: side by side with speech in center */}
        <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
          {/* Chaser portrait */}
          <Portrait
            characterId={chaserCharacterId}
            emotion={chaserEmotion}
            variant={chaserVariant}
            name={chaserName}
            role="chaser"
            isActive={chaserActive}
            impact={chaserImpact}
            getSrc={getPortraitSrc}
          />

          {/* Speech bubble (center) */}
          <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-2">
            {displayedText ? (
              <div
                className={`
                  relative px-4 py-2.5 rounded-lg max-w-full
                  ${chaserActive
                    ? 'bg-pink-950/40 border border-pink-800/50'
                    : gatekeeperActive
                      ? 'bg-blue-950/40 border border-blue-800/50'
                      : 'bg-gray-900 border border-gray-700/50'
                  }
                `}
              >
                <p className="text-sm text-gray-100 font-mono leading-relaxed text-center">
                  {displayedText}
                  {displayedText.length < (speechText?.length ?? 0) && (
                    <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-pulse" />
                  )}
                </p>
                {/* Speaker indicator */}
                {activeSpeaker && (
                  <span className={`
                    absolute -top-2.5 left-1/2 -translate-x-1/2
                    text-[10px] font-mono px-2 py-0.5 rounded-full
                    ${chaserActive ? 'bg-pink-900 text-pink-300' : 'bg-blue-900 text-blue-300'}
                  `}>
                    {chaserActive ? chaserName : gatekeeperName}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-gray-600 text-xs font-mono italic">
                ...
              </div>
            )}
          </div>

          {/* Gatekeeper portrait */}
          <Portrait
            characterId={gatekeeperCharacterId}
            emotion={gatekeeperEmotion}
            variant={gatekeeperVariant}
            name={gatekeeperName}
            role="gatekeeper"
            isActive={gatekeeperActive}
            impact={gatekeeperImpact}
            getSrc={getPortraitSrc}
          />
        </div>
      </div>
    </div>
  )
}

// ── Portrait sub-component ──────────────────────────────────────

interface PortraitProps {
  characterId: string
  emotion: PortraitExpression
  variant: 'soft' | 'sharp' | 'neutral'
  name: string
  role: 'chaser' | 'gatekeeper'
  isActive: boolean
  impact: ImpactType
  getSrc: (charId: string, emotion: PortraitExpression, variant: 'soft' | 'sharp' | 'neutral', label: string) => string
}

function Portrait({ characterId, emotion, variant, name, role, isActive, impact, getSrc }: PortraitProps) {
  const src = getSrc(characterId, emotion, variant, name)

  const impactClass = impact === 'shake'
    ? 'animate-portrait-shake'
    : impact === 'bounce'
      ? 'animate-portrait-bounce'
      : impact === 'shrink'
        ? 'animate-portrait-shrink'
        : ''

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      {/* Portrait frame */}
      <div
        className={`
          relative w-[96px] h-[96px] sm:w-[128px] sm:h-[128px]
          rounded-lg overflow-hidden
          transition-all duration-200
          ${isActive
            ? `ring-2 scale-105 ${role === 'chaser' ? 'ring-pink-500 shadow-lg shadow-pink-500/20' : 'ring-blue-500 shadow-lg shadow-blue-500/20'}`
            : 'ring-1 ring-gray-700 scale-100'
          }
          ${impactClass}
        `}
        style={{ imageRendering: 'pixelated' }}
      >
        {/* Portrait image with crossfade */}
        <img
          src={src}
          alt={`${name} - ${emotion}`}
          className="w-full h-full object-cover transition-opacity duration-200"
          draggable={false}
        />

        {/* Breathing animation overlay (subtle) */}
        <div
          className={`
            absolute inset-0 pointer-events-none
            ${isActive ? '' : 'animate-breathe'}
          `}
        />
      </div>

      {/* Name + role label */}
      <div className="text-center">
        <span className={`
          text-xs font-mono font-bold
          ${role === 'chaser' ? 'text-pink-400' : 'text-blue-400'}
        `}>
          {name}
        </span>
        <span className="text-[10px] font-mono text-gray-600 ml-1">
          {role === 'chaser' ? '⚡' : '🛡️'}
        </span>
      </div>
    </div>
  )
}

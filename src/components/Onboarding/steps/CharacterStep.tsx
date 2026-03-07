'use client'

import { useState, useEffect, useRef, memo } from 'react'
import type { OnboardingData } from '../OnboardingWizard'
import type { AgentAppearance } from '@/types/database'
import type { CharacterAppearance } from '@/engine/types'
import { buildCharacterSheet } from '@/engine/sprites/spritesheetLoader'
import {
  PREMADE_COUNT, BODY_COUNT, EYES_COUNT, OUTFITS, HAIRSTYLES, DEFAULT_APPEARANCE,
} from '@/lib/characterAssets'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

const FRAME_SX = 0
const FRAME_SY = 2 * 48
const FRAME_W = 48
const FRAME_H = 96       // LimeZu chars span 2 rows (48×96 per frame)
const CROP_Y = 20         // skip top 20px of empty space in the 96px frame
const CROP_H = 72         // capture 72px of character content
const PREVIEW_W = 80
const PREVIEW_H = 120
const THUMB_W = 40
const THUMB_H = 60

const SpriteThumb = memo(function SpriteThumb({ appearance, selected, onClick }: {
  appearance: AgentAppearance
  selected: boolean
  onClick: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, THUMB_W, THUMB_H)
    buildCharacterSheet(appearance as CharacterAppearance)
      .then(sheet => {
        const c = canvasRef.current
        if (!c) return
        const cx = c.getContext('2d')
        if (!cx) return
        cx.clearRect(0, 0, THUMB_W, THUMB_H)
        cx.imageSmoothingEnabled = false
        cx.drawImage(sheet, FRAME_SX, FRAME_SY + CROP_Y, FRAME_W, CROP_H, 0, 0, THUMB_W, THUMB_H)
      })
      .catch(() => {
        const c = canvasRef.current
        if (!c) return
        const cx = c.getContext('2d')
        if (!cx) return
        cx.fillStyle = '#ec4899'
        cx.fillRect(4, 4, 32, 52)
      })
  }, [appearance])

  return (
    <button
      onClick={onClick}
      className={`rounded border-2 transition-colors p-0.5 bg-gray-900 ${
        selected ? 'border-pink-500' : 'border-gray-700 hover:border-gray-500'
      }`}
    >
      <canvas
        ref={canvasRef}
        width={THUMB_W}
        height={THUMB_H}
        style={{ imageRendering: 'pixelated', display: 'block', width: THUMB_W, height: THUMB_H }}
      />
    </button>
  )
})

export function CharacterStep({ data, onChange, onNext, onBack }: Props) {
  const [tab, setTab] = useState<'premade' | 'custom'>('premade')
  const [appearance, setAppearance] = useState<AgentAppearance>(
    data.agent_appearance ?? DEFAULT_APPEARANCE
  )
  const bigCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = bigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, PREVIEW_W, PREVIEW_H)
    buildCharacterSheet(appearance as CharacterAppearance)
      .then(sheet => {
        const c = bigCanvasRef.current
        if (!c) return
        const cx = c.getContext('2d')
        if (!cx) return
        cx.clearRect(0, 0, PREVIEW_W, PREVIEW_H)
        cx.imageSmoothingEnabled = false
        cx.drawImage(sheet, FRAME_SX, FRAME_SY + CROP_Y, FRAME_W, CROP_H, 0, 0, PREVIEW_W, PREVIEW_H)
      })
      .catch(() => {
        const c = bigCanvasRef.current
        if (!c) return
        const cx = c.getContext('2d')
        if (!cx) return
        cx.fillStyle = '#ec4899'
        cx.fillRect(PREVIEW_W * 0.2, PREVIEW_H * 0.1, PREVIEW_W * 0.6, PREVIEW_H * 0.8)
      })
  }, [appearance])

  const select = (next: AgentAppearance) => {
    setAppearance(next)
    onChange({ agent_appearance: next })
  }

  const updateCustom = (partial: Partial<AgentAppearance>) => {
    const next: AgentAppearance = { ...appearance, premadeIndex: undefined, ...partial }
    select(next)
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create your Agent</h2>
        <p className="text-sm text-gray-400 mt-1">This pixel buddy represents you in the world</p>
      </div>

      {/* Big preview */}
      <div className="flex justify-center">
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-3">
          <canvas
            ref={bigCanvasRef}
            width={PREVIEW_W}
            height={PREVIEW_H}
            style={{ imageRendering: 'pixelated', display: 'block', width: PREVIEW_W, height: PREVIEW_H }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
        {(['premade', 'custom'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
              tab === t ? 'bg-pink-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'premade' ? 'Premade (20)' : 'Custom'}
          </button>
        ))}
      </div>

      {/* Premade grid */}
      {tab === 'premade' && (
        <div className="max-h-[35vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: PREMADE_COUNT }, (_, i) => i + 1).map(n => (
              <SpriteThumb
                key={n}
                appearance={{ premadeIndex: n, body: 1, eyes: 1, outfit: OUTFITS[0], hairstyle: HAIRSTYLES[0] }}
                selected={appearance.premadeIndex === n}
                onClick={() => select({ premadeIndex: n, body: 1, eyes: 1, outfit: OUTFITS[0], hairstyle: HAIRSTYLES[0] })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom layered picker */}
      {tab === 'custom' && (
        <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs text-gray-400 mb-2">Body / Skin Tone</label>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: BODY_COUNT }, (_, i) => i + 1).map(b => (
                <SpriteThumb
                  key={b}
                  appearance={{ ...appearance, premadeIndex: undefined, body: b }}
                  selected={!appearance.premadeIndex && appearance.body === b}
                  onClick={() => updateCustom({ body: b })}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Eyes</label>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: EYES_COUNT }, (_, i) => i + 1).map(e => (
                <SpriteThumb
                  key={e}
                  appearance={{ ...appearance, premadeIndex: undefined, eyes: e }}
                  selected={!appearance.premadeIndex && appearance.eyes === e}
                  onClick={() => updateCustom({ eyes: e })}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Outfit ({OUTFITS.length} options)</label>
            <div className="flex gap-1.5 flex-wrap">
              {OUTFITS.map(o => (
                <SpriteThumb
                  key={o}
                  appearance={{ ...appearance, premadeIndex: undefined, outfit: o }}
                  selected={!appearance.premadeIndex && appearance.outfit === o}
                  onClick={() => updateCustom({ outfit: o })}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Hairstyle ({HAIRSTYLES.length} options)</label>
            <div className="flex gap-1.5 flex-wrap">
              {HAIRSTYLES.map(h => (
                <SpriteThumb
                  key={h}
                  appearance={{ ...appearance, premadeIndex: undefined, hairstyle: h }}
                  selected={!appearance.premadeIndex && appearance.hairstyle === h}
                  onClick={() => updateCustom({ hairstyle: h })}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 bg-gray-800 text-gray-300 rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}

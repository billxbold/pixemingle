'use client'

import { useState } from 'react'
import type { OnboardingData } from '../OnboardingWizard'
import type { AgentAppearance } from '@/types/database'

interface CharacterStepProps {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

const BODY_TYPES = [0, 1, 2]
const SKIN_TONES = [0, 1, 2, 3, 4, 5, 6, 7]
const HAIR_STYLES = [0, 1, 2, 3, 4]
const HAIR_COLORS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const TOPS = [0, 1, 2, 3, 4]
const BOTTOMS = [0, 1, 2, 3]

const SKIN_HEX = ['#FFDBB4', '#EDB98A', '#D08B5B', '#AE5D29', '#694825', '#3C2415', '#FFE0BD', '#F1C27D']
const HAIR_HEX = ['#2C1810', '#5A3825', '#8B6914', '#C19A6B', '#E6BE8A', '#B7410E', '#8B0000', '#4B0082', '#FF69B4', '#00CED1']

export function CharacterStep({ data, onChange, onNext, onBack }: CharacterStepProps) {
  const [appearance, setAppearance] = useState<AgentAppearance>(
    data.agent_appearance ?? {
      body: 0,
      skinTone: 0,
      hair: 0,
      hairColor: 0,
      top: 0,
      bottom: 0,
      accessories: [],
    }
  )

  const update = (partial: Partial<AgentAppearance>) => {
    const next = { ...appearance, ...partial }
    setAppearance(next)
    onChange({ agent_appearance: next })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create your Agent</h2>
        <p className="text-sm text-gray-400 mt-1">This pixel buddy represents you</p>
      </div>

      {/* Preview placeholder */}
      <div className="flex justify-center">
        <div className="w-24 h-24 bg-gray-800 rounded-lg border-2 border-gray-700 flex items-center justify-center">
          <div
            className="w-8 h-12 rounded-sm"
            style={{ backgroundColor: SKIN_HEX[appearance.skinTone] }}
          >
            <div
              className="w-8 h-4 rounded-t-sm"
              style={{ backgroundColor: HAIR_HEX[appearance.hairColor] }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
        {/* Body Type */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Body Type</label>
          <div className="flex gap-2">
            {BODY_TYPES.map(b => (
              <button
                key={b}
                onClick={() => update({ body: b })}
                className={`flex-1 py-2 rounded text-xs ${
                  appearance.body === b ? 'bg-pink-500 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                Type {b + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Skin Tone */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Skin Tone</label>
          <div className="flex gap-1.5">
            {SKIN_TONES.map(s => (
              <button
                key={s}
                onClick={() => update({ skinTone: s })}
                className={`w-8 h-8 rounded-full border-2 transition-colors ${
                  appearance.skinTone === s ? 'border-pink-500' : 'border-transparent'
                }`}
                style={{ backgroundColor: SKIN_HEX[s] }}
              />
            ))}
          </div>
        </div>

        {/* Hair Style */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Hair Style</label>
          <div className="flex gap-2">
            {HAIR_STYLES.map(h => (
              <button
                key={h}
                onClick={() => update({ hair: h })}
                className={`flex-1 py-2 rounded text-xs ${
                  appearance.hair === h ? 'bg-pink-500 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {['Classic', 'Wavy', 'Short', 'Long', 'Curly'][h]}
              </button>
            ))}
          </div>
        </div>

        {/* Hair Color */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Hair Color</label>
          <div className="flex gap-1.5 flex-wrap">
            {HAIR_COLORS.map(c => (
              <button
                key={c}
                onClick={() => update({ hairColor: c })}
                className={`w-7 h-7 rounded-full border-2 transition-colors ${
                  appearance.hairColor === c ? 'border-pink-500' : 'border-transparent'
                }`}
                style={{ backgroundColor: HAIR_HEX[c] }}
              />
            ))}
          </div>
        </div>

        {/* Top */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Top</label>
          <div className="flex gap-2 flex-wrap">
            {TOPS.map(t => (
              <button
                key={t}
                onClick={() => update({ top: t })}
                className={`py-2 px-3 rounded text-xs ${
                  appearance.top === t ? 'bg-pink-500 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {['T-Shirt', 'Hoodie', 'Blouse', 'Sweater', 'Tank'][t]}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Bottom</label>
          <div className="flex gap-2">
            {BOTTOMS.map(b => (
              <button
                key={b}
                onClick={() => update({ bottom: b })}
                className={`flex-1 py-2 rounded text-xs ${
                  appearance.bottom === b ? 'bg-pink-500 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {['Jeans', 'Skirt', 'Shorts', 'Slacks'][b]}
              </button>
            ))}
          </div>
        </div>
      </div>

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

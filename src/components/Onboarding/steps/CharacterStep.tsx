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

// TODO (Task 4): This component will be fully rewritten with the LimeZu sprite picker.
// Minimal stub to satisfy the new AgentAppearance shape.

const DEFAULT_APPEARANCE: AgentAppearance = {
  body: 1,
  eyes: 1,
  outfit: 'Outfit_01_48x48_01',
  hairstyle: 'Hairstyle_01_48x48_01',
}

export function CharacterStep({ data, onChange, onNext, onBack }: CharacterStepProps) {
  const [appearance, setAppearance] = useState<AgentAppearance>(
    data.agent_appearance ?? DEFAULT_APPEARANCE
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

      {/* Preview placeholder — replaced in Task 4 */}
      <div className="flex justify-center">
        <div className="w-24 h-24 bg-gray-800 rounded-lg border-2 border-gray-700 flex items-center justify-center">
          <span className="text-xs text-gray-500">Preview</span>
        </div>
      </div>

      <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
        {/* Body (1-9) */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Body Type ({appearance.body}/9)</label>
          <div className="flex gap-2">
            {[1,2,3,4,5,6,7,8,9].map(b => (
              <button
                key={b}
                onClick={() => update({ body: b })}
                className={`flex-1 py-2 rounded text-xs ${
                  appearance.body === b ? 'bg-pink-500 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Eyes (1-7) */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Eyes ({appearance.eyes}/7)</label>
          <div className="flex gap-2">
            {[1,2,3,4,5,6,7].map(e => (
              <button
                key={e}
                onClick={() => update({ eyes: e })}
                className={`flex-1 py-2 rounded text-xs ${
                  appearance.eyes === e ? 'bg-pink-500 text-white' : 'bg-gray-800 text-gray-300'
                }`}
              >
                {e}
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

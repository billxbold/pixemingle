'use client'

import type { OnboardingData } from '../OnboardingWizard'
import type { SoulType } from '@/types/database'

interface SoulStepProps {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

const SOUL_OPTIONS: Array<{ type: SoulType; emoji: string; label: string; desc: string }> = [
  {
    type: 'romantic',
    emoji: '\u2764\uFE0F',
    label: 'The Romantic',
    desc: 'Grand gestures, poetic lines, never gives up on love. Your agent brings flowers and writes sonnets.',
  },
  {
    type: 'funny',
    emoji: '\uD83E\uDD23',
    label: 'The Comedian',
    desc: 'Jokes first, feelings later. Your agent uses humor to break the ice and keep things light.',
  },
  {
    type: 'bold',
    emoji: '\uD83D\uDD25',
    label: 'The Bold One',
    desc: 'Confident and direct. Your agent makes dramatic entrances and says what others won\'t.',
  },
  {
    type: 'intellectual',
    emoji: '\uD83E\uDDE0',
    label: 'The Thinker',
    desc: 'Deep conversations over small talk. Your agent impresses with wit and thoughtful questions.',
  },
]

export function SoulStep({ data, onChange, onNext, onBack }: SoulStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose your Soul Type</h2>
        <p className="text-sm text-gray-400 mt-1">This shapes how your agent flirts</p>
      </div>

      <div className="space-y-3">
        {SOUL_OPTIONS.map(soul => (
          <button
            key={soul.type}
            onClick={() => onChange({ soul_type: soul.type })}
            className={`w-full p-4 rounded-lg text-left transition-colors ${
              data.soul_type === soul.type
                ? 'bg-pink-500/20 border-2 border-pink-500'
                : 'bg-gray-800 border-2 border-transparent hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{soul.emoji}</span>
              <div>
                <p className="font-bold">{soul.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{soul.desc}</p>
              </div>
            </div>
          </button>
        ))}
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

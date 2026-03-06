'use client'

import type { OnboardingData } from '../OnboardingWizard'

interface RoleStepProps {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  onSubmit: () => void
  onBack: () => void
  isSubmitting: boolean
}

const ROLES = [
  {
    role: 'chaser' as const,
    emoji: '\uD83D\uDC98',
    label: 'Chaser',
    desc: 'Your agent approaches others and tries to win them over. You make the first move!',
  },
  {
    role: 'gatekeeper' as const,
    emoji: '\uD83D\uDEE1\uFE0F',
    label: 'Gatekeeper',
    desc: 'Others come to you. Your agent evaluates incoming approaches and decides who\'s worthy.',
  },
]

export function RoleStep({ data, onChange, onSubmit, onBack, isSubmitting }: RoleStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose your Role</h2>
        <p className="text-sm text-gray-400 mt-1">This affects how matching works</p>
      </div>

      <div className="space-y-3">
        {ROLES.map(r => (
          <button
            key={r.role}
            onClick={() => onChange({ role: r.role })}
            className={`w-full p-4 rounded-lg text-left transition-colors ${
              data.role === r.role
                ? 'bg-pink-500/20 border-2 border-pink-500'
                : 'bg-gray-800 border-2 border-transparent hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{r.emoji}</span>
              <div>
                <p className="font-bold text-lg">{r.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
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
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex-1 py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Entering the world...' : 'Enter Pixemingle'}
        </button>
      </div>
    </div>
  )
}

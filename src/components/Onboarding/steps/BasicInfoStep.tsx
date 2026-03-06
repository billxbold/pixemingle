'use client'

import type { OnboardingData } from '../OnboardingWizard'

interface BasicInfoStepProps {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export function BasicInfoStep({ data, onChange, onNext, onBack }: BasicInfoStepProps) {
  const canProceed = data.name.trim().length > 0 && data.age >= 18

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Tell us about yourself</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Name</label>
          <input
            value={data.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="Your first name"
            className="w-full py-3 px-4 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Age</label>
          <input
            type="number"
            value={data.age}
            onChange={e => onChange({ age: parseInt(e.target.value) || 18 })}
            min={18}
            max={99}
            className="w-full py-3 px-4 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-pink-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">I am</label>
          <div className="grid grid-cols-3 gap-2">
            {(['male', 'female', 'nonbinary'] as const).map(g => (
              <button
                key={g}
                onClick={() => onChange({ gender: g })}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  data.gender === g
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {g === 'nonbinary' ? 'Non-binary' : g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Looking for</label>
          <div className="grid grid-cols-3 gap-2">
            {(['male', 'female', 'everyone'] as const).map(g => (
              <button
                key={g}
                onClick={() => onChange({ looking_for: g })}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  data.looking_for === g
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Location (optional)</label>
          <input
            value={data.location}
            onChange={e => onChange({ location: e.target.value })}
            placeholder="City, Country"
            className="w-full py-3 px-4 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Bio (optional)</label>
          <textarea
            value={data.bio}
            onChange={e => onChange({ bio: e.target.value })}
            placeholder="A few words about yourself..."
            rows={3}
            maxLength={300}
            className="w-full py-3 px-4 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none resize-none"
          />
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
          disabled={!canProceed}
          className="flex-1 py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}

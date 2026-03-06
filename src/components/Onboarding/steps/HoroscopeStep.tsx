'use client'

import type { OnboardingData } from '../OnboardingWizard'
import { HOROSCOPE_SIGNS } from '@/lib/constants'

interface HoroscopeStepProps {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: '\u2648', Taurus: '\u2649', Gemini: '\u264A', Cancer: '\u264B',
  Leo: '\u264C', Virgo: '\u264D', Libra: '\u264E', Scorpio: '\u264F',
  Sagittarius: '\u2650', Capricorn: '\u2651', Aquarius: '\u2652', Pisces: '\u2653',
}

export function HoroscopeStep({ data, onChange, onNext, onBack }: HoroscopeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">What&apos;s your sign?</h2>
        <p className="text-sm text-gray-400 mt-1">Used for cosmic compatibility</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {HOROSCOPE_SIGNS.map(sign => (
          <button
            key={sign}
            onClick={() => onChange({ horoscope: sign })}
            className={`py-3 px-2 rounded-lg text-center transition-colors ${
              data.horoscope === sign
                ? 'bg-pink-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span className="text-xl block">{SIGN_SYMBOLS[sign]}</span>
            <span className="text-xs">{sign}</span>
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
          disabled={!data.horoscope}
          className="flex-1 py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}

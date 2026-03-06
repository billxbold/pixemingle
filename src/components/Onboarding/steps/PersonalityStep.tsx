'use client'

import { useState } from 'react'
import type { OnboardingData } from '../OnboardingWizard'
import { PERSONALITY_QUESTIONS } from '@/lib/constants'

interface PersonalityStepProps {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

export function PersonalityStep({ data, onChange, onNext, onBack }: PersonalityStepProps) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const question = PERSONALITY_QUESTIONS[questionIndex]
  const answers = data.personality
  const allAnswered = PERSONALITY_QUESTIONS.every(q => answers[q.id as keyof typeof answers])

  const selectAnswer = (answer: string) => {
    onChange({
      personality: { ...answers, [question.id]: answer },
    })
    if (questionIndex < PERSONALITY_QUESTIONS.length - 1) {
      setQuestionIndex(questionIndex + 1)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Personality Quiz</h2>
        <p className="text-sm text-gray-400 mt-1">
          {questionIndex + 1} / {PERSONALITY_QUESTIONS.length}
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-center">{question.question}</h3>
        <div className="space-y-2">
          {question.options.map(option => (
            <button
              key={option}
              onClick={() => selectAnswer(option)}
              className={`w-full py-3 px-4 rounded-lg text-left text-sm font-medium transition-colors ${
                answers[question.id as keyof typeof answers] === option
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Question nav dots */}
      <div className="flex justify-center gap-1.5">
        {PERSONALITY_QUESTIONS.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setQuestionIndex(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === questionIndex
                ? 'bg-pink-500'
                : answers[q.id as keyof typeof answers]
                  ? 'bg-pink-500/40'
                  : 'bg-gray-700'
            }`}
          />
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
          disabled={!allAnswered}
          className="flex-1 py-3 px-4 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}

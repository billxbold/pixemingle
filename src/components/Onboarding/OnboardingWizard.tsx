'use client'

import { useState, useCallback } from 'react'
import type { SoulType, PersonalityAnswers, AgentAppearance } from '@/types/database'
import { AuthStep } from './steps/AuthStep'
import { BasicInfoStep } from './steps/BasicInfoStep'
import { PersonalityStep } from './steps/PersonalityStep'
import { HoroscopeStep } from './steps/HoroscopeStep'
import { SoulStep } from './steps/SoulStep'
import { CharacterStep } from './steps/CharacterStep'
import { RoleStep } from './steps/RoleStep'
import { useRouter } from 'next/navigation'

export interface OnboardingData {
  name: string
  age: number
  gender: 'male' | 'female' | 'nonbinary'
  looking_for: 'male' | 'female' | 'everyone'
  location: string
  bio: string
  personality: Partial<PersonalityAnswers>
  horoscope: string
  soul_type: SoulType
  agent_appearance: AgentAppearance | null
  role: 'chaser' | 'gatekeeper'
}

const INITIAL_DATA: OnboardingData = {
  name: '',
  age: 25,
  gender: 'male',
  looking_for: 'everyone',
  location: '',
  bio: '',
  personality: {},
  horoscope: '',
  soul_type: 'romantic',
  agent_appearance: null,
  role: 'chaser',
}

const STEPS = ['auth', 'basics', 'personality', 'horoscope', 'soul', 'character', 'role'] as const

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const updateData = useCallback((partial: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...partial }))
  }, [])

  const next = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1))
  }, [])

  const back = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  const submit = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          age: data.age,
          gender: data.gender,
          looking_for: data.looking_for,
          location: data.location,
          bio: data.bio,
          personality: data.personality,
          horoscope: data.horoscope,
          soul_type: data.soul_type,
          agent_appearance: data.agent_appearance,
          role: data.role,
        }),
      })
      if (res.ok) {
        router.push('/world')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [data, router])

  const stepName = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      {/* Progress bar */}
      {currentStep > 0 && (
        <div className="w-full max-w-md mb-8">
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Step {currentStep + 1} of {STEPS.length}
          </p>
        </div>
      )}

      <div className="w-full max-w-md">
        {stepName === 'auth' && <AuthStep onComplete={next} />}
        {stepName === 'basics' && (
          <BasicInfoStep data={data} onChange={updateData} onNext={next} onBack={back} />
        )}
        {stepName === 'personality' && (
          <PersonalityStep data={data} onChange={updateData} onNext={next} onBack={back} />
        )}
        {stepName === 'horoscope' && (
          <HoroscopeStep data={data} onChange={updateData} onNext={next} onBack={back} />
        )}
        {stepName === 'soul' && (
          <SoulStep data={data} onChange={updateData} onNext={next} onBack={back} />
        )}
        {stepName === 'character' && (
          <CharacterStep data={data} onChange={updateData} onNext={next} onBack={back} />
        )}
        {stepName === 'role' && (
          <RoleStep
            data={data}
            onChange={updateData}
            onSubmit={submit}
            onBack={back}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  )
}

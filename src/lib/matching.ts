import type { User, Candidate, MatchReasons, PersonalityAnswers } from '@/types/database'
import { HOROSCOPE_MATRIX, HOROSCOPE_SIGNS } from './constants'

export function computeMatchScore(userA: User, userB: User): { score: number; reasons: MatchReasons } {
  const personality = personalityMatch(userA.personality, userB.personality)
  const horoscope = horoscopeMatch(userA.horoscope, userB.horoscope)
  const lifestyle = lifestyleMatch(userA, userB)
  const interests = interestMatch(userA.personality, userB.personality)

  const score = personality * 0.40 + horoscope * 0.15 + lifestyle * 0.25 + interests * 0.20

  const shared: string[] = []
  if (userA.personality && userB.personality) {
    for (const [key, val] of Object.entries(userA.personality)) {
      if ((userB.personality as unknown as Record<string, string>)[key] === val) {
        shared.push(key)
      }
    }
  }

  return {
    score: Math.round(score * 100),
    reasons: {
      personality: `${Math.round(personality * 100)}% personality match`,
      horoscope: `${userA.horoscope} + ${userB.horoscope} = ${Math.round(horoscope * 100)}% compatible`,
      shared,
      explanation: '', // filled by LLM later
    },
  }
}

function personalityMatch(a: PersonalityAnswers | null, b: PersonalityAnswers | null): number {
  if (!a || !b) return 0.5
  const keys = Object.keys(a) as (keyof PersonalityAnswers)[]
  let matches = 0
  for (const key of keys) {
    if (a[key] === b[key]) matches++
  }
  return keys.length > 0 ? matches / keys.length : 0.5
}

function horoscopeMatch(a: string | null, b: string | null): number {
  if (!a || !b) return 0.5
  const idxA = HOROSCOPE_SIGNS.indexOf(a as typeof HOROSCOPE_SIGNS[number])
  const idxB = HOROSCOPE_SIGNS.indexOf(b as typeof HOROSCOPE_SIGNS[number])
  if (idxA === -1 || idxB === -1) return 0.5
  return HOROSCOPE_MATRIX[idxA][idxB]
}

function lifestyleMatch(a: User, b: User): number {
  let score = 0
  let checks = 0
  // Age range (within 10 years)
  checks++
  if (Math.abs(a.age - b.age) <= 10) score++
  // Gender preference match
  checks++
  if (a.looking_for === 'everyone' || a.looking_for === b.gender) score++
  checks++
  if (b.looking_for === 'everyone' || b.looking_for === a.gender) score++
  // Location (same location string for MVP)
  if (a.location && b.location) {
    checks++
    if (a.location.toLowerCase() === b.location.toLowerCase()) score++
  }
  return checks > 0 ? score / checks : 0.5
}

function interestMatch(a: PersonalityAnswers | null, b: PersonalityAnswers | null): number {
  return personalityMatch(a, b)
}

export function findCandidates(user: User, allUsers: User[], blockedIds: string[]): Candidate[] {
  return allUsers
    .filter(u =>
      u.id !== user.id &&
      !blockedIds.includes(u.id) &&
      (user.looking_for === 'everyone' || user.looking_for === u.gender) &&
      (u.looking_for === 'everyone' || u.looking_for === user.gender)
    )
    .map(u => {
      const { score, reasons } = computeMatchScore(user, u)
      return { user: u, score, reasons }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
}

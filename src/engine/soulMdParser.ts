import type { EmotionState } from '@/types/database'
import type { BodyModifier, ParticleType } from './types'

// ── Valid particle types (must match ParticleType union in types.ts) ──

const VALID_PARTICLE_TYPES: Set<string> = new Set([
  'heart', 'confetti', 'rain', 'sweat', 'lightbulb', 'star', 'music_note',
  'blush_tint', 'blush_gradient', 'slight_blush',
  'single_sweat_drop', 'sweat_fountain',
  'small_sparkle', 'small_star',
  'question_mark', 'anger', 'rain_cloud_personal',
  'tumbleweed', 'tears',
])

function isValidParticleType(s: string): s is ParticleType {
  return VALID_PARTICLE_TYPES.has(s)
}

// ── Types ──────────────────────────────────────────────────────

export interface ExpressionPreferences {
  body_language: Partial<Record<EmotionState, BodyModifier>>
  particle_style: Partial<Record<EmotionState, ParticleType[]>>
  portrait_variant: 'soft' | 'sharp' | 'neutral'
  animation_speed: number
  atom_preferences: { preferred: string[]; avoid: string[] }
  on_rejection: { body: BodyModifier; particles: ParticleType[]; preferred_atoms: string[] }
  on_acceptance: { body: BodyModifier; particles: ParticleType[]; preferred_atoms: string[] }
}

// ── Defaults ───────────────────────────────────────────────────

const DEFAULT_PREFS: ExpressionPreferences = {
  body_language: {},
  particle_style: {},
  portrait_variant: 'neutral',
  animation_speed: 1.0,
  atom_preferences: { preferred: [], avoid: [] },
  on_rejection: { body: 'slump', particles: ['single_sweat_drop'], preferred_atoms: [] },
  on_acceptance: { body: 'slight_bounce', particles: ['heart', 'confetti'], preferred_atoms: [] },
}

// ── Parser ─────────────────────────────────────────────────────

/**
 * Extracts and parses the Expression Preferences block from a SOUL.md string.
 * Lenient — returns defaults for missing/malformed sections.
 */
export function parseExpressionPreferences(soulMd: string): ExpressionPreferences {
  const result: ExpressionPreferences = structuredClone(DEFAULT_PREFS)

  // Find the Expression Preferences section
  const epMatch = soulMd.match(/##\s*Expression Preferences\s*\n([\s\S]*?)(?=\n##\s[^#]|\n#\s|$)/)
  if (!epMatch) return result

  const section = epMatch[1]

  // Parse Body Language
  const bodyBlock = extractSubsection(section, 'Body Language')
  if (bodyBlock) {
    result.body_language = parseEmotionModifierMap(bodyBlock)
  }

  // Parse Particle Style
  const particleBlock = extractSubsection(section, 'Particle Style')
  if (particleBlock) {
    result.particle_style = parseEmotionParticleMap(particleBlock)
  }

  // Parse Portrait Variant
  const variantMatch = section.match(/###\s*Portrait Variant:\s*(\w+)/)
  if (variantMatch) {
    const v = variantMatch[1].toLowerCase()
    if (v === 'soft' || v === 'sharp' || v === 'neutral') {
      result.portrait_variant = v
    }
  }

  // Parse Animation Speed
  const speedMatch = section.match(/###\s*Animation Speed:\s*([\d.]+)/)
  if (speedMatch) {
    const speed = parseFloat(speedMatch[1])
    if (!isNaN(speed) && speed > 0 && speed <= 5) {
      result.animation_speed = speed
    }
  }

  // Parse Comedy Atom Preferences
  const atomBlock = extractSubsection(section, 'Comedy Atom Preferences')
  if (atomBlock) {
    result.atom_preferences = parseAtomPreferences(atomBlock)
  }

  // Parse On Rejection
  const rejectionBlock = extractSubsection(section, 'On Rejection')
  if (rejectionBlock) {
    result.on_rejection = parseOutcomeBlock(rejectionBlock, result.on_rejection)
  }

  // Parse On Acceptance
  const acceptanceBlock = extractSubsection(section, 'On Acceptance')
  if (acceptanceBlock) {
    result.on_acceptance = parseOutcomeBlock(acceptanceBlock, result.on_acceptance)
  }

  return result
}

// ── Helpers ────────────────────────────────────────────────────

function extractSubsection(section: string, name: string): string | null {
  const regex = new RegExp(`###\\s*${escapeRegex(name)}\\s*\\n([\\s\\S]*?)(?=\\n###|$)`)
  const match = section.match(regex)
  return match ? match[1] : null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseEmotionModifierMap(block: string): Partial<Record<EmotionState, BodyModifier>> {
  const map: Partial<Record<EmotionState, BodyModifier>> = {}
  const lines = block.split('\n')
  for (const line of lines) {
    const m = line.match(/^-\s*(\w+):\s*(\w+)/)
    if (m) {
      // We trust the values — SOUL.md is user-authored, parser is lenient
      map[m[1] as EmotionState] = m[2] as BodyModifier
    }
  }
  return map
}

function parseEmotionParticleMap(block: string): Partial<Record<EmotionState, ParticleType[]>> {
  const map: Partial<Record<EmotionState, ParticleType[]>> = {}
  const lines = block.split('\n')
  for (const line of lines) {
    const m = line.match(/^-\s*(\w+):\s*\[([^\]]*)\]/)
    if (m) {
      const particles = m[2]
        .split(',')
        .map(s => s.trim())
        .filter((s): s is ParticleType => s.length > 0 && isValidParticleType(s))
      map[m[1] as EmotionState] = particles
    }
  }
  return map
}

function parseAtomPreferences(block: string): { preferred: string[]; avoid: string[] } {
  const result = { preferred: [] as string[], avoid: [] as string[] }
  const lines = block.split('\n')
  for (const line of lines) {
    const prefMatch = line.match(/^-\s*preferred:\s*\[([^\]]*)\]/)
    if (prefMatch) {
      result.preferred = prefMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    }
    const avoidMatch = line.match(/^-\s*avoid:\s*\[([^\]]*)\]/)
    if (avoidMatch) {
      result.avoid = avoidMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    }
  }
  return result
}

function parseOutcomeBlock(
  block: string,
  defaults: { body: BodyModifier; particles: ParticleType[]; preferred_atoms: string[] },
): { body: BodyModifier; particles: ParticleType[]; preferred_atoms: string[] } {
  const result = { ...defaults }
  const lines = block.split('\n')
  for (const line of lines) {
    const bodyMatch = line.match(/^-\s*body:\s*(\w+)/)
    if (bodyMatch) {
      result.body = bodyMatch[1] as BodyModifier
    }
    const particlesMatch = line.match(/^-\s*particles:\s*\[([^\]]*)\]/)
    if (particlesMatch) {
      result.particles = particlesMatch[1].split(',').map(s => s.trim()).filter((s): s is ParticleType => s.length > 0 && isValidParticleType(s))
    }
    const atomsMatch = line.match(/^-\s*preferred_atoms:\s*\[([^\]]*)\]/)
    if (atomsMatch) {
      result.preferred_atoms = atomsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    }
  }
  return result
}

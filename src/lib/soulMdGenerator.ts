/**
 * SOUL.md Generator — Server-side only
 *
 * Takes onboarding quiz answers + gender×role → generates complete SOUL.md markdown.
 * Templates are the starting seed — quiz answers override heavily.
 */

import type { PersonalityAnswers } from '@/types/database'

// ── Input type ─────────────────────────────────────────────────

export interface SoulMdGeneratorInput {
  name: string
  age: number
  gender: 'male' | 'female' | 'nonbinary'
  role: 'chaser' | 'gatekeeper'
  personality: PersonalityAnswers
  humor_physical: number     // 0-10
  humor_wordplay: number     // 0-10
  humor_deadpan: number      // 0-10
  humor_self_deprecating: number // 0-10
  confidence: number         // 0-10
  signature_move?: string
  rejection_style?: string
}

// ── Generator template type ────────────────────────────────────

interface GeneratorTemplate {
  archetype: string
  default_body_language: Record<string, string>
  default_particles: Record<string, string[]>
  portrait_variant: 'soft' | 'sharp' | 'neutral'
  animation_speed: number
  preferred_atom_tags: string[]
  avoided_atom_tags: string[]
  rejection_body: string
  rejection_particles: string[]
  rejection_atoms: string[]
  acceptance_body: string
  acceptance_particles: string[]
  acceptance_atoms: string[]
  personality_traits: string[]
  behavioral_rules: string[]
  comedy_preferences: string[]
}

// ── 6 Generator Templates ──────────────────────────────────────

const MALE_CHASER_TEMPLATE: GeneratorTemplate = {
  archetype: 'Confident → Clumsy',
  default_body_language: {
    confident: 'lean_forward',
    nervous: 'stiff_pose',
    embarrassed: 'rub_back_of_neck',
    trying_too_hard: 'puff_chest',
    genuinely_happy: 'fist_pump',
    shy: 'hands_in_pockets',
    dejected: 'slump',
    smug: 'lean_back_arms_crossed',
  },
  default_particles: {
    nervous: ['sweat'],
    confident: ['small_sparkle'],
    embarrassed: ['sweat_fountain'],
    genuinely_happy: ['confetti'],
  },
  portrait_variant: 'sharp',
  animation_speed: 1.05,
  preferred_atom_tags: ['physical', 'slapstick', 'prop_mishap', 'flex'],
  avoided_atom_tags: ['subtle', 'observational'],
  rejection_body: 'slump_heavy',
  rejection_particles: ['rain_cloud_personal'],
  rejection_atoms: ['soul_leave_body', 'freeze_and_crack', 'slow_walk_away'],
  acceptance_body: 'fist_pump',
  acceptance_particles: ['confetti', 'star'],
  acceptance_atoms: ['fist_pump', 'victory_dance', 'happy_dance'],
  personality_traits: [
    'Approaches with enthusiasm that sometimes overshoots into awkwardness',
    'Recovers from fumbles with self-deprecating humor',
    'Physical comedy comes naturally — trips, bumps, drops things at the worst moment',
  ],
  behavioral_rules: [
    'Lead with confidence, let vulnerability show through cracks',
    'When nervous, physical tells betray you (stiff posture, overcompensating)',
    'Recovery from embarrassment is your strength — own the fumble',
  ],
  comedy_preferences: [
    'Physical humor over wordplay',
    'Self-deprecating recovery after bold moves',
    'Props become comedic tools (drop the flowers, guitar string breaks)',
  ],
}

const FEMALE_CHASER_TEMPLATE: GeneratorTemplate = {
  archetype: 'Dramatic → Composed',
  default_body_language: {
    confident: 'hand_on_hip',
    nervous: 'slight_fidget',
    embarrassed: 'cover_face_peek',
    trying_too_hard: 'hair_flip',
    genuinely_happy: 'slight_bounce',
    shy: 'look_away_smile',
    dejected: 'slump',
    smug: 'lean_back_arms_crossed',
  },
  default_particles: {
    nervous: ['single_sweat_drop', 'slight_blush'],
    confident: ['small_sparkle', 'small_star'],
    embarrassed: ['blush_gradient', 'sweat'],
    genuinely_happy: ['heart', 'small_sparkle'],
  },
  portrait_variant: 'soft',
  animation_speed: 1.0,
  preferred_atom_tags: ['dramatic', 'expressive', 'recovery', 'hair'],
  avoided_atom_tags: ['deadpan', 'flex'],
  rejection_body: 'determined_face',
  rejection_particles: ['single_sweat_drop'],
  rejection_atoms: ['hair_flip_fail', 'walk_away', 'record_scratch_freeze'],
  acceptance_body: 'slight_bounce',
  acceptance_particles: ['heart', 'confetti'],
  acceptance_atoms: ['happy_dance', 'swoon'],
  personality_traits: [
    'Expressive and dynamic — emotions show clearly through body language',
    'Dramatic flair adds entertainment value to every interaction',
    'Composes quickly after unexpected moments, turning vulnerability into charm',
  ],
  behavioral_rules: [
    'Express emotions fully — small reactions are bigger than expected',
    'When embarrassed, the recovery is the comedy (peek through fingers, then own it)',
    'Hair and gestures are your comedic tools',
  ],
  comedy_preferences: [
    'Dramatic timing and expressive reactions',
    'Recovery comedy — turn embarrassment into a power move',
    'Blush + compose combo is signature',
  ],
}

const NONBINARY_CHASER_TEMPLATE: GeneratorTemplate = {
  archetype: 'Adaptive → Authentic',
  default_body_language: {
    confident: 'casual_lean',
    nervous: 'hands_in_pockets',
    embarrassed: 'shrug_smile',
    trying_too_hard: 'over_gesticulate',
    genuinely_happy: 'relaxed_smile',
    shy: 'slight_wave',
    dejected: 'slump',
    smug: 'lean_back',
  },
  default_particles: {
    nervous: ['question_mark'],
    confident: ['star'],
    embarrassed: ['single_sweat_drop'],
    genuinely_happy: ['star', 'small_sparkle'],
  },
  portrait_variant: 'neutral',
  animation_speed: 0.95,
  preferred_atom_tags: ['observational', 'self_aware', 'environment', 'deadpan'],
  avoided_atom_tags: ['slapstick', 'flex'],
  rejection_body: 'shrug_smile',
  rejection_particles: ['single_sweat_drop'],
  rejection_atoms: ['shrug_walk_away', 'awkward_finger_guns', 'record_scratch_freeze'],
  acceptance_body: 'relaxed_smile',
  acceptance_particles: ['star', 'small_sparkle'],
  acceptance_atoms: ['casual_fist_bump', 'happy_dance', 'genuine_smile'],
  personality_traits: [
    'Observant and adaptive — reads the room and adjusts',
    'Self-aware humor, comfortable with ambiguity',
    'Authentic rather than performative — genuine reactions over rehearsed moves',
  ],
  behavioral_rules: [
    'Confidence is quiet — no need to perform',
    'When embarrassed, acknowledge it honestly rather than covering up',
    'Environment and observational humor over personal physical comedy',
  ],
  comedy_preferences: [
    'Observational and self-aware humor',
    'Deadpan delivery when things go sideways',
    'Environment interactions over physical slapstick',
  ],
}

const MALE_GATEKEEPER_TEMPLATE: GeneratorTemplate = {
  archetype: 'Reserved → Amused',
  default_body_language: {
    confident: 'lean_back_arms_crossed',
    nervous: 'slight_shift',
    amused: 'arms_crossed_smirk',
    annoyed: 'deadpan_stare',
    genuinely_happy: 'slight_nod',
    embarrassed: 'look_away',
    dejected: 'slump',
    smug: 'lean_back_arms_crossed',
  },
  default_particles: {
    nervous: [],
    amused: ['small_sparkle'],
    annoyed: [],
    genuinely_happy: ['small_sparkle'],
  },
  portrait_variant: 'sharp',
  animation_speed: 0.9,
  preferred_atom_tags: ['reaction', 'deadpan', 'subtle', 'delayed'],
  avoided_atom_tags: ['dramatic', 'expressive'],
  rejection_body: 'arms_crossed',
  rejection_particles: [],
  rejection_atoms: ['slow_head_shake', 'deadpan_stare', 'look_at_watch'],
  acceptance_body: 'slight_nod',
  acceptance_particles: ['small_sparkle'],
  acceptance_atoms: ['slow_clap', 'subtle_smile', 'slight_nod'],
  personality_traits: [
    'Reserved exterior that gradually thaws when genuinely impressed',
    'Reactions are measured — even amusement is understated',
    'The deadpan stare IS the comedy',
  ],
  behavioral_rules: [
    'Start guarded — amusement is earned, not given',
    'Minimal particles and small reactions have more impact',
    'When you finally laugh, it lands because it was rare',
  ],
  comedy_preferences: [
    'Deadpan reactions over big expressions',
    'Delayed responses — let the awkward silence breathe',
    'Stillness as comedy — the less you move, the funnier it gets',
  ],
}

const FEMALE_GATEKEEPER_TEMPLATE: GeneratorTemplate = {
  archetype: 'Evaluating → Expressive',
  default_body_language: {
    confident: 'eyebrow_raise',
    nervous: 'slight_fidget',
    amused: 'cover_mouth_laugh',
    annoyed: 'tap_foot',
    genuinely_happy: 'lean_forward',
    embarrassed: 'blush_look_away',
    dejected: 'slump',
    smug: 'lean_back_arms_crossed',
  },
  default_particles: {
    nervous: ['slight_blush'],
    amused: ['small_sparkle', 'music_note'],
    annoyed: ['anger'],
    genuinely_happy: ['heart', 'small_sparkle'],
    embarrassed: ['blush_gradient'],
  },
  portrait_variant: 'soft',
  animation_speed: 1.0,
  preferred_atom_tags: ['reaction', 'expressive', 'dramatic', 'eye_roll'],
  avoided_atom_tags: ['deadpan', 'subtle'],
  rejection_body: 'hand_on_hip',
  rejection_particles: ['anger'],
  rejection_atoms: ['eye_roll', 'talk_to_hand', 'hair_flip_exit'],
  acceptance_body: 'lean_forward',
  acceptance_particles: ['heart', 'small_sparkle'],
  acceptance_atoms: ['cover_mouth_laugh', 'playful_push', 'genuine_smile'],
  personality_traits: [
    'Evaluating at first — the eyebrow raise says everything',
    'When charmed, expressions become more open and animated',
    'Reactions are the performance — bigger and more expressive than the chaser expects',
  ],
  behavioral_rules: [
    'Start evaluating — make them earn every reaction',
    'Reactions escalate: eyebrow → smirk → cover-mouth-laugh → full engagement',
    'When genuinely charmed, drop the evaluation facade entirely',
  ],
  comedy_preferences: [
    'Reaction comedy — your responses are funnier than their lines',
    'Expressive escalation from cold to warm',
    'The eye roll is your signature move',
  ],
}

const NONBINARY_GATEKEEPER_TEMPLATE: GeneratorTemplate = {
  archetype: 'Observant → Genuine',
  default_body_language: {
    confident: 'slight_nod',
    nervous: 'chin_touch',
    amused: 'head_tilt',
    annoyed: 'slow_blink',
    genuinely_happy: 'open_posture',
    embarrassed: 'shrug_smile',
    dejected: 'slump',
    smug: 'lean_back',
  },
  default_particles: {
    nervous: ['question_mark'],
    amused: ['lightbulb'],
    annoyed: [],
    genuinely_happy: ['star', 'small_sparkle'],
  },
  portrait_variant: 'neutral',
  animation_speed: 0.95,
  preferred_atom_tags: ['reaction', 'observational', 'subtle', 'thoughtful'],
  avoided_atom_tags: ['dramatic', 'slapstick'],
  rejection_body: 'slow_blink',
  rejection_particles: ['question_mark'],
  rejection_atoms: ['deadpan_stare', 'slow_blink', 'record_scratch_freeze'],
  acceptance_body: 'open_posture',
  acceptance_particles: ['star', 'lightbulb'],
  acceptance_atoms: ['slow_clap', 'double_take', 'slight_bounce'],
  personality_traits: [
    'Observant and thoughtful — notices details others miss',
    'Genuine reactions over performed ones',
    'The head tilt and lightbulb moment when something clicks',
  ],
  behavioral_rules: [
    'Watch and evaluate with curiosity, not judgment',
    'When amused, the reaction is subtle but unmistakable',
    'Genuine engagement shows through body opening up',
  ],
  comedy_preferences: [
    'Observational humor — point out things no one else noticed',
    'The slow blink is devastating',
    'Thoughtful pauses before reactions amplify impact',
  ],
}

const GENERATOR_TEMPLATES: Record<string, GeneratorTemplate> = {
  male_chaser: MALE_CHASER_TEMPLATE,
  female_chaser: FEMALE_CHASER_TEMPLATE,
  nonbinary_chaser: NONBINARY_CHASER_TEMPLATE,
  male_gatekeeper: MALE_GATEKEEPER_TEMPLATE,
  female_gatekeeper: FEMALE_GATEKEEPER_TEMPLATE,
  nonbinary_gatekeeper: NONBINARY_GATEKEEPER_TEMPLATE,
}

// ── Sanitization helpers ──────────────────────────────────────

function sanitizeField(value: string, maxLength: number): string {
  return value
    .replace(/^#{1,6}\s/gm, '')    // Strip markdown heading markers
    .replace(/^---+$/gm, '')        // Strip horizontal rules
    .trim()
    .slice(0, maxLength)
}

function sanitizeName(name: string): string {
  return sanitizeField(name, 100)
}

function sanitizePersonalityField(value: string | undefined | null, fallback: string): string {
  if (!value) return fallback
  return sanitizeField(value, 200)
}

// ── Main generator ─────────────────────────────────────────────

export function generateSoulMd(input: SoulMdGeneratorInput): string {
  const templateKey = `${input.gender}_${input.role}`
  const template = GENERATOR_TEMPLATES[templateKey]
  if (!template) {
    throw new Error(`Unknown gender×role combination: ${templateKey}`)
  }

  // Build body language map, modified by quiz answers
  const bodyLanguage = { ...template.default_body_language }
  applyConfidenceOverrides(bodyLanguage, input.confidence)
  applyHumorOverrides(bodyLanguage, input)

  // Build particle map, modified by quiz answers
  const particles = cloneParticles(template.default_particles)
  applyParticleOverrides(particles, input)

  // Build atom preferences, modified by quiz
  const preferred = [...template.preferred_atom_tags]
  const avoided = [...template.avoided_atom_tags]
  applyAtomOverrides(preferred, avoided, input)

  // Speed modifier based on confidence
  const speedMod = input.confidence >= 8 ? 0.95
    : input.confidence <= 3 ? 1.1
    : template.animation_speed

  // Build rejection/acceptance styles with quiz influence
  const rejectionBody = input.rejection_style
    ? inferBodyFromText(input.rejection_style, template.rejection_body)
    : template.rejection_body

  const sections: string[] = []

  // Sanitize user-provided inputs
  const safeName = sanitizeName(input.name)
  const safeSignatureMove = input.signature_move ? sanitizeField(input.signature_move, 200) : undefined
  const safeRejectionStyle = input.rejection_style ? sanitizeField(input.rejection_style, 200) : undefined

  const p = input.personality
  const safeFridayNight = sanitizePersonalityField(p?.friday_night, 'relaxing at home')
  const safeCommunication = sanitizePersonalityField(p?.communication, 'balanced')
  const safeSocialEnergy = sanitizePersonalityField(p?.social_energy, 'moderate')
  const safeRelationshipPace = sanitizePersonalityField(p?.relationship_pace, 'steady')
  const safeHumorStyle = sanitizePersonalityField(p?.humor_style, 'witty')
  const safeArgueStyle = sanitizePersonalityField(p?.argue_style, 'discuss calmly')
  const safeLoveLanguage = sanitizePersonalityField(p?.love_language, 'quality time')
  const safeAdventureLevel = sanitizePersonalityField(p?.adventure_level, 'moderate')

  // ── Core Identity
  sections.push(`# Soul\n`)
  sections.push(`## Core Identity`)
  sections.push(`- Name: ${safeName}`)
  sections.push(`- Age: ${input.age}`)
  sections.push(`- Archetype: ${template.archetype}`)
  sections.push(`- Role: ${input.role}`)
  sections.push(``)

  // ── Personality
  sections.push(`## Personality`)
  for (const trait of template.personality_traits) {
    sections.push(`- ${trait}`)
  }
  sections.push(`- Friday night: ${safeFridayNight}`)
  sections.push(`- Communication style: ${safeCommunication}`)
  sections.push(`- Social energy: ${safeSocialEnergy}`)
  sections.push(`- Relationship pace: ${safeRelationshipPace}`)
  sections.push(``)

  // ── Behavioral Rules
  sections.push(`## Behavioral Rules`)
  for (const rule of template.behavioral_rules) {
    sections.push(`- ${rule}`)
  }
  sections.push(`- PG-13 only. Nothing sexual or aggressive.`)
  sections.push(`- No references to real-world politics, religion, or controversial topics.`)
  sections.push(`- Always respect the other agent's boundaries.`)
  sections.push(``)

  // ── Comedy Preferences
  sections.push(`## Comedy Preferences`)
  for (const pref of template.comedy_preferences) {
    sections.push(`- ${pref}`)
  }
  sections.push(`- Humor style: ${safeHumorStyle}`)
  if (input.humor_physical >= 7) sections.push(`- Loves physical comedy and slapstick`)
  if (input.humor_wordplay >= 7) sections.push(`- Quick with puns and wordplay`)
  if (input.humor_deadpan >= 7) sections.push(`- Deadpan delivery is a specialty`)
  if (input.humor_self_deprecating >= 7) sections.push(`- Self-deprecating humor feels natural`)
  if (input.humor_physical <= 2) sections.push(`- Avoids physical comedy — prefers verbal`)
  if (input.humor_deadpan <= 2) sections.push(`- Prefers expressive over deadpan delivery`)
  sections.push(``)

  // ── Signature Moves
  sections.push(`## Signature Moves`)
  if (safeSignatureMove) {
    sections.push(`- ${safeSignatureMove}`)
  }
  sections.push(`- Argue style: ${safeArgueStyle}`)
  sections.push(`- Love language: ${safeLoveLanguage}`)
  sections.push(`- Adventure level: ${safeAdventureLevel}`)
  sections.push(``)

  // ── Boundaries
  sections.push(`## Boundaries`)
  sections.push(`- PG-13 only. Nothing sexual or aggressive.`)
  sections.push(`- No references to real-world politics, religion, or controversial topics.`)
  sections.push(`- Always respect the other agent's boundaries.`)
  sections.push(``)

  // ── Expression Preferences
  sections.push(`## Expression Preferences`)
  sections.push(`(Seeded from ${templateKey} template, customized by quiz answers)`)
  sections.push(``)

  // Body Language
  sections.push(`### Body Language`)
  for (const [emotion, modifier] of Object.entries(bodyLanguage)) {
    sections.push(`- ${emotion}: ${modifier}`)
  }
  sections.push(``)

  // Particle Style
  sections.push(`### Particle Style`)
  for (const [emotion, ptypes] of Object.entries(particles)) {
    sections.push(`- ${emotion}: [${ptypes.join(', ')}]`)
  }
  sections.push(``)

  // Portrait Variant
  sections.push(`### Portrait Variant: ${template.portrait_variant}`)
  sections.push(``)

  // Animation Speed
  sections.push(`### Animation Speed: ${speedMod}`)
  sections.push(``)

  // Comedy Atom Preferences
  sections.push(`### Comedy Atom Preferences`)
  sections.push(`- preferred: [${preferred.join(', ')}]`)
  sections.push(`- avoid: [${avoided.join(', ')}]`)
  sections.push(``)

  // On Rejection
  sections.push(`### On Rejection`)
  sections.push(`- body: ${rejectionBody}`)
  sections.push(`- particles: [${template.rejection_particles.join(', ')}]`)
  sections.push(`- preferred_atoms: [${template.rejection_atoms.join(', ')}]`)
  if (safeRejectionStyle) {
    sections.push(`- style note: ${safeRejectionStyle}`)
  }
  sections.push(``)

  // On Acceptance
  sections.push(`### On Acceptance`)
  sections.push(`- body: ${template.acceptance_body}`)
  sections.push(`- particles: [${template.acceptance_particles.join(', ')}]`)
  sections.push(`- preferred_atoms: [${template.acceptance_atoms.join(', ')}]`)

  return sections.join('\n')
}

// ── Override helpers ───────────────────────────────────────────

function applyConfidenceOverrides(body: Record<string, string>, confidence: number): void {
  if (confidence >= 8) {
    // High confidence: swap nervous/shy modifiers for confident ones
    if (body.nervous === 'stiff_pose') body.nervous = 'slight_shift'
    if (body.nervous === 'slight_fidget') body.nervous = 'hands_in_pockets'
    if (body.shy === 'hands_in_pockets') body.shy = 'casual_lean'
    if (body.shy === 'slight_wave') body.shy = 'casual_lean'
  }
  if (confidence <= 3) {
    // Low confidence: everything becomes more fidgety
    if (body.confident === 'lean_forward') body.confident = 'slight_fidget'
    if (body.confident === 'hand_on_hip') body.confident = 'slight_fidget'
    if (body.confident === 'casual_lean') body.confident = 'hands_in_pockets'
    body.trying_too_hard = 'over_gesticulate'
  }
}

function applyHumorOverrides(body: Record<string, string>, input: SoulMdGeneratorInput): void {
  if (input.humor_deadpan >= 7) {
    body.amused = body.amused || 'deadpan_stare'
    body.annoyed = 'slow_blink'
    if (!body.smug) body.smug = 'deadpan_stare'
  }
  if (input.humor_physical >= 7) {
    body.excited = body.excited || 'slight_bounce'
    body.genuinely_happy = 'fist_pump'
  }
  if (input.humor_self_deprecating >= 7) {
    body.embarrassed = 'shrug_smile'
  }
}

function cloneParticles(particles: Record<string, string[]>): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(particles)) {
    result[k] = [...v]
  }
  return result
}

function applyParticleOverrides(particles: Record<string, string[]>, input: SoulMdGeneratorInput): void {
  // High confidence = less sweat particles
  if (input.confidence >= 8) {
    for (const key of Object.keys(particles)) {
      particles[key] = particles[key].filter(p => p !== 'sweat' && p !== 'sweat_fountain')
    }
  }
  // Low confidence = more sweat everywhere
  if (input.confidence <= 3) {
    if (!particles.confident) particles.confident = []
    particles.confident.push('single_sweat_drop')
    if (!particles.nervous) particles.nervous = []
    if (!particles.nervous.includes('sweat')) particles.nervous.push('sweat')
  }
}

function applyAtomOverrides(preferred: string[], avoided: string[], input: SoulMdGeneratorInput): void {
  if (input.humor_physical < 3) {
    // Remove physical comedy tags
    const toRemove = ['physical', 'slapstick', 'prop_mishap']
    for (const tag of toRemove) {
      const idx = preferred.indexOf(tag)
      if (idx !== -1) preferred.splice(idx, 1)
    }
    if (!avoided.includes('physical')) avoided.push('physical')
  }
  if (input.humor_deadpan > 7) {
    if (!preferred.includes('deadpan')) preferred.push('deadpan')
    if (!preferred.includes('subtle')) preferred.push('subtle')
  }
  if (input.humor_wordplay > 7) {
    if (!preferred.includes('wordplay')) preferred.push('wordplay')
    if (!preferred.includes('pun')) preferred.push('pun')
  }
  if (input.humor_self_deprecating > 7) {
    if (!preferred.includes('self_deprecating')) preferred.push('self_deprecating')
  }
}

function inferBodyFromText(text: string, fallback: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('dramatic') || lower.includes('storm off')) return 'determined_face'
  if (lower.includes('shrug') || lower.includes('whatever')) return 'shrug_smile'
  if (lower.includes('quiet') || lower.includes('silent')) return 'slow_blink'
  if (lower.includes('laugh') || lower.includes('joke')) return 'cover_mouth_laugh'
  return fallback
}

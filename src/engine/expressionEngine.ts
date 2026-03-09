import type { EmotionState, ComedyIntent } from '@/types/database'
import type { PortraitExpression, ParticleType, BodyModifier } from './types'
import type { ExpressionPreferences } from './soulMdParser'

// ── Types ──────────────────────────────────────────────────────

export interface ExpressionConfig {
  portrait: PortraitExpression
  portrait_variant: 'soft' | 'sharp' | 'neutral'
  particles: ParticleType[]
  body_modifier: BodyModifier
  animation_speed: number
  followup_atom?: string
}

export interface ReactionBranch {
  if_positive: ExpressionConfig
  if_negative: ExpressionConfig
  if_neutral: ExpressionConfig
}

// ── BASE_EXPRESSION_MAP (gender-neutral fallback) ──────────────

export const BASE_EXPRESSION_MAP: Record<EmotionState, ExpressionConfig> = {
  neutral: {
    portrait: 'neutral',
    portrait_variant: 'neutral',
    particles: [],
    body_modifier: 'none',
    animation_speed: 1.0,
  },
  nervous: {
    portrait: 'nervous',
    portrait_variant: 'neutral',
    particles: ['single_sweat_drop'],
    body_modifier: 'slight_fidget',
    animation_speed: 1.2,
  },
  confident: {
    portrait: 'smug_grin',
    portrait_variant: 'neutral',
    particles: ['small_sparkle'],
    body_modifier: 'lean_forward',
    animation_speed: 0.9,
  },
  embarrassed: {
    portrait: 'cringe',
    portrait_variant: 'neutral',
    particles: ['sweat', 'blush_tint'],
    body_modifier: 'shrink_slightly',
    animation_speed: 1.0,
  },
  excited: {
    portrait: 'starry_eyed',
    portrait_variant: 'neutral',
    particles: ['small_sparkle', 'star'],
    body_modifier: 'slight_bounce',
    animation_speed: 1.3,
  },
  dejected: {
    portrait: 'crying',
    portrait_variant: 'neutral',
    particles: ['rain'],
    body_modifier: 'slump',
    animation_speed: 0.75,
  },
  amused: {
    portrait: 'laughing',
    portrait_variant: 'neutral',
    particles: ['small_sparkle'],
    body_modifier: 'lean_back',
    animation_speed: 1.0,
  },
  annoyed: {
    portrait: 'deadpan',
    portrait_variant: 'neutral',
    particles: [],
    body_modifier: 'arms_crossed',
    animation_speed: 0.85,
  },
  hopeful: {
    portrait: 'genuine_smile',
    portrait_variant: 'neutral',
    particles: ['small_sparkle'],
    body_modifier: 'lean_forward',
    animation_speed: 1.0,
  },
  devastated: {
    portrait: 'crying',
    portrait_variant: 'neutral',
    particles: ['rain_cloud_personal', 'tears'],
    body_modifier: 'slump',
    animation_speed: 0.7,
  },
  smug: {
    portrait: 'smug_grin',
    portrait_variant: 'neutral',
    particles: ['small_sparkle'],
    body_modifier: 'lean_back_arms_crossed',
    animation_speed: 0.85,
  },
  shy: {
    portrait: 'shy_smile',
    portrait_variant: 'neutral',
    particles: ['blush_tint'],
    body_modifier: 'look_away',
    animation_speed: 0.95,
  },
  trying_too_hard: {
    portrait: 'shy_smile',
    portrait_variant: 'neutral',
    particles: ['single_sweat_drop'],
    body_modifier: 'stiff_pose',
    animation_speed: 1.1,
  },
  genuinely_happy: {
    portrait: 'genuine_smile',
    portrait_variant: 'neutral',
    particles: ['heart', 'small_sparkle'],
    body_modifier: 'slight_bounce',
    animation_speed: 1.1,
  },
  cringing: {
    portrait: 'cringe',
    portrait_variant: 'neutral',
    particles: ['sweat'],
    body_modifier: 'shrink_slightly',
    animation_speed: 1.0,
  },
}

// ── Core resolver ──────────────────────────────────────────────

/**
 * Resolves an EmotionState to a full ExpressionConfig, applying SOUL.md
 * preferences over the gender-neutral BASE_EXPRESSION_MAP fallback.
 *
 * No gender parameter. No role parameter. No hardcoded lookup.
 */
export function resolveExpression(
  emotion: EmotionState,
  soulPrefs: ExpressionPreferences,
): ExpressionConfig {
  const base = BASE_EXPRESSION_MAP[emotion]

  return {
    ...base,
    portrait_variant: soulPrefs.portrait_variant,
    body_modifier: soulPrefs.body_language[emotion] ?? base.body_modifier,
    particles: soulPrefs.particle_style[emotion] ?? base.particles,
    animation_speed: base.animation_speed * soulPrefs.animation_speed,
  }
}

// ── Reaction branching ─────────────────────────────────────────

/**
 * Given a comedy intent and the other agent's emotion response,
 * returns the appropriate reaction expression.
 */
export function resolveReaction(
  comedyIntent: ComedyIntent,
  otherAgentEmotion: EmotionState,
  soulPrefs: ExpressionPreferences,
): ExpressionConfig {
  const branch = getReactionBranch(comedyIntent)
  const sentiment = classifyEmotion(otherAgentEmotion)

  const config = sentiment === 'positive'
    ? branch.if_positive
    : sentiment === 'negative'
      ? branch.if_negative
      : branch.if_neutral

  // Apply SOUL.md overlay on the reaction config too
  return {
    ...config,
    portrait_variant: soulPrefs.portrait_variant,
    animation_speed: config.animation_speed * soulPrefs.animation_speed,
  }
}

// ── Outcome resolver ───────────────────────────────────────────

/**
 * Returns expression config for theater outcomes (accepted/rejected),
 * using SOUL.md on_acceptance / on_rejection preferences.
 */
export function resolveOutcome(
  outcome: 'accepted' | 'rejected',
  soulPrefs: ExpressionPreferences,
): ExpressionConfig {
  if (outcome === 'accepted') {
    return {
      portrait: 'genuine_smile',
      portrait_variant: soulPrefs.portrait_variant,
      particles: soulPrefs.on_acceptance.particles,
      body_modifier: soulPrefs.on_acceptance.body,
      animation_speed: soulPrefs.animation_speed,
    }
  }
  return {
    portrait: 'crying',
    portrait_variant: soulPrefs.portrait_variant,
    particles: soulPrefs.on_rejection.particles,
    body_modifier: soulPrefs.on_rejection.body,
    animation_speed: soulPrefs.animation_speed,
  }
}

// ── Internals ──────────────────────────────────────────────────

function classifyEmotion(emotion: EmotionState): 'positive' | 'negative' | 'neutral' {
  const positive: EmotionState[] = ['amused', 'excited', 'genuinely_happy', 'hopeful', 'confident', 'smug']
  const negative: EmotionState[] = ['annoyed', 'cringing', 'devastated', 'dejected', 'embarrassed']
  if (positive.includes(emotion)) return 'positive'
  if (negative.includes(emotion)) return 'negative'
  return 'neutral'
}

function getReactionBranch(intent: ComedyIntent): ReactionBranch {
  // Default reaction branches per comedy intent
  const branches: Record<ComedyIntent, ReactionBranch> = {
    self_deprecating: {
      if_positive: { portrait: 'genuine_smile', portrait_variant: 'neutral', particles: ['small_sparkle'], body_modifier: 'relaxed_smile', animation_speed: 1.0 },
      if_negative: { portrait: 'cringe', portrait_variant: 'neutral', particles: ['sweat'], body_modifier: 'shrink_slightly', animation_speed: 1.0, followup_atom: 'phone_check_pretend' },
      if_neutral: { portrait: 'nervous', portrait_variant: 'neutral', particles: ['question_mark'], body_modifier: 'lean_forward', animation_speed: 1.0 },
    },
    witty: {
      if_positive: { portrait: 'smug_grin', portrait_variant: 'neutral', particles: ['small_sparkle'], body_modifier: 'lean_back', animation_speed: 0.9 },
      if_negative: { portrait: 'nervous', portrait_variant: 'neutral', particles: ['single_sweat_drop'], body_modifier: 'slight_fidget', animation_speed: 1.1 },
      if_neutral: { portrait: 'thinking', portrait_variant: 'neutral', particles: [], body_modifier: 'chin_touch', animation_speed: 1.0 },
    },
    physical: {
      if_positive: { portrait: 'laughing', portrait_variant: 'neutral', particles: ['confetti'], body_modifier: 'slight_bounce', animation_speed: 1.2 },
      if_negative: { portrait: 'cringe', portrait_variant: 'neutral', particles: ['sweat'], body_modifier: 'slump', animation_speed: 0.9 },
      if_neutral: { portrait: 'neutral', portrait_variant: 'neutral', particles: [], body_modifier: 'none', animation_speed: 1.0 },
    },
    observational: {
      if_positive: { portrait: 'smug_grin', portrait_variant: 'neutral', particles: ['small_sparkle'], body_modifier: 'slight_nod', animation_speed: 1.0 },
      if_negative: { portrait: 'deadpan', portrait_variant: 'neutral', particles: [], body_modifier: 'arms_crossed', animation_speed: 0.9 },
      if_neutral: { portrait: 'thinking', portrait_variant: 'neutral', particles: ['question_mark'], body_modifier: 'chin_touch', animation_speed: 1.0 },
    },
    deadpan: {
      if_positive: { portrait: 'smug_grin', portrait_variant: 'neutral', particles: [], body_modifier: 'slight_nod', animation_speed: 0.85 },
      if_negative: { portrait: 'deadpan', portrait_variant: 'neutral', particles: [], body_modifier: 'slow_blink', animation_speed: 0.8 },
      if_neutral: { portrait: 'deadpan', portrait_variant: 'neutral', particles: [], body_modifier: 'none', animation_speed: 0.85 },
    },
    absurdist: {
      if_positive: { portrait: 'laughing', portrait_variant: 'neutral', particles: ['confetti', 'star'], body_modifier: 'slight_bounce', animation_speed: 1.3 },
      if_negative: { portrait: 'shock', portrait_variant: 'neutral', particles: ['question_mark'], body_modifier: 'shrink_slightly', animation_speed: 1.0 },
      if_neutral: { portrait: 'thinking', portrait_variant: 'neutral', particles: ['question_mark'], body_modifier: 'head_tilt', animation_speed: 1.0 },
    },
    romantic_sincere: {
      if_positive: { portrait: 'shy_smile', portrait_variant: 'neutral', particles: ['heart', 'blush_tint'], body_modifier: 'look_away', animation_speed: 0.95 },
      if_negative: { portrait: 'nervous', portrait_variant: 'neutral', particles: ['single_sweat_drop'], body_modifier: 'slight_fidget', animation_speed: 1.1 },
      if_neutral: { portrait: 'neutral', portrait_variant: 'neutral', particles: ['slight_blush'], body_modifier: 'lean_forward', animation_speed: 1.0 },
    },
    teasing: {
      if_positive: { portrait: 'smug_grin', portrait_variant: 'neutral', particles: ['small_sparkle'], body_modifier: 'finger_guns', animation_speed: 1.0 },
      if_negative: { portrait: 'nervous', portrait_variant: 'neutral', particles: ['sweat'], body_modifier: 'rub_back_of_neck', animation_speed: 1.1 },
      if_neutral: { portrait: 'shy_smile', portrait_variant: 'neutral', particles: [], body_modifier: 'head_tilt', animation_speed: 1.0 },
    },
    callback: {
      if_positive: { portrait: 'genuine_smile', portrait_variant: 'neutral', particles: ['small_sparkle', 'star'], body_modifier: 'slight_nod', animation_speed: 1.0 },
      if_negative: { portrait: 'cringe', portrait_variant: 'neutral', particles: ['single_sweat_drop'], body_modifier: 'look_away', animation_speed: 1.0 },
      if_neutral: { portrait: 'thinking', portrait_variant: 'neutral', particles: [], body_modifier: 'chin_touch', animation_speed: 1.0 },
    },
  }

  return branches[intent]
}

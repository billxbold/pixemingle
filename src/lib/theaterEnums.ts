import type { ActionType, ComedyIntent, EmotionState, TheaterStatus } from '@/types/database'

export const VALID_EMOTIONS: EmotionState[] = [
  'neutral', 'nervous', 'confident', 'embarrassed', 'excited',
  'dejected', 'amused', 'annoyed', 'hopeful', 'devastated',
  'smug', 'shy', 'trying_too_hard', 'genuinely_happy', 'cringing',
]

export const VALID_ACTIONS: ActionType[] = [
  'deliver_line', 'react', 'use_prop', 'physical_comedy',
  'environment_interact', 'signature_move', 'entrance', 'exit',
]

export const VALID_INTENTS: ComedyIntent[] = [
  'self_deprecating', 'witty', 'physical', 'observational',
  'deadpan', 'absurdist', 'romantic_sincere', 'teasing', 'callback',
]

export const VALID_THEATER_STATUSES: TheaterStatus[] = [
  'entrance', 'active', 'completed_accepted', 'completed_rejected',
]

export const MAX_THEATER_TURNS = 20
export const MIN_TURNS_BEFORE_EXIT = 4

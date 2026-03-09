// IMPORTANT: These enums MUST match src/lib/theaterEnums.ts in the main project.
// If you change values here, update the main project too (and vice versa).

export const VALID_ACTIONS = [
  'deliver_line',
  'react',
  'use_prop',
  'physical_comedy',
  'environment_interact',
  'signature_move',
  'entrance',
  'exit',
] as const;

export const VALID_EMOTIONS = [
  'neutral',
  'nervous',
  'confident',
  'embarrassed',
  'excited',
  'dejected',
  'amused',
  'annoyed',
  'hopeful',
  'devastated',
  'smug',
  'shy',
  'trying_too_hard',
  'genuinely_happy',
  'cringing',
] as const;

export const VALID_INTENTS = [
  'self_deprecating',
  'witty',
  'physical',
  'observational',
  'deadpan',
  'absurdist',
  'romantic_sincere',
  'teasing',
  'callback',
] as const;

export type ActionType = (typeof VALID_ACTIONS)[number];
export type EmotionState = (typeof VALID_EMOTIONS)[number];
export type ComedyIntent = (typeof VALID_INTENTS)[number];

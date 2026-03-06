import type { SoulType, SoulConfig } from '@/types/database'

export const PERSONALITY_QUESTIONS = [
  {
    id: 'friday_night',
    question: 'Friday night ideal?',
    options: ['Adventurous outing', 'Cozy night in', 'Social gathering', 'Creative project'],
  },
  {
    id: 'argue_style',
    question: 'How do you handle disagreements?',
    options: ['Avoid conflict', 'Talk it out', 'Passionate debate', 'Humor defuses'],
  },
  {
    id: 'love_language',
    question: 'Your love language?',
    options: ['Words of affirmation', 'Physical touch', 'Gifts', 'Quality time', 'Acts of service'],
  },
  {
    id: 'social_energy',
    question: 'At a party, you...',
    options: ['Work the room', 'Find one person to talk to deeply', 'Leave early', 'Start dancing'],
  },
  {
    id: 'adventure_level',
    question: 'Spontaneous trip tomorrow?',
    options: ['Already packing', 'Need a week to plan', 'Only if someone else plans', 'Hard pass'],
  },
  {
    id: 'communication',
    question: 'Texting style?',
    options: ['Paragraphs', 'One-liners', 'Voice notes', 'Memes only'],
  },
  {
    id: 'humor_style',
    question: 'What makes you laugh hardest?',
    options: ['Dry wit', 'Slapstick', 'Dark humor', 'Puns and wordplay'],
  },
  {
    id: 'relationship_pace',
    question: 'Ideal relationship pace?',
    options: ['Slow burn', 'Jump right in', 'Let it happen naturally', 'Define everything upfront'],
  },
] as const

export const HOROSCOPE_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

export const HOROSCOPE_MATRIX: number[][] = [
  // Ari  Tau  Gem  Can  Leo  Vir  Lib  Sco  Sag  Cap  Aqu  Pis
  [0.50, 0.40, 0.75, 0.35, 0.90, 0.45, 0.70, 0.50, 0.95, 0.40, 0.80, 0.55], // Aries
  [0.40, 0.50, 0.35, 0.85, 0.45, 0.90, 0.55, 0.80, 0.40, 0.95, 0.45, 0.75], // Taurus
  [0.75, 0.35, 0.50, 0.45, 0.80, 0.40, 0.90, 0.35, 0.70, 0.45, 0.95, 0.50], // Gemini
  [0.35, 0.85, 0.45, 0.50, 0.40, 0.70, 0.45, 0.95, 0.35, 0.60, 0.40, 0.90], // Cancer
  [0.90, 0.45, 0.80, 0.40, 0.50, 0.45, 0.85, 0.55, 0.90, 0.35, 0.70, 0.40], // Leo
  [0.45, 0.90, 0.40, 0.70, 0.45, 0.50, 0.55, 0.75, 0.40, 0.90, 0.50, 0.65], // Virgo
  [0.70, 0.55, 0.90, 0.45, 0.85, 0.55, 0.50, 0.50, 0.75, 0.55, 0.85, 0.60], // Libra
  [0.50, 0.80, 0.35, 0.95, 0.55, 0.75, 0.50, 0.50, 0.45, 0.70, 0.55, 0.95], // Scorpio
  [0.95, 0.40, 0.70, 0.35, 0.90, 0.40, 0.75, 0.45, 0.50, 0.40, 0.80, 0.55], // Sagittarius
  [0.40, 0.95, 0.45, 0.60, 0.35, 0.90, 0.55, 0.70, 0.40, 0.50, 0.50, 0.70], // Capricorn
  [0.80, 0.45, 0.95, 0.40, 0.70, 0.50, 0.85, 0.55, 0.80, 0.50, 0.50, 0.55], // Aquarius
  [0.55, 0.75, 0.50, 0.90, 0.40, 0.65, 0.60, 0.95, 0.55, 0.70, 0.55, 0.50], // Pisces
]

export const SOUL_CONFIGS: Record<SoulType, SoulConfig> = {
  romantic: {
    type: 'romantic',
    persistence: 4,
    drama_level: 4,
    romance_style: 5,
    humor_type: 'self-deprecating',
  },
  funny: {
    type: 'funny',
    persistence: 3,
    drama_level: 3,
    romance_style: 2,
    humor_type: 'slapstick',
  },
  bold: {
    type: 'bold',
    persistence: 2,
    drama_level: 5,
    romance_style: 4,
    humor_type: 'dry',
  },
  intellectual: {
    type: 'intellectual',
    persistence: 3,
    drama_level: 2,
    romance_style: 3,
    humor_type: 'wordplay',
  },
}

export const RATE_LIMITS = {
  free: {
    matches_per_week: 3,
    retries_per_match: 1,
    scenarios_per_day: 5,
    chat_messages_per_day: 50,
    max_photos: 3,
  },
  wingman: {
    matches_per_week: Infinity,
    retries_per_match: 3,
    scenarios_per_day: 20,
    chat_messages_per_day: Infinity,
    max_photos: 6,
  },
  rizzlord: {
    matches_per_week: Infinity,
    retries_per_match: Infinity,
    scenarios_per_day: 50,
    chat_messages_per_day: Infinity,
    max_photos: 6,
  },
}

export const COSMETICS_CATALOG = {
  hair: [
    { id: 'hair_default_1', name: 'Classic', price_cents: 0, tier: 'free' },
    { id: 'hair_default_2', name: 'Wavy', price_cents: 0, tier: 'free' },
    { id: 'hair_default_3', name: 'Short', price_cents: 0, tier: 'free' },
    { id: 'hair_default_4', name: 'Long', price_cents: 0, tier: 'free' },
    { id: 'hair_default_5', name: 'Curly', price_cents: 0, tier: 'free' },
    { id: 'hair_premium_1', name: 'Rainbow', price_cents: 99, tier: 'free' },
    { id: 'hair_premium_2', name: 'Galaxy', price_cents: 99, tier: 'free' },
    { id: 'hair_premium_3', name: 'Fire', price_cents: 99, tier: 'free' },
  ],
  top: [
    { id: 'top_tshirt', name: 'T-Shirt', price_cents: 0, tier: 'free' },
    { id: 'top_hoodie', name: 'Hoodie', price_cents: 0, tier: 'free' },
    { id: 'top_blouse', name: 'Blouse', price_cents: 0, tier: 'free' },
    { id: 'top_sweater', name: 'Sweater', price_cents: 0, tier: 'free' },
    { id: 'top_tank', name: 'Tank Top', price_cents: 0, tier: 'free' },
    { id: 'top_tuxedo', name: 'Tuxedo', price_cents: 199, tier: 'free' },
    { id: 'top_leather', name: 'Leather Jacket', price_cents: 199, tier: 'free' },
  ],
  bottom: [
    { id: 'bottom_jeans', name: 'Jeans', price_cents: 0, tier: 'free' },
    { id: 'bottom_skirt', name: 'Skirt', price_cents: 0, tier: 'free' },
    { id: 'bottom_shorts', name: 'Shorts', price_cents: 0, tier: 'free' },
    { id: 'bottom_slacks', name: 'Slacks', price_cents: 0, tier: 'free' },
  ],
  accessory: [
    { id: 'acc_glasses', name: 'Glasses', price_cents: 99, tier: 'free' },
    { id: 'acc_hat', name: 'Hat', price_cents: 99, tier: 'free' },
    { id: 'acc_crown', name: 'Crown', price_cents: 299, tier: 'free' },
    { id: 'acc_wings', name: 'Wings', price_cents: 299, tier: 'free' },
  ],
}

export type Gender = 'male' | 'female' | 'nonbinary'
export type TheaterRole = 'chaser' | 'gatekeeper'

export type AnimationAction =
  | 'confident_walk' | 'dramatic_entrance' | 'flower_offer' | 'victory_dance'
  | 'sad_slump' | 'angry_kick' | 'sad_walkoff' | 'walk_away'
  | 'wardrobe_change' | 'blush' | 'eye_roll' | 'phone_check'
  | 'thinking' | 'irritated_foot_tap' | 'flower_accept'
  | 'idle' | 'rejected_shock' | 'determined_face'

export interface GenderAnimationSet {
  approach: AnimationAction
  rejected: AnimationAction[]
  venueCountered: AnimationAction[]
  winningMove: AnimationAction
  victory: AnimationAction
  walkoff: AnimationAction
}

const MALE_CHASER: GenderAnimationSet = {
  approach: 'confident_walk',
  rejected: ['angry_kick', 'sad_slump'],
  venueCountered: ['sad_slump', 'wardrobe_change', 'confident_walk'],
  winningMove: 'flower_offer',
  victory: 'victory_dance',
  walkoff: 'sad_walkoff',
}

const FEMALE_CHASER: GenderAnimationSet = {
  approach: 'dramatic_entrance',
  rejected: ['blush', 'determined_face'],
  venueCountered: ['eye_roll', 'wardrobe_change', 'dramatic_entrance'],
  winningMove: 'thinking',
  victory: 'victory_dance',
  walkoff: 'walk_away',
}

const MALE_GATEKEEPER: GenderAnimationSet = {
  approach: 'idle',
  rejected: ['phone_check'],
  venueCountered: ['thinking'],
  winningMove: 'blush',
  victory: 'flower_accept',
  walkoff: 'walk_away',
}

const FEMALE_GATEKEEPER: GenderAnimationSet = {
  approach: 'eye_roll',
  rejected: ['irritated_foot_tap'],
  venueCountered: ['eye_roll', 'thinking'],
  winningMove: 'blush',
  victory: 'flower_accept',
  walkoff: 'walk_away',
}

const ANIMATION_SETS: Record<string, GenderAnimationSet> = {
  'male_chaser': MALE_CHASER,
  'female_chaser': FEMALE_CHASER,
  'male_gatekeeper': MALE_GATEKEEPER,
  'female_gatekeeper': FEMALE_GATEKEEPER,
}

export function getAnimationSet(gender: Gender, role: TheaterRole): GenderAnimationSet {
  if (gender === 'nonbinary') {
    const male = ANIMATION_SETS[`male_${role}`]
    const female = ANIMATION_SETS[`female_${role}`]
    const pick = <T,>(a: T, b: T): T => Math.random() > 0.5 ? a : b
    return {
      approach: pick(male.approach, female.approach),
      rejected: pick(male.rejected, female.rejected),
      venueCountered: pick(male.venueCountered, female.venueCountered),
      winningMove: pick(male.winningMove, female.winningMove),
      victory: pick(male.victory, female.victory),
      walkoff: pick(male.walkoff, female.walkoff),
    }
  }
  return ANIMATION_SETS[`${gender}_${role}`] ?? MALE_CHASER
}

export function getGenderTheaterPrompt(
  chaserGender: Gender,
  gatekeeperGender: Gender,
  chaserLookingFor: string,
  gatekeeperLookingFor: string,
): string {
  const chaserSet = getAnimationSet(chaserGender, 'chaser')
  const gkSet = getAnimationSet(gatekeeperGender, 'gatekeeper')

  return `
GENDER THEATER DIRECTION:
- Chaser is ${chaserGender} (looking for ${chaserLookingFor}). Preferred approach: ${chaserSet.approach}. On rejection: use ${chaserSet.rejected.join(' or ')}. Winning move: ${chaserSet.winningMove}. Victory: ${chaserSet.victory}. Walkoff: ${chaserSet.walkoff}.
- Gatekeeper is ${gatekeeperGender} (looking for ${gatekeeperLookingFor}). Default pose: ${gkSet.approach}. Rejection style: ${gkSet.rejected.join(' or ')}. When won over: ${gkSet.winningMove}. Victory: ${gkSet.victory}.
- Match animation actions to these gender-specific behaviors. The theater should feel authentic to these gender dynamics.`
}

export interface GenderAnimFrame {
  action: AnimationAction
  spritesheetAnim: string
  frames: number
  frameDuration: number
  particleType?: string
}

export const GENDER_FRAME_MAP: Record<string, GenderAnimFrame> = {
  'confident_walk': { action: 'confident_walk', spritesheetAnim: 'walk', frames: 4, frameDuration: 0.12 },
  'dramatic_entrance': { action: 'dramatic_entrance', spritesheetAnim: 'walk', frames: 4, frameDuration: 0.18 },
  'sad_slump': { action: 'sad_slump', spritesheetAnim: 'hurt', frames: 2, frameDuration: 0.4, particleType: 'rain' },
  'angry_kick': { action: 'angry_kick', spritesheetAnim: 'hit', frames: 2, frameDuration: 0.15 },
  'flower_offer': { action: 'flower_offer', spritesheetAnim: 'gift', frames: 2, frameDuration: 0.3, particleType: 'heart' },
  'victory_dance': { action: 'victory_dance', spritesheetAnim: 'idleAnim', frames: 6, frameDuration: 0.15, particleType: 'confetti' },
  'eye_roll': { action: 'eye_roll', spritesheetAnim: 'idle', frames: 1, frameDuration: 0.5 },
  'phone_check': { action: 'phone_check', spritesheetAnim: 'phone', frames: 6, frameDuration: 0.2 },
  'blush': { action: 'blush', spritesheetAnim: 'idleAnim', frames: 6, frameDuration: 0.25, particleType: 'heart' },
  'sad_walkoff': { action: 'sad_walkoff', spritesheetAnim: 'walk', frames: 4, frameDuration: 0.2, particleType: 'rain' },
}

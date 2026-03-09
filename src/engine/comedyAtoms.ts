import type { ParticleType, CharacterState } from './types'

// ── Camera action types (shared with cameraSystem) ──────────────

export interface CameraAction {
  type: 'zoom' | 'pan' | 'shake';
  zoom_level?: number;
  duration_ms: number;
  easing: 'linear' | 'ease_in' | 'ease_out' | 'bounce';
}

// ── Atom frame definition ───────────────────────────────────────

export interface AtomFrame {
  duration_ms: number;
  offset_x?: number;       // pixel offset for movement
  offset_y?: number;       // pixel offset for movement
  scale?: number;           // squash/stretch (1.0 = normal)
  rotation?: number;        // degrees (unused in MVP — canvas rotation is expensive for pixel art)
  sprite_override?: {       // force specific spritesheet frame
    row: number;
    col: number;
  };
}

// ── Comedy atom definition ──────────────────────────────────────

export interface ComedyAtom {
  id: string;
  category: 'physical' | 'reaction' | 'timing' | 'entrance';
  frames: AtomFrame[];
  duration_ms: number;
  particles?: { type: ParticleType; trigger_at_ms: number; count?: number }[];
  camera?: CameraAction;
  can_interrupt: boolean;
  exit_state: CharacterState;
  tags: string[];
  gender_affinity?: 'masculine' | 'feminine' | 'neutral' | 'any';
  role_affinity?: 'chaser' | 'gatekeeper' | 'any';
}

// ── Helper: compute total duration from frames ──────────────────

function totalDuration(frames: AtomFrame[]): number {
  return frames.reduce((sum, f) => sum + f.duration_ms, 0)
}

// ── 20 MVP comedy atoms ─────────────────────────────────────────
// All atoms work with ANY character spritesheet — comedy comes from
// position offsets, scale changes, timing, and particles.

const atomDefinitions: ComedyAtom[] = [
  // ═══════════════════════════════════════════════
  // PHYSICAL (8)
  // ═══════════════════════════════════════════════

  {
    id: 'trip_and_recover',
    category: 'physical',
    frames: [
      { duration_ms: 150, offset_x: 3, offset_y: 0 },        // lean forward
      { duration_ms: 100, offset_x: -5, offset_y: -2 },      // stumble
      { duration_ms: 200, offset_x: -5, offset_y: 3, scale: 0.9 }, // dip down
      { duration_ms: 150, offset_x: -3, offset_y: 0 },       // catch self
      { duration_ms: 200, offset_x: 0, offset_y: 0, scale: 1.05 }, // stand up straight (overcorrect)
      { duration_ms: 150, offset_x: 0, offset_y: 0 },        // settle
    ],
    duration_ms: 0, // computed below
    particles: [
      { type: 'sweat', trigger_at_ms: 250, count: 2 },
    ],
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['slapstick', 'entrance', 'nervous'],
    gender_affinity: 'any',
    role_affinity: 'chaser',
  },

  {
    id: 'slip_on_floor',
    category: 'physical',
    frames: [
      { duration_ms: 100, offset_x: 2, offset_y: 0 },
      { duration_ms: 100, offset_x: 5, offset_y: -3 },       // feet go forward
      { duration_ms: 150, offset_x: 3, offset_y: 5, scale: 0.8 }, // hit ground
      { duration_ms: 300, offset_x: 3, offset_y: 5, scale: 0.8 }, // stay down (comedy beat)
      { duration_ms: 200, offset_x: 1, offset_y: 2, scale: 0.9 }, // getting up
      { duration_ms: 150, offset_x: 0, offset_y: 0 },        // recovered
    ],
    duration_ms: 0,
    particles: [
      { type: 'sweat_fountain', trigger_at_ms: 350, count: 3 },
      { type: 'star', trigger_at_ms: 350, count: 2 },
    ],
    camera: { type: 'shake', duration_ms: 200, easing: 'bounce' },
    can_interrupt: false,
    exit_state: 'idle',
    tags: ['slapstick', 'big'],
    gender_affinity: 'any',
    role_affinity: 'any',
  },

  {
    id: 'flower_too_big',
    category: 'physical',
    frames: [
      { duration_ms: 200, offset_x: 0, offset_y: 0, scale: 1.0 },  // holding flower
      { duration_ms: 300, offset_x: 0, offset_y: -2, scale: 1.1 },  // flower grows (puff up)
      { duration_ms: 200, offset_x: -2, offset_y: 0, scale: 1.15 }, // leaning from weight
      { duration_ms: 200, offset_x: -3, offset_y: 2, scale: 0.95 }, // stumble
      { duration_ms: 200, offset_x: 0, offset_y: 0 },               // drop it
    ],
    duration_ms: 0,
    particles: [
      { type: 'confetti', trigger_at_ms: 700, count: 4 },
    ],
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['prop', 'romantic', 'fail'],
    gender_affinity: 'any',
    role_affinity: 'chaser',
  },

  {
    id: 'lean_on_nothing',
    category: 'physical',
    frames: [
      { duration_ms: 200, offset_x: 3, offset_y: 0 },        // lean sideways (cool)
      { duration_ms: 150, offset_x: 5, offset_y: 0 },        // more lean
      { duration_ms: 100, offset_x: 8, offset_y: -3 },       // too far!
      { duration_ms: 200, offset_x: 6, offset_y: 3, scale: 0.85 }, // falling
      { duration_ms: 200, offset_x: 2, offset_y: 0 },        // scramble recovery
      { duration_ms: 150, offset_x: 0, offset_y: 0, scale: 1.05 }, // overcorrect
    ],
    duration_ms: 0,
    particles: [
      { type: 'single_sweat_drop', trigger_at_ms: 450, count: 1 },
    ],
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['slapstick', 'cool_fail'],
    gender_affinity: 'any',
    role_affinity: 'chaser',
  },

  {
    id: 'flex_fail',
    category: 'physical',
    frames: [
      { duration_ms: 300, offset_x: 0, offset_y: -2, scale: 1.1 },  // puff up
      { duration_ms: 200, offset_x: 0, offset_y: -3, scale: 1.15 }, // bigger flex
      { duration_ms: 100, offset_x: 0, offset_y: 0, scale: 0.85 },  // deflate suddenly
      { duration_ms: 200, offset_x: 0, offset_y: 2, scale: 0.9 },   // slump
      { duration_ms: 200, offset_x: 0, offset_y: 0 },               // recover
    ],
    duration_ms: 0,
    particles: [
      { type: 'small_sparkle', trigger_at_ms: 200, count: 3 },
      { type: 'single_sweat_drop', trigger_at_ms: 600, count: 1 },
    ],
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['physical', 'confidence', 'fail'],
    gender_affinity: 'masculine',
    role_affinity: 'chaser',
  },

  {
    id: 'hair_flip_fail',
    category: 'physical',
    frames: [
      { duration_ms: 200, offset_x: 0, offset_y: -1 },       // prep
      { duration_ms: 150, offset_x: 2, offset_y: -2, scale: 1.05 }, // flip motion
      { duration_ms: 100, offset_x: 3, offset_y: 0 },        // over-rotate
      { duration_ms: 200, offset_x: 0, offset_y: 1, scale: 0.95 }, // off balance
      { duration_ms: 200, offset_x: 0, offset_y: 0 },        // recover awkwardly
    ],
    duration_ms: 0,
    particles: [
      { type: 'small_sparkle', trigger_at_ms: 350, count: 2 },
      { type: 'slight_blush', trigger_at_ms: 500, count: 1 },
    ],
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['physical', 'vanity', 'fail'],
    gender_affinity: 'feminine',
    role_affinity: 'any',
  },

  {
    id: 'wink_both_eyes',
    category: 'physical',
    frames: [
      { duration_ms: 200, offset_x: 0, offset_y: 0 },        // setup
      { duration_ms: 150, offset_x: 0, offset_y: -1, scale: 1.02 }, // attempt wink
      { duration_ms: 200, offset_x: 0, offset_y: 0, scale: 0.98 },  // both eyes close
      { duration_ms: 300, offset_x: 0, offset_y: 0 },        // awkward pause
    ],
    duration_ms: 0,
    particles: [
      { type: 'question_mark', trigger_at_ms: 350, count: 1 },
    ],
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['subtle', 'awkward', 'flirting'],
    gender_affinity: 'any',
    role_affinity: 'chaser',
  },

  {
    id: 'finger_guns_misfire',
    category: 'physical',
    frames: [
      { duration_ms: 150, offset_x: 0, offset_y: 0, scale: 1.05 },  // pose
      { duration_ms: 100, offset_x: 2, offset_y: -1 },              // shoot
      { duration_ms: 200, offset_x: 2, offset_y: 0 },               // hold (too long)
      { duration_ms: 300, offset_x: 0, offset_y: 0, scale: 0.95 },  // slowly lower
      { duration_ms: 150, offset_x: 0, offset_y: 0 },               // give up
    ],
    duration_ms: 0,
    particles: [
      { type: 'small_star', trigger_at_ms: 250, count: 2 },
      { type: 'single_sweat_drop', trigger_at_ms: 550, count: 1 },
    ],
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['gesture', 'awkward', 'flirting'],
    gender_affinity: 'any',
    role_affinity: 'chaser',
  },

  // ═══════════════════════════════════════════════
  // REACTION (6)
  // ═══════════════════════════════════════════════

  {
    id: 'jaw_drop',
    category: 'reaction',
    frames: [
      { duration_ms: 100, offset_x: 0, offset_y: 0 },
      { duration_ms: 200, offset_x: 0, offset_y: 2, scale: 1.05 },  // slight stretch down
      { duration_ms: 400, offset_x: 0, offset_y: 2, scale: 1.05 },  // hold (shock)
      { duration_ms: 200, offset_x: 0, offset_y: 0 },               // recover
    ],
    duration_ms: 0,
    camera: { type: 'zoom', zoom_level: 1.3, duration_ms: 300, easing: 'ease_in' },
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['reaction', 'shock', 'impressed'],
    gender_affinity: 'any',
    role_affinity: 'gatekeeper',
  },

  {
    id: 'eye_roll_360',
    category: 'reaction',
    frames: [
      { duration_ms: 150, offset_x: 0, offset_y: -1 },       // look up
      { duration_ms: 150, offset_x: 1, offset_y: 0 },        // look right
      { duration_ms: 150, offset_x: 0, offset_y: 1 },        // look down
      { duration_ms: 150, offset_x: -1, offset_y: 0 },       // look left
      { duration_ms: 100, offset_x: 0, offset_y: 0 },        // back to center
    ],
    duration_ms: 0,
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['reaction', 'dismissive', 'unimpressed'],
    gender_affinity: 'any',
    role_affinity: 'gatekeeper',
  },

  {
    id: 'facepalm',
    category: 'reaction',
    frames: [
      { duration_ms: 200, offset_x: 0, offset_y: 0 },
      { duration_ms: 150, offset_x: 0, offset_y: 2, scale: 0.95 },  // hand comes up
      { duration_ms: 500, offset_x: 0, offset_y: 3, scale: 0.93 },  // face in hand (hold)
      { duration_ms: 200, offset_x: 0, offset_y: 0 },               // recover
    ],
    duration_ms: 0,
    particles: [
      { type: 'single_sweat_drop', trigger_at_ms: 350, count: 1 },
    ],
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['reaction', 'cringe', 'embarrassment'],
    gender_affinity: 'any',
    role_affinity: 'any',
  },

  {
    id: 'slow_clap',
    category: 'reaction',
    frames: [
      { duration_ms: 400, offset_x: 0, offset_y: 0 },               // pause before first clap
      { duration_ms: 200, offset_x: 0, offset_y: -1, scale: 1.02 }, // clap 1
      { duration_ms: 300, offset_x: 0, offset_y: 0 },               // pause
      { duration_ms: 200, offset_x: 0, offset_y: -1, scale: 1.02 }, // clap 2
      { duration_ms: 250, offset_x: 0, offset_y: 0 },               // pause
      { duration_ms: 150, offset_x: 0, offset_y: -1, scale: 1.02 }, // clap 3 (faster)
    ],
    duration_ms: 0,
    particles: [
      { type: 'small_sparkle', trigger_at_ms: 600, count: 1 },
      { type: 'small_sparkle', trigger_at_ms: 1100, count: 1 },
    ],
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['reaction', 'sarcastic', 'impressed'],
    gender_affinity: 'any',
    role_affinity: 'gatekeeper',
  },

  {
    id: 'happy_dance',
    category: 'reaction',
    frames: [
      { duration_ms: 150, offset_x: -2, offset_y: -3, scale: 1.05 }, // bounce left
      { duration_ms: 150, offset_x: 2, offset_y: -3, scale: 1.05 },  // bounce right
      { duration_ms: 150, offset_x: -2, offset_y: -3, scale: 1.05 }, // bounce left
      { duration_ms: 150, offset_x: 2, offset_y: -3, scale: 1.05 },  // bounce right
      { duration_ms: 150, offset_x: 0, offset_y: -4, scale: 1.1 },   // big jump
      { duration_ms: 150, offset_x: 0, offset_y: 0 },                // land
    ],
    duration_ms: 0,
    particles: [
      { type: 'confetti', trigger_at_ms: 0, count: 4 },
      { type: 'heart', trigger_at_ms: 600, count: 2 },
    ],
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['reaction', 'joy', 'celebration'],
    gender_affinity: 'any',
    role_affinity: 'any',
  },

  {
    id: 'spit_take',
    category: 'reaction',
    frames: [
      { duration_ms: 200, offset_x: 0, offset_y: 0 },
      { duration_ms: 100, offset_x: 2, offset_y: -2, scale: 1.1 },  // lurch forward
      { duration_ms: 150, offset_x: 3, offset_y: -1 },              // spray
      { duration_ms: 200, offset_x: 1, offset_y: 0 },               // recovery
      { duration_ms: 200, offset_x: 0, offset_y: 0, scale: 0.95 },  // settle
    ],
    duration_ms: 0,
    particles: [
      { type: 'sweat_fountain', trigger_at_ms: 300, count: 4 },
    ],
    camera: { type: 'shake', duration_ms: 150, easing: 'bounce' },
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['reaction', 'shock', 'comedy'],
    gender_affinity: 'any',
    role_affinity: 'gatekeeper',
  },

  // ═══════════════════════════════════════════════
  // TIMING (3)
  // ═══════════════════════════════════════════════

  {
    id: 'awkward_silence',
    category: 'timing',
    frames: [
      { duration_ms: 300, offset_x: 0, offset_y: 0 },               // nothing
      { duration_ms: 200, offset_x: 0, offset_y: 0, scale: 0.98 },  // slight shrink
      { duration_ms: 400, offset_x: 0, offset_y: 0, scale: 0.96 },  // more shrink
      { duration_ms: 200, offset_x: 1, offset_y: 0 },               // slight fidget
      { duration_ms: 300, offset_x: 0, offset_y: 0 },               // give up
    ],
    duration_ms: 0,
    particles: [
      { type: 'tumbleweed', trigger_at_ms: 500, count: 1 },
    ],
    camera: { type: 'zoom', zoom_level: 0.85, duration_ms: 800, easing: 'linear' },
    can_interrupt: false,
    exit_state: 'idle',
    tags: ['timing', 'awkward', 'deadpan'],
    gender_affinity: 'any',
    role_affinity: 'any',
  },

  {
    id: 'dramatic_zoom',
    category: 'timing',
    frames: [
      { duration_ms: 200, offset_x: 0, offset_y: 0 },
      { duration_ms: 500, offset_x: 0, offset_y: -1, scale: 1.02 }, // slight rise during zoom
      { duration_ms: 300, offset_x: 0, offset_y: 0 },               // hold
    ],
    duration_ms: 0,
    camera: { type: 'zoom', zoom_level: 2.0, duration_ms: 500, easing: 'ease_in' },
    can_interrupt: true,
    exit_state: 'idle',
    tags: ['timing', 'dramatic', 'reveal'],
    gender_affinity: 'any',
    role_affinity: 'any',
  },

  {
    id: 'shake_on_impact',
    category: 'timing',
    frames: [
      { duration_ms: 100, offset_x: 0, offset_y: -2, scale: 1.05 }, // brace
      { duration_ms: 100, offset_x: 0, offset_y: 3, scale: 0.9 },   // impact
      { duration_ms: 200, offset_x: 0, offset_y: 0 },               // settle
    ],
    duration_ms: 0,
    camera: { type: 'shake', duration_ms: 300, easing: 'bounce' },
    can_interrupt: false,
    exit_state: 'idle',
    tags: ['timing', 'impact', 'physical'],
    gender_affinity: 'any',
    role_affinity: 'any',
  },

  // ═══════════════════════════════════════════════
  // ENTRANCE (3)
  // ═══════════════════════════════════════════════

  {
    id: 'entrance_walking',
    category: 'entrance',
    frames: [
      { duration_ms: 200, offset_x: -20, offset_y: 0 },     // start off-screen left
      { duration_ms: 200, offset_x: -12, offset_y: 0 },     // walking in
      { duration_ms: 200, offset_x: -5, offset_y: 0 },      // almost there
      { duration_ms: 200, offset_x: 0, offset_y: 0 },       // arrive
      { duration_ms: 200, offset_x: 0, offset_y: -2, scale: 1.05 }, // look around
      { duration_ms: 200, offset_x: 0, offset_y: 0 },       // settle
    ],
    duration_ms: 0,
    can_interrupt: false,
    exit_state: 'idle',
    tags: ['entrance', 'normal', 'default'],
    gender_affinity: 'any',
    role_affinity: 'any',
  },

  {
    id: 'entrance_skateboard',
    category: 'entrance',
    frames: [
      { duration_ms: 100, offset_x: -25, offset_y: -2 },    // rolling in fast
      { duration_ms: 100, offset_x: -18, offset_y: -3 },    // speed
      { duration_ms: 100, offset_x: -10, offset_y: -2 },    // approaching
      { duration_ms: 150, offset_x: -3, offset_y: -4, scale: 1.1 }, // ollie attempt
      { duration_ms: 150, offset_x: 2, offset_y: 2, scale: 0.85 },  // bail
      { duration_ms: 200, offset_x: 3, offset_y: 4, scale: 0.8 },   // on ground
      { duration_ms: 200, offset_x: 1, offset_y: 1, scale: 0.95 },  // getting up
      { duration_ms: 150, offset_x: 0, offset_y: 0 },               // stand, pretend nothing happened
    ],
    duration_ms: 0,
    particles: [
      { type: 'star', trigger_at_ms: 450, count: 3 },
      { type: 'sweat', trigger_at_ms: 600, count: 2 },
    ],
    camera: { type: 'shake', duration_ms: 200, easing: 'bounce' },
    can_interrupt: false,
    exit_state: 'idle',
    tags: ['entrance', 'extreme', 'fail'],
    gender_affinity: 'any',
    role_affinity: 'chaser',
  },

  {
    id: 'entrance_helicopter',
    category: 'entrance',
    frames: [
      { duration_ms: 200, offset_x: 0, offset_y: -30, scale: 0.5 },  // tiny, high up
      { duration_ms: 200, offset_x: 0, offset_y: -20, scale: 0.7 },  // descending
      { duration_ms: 200, offset_x: 2, offset_y: -12, scale: 0.8 },  // wind drift
      { duration_ms: 200, offset_x: -2, offset_y: -6, scale: 0.9 },  // close to ground
      { duration_ms: 150, offset_x: 0, offset_y: 2, scale: 1.1 },    // impact squash
      { duration_ms: 150, offset_x: 0, offset_y: -1, scale: 1.05 },  // bounce
      { duration_ms: 150, offset_x: 0, offset_y: 0 },                // settle
    ],
    duration_ms: 0,
    particles: [
      { type: 'confetti', trigger_at_ms: 800, count: 6 },
      { type: 'sweat_fountain', trigger_at_ms: 800, count: 3 },
    ],
    camera: { type: 'shake', duration_ms: 300, easing: 'bounce' },
    can_interrupt: false,
    exit_state: 'idle',
    tags: ['entrance', 'dramatic', 'over_the_top'],
    gender_affinity: 'any',
    role_affinity: 'chaser',
  },
]

// Compute duration_ms for all atoms from their frames
for (const atom of atomDefinitions) {
  atom.duration_ms = totalDuration(atom.frames)
}

// ── Atom registry (lookup by ID) ────────────────────────────────

const ATOM_REGISTRY: Map<string, ComedyAtom> = new Map()
for (const atom of atomDefinitions) {
  ATOM_REGISTRY.set(atom.id, atom)
}

/** Get a comedy atom by ID. Returns undefined if not found. */
export function getAtom(id: string): ComedyAtom | undefined {
  return ATOM_REGISTRY.get(id)
}

/** Get all atom IDs */
export function getAllAtomIds(): string[] {
  return Array.from(ATOM_REGISTRY.keys())
}

/** Get atoms by category */
export function getAtomsByCategory(category: ComedyAtom['category']): ComedyAtom[] {
  return atomDefinitions.filter(a => a.category === category)
}

/** Get atoms by tag */
export function getAtomsByTag(tag: string): ComedyAtom[] {
  return atomDefinitions.filter(a => a.tags.includes(tag))
}

/** Max atoms allowed per turn */
export const MAX_ATOMS_PER_TURN = 3

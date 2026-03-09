# Pixemingle v2 — OpenClaw Native Implementation Plan

**Date:** March 9, 2026
**Design doc:** `docs/plans/2026-03-09-openclaw-native-architecture-design.md`
**Estimated effort:** ~8-10 weeks (solo dev) or ~4-5 weeks (with AI assistance)

---

## Overview

Full migration from pre-scripted theater to OpenClaw-native agent architecture. 8 phases, dependency-ordered. Each phase produces a working, testable increment.

```
Phase 0: Cleanup & Foundation          (removes deprecated code, keeps build green)
Phase 1: Database & Types              (schema migration + TypeScript types)
Phase 2: Expression Engine             (SOUL.md parsing, visual mapping, particles)
Phase 3: Comedy Atom System            (atom library, atom player, camera system)
Phase 4: Portrait Dialogue System      (128x128 HTML overlay below canvas)
Phase 5: Theater System                (turn-based API, hooks, entrance, real-time)
Phase 6: OpenClaw Gateway Integration  (Railway server, agent brain, coaching, memory)
Phase 7: Asset Pipeline & Polish       (PixelLab assets, customization UIs, sharing)
```

### Dependency Graph

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3
                │              │           │
                │              └───→ Phase 4
                │                      │
                └──────────────→ Phase 5 ←── Phase 3
                                       │
                                 Phase 6
                                       │
                                 Phase 7
```

---

## Phase 0: Cleanup & Foundation

**Goal:** Remove all deprecated code so no one builds on the wrong thing.
**Duration:** 1-2 days
**Risk:** Low — deleting code, not adding. Build must stay green.

---

### Task 0.1 — Delete deprecated files

**Files to delete:**

| File | What it does now | Why it's wrong |
|------|-----------------|----------------|
| `src/lib/llm.ts` | Direct `@anthropic-ai/sdk` → `anthropic.messages.create()` | Violates CRITICAL RULE #1: no direct SDK |
| `src/app/api/scenarios/[matchId]/route.ts` | GET cached scenario from DB | Scenarios no longer exist as a concept |
| `src/app/api/scenarios/[matchId]/generate/route.ts` | POST generates static JSON FlirtScenario via LLM | Replaced by real-time agent turns |
| `src/app/api/scenarios/[matchId]/result/route.ts` | POST stores scenario outcome | Agent writes to memory instead |
| `src/hooks/useScenario.ts` | Manages scenario state, Supabase broadcasts for scenario_ready/step | Replaced by `useTheater` |
| `src/engine/sequencePlayer.ts` | Linear JSON step playback engine | Replaced by `AtomPlayer` (turn-based, not linear) |
| `src/engine/genderAnimations.ts` | Hardcoded `gender × role → animation` lookup tables | Replaced by SOUL.md expression engine (nothing hardcoded) |

**Runtime impact:** These files are currently imported and called at runtime. Deleting them will break the build until imports are cleaned up (Task 0.3).

---

### Task 0.2 — Clean deprecated exports from kept files

**`src/lib/constants.ts`** — Remove `SOUL_CONFIGS` object (~lines 67-96). This is a hardcoded `Record<SoulType, SoulConfig>` that maps soul types to static behavior configs. SOUL.md replaces this entirely. Keep everything else in the file (personality questions, horoscope data, rate limits, cosmetics catalog).

**`src/types/database.ts`** — Remove these interfaces/types:
- `FlirtScenario` (lines 85-92) — old scenario shape
- `FlirtStep` (lines 94-101) — old step shape
- `AnimationAction` type (lines 103-111) — old action enum
- `SoulConfig` (lines 115-121) — hardcoded soul behavior
- `Emotion` type (line 113) — too limited, replaced by `EmotionState` in Phase 1

Keep: `User`, `Match`, `SoulType`, `VenueName`, `VENUE_INFO`, `PersonalityAnswers`, `AgentAppearance`, `MatchReasons`, `Candidate`, `ChatMessage`, `Notification`.

**`src/engine/index.ts`** — Remove re-exports of `sequencePlayer` and `genderAnimations`.

**Frontend impact:** Any component importing `FlirtScenario`, `FlirtStep`, `AnimationAction`, `Emotion`, or `SoulConfig` will break. Fixed in Task 0.3.

---

### Task 0.3 — Fix all broken imports

After deletion, the following import chains break. Fix each:

**`src/components/PixelWorld/index.tsx`** (the big one):
- Line ~8: Imports `useScenario` → **Remove import + all `useScenario()` usage** (dateStatus, scenario, generate, etc.)
- Lines 137-216: The entire theater entry block calls `startTheater(scenario, ...)` which uses `SequencePlayer` → **Replace with a stub comment: `// Theater entry — rewired in Phase 5 (useTheater)`**
- Lines 157-186: Fallback hardcoded `FlirtScenario` → **Delete entirely**
- The component still renders, but theater is non-functional until Phase 5. All other flows (matching, chat, proposals) work.

**`src/hooks/usePixelWorld.ts`**:
- Line ~12: Imports `SequencePlayer` → **Remove import**
- Lines 104-159: `startTheater()` function creates `SequencePlayer` → **Gut the function body, keep the signature as a no-op stub** (returns immediately). Phase 5 rewires it.
- Lines ~133: Creates `new SequencePlayer(scenario, callbacks)` → **Remove**

**`src/engine/engine/renderer.ts`**:
- May reference `genderAnimations` for animation lookup → **Remove any references, use default animation frames**

**`src/engine/engine/characters.ts`**:
- May reference `AnimationAction` type → **Remove, replace with `string` for now** (proper `ActionType` added in Phase 1)

**`src/app/api/agent-chat/route.ts`**:
- Lines 5-6: `import Anthropic from '@anthropic-ai/sdk'` → **Remove**
- Lines 24-33: `anthropic.messages.create()` → **Remove**
- Lines 37-42: Keyword regex intent detection → **Remove**
- **Replace entire route with stub** that returns `{ text: "Agent brain connecting soon...", action: null }`. Real implementation in Phase 6.

**Any component importing `FlirtScenario`, `FlirtStep`, etc.:**
- Grep codebase for these type names
- Remove all imports and usages
- `Match.scenario_cache` typed as `FlirtScenario | null` → change to `unknown | null` for now (schema column stays, just unused)

**Runtime impact:** After this task, the app loads and works for everything EXCEPT theater playback. Matching, chat, proposals, all UI — functional. Theater shows nothing. This is expected.

---

### Task 0.4 — Remove `@anthropic-ai/sdk` package

```bash
npm uninstall @anthropic-ai/sdk
```

**Integration check:** Grep entire project for `@anthropic-ai/sdk`, `from 'anthropic'`, `Anthropic`. Should return zero results after Tasks 0.1-0.3.

**Build verification:**
```bash
npm run build
npm run lint
```

Both must pass clean. If lint errors on unused variables from removed imports, fix those too.

---

### Task 0.5 — Verify existing flows still work

Manual test checklist (using `/dev-login` bypass):
- [ ] Landing page loads
- [ ] Onboarding wizard completes
- [ ] `/world` loads, canvas renders, character appears
- [ ] Agent chat bar shows stub response
- [ ] Matching: search → browse → approve works
- [ ] Date proposal: venue picker → send proposal works
- [ ] Invitation notification arrives
- [ ] Venue accept/counter/decline works
- [ ] Chat panel sends and receives messages
- [ ] Report/block modal works

Theater is expected to be non-functional. Everything else must work.

---

### Phase 0 Deliverables

| Layer | Status |
|-------|--------|
| **Frontend** | All UI renders. Theater entry is a no-op stub. All other flows work. |
| **Backend** | All API routes work except scenarios (deleted) and agent-chat (stub). |
| **Database** | No schema changes. `scenarios` table still exists but unused. |
| **Runtime** | `@anthropic-ai/sdk` fully removed. Zero direct LLM calls. |
| **Build** | `npm run build` and `npm run lint` pass clean. |

---

## Phase 1: Database & Types

**Goal:** New schema for theater, agent routing, memory. Complete TypeScript types for all v2 systems.
**Duration:** 2-3 days
**Depends on:** Phase 0

---

### Task 1.1 — Create migration `005_openclaw_native.sql`

File: `supabase/migrations/005_openclaw_native.sql`

**New tables (5):**

```sql
-- ============================================================
-- 1. theater_turns — Turn-by-turn log (replaces scenarios table)
-- ============================================================
CREATE TABLE theater_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  agent_role TEXT NOT NULL CHECK (agent_role IN ('chaser', 'gatekeeper')),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Agent brain output
  action TEXT NOT NULL CHECK (action IN (
    'deliver_line', 'react', 'use_prop', 'physical_comedy',
    'environment_interact', 'signature_move', 'entrance', 'exit'
  )),
  comedy_atoms TEXT[] DEFAULT '{}',
  text TEXT,
  emotion TEXT NOT NULL DEFAULT 'neutral',
  confidence REAL DEFAULT 5.0 CHECK (confidence >= 0 AND confidence <= 10),
  comedy_intent TEXT CHECK (comedy_intent IN (
    'self_deprecating', 'witty', 'physical', 'observational',
    'deadpan', 'absurdist', 'romantic_sincere', 'teasing', 'callback'
  )),
  target TEXT,          -- environment object or prop to interact with
  prop TEXT,            -- guitar, flowers, phone, mirror, etc.
  brain_reasoning TEXT, -- agent's internal reasoning (debug/replay only)

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Enforce turn ordering per match
  UNIQUE(match_id, turn_number)
);

-- Indexes
CREATE INDEX idx_theater_turns_match ON theater_turns(match_id, turn_number);
CREATE INDEX idx_theater_turns_user ON theater_turns(user_id);

-- Enable Realtime (both users' canvases subscribe to new turns)
ALTER PUBLICATION supabase_realtime ADD TABLE theater_turns;


-- ============================================================
-- 2. agent_routing — Which gateway hosts each user's agent
-- ============================================================
CREATE TABLE agent_routing (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  gateway_url TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1 CHECK (tier IN (1, 2)),
  webhook_url TEXT,                       -- For cross-gateway or Tier 2 notification
  agent_workspace_path TEXT,              -- Filesystem path on gateway
  heartbeat_interval_minutes INTEGER DEFAULT 30,
  last_heartbeat TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for gateway load balancing queries
CREATE INDEX idx_agent_routing_gateway ON agent_routing(gateway_url, is_active);


-- ============================================================
-- 3. agent_memories — Backup of OpenClaw memory files to Supabase
-- ============================================================
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'soul', 'entrance', 'heartbeat', 'daily', 'longterm'
  )),
  content TEXT NOT NULL,
  memory_date DATE,                       -- For daily logs: which day
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One soul/entrance/heartbeat per user, many daily/longterm
CREATE UNIQUE INDEX idx_agent_memories_singleton
  ON agent_memories(user_id, memory_type)
  WHERE memory_type IN ('soul', 'entrance', 'heartbeat');

CREATE INDEX idx_agent_memories_user ON agent_memories(user_id, memory_type);
CREATE INDEX idx_agent_memories_daily ON agent_memories(user_id, memory_date)
  WHERE memory_type = 'daily';


-- ============================================================
-- 4. entrance_configs — User entrance customization
-- ============================================================
CREATE TABLE entrance_configs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vehicle TEXT NOT NULL DEFAULT 'walking',
  complication TEXT NOT NULL DEFAULT 'trip_on_curb',
  recovery TEXT NOT NULL DEFAULT 'brush_off',
  confidence REAL DEFAULT 5.0 CHECK (confidence >= 0 AND confidence <= 10),
  custom_detail TEXT,
  conditionals JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 5. comedy_atom_unlocks — Premium atoms unlocked per user
-- ============================================================
CREATE TABLE comedy_atom_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  atom_id TEXT NOT NULL,
  source TEXT DEFAULT 'purchase' CHECK (source IN ('purchase', 'achievement', 'gift', 'default')),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, atom_id)
);

CREATE INDEX idx_comedy_atom_unlocks_user ON comedy_atom_unlocks(user_id);
```

**Existing table modifications:**

```sql
-- ============================================================
-- 6. ALTER existing tables for v2
-- ============================================================

-- matches: add theater tracking columns
ALTER TABLE matches ADD COLUMN theater_status TEXT DEFAULT NULL
  CHECK (theater_status IS NULL OR theater_status IN (
    'entrance', 'active', 'deciding', 'completed_accepted', 'completed_rejected'
  ));
ALTER TABLE matches ADD COLUMN theater_turn_count INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN theater_started_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN theater_ended_at TIMESTAMPTZ;

-- notifications: add theater notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'match_request', 'theater_ready', 'chat_message', 'match_expired', 'match_result',
    'date_proposal', 'date_proposal_sent',
    'venue_accepted', 'venue_countered', 'date_declined',
    'theater_turn', 'theater_entrance', 'theater_outcome',
    'agent_coaching_response', 'heartbeat_suggestion'
  ));

-- users: add soul_md reference (soul_type stays for backward compat, SOUL.md is authoritative)
ALTER TABLE users ADD COLUMN has_soul_md BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN agent_tier INTEGER DEFAULT 1 CHECK (agent_tier IN (1, 2));
```

**Integration note:** The `scenarios` table is NOT dropped in this migration. It's left in place so rollback is safe. It can be dropped in a future cleanup migration after v2 is stable.

**The existing `openclaw_agents` table** (from 001_initial_schema.sql) overlaps with `agent_routing`. The difference:
- `openclaw_agents` stores webhook_url + api_key_hash for Tier 2 agents who registered via `/api/connect/register`
- `agent_routing` stores gateway_url + tier + heartbeat for ALL agents (Tier 1 and 2)
- Both tables reference `users(id)`. They coexist — `openclaw_agents` is the Tier 2 registration record, `agent_routing` is the runtime routing table. On Tier 2 registration, rows are created in both.

---

### Task 1.2 — RLS policies for new tables

```sql
-- ============================================================
-- 7. RLS policies for new tables
-- ============================================================

-- theater_turns: read if part of match, insert via service role (agents) or match participant
ALTER TABLE theater_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read theater turns for their matches" ON theater_turns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM matches
    WHERE matches.id = theater_turns.match_id
    AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
  ));

-- Insert: agents post turns via service role key (not user auth)
-- Dev mode: allow insert if user is match participant
CREATE POLICY "Match participants can insert turns" ON theater_turns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- agent_routing: own only
ALTER TABLE agent_routing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own routing" ON agent_routing FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own routing" ON agent_routing FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routing" ON agent_routing FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- agent_memories: own only
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own memories" ON agent_memories FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own memories" ON agent_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memories" ON agent_memories FOR UPDATE
  USING (auth.uid() = user_id);

-- entrance_configs: own only
ALTER TABLE entrance_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own entrance" ON entrance_configs FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own entrance" ON entrance_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entrance" ON entrance_configs FOR UPDATE
  USING (auth.uid() = user_id);

-- comedy_atom_unlocks: own only
ALTER TABLE comedy_atom_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own unlocks" ON comedy_atom_unlocks FOR SELECT
  USING (auth.uid() = user_id);
```

**Security note — service role access:** The OpenClaw Gateway posts theater turns using the `SUPABASE_SERVICE_ROLE_KEY` (server-side only), which bypasses RLS. This is correct — agents are server processes, not browser clients. The RLS policies above protect browser-side reads. The Gateway never exposes the service role key to clients.

**Security note — theater_turns INSERT:** Both user-auth INSERT (for dev/testing) and service-role INSERT (for Gateway) work. In production, only the Gateway should insert turns. Consider adding a server-side validation function that checks `agent_role` matches the user's role in the match.

---

### Task 1.3 — TypeScript types for v2

File: `src/types/database.ts` — Add new types (keep all existing non-deprecated types):

```typescript
// ============================================================
// Theater System Types
// ============================================================

export type EmotionState =
  | 'neutral' | 'nervous' | 'confident' | 'embarrassed'
  | 'excited' | 'dejected' | 'amused' | 'annoyed'
  | 'hopeful' | 'devastated' | 'smug' | 'shy'
  | 'trying_too_hard' | 'genuinely_happy' | 'cringing';

export type ActionType =
  | 'deliver_line' | 'react' | 'use_prop' | 'physical_comedy'
  | 'environment_interact' | 'signature_move' | 'entrance' | 'exit';

export type ComedyIntent =
  | 'self_deprecating' | 'witty' | 'physical'
  | 'observational' | 'deadpan' | 'absurdist'
  | 'romantic_sincere' | 'teasing' | 'callback';

export type TheaterStatus =
  | 'entrance' | 'active' | 'deciding'
  | 'completed_accepted' | 'completed_rejected';

export interface TheaterTurn {
  id: string;
  match_id: string;
  turn_number: number;
  agent_role: 'chaser' | 'gatekeeper';
  user_id: string;
  action: ActionType;
  comedy_atoms: string[];
  text: string | null;
  emotion: EmotionState;
  confidence: number;
  comedy_intent: ComedyIntent | null;
  target: string | null;
  prop: string | null;
  brain_reasoning: string | null;
  created_at: string;
}

// What the agent brain receives as context for each turn decision
export interface TheaterTurnInput {
  match_id: string;
  turn_number: number;
  venue: VenueName;
  other_agent_last_turn: TheaterTurn | null;
  turn_history: TheaterTurn[];
  soul_md: string;
  memory: string;
  user_coaching?: {
    message: string;
    timestamp: string;
    mode: 'suggestion' | 'strategy' | 'trigger';
  };
}

// Theater state returned by GET /api/theater/{matchId}/state
export interface TheaterState {
  match_id: string;
  venue: VenueName;
  status: TheaterStatus;
  turn_count: number;
  current_turn_role: 'chaser' | 'gatekeeper';
  turns: TheaterTurn[];
  outcome: 'accepted' | 'rejected' | null;
  chaser: { user_id: string; name: string; character_id: string };
  gatekeeper: { user_id: string; name: string; character_id: string };
}

// ============================================================
// Agent Routing & Memory Types
// ============================================================

export interface AgentRouting {
  user_id: string;
  gateway_url: string;
  tier: 1 | 2;
  webhook_url: string | null;
  agent_workspace_path: string | null;
  heartbeat_interval_minutes: number;
  last_heartbeat: string | null;
  is_active: boolean;
  created_at: string;
}

export type AgentMemoryType = 'soul' | 'entrance' | 'heartbeat' | 'daily' | 'longterm';

export interface AgentMemory {
  id: string;
  user_id: string;
  memory_type: AgentMemoryType;
  content: string;
  memory_date: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Entrance & Customization Types
// ============================================================

export interface EntranceConfig {
  user_id: string;
  vehicle: string;
  complication: string;
  recovery: string;
  confidence: number;
  custom_detail: string | null;
  conditionals: EntranceConditional[];
  updated_at: string;
}

export interface EntranceConditional {
  condition: 'won_last_date' | 'lost_last_date' | 'first_date';
  override_vehicle?: string;
  override_complication?: string;
}

export interface ComedyAtomUnlock {
  id: string;
  user_id: string;
  atom_id: string;
  source: 'purchase' | 'achievement' | 'gift' | 'default';
  unlocked_at: string;
}
```

**Update `Match` interface:**
```typescript
export interface Match {
  // ... existing fields ...
  scenario_cache: unknown | null;          // deprecated, kept for backward compat
  theater_status: TheaterStatus | null;    // NEW
  theater_turn_count: number;              // NEW
  theater_started_at: string | null;       // NEW
  theater_ended_at: string | null;         // NEW
}
```

---

### Task 1.4 — Engine types update

File: `src/engine/types.ts`

**Add to `Character` interface:**
```typescript
export interface Character {
  // ... existing fields ...
  gender: 'male' | 'female' | 'nonbinary';           // NEW — set from user profile
  theaterRole?: 'chaser' | 'gatekeeper';              // NEW — set during theater
  activeBodyModifier?: BodyModifier;                   // NEW — from expression engine
  activeEmotion?: EmotionState;                        // NEW — from theater turn
}
```

**New types:**
```typescript
export type BodyModifier =
  // Posture
  | 'lean_forward' | 'lean_back' | 'lean_back_arms_crossed' | 'lean_in_slightly'
  | 'casual_lean' | 'stiff_pose' | 'slump' | 'slump_heavy'
  | 'open_posture' | 'puff_chest'
  // Hands/Arms
  | 'arms_crossed' | 'arms_crossed_smirk' | 'hands_in_pockets'
  | 'rub_back_of_neck' | 'cover_face_peek' | 'hand_on_hip'
  | 'chin_touch' | 'over_gesticulate' | 'finger_guns'
  // Head
  | 'slight_nod' | 'head_tilt' | 'look_away' | 'look_away_smile'
  | 'blush_look_away' | 'eyebrow_raise' | 'slow_blink' | 'deadpan_stare'
  // Full Body
  | 'slight_bounce' | 'slight_fidget' | 'slight_shift' | 'slight_wave'
  | 'shrink_slightly' | 'fist_pump' | 'hair_flip' | 'shrug_smile'
  | 'cover_mouth_laugh' | 'tap_foot' | 'determined_face' | 'relaxed_smile'
  // Special
  | 'none';

export type PortraitExpression =
  | 'neutral' | 'genuine_smile' | 'shy_smile' | 'smug_grin'
  | 'heart_eyes' | 'starry_eyed' | 'laughing'
  | 'cringe' | 'shock' | 'deadpan' | 'crying'
  | 'angry' | 'disgusted'
  | 'thinking' | 'nervous' | 'determined';
```

**Expand `ParticleType` (in `particles.ts` or `types.ts`):**
```typescript
export type ParticleType =
  // Existing
  | 'heart' | 'confetti' | 'rain' | 'sweat' | 'lightbulb' | 'star' | 'music_note'
  // New for expression engine
  | 'blush_tint' | 'blush_gradient' | 'slight_blush'
  | 'single_sweat_drop' | 'sweat_fountain'
  | 'small_sparkle' | 'small_star'
  | 'question_mark' | 'anger'
  | 'rain_cloud_personal' | 'tumbleweed' | 'tears';
```

---

### Task 1.5 — Run migration on dev Supabase

```bash
# Apply migration to dev instance
npx supabase db push
# OR if using Supabase CLI migrations:
npx supabase migration up
```

**Verification checklist:**
- [ ] All 5 new tables created
- [ ] RLS enabled on all new tables
- [ ] RLS policies created (test with anon key — should be blocked)
- [ ] Indexes created (check `pg_indexes`)
- [ ] Realtime enabled on `theater_turns` (test subscription)
- [ ] `matches` table has new columns (`theater_status`, `theater_turn_count`, etc.)
- [ ] `notifications` type constraint updated (accepts new types)
- [ ] `users` table has `has_soul_md` and `agent_tier` columns
- [ ] Unique constraint on `theater_turns(match_id, turn_number)` works (try duplicate insert)
- [ ] Singleton index on `agent_memories` works (can't insert two 'soul' records for same user)

**Rollback plan:** If migration fails partway:
```sql
-- Drop new tables (safe — no existing data)
DROP TABLE IF EXISTS comedy_atom_unlocks;
DROP TABLE IF EXISTS entrance_configs;
DROP TABLE IF EXISTS agent_memories;
DROP TABLE IF EXISTS agent_routing;
DROP TABLE IF EXISTS theater_turns;

-- Revert match columns
ALTER TABLE matches DROP COLUMN IF EXISTS theater_status;
ALTER TABLE matches DROP COLUMN IF EXISTS theater_turn_count;
ALTER TABLE matches DROP COLUMN IF EXISTS theater_started_at;
ALTER TABLE matches DROP COLUMN IF EXISTS theater_ended_at;

-- Revert user columns
ALTER TABLE users DROP COLUMN IF EXISTS has_soul_md;
ALTER TABLE users DROP COLUMN IF EXISTS agent_tier;

-- Revert notification constraint (back to 004 version)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'match_request', 'theater_ready', 'chat_message', 'match_expired', 'match_result',
    'date_proposal', 'date_proposal_sent'
  ));
```

**Data migration for existing users:** None needed. All new columns have defaults. Existing matches have `theater_status = NULL` (no theater yet). Existing users have `has_soul_md = FALSE`, `agent_tier = 1`.

---

### Task 1.6 — Verify TypeScript types match schema

Manually check that every column in the migration has a corresponding TypeScript field and vice versa. Common bugs:
- SQL `REAL` → TypeScript `number` (correct)
- SQL `TEXT[]` → TypeScript `string[]` (correct)
- SQL `JSONB` → TypeScript specific interface or `Record<string, unknown>` (check each)
- SQL `CHECK` constraints → TypeScript union types (must match exactly)
- SQL `DEFAULT` values → TypeScript optional fields or `| null`

---

### Phase 1 Deliverables

| Layer | Status |
|-------|--------|
| **Database** | 5 new tables, 4 existing tables altered, RLS + indexes + Realtime configured. Rollback script ready. |
| **TypeScript** | Complete types for TheaterTurn, EmotionState, ActionType, ComedyIntent, BodyModifier, PortraitExpression, AgentRouting, EntranceConfig. Match type updated. |
| **Frontend** | No changes. Types are available for Phase 2+. |
| **Backend** | No new routes. Schema is ready for Phase 5 API routes. |
| **Runtime** | Supabase Realtime subscription on `theater_turns` verified working. |
| **Integration** | `openclaw_agents` and `agent_routing` coexist. Tier 2 registration creates rows in both. |

---

## Phase 2: Expression Engine

**Goal:** SOUL.md-driven expression mapping system. Replaces all hardcoded gender×role logic.
**Duration:** 3-4 days
**Depends on:** Phase 1 (EmotionState, BodyModifier, ParticleType types)

---

### Task 2.1 — SOUL.md parser

File: `src/engine/soulMdParser.ts` (NEW)

**What it does:** Parses the Expression Preferences block from a SOUL.md markdown string into a structured `ExpressionPreferences` object.

```typescript
export interface ExpressionPreferences {
  body_language: Partial<Record<EmotionState, BodyModifier>>;
  particle_style: Partial<Record<EmotionState, ParticleType[]>>;
  portrait_variant: 'soft' | 'sharp' | 'neutral';
  animation_speed: number;
  atom_preferences: { preferred: string[]; avoid: string[] };
  on_rejection: { body: BodyModifier; particles: ParticleType[]; preferred_atoms: string[] };
  on_acceptance: { body: BodyModifier; particles: ParticleType[]; preferred_atoms: string[] };
}

export function parseExpressionPreferences(soulMd: string): ExpressionPreferences;
```

**Parsing strategy:** Regex-based section extraction from markdown:
1. Find `## Expression Preferences` header
2. Extract `### Body Language` block → parse `- emotion: modifier` lines
3. Extract `### Particle Style` block → parse `- emotion: [type1, type2]` lines
4. Extract `### Portrait Variant:` → single value after colon
5. Extract `### Animation Speed:` → parse float
6. Extract `### Comedy Atom Preferences` → parse `- preferred: [...]` and `- avoid: [...]`
7. Extract `### On Rejection` / `### On Acceptance` → parse body/particles/preferred_atoms

**Edge cases to handle:**
- Missing sections → return defaults (empty partial records, variant 'neutral', speed 1.0)
- Malformed YAML-ish lists → skip unparseable lines, log warning
- Custom free-text lines (e.g., "I do dramatic hair flips") → ignored by parser, agent brain reads them
- Tier 2 users may hand-write SOUL.md with typos → parser must be lenient

**Runtime location:** Runs on the client (browser). SOUL.md content fetched from `agent_memories` table (type: 'soul') at theater start. Parsed once, cached in `useTheater` hook for the session.

**Testing:** Unit tests with sample SOUL.md strings (male_chaser, female_gatekeeper, nonbinary_chaser, edge cases, empty, malformed).

---

### Task 2.2 — Expression engine

File: `src/engine/expressionEngine.ts` (NEW)

**Core function:**

```typescript
export interface ExpressionConfig {
  portrait: PortraitExpression;
  portrait_variant: 'soft' | 'sharp' | 'neutral';
  particles: ParticleType[];
  body_modifier: BodyModifier;
  animation_speed: number;
  followup_atom?: string;
}

export function resolveExpression(
  emotion: EmotionState,
  soulPrefs: ExpressionPreferences
): ExpressionConfig;
```

**Contains:**
- `BASE_EXPRESSION_MAP: Record<EmotionState, ExpressionConfig>` — gender-neutral fallback for all 15 emotions (from design doc section 9)
- `resolveExpression()` — overlays SOUL.md prefs on base. Logic:
  ```
  1. Get base config from BASE_EXPRESSION_MAP[emotion]
  2. Override body_modifier with soulPrefs.body_language[emotion] if present
  3. Override particles with soulPrefs.particle_style[emotion] if present
  4. Set portrait_variant from soulPrefs.portrait_variant
  5. Multiply animation_speed by soulPrefs.animation_speed
  6. Return merged config
  ```
- `resolveReaction(comedyIntent, otherAgentEmotion)` → returns reaction branching (if_positive, if_negative, if_neutral)
- `resolveOutcome(outcome: 'accepted' | 'rejected', soulPrefs)` → returns on_acceptance or on_rejection config

**Critical design rule:** No `gender` parameter. No `role` parameter. No hardcoded lookup. All flavor comes from `soulPrefs` (parsed from SOUL.md). If SOUL.md field is missing, `BASE_EXPRESSION_MAP` fills the gap.

**Frontend integration:** Called by `useTheater` hook each time a new turn arrives. Output drives:
- Portrait panel emotion → `ExpressionConfig.portrait` + `portrait_variant`
- Character body modifier → `ExpressionConfig.body_modifier`
- Particle spawning → `ExpressionConfig.particles`
- Animation speed → `ExpressionConfig.animation_speed`

---

### Task 2.3 — New particle types

File: `src/engine/particles.ts` (MODIFY existing)

**Add 12 new particle types** to the existing particle system. Each needs:

| Particle | Visual | Physics | Lifetime |
|----------|--------|---------|----------|
| `blush_tint` | Pink overlay on face area | Static, no velocity | 1.5s fade in/out |
| `blush_gradient` | Wave of red across face | Horizontal sweep | 2.0s |
| `slight_blush` | Single pink dot on cheek | Static | 1.0s fade |
| `single_sweat_drop` | One blue drop | Falls with gravity | 0.8s |
| `sweat_fountain` | 5-8 drops spraying up then falling | Fountain arc | 1.5s |
| `small_sparkle` | Tiny 2px twinkle | Float up slowly | 0.6s |
| `small_star` | 3px star burst | Expand then fade | 0.5s |
| `question_mark` | ? symbol above head | Float up slightly | 1.5s |
| `anger` | Red vein marks near head | Pulse in/out | 1.0s |
| `rain_cloud_personal` | Small cloud above one character | Follows character | 3.0s (persists) |
| `tumbleweed` | Brown ball rolling across | Horizontal roll | 2.5s |
| `tears` | Streams from eye area | Fall with gravity | 2.0s continuous |

**Implementation approach:**
- Add to existing `PARTICLE_CONFIGS` or equivalent
- Each particle type gets: color palette, spawn offset (relative to character head), velocity, gravity, frame count, render function
- `rain_cloud_personal` and `tumbleweed` need special handling — they track a character or cross the screen, not just spawn at a point

**Backend impact:** None — particles are purely client-side canvas rendering.

**Runtime concern:** Don't spawn too many at once. Max 20 active particles per character. `sweat_fountain` counts as 5-8 particles.

---

### Task 2.4 — Body modifier system in character FSM

File: `src/engine/engine/characters.ts` (MODIFY existing)

**What changes:**
- Add `activeBodyModifier` field to Character (from Task 1.4)
- When modifier is set, adjust rendering in the next frame:
  - **Posture modifiers** (lean_forward, slump, etc.) → Y offset adjustment (±2-4px)
  - **Scale modifiers** (shrink_slightly, puff_chest) → scale factor (0.9-1.1)
  - **Frame overrides** (arms_crossed, hands_in_pockets) → force specific idle frame
  - **Animation speed** (from ExpressionConfig) → multiply `WALK_FRAME_DURATION_SEC`

**How it connects to renderer:**
- `renderer.ts` currently reads `ch.state`, `ch.dir`, and frame counter to determine which sprite frame to draw
- With body modifier: renderer checks `ch.activeBodyModifier` and applies offset/scale AFTER frame selection
- This is a visual-only adjustment — it doesn't change pathfinding, collision, or FSM state

**Minimal approach (MVP):** Start with just Y offset and scale. No new sprite frames needed. A "slump" is just `ch.renderOffsetY = 3`. A "slight_bounce" is a `sin(time) * 2` oscillation on Y. This gets 80% of the visual impact with zero art dependency.

**Full approach (Phase 7):** Add idle frame variants per modifier (specific arm/hand positions). Requires new sprite frames from PixelLab.

---

### Task 2.5 — SOUL.md generator (server-side)

File: `src/lib/soulMdGenerator.ts` (NEW — server-side only)

**What it does:** Takes onboarding quiz answers + gender×role → generates complete SOUL.md markdown string.

**Contains:**
- 6 generator templates (from design doc section 10):
  - `MALE_CHASER_TEMPLATE` — "Confident → Clumsy"
  - `FEMALE_CHASER_TEMPLATE` — "Dramatic → Composed"
  - `NONBINARY_CHASER_TEMPLATE` — "Adaptive → Authentic"
  - `MALE_GATEKEEPER_TEMPLATE` — "Reserved → Amused"
  - `FEMALE_GATEKEEPER_TEMPLATE` — "Evaluating → Expressive"
  - `NONBINARY_GATEKEEPER_TEMPLATE` — "Observant → Genuine"

- `generateSoulMd(input: SoulMdGeneratorInput): string`
  ```typescript
  interface SoulMdGeneratorInput {
    name: string;
    age: number;
    gender: 'male' | 'female' | 'nonbinary';
    role: 'chaser' | 'gatekeeper';
    personality: PersonalityAnswers;
    // Quiz overrides (sliders from onboarding)
    humor_physical: number;     // 0-10
    humor_wordplay: number;     // 0-10
    humor_deadpan: number;      // 0-10
    humor_self_deprecating: number; // 0-10
    confidence: number;         // 0-10
    signature_move?: string;    // free text
    rejection_style?: string;   // free text
  }
  ```

**Generation logic:**
1. Select template by `${gender}_${role}`
2. Start with template's body_modifier_bias, particle_bias, etc.
3. **Override with quiz answers:**
   - If `humor_physical < 3`, remove physical comedy atom tags from preferred
   - If `humor_deadpan > 7`, add deadpan body modifiers (deadpan_stare, slow_blink)
   - If `confidence > 8`, swap nervous modifiers for confident ones
   - etc. (each slider shifts multiple template fields)
4. Generate markdown string with all sections:
   - `# Soul` → Core Identity, Personality, Behavioral Rules, Comedy Preferences, Signature Moves, Boundaries
   - `## Expression Preferences` → Body Language, Particle Style, Portrait Variant, Animation Speed, Comedy Atom Preferences, On Rejection, On Acceptance
5. Return complete SOUL.md as string

**Important:** Templates are the starting seed, NOT the output. A male chaser who maxes deadpan and zeroes physical looks nothing like the default male chaser template.

**Where it runs:** Server-side only. Called from the onboarding API route. Never imported by client code or engine code.

**Integration with onboarding:** The current `OnboardingWizard.tsx` collects `PersonalityAnswers` (friday_night, humor_style, etc.) but doesn't have the v2 slider format. The wizard steps need updating to collect `humor_physical`, `humor_wordplay`, etc. as separate sliders. This UI change can happen in Phase 7 — for now, the generator can derive slider values from existing `PersonalityAnswers` fields.

---

### Task 2.6 — SOUL.md generation API route

File: `src/app/api/onboarding/generate-soul/route.ts` (NEW)

**POST handler:**
```
Input:  { gender, role, personality, name, age, humor sliders, signature_move, rejection_style }
Auth:   Requires user session (or dev cookie)

1. Call generateSoulMd(input) → markdown string
2. Upsert into agent_memories (user_id, memory_type='soul', content=markdown)
3. Update users table: has_soul_md = TRUE
4. Return { soul_md: markdown, preview: { portrait_variant, humor_summary } }
```

**Backend concerns:**
- This is a pure data generation route — no LLM call, no external API. Fast (~10ms).
- Idempotent: calling twice overwrites the previous SOUL.md.
- The `UNIQUE INDEX idx_agent_memories_singleton` ensures only one 'soul' record per user.

**Integration with Gateway (Phase 6):** When the Gateway provisions an agent workspace, it reads SOUL.md from `agent_memories` table and writes it to the filesystem. This route doesn't touch the Gateway directly.

---

### Phase 2 Deliverables

| Layer | Status |
|-------|--------|
| **Frontend** | Expression engine callable from hooks. New particles render on canvas. Body modifiers apply to characters. |
| **Backend** | `/api/onboarding/generate-soul` route generates SOUL.md from quiz answers. Stored in `agent_memories`. |
| **Database** | SOUL.md content stored in `agent_memories` (type: 'soul'). `users.has_soul_md` flag set. |
| **Runtime** | SOUL.md parsed once per theater session on client. 12 new particle types render at 60fps. Body modifiers are Y offset + scale (no new sprite frames needed yet). |
| **Engine** | `resolveExpression()` maps any EmotionState → ExpressionConfig using SOUL.md prefs with BASE_EXPRESSION_MAP fallback. Zero hardcoded gender logic. |
| **Integration** | Expression engine is standalone — no Gateway dependency. Can test with manually written SOUL.md strings. |

---

## Phase 3: Comedy Atom System

**Goal:** Atom library + player + camera system. Characters can play pre-built animation sequences.
**Duration:** 4-5 days
**Depends on:** Phase 2 (ExpressionConfig, particles, body modifiers)

---

### Task 3.1 — Comedy atom library

File: `src/engine/comedyAtoms.ts` (NEW)

**Data structures:**

```typescript
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

export interface AtomFrame {
  duration_ms: number;
  offset_x?: number;       // pixel offset for movement
  offset_y?: number;       // pixel offset for movement
  scale?: number;           // squash/stretch (1.0 = normal)
  rotation?: number;        // degrees
  sprite_override?: {       // force specific spritesheet frame
    row: number;
    col: number;
  };
}
```

**MVP: 20 essential atoms** (enough for a full theater session):

| Category | Atoms | Count |
|----------|-------|-------|
| Physical | `trip_and_recover`, `slip_on_floor`, `flower_too_big`, `lean_on_nothing`, `flex_fail`, `hair_flip_fail`, `wink_both_eyes`, `finger_guns_misfire` | 8 |
| Reaction | `jaw_drop`, `eye_roll_360`, `facepalm`, `slow_clap`, `happy_dance`, `spit_take` | 6 |
| Timing | `awkward_silence`, `dramatic_zoom`, `shake_on_impact` | 3 |
| Entrance | `entrance_walking`, `entrance_skateboard`, `entrance_helicopter` | 3 |

**How atoms work WITHOUT new sprite frames (MVP):**
- Use existing idle/walk/sit frames from spritesheets
- Comedy comes from: position offsets (trip = sudden X shift), scale changes (shrink = embarrassment), rotation (tumble), timing (pause = dramatic effect), and particles
- Example: `trip_and_recover` = [lean forward 3px, sudden -5px X, -2px Y (dip), pause 200ms, stand up +2px Y, dust particles]
- This approach works with ANY character spritesheet — atoms are visual math, not custom art

**Remaining 60 atoms:** Added incrementally in Phase 7 or post-launch. More atoms = more comedy variety, but 20 is enough for MVP.

**Runtime concern:** Atom data is pure JSON — loaded once at app init, ~5KB total for 20 atoms.

---

### Task 3.2 — Atom player

File: `src/engine/atomPlayer.ts` (NEW)

```typescript
export class AtomPlayer {
  private currentAtom: ComedyAtom | null = null;
  private currentFrame: number = 0;
  private frameTimer: number = 0;
  private queue: ComedyAtom[] = [];
  private onComplete?: () => void;

  // Queue up to 3 atoms for a turn
  playSequence(character: Character, atomIds: string[], onComplete?: () => void): void;

  // Play single atom immediately
  playAtom(character: Character, atomId: string): Promise<void>;

  // Called every frame from gameLoop
  update(dt: number, character: Character): void;

  // Interrupt current playback (if can_interrupt flag allows)
  cancel(): void;

  isPlaying(): boolean;

  // Returns current frame's render adjustments
  getCurrentAdjustments(): { offsetX: number; offsetY: number; scale: number; rotation: number } | null;
}
```

**Integration with game loop:**
- `gameLoop.ts` calls `atomPlayer.update(dt, character)` each frame for characters with active atoms
- `renderer.ts` checks `atomPlayer.getCurrentAdjustments()` and applies to character draw position/scale
- Particle triggers: when atom frame has particle config, spawn particles via existing particle system
- Camera triggers: when atom has camera config, send to camera system (Task 3.3)

**State machine per atom:**
```
IDLE → PLAYING_FRAME[0] → PLAYING_FRAME[1] → ... → PLAYING_FRAME[n] → COMPLETE → IDLE
                                                                            ↓
                                                                     next atom in queue
```

**Composition rules:**
- Max 3 atoms per turn (enforced by `playSequence`)
- Reaction atoms follow action atoms (caller responsibility — validated in theater hook)
- Timing atoms wrap other atoms (e.g., `slow_motion` halves playback speed for next atom)
- Entrance atoms play once at theater start, cannot repeat (tracked by set)

---

### Task 3.3 — Camera system

File: `src/engine/cameraSystem.ts` (NEW)

```typescript
export interface CameraAction {
  type: 'zoom' | 'pan' | 'shake' | 'split_screen';
  target?: { x: number; y: number };
  zoom_level?: number;
  duration_ms: number;
  easing: 'linear' | 'ease_in' | 'ease_out' | 'bounce';
}

export class CameraSystem {
  private baseZoom: number = 1;
  private currentZoom: number = 1;
  private targetZoom: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private shakeIntensity: number = 0;
  private shakeTimer: number = 0;
  private animations: CameraAnimation[] = [];  // queue

  // Trigger camera actions
  zoom(level: number, duration: number, easing: Easing, focusPoint?: { x: number; y: number }): void;
  pan(target: { x: number; y: number }, duration: number, easing: Easing): void;
  shake(intensity: number, duration: number): void;
  reset(duration: number): void;

  // Called every frame
  update(dt: number): void;

  // Applied by renderer before drawing
  getTransform(): { zoom: number; offsetX: number; offsetY: number };
}
```

**Integration with renderer:**
- `renderer.ts` currently computes `offsetX/offsetY` for map centering + user pan
- Camera system adds its own offset on top: `finalOffsetX = mapOffset + panOffset + camera.offsetX + shakeJitter`
- Zoom: renderer multiplies all positions by `camera.zoom` instead of discrete zoom levels
- The existing discrete zoom (1x, 2x, 3x) becomes the `baseZoom`. Camera zoom is relative to that.

**Existing code change in `renderer.ts`:**
- Lines ~614-618: Current offset calculation → wrap with camera transform
- Current zoom is `zoom` state from `usePixelWorld` → keep as `baseZoom`, multiply by `cameraSystem.getTransform().zoom`

**Camera presets** (from design doc):
```typescript
export const CAMERA_PRESETS = {
  dramatic_zoom_to_face: { type: 'zoom', zoom_level: 2.5, duration_ms: 500, easing: 'ease_in' },
  reaction_pan: { type: 'pan', duration_ms: 800, easing: 'ease_out' },
  impact_shake: { type: 'shake', duration_ms: 300, easing: 'bounce' },
  awkward_zoom_out: { type: 'zoom', zoom_level: 0.8, duration_ms: 1200, easing: 'linear' },
} as const;
```

**Runtime concern:** Camera animations interpolate via easing functions each frame. Keep math simple — no matrix transforms, just offset + scale. Shake = random jitter within intensity bounds, decaying over duration.

---

### Task 3.4 — Integrate atom player + camera into game loop and renderer

**`src/engine/engine/gameLoop.ts`** (MODIFY):
- Add `AtomPlayer` instance per character (or shared pool)
- Each frame: `atomPlayer.update(dt, character)` for characters with active atoms
- Each frame: `cameraSystem.update(dt)`
- When atom triggers particles: `particleSystem.spawn(type, position)`
- When atom triggers camera: `cameraSystem.zoom/pan/shake(...)`

**`src/engine/engine/renderer.ts`** (MODIFY):
- Before drawing scene: apply `cameraSystem.getTransform()` to canvas context
- For each character with active atom: apply `atomPlayer.getCurrentAdjustments()` to draw position
- After drawing scene: reset canvas transform

**`src/engine/engine/officeState.ts`** (MODIFY):
- Add `atomPlayer: AtomPlayer` and `cameraSystem: CameraSystem` to WorldState
- Initialize in constructor
- Expose `playAtoms(characterId, atomIds)` method

**Runtime concern:** AtomPlayer adjustments are additive to character position. Character FSM state doesn't change during atom playback — the character is still in whatever state it was, but rendered with offsets. After atom completes, character returns to `exit_state`.

---

### Phase 3 Deliverables

| Layer | Status |
|-------|--------|
| **Frontend** | No UI changes. Atoms and camera are engine-level. |
| **Backend** | No changes. |
| **Database** | No changes. |
| **Engine** | 20 comedy atoms defined. AtomPlayer queues and plays sequences. CameraSystem handles zoom/pan/shake. Both integrated with game loop and renderer. |
| **Runtime** | Atom playback at 60fps with smooth easing. Max 3 atoms per turn. Camera effects enhance comedy timing. All atoms work with any character spritesheet (no custom art dependency). |
| **Integration** | AtomPlayer and CameraSystem are standalone engine components. They receive commands from the theater hook (Phase 5) but can be tested independently via dev tools. |

---

## Phase 4: Portrait Dialogue System

**Goal:** 128x128 expression portraits in HTML overlay below canvas. Speech text displayed crisply.
**Duration:** 3-4 days
**Depends on:** Phase 2 (ExpressionConfig, portrait_variant)

---

### Task 4.1 — PortraitPanel component

File: `src/components/PortraitPanel/index.tsx` (NEW)

**Layout (HTML DOM, NOT canvas):**
```
┌─────────────────────────────────────────────┐
│              PORTRAIT PANEL                  │
│  ┌─────────┐                  ┌─────────┐  │
│  │ 128x128 │  "Speech text    │ 128x128 │  │
│  │ PORTRAIT│   appears here"  │ PORTRAIT│  │
│  │ emotion │                  │ emotion │  │
│  └─────────┘                  └─────────┘  │
│   Name (role)              Name (role)      │
└─────────────────────────────────────────────┘
```

**Props:**
```typescript
interface PortraitPanelProps {
  chaserCharacterId: string;
  gatekeeperCharacterId: string;
  chaserEmotion: PortraitExpression;
  gatekeeperEmotion: PortraitExpression;
  chaserVariant: 'soft' | 'sharp' | 'neutral';
  gatekeeperVariant: 'soft' | 'sharp' | 'neutral';
  activeSpeaker: 'chaser' | 'gatekeeper' | null;
  speechText: string | null;
  chaserName: string;
  gatekeeperName: string;
  visible: boolean;
}
```

**Visual features:**
- Active speaker portrait: `transform: scale(1.05)` + subtle glow border
- Expression transitions: CSS `transition: opacity 200ms` crossfade between portrait PNGs
- Idle breathing: `@keyframes breathe { 0% { transform: scale(1) } 50% { transform: scale(1.01) } }` — subtle, 3s loop
- Impact animations: `.shake { animation: shake 300ms }`, `.bounce { animation: bounce 400ms }`, `.shrink { animation: shrink 500ms }`
- Speech text: Tailwind typography, typewriter effect (optional), max 2 lines

**Responsive:** Portrait panel width matches canvas width. On narrow screens (<640px), portraits shrink to 96x96 and text goes below.

**Why HTML not canvas:** Crisp text rendering, CSS transitions, responsive layout, no canvas scaling artifacts on portraits. Same pattern as existing `PhotoOverlay.tsx`.

---

### Task 4.2 — Portrait asset loader

File: `src/engine/portraitLoader.ts` (NEW)

```typescript
export function getPortraitUrl(
  characterId: string,
  expression: PortraitExpression,
  variant: 'soft' | 'sharp' | 'neutral'
): string;

export function preloadPortraits(
  characterId: string,
  variant: 'soft' | 'sharp' | 'neutral'
): Promise<void>;
```

**Path convention:** `public/sprites/characters/portraits/premade/{charId}/{expression}_{variant}.png`

Example: `public/sprites/characters/portraits/premade/char_01/nervous_soft.png`

**For MVP (before PixelLab assets in Phase 7):** Generate placeholder portraits programmatically:
- 128x128 canvas with character's palette color as background
- Emotion text label in center
- Different border color per variant (pink=soft, blue=sharp, gray=neutral)
- This lets us test the full portrait pipeline without art assets

**Preloading:** At theater start, preload all 15 expressions × 1 variant per character (30 images total). Use `Image()` constructor + `onload` promise. Cache in memory. Images are ~5-15KB each = ~300KB total per theater.

**Runtime concern:** Image preloading must complete before theater starts. Show loading indicator if preload takes >2s.

---

### Task 4.3 — Integrate PortraitPanel into PixelWorld

**`src/components/PixelWorld/index.tsx`** (MODIFY):

1. Import `PortraitPanel`
2. Add below `<Canvas />` component in JSX tree
3. Wire props from theater state:
   ```typescript
   <PortraitPanel
     chaserCharacterId={theaterState.chaser.character_id}
     gatekeeperCharacterId={theaterState.gatekeeper.character_id}
     chaserEmotion={chaserExpression.portrait}
     gatekeeperEmotion={gatekeeperExpression.portrait}
     chaserVariant={chaserSoulPrefs.portrait_variant}
     gatekeeperVariant={gatekeeperSoulPrefs.portrait_variant}
     activeSpeaker={currentTurn?.agent_role ?? null}
     speechText={currentTurn?.text ?? null}
     chaserName={theaterState.chaser.name}
     gatekeeperName={theaterState.gatekeeper.name}
     visible={journey.state === 'THEATER'}
   />
   ```
4. PortraitPanel only renders when `visible={true}` (during THEATER journey state)
5. Hide during other states (HOME_IDLE, BROWSING, etc.)

**Layout concern:** PortraitPanel sits between Canvas and AgentChatBar in the vertical stack:
```
Canvas (flex-grow, aspect ratio maintained)
PortraitPanel (fixed height ~160px, hidden when not in theater)
AgentChatBar (fixed height ~80px, always visible)
```

This means the canvas shrinks slightly when PortraitPanel appears during theater. Use CSS `transition: height 300ms` for smooth resize.

---

### Task 4.4 — Connect expression engine to portraits

**Data flow per theater turn:**
```
1. New TheaterTurn arrives (Supabase Realtime)
2. useTheater hook extracts: emotion, text, agent_role
3. Call resolveExpression(emotion, soulPrefs) → ExpressionConfig
4. ExpressionConfig.portrait → PortraitPanel.chaserEmotion or gatekeeperEmotion
5. ExpressionConfig.portrait_variant → already set per character at theater start
6. Turn.text → PortraitPanel.speechText
7. Turn.agent_role → PortraitPanel.activeSpeaker
```

**Timing:** Portrait update should happen BEFORE atom playback starts, so the viewer sees the expression change as the character begins acting. Then atoms play on canvas while portrait holds the expression.

---

### Phase 4 Deliverables

| Layer | Status |
|-------|--------|
| **Frontend** | PortraitPanel component renders below canvas. Expression changes animate via CSS. Speech text displays crisply. Responsive layout. |
| **Backend** | No changes. |
| **Database** | No changes. |
| **Engine** | Portrait loader preloads 128x128 PNGs. Expression engine output drives portrait selection. |
| **Runtime** | Placeholder portraits (colored rectangles) work until real art arrives in Phase 7. ~300KB image preload per theater session. CSS transitions at 60fps. |
| **Integration** | PortraitPanel receives data from useTheater hook (Phase 5). For testing, can be driven by mock data or dev toolbar controls. |

---

## Phase 5: Theater System

**Goal:** Full turn-based theater — API routes, hooks, entrance, real-time playback. This is the core feature.
**Duration:** 5-7 days
**Depends on:** Phase 1 (DB + types), Phase 3 (atoms + camera), Phase 4 (portraits)

---

### Task 5.1 — Theater API: POST turn

File: `src/app/api/theater/[matchId]/turn/route.ts` (NEW)

**POST handler — accepts an agent's theater decision:**

```
Auth:    Service role key (Gateway) OR user session (dev mode)
Input:   TheaterTurn fields (action, comedy_atoms, text, emotion, etc.)
```

**Server-side validation:**
1. Match exists and `theater_status` is 'entrance' or 'active'
2. `user_id` is participant in match (user_a_id or user_b_id)
3. `agent_role` matches user's role in the match
4. `turn_number` is sequential (= previous max + 1)
5. `comedy_atoms` length ≤ 3
6. `action` and `comedy_intent` are valid enum values (CHECK constraint handles this, but validate before INSERT for better error messages)
7. If `turn_number > 0`: previous turn was by the OTHER role (alternating turns)

**On success:**
1. INSERT into `theater_turns`
2. UPDATE `matches` SET `theater_turn_count = turn_number`
3. If turn is the gatekeeper's final decision (exit action): UPDATE `matches.theater_status` to `completed_accepted` or `completed_rejected`
4. Supabase Realtime automatically broadcasts the INSERT to subscribed clients
5. If other agent is on a different gateway or Tier 2: POST webhook to their `agent_routing.webhook_url`

**Webhook payload for cross-gateway notification:**
```json
{
  "event": "theater_turn",
  "match_id": "...",
  "turn": { /* full TheaterTurn object */ }
}
```

**Error responses:**
- 400: Invalid turn data, out-of-order turn number
- 403: User not participant in match
- 404: Match not found
- 409: Turn number already exists (duplicate submission)
- 422: Theater not active (completed or not started)

**Dev mode:** Accept turn submission from browser session (dev cookie) in addition to service role key. This lets us test theater without a real Gateway.

---

### Task 5.2 — Theater API: GET state

File: `src/app/api/theater/[matchId]/state/route.ts` (NEW)

**GET handler — returns current theater state for client rendering:**

```
Auth:   User session (must be participant in match) OR dev cookie
```

**Response: `TheaterState` object:**
```typescript
{
  match_id: string;
  venue: VenueName;
  status: TheaterStatus;  // 'entrance' | 'active' | 'deciding' | 'completed_accepted' | 'completed_rejected'
  turn_count: number;
  current_turn_role: 'chaser' | 'gatekeeper';  // whose turn is next
  turns: TheaterTurn[];   // all turns so far, ordered by turn_number
  outcome: 'accepted' | 'rejected' | null;
  chaser: {
    user_id: string;
    name: string;
    character_id: string;   // for portrait/sprite loading
    soul_md_preview: {      // just the expression prefs, not full SOUL.md
      portrait_variant: 'soft' | 'sharp' | 'neutral';
    };
  };
  gatekeeper: { /* same shape */ };
}
```

**Server-side logic:**
1. Fetch match + both users' profiles
2. Determine chaser/gatekeeper from match.user_a_id (chaser) / user_b_id (gatekeeper) + roles
3. Fetch all theater_turns for match, ordered by turn_number
4. Fetch both users' SOUL.md from agent_memories (just portrait_variant for client)
5. Compute status from turn data + match.theater_status
6. Return TheaterState

**This endpoint is called:**
- When `useTheater` hook mounts (initial state load)
- On page refresh during theater (recovery)
- By the public theater replay page (Phase 7)

---

### Task 5.3 — Theater API: POST entrance

File: `src/app/api/theater/[matchId]/entrance/route.ts` (NEW)

**POST handler — submits chaser's entrance sequence:**

```
Auth:   Service role key (Gateway) OR user session (dev mode)
Input:  { vehicle, complication, recovery, confidence, custom_detail }
```

**Server-side logic:**
1. Validate match exists and theater_status is NULL (hasn't started)
2. Validate user is the chaser
3. Read entrance_configs for user (or use defaults)
4. Check conditionals (won_last_date → override vehicle, etc.)
5. INSERT into theater_turns as `turn_number: 0`, `action: 'entrance'`
6. UPDATE matches SET `theater_status = 'entrance'`, `theater_started_at = NOW()`
7. Realtime broadcast triggers entrance playback on both clients

**After entrance completes (client-side):**
- Client detects entrance turn rendered
- Client transitions to venue interior (scene fade)
- Match status updated to 'active' (next turn submission triggers this)

---

### Task 5.4 — useTheater hook

File: `src/hooks/useTheater.ts` (NEW)

**The central client hook for real-time theater state:**

```typescript
export function useTheater(matchId: string | null) {
  // State
  const [state, setState] = useState<TheaterState | null>(null);
  const [status, setStatus] = useState<'loading' | 'entrance' | 'active' | 'complete'>('loading');
  const [pendingTurn, setPendingTurn] = useState<TheaterTurn | null>(null);

  // Derived
  const currentTurn = state?.turns[state.turns.length - 1] ?? null;
  const chaserEmotion = /* latest chaser turn emotion, or 'neutral' */;
  const gatekeeperEmotion = /* latest gatekeeper turn emotion, or 'neutral' */;
  const activeSpeaker = currentTurn?.agent_role ?? null;
  const speechText = currentTurn?.text ?? null;

  // Expression engine integration
  const chaserExpression = useMemo(
    () => resolveExpression(chaserEmotion, chaserSoulPrefs),
    [chaserEmotion, chaserSoulPrefs]
  );
  const gatekeeperExpression = useMemo(
    () => resolveExpression(gatekeeperEmotion, gatekeeperSoulPrefs),
    [gatekeeperEmotion, gatekeeperSoulPrefs]
  );

  // Effects
  useEffect(/* fetch initial state from GET /api/theater/{matchId}/state */)
  useEffect(/* subscribe to Supabase Realtime on theater_turns table */)
  useEffect(/* preload portraits for both characters */)

  return {
    state, status, currentTurn,
    chaserEmotion, gatekeeperEmotion, chaserExpression, gatekeeperExpression,
    activeSpeaker, speechText,
    // For Phase 6 coaching:
    isMyTurn: boolean,
  };
}
```

**Supabase Realtime subscription:**
```typescript
const channel = supabase
  .channel(`theater:${matchId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'theater_turns',
    filter: `match_id=eq.${matchId}`,
  }, (payload) => {
    const newTurn = payload.new as TheaterTurn;
    // Add to turns array
    // Trigger rendering pipeline
  })
  .subscribe();
```

**Turn rendering pipeline (when new turn arrives):**
```
1. New TheaterTurn from Realtime subscription
2. Resolve expression: emotion + soulPrefs → ExpressionConfig
3. Update portrait panel: portrait expression + speech text
4. Update canvas: body modifier on character
5. Queue atoms: atomPlayer.playSequence(character, turn.comedy_atoms)
6. Spawn particles: from ExpressionConfig.particles
7. Camera action: from atom's camera config
8. Wait for atom sequence to complete
9. Brief pause (0.5-1s dramatic effect)
10. Ready for next turn
```

**Recovery on page refresh:**
- useTheater mounts → fetches GET `/api/theater/{matchId}/state`
- If theater is in progress: replays all turns rapidly (skip animations) to catch up to current state
- Then subscribes to Realtime for future turns
- THEATER journey sub-state determined from `state.status`

---

### Task 5.5 — Entrance playback

**Sequence when entrance turn arrives:**

1. **Scene setup:** Renderer shows venue exterior background
2. **Gatekeeper walks to door:** Simple pathfinding walk to door position (2-3 seconds)
3. **Gatekeeper enters:** Character fades/walks off-screen
4. **Chaser entrance atoms play:**
   - Vehicle atom (e.g., `entrance_skateboard`) — character appears from edge of screen
   - Complication atom (e.g., `slip_on_floor`) — something goes wrong
   - Recovery atom (e.g., `brush_off`) — character recovers
5. **Camera follows chaser** to venue entrance
6. **Scene transition:** `SceneManager.fadeToScene(venueInterior)` — existing fade system
7. **Interior setup:** Both characters positioned at venue spots (table, bar, etc.)
8. **Theater begins:** Status transitions to 'active', first real turn expected

**Integration with existing scene system:**
- `sceneManager.ts` already handles fade transitions between scenes
- Venue exterior backgrounds need to exist (Phase 7 art, or placeholder for now)
- Character positions in venue interior defined by seat assignments in `officeState.ts`

**Dev shortcut:** For testing, entrance can be skipped entirely (jump straight to interior with both characters positioned). Add `skipEntrance` flag to useTheater.

---

### Task 5.6 — Theater turn rendering pipeline

**This is the core integration — connecting all Phase 2-4 systems:**

```
TheaterTurn received
    │
    ├── 1. Expression Engine
    │   resolveExpression(turn.emotion, soulPrefs)
    │   → ExpressionConfig { portrait, body_modifier, particles, animation_speed }
    │
    ├── 2. Portrait Panel Update (Phase 4)
    │   PortraitPanel receives: emotion, speechText, activeSpeaker
    │   CSS transition to new portrait image (200ms crossfade)
    │
    ├── 3. Body Modifier (Phase 2)
    │   character.activeBodyModifier = ExpressionConfig.body_modifier
    │   Renderer applies offset/scale on next frame
    │
    ├── 4. Atom Playback (Phase 3)
    │   atomPlayer.playSequence(character, turn.comedy_atoms)
    │   Atoms play frame-by-frame with offsets, particles, camera actions
    │   Duration: 3-8 seconds per sequence
    │
    ├── 5. Particles (Phase 2)
    │   Spawn ExpressionConfig.particles at character position
    │   Also: atom-triggered particles during playback
    │
    ├── 6. Camera (Phase 3)
    │   If atom has camera action → cameraSystem.zoom/pan/shake
    │   If no atom camera → default: subtle zoom toward active speaker
    │
    └── 7. Completion
        atomPlayer completes → brief pause (500ms)
        → Ready for next turn
        → If this was final turn: trigger outcome sequence (Task 5.7)
```

**Timing per exchange (two turns):**
```
Agent brain decision:     1-3s   (LLM call, shows "thinking" animation)
Portrait + expression:    instant (CSS transition)
Atom sequence:            3-8s   (depends on atoms selected)
Speech text display:      2-4s   (visible in portrait panel)
Dramatic pause:           0.5-1s
Other agent responds:     same pipeline
─────────────────────────────────
Total per exchange:       ~8-15s
Full theater (8-10 turns): ~2-3 minutes
```

**"Thinking" animation:** While waiting for agent brain (1-3s LLM response), show the character tapping chin, pacing, or looking thoughtful. Use a simple idle animation variant or a dedicated `thinking` atom.

---

### Task 5.7 — Outcome sequence

**After the gatekeeper's final turn (action: 'exit' or final decision turn):**

**Accept path:**
1. Gatekeeper's expression resolves to acceptance expression (from on_acceptance in SOUL.md)
2. Celebration atoms play on BOTH characters (e.g., happy_dance, victory_fist_pump)
3. Celebration particles (confetti, hearts, sparkle)
4. Camera: slight zoom in on both
5. Portrait panel: both show genuine_smile / heart_eyes
6. Speech text: final acceptance line
7. UPDATE match: `theater_status = 'completed_accepted'`, `status = 'active'` (match is now active for chat)
8. Notification: 'theater_outcome' to both users
9. Journey state: transition to POST_MATCH

**Reject path:**
1. Gatekeeper's expression resolves to rejection (from on_rejection in SOUL.md)
2. Rejection atoms play on chaser (from SOUL.md preferred_atoms, e.g., sad_slump, walk_away)
3. Gatekeeper: arms_crossed_tap, slow_blink, or walk away
4. Rejection particles (rain_cloud_personal on chaser)
5. Camera: slow zoom out (awkward_zoom_out preset)
6. Portrait panel: chaser crying/dejected, gatekeeper deadpan/annoyed
7. UPDATE match: `theater_status = 'completed_rejected'`, increment `attempt_count`
8. Both agents write to memory (what worked, what didn't)
9. Journey state: back to HOME_IDLE

---

### Task 5.8 — Update journey state machine

**`src/hooks/useJourneyState.ts`** (MODIFY):

**Add theater sub-states:**
```
THEATER_LOADING      → fetching theater state, preloading portraits
THEATER_ENTRANCE     → entrance sequence playing
THEATER_ACTIVE       → turn-by-turn dating scene
THEATER_DECIDING     → gatekeeper making final decision
THEATER_OUTCOME      → accept/reject sequence playing
```

**The main THEATER state now delegates to sub-states.** Top-level journey FSM stays the same (HOME_IDLE → ... → THEATER → POST_MATCH), but THEATER internally manages sub-state transitions.

**Recovery on page reload:**
- If journey state is THEATER:
  - Fetch GET `/api/theater/{matchId}/state`
  - If `status === 'entrance'`: resume entrance (or skip to interior if entrance already played)
  - If `status === 'active'`: catch up turns, subscribe for new ones
  - If `status === 'completed_*'`: show outcome, transition to POST_MATCH or HOME_IDLE

**Integration with useTheater:** Journey state hook provides `matchId` and `role`. useTheater hook manages all theater-specific state. PixelWorld component wires them together.

---

### Task 5.9 — Wire theater into PixelWorld

**`src/components/PixelWorld/index.tsx`** (MODIFY — the big rewrite from Phase 0 stubs):

Replace the gutted theater entry block (from Task 0.3) with:

```typescript
// When venue is accepted and both users ready:
const theater = useTheater(
  journey.state === 'THEATER' ? journey.matchId : null
);

// Theater drives everything when active:
// - Portrait panel receives theater.chaserExpression, theater.gatekeeperExpression
// - Canvas receives body modifiers, atom commands
// - Camera system receives camera actions
// - Agent chat bar shows coaching interface (Phase 6)

// Entering theater:
useEffect(() => {
  if (journey.state === 'WAITING' && dateAccepted) {
    // Venue accepted → start theater
    journey.transition('THEATER');
    // useTheater hook activates, loads state, subscribes to Realtime
  }
}, [dateAccepted]);

// Theater completion:
useEffect(() => {
  if (theater.status === 'complete') {
    if (theater.state?.outcome === 'accepted') {
      journey.transition('POST_MATCH');
    } else {
      journey.transition('HOME_IDLE');
    }
  }
}, [theater.status]);
```

**Dev mode theater:** For testing without a Gateway, add a dev toolbar button: "Simulate Turn" that POSTs a random turn to `/api/theater/{matchId}/turn` with dev auth. This lets us test the full rendering pipeline.

---

### Task 5.10 — Dev demo mode for theater

**`src/app/dev/theater/page.tsx`** (NEW) or add to existing dev tools:

Dev page that:
1. Creates a demo match between two dev users
2. Skips venue proposal flow
3. Starts theater immediately
4. Has buttons to submit mock turns (with selectable emotion, atoms, text)
5. Shows the full theater rendering pipeline

This is critical for testing Phases 2-5 without the Gateway (Phase 6).

---

### Phase 5 Deliverables

| Layer | Status |
|-------|--------|
| **Frontend** | PixelWorld wires useTheater hook. Portrait panel, atoms, camera, particles all coordinated per turn. Theater sub-states in journey FSM. Dev theater page for testing. |
| **Backend** | 3 new API routes: POST turn, GET state, POST entrance. Validation, Realtime broadcast, webhook notification. |
| **Database** | theater_turns populated by turn submissions. matches.theater_status tracks progress. Realtime subscription delivers turns to clients. |
| **VPS/Infra** | All runs on Vercel (API routes) and Supabase (DB + Realtime). No Railway needed yet. |
| **Runtime** | Full turn rendering pipeline: Realtime → expression engine → portrait + body + particles + atoms + camera. ~8-15s per exchange, 2-3 min total theater. Recovery on page refresh. |
| **Integration** | Theater works with mock/dev turns (no real agent brain). Gateway integration in Phase 6 submits real agent decisions to same API. The API contract is the boundary. |

---

## Phase 6: OpenClaw Gateway Integration

**Goal:** Real agent brains making theater decisions. Coaching. Memory. Heartbeat.
**Duration:** 5-7 days
**Depends on:** Phase 5 (theater API is the contract the Gateway posts to)

---

### Task 6.1 — Gateway server (Railway)

**New project or monorepo subdirectory: `gateway/`**

This is a Node 22 long-running process deployed on Railway ($12/mo starting). It is NOT a Next.js app — it's a plain Node server.

```
gateway/
├── src/
│   ├── index.ts              # HTTP server (Express or Fastify)
│   ├── config.ts             # Env vars: ANTHROPIC_API_KEY, SUPABASE_URL, etc.
│   ├── agentManager.ts       # Create/manage agent workspaces
│   ├── heartbeat.ts          # Heartbeat scheduler (setInterval per agent)
│   ├── theaterBrain.ts       # ReAct loop for theater decisions
│   ├── webhookHandler.ts     # Receive turn notifications from Pixemingle API
│   ├── soulMdReader.ts       # Read SOUL.md from filesystem
│   ├── memoryManager.ts      # Read/write agent memory files
│   └── routes/
│       ├── agentProvision.ts # POST /agents — provision new agent workspace
│       ├── theaterTurn.ts    # POST /theater/decide — Gateway decides agent's turn
│       ├── coaching.ts       # POST /coaching — user coaching message
│       └── health.ts         # GET /health — liveness check
├── templates/
│   ├── SKILL.md              # Pixemingle skill (API instructions for agent)
│   ├── HEARTBEAT.md          # Default heartbeat instructions
│   └── ENTRANCE.md           # Default entrance template
├── package.json              # Dependencies: @anthropic-ai/sdk (HERE, not in Vercel), express, supabase-js
├── Dockerfile                # For Railway deployment
└── .env.example              # ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GATEWAY_SECRET
```

**Environment variables (Railway):**
```
ANTHROPIC_API_KEY=sk-ant-...       # Claude Haiku API key (LLM calls happen HERE)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # For reading/writing DB directly
GATEWAY_SECRET=shared-secret-...    # Vercel ↔ Gateway auth
PORT=3001
```

**Key point:** `@anthropic-ai/sdk` is a dependency of the Gateway project, NOT the Pixemingle Next.js project. The Next.js project has zero LLM dependencies. All LLM calls flow through the Gateway.

**Deployment:**
- Railway auto-deploys from Git push
- Health check: `GET /health` returns 200
- Persistent filesystem for agent workspaces (Railway volumes)
- Auto-restart on crash

**Security:**
- Gateway ↔ Vercel API: shared `GATEWAY_SECRET` in `Authorization: Bearer` header
- Gateway → Supabase: uses `SUPABASE_SERVICE_ROLE_KEY` (server-side only, bypasses RLS)
- Gateway → Anthropic: uses `ANTHROPIC_API_KEY`
- No secrets exposed to browser clients

---

### Task 6.2 — Agent brain: ReAct theater loop

File: `gateway/src/theaterBrain.ts`

**The core of the agent. Each turn runs a single LLM call:**

```typescript
async function decideTheaterTurn(input: TheaterTurnInput): Promise<TheaterTurn> {
  const systemPrompt = buildSystemPrompt(input.soul_md);
  const userPrompt = buildTurnPrompt(input);

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  return parseTurnResponse(response);
}
```

**System prompt includes:**
- Full SOUL.md content (personality + expression preferences + behavioral rules)
- Comedy atom catalog (available atoms for this turn)
- Available props for this venue

**User prompt includes:**
- Current theater state (venue, turn history)
- Other agent's last turn (what they said/did)
- Agent's memory of past interactions with this person
- User coaching message (if any)
- Turn number and time pressure

**Structured output format:** The LLM returns JSON matching `TheaterTurn` schema. Use Anthropic's tool_use or JSON mode to enforce structure.

**After decision:**
1. POST turn to `https://pixemingle.com/api/theater/{matchId}/turn` with `Authorization: Bearer {GATEWAY_SECRET}`
2. Write turn reasoning to agent's session log
3. If coaching was provided, respond to user via coaching channel

**Error handling:**
- LLM timeout (>10s) → use fallback "nervous_idle" turn with generic text
- LLM parse error → retry once with simplified prompt
- API error posting turn → retry with exponential backoff (max 3 retries)

---

### Task 6.3 — Agent workspace provisioning

**Flow when user completes onboarding:**

```
Vercel: POST /api/onboarding/complete
  │
  ├── 1. Call generateSoulMd() → SOUL.md content (Phase 2)
  ├── 2. Store SOUL.md in agent_memories table
  ├── 3. Create entrance_configs row with defaults
  ├── 4. POST to Gateway: /agents/provision
  │       { user_id, soul_md, entrance_md }
  │
  Gateway: POST /agents/provision
  ├── 5. Create workspace directory: /data/agents/{user_id}/
  ├── 6. Write SOUL.md, ENTRANCE.md, HEARTBEAT.md, MEMORY.md
  ├── 7. Install SKILL.md (copy from templates/)
  ├── 8. Start heartbeat for this agent
  │
  Vercel (continued):
  ├── 9. Insert into agent_routing:
  │       (user_id, gateway_url, tier=1, workspace_path)
  ├── 10. Update users: has_soul_md=TRUE
  └── 11. Return success → redirect to /world
```

**Tier 2 flow:**
1. Same onboarding on pixemingle.com
2. SOUL.md generated and stored in agent_memories
3. Instead of provisioning on Gateway, user downloads bundle (Task 6.8)
4. User registers via POST /api/connect/register with their webhook_url
5. Insert into agent_routing (tier=2, webhook_url=user's URL)
6. Insert into openclaw_agents (api_key_hash, webhook_url) — existing table

---

### Task 6.4 — Rewrite agent-chat route

File: `src/app/api/agent-chat/route.ts` (REWRITE — replace Phase 0 stub)

**New implementation:**

```typescript
export async function POST(request: Request) {
  const { message, context } = await request.json();
  const userId = await getAuthUserId(request);

  // 1. Look up agent routing
  const routing = await supabase.from('agent_routing').select().eq('user_id', userId).single();

  // 2. Forward to Gateway (Tier 1) or user's webhook (Tier 2)
  const targetUrl = routing.tier === 1
    ? `${routing.gateway_url}/coaching`
    : routing.webhook_url;

  // 3. POST coaching message to agent
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId, message, context }),
  });

  // 4. Return agent's response
  const agentResponse = await response.json();
  return NextResponse.json(agentResponse);
}
```

**No keyword regex. No direct SDK. Agent brain on Gateway handles all intent detection.**

**Gateway-side coaching handler** (`gateway/src/routes/coaching.ts`):
1. Receives user message + context
2. Reads agent's SOUL.md for personality
3. If in theater: adds coaching to next turn's input
4. If not in theater: runs general conversation via ReAct (search for matches, check memory, idle chat)
5. Returns response text + optional action

---

### Task 6.5 — useCoaching hook

File: `src/hooks/useCoaching.ts` (NEW)

```typescript
export function useCoaching(matchId: string | null) {
  const [messages, setMessages] = useState<CoachingMessage[]>([]);
  const [isAgentThinking, setIsAgentThinking] = useState(false);

  async function sendCoaching(text: string): Promise<void> {
    setIsAgentThinking(true);
    setMessages(prev => [...prev, { role: 'user', text, timestamp: new Date() }]);

    const response = await fetch('/api/agent-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: text,
        context: { match_id: matchId, mode: 'theater_coaching' },
      }),
    });

    const data = await response.json();
    setMessages(prev => [...prev, { role: 'agent', text: data.text, timestamp: new Date() }]);
    setIsAgentThinking(false);
  }

  return { messages, sendCoaching, isAgentThinking };
}
```

**Wire into `AgentChatBar.tsx`** (existing component):
- During theater: shows coaching UI with message history
- User types suggestion → sendCoaching → agent responds in private channel
- Agent's response appears in chat bar, NOT in theater (private channel)
- Agent weighs coaching in next ReAct cycle (may or may not follow suggestion)

---

### Task 6.6 — Heartbeat system

File: `gateway/src/heartbeat.ts`

**Per-agent heartbeat scheduler:**
```typescript
class HeartbeatScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  start(userId: string, intervalMinutes: number): void;
  stop(userId: string): void;
  adjustInterval(userId: string, newInterval: number): void;
}
```

**Each heartbeat tick:**
1. Read SOUL.md + HEARTBEAT.md + MEMORY.md
2. Call LLM: "Review your current state. Any pending actions?"
3. Agent may:
   - Check for new match candidates → POST `/api/matching/search`
   - Prepare for upcoming theater → read opponent's profile
   - Update memory with learnings
   - Notify user of interesting candidates → POST notification

**Frequency tuning (from agent_routing.heartbeat_interval_minutes):**

| User Activity | Interval | Haiku calls/month |
|--------------|----------|-------------------|
| Browsing app now | 5 min | ~8,640 |
| Daily active | 30 min | ~1,440 |
| Weekly active | 2 hours | ~360 |
| Inactive 7+ days | Paused | 0 |

Adjust interval based on last user activity (check `users.updated_at` or last API call timestamp).

**Railway concern:** Heartbeat intervals use `setInterval`. If Railway restarts the process, all intervals restart. On startup, the Gateway should read all active agents from `agent_routing` and restart their heartbeats.

---

### Task 6.7 — Memory system

File: `gateway/src/memoryManager.ts`

**After each theater (win or loss):**
1. Agent brain generates date summary via LLM call
2. Summary written to `MEMORY.md` in agent workspace (append)
3. Summary backed up to `agent_memories` table (type: 'daily', memory_date: today)
4. Long-term patterns extracted and written to `longterm` memory

**Before each theater:**
1. Read MEMORY.md for past interactions with opponent
2. Include relevant memory in ReAct prompt
3. Agent uses memory to adjust strategy

**Memory format (markdown in MEMORY.md):**
```markdown
## Date with Alex's agent — March 9, 2026
**Venue:** Gallery | **Outcome:** Rejected after 8 turns
**What worked:** Space pun got an eye roll but a smile. Observing painting broke the ice.
**What didn't:** Opening with "do you come here often" was too generic.
**Their style:** Intellectual, values wordplay, doesn't like over-confidence.
**For next time:** Lead with observational humor, be authentic from the start.
```

**Supabase backup:** `agent_memories` table stores content as TEXT. Queryable by user_id + memory_type + memory_date. This is a backup — primary storage is the filesystem on Gateway.

---

### Task 6.8 — Tier 2: agent bundle endpoint

File: `src/app/api/connect/agent-bundle/route.ts` (NEW)

**GET handler — returns downloadable SOUL.md + ENTRANCE.md + SKILL.md:**

```
Auth:   User session (must have completed onboarding)
Query:  ?format=zip (default) or ?format=json
```

**Response (JSON format):**
```json
{
  "soul_md": "# Soul\n\n## Core Identity\n...",
  "entrance_md": "# My Entrance\n\n## Vehicle: walking\n...",
  "skill_md": "---\nname: pixemingle\n...",
  "setup_instructions": "1. Copy files to ~/.openclaw/agents/pixemingle/\n..."
}
```

**Response (ZIP format):** ZIP file containing SOUL.md, ENTRANCE.md, SKILL.md, README.md with setup instructions.

---

### Phase 6 Deliverables

| Layer | Status |
|-------|--------|
| **Frontend** | AgentChatBar wired to useCoaching hook. Coaching messages shown during theater. No direct SDK anywhere. |
| **Backend** | agent-chat route delegates to Gateway. agent-bundle endpoint serves Tier 2 downloads. Onboarding provisions agent on Gateway. |
| **Database** | agent_routing populated on provisioning. agent_memories stores SOUL.md + daily logs. theater_turns written by Gateway. |
| **VPS/Infra** | Gateway deployed on Railway ($12/mo). Persistent volumes for agent workspaces. Auto-restart on crash. Health check endpoint. |
| **Runtime** | Agent brain makes 1-3s LLM decisions per theater turn. Heartbeat runs per-agent with tunable intervals. Memory persists across sessions. Fallback turn if LLM times out. |
| **Integration** | Gateway ↔ Vercel: shared GATEWAY_SECRET, webhook notifications. Gateway ↔ Supabase: service role key for DB access. Gateway ↔ Anthropic: API key for LLM calls. Tier 2 agents use same API contract via their own webhook_url. |
| **Security** | ANTHROPIC_API_KEY only on Railway (not Vercel, not client). SUPABASE_SERVICE_ROLE_KEY on both Vercel and Railway (server-side only). GATEWAY_SECRET shared between Vercel and Railway. No secrets in client bundle. |

---

## Phase 7: Asset Pipeline & Polish

**Goal:** Replace placeholder art, build customization UIs, sharing system, premium monetization.
**Duration:** 5-7 days (code) + 12-15 days (asset generation/polishing)
**Depends on:** Phase 6 (everything functional with placeholder art)

---

### Task 7.1 — Generate PixelLab assets (~$20, 12-15 days)

| Asset | Count | API Cost | Hand-Edit Time |
|-------|-------|----------|---------------|
| Character layers (48x48) | 10 bodies, 6 skins, 8 eyes, 30 hairstyles, 40 outfits, 10 shoes, 15 accessories | ~$4.10 | 2 days |
| 128x128 portraits | 20 chars × 15 expressions × 3 variants = 900 PNGs | ~$7.20 | 4-5 days |
| Comedy atom frames | 80 atoms × ~5 frames = ~400 frames | ~$3.20 | 3-4 days |
| Venue backgrounds | 7 venues × 2 (interior + exterior) = 14 PNGs | ~$0.17 | 1 day |
| Props | 15 items | ~$0.12 | 0.5 day |
| Style iteration | Getting consistent look across all assets | ~$5.00 | 1 day |

**Style guide for PixelLab prompts:**
```
"48x48 pixel art, top-down RPG perspective, bold saturated colors,
large expressive face (minimum 8x6 pixels for face), thick outlines,
dating sim comedy aesthetic, warm palette, clear silhouettes"
```

**Portrait generation strategy:**
1. Generate 1 neutral base portrait per character at 128x128
2. Use PixelLab inpaint to modify face area for each expression variant
3. For each expression: generate 3 style variants (soft/sharp/neutral) by adjusting face features

**This is the longest phase by calendar time** but most of it is art work, not code.

---

### Task 7.2 — Replace LimeZu assets

**Swap all sprite PNGs in `public/sprites/`:**
- Replace character spritesheets in `premade/`
- Replace character layers in `layers/` (bodies, eyes, outfits, etc.)
- Replace venue backgrounds in `venues/`
- Add portrait PNGs to `portraits/premade/{charId}/`
- Add atom frame PNGs to `atoms/{category}/{atomId}/`

**Update references:**
- `src/lib/characterAssets.ts` — update file paths and character IDs
- `src/engine/sprites/spriteData.ts` — update palette references
- `src/engine/scenes/venueAssets.ts` — update venue PNG paths

**Runtime concern:** Total asset size increases significantly with 900 portrait PNGs. Lazy-load portraits (only preload for current theater participants). Character layers loaded on demand via existing `ensureCharacterSheet()`.

---

### Task 7.3 — Entrance customization UI

File: `src/components/EntranceCustomizer/index.tsx` (NEW)

Dropdown-based UI (see design doc section 13):
- Vehicle selection: walking, skateboard, helicopter, bicycle, etc.
- Complication style: trip, crash, tangle, smooth
- Recovery move: brush off, finger guns, bow
- Confidence slider: 0-10
- Custom detail: free text field
- Conditional overrides: "If rejected last time → humble entrance"

**Writes to:**
- `entrance_configs` table via PUT `/api/profile/entrance` (new route)
- If Tier 1: also writes ENTRANCE.md to Gateway workspace

**Integration:** Accessible from PixelWorld settings panel or profile page.

---

### Task 7.4 — Personality customization UI

File: `src/components/PersonalityCustomizer/index.tsx` (NEW)

Slider + text UI (see design doc section 13):
- Humor style sliders (physical/wordplay/deadpan/self-deprecating)
- Confidence slider
- Signature move description (free text)
- Rejection style (free text)
- Body language overrides per emotion
- Particle style overrides per emotion

**Writes to:**
- Regenerates SOUL.md via `generateSoulMd()` with updated values
- Stores in `agent_memories` (type: 'soul')
- If Tier 1: writes to Gateway workspace
- Expression engine re-parses on next theater session

---

### Task 7.5 — Onboarding wizard update

**`src/components/Onboarding/steps/`** (MODIFY existing steps):

Update PersonalityStep to collect v2 slider data:
- Replace existing `PersonalityAnswers` format with humor sliders
- Add confidence slider
- Add signature move and rejection style fields
- Keep existing steps (BasicInfo, Character, Auth) unchanged

Add new step: **SoulPreviewStep** — shows generated SOUL.md preview and lets user tweak before finalizing.

**Backend:** On wizard completion, call POST `/api/onboarding/generate-soul` → provision agent (Phase 6 flow).

---

### Task 7.6 — Viral sharing system

File: `src/components/ShareMoment/index.tsx` (NEW)

**After theater ends:**
1. Engine tracks comedy moments during playback (which atoms triggered strong reactions)
2. Tag top 2-3 moments by "comedy score" (reaction intensity from gatekeeper)
3. Show share UI with highlighted moments
4. "Share" → export canvas recording as GIF/MP4

**Canvas recording approach:**
- Use `canvas.captureStream()` + `MediaRecorder` API
- Record during atom playback (5-10 second clips)
- Add watermark: "pixemingle.com" in corner
- Platform-optimized export:
  - 1:1 (Instagram)
  - 16:9 (Twitter/X)
  - 9:16 (TikTok)

**Runtime concern:** Canvas recording requires browser support for `captureStream`. Falls back to "Copy replay link" if not supported.

---

### Task 7.7 — Theater replay page

**`src/app/theater/[matchId]/page.tsx`** (MODIFY existing):

Public page that replays a completed theater:
1. Fetch all turns from DB
2. Render venue + characters
3. Play each turn's atoms + portraits in sequence
4. Shareable URL: `pixemingle.com/theater/{matchId}`
5. No auth required (public replay)

**Privacy:** Only replay completed theaters. No coaching messages visible. brain_reasoning hidden from public view.

---

### Task 7.8 — Premium atom unlocks + Stripe integration

Wire `comedy_atom_unlocks` table to atom player:
- AtomPlayer checks unlocked atoms before playing
- Premium atoms locked behind `comedy_atom_unlocks` table
- Purchase flow: Stripe checkout → webhook → INSERT into comedy_atom_unlocks
- Use existing Stripe integration (src/lib/stripe.ts, /api/payments/)

**Cosmetics catalog update:** Add atom packs and entrance upgrades to existing cosmetics system.

---

### Phase 7 Deliverables

| Layer | Status |
|-------|--------|
| **Frontend** | Entrance + personality customization UIs. Updated onboarding wizard. Share/export system. Theater replay page. |
| **Backend** | Profile entrance route. Onboarding generates SOUL.md. Atom unlock purchase flow. |
| **Database** | entrance_configs populated via UI. comedy_atom_unlocks populated via purchases. |
| **VPS/Infra** | No infra changes. Asset files served from Vercel static. |
| **Runtime** | 900 portrait PNGs lazy-loaded. Canvas recording for GIF export. Premium atom gating. |
| **Integration** | Personality changes write to Gateway SOUL.md. Entrance changes write to Gateway ENTRANCE.md. Stripe webhooks unlock atoms. |
| **Art** | All LimeZu assets replaced with branded PixelLab art. 20 characters × 15 expressions × 3 variants. 80 atom frame sequences. 7 venue interiors + exteriors. |

---

## Cross-Phase Concerns

### Environment Variables

| Variable | Where | Phase Added |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Existing |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Existing |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + Railway | Existing (add to Railway in Phase 6) |
| `OPENCLAW_GATEWAY_URL` | Vercel | Phase 6 |
| `OPENCLAW_GATEWAY_SECRET` | Vercel + Railway | Phase 6 |
| `ANTHROPIC_API_KEY` | Railway ONLY | Phase 6 (NOT on Vercel) |
| `STRIPE_SECRET_KEY` | Vercel | Existing |
| `STRIPE_WEBHOOK_SECRET` | Vercel | Existing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vercel | Existing |
| `NEXT_PUBLIC_APP_URL` | Vercel | Existing |

### Deployment Sequence

```
Phase 0-5: Deploy to Vercel only (no Railway needed)
Phase 6:   Deploy Gateway to Railway + update Vercel env vars
Phase 7:   Deploy art assets to Vercel static
```

### Testing Strategy

| Phase | How to test |
|-------|-------------|
| 0 | `npm run build` passes. Manual flow test. |
| 1 | Migration runs. `npx supabase db push`. Verify tables, indexes, RLS. |
| 2 | Unit tests for soulMdParser + expressionEngine. Dev page for particle preview. |
| 3 | Dev page for atom preview (`/dev/atoms`). Manual playback test. |
| 4 | Visual test: portrait panel appears during theater state. CSS transitions smooth. |
| 5 | Dev theater page with mock turns. Full pipeline: turn → expression → portrait + atoms + camera + particles. Page refresh recovery. |
| 6 | Gateway health check. Provision test agent. Submit coaching. Verify agent responds. Theater with real agent decisions. |
| 7 | Asset swap visual test. Customization UIs save correctly. Share/export works. Stripe purchase unlocks atoms. |

### Monitoring & Error Handling

| Concern | Solution |
|---------|----------|
| Gateway crash | Railway auto-restart. Health check endpoint. On restart: reload all active agents from agent_routing. |
| LLM timeout | Fallback "thinking" turn with generic nervous response. Retry once. |
| Supabase Realtime disconnect | Reconnect with exponential backoff. Fetch missed turns from GET /api/theater/{matchId}/state. |
| Turn submission conflict | UNIQUE constraint on (match_id, turn_number) prevents duplicates. 409 response handled gracefully. |
| Agent memory corruption | Supabase backup in agent_memories table. Restore from backup on inconsistency. |
| Canvas performance | Max 20 particles per character. Max 3 atoms per turn. Camera animations use simple math. |

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|-----------|
| Gateway can't handle 100+ agents on $12 VPS | High | Medium | Load test at 50 agents before launch. Have $24/mo upgrade ready. |
| Claude Haiku response latency >5s during theater | Medium | Low | "Thinking" animation covers wait. 10s timeout with fallback turn. |
| PixelLab art style inconsistency across 900 portraits | Medium | Medium | Establish style guide early. Generate small test batch first. Fix prompts before bulk generation. |
| SOUL.md parsing edge cases from Tier 2 hand-written files | Low | Medium | Lenient parser. Fall back to BASE_EXPRESSION_MAP for unparseable fields. Log warnings. |
| Supabase Realtime connection limits at scale | Medium | Low | Monitor WebSocket connections. Consider polling fallback for >500 concurrent users. |
| Canvas recording (GIF export) browser compatibility | Low | Medium | Feature-detect `captureStream()`. Fall back to "Copy replay link". |
| Railway persistent volume data loss | High | Low | Nightly backup of agent workspaces to Supabase agent_memories. Can fully reconstruct workspace from DB backup. |

---

## Success Criteria

1. **Theater plays end-to-end** with real agent decisions (not scripted) — 6-12 turns, 2-3 minutes
2. **Two agents** with different SOULs produce visibly distinct behavior on canvas
3. **User coaching** influences agent's next turn (verifiable in brain_reasoning)
4. **Comedy atoms** render smoothly at 60fps with camera effects
5. **Portraits** update in real-time during theater with CSS transitions
6. **Both tiers** work identically through the same API contract
7. **Build passes** with zero references to deprecated code or `@anthropic-ai/sdk`
8. **Agent memory** persists across dates — agent references past interactions
9. **Page refresh** during theater recovers state without data loss
10. **Heartbeat** proactively finds and suggests matches to inactive users

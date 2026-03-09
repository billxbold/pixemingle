-- 005_openclaw_native.sql
-- Phase 1: OpenClaw Native Architecture — new tables + schema changes
-- Supports: theater turns, agent routing, agent memories, entrance configs, comedy atom unlocks

-- ============================================================
-- 1. NEW TABLES
-- ============================================================

-- Theater turns — replaces scenarios table
CREATE TABLE theater_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  agent_role TEXT NOT NULL CHECK (agent_role IN ('chaser', 'gatekeeper')),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Agent brain output
  action TEXT NOT NULL CHECK (action IN (
    'deliver_line', 'react', 'use_prop', 'physical_comedy',
    'environment_interact', 'signature_move', 'entrance', 'exit'
  )),
  comedy_atoms TEXT[] DEFAULT '{}',
  text TEXT,
  emotion TEXT NOT NULL DEFAULT 'neutral' CHECK (emotion IN (
    'neutral', 'nervous', 'confident', 'embarrassed', 'excited',
    'dejected', 'amused', 'annoyed', 'hopeful', 'devastated',
    'smug', 'shy', 'trying_too_hard', 'genuinely_happy', 'cringing'
  )),
  confidence REAL NOT NULL DEFAULT 5.0 CHECK (confidence >= 0 AND confidence <= 10),
  comedy_intent TEXT NOT NULL DEFAULT 'witty' CHECK (comedy_intent IN (
    'self_deprecating', 'witty', 'physical', 'observational',
    'deadpan', 'absurdist', 'romantic_sincere', 'teasing', 'callback'
  )),
  target TEXT,
  prop TEXT,

  brain_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(match_id, turn_number)
);

CREATE INDEX idx_theater_turns_match ON theater_turns(match_id, turn_number);
CREATE INDEX idx_theater_turns_user ON theater_turns(user_id);

-- Agent routing — which gateway hosts each user's agent
CREATE TABLE agent_routing (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  gateway_url TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1 CHECK (tier IN (1, 2)),
  webhook_url TEXT,
  agent_workspace_path TEXT,
  heartbeat_interval_minutes INTEGER NOT NULL DEFAULT 30,
  last_heartbeat TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_routing_gateway ON agent_routing(gateway_url, is_active);

-- Agent memories — backup of OpenClaw memory files
CREATE TABLE agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'soul', 'entrance', 'heartbeat', 'daily', 'longterm'
  )),
  content TEXT NOT NULL,
  memory_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Singleton constraint: one soul/entrance/heartbeat per user
CREATE UNIQUE INDEX idx_agent_memories_singleton
  ON agent_memories(user_id, memory_type)
  WHERE memory_type IN ('soul', 'entrance', 'heartbeat');

CREATE INDEX idx_agent_memories_user_type ON agent_memories(user_id, memory_type);
CREATE INDEX idx_agent_memories_daily ON agent_memories(user_id, memory_date)
  WHERE memory_type = 'daily';

-- Entrance configs — user entrance customization
CREATE TABLE entrance_configs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vehicle TEXT NOT NULL DEFAULT 'walking',
  complication TEXT NOT NULL DEFAULT 'trip_on_curb',
  recovery TEXT NOT NULL DEFAULT 'brush_off',
  confidence REAL NOT NULL DEFAULT 5.0 CHECK (confidence >= 0 AND confidence <= 10),
  custom_detail TEXT,
  conditionals JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comedy atom unlocks — premium atoms unlocked per user
CREATE TABLE comedy_atom_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  atom_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'default' CHECK (source IN ('purchase', 'achievement', 'gift', 'default')),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, atom_id)
);

CREATE INDEX idx_comedy_atom_unlocks_user ON comedy_atom_unlocks(user_id);

-- ============================================================
-- 2. ALTER EXISTING TABLES
-- ============================================================

-- matches: add theater tracking columns
ALTER TABLE matches ADD COLUMN theater_status TEXT DEFAULT NULL CHECK (
  theater_status IS NULL OR theater_status IN (
    'entrance', 'active', 'deciding', 'completed_accepted', 'completed_rejected'
  )
);
ALTER TABLE matches ADD COLUMN theater_turn_count INTEGER DEFAULT 0;
ALTER TABLE matches ADD COLUMN theater_started_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN theater_ended_at TIMESTAMPTZ;

-- notifications: expand type constraint for theater + agent events
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'match_request', 'theater_ready', 'chat_message', 'match_expired', 'match_result',
    'date_proposal', 'date_proposal_sent', 'venue_accepted', 'venue_countered', 'date_declined',
    'theater_turn', 'theater_entrance', 'theater_outcome',
    'agent_coaching_response', 'heartbeat_suggestion'
  ));

-- users: add OpenClaw-related columns
ALTER TABLE users ADD COLUMN has_soul_md BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN agent_tier INTEGER DEFAULT 1 CHECK (agent_tier IN (1, 2));

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE theater_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_routing ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrance_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comedy_atom_unlocks ENABLE ROW LEVEL SECURITY;

-- theater_turns: users can read turns for their own matches
CREATE POLICY theater_turns_select ON theater_turns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = theater_turns.match_id
      AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
    )
  );

-- theater_turns: match participants can insert (for dev/testing; production uses service role)
CREATE POLICY theater_turns_insert ON theater_turns
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = theater_turns.match_id
      AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
    )
  );

-- agent_routing: users manage own record
CREATE POLICY agent_routing_select ON agent_routing
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY agent_routing_insert ON agent_routing
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY agent_routing_update ON agent_routing
  FOR UPDATE USING (user_id = auth.uid());

-- agent_memories: users manage own records
CREATE POLICY agent_memories_select ON agent_memories
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY agent_memories_insert ON agent_memories
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY agent_memories_update ON agent_memories
  FOR UPDATE USING (user_id = auth.uid());

-- entrance_configs: users manage own record
CREATE POLICY entrance_configs_select ON entrance_configs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY entrance_configs_insert ON entrance_configs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY entrance_configs_update ON entrance_configs
  FOR UPDATE USING (user_id = auth.uid());

-- comedy_atom_unlocks: users can read own unlocks
CREATE POLICY comedy_atom_unlocks_select ON comedy_atom_unlocks
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- 4. REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE theater_turns;

-- ============================================================
-- 5. ROLLBACK (commented out — run manually if needed)
-- ============================================================
/*
DROP TABLE IF EXISTS comedy_atom_unlocks CASCADE;
DROP TABLE IF EXISTS entrance_configs CASCADE;
DROP TABLE IF EXISTS agent_memories CASCADE;
DROP TABLE IF EXISTS agent_routing CASCADE;
DROP TABLE IF EXISTS theater_turns CASCADE;

ALTER TABLE matches DROP COLUMN IF EXISTS theater_status;
ALTER TABLE matches DROP COLUMN IF EXISTS theater_turn_count;
ALTER TABLE matches DROP COLUMN IF EXISTS theater_started_at;
ALTER TABLE matches DROP COLUMN IF EXISTS theater_ended_at;

ALTER TABLE users DROP COLUMN IF EXISTS has_soul_md;
ALTER TABLE users DROP COLUMN IF EXISTS agent_tier;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'match_request', 'theater_ready', 'chat_message', 'match_expired', 'match_result',
    'date_proposal', 'date_proposal_sent'
  ));
*/

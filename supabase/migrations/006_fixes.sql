-- 006_fixes.sql
-- Schema fixes: NOT NULL constraints, CHECK constraints, RLS, indexes, cascades, purchase status

BEGIN;

-- ============================================================
-- 1. NOT NULL CONSTRAINTS (backfill NULLs, then add constraint)
-- ============================================================

-- users.tier
UPDATE users SET tier = 'free' WHERE tier IS NULL;
ALTER TABLE users ALTER COLUMN tier SET NOT NULL;

-- users.is_demo
UPDATE users SET is_demo = FALSE WHERE is_demo IS NULL;
ALTER TABLE users ALTER COLUMN is_demo SET NOT NULL;

-- users.created_at
UPDATE users SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;

-- users.updated_at
UPDATE users SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL;

-- users.has_soul_md (added in 005)
UPDATE users SET has_soul_md = FALSE WHERE has_soul_md IS NULL;
ALTER TABLE users ALTER COLUMN has_soul_md SET NOT NULL;

-- users.agent_tier (added in 005)
UPDATE users SET agent_tier = 1 WHERE agent_tier IS NULL;
ALTER TABLE users ALTER COLUMN agent_tier SET NOT NULL;

-- matches.attempt_count
UPDATE matches SET attempt_count = 0 WHERE attempt_count IS NULL;
ALTER TABLE matches ALTER COLUMN attempt_count SET NOT NULL;

-- matches.created_at
UPDATE matches SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE matches ALTER COLUMN created_at SET NOT NULL;

-- matches.updated_at
UPDATE matches SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE matches ALTER COLUMN updated_at SET NOT NULL;

-- matches.theater_turn_count (added in 005)
UPDATE matches SET theater_turn_count = 0 WHERE theater_turn_count IS NULL;
ALTER TABLE matches ALTER COLUMN theater_turn_count SET NOT NULL;

-- chat_messages.created_at
UPDATE chat_messages SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE chat_messages ALTER COLUMN created_at SET NOT NULL;

-- notifications.created_at
UPDATE notifications SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE notifications ALTER COLUMN created_at SET NOT NULL;

-- notifications.data (set default first, then backfill, then NOT NULL)
ALTER TABLE notifications ALTER COLUMN data SET DEFAULT '{}';
UPDATE notifications SET data = '{}' WHERE data IS NULL;
ALTER TABLE notifications ALTER COLUMN data SET NOT NULL;

-- theater_turns.created_at (from 005)
UPDATE theater_turns SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE theater_turns ALTER COLUMN created_at SET NOT NULL;

-- agent_memories.created_at (from 005)
UPDATE agent_memories SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE agent_memories ALTER COLUMN created_at SET NOT NULL;

-- agent_memories.updated_at (from 005)
UPDATE agent_memories SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE agent_memories ALTER COLUMN updated_at SET NOT NULL;

-- entrance_configs.updated_at (from 005)
UPDATE entrance_configs SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE entrance_configs ALTER COLUMN updated_at SET NOT NULL;

-- comedy_atom_unlocks.unlocked_at (from 005)
UPDATE comedy_atom_unlocks SET unlocked_at = NOW() WHERE unlocked_at IS NULL;
ALTER TABLE comedy_atom_unlocks ALTER COLUMN unlocked_at SET NOT NULL;

-- ============================================================
-- 2. VENUE CHECK CONSTRAINTS
-- ============================================================

ALTER TABLE matches ADD CONSTRAINT matches_proposed_venue_check
  CHECK (proposed_venue IN ('lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum'));
ALTER TABLE matches ADD CONSTRAINT matches_final_venue_check
  CHECK (final_venue IN ('lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum'));

-- ============================================================
-- 3. ENABLE RLS ON openclaw_agents
-- ============================================================

ALTER TABLE openclaw_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own agent" ON openclaw_agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own agent" ON openclaw_agents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage agents" ON openclaw_agents
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 4. NOTE ON users SELECT RLS POLICY
-- ============================================================

-- The "Users can read other profiles for matching" policy uses USING (true),
-- which exposes all user rows to any authenticated user. This is acceptable
-- for now because ALL API routes use the service role client (bypassing RLS).
-- TODO: When API routes switch to the anon/user client, replace this policy
-- with one that restricts readable columns or limits to non-blocked users.

-- ============================================================
-- 5. FK ON DELETE CASCADE FOR matches
-- ============================================================

-- Recreate foreign keys with ON DELETE CASCADE
-- (001 already had ON DELETE CASCADE, but let's ensure consistency)
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_user_a_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_user_a_id_fkey
  FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_user_b_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_user_b_id_fkey
  FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 6. MISSING INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_chat_messages_match_created
  ON chat_messages(match_id, created_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_matches_theater_status
  ON matches(theater_status) WHERE theater_status IS NOT NULL;

-- ============================================================
-- 7. PURCHASE STATUS COLUMN
-- ============================================================

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS status TEXT
  DEFAULT 'pending'
  CHECK (status IN ('pending', 'completed', 'failed'))
  NOT NULL;

-- Mark all existing purchases as completed (pre-date this tracking)
UPDATE purchases SET status = 'completed' WHERE status = 'pending';

COMMIT;

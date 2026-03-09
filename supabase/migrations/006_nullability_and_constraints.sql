-- Migration 006: Fix nullability mismatches and add missing constraints
-- Addresses audit findings: SQL columns nullable but TypeScript types required

-- ============================================================
-- 1. Fix users table nullability
-- ============================================================
-- These columns have DEFAULT values but were missing NOT NULL,
-- causing a mismatch with non-nullable TypeScript types.

UPDATE users SET is_demo = FALSE WHERE is_demo IS NULL;
ALTER TABLE users ALTER COLUMN is_demo SET NOT NULL;

UPDATE users SET tier = 'free' WHERE tier IS NULL;
ALTER TABLE users ALTER COLUMN tier SET NOT NULL;

UPDATE users SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;

UPDATE users SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL;

UPDATE users SET has_soul_md = FALSE WHERE has_soul_md IS NULL;
ALTER TABLE users ALTER COLUMN has_soul_md SET NOT NULL;

UPDATE users SET agent_tier = 1 WHERE agent_tier IS NULL;
ALTER TABLE users ALTER COLUMN agent_tier SET NOT NULL;

-- ============================================================
-- 2. Fix matches table nullability
-- ============================================================

UPDATE matches SET attempt_count = 0 WHERE attempt_count IS NULL;
ALTER TABLE matches ALTER COLUMN attempt_count SET NOT NULL;

UPDATE matches SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE matches ALTER COLUMN created_at SET NOT NULL;

UPDATE matches SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE matches ALTER COLUMN updated_at SET NOT NULL;

UPDATE matches SET theater_turn_count = 0 WHERE theater_turn_count IS NULL;
ALTER TABLE matches ALTER COLUMN theater_turn_count SET NOT NULL;

-- ============================================================
-- 3. Add CHECK constraints on venue columns (missing from migration 003)
-- ============================================================

ALTER TABLE matches ADD CONSTRAINT matches_proposed_venue_check
  CHECK (proposed_venue IS NULL OR proposed_venue IN ('lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum'));

ALTER TABLE matches ADD CONSTRAINT matches_final_venue_check
  CHECK (final_venue IS NULL OR final_venue IN ('lounge', 'gallery', 'japanese', 'icecream', 'studio', 'museum'));

-- ============================================================
-- 4. Fix notifications table nullability
-- ============================================================

UPDATE notifications SET data = '{}' WHERE data IS NULL;
ALTER TABLE notifications ALTER COLUMN data SET DEFAULT '{}';
ALTER TABLE notifications ALTER COLUMN data SET NOT NULL;

UPDATE notifications SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE notifications ALTER COLUMN created_at SET NOT NULL;

-- ============================================================
-- 5. Fix chat_messages.created_at
-- ============================================================

UPDATE chat_messages SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE chat_messages ALTER COLUMN created_at SET NOT NULL;

-- ============================================================
-- 6. Fix theater_turns.created_at
-- ============================================================

UPDATE theater_turns SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE theater_turns ALTER COLUMN created_at SET NOT NULL;

-- ============================================================
-- 7. Fix entrance_configs nullability
-- ============================================================

UPDATE entrance_configs SET conditionals = '[]' WHERE conditionals IS NULL;
ALTER TABLE entrance_configs ALTER COLUMN conditionals SET NOT NULL;

UPDATE entrance_configs SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE entrance_configs ALTER COLUMN updated_at SET NOT NULL;

-- ============================================================
-- 8. Fix comedy_atom_unlocks nullability
-- ============================================================

UPDATE comedy_atom_unlocks SET unlocked_at = NOW() WHERE unlocked_at IS NULL;
ALTER TABLE comedy_atom_unlocks ALTER COLUMN unlocked_at SET NOT NULL;

-- ============================================================
-- 9. Enable RLS on openclaw_agents (was missing from migration 001)
-- ============================================================

ALTER TABLE openclaw_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own agent" ON openclaw_agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own agent" ON openclaw_agents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to agents" ON openclaw_agents
  FOR ALL USING (auth.role() = 'service_role');

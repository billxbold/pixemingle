-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  bio TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'nonbinary')),
  looking_for TEXT NOT NULL CHECK (looking_for IN ('male', 'female', 'everyone')),
  location TEXT,
  horoscope TEXT,
  personality JSONB,
  soul_type TEXT NOT NULL CHECK (soul_type IN ('romantic', 'funny', 'bold', 'intellectual')),
  role TEXT NOT NULL DEFAULT 'chaser' CHECK (role IN ('chaser', 'gatekeeper')),
  agent_appearance JSONB,
  photos TEXT[],
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'wingman', 'rizzlord')),
  stripe_customer_id TEXT,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_b' CHECK (status IN ('pending_b', 'active', 'rejected', 'expired', 'unmatched')),
  match_score FLOAT,
  match_reasons JSONB,
  scenario_cache JSONB,
  attempt_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenarios
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  scenario_data JSONB NOT NULL,
  result TEXT DEFAULT 'pending' CHECK (result IN ('pending', 'accepted', 'rejected', 'timeout')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('subscription', 'cosmetic', 'boost', 'gesture')),
  item_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cosmetics catalog
CREATE TABLE cosmetics (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('hair', 'top', 'bottom', 'accessory', 'special')),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  tier_required TEXT DEFAULT 'free',
  sprite_data JSONB
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('match_request', 'theater_ready', 'chat_message', 'match_expired', 'match_result')),
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocks
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- OpenClaw agents
CREATE TABLE openclaw_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_matches_user_a ON matches(user_a_id);
CREATE INDEX idx_matches_user_b ON matches(user_b_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_chat_match ON chat_messages(match_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_scenarios_match ON scenarios(match_id);

-- Enable realtime for chat and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

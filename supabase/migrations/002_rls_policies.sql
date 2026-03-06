-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Users: read own, read others for matching
CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can read other profiles for matching" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Matches: read own matches
CREATE POLICY "Users can read own matches" ON matches FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
CREATE POLICY "Users can insert matches" ON matches FOR INSERT
  WITH CHECK (auth.uid() = user_a_id);
CREATE POLICY "Users can update own matches" ON matches FOR UPDATE
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Scenarios: read if part of match
CREATE POLICY "Users can read own scenarios" ON scenarios FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM matches WHERE matches.id = scenarios.match_id
    AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
  ));

-- Chat: read/write if part of match
CREATE POLICY "Users can read own chat" ON chat_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM matches WHERE matches.id = chat_messages.match_id
    AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
  ));
CREATE POLICY "Users can send chat" ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Notifications: own only
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Purchases: own only
CREATE POLICY "Users can read own purchases" ON purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Reports: can create
CREATE POLICY "Users can create reports" ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Blocks: own only
CREATE POLICY "Users can read own blocks" ON blocks FOR SELECT
  USING (auth.uid() = blocker_id);
CREATE POLICY "Users can create blocks" ON blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can delete own blocks" ON blocks FOR DELETE
  USING (auth.uid() = blocker_id);

-- Cosmetics: public read
ALTER TABLE cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cosmetics" ON cosmetics FOR SELECT USING (true);

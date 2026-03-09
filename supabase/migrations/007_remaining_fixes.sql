-- 007_remaining_fixes.sql
-- Fix nullable columns that should be NOT NULL

-- Fix nullable match participant columns
ALTER TABLE matches ALTER COLUMN user_a_id SET NOT NULL;
ALTER TABLE matches ALTER COLUMN user_b_id SET NOT NULL;

-- Fix nullable notifications.read column
ALTER TABLE notifications ALTER COLUMN read SET NOT NULL;

-- Add venue fields to matches for date proposal flow
ALTER TABLE matches ADD COLUMN proposed_venue TEXT;
ALTER TABLE matches ADD COLUMN final_venue TEXT;
ALTER TABLE matches ADD COLUMN venue_proposal_text TEXT;

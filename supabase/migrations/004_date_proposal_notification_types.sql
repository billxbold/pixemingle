-- Add date_proposal and date_proposal_sent to notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'match_request', 'theater_ready', 'chat_message', 'match_expired', 'match_result',
    'date_proposal', 'date_proposal_sent'
  ));

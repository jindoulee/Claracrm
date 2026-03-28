-- Add calendar event tracking to interactions
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
CREATE INDEX IF NOT EXISTS idx_interactions_calendar_event
  ON interactions(user_id, calendar_event_id)
  WHERE calendar_event_id IS NOT NULL;

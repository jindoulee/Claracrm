-- Add status column to contacts for hide/delete support
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'hidden', 'deleted'));

-- Partial index for fast active-contact queries
CREATE INDEX IF NOT EXISTS idx_contacts_active
  ON contacts(user_id) WHERE status = 'active';

-- Partial index for hidden contacts count badge
CREATE INDEX IF NOT EXISTS idx_contacts_hidden
  ON contacts(user_id) WHERE status = 'hidden';

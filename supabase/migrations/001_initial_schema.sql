-- ClaraCRM Initial Schema
-- Voice-first personal relationship manager

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CONTACTS
-- ============================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  nickname TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  role TEXT,
  avatar_url TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  relationship_strength INTEGER DEFAULT 50 CHECK (relationship_strength BETWEEN 0 AND 100),
  last_interaction_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_full_name ON contacts(user_id, full_name);
CREATE INDEX idx_contacts_last_interaction ON contacts(user_id, last_interaction_at DESC);

-- ============================================
-- CONTACT RELATIONSHIPS (Social Graph Edges)
-- ============================================
CREATE TABLE contact_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  related_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'parent', 'spouse', 'sibling', 'colleague', 'friend', 'manager', 'report', 'introduced_by'
  label TEXT, -- "Alan's son", "Works with at Google"
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, related_contact_id, relationship_type)
);

CREATE INDEX idx_relationships_contact ON contact_relationships(contact_id);
CREATE INDEX idx_relationships_related ON contact_relationships(related_contact_id);

-- ============================================
-- INTERACTIONS
-- ============================================
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  interaction_type TEXT NOT NULL DEFAULT 'general', -- 'coffee', 'call', 'email', 'text', 'meeting', 'dinner', 'general'
  location TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  summary TEXT,
  transcript TEXT,
  audio_url TEXT,
  sentiment TEXT DEFAULT 'neutral', -- 'positive', 'neutral', 'negative'
  key_topics TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_occurred_at ON interactions(user_id, occurred_at DESC);

-- ============================================
-- INTERACTION ↔ CONTACTS (Many-to-Many)
-- ============================================
CREATE TABLE interaction_contacts (
  interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  PRIMARY KEY (interaction_id, contact_id)
);

CREATE INDEX idx_interaction_contacts_contact ON interaction_contacts(contact_id);

-- ============================================
-- TASKS (Follow-ups & Reminders)
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  interaction_id UUID REFERENCES interactions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'snoozed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notification_sent BOOLEAN DEFAULT FALSE,
  channel TEXT, -- 'sms', 'email', 'call', 'any'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_due_at ON tasks(user_id, due_at);
CREATE INDEX idx_tasks_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_contact ON tasks(contact_id);

-- ============================================
-- CONTACT FACTS (What Clara "remembers")
-- ============================================
CREATE TABLE contact_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  fact_type TEXT NOT NULL, -- 'family', 'work', 'interest', 'life_event', 'health', 'milestone', 'preference'
  fact TEXT NOT NULL,
  source_interaction_id UUID REFERENCES interactions(id) ON DELETE SET NULL,
  confidence FLOAT DEFAULT 0.8 CHECK (confidence BETWEEN 0 AND 1),
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ, -- NULL = still valid
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_facts_contact ON contact_facts(contact_id);
CREATE INDEX idx_facts_type ON contact_facts(contact_id, fact_type);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

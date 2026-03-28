-- ============================================
-- Migration 005: Enable Row Level Security
-- ============================================
-- Enables RLS on all user-owned tables and adds
-- policies so users can only access their own data.
-- ============================================

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_merge_candidates ENABLE ROW LEVEL SECURITY;

-- Contacts: users can only CRUD their own contacts
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Interactions: users can only CRUD their own interactions
CREATE POLICY "Users can view own interactions"
  ON interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
  ON interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions"
  ON interactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interactions"
  ON interactions FOR DELETE
  USING (auth.uid() = user_id);

-- Interaction contacts: access through interaction ownership
CREATE POLICY "Users can view own interaction contacts"
  ON interaction_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interactions
      WHERE interactions.id = interaction_contacts.interaction_id
      AND interactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own interaction contacts"
  ON interaction_contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactions
      WHERE interactions.id = interaction_contacts.interaction_id
      AND interactions.user_id = auth.uid()
    )
  );

-- Contact facts: access through contact ownership
CREATE POLICY "Users can view own contact facts"
  ON contact_facts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_facts.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own contact facts"
  ON contact_facts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_facts.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own contact facts"
  ON contact_facts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_facts.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

-- Contact relationships: access through contact ownership
CREATE POLICY "Users can view own relationships"
  ON contact_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_relationships.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own relationships"
  ON contact_relationships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = contact_relationships.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

-- Tasks: users can only CRUD their own tasks
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Import batches: users can only access their own
CREATE POLICY "Users can view own import batches"
  ON import_batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import batches"
  ON import_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own import batches"
  ON import_batches FOR UPDATE
  USING (auth.uid() = user_id);

-- Contact merge candidates: users can only access their own
CREATE POLICY "Users can view own merge candidates"
  ON contact_merge_candidates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own merge candidates"
  ON contact_merge_candidates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own merge candidates"
  ON contact_merge_candidates FOR UPDATE
  USING (auth.uid() = user_id);

-- Contact Import: batch tracking and merge candidates
-- Run this in Supabase SQL Editor

-- ============================================
-- IMPORT BATCHES — tracks each import operation
-- ============================================
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('vcf', 'csv', 'google', 'contact_picker', 'manual')),
  filename TEXT,
  total_records INTEGER NOT NULL DEFAULT 0,
  imported INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  merge_candidates INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_batches_user ON import_batches(user_id);

-- ============================================
-- MERGE CANDIDATES — pairs of contacts that might be duplicates
-- ============================================
CREATE TABLE contact_merge_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  contact_id_a UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  contact_id_b UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL,
  resolution TEXT CHECK (resolution IN ('merged', 'kept_both', 'pending')) DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id_a, contact_id_b)
);

CREATE INDEX idx_merge_candidates_user ON contact_merge_candidates(user_id, resolution);
CREATE INDEX idx_merge_candidates_contacts ON contact_merge_candidates(contact_id_a);

-- Add import traceability to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;

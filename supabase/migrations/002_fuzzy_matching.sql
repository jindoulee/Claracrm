-- 002_fuzzy_matching.sql
-- Enable fuzzy/trigram matching for contact name resolution
-- Run this in the Supabase SQL editor after 001_initial_schema.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- Create trigram GIN index on contacts.full_name for fast similarity lookups
CREATE INDEX IF NOT EXISTS idx_contacts_full_name_trgm
  ON contacts USING GIN (full_name gin_trgm_ops);

-- Function to find similar contacts by name using trigram similarity
CREATE OR REPLACE FUNCTION find_similar_contacts(
  p_user_id uuid,
  p_name text,
  p_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  nickname text,
  email text,
  phone text,
  company text,
  role text,
  avatar_url text,
  notes text,
  tags text[],
  relationship_strength integer,
  last_interaction_at timestamptz,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  similarity_score float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.id,
    c.user_id,
    c.full_name,
    c.nickname,
    c.email,
    c.phone,
    c.company,
    c.role,
    c.avatar_url,
    c.notes,
    c.tags,
    c.relationship_strength,
    c.last_interaction_at,
    c.metadata,
    c.created_at,
    c.updated_at,
    GREATEST(
      similarity(lower(c.full_name), lower(p_name)),
      CASE WHEN c.nickname IS NOT NULL
        THEN similarity(lower(c.nickname), lower(p_name))
        ELSE 0
      END
    ) AS similarity_score
  FROM contacts c
  WHERE c.user_id = p_user_id
    AND GREATEST(
      similarity(lower(c.full_name), lower(p_name)),
      CASE WHEN c.nickname IS NOT NULL
        THEN similarity(lower(c.nickname), lower(p_name))
        ELSE 0
      END
    ) >= p_threshold
  ORDER BY similarity_score DESC
  LIMIT 5;
$$;

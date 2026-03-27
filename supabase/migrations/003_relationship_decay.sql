-- Relationship Strength Decay & Boost Functions
-- Enables automatic decay of relationship_strength over time
-- and boosting after new interactions.

-- ============================================
-- DECAY: Reduce strength based on inactivity
-- ============================================
-- Loses ~2 points per week of no contact (configurable via p_points_per_week).
-- Only decays contacts not interacted with in the last 3 days.
-- Never drops below 10.
CREATE OR REPLACE FUNCTION decay_relationship_strengths(
  p_points_per_week NUMERIC DEFAULT 2.0
)
RETURNS INTEGER AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE contacts
  SET relationship_strength = GREATEST(
    10,
    relationship_strength - FLOOR(
      EXTRACT(EPOCH FROM (NOW() - COALESCE(last_interaction_at, created_at))) / 604800.0 * p_points_per_week
    )::INTEGER
  )
  WHERE last_interaction_at IS NULL
     OR last_interaction_at < NOW() - INTERVAL '3 days';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- BOOST: Increase strength after interaction
-- ============================================
-- Caps at 100. Updates last_interaction_at to now.
CREATE OR REPLACE FUNCTION boost_relationship_strength(
  p_contact_id UUID,
  p_boost INTEGER DEFAULT 10
)
RETURNS VOID AS $$
BEGIN
  UPDATE contacts
  SET relationship_strength = LEAST(100, relationship_strength + p_boost),
      last_interaction_at = NOW()
  WHERE id = p_contact_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Migration: Add external_id columns for football-data.org sync
-- and last_synced_at tracking to competitions table.
-- ============================================================

-- External IDs (integer) for mapping football-data.org entities
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS external_id INTEGER;
ALTER TABLE public.teams        ADD COLUMN IF NOT EXISTS external_id INTEGER;
ALTER TABLE public.matches      ADD COLUMN IF NOT EXISTS external_id INTEGER;

-- Track when each match was last synced from the external API
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Track when the competition data was last synced (used for rate-limiting)
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Indexes for fast O(1) lookup during sync
CREATE INDEX IF NOT EXISTS idx_competitions_external_id ON public.competitions(external_id);
CREATE INDEX IF NOT EXISTS idx_teams_external_id        ON public.teams(external_id);
CREATE INDEX IF NOT EXISTS idx_matches_external_id      ON public.matches(external_id);

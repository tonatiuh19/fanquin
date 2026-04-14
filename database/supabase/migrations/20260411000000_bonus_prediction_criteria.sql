-- ============================================================
-- Migration: Bonus Prediction Criteria
-- Date: 2026-04-11
--
-- Adds a dynamic multi-criteria scoring system so group admins
-- can configure extra ways to earn points beyond exact score /
-- correct winner / goal difference.
--
-- New criteria (all auto-scoreable via football-data.org):
--   btts            — Both Teams to Score (yes/no)
--   total_goals_over — Total goals over/under a threshold (yes/no)
--   ft_winner       — Full-time result (home/draw/away) — standalone, independent of score
--   ht_winner       — Half-time result (home/draw/away)
--   clean_sheet     — Which team keeps a clean sheet (home/away/none)
-- ============================================================

-- 1. Store half-time scores on matches (needed for ht_winner scoring)
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS ht_score_home int,
  ADD COLUMN IF NOT EXISTS ht_score_away int;

-- 2. Add bonus_criteria JSONB to groups
--    Shape:
--    {
--      "enabled": ["btts", "total_goals_over", "ft_winner", "ht_winner", "clean_sheet"],
--      "btts_pts": 2,
--      "total_goals_over_pts": 2,
--      "total_goals_threshold": 2.5,
--      "ft_winner_pts": 2,
--      "ht_winner_pts": 2,
--      "clean_sheet_pts": 1
--    }
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS bonus_criteria jsonb NOT NULL DEFAULT '{
    "enabled": [],
    "btts_pts": 2,
    "total_goals_over_pts": 2,
    "total_goals_threshold": 2.5,
    "ft_winner_pts": 2,
    "ht_winner_pts": 2,
    "clean_sheet_pts": 1
  }';

-- 3. Add details JSONB + bonus_pts to predictions
--    details shape (only the keys for enabled criteria):
--    {
--      "btts": true,
--      "total_goals_over": false,
--      "ht_winner": "home",
--      "clean_sheet": "away"
--    }
ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bonus_pts int NOT NULL DEFAULT 0;

-- 4. Index for bonus criteria lookups
CREATE INDEX IF NOT EXISTS idx_predictions_details
  ON public.predictions USING gin (details);

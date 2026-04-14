-- ============================================================
-- FanQuin — Pending Migrations
-- Apply this file ON TOP OF database/schema.sql for any existing DB.
-- Safe to run multiple times (all statements are idempotent).
--
-- Includes:
--   1. External IDs & sync tracking (football-data.org integration)
--   2. is_test flag on competitions + groups
--   3. FanQuin Test League seed data (5 groups, one per game mode)
-- ============================================================


-- ============================================================
-- 1. EXTERNAL IDs & SYNC TRACKING
-- ============================================================

-- Integer IDs from football-data.org for entity mapping
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS external_id     INTEGER;
ALTER TABLE public.teams        ADD COLUMN IF NOT EXISTS external_id     INTEGER;
ALTER TABLE public.matches      ADD COLUMN IF NOT EXISTS external_id     INTEGER;

-- Sync timestamps (used for rate-limiting and stale-data checks)
ALTER TABLE public.matches      ADD COLUMN IF NOT EXISTS last_synced_at  TIMESTAMPTZ;
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS last_synced_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_competitions_external_id ON public.competitions (external_id);
CREATE INDEX IF NOT EXISTS idx_teams_external_id        ON public.teams        (external_id);
CREATE INDEX IF NOT EXISTS idx_matches_external_id      ON public.matches      (external_id);


-- ============================================================
-- 2. IS_TEST FLAG
-- Hides test data from regular users. Toggle to false in the DB
-- to expose the test league to all users for broad prod testing.
-- ============================================================

ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.groups       ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_competitions_is_test ON public.competitions (is_test);
CREATE INDEX IF NOT EXISTS idx_groups_is_test        ON public.groups       (is_test);


-- ============================================================
-- 3. TEST COMPETITION
-- Set is_test = false to expose to all users for load / prod testing.
-- ============================================================

INSERT INTO public.competitions (
  id, name, short_name, type, season,
  starts_at, ends_at, is_active, is_test, logo_url
) VALUES (
  'ffffffff-0000-0000-0000-000000000001',
  'FanQuin Test League 2026', 'TEST', 'other', '2026',
  now() - interval '7 days',
  now() + interval '30 days',
  true, true, null
) ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 4. TEST VENUE
-- ============================================================

INSERT INTO public.venues (id, name, city, country, country_code, capacity)
VALUES (
  'ffffffff-1111-0000-0000-000000000001',
  'FanQuin Test Arena', 'Test City', 'Testland', 'TX', 50000
) ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 5. TEST TEAMS  (8 teams — groups A & B, tiers 1-3)
-- ============================================================

INSERT INTO public.teams (
  id, competition_id, name, short_name,
  country_code, group_label, tier, is_placeholder
) VALUES
  -- GROUP A
  ('ffffffff-2222-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000001','Alpha FC',      'ALP','US','A',1,false),
  ('ffffffff-2222-0000-0000-000000000002','ffffffff-0000-0000-0000-000000000001','Beta United',   'BET','GB','A',2,false),
  ('ffffffff-2222-0000-0000-000000000003','ffffffff-0000-0000-0000-000000000001','Gamma City',    'GAM','DE','A',3,false),
  ('ffffffff-2222-0000-0000-000000000004','ffffffff-0000-0000-0000-000000000001','Delta SC',      'DEL','ES','A',2,false),
  -- GROUP B
  ('ffffffff-2222-0000-0000-000000000005','ffffffff-0000-0000-0000-000000000001','Epsilon Real',  'EPS','BR','B',1,false),
  ('ffffffff-2222-0000-0000-000000000006','ffffffff-0000-0000-0000-000000000001','Zeta Athletic', 'ZET','AR','B',2,false),
  ('ffffffff-2222-0000-0000-000000000007','ffffffff-0000-0000-0000-000000000001','Eta Rovers',    'ETA','FR','B',3,false),
  ('ffffffff-2222-0000-0000-000000000008','ffffffff-0000-0000-0000-000000000001','Theta Club',    'THE','PT','B',2,false)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 6. TEST MATCHES  (5 matches — all status/lock states covered)
--
--  Match 1  completed    Alpha FC  2-1  Beta United       (2 days ago)
--  Match 2  live         Gamma City vs Delta SC            (kicked off 30 min ago)
--  Match 3  scheduled    Epsilon vs Zeta  — window OPEN    (kicks off in 2 days)
--  Match 4  scheduled    Eta vs Theta     — window LOCKED  (kicks off in 2h, closed 1h ago)
--  Match 5  scheduled    Alpha vs Epsilon — Final          (kicks off in 7 days)
-- ============================================================

INSERT INTO public.matches (
  id, competition_id, home_team_id, away_team_id,
  stage, match_number, match_date, prediction_lock,
  home_score, away_score, status, venue_id
) VALUES
  -- Match 1: completed & scored
  (
    'ffffffff-3333-0000-0000-000000000001',
    'ffffffff-0000-0000-0000-000000000001',
    'ffffffff-2222-0000-0000-000000000001',
    'ffffffff-2222-0000-0000-000000000002',
    'Group Stage - A', 1,
    now() - interval '2 days',
    now() - interval '2 days 1 hour',
    2, 1, 'completed',
    'ffffffff-1111-0000-0000-000000000001'
  ),
  -- Match 2: live
  (
    'ffffffff-3333-0000-0000-000000000002',
    'ffffffff-0000-0000-0000-000000000001',
    'ffffffff-2222-0000-0000-000000000003',
    'ffffffff-2222-0000-0000-000000000004',
    'Group Stage - A', 2,
    now() - interval '30 minutes',
    now() - interval '90 minutes',
    null, null, 'live',
    'ffffffff-1111-0000-0000-000000000001'
  ),
  -- Match 3: scheduled, prediction window open
  (
    'ffffffff-3333-0000-0000-000000000003',
    'ffffffff-0000-0000-0000-000000000001',
    'ffffffff-2222-0000-0000-000000000005',
    'ffffffff-2222-0000-0000-000000000006',
    'Group Stage - B', 3,
    now() + interval '2 days',
    now() + interval '1 day 23 hours',
    null, null, 'scheduled',
    'ffffffff-1111-0000-0000-000000000001'
  ),
  -- Match 4: scheduled, prediction window locked
  (
    'ffffffff-3333-0000-0000-000000000004',
    'ffffffff-0000-0000-0000-000000000001',
    'ffffffff-2222-0000-0000-000000000007',
    'ffffffff-2222-0000-0000-000000000008',
    'Group Stage - B', 4,
    now() + interval '2 hours',
    now() - interval '1 hour',
    null, null, 'scheduled',
    'ffffffff-1111-0000-0000-000000000001'
  ),
  -- Match 5: far-future final
  (
    'ffffffff-3333-0000-0000-000000000005',
    'ffffffff-0000-0000-0000-000000000001',
    'ffffffff-2222-0000-0000-000000000001',
    'ffffffff-2222-0000-0000-000000000005',
    'Final', 5,
    now() + interval '7 days',
    now() + interval '6 days 23 hours',
    null, null, 'scheduled',
    'ffffffff-1111-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

-- Ownership events for the completed match (enables ownership point testing)
INSERT INTO public.team_match_events (match_id, team_id, goals_scored, clean_sheet, won)
VALUES
  ('ffffffff-3333-0000-0000-000000000001','ffffffff-2222-0000-0000-000000000001', 2, false, true),
  ('ffffffff-3333-0000-0000-000000000001','ffffffff-2222-0000-0000-000000000002', 1, false, false)
ON CONFLICT (match_id, team_id) DO NOTHING;


-- ============================================================
-- 7. TEST GROUPS  (one per game mode — fixed invite codes)
--
--  TSTCASUL  →  casual      prediction-only, no ELO, no ownership
--  TSTFRNDS  →  friends     snake draft + full scoring
--  TSTLEAGU  →  league      balanced-tier draft + ELO k=32
--  TSTCMPET  →  competitive 3 survivor lives + ELO k=32
--  TSTGLOBL  →  global      200-member lobby + ELO k=16
-- ============================================================

INSERT INTO public.groups (
  id, name, invite_code, competition_id,
  mode, draft_type, owner_id, max_members,
  status, is_active, is_test, scoring_config
) VALUES
  (
    'ffffffff-4444-0000-0000-000000000001',
    'Test: Casual League', 'TSTCASUL',
    'ffffffff-0000-0000-0000-000000000001',
    'casual', 'random', null, 20, 'waiting', true, true,
    '{"exact_score_pts":5,"correct_winner_pts":3,"goal_difference_pts":2,"team_win_pts":0,"team_goal_pts":0,"team_clean_sheet_pts":0,"upset_base_pts":5,"streak_bonus_threshold":3,"streak_bonus_pts":2,"elo_k_factor":0,"survivor_lives":1,"weekly_reset_enabled":false}'
  ),
  (
    'ffffffff-4444-0000-0000-000000000002',
    'Test: Friends Group', 'TSTFRNDS',
    'ffffffff-0000-0000-0000-000000000001',
    'friends', 'snake', null, 20, 'waiting', true, true,
    '{"exact_score_pts":5,"correct_winner_pts":3,"goal_difference_pts":2,"team_win_pts":4,"team_goal_pts":1,"team_clean_sheet_pts":3,"upset_base_pts":5,"streak_bonus_threshold":3,"streak_bonus_pts":2,"elo_k_factor":0,"survivor_lives":1,"weekly_reset_enabled":true}'
  ),
  (
    'ffffffff-4444-0000-0000-000000000003',
    'Test: League Mode', 'TSTLEAGU',
    'ffffffff-0000-0000-0000-000000000001',
    'league', 'balanced_tier', null, 20, 'waiting', true, true,
    '{"exact_score_pts":5,"correct_winner_pts":3,"goal_difference_pts":2,"team_win_pts":4,"team_goal_pts":1,"team_clean_sheet_pts":3,"upset_base_pts":5,"streak_bonus_threshold":3,"streak_bonus_pts":2,"elo_k_factor":32,"survivor_lives":1,"weekly_reset_enabled":true}'
  ),
  (
    'ffffffff-4444-0000-0000-000000000004',
    'Test: Competitive Mode', 'TSTCMPET',
    'ffffffff-0000-0000-0000-000000000001',
    'competitive', 'snake', null, 20, 'waiting', true, true,
    '{"exact_score_pts":5,"correct_winner_pts":3,"goal_difference_pts":2,"team_win_pts":4,"team_goal_pts":1,"team_clean_sheet_pts":3,"upset_base_pts":5,"streak_bonus_threshold":3,"streak_bonus_pts":2,"elo_k_factor":32,"survivor_lives":3,"weekly_reset_enabled":true}'
  ),
  (
    'ffffffff-4444-0000-0000-000000000005',
    'Test: Global Mode', 'TSTGLOBL',
    'ffffffff-0000-0000-0000-000000000001',
    'global', 'random', null, 200, 'waiting', true, true,
    '{"exact_score_pts":5,"correct_winner_pts":3,"goal_difference_pts":2,"team_win_pts":4,"team_goal_pts":1,"team_clean_sheet_pts":3,"upset_base_pts":5,"streak_bonus_threshold":3,"streak_bonus_pts":2,"elo_k_factor":16,"survivor_lives":1,"weekly_reset_enabled":true}'
  )
ON CONFLICT (id) DO NOTHING;

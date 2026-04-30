-- ============================================================
-- Migration: Apple App Store Review — Test Group & Seed Data
-- Date: 2026-04-29
-- Depends on: 20260429_000002_apple_review_test_user.sql
--             (test@fanquin.com / Hugo Sanchez must exist)
-- Purpose: Seed a realistic World Cup 2026 group with bot members,
--          match predictions, and leaderboard data so the Apple
--          reviewer sees a fully functional app on first login.
-- Safe to re-run: all inserts are guarded by existence checks or
--                 ON CONFLICT DO NOTHING / DO UPDATE.
-- ============================================================

DO $$
DECLARE
  -- Real user
  v_hugo_id        uuid;

  -- Bot member IDs (created as auth + profile rows)
  v_bot1_id        uuid;
  v_bot2_id        uuid;
  v_bot3_id        uuid;
  v_bot4_id        uuid;

  -- Competition & group
  v_comp_id        uuid;
  v_group_id       uuid;

  -- Teams (Mexico, Argentina, Brazil, France, Germany)
  v_team_mex_id    uuid;
  v_team_arg_id    uuid;
  v_team_bra_id    uuid;
  v_team_fra_id    uuid;
  v_team_ger_id    uuid;

  -- Matches
  v_match1_id      uuid;
  v_match2_id      uuid;
  v_match3_id      uuid;
  v_match4_id      uuid;
  v_match5_id      uuid;

BEGIN

  -- ─────────────────────────────────────────────────────────
  -- 1. Resolve test user
  -- ─────────────────────────────────────────────────────────
  SELECT id INTO v_hugo_id FROM auth.users WHERE email = 'test@fanquin.com';
  IF v_hugo_id IS NULL THEN
    RAISE EXCEPTION 'test@fanquin.com not found — run 20260429_000002 first.';
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- 2. Bot users (lightweight fake members for the group)
  -- ─────────────────────────────────────────────────────────
  -- Bot 1: Carlos Vela
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'carlos.vela.bot@fanquin.com') THEN
    v_bot1_id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, role, aud)
    VALUES (v_bot1_id, '00000000-0000-0000-0000-000000000000', 'carlos.vela.bot@fanquin.com',
      '', now(), '{"provider":"email","providers":["email"]}', '{}', false, now(), now(),
      'authenticated', 'authenticated');
    INSERT INTO public.profiles (id, username, display_name, first_name, last_name, country, locale)
    VALUES (v_bot1_id, 'carlos_vela', 'Carlos Vela', 'Carlos', 'Vela', 'MX', 'es')
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  ELSE
    SELECT id INTO v_bot1_id FROM auth.users WHERE email = 'carlos.vela.bot@fanquin.com';
  END IF;

  -- Bot 2: Rodrigo Bentancur
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'rodrigo.b.bot@fanquin.com') THEN
    v_bot2_id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, role, aud)
    VALUES (v_bot2_id, '00000000-0000-0000-0000-000000000000', 'rodrigo.b.bot@fanquin.com',
      '', now(), '{"provider":"email","providers":["email"]}', '{}', false, now(), now(),
      'authenticated', 'authenticated');
    INSERT INTO public.profiles (id, username, display_name, first_name, last_name, country, locale)
    VALUES (v_bot2_id, 'rodrigo_b', 'Rodrigo Bentancur', 'Rodrigo', 'Bentancur', 'UY', 'es')
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  ELSE
    SELECT id INTO v_bot2_id FROM auth.users WHERE email = 'rodrigo.b.bot@fanquin.com';
  END IF;

  -- Bot 3: Maria Lopez
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'maria.lopez.bot@fanquin.com') THEN
    v_bot3_id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, role, aud)
    VALUES (v_bot3_id, '00000000-0000-0000-0000-000000000000', 'maria.lopez.bot@fanquin.com',
      '', now(), '{"provider":"email","providers":["email"]}', '{}', false, now(), now(),
      'authenticated', 'authenticated');
    INSERT INTO public.profiles (id, username, display_name, first_name, last_name, country, locale)
    VALUES (v_bot3_id, 'maria_lopez', 'Maria Lopez', 'Maria', 'Lopez', 'ES', 'es')
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  ELSE
    SELECT id INTO v_bot3_id FROM auth.users WHERE email = 'maria.lopez.bot@fanquin.com';
  END IF;

  -- Bot 4: Luca Moretti
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'luca.moretti.bot@fanquin.com') THEN
    v_bot4_id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, role, aud)
    VALUES (v_bot4_id, '00000000-0000-0000-0000-000000000000', 'luca.moretti.bot@fanquin.com',
      '', now(), '{"provider":"email","providers":["email"]}', '{}', false, now(), now(),
      'authenticated', 'authenticated');
    INSERT INTO public.profiles (id, username, display_name, first_name, last_name, country, locale)
    VALUES (v_bot4_id, 'luca_moretti', 'Luca Moretti', 'Luca', 'Moretti', 'IT', 'en')
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  ELSE
    SELECT id INTO v_bot4_id FROM auth.users WHERE email = 'luca.moretti.bot@fanquin.com';
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- 3. Competition: FIFA World Cup 2026
  -- ─────────────────────────────────────────────────────────
  SELECT id INTO v_comp_id
  FROM public.competitions
  WHERE type = 'world_cup' AND season = '2026' AND is_test = false
  LIMIT 1;

  IF v_comp_id IS NULL THEN
    INSERT INTO public.competitions (name, short_name, type, season, is_active, is_test)
    VALUES ('FIFA World Cup 2026', 'WC2026', 'world_cup', '2026', true, false)
    RETURNING id INTO v_comp_id;
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- 4. Teams
  -- ─────────────────────────────────────────────────────────
  INSERT INTO public.teams (id, competition_id, name, short_name, country_code, tier)
  VALUES
    (gen_random_uuid(), v_comp_id, 'Mexico',    'MEX', 'MX', 2),
    (gen_random_uuid(), v_comp_id, 'Argentina', 'ARG', 'AR', 1),
    (gen_random_uuid(), v_comp_id, 'Brazil',    'BRA', 'BR', 1),
    (gen_random_uuid(), v_comp_id, 'France',    'FRA', 'FR', 1),
    (gen_random_uuid(), v_comp_id, 'Germany',   'GER', 'DE', 1)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_team_mex_id FROM public.teams WHERE competition_id = v_comp_id AND short_name = 'MEX' LIMIT 1;
  SELECT id INTO v_team_arg_id FROM public.teams WHERE competition_id = v_comp_id AND short_name = 'ARG' LIMIT 1;
  SELECT id INTO v_team_bra_id FROM public.teams WHERE competition_id = v_comp_id AND short_name = 'BRA' LIMIT 1;
  SELECT id INTO v_team_fra_id FROM public.teams WHERE competition_id = v_comp_id AND short_name = 'FRA' LIMIT 1;
  SELECT id INTO v_team_ger_id FROM public.teams WHERE competition_id = v_comp_id AND short_name = 'GER' LIMIT 1;

  -- ─────────────────────────────────────────────────────────
  -- 5. Matches (mix of completed + upcoming)
  -- ─────────────────────────────────────────────────────────
  -- Match 1: Mexico vs Argentina (completed, ARG won 2-1)
  SELECT id INTO v_match1_id
  FROM public.matches
  WHERE competition_id = v_comp_id AND home_team_id = v_team_mex_id AND away_team_id = v_team_arg_id
  LIMIT 1;
  IF v_match1_id IS NULL THEN
    INSERT INTO public.matches (competition_id, home_team_id, away_team_id, stage,
      match_date, prediction_lock, home_score, away_score, status)
    VALUES (v_comp_id, v_team_mex_id, v_team_arg_id, 'Group Stage',
      now() - interval '10 days', now() - interval '10 days', 1, 2, 'completed')
    RETURNING id INTO v_match1_id;
  END IF;

  -- Match 2: Brazil vs France (completed, BRA won 3-1)
  SELECT id INTO v_match2_id
  FROM public.matches
  WHERE competition_id = v_comp_id AND home_team_id = v_team_bra_id AND away_team_id = v_team_fra_id
  LIMIT 1;
  IF v_match2_id IS NULL THEN
    INSERT INTO public.matches (competition_id, home_team_id, away_team_id, stage,
      match_date, prediction_lock, home_score, away_score, status)
    VALUES (v_comp_id, v_team_bra_id, v_team_fra_id, 'Group Stage',
      now() - interval '7 days', now() - interval '7 days', 3, 1, 'completed')
    RETURNING id INTO v_match2_id;
  END IF;

  -- Match 3: Germany vs Mexico (completed, GER won 2-0)
  SELECT id INTO v_match3_id
  FROM public.matches
  WHERE competition_id = v_comp_id AND home_team_id = v_team_ger_id AND away_team_id = v_team_mex_id
  LIMIT 1;
  IF v_match3_id IS NULL THEN
    INSERT INTO public.matches (competition_id, home_team_id, away_team_id, stage,
      match_date, prediction_lock, home_score, away_score, status)
    VALUES (v_comp_id, v_team_ger_id, v_team_mex_id, 'Group Stage',
      now() - interval '4 days', now() - interval '4 days', 2, 0, 'completed')
    RETURNING id INTO v_match3_id;
  END IF;

  -- Match 4: Argentina vs Brazil (upcoming — predictions still open)
  SELECT id INTO v_match4_id
  FROM public.matches
  WHERE competition_id = v_comp_id AND home_team_id = v_team_arg_id AND away_team_id = v_team_bra_id
  LIMIT 1;
  IF v_match4_id IS NULL THEN
    INSERT INTO public.matches (competition_id, home_team_id, away_team_id, stage,
      match_date, prediction_lock, status)
    VALUES (v_comp_id, v_team_arg_id, v_team_bra_id, 'Round of 16',
      now() + interval '2 days', now() + interval '1 day 20 hours', 'scheduled')
    RETURNING id INTO v_match4_id;
  END IF;

  -- Match 5: France vs Germany (upcoming)
  SELECT id INTO v_match5_id
  FROM public.matches
  WHERE competition_id = v_comp_id AND home_team_id = v_team_fra_id AND away_team_id = v_team_ger_id
  LIMIT 1;
  IF v_match5_id IS NULL THEN
    INSERT INTO public.matches (competition_id, home_team_id, away_team_id, stage,
      match_date, prediction_lock, status)
    VALUES (v_comp_id, v_team_fra_id, v_team_ger_id, 'Round of 16',
      now() + interval '4 days', now() + interval '3 days 20 hours', 'scheduled')
    RETURNING id INTO v_match5_id;
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- 6. Test Group
  -- ─────────────────────────────────────────────────────────
  SELECT id INTO v_group_id
  FROM public.groups
  WHERE owner_id = v_hugo_id AND name = 'Amigos del Mundial 🌍' AND is_test = true
  LIMIT 1;

  IF v_group_id IS NULL THEN
    INSERT INTO public.groups (
      name, invite_code, competition_id, mode, draft_type,
      owner_id, max_members, status, is_test,
      started_at, draft_started_at
    ) VALUES (
      'Amigos del Mundial 🌍',
      'APPLE26',
      v_comp_id,
      'friends',
      'snake',
      v_hugo_id,
      50,
      'active',
      true,                          -- hidden from public lists
      now() - interval '12 days',
      now() - interval '13 days'
    )
    RETURNING id INTO v_group_id;
  END IF;

  -- ─────────────────────────────────────────────────────────
  -- 7. Group Members (with realistic points for leaderboard)
  -- ─────────────────────────────────────────────────────────
  -- Hugo Sanchez: 2nd place
  INSERT INTO public.group_members
    (group_id, user_id, role, total_points, prediction_pts, ownership_pts,
     current_streak, best_streak, weekly_pts, elo_rating, rank)
  VALUES
    (v_group_id, v_hugo_id,  'admin',  34, 22, 12, 2, 3, 34, 1048, 2)
  ON CONFLICT (group_id, user_id) DO UPDATE SET
    total_points   = EXCLUDED.total_points,
    prediction_pts = EXCLUDED.prediction_pts,
    ownership_pts  = EXCLUDED.ownership_pts,
    rank           = EXCLUDED.rank;

  -- Carlos Vela: 1st place
  INSERT INTO public.group_members
    (group_id, user_id, role, total_points, prediction_pts, ownership_pts,
     current_streak, best_streak, weekly_pts, elo_rating, rank)
  VALUES
    (v_group_id, v_bot1_id, 'member', 41, 28, 13, 3, 3, 41, 1064, 1)
  ON CONFLICT (group_id, user_id) DO UPDATE SET
    total_points   = EXCLUDED.total_points,
    prediction_pts = EXCLUDED.prediction_pts,
    ownership_pts  = EXCLUDED.ownership_pts,
    rank           = EXCLUDED.rank;

  -- Rodrigo Bentancur: 3rd place
  INSERT INTO public.group_members
    (group_id, user_id, role, total_points, prediction_pts, ownership_pts,
     current_streak, best_streak, weekly_pts, elo_rating, rank)
  VALUES
    (v_group_id, v_bot2_id, 'member', 27, 18,  9, 1, 2, 27, 1022, 3)
  ON CONFLICT (group_id, user_id) DO UPDATE SET
    total_points   = EXCLUDED.total_points,
    prediction_pts = EXCLUDED.prediction_pts,
    ownership_pts  = EXCLUDED.ownership_pts,
    rank           = EXCLUDED.rank;

  -- Maria Lopez: 4th place
  INSERT INTO public.group_members
    (group_id, user_id, role, total_points, prediction_pts, ownership_pts,
     current_streak, best_streak, weekly_pts, elo_rating, rank)
  VALUES
    (v_group_id, v_bot3_id, 'member', 19, 12,  7, 0, 2, 19, 1008, 4)
  ON CONFLICT (group_id, user_id) DO UPDATE SET
    total_points   = EXCLUDED.total_points,
    prediction_pts = EXCLUDED.prediction_pts,
    ownership_pts  = EXCLUDED.ownership_pts,
    rank           = EXCLUDED.rank;

  -- Luca Moretti: 5th place
  INSERT INTO public.group_members
    (group_id, user_id, role, total_points, prediction_pts, ownership_pts,
     current_streak, best_streak, weekly_pts, elo_rating, rank)
  VALUES
    (v_group_id, v_bot4_id, 'member', 12,  8,  4, 0, 1, 12,  980, 5)
  ON CONFLICT (group_id, user_id) DO UPDATE SET
    total_points   = EXCLUDED.total_points,
    prediction_pts = EXCLUDED.prediction_pts,
    ownership_pts  = EXCLUDED.ownership_pts,
    rank           = EXCLUDED.rank;

  -- ─────────────────────────────────────────────────────────
  -- 8. Team Ownership (draft assignments)
  -- ─────────────────────────────────────────────────────────
  INSERT INTO public.team_ownership
    (group_id, user_id, team_id, draft_pick, wins_pts, goals_pts, clean_sheet_pts, total_pts)
  VALUES
    (v_group_id, v_hugo_id,  v_team_mex_id, 1,  4, 2, 3,  9),
    (v_group_id, v_bot1_id,  v_team_arg_id, 2,  8, 4, 0, 12),
    (v_group_id, v_bot2_id,  v_team_bra_id, 3,  8, 4, 3, 15),  -- updated after match 2
    (v_group_id, v_bot3_id,  v_team_fra_id, 4,  0, 2, 0,  2),
    (v_group_id, v_bot4_id,  v_team_ger_id, 5,  4, 0, 3,  7)
  ON CONFLICT (group_id, team_id) DO UPDATE SET
    wins_pts        = EXCLUDED.wins_pts,
    goals_pts       = EXCLUDED.goals_pts,
    clean_sheet_pts = EXCLUDED.clean_sheet_pts,
    total_pts       = EXCLUDED.total_pts;

  -- ─────────────────────────────────────────────────────────
  -- 9. Team Match Events (for completed matches)
  -- ─────────────────────────────────────────────────────────
  -- Match 1: MEX 1-2 ARG
  INSERT INTO public.team_match_events (match_id, team_id, goals_scored, clean_sheet, won)
  VALUES
    (v_match1_id, v_team_mex_id, 1, false, false),
    (v_match1_id, v_team_arg_id, 2, false, true)
  ON CONFLICT (match_id, team_id) DO NOTHING;

  -- Match 2: BRA 3-1 FRA
  INSERT INTO public.team_match_events (match_id, team_id, goals_scored, clean_sheet, won)
  VALUES
    (v_match2_id, v_team_bra_id, 3, false, true),
    (v_match2_id, v_team_fra_id, 1, false, false)
  ON CONFLICT (match_id, team_id) DO NOTHING;

  -- Match 3: GER 2-0 MEX
  INSERT INTO public.team_match_events (match_id, team_id, goals_scored, clean_sheet, won)
  VALUES
    (v_match3_id, v_team_ger_id, 2, false, true),
    (v_match3_id, v_team_mex_id, 0, true,  false)
  ON CONFLICT (match_id, team_id) DO NOTHING;

  -- ─────────────────────────────────────────────────────────
  -- 10. Predictions (Hugo's predictions for all 3 completed matches)
  -- ─────────────────────────────────────────────────────────
  -- Match 1: Hugo predicted MEX 1-2 ARG → correct_winner (3pts)
  INSERT INTO public.predictions
    (group_id, user_id, match_id, predicted_home, predicted_away,
     result, points_earned, bonus_pts, details)
  VALUES
    (v_group_id, v_hugo_id, v_match1_id, 1, 2, 'correct_winner', 3, 0, '{}')
  ON CONFLICT (group_id, user_id, match_id) DO UPDATE SET
    result = EXCLUDED.result, points_earned = EXCLUDED.points_earned;

  -- Match 2: Hugo predicted BRA 3-1 FRA → exact_score (5pts)
  INSERT INTO public.predictions
    (group_id, user_id, match_id, predicted_home, predicted_away,
     result, points_earned, bonus_pts, details)
  VALUES
    (v_group_id, v_hugo_id, v_match2_id, 3, 1, 'exact_score', 5, 0, '{}')
  ON CONFLICT (group_id, user_id, match_id) DO UPDATE SET
    result = EXCLUDED.result, points_earned = EXCLUDED.points_earned;

  -- Match 3: Hugo predicted GER 1-0 MEX → goal_difference (2pts)
  INSERT INTO public.predictions
    (group_id, user_id, match_id, predicted_home, predicted_away,
     result, points_earned, bonus_pts, details)
  VALUES
    (v_group_id, v_hugo_id, v_match3_id, 1, 0, 'goal_difference', 2, 0, '{}')
  ON CONFLICT (group_id, user_id, match_id) DO UPDATE SET
    result = EXCLUDED.result, points_earned = EXCLUDED.points_earned;

  -- Bot predictions for match 1
  INSERT INTO public.predictions (group_id, user_id, match_id, predicted_home, predicted_away, result, points_earned, bonus_pts, details)
  VALUES
    (v_group_id, v_bot1_id, v_match1_id, 0, 2, 'correct_winner',  3, 0, '{}'),
    (v_group_id, v_bot2_id, v_match1_id, 2, 1, 'incorrect',        0, 0, '{}'),
    (v_group_id, v_bot3_id, v_match1_id, 1, 1, 'incorrect',        0, 0, '{}'),
    (v_group_id, v_bot4_id, v_match1_id, 1, 2, 'correct_winner',  3, 0, '{}')
  ON CONFLICT (group_id, user_id, match_id) DO NOTHING;

  -- Bot predictions for match 2
  INSERT INTO public.predictions (group_id, user_id, match_id, predicted_home, predicted_away, result, points_earned, bonus_pts, details)
  VALUES
    (v_group_id, v_bot1_id, v_match2_id, 3, 1, 'exact_score',     5, 0, '{}'),
    (v_group_id, v_bot2_id, v_match2_id, 2, 0, 'correct_winner',  3, 0, '{}'),
    (v_group_id, v_bot3_id, v_match2_id, 1, 2, 'incorrect',        0, 0, '{}'),
    (v_group_id, v_bot4_id, v_match2_id, 2, 1, 'correct_winner',  3, 0, '{}')
  ON CONFLICT (group_id, user_id, match_id) DO NOTHING;

  -- Bot predictions for match 3
  INSERT INTO public.predictions (group_id, user_id, match_id, predicted_home, predicted_away, result, points_earned, bonus_pts, details)
  VALUES
    (v_group_id, v_bot1_id, v_match3_id, 2, 0, 'exact_score',     5, 0, '{}'),
    (v_group_id, v_bot2_id, v_match3_id, 3, 0, 'correct_winner',  3, 0, '{}'),
    (v_group_id, v_bot3_id, v_match3_id, 1, 1, 'incorrect',        0, 0, '{}'),
    (v_group_id, v_bot4_id, v_match3_id, 0, 1, 'incorrect',        0, 0, '{}')
  ON CONFLICT (group_id, user_id, match_id) DO NOTHING;

  -- ─────────────────────────────────────────────────────────
  -- 11. Weekly Leaderboard Snapshot (week 1, for history card)
  -- ─────────────────────────────────────────────────────────
  INSERT INTO public.leaderboard_snapshots
    (group_id, user_id, week_number, rank, total_points, prediction_pts, ownership_pts)
  VALUES
    (v_group_id, v_bot1_id, 1, 1, 41, 28, 13),
    (v_group_id, v_hugo_id, 1, 2, 34, 22, 12),
    (v_group_id, v_bot2_id, 1, 3, 27, 18,  9),
    (v_group_id, v_bot3_id, 1, 4, 19, 12,  7),
    (v_group_id, v_bot4_id, 1, 5, 12,  8,  4)
  ON CONFLICT DO NOTHING;

  -- ─────────────────────────────────────────────────────────
  -- 12. Weekly Rivalry: Hugo vs Carlos (week 1, completed)
  -- ─────────────────────────────────────────────────────────
  INSERT INTO public.rivalries
    (group_id, player_a_id, player_b_id, week_number, competition_id,
     player_a_pts, player_b_pts, winner_id, status)
  VALUES
    (v_group_id, v_hugo_id, v_bot1_id, 1, v_comp_id,
     22, 28, v_bot1_id, 'completed')
  ON CONFLICT (group_id, player_a_id, player_b_id, week_number) DO NOTHING;

  RAISE NOTICE 'Apple review test data seeded for group "Amigos del Mundial 🌍" (id: %)', v_group_id;

END $$;

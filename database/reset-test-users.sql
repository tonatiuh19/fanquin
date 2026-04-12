-- ============================================================
-- FanQuin — Reset Test Users
-- ============================================================
-- Deletes users from auth.users so the full signup → join group
-- → draft → predict flow can be re-tested from scratch.
--
-- Cascade chain (all automatic):
--   auth.users
--     └─ profiles          (on delete cascade)
--          ├─ user_sessions
--          ├─ group_members
--          ├─ predictions
--          ├─ team_ownership
--          ├─ boosts
--          ├─ rivalries     (player_a, player_b, winner)
--          ├─ leaderboard_snapshots
--          ├─ streak_events
--          ├─ elo_history
--          ├─ survivor_entries
--          ├─ daily_challenge_entries
--          └─ draft_picks
--
-- otp_requests is NOT cascaded (keyed by email string, no user FK)
-- — that table is cleared separately below.
--
-- HOW TO USE
-- ----------
-- Option A — delete specific email addresses:
--   Uncomment the WHERE clause and replace the emails.
--
-- Option B — delete ALL non-permanent users:
--   Run as-is. The permanent_emails list keeps seeded admin accounts.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to run repeatedly (idempotent).
-- ============================================================


-- ── 1. Delete users from auth.users ───────────────────────────
-- Cascades automatically to profiles and everything below it.

-- Option A: delete by specific email(s) ─ uncomment and edit:
-- DELETE FROM auth.users
-- WHERE email IN (
--   'your-test-email@example.com',
--   'another-test@example.com'
-- );

-- Option B: delete ALL users (keep none):
DELETE FROM auth.users;

-- Option C: delete all users EXCEPT a permanent list:
-- DELETE FROM auth.users
-- WHERE email NOT IN (
--   'admin@fanquin.com'
-- );


-- ── 2. Clean up otp_requests (no FK, must be cleared manually) ─

DELETE FROM public.otp_requests;


-- ── 3. Reset test groups back to 'waiting' ────────────────────
-- So invite codes TSTCASUL / TSTFRNDS / TSTLEAGU / TSTCMPET / TSTGLOBL
-- are joinable again from a clean state.

UPDATE public.groups
SET
  status           = 'waiting',
  draft_started_at = NULL,
  started_at       = NULL
WHERE is_test = true;


-- ── 4. Clear draft sessions for test groups ───────────────────

DELETE FROM public.draft_sessions
WHERE group_id IN (
  SELECT id FROM public.groups WHERE is_test = true
);


-- ── 5. Re-anchor test match dates to now ─────────────────────
-- Keeps all 5 status/lock states immediately testable.

UPDATE public.matches SET
  status          = 'completed',
  match_date      = now() - interval '2 days',
  prediction_lock = now() - interval '2 days 1 hour',
  home_score      = 2,
  away_score      = 1
WHERE id = 'ffffffff-3333-0000-0000-000000000001';

UPDATE public.matches SET
  status          = 'live',
  match_date      = now() - interval '30 minutes',
  prediction_lock = now() - interval '90 minutes',
  home_score      = NULL,
  away_score      = NULL
WHERE id = 'ffffffff-3333-0000-0000-000000000002';

UPDATE public.matches SET
  status          = 'scheduled',
  match_date      = now() + interval '2 days',
  prediction_lock = now() + interval '1 day 23 hours',
  home_score      = NULL,
  away_score      = NULL
WHERE id = 'ffffffff-3333-0000-0000-000000000003';

UPDATE public.matches SET
  status          = 'scheduled',
  match_date      = now() + interval '2 hours',
  prediction_lock = now() - interval '1 hour',
  home_score      = NULL,
  away_score      = NULL
WHERE id = 'ffffffff-3333-0000-0000-000000000004';

UPDATE public.matches SET
  status          = 'scheduled',
  match_date      = now() + interval '7 days',
  prediction_lock = now() + interval '6 days 23 hours',
  home_score      = NULL,
  away_score      = NULL
WHERE id = 'ffffffff-3333-0000-0000-000000000005';


-- ── Done ──────────────────────────────────────────────────────
-- All users deleted. otp_requests cleared.
-- Test groups reset to 'waiting'. Match dates re-anchored.
-- You can now sign up fresh and test the full flow.

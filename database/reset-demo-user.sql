-- ============================================================
-- FanQuin — Reset Demo User (demo@fanquin.com)
-- ============================================================
-- Deletes the demo user from auth.users so the full signup →
-- join group → draft → predict flow can be re-tested from scratch.
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
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to run repeatedly (idempotent).
-- ============================================================


-- ── 1. Delete the demo user from auth.users ───────────────────
-- Cascades automatically to profiles and everything below it.

DELETE FROM auth.users
WHERE email = 'demo@fanquin.com';


-- ── 2. Clean up otp_requests for this email ───────────────────

DELETE FROM public.otp_requests
WHERE identifier = 'demo@fanquin.com';


-- ── Done ──────────────────────────────────────────────────────
-- demo@fanquin.com has been fully removed.
-- You can now sign up fresh with this email and test the full flow.

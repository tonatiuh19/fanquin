-- ============================================================
-- Migration: 20260429_000000_profile_deactivation
-- Adds self-service account deactivation columns to profiles.
-- Users can soft-deactivate their own account with an optional
-- reason. The row is retained for compliance/recovery.
-- ============================================================

-- 1. Add deactivation columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at   timestamptz,
  ADD COLUMN IF NOT EXISTS deactivation_reason text;

-- 2. Index for admin queries filtering active/inactive users
CREATE INDEX IF NOT EXISTS idx_profiles_deactivated_at
  ON public.profiles (deactivated_at)
  WHERE deactivated_at IS NOT NULL;

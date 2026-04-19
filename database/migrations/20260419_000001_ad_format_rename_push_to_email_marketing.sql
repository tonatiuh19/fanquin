-- ============================================================
-- Migration: 20260419_000001_ad_format_rename_push_to_email_marketing
-- Renames the 'push_notification' value in the ad_format enum
-- to 'email_marketing'. Existing rows are updated automatically.
-- Requires PostgreSQL 10+ (Supabase runs 15).
-- ============================================================

ALTER TYPE ad_format RENAME VALUE 'push_notification' TO 'email_marketing';

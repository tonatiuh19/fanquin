-- ============================================================
-- Migration: Add 'ownership' group mode
-- Date: 2026-04-13
-- Description: Adds a new 'ownership' mode to the group_mode enum.
-- In ownership mode players only earn points from their drafted teams
-- (wins, goals, clean sheets). No predictions are made.
-- ============================================================

ALTER TYPE group_mode ADD VALUE IF NOT EXISTS 'ownership';

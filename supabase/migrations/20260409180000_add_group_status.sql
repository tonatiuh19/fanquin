-- Migration: add group_status enum and status column to groups
-- Date: 2026-04-09

-- Create enum for group lifecycle
create type group_status as enum ('waiting', 'draft', 'active', 'completed');

-- Add status column with default 'waiting'
alter table public.groups
  add column status group_status not null default 'waiting';

-- Add draft_started_at and started_at timestamps
alter table public.groups
  add column draft_started_at timestamptz,
  add column started_at       timestamptz;

-- Backfill: existing active groups stay 'waiting' (owner needs to start them)
-- Groups that are not active go to 'completed'
update public.groups
  set status = 'completed'
  where is_active = false;

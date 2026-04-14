-- Migration: add auto_pick flag to group_members
-- Allows admins to enable automatic picking on behalf of absent members
-- during live snake draft sessions.

alter table public.group_members
  add column if not exists auto_pick boolean not null default false;

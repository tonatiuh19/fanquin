-- Migration: async offline draft system
-- Date: 2026-04-09

-- ============================================================
-- DRAFT SESSIONS
-- One row per group; tracks which pick we're on and deadline
-- ============================================================
create table if not exists public.draft_sessions (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid unique not null references public.groups(id) on delete cascade,
  member_order    uuid[] not null,        -- member user IDs in draft order (shuffled)
  current_pick    int not null default 0, -- 0-indexed overall pick counter
  total_picks     int not null,           -- total teams to draft (= available teams count)
  pick_deadline   timestamptz,            -- when current picker's window expires (null = no timer for now)
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- DRAFT PICKS
-- One row per pick made; complements team_ownership
-- ============================================================
create table if not exists public.draft_picks (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  team_id         uuid not null references public.teams(id) on delete cascade,
  pick_number     int not null,           -- 0-indexed overall pick number
  round           int not null,           -- 1-based round number
  auto_picked     boolean default false,  -- true if server auto-picked after timeout
  picked_at       timestamptz default now(),
  unique(group_id, pick_number),
  unique(group_id, team_id)               -- one owner per team per group
);

-- ============================================================
-- INDEXES
-- ============================================================
create index on public.draft_sessions (group_id);
create index on public.draft_picks (group_id, pick_number);
create index on public.draft_picks (group_id, user_id);

-- ============================================================
-- FanQuin — Supabase Schema
-- Social fantasy/quiniela prediction platform
-- Supports: World Cup 2026 → multi-league expansion
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type group_mode as enum ('casual', 'friends', 'league', 'competitive', 'global');
create type draft_type as enum ('snake', 'random', 'balanced_tier');
create type boost_type as enum ('double_points', 'underdog_boost', 'last_minute_change', 'streak_insurance');
create type prediction_result as enum ('pending', 'exact_score', 'correct_winner', 'goal_difference', 'incorrect');
create type rivalry_status as enum ('active', 'completed', 'tied');
create type match_status as enum ('scheduled', 'live', 'completed', 'cancelled');
create type competition_type as enum ('world_cup', 'champions_league', 'premier_league', 'liga_mx', 'nba', 'nfl', 'other');

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text,
  avatar_url    text,
  locale        text default 'en',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- AUTH: OTP CODES & USER SESSIONS
-- ============================================================

-- OTP request log — rate-limiting, verification audit trail.
-- Codes are NEVER stored in plaintext; code_hash uses pgcrypto crypt().
create table public.otp_requests (
  id              uuid primary key default gen_random_uuid(),
  identifier      text not null,                    -- email address or phone number
  delivery_method text not null                     -- 'email' | 'sms'
                    constraint otp_delivery_check check (delivery_method in ('email', 'sms')),
  code_hash       text not null,                    -- crypt(code, gen_salt('bf')) — never plain-text
  expires_at      timestamptz not null default now() + interval '10 minutes',
  verified_at     timestamptz,                      -- set on successful match
  attempt_count   int default 0,                    -- incremented per failed verify (blocked at 5)
  is_used         boolean default false,            -- true after first successful verification
  ip_address      inet,                             -- request origin for rate-limiting by IP
  created_at      timestamptz default now()
);

-- Active user sessions — one row per authenticated device.
-- The raw token lives only on the client; this table holds its hash.
create table public.user_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  token_hash      text unique not null,             -- crypt(raw_token, gen_salt('bf'))
  delivery_method text                              -- how the user originally authenticated
                    check (delivery_method in ('email', 'sms')),
  device_info     jsonb,                            -- { platform, browser, os, app_version }
  ip_address      inet,
  last_seen_at    timestamptz default now(),
  expires_at      timestamptz not null default now() + interval '30 days',
  revoked_at      timestamptz,                      -- null = active; set on logout / admin revoke
  created_at      timestamptz default now()
);

-- ============================================================
-- COMPETITIONS & TOURNAMENTS
-- ============================================================

create table public.competitions (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  short_name      text,
  type            competition_type not null,
  season          text not null,              -- e.g. "2026"
  starts_at       timestamptz,
  ends_at         timestamptz,
  is_active       boolean default true,
  logo_url        text,
  created_at      timestamptz default now()
);

-- ============================================================
-- TEAMS
-- ============================================================

create table public.teams (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid references public.competitions(id) on delete cascade,
  name            text not null,
  short_name      text,
  country_code    text,                       -- ISO 3166-1 alpha-2
  flag_url        text,
  tier            int default 1,              -- 1 = top, 2 = mid, 3 = underdog
  created_at      timestamptz default now()
);

-- ============================================================
-- MATCHES
-- ============================================================

create table public.matches (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid references public.competitions(id) on delete cascade,
  home_team_id    uuid references public.teams(id),
  away_team_id    uuid references public.teams(id),
  stage           text,                       -- "Group Stage", "Quarter-Final", etc.
  match_date      timestamptz not null,
  prediction_lock timestamptz,               -- predictions close at this time
  home_score      int,
  away_score      int,
  status          match_status default 'scheduled',
  -- Upset bonus: recomputed after lock as BasePoints * (1 / pick_pct)
  upset_multiplier  numeric(4,2) default 1.0,
  home_win_pick_pct numeric(5,4),            -- % of pickers who chose home win
  away_win_pick_pct numeric(5,4),
  draw_pick_pct     numeric(5,4),
  total_picks       int default 0,
  created_at      timestamptz default now()
);

-- ============================================================
-- GROUPS (private play circles)
-- ============================================================

create table public.groups (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  invite_code     text unique not null default substr(md5(random()::text), 1, 8),
  competition_id  uuid references public.competitions(id) on delete cascade,
  mode            group_mode not null default 'friends',
  draft_type      draft_type default 'snake',
  owner_id        uuid references public.profiles(id),
  max_members     int default 50,
  scoring_config  jsonb default '{
    "exact_score_pts": 5,
    "correct_winner_pts": 3,
    "goal_difference_pts": 2,
    "team_win_pts": 4,
    "team_goal_pts": 1,
    "team_clean_sheet_pts": 3,
    "upset_base_pts": 5,
    "streak_bonus_threshold": 3,
    "streak_bonus_pts": 2,
    "elo_k_factor": 32,
    "survivor_lives": 1,
    "weekly_reset_enabled": true
  }',
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================

create table public.group_members (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references public.groups(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  role            text default 'member',     -- 'admin' | 'member'
  total_points    int default 0,
  prediction_pts  int default 0,
  ownership_pts   int default 0,             -- team win + goals + clean sheets
  current_streak  int default 0,
  best_streak     int default 0,
  weekly_pts      int default 0,
  elo_rating      int default 1000,          -- used in league/competitive modes
  survivor_lives  int default 1,             -- used in competitive mode
  is_eliminated   boolean default false,     -- survivor mode
  rank            int,
  joined_at       timestamptz default now(),
  unique(group_id, user_id)
);

-- ============================================================
-- TEAM OWNERSHIP (draft assignments)
-- ============================================================

create table public.team_ownership (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references public.groups(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  team_id         uuid references public.teams(id) on delete cascade,
  draft_pick      int,                        -- pick order in snake draft
  -- Running ownership score breakdown (updated after each match)
  wins_pts        int default 0,             -- team_win_pts * number of wins
  goals_pts       int default 0,             -- team_goal_pts * goals scored
  clean_sheet_pts int default 0,             -- team_clean_sheet_pts * clean sheets
  total_pts       int default 0,             -- wins_pts + goals_pts + clean_sheet_pts
  assigned_at     timestamptz default now(),
  unique(group_id, team_id)                  -- one owner per team per group
);

-- ============================================================
-- TEAM MATCH EVENTS
-- Records goal/clean-sheet events to calculate ownership points
-- ============================================================

create table public.team_match_events (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid references public.matches(id) on delete cascade,
  team_id         uuid references public.teams(id) on delete cascade,
  goals_scored    int default 0,
  clean_sheet     boolean default false,
  won             boolean default false,
  created_at      timestamptz default now(),
  unique(match_id, team_id)
);

-- ============================================================
-- PREDICTIONS
-- ============================================================

create table public.predictions (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references public.groups(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  match_id        uuid references public.matches(id) on delete cascade,
  predicted_home  int not null,
  predicted_away  int not null,
  result          prediction_result default 'pending',
  points_earned   int default 0,
  upset_pts       int default 0,
  submitted_at    timestamptz default now(),
  unique(group_id, user_id, match_id)        -- one prediction per user per match per group
);

-- ============================================================
-- BOOSTS / POWER-UPS
-- ============================================================

create table public.boosts (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references public.groups(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  boost_type      boost_type not null,
  match_id        uuid references public.matches(id),  -- null = unplayed
  applied_at      timestamptz,
  expires_at      timestamptz,
  is_used         boolean default false,
  created_at      timestamptz default now()
);

-- ============================================================
-- WEEKLY RIVALRIES (1v1 head-to-head per week)
-- ============================================================

create table public.rivalries (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references public.groups(id) on delete cascade,
  player_a_id     uuid references public.profiles(id),
  player_b_id     uuid references public.profiles(id),
  week_number     int not null,
  competition_id  uuid references public.competitions(id),
  player_a_pts    int default 0,
  player_b_pts    int default 0,
  winner_id       uuid references public.profiles(id),  -- null while active
  status          rivalry_status default 'active',
  created_at      timestamptz default now(),
  unique(group_id, player_a_id, player_b_id, week_number)
);

-- ============================================================
-- WEEKLY LEADERBOARD SNAPSHOTS
-- (stored for historical replay & viral share cards)
-- ============================================================

create table public.leaderboard_snapshots (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references public.groups(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  week_number     int not null,
  rank            int not null,
  total_points    int not null,
  prediction_pts  int not null,
  ownership_pts   int not null,
  snapshot_at     timestamptz default now()
);

-- ============================================================
-- STREAK EVENTS LOG (for audit & viral moments)
-- ============================================================

create table public.streak_events (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references public.groups(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  streak_length   int not null,
  broken          boolean default false,
  occurred_at     timestamptz default now()
);

-- ============================================================
-- ELO RATING HISTORY (league / competitive modes)
-- ============================================================

create table public.elo_history (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references public.groups(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  match_id        uuid references public.matches(id),
  week_number     int,
  elo_before      int not null,
  elo_after       int not null,
  delta           int generated always as (elo_after - elo_before) stored,
  recorded_at     timestamptz default now()
);

-- ============================================================
-- SURVIVOR ROUNDS (competitive / global modes)
-- Each round users must get at least one correct prediction
-- or lose a life. Eliminated when lives = 0.
-- ============================================================

create table public.survivor_rounds (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references public.groups(id) on delete cascade,
  round_number    int not null,
  week_number     int not null,
  started_at      timestamptz,
  ended_at        timestamptz,
  unique(group_id, round_number)
);

create table public.survivor_entries (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references public.groups(id) on delete cascade,
  round_id        uuid references public.survivor_rounds(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  survived        boolean,                   -- null while round is active
  lives_remaining int default 1,
  eliminated_at   timestamptz,
  unique(round_id, user_id)
);

-- ============================================================
-- BRACKETS (competitive / global modes)
-- ============================================================

create table public.brackets (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references public.groups(id) on delete cascade,
  name            text not null,
  round           int not null default 1,
  created_at      timestamptz default now()
);

create table public.bracket_matchups (
  id              uuid primary key default gen_random_uuid(),
  bracket_id      uuid references public.brackets(id) on delete cascade,
  player_a_id     uuid references public.profiles(id),
  player_b_id     uuid references public.profiles(id),
  player_a_pts    int default 0,
  player_b_pts    int default 0,
  winner_id       uuid references public.profiles(id),
  next_matchup_id uuid references public.bracket_matchups(id), -- bracket progression
  position        int,
  created_at      timestamptz default now()
);

-- ============================================================
-- DAILY CHALLENGES (global mode)
-- ============================================================

create table public.daily_challenges (
  id              uuid primary key default gen_random_uuid(),
  competition_id  uuid references public.competitions(id),
  title           text not null,
  description     text,
  challenge_date  date not null,
  bonus_pts       int default 5,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  unique(competition_id, challenge_date)
);

create table public.daily_challenge_entries (
  id              uuid primary key default gen_random_uuid(),
  challenge_id    uuid references public.daily_challenges(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  answer          jsonb,                     -- flexible per challenge type
  pts_earned      int default 0,
  submitted_at    timestamptz default now(),
  unique(challenge_id, user_id)
);

-- ============================================================
-- NOTIFICATIONS (in-app, push-ready)
-- ============================================================

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade,
  type            text not null,             -- 'lock_reminder'|'rivalry_result'|'rank_swing'|'boost_ready'|'streak_broken'
  title           text not null,
  body            text,
  metadata        jsonb,
  is_read         boolean default false,
  created_at      timestamptz default now()
);

-- ============================================================
-- VENUES TABLE (stadiums with city/country/capacity)
-- ============================================================

create table public.venues (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  city         text not null,
  country      text not null,
  country_code text,
  capacity     int,
  latitude     numeric(9,6),
  longitude    numeric(9,6),
  created_at   timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index on public.matches (competition_id, match_date);
create index on public.matches (status);
create index on public.predictions (group_id, match_id);
create index on public.predictions (user_id, group_id);
create index on public.group_members (group_id, total_points desc);
create index on public.group_members (user_id);
create index on public.team_ownership (group_id, user_id);
create index on public.team_ownership (group_id, team_id);
create index on public.team_match_events (match_id);
create index on public.team_match_events (team_id);
create index on public.boosts (user_id, group_id, is_used);
create index on public.rivalries (group_id, week_number);
create index on public.notifications (user_id, is_read, created_at desc);
create index on public.elo_history (group_id, user_id);
create index on public.survivor_entries (group_id, user_id);
create index on public.bracket_matchups (bracket_id);
create index on public.daily_challenges (competition_id, challenge_date);
create index on public.daily_challenge_entries (challenge_id, user_id);
-- OTP + sessions
create index on public.otp_requests (identifier, created_at desc);
create index on public.otp_requests (expires_at) where not is_used;
create index on public.user_sessions (user_id) where revoked_at is null;
create index on public.user_sessions (token_hash);
create index on public.user_sessions (expires_at) where revoked_at is null;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.otp_requests enable row level security;
alter table public.user_sessions enable row level security;
alter table public.competitions enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.team_ownership enable row level security;
alter table public.team_match_events enable row level security;
alter table public.predictions enable row level security;
alter table public.boosts enable row level security;
alter table public.rivalries enable row level security;
alter table public.leaderboard_snapshots enable row level security;
alter table public.notifications enable row level security;
alter table public.streak_events enable row level security;
alter table public.elo_history enable row level security;
alter table public.survivor_rounds enable row level security;
alter table public.survivor_entries enable row level security;
alter table public.brackets enable row level security;
alter table public.bracket_matchups enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.daily_challenge_entries enable row level security;
alter table public.venues enable row level security;

-- Profiles: users can read all, only update own
create policy "Profiles are publicly readable"
  on public.profiles for select using (true);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- OTP requests: no client-facing policies (server-only via service_role key)
-- user_sessions: users can view and revoke their own active sessions
create policy "Users can view own sessions"
  on public.user_sessions for select using (auth.uid() = user_id);
create policy "Users can revoke own sessions"
  on public.user_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Groups: public read, only members can interact
create policy "Groups are publicly readable"
  on public.groups for select using (true);
create policy "Authenticated users can create groups"
  on public.groups for insert with check (auth.uid() = owner_id);
create policy "Group owner can update"
  on public.groups for update using (auth.uid() = owner_id);

-- Group members: visible to group members only
create policy "Group members can see their group"
  on public.group_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = auth.uid()
    )
  );
create policy "Users can join groups"
  on public.group_members for insert with check (auth.uid() = user_id);

-- Team ownership: visible to group members
create policy "Team ownership visible to group members"
  on public.team_ownership for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = team_ownership.group_id
        and gm.user_id = auth.uid()
    )
  );

-- Predictions: only group members
create policy "Predictions visible to group members"
  on public.predictions for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = predictions.group_id
        and gm.user_id = auth.uid()
    )
  );
create policy "Users submit own predictions"
  on public.predictions for insert with check (auth.uid() = user_id);
create policy "Users update own predictions before lock"
  on public.predictions for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.prediction_lock is null or m.prediction_lock > now())
    )
  );

-- Boosts: user-scoped
create policy "Users see own boosts"
  on public.boosts for select using (auth.uid() = user_id);
create policy "Users can use own boosts"
  on public.boosts for update using (auth.uid() = user_id);

-- Notifications: user-scoped
create policy "Users see own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Users can mark notifications read"
  on public.notifications for update using (auth.uid() = user_id);

-- Rivalries: group members
create policy "Rivalries visible to group members"
  on public.rivalries for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = rivalries.group_id
        and gm.user_id = auth.uid()
    )
  );

-- Leaderboard snapshots: group members
create policy "Snapshots visible to group members"
  on public.leaderboard_snapshots for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = leaderboard_snapshots.group_id
        and gm.user_id = auth.uid()
    )
  );

-- Streak events: group members
create policy "Streak events visible to group members"
  on public.streak_events for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = streak_events.group_id
        and gm.user_id = auth.uid()
    )
  );

-- Reference data: publicly readable (no sensitive data)
create policy "Competitions are publicly readable"
  on public.competitions for select using (true);
create policy "Teams are publicly readable"
  on public.teams for select using (true);
create policy "Matches are publicly readable"
  on public.matches for select using (true);
create policy "Venues are publicly readable"
  on public.venues for select using (true);
create policy "Team match events are publicly readable"
  on public.team_match_events for select using (true);

-- ELO history: group members
create policy "ELO history visible to group members"
  on public.elo_history for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = elo_history.group_id
        and gm.user_id = auth.uid()
    )
  );

-- Survivor rounds: group members
create policy "Survivor rounds visible to group members"
  on public.survivor_rounds for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = survivor_rounds.group_id
        and gm.user_id = auth.uid()
    )
  );

-- Survivor entries: group members
create policy "Survivor entries visible to group members"
  on public.survivor_entries for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = survivor_entries.group_id
        and gm.user_id = auth.uid()
    )
  );

-- Brackets: group members
create policy "Brackets visible to group members"
  on public.brackets for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = brackets.group_id
        and gm.user_id = auth.uid()
    )
  );
create policy "Bracket matchups visible to group members"
  on public.bracket_matchups for select
  using (
    exists (
      select 1 from public.brackets b
      join public.group_members gm on gm.group_id = b.group_id
      where b.id = bracket_matchups.bracket_id
        and gm.user_id = auth.uid()
    )
  );

-- Daily challenges: publicly readable
create policy "Daily challenges are publicly readable"
  on public.daily_challenges for select using (true);
create policy "Users see own challenge entries"
  on public.daily_challenge_entries for select using (auth.uid() = user_id);
create policy "Users submit own challenge entries"
  on public.daily_challenge_entries for insert with check (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- OTP rate-limit check: call from server before issuing a new code.
-- Returns true if the identifier is below the request threshold.
create or replace function public.check_otp_rate_limit(
  p_identifier     text,
  p_window_minutes int default 15,
  p_max_requests   int default 5
) returns boolean language plpgsql security definer as $$
begin
  return (
    select count(*) < p_max_requests
    from public.otp_requests
    where identifier = p_identifier
      and created_at > now() - (p_window_minutes || ' minutes')::interval
  );
end;
$$;

-- OTP verification: checks submitted code against stored hash.
-- Returns true on success and marks the request as used.
-- Returns false if expired, already used, max attempts exceeded, or code wrong.
create or replace function public.verify_otp_code(
  p_identifier text,
  p_code       text
) returns boolean language plpgsql security definer as $$
declare
  v_request public.otp_requests;
begin
  -- Find the latest unused, unexpired, non-locked OTP for this identifier
  select * into v_request
  from public.otp_requests
  where identifier = p_identifier
    and is_used = false
    and expires_at > now()
    and attempt_count < 5
  order by created_at desc
  limit 1;

  if not found then
    return false;
  end if;

  -- Verify code against bcrypt hash
  if v_request.code_hash != crypt(p_code, v_request.code_hash) then
    update public.otp_requests
    set attempt_count = attempt_count + 1
    where id = v_request.id;
    return false;
  end if;

  -- Mark as used on success
  update public.otp_requests
  set is_used = true, verified_at = now()
  where id = v_request.id;

  return true;
end;
$$;

-- Cleanup: purge expired/used OTP rows older than 1 hour.
-- Schedule via pg_cron or a Supabase edge function cron trigger.
create or replace function public.cleanup_expired_otp_requests()
returns void language plpgsql security definer as $$
begin
  delete from public.otp_requests
  where expires_at < now() - interval '1 hour';
end;
$$;

-- Auto-update profiles.updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger groups_updated_at
  before update on public.groups
  for each row execute function public.handle_updated_at();

-- Auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Add venue_id to matches
alter table public.matches add column venue_id uuid references public.venues(id);
-- Add group_label to teams (e.g. 'A', 'B', ...,'L')
alter table public.teams add column group_label text;
-- Add is_placeholder to teams (true for TBD playoff spots)
alter table public.teams add column is_placeholder boolean default false;
-- Add match_number for match ordering/display
alter table public.matches add column match_number int;

-- ============================================================
-- SEED: FIFA World Cup 2026
-- ============================================================

-- ---- Competition ----
insert into public.competitions (id, name, short_name, type, season, starts_at, ends_at, is_active)
values (
  'a1000000-0000-0000-0000-000000000001',
  'FIFA World Cup 2026',
  'WC2026',
  'world_cup',
  '2026',
  '2026-06-11 00:00:00+00',
  '2026-07-19 00:00:00+00',
  true
);

-- ---- Venues (16 host stadiums) ----
insert into public.venues (id, name, city, country, country_code, capacity) values
  ('50000000-0000-0000-0000-000000000001', 'Estadio Azteca',          'Mexico City',       'Mexico',        'MX', 83000),
  ('50000000-0000-0000-0000-000000000002', 'Estadio Akron',           'Zapopan',           'Mexico',        'MX', 48000),
  ('50000000-0000-0000-0000-000000000003', 'Estadio BBVA',            'Guadalupe',         'Mexico',        'MX', 53500),
  ('50000000-0000-0000-0000-000000000004', 'BMO Field',               'Toronto',           'Canada',        'CA', 45000),
  ('50000000-0000-0000-0000-000000000005', 'BC Place',                'Vancouver',         'Canada',        'CA', 54000),
  ('50000000-0000-0000-0000-000000000006', 'MetLife Stadium',         'East Rutherford',   'United States', 'US', 82500),
  ('50000000-0000-0000-0000-000000000007', 'AT&T Stadium',            'Arlington',         'United States', 'US', 94000),
  ('50000000-0000-0000-0000-000000000008', 'Mercedes-Benz Stadium',   'Atlanta',           'United States', 'US', 75000),
  ('50000000-0000-0000-0000-000000000009', 'Arrowhead Stadium',       'Kansas City',       'United States', 'US', 73000),
  ('50000000-0000-0000-0000-000000000010', 'NRG Stadium',             'Houston',           'United States', 'US', 72000),
  ('50000000-0000-0000-0000-000000000011', 'Levi''s Stadium',         'Santa Clara',       'United States', 'US', 71000),
  ('50000000-0000-0000-0000-000000000012', 'SoFi Stadium',            'Inglewood',         'United States', 'US', 70000),
  ('50000000-0000-0000-0000-000000000013', 'Lincoln Financial Field', 'Philadelphia',      'United States', 'US', 69000),
  ('50000000-0000-0000-0000-000000000014', 'Lumen Field',             'Seattle',           'United States', 'US', 69000),
  ('50000000-0000-0000-0000-000000000015', 'Gillette Stadium',        'Foxborough',        'United States', 'US', 65000),
  ('50000000-0000-0000-0000-000000000016', 'Hard Rock Stadium',       'Miami Gardens',     'United States', 'US', 65000);

-- ---- Teams (48 total — 4 TBD placeholder spots for unfinished playoffs) ----
-- tier: 1=top, 2=mid, 3=underdog
insert into public.teams (id, competition_id, name, short_name, country_code, group_label, tier, is_placeholder) values
  -- GROUP A
  ('60000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Mexico',                'MEX','MX','A',1,false),
  ('60000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','South Africa',          'RSA','ZA','A',3,false),
  ('60000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001','South Korea',           'KOR','KR','A',2,false),
  ('60000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000001','TBD - UEFA Path D',     'TBDA4',null,'A',2,true),
  -- GROUP B
  ('60000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000001','Canada',                'CAN','CA','B',2,false),
  ('60000000-0000-0000-0000-000000000006','a1000000-0000-0000-0000-000000000001','TBD - UEFA Path A',     'TBDB2',null,'B',2,true),
  ('60000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000001','Qatar',                 'QAT','QA','B',3,false),
  ('60000000-0000-0000-0000-000000000008','a1000000-0000-0000-0000-000000000001','Switzerland',           'SUI','CH','B',2,false),
  -- GROUP C
  ('60000000-0000-0000-0000-000000000009','a1000000-0000-0000-0000-000000000001','Brazil',                'BRA','BR','C',1,false),
  ('60000000-0000-0000-0000-000000000010','a1000000-0000-0000-0000-000000000001','Morocco',               'MAR','MA','C',2,false),
  ('60000000-0000-0000-0000-000000000011','a1000000-0000-0000-0000-000000000001','Haiti',                 'HAI','HT','C',3,false),
  ('60000000-0000-0000-0000-000000000012','a1000000-0000-0000-0000-000000000001','Scotland',              'SCO','GB-SCT','C',2,false),
  -- GROUP D
  ('60000000-0000-0000-0000-000000000013','a1000000-0000-0000-0000-000000000001','United States',         'USA','US','D',1,false),
  ('60000000-0000-0000-0000-000000000014','a1000000-0000-0000-0000-000000000001','Paraguay',              'PAR','PY','D',3,false),
  ('60000000-0000-0000-0000-000000000015','a1000000-0000-0000-0000-000000000001','Australia',             'AUS','AU','D',2,false),
  ('60000000-0000-0000-0000-000000000016','a1000000-0000-0000-0000-000000000001','TBD - UEFA Path C',     'TBDD4',null,'D',2,true),
  -- GROUP E
  ('60000000-0000-0000-0000-000000000017','a1000000-0000-0000-0000-000000000001','Germany',               'GER','DE','E',1,false),
  ('60000000-0000-0000-0000-000000000018','a1000000-0000-0000-0000-000000000001','Curaçao',               'CUW','CW','E',3,false),
  ('60000000-0000-0000-0000-000000000019','a1000000-0000-0000-0000-000000000001','Ivory Coast',           'CIV','CI','E',2,false),
  ('60000000-0000-0000-0000-000000000020','a1000000-0000-0000-0000-000000000001','Ecuador',               'ECU','EC','E',2,false),
  -- GROUP F
  ('60000000-0000-0000-0000-000000000021','a1000000-0000-0000-0000-000000000001','Netherlands',           'NED','NL','F',1,false),
  ('60000000-0000-0000-0000-000000000022','a1000000-0000-0000-0000-000000000001','Japan',                 'JPN','JP','F',2,false),
  ('60000000-0000-0000-0000-000000000023','a1000000-0000-0000-0000-000000000001','TBD - UEFA Path B',     'TBDF3',null,'F',2,true),
  ('60000000-0000-0000-0000-000000000024','a1000000-0000-0000-0000-000000000001','Tunisia',               'TUN','TN','F',3,false),
  -- GROUP G
  ('60000000-0000-0000-0000-000000000025','a1000000-0000-0000-0000-000000000001','Belgium',               'BEL','BE','G',1,false),
  ('60000000-0000-0000-0000-000000000026','a1000000-0000-0000-0000-000000000001','Egypt',                 'EGY','EG','G',2,false),
  ('60000000-0000-0000-0000-000000000027','a1000000-0000-0000-0000-000000000001','Iran',                  'IRN','IR','G',2,false),
  ('60000000-0000-0000-0000-000000000028','a1000000-0000-0000-0000-000000000001','New Zealand',           'NZL','NZ','G',3,false),
  -- GROUP H
  ('60000000-0000-0000-0000-000000000029','a1000000-0000-0000-0000-000000000001','Spain',                 'ESP','ES','H',1,false),
  ('60000000-0000-0000-0000-000000000030','a1000000-0000-0000-0000-000000000001','Cape Verde',            'CPV','CV','H',3,false),
  ('60000000-0000-0000-0000-000000000031','a1000000-0000-0000-0000-000000000001','Saudi Arabia',          'KSA','SA','H',2,false),
  ('60000000-0000-0000-0000-000000000032','a1000000-0000-0000-0000-000000000001','Uruguay',               'URU','UY','H',2,false),
  -- GROUP I
  ('60000000-0000-0000-0000-000000000033','a1000000-0000-0000-0000-000000000001','France',                'FRA','FR','I',1,false),
  ('60000000-0000-0000-0000-000000000034','a1000000-0000-0000-0000-000000000001','Senegal',               'SEN','SN','I',2,false),
  ('60000000-0000-0000-0000-000000000035','a1000000-0000-0000-0000-000000000001','TBD - Intercont. Path 2','TBDI3',null,'I',3,true),
  ('60000000-0000-0000-0000-000000000036','a1000000-0000-0000-0000-000000000001','Norway',                'NOR','NO','I',2,false),
  -- GROUP J
  ('60000000-0000-0000-0000-000000000037','a1000000-0000-0000-0000-000000000001','Argentina',             'ARG','AR','J',1,false),
  ('60000000-0000-0000-0000-000000000038','a1000000-0000-0000-0000-000000000001','Algeria',               'ALG','DZ','J',2,false),
  ('60000000-0000-0000-0000-000000000039','a1000000-0000-0000-0000-000000000001','Austria',               'AUT','AT','J',2,false),
  ('60000000-0000-0000-0000-000000000040','a1000000-0000-0000-0000-000000000001','Jordan',                'JOR','JO','J',3,false),
  -- GROUP K
  ('60000000-0000-0000-0000-000000000041','a1000000-0000-0000-0000-000000000001','Portugal',              'POR','PT','K',1,false),
  ('60000000-0000-0000-0000-000000000042','a1000000-0000-0000-0000-000000000001','TBD - Intercont. Path 1','TBDK2',null,'K',3,true),
  ('60000000-0000-0000-0000-000000000043','a1000000-0000-0000-0000-000000000001','Uzbekistan',            'UZB','UZ','K',3,false),
  ('60000000-0000-0000-0000-000000000044','a1000000-0000-0000-0000-000000000001','Colombia',              'COL','CO','K',2,false),
  -- GROUP L
  ('60000000-0000-0000-0000-000000000045','a1000000-0000-0000-0000-000000000001','England',               'ENG','GB-ENG','L',1,false),
  ('60000000-0000-0000-0000-000000000046','a1000000-0000-0000-0000-000000000001','Croatia',               'CRO','HR','L',2,false),
  ('60000000-0000-0000-0000-000000000047','a1000000-0000-0000-0000-000000000001','Ghana',                 'GHA','GH','L',3,false),
  ('60000000-0000-0000-0000-000000000048','a1000000-0000-0000-0000-000000000001','Panama',                'PAN','PA','L',3,false);

-- ---- Group Stage Matches (72 matches, matchday 1-3) ----
-- prediction_lock = 1 hour before kick-off (UTC times)
-- All times stored in UTC

-- ══ GROUP A ══
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002',
    'Group Stage - A',1,'2026-06-11 19:00:00+00','2026-06-11 18:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000001'),  -- Mexico vs South Africa, Azteca 1pm local (UTC-6)
  ('70000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000004',
    'Group Stage - A',2,'2026-06-12 02:00:00+00','2026-06-12 01:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000002'),  -- South Korea vs UEFA Path D, Akron 8pm local (UTC-6)
  ('70000000-0000-0000-0000-000000000025','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000004','60000000-0000-0000-0000-000000000002',
    'Group Stage - A',25,'2026-06-18 16:00:00+00','2026-06-18 15:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000008'), -- UEFA Path D vs South Africa, Atlanta
  ('70000000-0000-0000-0000-000000000028','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000003',
    'Group Stage - A',28,'2026-06-19 01:00:00+00','2026-06-19 00:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000002'), -- Mexico vs South Korea, Akron
  ('70000000-0000-0000-0000-000000000053','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000004','60000000-0000-0000-0000-000000000001',
    'Group Stage - A',53,'2026-06-25 01:00:00+00','2026-06-25 00:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000002'), -- UEFA Path D vs Mexico, Akron
  ('70000000-0000-0000-0000-000000000054','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000003',
    'Group Stage - A',54,'2026-06-25 01:00:00+00','2026-06-25 00:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000003'); -- South Africa vs South Korea, BBVA

-- ══ GROUP B ══
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000005','60000000-0000-0000-0000-000000000006',
    'Group Stage - B',3,'2026-06-12 19:00:00+00','2026-06-12 18:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000004'), -- Canada vs UEFA Path A, BMO Field 3pm ET
  ('70000000-0000-0000-0000-000000000008','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000007','60000000-0000-0000-0000-000000000008',
    'Group Stage - B',8,'2026-06-13 19:00:00+00','2026-06-13 18:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000011'), -- Qatar vs Switzerland, Levi''s
  ('70000000-0000-0000-0000-000000000026','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000008','60000000-0000-0000-0000-000000000006',
    'Group Stage - B',26,'2026-06-18 19:00:00+00','2026-06-18 18:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000012'), -- Switzerland vs UEFA Path A, SoFi
  ('70000000-0000-0000-0000-000000000027','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000005','60000000-0000-0000-0000-000000000007',
    'Group Stage - B',27,'2026-06-18 22:00:00+00','2026-06-18 21:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000005'), -- Canada vs Qatar, BC Place
  ('70000000-0000-0000-0000-000000000051','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000008','60000000-0000-0000-0000-000000000005',
    'Group Stage - B',51,'2026-06-24 19:00:00+00','2026-06-24 18:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000005'), -- Switzerland vs Canada, BC Place
  ('70000000-0000-0000-0000-000000000052','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000006','60000000-0000-0000-0000-000000000007',
    'Group Stage - B',52,'2026-06-24 19:00:00+00','2026-06-24 18:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000014'); -- UEFA Path A vs Qatar, Lumen

-- ══ GROUP C ══
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000007','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000009','60000000-0000-0000-0000-000000000010',
    'Group Stage - C',7,'2026-06-13 22:00:00+00','2026-06-13 21:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000006'), -- Brazil vs Morocco, MetLife
  ('70000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000011','60000000-0000-0000-0000-000000000012',
    'Group Stage - C',5,'2026-06-14 01:00:00+00','2026-06-14 00:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000015'), -- Haiti vs Scotland, Gillette
  ('70000000-0000-0000-0000-000000000030','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000012','60000000-0000-0000-0000-000000000010',
    'Group Stage - C',30,'2026-06-19 22:00:00+00','2026-06-19 21:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000015'), -- Scotland vs Morocco, Gillette
  ('70000000-0000-0000-0000-000000000029','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000009','60000000-0000-0000-0000-000000000011',
    'Group Stage - C',29,'2026-06-20 01:00:00+00','2026-06-20 00:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000013'), -- Brazil vs Haiti, Lincoln Financial
  ('70000000-0000-0000-0000-000000000049','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000012','60000000-0000-0000-0000-000000000009',
    'Group Stage - C',49,'2026-06-24 22:00:00+00','2026-06-24 21:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000016'), -- Scotland vs Brazil, Hard Rock
  ('70000000-0000-0000-0000-000000000050','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000010','60000000-0000-0000-0000-000000000011',
    'Group Stage - C',50,'2026-06-24 22:00:00+00','2026-06-24 21:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000008'); -- Morocco vs Haiti, Mercedes-Benz

-- ══ GROUP D ══
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000013','60000000-0000-0000-0000-000000000014',
    'Group Stage - D',4,'2026-06-13 01:00:00+00','2026-06-13 00:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000012'), -- USA vs Paraguay, SoFi
  ('70000000-0000-0000-0000-000000000006','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000015','60000000-0000-0000-0000-000000000016',
    'Group Stage - D',6,'2026-06-14 04:00:00+00','2026-06-14 03:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000005'), -- Australia vs UEFA Path C, BC Place
  ('70000000-0000-0000-0000-000000000032','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000013','60000000-0000-0000-0000-000000000015',
    'Group Stage - D',32,'2026-06-19 19:00:00+00','2026-06-19 18:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000014'), -- USA vs Australia, Lumen
  ('70000000-0000-0000-0000-000000000031','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000016','60000000-0000-0000-0000-000000000014',
    'Group Stage - D',31,'2026-06-20 04:00:00+00','2026-06-20 03:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000011'), -- UEFA Path C vs Paraguay, Levi''s
  ('70000000-0000-0000-0000-000000000059','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000016','60000000-0000-0000-0000-000000000013',
    'Group Stage - D',59,'2026-06-26 02:00:00+00','2026-06-26 01:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000012'), -- UEFA Path C vs USA, SoFi
  ('70000000-0000-0000-0000-000000000060','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000014','60000000-0000-0000-0000-000000000015',
    'Group Stage - D',60,'2026-06-26 02:00:00+00','2026-06-26 01:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000011'); -- Paraguay vs Australia, Levi''s

-- ══ GROUP E ══
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000010','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000017','60000000-0000-0000-0000-000000000018',
    'Group Stage - E',10,'2026-06-14 18:00:00+00','2026-06-14 17:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000010'), -- Germany vs Curaçao, NRG
  ('70000000-0000-0000-0000-000000000009','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000019','60000000-0000-0000-0000-000000000020',
    'Group Stage - E',9,'2026-06-14 23:00:00+00','2026-06-14 22:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000013'), -- Ivory Coast vs Ecuador, Lincoln Financial
  ('70000000-0000-0000-0000-000000000033','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000017','60000000-0000-0000-0000-000000000019',
    'Group Stage - E',33,'2026-06-20 20:00:00+00','2026-06-20 19:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000004'), -- Germany vs Ivory Coast, BMO
  ('70000000-0000-0000-0000-000000000034','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000020','60000000-0000-0000-0000-000000000018',
    'Group Stage - E',34,'2026-06-21 00:00:00+00','2026-06-20 23:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000009'), -- Ecuador vs Curaçao, Arrowhead
  ('70000000-0000-0000-0000-000000000055','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000018','60000000-0000-0000-0000-000000000019',
    'Group Stage - E',55,'2026-06-25 20:00:00+00','2026-06-25 19:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000013'), -- Curaçao vs Ivory Coast, Lincoln
  ('70000000-0000-0000-0000-000000000056','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000020','60000000-0000-0000-0000-000000000017',
    'Group Stage - E',56,'2026-06-25 20:00:00+00','2026-06-25 19:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000006'); -- Ecuador vs Germany, MetLife

-- ══ GROUP F ══
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000011','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000021','60000000-0000-0000-0000-000000000022',
    'Group Stage - F',11,'2026-06-14 21:00:00+00','2026-06-14 20:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000007'), -- Netherlands vs Japan, AT&T
  ('70000000-0000-0000-0000-000000000012','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000023','60000000-0000-0000-0000-000000000024',
    'Group Stage - F',12,'2026-06-15 02:00:00+00','2026-06-15 01:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000003'), -- UEFA Path B vs Tunisia, BBVA
  ('70000000-0000-0000-0000-000000000035','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000021','60000000-0000-0000-0000-000000000023',
    'Group Stage - F',35,'2026-06-20 17:00:00+00','2026-06-20 16:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000010'), -- Netherlands vs UEFA Path B, NRG
  ('70000000-0000-0000-0000-000000000036','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000024','60000000-0000-0000-0000-000000000022',
    'Group Stage - F',36,'2026-06-21 04:00:00+00','2026-06-21 03:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000003'), -- Tunisia vs Japan, BBVA
  ('70000000-0000-0000-0000-000000000057','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000022','60000000-0000-0000-0000-000000000023',
    'Group Stage - F',57,'2026-06-25 23:00:00+00','2026-06-25 22:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000007'), -- Japan vs UEFA Path B, AT&T
  ('70000000-0000-0000-0000-000000000058','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000024','60000000-0000-0000-0000-000000000021',
    'Group Stage - F',58,'2026-06-25 23:00:00+00','2026-06-25 22:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000009'); -- Tunisia vs Netherlands, Arrowhead

-- ══ GROUP G ══
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000016','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000025','60000000-0000-0000-0000-000000000026',
    'Group Stage - G',16,'2026-06-15 19:00:00+00','2026-06-15 18:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000014'), -- Belgium vs Egypt, Lumen
  ('70000000-0000-0000-0000-000000000015','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000027','60000000-0000-0000-0000-000000000028',
    'Group Stage - G',15,'2026-06-16 01:00:00+00','2026-06-16 00:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000012'), -- Iran vs New Zealand, SoFi
  ('70000000-0000-0000-0000-000000000039','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000025','60000000-0000-0000-0000-000000000027',
    'Group Stage - G',39,'2026-06-21 19:00:00+00','2026-06-21 18:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000012'), -- Belgium vs Iran, SoFi
  ('70000000-0000-0000-0000-000000000040','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000028','60000000-0000-0000-0000-000000000026',
    'Group Stage - G',40,'2026-06-22 01:00:00+00','2026-06-22 00:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000005'), -- New Zealand vs Egypt, BC Place
  ('70000000-0000-0000-0000-000000000063','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000026','60000000-0000-0000-0000-000000000027',
    'Group Stage - G',63,'2026-06-27 03:00:00+00','2026-06-27 02:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000014'), -- Egypt vs Iran, Lumen
  ('70000000-0000-0000-0000-000000000064','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000028','60000000-0000-0000-0000-000000000025',
    'Group Stage - G',64,'2026-06-27 03:00:00+00','2026-06-27 02:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000005'); -- New Zealand vs Belgium, BC Place

-- ══ GROUP H ══
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000014','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000029','60000000-0000-0000-0000-000000000030',
    'Group Stage - H',14,'2026-06-15 17:00:00+00','2026-06-15 16:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000008'), -- Spain vs Cape Verde, Mercedes-Benz
  ('70000000-0000-0000-0000-000000000013','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000031','60000000-0000-0000-0000-000000000032',
    'Group Stage - H',13,'2026-06-15 22:00:00+00','2026-06-15 21:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000016'), -- Saudi Arabia vs Uruguay, Hard Rock
  ('70000000-0000-0000-0000-000000000038','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000029','60000000-0000-0000-0000-000000000031',
    'Group Stage - H',38,'2026-06-21 16:00:00+00','2026-06-21 15:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000008'), -- Spain vs Saudi Arabia, Mercedes-Benz
  ('70000000-0000-0000-0000-000000000037','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000032','60000000-0000-0000-0000-000000000030',
    'Group Stage - H',37,'2026-06-21 22:00:00+00','2026-06-21 21:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000008'), -- Uruguay vs Cape Verde, Mercedes-Benz
  ('70000000-0000-0000-0000-000000000065','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000030','60000000-0000-0000-0000-000000000031',
    'Group Stage - H',65,'2026-06-27 00:00:00+00','2026-06-26 23:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000010'), -- Cape Verde vs Saudi Arabia, NRG
  ('70000000-0000-0000-0000-000000000066','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000032','60000000-0000-0000-0000-000000000029',
    'Group Stage - H',66,'2026-06-27 00:00:00+00','2026-06-26 23:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000002'); -- Uruguay vs Spain, Akron

-- ══ GROUP I ══
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000017','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000033','60000000-0000-0000-0000-000000000034',
    'Group Stage - I',17,'2026-06-16 19:00:00+00','2026-06-16 18:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000006'), -- France vs Senegal, MetLife
  ('70000000-0000-0000-0000-000000000018','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000035','60000000-0000-0000-0000-000000000036',
    'Group Stage - I',18,'2026-06-16 22:00:00+00','2026-06-16 21:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000015'), -- Intercont. Path 2 vs Norway, Gillette
  ('70000000-0000-0000-0000-000000000042','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000033','60000000-0000-0000-0000-000000000035',
    'Group Stage - I',42,'2026-06-22 21:00:00+00','2026-06-22 20:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000013'), -- France vs Intercont. Path 2, Lincoln
  ('70000000-0000-0000-0000-000000000041','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000036','60000000-0000-0000-0000-000000000034',
    'Group Stage - I',41,'2026-06-23 00:00:00+00','2026-06-22 23:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000006'), -- Norway vs Senegal, MetLife
  ('70000000-0000-0000-0000-000000000061','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000036','60000000-0000-0000-0000-000000000033',
    'Group Stage - I',61,'2026-06-26 19:00:00+00','2026-06-26 18:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000015'), -- Norway vs France, Gillette
  ('70000000-0000-0000-0000-000000000062','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000034','60000000-0000-0000-0000-000000000035',
    'Group Stage - I',62,'2026-06-26 19:00:00+00','2026-06-26 18:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000004'); -- Senegal vs Intercont. Path 2, BMO

-- ══ GROUP J ══
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000019','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000037','60000000-0000-0000-0000-000000000038',
    'Group Stage - J',19,'2026-06-17 01:00:00+00','2026-06-17 00:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000009'), -- Argentina vs Algeria, Arrowhead
  ('70000000-0000-0000-0000-000000000020','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000039','60000000-0000-0000-0000-000000000040',
    'Group Stage - J',20,'2026-06-17 04:00:00+00','2026-06-17 03:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000011'), -- Austria vs Jordan, Levi''s
  ('70000000-0000-0000-0000-000000000043','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000037','60000000-0000-0000-0000-000000000039',
    'Group Stage - J',43,'2026-06-22 17:00:00+00','2026-06-22 16:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000007'), -- Argentina vs Austria, AT&T
  ('70000000-0000-0000-0000-000000000044','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000040','60000000-0000-0000-0000-000000000038',
    'Group Stage - J',44,'2026-06-23 03:00:00+00','2026-06-23 02:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000011'), -- Jordan vs Algeria, Levi''s
  ('70000000-0000-0000-0000-000000000069','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000038','60000000-0000-0000-0000-000000000039',
    'Group Stage - J',69,'2026-06-28 02:00:00+00','2026-06-28 01:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000009'), -- Algeria vs Austria, Arrowhead
  ('70000000-0000-0000-0000-000000000070','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000040','60000000-0000-0000-0000-000000000037',
    'Group Stage - J',70,'2026-06-28 02:00:00+00','2026-06-28 01:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000007'); -- Jordan vs Argentina, AT&T

-- ══ GROUP K ══
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000023','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000041','60000000-0000-0000-0000-000000000042',
    'Group Stage - K',23,'2026-06-17 17:00:00+00','2026-06-17 16:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000010'), -- Portugal vs Intercont. Path 1, NRG
  ('70000000-0000-0000-0000-000000000024','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000043','60000000-0000-0000-0000-000000000044',
    'Group Stage - K',24,'2026-06-18 02:00:00+00','2026-06-18 01:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000001'), -- Uzbekistan vs Colombia, Azteca
  ('70000000-0000-0000-0000-000000000047','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000041','60000000-0000-0000-0000-000000000043',
    'Group Stage - K',47,'2026-06-23 17:00:00+00','2026-06-23 16:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000001'), -- Portugal vs Uzbekistan, Azteca
  ('70000000-0000-0000-0000-000000000048','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000044','60000000-0000-0000-0000-000000000042',
    'Group Stage - K',48,'2026-06-24 02:00:00+00','2026-06-24 01:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000010'), -- Colombia vs Intercont. Path 1, NRG
  ('70000000-0000-0000-0000-000000000071','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000044','60000000-0000-0000-0000-000000000041',
    'Group Stage - K',71,'2026-06-27 23:30:00+00','2026-06-27 22:30:00+00','scheduled',
    '50000000-0000-0000-0000-000000000016'), -- Colombia vs Portugal, Hard Rock
  ('70000000-0000-0000-0000-000000000072','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000042','60000000-0000-0000-0000-000000000043',
    'Group Stage - K',72,'2026-06-27 23:30:00+00','2026-06-27 22:30:00+00','scheduled',
    '50000000-0000-0000-0000-000000000008'); -- Intercont. Path 1 vs Uzbekistan, Mercedes-Benz

-- ══ GROUP L ══
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000022','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000045','60000000-0000-0000-0000-000000000046',
    'Group Stage - L',22,'2026-06-17 20:00:00+00','2026-06-17 19:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000007'), -- England vs Croatia, AT&T
  ('70000000-0000-0000-0000-000000000021','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000047','60000000-0000-0000-0000-000000000048',
    'Group Stage - L',21,'2026-06-17 23:00:00+00','2026-06-17 22:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000004'), -- Ghana vs Panama, BMO
  ('70000000-0000-0000-0000-000000000045','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000045','60000000-0000-0000-0000-000000000047',
    'Group Stage - L',45,'2026-06-23 20:00:00+00','2026-06-23 19:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000015'), -- England vs Ghana, Gillette
  ('70000000-0000-0000-0000-000000000046','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000048','60000000-0000-0000-0000-000000000046',
    'Group Stage - L',46,'2026-06-23 23:00:00+00','2026-06-23 22:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000004'), -- Panama vs Croatia, BMO
  ('70000000-0000-0000-0000-000000000067','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000048','60000000-0000-0000-0000-000000000045',
    'Group Stage - L',67,'2026-06-27 21:00:00+00','2026-06-27 20:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000006'), -- Panama vs England, MetLife
  ('70000000-0000-0000-0000-000000000068','a1000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000046','60000000-0000-0000-0000-000000000047',
    'Group Stage - L',68,'2026-06-27 21:00:00+00','2026-06-27 20:00:00+00','scheduled',
    '50000000-0000-0000-0000-000000000013'); -- Croatia vs Ghana, Lincoln Financial

-- ---- Knockout Stage (TBD teams — home/away set to null, resolved at runtime) ----
-- Round of 32 (matches 73–88)
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000073','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',73,'2026-06-28 19:00:00+00','2026-06-28 18:00:00+00','scheduled','50000000-0000-0000-0000-000000000012'), -- 2A vs 2B, SoFi
  ('70000000-0000-0000-0000-000000000074','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',74,'2026-06-29 20:30:00+00','2026-06-29 19:30:00+00','scheduled','50000000-0000-0000-0000-000000000015'), -- 1E vs 3rd ABCDF, Gillette
  ('70000000-0000-0000-0000-000000000075','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',75,'2026-06-29 23:00:00+00','2026-06-29 22:00:00+00','scheduled','50000000-0000-0000-0000-000000000003'), -- 1F vs 2C, BBVA
  ('70000000-0000-0000-0000-000000000076','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',76,'2026-06-29 17:00:00+00','2026-06-29 16:00:00+00','scheduled','50000000-0000-0000-0000-000000000010'), -- 1C vs 2F, NRG
  ('70000000-0000-0000-0000-000000000077','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',77,'2026-06-30 21:00:00+00','2026-06-30 20:00:00+00','scheduled','50000000-0000-0000-0000-000000000006'), -- 1I vs 3rd CDFGH, MetLife
  ('70000000-0000-0000-0000-000000000078','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',78,'2026-06-30 17:00:00+00','2026-06-30 16:00:00+00','scheduled','50000000-0000-0000-0000-000000000007'), -- 2E vs 2I, AT&T
  ('70000000-0000-0000-0000-000000000079','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',79,'2026-06-30 23:00:00+00','2026-06-30 22:00:00+00','scheduled','50000000-0000-0000-0000-000000000001'), -- 1A vs 3rd CEFHI, Azteca
  ('70000000-0000-0000-0000-000000000080','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',80,'2026-07-01 16:00:00+00','2026-07-01 15:00:00+00','scheduled','50000000-0000-0000-0000-000000000008'), -- 1L vs 3rd EHIJK, Mercedes-Benz
  ('70000000-0000-0000-0000-000000000081','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',81,'2026-07-01 20:00:00+00','2026-07-01 19:00:00+00','scheduled','50000000-0000-0000-0000-000000000014'), -- 1D vs 3rd BEFIJ, Lumen
  ('70000000-0000-0000-0000-000000000082','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',82,'2026-07-01 21:00:00+00','2026-07-01 20:00:00+00','scheduled','50000000-0000-0000-0000-000000000014'), -- 1G vs 3rd AEHIJ, Lumen
  ('70000000-0000-0000-0000-000000000083','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',83,'2026-07-02 23:00:00+00','2026-07-02 22:00:00+00','scheduled','50000000-0000-0000-0000-000000000012'), -- 2K vs 2L, SoFi
  ('70000000-0000-0000-0000-000000000084','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',84,'2026-07-02 21:00:00+00','2026-07-02 20:00:00+00','scheduled','50000000-0000-0000-0000-000000000012'), -- 1H vs 2J, SoFi
  ('70000000-0000-0000-0000-000000000085','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',85,'2026-07-03 03:00:00+00','2026-07-03 02:00:00+00','scheduled','50000000-0000-0000-0000-000000000005'), -- 1B vs 3rd EFGIJ, BC Place
  ('70000000-0000-0000-0000-000000000086','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',86,'2026-07-03 22:00:00+00','2026-07-03 21:00:00+00','scheduled','50000000-0000-0000-0000-000000000016'), -- 1J vs 2H, Hard Rock
  ('70000000-0000-0000-0000-000000000087','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',87,'2026-07-04 01:30:00+00','2026-07-04 00:30:00+00','scheduled','50000000-0000-0000-0000-000000000009'), -- 1K vs 3rd DEJIL, Arrowhead
  ('70000000-0000-0000-0000-000000000088','a1000000-0000-0000-0000-000000000001',null,null,'Round of 32',88,'2026-07-03 18:00:00+00','2026-07-03 17:00:00+00','scheduled','50000000-0000-0000-0000-000000000007'); -- 2D vs 2G, AT&T

-- Round of 16 (matches 89–96)
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000089','a1000000-0000-0000-0000-000000000001',null,null,'Round of 16',89,'2026-07-04 21:00:00+00','2026-07-04 20:00:00+00','scheduled','50000000-0000-0000-0000-000000000013'), -- W74 vs W77, Lincoln
  ('70000000-0000-0000-0000-000000000090','a1000000-0000-0000-0000-000000000001',null,null,'Round of 16',90,'2026-07-04 17:00:00+00','2026-07-04 16:00:00+00','scheduled','50000000-0000-0000-0000-000000000010'), -- W73 vs W75, NRG
  ('70000000-0000-0000-0000-000000000091','a1000000-0000-0000-0000-000000000001',null,null,'Round of 16',91,'2026-07-05 20:00:00+00','2026-07-05 19:00:00+00','scheduled','50000000-0000-0000-0000-000000000006'), -- W76 vs W78, MetLife
  ('70000000-0000-0000-0000-000000000092','a1000000-0000-0000-0000-000000000001',null,null,'Round of 16',92,'2026-07-06 00:00:00+00','2026-07-05 23:00:00+00','scheduled','50000000-0000-0000-0000-000000000001'), -- W79 vs W80, Azteca
  ('70000000-0000-0000-0000-000000000093','a1000000-0000-0000-0000-000000000001',null,null,'Round of 16',93,'2026-07-06 19:00:00+00','2026-07-06 18:00:00+00','scheduled','50000000-0000-0000-0000-000000000012'), -- W83 vs W84, SoFi
  ('70000000-0000-0000-0000-000000000094','a1000000-0000-0000-0000-000000000001',null,null,'Round of 16',94,'2026-07-06 21:00:00+00','2026-07-06 20:00:00+00','scheduled','50000000-0000-0000-0000-000000000014'), -- W81 vs W82, Lumen
  ('70000000-0000-0000-0000-000000000095','a1000000-0000-0000-0000-000000000001',null,null,'Round of 16',95,'2026-07-07 16:00:00+00','2026-07-07 15:00:00+00','scheduled','50000000-0000-0000-0000-000000000008'), -- W86 vs W88, Mercedes-Benz
  ('70000000-0000-0000-0000-000000000096','a1000000-0000-0000-0000-000000000001',null,null,'Round of 16',96,'2026-07-07 21:00:00+00','2026-07-07 20:00:00+00','scheduled','50000000-0000-0000-0000-000000000005'); -- W85 vs W87, BC Place

-- Quarterfinals (matches 97–100)
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000097','a1000000-0000-0000-0000-000000000001',null,null,'Quarterfinal',97,'2026-07-09 20:00:00+00','2026-07-09 19:00:00+00','scheduled','50000000-0000-0000-0000-000000000015'), -- W89 vs W90, Gillette
  ('70000000-0000-0000-0000-000000000098','a1000000-0000-0000-0000-000000000001',null,null,'Quarterfinal',98,'2026-07-10 19:00:00+00','2026-07-10 18:00:00+00','scheduled','50000000-0000-0000-0000-000000000012'), -- W93 vs W94, SoFi
  ('70000000-0000-0000-0000-000000000099','a1000000-0000-0000-0000-000000000001',null,null,'Quarterfinal',99,'2026-07-11 21:00:00+00','2026-07-11 20:00:00+00','scheduled','50000000-0000-0000-0000-000000000016'), -- W91 vs W92, Hard Rock
  ('70000000-0000-0000-0000-000000000100','a1000000-0000-0000-0000-000000000001',null,null,'Quarterfinal',100,'2026-07-12 01:00:00+00','2026-07-12 00:00:00+00','scheduled','50000000-0000-0000-0000-000000000009'); -- W95 vs W96, Arrowhead

-- Semifinals (matches 101–102)
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000101','a1000000-0000-0000-0000-000000000001',null,null,'Semifinal',101,'2026-07-14 19:00:00+00','2026-07-14 18:00:00+00','scheduled','50000000-0000-0000-0000-000000000007'), -- W97 vs W98, AT&T
  ('70000000-0000-0000-0000-000000000102','a1000000-0000-0000-0000-000000000001',null,null,'Semifinal',102,'2026-07-15 19:00:00+00','2026-07-15 18:00:00+00','scheduled','50000000-0000-0000-0000-000000000008'); -- W99 vs W100, Mercedes-Benz

-- Third place & Final (matches 103–104)
insert into public.matches (id,competition_id,home_team_id,away_team_id,stage,match_number,match_date,prediction_lock,status,venue_id) values
  ('70000000-0000-0000-0000-000000000103','a1000000-0000-0000-0000-000000000001',null,null,'Third Place',103,'2026-07-18 21:00:00+00','2026-07-18 20:00:00+00','scheduled','50000000-0000-0000-0000-000000000016'), -- 3rd place, Hard Rock
  ('70000000-0000-0000-0000-000000000104','a1000000-0000-0000-0000-000000000001',null,null,'Final',104,'2026-07-19 19:00:00+00','2026-07-19 18:00:00+00','scheduled','50000000-0000-0000-0000-000000000006'); -- Final, MetLife

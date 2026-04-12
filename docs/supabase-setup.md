# FanQuin — Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose your organisation, set a project name (e.g. `fanquin`), pick a region close to your users (US East / US West recommended for WC2026 launch)
3. Set a strong database password and save it — you'll need it for migrations
4. Wait ~2 minutes for the project to provision

---

## 2. Get Your API Keys

In the Supabase dashboard go to **Project Settings → API**.

> ⚠️ Supabase now uses **Publishable / Secret** key naming (previously anon / service_role). Both tabs are available — use whichever your project shows.

| Key                                    | Where to use                                                               |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `Project URL`                          | `VITE_SUPABASE_URL` and `SUPABASE_URL`                                     |
| `Publishable key` (formerly `anon`)    | `VITE_SUPABASE_ANON_KEY` — safe to expose to client                        |
| `Secret key` (formerly `service_role`) | `SUPABASE_SERVICE_ROLE_KEY` — **server-side only, never expose to client** |

The publishable key starts with `sb_publishable_...` and the secret key starts with `sb_secret_...`.

---

## 3. Set Environment Variables

Copy `.env.example` to `.env` in the project root (`.env` is gitignored — never commit real keys):

```bash
cp .env.example .env
```

Then fill in your values:

```bash
# Supabase — public (safe for client)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxx...

# Supabase — server-side only (never expose to client)
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxx...

# Email (SMTP)
SMTP_HOST=mail.disruptinglabs.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply-fanquin@disruptinglabs.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=FanQuin <no-reply-fanquin@disruptinglabs.com>

# App
APP_URL=http://localhost:5173
```

The Supabase client in `client/lib/supabase.ts` reads the `VITE_` vars automatically. The server reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` directly.

### Multiple Projects

Each Supabase project is a fully independent Postgres database with its own URL and keys. You can run multiple apps (e.g. FanQuin + another project) from separate Supabase projects — just create a new project in the dashboard and use its own set of env vars in each repo. The free tier supports 2 active projects.

---

## 4. Import the Schema

> **Migration structure**
>
> | Path                   | Purpose                                                             |
> | ---------------------- | ------------------------------------------------------------------- |
> | `database/schema.sql`  | **Full base schema** — run once on a blank DB                       |
> | `database/migrations/` | **Incremental changes** — run on top of the schema for existing DBs |
>
> `database/` is the single source of truth. `supabase/migrations/` is only used by the Supabase CLI for local dev.

### Step 1 — Import the full base schema (blank DB)

**Option A — Supabase SQL Editor (recommended)**

1. Dashboard → **SQL Editor → New query**
2. Open `database/schema.sql`, paste the full content, click **Run**

**Option B — psql**

```bash
psql "postgresql://postgres:YOUR_DB_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres" \
  -f database/schema.sql
```

**Option C — Supabase CLI**

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --file database/schema.sql
```

### Step 2 — Apply pending migrations (existing DB)

After the base schema is in place, run the single pending migration file that adds all incremental changes:

```sql
-- Paste into Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Or: psql ... -f database/migrations/20260410_000000_external_ids_and_test_league.sql
```

File: `database/migrations/20260410_000000_external_ids_and_test_league.sql`

This migration adds:

- `external_id` columns on `competitions`, `teams`, `matches` (football-data.org sync)
- `last_synced_at` on `competitions` and `matches`
- `is_test` flag on `competitions` and `groups`
- The complete **FanQuin Test League** seed data (see section 10)

---

## 5. Enable Auth Providers

In **Authentication → Providers**:

- **Email** — enable, set "Confirm email" to your preference
- **Google / Apple / GitHub** — optional, enable as needed and add OAuth credentials

The `handle_new_user` trigger in the schema auto-creates a row in `public.profiles` for every new `auth.users` entry, so no manual profile creation is needed.

---

## 6. Storage (optional — for avatars / flag images)

In **Storage → New bucket**:

- Name: `avatars`, Public: yes
- Name: `flags`, Public: yes

Add a policy to `avatars` so users can upload their own:

```sql
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 7. Using the Client in the App

The client is already configured in `client/lib/supabase.ts`. Use it anywhere in slices or server functions:

```typescript
import { supabase } from "@/lib/supabase";

// Fetch competitions
const { data, error } = await supabase
  .from("competitions")
  .select("*")
  .eq("is_active", true);

// Fetch group leaderboard
const { data: members } = await supabase
  .from("group_members")
  .select("user_id, total_points, rank, profiles(display_name, avatar_url)")
  .eq("group_id", groupId)
  .order("total_points", { ascending: false });

// Insert a prediction
const { error } = await supabase.from("predictions").insert({
  group_id: groupId,
  user_id: userId,
  match_id: matchId,
  predicted_home: 2,
  predicted_away: 1,
});

// Auth — sign up
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password",
  options: {
    data: { username: "maya_r", display_name: "Maya R." },
  },
});

// Auth — sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password",
});

// Get current session
const {
  data: { session },
} = await supabase.auth.getSession();
```

---

## 8. Redux Integration Pattern

Per project rules all data fetching must happen in Redux slices:

```typescript
// client/store/slices/groupSlice.ts
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { supabase } from "@/lib/supabase";

export const fetchGroupMembers = createAsyncThunk(
  "group/fetchMembers",
  async (groupId: string) => {
    const { data, error } = await supabase
      .from("group_members")
      .select(
        `
        user_id, total_points, prediction_pts, ownership_pts,
        current_streak, rank,
        profiles(display_name, avatar_url)
      `,
      )
      .eq("group_id", groupId)
      .order("total_points", { ascending: false });

    if (error) throw error;
    return data;
  },
);
```

---

## 9. Real-time Subscriptions (live leaderboard)

```typescript
// Subscribe to group_members changes for live rank updates
const channel = supabase
  .channel(`group-${groupId}`)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "group_members",
      filter: `group_id=eq.${groupId}`,
    },
    (payload) => {
      dispatch(updateMember(payload.new));
    },
  )
  .subscribe();

// Clean up on unmount
return () => {
  supabase.removeChannel(channel);
};
```

---

## 10. Database Migrations

`database/migrations/` is the **only** folder for schema changes. Never edit `database/schema.sql` directly — add a new migration file instead.

File naming: `YYYYMMDD_HHMMSS_short_description.sql`

```
database/migrations/
  20260410_000000_external_ids_and_test_league.sql   ← current pending migration
  20260501_120000_your_next_change.sql               ← future changes go here
```

Apply a migration:

```bash
# Option A — SQL Editor: paste file contents and click Run

# Option B — psql
psql "postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres" \
  -f database/migrations/20260410_000000_external_ids_and_test_league.sql

# Option C — Supabase CLI
supabase db push --file database/migrations/20260410_000000_external_ids_and_test_league.sql
```

---

## 11. Test League

The pending migration seeds a **FanQuin Test League** that lets you test all game modes and match states in any environment, including production.

### Game modes to test

| Invite code | Mode          | What it tests                             |
| ----------- | ------------- | ----------------------------------------- |
| `TSTCASUL`  | `casual`      | Prediction-only scoring, no ELO, no draft |
| `TSTFRNDS`  | `friends`     | Snake draft + full scoring + ownership    |
| `TSTLEAGU`  | `league`      | Balanced-tier draft + ELO k=32            |
| `TSTCMPET`  | `competitive` | 3 survivor lives + ELO k=32               |
| `TSTGLOBL`  | `global`      | 200-member lobby + ELO k=16               |

### Match states available immediately after migration

| Match                         | Status              | Prediction window              |
| ----------------------------- | ------------------- | ------------------------------ |
| Alpha FC vs Beta United       | `completed` (2-1)   | —                              |
| Gamma City vs Delta SC        | `live`              | Closed (kicked off 30 min ago) |
| Epsilon Real vs Zeta Athletic | `scheduled`         | **Open** (kicks off in 2 days) |
| Eta Rovers vs Theta Club      | `scheduled`         | **Closed** (kicks off in 2h)   |
| Alpha FC vs Epsilon Real      | `scheduled` (Final) | Open (kicks off in 7 days)     |

### Toggling visibility

By default the test league is **hidden** from regular users (`is_test = true`). The API filters it out of `/api/competitions` and the default live feed.

**Expose to all users** (e.g. for load testing in production):

```sql
UPDATE public.competitions
SET    is_test = false
WHERE  id = 'ffffffff-0000-0000-0000-000000000001';
```

**Hide again**:

```sql
UPDATE public.competitions
SET    is_test = true
WHERE  id = 'ffffffff-0000-0000-0000-000000000001';
```

### Resetting match states

Match dates are relative to when the migration was run. After a few days some states will go stale. Use the admin endpoint to re-anchor them to now:

```bash
# Reset match dates only
curl -X POST https://YOUR_DOMAIN/api/admin/test-league/reset \
  -H "X-Admin-Secret: YOUR_ADMIN_SECRET"

# Reset match dates AND clear all predictions + member stats
curl -X POST "https://YOUR_DOMAIN/api/admin/test-league/reset?clear_data=true" \
  -H "X-Admin-Secret: YOUR_ADMIN_SECRET"
```

Add `ADMIN_SECRET=your-secret` to `.env` before using this endpoint.

### Accessing test groups directly

Join any test group via invite code on the `/join` page or directly:

```
https://YOUR_DOMAIN/join?code=TSTFRNDS
```

---

## Key Tables Reference

| Table                                          | Purpose                                                |
| ---------------------------------------------- | ------------------------------------------------------ |
| `profiles`                                     | User profiles (auto-created on signup)                 |
| `competitions`                                 | WC2026 + future leagues                                |
| `teams`                                        | National teams with tier rating                        |
| `matches`                                      | Match schedule, scores, upset multiplier               |
| `groups`                                       | Private game circles with invite code + scoring config |
| `group_members`                                | Points breakdown per user per group                    |
| `team_ownership`                               | Draft assignments (snake/random/balanced)              |
| `team_match_events`                            | Goals/clean sheets per match (drives ownership pts)    |
| `predictions`                                  | User score predictions (locked before match)           |
| `boosts`                                       | Power-up tokens (double, underdog, etc.)               |
| `rivalries`                                    | Weekly 1v1 head-to-head matchups                       |
| `leaderboard_snapshots`                        | Weekly snapshots for share cards                       |
| `streak_events`                                | Streak milestones and breaks                           |
| `elo_history`                                  | ELO rating changes (league/competitive modes)          |
| `survivor_rounds` / `survivor_entries`         | Survivor mode                                          |
| `brackets` / `bracket_matchups`                | Bracket mode                                           |
| `daily_challenges` / `daily_challenge_entries` | Global mode daily tasks                                |
| `notifications`                                | In-app notification feed                               |

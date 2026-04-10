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

### Option A — Supabase SQL Editor (recommended for first setup)

1. In the dashboard open **SQL Editor → New query**
2. Open `database/schema.sql` from this repo
3. Paste the entire file content into the editor
4. Click **Run** — it will create all tables, enums, indexes, RLS policies, triggers, and seed the WC2026 competition row

### Option B — Supabase CLI (recommended for teams / CI)

```bash
# Install the CLI
brew install supabase/tap/supabase

# Log in
supabase login

# Link to your remote project (get the project ref from Project Settings → General)
supabase link --project-ref YOUR_PROJECT_REF

# Push the schema
supabase db push --file database/schema.sql
```

### Option C — psql direct connection

```bash
psql "postgresql://postgres:YOUR_DB_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres" \
  -f database/schema.sql
```

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

Future schema changes go in `database/migrations/` with a timestamp prefix:

```
database/migrations/
  20260328_120000_add_elo_history.sql
  20260401_090000_add_daily_challenges.sql
```

Apply them with:

```bash
supabase db push --file database/migrations/20260328_120000_add_elo_history.sql
```

Or in the SQL Editor for quick one-off changes.

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

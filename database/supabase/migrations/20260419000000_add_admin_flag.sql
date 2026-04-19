-- ============================================================
-- Admin Back-Office: separate admin_users + admin_sessions tables
--
-- Admin accounts are completely independent of the regular
-- profiles / auth.users tables — no cross-table references.
-- ============================================================

-- ── 1. Admin accounts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  username      text UNIQUE NOT NULL,
  display_name  text,
  first_name    text,
  last_name     text,
  phone         text,
  country       text,
  locale        text NOT NULL DEFAULT 'en',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every row change
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 2. Admin sessions ─────────────────────────────────────────
-- Raw token lives only on the client; this table stores its hash.
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id   uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  token_hash      text NOT NULL UNIQUE,
  expires_at      timestamptz NOT NULL,
  revoked_at      timestamptz,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_sessions_token_hash_idx
  ON public.admin_sessions (token_hash);
CREATE INDEX IF NOT EXISTS admin_sessions_admin_user_id_idx
  ON public.admin_sessions (admin_user_id);

-- ── 3. Row-level security ─────────────────────────────────────
-- Both tables are only accessible via the service-role key
-- (used by getSupabaseAdmin()). Anon/authed roles have no access.
ALTER TABLE public.admin_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated roles.
-- The service role bypasses RLS and is the only consumer of these tables.

-- ── 4. First admin: Alex Gomez ────────────────────────────────
INSERT INTO public.admin_users (
  email, username, display_name, first_name, last_name, locale, is_active
) VALUES (
  'axgoomez@gmail.com', 'axgomez', 'Alex Gomez', 'Alex', 'Gomez', 'en', true
)
ON CONFLICT (email) DO UPDATE
  SET
    display_name = EXCLUDED.display_name,
    first_name   = EXCLUDED.first_name,
    last_name    = EXCLUDED.last_name,
    is_active    = true;

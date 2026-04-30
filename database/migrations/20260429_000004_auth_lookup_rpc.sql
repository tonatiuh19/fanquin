-- Migration: 20260429_000004_auth_lookup_rpc
-- Purpose: Bypass broken GoTrue listUsers() API by creating SECURITY DEFINER
--          functions that query auth.users directly from the public schema.
--          Called via supabase.rpc() in api/index.ts.

create or replace function public.get_auth_user_id_by_email(p_email text)
returns uuid
language sql
security definer
stable
as $$
  select id from auth.users
  where lower(email) = lower(p_email)
  limit 1;
$$;

create or replace function public.auth_user_exists_by_email(p_email text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(p_email)
  );
$$;

-- Restrict to service_role only (called from backend, not from client)
revoke execute on function public.get_auth_user_id_by_email(text)  from public, anon, authenticated;
revoke execute on function public.auth_user_exists_by_email(text)   from public, anon, authenticated;

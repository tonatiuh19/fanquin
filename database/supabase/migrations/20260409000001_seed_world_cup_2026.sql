-- ============================================================
-- Seed: FIFA World Cup 2026
-- ============================================================

insert into public.competitions (
  id,
  name,
  short_name,
  type,
  season,
  starts_at,
  ends_at,
  is_active,
  logo_url
) values (
  '00000000-0000-0000-0000-000000000001',
  'FIFA World Cup 2026',
  'WC 2026',
  'world_cup',
  '2026',
  '2026-06-11T19:00:00Z',
  '2026-07-19T20:00:00Z',
  true,
  null
)
on conflict (id) do update set
  name       = excluded.name,
  short_name = excluded.short_name,
  is_active  = excluded.is_active,
  starts_at  = excluded.starts_at,
  ends_at    = excluded.ends_at;

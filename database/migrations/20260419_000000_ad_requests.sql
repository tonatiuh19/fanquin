-- ============================================================
-- Migration: 20260419_000000_ad_requests
-- Adds the ad_requests table for the "Advertise with Us" feature.
-- ============================================================

create type ad_request_status as enum ('pending', 'contacted', 'approved', 'rejected');

create type ad_format as enum (
  'banner',
  'sponsored_group',
  'email_marketing',
  'homepage_spotlight',
  'other'
);

create table public.ad_requests (
  id              uuid primary key default gen_random_uuid(),
  -- Brand / contact info
  brand_name      text not null,
  contact_name    text not null,
  contact_email   text not null,
  contact_phone   text,
  website_url     text,
  -- Campaign details
  ad_format       ad_format not null default 'banner',
  budget_range    text,           -- e.g. '$500–$1,000/month'
  campaign_goal   text,           -- 'brand_awareness' | 'app_installs' | 'conversions' | 'other'
  message         text,
  -- Admin workflow
  status          ad_request_status not null default 'pending',
  admin_notes     text,
  -- Metadata
  ip_address      inet,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_ad_requests_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_ad_requests_updated_at
  before update on public.ad_requests
  for each row execute procedure update_ad_requests_updated_at();

-- Index for admin listing (most recent first)
create index idx_ad_requests_created_at on public.ad_requests(created_at desc);
create index idx_ad_requests_status on public.ad_requests(status);

-- Enable RLS — all access goes through the server-side service role key,
-- which bypasses RLS. No client-facing policies are needed.
alter table public.ad_requests enable row level security;

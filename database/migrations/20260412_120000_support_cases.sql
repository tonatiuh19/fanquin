-- ============================================================
-- Migration: support_cases table
-- FanQuin — user-submitted support cases
-- ============================================================

create type support_case_category as enum (
  'account',
  'group',
  'predictions',
  'scoring',
  'technical',
  'billing',
  'other'
);

create type support_case_status as enum (
  'open',
  'in_review',
  'resolved',
  'closed'
);

create table public.support_cases (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  category      support_case_category not null default 'other',
  subject       text not null,
  message       text not null,
  status        support_case_status not null default 'open',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index idx_support_cases_user_id  on public.support_cases(user_id);
create index idx_support_cases_status   on public.support_cases(status);
create index idx_support_cases_created  on public.support_cases(created_at desc);

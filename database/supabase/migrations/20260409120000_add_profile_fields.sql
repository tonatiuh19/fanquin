-- Migration: add first_name, last_name, phone, country to profiles
-- Date: 2026-04-09

alter table public.profiles
  add column if not exists first_name  text,
  add column if not exists last_name   text,
  add column if not exists phone       text,
  add column if not exists country     text;

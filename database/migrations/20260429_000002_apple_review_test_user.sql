-- ============================================================
-- Migration: Apple App Store Review Test User
-- Date: 2026-04-29
-- Purpose: Create a stable test account (test@fanquin.com) for
--          Apple App Store review. The API accepts "123456" as a
--          permanent bypass OTP for this email only.
-- ============================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Only insert if not already present
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test@fanquin.com') THEN

    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'test@fanquin.com',
      '',                          -- password-less (OTP-only auth)
      now(),                       -- email pre-confirmed
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      now(),
      now(),
      'authenticated',
      'authenticated'
    );

    -- Profile: Hugo Sanchez, Mexico
    -- ON CONFLICT handles the case where Supabase's auth trigger already
    -- created a stub profile row before this INSERT runs.
    INSERT INTO public.profiles (
      id,
      username,
      display_name,
      first_name,
      last_name,
      phone,
      country,
      locale,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      'hugo_sanchez',
      'Hugo Sanchez',
      'Hugo',
      'Sanchez',
      '+52 55 3142 8967',
      'MX',
      'es',
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      username     = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      first_name   = EXCLUDED.first_name,
      last_name    = EXCLUDED.last_name,
      phone        = EXCLUDED.phone,
      country      = EXCLUDED.country,
      locale       = EXCLUDED.locale,
      updated_at   = now();

    RAISE NOTICE 'Apple review test user created: test@fanquin.com (id: %)', v_user_id;

  ELSE
    RAISE NOTICE 'Apple review test user already exists — skipping.';
  END IF;
END $$;

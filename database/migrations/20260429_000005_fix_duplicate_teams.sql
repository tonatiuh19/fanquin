-- Migration: 20260429_000005_fix_duplicate_teams
-- Root cause: migration 000003 (apple review seed data) inserted 5 teams with
-- random UUIDs for teams that already existed with canonical 60000000-* IDs,
-- causing duplicate entries in available_teams during drafts.
--
-- Duplicate (non-canonical) IDs:
--   France:    0da406d3-55a2-4fd9-aa74-6d9819ce6568  → 60000000-0000-0000-0000-000000000033
--   Germany:   2f9e4ab3-9247-46a4-8716-426753878876  → 60000000-0000-0000-0000-000000000017
--   Argentina: d5773a92-aa00-4a10-a372-08139260e77c  → 60000000-0000-0000-0000-000000000037
--   Brazil:    e4dba345-add8-4fa0-a407-11990ad56fc4  → 60000000-0000-0000-0000-000000000009
--   Mexico:    5b649804-fac4-457e-ad71-f8181d62de8b  → 60000000-0000-0000-0000-000000000001

-- Step 1: For draft_picks referencing duplicate team IDs, update to canonical ID
-- where no pick for the canonical ID already exists in that group.
-- (If both exist in the same group, the duplicate pick is simply deleted in Step 2.)

UPDATE public.draft_picks SET team_id = '60000000-0000-0000-0000-000000000033'
WHERE team_id = '0da406d3-55a2-4fd9-aa74-6d9819ce6568'
  AND NOT EXISTS (
    SELECT 1 FROM public.draft_picks dp2
    WHERE dp2.group_id = draft_picks.group_id
      AND dp2.team_id = '60000000-0000-0000-0000-000000000033'
  );

UPDATE public.draft_picks SET team_id = '60000000-0000-0000-0000-000000000017'
WHERE team_id = '2f9e4ab3-9247-46a4-8716-426753878876'
  AND NOT EXISTS (
    SELECT 1 FROM public.draft_picks dp2
    WHERE dp2.group_id = draft_picks.group_id
      AND dp2.team_id = '60000000-0000-0000-0000-000000000017'
  );

UPDATE public.draft_picks SET team_id = '60000000-0000-0000-0000-000000000037'
WHERE team_id = 'd5773a92-aa00-4a10-a372-08139260e77c'
  AND NOT EXISTS (
    SELECT 1 FROM public.draft_picks dp2
    WHERE dp2.group_id = draft_picks.group_id
      AND dp2.team_id = '60000000-0000-0000-0000-000000000037'
  );

UPDATE public.draft_picks SET team_id = '60000000-0000-0000-0000-000000000009'
WHERE team_id = 'e4dba345-add8-4fa0-a407-11990ad56fc4'
  AND NOT EXISTS (
    SELECT 1 FROM public.draft_picks dp2
    WHERE dp2.group_id = draft_picks.group_id
      AND dp2.team_id = '60000000-0000-0000-0000-000000000009'
  );

UPDATE public.draft_picks SET team_id = '60000000-0000-0000-0000-000000000001'
WHERE team_id = '5b649804-fac4-457e-ad71-f8181d62de8b'
  AND NOT EXISTS (
    SELECT 1 FROM public.draft_picks dp2
    WHERE dp2.group_id = draft_picks.group_id
      AND dp2.team_id = '60000000-0000-0000-0000-000000000001'
  );

-- Step 2: Delete any remaining draft_picks still pointing to duplicate team IDs
-- (these are the conflicting ones where both duplicate and canonical exist in same group)
DELETE FROM public.draft_picks WHERE team_id IN (
  '0da406d3-55a2-4fd9-aa74-6d9819ce6568',
  '2f9e4ab3-9247-46a4-8716-426753878876',
  'd5773a92-aa00-4a10-a372-08139260e77c',
  'e4dba345-add8-4fa0-a407-11990ad56fc4',
  '5b649804-fac4-457e-ad71-f8181d62de8b'
);

-- Step 3: Fix team_ownership the same way
UPDATE public.team_ownership SET team_id = '60000000-0000-0000-0000-000000000033'
WHERE team_id = '0da406d3-55a2-4fd9-aa74-6d9819ce6568'
  AND NOT EXISTS (
    SELECT 1 FROM public.team_ownership t2
    WHERE t2.group_id = team_ownership.group_id
      AND t2.team_id = '60000000-0000-0000-0000-000000000033'
  );

UPDATE public.team_ownership SET team_id = '60000000-0000-0000-0000-000000000017'
WHERE team_id = '2f9e4ab3-9247-46a4-8716-426753878876'
  AND NOT EXISTS (
    SELECT 1 FROM public.team_ownership t2
    WHERE t2.group_id = team_ownership.group_id
      AND t2.team_id = '60000000-0000-0000-0000-000000000017'
  );

UPDATE public.team_ownership SET team_id = '60000000-0000-0000-0000-000000000037'
WHERE team_id = 'd5773a92-aa00-4a10-a372-08139260e77c'
  AND NOT EXISTS (
    SELECT 1 FROM public.team_ownership t2
    WHERE t2.group_id = team_ownership.group_id
      AND t2.team_id = '60000000-0000-0000-0000-000000000037'
  );

UPDATE public.team_ownership SET team_id = '60000000-0000-0000-0000-000000000009'
WHERE team_id = 'e4dba345-add8-4fa0-a407-11990ad56fc4'
  AND NOT EXISTS (
    SELECT 1 FROM public.team_ownership t2
    WHERE t2.group_id = team_ownership.group_id
      AND t2.team_id = '60000000-0000-0000-0000-000000000009'
  );

UPDATE public.team_ownership SET team_id = '60000000-0000-0000-0000-000000000001'
WHERE team_id = '5b649804-fac4-457e-ad71-f8181d62de8b'
  AND NOT EXISTS (
    SELECT 1 FROM public.team_ownership t2
    WHERE t2.group_id = team_ownership.group_id
      AND t2.team_id = '60000000-0000-0000-0000-000000000001'
  );

DELETE FROM public.team_ownership WHERE team_id IN (
  '0da406d3-55a2-4fd9-aa74-6d9819ce6568',
  '2f9e4ab3-9247-46a4-8716-426753878876',
  'd5773a92-aa00-4a10-a372-08139260e77c',
  'e4dba345-add8-4fa0-a407-11990ad56fc4',
  '5b649804-fac4-457e-ad71-f8181d62de8b'
);

-- Step 4: Delete the duplicate team rows
DELETE FROM public.teams WHERE id IN (
  '0da406d3-55a2-4fd9-aa74-6d9819ce6568',
  '2f9e4ab3-9247-46a4-8716-426753878876',
  'd5773a92-aa00-4a10-a372-08139260e77c',
  'e4dba345-add8-4fa0-a407-11990ad56fc4',
  '5b649804-fac4-457e-ad71-f8181d62de8b'
);

-- Step 5: Add unique constraint to prevent this happening again
ALTER TABLE public.teams
  ADD CONSTRAINT teams_competition_short_name_unique
  UNIQUE (competition_id, short_name);

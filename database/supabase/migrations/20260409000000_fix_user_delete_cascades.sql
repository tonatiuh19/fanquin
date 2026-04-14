-- ============================================================
-- Fix missing ON DELETE behaviour for profile foreign keys
-- Without these, deleting a user who owns groups or has rivalry
-- records would raise a foreign-key violation.
-- ============================================================

-- groups.owner_id → when the owner is deleted, delete the group too
ALTER TABLE public.groups
  DROP CONSTRAINT groups_owner_id_fkey,
  ADD CONSTRAINT groups_owner_id_fkey
    FOREIGN KEY (owner_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- rivalries: all three player columns → cascade delete the rivalry row
ALTER TABLE public.rivalries
  DROP CONSTRAINT rivalries_player_a_id_fkey,
  ADD CONSTRAINT rivalries_player_a_id_fkey
    FOREIGN KEY (player_a_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.rivalries
  DROP CONSTRAINT rivalries_player_b_id_fkey,
  ADD CONSTRAINT rivalries_player_b_id_fkey
    FOREIGN KEY (player_b_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.rivalries
  DROP CONSTRAINT rivalries_winner_id_fkey,
  ADD CONSTRAINT rivalries_winner_id_fkey
    FOREIGN KEY (winner_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;  -- winner may be set to null; row still makes sense historically

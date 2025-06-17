
-- -----------------------------------------------------------------------------
-- Comprehensive Row Level Security (RLS) Policies for GymTrack Lite
-- -----------------------------------------------------------------------------
-- IMPORTANT ASSUMPTION:
-- These policies assume that your Supabase authentication flow sets a custom
-- JWT claim `app_metadata.gym_id` for each authenticated user. This claim
-- must contain the UUID of the gym the user is authorized to manage.
-- If this claim is not present or incorrectly set, these RLS policies will
-- likely prevent data access and operations as intended.
--
-- All policies are targeted at the `authenticated` role.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Table: gyms
-- Policy: Gym owners can only see and update their own gym's details.
--         Insertion and Deletion are typically super_admin tasks.
-- -----------------------------------------------------------------------------

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow gym owners to view their own gym" ON public.gyms;
CREATE POLICY "Allow gym owners to view their own gym"
ON public.gyms
FOR SELECT
TO authenticated
USING (
  id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);

DROP POLICY IF EXISTS "Allow gym owners to update their own gym" ON public.gyms;
CREATE POLICY "Allow gym owners to update their own gym"
ON public.gyms
FOR UPDATE
TO authenticated
USING (
  id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
)
WITH CHECK (
  id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- -----------------------------------------------------------------------------
-- Table: plans
-- Policy: All authenticated users (gym owners) can view all plans.
--         Plan management (C/U/D) is assumed to be a super_admin task.
-- -----------------------------------------------------------------------------

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view all plans" ON public.plans;
CREATE POLICY "Allow authenticated users to view all plans"
ON public.plans
FOR SELECT
TO authenticated
USING (true);

-- -----------------------------------------------------------------------------
-- Table: members
-- Policy: Gym owners can manage members belonging to their gym.
-- -----------------------------------------------------------------------------

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow gym owners to view members of their gym" ON public.members;
CREATE POLICY "Allow gym owners to view members of their gym"
ON public.members
FOR SELECT
TO authenticated
USING (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);

DROP POLICY IF EXISTS "Allow gym owners to insert members into their gym" ON public.members;
CREATE POLICY "Allow gym owners to insert members into their gym"
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);

DROP POLICY IF EXISTS "Allow gym owners to update members of their gym" ON public.members;
CREATE POLICY "Allow gym owners to update members of their gym"
ON public.members
FOR UPDATE
TO authenticated
USING (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
)
WITH CHECK (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);

DROP POLICY IF EXISTS "Allow gym owners to delete members from their gym" ON public.members;
CREATE POLICY "Allow gym owners to delete members from their gym"
ON public.members
FOR DELETE
TO authenticated
USING (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- -----------------------------------------------------------------------------
-- Table: check_ins
-- Policy: Gym owners can manage check_ins for their gym and its members.
-- -----------------------------------------------------------------------------

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow gym owners to view check_ins for their gym" ON public.check_ins;
CREATE POLICY "Allow gym owners to view check_ins for their gym"
ON public.check_ins
FOR SELECT
TO authenticated
USING (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);

DROP POLICY IF EXISTS "Allow gym owners to insert check_ins for members of their gym" ON public.check_ins;
CREATE POLICY "Allow gym owners to insert check_ins for members of their gym"
ON public.check_ins
FOR INSERT
TO authenticated
WITH CHECK (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid AND
  EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.id = check_ins.member_table_id AND m.gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
  )
);

DROP POLICY IF EXISTS "Allow gym owners to update check_ins for their gym" ON public.check_ins;
CREATE POLICY "Allow gym owners to update check_ins for their gym"
ON public.check_ins
FOR UPDATE
TO authenticated
USING (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
)
WITH CHECK (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid AND
  EXISTS ( -- Ensure the member being updated still belongs to the gym
    SELECT 1
    FROM public.members m
    WHERE m.id = check_ins.member_table_id AND m.gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
  )
);

DROP POLICY IF EXISTS "Allow gym owners to delete check_ins for their gym" ON public.check_ins;
CREATE POLICY "Allow gym owners to delete check_ins for their gym"
ON public.check_ins
FOR DELETE
TO authenticated
USING (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);


-- -----------------------------------------------------------------------------
-- Table: announcements
-- Policy: Gym owners can manage announcements for their gym.
-- -----------------------------------------------------------------------------

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow gym owners to view announcements for their gym" ON public.announcements;
CREATE POLICY "Allow gym owners to view announcements for their gym"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);

DROP POLICY IF EXISTS "Allow gym owners to insert announcements for their gym" ON public.announcements;
CREATE POLICY "Allow gym owners to insert announcements for their gym"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);

DROP POLICY IF EXISTS "Allow gym owners to update announcements for their gym" ON public.announcements;
CREATE POLICY "Allow gym owners to update announcements for their gym"
ON public.announcements
FOR UPDATE
TO authenticated
USING (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
)
WITH CHECK (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);

DROP POLICY IF EXISTS "Allow gym owners to delete announcements for their gym" ON public.announcements;
CREATE POLICY "Allow gym owners to delete announcements for their gym"
ON public.announcements
FOR DELETE
TO authenticated
USING (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- -----------------------------------------------------------------------------
-- End of RLS Policies
-- -----------------------------------------------------------------------------
-- Remember to test these policies thoroughly after application.
-- -----------------------------------------------------------------------------

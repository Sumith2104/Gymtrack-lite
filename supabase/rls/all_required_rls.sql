-- Ensure RLS is enabled for all tables mentioned below in your Supabase dashboard.
-- This script includes DROP POLICY IF EXISTS statements to make it safe to re-run.

-- =============================================
-- Table: gyms
-- =============================================
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- Policy: Allow gym owners to select their own gym's details (for authenticated users post-login)
DROP POLICY IF EXISTS "Allow gym owners to select their own gym" ON public.gyms;
CREATE POLICY "Allow gym owners to select their own gym"
ON public.gyms
FOR SELECT
TO authenticated
USING (
  id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- Policy: Allow anon role to query gyms for login verification (used by verifyGymOwnerCredentials server action)
-- The server action itself filters by owner_email and formatted_gym_id.
DROP POLICY IF EXISTS "Allow anon to query gyms for login verification" ON public.gyms;
CREATE POLICY "Allow anon to query gyms for login verification"
ON public.gyms
FOR SELECT
TO anon
USING (true); -- The server action's WHERE clause provides the actual filtering.

-- Policy: Allow gym owners to update their own gym's details
DROP POLICY IF EXISTS "Allow gym owners to update their own gym" ON public.gyms;
CREATE POLICY "Allow gym owners to update their own gym"
ON public.gyms
FOR UPDATE
TO authenticated
USING (
  id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
)
WITH CHECK (
  id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- Other operations like INSERT and DELETE on 'gyms' table are typically restricted to super admins or specific backend processes.

-- =============================================
-- Table: plans
-- =============================================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users (gym owners) to select any plan
DROP POLICY IF EXISTS "Allow authenticated users to select plans" ON public.plans;
CREATE POLICY "Allow authenticated users to select plans"
ON public.plans
FOR SELECT
TO authenticated
USING (true);

-- INSERT, UPDATE, DELETE on 'plans' are typically restricted to super admins.
-- If gym owners need to manage plans, specific policies would be required.
-- Example (if gym owners could create plans linked to their gym, and plans had a gym_id FK):
-- CREATE POLICY "Allow gym owners to insert plans for their gym"
-- ON public.plans
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid);

-- =============================================
-- Table: members
-- =============================================
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Policy: Allow gym owners to select members of their own gym
DROP POLICY IF EXISTS "Allow gym owners to select members of their gym" ON public.members;
CREATE POLICY "Allow gym owners to select members of their gym"
ON public.members
FOR SELECT
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- Policy: Allow gym owners to insert members into their own gym
DROP POLICY IF EXISTS "Allow gym owners to insert members into their gym" ON public.members;
CREATE POLICY "Allow gym owners to insert members into their gym"
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- Policy: Allow gym owners to update members of their own gym
DROP POLICY IF EXISTS "Allow gym owners to update members of their gym" ON public.members;
CREATE POLICY "Allow gym owners to update members of their gym"
ON public.members
FOR UPDATE
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
)
WITH CHECK (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- Policy: Allow gym owners to delete members of their own gym
DROP POLICY IF EXISTS "Allow gym owners to delete members of their gym" ON public.members;
CREATE POLICY "Allow gym owners to delete members of their gym"
ON public.members
FOR DELETE
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- =============================================
-- Table: check_ins
-- =============================================
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Policy: Allow gym owners to select check_ins for their gym
DROP POLICY IF EXISTS "Allow gym owners to select check_ins for their gym" ON public.check_ins;
CREATE POLICY "Allow gym owners to select check_ins for their gym"
ON public.check_ins
FOR SELECT
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- Policy: Allow gym owners to insert check_ins for their gym
-- (and ensure the member_table_id also belongs to that gym)
DROP POLICY IF EXISTS "Allow gym owners to insert check_ins for their gym" ON public.check_ins;
CREATE POLICY "Allow gym owners to insert check_ins for their gym"
ON public.check_ins
FOR INSERT
TO authenticated
WITH CHECK (
  (gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid) AND
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = check_ins.member_table_id
    AND m.gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
  )
);

-- Policy: Allow gym owners to update check_ins for their gym (e.g., check_out_time)
DROP POLICY IF EXISTS "Allow gym owners to update check_ins for their gym" ON public.check_ins;
CREATE POLICY "Allow gym owners to update check_ins for their gym"
ON public.check_ins
FOR UPDATE
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
)
WITH CHECK (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- Policy: Allow gym owners to delete check_ins for their gym
DROP POLICY IF EXISTS "Allow gym owners to delete check_ins for their gym" ON public.check_ins;
CREATE POLICY "Allow gym owners to delete check_ins for their gym"
ON public.check_ins
FOR DELETE
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- =============================================
-- Table: announcements
-- =============================================
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Allow gym owners to select announcements for their gym
DROP POLICY IF EXISTS "Allow gym owners to select announcements for their gym" ON public.announcements;
CREATE POLICY "Allow gym owners to select announcements for their gym"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- Policy: Allow gym owners to insert announcements for their gym
DROP POLICY IF EXISTS "Allow gym owners to insert announcements for their gym" ON public.announcements;
CREATE POLICY "Allow gym owners to insert announcements for their gym"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- Policy: Allow gym owners to update announcements for their gym
DROP POLICY IF EXISTS "Allow gym owners to update announcements for their gym" ON public.announcements;
CREATE POLICY "Allow gym owners to update announcements for their gym"
ON public.announcements
FOR UPDATE
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
)
WITH CHECK (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- Policy: Allow gym owners to delete announcements for their gym
DROP POLICY IF EXISTS "Allow gym owners to delete announcements for their gym" ON public.announcements;
CREATE POLICY "Allow gym owners to delete announcements for their gym"
ON public.announcements
FOR DELETE
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- =============================================
-- Table: super_admins
-- =============================================
-- RLS for super_admins is typically very restrictive or managed differently,
-- often allowing only service_role access or specific admin users.
-- For this example, we'll assume no general user RLS is needed here beyond default deny.
-- ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
-- (Add policies if specific access patterns for super_admins are needed via RLS)

---------------------------------------------------------------------------------------
-- IMPORTANT JWT CLAIM ASSUMPTION:                                                   --
-- All policies for 'authenticated' users rely on a custom JWT claim                 --
-- `app_metadata.gym_id` being set with the UUID of the user's gym.                  --
-- If this claim is not present or incorrect, these policies will restrict access.   --
-- Ensure your authentication flow (e.g., Supabase Edge Function on signup/login)    --
-- correctly sets this claim.                                                        --
---------------------------------------------------------------------------------------

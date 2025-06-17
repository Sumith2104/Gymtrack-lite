
-- ==============================================================================
-- Comprehensive Row Level Security (RLS) Policies for GymTrack Lite
-- ==============================================================================
--
-- IMPORTANT PREQUISITE:
-- These policies assume that your Supabase authentication flow sets a custom
-- JWT claim named `gym_id` within the `app_metadata` of the authenticated
-- user's token. This `gym_id` must be the UUID of the gym the user owns.
-- Example JWT payload snippet:
-- {
--   "app_metadata": {
--     "gym_id": "your-gym-uuid-here"
--   }
-- }
-- Without this claim, these policies will likely deny access.
--

-- Helper function to extract gym_id from JWT (optional, but can simplify policies)
-- You might need to create this function in your Supabase SQL editor.
-- CREATE OR REPLACE FUNCTION auth.current_user_gym_id()
-- RETURNS uuid
-- LANGUAGE sql STABLE
-- AS $$
--   SELECT (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid;
-- $$;
-- If using this function, replace "(auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid"
-- with "auth.current_user_gym_id()" in the policies below.

-- ------------------------------------------------------------------------------
-- Table: gyms
-- ------------------------------------------------------------------------------
-- Enable RLS
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotency)
DROP POLICY IF EXISTS "Allow gym owner to view their own gym" ON public.gyms;
DROP POLICY IF EXISTS "Allow gym owner to update their own gym" ON public.gyms;
-- INSERT/DELETE for gyms are typically super-admin operations, not covered here for regular gym owners.

-- SELECT: Gym owners can view their own gym details.
CREATE POLICY "Allow gym owner to view their own gym"
ON public.gyms
FOR SELECT
TO authenticated
USING (
  id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- UPDATE: Gym owners can update their own gym details.
CREATE POLICY "Allow gym owner to update their own gym"
ON public.gyms
FOR UPDATE
TO authenticated
USING (
  id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
)
WITH CHECK (
  id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- ------------------------------------------------------------------------------
-- Table: plans
-- ------------------------------------------------------------------------------
-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view all plans" ON public.plans;
-- INSERT/UPDATE/DELETE for plans are typically super-admin operations.

-- SELECT: All authenticated users (gym owners) can view all plans.
-- This assumes plans are global and not gym-specific in terms of visibility.
CREATE POLICY "Allow authenticated users to view all plans"
ON public.plans
FOR SELECT
TO authenticated
USING (true); -- Or more explicitly: auth.role() = 'authenticated'

-- ------------------------------------------------------------------------------
-- Table: members
-- ------------------------------------------------------------------------------
-- Enable RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow gym owner to view members of their gym" ON public.members;
DROP POLICY IF EXISTS "Allow gym owner to insert members into their gym" ON public.members;
DROP POLICY IF EXISTS "Allow gym owner to update members of their gym" ON public.members;
DROP POLICY IF EXISTS "Allow gym owner to delete members from their gym" ON public.members;

-- SELECT: Gym owners can view members belonging to their gym.
CREATE POLICY "Allow gym owner to view members of their gym"
ON public.members
FOR SELECT
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- INSERT: Gym owners can insert new members into their gym.
CREATE POLICY "Allow gym owner to insert members into their gym"
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- UPDATE: Gym owners can update members belonging to their gym.
CREATE POLICY "Allow gym owner to update members of their gym"
ON public.members
FOR UPDATE
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
)
WITH CHECK (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- DELETE: Gym owners can delete members belonging to their gym.
CREATE POLICY "Allow gym owner to delete members from their gym"
ON public.members
FOR DELETE
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- ------------------------------------------------------------------------------
-- Table: check_ins
-- ------------------------------------------------------------------------------
-- Enable RLS
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow gym owner to view check_ins for their gym" ON public.check_ins;
DROP POLICY IF EXISTS "Allow gym owner to insert check_ins for their gym members" ON public.check_ins;
DROP POLICY IF EXISTS "Allow gym owner to update check_ins for their gym" ON public.check_ins;
DROP POLICY IF EXISTS "Allow gym owner to delete check_ins for their gym" ON public.check_ins;

-- SELECT: Gym owners can view check_ins for their gym.
CREATE POLICY "Allow gym owner to view check_ins for their gym"
ON public.check_ins
FOR SELECT
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- INSERT: Gym owners can insert check_ins for members belonging to their gym.
-- The member_table_id must also belong to the owner's gym.
CREATE POLICY "Allow gym owner to insert check_ins for their gym members"
ON public.check_ins
FOR INSERT
TO authenticated
WITH CHECK (
  (gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid) AND
  (EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.id = check_ins.member_table_id AND m.gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
  ))
);

-- UPDATE: Gym owners can update check_ins for their gym (e.g., to add check_out_time).
-- Ensures the check-in being updated belongs to their gym.
CREATE POLICY "Allow gym owner to update check_ins for their gym"
ON public.check_ins
FOR UPDATE
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
)
WITH CHECK (
  (gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid) AND
  (EXISTS ( -- Optional: Re-check member association on update if member_table_id can change
    SELECT 1
    FROM public.members m
    WHERE m.id = check_ins.member_table_id AND m.gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
  ))
);

-- DELETE: Gym owners can delete check_ins for their gym.
CREATE POLICY "Allow gym owner to delete check_ins for their gym"
ON public.check_ins
FOR DELETE
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- ------------------------------------------------------------------------------
-- Table: announcements
-- ------------------------------------------------------------------------------
-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow gym owner to view announcements for their gym" ON public.announcements;
DROP POLICY IF EXISTS "Allow gym owner to insert announcements for their gym" ON public.announcements;
DROP POLICY IF EXISTS "Allow gym owner to update announcements for their gym" ON public.announcements;
DROP POLICY IF EXISTS "Allow gym owner to delete announcements from their gym" ON public.announcements;

-- SELECT: Gym owners can view announcements for their gym.
CREATE POLICY "Allow gym owner to view announcements for their gym"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- INSERT: Gym owners can insert new announcements for their gym.
CREATE POLICY "Allow gym owner to insert announcements for their gym"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- UPDATE: Gym owners can update announcements for their gym.
CREATE POLICY "Allow gym owner to update announcements for their gym"
ON public.announcements
FOR UPDATE
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
)
WITH CHECK (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- DELETE: Gym owners can delete announcements from their gym.
CREATE POLICY "Allow gym owner to delete announcements from their gym"
ON public.announcements
FOR DELETE
TO authenticated
USING (
  gym_id = (auth.jwt() -> 'app_metadata'::text ->> 'gym_id')::uuid
);

-- ------------------------------------------------------------------------------
-- Table: super_admins
-- ------------------------------------------------------------------------------
-- RLS for `super_admins` is typically not managed through user roles like 'authenticated'.
-- Access to this table is usually restricted to database superusers or specific admin roles
-- that bypass standard RLS, or via Supabase dashboard with admin privileges.
-- Thus, no user-facing RLS policies are defined here for `super_admins`.
-- ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY; -- (If you choose to manage it with RLS)
-- Example (highly restrictive, only for a specific admin role if you had one):
-- CREATE POLICY "Allow super admin role full access" ON public.super_admins
-- FOR ALL USING (auth.role() = 'service_role'); -- Or a custom admin role

SELECT 'RLS policies script generated. Review and apply in Supabase SQL Editor.' AS status;

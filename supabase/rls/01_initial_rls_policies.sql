-- Supabase Row Level Security (RLS) Policies for GymTrack Lite
-- IMPORTANT:
-- 1. These policies assume you have updated your application's login flow to use
--    Supabase native authentication and that the JWT for authenticated users will contain:
--    - `app_metadata.gym_id` (UUID of the gym)
--    - `app_metadata.formatted_gym_id` (TEXT, e.g., "UOFIPOIB")
-- 2. Run `00_initial_schema.sql` BEFORE running this script.
-- 3. It's good practice to drop existing policies before creating new ones to avoid conflicts if re-running.

-- Helper function to get gym_id from JWT (UUID)
CREATE OR REPLACE FUNCTION get_current_gym_id_uuid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'gym_id'::text)::uuid;
$$;

-- Helper function to get formatted_gym_id from JWT (TEXT)
CREATE OR REPLACE FUNCTION get_current_formatted_gym_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'formatted_gym_id'::text)::text;
$$;

-- ==============================
-- Table: gyms
-- ==============================
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow gym owners to see their own gym" ON public.gyms;
CREATE POLICY "Allow gym owners to see their own gym"
ON public.gyms
FOR SELECT TO authenticated
USING (id = get_current_gym_id_uuid());

DROP POLICY IF EXISTS "Allow gym owners to update their own gym" ON public.gyms;
CREATE POLICY "Allow gym owners to update their own gym"
ON public.gyms
FOR UPDATE TO authenticated
USING (id = get_current_gym_id_uuid())
WITH CHECK (id = get_current_gym_id_uuid());

-- Policy for anon role to read gyms during login verification (used by server action)
DROP POLICY IF EXISTS "Allow anon to read gyms for login verification" ON public.gyms;
CREATE POLICY "Allow anon to read gyms for login verification"
ON public.gyms
FOR SELECT TO anon
USING (true); -- The server action `verifyGymOwnerCredentials` filters by owner_email and formatted_gym_id.

-- INSERT/DELETE on gyms typically handled by super admin or specific setup process.

-- ==============================
-- Table: plans
-- ==============================
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view all plans" ON public.plans;
CREATE POLICY "Allow authenticated users to view all plans"
ON public.plans
FOR SELECT TO authenticated
USING (true);
-- INSERT/UPDATE/DELETE on plans typically handled by super admin.

-- ==============================
-- Table: members
-- ==============================
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow gym owners to manage members of their gym" ON public.members;
CREATE POLICY "Allow gym owners to manage members of their gym"
ON public.members
FOR ALL TO authenticated
USING (gym_id = get_current_gym_id_uuid())
WITH CHECK (gym_id = get_current_gym_id_uuid());

-- ==============================
-- Table: check_ins
-- ==============================
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow gym owners to manage check_ins of their gym" ON public.check_ins;
CREATE POLICY "Allow gym owners to manage check_ins of their gym"
ON public.check_ins
FOR ALL TO authenticated
USING (gym_id = get_current_gym_id_uuid())
WITH CHECK (
    gym_id = get_current_gym_id_uuid() AND
    -- Ensure the member being checked in/out also belongs to the owner's gym.
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = member_table_id AND m.gym_id = get_current_gym_id_uuid()
    )
);

-- ==============================
-- Table: announcements
-- ==============================
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow gym owners to manage announcements for their gym" ON public.announcements;
CREATE POLICY "Allow gym owners to manage announcements for their gym"
ON public.announcements
FOR ALL TO authenticated
USING (
    gym_id = get_current_gym_id_uuid() AND
    formatted_gym_id = get_current_formatted_gym_id()
)
WITH CHECK (
    gym_id = get_current_gym_id_uuid() AND
    formatted_gym_id = get_current_formatted_gym_id() AND
    -- Additionally verify against the gyms table during insert/update
    EXISTS (
        SELECT 1
        FROM public.gyms g
        WHERE g.id = announcements.gym_id
          AND g.formatted_gym_id = announcements.formatted_gym_id
          AND g.id = get_current_gym_id_uuid() -- Ensure it's the JWT user's gym
    )
);

-- ==============================
-- Table: super_admins
-- ==============================
-- Access to super_admins table is highly sensitive.
-- RLS should be enabled, but policies here typically grant NO access to 'authenticated' or 'anon'.
-- Operations on this table should be done via a service_role key or a dedicated superadmin user role
-- if you implement custom roles beyond Supabase's default 'authenticated'.
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all access to super_admins for general roles" ON public.super_admins;
CREATE POLICY "Deny all access to super_admins for general roles"
ON public.super_admins
FOR ALL TO public -- 'public' covers anon, authenticated, etc.
USING (false)
WITH CHECK (false);


-- Grant SELECT on tables to 'authenticated' role as a base. RLS will further restrict.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gyms TO authenticated;
GRANT SELECT ON public.plans TO authenticated; -- Other ops by admin
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.check_ins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

-- Grant specific permissions to 'anon' role for what it needs (e.g. reading gyms for login).
GRANT SELECT ON public.gyms TO anon;
-- Anon should not typically insert/update/delete.

SELECT 'RLS policies applied. Ensure JWT claims (app_metadata.gym_id, app_metadata.formatted_gym_id) are set correctly upon user login.';

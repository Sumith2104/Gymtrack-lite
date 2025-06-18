-- RLS POLICIES: Allow ALL operations by ANYONE (anon, authenticated)
-- WARNING: These policies disable granular RLS. Security relies on application logic.

-- -----------------------------------------------------------------------------
-- Table: gyms
-- -----------------------------------------------------------------------------
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to gyms" ON public.gyms;
DROP POLICY IF EXISTS "Allow gym owners to SELECT their own gym details" ON public.gyms;
DROP POLICY IF EXISTS "Allow gym owners to UPDATE their own gym details" ON public.gyms;
DROP POLICY IF EXISTS "Allow anon role to SELECT gym for login" ON public.gyms;
DROP POLICY IF EXISTS "Allow broad SELECT on gyms for app logic" ON public.gyms;
DROP POLICY IF EXISTS "Allow SELECT on gyms for server actions (login verification)" ON public.gyms;

CREATE POLICY "Allow public access to gyms"
ON public.gyms
FOR ALL -- SELECT, INSERT, UPDATE, DELETE
TO public -- Includes anon and authenticated roles
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Table: plans
-- -----------------------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
-- Drop any existing policies
DROP POLICY IF EXISTS "Allow public access to plans" ON public.plans;
DROP POLICY IF EXISTS "Allow authenticated users to SELECT all plans" ON public.plans;
DROP POLICY IF EXISTS "Allow SELECT on active plans" ON public.plans;

CREATE POLICY "Allow public access to plans"
ON public.plans
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Table: members
-- -----------------------------------------------------------------------------
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
-- Drop any existing policies
DROP POLICY IF EXISTS "Allow public access to members" ON public.members;
DROP POLICY IF EXISTS "Allow gym owners to manage members of their own gym" ON public.members;
DROP POLICY IF EXISTS "Data integrity checks for members" ON public.members;
DROP POLICY IF EXISTS "RLS for members table (no JWT)" ON public.members;

CREATE POLICY "Allow public access to members"
ON public.members
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Table: check_ins
-- -----------------------------------------------------------------------------
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
-- Drop any existing policies
DROP POLICY IF EXISTS "Allow public access to check_ins" ON public.check_ins;
DROP POLICY IF EXISTS "Allow gym owners to manage check_ins for their own gym" ON public.check_ins;
DROP POLICY IF EXISTS "Data integrity checks for check_ins" ON public.check_ins;
DROP POLICY IF EXISTS "RLS for check_ins table (no JWT)" ON public.check_ins;

CREATE POLICY "Allow public access to check_ins"
ON public.check_ins
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Table: announcements
-- -----------------------------------------------------------------------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
-- Drop any existing policies
DROP POLICY IF EXISTS "Allow public access to announcements" ON public.announcements;
DROP POLICY IF EXISTS "Allow gym owners to manage announcements for their own gym" ON public.announcements;
DROP POLICY IF EXISTS "Data integrity checks for announcements" ON public.announcements;
DROP POLICY IF EXISTS "RLS for announcements table (no JWT)" ON public.announcements;
DROP POLICY IF EXISTS "Allow_insert_announcements_if_gym_ids_match_gyms_table_for_auth_and_anon" ON public.announcements;
DROP POLICY IF EXISTS "Permit_select_announcements_for_authenticated_users" ON public.announcements;


CREATE POLICY "Allow public access to announcements"
ON public.announcements
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- Table: super_admins (Optional - if RLS is enabled on it)
-- -----------------------------------------------------------------------------
-- If you have RLS enabled on super_admins and want public access (not typical for this table):
-- ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow public access to super_admins" ON public.super_admins;
-- CREATE POLICY "Allow public access to super_admins"
-- ON public.super_admins
-- FOR ALL
-- TO public
-- USING (true)
-- WITH CHECK (true);


-- Grant broad table-level permissions to anon and authenticated roles.
-- RLS being (true) for USING and WITH CHECK will allow these.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gyms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.plans TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.members TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.check_ins TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.announcements TO anon, authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.super_admins TO anon, authenticated; -- If applicable and RLS is set as public

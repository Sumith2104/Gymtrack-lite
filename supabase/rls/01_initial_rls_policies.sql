-- supabase/rls/01_initial_rls_policies.sql

-- -----------------------------------------------------------------------------
-- Table: gyms
-- -----------------------------------------------------------------------------
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow gym owners to SELECT their own gym details" ON public.gyms;
DROP POLICY IF EXISTS "Allow gym owners to UPDATE their own gym details" ON public.gyms;
DROP POLICY IF EXISTS "Allow anon role to SELECT gym for login" ON public.gyms;

-- Allow authenticated users (gym owners) to SELECT their own gym details
CREATE POLICY "Allow gym owners to SELECT their own gym details"
ON public.gyms
FOR SELECT
TO authenticated
USING (
    (id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'gym_id')::uuid) AND
    (formatted_gym_id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'formatted_gym_id')::text)
);

-- Allow authenticated users (gym owners) to UPDATE their own gym details
CREATE POLICY "Allow gym owners to UPDATE their own gym details"
ON public.gyms
FOR UPDATE
TO authenticated
USING (
    (id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'gym_id')::uuid) AND
    (formatted_gym_id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'formatted_gym_id')::text)
)
WITH CHECK (
    (id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'gym_id')::uuid) AND
    (formatted_gym_id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'formatted_gym_id')::text)
);

-- Allow anon role (unauthenticated server actions like login) to SELECT specific gym details.
CREATE POLICY "Allow anon role to SELECT gym for login"
ON public.gyms
FOR SELECT
TO anon
USING (true); -- The server action performs the actual filtering

-- -----------------------------------------------------------------------------
-- Table: plans
-- -----------------------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to SELECT all plans" ON public.plans;

CREATE POLICY "Allow authenticated users to SELECT all plans"
ON public.plans
FOR SELECT
TO authenticated
USING (is_active = true);

-- -----------------------------------------------------------------------------
-- Table: members
-- -----------------------------------------------------------------------------
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow gym owners to manage members of their own gym" ON public.members;

CREATE POLICY "Allow gym owners to manage members of their own gym"
ON public.members
FOR ALL
TO authenticated
USING (
    (gym_id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'gym_id')::uuid)
)
WITH CHECK (
    (gym_id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'gym_id')::uuid)
);

-- -----------------------------------------------------------------------------
-- Table: check_ins
-- -----------------------------------------------------------------------------
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow gym owners to manage check_ins for their own gym" ON public.check_ins;

CREATE POLICY "Allow gym owners to manage check_ins for their own gym"
ON public.check_ins
FOR ALL
TO authenticated
USING (
    (gym_id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'gym_id')::uuid)
)
WITH CHECK (
    (gym_id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'gym_id')::uuid) AND
    EXISTS (
        SELECT 1 FROM public.members m
        WHERE m.id = check_ins.member_table_id AND m.gym_id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'gym_id')::uuid
    )
);

-- -----------------------------------------------------------------------------
-- Table: announcements
-- -----------------------------------------------------------------------------
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow gym owners to manage announcements for their own gym" ON public.announcements;

CREATE POLICY "Allow gym owners to manage announcements for their own gym"
ON public.announcements
FOR ALL
TO authenticated
USING (
    (gym_id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'gym_id')::uuid) AND
    (formatted_gym_id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'formatted_gym_id')::text)
)
WITH CHECK (
    (gym_id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'gym_id')::uuid) AND
    (formatted_gym_id = ((auth.jwt() -> 'app_metadata')::jsonb ->> 'formatted_gym_id')::text) AND
    EXISTS (
        SELECT 1 FROM public.gyms g
        WHERE g.id = announcements.gym_id AND g.formatted_gym_id = announcements.formatted_gym_id
    )
);

-- Grant necessary permissions to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gyms TO authenticated;
GRANT SELECT ON public.plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.check_ins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;

GRANT SELECT ON public.gyms TO anon;

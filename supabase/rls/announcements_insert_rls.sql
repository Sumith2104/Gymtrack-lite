-- supabase/rls/announcements_insert_rls.sql

-- This RLS policy allows authenticated users to insert into the 'announcements' table.
-- It performs a basic check to ensure the 'gym_id' provided in the insert
-- statement corresponds to an existing gym in the 'gyms' table.

-- WARNING: This policy is less secure than one that verifies the 'gym_id' against
-- a JWT custom claim (e.g., auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid.
-- It relies more heavily on your application code (server actions) to correctly supply
-- the 'gym_id' for the intended gym.
-- For a more secure setup, ensure your authentication flow sets a 'gym_id' custom claim
-- in the user's JWT and update your RLS policies to check against that claim.

-- Ensure RLS is enabled on the table
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Before creating a new policy, consider dropping existing INSERT policies for 'announcements'
-- to avoid conflicts or unintended behavior. You can do this in the Supabase dashboard
-- or via SQL. For example:
-- DROP POLICY IF EXISTS "Your Existing Insert Policy Name For Announcements" ON public.announcements;
-- Be cautious and ensure you know which policies you are dropping.

-- Create the INSERT policy
CREATE POLICY "Allow authenticated users to insert announcements with valid gym_id"
ON public.announcements
FOR INSERT
TO authenticated -- Ensure this role matches how your server actions are effectively executed by Supabase.
WITH CHECK (
  -- This policy checks that the gym_id being inserted is not null
  -- and that it refers to an existing gym in your 'gyms' table.
  announcements.gym_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM public.gyms WHERE id = announcements.gym_id)
);

-- NOTE: You will also need appropriate RLS policies for SELECT, UPDATE, and DELETE operations
-- on the 'announcements' table. Those policies should ideally verify the 'gym_id'
-- against a JWT custom claim (e.g., (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid)
-- to ensure users can only operate on announcements for their own gym.

-- Example of a more secure SELECT policy (relies on JWT claim):
/*
CREATE POLICY "Allow gym owners to view announcements for their gym"
ON public.announcements
FOR SELECT
TO authenticated
USING (gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid);
*/

-- After applying this policy, your addAnnouncementAction should be able to insert announcements,
-- provided the gymDatabaseId passed to it is a valid UUID of an existing gym.

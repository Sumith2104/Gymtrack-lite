
-- Ensure RLS is enabled for the check_ins table in your Supabase dashboard.

-- Remove any conflicting INSERT policies first if they exist.
-- Example: DROP POLICY IF EXISTS "Your Existing Insert Policy Name" ON public.check_ins;

-- This policy allows inserts into 'check_ins' if:
-- 1. The role performing the insert is 'authenticated' (adjust if your server actions run as a different role, e.g., 'anon').
-- 2. The 'gym_id' and 'member_table_id' are provided.
-- 3. The 'member_table_id' refers to an existing member.
-- 4. The 'gym_id' being inserted for the check_in record matches the 'gym_id' of the member record.
--    This ensures that a member from Gym A cannot be checked into Gym B via a direct API call
--    if the application logic were to mistakenly allow it.

CREATE POLICY "Allow check-ins if gym_id matches member's gym and member exists"
ON public.check_ins
FOR INSERT
TO authenticated -- Adjust 'authenticated' if your server actions run under a different role (e.g., 'service_role' or 'anon')
WITH CHECK (
  check_ins.gym_id IS NOT NULL AND
  check_ins.member_table_id IS NOT NULL AND
  EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.id = check_ins.member_table_id AND m.gym_id = check_ins.gym_id
  )
);

-- Note: You should also have RLS policies for SELECT, UPDATE, and DELETE operations
-- on the 'check_ins' table, tailored to your application's needs.
-- For example, a SELECT policy might look like:
/*
CREATE POLICY "Allow authenticated users to view check_ins for their claimed gym"
ON public.check_ins
FOR SELECT
TO authenticated
USING (
  gym_id = (auth.jwt() ->> 'app_metadata'::text ->> 'gym_id')::uuid
);
*/

-- If your kiosk or check-in actions run under a more public role (like 'anon')
-- or a specific service role without individual user JWTs for the gym_id,
-- ensure the role specified in 'TO authenticated' above matches that context.
-- For instance, if kiosk actions are anonymous, you might use 'TO anon'.
-- However, allowing 'anon' to insert directly can be risky without very careful CHECK conditions.
-- It's generally better if your server actions that perform inserts are authenticated.


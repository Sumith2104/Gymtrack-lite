
-- Supabase Row Level Security (RLS) Policy for 'announcements' table (INSERT)

-- Prerequisites:
-- 1. Row Level Security must be enabled on the 'public.announcements' table.
--    You can enable this in your Supabase Dashboard: Database > Tables > select 'announcements' > Enable RLS.
-- 2. Your authentication flow must set a custom JWT claim for authenticated users.
--    This policy assumes the claim path is `auth.jwt() -> 'app_metadata' ->> 'gym_id'`,
--    and this claim stores the UUID of the gym the user manages.
--    If your claim structure is different, you'll need to adjust the `WITH CHECK` condition.

-- Drop the policy if it already exists to allow for idempotent script execution.
DROP POLICY IF EXISTS "Allow authenticated users to insert announcements for their gym" ON public.announcements;

-- Create the INSERT policy
CREATE POLICY "Allow authenticated users to insert announcements for their gym"
ON public.announcements
FOR INSERT
TO authenticated -- This policy applies to users who are logged in.
WITH CHECK (
  -- The 'gym_id' of the announcement being inserted MUST match
  -- the 'gym_id' stored in the authenticated user's JWT custom claims.
  -- The path `auth.jwt() -> 'app_metadata' ->> 'gym_id'` retrieves this claim.
  -- It's then cast to UUID to match the 'gym_id' column type in your 'announcements' table.
  gym_id = (auth.jwt() -> 'app_metadata' ->> 'gym_id')::uuid
);

-- Notes:
-- - `auth.jwt()`: This function retrieves the JWT of the currently authenticated user making the request.
-- - `-> 'app_metadata'`: Accesses the 'app_metadata' object within the JWT. Custom claims are often stored here.
-- - `->> 'gym_id'`: Extracts the 'gym_id' value as text from the 'app_metadata' object.
-- - `::uuid`: Casts the extracted text value to the UUID data type.

-- How to use:
-- 1. Copy the SQL code above.
-- 2. Go to your Supabase project dashboard.
-- 3. Navigate to the "SQL Editor".
-- 4. Paste the SQL code into a new query.
-- 5. Click "Run".

-- Important:
-- If your server actions are running with a `service_role` key, they will bypass RLS policies by default.
-- This policy is primarily for client-side operations or server-side operations made in the context of an authenticated user (not using the service_role key).
-- Ensure your login mechanism correctly populates the `app_metadata.gym_id` custom claim in the JWT.

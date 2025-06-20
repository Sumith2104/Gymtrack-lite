
-- Enable Row Level Security on the messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations for the service_role (implicitly handled but good to be aware)
-- CREATE POLICY "Allow service_role full access"
-- ON public.messages FOR ALL
-- USING (auth.role() = 'service_role'); -- Note: service_role typically bypasses RLS without explicit policy.

-- Allow authenticated users to insert messages.
-- For a member-facing app, additional checks in the application logic or a more specific
-- RLS policy would be needed to ensure sender_id is correctly set to the authenticated member's ID.
CREATE POLICY "Authenticated users can insert messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to select messages.
-- For a member-facing app, the application (or a stricter RLS policy)
-- must filter these messages to ensure a member only sees their own conversations.
-- THIS POLICY ALONE IS NOT SUFFICIENTLY SECURE FOR DIRECT MEMBER QUERIES.
CREATE POLICY "Authenticated users can select messages"
ON public.messages
FOR SELECT
TO authenticated
USING (true);

-- Example of more secure policies (requires members table to have an auth_user_id column linked to auth.users):
/*
-- Helper function to get the textual member_id of the currently authenticated user for a given gym
CREATE OR REPLACE FUNCTION get_authenticated_member_text_id(current_gym_id uuid)
RETURNS TEXT AS $$
DECLARE
  member_text_id TEXT;
BEGIN
  -- This assumes your 'members' table has a column, e.g., 'auth_user_id' (UUID),
  -- that stores the auth.uid() of the authenticated Supabase user.
  -- And 'member_id' is the human-readable text ID.
  SELECT m.member_id INTO member_text_id
  FROM public.members m
  WHERE m.gym_id = current_gym_id AND m.auth_user_id = auth.uid();
  RETURN member_text_id;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure policy for members to insert their own messages
CREATE POLICY "Members can insert their own messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_type = 'member' AND
  sender_id = get_authenticated_member_text_id(gym_id) AND
  gym_id IS NOT NULL -- Ensure gym_id is present
);

-- Secure policy for members to select their own messages
CREATE POLICY "Members can select their own messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  (sender_type = 'member' AND sender_id = get_authenticated_member_text_id(gym_id)) OR
  (receiver_type = 'member' AND receiver_id = get_authenticated_member_text_id(gym_id))
);

-- Policy for Admins (assuming admin is authenticated via Supabase Auth and gym.owner_user_id matches auth.uid())
-- This would be an alternative to using service_role for admin reads/writes if admins had standard auth.
CREATE POLICY "Gym owners can manage messages for their gym"
ON public.messages
FOR ALL -- Or specify SELECT, INSERT, UPDATE, DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.gyms g
    WHERE g.id = messages.gym_id AND g.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.gyms g
    WHERE g.id = messages.gym_id AND g.owner_user_id = auth.uid()
  )
);
*/

-- To apply these policies, you would uncomment the desired ones and run them in your Supabase SQL editor.
-- Remember to create the helper function and necessary columns (like members.auth_user_id) for the more secure examples.

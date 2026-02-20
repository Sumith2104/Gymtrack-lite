
-- SQL DDL for the 'messages' table
-- This schema is designed to store messages between gym admins (identified by formatted_gym_id)
-- and gym members (identified by their human-readable members.member_id).

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE, -- The UUID of the gym this message belongs to
  sender_id TEXT NOT NULL, -- Stores formatted_gym_id if sender is admin, or members.member_id if sender is member
  receiver_id TEXT NOT NULL, -- Stores members.member_id if receiver is member, or formatted_gym_id if receiver is admin
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'member')), -- 'admin' or 'member'
  receiver_type TEXT NOT NULL CHECK (receiver_type IN ('admin', 'member')), -- 'admin' or 'member'
  content TEXT NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone NULL
);

-- Optional: Add indexes for common query patterns
CREATE INDEX idx_messages_gym_sender_receiver ON public.messages (gym_id, sender_id, receiver_id, created_at);
CREATE INDEX idx_messages_gym_receiver_sender ON public.messages (gym_id, receiver_id, sender_id, created_at);
CREATE INDEX idx_messages_created_at ON public.messages (created_at DESC);

-- Enable Row Level Security (RLS) for the table if not already enabled
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Example RLS Policies (adjust based on your application's auth logic):
-- These are illustrative. Your actual policies will depend on how you authenticate members and admins.

-- Policy: Admins can manage all messages for their gym.
-- (This might require a function to check if the current user is the admin of gym_id)
-- CREATE POLICY "Admin full access for their gym"
-- ON public.messages FOR ALL
-- USING (auth.uid() = (SELECT owner_user_id FROM public.gyms WHERE id = gym_id)) -- Example, if using Supabase Auth for admins
-- WITH CHECK (auth.uid() = (SELECT owner_user_id FROM public.gyms WHERE id = gym_id));

-- Policy: Members can see messages where they are the sender or receiver.
-- (This requires member authentication and a way to get their members.member_id)
-- CREATE POLICY "Members can access their own messages"
-- ON public.messages FOR SELECT
-- USING (
--   (sender_type = 'member' AND sender_id = current_setting('request.jwt.claims', true)::jsonb ->> 'user_metadata' ->> 'member_id') OR
--   (receiver_type = 'member' AND receiver_id = current_setting('request.jwt.claims', true)::jsonb ->> 'user_metadata' ->> 'member_id')
-- );

-- Policy: Members can send messages (acting as sender).
-- CREATE POLICY "Members can send messages"
-- ON public.messages FOR INSERT
-- WITH CHECK (
--   sender_type = 'member' AND
--   sender_id = current_setting('request.jwt.claims', true)::jsonb ->> 'user_metadata' ->> 'member_id'
-- );

COMMENT ON COLUMN public.messages.gym_id IS 'The UUID of the gym this message belongs to.';
COMMENT ON COLUMN public.messages.sender_id IS 'Stores formatted_gym_id if sender is admin, or the human-readable members.member_id if sender is member.';
COMMENT ON COLUMN public.messages.receiver_id IS 'Stores the human-readable members.member_id if receiver is member, or formatted_gym_id if receiver is admin.';
COMMENT ON COLUMN public.messages.sender_type IS 'Indicates if the sender is an ''admin'' or a ''member''.';
COMMENT ON COLUMN public.messages.receiver_type IS 'Indicates if the receiver is an ''admin'' or a ''member''.';
    
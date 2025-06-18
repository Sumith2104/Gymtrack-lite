-- Supabase Initial Schema for GymTrack Lite

-- Make sure to connect to your Supabase project and run this in the SQL Editor.
-- Best practice: Run extensions and table creations in separate transactions if possible,
-- or ensure your SQL client handles this well.

-- Enable pgcrypto for gen_random_uuid() if not already enabled.
-- This might require superuser privileges or be enabled by default on Supabase.
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Gyms Table
CREATE TABLE public.gyms (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    owner_email text,
    owner_user_id uuid, -- Foreign key to auth.users table
    formatted_gym_id text UNIQUE,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT gyms_pkey PRIMARY KEY (id),
    CONSTRAINT gyms_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.gyms IS 'Stores information about each gym';
COMMENT ON COLUMN public.gyms.owner_user_id IS 'Links to the Supabase auth user who owns/manages this gym';
COMMENT ON COLUMN public.gyms.formatted_gym_id IS 'User-friendly unique identifier for the gym (e.g., UOFIPOIB)';

-- 2. Plans Table
CREATE TABLE public.plans (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    plan_id text, -- User-defined plan identifier (e.g., BAS0599)
    plan_name text NOT NULL, -- User-facing plan name (e.g., "Basic", "Premium")
    price numeric DEFAULT 0,
    duration_months integer,
    is_active boolean DEFAULT true,
    CONSTRAINT plans_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.plans IS 'Stores membership plan details';
COMMENT ON COLUMN public.plans.plan_id IS 'Optional user-defined text identifier for the plan';

-- 3. Members Table
CREATE TABLE public.members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    gym_id uuid NOT NULL,
    plan_id uuid,
    member_id text, -- User-defined member identifier (e.g., MBR001)
    name text NOT NULL,
    email text,
    membership_status text DEFAULT 'pending'::text, -- e.g., active, inactive, expired, pending
    age integer,
    phone_number text,
    join_date timestamp with time zone,
    expiry_date timestamp with time zone,
    membership_type text, -- Denormalized for easier display, derived from plans.plan_name
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT members_pkey PRIMARY KEY (id),
    CONSTRAINT members_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE,
    CONSTRAINT members_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL
);
COMMENT ON TABLE public.members IS 'Stores information about gym members';
COMMENT ON COLUMN public.members.member_id IS 'User-friendly unique identifier for the member within a gym';

-- 4. Check-ins Table
CREATE TABLE public.check_ins (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    gym_id uuid NOT NULL,
    member_table_id uuid NOT NULL, -- Foreign key to members.id (the UUID primary key of the member)
    check_in_time timestamp with time zone NOT NULL DEFAULT now(),
    check_out_time timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT check_ins_pkey PRIMARY KEY (id),
    CONSTRAINT check_ins_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE,
    CONSTRAINT check_ins_member_table_id_fkey FOREIGN KEY (member_table_id) REFERENCES public.members(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.check_ins IS 'Records member check-in and check-out times';
COMMENT ON COLUMN public.check_ins.member_table_id IS 'The UUID of the member who checked in, from the members table';


-- 5. Announcements Table
CREATE TABLE public.announcements (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    gym_id uuid NOT NULL, -- The UUID of the gym this announcement belongs to
    formatted_gym_id text NOT NULL, -- The text-based formatted ID of the gym
    title text NOT NULL,
    content text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT announcements_pkey PRIMARY KEY (id),
    CONSTRAINT announcements_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.announcements IS 'Stores gym announcements';
COMMENT ON COLUMN public.announcements.gym_id IS 'The UUID of the gym (gyms.id)';
COMMENT ON COLUMN public.announcements.formatted_gym_id IS 'The user-friendly formatted ID of the gym (gyms.formatted_gym_id)';

-- 6. Super Admins Table (Example - for system-level administration)
CREATE TABLE public.super_admins (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL, -- In a real scenario, integrate with Supabase Auth for super admins if possible
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT super_admins_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.super_admins IS 'For system-level administrators (use with caution or integrate with Supabase Auth roles)';

-- Add Indexes for frequently queried columns
CREATE INDEX idx_gyms_formatted_gym_id ON public.gyms(formatted_gym_id);
CREATE INDEX idx_members_gym_id ON public.members(gym_id);
CREATE INDEX idx_members_member_id ON public.members(member_id);
CREATE INDEX idx_check_ins_gym_id_check_in_time ON public.check_ins(gym_id, check_in_time DESC);
CREATE INDEX idx_announcements_formatted_gym_id_created_at ON public.announcements(formatted_gym_id, created_at DESC);

-- Grant basic USAGE on schema public to authenticated and anon roles.
-- Supabase does this by default, but explicit doesn't hurt.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant all privileges on all tables in schema public to the supabase_admin role
-- This is typically the role used by the Supabase dashboard and direct connections with the service key.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO supabase_admin;


-- Note on auth.users:
-- The auth.users table is managed by Supabase Auth.
-- You typically don't CREATE or directly modify its schema here,
-- but you can reference its `id` column in foreign keys as done in `gyms.owner_user_id`.

-- After running this schema, proceed to set up Row Level Security (RLS) policies.
-- And ensure your application's login flow sets the necessary JWT claims
-- (e.g., app_metadata.gym_id and app_metadata.formatted_gym_id) for RLS to work effectively.

SELECT 'Initial schema created successfully. Please proceed to set up RLS policies and update your application authentication.';

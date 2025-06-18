-- supabase/schema/00_initial_schema.sql

-- Enable pgcrypto extension if not already enabled (for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- Gyms Table
CREATE TABLE public.gyms (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    owner_email text UNIQUE, -- Ensure email is unique if it's a primary identifier for owners
    owner_user_id uuid UNIQUE, -- Supabase auth user ID, also unique
    formatted_gym_id text UNIQUE NOT NULL, -- User-friendly unique ID for the gym (e.g., "UOFIPOIB")
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT gyms_pkey PRIMARY KEY (id),
    CONSTRAINT gyms_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL -- Optional: link to Supabase auth users
);
COMMENT ON COLUMN public.gyms.formatted_gym_id IS 'User-friendly unique ID for the gym (e.g., UOFIPOIB)';

-- Plans Table
CREATE TABLE public.plans (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    plan_id text UNIQUE, -- User-defined unique identifier for the plan (e.g., "BASIC001")
    plan_name text NOT NULL, -- e.g., "Basic", "Premium"
    price numeric DEFAULT 0,
    duration_months integer, -- e.g., 1, 3, 12
    is_active boolean DEFAULT true,
    CONSTRAINT plans_pkey PRIMARY KEY (id)
);
COMMENT ON COLUMN public.plans.plan_id IS 'User-defined unique identifier for the plan (e.g., BASIC001)';
COMMENT ON COLUMN public.plans.plan_name IS 'e.g., Basic, Premium';
COMMENT ON COLUMN public.plans.duration_months IS 'e.g., 1, 3, 12';

-- Members Table
CREATE TABLE public.members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    gym_id uuid NOT NULL,
    plan_id uuid,
    member_id text NOT NULL, -- User-defined member ID, should be unique *per gym*
    name text NOT NULL,
    email text,
    membership_status text DEFAULT 'pending'::text, -- e.g., 'active', 'inactive', 'expired', 'pending'
    age integer,
    phone_number text,
    join_date timestamp with time zone,
    expiry_date timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT members_pkey PRIMARY KEY (id),
    CONSTRAINT members_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE,
    CONSTRAINT members_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL,
    CONSTRAINT members_gym_id_member_id_key UNIQUE (gym_id, member_id) -- Ensures member_id is unique within each gym
);
COMMENT ON COLUMN public.members.member_id IS 'User-defined member ID, unique per gym';
COMMENT ON COLUMN public.members.membership_status IS 'e.g., active, inactive, expired, pending';

-- Check-ins Table
CREATE TABLE public.check_ins (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    gym_id uuid NOT NULL,
    member_table_id uuid NOT NULL, -- References members.id (the UUID PK)
    check_in_time timestamp with time zone NOT NULL DEFAULT now(),
    check_out_time timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT check_ins_pkey PRIMARY KEY (id),
    CONSTRAINT check_ins_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE,
    CONSTRAINT check_ins_member_table_id_fkey FOREIGN KEY (member_table_id) REFERENCES public.members(id) ON DELETE CASCADE
);
COMMENT ON COLUMN public.check_ins.member_table_id IS 'References members.id (the UUID PK)';

-- Announcements Table
CREATE TABLE public.announcements (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    gym_id uuid NOT NULL, -- The UUID of the gym
    formatted_gym_id text NOT NULL, -- The user-friendly formatted ID of the gym
    title text NOT NULL,
    content text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT announcements_pkey PRIMARY KEY (id),
    CONSTRAINT announcements_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE
);
COMMENT ON COLUMN public.announcements.gym_id IS 'The UUID of the gym';
COMMENT ON COLUMN public.announcements.formatted_gym_id IS 'The user-friendly formatted ID of the gym, matches gyms.formatted_gym_id';

-- Super Admins Table (Optional, if you need a separate admin system outside Supabase Auth)
CREATE TABLE public.super_admins (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL, -- Store hashed passwords securely
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT super_admins_pkey PRIMARY KEY (id)
);
COMMENT ON COLUMN public.super_admins.password_hash IS 'Store hashed passwords securely';

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_gyms_formatted_gym_id ON public.gyms(formatted_gym_id);
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON public.members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_member_id ON public.members(member_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_gym_id_member_id ON public.check_ins(gym_id, member_table_id);
CREATE INDEX IF NOT EXISTS idx_announcements_formatted_gym_id ON public.announcements(formatted_gym_id);
CREATE INDEX IF NOT EXISTS idx_announcements_gym_id ON public.announcements(gym_id);

-- Grant basic USAGE on schema public to anon and authenticated roles.
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant all privileges on all tables in schema public to postgres role (superuser) and service_role.
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

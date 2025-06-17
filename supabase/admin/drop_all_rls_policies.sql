-- WARNING: This script will attempt to drop ALL Row Level Security (RLS) policies
-- from ALL tables in the 'public' schema of your database.
--
-- !!! USE WITH EXTREME CAUTION !!!
--
-- Before running this:
-- 1. Understand that if RLS is enabled on a table and all its policies are dropped,
--    the default behavior is to DENY ALL ACCESS to that table.
-- 2. Consider backing up your database or RLS policies.
-- 3. This script does NOT disable RLS on the tables themselves; it only drops the policies.
--
-- You should run this script in your Supabase SQL Editor.

DO $$
DECLARE
    table_name_var TEXT;
    policy_name_var TEXT;
    full_table_name TEXT;
BEGIN
    -- Loop through all tables in the public schema
    FOR table_name_var IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        full_table_name := 'public.' || quote_ident(table_name_var);

        -- For each table, loop through all its RLS policies
        FOR policy_name_var IN
            SELECT polname -- pg_policies.policyname is an alias for pg_policy.polname
            FROM pg_policy
            WHERE polrelid = full_table_name::regclass -- Get OID of the table
        LOOP
            -- Construct and execute the DROP POLICY statement
            RAISE NOTICE 'Attempting to drop policy "%" on table %', policy_name_var, full_table_name;
            EXECUTE format('DROP POLICY IF EXISTS %I ON %s;', policy_name_var, full_table_name);
        END LOOP;
        RAISE NOTICE 'Finished processing policies for table %', full_table_name;
    END LOOP;
    RAISE NOTICE 'All RLS policies in the public schema should now have been processed for dropping.';
END $$;

-- After running, you can verify by checking specific tables or querying pg_policies:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
-- This should return no rows if all policies were dropped.

-- WARNING: DO NOT use this in production without environment secrets!

-- Create Supabase roles only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN NOINHERIT;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
        CREATE ROLE supabase_admin LOGIN NOINHERIT;
    END IF;
END
$$;

-- Create users only if not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
        CREATE USER authenticator WITH PASSWORD 'postgres';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        CREATE USER supabase_auth_admin WITH PASSWORD 'postgres';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_functions_admin') THEN
        CREATE USER supabase_functions_admin WITH PASSWORD 'postgres';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
        CREATE USER supabase_storage_admin WITH PASSWORD 'postgres';
    END IF;

    -- pgbouncer is optional, only if you're using it
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pgbouncer') THEN
        CREATE USER pgbouncer WITH PASSWORD 'postgres';
    END IF;
END
$$;

-- Password resets (in dev only)
ALTER USER postgres WITH PASSWORD 'postgres';
ALTER USER supabase_admin WITH PASSWORD 'postgres';

DO $$
BEGIN
    ALTER USER pgbouncer WITH PASSWORD 'postgres';
EXCEPTION WHEN OTHERS THEN
    -- Skip if user doesn't exist
    NULL;
END
$$;

-- Grant roles to postgres
DO $$
BEGIN
    GRANT anon TO postgres;
    GRANT authenticated TO postgres;
    GRANT service_role TO postgres;
    GRANT supabase_admin TO postgres;
END
$$;

-- Grant roles to authenticator
DO $$
BEGIN
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
END
$$;

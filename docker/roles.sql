-- docker/roles.sql
-- WARNING: DO NOT use this in production without environment secrets!
-- These are static and should be managed through secrets/ENV in production

-- Create users that don't exist yet
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE USER authenticator WITH PASSWORD 'postgres';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
        CREATE USER supabase_auth_admin WITH PASSWORD 'postgres';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_functions_admin') THEN
        CREATE USER supabase_functions_admin WITH PASSWORD 'postgres';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
        CREATE USER supabase_storage_admin WITH PASSWORD 'postgres';
    END IF;
END
$$;

-- Set passwords for existing users
ALTER USER postgres WITH PASSWORD 'postgres';
ALTER USER supabase_admin WITH PASSWORD 'postgres';

-- Set password for pgbouncer if it exists
DO $$
BEGIN
    ALTER USER pgbouncer WITH PASSWORD 'postgres';
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore error if pgbouncer doesn't exist yet
        NULL;
END
$$;

-- Grant roles to postgres (roles are created by Supabase image)
DO $$
BEGIN
    GRANT anon TO postgres;
    GRANT authenticated TO postgres;
    GRANT service_role TO postgres;
    GRANT supabase_admin TO postgres;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if roles don't exist
        NULL;
END
$$;

-- Grant roles to authenticator
DO $$
BEGIN
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if roles don't exist
        NULL;
END
$$;

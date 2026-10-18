-- Run only after hosting approval, on the intended project using its migration/admin connection.
-- Create dedicated roles once; set their passwords interactively with psql \password.
-- This file never creates a Supabase project, database or bucket.
\set ON_ERROR_STOP on
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS skillshare AUTHORIZATION skillshare_migrate;
REVOKE ALL ON SCHEMA skillshare FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA skillshare, extensions TO skillshare_app, skillshare_migrate;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA skillshare TO skillshare_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA skillshare TO skillshare_app;
REVOKE ALL ON ALL TABLES IN SCHEMA skillshare FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA skillshare FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA skillshare FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE skillshare_migrate IN SCHEMA skillshare GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO skillshare_app;
ALTER DEFAULT PRIVILEGES FOR ROLE skillshare_migrate IN SCHEMA skillshare GRANT USAGE, SELECT ON SEQUENCES TO skillshare_app;
ALTER DEFAULT PRIVILEGES FOR ROLE skillshare_migrate IN SCHEMA skillshare REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE skillshare_migrate IN SCHEMA skillshare REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE skillshare_migrate IN SCHEMA skillshare REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

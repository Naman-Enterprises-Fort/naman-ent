-- Postgres extensions needed by the app. Mounted into Docker's
-- /docker-entrypoint-initdb.d/ so they're created on first DB init,
-- before any Prisma migration runs. Idempotent (safe to re-run via psql).
--
-- For non-Docker setups (Neon, Supabase, etc.), most managed Postgres
-- providers preinstall pg_trgm — but if the catalog search misbehaves,
-- run this file once via psql or the provider's SQL editor.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

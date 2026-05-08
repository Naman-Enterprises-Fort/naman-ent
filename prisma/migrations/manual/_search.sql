-- Phase 1 search bootstrap.
-- Run AFTER `pnpm prisma migrate dev --name init` against the same DATABASE_URL.
--
--   psql "$DIRECT_URL" -f prisma/migrations/manual/_search.sql
--
-- Idempotent: safe to re-run. Adds pg_trgm + indexes used by lib/services/catalog.ts
-- (searchProducts, searchSuggest) and the PLP `q=` filter. When SKU count crosses
-- ~5k or p95 search latency exceeds 500ms, graduate to a generated tsvector
-- column (see SRS Appendix D, Phase 2 search hand-off).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram GIN index on Product.name → typo-tolerant ILIKE / similarity().
CREATE INDEX IF NOT EXISTS product_name_trgm_idx
  ON "Product" USING GIN (name gin_trgm_ops);

-- Trigram GIN index on Brand.name for "brand-only" queries (e.g. "samsung").
CREATE INDEX IF NOT EXISTS brand_name_trgm_idx
  ON "Brand" USING GIN (name gin_trgm_ops);

-- Plain B-tree on Product.shortDesc lower(...) for ILIKE prefix matches.
CREATE INDEX IF NOT EXISTS product_shortdesc_lower_idx
  ON "Product" (LOWER("shortDesc"));

import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load `.env.local` first (Next.js convention for local secrets), then fall
// back to `.env`. `dotenv` doesn't override existing process env vars, so
// values already in process.env (e.g. from Vercel) win over both files.
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

/**
 * Prisma 7 moved connection URLs and migrate config out of `schema.prisma`
 * into this file. See https://pris.ly/d/config-datasource.
 *
 * The runtime client (in `lib/db.ts`) is constructed with `@prisma/adapter-pg`
 * and reads the same env vars at request time. Migrate uses the URLs below.
 */

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `prisma migrate` needs a *direct* (non-pooled) connection. Neon hands
    // out two URLs — the pooled one in `DATABASE_URL` for runtime traffic, and
    // the unpooled one in `DIRECT_URL` for migrations.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});

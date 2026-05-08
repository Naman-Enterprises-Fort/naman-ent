import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

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

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton.
 *
 * Prisma 7 requires an adapter at the client level. We use `@prisma/adapter-pg`
 * for plain Postgres (works against Neon over the standard wire protocol). For
 * Vercel/edge runtime in Phase 2, swap to `@prisma/adapter-neon` if cold-start
 * latency becomes an issue.
 *
 * Next.js dev mode does HMR, which would otherwise spin up a new PrismaClient
 * on every reload and exhaust the database connection pool. We cache the
 * client on `globalThis` in non-production so HMR reuses one instance.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Fail fast in any non-build environment that actually tries to query.
    // `next build` does not import this module, so this is safe.
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.');
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

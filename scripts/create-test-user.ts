/**
 * Local-only helper to spin up a verified test customer + a SUPER_ADMIN
 * for overnight UI testing without going through the register → verify-email
 * UI dance. Idempotent: re-running upserts on email.
 *
 *   pnpm tsx scripts/create-test-user.ts
 *
 * Test creds:
 *   test@naman.dev / TestUser2026! (CUSTOMER)
 *   admin@naman.dev / AdminUser2026! (SUPER_ADMIN)
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config({ path: '.env.local' });
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function upsertUser(
  email: string,
  password: string,
  name: string,
  role: 'CUSTOMER' | 'SUPER_ADMIN',
) {
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      role,
      emailVerified: new Date(),
    },
    update: {
      name,
      passwordHash,
      role,
      emailVerified: new Date(),
      isBlocked: false,
      deletedAt: null,
    },
  });
  console.info(`${role.padEnd(12)} → ${email} (id: ${user.id})`);
}

async function main() {
  await upsertUser('test@naman.dev', 'TestUser2026!', 'Test Customer', 'CUSTOMER');
  await upsertUser('admin@naman.dev', 'AdminUser2026!', 'Naman Admin', 'SUPER_ADMIN');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

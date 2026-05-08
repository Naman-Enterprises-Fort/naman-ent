import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';

const TOKEN_BYTES = 32;
const VERIFY_TTL_HOURS = 24;
const RESET_TTL_MINUTES = 15;

const VERIFY_PREFIX = 'verify:';

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function newSecret(): { secret: string; hash: string } {
  const secret = randomBytes(TOKEN_BYTES).toString('hex');
  return { secret, hash: sha256(secret) };
}

/** Issues a fresh email-verification token for `email`, superseding any prior. */
export async function issueEmailVerificationToken(email: string): Promise<string> {
  const { secret, hash } = newSecret();
  const identifier = `${VERIFY_PREFIX}${email}`;
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hash,
      expires: new Date(Date.now() + VERIFY_TTL_HOURS * 60 * 60 * 1000),
    },
  });
  return secret;
}

/** Returns the email if the token is valid + unexpired (and consumes it); null otherwise. */
export async function consumeEmailVerificationToken(secret: string): Promise<string | null> {
  const hash = sha256(secret);
  const row = await prisma.verificationToken.findUnique({ where: { token: hash } });
  if (!row) return null;
  if (row.expires.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token: hash } }).catch(() => undefined);
    return null;
  }
  if (!row.identifier.startsWith(VERIFY_PREFIX)) return null;
  const email = row.identifier.slice(VERIFY_PREFIX.length);
  await prisma.verificationToken.delete({ where: { token: hash } });
  return email;
}

export async function issuePasswordResetToken(userId: string): Promise<string> {
  const { secret, hash } = newSecret();
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
    },
  });
  return secret;
}

/** Returns the userId if the token is valid (consumes it); null otherwise. */
export async function consumePasswordResetToken(secret: string): Promise<string | null> {
  const hash = sha256(secret);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hash } });
  if (!row) return null;
  if (row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  await prisma.passwordResetToken.update({
    where: { tokenHash: hash },
    data: { usedAt: new Date() },
  });
  return row.userId;
}

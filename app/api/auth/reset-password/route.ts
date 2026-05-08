import bcrypt from 'bcryptjs';
import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { passwordResetLimiter } from '@/lib/redis';
import { consumePasswordResetToken } from '@/lib/services/auth-tokens';
import { getClientIp } from '@/lib/utils/request';
import { resetPasswordSchema } from '@/lib/validators/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await passwordResetLimiter.limit(ip);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { token, password } = parsed.data;

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return NextResponse.json(
      { error: 'This reset link is invalid or has expired. Request a new one.' },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  // Bump tokenVersion so any active sessions on other devices are invalidated
  // the next time they hit a sensitive route.
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
      // If the user reset password without verifying email yet, treat that as
      // proof of inbox control and mark the email verified.
      emailVerified: { set: new Date() },
    },
  });
  await prisma.userLoginEvent.create({
    data: { userId, kind: 'REVOKE_ALL', provider: 'password-reset' },
  });

  return NextResponse.json({ ok: true });
}

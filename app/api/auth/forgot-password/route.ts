import { type NextRequest, NextResponse } from 'next/server';
import { createElement } from 'react';
import { PasswordResetEmail } from '@/emails/password-reset';
import { prisma } from '@/lib/db';
import { passwordResetLimiter } from '@/lib/redis';
import { sendEmail } from '@/lib/resend';
import { issuePasswordResetToken } from '@/lib/services/auth-tokens';
import { appUrl, getClientIp } from '@/lib/utils/request';
import { forgotPasswordSchema } from '@/lib/validators/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const { email } = parsed.data;

  const rl = await passwordResetLimiter.limit(`${getClientIp(req)}:${email}`);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, isBlocked: true, deletedAt: true },
  });

  // Account-enumeration safe: same response regardless of existence.
  if (user && !user.isBlocked && !user.deletedAt && user.email) {
    const secret = await issuePasswordResetToken(user.id);
    const resetUrl = `${appUrl()}/reset-password?token=${secret}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your password — Naman Electronics',
      react: createElement(PasswordResetEmail, { name: user.name, resetUrl }),
    }).catch(() => undefined);
  }

  return NextResponse.json({
    ok: true,
    message: "If that email is on file, we've sent a reset link.",
  });
}

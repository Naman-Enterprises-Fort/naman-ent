import { type NextRequest, NextResponse } from 'next/server';
import { createElement } from 'react';
import { VerifyEmail } from '@/emails/verify-email';
import { prisma } from '@/lib/db';
import { verifyEmailLimiter } from '@/lib/redis';
import { sendEmail } from '@/lib/resend';
import { issueEmailVerificationToken } from '@/lib/services/auth-tokens';
import { appUrl, getClientIp } from '@/lib/utils/request';
import { resendVerificationSchema } from '@/lib/validators/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = resendVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const { email } = parsed.data;

  // Rate limit: combine IP + email so a single attacker can't iterate emails,
  // and a single victim email can't be hammered from many IPs.
  const rl = await verifyEmailLimiter.limit(`${getClientIp(req)}:${email}`);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  // Don't leak whether the email exists — always respond identically.
  if (user && !user.emailVerified && user.email) {
    const secret = await issueEmailVerificationToken(user.email);
    const verifyUrl = `${appUrl()}/verify-email?token=${secret}`;
    await sendEmail({
      to: user.email,
      subject: 'Verify your email — Naman Enterprises',
      react: createElement(VerifyEmail, { name: user.name, verifyUrl }),
    }).catch(() => undefined);
  }

  return NextResponse.json({
    ok: true,
    message: "If that email is on file, we've sent a fresh link.",
  });
}

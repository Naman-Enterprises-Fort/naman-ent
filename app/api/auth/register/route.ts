import bcrypt from 'bcryptjs';
import { type NextRequest, NextResponse } from 'next/server';
import { createElement } from 'react';
import { VerifyEmail } from '@/emails/verify-email';
import { prisma } from '@/lib/db';
import { registerLimiter } from '@/lib/redis';
import { sendEmail } from '@/lib/resend';
import { issueEmailVerificationToken } from '@/lib/services/auth-tokens';
import { appUrl, getClientIp } from '@/lib/utils/request';
import { registerSchema } from '@/lib/validators/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await registerLimiter.limit(ip);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many sign-up attempts. Try again later.' },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { name, email, password } = parsed.data;

  // Reject any existing email — including OAuth-only accounts. Letting an
  // attacker set a password on a Google-only account before the real owner
  // verifies their inbox would be account takeover. The owner can use
  // forgot-password (which proves inbox control) to set a password later.
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json(
      { error: 'An account already exists for this email. Try signing in or use forgot-password.' },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true },
  });

  const secret = await issueEmailVerificationToken(email);
  const verifyUrl = `${appUrl()}/verify-email?token=${secret}`;
  await sendEmail({
    to: email,
    subject: 'Verify your email — Naman Electronics',
    react: createElement(VerifyEmail, { name: user.name, verifyUrl }),
  });

  return NextResponse.json({ ok: true, message: 'Check your inbox to verify your email.' });
}

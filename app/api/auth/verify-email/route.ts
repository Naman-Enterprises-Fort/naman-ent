import { type NextRequest, NextResponse } from 'next/server';
import { createElement } from 'react';
import { WelcomeEmail } from '@/emails/welcome';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/resend';
import { consumeEmailVerificationToken } from '@/lib/services/auth-tokens';
import { appUrl } from '@/lib/utils/request';
import { verifyEmailSchema } from '@/lib/validators/auth';

export const runtime = 'nodejs';

/**
 * GET /api/auth/verify-email?token=...  ← landing target from email link
 * Always redirects to /verify-email so we can render a friendly success/failure UI.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const parsed = verifyEmailSchema.safeParse({ token });
  if (!parsed.success) {
    return NextResponse.redirect(new URL('/verify-email?status=invalid', req.url));
  }

  const email = await consumeEmailVerificationToken(parsed.data.token);
  if (!email) {
    return NextResponse.redirect(new URL('/verify-email?status=expired', req.url));
  }

  const user = await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
    select: { name: true, email: true },
  });

  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: 'Welcome to Naman Enterprises',
      react: createElement(WelcomeEmail, { name: user.name, shopUrl: appUrl() }),
    }).catch(() => undefined); // welcome failure must not break verify flow
  }

  return NextResponse.redirect(new URL('/verify-email?status=success', req.url));
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthError, requireSession } from '@/lib/services/auth';

export const runtime = 'nodejs';

/** Returns the 20 most recent login events for the current user. */
export async function GET() {
  let session: Awaited<ReturnType<typeof requireSession>>;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const events = await prisma.userLoginEvent.findMany({
    where: { userId: session.user.id, kind: 'LOGIN' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, provider: true, ipAddress: true, userAgent: true, createdAt: true },
  });

  return NextResponse.json({ events });
}

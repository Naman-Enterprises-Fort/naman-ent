import { NextResponse } from 'next/server';
import { AuthError, requireFreshSession, revokeAllSessions } from '@/lib/services/auth';

export const runtime = 'nodejs';

/**
 * POST /api/account/sessions/revoke — bumps the user's tokenVersion so every
 * device with an existing JWT gets rejected on its next sensitive request.
 * The client should follow up with `signOut()` to clear the current device's
 * cookie too.
 */
export async function POST() {
  let session: Awaited<ReturnType<typeof requireFreshSession>>;
  try {
    session = await requireFreshSession();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  await revokeAllSessions(session.user.id);
  return NextResponse.json({ ok: true });
}

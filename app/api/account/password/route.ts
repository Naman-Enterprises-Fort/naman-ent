import bcrypt from 'bcryptjs';
import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthError, requireFreshSession } from '@/lib/services/auth';
import { changePasswordSchema } from '@/lib/validators/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireFreshSession>>;
  try {
    session = await requireFreshSession();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: 'This account has no password set. Use forgot-password to set one.' },
      { status: 400 },
    );
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  await prisma.userLoginEvent.create({
    data: { userId: session.user.id, kind: 'REVOKE_ALL', provider: 'password-change' },
  });

  return NextResponse.json({ ok: true });
}

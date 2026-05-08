import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AuthError, requireFreshSession } from '@/lib/services/auth';
import { profileSchema } from '@/lib/validators/auth';

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireFreshSession>>;
  try {
    session = await requireFreshSession();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, phone } = parsed.data;
  const phoneNormalised = phone ? phone.replace(/^\+91/, '') : null;

  if (phoneNormalised) {
    const conflict = await prisma.user.findFirst({
      where: { phone: phoneNormalised, NOT: { id: session.user.id } },
      select: { id: true },
    });
    if (conflict) {
      return NextResponse.json(
        { error: 'That mobile number is already linked to another account.' },
        { status: 409 },
      );
    }
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone: phoneNormalised,
      // Resetting phone clears verification — it'll need OTP confirm in Sprint 2B.
      phoneVerified: phoneNormalised ? undefined : null,
    },
    select: { name: true, phone: true },
  });

  return NextResponse.json({ ok: true, user });
}

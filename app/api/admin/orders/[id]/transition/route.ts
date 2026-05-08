import { type NextRequest, NextResponse } from 'next/server';
import { AuthError, type AuthedSession, requireRole } from '@/lib/services/auth';
import { adminTransition, OrderError } from '@/lib/services/orders';
import { adminOrderTransitionSchema } from '@/lib/validators/order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  let session: AuthedSession;
  try {
    session = await requireRole('ORDER_MANAGER', 'SUPER_ADMIN');
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = adminOrderTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  try {
    await adminTransition({
      orderId: id,
      next: parsed.data.status,
      note: parsed.data.note,
      actorUserId: session.user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof OrderError) {
      const status = e.code === 'NOT_FOUND' ? 404 : e.code === 'INVALID_TRANSITION' ? 409 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
}

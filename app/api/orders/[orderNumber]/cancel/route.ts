import { type NextRequest, NextResponse } from 'next/server';
import { AuthError, type AuthedSession, requireSession } from '@/lib/services/auth';
import { cancelOrder, getOrderForUser, OrderError } from '@/lib/services/orders';
import { cancelOrderSchema } from '@/lib/validators/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ orderNumber: string }> }) {
  let session: AuthedSession;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = cancelOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { orderNumber } = await ctx.params;
  const order = await getOrderForUser({ userId: session.user.id, orderNumber });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  try {
    await cancelOrder({
      orderId: order.id,
      actorUserId: session.user.id,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof OrderError) {
      const status = e.code === 'NOT_FOUND' ? 404 : e.code === 'NOT_CANCELLABLE' ? 409 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
}

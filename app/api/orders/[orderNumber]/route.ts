import { NextResponse } from 'next/server';
import { AuthError, type AuthedSession, requireSession } from '@/lib/services/auth';
import { getOrderForUser } from '@/lib/services/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ orderNumber: string }> }) {
  let session: AuthedSession;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const { orderNumber } = await ctx.params;
  const order = await getOrderForUser({ userId: session.user.id, orderNumber });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  return NextResponse.json({ order });
}

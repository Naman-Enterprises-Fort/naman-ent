import { NextResponse } from 'next/server';
import { AuthError, type AuthedSession, requireSession } from '@/lib/services/auth';
import { listOrders } from '@/lib/services/orders';
import { orderListQuerySchema } from '@/lib/validators/order';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  let session: AuthedSession;
  try {
    session = await requireSession();
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const url = new URL(req.url);
  const parsed = orderListQuerySchema.safeParse({
    page: url.searchParams.get('page') ?? undefined,
    perPage: url.searchParams.get('perPage') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await listOrders({
    userId: session.user.id,
    page: parsed.data.page,
    perPage: parsed.data.perPage,
    status: parsed.data.status,
  });
  return NextResponse.json(result);
}

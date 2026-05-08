import { type NextRequest, NextResponse } from 'next/server';
import { createAddress, listAddresses } from '@/lib/services/addresses';
import { AuthError, requireFreshSession } from '@/lib/services/auth';
import { createAddressSchema } from '@/lib/validators/account';

export const runtime = 'nodejs';

async function authed(): Promise<{ ok: true; userId: string } | { ok: false; res: NextResponse }> {
  try {
    const session = await requireFreshSession();
    return { ok: true, userId: session.user.id };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, res: NextResponse.json({ error: e.message }, { status: e.status }) };
    }
    throw e;
  }
}

export async function GET() {
  const a = await authed();
  if (!a.ok) return a.res;
  const addresses = await listAddresses(a.userId);
  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const a = await authed();
  if (!a.ok) return a.res;

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = createAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const address = await createAddress(a.userId, parsed.data);
  return NextResponse.json({ address }, { status: 201 });
}

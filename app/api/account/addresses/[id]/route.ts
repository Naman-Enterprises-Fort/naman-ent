import { type NextRequest, NextResponse } from 'next/server';
import { deleteAddress, setDefaultAddress, updateAddress } from '@/lib/services/addresses';
import { AuthError, requireFreshSession } from '@/lib/services/auth';
import { updateAddressSchema } from '@/lib/validators/account';
import { cuidSchema } from '@/lib/validators/common';

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await authed();
  if (!a.ok) return a.res;
  const { id } = await params;
  const idCheck = cuidSchema.safeParse(id);
  if (!idCheck.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = updateAddressSchema.safeParse({ ...(body as object), id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const result = await updateAddress(a.userId, parsed.data);
  if (!result) return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  return NextResponse.json({ address: result });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await authed();
  if (!a.ok) return a.res;
  const { id } = await params;
  const idCheck = cuidSchema.safeParse(id);
  if (!idCheck.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const ok = await deleteAddress(a.userId, id);
  if (!ok) return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// Sets this address as the default. Separate from PATCH so the form doesn't
// have to round-trip every field just to flip a flag.
export async function PUT(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await authed();
  if (!a.ok) return a.res;
  const { id } = await params;
  const idCheck = cuidSchema.safeParse(id);
  if (!idCheck.success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const result = await setDefaultAddress(a.userId, id);
  if (!result) return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  return NextResponse.json({ address: result });
}

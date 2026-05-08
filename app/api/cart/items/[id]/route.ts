import { type NextRequest, NextResponse } from 'next/server';
import { CartError, getCartView, removeItem, updateItem } from '@/lib/services/cart';
import { getCartOwner } from '@/lib/services/cart-owner';
import { updateCartItemSchema } from '@/lib/validators/cart';
import { cuidSchema } from '@/lib/validators/common';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const idCheck = cuidSchema.safeParse(id);
  if (!idCheck.success) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = updateCartItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (parsed.data.quantity === undefined && parsed.data.savedForLater === undefined) {
    return NextResponse.json({ error: 'No change requested' }, { status: 400 });
  }

  const owner = await getCartOwner();
  try {
    await updateItem(owner, id, parsed.data);
  } catch (e) {
    if (e instanceof CartError) {
      const status = e.code === 'NOT_FOUND' ? 404 : e.code === 'OUT_OF_STOCK' ? 409 : 400;
      return NextResponse.json({ error: e.message, code: e.code, ...e.meta }, { status });
    }
    throw e;
  }
  const cart = await getCartView(owner);
  return NextResponse.json({ cart });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const idCheck = cuidSchema.safeParse(id);
  if (!idCheck.success) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const owner = await getCartOwner();
  try {
    await removeItem(owner, id);
  } catch (e) {
    if (e instanceof CartError) {
      const status = e.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
  const cart = await getCartView(owner);
  return NextResponse.json({ cart });
}

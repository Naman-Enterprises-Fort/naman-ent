import { type NextRequest, NextResponse } from 'next/server';
import { addItem, CartError, clearCart, getCartView } from '@/lib/services/cart';
import { getCartOwner, getOrCreateCartOwner } from '@/lib/services/cart-owner';
import { addToCartSchema } from '@/lib/validators/cart';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const owner = await getCartOwner();
  const cart = await getCartView(owner);
  return NextResponse.json({ cart });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = addToCartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // POST is a mutating route handler — safe to mint the guest cookie here
  // (Next 16 forbids cookie writes from RSC layouts but allows them in
  // route handlers and Server Actions).
  const owner = await getOrCreateCartOwner();
  try {
    await addItem(owner, parsed.data);
  } catch (e) {
    if (e instanceof CartError) {
      const status = e.code === 'OUT_OF_STOCK' ? 409 : 400;
      return NextResponse.json({ error: e.message, code: e.code, ...e.meta }, { status });
    }
    throw e;
  }
  const cart = await getCartView(owner);
  return NextResponse.json({ cart }, { status: 201 });
}

export async function DELETE() {
  const owner = await getCartOwner();
  try {
    await clearCart(owner);
  } catch (e) {
    // A guest with no cart cookie has nothing to clear — clearCart throws
    // CartError('NOT_FOUND'). Mirror GET's no-identity behaviour and return
    // an empty cart view instead of letting the error escape as a 500.
    if (!(e instanceof CartError)) throw e;
  }
  const cart = await getCartView(owner);
  return NextResponse.json({ cart });
}

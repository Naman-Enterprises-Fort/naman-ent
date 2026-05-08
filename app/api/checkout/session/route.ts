import { type NextRequest, NextResponse } from 'next/server';
import { RazorpayError } from '@/lib/razorpay';
import { getCartOwner } from '@/lib/services/cart-owner';
import { OrderError } from '@/lib/services/orders';
import { startCheckoutSession } from '@/lib/services/payments';
import { createCheckoutSessionSchema } from '@/lib/validators/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = createCheckoutSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const owner = await getCartOwner();

  try {
    const result = await startCheckoutSession({
      userId: owner.userId,
      cartSessionId: owner.sessionId,
      data: parsed.data,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof OrderError) {
      const status =
        e.code === 'EMPTY_CART'
          ? 400
          : e.code === 'OUT_OF_STOCK' || e.code === 'STOCK_CONFLICT'
            ? 409
            : e.code === 'ADDRESS_NOT_FOUND'
              ? 404
              : 400;
      return NextResponse.json({ error: e.message, code: e.code, ...e.meta }, { status });
    }
    if (e instanceof RazorpayError) {
      return NextResponse.json(
        { error: 'Payment gateway unavailable', code: 'PAYMENT_GATEWAY' },
        { status: 503 },
      );
    }
    throw e;
  }
}

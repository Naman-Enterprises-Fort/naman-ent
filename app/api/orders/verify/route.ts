import { type NextRequest, NextResponse } from 'next/server';
import { getCartOwner } from '@/lib/services/cart-owner';
import { OrderError } from '@/lib/services/orders';
import { verifyAndCapturePayment } from '@/lib/services/payments';
import { verifyOrderSchema } from '@/lib/validators/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = verifyOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const owner = await getCartOwner();

  try {
    const result = await verifyAndCapturePayment({
      orderNumber: parsed.data.orderNumber,
      razorpayOrderId: parsed.data.razorpay_order_id,
      razorpayPaymentId: parsed.data.razorpay_payment_id,
      razorpaySignature: parsed.data.razorpay_signature,
      cartSessionId: owner.sessionId ?? '',
      userId: owner.userId,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof OrderError) {
      const status = e.code === 'AMOUNT_MISMATCH' ? 400 : e.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    throw e;
  }
}

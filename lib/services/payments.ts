import 'server-only';
import { prisma } from '@/lib/db';
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  RazorpayError,
  type RazorpayOrder,
  verifyPaymentSignature,
} from '@/lib/razorpay';
import { sendOrderPlacedEmail } from '@/lib/services/order-email';
import {
  attachRazorpayOrderId,
  clearCartAfterCheckout,
  confirmOnlinePayment,
  OrderError,
  type PlacedOrder,
  placeOrderForCheckout,
} from '@/lib/services/orders';
import type { CreateCheckoutSessionInput } from '@/lib/validators/checkout';

// -----------------------------------------------------------------------------
// Place order + start payment — single entry from /api/checkout/session
// -----------------------------------------------------------------------------

export interface CheckoutSessionResult {
  order: PlacedOrder;
  /**
   * Present for online payment methods. The client passes these into the
   * Razorpay Web Checkout iframe via `Razorpay({ key, order_id, amount, ... })`.
   */
  razorpay?: {
    keyId: string;
    orderId: string;
    amountPaise: number;
    currency: string;
    name: string;
    description: string;
    prefill: { email: string; contact: string; name?: string };
    notes: Record<string, string>;
  };
  /** Where the client should land after success. Set immediately for COD. */
  redirect?: string;
}

export async function startCheckoutSession(params: {
  userId: string | null;
  cartSessionId: string;
  data: CreateCheckoutSessionInput;
}): Promise<CheckoutSessionResult> {
  const order = await placeOrderForCheckout(params);

  if (params.data.paymentMethod === 'COD') {
    await sendOrderPlacedEmail(order.orderNumber);
    return {
      order,
      redirect: `/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}`,
    };
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID;
  if (!isRazorpayConfigured() || !keyId) {
    throw new RazorpayError(503, 'Razorpay is not configured');
  }

  let rzpOrder: RazorpayOrder;
  try {
    rzpOrder = await createRazorpayOrder({
      amountPaise: order.totalPaise,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: { orderNumber: order.orderNumber, paymentId: order.paymentId },
      paymentCapture: 1,
    });
  } catch (e) {
    // Roll back the placed order so the user can retry without a stale PENDING.
    await safeRollbackPlacedOrder(order.orderId);
    throw e;
  }

  await attachRazorpayOrderId({
    paymentId: order.paymentId,
    gatewayOrderId: rzpOrder.id,
  });

  const storeName = process.env.NEXT_PUBLIC_STORE_NAME ?? 'Naman Electronics';

  return {
    order,
    razorpay: {
      keyId,
      orderId: rzpOrder.id,
      amountPaise: order.totalPaise,
      currency: 'INR',
      name: storeName,
      description: `Order ${order.orderNumber}`,
      prefill: {
        email: params.data.contactEmail,
        contact: params.data.contactPhone.replace(/^\+91/, ''),
      },
      notes: { orderNumber: order.orderNumber },
    },
  };
}

/**
 * Restore inventory + cancel the placed order if the upstream Razorpay create
 * call fails. We never raise from this — the original error wins.
 */
async function safeRollbackPlacedOrder(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { select: { variantId: true, quantity: true } } },
    });
    if (!order || order.status !== 'PENDING') return;
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelReason: 'Razorpay session-create failed',
          cancelledAt: new Date(),
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId,
          status: 'CANCELLED',
          note: 'Razorpay session-create failed; stock restored',
        },
      });
      for (const it of order.items) {
        await tx.productVariant.update({
          where: { id: it.variantId },
          data: { stock: { increment: it.quantity }, version: { increment: 1 } },
        });
      }
    });
  } catch {
    // Best-effort rollback — original error already propagated.
  }
}

// -----------------------------------------------------------------------------
// Verify payment after Razorpay Web Checkout `handler` callback
// -----------------------------------------------------------------------------

export interface VerifyPaymentInput {
  orderNumber: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  cartSessionId: string;
  userId: string | null;
}

export async function verifyAndCapturePayment(input: VerifyPaymentInput): Promise<{
  orderNumber: string;
  alreadyConfirmed: boolean;
}> {
  const sigOk = verifyPaymentSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });
  if (!sigOk) throw new OrderError('AMOUNT_MISMATCH', 'Invalid payment signature');

  // Pull the live amount from Razorpay for a final server-side amount recheck.
  let expectedAmountPaise: number | undefined;
  try {
    const payment = await fetchRazorpayPayment(input.razorpayPaymentId);
    expectedAmountPaise = payment.amount;
  } catch {
    // If Razorpay is unreachable, skip the recheck; the signature already proves intent.
  }

  const result = await confirmOnlinePayment({
    orderNumber: input.orderNumber,
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpaySignature: input.razorpaySignature,
    expectedAmountPaise,
  });

  if (!result.alreadyConfirmed) {
    await clearCartAfterCheckout(input.userId, input.cartSessionId);
    await sendOrderPlacedEmail(result.orderNumber);
  }

  return { orderNumber: result.orderNumber, alreadyConfirmed: result.alreadyConfirmed };
}

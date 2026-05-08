import 'server-only';
import type { Prisma, RefundStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { paiseToDecimal } from '@/lib/services/pricing';

/**
 * Razorpay webhook dispatcher.
 *
 * Per SRS §6.5.3 + §12.2:
 *  - Raw-body HMAC-SHA256 verify against `x-razorpay-signature`.
 *  - Idempotent: same event delivered twice is a no-op (Payment.gatewayPaymentId
 *    + Refund.gatewayRefundId are both `@unique`).
 *  - Returns 2xx within 5s; long-running side effects (email, etc.) are not done
 *    inside the dispatcher in Phase 1 since order placement / confirmation
 *    already happens through the verify path. Sprint 5 wires email queues.
 */

interface RazorpayEventEnvelope {
  event: string;
  account_id?: string;
  contains?: string[];
  payload?: {
    payment?: { entity?: RazorpayEventPayment };
    order?: { entity?: RazorpayEventOrder };
    refund?: { entity?: RazorpayEventRefund };
  };
  created_at?: number;
}

interface RazorpayEventPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method: string;
  email?: string;
  contact?: string;
  error_code?: string;
  error_description?: string;
  notes?: Record<string, string>;
}

interface RazorpayEventOrder {
  id: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  status: 'created' | 'attempted' | 'paid';
  notes?: Record<string, string>;
}

interface RazorpayEventRefund {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processed' | 'failed';
  notes?: Record<string, string>;
}

export interface WebhookOutcome {
  status: 'ok' | 'invalid_signature' | 'unknown_event' | 'noop';
  event?: string;
  detail?: string;
}

export async function handleRazorpayWebhook(args: {
  rawBody: string;
  signature: string | null;
}): Promise<WebhookOutcome> {
  if (!verifyWebhookSignature(args.rawBody, args.signature)) {
    return { status: 'invalid_signature' };
  }
  let envelope: RazorpayEventEnvelope;
  try {
    envelope = JSON.parse(args.rawBody) as RazorpayEventEnvelope;
  } catch {
    return { status: 'invalid_signature', detail: 'Malformed JSON' };
  }

  const event = envelope.event ?? '';
  const payment = envelope.payload?.payment?.entity;
  const refund = envelope.payload?.refund?.entity;

  switch (event) {
    case 'payment.captured':
    case 'payment.authorized':
      if (!payment) return { status: 'noop', event, detail: 'No payment payload' };
      await onPaymentCaptured(payment, event);
      return { status: 'ok', event };
    case 'payment.failed':
      if (!payment) return { status: 'noop', event, detail: 'No payment payload' };
      await onPaymentFailed(payment);
      return { status: 'ok', event };
    case 'order.paid':
      // `order.paid` is a higher-level signal; the corresponding `payment.captured`
      // already handles the heavy lifting. We log via the order event for trace.
      if (payment) await onPaymentCaptured(payment, event);
      return { status: 'ok', event };
    case 'refund.created':
    case 'refund.processed':
    case 'refund.failed':
      if (!refund) return { status: 'noop', event, detail: 'No refund payload' };
      await onRefundEvent(refund, event);
      return { status: 'ok', event };
    default:
      return { status: 'unknown_event', event };
  }
}

// -----------------------------------------------------------------------------
// Event handlers
// -----------------------------------------------------------------------------

async function onPaymentCaptured(p: RazorpayEventPayment, sourceEvent: string): Promise<void> {
  // Locate the local Order via `gatewayOrderId` we attached at session-create time.
  const existingPayment = await prisma.payment.findFirst({
    where: { gatewayOrderId: p.order_id },
    include: { order: true },
  });
  if (!existingPayment) return;

  // Idempotent: if this exact payment_id is already on the row, no-op.
  if (existingPayment.gatewayPaymentId === p.id && existingPayment.status === 'CAPTURED') return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: existingPayment.id },
      data: {
        gatewayPaymentId: p.id,
        method: mapMethod(p.method),
        status: 'CAPTURED',
        capturedAt: new Date(),
        raw: p as unknown as Prisma.InputJsonValue,
      },
    });

    // Only flip the order forward if it's still in PENDING — verify path may
    // have already moved it to CONFIRMED.
    if (existingPayment.order.status === 'PENDING') {
      await tx.order.update({
        where: { id: existingPayment.orderId },
        data: { status: 'CONFIRMED', paymentStatus: 'CAPTURED' },
      });
      await tx.orderEvent.create({
        data: {
          orderId: existingPayment.orderId,
          status: 'CONFIRMED',
          note: `Webhook ${sourceEvent}`,
        },
      });
    } else if (existingPayment.order.paymentStatus !== 'CAPTURED') {
      await tx.order.update({
        where: { id: existingPayment.orderId },
        data: { paymentStatus: 'CAPTURED' },
      });
    }
  });
}

async function onPaymentFailed(p: RazorpayEventPayment): Promise<void> {
  const existingPayment = await prisma.payment.findFirst({
    where: { gatewayOrderId: p.order_id },
    include: { order: { include: { items: { select: { variantId: true, quantity: true } } } } },
  });
  if (!existingPayment) return;
  if (existingPayment.status === 'FAILED') return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: existingPayment.id },
      data: {
        gatewayPaymentId: p.id,
        method: mapMethod(p.method),
        status: 'FAILED',
        failedAt: new Date(),
        errorCode: p.error_code ?? null,
        errorDescription: p.error_description ?? null,
        raw: p as unknown as Prisma.InputJsonValue,
      },
    });

    // If the order was still PENDING, cancel it + restore stock.
    if (existingPayment.order.status === 'PENDING') {
      await tx.order.update({
        where: { id: existingPayment.orderId },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          cancelReason: p.error_description ?? 'Payment failed',
          cancelledAt: new Date(),
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: existingPayment.orderId,
          status: 'CANCELLED',
          note: `Payment failed: ${p.error_description ?? p.error_code ?? 'unknown'}`,
        },
      });
      for (const it of existingPayment.order.items) {
        await tx.productVariant.update({
          where: { id: it.variantId },
          data: { stock: { increment: it.quantity }, version: { increment: 1 } },
        });
      }
    } else {
      await tx.order.update({
        where: { id: existingPayment.orderId },
        data: { paymentStatus: 'FAILED' },
      });
    }
  });
}

async function onRefundEvent(r: RazorpayEventRefund, sourceEvent: string): Promise<void> {
  const status: RefundStatus =
    r.status === 'processed' ? 'PROCESSED' : r.status === 'failed' ? 'FAILED' : 'PENDING';

  // Find the local Payment that owns this refund.
  const payment = await prisma.payment.findFirst({
    where: { gatewayPaymentId: r.payment_id },
  });
  if (!payment) return;

  // Upsert the refund row keyed by the gateway refund id.
  await prisma.$transaction(async (tx) => {
    const existing = await tx.refund.findUnique({ where: { gatewayRefundId: r.id } });
    if (existing) {
      if (existing.status === status) return;
      await tx.refund.update({
        where: { id: existing.id },
        data: {
          status,
          processedAt: status === 'PROCESSED' ? new Date() : existing.processedAt,
          raw: r as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      await tx.refund.create({
        data: {
          orderId: payment.orderId,
          paymentId: payment.id,
          gatewayRefundId: r.id,
          amount: paiseToDecimal(r.amount),
          status,
          processedAt: status === 'PROCESSED' ? new Date() : null,
          raw: r as unknown as Prisma.InputJsonValue,
        },
      });
    }

    // If a refund landed, the payment is at least partially refunded.
    if (status === 'PROCESSED') {
      const sum = await tx.refund.aggregate({
        where: { paymentId: payment.id, status: 'PROCESSED' },
        _sum: { amount: true },
      });
      const refundedTotal = Number(sum._sum.amount?.toString() ?? '0');
      const paidTotal = Number(payment.amount.toString());
      const fully = refundedTotal >= paidTotal;
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: fully ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: fully ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          ...(fully ? { status: 'REFUNDED' } : {}),
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: payment.orderId,
          status: fully ? 'REFUNDED' : 'CONFIRMED',
          note: `Webhook ${sourceEvent} (₹${(refundedTotal).toFixed(2)} refunded)`,
        },
      });
    }
  });
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function mapMethod(rzpMethod: string): import('@prisma/client').PaymentMethod | null {
  const m = rzpMethod?.toLowerCase();
  switch (m) {
    case 'upi':
      return 'UPI';
    case 'card':
      return 'CARD';
    case 'netbanking':
      return 'NETBANKING';
    case 'wallet':
      return 'WALLET';
    case 'emi':
      return 'EMI';
    case 'paylater':
      return 'PAY_LATER';
    default:
      return null;
  }
}

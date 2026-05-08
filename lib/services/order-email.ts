import 'server-only';
import type { PaymentMethod } from '@prisma/client';
import { OrderDeliveredEmail } from '@/emails/order-delivered';
import { OrderPlacedEmail } from '@/emails/order-placed';
import { OrderShippedEmail } from '@/emails/order-shipped';
import { RefundProcessedEmail } from '@/emails/refund-processed';
import { prisma } from '@/lib/db';
import { formatINR, fromPaise } from '@/lib/money';
import { sendEmail } from '@/lib/resend';
import { decimalToPaise } from '@/lib/services/pricing';
import { appUrl } from '@/lib/utils/request';

/**
 * Order email senders. Every function is best-effort: a send failure is logged
 * but never propagated. An order's lifecycle never fails because Resend is
 * having a bad day.
 */

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  UPI: 'UPI',
  CARD: 'card',
  NETBANKING: 'net banking',
  WALLET: 'wallet',
  EMI: 'EMI',
  PAY_LATER: 'pay later',
  COD: 'cash on delivery',
};

function trackUrlFor(order: { orderNumber: string; userId: string | null }): string {
  return order.userId
    ? `${appUrl()}/account/orders/${order.orderNumber}`
    : `${appUrl()}/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}`;
}

export async function sendOrderPlacedEmail(orderNumber: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { select: { quantity: true } },
        addresses: { where: { type: 'SHIPPING' } },
        user: { select: { name: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!order) return;
    const ship = order.addresses[0];
    if (!ship) return;
    const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
    await sendEmail({
      to: order.email,
      subject: `Order ${order.orderNumber} — confirmed`,
      react: OrderPlacedEmail({
        name: order.user?.name ?? null,
        orderNumber: order.orderNumber,
        totalLabel: formatINR(fromPaise(decimalToPaise(order.total))),
        isCod: order.payments[0]?.gateway === 'COD',
        itemCount,
        trackUrl: trackUrlFor(order),
        shipping: {
          fullName: ship.fullName,
          line1: ship.line1,
          line2: ship.line2,
          city: ship.city,
          state: ship.state,
          pincode: ship.pincode,
        },
      }),
    });
  } catch (e) {
    console.warn('[order-email] order-placed failed for', orderNumber, e);
  }
}

export async function sendOrderShippedEmail(orderNumber: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { select: { quantity: true } },
        addresses: { where: { type: 'SHIPPING' } },
        user: { select: { name: true } },
        shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!order) return;
    const ship = order.addresses[0];
    if (!ship) return;
    const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
    const shipment = order.shipments[0] ?? null;
    const estimatedDelivery = shipment?.estimatedDate
      ? shipment.estimatedDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null;
    await sendEmail({
      to: order.email,
      subject: `Order ${order.orderNumber} is on the way`,
      react: OrderShippedEmail({
        name: order.user?.name ?? null,
        orderNumber: order.orderNumber,
        itemCount,
        trackUrl: trackUrlFor(order),
        courier: shipment?.carrier ?? null,
        awb: shipment?.awb ?? null,
        estimatedDelivery,
        shipping: {
          fullName: ship.fullName,
          line1: ship.line1,
          line2: ship.line2,
          city: ship.city,
          state: ship.state,
          pincode: ship.pincode,
        },
      }),
    });
  } catch (e) {
    console.warn('[order-email] order-shipped failed for', orderNumber, e);
  }
}

export async function sendOrderDeliveredEmail(orderNumber: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: { select: { quantity: true } },
        user: { select: { name: true } },
      },
    });
    if (!order) return;
    const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
    // Phase-1 returns window is 7 days from delivery (mirrors /returns policy).
    const returnByDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      },
    );
    await sendEmail({
      to: order.email,
      subject: `Order ${order.orderNumber} delivered`,
      react: OrderDeliveredEmail({
        name: order.user?.name ?? null,
        orderNumber: order.orderNumber,
        itemCount,
        orderUrl: trackUrlFor(order),
        returnByDate,
      }),
    });
  } catch (e) {
    console.warn('[order-email] order-delivered failed for', orderNumber, e);
  }
}

export async function sendRefundProcessedEmail(args: {
  orderId: string;
  refundPaise: number;
  isPartial: boolean;
}): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: args.orderId },
      include: {
        user: { select: { name: true } },
        payments: {
          where: { status: { in: ['CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!order) return;
    const payment = order.payments[0];
    const methodLabel = payment?.method
      ? PAYMENT_METHOD_LABEL[payment.method]
      : payment?.gateway === 'COD'
        ? 'your bank account'
        : 'your original payment method';
    await sendEmail({
      to: order.email,
      subject: `Refund of ${formatINR(fromPaise(args.refundPaise))} processed for order ${order.orderNumber}`,
      react: RefundProcessedEmail({
        name: order.user?.name ?? null,
        orderNumber: order.orderNumber,
        refundLabel: formatINR(fromPaise(args.refundPaise)),
        paymentMethodLabel: methodLabel,
        isPartial: args.isPartial,
        orderUrl: trackUrlFor(order),
      }),
    });
  } catch (e) {
    console.warn('[order-email] refund-processed failed for', args.orderId, e);
  }
}

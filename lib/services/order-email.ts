import 'server-only';
import { OrderPlacedEmail } from '@/emails/order-placed';
import { prisma } from '@/lib/db';
import { formatINR, fromPaise } from '@/lib/money';
import { sendEmail } from '@/lib/resend';
import { decimalToPaise } from '@/lib/services/pricing';
import { appUrl } from '@/lib/utils/request';

/**
 * Send the "order placed" confirmation email for an order. Best-effort: a send
 * failure is logged but never propagated — placing an order shouldn't 500 if
 * Resend is having a bad day.
 */
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
    const trackUrl = order.userId
      ? `${appUrl()}/account/orders/${order.orderNumber}`
      : `${appUrl()}/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}`;
    await sendEmail({
      to: order.email,
      subject: `Order ${order.orderNumber} — confirmed`,
      react: OrderPlacedEmail({
        name: order.user?.name ?? null,
        orderNumber: order.orderNumber,
        totalLabel: formatINR(fromPaise(decimalToPaise(order.total))),
        isCod: order.payments[0]?.gateway === 'COD',
        itemCount,
        trackUrl,
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
    console.warn('[order-email] failed to send for', orderNumber, e);
  }
}

import 'server-only';
import { CartAbandonedEmail, type CartReminderTier } from '@/emails/cart-abandoned';
import { prisma } from '@/lib/db';
import { formatINR, fromPaise } from '@/lib/money';
import { sendEmail } from '@/lib/resend';
import { decimalToPaise } from '@/lib/services/pricing';
import { appUrl } from '@/lib/utils/request';

/**
 * Cart abandonment recovery — scans for carts that have gone quiet for
 * 1h / 24h / 72h and sends one reminder per tier per cart, ever. Phase-2
 * graduates to per-abandonment-cycle reminders. Driven by an external cron
 * (Vercel cron or QStash) hitting `/api/cron/cart-abandonment`.
 *
 * The query joins on `CartReminder` to ensure idempotency: a cart that
 * already has a tier-1 row will not get another tier-1 email, so even if the
 * cron double-fires the side effects are safe.
 */

interface TierConfig {
  tier: CartReminderTier;
  thresholdHours: number;
  // Upper bound to avoid spamming carts that abandoned days ago when the cron
  // first comes online. We only consider carts that hit the window cleanly.
  maxAgeHours: number;
}

const TIERS: ReadonlyArray<TierConfig> = [
  { tier: 1, thresholdHours: 1, maxAgeHours: 24 },
  { tier: 2, thresholdHours: 24, maxAgeHours: 72 },
  { tier: 3, thresholdHours: 72, maxAgeHours: 14 * 24 },
];

const TOP_ITEMS_LIMIT = 3;

export interface AbandonmentRunSummary {
  perTier: Array<{ tier: CartReminderTier; eligible: number; sent: number; errored: number }>;
  totalSent: number;
}

export async function scanAndRemindAbandonedCarts(opts?: {
  now?: Date;
  perTierLimit?: number;
}): Promise<AbandonmentRunSummary> {
  const now = opts?.now ?? new Date();
  const perTierLimit = opts?.perTierLimit ?? 100;

  const summary: AbandonmentRunSummary = {
    perTier: [],
    totalSent: 0,
  };

  for (const cfg of TIERS) {
    const upper = new Date(now.getTime() - cfg.thresholdHours * 60 * 60 * 1000);
    const lower = new Date(now.getTime() - cfg.maxAgeHours * 60 * 60 * 1000);

    const carts = await prisma.cart.findMany({
      where: {
        userId: { not: null },
        updatedAt: { lt: upper, gte: lower },
        items: { some: { savedForLater: false } },
        reminders: { none: { tier: cfg.tier } },
      },
      orderBy: { updatedAt: 'asc' },
      take: perTierLimit,
      include: {
        user: { select: { email: true, name: true } },
        items: {
          where: { savedForLater: false },
          include: {
            variant: {
              select: {
                name: true,
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    let sent = 0;
    let errored = 0;
    for (const cart of carts) {
      if (!cart.user?.email || cart.items.length === 0) continue;

      const totalPaise = cart.items.reduce(
        (s, it) => s + decimalToPaise(it.priceSnapshot) * it.quantity,
        0,
      );
      const itemCount = cart.items.reduce((s, it) => s + it.quantity, 0);
      const topItems = cart.items.slice(0, TOP_ITEMS_LIMIT).map((it) => ({
        name: it.variant.product.name + (it.variant.name ? ` — ${it.variant.name}` : ''),
        quantity: it.quantity,
        priceLabel: formatINR(fromPaise(decimalToPaise(it.priceSnapshot))),
      }));

      try {
        await sendEmail({
          to: cart.user.email,
          subject:
            cfg.tier === 1
              ? 'You left something in your cart'
              : cfg.tier === 2
                ? 'Still thinking? Your cart is waiting'
                : 'One last reminder — your cart is here',
          react: CartAbandonedEmail({
            name: cart.user.name ?? null,
            tier: cfg.tier,
            itemCount,
            totalLabel: formatINR(fromPaise(totalPaise)),
            cartUrl: `${appUrl()}/cart`,
            topItems,
          }),
        });

        await prisma.cartReminder.create({
          data: { cartId: cart.id, tier: cfg.tier },
        });
        sent += 1;
      } catch (e) {
        // Send (or insert) failed — log and move on. The cron will retry on the
        // next tick because the CartReminder row was never created.
        console.warn('[cart-abandonment] tier', cfg.tier, 'failed for cart', cart.id, e);
        errored += 1;
      }
    }

    summary.perTier.push({
      tier: cfg.tier,
      eligible: carts.length,
      sent,
      errored,
    });
    summary.totalSent += sent;
  }

  return summary;
}

import { timingSafeEqual } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { scanAndRemindAbandonedCarts } from '@/lib/services/cart-abandonment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cart abandonment recovery cron.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` — matches the convention used by
 * Vercel Cron (which auto-injects the header from the project's CRON_SECRET
 * env var) and works equally well from Upstash QStash with a custom header.
 * In dev (no `CRON_SECRET` set) the route runs without auth — handy for local
 * testing — with a console warning.
 *
 * Idempotent: the underlying service is keyed on `CartReminder.@@unique([cartId, tier])`
 * so a double-fire is a no-op.
 */

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[cron/cart-abandonment] CRON_SECRET unset — running without auth (dev only).');
      return true;
    }
    // Production with no secret: refuse rather than expose an unauthenticated cron.
    console.error('[cron/cart-abandonment] CRON_SECRET unset in production — denying.');
    return false;
  }
  const header = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

async function run() {
  const summary = await scanAndRemindAbandonedCarts();
  return NextResponse.json({ ok: true, summary });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return run();
}

// GET is allowed only when CRON_SECRET is unset (dev), so curl/browser can
// trigger a manual run without bearer auth. With CRON_SECRET set, the cron
// platform must POST with the bearer header.
export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && process.env.CRON_SECRET.length > 0) {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }
  return run();
}

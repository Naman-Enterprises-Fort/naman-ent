import { NextResponse } from 'next/server';
import { handleRazorpayWebhook } from '@/lib/services/webhooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Razorpay webhook receiver.
 *
 * Reads the raw body as text (the HMAC verify is over the byte-exact body, not
 * the parsed object) and dispatches to `handleRazorpayWebhook`. Always returns
 * 2xx within Razorpay's 5s window — failures are logged + retried by Razorpay.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');

  const outcome = await handleRazorpayWebhook({ rawBody, signature });

  if (outcome.status === 'invalid_signature') {
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 400 });
  }
  if (outcome.status === 'unknown_event') {
    return NextResponse.json({ ok: true, event: outcome.event, ignored: true });
  }
  return NextResponse.json({ ok: true, event: outcome.event });
}

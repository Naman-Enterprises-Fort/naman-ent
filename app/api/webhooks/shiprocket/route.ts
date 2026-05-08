import { timingSafeEqual } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { applyTrackingUpdate, type TrackingUpdateInput } from '@/lib/services/shipping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Shiprocket tracking webhook.
 *
 * Auth: a `x-api-key` header equal to `SHIPROCKET_WEBHOOK_TOKEN`. Configured on
 * the Shiprocket dashboard (Settings → API → Webhooks → Add security token).
 * Compared in constant time. With the env unset, the route refuses traffic in
 * production; in dev it logs a warning and continues so curl-driven testing is
 * possible without round-trips through the Shiprocket dashboard.
 *
 * Always returns 2xx — Shiprocket retries on non-2xx and the integration
 * support docs explicitly ask integrators to "send only code 200 in response".
 * Outcome is included in the body for monitoring.
 */

interface ShiprocketWebhookBody {
  awb?: string;
  courier_name?: string;
  current_status?: string;
  current_status_id?: number;
  shipment_status?: string;
  shipment_status_id?: number;
  current_timestamp?: string;
  order_id?: string;
  sr_order_id?: number;
  awb_assigned_date?: string;
  pickup_scheduled_date?: string;
  etd?: string;
  is_return?: number;
  channel_id?: number;
  pod_status?: string;
  pod?: string;
  scans?: unknown;
}

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  if (!expected || expected.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[webhook/shiprocket] SHIPROCKET_WEBHOOK_TOKEN unset — accepting without auth (dev only).',
      );
      return true;
    }
    console.error('[webhook/shiprocket] SHIPROCKET_WEBHOOK_TOKEN unset in production — denying.');
    return false;
  }
  const header = req.headers.get('x-api-key') ?? '';
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: ShiprocketWebhookBody;
  try {
    body = (await req.json()) as ShiprocketWebhookBody;
  } catch {
    return NextResponse.json({ status: 'noop', reason: 'invalid_json' }, { status: 200 });
  }

  if (!body.awb) {
    return NextResponse.json({ status: 'noop', reason: 'missing_awb' }, { status: 200 });
  }
  // Webhooks for return shipments arrive on the same channel — Sprint 5C only
  // wires forward-shipment updates; the return path lands when the customer-
  // side return flow does (Phase 2).
  if (body.is_return === 1) {
    return NextResponse.json({ status: 'noop', reason: 'return_event_skipped' }, { status: 200 });
  }

  const status = body.current_status ?? body.shipment_status;
  if (!status) {
    return NextResponse.json({ status: 'noop', reason: 'missing_status' }, { status: 200 });
  }

  const input: TrackingUpdateInput = {
    awb: body.awb,
    shiprocketShipmentId: typeof body.sr_order_id === 'number' ? body.sr_order_id : null,
    currentStatus: status,
    currentStatusId: body.current_status_id,
    etd: body.etd ?? null,
    awbAssignedDate: body.awb_assigned_date ?? null,
    pickupScheduledDate: body.pickup_scheduled_date ?? null,
    raw: body,
  };

  const outcome = await applyTrackingUpdate(input);
  return NextResponse.json({ ok: true, ...outcome }, { status: 200 });
}

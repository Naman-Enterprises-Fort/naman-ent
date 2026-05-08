import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay HTTP API client + signature helpers.
 *
 * We hit Razorpay's REST API directly (`fetch` + Basic auth) instead of pulling
 * in the `razorpay` SDK — Phase 1 only needs four calls (create order, fetch
 * payment, create refund, verify signatures), and `node:crypto` already covers
 * HMAC-SHA256.
 *
 * Per SRS §6.5.3 + §12.2:
 *  - Auto-capture is the Phase-1 default (`payment_capture: 1`).
 *  - Payment-confirm signature = HMAC-SHA256(`${order_id}|${payment_id}`, KEY_SECRET).
 *  - Webhook signature = HMAC-SHA256(rawBody, WEBHOOK_SECRET).
 *  - Each Razorpay `payment_id` is stored with a unique constraint to prevent double-processing.
 */

interface RazorpayCreds {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

function loadCreds(): RazorpayCreds | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret, webhookSecret };
}

export function isRazorpayConfigured(): boolean {
  return loadCreds() !== null;
}

export class RazorpayError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = 'RazorpayError';
  }
}

const API = 'https://api.razorpay.com/v1';

async function authedFetch<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; json?: unknown } = {},
): Promise<T> {
  const creds = loadCreds();
  if (!creds) throw new RazorpayError(503, 'Razorpay is not configured');
  const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? (init.json ? 'POST' : 'GET'),
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: init.json ? JSON.stringify(init.json) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const raw = await res.text();
    throw new RazorpayError(res.status, `Razorpay ${path} failed (${res.status})`, raw);
  }
  return (await res.json()) as T;
}

// -----------------------------------------------------------------------------
// Orders
// -----------------------------------------------------------------------------

export interface RazorpayOrderInput {
  amountPaise: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  /** 1 = auto-capture (Phase-1 default), 0 = manual capture. */
  paymentCapture?: 0 | 1;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string;
  status: 'created' | 'attempted' | 'paid';
  created_at: number;
  notes?: Record<string, string>;
}

export async function createRazorpayOrder(input: RazorpayOrderInput): Promise<RazorpayOrder> {
  return authedFetch<RazorpayOrder>('/orders', {
    json: {
      amount: input.amountPaise,
      currency: input.currency ?? 'INR',
      receipt: input.receipt,
      notes: input.notes,
      payment_capture: input.paymentCapture ?? 1,
    },
  });
}

// -----------------------------------------------------------------------------
// Payments
// -----------------------------------------------------------------------------

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method: string;
  captured: boolean;
  email?: string;
  contact?: string;
  error_code?: string;
  error_description?: string;
  notes?: Record<string, string>;
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  return authedFetch<RazorpayPayment>(`/payments/${paymentId}`);
}

// -----------------------------------------------------------------------------
// Refunds
// -----------------------------------------------------------------------------

export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processed' | 'failed';
  notes?: Record<string, string>;
}

export async function createRazorpayRefund(params: {
  paymentId: string;
  amountPaise: number;
  notes?: Record<string, string>;
}): Promise<RazorpayRefund> {
  return authedFetch<RazorpayRefund>(`/payments/${params.paymentId}/refund`, {
    json: { amount: params.amountPaise, notes: params.notes },
  });
}

// -----------------------------------------------------------------------------
// Signature verification
// -----------------------------------------------------------------------------

/** Used after Razorpay Web Checkout `handler` callback — proves the client succeeded. */
export function verifyPaymentSignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const creds = loadCreds();
  if (!creds) return false;
  const expected = createHmac('sha256', creds.keySecret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest('hex');
  return safeEqual(expected, args.signature);
}

/** Verify webhook body against `x-razorpay-signature` using WEBHOOK_SECRET. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const creds = loadCreds();
  if (!creds?.webhookSecret) return false;
  const expected = createHmac('sha256', creds.webhookSecret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

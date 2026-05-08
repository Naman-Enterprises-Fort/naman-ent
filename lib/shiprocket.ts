import 'server-only';

/**
 * Thin Shiprocket REST client.
 *
 * Auth: POST /v1/external/auth/login returns a JWT valid ~10 days. We cache
 * it in module memory and refresh on 401 / on first use after restart.
 * Phase 1 single-instance is fine; multi-instance deployments may want to
 * stash the token in Redis.
 *
 * Shape decisions:
 *  - All call sites get a `ShiprocketResult<T>` so a creds-missing or 5xx
 *    failure surfaces structurally. Sprint 5C call sites treat `{ok:false}`
 *    as best-effort: log and continue.
 *  - We never log the full token. Errors quote response body for debugging
 *    but redact the Authorization header on retry.
 */

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000; // refresh proactively before the 10-day mark

export interface ShiprocketCreds {
  email: string;
  password: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

let _token: CachedToken | null = null;

export type ShiprocketResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      reason: 'NO_CREDS' | 'AUTH_FAILED' | 'HTTP_ERROR' | 'NETWORK';
      detail?: string;
    };

function readCreds(): ShiprocketCreds | null {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export function isShiprocketConfigured(): boolean {
  return readCreds() !== null;
}

async function login(creds: ShiprocketCreds): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  const body = (await res.json().catch(() => null)) as { token?: string; message?: string } | null;
  if (!res.ok || !body?.token) {
    throw new Error(`Shiprocket login failed: ${res.status} ${body?.message ?? ''}`.trim());
  }
  return body.token;
}

async function getToken(force = false): Promise<string | null> {
  const creds = readCreds();
  if (!creds) return null;
  if (!force && _token && _token.expiresAt > Date.now()) return _token.token;
  const token = await login(creds);
  _token = { token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return token;
}

interface RequestArgs {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

async function shiprocketFetch<T>(args: RequestArgs): Promise<ShiprocketResult<T>> {
  const creds = readCreds();
  if (!creds) {
    return {
      ok: false,
      status: 503,
      reason: 'NO_CREDS',
      detail: 'SHIPROCKET_EMAIL/PASSWORD unset',
    };
  }

  const url = new URL(`${BASE_URL}${args.path}`);
  if (args.query) {
    for (const [k, v] of Object.entries(args.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const send = async (token: string) => {
    return fetch(url.toString(), {
      method: args.method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: args.body ? JSON.stringify(args.body) : undefined,
    });
  };

  let token: string | null;
  try {
    token = await getToken();
  } catch (e) {
    return { ok: false, status: 502, reason: 'AUTH_FAILED', detail: (e as Error).message };
  }
  if (!token) return { ok: false, status: 503, reason: 'NO_CREDS' };

  let res: Response;
  try {
    res = await send(token);
    if (res.status === 401) {
      // Token may be stale — refresh once.
      try {
        token = await getToken(true);
      } catch (e) {
        return { ok: false, status: 502, reason: 'AUTH_FAILED', detail: (e as Error).message };
      }
      if (!token) return { ok: false, status: 503, reason: 'NO_CREDS' };
      res = await send(token);
    }
  } catch (e) {
    return { ok: false, status: 502, reason: 'NETWORK', detail: (e as Error).message };
  }

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    // Non-JSON body; leave as null.
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      reason: 'HTTP_ERROR',
      detail:
        typeof parsed === 'object' && parsed && 'message' in parsed
          ? String((parsed as { message: unknown }).message)
          : text.slice(0, 200),
    };
  }
  return { ok: true, data: parsed as T };
}

// =============================================================================
// Serviceability
// =============================================================================

export interface ShiprocketCourierOption {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  freight_charge?: number;
  cod_charges?: number;
  etd?: string;
  estimated_delivery_days?: string;
  is_surface?: number;
  cod?: number;
}

export interface ShiprocketServiceabilityResponse {
  status: number;
  data?: {
    available_courier_companies?: ShiprocketCourierOption[];
    recommended_courier_company_id?: number;
  };
}

export async function getServiceability(args: {
  pickupPostcode: string;
  deliveryPostcode: string;
  weightKg: number;
  cod: boolean;
  declaredValue?: number;
}): Promise<ShiprocketResult<ShiprocketServiceabilityResponse>> {
  return shiprocketFetch<ShiprocketServiceabilityResponse>({
    method: 'GET',
    path: '/courier/serviceability/',
    query: {
      pickup_postcode: args.pickupPostcode,
      delivery_postcode: args.deliveryPostcode,
      weight: args.weightKg,
      cod: args.cod ? 1 : 0,
      declared_value: args.declaredValue,
    },
  });
}

// =============================================================================
// Order create (adhoc)
// =============================================================================

export interface ShiprocketAddressInput {
  customerName: string;
  lastName?: string;
  address: string;
  address2?: string;
  city: string;
  pincode: string;
  state: string;
  country: string;
  email: string;
  phone: string;
}

export interface ShiprocketLineItem {
  name: string;
  sku: string;
  units: number;
  sellingPrice: number;
  discount?: number;
  tax?: number;
  hsn?: string;
}

export interface ShiprocketCreateOrderInput {
  orderId: string;
  orderDate: string; // 'YYYY-MM-DD HH:mm' or 'YYYY-MM-DD'
  pickupLocation: string; // configured nickname in Shiprocket panel
  channelId?: number;
  billing: ShiprocketAddressInput;
  shippingIsBilling: boolean;
  shipping?: ShiprocketAddressInput;
  items: ShiprocketLineItem[];
  paymentMethod: 'COD' | 'Prepaid';
  shippingCharges?: number;
  giftwrapCharges?: number;
  transactionCharges?: number;
  totalDiscount?: number;
  subTotal: number;
  // Package dimensions in cm + kg.
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
  weightKg: number;
  customerGstin?: string;
  isInsuranceOpt?: boolean;
}

export interface ShiprocketCreateOrderResponse {
  order_id: number;
  shipment_id: number;
  status?: string;
  status_code?: number;
  awb_code?: string;
  courier_company_id?: number;
  courier_name?: string;
}

function addressToShiprocketBilling(a: ShiprocketAddressInput) {
  return {
    billing_customer_name: a.customerName,
    billing_last_name: a.lastName ?? '',
    billing_address: a.address,
    billing_address_2: a.address2 ?? '',
    billing_city: a.city,
    billing_pincode: a.pincode,
    billing_state: a.state,
    billing_country: a.country,
    billing_email: a.email,
    billing_phone: a.phone,
  };
}

function addressToShiprocketShipping(a: ShiprocketAddressInput) {
  return {
    shipping_customer_name: a.customerName,
    shipping_last_name: a.lastName ?? '',
    shipping_address: a.address,
    shipping_address_2: a.address2 ?? '',
    shipping_city: a.city,
    shipping_pincode: a.pincode,
    shipping_state: a.state,
    shipping_country: a.country,
    shipping_email: a.email,
    shipping_phone: a.phone,
  };
}

export async function createShiprocketOrder(
  input: ShiprocketCreateOrderInput,
): Promise<ShiprocketResult<ShiprocketCreateOrderResponse>> {
  const body: Record<string, unknown> = {
    order_id: input.orderId,
    order_date: input.orderDate,
    pickup_location: input.pickupLocation,
    ...(input.channelId ? { channel_id: input.channelId } : {}),
    ...addressToShiprocketBilling(input.billing),
    shipping_is_billing: input.shippingIsBilling,
    ...(input.shippingIsBilling || !input.shipping
      ? {}
      : addressToShiprocketShipping(input.shipping)),
    order_items: input.items.map((it) => ({
      name: it.name,
      sku: it.sku,
      units: it.units,
      selling_price: it.sellingPrice,
      ...(it.discount !== undefined ? { discount: it.discount } : {}),
      ...(it.tax !== undefined ? { tax: it.tax } : {}),
      ...(it.hsn ? { hsn: it.hsn } : {}),
    })),
    payment_method: input.paymentMethod,
    ...(input.shippingCharges !== undefined ? { shipping_charges: input.shippingCharges } : {}),
    ...(input.giftwrapCharges !== undefined ? { giftwrap_charges: input.giftwrapCharges } : {}),
    ...(input.transactionCharges !== undefined
      ? { transaction_charges: input.transactionCharges }
      : {}),
    ...(input.totalDiscount !== undefined ? { total_discount: input.totalDiscount } : {}),
    sub_total: input.subTotal,
    length: input.lengthCm,
    breadth: input.breadthCm,
    height: input.heightCm,
    weight: input.weightKg,
    ...(input.customerGstin ? { customer_gstin: input.customerGstin } : {}),
    ...(input.isInsuranceOpt ? { is_insurance_opt: true } : {}),
  };
  return shiprocketFetch<ShiprocketCreateOrderResponse>({
    method: 'POST',
    path: '/orders/create/adhoc',
    body,
  });
}

// =============================================================================
// AWB assign + pickup
// =============================================================================

export interface ShiprocketAwbAssignResponse {
  awb_assign_status?: number;
  response?: {
    data?: {
      awb_code?: string;
      courier_company_id?: number;
      courier_name?: string;
      applied_weight?: number;
      shipment_id?: number;
      etd?: string;
      cod?: number;
      assigned_date_time?: string;
      routing_code?: string;
    };
  };
  message?: string;
}

export async function assignAwb(args: {
  shipmentId: number;
  courierId?: number; // omit to let Shiprocket auto-pick the cheapest available
}): Promise<ShiprocketResult<ShiprocketAwbAssignResponse>> {
  return shiprocketFetch<ShiprocketAwbAssignResponse>({
    method: 'POST',
    path: '/courier/assign/awb',
    body: {
      shipment_id: args.shipmentId,
      ...(args.courierId !== undefined ? { courier_id: args.courierId } : {}),
    },
  });
}

export interface ShiprocketPickupResponse {
  pickup_status?: number;
  response?: {
    pickup_scheduled_date?: string;
    pickup_token_number?: string;
    status?: number;
    others?: string;
  };
}

export async function requestShiprocketPickup(args: {
  shipmentIds: number[];
}): Promise<ShiprocketResult<ShiprocketPickupResponse>> {
  return shiprocketFetch<ShiprocketPickupResponse>({
    method: 'POST',
    path: '/courier/generate/pickup',
    body: { shipment_id: args.shipmentIds },
  });
}

// =============================================================================
// Tracking
// =============================================================================

export interface ShiprocketTrackingScan {
  date: string;
  status: string;
  activity: string;
  location: string;
  'sr-status'?: string;
  'sr-status-label'?: string;
}

export interface ShiprocketTrackingResponse {
  tracking_data?: {
    track_status?: number;
    shipment_status?: number;
    shipment_track?: Array<{
      id?: number;
      awb_code?: string;
      courier_company_id?: number;
      shipment_id?: number;
      order_id?: number;
      pickup_date?: string;
      delivered_date?: string;
      current_status?: string;
      etd?: string;
    }>;
    shipment_track_activities?: ShiprocketTrackingScan[];
  };
}

export async function trackByAwb(
  awb: string,
): Promise<ShiprocketResult<ShiprocketTrackingResponse>> {
  return shiprocketFetch<ShiprocketTrackingResponse>({
    method: 'GET',
    path: `/courier/track/awb/${encodeURIComponent(awb)}`,
  });
}

// =============================================================================
// Test-only helpers
// =============================================================================

/** Reset the in-memory token cache. Used by tests. */
export function _resetShiprocketToken(): void {
  _token = null;
}

import 'server-only';
import type { OrderStatus, Prisma, ShipmentStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { sendOrderDeliveredEmail, sendOrderShippedEmail } from '@/lib/services/order-email';
import { decimalToPaise } from '@/lib/services/pricing';
import {
  assignAwb,
  createShiprocketOrder,
  isShiprocketConfigured,
  requestShiprocketPickup,
  type ShiprocketAddressInput,
  type ShiprocketCreateOrderInput,
} from '@/lib/shiprocket';

/**
 * Shipping service — orchestrates Shiprocket calls + the local Shipment row.
 *
 * The high-level flow:
 *   adminTransition(CONFIRMED → PROCESSING)
 *     → createShipmentForOrder(orderId)        [this file]
 *         → Shiprocket create-order            [lib/shiprocket]
 *         → Shiprocket assign-AWB              [lib/shiprocket]
 *         → Shiprocket request-pickup          [lib/shiprocket]
 *         → INSERT local Shipment row          [this file]
 *
 *   webhook /api/webhooks/shiprocket
 *     → applyTrackingUpdate({awb, status, ...})  [this file]
 *         → UPDATE Shipment status / shippedAt / deliveredAt
 *         → forward Order.status when the courier moves us forward
 *         → fire shipped / delivered emails on the actual flip
 *
 * Every external call is best-effort: a Shiprocket outage or missing creds
 * never breaks the order lifecycle. The admin can manually retry later.
 */

const PICKUP_LOCATION = process.env.SHIPROCKET_PICKUP_LOCATION ?? 'Primary';

// Phase-1 default package dimensions when variant data is absent. Reasonable
// fit for typical electronics in our seed catalogue. Per-product dimensions
// are a Sprint-5C-polish item tracked in PENDING.md.
const DEFAULT_LENGTH_CM = 30;
const DEFAULT_BREADTH_CM = 30;
const DEFAULT_HEIGHT_CM = 10;
const DEFAULT_WEIGHT_G = 500;

export type ShipmentCreateOutcome =
  | { status: 'created'; shipmentId: string; awb: string | null; carrier: string }
  | { status: 'no_creds' }
  | { status: 'already_exists'; shipmentId: string }
  | { status: 'failed'; reason: string };

export async function createShipmentForOrder(orderId: string): Promise<ShipmentCreateOutcome> {
  if (!isShiprocketConfigured()) {
    console.warn('[shipping] Shiprocket creds unset — skipping shipment creation for', orderId);
    return { status: 'no_creds' };
  }

  // Don't double-create: every order has at most one shipment in Phase 1
  // (multi-package shipments are Phase 2).
  const existing = await prisma.shipment.findFirst({ where: { orderId } });
  if (existing) {
    return { status: 'already_exists', shipmentId: existing.id };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: { select: { sku: true, weightGrams: true } },
        },
      },
      addresses: true,
      payments: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!order) {
    return { status: 'failed', reason: 'order_not_found' };
  }
  const ship = order.addresses.find((a) => a.type === 'SHIPPING');
  const bill = order.addresses.find((a) => a.type === 'BILLING') ?? ship;
  if (!ship || !bill) {
    return { status: 'failed', reason: 'missing_addresses' };
  }

  const totalWeightG = order.items.reduce((sum, it) => {
    const w = it.variant.weightGrams ?? DEFAULT_WEIGHT_G;
    return sum + w * it.quantity;
  }, 0);
  const weightKg = Math.max(0.5, totalWeightG / 1000);

  const isCod = order.payments[0]?.gateway === 'COD';
  const subTotalRupees = decimalToPaise(order.subtotal) / 100;
  const shippingChargesRupees = decimalToPaise(order.shippingTotal) / 100;
  const totalDiscountRupees = decimalToPaise(order.discountTotal) / 100;

  const billingForSr: ShiprocketAddressInput = {
    customerName: bill.fullName,
    address: bill.line1,
    address2: bill.line2 ?? undefined,
    city: bill.city,
    pincode: bill.pincode,
    state: bill.state,
    country: bill.country,
    email: order.email,
    phone: bill.phone,
  };
  const shippingForSr: ShiprocketAddressInput = {
    customerName: ship.fullName,
    address: ship.line1,
    address2: ship.line2 ?? undefined,
    city: ship.city,
    pincode: ship.pincode,
    state: ship.state,
    country: ship.country,
    email: order.email,
    phone: ship.phone,
  };

  const shippingIsBilling =
    bill.line1 === ship.line1 && bill.pincode === ship.pincode && bill.fullName === ship.fullName;

  const createInput: ShiprocketCreateOrderInput = {
    orderId: order.orderNumber,
    orderDate: order.placedAt.toISOString().slice(0, 19).replace('T', ' '),
    pickupLocation: PICKUP_LOCATION,
    billing: billingForSr,
    shippingIsBilling,
    shipping: shippingIsBilling ? undefined : shippingForSr,
    items: order.items.map((it) => {
      const snap = (it.productSnapshot ?? {}) as { name?: string; hsn?: string };
      return {
        name: snap.name ?? it.variant.sku,
        sku: it.variant.sku,
        units: it.quantity,
        sellingPrice: decimalToPaise(it.unitPrice) / 100,
        ...(snap.hsn ? { hsn: snap.hsn } : {}),
      };
    }),
    paymentMethod: isCod ? 'COD' : 'Prepaid',
    shippingCharges: shippingChargesRupees,
    totalDiscount: totalDiscountRupees,
    subTotal: subTotalRupees,
    lengthCm: DEFAULT_LENGTH_CM,
    breadthCm: DEFAULT_BREADTH_CM,
    heightCm: DEFAULT_HEIGHT_CM,
    weightKg,
    customerGstin: order.gstin ?? undefined,
  };

  const createRes = await createShiprocketOrder(createInput);
  if (!createRes.ok) {
    console.warn('[shipping] Shiprocket order create failed:', createRes.reason, createRes.detail);
    return { status: 'failed', reason: `create_order_${createRes.reason}` };
  }
  const shiprocketShipmentId = createRes.data.shipment_id;
  if (!shiprocketShipmentId) {
    return { status: 'failed', reason: 'create_order_no_shipment_id' };
  }

  // Assign AWB. If create-order already returned an awb_code (some channel
  // configurations), prefer it; otherwise call assign/awb explicitly.
  let awb: string | null = createRes.data.awb_code ?? null;
  let courier: string = createRes.data.courier_name ?? 'Shiprocket';
  let etdIso: string | null = null;
  let appliedWeightG: number | null = null;

  if (!awb) {
    const awbRes = await assignAwb({ shipmentId: shiprocketShipmentId });
    if (!awbRes.ok) {
      console.warn('[shipping] Shiprocket AWB assign failed:', awbRes.reason, awbRes.detail);
      // Persist a Shipment row anyway so the admin sees the partial state and
      // can retry assignment from /admin/orders/[id]. AWB stays null.
    } else {
      const data = awbRes.data.response?.data ?? {};
      awb = data.awb_code ?? null;
      courier = data.courier_name ?? courier;
      etdIso = data.etd ?? null;
      appliedWeightG =
        typeof data.applied_weight === 'number' ? Math.round(data.applied_weight * 1000) : null;
    }
  }

  // Request pickup right after AWB assignment so the courier knows to come.
  // Non-fatal if it fails — admin can re-trigger via /admin once Sprint 5C
  // polish lands the manual pickup button.
  if (awb) {
    const pickupRes = await requestShiprocketPickup({ shipmentIds: [shiprocketShipmentId] });
    if (!pickupRes.ok) {
      console.warn(
        '[shipping] Shiprocket pickup request failed:',
        pickupRes.reason,
        pickupRes.detail,
      );
    }
  }

  const trackingUrl = awb ? `https://shiprocket.co/tracking/${encodeURIComponent(awb)}` : null;

  const estimatedDate = parseEtd(etdIso);

  const shipment = await prisma.shipment.create({
    data: {
      orderId,
      carrier: courier,
      awb,
      trackingUrl,
      status: 'CREATED',
      estimatedDate,
      weightGrams: appliedWeightG ?? totalWeightG,
      packageCount: 1,
      raw: {
        shiprocket: {
          create: createRes.data as unknown as Prisma.InputJsonValue,
          shipmentId: shiprocketShipmentId,
        },
      } as Prisma.InputJsonValue,
    },
  });

  return { status: 'created', shipmentId: shipment.id, awb, carrier: courier };
}

// =============================================================================
// Webhook tracking update
// =============================================================================

const SHIPMENT_FORWARD_RANK: Record<ShipmentStatus, number> = {
  CREATED: 0,
  PICKED_UP: 1,
  IN_TRANSIT: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
  RETURN_INITIATED: 5,
  RETURN_PICKED_UP: 6,
  RETURNED_TO_ORIGIN: 7,
  EXCEPTION: 8,
};

const ORDER_FORWARD_RANK: Record<OrderStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  CANCELLED: 100,
  RETURN_REQUESTED: 6,
  RETURN_PICKED_UP: 7,
  REFUNDED: 8,
};

/**
 * Map a Shiprocket "current_status" / "shipment_status" string to our local
 * enums. The strings come straight from the carrier — Shiprocket normalises
 * them before delivering the webhook.
 */
function mapShiprocketStatus(srStatus: string): {
  shipment: ShipmentStatus;
  order: OrderStatus | null;
} | null {
  const s = srStatus.trim().toLowerCase();
  if (s.includes('delivered') && !s.includes('rto')) {
    return { shipment: 'DELIVERED', order: 'DELIVERED' };
  }
  if (s.includes('out for delivery') || s.includes('out_for_delivery')) {
    return { shipment: 'OUT_FOR_DELIVERY', order: 'OUT_FOR_DELIVERY' };
  }
  if (s.includes('rto') && s.includes('delivered')) {
    return { shipment: 'RETURNED_TO_ORIGIN', order: null };
  }
  if (s.includes('rto') || s.includes('return')) {
    return { shipment: 'RETURN_INITIATED', order: null };
  }
  if (
    s.includes('in transit') ||
    s.includes('in_transit') ||
    s.includes('picked up') ||
    s.includes('shipped') ||
    s.includes('manifested') ||
    s.includes('pickup')
  ) {
    return { shipment: s.includes('picked up') ? 'PICKED_UP' : 'IN_TRANSIT', order: 'SHIPPED' };
  }
  if (s.includes('exception') || s.includes('undelivered') || s.includes('failed')) {
    return { shipment: 'EXCEPTION', order: null };
  }
  return null;
}

export interface TrackingUpdateInput {
  awb: string;
  shiprocketShipmentId?: number | null;
  currentStatus: string;
  currentStatusId?: number;
  etd?: string | null;
  awbAssignedDate?: string | null;
  pickupScheduledDate?: string | null;
  raw?: unknown;
}

export type TrackingUpdateOutcome =
  | { status: 'no_match' }
  | {
      status: 'updated';
      orderTransitioned: boolean;
      previousOrderStatus: OrderStatus;
      nextOrderStatus: OrderStatus;
    }
  | { status: 'noop'; reason: string };

export async function applyTrackingUpdate(
  input: TrackingUpdateInput,
): Promise<TrackingUpdateOutcome> {
  const mapped = mapShiprocketStatus(input.currentStatus);
  if (!mapped) {
    return { status: 'noop', reason: `unrecognised_status:${input.currentStatus}` };
  }

  const shipment = await prisma.shipment.findFirst({
    where: { awb: input.awb },
    include: { order: true },
  });
  if (!shipment) return { status: 'no_match' };

  const currentRank = SHIPMENT_FORWARD_RANK[shipment.status];
  const nextRank = SHIPMENT_FORWARD_RANK[mapped.shipment];

  // Idempotent: if the carrier event would move us backwards or to the same
  // state, just refresh metadata fields and return.
  if (nextRank <= currentRank && shipment.status !== 'CREATED') {
    return { status: 'noop', reason: 'already_at_or_past' };
  }

  const newEstimatedDate = parseEtd(input.etd ?? null) ?? shipment.estimatedDate;
  const shippedAt =
    !shipment.shippedAt && (mapped.shipment === 'PICKED_UP' || mapped.shipment === 'IN_TRANSIT')
      ? new Date()
      : shipment.shippedAt;
  const deliveredAt =
    !shipment.deliveredAt && mapped.shipment === 'DELIVERED' ? new Date() : shipment.deliveredAt;

  let orderTransitioned = false;
  const previousOrderStatus = shipment.order.status;
  let nextOrderStatus: OrderStatus = previousOrderStatus;

  if (mapped.order && ORDER_FORWARD_RANK[mapped.order] > ORDER_FORWARD_RANK[previousOrderStatus]) {
    nextOrderStatus = mapped.order;
    orderTransitioned = true;
  }

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: mapped.shipment,
        estimatedDate: newEstimatedDate,
        shippedAt,
        deliveredAt,
        raw: (input.raw ?? null) as Prisma.InputJsonValue,
      },
    });
    if (orderTransitioned) {
      await tx.order.update({
        where: { id: shipment.orderId },
        data: { status: nextOrderStatus },
      });
      await tx.orderEvent.create({
        data: {
          orderId: shipment.orderId,
          status: nextOrderStatus,
          note: `Shiprocket: ${input.currentStatus}`,
        },
      });
    }
  });

  // Fire customer emails after the TX commits — same best-effort pattern as
  // adminTransition. We only fire on the actual transition, not on every
  // webhook delivery.
  if (orderTransitioned) {
    if (nextOrderStatus === 'SHIPPED') {
      await sendOrderShippedEmail(shipment.order.orderNumber);
    } else if (nextOrderStatus === 'DELIVERED') {
      await sendOrderDeliveredEmail(shipment.order.orderNumber);
    }
  }

  return {
    status: 'updated',
    orderTransitioned,
    previousOrderStatus,
    nextOrderStatus,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function parseEtd(etd: string | null): Date | null {
  if (!etd) return null;
  // Shiprocket ETD is sometimes 'YYYY-MM-DD HH:mm:ss' (ambiguous TZ) — we treat
  // it as UTC for storage and let the UI render in the user's locale.
  const normalised = etd.includes('T') ? etd : `${etd.replace(' ', 'T')}Z`;
  const d = new Date(normalised);
  return Number.isNaN(d.getTime()) ? null : d;
}

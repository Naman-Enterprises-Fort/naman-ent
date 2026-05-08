import 'server-only';
import type {
  AddressType,
  FulfillmentChannel,
  Order,
  OrderEvent,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentGateway,
  PaymentMethod as PaymentMethodEnum,
  PaymentStatus,
  Prisma,
  Shipment,
} from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { prisma } from '@/lib/db';
import { clearCart } from '@/lib/services/cart';
import {
  COD_CONVENIENCE_FEE_PAISE,
  computeCartTotals,
  type PaymentMethodKey,
  paiseToDecimal,
  type ShippingMethod,
} from '@/lib/services/pricing';
import type { CheckoutInlineAddress, CreateCheckoutSessionInput } from '@/lib/validators/checkout';

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

export class OrderError extends Error {
  constructor(
    public readonly code:
      | 'EMPTY_CART'
      | 'OUT_OF_STOCK'
      | 'STOCK_CONFLICT'
      | 'ADDRESS_NOT_FOUND'
      | 'NOT_FOUND'
      | 'NOT_CANCELLABLE'
      | 'AMOUNT_MISMATCH'
      | 'INVALID_TRANSITION',
    message: string,
    public readonly meta: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

// -----------------------------------------------------------------------------
// Order number minting — `NMN20260508-ABC123`
// -----------------------------------------------------------------------------

const ORDER_NUM_RAND = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

function mintOrderNumber(now = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `NMN${yyyy}${mm}${dd}-${ORDER_NUM_RAND()}`;
}

// -----------------------------------------------------------------------------
// Address resolution (saved id → snapshot, or use the inline address as-is)
// -----------------------------------------------------------------------------

interface ResolvedAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

async function resolveAddress(
  tx: Prisma.TransactionClient,
  userId: string | null,
  ref: { id?: string; inline?: CheckoutInlineAddress | undefined },
): Promise<ResolvedAddress> {
  if (ref.id) {
    if (!userId) throw new OrderError('ADDRESS_NOT_FOUND', 'Saved address requires sign-in');
    const addr = await tx.address.findFirst({ where: { id: ref.id, userId } });
    if (!addr) throw new OrderError('ADDRESS_NOT_FOUND', 'Address not found');
    return {
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      country: addr.country,
    };
  }
  if (!ref.inline) throw new OrderError('ADDRESS_NOT_FOUND', 'Address required');
  return {
    fullName: ref.inline.fullName,
    phone: ref.inline.phone.replace(/^\+91/, ''),
    line1: ref.inline.line1,
    line2: ref.inline.line2 ?? null,
    city: ref.inline.city,
    state: ref.inline.state,
    pincode: ref.inline.pincode,
    country: ref.inline.country,
  };
}

// -----------------------------------------------------------------------------
// Place order — synchronous local transaction, no external calls
// -----------------------------------------------------------------------------

export interface PlaceOrderInput {
  userId: string | null;
  cartSessionId: string;
  data: CreateCheckoutSessionInput;
}

export interface PlacedOrder {
  orderNumber: string;
  orderId: string;
  paymentId: string;
  totalPaise: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodEnum;
  destinationState: string;
}

const PAYMENT_METHOD_TO_GATEWAY: Record<PaymentMethodKey, PaymentGateway> = {
  UPI: 'RAZORPAY',
  CARD: 'RAZORPAY',
  NETBANKING: 'RAZORPAY',
  WALLET: 'RAZORPAY',
  EMI: 'RAZORPAY',
  PAY_LATER: 'RAZORPAY',
  COD: 'COD',
};

/**
 * Phase-1 placement contract:
 *  - Server-side pricing recompute against fresh `variant.price` (CLAUDE.md §3.12).
 *  - Stock decrement uses optimistic-lock UPDATE: `WHERE id = ? AND version = ?`,
 *    bumping `version` so a concurrent cart-add can't rugpull the inventory.
 *  - Cart is cleared inside the TX for COD (terminal); online clears it on
 *    `/api/orders/verify` so a closed Razorpay modal doesn't strand the cart.
 */
export async function placeOrderForCheckout(input: PlaceOrderInput): Promise<PlacedOrder> {
  const { userId, cartSessionId, data } = input;
  const isCod = data.paymentMethod === 'COD';
  const gateway = PAYMENT_METHOD_TO_GATEWAY[data.paymentMethod];
  const channel: FulfillmentChannel = 'WEB';

  return prisma.$transaction(async (tx) => {
    // 1. Load the cart + items + variants with the freshest price/stock/version.
    const cart = await tx.cart.findFirst({
      where: userId ? { userId } : { sessionId: cartSessionId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    if (!cart) throw new OrderError('EMPTY_CART', 'Your cart is empty');

    const items = await tx.cartItem.findMany({
      where: { cartId: cart.id, savedForLater: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        variantId: true,
        quantity: true,
        variant: {
          select: {
            id: true,
            sku: true,
            name: true,
            attributes: true,
            mrp: true,
            price: true,
            gstRate: true,
            stock: true,
            version: true,
            backorderAllowed: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                hsnCode: true,
                status: true,
                deletedAt: true,
                brand: { select: { name: true, slug: true } },
                images: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { url: true, alt: true },
                },
              },
            },
          },
        },
      },
    });

    if (items.length === 0) throw new OrderError('EMPTY_CART', 'Your cart is empty');

    // 2. Validate every line is purchasable + has stock.
    for (const it of items) {
      const v = it.variant;
      if (v.product.status !== 'ACTIVE' || v.product.deletedAt) {
        throw new OrderError('STOCK_CONFLICT', `${v.product.name} is no longer available`, {
          variantId: v.id,
        });
      }
      if (!v.backorderAllowed && v.stock < it.quantity) {
        throw new OrderError('OUT_OF_STOCK', `Not enough stock for ${v.product.name}`, {
          variantId: v.id,
          available: v.stock,
          requested: it.quantity,
        });
      }
    }

    // 3. Resolve addresses (saved id → snapshot, or use the inline address).
    const shipping = await resolveAddress(tx, userId, {
      id: data.shippingAddressId,
      inline: data.shippingAddress,
    });
    const billing = data.billingSameAsShipping
      ? shipping
      : await resolveAddress(tx, userId, {
          id: data.billingAddressId,
          inline: data.billingAddress,
        });

    // 4. Server-side pricing recompute against fresh variant prices.
    const pricedItems = items.map((it) => ({
      variantId: it.variantId,
      quantity: it.quantity,
      unitPricePaise: Math.round(Number(it.variant.price.toString()) * 100),
      unitMrpPaise: Math.round(Number(it.variant.mrp.toString()) * 100),
      gstRate: Number(it.variant.gstRate.toString()),
    }));
    const { lines, totals } = computeCartTotals(pricedItems, {
      destinationState: shipping.state,
      shippingMethod: data.shippingMethod as ShippingMethod,
      paymentMethod: data.paymentMethod,
    });
    const linesByVariant = new Map(lines.map((l) => [l.variantId, l]));

    // 5. Decrement stock with optimistic-lock UPDATE (per Sprint 3 decision).
    //    The variant `version` is bumped so a concurrent cart-add can't rugpull
    //    the inventory between this UPDATE and the order create. Sprint 5 will
    //    layer in a `StockMovement` audit row once warehouses are provisioned.
    for (const it of items) {
      if (it.variant.backorderAllowed) continue;
      const result = await tx.productVariant.updateMany({
        where: {
          id: it.variant.id,
          version: it.variant.version,
          stock: { gte: it.quantity },
        },
        data: {
          stock: { decrement: it.quantity },
          version: { increment: 1 },
        },
      });
      if (result.count === 0) {
        throw new OrderError(
          'STOCK_CONFLICT',
          `Stock for ${it.variant.product.name} changed — refresh and try again`,
          { variantId: it.variant.id },
        );
      }
    }

    // 6. Create the Order + OrderItems + OrderAddresses + initial events.
    const orderNumber = mintOrderNumber();
    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: userId ?? null,
        email: data.contactEmail,
        phone: data.contactPhone.replace(/^\+91/, ''),
        status: isCod ? 'CONFIRMED' : 'PENDING',
        paymentStatus: 'PENDING',
        channel,
        subtotal: paiseToDecimal(totals.subtotalPaise),
        taxTotal: paiseToDecimal(totals.taxPaise),
        shippingTotal: paiseToDecimal(totals.shippingPaise),
        discountTotal: paiseToDecimal(totals.discountPaise),
        codFee: paiseToDecimal(totals.codFeePaise),
        total: paiseToDecimal(totals.totalPaise),
        currency: 'INR',
        notes: data.notes ?? null,
        giftMessage: data.giftMessage ?? null,
        giftWrap: data.giftWrap,
        isGstInvoice: data.gstInvoice,
        gstin: data.gstInvoice ? data.gstin : null,
      },
    });

    await tx.orderItem.createMany({
      data: items.map((it) => {
        const priced = linesByVariant.get(it.variantId);
        if (!priced) throw new OrderError('STOCK_CONFLICT', 'Pricing drift — please retry');
        const v = it.variant;
        return {
          orderId: order.id,
          variantId: v.id,
          quantity: it.quantity,
          unitPrice: paiseToDecimal(priced.unitPricePaise),
          taxAmount: paiseToDecimal(priced.lineTaxPaise),
          discountAmount: paiseToDecimal(0),
          lineTotal: paiseToDecimal(priced.lineTotalPaise),
          productSnapshot: {
            productId: v.product.id,
            name: v.product.name,
            slug: v.product.slug,
            sku: v.sku,
            variantName: v.name,
            attributes: v.attributes ?? {},
            hsn: v.product.hsnCode ?? null,
            gstRate: priced.gstRate,
            brand: v.product.brand
              ? { name: v.product.brand.name, slug: v.product.brand.slug }
              : null,
            image: v.product.images[0]?.url ?? null,
            imageAlt: v.product.images[0]?.alt ?? null,
            mrpPaise: priced.unitMrpPaise,
          } as Prisma.InputJsonValue,
        };
      }),
    });

    const addressRows: Array<Omit<Prisma.OrderAddressUncheckedCreateInput, 'orderId'>> = [
      { type: 'SHIPPING' as AddressType, ...shipping },
    ];
    if (!data.billingSameAsShipping) {
      addressRows.push({ type: 'BILLING' as AddressType, ...billing });
    } else {
      addressRows.push({ type: 'BILLING' as AddressType, ...shipping });
    }
    await tx.orderAddress.createMany({
      data: addressRows.map((r) => ({ ...r, orderId: order.id })),
    });

    // 7. Initial OrderEvent rows — `PENDING` always, plus `CONFIRMED` for COD.
    const events: Prisma.OrderEventCreateManyInput[] = [
      { orderId: order.id, status: 'PENDING', note: 'Order placed' },
    ];
    if (isCod) {
      events.push({ orderId: order.id, status: 'CONFIRMED', note: 'Cash on Delivery confirmed' });
    }
    await tx.orderEvent.createMany({ data: events });

    // 8. Initial Payment row.
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        gateway,
        method: data.paymentMethod as PaymentMethodEnum,
        amount: paiseToDecimal(totals.totalPaise),
        currency: 'INR',
        status: 'PENDING',
      },
    });

    // 9. COD is terminal at placement — clear the cart now.
    if (isCod) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
    }

    return {
      orderNumber,
      orderId: order.id,
      paymentId: payment.id,
      totalPaise: totals.totalPaise,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: data.paymentMethod as PaymentMethodEnum,
      destinationState: shipping.state,
    };
  });
}

// -----------------------------------------------------------------------------
// Attach Razorpay order id to a freshly-placed online payment
// -----------------------------------------------------------------------------

export async function attachRazorpayOrderId(params: {
  paymentId: string;
  gatewayOrderId: string;
}): Promise<void> {
  await prisma.payment.update({
    where: { id: params.paymentId },
    data: { gatewayOrderId: params.gatewayOrderId },
  });
}

// -----------------------------------------------------------------------------
// Confirm online payment after Razorpay verify (idempotent)
// -----------------------------------------------------------------------------

export interface ConfirmOnlinePaymentInput {
  orderNumber: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  expectedAmountPaise?: number;
}

export interface ConfirmOnlinePaymentResult {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  alreadyConfirmed: boolean;
}

export async function confirmOnlinePayment(
  input: ConfirmOnlinePaymentInput,
): Promise<ConfirmOnlinePaymentResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { orderNumber: input.orderNumber },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!order) throw new OrderError('NOT_FOUND', 'Order not found');

    // Already confirmed (webhook beat us, or duplicate verify call)
    if (order.paymentStatus === 'CAPTURED' && order.status !== 'PENDING') {
      return {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        alreadyConfirmed: true,
      };
    }

    // Server-side amount recheck (SRS §12.2).
    if (input.expectedAmountPaise !== undefined) {
      const orderTotalPaise = Math.round(Number(order.total.toString()) * 100);
      if (orderTotalPaise !== input.expectedAmountPaise) {
        throw new OrderError('AMOUNT_MISMATCH', 'Order total does not match payment amount');
      }
    }

    const payment = order.payments[0];
    if (!payment) throw new OrderError('NOT_FOUND', 'Payment record missing');

    // Upsert the payment row keyed by gateway_payment_id (the unique constraint
    // is what makes the call idempotent).
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        gatewayOrderId: input.razorpayOrderId,
        gatewayPaymentId: input.razorpayPaymentId,
        gatewaySignature: input.razorpaySignature,
        status: 'CAPTURED',
        capturedAt: new Date(),
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CONFIRMED', paymentStatus: 'CAPTURED' },
    });
    await tx.orderEvent.create({
      data: { orderId: order.id, status: 'CONFIRMED', note: 'Payment captured' },
    });

    return {
      orderNumber: order.orderNumber,
      status: 'CONFIRMED',
      paymentStatus: 'CAPTURED',
      alreadyConfirmed: false,
    };
  });
}

// -----------------------------------------------------------------------------
// Cart cleanup after a successful online payment
// -----------------------------------------------------------------------------

export async function clearCartAfterCheckout(
  userId: string | null,
  sessionId: string,
): Promise<void> {
  try {
    await clearCart({ userId, sessionId });
  } catch {
    // Cart may already be empty; never block confirmation on cart cleanup.
  }
}

// -----------------------------------------------------------------------------
// Cancellation (customer or admin)
// -----------------------------------------------------------------------------

const CANCELLABLE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING'];

export async function cancelOrder(params: {
  orderId: string;
  actorUserId: string | null;
  reason?: string;
  byAdmin?: boolean;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: params.orderId },
      include: { items: { select: { variantId: true, quantity: true } } },
    });
    if (!order) throw new OrderError('NOT_FOUND', 'Order not found');
    if (!params.byAdmin && order.userId !== params.actorUserId) {
      throw new OrderError('NOT_FOUND', 'Order not found');
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new OrderError('NOT_CANCELLABLE', `Order can no longer be cancelled (${order.status})`);
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        cancelReason: params.reason ?? null,
        cancelledAt: new Date(),
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: 'CANCELLED',
        note: params.reason ?? null,
        createdBy: params.actorUserId ?? null,
      },
    });

    // Restore stock for the items in this order. Backorder items had no
    // decrement to begin with, but `increment` is harmless on them — the
    // count goes higher and the next order-place flow re-reads it.
    for (const it of order.items) {
      await tx.productVariant.update({
        where: { id: it.variantId },
        data: { stock: { increment: it.quantity }, version: { increment: 1 } },
      });
    }
  });
}

// -----------------------------------------------------------------------------
// Admin status transitions (CONFIRMED → PROCESSING → SHIPPED → ...)
// -----------------------------------------------------------------------------

const ADMIN_NEXT_BY_STATUS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  CANCELLED: [],
  RETURN_REQUESTED: ['RETURN_PICKED_UP'],
  RETURN_PICKED_UP: ['REFUNDED'],
  REFUNDED: [],
};

export function nextAdminStatuses(current: OrderStatus): OrderStatus[] {
  return ADMIN_NEXT_BY_STATUS[current] ?? [];
}

export async function adminTransition(params: {
  orderId: string;
  next: OrderStatus;
  note?: string;
  actorUserId: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: params.orderId } });
    if (!order) throw new OrderError('NOT_FOUND', 'Order not found');
    const allowed = nextAdminStatuses(order.status);
    if (!allowed.includes(params.next)) {
      throw new OrderError(
        'INVALID_TRANSITION',
        `Cannot transition ${order.status} → ${params.next}`,
      );
    }
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: params.next,
        ...(params.next === 'CANCELLED'
          ? { cancelReason: params.note ?? 'Cancelled by admin', cancelledAt: new Date() }
          : {}),
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: params.next,
        note: params.note ?? null,
        createdBy: params.actorUserId,
      },
    });
  });
}

// -----------------------------------------------------------------------------
// Reads — list + detail
// -----------------------------------------------------------------------------

export type OrderForList = Pick<
  Order,
  'id' | 'orderNumber' | 'status' | 'paymentStatus' | 'total' | 'placedAt' | 'currency'
> & {
  items: Array<Pick<OrderItem, 'id' | 'quantity' | 'productSnapshot'>>;
};

export async function listOrders(params: {
  userId: string;
  page: number;
  perPage: number;
  status?: OrderStatus;
}): Promise<{ orders: OrderForList[]; total: number }> {
  const where: Prisma.OrderWhereInput = {
    userId: params.userId,
    deletedAt: null,
    ...(params.status ? { status: params.status } : {}),
  };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: 'desc' },
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        placedAt: true,
        currency: true,
        items: {
          select: { id: true, quantity: true, productSnapshot: true },
          take: 4,
        },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return { orders, total };
}

export type OrderDetail = Order & {
  items: OrderItem[];
  addresses: Array<{
    type: AddressType;
    fullName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }>;
  events: OrderEvent[];
  payments: Payment[];
  shipments: Shipment[];
};

export async function getOrderForUser(params: {
  userId: string;
  orderNumber: string;
}): Promise<OrderDetail | null> {
  return prisma.order.findFirst({
    where: { orderNumber: params.orderNumber, userId: params.userId, deletedAt: null },
    include: {
      items: true,
      addresses: true,
      events: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { createdAt: 'asc' } },
      shipments: { orderBy: { createdAt: 'asc' } },
    },
  }) as Promise<OrderDetail | null>;
}

export async function getOrderForAdmin(orderId: string): Promise<OrderDetail | null> {
  return prisma.order.findFirst({
    where: { id: orderId, deletedAt: null },
    include: {
      items: true,
      addresses: true,
      events: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { createdAt: 'asc' } },
      shipments: { orderBy: { createdAt: 'asc' } },
    },
  }) as Promise<OrderDetail | null>;
}

export async function listOrdersForAdmin(params: {
  page: number;
  perPage: number;
  status?: OrderStatus;
}): Promise<{ orders: Array<OrderForList & { email: string }>; total: number }> {
  const where: Prisma.OrderWhereInput = {
    deletedAt: null,
    ...(params.status ? { status: params.status } : {}),
  };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { placedAt: 'desc' },
      skip: (params.page - 1) * params.perPage,
      take: params.perPage,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        placedAt: true,
        currency: true,
        email: true,
        items: { select: { id: true, quantity: true, productSnapshot: true }, take: 4 },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return { orders, total };
}

// Re-export the COD constant for callers (PDP, cart drawer) that need it.
export { COD_CONVENIENCE_FEE_PAISE };

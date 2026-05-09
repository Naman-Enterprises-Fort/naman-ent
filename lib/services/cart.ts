import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  type CartTotals,
  computeCartTotals,
  decimalToPaise,
  type PricedLine,
  paiseToDecimal,
} from '@/lib/services/pricing';

// -----------------------------------------------------------------------------
// Cart identity — guest (sessionId cookie) or logged-in (userId).
// -----------------------------------------------------------------------------

export interface CartOwner {
  userId: string | null;
  /** null = anonymous visitor with no cart cookie yet (Next 16: layouts can't mint). */
  sessionId: string | null;
}

/** Find the active cart for this owner, or create an empty one. */
export async function getOrCreateCart(owner: CartOwner) {
  if (owner.userId) {
    const userCart = await prisma.cart.findFirst({
      where: { userId: owner.userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (userCart) return userCart;
    return prisma.cart.create({
      data: { userId: owner.userId, sessionId: owner.sessionId ?? null },
    });
  }
  if (!owner.sessionId) {
    // Anonymous visitor with no cookie yet — `getCartView` short-circuits
    // before reaching here. Mutation routes use `getOrCreateCartOwner` which
    // mints the cookie before invoking us, so reaching this point means a
    // bug at the call site.
    throw new Error('getOrCreateCart called with no userId and no sessionId');
  }
  const sessionCart = await prisma.cart.findUnique({ where: { sessionId: owner.sessionId } });
  if (sessionCart) return sessionCart;
  return prisma.cart.create({ data: { sessionId: owner.sessionId } });
}

// -----------------------------------------------------------------------------
// Cart view — priced & projected for the wire (paise).
// -----------------------------------------------------------------------------

const cartItemSelect = {
  id: true,
  cartId: true,
  variantId: true,
  quantity: true,
  priceSnapshot: true,
  savedForLater: true,
  createdAt: true,
  updatedAt: true,
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
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          hsnCode: true,
          brand: { select: { name: true } },
          images: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, alt: true },
          },
        },
      },
    },
  },
} satisfies Prisma.CartItemSelect;

type RawCartItem = Prisma.CartItemGetPayload<{ select: typeof cartItemSelect }>;

export interface CartLineView {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  brandName: string | null;
  variantName: string | null;
  variantSku: string;
  variantAttributes: Record<string, unknown>;
  imageUrl: string | null;
  imageAlt: string | null;
  quantity: number;
  unitPricePaise: number;
  unitMrpPaise: number;
  gstRate: number;
  stock: number;
  inStock: boolean;
  savedForLater: boolean;
  pricing: PricedLine;
}

export interface CartView {
  cartId: string;
  isGuest: boolean;
  itemCount: number;
  active: CartLineView[];
  saved: CartLineView[];
  totals: CartTotals;
}

function toLineView(item: RawCartItem): CartLineView {
  const v = item.variant;
  const p = v.product;
  const image = p.images[0];
  const unitPricePaise = decimalToPaise(v.price);
  const unitMrpPaise = decimalToPaise(v.mrp);
  const gstRate = Number(v.gstRate.toString());
  // Stub pricing — overwritten by `computeCartTotals` for active lines below;
  // saved-for-later lines keep this stub since they don't roll into totals.
  const pricing: PricedLine = {
    variantId: v.id,
    quantity: item.quantity,
    unitPricePaise,
    unitMrpPaise,
    gstRate,
    lineTotalPaise: unitPricePaise * item.quantity,
    lineSubtotalPaise: unitPricePaise * item.quantity,
    lineTaxPaise: 0,
    lineMrpDeltaPaise: Math.max(0, (unitMrpPaise - unitPricePaise) * item.quantity),
  };
  return {
    id: item.id,
    variantId: v.id,
    productId: p.id,
    productName: p.name,
    productSlug: p.slug,
    brandName: p.brand?.name ?? null,
    variantName: v.name,
    variantSku: v.sku,
    variantAttributes: (v.attributes as Record<string, unknown>) ?? {},
    imageUrl: image?.url ?? null,
    imageAlt: image?.alt ?? null,
    quantity: item.quantity,
    unitPricePaise,
    unitMrpPaise,
    gstRate,
    stock: v.stock,
    inStock: v.stock >= item.quantity,
    savedForLater: item.savedForLater,
    pricing,
  };
}

export async function getCartView(owner: CartOwner): Promise<CartView> {
  // Anonymous visitor with no cookie yet — return synthetic empty cart so
  // public pages (Home, PDP, PLP) can render their mini-cart preview without
  // forcing a DB write or a cookie mint (Next 16 forbids the latter from RSC).
  if (!owner.userId && !owner.sessionId) {
    const { totals } = computeCartTotals([]);
    return {
      cartId: '',
      isGuest: true,
      itemCount: 0,
      active: [],
      saved: [],
      totals,
    };
  }

  const cart = await getOrCreateCart(owner);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: 'asc' },
    select: cartItemSelect,
  });

  const active = items.filter((i) => !i.savedForLater).map(toLineView);
  const saved = items.filter((i) => i.savedForLater).map(toLineView);

  const { lines, totals } = computeCartTotals(
    active.map((l) => ({
      variantId: l.variantId,
      quantity: l.quantity,
      unitPricePaise: l.unitPricePaise,
      unitMrpPaise: l.unitMrpPaise,
      gstRate: l.gstRate,
    })),
  );

  // Replace each active line's `pricing` with the canonical priced result.
  const byVariant = new Map(lines.map((l) => [l.variantId, l]));
  for (const line of active) {
    const priced = byVariant.get(line.variantId);
    if (priced) line.pricing = priced;
  }

  const itemCount = active.reduce((s, l) => s + l.quantity, 0);

  return {
    cartId: cart.id,
    isGuest: !owner.userId,
    itemCount,
    active,
    saved,
    totals,
  };
}

/** Light-weight count used by the header badge — avoids loading product joins. */
export async function getCartItemCount(owner: CartOwner): Promise<number> {
  const cart = await prisma.cart.findFirst({
    where: owner.userId ? { userId: owner.userId } : { sessionId: owner.sessionId },
    select: { id: true },
  });
  if (!cart) return 0;
  const agg = await prisma.cartItem.aggregate({
    where: { cartId: cart.id, savedForLater: false },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

// -----------------------------------------------------------------------------
// Mutations — every write is in a transaction so stock checks stay consistent
// with the upsert.
// -----------------------------------------------------------------------------

export class CartError extends Error {
  constructor(
    public readonly code: 'OUT_OF_STOCK' | 'VARIANT_UNAVAILABLE' | 'NOT_FOUND' | 'STOCK_CONFLICT',
    message: string,
    public readonly meta: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'CartError';
  }
}

export async function addItem(
  owner: CartOwner,
  input: { variantId: string; quantity: number },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const cart = await ensureCartTx(tx, owner);

    const variant = await tx.productVariant.findUnique({
      where: { id: input.variantId },
      select: {
        id: true,
        price: true,
        stock: true,
        version: true,
        backorderAllowed: true,
        product: { select: { status: true, deletedAt: true } },
      },
    });
    if (!variant || variant.product.status !== 'ACTIVE' || variant.product.deletedAt) {
      throw new CartError('VARIANT_UNAVAILABLE', 'This product is no longer available');
    }

    const existing = await tx.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      select: { id: true, quantity: true, savedForLater: true },
    });

    const nextQty = (existing?.savedForLater ? 0 : (existing?.quantity ?? 0)) + input.quantity;
    if (!variant.backorderAllowed && nextQty > variant.stock) {
      throw new CartError('OUT_OF_STOCK', 'Not enough stock', {
        available: variant.stock,
        requested: nextQty,
      });
    }

    if (existing) {
      await tx.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: nextQty,
          priceSnapshot: variant.price,
          savedForLater: false,
        },
      });
    } else {
      await tx.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: variant.id,
          quantity: input.quantity,
          priceSnapshot: variant.price,
        },
      });
    }
    await tx.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  });
}

export async function updateItem(
  owner: CartOwner,
  itemId: string,
  patch: { quantity?: number; savedForLater?: boolean },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const cart = await ensureCartTx(tx, owner);
    const item = await tx.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      select: {
        id: true,
        quantity: true,
        savedForLater: true,
        variant: {
          select: { id: true, stock: true, version: true, backorderAllowed: true },
        },
      },
    });
    if (!item) throw new CartError('NOT_FOUND', 'Cart item not found');

    const nextQty = patch.quantity ?? item.quantity;
    const nextSaved = patch.savedForLater ?? item.savedForLater;

    if (!nextSaved && !item.variant.backorderAllowed && nextQty > item.variant.stock) {
      throw new CartError('OUT_OF_STOCK', 'Not enough stock', {
        available: item.variant.stock,
        requested: nextQty,
      });
    }

    await tx.cartItem.update({
      where: { id: item.id },
      data: { quantity: nextQty, savedForLater: nextSaved },
    });
    await tx.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  });
}

export async function removeItem(owner: CartOwner, itemId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const cart = await ensureCartTx(tx, owner);
    const result = await tx.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    if (result.count === 0) throw new CartError('NOT_FOUND', 'Cart item not found');
    await tx.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  });
}

export async function clearCart(owner: CartOwner): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const cart = await ensureCartTx(tx, owner);
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  });
}

// -----------------------------------------------------------------------------
// Merge-on-login — called from `events.signIn` in lib/auth.ts.
// -----------------------------------------------------------------------------

/**
 * Merge the guest cart (keyed by `sessionId`) into the signed-in user's cart.
 * - If the user has no cart yet, the guest cart is reassigned to them.
 * - If both exist, line quantities are summed (clamped to stock); the guest cart
 *   is then deleted so it cannot be reused on logout.
 * - Always idempotent: safe to call on every sign-in.
 */
export async function mergeGuestCartIntoUser(params: {
  userId: string;
  sessionId: string | null;
}): Promise<void> {
  const { userId, sessionId } = params;
  if (!sessionId) return;

  await prisma.$transaction(async (tx) => {
    const guest = await tx.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });
    if (!guest) return;
    if (guest.userId === userId) return; // already merged on a previous sign-in

    const user = await tx.cart.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { items: true },
    });

    if (!user) {
      await tx.cart.update({ where: { id: guest.id }, data: { userId, sessionId: null } });
      return;
    }

    // Both exist — fold guest items into user cart.
    if (guest.items.length > 0) {
      const variantIds = Array.from(new Set(guest.items.map((i) => i.variantId)));
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, stock: true, backorderAllowed: true, price: true },
      });
      const stockBy = new Map(variants.map((v) => [v.id, v]));
      for (const gi of guest.items) {
        const stockInfo = stockBy.get(gi.variantId);
        if (!stockInfo) continue;
        const existing = user.items.find((ui) => ui.variantId === gi.variantId);
        const merged = (existing?.quantity ?? 0) + gi.quantity;
        const clamped = stockInfo.backorderAllowed ? merged : Math.min(merged, stockInfo.stock);
        if (clamped <= 0) continue;
        if (existing) {
          await tx.cartItem.update({
            where: { id: existing.id },
            data: {
              quantity: clamped,
              priceSnapshot: stockInfo.price,
              savedForLater: existing.savedForLater && gi.savedForLater,
            },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: user.id,
              variantId: gi.variantId,
              quantity: clamped,
              priceSnapshot: stockInfo.price,
              savedForLater: gi.savedForLater,
            },
          });
        }
      }
    }

    await tx.cart.delete({ where: { id: guest.id } });
    await tx.cart.update({ where: { id: user.id }, data: { updatedAt: new Date() } });
  });
}

// -----------------------------------------------------------------------------
// Internal — TX helpers
// -----------------------------------------------------------------------------

async function ensureCartTx(tx: Prisma.TransactionClient, owner: CartOwner) {
  if (owner.userId) {
    const cart = await tx.cart.findFirst({
      where: { userId: owner.userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (cart) return cart;
    return tx.cart.create({
      data: { userId: owner.userId, sessionId: owner.sessionId ?? null },
    });
  }
  if (!owner.sessionId) {
    // Operating on an existing cart with no identity at all is a 404 to the
    // caller (no cart cookie + not signed in = nothing to mutate).
    throw new CartError('NOT_FOUND', 'Cart not found');
  }
  const cart = await tx.cart.findUnique({ where: { sessionId: owner.sessionId } });
  if (cart) return cart;
  return tx.cart.create({ data: { sessionId: owner.sessionId } });
}

// Re-export the Decimal helper so callers don't have to reach into pricing.ts directly.
export { paiseToDecimal };

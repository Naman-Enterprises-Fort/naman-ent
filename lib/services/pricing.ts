import 'server-only';
import { Prisma } from '@prisma/client';

/**
 * Server-side pricing engine — Sprint 3 baseline.
 *
 * Phase-1 conventions (locked by CLAUDE.md §3.12):
 *   - Money on the wire is integer paise.
 *   - Money in storage is `Decimal(12,2)` — converted via `Prisma.Decimal`.
 *   - The variant `price` field is **GST-inclusive** (PDP shows "Inclusive of all taxes").
 *     We back-out tax for the line breakdown.
 *
 * GST split:
 *   - Intra-state ship  →  CGST + SGST (each = tax/2).
 *   - Inter-state ship  →  IGST (= tax).
 *   - When the destination state is unknown (cart page before checkout) we
 *     present a single "GST" line. The full split lands in Sprint 4 once a
 *     ship address has been chosen.
 *
 * Free shipping: subtotal_incl >= ₹999 → ship free; else flat ₹49.
 *   The threshold is a Phase-1 default; SRS §6.7 will replace it with a per-pincode
 *   rate engine in Sprint 5.
 */

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

export const FREE_SHIPPING_THRESHOLD_PAISE = 99_900; // ₹999.00
export const FLAT_SHIPPING_PAISE = 4_900; // ₹49.00

/** Origin state of the (single Phase-1) warehouse — used for CGST/SGST vs IGST. */
export const STORE_ORIGIN_STATE = (process.env.STORE_ORIGIN_STATE ?? 'Maharashtra').trim();

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PricingItemInput {
  variantId: string;
  quantity: number;
  /** Inclusive price per unit in paise. */
  unitPricePaise: number;
  /** GST rate as a percentage (e.g. 18 for 18%). */
  gstRate: number;
  /** Optional MRP per unit in paise — used for the "you save" line. */
  unitMrpPaise?: number;
}

export interface PricedLine extends PricingItemInput {
  /** quantity * unitPricePaise, GST-inclusive. */
  lineTotalPaise: number;
  /** GST-exclusive line subtotal. */
  lineSubtotalPaise: number;
  /** GST amount on this line. */
  lineTaxPaise: number;
  /** Discount vs. MRP, if any. */
  lineMrpDeltaPaise: number;
}

export interface CartTotals {
  /** Sum of GST-exclusive line subtotals. */
  subtotalPaise: number;
  /** Sum of all line tax (single combined GST figure when destinationState is omitted). */
  taxPaise: number;
  /** Split CGST when intra-state, else 0. */
  cgstPaise: number;
  /** Split SGST when intra-state, else 0. */
  sgstPaise: number;
  /** IGST when inter-state, else 0. */
  igstPaise: number;
  /** Discount vs. MRP across all lines. */
  mrpDeltaPaise: number;
  /** Coupon / promo discount — Sprint 3 always 0; Sprint 4+ wires this. */
  discountPaise: number;
  /** Shipping charge in paise. 0 above the free-shipping threshold. */
  shippingPaise: number;
  /** COD convenience fee — Sprint 3 always 0; Sprint 4 wires it. */
  codFeePaise: number;
  /** Final amount payable. */
  totalPaise: number;
  /** "Add ₹X more for free shipping" — 0 once the threshold is met. */
  freeShippingDeltaPaise: number;
  freeShippingThresholdPaise: number;
}

export interface PricingOptions {
  /** ISO-ish destination state name. When provided, GST is split CGST+SGST vs IGST. */
  destinationState?: string | null;
  /** Override origin state for testing. */
  originState?: string;
  /** Phase-1 forces COD fee + coupon to 0; the fields exist so Sprint 4 can wire them. */
  codFeePaise?: number;
  discountPaise?: number;
}

// -----------------------------------------------------------------------------
// Pure math
// -----------------------------------------------------------------------------

/**
 * Split an inclusive amount into (excl, tax) preserving the inclusive total.
 * Rounds tax half-up to the paise; subtotal is the residual so subtotal+tax === incl exactly.
 */
function splitTaxPaise(inclusivePaise: number, gstRate: number): { excl: number; tax: number } {
  if (gstRate <= 0) return { excl: inclusivePaise, tax: 0 };
  const tax = Math.round((inclusivePaise * gstRate) / (100 + gstRate));
  return { excl: inclusivePaise - tax, tax };
}

export function priceLine(item: PricingItemInput): PricedLine {
  const lineTotalPaise = item.unitPricePaise * item.quantity;
  const { excl, tax } = splitTaxPaise(lineTotalPaise, item.gstRate);
  const lineMrpDeltaPaise = item.unitMrpPaise
    ? Math.max(0, (item.unitMrpPaise - item.unitPricePaise) * item.quantity)
    : 0;
  return {
    ...item,
    lineTotalPaise,
    lineSubtotalPaise: excl,
    lineTaxPaise: tax,
    lineMrpDeltaPaise,
  };
}

export function priceLines(items: PricingItemInput[]): PricedLine[] {
  return items.map(priceLine);
}

export function computeCartTotals(
  items: PricingItemInput[],
  options: PricingOptions = {},
): { lines: PricedLine[]; totals: CartTotals } {
  const lines = priceLines(items);
  const subtotalPaise = lines.reduce((s, l) => s + l.lineSubtotalPaise, 0);
  const taxPaise = lines.reduce((s, l) => s + l.lineTaxPaise, 0);
  const mrpDeltaPaise = lines.reduce((s, l) => s + l.lineMrpDeltaPaise, 0);
  const lineTotal = lines.reduce((s, l) => s + l.lineTotalPaise, 0);

  const intraState = options.destinationState
    ? normalizeState(options.destinationState) ===
      normalizeState(options.originState ?? STORE_ORIGIN_STATE)
    : null;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (intraState === true) {
    cgst = Math.floor(taxPaise / 2);
    sgst = taxPaise - cgst;
  } else if (intraState === false) {
    igst = taxPaise;
  }

  const shippingPaise =
    lineTotal === 0 || lineTotal >= FREE_SHIPPING_THRESHOLD_PAISE ? 0 : FLAT_SHIPPING_PAISE;
  const freeShippingDeltaPaise =
    lineTotal === 0 ? 0 : Math.max(0, FREE_SHIPPING_THRESHOLD_PAISE - lineTotal);

  const codFeePaise = options.codFeePaise ?? 0;
  const discountPaise = options.discountPaise ?? 0;

  const totalPaise = Math.max(0, lineTotal + shippingPaise + codFeePaise - discountPaise);

  return {
    lines,
    totals: {
      subtotalPaise,
      taxPaise,
      cgstPaise: cgst,
      sgstPaise: sgst,
      igstPaise: igst,
      mrpDeltaPaise,
      discountPaise,
      shippingPaise,
      codFeePaise,
      totalPaise,
      freeShippingDeltaPaise,
      freeShippingThresholdPaise: FREE_SHIPPING_THRESHOLD_PAISE,
    },
  };
}

function normalizeState(s: string): string {
  return s.trim().toLowerCase();
}

// -----------------------------------------------------------------------------
// Decimal helpers — convert Prisma.Decimal <-> paise for store/wire boundary
// -----------------------------------------------------------------------------

type DecimalLike = { toString: () => string; toNumber?: () => number };

export function decimalToPaise(d: DecimalLike | number | string): number {
  const n =
    typeof d === 'number'
      ? d
      : typeof d === 'string'
        ? Number(d)
        : d.toNumber
          ? d.toNumber()
          : Number(d.toString());
  return Math.round(n * 100);
}

export function paiseToDecimal(paise: number): Prisma.Decimal {
  return new Prisma.Decimal((paise / 100).toFixed(2));
}

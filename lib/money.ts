/**
 * Money helpers for INR.
 *
 * Server-side, money is `Prisma.Decimal(12,2)`. On the wire (client <-> server)
 * we send **integer paise** to eliminate float drift forever. `toPaise` /
 * `fromPaise` are the only sanctioned conversions.
 *
 * Display strings always use the Indian numbering system grouping (1,23,456) via
 * `Intl.NumberFormat('en-IN')`.
 *
 * Inputs accept anything with `.toString()` (typically `Prisma.Decimal`),
 * `number`, or `string`. Conversion is via `Number()` after `toString()`, which
 * the Decimal class supports natively. Avoids importing `@prisma/client/runtime/library`
 * (path is not reliably exposed across Prisma versions).
 */

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const INR_WITH_PAISE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_IN = new Intl.NumberFormat('en-IN');

export type Paise = number;
export type Rupees = number;

type DecimalLike = { toString: () => string; toNumber?: () => number };
type MoneyInput = DecimalLike | number | string;

function toNumber(v: MoneyInput): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return v.toNumber ? v.toNumber() : Number(v.toString());
}

export function toPaise(value: MoneyInput): Paise {
  return Math.round(toNumber(value) * 100);
}

/** Inverse of `toPaise` — returns rupees as a plain number. */
export function fromPaise(paise: Paise): Rupees {
  return paise / 100;
}

/** "₹1,23,456" — for prices on tiles, cards, headers. */
export function formatINR(value: MoneyInput): string {
  return INR.format(toNumber(value));
}

/** "₹1,23,456.78" — for cart totals, invoices, payment screens. */
export function formatINRWithPaise(value: MoneyInput): string {
  return INR_WITH_PAISE.format(toNumber(value));
}

/** "1,234" — plain Indian-grouped integer (review counts, stock, etc.). */
export function formatNumberIN(value: number): string {
  return NUMBER_IN.format(value);
}

/** Discount percentage off MRP, rounded down. Returns null if no discount or MRP is zero. */
export function discountPct(mrp: MoneyInput, price: MoneyInput): number | null {
  const m = toNumber(mrp);
  const p = toNumber(price);
  if (m <= 0 || p >= m) return null;
  return Math.floor(((m - p) / m) * 100);
}

/** Absolute discount amount (₹ off MRP). */
export function discountAmount(mrp: MoneyInput, price: MoneyInput): number {
  return Math.max(0, toNumber(mrp) - toNumber(price));
}

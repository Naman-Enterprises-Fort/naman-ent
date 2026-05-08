/**
 * Pure pricing constants + helpers — safe to import from server AND client.
 *
 * The full server-side pricing engine lives in `lib/services/pricing.ts` (which
 * is `'server-only'` because it uses `Prisma.Decimal`). Anything that needs to
 * be referenced from a client component (cart drawer, checkout page) lives here.
 */

export const FREE_SHIPPING_THRESHOLD_PAISE = 99_900; // ₹999.00
export const FLAT_SHIPPING_PAISE = 4_900; // ₹49.00
export const EXPRESS_SHIPPING_PAISE = 9_900; // ₹99.00
export const SAME_DAY_SHIPPING_PAISE = 19_900; // ₹199.00
export const COD_CONVENIENCE_FEE_PAISE = 4_900; // ₹49.00

export type ShippingMethod = 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
export type PaymentMethodKey =
  | 'UPI'
  | 'CARD'
  | 'NETBANKING'
  | 'WALLET'
  | 'EMI'
  | 'PAY_LATER'
  | 'COD';

export function shippingPaiseFor(method: ShippingMethod, lineTotalPaise: number): number {
  if (method === 'EXPRESS') return EXPRESS_SHIPPING_PAISE;
  if (method === 'SAME_DAY') return SAME_DAY_SHIPPING_PAISE;
  if (lineTotalPaise === 0) return 0;
  if (lineTotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE) return 0;
  return FLAT_SHIPPING_PAISE;
}

export function codFeeFor(paymentMethod: PaymentMethodKey | null | undefined): number {
  return paymentMethod === 'COD' ? COD_CONVENIENCE_FEE_PAISE : 0;
}

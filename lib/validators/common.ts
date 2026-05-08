import { z } from 'zod';

/** cuid() string — Prisma's default id format. */
export const cuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid id');

/** Lowercase, alphanumeric + hyphen, 1–80 chars. */
export const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug');

/** Indian PIN code: 6 digits, first digit 1-9. */
export const pincodeSchema = z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code');

/** GST identification number: 15 chars, format-checked. */
export const gstinSchema = z
  .string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN');

/** Indian mobile (E.164 with optional +91): 10 digits or +91XXXXXXXXXX. */
export const phoneSchema = z.string().regex(/^(\+91)?[6-9]\d{9}$/, 'Invalid Indian mobile number');

/**
 * Money on the wire is integer paise. Server-side we convert to Decimal.
 * Bounded to 12 digits worth of rupees (₹99,99,99,99,99.99).
 */
export const paiseSchema = z
  .number()
  .int('Money must be sent as integer paise')
  .min(0, 'Negative paise not allowed')
  .max(999_999_999_999, 'Amount too large');

/** Pagination with sane defaults and bounds. */
export const pageSchema = z.coerce.number().int().min(1).max(500).default(1);
export const perPageSchema = z.coerce.number().int().min(1).max(60).default(24);

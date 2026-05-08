import { z } from 'zod';
import { addressBaseSchema } from './account';
import { cuidSchema, gstinSchema, phoneSchema } from './common';

export const paymentMethodSchema = z.enum([
  'UPI',
  'CARD',
  'NETBANKING',
  'WALLET',
  'EMI',
  'PAY_LATER',
  'COD',
]);

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;

export const shippingMethodSchema = z.enum(['STANDARD', 'EXPRESS', 'SAME_DAY']);
export type ShippingMethodInput = z.infer<typeof shippingMethodSchema>;

/**
 * Inline address shape — used when the customer is checking out as guest, or
 * when they tick "Use a new address" on a logged-in checkout. Drops `label` and
 * `isDefault` from the saved-address shape.
 */
const inlineAddressSchema = addressBaseSchema.omit({ label: true, isDefault: true });
export type CheckoutInlineAddress = z.infer<typeof inlineAddressSchema>;

export const createCheckoutSessionSchema = z
  .object({
    contactEmail: z.string().trim().toLowerCase().email().max(254),
    contactPhone: phoneSchema,
    shippingAddressId: cuidSchema.optional(),
    shippingAddress: inlineAddressSchema.optional(),
    billingSameAsShipping: z.boolean().default(true),
    billingAddressId: cuidSchema.optional(),
    billingAddress: inlineAddressSchema.optional(),
    shippingMethod: shippingMethodSchema.default('STANDARD'),
    paymentMethod: paymentMethodSchema,
    gstInvoice: z.boolean().default(false),
    gstin: gstinSchema.optional(),
    giftWrap: z.boolean().default(false),
    giftMessage: z.string().trim().max(280).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((data) => Boolean(data.shippingAddressId || data.shippingAddress), {
    message: 'A shipping address is required',
    path: ['shippingAddressId'],
  })
  .refine(
    (data) => data.billingSameAsShipping || Boolean(data.billingAddressId || data.billingAddress),
    { message: 'A billing address is required', path: ['billingAddressId'] },
  )
  .refine((data) => !data.gstInvoice || !!data.gstin, {
    message: 'GSTIN is required when requesting a GST invoice',
    path: ['gstin'],
  });

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;

/** POSTed by the Razorpay Web Checkout `handler` after the modal closes successfully. */
export const verifyOrderSchema = z.object({
  orderNumber: z.string().min(6).max(40),
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

export type VerifyOrderInput = z.infer<typeof verifyOrderSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(280).optional(),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const serviceabilityQuerySchema = z.object({
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid PIN code'),
});

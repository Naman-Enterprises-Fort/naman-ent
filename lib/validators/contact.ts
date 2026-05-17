import { z } from 'zod';

/**
 * Contact form input — validated server-side at `/api/contact` and
 * client-side via `zodResolver` in `<ContactForm />`. Keep loose limits
 * so legitimate enquiries aren't blocked, but cap message length to stop
 * the endpoint becoming a free-form storage dump.
 */
export const contactInquirySchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(100),
  email: z.string().trim().toLowerCase().email('Please enter a valid email'),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  subject: z.enum(['order', 'product', 'bulk', 'support', 'other'], {
    message: 'Pick a subject',
  }),
  message: z
    .string()
    .trim()
    .min(10, 'Please describe your query in at least 10 characters')
    .max(2000, 'Please keep messages under 2,000 characters'),
});

export type ContactInquiryInput = z.infer<typeof contactInquirySchema>;

export const SUBJECT_LABELS: Record<ContactInquiryInput['subject'], string> = {
  order: 'Order question',
  product: 'Product or stock question',
  bulk: 'Bulk / B2B pricing',
  support: 'Technical support',
  other: 'Something else',
};

import { format } from 'date-fns';
import { NextResponse } from 'next/server';
import { ContactInquiryEmail } from '@/emails/contact-inquiry';
import { storeConfig } from '@/lib/content/store-config';
import { sendEmail } from '@/lib/resend';
import { contactInquirySchema, SUBJECT_LABELS } from '@/lib/validators/contact';

/**
 * Public contact form endpoint. Anyone (signed-in or guest) can POST.
 *
 * Validation: every field via Zod (length, email format, subject enum).
 * Side effects: emails the support inbox via `sendEmail()`; in dev mode
 *   without `RESEND_API_KEY` the email logs to stdout (same fallback the
 *   auth flow uses) so the submission is still recoverable.
 *
 * Best-effort: a Resend outage doesn't fail the form — we still return 200
 * and log the message; the customer's confirmation isn't tied to delivery.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = contactInquirySchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? 'Please check the form and try again.' },
      { status: 400 },
    );
  }

  const { name, email, phone, subject, message } = parsed.data;
  const submittedAt = format(new Date(), "d MMM yyyy 'at' h:mm a 'IST'");
  const subjectLabel = SUBJECT_LABELS[subject];

  try {
    await sendEmail({
      to: storeConfig.supportEmail,
      subject: `[Contact] ${subjectLabel} — ${name}`,
      react: ContactInquiryEmail({
        name,
        email,
        phone,
        subjectLabel,
        message,
        submittedAt,
      }),
    });
  } catch (err) {
    // Don't block the customer on a transient email-provider error — log it
    // and still return success. Phase 2 polish: persist to a ContactInquiry
    // table so we have a recovery surface beyond the support inbox.
    console.error('[contact] sendEmail failed:', err);
  }

  return NextResponse.json({
    ok: true,
    message: "Thanks — we've received your message and will reply within one business day.",
  });
}

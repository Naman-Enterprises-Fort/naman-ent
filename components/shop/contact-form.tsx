'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldError, FormError, FormSuccess } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type ContactInquiryInput,
  contactInquirySchema,
  SUBJECT_LABELS,
} from '@/lib/validators/contact';

const SUBJECT_OPTIONS = Object.entries(SUBJECT_LABELS) as Array<
  [ContactInquiryInput['subject'], string]
>;

/**
 * Public contact form rendered on /contact. Validates client-side via the
 * same Zod schema the `/api/contact` route uses, so the only thing the
 * server can reject for is rate-limiting / send failures.
 *
 * Success state replaces the form with a confirmation card; submitting again
 * requires clicking "Send another message" so the success state is sticky.
 */
export function ContactForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInquiryInput>({
    resolver: zodResolver(contactInquirySchema),
    defaultValues: { name: '', email: '', phone: '', subject: 'order', message: '' },
  });

  async function onSubmit(values: ContactInquiryInput) {
    setServerError(null);
    setSuccess(null);
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data: { error?: string; message?: string } = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? 'Could not send your message. Please try again.');
      return;
    }
    setSuccess(data.message ?? 'Message sent.');
    reset();
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <FormSuccess message={success} />
        <p className="text-muted-foreground text-sm">
          We've forwarded your enquiry to our support team. If it's urgent, you can also email or
          call using the details on the right.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => {
            setSuccess(null);
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-lg border bg-card p-5 sm:p-6"
    >
      <FormError message={serverError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">Full name</Label>
          <Input
            id="contact-name"
            autoComplete="name"
            placeholder="Aarav Sharma"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          <FieldError message={errors.email?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-phone">
            Phone <span className="font-normal text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="contact-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            aria-invalid={!!errors.phone}
            {...register('phone')}
          />
          <FieldError message={errors.phone?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-subject">Subject</Label>
          <select
            id="contact-subject"
            aria-invalid={!!errors.subject}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            {...register('subject')}
          >
            {SUBJECT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <FieldError message={errors.subject?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-message">Message</Label>
        <textarea
          id="contact-message"
          rows={6}
          placeholder="Tell us a bit more — order number, product SKU, or what you need help with."
          aria-invalid={!!errors.message}
          className="flex min-h-[8rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          {...register('message')}
        />
        <FieldError message={errors.message?.message} />
        <p className="text-muted-foreground text-xs">We reply within one business day.</p>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-fit gap-2">
        {isSubmitting ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send aria-hidden className="size-4" />
            Send message
          </>
        )}
      </Button>
    </form>
  );
}

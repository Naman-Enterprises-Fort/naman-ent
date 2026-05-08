'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldError, FormError, FormSuccess } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ResendVerificationInput, resendVerificationSchema } from '@/lib/validators/auth';

export function ResendVerificationForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResendVerificationInput>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ResendVerificationInput) {
    setServerError(null);
    setSuccess(null);
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data: { error?: string; message?: string } = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? 'Could not send a new link. Try again later.');
      return;
    }
    setSuccess(data.message ?? "If that email is on file, we've sent a fresh link.");
  }

  return (
    <form noValidate className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
      <FormError message={serverError} />
      <FormSuccess message={success} />
      <div className="space-y-1.5">
        <Label htmlFor="resend-email">Email</Label>
        <Input
          id="resend-email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <Button type="submit" disabled={isSubmitting || !!success} className="w-full">
        {isSubmitting ? 'Sending…' : 'Send a new verification link'}
      </Button>
    </form>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldError, FormError, FormSuccess } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ForgotPasswordInput, forgotPasswordSchema } from '@/lib/validators/auth';

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null);
    setSuccess(null);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data: { error?: string; message?: string } = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? 'Could not send reset email. Try again later.');
      return;
    }
    setSuccess(data.message ?? "If that email is on file, we've sent a reset link.");
  }

  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormError message={serverError} />
      <FormSuccess message={success} />

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        <FieldError message={errors.email?.message} />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || !!success}>
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}

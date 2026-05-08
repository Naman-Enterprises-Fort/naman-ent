'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldError, FormError, FormSuccess } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ResetPasswordInput, resetPasswordSchema } from '@/lib/validators/auth';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: '', confirmPassword: '' },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    setSuccess(null);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? 'Could not reset your password.');
      return;
    }
    setSuccess('Password updated. Redirecting to sign in…');
    setTimeout(() => router.push('/login'), 1200);
  }

  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormError message={serverError} />
      <FormSuccess message={success} />

      <input type="hidden" {...register('token')} />

      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        <p className="text-muted-foreground text-xs">
          At least 8 characters with a letter and a digit.
        </p>
        <FieldError message={errors.password?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        <FieldError message={errors.confirmPassword?.message} />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || !!success}>
        {isSubmitting ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  );
}

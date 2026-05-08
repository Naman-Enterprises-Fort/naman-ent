'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldError, FormError, FormSuccess } from '@/components/auth/auth-card';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { type RegisterInput, registerSchema } from '@/lib/validators/auth';

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as unknown as true,
    },
  });
  const acceptTerms = watch('acceptTerms');

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    setSuccess(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data: { error?: string; message?: string } = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? 'Something went wrong. Please try again.');
      return;
    }
    setSuccess(data.message ?? "Check your inbox — we've sent a link to verify your email.");
  }

  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormError message={serverError} />
      <FormSuccess message={success} />

      <div className="space-y-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
        <FieldError message={errors.name?.message} />
      </div>

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

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
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
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        <FieldError message={errors.confirmPassword?.message} />
      </div>

      <div className="flex items-start gap-2.5">
        <Checkbox
          id="acceptTerms"
          checked={!!acceptTerms}
          onCheckedChange={(c) =>
            setValue('acceptTerms', c === true ? true : (false as unknown as true), {
              shouldValidate: true,
            })
          }
          aria-invalid={!!errors.acceptTerms}
        />
        <Label
          htmlFor="acceptTerms"
          className="font-normal text-muted-foreground text-xs leading-snug"
        >
          I agree to the{' '}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </Label>
      </div>
      <FieldError message={errors.acceptTerms?.message} />

      <Button type="submit" className="w-full" disabled={isSubmitting || !!success}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>

      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        <Separator className="flex-1" />
        <span>or</span>
        <Separator className="flex-1" />
      </div>

      <GoogleSignInButton callbackUrl="/account" />
    </form>
  );
}

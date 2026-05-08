'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldError, FormError } from '@/components/auth/auth-card';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { type LoginInput, loginSchema } from '@/lib/validators/auth';

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get('callbackUrl') ?? '/account';
  const justVerified = search.get('verified') === '1';

  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setPending(true);
    const res = await signIn('credentials', {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    setPending(false);

    if (!res || res.error) {
      setServerError('That email and password did not match. Try again.');
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      {justVerified && !serverError ? (
        <div
          role="status"
          className="rounded-md border border-emerald-600/40 bg-emerald-50 px-3 py-2 text-emerald-700 text-sm dark:bg-emerald-950/40 dark:text-emerald-400"
        >
          Email verified. Sign in to continue.
        </div>
      ) : null}
      <FormError message={serverError} />

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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-muted-foreground text-xs hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        <FieldError message={errors.password?.message} />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || pending}>
        {isSubmitting || pending ? 'Signing in…' : 'Sign in'}
      </Button>

      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        <Separator className="flex-1" />
        <span>or</span>
        <Separator className="flex-1" />
      </div>

      <GoogleSignInButton callbackUrl={callbackUrl} />
    </form>
  );
}

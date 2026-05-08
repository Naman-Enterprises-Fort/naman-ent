'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldError, FormError, FormSuccess } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ProfileInput, profileSchema } from '@/lib/validators/auth';

export function ProfileForm({
  initial,
}: {
  initial: { name: string; phone: string | null; email: string };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: initial.name, phone: initial.phone ?? '' },
  });

  async function onSubmit(values: ProfileInput) {
    setServerError(null);
    setSuccess(null);
    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? 'Could not save your profile.');
      return;
    }
    setSuccess('Profile saved.');
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
        <Label htmlFor="phone">Mobile number</Label>
        <Input
          id="phone"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="98XXXXXXXX"
          aria-invalid={!!errors.phone}
          {...register('phone')}
        />
        <p className="text-muted-foreground text-xs">
          10-digit Indian mobile, with or without +91.
        </p>
        <FieldError message={errors.phone?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={initial.email} disabled readOnly />
        <p className="text-muted-foreground text-xs">Contact support to change your email.</p>
      </div>

      <div className="pt-1">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

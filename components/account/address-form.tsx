'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldError, FormError } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type CreateAddressInput, createAddressSchema } from '@/lib/validators/account';

type Address = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

interface PostOffice {
  Name: string;
  District: string;
  State: string;
}
interface PincodeApiResponse {
  Status: 'Success' | 'Error' | '404';
  PostOffice?: PostOffice[] | null;
}

export function AddressForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: Address;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const isEdit = !!initial;
  const [serverError, setServerError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const lastLookupRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateAddressInput>({
    resolver: zodResolver(createAddressSchema),
    defaultValues: {
      label: initial?.label ?? undefined,
      fullName: initial?.fullName ?? '',
      phone: initial?.phone ?? '',
      line1: initial?.line1 ?? '',
      line2: initial?.line2 ?? undefined,
      city: initial?.city ?? '',
      state: initial?.state ?? '',
      pincode: initial?.pincode ?? '',
      country: 'IN',
      isDefault: initial?.isDefault ?? false,
    },
  });
  const pincode = watch('pincode');
  const isDefault = watch('isDefault');

  useEffect(() => {
    if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) return;
    if (lastLookupRef.current === pincode) return;
    lastLookupRef.current = pincode;
    const ctrl = new AbortController();
    setPinLoading(true);
    fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<PincodeApiResponse[]>)
      .then((arr) => {
        const first = arr?.[0];
        const po = first?.PostOffice?.[0];
        if (first?.Status === 'Success' && po) {
          setValue('city', po.District, { shouldValidate: true, shouldDirty: true });
          setValue('state', po.State, { shouldValidate: true, shouldDirty: true });
        }
      })
      .catch(() => undefined)
      .finally(() => setPinLoading(false));
    return () => ctrl.abort();
  }, [pincode, setValue]);

  async function onSubmit(values: CreateAddressInput) {
    setServerError(null);
    const url = isEdit ? `/api/account/addresses/${initial.id}` : '/api/account/addresses';
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? 'Could not save address.');
      return;
    }
    onDone();
  }

  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <FormError message={serverError} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            {...register('fullName')}
            aria-invalid={!!errors.fullName}
          />
          <FieldError message={errors.fullName?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Mobile</Label>
          <Input
            id="phone"
            inputMode="numeric"
            autoComplete="tel"
            {...register('phone')}
            aria-invalid={!!errors.phone}
          />
          <FieldError message={errors.phone?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="line1">Address line 1</Label>
        <Input
          id="line1"
          autoComplete="address-line1"
          {...register('line1')}
          aria-invalid={!!errors.line1}
        />
        <FieldError message={errors.line1?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="line2">
          Address line 2 <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input id="line2" autoComplete="address-line2" {...register('line2')} />
        <FieldError message={errors.line2?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="pincode">PIN code</Label>
          <div className="relative">
            <Input
              id="pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              {...register('pincode')}
              aria-invalid={!!errors.pincode}
            />
            {pinLoading ? (
              <Loader2
                className="absolute top-2.5 right-2 size-4 animate-spin text-muted-foreground"
                aria-hidden
              />
            ) : null}
          </div>
          <FieldError message={errors.pincode?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            autoComplete="address-level2"
            {...register('city')}
            aria-invalid={!!errors.city}
          />
          <FieldError message={errors.city?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            autoComplete="address-level1"
            {...register('state')}
            aria-invalid={!!errors.state}
          />
          <FieldError message={errors.state?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="label">
          Label <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input id="label" placeholder="Home / Office" {...register('label')} />
        <FieldError message={errors.label?.message} />
      </div>

      <div className="flex items-center gap-2.5">
        <Checkbox
          id="isDefault"
          checked={!!isDefault}
          onCheckedChange={(c) => setValue('isDefault', c === true, { shouldDirty: true })}
        />
        <Label htmlFor="isDefault" className="font-normal">
          Set as default delivery address
        </Label>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Save address'}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

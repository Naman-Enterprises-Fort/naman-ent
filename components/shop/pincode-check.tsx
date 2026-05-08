'use client';

import { CheckCircle2, MapPin, XCircle } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ServiceabilityEta {
  standard: { minDays: number; maxDays: number };
  express?: { minDays: number; maxDays: number };
  sameDay?: { minDays: number; maxDays: number };
}

interface ServiceabilityResponse {
  pincode: string;
  serviceable: boolean;
  city: string | null;
  state: string | null;
  codAvailable: boolean;
  eta: ServiceabilityEta;
}

type Result =
  | {
      ok: true;
      pincode: string;
      etaLabel: string;
      city: string | null;
      state: string | null;
      sameDayEligible: boolean;
    }
  | { ok: false; pincode: string; message: string };

const PIN_RE = /^[1-9][0-9]{5}$/;

function formatEta(eta: ServiceabilityEta): { label: string; sameDay: boolean } {
  if (eta.sameDay) return { label: 'same-day delivery', sameDay: true };
  if (eta.express) {
    const e = eta.express;
    return {
      label: `${e.minDays === e.maxDays ? `${e.minDays} day${e.minDays === 1 ? '' : 's'}` : `${e.minDays}–${e.maxDays} days`} (express)`,
      sameDay: false,
    };
  }
  const s = eta.standard;
  return {
    label:
      s.minDays === s.maxDays
        ? `${s.minDays} business day${s.minDays === 1 ? '' : 's'}`
        : `${s.minDays}–${s.maxDays} business days`,
    sameDay: false,
  };
}

export function PincodeCheck() {
  const [pincode, setPincode] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function check(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!PIN_RE.test(pincode)) {
      setResult({ ok: false, pincode, message: 'Enter a valid 6-digit PIN code.' });
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/serviceability?pincode=${encodeURIComponent(pincode)}`, {
        cache: 'force-cache',
      });
      if (!res.ok) {
        setResult({
          ok: false,
          pincode,
          message: 'Could not verify right now. Please try again.',
        });
        return;
      }
      const data = (await res.json()) as ServiceabilityResponse;
      if (!data.serviceable) {
        setResult({
          ok: false,
          pincode,
          message: 'Sorry, we do not deliver to this PIN code yet.',
        });
        return;
      }
      const { label, sameDay } = formatEta(data.eta);
      setResult({
        ok: true,
        pincode,
        etaLabel: label,
        city: data.city,
        state: data.state,
        sameDayEligible: sameDay,
      });
    } catch {
      setResult({
        ok: false,
        pincode,
        message: 'Could not verify right now. Please try again.',
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <p className="flex items-center gap-2 font-medium text-sm">
        <MapPin aria-hidden className="size-4" />
        Delivery to your PIN code
      </p>
      <form className="flex gap-2" onSubmit={check}>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={6}
          pattern="\d{6}"
          placeholder="Enter PIN code"
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
          aria-label="PIN code"
          className="h-9"
        />
        <Button type="submit" size="sm" disabled={pending || pincode.length !== 6}>
          {pending ? 'Checking…' : 'Check'}
        </Button>
      </form>
      {result?.ok && (
        <p className="flex items-start gap-2 text-emerald-700 text-sm dark:text-emerald-400">
          <CheckCircle2 aria-hidden className="mt-0.5 size-4" />
          <span>
            Delivers to {result.city ?? result.pincode}
            {result.state ? `, ${result.state}` : ''}{' '}
            {result.sameDayEligible ? (
              <>
                — eligible for <strong>{result.etaLabel}</strong>
              </>
            ) : (
              <>
                in <strong>{result.etaLabel}</strong>
              </>
            )}
            .
          </span>
        </p>
      )}
      {result && !result.ok && (
        <p className="flex items-start gap-2 text-destructive text-sm">
          <XCircle aria-hidden className="mt-0.5 size-4" />
          {result.message}
        </p>
      )}
    </div>
  );
}

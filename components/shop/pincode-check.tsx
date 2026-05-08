'use client';

import { CheckCircle2, MapPin, XCircle } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Result =
  | { ok: true; pincode: string; eta: string; city?: string; state?: string }
  | { ok: false; pincode: string; message: string };

const PIN_RE = /^[1-9][0-9]{5}$/;

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
      // TODO(integration): call /api/serviceability when Sprint 4 lands.
      // Phase 1 fallback: India Post lookup, returns first matching post office.
      const res = await fetch(
        `https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`,
        { cache: 'force-cache' },
      );
      const json = (await res.json()) as Array<{
        Status: string;
        PostOffice?: { District?: string; State?: string }[];
      }>;
      const top = json[0];
      if (!top || top.Status !== 'Success' || !top.PostOffice?.[0]) {
        setResult({
          ok: false,
          pincode,
          message: 'We could not find this PIN code. Please re-check.',
        });
      } else {
        const { District, State } = top.PostOffice[0];
        setResult({
          ok: true,
          pincode,
          eta: '3–5 business days',
          city: District,
          state: State,
        });
      }
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
            {result.state ? `, ${result.state}` : ''} in <strong>{result.eta}</strong>.
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

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CancelOrderButton({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/cancel`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Could not cancel order.');
        setBusy(false);
        return;
      }
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Cancel order
      </Button>
    );
  }

  return (
    <div className="w-full rounded-lg border bg-card p-4 text-sm">
      <p className="mb-2 font-medium">Are you sure you want to cancel this order?</p>
      <textarea
        className="mb-3 w-full rounded-md border bg-background p-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
      />
      {error ? (
        <p
          role="alert"
          className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-xs"
        >
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button variant="destructive" onClick={submit} disabled={busy}>
          {busy ? 'Cancelling…' : 'Confirm cancel'}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
          Keep order
        </Button>
      </div>
    </div>
  );
}

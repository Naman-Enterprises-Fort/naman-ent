'use client';

import type { OrderStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Mark confirmed',
  PROCESSING: 'Mark processing',
  SHIPPED: 'Mark shipped',
  OUT_FOR_DELIVERY: 'Mark out for delivery',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel order',
};

export function AdminOrderTransitionPanel({
  orderId,
  currentStatus,
  allowedNext,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  allowedNext: OrderStatus[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  async function transition(next: OrderStatus) {
    setError(null);
    setBusy(next);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Could not update order.');
        setBusy(null);
        return;
      }
      router.refresh();
      setNote('');
      setBusy(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setBusy(null);
    }
  }

  if (allowedNext.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm">
        <h3 className="mb-1 font-semibold">Status</h3>
        <p className="text-muted-foreground">
          {currentStatus} — no further admin transitions available.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <h3 className="mb-2 font-semibold">Update status</h3>
      <p className="mb-3 text-muted-foreground text-xs">Current: {currentStatus}</p>
      <textarea
        className="mb-3 w-full rounded-md border bg-background p-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        placeholder="Internal note (optional)"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error ? (
        <p
          role="alert"
          className="mb-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-xs"
        >
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        {allowedNext.map((next) => (
          <Button
            key={next}
            variant={next === 'CANCELLED' ? 'destructive' : 'default'}
            disabled={busy !== null}
            onClick={() => transition(next)}
            size="sm"
          >
            {busy === next ? 'Saving…' : (NEXT_LABEL[next] ?? next)}
          </Button>
        ))}
      </div>
    </div>
  );
}

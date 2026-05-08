'use client';

import { MapPin, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { AddressForm } from '@/components/account/address-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Address {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

type Mode = { kind: 'idle' } | { kind: 'add' } | { kind: 'edit'; id: string };

export function AddressListSection({ initial }: { initial: Address[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [_isPending, startTransition] = useTransition();

  function refresh() {
    setMode({ kind: 'idle' });
    setPendingId(null);
    startTransition(() => router.refresh());
  }

  async function setDefault(id: string) {
    setPendingId(id);
    await fetch(`/api/account/addresses/${id}`, { method: 'PUT' });
    refresh();
  }

  async function remove(id: string) {
    if (!confirm('Remove this address?')) return;
    setPendingId(id);
    await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <div className="space-y-4">
      {initial.length === 0 && mode.kind === 'idle' ? (
        <EmptyState onAdd={() => setMode({ kind: 'add' })} />
      ) : null}

      {initial.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {initial.map((addr) => {
            const isEditing = mode.kind === 'edit' && mode.id === addr.id;
            const isPending = pendingId === addr.id;
            return (
              <Card
                key={addr.id}
                className={cn(
                  'relative',
                  addr.isDefault && 'border-foreground/30',
                  isPending && 'opacity-60',
                )}
              >
                {addr.isDefault ? (
                  <span className="absolute top-3 right-3 rounded-full bg-foreground px-2 py-0.5 font-medium text-[10px] text-background uppercase tracking-wide">
                    Default
                  </span>
                ) : null}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{addr.label ?? addr.fullName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <address className="text-muted-foreground text-sm not-italic leading-relaxed">
                    {addr.fullName}
                    <br />
                    {addr.line1}
                    {addr.line2 ? <>, {addr.line2}</> : null}
                    <br />
                    {addr.city}, {addr.state} {addr.pincode}
                    <br />
                    {addr.phone}
                  </address>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMode({ kind: 'edit', id: addr.id })}
                      disabled={isPending}
                    >
                      Edit
                    </Button>
                    {!addr.isDefault ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDefault(addr.id)}
                        disabled={isPending}
                      >
                        Make default
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(addr.id)}
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </div>
                  {isEditing ? (
                    <div className="mt-4 border-t pt-4">
                      <AddressForm
                        initial={addr}
                        onDone={refresh}
                        onCancel={() => setMode({ kind: 'idle' })}
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {mode.kind === 'add' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New address</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressForm onDone={refresh} onCancel={() => setMode({ kind: 'idle' })} />
          </CardContent>
        </Card>
      ) : initial.length > 0 ? (
        <div>
          <Button variant="outline" onClick={() => setMode({ kind: 'add' })}>
            <Plus aria-hidden className="size-4" />
            Add another address
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <MapPin aria-hidden className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="font-medium">No saved addresses yet</p>
          <p className="text-muted-foreground text-sm">
            Add one now and your delivery details will be ready when you check out.
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus aria-hidden className="size-4" />
          Add an address
        </Button>
      </CardContent>
    </Card>
  );
}

'use client';

import { Loader2 } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { FormError } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';

export interface SessionEvent {
  id: string;
  provider: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function SessionsPanel({ initial }: { initial: SessionEvent[] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revoke() {
    if (!confirm('Sign out of every device? You will need to sign in again on each.')) return;
    setError(null);
    setPending(true);
    const res = await fetch('/api/account/sessions/revoke', { method: 'POST' });
    if (!res.ok) {
      setPending(false);
      setError('Could not sign out other sessions. Try again.');
      return;
    }
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />

      {initial.length === 0 ? (
        <p className="text-muted-foreground text-sm">No sign-in activity yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {initial.map((event) => (
            <li key={event.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-medium text-sm">{describeUserAgent(event.userAgent)}</p>
                  <p className="text-muted-foreground text-xs">
                    {event.ipAddress ?? 'Unknown IP'}
                    {event.provider ? ` · via ${event.provider}` : ''}
                  </p>
                </div>
                <time dateTime={event.createdAt} className="shrink-0 text-muted-foreground text-xs">
                  {dateFmt.format(new Date(event.createdAt))}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Button variant="outline" onClick={revoke} disabled={pending}>
          {pending ? (
            <>
              <Loader2 aria-hidden className="size-4 animate-spin" />
              Signing out…
            </>
          ) : (
            'Sign out of all devices'
          )}
        </Button>
      </div>
    </div>
  );
}

function describeUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const lower = ua.toLowerCase();
  const isMobile = /iphone|android|mobile/.test(lower);
  const browser = /edg\//.test(lower)
    ? 'Edge'
    : lower.includes('firefox')
      ? 'Firefox'
      : lower.includes('chrome')
        ? 'Chrome'
        : lower.includes('safari')
          ? 'Safari'
          : 'Browser';
  const os = lower.includes('windows')
    ? 'Windows'
    : lower.includes('mac os') || lower.includes('macintosh')
      ? 'macOS'
      : lower.includes('iphone') || lower.includes('ipad')
        ? 'iOS'
        : lower.includes('android')
          ? 'Android'
          : lower.includes('linux')
            ? 'Linux'
            : 'Unknown OS';
  return `${browser} on ${os}${isMobile ? ' (mobile)' : ''}`;
}

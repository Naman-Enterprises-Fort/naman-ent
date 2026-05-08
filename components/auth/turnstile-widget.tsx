'use client';

import Script from 'next/script';
import { useEffect, useId, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render(
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          appearance?: 'always' | 'execute' | 'interaction-only';
        },
      ): string;
      reset(widgetId?: string): void;
      remove(widgetId: string): void;
    };
  }
}

/**
 * Cloudflare Turnstile widget.
 *
 * In dev with no `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, the widget is replaced
 * with a small inline notice and the form can submit without a token —
 * the server-side verifier passes through when `TURNSTILE_SECRET_KEY` is
 * also unset. In production, the site key must be set or the form is
 * effectively unusable for bots and humans alike.
 *
 * SRS §6.1.2 / §12.1.
 */

export function TurnstileWidget({
  onVerify,
  className,
  theme = 'auto',
}: {
  onVerify: (token: string | null) => void;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const containerId = useId();

  useEffect(() => {
    if (!siteKey || !scriptReady) return;
    if (!containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      callback: (token) => onVerify(token),
      'error-callback': () => onVerify(null),
      'expired-callback': () => onVerify(null),
    });

    return () => {
      const id = widgetIdRef.current;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          // Already removed — ignore.
        }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, scriptReady, theme, onVerify]);

  if (!siteKey) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 p-3 text-muted-foreground text-xs">
        Bot protection (Cloudflare Turnstile) is not configured.{' '}
        {process.env.NODE_ENV === 'production' ? (
          <>
            Production deploys require{' '}
            <code className="font-mono">NEXT_PUBLIC_TURNSTILE_SITE_KEY</code>.
          </>
        ) : (
          <>Skipped in dev — set the env vars to enable.</>
        )}
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />
      <div id={containerId} ref={containerRef} className={className} />
    </>
  );
}

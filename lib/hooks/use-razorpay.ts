'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: { email?: string; contact?: string; name?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    confirm_close?: boolean;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const SCRIPT_ID = 'razorpay-checkout';

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.Razorpay) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay script failed')), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Razorpay script failed'));
    document.body.appendChild(s);
  });
}

export function useRazorpay() {
  const [ready, setReady] = useState<boolean>(typeof window !== 'undefined' && !!window.Razorpay);
  const lastInstanceRef = useRef<RazorpayInstance | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRazorpayScript()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const open = useCallback(async (options: RazorpayOptions) => {
    await loadRazorpayScript();
    if (!window.Razorpay) throw new Error('Razorpay unavailable');
    const inst = new window.Razorpay(options);
    lastInstanceRef.current = inst;
    inst.open();
  }, []);

  return { ready, open };
}

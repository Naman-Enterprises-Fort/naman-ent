import 'server-only';

/**
 * Cloudflare Turnstile server-side verifier.
 *
 * Phase-1 dev fallback: if `TURNSTILE_SECRET_KEY` is unset and we're not in
 * production, the verifier accepts any token. This lets local sign-up /
 * forgot-password flows work without provisioning a Turnstile site key. In
 * production, an unset secret denies — fail-closed.
 *
 * SRS §6.1.2 / §12.1: bot protection on signup, login, checkout. Phase 1
 * wires sign-up + forgot-password; login + checkout are Phase-2 polish.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifyResult {
  success: boolean;
  reason?: 'unconfigured' | 'missing_token' | 'http_error' | 'rejected' | 'network';
  detail?: string;
}

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export function isTurnstileConfigured(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstile(args: {
  token: string | null | undefined;
  ip?: string | null;
}): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      return { success: true };
    }
    console.error('[turnstile] TURNSTILE_SECRET_KEY unset in production — denying.');
    return { success: false, reason: 'unconfigured' };
  }

  if (!args.token) return { success: false, reason: 'missing_token' };

  const body = new URLSearchParams({ secret, response: args.token });
  if (args.ip) body.append('remoteip', args.ip);

  let res: Response;
  try {
    res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (e) {
    return { success: false, reason: 'network', detail: (e as Error).message };
  }

  if (!res.ok) {
    return { success: false, reason: 'http_error', detail: `${res.status}` };
  }

  const data = (await res.json().catch(() => null)) as SiteverifyResponse | null;
  if (!data) return { success: false, reason: 'http_error', detail: 'invalid_json' };
  if (!data.success) {
    return {
      success: false,
      reason: 'rejected',
      detail: data['error-codes']?.join(',') ?? 'unknown',
    };
  }
  return { success: true };
}

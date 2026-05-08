import 'server-only';
import { redis } from '@/lib/redis';

/**
 * Per-account login lockout — orthogonal to the IP-based loginLimiter.
 *
 * The IP limiter slows down a single bad actor; account lockout protects a
 * specific email across many IPs (the credential-stuffing case). We tally
 * failed credentials authorize attempts in a 10-min sliding window keyed on
 * the lower-cased email; at 5 failures the account is locked until the
 * window expires, surfaced to the Credentials provider as a `null` return so
 * NextAuth treats it as a generic failed sign-in (no enumerable signal that
 * the email exists or is locked).
 *
 * Permissive when Upstash creds are missing — same dev-fallback pattern as
 * the rate limiters in lib/redis.ts.
 */

const FAIL_LIMIT = 5;
const WINDOW_SECONDS = 10 * 60;

function keyFor(email: string): string {
  return `naman:lockout:${email.toLowerCase()}`;
}

export interface LockoutState {
  count: number;
  locked: boolean;
}

/** Increments the failed-login counter for an email. Returns the new count + locked flag. */
export async function recordFailedLogin(email: string): Promise<LockoutState> {
  if (!redis) return { count: 0, locked: false };
  const key = keyFor(email);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
  return { count, locked: count >= FAIL_LIMIT };
}

/** Clear the counter on successful authorize so legitimate users don't accumulate state. */
export async function clearFailedLogins(email: string): Promise<void> {
  if (!redis) return;
  await redis.del(keyFor(email));
}

/** True when the account is currently in lockout window. */
export async function isAccountLocked(email: string): Promise<boolean> {
  if (!redis) return false;
  const count = await redis.get<number>(keyFor(email));
  return (count ?? 0) >= FAIL_LIMIT;
}

export const ACCOUNT_LOCKOUT_LIMIT = FAIL_LIMIT;
export const ACCOUNT_LOCKOUT_WINDOW_SECONDS = WINDOW_SECONDS;

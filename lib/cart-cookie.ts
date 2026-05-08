import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * The `naman_cart_id` HTTP-only cookie carries an opaque random session id that
 * keys the guest cart in the database. Per CLAUDE.md §3.13 cart state never
 * touches localStorage / sessionStorage; the cookie is the only thing that
 * crosses the wire.
 *
 * - Path: '/'
 * - HttpOnly + SameSite=Lax — Lax is enough for cart adds (top-level POSTs);
 *   we don't share the cart across cross-site iframes.
 * - 1-year expiry — far enough out that a returning guest still finds their cart;
 *   shorter than the typical Razorpay refund window so rotations don't strand orphan carts.
 */

const COOKIE_NAME = 'naman_cart_id';
const ONE_YEAR = 60 * 60 * 24 * 365;

function newSessionId(): string {
  return randomBytes(32).toString('hex');
}

export async function readCartSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

/** Mints a new session id if the cookie is missing. Always returns a string. */
export async function getOrSetCartSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const id = newSessionId();
  jar.set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  });
  return id;
}

/** Clear the cookie (used on logout or after a successful merge into a user cart). */
export async function clearCartSessionId(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

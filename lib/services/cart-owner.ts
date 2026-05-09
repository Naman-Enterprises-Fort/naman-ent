import 'server-only';
import { getOrSetCartSessionId, readCartSessionId } from '@/lib/cart-cookie';
import { getSession } from '@/lib/services/auth';
import type { CartOwner } from '@/lib/services/cart';

/**
 * Resolve the current cart owner from the request — read-only.
 *
 * Use this from RSC layouts / pages and from read-only route handlers (cart
 * read, checkout view, order verify). It NEVER mints a cookie because Next
 * 16 forbids `cookies().set()` in RSC contexts. Returns `sessionId: null`
 * when the visitor has no cart cookie yet — `getCartView` short-circuits to
 * an empty cart in that case, no DB write needed.
 */
export async function getCartOwner(): Promise<CartOwner> {
  const session = await getSession();
  const sessionId = await readCartSessionId();
  return { userId: session?.user.id ?? null, sessionId };
}

/**
 * Same as `getCartOwner`, but mints the guest cookie if it isn't there yet.
 * Use this ONLY from mutating route handlers / Server Actions (cart add,
 * cart update, etc.) where a cookie write is permitted by Next 16.
 */
export async function getOrCreateCartOwner(): Promise<CartOwner & { sessionId: string }> {
  const session = await getSession();
  const sessionId = await getOrSetCartSessionId();
  return { userId: session?.user.id ?? null, sessionId };
}

import 'server-only';
import { getOrSetCartSessionId } from '@/lib/cart-cookie';
import { getSession } from '@/lib/services/auth';
import type { CartOwner } from '@/lib/services/cart';

/**
 * Resolve the current cart owner from the request — either the signed-in user
 * id or the guest cookie session id (minted on first read). Always returns a
 * `sessionId` so we can fall back to it during merge-on-login.
 */
export async function getCartOwner(): Promise<CartOwner> {
  const session = await getSession();
  const sessionId = await getOrSetCartSessionId();
  return { userId: session?.user.id ?? null, sessionId };
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CartView } from '@/lib/services/cart';

/** Public cart envelope returned by every /api/cart endpoint. */
export type CartEnvelope = { cart: CartView };

const CART_KEY = ['cart'] as const;

async function fetchCart(): Promise<CartView> {
  const res = await fetch('/api/cart', { credentials: 'same-origin' });
  if (!res.ok) throw new Error(await readError(res));
  const { cart } = (await res.json()) as CartEnvelope;
  return cart;
}

async function postAddToCart(variantId: string, quantity = 1): Promise<CartView> {
  const res = await fetch('/api/cart', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ variantId, quantity }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const { cart } = (await res.json()) as CartEnvelope;
  return cart;
}

async function patchCartItem(
  itemId: string,
  patch: { quantity?: number; savedForLater?: boolean },
): Promise<CartView> {
  const res = await fetch(`/api/cart/items/${itemId}`, {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res));
  const { cart } = (await res.json()) as CartEnvelope;
  return cart;
}

async function deleteCartItem(itemId: string): Promise<CartView> {
  const res = await fetch(`/api/cart/items/${itemId}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(await readError(res));
  const { cart } = (await res.json()) as CartEnvelope;
  return cart;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

export function useCart(initialData?: CartView) {
  return useQuery({
    queryKey: CART_KEY,
    queryFn: fetchCart,
    initialData,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity?: number }) =>
      postAddToCart(variantId, quantity ?? 1),
    onSuccess: (cart) => qc.setQueryData<CartView>(CART_KEY, cart),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { itemId: string; patch: { quantity?: number; savedForLater?: boolean } }) =>
      patchCartItem(vars.itemId, vars.patch),
    onSuccess: (cart) => qc.setQueryData<CartView>(CART_KEY, cart),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteCartItem(itemId),
    onSuccess: (cart) => qc.setQueryData<CartView>(CART_KEY, cart),
  });
}

export const cartQueryKey = CART_KEY;

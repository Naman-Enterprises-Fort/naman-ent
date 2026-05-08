'use client';

import { create } from 'zustand';

/**
 * Client-side UI flags for the cart drawer. Per CLAUDE.md §3.13 the actual
 * cart data lives in DB + cookie; this store only holds transient UI state
 * (open/closed) and an "added flash" hint that flips when an Add to cart
 * mutation succeeds, so the drawer can briefly highlight the latest line.
 */
interface CartUiState {
  miniCartOpen: boolean;
  /** Variant id of the most recently added/updated item, if any. */
  highlightedVariantId: string | null;
  setMiniCartOpen: (open: boolean) => void;
  flashAdd: (variantId: string) => void;
  clearHighlight: () => void;
}

export const useCartUi = create<CartUiState>((set) => ({
  miniCartOpen: false,
  highlightedVariantId: null,
  setMiniCartOpen: (open) => set({ miniCartOpen: open }),
  flashAdd: (variantId) => set({ miniCartOpen: true, highlightedVariantId: variantId }),
  clearHighlight: () => set({ highlightedVariantId: null }),
}));

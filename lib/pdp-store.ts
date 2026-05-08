'use client';

import { create } from 'zustand';

/**
 * Tracks the user-selected variant on a PDP so the sticky-mobile CTA stays in
 * sync with the variant selector above. PDP renders default → on selection
 * `setSelectedVariant` flips the value; `StickyCta` reads it.
 */
interface PdpState {
  selectedVariantId: string | null;
  selectedPricePaise: number | null;
  selectedStock: number | null;
  setSelectedVariant: (v: { id: string; pricePaise: number; stock: number }) => void;
  reset: () => void;
}

export const usePdpStore = create<PdpState>((set) => ({
  selectedVariantId: null,
  selectedPricePaise: null,
  selectedStock: null,
  setSelectedVariant: ({ id, pricePaise, stock }) =>
    set({ selectedVariantId: id, selectedPricePaise: pricePaise, selectedStock: stock }),
  reset: () => set({ selectedVariantId: null, selectedPricePaise: null, selectedStock: null }),
}));

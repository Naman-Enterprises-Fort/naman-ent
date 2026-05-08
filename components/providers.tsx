'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

/**
 * Top-level client providers. Phase 1 hosts a single QueryClient for the cart;
 * other client islands (search suggest, etc.) are independent stateless fetches.
 *
 * `staleTime` defaults are conservative — cart stays fresh on the client for 30s
 * before a background refetch, which is plenty for typical "browse, add, view"
 * journeys. Mutations always invalidate explicitly.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: { retry: 0 },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

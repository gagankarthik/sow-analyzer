"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * App-wide React Query provider. Server state (documents, classification,
 * diff, timeline, compliance packs) flows through React Query so caching,
 * polling, and invalidation are consistent. The client is created once per
 * browser session via useState so it survives re-renders but never leaks
 * between requests.
 *
 * Defaults: data is fresh for 30s, then refetched when a component mounts, when
 * the window regains focus, and when the network comes back — so a tab left
 * open, or an action taken in another tab, never leaves a stale list on screen.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

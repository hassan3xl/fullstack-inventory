// app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

let globalQueryClient: QueryClient | null = null;

export function getGlobalQueryClient(): QueryClient | null {
  return globalQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create QueryClient inside component to avoid sharing between users
  const [queryClient] = useState(
    () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // Data is fresh for 1 minute
            gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
            refetchOnWindowFocus: false, // Don't refetch when user returns to tab
            retry: 1, // Retry failed requests once
          },
        },
      });
      globalQueryClient = client;
      return client;
    }
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

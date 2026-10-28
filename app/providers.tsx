"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { StellarWalletProvider } from "@/context/StellarWalletContext";
import { ToastProvider } from "@/context/ToastContext";
import { TransactionModalProvider } from "@/context/TransactionModalContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  // One client per browser session; never shared across server requests.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 10_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <StellarWalletProvider>
          <TransactionModalProvider>{children}</TransactionModalProvider>
        </StellarWalletProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

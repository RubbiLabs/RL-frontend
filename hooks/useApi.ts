"use client";
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";

import { useStellarWallet } from "@/context/StellarWalletContext";
import { api } from "@/lib/api";
import type { ApiCardMovement } from "@/types/api";

const OPEN_MOVEMENT_STATUSES = new Set<ApiCardMovement["status"]>(["PENDING", "SETTLED", "PENDING_TREASURY"]);

/** Query keys are scoped by address so switching wallets never shows another user's data. */
export function useApiKeys() {
  const { address } = useStellarWallet();
  return {
    me: ["me", address] as const,
    card: ["card", address] as const,
    movements: ["card-movements", address] as const,
    plans: ["plans"] as const,
    subscriptions: ["subscriptions", address] as const,
    schedules: ["schedules", address] as const,
    incoming: ["schedules-incoming", address] as const,
    transactions: (account?: "WALLET" | "CARD", page = 1, pageSize = 10) =>
      ["transactions", address, account ?? "ALL", page, pageSize] as const,
    stats: ["dashboard-stats", address] as const,
  };
}

function useSignedIn() {
  const { isSignedIn } = useStellarWallet();
  return isSignedIn;
}

export function useMe(options: Partial<UseQueryOptions<Awaited<ReturnType<typeof api.users.me>>>> = {}) {
  const keys = useApiKeys();
  const enabled = useSignedIn();
  return useQuery({ queryKey: keys.me, queryFn: api.users.me, enabled, ...options });
}

export function useCard() {
  const keys = useApiKeys();
  const enabled = useSignedIn();
  return useQuery({ queryKey: keys.card, queryFn: api.cards.me, enabled, retry: false });
}

/** Polls every 5 s while a load/unload is still in flight. */
export function useCardMovements() {
  const keys = useApiKeys();
  const enabled = useSignedIn();
  return useQuery({
    queryKey: keys.movements,
    queryFn: api.cards.movements,
    enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.some((m) => OPEN_MOVEMENT_STATUSES.has(m.status)) ? 5_000 : false;
    },
  });
}

export function usePlans(includeInactive = false) {
  return useQuery({ queryKey: ["plans", includeInactive], queryFn: () => api.subscriptions.plans(includeInactive) });
}

export function useMySubscriptions(refetchInterval: number | false = false) {
  const keys = useApiKeys();
  const enabled = useSignedIn();
  return useQuery({ queryKey: keys.subscriptions, queryFn: api.subscriptions.me, enabled, refetchInterval });
}

export function useMySchedules(refetchInterval: number | false = false) {
  const keys = useApiKeys();
  const enabled = useSignedIn();
  return useQuery({ queryKey: keys.schedules, queryFn: api.payroll.schedules, enabled, refetchInterval });
}

export function useIncomingSchedules() {
  const keys = useApiKeys();
  const enabled = useSignedIn();
  return useQuery({ queryKey: keys.incoming, queryFn: api.payroll.incoming, enabled });
}

export function useTransactions(params: { account?: "WALLET" | "CARD"; page?: number; pageSize?: number } = {}) {
  const keys = useApiKeys();
  const enabled = useSignedIn();
  return useQuery({
    queryKey: keys.transactions(params.account, params.page ?? 1, params.pageSize ?? 10),
    queryFn: () => api.transactions.list(params),
    enabled,
  });
}

export function useDashboardStats() {
  const keys = useApiKeys();
  const enabled = useSignedIn();
  return useQuery({ queryKey: keys.stats, queryFn: api.dashboard.stats, enabled, refetchInterval: 15_000 });
}

/**
 * The API mirrors the chain through its indexer (polls every few seconds), so
 * after a transaction we re-fetch a few times instead of trusting one read.
 */
export function useInvalidateAfterTx() {
  const queryClient = useQueryClient();
  const { address } = useStellarWallet();
  return (keys: readonly unknown[][], attempts = 4, intervalMs = 4_000) => {
    const invalidate = () => {
      for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-stats", address] });
      void queryClient.invalidateQueries({ queryKey: ["chain"] });
    };
    invalidate();
    for (let i = 1; i <= attempts; i++) setTimeout(invalidate, i * intervalMs);
  };
}

"use client";
import React from "react";

import { useAllowance, useLatestLedger } from "@/hooks/useChain";
import { formatUsdc, parseUsdc } from "@/lib/stellar/amount";
import {
  computeSingleSubscriptionHealth,
  evaluateSharedAllowance,
  type AllowanceHealthState,
} from "@/lib/subscriptions/allowance";
import type { ApiPlan, ApiSubscription } from "@/types/api";

export function useSharedAllowanceHealth(subscriptions: ApiSubscription[] | undefined) {
  const allowance = useAllowance();
  const ledger = useLatestLedger();

  if (!allowance.data || ledger.data === undefined || !subscriptions) {
    return {
      loading: allowance.isLoading || ledger.isLoading,
      summary: null,
      allowanceAmount: allowance.data?.amount ?? 0n,
      liveUntilLedger: allowance.data?.liveUntilLedger ?? null,
      currentLedger: ledger.data,
    };
  }

  return {
    loading: false,
    summary: evaluateSharedAllowance(subscriptions, allowance.data, ledger.data),
    allowanceAmount: allowance.data.amount,
    liveUntilLedger: allowance.data.liveUntilLedger,
    currentLedger: ledger.data,
  };
}

/**
 * Computes the allowance status for a single subscription (sharing the SAC
 * allowance across all active subscriptions when `allSubscriptions` is provided).
 */
export function useAllowanceSummary(
  plan: ApiPlan | null | undefined,
  sub?: ApiSubscription,
  allSubscriptions?: ApiSubscription[],
) {
  const allowance = useAllowance();
  const ledger = useLatestLedger();
  const data = allowance.data;

  if (!data || !plan || ledger.data === undefined) {
    return {
      loading: allowance.isLoading || ledger.isLoading,
      text: null as string | null,
      state: "expired" as AllowanceHealthState,
      payments: 0,
      expired: false,
      warning: false,
      amount: 0n,
    };
  }

  const planAmount = parseUsdc(plan.amount);
  const billable = (allSubscriptions ?? []).filter(
    (s) => (s.status === "ACTIVE" || s.status === "PAST_DUE") && s.plan !== null,
  );
  const totalCycle =
    billable.length > 0
      ? billable.reduce((sum, s) => sum + parseUsdc(s.plan!.amount), 0n)
      : planAmount;

  const nextDueAt = sub?.nextDueAt ?? new Date(Date.now() + plan.period * 1000).toISOString();
  const computed = computeSingleSubscriptionHealth({
    planAmountStroops: planAmount,
    totalCycleStroops: totalCycle,
    nextDueAt,
    allowance: data,
    currentLedger: ledger.data,
  });

  const prefix = data.amount > 0n && data.liveUntilLedger !== null ? `${formatUsdc(data.amount)} USDC approved · ` : "";

  return {
    loading: false,
    text: `${prefix}${computed.label}`,
    state: computed.state,
    payments: computed.sharedCyclesCovered,
    expired: computed.state === "expired",
    warning: computed.warning,
    amount: data.amount,
  };
}

export default function AllowanceStatus({
  plan,
  subscription,
  allSubscriptions,
}: {
  plan: ApiPlan | null | undefined;
  subscription?: ApiSubscription;
  allSubscriptions?: ApiSubscription[];
}) {
  const summary = useAllowanceSummary(plan, subscription, allSubscriptions);
  if (summary.loading) return <span className="text-[11px] text-neutral-400">Reading allowance…</span>;
  if (!summary.text) return null;

  const badgeTone =
    summary.state === "expired" ||
    summary.state === "expires_before_next_due" ||
    summary.state === "insufficient_for_next_charge"
      ? "text-red-600 font-semibold"
      : summary.state === "last_payment_covered"
        ? "text-amber-700 font-semibold"
        : "text-neutral-500";

  return <span className={`text-[11px] ${badgeTone}`}>{summary.text}</span>;
}

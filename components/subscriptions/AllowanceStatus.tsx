"use client";
import React from "react";

import { useAllowance, useLatestLedger } from "@/hooks/useChain";
import { coveredPayments, formatUsdc, parseUsdc } from "@/lib/stellar/amount";
import { ledgerToApproxDate } from "@/lib/stellar/ledger";
import type { ApiPlan } from "@/types/api";

/**
 * "covers N more payments / expires on …" for the allowance granted to the
 * subscriptions contract. The allowance is shared by every plan, so the
 * coverage is computed against the given plan's amount.
 */
export function useAllowanceSummary(plan: ApiPlan | null | undefined) {
  const allowance = useAllowance();
  const ledger = useLatestLedger();
  const data = allowance.data;
  if (!data || !plan) return { loading: allowance.isLoading, text: null as string | null, payments: 0, expired: false, amount: 0n };

  const amount = parseUsdc(plan.amount);
  const payments = coveredPayments(data.amount, amount);
  const expired = data.liveUntilLedger !== null && ledger.data !== undefined && data.liveUntilLedger < ledger.data;
  let text: string;
  if (data.amount === 0n || data.liveUntilLedger === null) {
    text = "No allowance granted";
  } else if (expired) {
    text = "Allowance expired";
  } else {
    const expiry = ledger.data !== undefined ? ledgerToApproxDate(ledger.data, data.liveUntilLedger) : null;
    text = `${formatUsdc(data.amount)} USDC approved · covers ${payments} more payment${payments === 1 ? "" : "s"}${
      expiry ? ` · expires ≈ ${expiry.toLocaleDateString(undefined, { dateStyle: "medium" })}` : ""
    }`;
  }
  return { loading: false, text, payments, expired, amount: data.amount };
}

export default function AllowanceStatus({ plan }: { plan: ApiPlan | null | undefined }) {
  const summary = useAllowanceSummary(plan);
  if (summary.loading) return <span className="text-[11px] text-neutral-400">Reading allowance…</span>;
  if (!summary.text) return null;
  const warn = summary.expired || summary.payments === 0;
  return <span className={`text-[11px] ${warn ? "text-amber-700" : "text-neutral-500"}`}>{summary.text}</span>;
}

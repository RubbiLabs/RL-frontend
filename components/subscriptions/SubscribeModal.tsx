"use client";
import React, { useState } from "react";
import { CheckCircle, Circle, Info } from "lucide-react";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useInvalidateAfterTx } from "@/hooks/useApi";
import { useAllowance, useLatestLedger } from "@/hooks/useChain";
import { useStellarTx } from "@/hooks/useStellarTx";
import { formatUsdc, parseUsdc } from "@/lib/stellar/amount";
import { formatPeriod } from "@/lib/stellar/ledger";
import { approveUsdc } from "@/lib/stellar/sac";
import { subscribe } from "@/lib/stellar/subscriptions";
import {
  computeTopUpApproval,
  TOP_UP_PERIOD_CHOICES,
  type TopUpPeriods,
} from "@/lib/subscriptions/allowance";
import type { ApiPlan, ApiSubscription } from "@/types/api";

/** Default number of periods one approval covers. */
export const APPROVE_PERIODS: TopUpPeriods = 3;

interface Props {
  plan: ApiPlan | null;
  /** When true the modal only runs the approve step (allowance top-up). */
  approveOnly?: boolean;
  /** Active/past-due subscriptions sharing the SAC allowance (for multi-subscription top-up). */
  sharedSubscriptions?: ApiSubscription[];
  onClose: () => void;
}

export default function SubscribeModal({
  plan,
  approveOnly = false,
  sharedSubscriptions,
  onClose,
}: Props) {
  const { address } = useStellarWallet();
  const tx = useStellarTx();
  const allowance = useAllowance();
  const ledger = useLatestLedger();
  const invalidate = useInvalidateAfterTx();
  const [periods, setPeriods] = useState<TopUpPeriods>(APPROVE_PERIODS);
  const [approved, setApproved] = useState(false);
  const [done, setDone] = useState(false);

  const billableShared = (sharedSubscriptions ?? []).filter(
    (s) => (s.status === "ACTIVE" || s.status === "PAST_DUE") && s.plan !== null,
  );
  const hasPastDue = billableShared.some((s) => s.status === "PAST_DUE");

  if (!plan && billableShared.length === 0) return null;

  const singlePlanAmount = plan ? parseUsdc(plan.amount) : 0n;
  const sharedCycleTotal = billableShared.reduce((sum, s) => sum + parseUsdc(s.plan!.amount), 0n);

  // When topping up across shared active subscriptions, cover the sum of all active plans
  // (plus the new plan if subscribing).
  const baseCycleStroops =
    approveOnly && sharedCycleTotal > 0n
      ? sharedCycleTotal > singlePlanAmount
        ? sharedCycleTotal
        : singlePlanAmount
      : !approveOnly && sharedCycleTotal > 0n
        ? sharedCycleTotal + singlePlanAmount
        : singlePlanAmount;

  const effectivePeriodSeconds =
    billableShared.length > 0
      ? Math.max(plan?.period ?? 0, ...billableShared.map((s) => s.plan!.period))
      : (plan?.period ?? 30 * 86_400);

  const currentLedger = ledger.data;
  const currentAllowanceStroops = allowance.data?.amount ?? 0n;

  const topUpCalc =
    currentLedger !== undefined
      ? computeTopUpApproval({
          baseCycleStroops,
          periodSeconds: effectivePeriodSeconds,
          periods,
          currentLedger,
        })
      : null;

  const approveAmount = topUpCalc?.approveAmountStroops ?? baseCycleStroops * BigInt(periods);
  const expirationLedger = topUpCalc?.expirationLedger ?? null;
  const expiresAt = topUpCalc?.expiresAt ?? null;

  const existingCovers =
    allowance.data &&
    allowance.data.amount >= baseCycleStroops &&
    allowance.data.liveUntilLedger !== null &&
    currentLedger !== undefined &&
    allowance.data.liveUntilLedger > currentLedger;
  const step1Done = approved || (!approveOnly && Boolean(existingCovers));

  const handleApprove = async () => {
    if (expirationLedger === null) return;
    const result = await tx.run(
      {
        title: "Approve USDC allowance",
        description: `Setting the subscriptions contract allowance to ${formatUsdc(approveAmount)} USDC (${periods} period${periods === 1 ? "" : "s"}).`,
        successTitle: "Allowance approved",
      },
      ({ config, address: addr, sign }) =>
        approveUsdc(
          config,
          { from: addr, spender: config.contracts.subscriptions, amount: approveAmount, expirationLedger },
          { sign },
        ),
    );
    if (result) {
      setApproved(true);
      void allowance.refetch();
      invalidate([["subscriptions", address]]);
      if (approveOnly) setDone(true);
    }
  };

  const handleSubscribe = async () => {
    if (!plan) return;
    const result = await tx.run(
      {
        title: `Subscribe to ${plan.name}`,
        description: `The first period (${formatUsdc(singlePlanAmount)} USDC) is charged now.`,
        successTitle: "Subscribed",
      },
      ({ config, address: addr, sign }) => subscribe(config, { subscriber: addr, planId: plan.id }, { sign }),
    );
    if (result) {
      setDone(true);
      invalidate([["subscriptions", address]]);
    }
  };

  const subtitle =
    approveOnly && billableShared.length > 1
      ? `${billableShared.length} active subscriptions · ${formatUsdc(baseCycleStroops)} USDC per cycle`
      : plan
        ? `${formatUsdc(singlePlanAmount)} USDC ${formatPeriod(plan.period)}`
        : `${formatUsdc(baseCycleStroops)} USDC per cycle`;

  return (
    <Modal
      open
      onClose={onClose}
      title={approveOnly ? "Top up allowance" : `Subscribe to ${plan?.name ?? "plan"}`}
      subtitle={subtitle}
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600 space-y-2">
          <p>
            Rubbi subscriptions are non-custodial: your USDC stays in your wallet. One shared allowance covers all of
            your active subscriptions to the contract.
          </p>
          <p className="text-xs font-semibold text-neutral-800">
            This sets your allowance to {formatUsdc(approveAmount)} USDC (replacing the current{" "}
            {formatUsdc(currentAllowanceStroops)} USDC).
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
            Periods to approve
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TOP_UP_PERIOD_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                disabled={tx.isRunning}
                onClick={() => {
                  setPeriods(choice);
                  setApproved(false);
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  periods === choice
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-primary/40"
                }`}
              >
                {choice} {choice === 1 ? "period" : "periods"}
              </button>
            ))}
          </div>
        </div>

        <ol className="space-y-4">
          <li className="flex gap-3">
            {step1Done ? (
              <CheckCircle size={20} className="text-green-600 shrink-0" />
            ) : (
              <Circle size={20} className="text-neutral-300 shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm font-bold text-neutral-900">1. Approve {formatUsdc(approveAmount)} USDC</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {periods} × {formatUsdc(baseCycleStroops)} USDC
                {expiresAt
                  ? `, valid until ≈ ${expiresAt.toLocaleDateString(undefined, { dateStyle: "medium" })} (ledger ${expirationLedger})`
                  : ""}
                .
                {!approveOnly &&
                  existingCovers &&
                  !approved &&
                  " Your current allowance already covers the first payment; you can top it up anyway."}
              </p>
              <Button
                size="sm"
                className="mt-2"
                loading={tx.isRunning && !step1Done}
                disabled={expirationLedger === null || tx.isRunning || (approved && !approveOnly)}
                onClick={handleApprove}
              >
                {approved ? "Approved" : existingCovers && !approveOnly ? "Top up allowance" : "Approve"}
              </Button>
            </div>
          </li>
          {!approveOnly && plan && (
            <li className="flex gap-3">
              {done ? (
                <CheckCircle size={20} className="text-green-600 shrink-0" />
              ) : (
                <Circle size={20} className="text-neutral-300 shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-bold text-neutral-900">2. Subscribe</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Charges the first period now and schedules the next one {formatPeriod(plan.period)}.
                </p>
                <Button
                  size="sm"
                  className="mt-2"
                  loading={tx.isRunning && step1Done}
                  disabled={!step1Done || done || tx.isRunning}
                  onClick={handleSubscribe}
                >
                  {done ? "Subscribed" : "Subscribe"}
                </Button>
              </div>
            </li>
          )}
        </ol>

        {done && hasPastDue && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800 flex items-start gap-2">
            <Info size={15} className="shrink-0 mt-0.5" />
            <span>
              Allowance updated. For any <strong>PAST_DUE</strong> subscription, the keeper will automatically retry
              charging within ~10 minutes.
            </span>
          </div>
        )}

        {done && (
          <Button fullWidth onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </Modal>
  );
}

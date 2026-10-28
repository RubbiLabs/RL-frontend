"use client";
import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

import SubscribeModal, { APPROVE_PERIODS } from "@/components/subscriptions/SubscribeModal";
import { useSharedAllowanceHealth } from "@/components/subscriptions/AllowanceStatus";
import Button from "@/components/ui/Button";
import { formatDate } from "@/components/ui/SectionCard";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useInvalidateAfterTx, useMySubscriptions } from "@/hooks/useApi";
import { useAllowance } from "@/hooks/useChain";
import { useStellarTx } from "@/hooks/useStellarTx";
import { formatUsdc } from "@/lib/stellar/amount";
import { approveUsdc } from "@/lib/stellar/sac";
import { computeTopUpApproval } from "@/lib/subscriptions/allowance";

export default function AllowanceHealthBanner() {
  const { address } = useStellarWallet();
  const subs = useMySubscriptions();
  const allowance = useAllowance();
  const tx = useStellarTx();
  const invalidate = useInvalidateAfterTx();
  const { summary, currentLedger } = useSharedAllowanceHealth(subs.data);
  const [modalOpen, setModalOpen] = useState(false);
  const [toppedUpNotice, setToppedUpNotice] = useState<string | null>(null);

  if (!summary || summary.activeCount === 0) return null;

  const failingCount = summary.failingSubscriptions.length;
  const warningCount = summary.warningSubscriptions.length;

  if (failingCount === 0 && warningCount === 0 && !toppedUpNotice) {
    return null;
  }

  const quickTopUpCalc =
    currentLedger !== undefined
      ? computeTopUpApproval({
          baseCycleStroops: summary.singleCycleTotalStroops,
          periodSeconds: summary.maxPeriodSeconds,
          periods: APPROVE_PERIODS,
          currentLedger,
        })
      : null;

  const handleQuickTopUp = async () => {
    if (!quickTopUpCalc) return;
    const result = await tx.run(
      {
        title: "Top up shared USDC allowance",
        description: `Setting allowance to ${formatUsdc(quickTopUpCalc.approveAmountStroops)} USDC (${APPROVE_PERIODS} periods across ${summary.activeCount} subscription${summary.activeCount === 1 ? "" : "s"}).`,
        successTitle: "Allowance topped up",
      },
      ({ config, address: addr, sign }) =>
        approveUsdc(
          config,
          {
            from: addr,
            spender: config.contracts.subscriptions,
            amount: quickTopUpCalc.approveAmountStroops,
            expirationLedger: quickTopUpCalc.expirationLedger,
          },
          { sign },
        ),
    );
    if (result) {
      void allowance.refetch();
      invalidate([["subscriptions", address]]);
      if (summary.pastDueCount > 0) {
        setToppedUpNotice(
          "Allowance topped up. Your PAST_DUE subscription(s) will be retried automatically by the keeper within ~10 minutes.",
        );
      } else {
        setToppedUpNotice(
          `Allowance set to ${formatUsdc(quickTopUpCalc.approveAmountStroops)} USDC (${APPROVE_PERIODS} periods).`,
        );
      }
    }
  };

  if (failingCount === 0 && warningCount === 0 && toppedUpNotice) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 flex items-center justify-between gap-3 text-xs text-green-800">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 size={16} className="text-green-600 shrink-0" />
          <span className="font-medium">{toppedUpNotice}</span>
        </div>
        <button
          type="button"
          onClick={() => setToppedUpNotice(null)}
          className="text-green-700 font-bold hover:underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  const isCritical = failingCount > 0;
  const dueText = summary.earliestFailingDueAt ? formatDate(summary.earliestFailingDueAt) : "the next due date";

  return (
    <>
      <div
        className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-4 ${
          isCritical ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        <div className="flex items-start gap-3">
          {isCritical ? (
            <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <p className="text-sm font-bold">
              {isCritical
                ? `${failingCount} subscription${failingCount === 1 ? "" : "s"} will fail on ${dueText}: top up now`
                : `Shared allowance covers only 1 remaining cycle across ${summary.activeCount} subscription${summary.activeCount === 1 ? "" : "s"}`}
            </p>
            <p className="text-xs opacity-85">
              One shared SAC allowance ({formatUsdc(allowance.data?.amount ?? 0n)} USDC currently approved) covers all
              active subscriptions ({formatUsdc(summary.singleCycleTotalStroops)} USDC per cycle).
              {summary.pastDueCount > 0 &&
                " After topping up a PAST_DUE subscription, the keeper will retry within ~10 minutes."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {quickTopUpCalc && (
            <Button
              size="sm"
              loading={tx.isRunning}
              disabled={tx.isRunning}
              onClick={handleQuickTopUp}
            >
              Top up {formatUsdc(quickTopUpCalc.approveAmountStroops)} USDC ({APPROVE_PERIODS} periods)
            </Button>
          )}
          <Button
            size="sm"
            variant="outlined"
            disabled={tx.isRunning}
            onClick={() => setModalOpen(true)}
          >
            Choose periods…
          </Button>
        </div>
      </div>

      {modalOpen && (
        <SubscribeModal
          plan={subs.data?.find((s) => s.plan !== null)?.plan ?? null}
          approveOnly
          sharedSubscriptions={subs.data}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

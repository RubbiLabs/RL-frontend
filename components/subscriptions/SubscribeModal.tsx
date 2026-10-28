"use client";
import React, { useState } from "react";
import { CheckCircle, Circle } from "lucide-react";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useInvalidateAfterTx } from "@/hooks/useApi";
import { useAllowance, useLatestLedger } from "@/hooks/useChain";
import { useStellarTx } from "@/hooks/useStellarTx";
import { formatUsdc, parseUsdc } from "@/lib/stellar/amount";
import { approvalExpirationLedger, formatPeriod, ledgerToApproxDate } from "@/lib/stellar/ledger";
import { approveUsdc } from "@/lib/stellar/sac";
import { subscribe } from "@/lib/stellar/subscriptions";
import type { ApiPlan } from "@/types/api";

/** How many periods one approval covers (plan 5.4: default 3). */
export const APPROVE_PERIODS = 3;

interface Props {
  plan: ApiPlan | null;
  /** When true the modal only runs the approve step (allowance top-up). */
  approveOnly?: boolean;
  onClose: () => void;
}

export default function SubscribeModal({ plan, approveOnly = false, onClose }: Props) {
  const { address } = useStellarWallet();
  const tx = useStellarTx();
  const allowance = useAllowance();
  const ledger = useLatestLedger();
  const invalidate = useInvalidateAfterTx();
  const [approved, setApproved] = useState(false);
  const [done, setDone] = useState(false);

  if (!plan) return null;

  const amount = parseUsdc(plan.amount);
  const approveAmount = amount * BigInt(APPROVE_PERIODS);
  const currentLedger = ledger.data;
  const expirationLedger = currentLedger !== undefined ? approvalExpirationLedger(currentLedger, plan.period, APPROVE_PERIODS) : null;
  const expiresAt = currentLedger !== undefined && expirationLedger !== null ? ledgerToApproxDate(currentLedger, expirationLedger) : null;
  const existingCovers = allowance.data && allowance.data.amount >= amount && allowance.data.liveUntilLedger !== null && currentLedger !== undefined && allowance.data.liveUntilLedger > currentLedger;
  const step1Done = approved || (!approveOnly && Boolean(existingCovers));

  const handleApprove = async () => {
    if (expirationLedger === null) return;
    const result = await tx.run(
      {
        title: "Approve USDC allowance",
        description: `Allowing the subscriptions contract to pull up to ${formatUsdc(approveAmount)} USDC (${APPROVE_PERIODS} periods).`,
        successTitle: "Allowance approved",
      },
      ({ config, address: addr, sign }) =>
        approveUsdc(config, { from: addr, spender: config.contracts.subscriptions, amount: approveAmount, expirationLedger }, { sign }),
    );
    if (result) {
      setApproved(true);
      void allowance.refetch();
      if (approveOnly) setDone(true);
    }
  };

  const handleSubscribe = async () => {
    const result = await tx.run(
      {
        title: `Subscribe to ${plan.name}`,
        description: `The first period (${formatUsdc(amount)} USDC) is charged now.`,
        successTitle: "Subscribed",
      },
      ({ config, address: addr, sign }) => subscribe(config, { subscriber: addr, planId: plan.id }, { sign }),
    );
    if (result) {
      setDone(true);
      invalidate([["subscriptions", address]]);
    }
  };

  return (
    <Modal open onClose={onClose} title={approveOnly ? "Top up allowance" : `Subscribe to ${plan.name}`} subtitle={`${formatUsdc(amount)} USDC ${formatPeriod(plan.period)}`}>
      <div className="space-y-5">
        <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-600 space-y-1">
          <p>
            Rubbi subscriptions are non-custodial: your USDC stays in your wallet. You approve a bounded, expiring allowance
            and the contract pulls each period when it is due.
          </p>
        </div>

        <ol className="space-y-4">
          <li className="flex gap-3">
            {step1Done ? <CheckCircle size={20} className="text-green-600 shrink-0" /> : <Circle size={20} className="text-neutral-300 shrink-0" />}
            <div className="flex-1">
              <p className="text-sm font-bold text-neutral-900">1. Approve {formatUsdc(approveAmount)} USDC</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {APPROVE_PERIODS} × {formatUsdc(amount)} USDC
                {expiresAt ? `, valid until ≈ ${expiresAt.toLocaleDateString(undefined, { dateStyle: "medium" })} (ledger ${expirationLedger})` : ""}.
                {!approveOnly && existingCovers && !approved && " Your current allowance already covers the first payment; you can top it up anyway."}
              </p>
              <Button size="sm" className="mt-2" loading={tx.isRunning && !step1Done} disabled={expirationLedger === null || tx.isRunning || (approved && !approveOnly)} onClick={handleApprove}>
                {approved ? "Approved" : existingCovers && !approveOnly ? "Top up allowance" : "Approve"}
              </Button>
            </div>
          </li>
          {!approveOnly && (
            <li className="flex gap-3">
              {done ? <CheckCircle size={20} className="text-green-600 shrink-0" /> : <Circle size={20} className="text-neutral-300 shrink-0" />}
              <div className="flex-1">
                <p className="text-sm font-bold text-neutral-900">2. Subscribe</p>
                <p className="text-xs text-neutral-500 mt-0.5">Charges the first period now and schedules the next one {formatPeriod(plan.period)}.</p>
                <Button size="sm" className="mt-2" loading={tx.isRunning && step1Done} disabled={!step1Done || done || tx.isRunning} onClick={handleSubscribe}>
                  {done ? "Subscribed" : "Subscribe"}
                </Button>
              </div>
            </li>
          )}
        </ol>

        {done && (
          <Button fullWidth onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </Modal>
  );
}

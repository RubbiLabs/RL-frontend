"use client";
import React, { useMemo, useState } from "react";
import { Pause, Play, Plus, RefreshCw, XCircle } from "lucide-react";

import AllowanceStatus from "@/components/subscriptions/AllowanceStatus";
import SubscribeModal from "@/components/subscriptions/SubscribeModal";
import Button from "@/components/ui/Button";
import SectionCard, { EmptyState, formatDate } from "@/components/ui/SectionCard";
import StatusPill from "@/components/ui/StatusPill";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useInvalidateAfterTx, useMySubscriptions, usePlans } from "@/hooks/useApi";
import { useStellarTx } from "@/hooks/useStellarTx";
import { apiErrorMessage } from "@/lib/api";
import { formatUsdcDecimal } from "@/lib/stellar/amount";
import { shortAddress } from "@/lib/stellar/config";
import { formatPeriod } from "@/lib/stellar/ledger";
import { cancelSubscription, pauseSubscription, resumeSubscription } from "@/lib/stellar/subscriptions";
import type { ApiPlan, ApiSubscription } from "@/types/api";

export default function SubscriptionsPage() {
  const { address } = useStellarWallet();
  const plans = usePlans();
  const subs = useMySubscriptions();
  const tx = useStellarTx();
  const invalidate = useInvalidateAfterTx();
  const [modal, setModal] = useState<{ plan: ApiPlan; approveOnly: boolean } | null>(null);

  const liveByPlan = useMemo(() => {
    const map = new Map<number, ApiSubscription>();
    for (const s of subs.data ?? []) if (s.status !== "CANCELLED") map.set(s.planId, s);
    return map;
  }, [subs.data]);

  const lifecycle = async (sub: ApiSubscription, action: "pause" | "resume" | "cancel") => {
    const fn = action === "pause" ? pauseSubscription : action === "resume" ? resumeSubscription : cancelSubscription;
    const name = sub.plan?.name ?? `plan #${sub.planId}`;
    const result = await tx.run(
      {
        title: `${action[0].toUpperCase()}${action.slice(1)} subscription`,
        description: `${name} (subscription #${sub.onChainSubId}).`,
        successTitle: `Subscription ${action === "cancel" ? "cancelled" : action === "pause" ? "paused" : "resumed"}`,
      },
      ({ config, address: addr, sign }) => fn(config, { subscriber: addr, subId: BigInt(sub.onChainSubId) }, { sign }),
    );
    if (result) invalidate([["subscriptions", address]]);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900">Subscriptions</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Plans curated by Rubbi&apos;s merchants. Funds stay in your wallet; you approve an allowance and each period is
            pulled when due.
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={() => { void plans.refetch(); void subs.refetch(); }}>
          Refresh
        </Button>
      </div>

      <SectionCard title="My subscriptions" subtitle="Mirrored from the subscriptions contract by Rubbi's indexer">
        {subs.isError && <p className="text-sm text-red-600">{apiErrorMessage(subs.error)}</p>}
        {subs.data && subs.data.length === 0 && <EmptyState title="No subscriptions yet">Pick a plan below to subscribe.</EmptyState>}
        {subs.data && subs.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-neutral-50 border-b border-neutral-100">
                <tr>
                  {["Plan", "Amount", "Status", "Next due", "Allowance", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-primary-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {subs.data.map((sub) => (
                  <tr key={sub.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-neutral-900">{sub.plan?.name ?? `Plan #${sub.planId}`}</p>
                      <p className="text-[11px] text-neutral-400">#{sub.onChainSubId} · merchant {sub.plan ? shortAddress(sub.plan.merchant) : "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700">
                      {sub.plan ? `${formatUsdcDecimal(sub.plan.amount)} USDC ${formatPeriod(sub.plan.period)}` : "—"}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={sub.status} /></td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{sub.status === "CANCELLED" ? "—" : formatDate(sub.nextDueAt)}</td>
                    <td className="px-4 py-3">
                      {sub.status === "CANCELLED" ? <span className="text-[11px] text-neutral-400">—</span> : <AllowanceStatus plan={sub.plan} />}
                      {sub.status !== "CANCELLED" && sub.plan && (
                        <button className="block text-[11px] text-primary hover:underline mt-0.5" onClick={() => setModal({ plan: sub.plan!, approveOnly: true })}>
                          Top up allowance
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {(sub.status === "ACTIVE" || sub.status === "PAST_DUE") && (
                          <Button size="sm" variant="outlined" icon={<Pause size={12} />} disabled={tx.isRunning} onClick={() => lifecycle(sub, "pause")}>
                            Pause
                          </Button>
                        )}
                        {sub.status === "PAUSED" && (
                          <Button size="sm" icon={<Play size={12} />} disabled={tx.isRunning} onClick={() => lifecycle(sub, "resume")}>
                            Resume
                          </Button>
                        )}
                        {sub.status !== "CANCELLED" && (
                          <Button size="sm" variant="danger" icon={<XCircle size={12} />} disabled={tx.isRunning} onClick={() => lifecycle(sub, "cancel")}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Available plans" subtitle="Public plans mirrored from the subscriptions contract">
        {plans.isLoading && <p className="text-sm text-neutral-400">Loading plans…</p>}
        {plans.isError && <p className="text-sm text-red-600">{apiErrorMessage(plans.error)}</p>}
        {plans.data && plans.data.length === 0 && (
          <EmptyState title="No plans published yet">Merchants create plans on-chain; they appear here once indexed.</EmptyState>
        )}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.data?.map((plan) => {
            const live = liveByPlan.get(plan.id);
            return (
              <div key={plan.id} className="rounded-2xl border border-neutral-200 p-5 flex flex-col gap-3">
                <div>
                  <p className="text-base font-extrabold text-neutral-900">{plan.name}</p>
                  <p className="text-xs text-neutral-400">Plan #{plan.id} · merchant {shortAddress(plan.merchant)}</p>
                </div>
                <p className="text-2xl font-extrabold text-primary">
                  {formatUsdcDecimal(plan.amount)} <span className="text-xs font-bold text-neutral-400">USDC {formatPeriod(plan.period)}</span>
                </p>
                {live ? (
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <StatusPill status={live.status} /> already subscribed
                  </div>
                ) : (
                  <Button icon={<Plus size={14} />} disabled={!plan.active || tx.isRunning} onClick={() => setModal({ plan, approveOnly: false })}>
                    {plan.active ? "Subscribe" : "Inactive"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {modal && <SubscribeModal plan={modal.plan} approveOnly={modal.approveOnly} onClose={() => setModal(null)} />}
    </div>
  );
}

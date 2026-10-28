"use client";
import React, { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, FileSpreadsheet, ListPlus, Pause, Play, Send, XCircle } from "lucide-react";

import CsvImport from "@/components/payroll/CsvImport";
import ScheduleRowsForm from "@/components/payroll/ScheduleRowsForm";
import AmountInput from "@/components/ui/AmountInput";
import Button from "@/components/ui/Button";
import SectionCard, { EmptyState, formatDate } from "@/components/ui/SectionCard";
import StatusPill from "@/components/ui/StatusPill";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useToast } from "@/context/ToastContext";
import { useIncomingSchedules, useInvalidateAfterTx, useMySchedules } from "@/hooks/useApi";
import { useAccountState, useEscrow } from "@/hooks/useChain";
import { useStellarTx } from "@/hooks/useStellarTx";
import { apiErrorMessage } from "@/lib/api";
import { formatUsdc, formatUsdcDecimal, parseUsdc, tryParseUsdc } from "@/lib/stellar/amount";
import { shortAddress } from "@/lib/stellar/config";
import { formatPeriod } from "@/lib/stellar/ledger";
import {
  MAX_BATCH,
  cancelSchedule,
  createSchedules,
  disburseBatch,
  fundEscrow,
  pauseSchedule,
  resumeSchedule,
  withdrawEscrow,
  type ScheduleInput,
} from "@/lib/stellar/payroll";
import type { ApiSchedule } from "@/types/api";

export default function PayrollPage() {
  const { address } = useStellarWallet();
  const escrow = useEscrow();
  const account = useAccountState();
  const schedules = useMySchedules();
  const incoming = useIncomingSchedules();
  const tx = useStellarTx();
  const invalidate = useInvalidateAfterTx();
  const { info } = useToast();

  const [fundAmount, setFundAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [createMode, setCreateMode] = useState<"manual" | "csv">("manual");
  const [lastPayout, setLastPayout] = useState<Array<{ id: string; paid: boolean }> | null>(null);

  const usdcWallet = account.data?.usdc.hasTrustline ? account.data.usdc.balance : 0n;
  const dueNow = useMemo(() => {
    const now = Date.now();
    return (schedules.data ?? []).filter((s) => s.status === "ACTIVE" && new Date(s.nextDueAt).getTime() <= now);
  }, [schedules.data]);
  const duePerPeriod = dueNow.reduce((sum, s) => sum + parseUsdc(s.amount), 0n);

  const refresh = () => {
    void escrow.refetch();
    invalidate([["schedules", address], ["schedules-incoming", address]]);
  };

  const handleFund = async () => {
    const amount = tryParseUsdc(fundAmount);
    if (!amount) return;
    const result = await tx.run(
      { title: "Fund payroll escrow", description: `Moving ${formatUsdc(amount)} USDC into escrow.`, successTitle: "Escrow funded" },
      ({ config, address: addr, sign }) => fundEscrow(config, { employer: addr, amount }, { sign }),
    );
    if (result) {
      setFundAmount("");
      refresh();
    }
  };

  const handleWithdraw = async () => {
    const amount = tryParseUsdc(withdrawAmount);
    if (!amount) return;
    const result = await tx.run(
      { title: "Withdraw escrow", description: `Moving ${formatUsdc(amount)} USDC back to your wallet.`, successTitle: "Escrow withdrawn" },
      ({ config, address: addr, sign }) => withdrawEscrow(config, { employer: addr, amount }, { sign }),
    );
    if (result) {
      setWithdrawAmount("");
      refresh();
    }
  };

  const handleCreate = async (inputs: ScheduleInput[], firstDue: bigint) => {
    const result = await tx.run(
      { title: `Create ${inputs.length} schedule${inputs.length === 1 ? "" : "s"}`, description: "Validated atomically by the payroll contract.", successTitle: "Schedules created" },
      ({ config, address: addr, sign }) => createSchedules(config, { employer: addr, inputs, firstDue }, { sign }),
    );
    if (!result) throw new Error("cancelled");
    refresh();
  };

  const handleCreateBatch = async (
    inputs: ScheduleInput[],
    firstDue: bigint,
    batchIndex: number,
    totalBatches: number,
  ): Promise<{ ids: bigint[] } | null> => {
    const batchLabel = totalBatches > 1 ? ` (batch ${batchIndex} of ${totalBatches})` : "";
    const result = await tx.run(
      {
        title: `Create ${inputs.length} schedule${inputs.length === 1 ? "" : "s"}${batchLabel}`,
        description: `Batch ${batchIndex} of ${totalBatches} — validated atomically by the payroll contract.`,
        successTitle: `Batch ${batchIndex} of ${totalBatches} created`,
      },
      ({ config, address: addr, sign }) => createSchedules(config, { employer: addr, inputs, firstDue }, { sign }),
    );
    if (!result) return null;
    refresh();
    return { ids: result.ids };
  };

  const lifecycle = async (s: ApiSchedule, action: "pause" | "resume" | "cancel") => {
    const fn = action === "pause" ? pauseSchedule : action === "resume" ? resumeSchedule : cancelSchedule;
    const result = await tx.run(
      {
        title: `${action[0].toUpperCase()}${action.slice(1)} schedule`,
        description: `${s.label || "Schedule"} #${s.onChainId} → ${shortAddress(s.recipient)}.`,
        successTitle: `Schedule ${action === "cancel" ? "cancelled" : action === "pause" ? "paused" : "resumed"}`,
      },
      ({ config, address: addr, sign }) => fn(config, { employer: addr, scheduleId: BigInt(s.onChainId) }, { sign }),
    );
    if (result) refresh();
  };

  const payDueNow = async () => {
    const batch = dueNow.slice(0, MAX_BATCH);
    if (batch.length === 0) {
      info("Nothing due", "No active schedule is due right now.");
      return;
    }
    const result = await tx.run(
      {
        title: "Pay due schedules",
        description: `disburse_batch for ${batch.length} schedule${batch.length === 1 ? "" : "s"} (one period each).`,
        successTitle: "Payroll run complete",
      },
      ({ config, address: addr, sign }) =>
        disburseBatch(config, { source: addr, ids: batch.map((s) => BigInt(s.onChainId)) }, { sign }),
    );
    if (result) {
      setLastPayout(batch.map((s, i) => ({ id: s.onChainId, paid: result.results[i] ?? false })));
      refresh();
    }
  };

  const canFund = tryParseUsdc(fundAmount) !== null && parseUsdc(fundAmount || "0") <= usdcWallet;
  const canWithdraw = tryParseUsdc(withdrawAmount) !== null && escrow.data !== undefined && parseUsdc(withdrawAmount || "0") <= escrow.data;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900">Payroll</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Pre-fund an escrow and schedule recurring USDC salaries. Each payout pays exactly one period; missed periods stay owed.
          </p>
        </div>
        <Button icon={<Send size={15} />} disabled={tx.isRunning || dueNow.length === 0} onClick={payDueNow}>
          Pay due now {dueNow.length > 0 ? `(${Math.min(dueNow.length, MAX_BATCH)})` : ""}
        </Button>
      </div>

      {lastPayout && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          <p className="font-bold text-neutral-900 mb-1">Last payroll run</p>
          <ul className="text-xs text-neutral-600 space-y-0.5">
            {lastPayout.map((r) => (
              <li key={r.id}>
                Schedule #{r.id}: {r.paid ? <span className="text-green-700 font-semibold">paid</span> : <span className="text-amber-700 font-semibold">skipped</span>}
                {!r.paid && " (not due, insufficient escrow, or the recipient cannot receive USDC)"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Escrow" subtitle="On-chain balance that funds your schedules" className="lg:col-span-1">
          <div className="rounded-xl bg-primary text-white px-4 py-3 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Escrow balance</p>
            <p className="text-2xl font-extrabold">{escrow.data !== undefined ? formatUsdc(escrow.data) : "—"} USDC</p>
            {dueNow.length > 0 && <p className="text-[11px] text-white/70 mt-1">{formatUsdc(duePerPeriod)} USDC due now</p>}
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <AmountInput label="Fund escrow" value={fundAmount} onChange={setFundAmount} max={usdcWallet} />
              <Button fullWidth size="sm" icon={<ArrowDownRight size={14} />} disabled={!canFund || tx.isRunning} onClick={handleFund}>
                Fund
              </Button>
            </div>
            <div className="space-y-2">
              <AmountInput label="Withdraw escrow" value={withdrawAmount} onChange={setWithdrawAmount} max={escrow.data ?? null} />
              <Button fullWidth size="sm" variant="outlined" icon={<ArrowUpRight size={14} />} disabled={!canWithdraw || tx.isRunning} onClick={handleWithdraw}>
                Withdraw
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Create schedules"
          subtitle={createMode === "csv" ? "Import CSV and submit in batches of up to 25" : "Up to 25 per transaction"}
          className="lg:col-span-2"
          action={
            <div className="inline-flex rounded-xl border border-neutral-200 p-1 bg-neutral-50">
              <button
                type="button"
                onClick={() => setCreateMode("manual")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  createMode === "manual" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <ListPlus size={13} />
                Manual rows
              </button>
              <button
                type="button"
                onClick={() => setCreateMode("csv")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  createMode === "csv" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <FileSpreadsheet size={13} />
                Import CSV
              </button>
            </div>
          }
        >
          {createMode === "csv" ? (
            <CsvImport
              employer={address}
              currentEscrow={escrow.data}
              disabled={tx.isRunning}
              onSubmitBatch={handleCreateBatch}
            />
          ) : (
            <ScheduleRowsForm employer={address} disabled={tx.isRunning} onSubmit={handleCreate} />
          )}
        </SectionCard>
      </div>

      <SectionCard title="My schedules" subtitle="Mirrored from the payroll contract by Rubbi's indexer">
        {schedules.isError && <p className="text-sm text-red-600">{apiErrorMessage(schedules.error)}</p>}
        {schedules.data && schedules.data.length === 0 && <EmptyState title="No schedules yet">Create your first schedule above.</EmptyState>}
        {schedules.data && schedules.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-neutral-50 border-b border-neutral-100">
                <tr>
                  {["Schedule", "Recipient", "Amount", "Next due", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-primary-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {schedules.data.map((s) => {
                  const due = s.status === "ACTIVE" && new Date(s.nextDueAt).getTime() <= Date.now();
                  return (
                    <tr key={s.id} className="hover:bg-neutral-50/70">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-neutral-900">{s.label || "—"}</p>
                        <p className="text-[11px] text-neutral-400">#{s.onChainId} · {formatPeriod(s.period)}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-neutral-600" title={s.recipient}>{shortAddress(s.recipient, 6, 6)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-neutral-800">{formatUsdcDecimal(s.amount)} USDC</td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {s.status === "CANCELLED" ? "—" : formatDate(s.nextDueAt)}
                        {due && <span className="block text-[10px] font-bold text-amber-700 uppercase">due</span>}
                      </td>
                      <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {s.status === "ACTIVE" && (
                            <Button size="sm" variant="outlined" icon={<Pause size={12} />} disabled={tx.isRunning} onClick={() => lifecycle(s, "pause")}>Pause</Button>
                          )}
                          {s.status === "PAUSED" && (
                            <Button size="sm" icon={<Play size={12} />} disabled={tx.isRunning} onClick={() => lifecycle(s, "resume")}>Resume</Button>
                          )}
                          {s.status !== "CANCELLED" && (
                            <Button size="sm" variant="danger" icon={<XCircle size={12} />} disabled={tx.isRunning} onClick={() => lifecycle(s, "cancel")}>Cancel</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Paying me" subtitle="Schedules where you are the recipient">
        {incoming.data && incoming.data.length === 0 && <EmptyState title="Nobody is paying you through Rubbi yet" />}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {incoming.data?.map((s) => (
            <div key={s.id} className="rounded-xl border border-neutral-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-neutral-900">{s.label || `Schedule #${s.onChainId}`}</p>
                <StatusPill status={s.status} />
              </div>
              <p className="text-xs text-neutral-500 mt-1">from {shortAddress(s.employer, 6, 6)}</p>
              <p className="text-sm font-semibold text-neutral-800 mt-2">{formatUsdcDecimal(s.amount)} USDC {formatPeriod(s.period)}</p>
              <p className="text-[11px] text-neutral-400 mt-1">next {formatDate(s.nextDueAt)}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

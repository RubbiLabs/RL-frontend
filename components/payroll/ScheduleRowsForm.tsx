"use client";
import React, { useMemo, useState } from "react";
import { StrKey } from "@stellar/stellar-sdk";
import { Plus, Trash2 } from "lucide-react";

import AmountInput from "@/components/ui/AmountInput";
import Button from "@/components/ui/Button";
import { formatUsdc, isValidUsdcAmount, parseUsdc } from "@/lib/stellar/amount";
import { MAX_SCHEDULES_PER_CALL, type ScheduleInput } from "@/lib/stellar/payroll";

const DAY = 86_400;
const PERIOD_PRESETS = [
  { label: "Daily", days: 1 },
  { label: "Weekly", days: 7 },
  { label: "Every 2 weeks", days: 14 },
  { label: "Every 30 days", days: 30 },
];
const MAX_LABEL_BYTES = 64;
const MIN_FIRST_DUE_MS = 10 * 60 * 1000;

interface Row {
  recipient: string;
  amount: string;
  periodDays: string;
  label: string;
}

const emptyRow = (): Row => ({ recipient: "", amount: "", periodDays: "30", label: "" });

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function validateRow(row: Row, employer: string | null): string | null {
  if (!StrKey.isValidEd25519PublicKey(row.recipient.trim())) return "Recipient must be a Stellar account (G…).";
  if (row.recipient.trim() === employer) return "The recipient cannot be the employer.";
  if (!isValidUsdcAmount(row.amount)) return "Amount must be a positive USDC amount (max 7 decimals).";
  const days = Number(row.periodDays);
  if (!Number.isInteger(days) || days < 1 || days > 366) return "Period must be between 1 and 366 days.";
  const labelBytes = new TextEncoder().encode(row.label).length;
  if (labelBytes > MAX_LABEL_BYTES) return `Label is ${labelBytes} bytes; the maximum is ${MAX_LABEL_BYTES}.`;
  return null;
}

interface Props {
  employer: string | null;
  disabled?: boolean;
  onSubmit: (inputs: ScheduleInput[], firstDue: bigint) => Promise<void>;
}

export default function ScheduleRowsForm({ employer, disabled, onSubmit }: Props) {
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [firstDue, setFirstDue] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setSeconds(0, 0);
    return toLocalInputValue(tomorrow);
  });
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => rows.map((row) => validateRow(row, employer)), [rows, employer]);
  const firstDueDate = new Date(firstDue);
  const firstDueError =
    Number.isNaN(firstDueDate.getTime())
      ? "Pick a first payment date."
      : firstDueDate.getTime() < Date.now() + MIN_FIRST_DUE_MS
        ? "The first payment must be at least 10 minutes in the future."
        : null;
  const valid = errors.every((e) => e === null) && !firstDueError && rows.length > 0;
  const total = rows.reduce((sum, row) => (isValidUsdcAmount(row.amount) ? sum + parseUsdc(row.amount) : sum), 0n);

  const update = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const submit = async () => {
    setSubmitted(true);
    if (!valid) return;
    const inputs: ScheduleInput[] = rows.map((row) => ({
      recipient: row.recipient.trim(),
      amount: parseUsdc(row.amount),
      period: BigInt(Number(row.periodDays) * DAY),
      label: row.label.trim(),
    }));
    await onSubmit(inputs, BigInt(Math.floor(firstDueDate.getTime() / 1000)));
    setRows([emptyRow()]);
    setSubmitted(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="rounded-xl border border-neutral-200 p-4 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-start">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Recipient (G…)</label>
              <input
                value={row.recipient}
                onChange={(e) => update(index, { recipient: e.target.value.trim() })}
                placeholder="GABC…"
                spellCheck={false}
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <AmountInput label="Amount per period" value={row.amount} onChange={(v) => update(index, { amount: v })} />
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Period</label>
              <div className="flex gap-2">
                <select
                  value={PERIOD_PRESETS.some((p) => String(p.days) === row.periodDays) ? row.periodDays : "custom"}
                  onChange={(e) => update(index, { periodDays: e.target.value === "custom" ? "" : e.target.value })}
                  className="rounded-xl border border-neutral-200 px-2 py-3 text-xs bg-white"
                >
                  {PERIOD_PRESETS.map((p) => (
                    <option key={p.days} value={String(p.days)}>{p.label}</option>
                  ))}
                  <option value="custom">Custom (days)</option>
                </select>
                {!PERIOD_PRESETS.some((p) => String(p.days) === row.periodDays) && (
                  <input
                    inputMode="numeric"
                    value={row.periodDays}
                    onChange={(e) => update(index, { periodDays: e.target.value.replace(/\D/g, "") })}
                    placeholder="days"
                    className="w-20 rounded-xl border border-neutral-200 px-3 py-3 text-xs"
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">Label</label>
              <input
                value={row.label}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder="Design lead"
                maxLength={64}
                className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              type="button"
              aria-label="Remove row"
              disabled={rows.length === 1}
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              className="mt-6 p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30"
            >
              <Trash2 size={15} />
            </button>
            {submitted && errors[index] && <p className="lg:col-span-5 text-xs text-red-600">{errors[index]}</p>}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <Button
            variant="outlined"
            size="sm"
            icon={<Plus size={13} />}
            disabled={rows.length >= MAX_SCHEDULES_PER_CALL}
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
          >
            Add row ({rows.length}/{MAX_SCHEDULES_PER_CALL})
          </Button>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">First payment</label>
            <input
              type="datetime-local"
              value={firstDue}
              min={toLocalInputValue(new Date(Date.now() + MIN_FIRST_DUE_MS))}
              onChange={(e) => setFirstDue(e.target.value)}
              className="rounded-xl border border-neutral-200 px-3 py-2.5 text-xs"
            />
            {submitted && firstDueError && <p className="text-xs text-red-600 mt-1">{firstDueError}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-neutral-400">Per period, all rows</p>
          <p className="text-sm font-bold text-neutral-900">{total > 0n ? `${formatUsdc(total)} USDC` : "—"}</p>
        </div>
      </div>

      <Button fullWidth disabled={disabled || (submitted && !valid)} onClick={submit}>
        Create {rows.length} schedule{rows.length === 1 ? "" : "s"}
      </Button>
      <p className="text-[11px] text-neutral-400">
        All rows are validated by the contract before any schedule is written; one invalid row rejects the whole transaction.
      </p>
    </div>
  );
}

"use client";
import React, { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import AmountInput from "@/components/ui/AmountInput";
import Button from "@/components/ui/Button";
import {
  MIN_FIRST_DUE_MS,
  rowToScheduleInput,
  toLocalInputValue,
  validateFirstDue,
  validateRow,
  validateRows,
  type ScheduleRowDraft,
} from "@/lib/payroll/validate";
import { formatUsdc, isValidUsdcAmount, parseUsdc } from "@/lib/stellar/amount";
import { MAX_SCHEDULES_PER_CALL, type ScheduleInput } from "@/lib/stellar/payroll";

const PERIOD_PRESETS = [
  { label: "Daily", days: 1 },
  { label: "Weekly", days: 7 },
  { label: "Every 2 weeks", days: 14 },
  { label: "Every 30 days", days: 30 },
];

type Row = ScheduleRowDraft;

const emptyRow = (): Row => ({ recipient: "", amount: "", periodDays: "30", label: "" });

export { validateRow };

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

  const errors = useMemo(() => validateRows(rows, employer), [rows, employer]);
  const firstDueDate = new Date(firstDue);
  const firstDueError = validateFirstDue(firstDue);
  const valid = errors.every((e) => e === null) && !firstDueError && rows.length > 0;
  const total = rows.reduce((sum, row) => (isValidUsdcAmount(row.amount) ? sum + parseUsdc(row.amount) : sum), 0n);

  const update = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const submit = async () => {
    setSubmitted(true);
    if (!valid) return;
    const inputs: ScheduleInput[] = rows.map(rowToScheduleInput);
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

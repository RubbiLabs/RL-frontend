"use client";
import React, { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Trash2, Upload } from "lucide-react";

import Button from "@/components/ui/Button";
import { chunkScheduleInputs, CSV_TEMPLATE, parsePayrollCsv } from "@/lib/payroll/csv";
import { MIN_FIRST_DUE_MS, toLocalInputValue, validateFirstDue } from "@/lib/payroll/validate";
import { formatUsdc } from "@/lib/stellar/amount";
import { shortAddress } from "@/lib/stellar/config";
import { MAX_SCHEDULES_PER_CALL, type ScheduleInput } from "@/lib/stellar/payroll";

export interface BatchRunResult {
  batchIndex: number;
  totalBatches: number;
  startRow: number;
  endRow: number;
  rowCount: number;
  status: "success" | "failed";
  ids?: bigint[];
}

interface Props {
  employer: string | null;
  currentEscrow: bigint | undefined;
  disabled?: boolean;
  onSubmitBatch: (
    inputs: ScheduleInput[],
    firstDue: bigint,
    batchIndex: number,
    totalBatches: number,
  ) => Promise<{ ids: bigint[] } | null>;
}

export default function CsvImport({ employer, currentEscrow, disabled, onSubmitBatch }: Props) {
  const [csvText, setCsvText] = useState("");
  const [firstDue, setFirstDue] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setSeconds(0, 0);
    return toLocalInputValue(tomorrow);
  });
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<BatchRunResult[]>([]);
  const [stoppedAtRow, setStoppedAtRow] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parsed = useMemo(() => (csvText.trim() ? parsePayrollCsv(csvText, employer) : null), [csvText, employer]);
  const firstDueError = validateFirstDue(firstDue);

  const canSubmit =
    Boolean(parsed) &&
    parsed!.headerError === null &&
    parsed!.rows.length > 0 &&
    parsed!.invalidCount === 0 &&
    firstDueError === null &&
    !disabled &&
    batchProgress === null;

  const escrowShortfall =
    parsed && currentEscrow !== undefined && parsed.totalPerPeriod > currentEscrow
      ? parsed.totalPerPeriod - currentEscrow
      : 0n;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setCsvText(content);
    setBatchResults([]);
    setStoppedAtRow(null);
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rubbi-payroll-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const removeRow = (rowIndex: number) => {
    if (!parsed) return;
    const header = "recipient,amount,period_days,label";
    const remaining = parsed.rows
      .filter((_, idx) => idx !== rowIndex)
      .map((r) => {
        const escapedLabel = r.label.includes(",") || r.label.includes('"') || r.label.includes(";")
          ? `"${r.label.replace(/"/g, '""')}"`
          : r.label;
        return `${r.recipient},${r.amount},${r.periodDays},${escapedLabel}`;
      });
    setCsvText(remaining.length > 0 ? [header, ...remaining].join("\n") : "");
    setBatchResults([]);
    setStoppedAtRow(null);
  };

  const submitAllBatches = async () => {
    if (!parsed || !canSubmit) return;
    const firstDueSec = BigInt(Math.floor(new Date(firstDue).getTime() / 1000));
    const batches = chunkScheduleInputs(parsed.rows, MAX_SCHEDULES_PER_CALL);
    const results: BatchRunResult[] = [];
    setBatchResults([]);
    setStoppedAtRow(null);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const startRow = i * MAX_SCHEDULES_PER_CALL + 1;
      const endRow = startRow + batch.length - 1;
      setBatchProgress({ current: i + 1, total: batches.length });

      const outcome = await onSubmitBatch(batch, firstDueSec, i + 1, batches.length);
      if (!outcome) {
        results.push({
          batchIndex: i + 1,
          totalBatches: batches.length,
          startRow,
          endRow,
          rowCount: batch.length,
          status: "failed",
        });
        setBatchResults([...results]);
        setStoppedAtRow(startRow);
        setBatchProgress(null);
        return;
      }

      results.push({
        batchIndex: i + 1,
        totalBatches: batches.length,
        startRow,
        endRow,
        rowCount: batch.length,
        status: "success",
        ids: outcome.ids,
      });
      setBatchResults([...results]);
    }

    setBatchProgress(null);
    setCsvText("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          Upload or paste a UTF-8 CSV with header <code className="font-mono text-neutral-700">recipient,amount,period_days,label</code> (comma or semicolon delimiter).
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outlined"
            size="sm"
            icon={<Upload size={13} />}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose CSV file
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<Download size={13} />}
            onClick={downloadTemplate}
          >
            Download CSV template
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
          CSV content
        </label>
        <textarea
          rows={5}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setBatchResults([]);
            setStoppedAtRow(null);
          }}
          placeholder={"recipient,amount,period_days,label\nGABC...,250.00,30,\"Product designer\""}
          spellCheck={false}
          className="w-full rounded-xl border border-neutral-200 p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {parsed?.headerError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{parsed.headerError}</span>
        </div>
      )}

      {parsed && !parsed.headerError && parsed.rows.length > 0 && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Rows</p>
              <p className="text-sm font-bold text-neutral-900 mt-0.5">
                {parsed.validCount} ok
                {parsed.invalidCount > 0 && (
                  <span className="text-red-600"> · {parsed.invalidCount} invalid</span>
                )}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Transactions needed</p>
              <p className="text-sm font-bold text-neutral-900 mt-0.5">
                {parsed.transactionCount} transaction{parsed.transactionCount === 1 ? "" : "s"}{" "}
                <span className="text-xs font-normal text-neutral-500">(≤ {MAX_SCHEDULES_PER_CALL}/tx)</span>
              </p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">First period required</p>
              <p className="text-sm font-bold text-neutral-900 mt-0.5">{formatUsdc(parsed.totalPerPeriod)} USDC</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Current escrow</p>
              <p className="text-sm font-bold text-neutral-900 mt-0.5">
                {currentEscrow !== undefined ? `${formatUsdc(currentEscrow)} USDC` : "—"}
              </p>
              {escrowShortfall > 0n && (
                <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
                  Short by {formatUsdc(escrowShortfall)} USDC for period 1
                </p>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-3 py-2.5 font-semibold uppercase tracking-widest text-[10px] text-neutral-500">#</th>
                  <th className="px-3 py-2.5 font-semibold uppercase tracking-widest text-[10px] text-neutral-500">Recipient</th>
                  <th className="px-3 py-2.5 font-semibold uppercase tracking-widest text-[10px] text-neutral-500">Amount</th>
                  <th className="px-3 py-2.5 font-semibold uppercase tracking-widest text-[10px] text-neutral-500">Period</th>
                  <th className="px-3 py-2.5 font-semibold uppercase tracking-widest text-[10px] text-neutral-500">Label</th>
                  <th className="px-3 py-2.5 font-semibold uppercase tracking-widest text-[10px] text-neutral-500">Status</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {parsed.rows.map((row, idx) => {
                  const notCreatedAfterStop = stoppedAtRow !== null && row.rowNumber >= stoppedAtRow;
                  return (
                    <tr key={row.rowNumber} className={row.error ? "bg-red-50/40" : ""}>
                      <td className="px-3 py-2 font-mono text-neutral-400">{row.rowNumber}</td>
                      <td className="px-3 py-2 font-mono text-neutral-700" title={row.recipient}>
                        {row.recipient.length > 16 ? shortAddress(row.recipient, 6, 6) : row.recipient || "—"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-neutral-900">{row.amount || "—"} USDC</td>
                      <td className="px-3 py-2 text-neutral-600">{row.periodDays ? `${row.periodDays}d` : "—"}</td>
                      <td className="px-3 py-2 text-neutral-700">{row.label || "—"}</td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                            <AlertCircle size={13} className="shrink-0" />
                            {row.error}
                          </span>
                        ) : notCreatedAfterStop ? (
                          <span className="text-amber-700 font-semibold">Not created (batch stopped)</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                            <CheckCircle2 size={13} className="shrink-0" />
                            ok
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          aria-label={`Remove row ${row.rowNumber}`}
                          onClick={() => removeRow(idx)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {batchProgress && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs font-semibold text-primary flex items-center gap-2">
          <FileSpreadsheet size={15} />
          <span>
            Submitting batch {batchProgress.current} of {batchProgress.total} (wallet signature required for each batch)…
          </span>
        </div>
      )}

      {batchResults.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2 text-xs">
          <p className="font-bold text-neutral-900">Batch results</p>
          <ul className="space-y-1">
            {batchResults.map((b) => (
              <li key={b.batchIndex} className="flex items-center justify-between">
                <span>
                  Batch {b.batchIndex} of {b.totalBatches} (rows {b.startRow}–{b.endRow}):
                </span>
                {b.status === "success" ? (
                  <span className="text-green-700 font-semibold">
                    created {b.rowCount} schedule{b.rowCount === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold">
                    failed — rows {b.startRow}–{parsed?.rows.length ?? b.endRow} were not created
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
            First payment
          </label>
          <input
            type="datetime-local"
            value={firstDue}
            min={toLocalInputValue(new Date(Date.now() + MIN_FIRST_DUE_MS))}
            onChange={(e) => setFirstDue(e.target.value)}
            className="rounded-xl border border-neutral-200 px-3 py-2.5 text-xs"
          />
          {firstDueError && <p className="text-xs text-red-600 mt-1">{firstDueError}</p>}
        </div>

        <Button fullWidth disabled={!canSubmit} onClick={submitAllBatches}>
          {parsed && parsed.rows.length > 0
            ? `Create ${parsed.rows.length} schedule${parsed.rows.length === 1 ? "" : "s"} (${parsed.transactionCount} transaction${parsed.transactionCount === 1 ? "" : "s"})`
            : "Import CSV schedules"}
        </Button>
      </div>
    </div>
  );
}

import { StrKey } from "@stellar/stellar-sdk";

import { isValidUsdcAmount, parseUsdc } from "../stellar/amount.ts";
import type { ScheduleInput } from "../stellar/payroll";

export type { ScheduleInput };
export const MAX_SCHEDULES_PER_CALL = 25;
export const DAY_SECONDS = 86_400;
export const MIN_PERIOD_DAYS = 1;
export const MAX_PERIOD_DAYS = 366;
export const MAX_LABEL_BYTES = 64;
export const MIN_FIRST_DUE_MS = 10 * 60 * 1000;

export interface ScheduleRowDraft {
  recipient: string;
  amount: string;
  periodDays: string;
  label: string;
}

export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function validateFirstDue(firstDue: string, nowMs = Date.now()): string | null {
  const firstDueDate = new Date(firstDue);
  if (Number.isNaN(firstDueDate.getTime())) {
    return "Pick a first payment date.";
  }
  if (firstDueDate.getTime() < nowMs + MIN_FIRST_DUE_MS) {
    return "The first payment must be at least 10 minutes in the future.";
  }
  return null;
}

export function validateRow(row: ScheduleRowDraft, employer: string | null): string | null {
  const recipient = row.recipient.trim();
  if (!StrKey.isValidEd25519PublicKey(recipient)) {
    return "Recipient must be a Stellar account (G…).";
  }
  if (recipient === employer) {
    return "The recipient cannot be the employer.";
  }
  if (!isValidUsdcAmount(row.amount)) {
    return "Amount must be a positive USDC amount (max 7 decimals).";
  }
  const periodTrimmed = row.periodDays.trim();
  const days = Number(periodTrimmed);
  if (!periodTrimmed || !Number.isInteger(days) || days < MIN_PERIOD_DAYS || days > MAX_PERIOD_DAYS) {
    return `Period must be between ${MIN_PERIOD_DAYS} and ${MAX_PERIOD_DAYS} days.`;
  }
  const labelBytes = new TextEncoder().encode(row.label).length;
  if (labelBytes > MAX_LABEL_BYTES) {
    return `Label is ${labelBytes} bytes; the maximum is ${MAX_LABEL_BYTES}.`;
  }
  return null;
}

/**
 * Validates a list of schedule rows, including duplicate-recipient detection
 * across rows.
 */
export function validateRows(rows: ScheduleRowDraft[], employer: string | null): Array<string | null> {
  const seenRecipients = new Map<string, number>();
  return rows.map((row, index) => {
    const baseError = validateRow(row, employer);
    if (baseError) return baseError;

    const recipient = row.recipient.trim();
    const firstSeenIndex = seenRecipients.get(recipient);
    if (firstSeenIndex !== undefined) {
      return `Duplicate recipient (already listed on row ${firstSeenIndex + 1}).`;
    }
    seenRecipients.set(recipient, index);
    return null;
  });
}

export function rowToScheduleInput(row: ScheduleRowDraft): ScheduleInput {
  return {
    recipient: row.recipient.trim(),
    amount: parseUsdc(row.amount),
    period: BigInt(Number(row.periodDays.trim()) * DAY_SECONDS),
    label: row.label.trim(),
  };
}

import { formatUsdcDecimal } from "../stellar/amount.ts";
import type { ApiTransaction } from "../../types/api";

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Vault deposit",
  WITHDRAWAL: "Vault withdrawal",
  CARD_SPEND_SETTLED: "Card load settled",
  REFUND: "Refund",
  CARD_LOAD: "Card load",
  CARD_UNLOAD: "Card unload",
  CARD_PURCHASE: "Card purchase",
  CARD_REFUND: "Card refund",
  SUBSCRIPTION_PAYMENT: "Subscription charge",
  PAYROLL_FUNDED: "Payroll escrow funded",
  PAYROLL_DISBURSED: "Payroll payout",
};

export interface HistoryFilters {
  account: "ALL" | "WALLET" | "CARD";
  types: string[];
  from: string; // YYYY-MM-DD or ""
  to: string; // YYYY-MM-DD or ""
  query: string;
  page: number;
  pageSize: number;
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  account: "ALL",
  types: [],
  from: "",
  to: "",
  query: "",
  page: 1,
  pageSize: 20,
};

export function parseHistoryFiltersFromSearchParams(params: {
  get: (key: string) => string | null;
}): HistoryFilters {
  const accountRaw = params.get("account")?.toUpperCase();
  const account = accountRaw === "WALLET" || accountRaw === "CARD" ? accountRaw : "ALL";
  const typesRaw = params.get("types") ?? "";
  const types = typesRaw
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  const from = params.get("from")?.trim() ?? "";
  const to = params.get("to")?.trim() ?? "";
  const query = params.get("q")?.trim() ?? "";
  const pageNum = Number(params.get("page") ?? "1");
  const page = Number.isInteger(pageNum) && pageNum >= 1 ? pageNum : 1;
  const sizeNum = Number(params.get("pageSize") ?? "20");
  const pageSize = [10, 20, 50, 100].includes(sizeNum) ? sizeNum : 20;

  return { account, types, from, to, query, page, pageSize };
}

export function buildHistorySearchParams(filters: HistoryFilters): string {
  const qs = new URLSearchParams();
  if (filters.account !== "ALL") qs.set("account", filters.account);
  if (filters.types.length > 0) qs.set("types", filters.types.join(","));
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  if (filters.query.trim()) qs.set("q", filters.query.trim());
  if (filters.page > 1) qs.set("page", String(filters.page));
  if (filters.pageSize !== 20) qs.set("pageSize", String(filters.pageSize));
  return qs.toString();
}

export function extractTxHash(tx: ApiTransaction): string | null {
  if (!tx.metadata || typeof tx.metadata !== "object") return null;
  const hash = (tx.metadata as { txHash?: unknown }).txHash;
  return typeof hash === "string" && hash.trim().length > 0 ? hash.trim() : null;
}

export function isInformationalTx(tx: ApiTransaction): boolean {
  return Boolean(tx.metadata && (tx.metadata as { informational?: boolean }).informational);
}

/**
 * Formats a signed API decimal amount with exact string/bigint precision (no floating point).
 */
export function formatSignedUsdc(amount: string, maxDecimals = 7): string {
  const trimmed = amount.trim();
  const negative = trimmed.startsWith("-");
  const formatted = formatUsdcDecimal(trimmed, { minDecimals: 2, maxDecimals });
  if (negative) return formatted;
  return `+${formatted}`;
}

/**
 * Applies client-side filtering on fetched transactions.
 */
export function filterTransactions(items: ApiTransaction[], filters: HistoryFilters): ApiTransaction[] {
  const typeSet = new Set(filters.types.map((t) => t.toUpperCase()));
  const fromMs = filters.from ? new Date(`${filters.from}T00:00:00.000Z`).getTime() : null;
  const toMs = filters.to ? new Date(`${filters.to}T23:59:59.999Z`).getTime() : null;
  const needle = filters.query.trim().toLowerCase();

  return items.filter((tx) => {
    if (filters.account !== "ALL" && tx.account !== filters.account) return false;
    if (typeSet.size > 0 && !typeSet.has(tx.type.toUpperCase())) return false;

    const createdMs = new Date(tx.createdAt).getTime();
    if (fromMs !== null && !Number.isNaN(fromMs) && createdMs < fromMs) return false;
    if (toMs !== null && !Number.isNaN(toMs) && createdMs > toMs) return false;

    if (needle) {
      const label = (TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type).toLowerCase();
      const desc = tx.description.toLowerCase();
      const txHash = (extractTxHash(tx) ?? "").toLowerCase();
      if (!desc.includes(needle) && !label.includes(needle) && !txHash.includes(needle)) {
        return false;
      }
    }

    return true;
  });
}

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Exports filtered transactions to a RFC 4180 CSV string with exact 7-decimal string formatting
 * (zero floating-point math).
 */
export function transactionsToCsv(items: ApiTransaction[]): string {
  const header = ["date", "type", "account", "description", "amount_usdc", "balance_after_usdc", "tx_hash"].join(",");
  const rows = items.map((tx) => {
    const info = isInformationalTx(tx);
    const amountStr = formatSignedUsdc(tx.amount, 7);
    const balanceAfterStr = info ? "" : formatUsdcDecimal(tx.balanceAfter, { minDecimals: 2, maxDecimals: 7 });
    const txHash = extractTxHash(tx) ?? "";

    return [
      escapeCsvCell(tx.createdAt),
      escapeCsvCell(tx.type),
      escapeCsvCell(tx.account),
      escapeCsvCell(tx.description),
      escapeCsvCell(amountStr),
      escapeCsvCell(balanceAfterStr),
      escapeCsvCell(txHash),
    ].join(",");
  });

  return [header, ...rows].join("\n") + "\n";
}

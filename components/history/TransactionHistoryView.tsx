"use client";
import React, { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, ExternalLink, RotateCcw, Search } from "lucide-react";

import Button from "@/components/ui/Button";
import SectionCard, { EmptyState, formatDate } from "@/components/ui/SectionCard";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useTransactions } from "@/hooks/useApi";
import { apiErrorMessage } from "@/lib/api";
import {
  buildHistorySearchParams,
  DEFAULT_HISTORY_FILTERS,
  extractTxHash,
  filterTransactions,
  formatSignedUsdc,
  isInformationalTx,
  parseHistoryFiltersFromSearchParams,
  TRANSACTION_TYPE_LABELS,
  transactionsToCsv,
  type HistoryFilters,
} from "@/lib/history/transactions";
import { formatUsdcDecimal } from "@/lib/stellar/amount";
import { explorerTxUrl, shortAddress } from "@/lib/stellar/config";
import { TRANSACTION_TYPES } from "@/types/api";

export default function TransactionHistoryView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { config } = useStellarWallet();

  const filters = useMemo(
    () => parseHistoryFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  // When client-side filters (type, date range, text query) are active, we fetch a larger page
  // from GET /transactions so client-side filtering and pagination work smoothly without backend changes.
  const hasClientFilter =
    filters.types.length > 0 || Boolean(filters.from) || Boolean(filters.to) || Boolean(filters.query.trim());

  const apiAccount = filters.account === "ALL" ? undefined : filters.account;
  const query = useTransactions({
    account: apiAccount,
    page: hasClientFilter ? 1 : filters.page,
    pageSize: hasClientFilter ? 200 : filters.pageSize,
  });

  const updateFilters = (patch: Partial<HistoryFilters>) => {
    const next: HistoryFilters = {
      ...filters,
      ...patch,
      page: patch.page ?? 1,
    };
    const qs = buildHistorySearchParams(next);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const toggleType = (type: string) => {
    const exists = filters.types.includes(type);
    const nextTypes = exists ? filters.types.filter((t) => t !== type) : [...filters.types, type];
    updateFilters({ types: nextTypes });
  };

  const resetFilters = () => {
    router.replace(pathname, { scroll: false });
  };

  const allMatching = useMemo(() => {
    if (!query.data) return [];
    return filterTransactions(query.data.items, filters);
  }, [query.data, filters]);

  const totalItems = hasClientFilter ? allMatching.length : (query.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));

  const visibleItems = useMemo(() => {
    if (!hasClientFilter) return allMatching;
    const start = (filters.page - 1) * filters.pageSize;
    return allMatching.slice(start, start + filters.pageSize);
  }, [allMatching, filters.page, filters.pageSize, hasClientFilter]);

  const handleExportCsv = () => {
    const csvContent = transactionsToCsv(allMatching);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rubbi-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasAnyFilter =
    filters.account !== DEFAULT_HISTORY_FILTERS.account ||
    filters.types.length > 0 ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    Boolean(filters.query.trim());

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900">Transaction history</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Unified ledger across your Rubbi wallet and card, with filters and CSV export for bookkeeping.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasAnyFilter && (
            <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={resetFilters}>
              Reset filters
            </Button>
          )}
          <Button
            variant="outlined"
            size="sm"
            icon={<Download size={14} />}
            disabled={allMatching.length === 0}
            onClick={handleExportCsv}
          >
            Export CSV ({allMatching.length})
          </Button>
        </div>
      </div>

      <SectionCard title="Filters" subtitle="Filter state is synced to the URL so you can bookmark or share a view">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                Account
              </label>
              <select
                value={filters.account}
                onChange={(e) => updateFilters({ account: e.target.value as HistoryFilters["account"] })}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs bg-white"
              >
                <option value="ALL">All accounts</option>
                <option value="WALLET">Rubbi wallet</option>
                <option value="CARD">Virtual card</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                From date
              </label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => updateFilters({ from: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                To date
              </label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => updateFilters({ to: e.target.value })}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                Search description
              </label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={filters.query}
                  onChange={(e) => updateFilters({ query: e.target.value })}
                  placeholder="Merchant, memo, hash…"
                  className="w-full rounded-xl border border-neutral-200 pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                Rows per page
              </label>
              <select
                value={String(filters.pageSize)}
                onChange={(e) => updateFilters({ pageSize: Number(e.target.value) })}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-xs bg-white"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={String(size)}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
              Transaction types (multi-select)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TRANSACTION_TYPES.map((type) => {
                const selected = filters.types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-primary/40"
                    }`}
                  >
                    {TRANSACTION_TYPE_LABELS[type] ?? type}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Ledger entries"
        subtitle={`${totalItems} matching row${totalItems === 1 ? "" : "s"}`}
      >
        {query.isLoading && <p className="text-sm text-neutral-400">Loading ledger history…</p>}
        {query.isError && <p className="text-sm text-red-600">{apiErrorMessage(query.error)}</p>}
        {!query.isLoading && !query.isError && visibleItems.length === 0 && (
          <EmptyState title="No matching transactions">
            {hasAnyFilter ? "Try clearing or widening your filters." : "Your wallet and card transactions will appear here."}
          </EmptyState>
        )}

        {!query.isLoading && !query.isError && visibleItems.length > 0 && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left">
                <thead className="bg-neutral-50 border-b border-neutral-100">
                  <tr>
                    {["Date", "Type", "Account", "Description", "Amount", "Balance after", "On-chain tx"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-primary-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {visibleItems.map((tx) => {
                    const positive = !tx.amount.startsWith("-");
                    const info = isInformationalTx(tx);
                    const txHash = extractTxHash(tx);
                    return (
                      <tr key={tx.id} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="px-4 py-3 text-xs text-neutral-600 whitespace-nowrap">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-neutral-900">
                          {TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type}
                          {info && (
                            <span className="ml-1.5 inline-block rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                              on-chain only
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600">
                          {tx.account === "WALLET" ? "Rubbi wallet" : "Card"}
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-700 max-w-xs truncate" title={tx.description}>
                          {tx.description}
                        </td>
                        <td
                          className={`px-4 py-3 text-xs font-bold whitespace-nowrap ${
                            info ? "text-neutral-400" : positive ? "text-green-600" : "text-neutral-800"
                          }`}
                        >
                          {formatSignedUsdc(tx.amount, 7)} USDC
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-neutral-600 whitespace-nowrap">
                          {info ? "—" : `${formatUsdcDecimal(tx.balanceAfter, { minDecimals: 2, maxDecimals: 7 })} USDC`}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {txHash && config ? (
                            <a
                              href={explorerTxUrl(config, txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
                            >
                              {shortAddress(txHash, 6, 6)} <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs text-neutral-600">
              <span>
                Page {filters.page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outlined"
                  disabled={filters.page <= 1}
                  onClick={() => updateFilters({ page: filters.page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outlined"
                  disabled={filters.page >= totalPages}
                  onClick={() => updateFilters({ page: filters.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

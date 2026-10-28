"use client";
import React from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Calendar, CreditCard, RefreshCw, Users, Wallet } from "lucide-react";

import StatsCard from "@/components/dashboard/StatsCard";
import SectionCard, { EmptyState, formatDate } from "@/components/ui/SectionCard";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useDashboardStats } from "@/hooks/useApi";
import { apiErrorMessage } from "@/lib/api";
import { formatUsdcDecimal } from "@/lib/stellar/amount";
import type { ApiTransaction } from "@/types/api";

const TYPE_LABELS: Record<string, string> = {
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

export function TransactionRow({ tx }: { tx: ApiTransaction }) {
  const positive = !tx.amount.startsWith("-");
  const informational = Boolean(tx.metadata && (tx.metadata as { informational?: boolean }).informational);
  return (
    <div className="flex items-start gap-3 py-3 border-b border-neutral-100 last:border-0">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          positive ? "bg-green-50 text-green-600" : "bg-neutral-100 text-neutral-600"
        }`}
      >
        {positive ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-neutral-800 truncate">
            {TYPE_LABELS[tx.type] ?? tx.type.replace(/_/g, " ").toLowerCase()}
          </p>
          <p className={`text-sm font-bold shrink-0 ${informational ? "text-neutral-400" : positive ? "text-green-600" : "text-neutral-700"}`}>
            {positive ? "+" : ""}
            {formatUsdcDecimal(tx.amount)} USDC
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-neutral-400 truncate">
            {tx.account === "WALLET" ? "Rubbi wallet" : "Card"} · {tx.description}
            {informational && " · on-chain only"}
          </p>
          <p className="text-[11px] text-neutral-400 shrink-0">{formatDate(tx.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, config } = useStellarWallet();
  const stats = useDashboardStats();
  const data = stats.data;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900">Overview</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {user?.username ? `Hi @${user.username}. ` : ""}Your balances, subscriptions and payroll at a glance, from Rubbi&apos;s
            indexer.
          </p>
        </div>
        {config && (
          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Stellar {config.network}</span>
          </div>
        )}
      </div>

      {stats.isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{apiErrorMessage(stats.error)}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          label="Rubbi wallet"
          value={data ? `${formatUsdcDecimal(data.walletBalance)}` : "—"}
          sub="USDC in the vault, withdrawable"
          icon={<Wallet size={14} className="text-primary" />}
          highlight
        />
        <StatsCard
          label="Card balance"
          value={data ? `${formatUsdcDecimal(data.cardBalance)}` : "—"}
          sub="USDC loaded on your card"
          icon={<CreditCard size={14} className="text-primary" />}
        />
        <StatsCard
          label="Subscriptions"
          value={data ? String(data.activeSubscriptions) : "—"}
          sub={data && data.pastDueSubscriptions > 0 ? `${data.pastDueSubscriptions} past due` : "active plans"}
          icon={<RefreshCw size={14} className="text-primary" />}
        />
        <StatsCard
          label="Payroll"
          value={data ? String(data.activeSchedules) : "—"}
          sub={data ? `${data.incomingSchedules} paying you` : "active schedules"}
          icon={<Users size={14} className="text-primary" />}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard title="Recent activity" subtitle="Last 10 ledger rows across both balances" className="lg:col-span-2">
          {stats.isLoading && <p className="text-sm text-neutral-400">Loading…</p>}
          {data && data.recentTransactions.length === 0 && (
            <EmptyState title="No activity yet">Deposit USDC on the Wallet page to get started.</EmptyState>
          )}
          {data?.recentTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
        </SectionCard>

        <SectionCard title="Quick actions">
          <div className="space-y-2">
            {[
              { href: "/dashboard/wallet", label: "Deposit or withdraw USDC", icon: <Wallet size={15} /> },
              { href: "/dashboard/card", label: "Load your card", icon: <CreditCard size={15} /> },
              { href: "/dashboard/subscriptions", label: "Subscribe to a plan", icon: <Calendar size={15} /> },
              { href: "/dashboard/payroll", label: "Run payroll", icon: <Users size={15} /> },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 hover:border-primary/40 hover:text-primary transition-colors"
              >
                {a.icon} {a.label}
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

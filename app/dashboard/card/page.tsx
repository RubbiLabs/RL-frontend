"use client";
import React, { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Eye, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

import { TransactionRow } from "@/app/dashboard/page";
import CardVisual from "@/components/card/CardVisual";
import MockBadge from "@/components/card/MockBadge";
import AmountInput from "@/components/ui/AmountInput";
import Button from "@/components/ui/Button";
import SectionCard, { EmptyState, formatDate } from "@/components/ui/SectionCard";
import StatusPill from "@/components/ui/StatusPill";
import TxLink from "@/components/ui/TxLink";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useToast } from "@/context/ToastContext";
import { useApiKeys, useCard, useCardMovements, useTransactions } from "@/hooks/useApi";
import { api, ApiError, apiErrorMessage } from "@/lib/api";
import { formatUsdcDecimal, isValidUsdcAmount, parseUsdc } from "@/lib/stellar/amount";
import type { ApiCardMovement } from "@/types/api";

const STATUS_HELP: Record<ApiCardMovement["status"], string> = {
  PENDING: "Queued. Loads: the operator settles the amount on-chain first. Unloads: the issuer defunds the card.",
  SETTLED: "Settled on-chain (settle_card_spend). The issuer is funding the card.",
  PENDING_TREASURY: "The card was defunded; the treasury operator still has to credit your vault (credit_refund).",
  COMPLETED: "Done. Both balances are updated.",
  FAILED: "Failed. A failed load after settlement is refunded by a compensating unload.",
};

function inFlight(movements: ApiCardMovement[] | undefined, direction: ApiCardMovement["direction"]): bigint {
  if (!movements) return 0n;
  return movements
    .filter((m) => m.direction === direction && (m.status === "PENDING" || m.status === "SETTLED" || m.status === "PENDING_TREASURY"))
    .reduce((sum, m) => sum + parseUsdc(m.amount), 0n);
}

export default function CardPage() {
  const { user } = useStellarWallet();
  const queryClient = useQueryClient();
  const keys = useApiKeys();
  const card = useCard();
  const movements = useCardMovements();
  const cardTxs = useTransactions({ account: "CARD", pageSize: 10 });
  const { success, error, info } = useToast();

  const [loadAmount, setLoadAmount] = useState("");
  const [unloadAmount, setUnloadAmount] = useState("");
  const [busy, setBusy] = useState<"load" | "unload" | "freeze" | "reveal" | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: keys.card });
    void queryClient.invalidateQueries({ queryKey: keys.movements });
    void queryClient.invalidateQueries({ queryKey: keys.me });
    void queryClient.invalidateQueries({ queryKey: keys.stats });
    void queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  if (card.isError && card.error instanceof ApiError && card.error.status === 404) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900">Card</h1>
        <div className="bg-white rounded-3xl border border-neutral-100 p-8 max-w-2xl">
          <h2 className="text-xl font-extrabold text-neutral-900">No card yet</h2>
          <p className="text-sm text-neutral-500 mt-2">Your card is created when you choose a username.</p>
          <Link href="/onboarding" className="inline-block mt-4">
            <Button>Finish onboarding</Button>
          </Link>
        </div>
      </div>
    );
  }

  const data = card.data;
  const walletAvailable = data ? parseUsdc(data.walletBalance) - inFlight(movements.data, "LOAD") : 0n;
  const cardAvailable = data ? parseUsdc(data.cardBalance) - inFlight(movements.data, "UNLOAD") : 0n;
  const frozen = data?.status.toUpperCase() === "FROZEN";

  const move = async (direction: "load" | "unload") => {
    const amount = direction === "load" ? loadAmount.trim() : unloadAmount.trim();
    if (!isValidUsdcAmount(amount)) return;
    setBusy(direction);
    try {
      const movement = direction === "load" ? await api.cards.load(amount) : await api.cards.unload(amount);
      success(direction === "load" ? "Card load queued" : "Card unload queued", `Movement ${movement.id.slice(0, 8)}… is ${movement.status}.`);
      if (direction === "load") setLoadAmount("");
      else setUnloadAmount("");
      refresh();
    } catch (err) {
      error(direction === "load" ? "Load rejected" : "Unload rejected", apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const toggleFreeze = async () => {
    setBusy("freeze");
    try {
      if (frozen) {
        await api.cards.unfreeze();
        success("Card unfrozen");
      } else {
        await api.cards.freeze();
        info("Card frozen", "Purchases are declined until you unfreeze it.");
      }
      refresh();
    } catch (err) {
      error("Card update failed", apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const revealNumber = async () => {
    setBusy("reveal");
    try {
      const result = await api.cards.reveal();
      setReveal(result.pan ?? (result.issuer === "MOCK" ? "Mock cards have no real card number." : "Not available."));
    } catch (err) {
      error("Reveal failed", apiErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 flex items-center gap-3">
            Card {data?.issuer === "MOCK" && <MockBadge />}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Card data comes from Rubbi&apos;s backend and the card issuer. Load it from your Rubbi wallet; unload back any time.
          </p>
        </div>
        {data && (
          <Button
            size="md"
            variant={frozen ? "primary" : "danger"}
            icon={frozen ? <RefreshCw size={15} /> : <ShieldAlert size={15} />}
            loading={busy === "freeze"}
            onClick={toggleFreeze}
          >
            {frozen ? "Unfreeze card" : "Freeze card"}
          </Button>
        )}
      </div>

      {card.isError && !(card.error instanceof ApiError && card.error.status === 404) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{apiErrorMessage(card.error)}</div>
      )}

      {data && (
        <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          <div className="space-y-6">
            <div className="flex flex-col 2xl:flex-row gap-6">
              <CardVisual card={data} holder={user?.username ? `@${user.username}` : "Rubbi user"} />
              <div className="bg-white rounded-3xl border border-neutral-100 p-6 space-y-4 shadow-sm flex-1">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${frozen ? "bg-amber-100" : "bg-green-100"}`}>
                    {frozen ? <ShieldAlert size={20} className="text-amber-600" /> : <ShieldCheck size={20} className="text-green-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{frozen ? "Card is frozen" : "Card is active"}</p>
                    <p className="text-xs text-neutral-500">
                      Issuer {data.issuer}
                      {data.issuer === "MOCK" && " — deterministic test card, no real PAN or CVV exists"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Card balance</p>
                    <p className="text-xl font-extrabold text-neutral-900">{formatUsdcDecimal(data.cardBalance)} USDC</p>
                  </div>
                  <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Rubbi wallet</p>
                    <p className="text-xl font-extrabold text-neutral-900">{formatUsdcDecimal(data.walletBalance)} USDC</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Card number</p>
                    <Button size="sm" variant="ghost" icon={<Eye size={13} />} loading={busy === "reveal"} onClick={revealNumber}>
                      Reveal
                    </Button>
                  </div>
                  <p className="font-mono text-sm text-neutral-800">{reveal ?? `•••• •••• •••• ${data.last4}`}</p>
                </div>
              </div>
            </div>

            <SectionCard title="Load and unload" subtitle="Loads settle on-chain through the vault before the card is funded; unloads refund the vault from the treasury.">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <AmountInput label="Load card" value={loadAmount} onChange={setLoadAmount} max={walletAvailable > 0n ? walletAvailable : 0n} />
                  <Button
                    fullWidth
                    icon={<ArrowDownToLine size={15} />}
                    loading={busy === "load"}
                    disabled={!isValidUsdcAmount(loadAmount) || parseUsdc(loadAmount || "0") > walletAvailable}
                    onClick={() => move("load")}
                  >
                    Load from Rubbi wallet
                  </Button>
                </div>
                <div className="space-y-3">
                  <AmountInput label="Unload card" value={unloadAmount} onChange={setUnloadAmount} max={cardAvailable > 0n ? cardAvailable : 0n} />
                  <Button
                    fullWidth
                    variant="outlined"
                    icon={<ArrowUpFromLine size={15} />}
                    loading={busy === "unload"}
                    disabled={!isValidUsdcAmount(unloadAmount) || parseUsdc(unloadAmount || "0") > cardAvailable}
                    onClick={() => move("unload")}
                  >
                    Unload to Rubbi wallet
                  </Button>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Card ledger" subtitle="Purchases, refunds, loads and unloads on the card balance">
              {cardTxs.data && cardTxs.data.items.length === 0 && <EmptyState title="No card activity yet" />}
              {cardTxs.data?.items.map((row) => <TransactionRow key={row.id} tx={row} />)}
            </SectionCard>
          </div>

          <SectionCard
            title="Movements"
            subtitle="Newest first; refreshes every 5 s while one is in progress"
            action={
              <Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={() => void movements.refetch()}>
                Refresh
              </Button>
            }
          >
            {movements.data && movements.data.length === 0 && <EmptyState title="No loads or unloads yet" />}
            <div className="space-y-3">
              {movements.data?.map((m) => (
                <div key={m.id} className="rounded-xl border border-neutral-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-neutral-900">
                      {m.direction === "LOAD" ? "Load" : "Unload"} {formatUsdcDecimal(m.amount)} USDC
                    </p>
                    <StatusPill status={m.status} title={STATUS_HELP[m.status]} />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">{STATUS_HELP[m.status]}</p>
                  {m.failureReason && <p className="text-[11px] text-red-600 mt-1">{m.failureReason}</p>}
                  <div className="flex items-center justify-between mt-2 text-[11px] text-neutral-400">
                    <span>{formatDate(m.completedAt ?? m.settledAt ?? m.createdAt)}</span>
                    {m.txHash && <TxLink hash={m.txHash} />}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

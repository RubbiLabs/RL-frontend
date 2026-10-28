"use client";
import React, { useState } from "react";
import { ArrowDownRight, ArrowUpRight, CheckCircle, Droplets, ExternalLink, ShieldCheck } from "lucide-react";

import { TransactionRow } from "@/app/dashboard/page";
import AmountInput from "@/components/ui/AmountInput";
import Button from "@/components/ui/Button";
import SectionCard, { EmptyState } from "@/components/ui/SectionCard";
import SwapCard from "@/components/wallet/SwapCard";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useInvalidateAfterTx, useMe, useTransactions } from "@/hooks/useApi";
import { useAccountState, useUsdcAsset, useVaultBalance } from "@/hooks/useChain";
import { useStellarTx } from "@/hooks/useStellarTx";
import { enableUsdcTrustline } from "@/lib/stellar/account";
import { formatUsdc, formatUsdcDecimal, formatXlm, parseUsdc, tryParseUsdc } from "@/lib/stellar/amount";
import { CIRCLE_FAUCET_URL, explorerAccountUrl, friendbotUrl, stellarLabFundUrl } from "@/lib/stellar/config";
import { depositToVault, withdrawFromVault } from "@/lib/stellar/vault";

export default function WalletPage() {
  const { address, config } = useStellarWallet();
  const asset = useUsdcAsset();
  const account = useAccountState();
  const vault = useVaultBalance();
  const me = useMe();
  const walletTxs = useTransactions({ account: "WALLET", pageSize: 10 });
  const tx = useStellarTx();
  const invalidate = useInvalidateAfterTx();

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const isTestnet = config?.network === "testnet";
  const state = account.data;
  const usdcWallet = state?.usdc.hasTrustline ? state.usdc.balance : 0n;

  const refreshChain = () => {
    void account.refetch();
    void vault.refetch();
    invalidate([["me", address], ["transactions", address]]);
  };

  const handleEnableUsdc = async () => {
    if (!asset.data) return;
    const result = await tx.run(
      { title: "Enable USDC", description: "Adds a USDC trustline to your Stellar account.", successTitle: "USDC enabled" },
      ({ config: cfg, address: addr, sign }) => enableUsdcTrustline(cfg, asset.data!, { source: addr, sign }),
    );
    if (result) refreshChain();
  };

  const handleDeposit = async () => {
    const amount = tryParseUsdc(depositAmount);
    if (!amount) return;
    const result = await tx.run(
      { title: "Deposit to Rubbi wallet", description: `Moving ${formatUsdc(amount)} USDC into the vault.`, successTitle: "Deposit confirmed" },
      ({ config: cfg, address: addr, sign }) => depositToVault(cfg, { user: addr, amount }, { sign }),
    );
    if (result) {
      setDepositAmount("");
      refreshChain();
    }
  };

  const handleWithdraw = async () => {
    const amount = tryParseUsdc(withdrawAmount);
    if (!amount) return;
    const result = await tx.run(
      { title: "Withdraw from Rubbi wallet", description: `Moving ${formatUsdc(amount)} USDC back to your wallet.`, successTitle: "Withdrawal confirmed" },
      ({ config: cfg, address: addr, sign }) => withdrawFromVault(cfg, { user: addr, amount }, { sign }),
    );
    if (result) {
      setWithdrawAmount("");
      refreshChain();
    }
  };

  const canDeposit = Boolean(state?.usdc.hasTrustline) && tryParseUsdc(depositAmount) !== null && parseUsdc(depositAmount || "0") <= usdcWallet;
  const canWithdraw = tryParseUsdc(withdrawAmount) !== null && vault.data !== undefined && parseUsdc(withdrawAmount || "0") <= vault.data;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-neutral-900">Wallet</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Your Stellar account, the USDC trustline and your Rubbi wallet (the on-chain vault that funds your card).
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SectionCard
          title="Stellar account"
          subtitle={address ?? ""}
          action={
            address && config ? (
              <a
                href={explorerAccountUrl(config, address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
              >
                stellar.expert <ExternalLink size={11} />
              </a>
            ) : null
          }
        >
          {account.isLoading && <p className="text-sm text-neutral-400">Reading the ledger…</p>}
          {account.isError && <p className="text-sm text-red-600">Could not read your account from the RPC.</p>}
          {state && !state.exists && (
            <div className="space-y-3">
              <p className="text-sm text-neutral-700 font-semibold">This account is not funded yet.</p>
              <p className="text-xs text-neutral-500">
                A Stellar account needs a small XLM balance before it can hold USDC or sign transactions.
              </p>
              {isTestnet && address && (
                <div className="flex flex-wrap gap-2">
                  <a href={friendbotUrl(address)} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" icon={<Droplets size={14} />}>Fund with Friendbot</Button>
                  </a>
                  <a href={stellarLabFundUrl(address)} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outlined">Stellar Lab</Button>
                  </a>
                  <Button size="sm" variant="ghost" onClick={() => void account.refetch()}>
                    Re-check
                  </Button>
                </div>
              )}
            </div>
          )}
          {state?.exists && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-neutral-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">XLM</p>
                  <p className="text-lg font-extrabold text-neutral-900">{formatXlm(state.xlmStroops)}</p>
                </div>
                <div className="rounded-xl bg-neutral-50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">USDC in wallet</p>
                  <p className="text-lg font-extrabold text-neutral-900">
                    {state.usdc.hasTrustline ? formatUsdc(state.usdc.balance) : "—"}
                  </p>
                </div>
              </div>

              {state.usdc.hasTrustline ? (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <ShieldCheck size={16} /> USDC trustline enabled
                  {!state.usdc.authorized && <span className="text-xs text-red-600">(frozen by the issuer)</span>}
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-amber-900">USDC is not enabled on this account</p>
                  <p className="text-xs text-amber-800">
                    Stellar accounts opt in to each asset. One signature adds the USDC trustline
                    {asset.data ? ` (issuer ${asset.data.getIssuer()?.slice(0, 6)}…)` : ""}.
                  </p>
                  <Button size="sm" icon={<CheckCircle size={14} />} loading={tx.isRunning} disabled={!asset.data} onClick={handleEnableUsdc}>
                    Enable USDC
                  </Button>
                </div>
              )}

              {isTestnet && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <a href={CIRCLE_FAUCET_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    Get testnet USDC from Circle&apos;s faucet <ExternalLink size={11} />
                  </a>
                  {address && (
                    <a href={friendbotUrl(address)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      Get testnet XLM (Friendbot) <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Rubbi wallet (vault)" subtitle="Withdrawable at any time, even while the vault is paused">
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl bg-primary text-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">On-chain balance</p>
              <p className="text-lg font-extrabold">{vault.data !== undefined ? formatUsdc(vault.data) : "—"}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Rubbi mirror</p>
              <p className="text-lg font-extrabold text-neutral-900">{me.data ? formatUsdcDecimal(me.data.walletBalance) : "—"}</p>
              <p className="text-[10px] text-neutral-400">updates when the indexer sees your deposit</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <AmountInput label="Deposit" value={depositAmount} onChange={setDepositAmount} max={state?.usdc.hasTrustline ? usdcWallet : null} />
              <Button fullWidth icon={<ArrowDownRight size={15} />} disabled={!canDeposit || tx.isRunning} onClick={handleDeposit}>
                Deposit USDC
              </Button>
            </div>
            <div className="space-y-3">
              <AmountInput label="Withdraw" value={withdrawAmount} onChange={setWithdrawAmount} max={vault.data ?? null} />
              <Button fullWidth variant="outlined" icon={<ArrowUpRight size={15} />} disabled={!canWithdraw || tx.isRunning} onClick={handleWithdraw}>
                Withdraw USDC
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>

      <SwapCard
        usdcAsset={asset.data}
        hasTrustline={Boolean(state?.usdc.hasTrustline)}
        xlmBalanceStroops={state?.xlmStroops ?? 0n}
        onSwapSuccess={refreshChain}
      />

      <SectionCard title="Rubbi wallet ledger" subtitle="Deposits, withdrawals, card loads and refunds recorded by the indexer">
        {walletTxs.isLoading && <p className="text-sm text-neutral-400">Loading…</p>}
        {walletTxs.data && walletTxs.data.items.length === 0 && <EmptyState title="No wallet activity yet" />}
        {walletTxs.data?.items.map((row) => <TransactionRow key={row.id} tx={row} />)}
      </SectionCard>
    </div>
  );
}

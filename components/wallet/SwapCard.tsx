"use client";
import React, { useEffect, useState } from "react";
import type { Asset } from "@stellar/stellar-sdk";
import { ArrowLeftRight, ExternalLink, RefreshCw } from "lucide-react";

import AmountInput from "@/components/ui/AmountInput";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useStellarTx } from "@/hooks/useStellarTx";
import { formatUsdc, formatXlm, tryParseUsdc } from "@/lib/stellar/amount";
import { CIRCLE_FAUCET_URL, explorerTxUrl } from "@/lib/stellar/config";
import {
  DEFAULT_SLIPPAGE_BPS,
  executeStrictReceiveSwap,
  fetchStrictReceiveQuote,
  type SwapQuote,
} from "@/lib/stellar/swap";

const SLIPPAGE_CHOICES = [
  { label: "0.5%", bps: 50 },
  { label: "1%", bps: 100 },
  { label: "2%", bps: 200 },
] as const;

interface Props {
  usdcAsset: Asset | undefined;
  hasTrustline: boolean;
  xlmBalanceStroops: bigint;
  onSwapSuccess: () => void;
}

export default function SwapCard({
  usdcAsset,
  hasTrustline,
  xlmBalanceStroops,
  onSwapSuccess,
}: Props) {
  const { config } = useStellarWallet();
  const tx = useStellarTx();

  const [usdcToReceive, setUsdcToReceive] = useState("");
  const [slippageBps, setSlippageBps] = useState<number>(DEFAULT_SLIPPAGE_BPS);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [noPathFound, setNoPathFound] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const destStroops = tryParseUsdc(usdcToReceive);
  const issuer = usdcAsset?.getIssuer() ?? config?.usdcIssuer ?? null;

  useEffect(() => {
    if (!config || !issuer || !destStroops || destStroops <= 0n) {
      setQuote(null);
      setNoPathFound(false);
      setQuoteError(null);
      return;
    }

    let cancelled = false;
    setQuoting(true);
    setQuoteError(null);

    fetchStrictReceiveQuote({
      horizonUrl: config.horizonUrl,
      usdcIssuer: issuer,
      destUsdcStroops: destStroops,
      slippageBps,
    })
      .then((res) => {
        if (cancelled) return;
        setQuote(res);
        setNoPathFound(res === null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setQuote(null);
        setNoPathFound(false);
        setQuoteError(err instanceof Error ? err.message : "Could not fetch quote from Horizon.");
      })
      .finally(() => {
        if (!cancelled) setQuoting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [config, issuer, destStroops, slippageBps, refreshTick]);

  const insufficientXlm = Boolean(quote && quote.sendMaxXlmStroops > xlmBalanceStroops);
  const canSwap =
    hasTrustline &&
    Boolean(usdcAsset) &&
    Boolean(quote) &&
    !noPathFound &&
    !insufficientXlm &&
    !quoting &&
    !tx.isRunning;

  const handleSwap = async () => {
    if (!usdcAsset || !quote) return;
    const result = await tx.run(
      {
        title: "Swap XLM to USDC",
        description: `Receiving ${formatUsdc(quote.destUsdcStroops)} USDC (max spend ${formatXlm(quote.sendMaxXlmStroops)} XLM).`,
        successTitle: "Swap completed",
      },
      ({ config: cfg, address: addr, sign }) =>
        executeStrictReceiveSwap(cfg, { source: addr, usdcAsset, quote }, { sign }),
    );
    if (result) {
      setLastTxHash(result.hash);
      setUsdcToReceive("");
      setQuote(null);
      onSwapSuccess();
    }
  };

  return (
    <SectionCard
      title="Swap XLM to USDC"
      subtitle="Stellar DEX strict-receive path payment — specify the exact USDC amount you want to receive"
      action={
        <Button
          size="sm"
          variant="ghost"
          icon={<RefreshCw size={13} />}
          disabled={!destStroops || quoting}
          onClick={() => setRefreshTick((n) => n + 1)}
        >
          Refresh quote
        </Button>
      }
    >
      <div className="space-y-4">
        {!hasTrustline && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Enable the USDC trustline above before swapping XLM to USDC.
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <AmountInput
            label="USDC to receive (exact)"
            value={usdcToReceive}
            onChange={(val) => {
              setUsdcToReceive(val);
              setLastTxHash(null);
            }}
          />

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
              Slippage tolerance
            </label>
            <div className="flex gap-2">
              {SLIPPAGE_CHOICES.map((c) => (
                <button
                  key={c.bps}
                  type="button"
                  onClick={() => setSlippageBps(c.bps)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                    slippageBps === c.bps
                      ? "border-primary bg-primary text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-primary/40"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {quoting && <p className="text-xs text-neutral-400">Checking Stellar DEX liquidity via Horizon…</p>}

        {quoteError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {quoteError}
          </div>
        )}

        {noPathFound && !quoting && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1.5">
            <p className="font-bold">No liquidity path found on the DEX for this amount.</p>
            <p>
              Testnet order books can be thin or empty. Nothing will be signed — you can still{" "}
              <a
                href={CIRCLE_FAUCET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline inline-flex items-center gap-1"
              >
                get testnet USDC from Circle&apos;s faucet <ExternalLink size={11} />
              </a>
              .
            </p>
          </div>
        )}

        {quote && !noPathFound && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-500">Estimated cost</span>
              <span className="font-bold text-neutral-900">{formatXlm(quote.quotedXlmStroops)} XLM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">
                Maximum XLM spent ({(quote.slippageBps / 100).toFixed(1)}% slippage bound)
              </span>
              <span className="font-bold text-neutral-900">{formatXlm(quote.sendMaxXlmStroops)} XLM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Exact USDC received</span>
              <span className="font-bold text-green-700">{formatUsdc(quote.destUsdcStroops)} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Implied rate</span>
              <span className="font-mono text-neutral-700">1 USDC ≈ {quote.xlmPerUsdcDecimal} XLM</span>
            </div>
            {insufficientXlm && (
              <p className="text-red-600 font-semibold pt-1">
                Insufficient XLM balance for maximum spend ({formatXlm(xlmBalanceStroops)} XLM available).
              </p>
            )}
          </div>
        )}

        {lastTxHash && config && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-800 flex items-center justify-between">
            <span>Swap confirmed on the ledger.</span>
            <a
              href={explorerTxUrl(config, lastTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline inline-flex items-center gap-1"
            >
              View transaction <ExternalLink size={11} />
            </a>
          </div>
        )}

        <Button
          fullWidth
          icon={<ArrowLeftRight size={15} />}
          disabled={!canSwap}
          loading={tx.isRunning}
          onClick={handleSwap}
        >
          Swap XLM for {quote ? `${formatUsdc(quote.destUsdcStroops)} USDC` : "USDC"}
        </Button>
      </div>
    </SectionCard>
  );
}

import { Asset, Operation } from "@stellar/stellar-sdk";

import { parseUsdc, SCALE, USDC_DECIMALS } from "./amount.ts";
import type { StellarConfig } from "./config";
import type { InvokeResult, SignTransaction } from "./invoke";

export const DEFAULT_SLIPPAGE_BPS = 100; // 1.00%
export const BPS_DENOMINATOR = 10_000n;

export interface HorizonPathAsset {
  asset_type: "native" | "credit_alphanum4" | "credit_alphanum12";
  asset_code?: string;
  asset_issuer?: string;
}

export interface HorizonPathRecord {
  source_asset_type: string;
  source_amount: string;
  destination_asset_type: string;
  destination_asset_code?: string;
  destination_asset_issuer?: string;
  destination_amount: string;
  path: HorizonPathAsset[];
}

export interface SwapQuote {
  /** Exact USDC amount to receive in stroops. */
  destUsdcStroops: bigint;
  /** Quoted XLM cost in stroops from Horizon. */
  quotedXlmStroops: bigint;
  /** Maximum XLM to spend in stroops after applying `slippageBps`. */
  sendMaxXlmStroops: bigint;
  /** Slippage tolerance in basis points (e.g. 100 = 1%). */
  slippageBps: number;
  /** Intermediate path assets returned by Horizon. */
  path: HorizonPathAsset[];
  /** Implied XLM per 1 USDC formatted as a decimal string. */
  xlmPerUsdcDecimal: string;
}

/**
 * Formats stroops as a raw 7-decimal string without thousands separators,
 * as required by Horizon query parameters and `Operation.pathPaymentStrictReceive`.
 */
export function stroopsToProtocolDecimal(stroops: bigint): string {
  if (stroops < 0n) throw new Error("stroops must be non-negative");
  const whole = stroops / SCALE;
  const fraction = (stroops % SCALE).toString().padStart(USDC_DECIMALS, "0");
  return `${whole.toString()}.${fraction}`;
}

/**
 * Computes `sendMax` in stroops from `quotedStroops` and `slippageBps` using pure `bigint` integer math
 * (rounded up so fractional stroops never under-cover the quote).
 */
export function computeSendMaxStroops(quotedStroops: bigint, slippageBps: number): bigint {
  if (quotedStroops <= 0n) throw new Error("quotedStroops must be positive");
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 5_000) {
    throw new Error("slippageBps must be an integer between 0 and 5000");
  }
  const bps = BigInt(slippageBps);
  const numerator = quotedStroops * (BPS_DENOMINATOR + bps);
  return (numerator + BPS_DENOMINATOR - 1n) / BPS_DENOMINATOR;
}

/**
 * Computes the implied rate (`XLM per 1 USDC`) as a decimal string using `bigint` math.
 */
export function computeRateDecimal(xlmStroops: bigint, usdcStroops: bigint): string {
  if (usdcStroops <= 0n || xlmStroops <= 0n) return "0.00";
  const scaledRate = (xlmStroops * SCALE) / usdcStroops;
  const whole = scaledRate / SCALE;
  const frac = (scaledRate % SCALE).toString().padStart(USDC_DECIMALS, "0").slice(0, 4);
  return `${whole.toString()}.${frac}`;
}

/**
 * Queries Horizon `/paths/strict-receive` for swapping native XLM into `destUsdcStroops` of USDC.
 * Returns `null` when no liquidity path exists on the network.
 */
export async function fetchStrictReceiveQuote(params: {
  horizonUrl: string;
  usdcIssuer: string;
  destUsdcStroops: bigint;
  slippageBps?: number;
  fetchImpl?: typeof fetch;
}): Promise<SwapQuote | null> {
  const {
    horizonUrl,
    usdcIssuer,
    destUsdcStroops,
    slippageBps = DEFAULT_SLIPPAGE_BPS,
    fetchImpl = fetch,
  } = params;

  if (destUsdcStroops <= 0n) return null;

  const destAmountStr = stroopsToProtocolDecimal(destUsdcStroops);
  const query = new URLSearchParams({
    source_assets: "native",
    destination_asset_type: "credit_alphanum4",
    destination_asset_code: "USDC",
    destination_asset_issuer: usdcIssuer,
    destination_amount: destAmountStr,
  });

  const url = `${horizonUrl.replace(/\/+$/, "")}/paths/strict-receive?${query.toString()}`;
  const response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Horizon path quote failed (${response.status})`);
  }

  const body = (await response.json()) as {
    _embedded?: { records?: HorizonPathRecord[] };
  };
  const records = body._embedded?.records ?? [];
  if (records.length === 0) {
    return null;
  }

  // Pick the cheapest XLM source amount among returned paths using bigint comparison.
  let best = records[0];
  let bestSourceStroops = parseUsdc(best.source_amount);
  for (let i = 1; i < records.length; i++) {
    const candidateStroops = parseUsdc(records[i].source_amount);
    if (candidateStroops < bestSourceStroops) {
      best = records[i];
      bestSourceStroops = candidateStroops;
    }
  }

  const sendMaxXlmStroops = computeSendMaxStroops(bestSourceStroops, slippageBps);

  return {
    destUsdcStroops,
    quotedXlmStroops: bestSourceStroops,
    sendMaxXlmStroops,
    slippageBps,
    path: best.path ?? [],
    xlmPerUsdcDecimal: computeRateDecimal(bestSourceStroops, destUsdcStroops),
  };
}

function horizonAssetToSdkAsset(a: HorizonPathAsset): Asset {
  if (a.asset_type === "native") return Asset.native();
  if (!a.asset_code || !a.asset_issuer) {
    throw new Error("Invalid intermediate path asset from Horizon");
  }
  return new Asset(a.asset_code, a.asset_issuer);
}

/**
 * Builds and submits a `pathPaymentStrictReceive` classic operation signed by the user's wallet.
 */
export async function executeStrictReceiveSwap(
  config: StellarConfig,
  params: {
    source: string;
    usdcAsset: Asset;
    quote: SwapQuote;
  },
  options: { sign: SignTransaction },
): Promise<InvokeResult> {
  const { source, usdcAsset, quote } = params;
  const intermediatePath = quote.path.map(horizonAssetToSdkAsset);

  const op = Operation.pathPaymentStrictReceive({
    sendAsset: Asset.native(),
    sendMax: stroopsToProtocolDecimal(quote.sendMaxXlmStroops),
    destination: source,
    destAsset: usdcAsset,
    destAmount: stroopsToProtocolDecimal(quote.destUsdcStroops),
    path: intermediatePath,
  });

  const { submitClassic } = await import("./invoke");
  return submitClassic(config, [op], "Swap XLM to USDC", {
    source,
    sign: options.sign,
  });
}

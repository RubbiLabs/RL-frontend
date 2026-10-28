import assert from "node:assert/strict";
import test from "node:test";

import { parseUsdc } from "./amount.ts";
import {
  computeRateDecimal,
  computeSendMaxStroops,
  fetchStrictReceiveQuote,
  stroopsToProtocolDecimal,
} from "./swap.ts";

test("stroopsToProtocolDecimal formats exact 7-decimal strings without commas", () => {
  assert.equal(stroopsToProtocolDecimal(10000000n), "1.0000000");
  assert.equal(stroopsToProtocolDecimal(123456789012n), "12345.6789012");
  assert.equal(stroopsToProtocolDecimal(5n), "0.0000005");
});

test("computeSendMaxStroops applies slippage tolerance in basis points with ceiling rounding", () => {
  const quoted = parseUsdc("100"); // 1,000,000,000 stroops
  // 1% (100 bps) -> 101 USDC
  assert.equal(computeSendMaxStroops(quoted, 100), parseUsdc("101"));
  // 0.5% (50 bps) -> 100.5 USDC
  assert.equal(computeSendMaxStroops(quoted, 50), parseUsdc("100.5"));
  // Fractional stroop ceiling check
  assert.equal(computeSendMaxStroops(101n, 100), 103n);
});

test("fetchStrictReceiveQuote picks the cheapest path and returns null when no path exists", async () => {
  const issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

  const emptyFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ _embedded: { records: [] } }), { status: 200 });

  const noPath = await fetchStrictReceiveQuote({
    horizonUrl: "https://horizon-testnet.stellar.org",
    usdcIssuer: issuer,
    destUsdcStroops: parseUsdc("10"),
    fetchImpl: emptyFetch,
  });
  assert.equal(noPath, null);

  const mockFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        _embedded: {
          records: [
            {
              source_asset_type: "native",
              source_amount: "95.0000000",
              destination_asset_type: "credit_alphanum4",
              destination_asset_code: "USDC",
              destination_asset_issuer: issuer,
              destination_amount: "10.0000000",
              path: [],
            },
            {
              source_asset_type: "native",
              source_amount: "92.5000000",
              destination_asset_type: "credit_alphanum4",
              destination_asset_code: "USDC",
              destination_asset_issuer: issuer,
              destination_amount: "10.0000000",
              path: [],
            },
          ],
        },
      }),
      { status: 200 },
    );

  const quote = await fetchStrictReceiveQuote({
    horizonUrl: "https://horizon-testnet.stellar.org",
    usdcIssuer: issuer,
    destUsdcStroops: parseUsdc("10"),
    slippageBps: 100, // 1%
    fetchImpl: mockFetch,
  });

  assert.ok(quote);
  assert.equal(quote.quotedXlmStroops, parseUsdc("92.5"));
  assert.equal(quote.sendMaxXlmStroops, parseUsdc("93.425"));
  assert.equal(quote.xlmPerUsdcDecimal, computeRateDecimal(parseUsdc("92.5"), parseUsdc("10")));
});

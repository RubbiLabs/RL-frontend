import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHistorySearchParams,
  DEFAULT_HISTORY_FILTERS,
  filterTransactions,
  parseHistoryFiltersFromSearchParams,
  transactionsToCsv,
} from "./transactions.ts";
import type { ApiTransaction } from "../../types/api";

const SAMPLE_TXS: ApiTransaction[] = [
  {
    id: "tx-1",
    type: "DEPOSIT",
    account: "WALLET",
    amount: "125.1234567",
    balanceAfter: "125.1234567",
    description: "Initial vault deposit",
    metadata: { txHash: "a1b2c3d4e5f6" },
    createdAt: "2026-10-10T12:00:00.000Z",
  },
  {
    id: "tx-2",
    type: "CARD_PURCHASE",
    account: "CARD",
    amount: "-14.5000000",
    balanceAfter: "85.5000000",
    description: "Coffee shop, Lagos",
    metadata: null,
    createdAt: "2026-10-15T09:30:00.000Z",
  },
  {
    id: "tx-3",
    type: "SUBSCRIPTION_PAYMENT",
    account: "WALLET",
    amount: "-9.9900000",
    balanceAfter: "125.1234567",
    description: "Plan #1 recurring charge",
    metadata: { informational: true, txHash: "f6e5d4c3b2a1" },
    createdAt: "2026-10-20T18:00:00.000Z",
  },
];

test("filters combine account, multi-select types, date range and free-text query", () => {
  const walletOnly = filterTransactions(SAMPLE_TXS, {
    ...DEFAULT_HISTORY_FILTERS,
    account: "WALLET",
  });
  assert.equal(walletOnly.length, 2);

  const combined = filterTransactions(SAMPLE_TXS, {
    ...DEFAULT_HISTORY_FILTERS,
    account: "WALLET",
    types: ["DEPOSIT", "SUBSCRIPTION_PAYMENT"],
    from: "2026-10-18",
    to: "2026-10-25",
    query: "plan #1",
  });
  assert.equal(combined.length, 1);
  assert.equal(combined[0].id, "tx-3");
});

test("URL search params round-trip preserves filters across page reloads", () => {
  const filters = {
    account: "CARD" as const,
    types: ["CARD_PURCHASE", "CARD_LOAD"],
    from: "2026-10-01",
    to: "2026-10-31",
    query: "Lagos",
    page: 2,
    pageSize: 50,
  };
  const qs = buildHistorySearchParams(filters);
  const parsed = parseHistoryFiltersFromSearchParams(new URLSearchParams(qs));
  assert.deepEqual(parsed, filters);
});

test("transactionsToCsv formats signed 7-decimal amounts without float artefacts and quotes commas", () => {
  const csv = transactionsToCsv(SAMPLE_TXS);
  const lines = csv.trim().split("\n");
  assert.equal(lines.length, 4);
  assert.equal(lines[0], "date,type,account,description,amount_usdc,balance_after_usdc,tx_hash");
  assert.match(lines[1], /\+125\.1234567,125\.1234567,a1b2c3d4e5f6$/);
  assert.match(lines[2], /"Coffee shop, Lagos",-14\.50,85\.50,$/);
  // Informational row leaves balance_after_usdc blank
  assert.match(lines[3], /-9\.99,,f6e5d4c3b2a1$/);
});

import assert from "node:assert/strict";
import test from "node:test";

import { MAX_ENTRY_TTL } from "../stellar/ledger.ts";
import { parseUsdc } from "../stellar/amount.ts";
import {
  computeSingleSubscriptionHealth,
  computeTopUpApproval,
  evaluateSharedAllowance,
} from "./allowance.ts";
import type { ApiSubscription } from "../../types/api";

function makeSub(
  id: string,
  planId: number,
  amount: string,
  periodDays: number,
  nextDueAt: string,
  status: ApiSubscription["status"] = "ACTIVE",
): ApiSubscription {
  return {
    id,
    onChainSubId: id,
    subscriber: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    planId,
    status,
    nextDueAt,
    lastChargedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    plan: {
      id: planId,
      merchant: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBW7I",
      name: `Plan ${planId}`,
      amount,
      period: periodDays * 86_400,
      active: true,
    },
  };
}

test("computeSingleSubscriptionHealth covers all five states: ok, last_payment_covered, insufficient_for_next_charge, expires_before_next_due, expired", () => {
  const now = new Date("2026-10-28T10:00:00.000Z");
  const currentLedger = 100_000;
  const nextDueTomorrow = new Date(now.getTime() + 86_400 * 1000).toISOString();
  const unit = parseUsdc("5"); // 5 USDC per cycle

  // 1. ok (>= 2 cycles covered and expiry well after next_due)
  const okRes = computeSingleSubscriptionHealth({
    planAmountStroops: unit,
    totalCycleStroops: unit,
    nextDueAt: nextDueTomorrow,
    allowance: { amount: parseUsdc("15"), liveUntilLedger: currentLedger + 100_000 },
    currentLedger,
    now,
  });
  assert.equal(okRes.state, "ok");
  assert.equal(okRes.warning, false);
  assert.equal(okRes.sharedCyclesCovered, 3);

  // 2. last_payment_covered (1 cycle covered, < 2 cycles)
  const lastRes = computeSingleSubscriptionHealth({
    planAmountStroops: unit,
    totalCycleStroops: unit,
    nextDueAt: nextDueTomorrow,
    allowance: { amount: parseUsdc("6"), liveUntilLedger: currentLedger + 100_000 },
    currentLedger,
    now,
  });
  assert.equal(lastRes.state, "last_payment_covered");
  assert.equal(lastRes.warning, true);
  assert.equal(lastRes.sharedCyclesCovered, 1);

  // 3. insufficient_for_next_charge (< 1 cycle covered)
  const insuffRes = computeSingleSubscriptionHealth({
    planAmountStroops: unit,
    totalCycleStroops: unit,
    nextDueAt: nextDueTomorrow,
    allowance: { amount: parseUsdc("4"), liveUntilLedger: currentLedger + 100_000 },
    currentLedger,
    now,
  });
  assert.equal(insuffRes.state, "insufficient_for_next_charge");
  assert.equal(insuffRes.warning, true);

  // 4. expires_before_next_due (amount is plenty, but liveUntilLedger is before tomorrow's ledger)
  const expBeforeRes = computeSingleSubscriptionHealth({
    planAmountStroops: unit,
    totalCycleStroops: unit,
    nextDueAt: nextDueTomorrow,
    allowance: { amount: parseUsdc("50"), liveUntilLedger: currentLedger + 1_000 }, // 1000 ledgers = 5000s < 86400s
    currentLedger,
    now,
  });
  assert.equal(expBeforeRes.state, "expires_before_next_due");
  assert.equal(expBeforeRes.warning, true);

  // 5. expired (liveUntilLedger < currentLedger or 0 amount)
  const expiredRes = computeSingleSubscriptionHealth({
    planAmountStroops: unit,
    totalCycleStroops: unit,
    nextDueAt: nextDueTomorrow,
    allowance: { amount: parseUsdc("50"), liveUntilLedger: currentLedger - 1 },
    currentLedger,
    now,
  });
  assert.equal(expiredRes.state, "expired");
  assert.equal(expiredRes.warning, true);
});

test("shared allowance across two active subscriptions (2 and 3 USDC/day) with 4 USDC warns both and computes >= 15 USDC for 3 periods", () => {
  const now = new Date("2026-10-28T10:00:00.000Z");
  const currentLedger = 200_000;
  const due = new Date(now.getTime() + 86_400 * 1000).toISOString();

  const subs = [
    makeSub("sub-1", 1, "2", 1, due),
    makeSub("sub-2", 2, "3", 1, due),
  ];

  const summary = evaluateSharedAllowance(
    subs,
    { amount: parseUsdc("4"), liveUntilLedger: currentLedger + 100_000 },
    currentLedger,
    now,
  );

  assert.equal(summary.activeCount, 2);
  assert.equal(summary.singleCycleTotalStroops, parseUsdc("5"));
  assert.equal(summary.failingSubscriptions.length, 2);
  assert.equal(summary.bySubscriptionId["sub-1"].state, "insufficient_for_next_charge");
  assert.equal(summary.bySubscriptionId["sub-2"].state, "insufficient_for_next_charge");

  const topUp3 = computeTopUpApproval({
    baseCycleStroops: summary.singleCycleTotalStroops,
    periodSeconds: summary.maxPeriodSeconds,
    periods: 3,
    currentLedger,
    now,
  });
  assert.equal(topUp3.approveAmountStroops, parseUsdc("15"));
});

test("computeTopUpApproval caps expiration ledger at currentLedger + MAX_ENTRY_TTL - 1", () => {
  const currentLedger = 500_000;
  const topUp = computeTopUpApproval({
    baseCycleStroops: parseUsdc("10"),
    periodSeconds: 365 * 86_400, // 1 year per period * 12 periods exceeds MAX_ENTRY_TTL
    periods: 12,
    currentLedger,
  });
  assert.equal(topUp.expirationLedger, currentLedger + MAX_ENTRY_TTL - 1);
});

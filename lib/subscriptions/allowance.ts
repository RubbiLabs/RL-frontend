import { parseUsdc } from "../stellar/amount.ts";
import { approvalExpirationLedger, ledgersForSeconds, ledgerToApproxDate } from "../stellar/ledger.ts";
import type { AllowanceState } from "../stellar/sac";
import type { ApiSubscription } from "../../types/api";

export const TOP_UP_PERIOD_CHOICES = [1, 3, 6, 12] as const;
export type TopUpPeriods = (typeof TOP_UP_PERIOD_CHOICES)[number];

export type AllowanceHealthState =
  | "ok"
  | "last_payment_covered"
  | "insufficient_for_next_charge"
  | "expires_before_next_due"
  | "expired";

export interface SubscriptionAllowanceHealth {
  subscriptionId: string;
  planId: number;
  planName: string;
  amountStroops: bigint;
  periodSeconds: number;
  nextDueAt: string;
  state: AllowanceHealthState;
  label: string;
  warning: boolean;
  /** How many full cycles of all active subscriptions the current allowance covers. */
  sharedCyclesCovered: number;
  expiresAt: Date | null;
}

export interface SharedAllowanceSummary {
  bySubscriptionId: Record<string, SubscriptionAllowanceHealth>;
  failingSubscriptions: SubscriptionAllowanceHealth[];
  warningSubscriptions: SubscriptionAllowanceHealth[];
  earliestFailingDueAt: string | null;
  activeCount: number;
  pastDueCount: number;
  /** Sum of 1 period across all active/past-due subscriptions. */
  singleCycleTotalStroops: bigint;
  /** Longest period in seconds across active/past-due subscriptions (default 30 days). */
  maxPeriodSeconds: number;
}

/**
 * Computes the ledger sequence at which `dueDate` occurs relative to `currentLedger` at `now`.
 */
export function dateToApproxLedger(currentLedger: number, dueDate: Date, now: Date = new Date()): number {
  const diffSeconds = Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / 1000));
  return currentLedger + ledgersForSeconds(diffSeconds);
}

/**
 * Pure computation of allowance health for a single subscription given the
 * shared allowance, the total cost of one cycle across all active subscriptions,
 * and the current ledger.
 */
export function computeSingleSubscriptionHealth(params: {
  planAmountStroops: bigint;
  totalCycleStroops: bigint;
  nextDueAt: string;
  allowance: AllowanceState;
  currentLedger: number;
  now?: Date;
}): {
  state: AllowanceHealthState;
  label: string;
  warning: boolean;
  sharedCyclesCovered: number;
  expiresAt: Date | null;
} {
  const { planAmountStroops, totalCycleStroops, nextDueAt, allowance, currentLedger, now = new Date() } = params;
  const cycleUnit = totalCycleStroops > 0n ? totalCycleStroops : planAmountStroops;

  if (
    allowance.amount <= 0n ||
    allowance.liveUntilLedger === null ||
    allowance.liveUntilLedger < currentLedger
  ) {
    return {
      state: "expired",
      label: allowance.amount <= 0n && allowance.liveUntilLedger === null ? "No allowance granted" : "Allowance expired",
      warning: true,
      sharedCyclesCovered: 0,
      expiresAt:
        allowance.liveUntilLedger !== null
          ? ledgerToApproxDate(currentLedger, allowance.liveUntilLedger, now)
          : null,
    };
  }

  const expiresAt = ledgerToApproxDate(currentLedger, allowance.liveUntilLedger, now);
  const nextDueDate = new Date(nextDueAt);
  const nextDueLedger = Number.isNaN(nextDueDate.getTime())
    ? currentLedger
    : dateToApproxLedger(currentLedger, nextDueDate, now);

  const sharedCyclesCovered =
    cycleUnit > 0n ? Number(allowance.amount / cycleUnit) : 0;

  if (allowance.liveUntilLedger < nextDueLedger) {
    return {
      state: "expires_before_next_due",
      label: `Expires before next due (≈ ${expiresAt.toLocaleDateString(undefined, { dateStyle: "medium" })})`,
      warning: true,
      sharedCyclesCovered,
      expiresAt,
    };
  }

  if (allowance.amount < cycleUnit) {
    return {
      state: "insufficient_for_next_charge",
      label: "Insufficient for next charge",
      warning: true,
      sharedCyclesCovered: 0,
      expiresAt,
    };
  }

  if (allowance.amount < cycleUnit * 2n) {
    return {
      state: "last_payment_covered",
      label: `Last payment covered · expires ≈ ${expiresAt.toLocaleDateString(undefined, { dateStyle: "medium" })}`,
      warning: true,
      sharedCyclesCovered: 1,
      expiresAt,
    };
  }

  return {
    state: "ok",
    label: `Covers ${sharedCyclesCovered} more payment${sharedCyclesCovered === 1 ? "" : "s"} · expires ≈ ${expiresAt.toLocaleDateString(undefined, { dateStyle: "medium" })}`,
    warning: false,
    sharedCyclesCovered,
    expiresAt,
  };
}

/**
 * Evaluates the shared SAC allowance across all active and past-due subscriptions.
 */
export function evaluateSharedAllowance(
  subscriptions: ApiSubscription[],
  allowance: AllowanceState,
  currentLedger: number,
  now: Date = new Date(),
): SharedAllowanceSummary {
  const billable = subscriptions.filter(
    (s) => (s.status === "ACTIVE" || s.status === "PAST_DUE") && s.plan !== null,
  );

  let singleCycleTotalStroops = 0n;
  let maxPeriodSeconds = 30 * 86_400;
  let pastDueCount = 0;

  for (const sub of billable) {
    const amt = parseUsdc(sub.plan!.amount);
    singleCycleTotalStroops += amt;
    if (sub.plan!.period > maxPeriodSeconds) {
      maxPeriodSeconds = sub.plan!.period;
    }
    if (sub.status === "PAST_DUE") {
      pastDueCount++;
    }
  }

  if (billable.length > 0) {
    maxPeriodSeconds = Math.max(...billable.map((s) => s.plan!.period));
  }

  const bySubscriptionId: Record<string, SubscriptionAllowanceHealth> = {};
  const failingSubscriptions: SubscriptionAllowanceHealth[] = [];
  const warningSubscriptions: SubscriptionAllowanceHealth[] = [];

  for (const sub of billable) {
    const amountStroops = parseUsdc(sub.plan!.amount);
    const computed = computeSingleSubscriptionHealth({
      planAmountStroops: amountStroops,
      totalCycleStroops: singleCycleTotalStroops,
      nextDueAt: sub.nextDueAt,
      allowance,
      currentLedger,
      now,
    });

    const health: SubscriptionAllowanceHealth = {
      subscriptionId: sub.id,
      planId: sub.planId,
      planName: sub.plan!.name,
      amountStroops,
      periodSeconds: sub.plan!.period,
      nextDueAt: sub.nextDueAt,
      ...computed,
    };

    bySubscriptionId[sub.id] = health;
    if (health.warning) {
      warningSubscriptions.push(health);
    }
    if (
      health.state === "expired" ||
      health.state === "expires_before_next_due" ||
      health.state === "insufficient_for_next_charge"
    ) {
      failingSubscriptions.push(health);
    }
  }

  const sortedFailing = [...failingSubscriptions].sort(
    (a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime(),
  );

  return {
    bySubscriptionId,
    failingSubscriptions,
    warningSubscriptions,
    earliestFailingDueAt: sortedFailing[0]?.nextDueAt ?? null,
    activeCount: billable.length,
    pastDueCount,
    singleCycleTotalStroops,
    maxPeriodSeconds,
  };
}

/**
 * Computes the replacement approval amount and capped expiration ledger to cover
 * all active subscriptions (or a single plan) for `periods` periods.
 */
export function computeTopUpApproval(params: {
  baseCycleStroops: bigint;
  periodSeconds: number;
  periods: number;
  currentLedger: number;
  now?: Date;
}): {
  approveAmountStroops: bigint;
  expirationLedger: number;
  expiresAt: Date;
} {
  const { baseCycleStroops, periodSeconds, periods, currentLedger, now = new Date() } = params;
  const approveAmountStroops = baseCycleStroops * BigInt(periods);
  const expirationLedger = approvalExpirationLedger(currentLedger, periodSeconds, periods);
  const expiresAt = ledgerToApproxDate(currentLedger, expirationLedger, now);
  return {
    approveAmountStroops,
    expirationLedger,
    expiresAt,
  };
}

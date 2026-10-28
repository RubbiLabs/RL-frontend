import { arg, enumName } from "./args";
import type { StellarConfig } from "./config";
import { invoke, simulateRead, type InvokeResult, type SignTransaction } from "./invoke";

export type OnChainSubStatus = "Active" | "Paused" | "PastDue" | "Cancelled";

export interface OnChainSubscription {
  id: bigint;
  subscriber: string;
  planId: number;
  nextDue: bigint;
  status: OnChainSubStatus;
  createdAt: bigint;
}

export interface OnChainPlan {
  id: number;
  merchant: string;
  name: string;
  amount: bigint;
  period: bigint;
  active: boolean;
}

type Raw = Record<string, unknown>;

function spec(config: StellarConfig, method: string, args: ReturnType<typeof arg.address>[]) {
  return { contractId: config.contracts.subscriptions, method, args, contract: "subscriptions" as const };
}

export async function getPlan(config: StellarConfig, planId: number, source: string): Promise<OnChainPlan> {
  const raw = await simulateRead<Raw>(config, spec(config, "get_plan", [arg.u32(planId)]), source);
  return {
    id: Number(raw.id),
    merchant: String(raw.merchant),
    name: String(raw.name),
    amount: BigInt(raw.amount as bigint),
    period: BigInt(raw.period as bigint),
    active: Boolean(raw.active),
  };
}

export async function getSubscription(config: StellarConfig, subId: bigint, source: string): Promise<OnChainSubscription> {
  const raw = await simulateRead<Raw>(config, spec(config, "get_subscription", [arg.u64(subId)]), source);
  return {
    id: BigInt(raw.id as bigint),
    subscriber: String(raw.subscriber),
    planId: Number(raw.plan_id),
    nextDue: BigInt(raw.next_due as bigint),
    status: enumName(raw.status) as OnChainSubStatus,
    createdAt: BigInt(raw.created_at as bigint),
  };
}

/** `sub_id_of(subscriber, plan_id)`: the live (non-cancelled) subscription id, if any. */
export async function subIdOf(config: StellarConfig, subscriber: string, planId: number): Promise<bigint | null> {
  const raw = await simulateRead<bigint | null | undefined>(
    config,
    spec(config, "sub_id_of", [arg.address(subscriber), arg.u32(planId)]),
    subscriber,
  );
  return raw === null || raw === undefined ? null : BigInt(raw);
}

/** `subscribe(subscriber, plan_id) -> u64`. Pulls the first period immediately. */
export async function subscribe(
  config: StellarConfig,
  params: { subscriber: string; planId: number },
  options: { sign: SignTransaction },
): Promise<InvokeResult & { subId: bigint | null }> {
  const result = await invoke(config, spec(config, "subscribe", [arg.address(params.subscriber), arg.u32(params.planId)]), {
    source: params.subscriber,
    sign: options.sign,
  });
  const subId = result.returnValue === undefined || result.returnValue === null ? null : BigInt(result.returnValue as bigint);
  return { ...result, subId };
}

function lifecycle(method: "pause_subscription" | "resume_subscription" | "cancel_subscription") {
  return (
    config: StellarConfig,
    params: { subscriber: string; subId: bigint },
    options: { sign: SignTransaction },
  ): Promise<InvokeResult> =>
    invoke(config, spec(config, method, [arg.address(params.subscriber), arg.u64(params.subId)]), {
      source: params.subscriber,
      sign: options.sign,
    });
}

export const pauseSubscription = lifecycle("pause_subscription");
export const resumeSubscription = lifecycle("resume_subscription");
export const cancelSubscription = lifecycle("cancel_subscription");

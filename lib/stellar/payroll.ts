import { arg, enumName } from "./args";
import type { StellarConfig } from "./config";
import { invoke, simulateRead, type InvokeResult, type SignTransaction } from "./invoke";

export const MAX_SCHEDULES_PER_CALL = 25;
export const MAX_BATCH = 25;

export type OnChainScheduleStatus = "Active" | "Paused" | "Cancelled";

export interface ScheduleInput {
  recipient: string;
  amount: bigint;
  period: bigint;
  label: string;
}

export interface OnChainSchedule {
  id: bigint;
  employer: string;
  recipient: string;
  amount: bigint;
  period: bigint;
  nextDue: bigint;
  status: OnChainScheduleStatus;
  label: string;
  createdAt: bigint;
}

type Raw = Record<string, unknown>;

function spec(config: StellarConfig, method: string, args: ReturnType<typeof arg.address>[]) {
  return { contractId: config.contracts.payroll, method, args, contract: "payroll" as const };
}

export async function escrowOf(config: StellarConfig, employer: string): Promise<bigint> {
  const raw = await simulateRead<bigint>(config, spec(config, "escrow_of", [arg.address(employer)]), employer);
  return BigInt(raw);
}

export async function getSchedule(config: StellarConfig, id: bigint, source: string): Promise<OnChainSchedule> {
  const raw = await simulateRead<Raw>(config, spec(config, "get_schedule", [arg.u64(id)]), source);
  return {
    id: BigInt(raw.id as bigint),
    employer: String(raw.employer),
    recipient: String(raw.recipient),
    amount: BigInt(raw.amount as bigint),
    period: BigInt(raw.period as bigint),
    nextDue: BigInt(raw.next_due as bigint),
    status: enumName(raw.status) as OnChainScheduleStatus,
    label: String(raw.label),
    createdAt: BigInt(raw.created_at as bigint),
  };
}

export function fundEscrow(
  config: StellarConfig,
  params: { employer: string; amount: bigint },
  options: { sign: SignTransaction },
): Promise<InvokeResult> {
  return invoke(config, spec(config, "fund", [arg.address(params.employer), arg.i128(params.amount)]), {
    source: params.employer,
    sign: options.sign,
  });
}

export function withdrawEscrow(
  config: StellarConfig,
  params: { employer: string; amount: bigint },
  options: { sign: SignTransaction },
): Promise<InvokeResult> {
  return invoke(config, spec(config, "withdraw_escrow", [arg.address(params.employer), arg.i128(params.amount)]), {
    source: params.employer,
    sign: options.sign,
  });
}

/**
 * `create_schedules(employer, inputs, first_due) -> Vec<u64>`. At most 25
 * inputs per call; the contract validates every input before writing any.
 */
export async function createSchedules(
  config: StellarConfig,
  params: { employer: string; inputs: ScheduleInput[]; firstDue: bigint },
  options: { sign: SignTransaction },
): Promise<InvokeResult & { ids: bigint[] }> {
  if (params.inputs.length === 0 || params.inputs.length > MAX_SCHEDULES_PER_CALL) {
    throw new Error(`between 1 and ${MAX_SCHEDULES_PER_CALL} schedules per transaction`);
  }
  const inputs = arg.vec(
    params.inputs.map((input) =>
      arg.struct({
        recipient: arg.address(input.recipient),
        amount: arg.i128(input.amount),
        period: arg.u64(input.period),
        label: arg.string(input.label),
      }),
    ),
  );
  const result = await invoke(
    config,
    spec(config, "create_schedules", [arg.address(params.employer), inputs, arg.u64(params.firstDue)]),
    { source: params.employer, sign: options.sign },
  );
  const ids = Array.isArray(result.returnValue) ? result.returnValue.map((v) => BigInt(v as bigint)) : [];
  return { ...result, ids };
}

function lifecycle(method: "pause_schedule" | "resume_schedule" | "cancel_schedule") {
  return (
    config: StellarConfig,
    params: { employer: string; scheduleId: bigint },
    options: { sign: SignTransaction },
  ): Promise<InvokeResult> =>
    invoke(config, spec(config, method, [arg.address(params.employer), arg.u64(params.scheduleId)]), {
      source: params.employer,
      sign: options.sign,
    });
}

export const pauseSchedule = lifecycle("pause_schedule");
export const resumeSchedule = lifecycle("resume_schedule");
export const cancelSchedule = lifecycle("cancel_schedule");

/**
 * `disburse_batch(ids) -> Vec<bool>` (permissionless, time-gated). Pays one
 * period per due schedule; not-due or unpayable items return `false`.
 */
export async function disburseBatch(
  config: StellarConfig,
  params: { source: string; ids: bigint[] },
  options: { sign: SignTransaction },
): Promise<InvokeResult & { results: boolean[] }> {
  if (params.ids.length === 0 || params.ids.length > MAX_BATCH) {
    throw new Error(`between 1 and ${MAX_BATCH} schedules per batch`);
  }
  const result = await invoke(config, spec(config, "disburse_batch", [arg.u64Vec(params.ids)]), {
    source: params.source,
    sign: options.sign,
  });
  const results = Array.isArray(result.returnValue) ? result.returnValue.map(Boolean) : [];
  return { ...result, results };
}

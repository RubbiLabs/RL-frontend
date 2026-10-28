import { Address, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";

import { arg } from "./args";
import type { StellarConfig } from "./config";
import { invoke, simulateRead, type InvokeResult, type SignTransaction } from "./invoke";
import { rpcServer } from "./rpc";

export interface AllowanceState {
  amount: bigint;
  /** Ledger after which the allowance is gone; `null` when there is no live allowance entry. */
  liveUntilLedger: number | null;
}

/**
 * Reads the allowance granted by `from` to `spender`: the amount through the
 * SAC's `allowance()` and the expiration from the SAC's temporary ledger entry
 * `DataKey::Allowance(AllowanceDataKey { from, spender })` whose value is
 * `AllowanceValue { amount, live_until_ledger }` (soroban-env-host
 * `stellar_asset_contract/storage_types.rs`, read 2026-10-28).
 */
export async function getAllowance(config: StellarConfig, from: string, spender: string): Promise<AllowanceState> {
  const amountRaw = await simulateRead<bigint>(
    config,
    {
      contractId: config.usdcSacId,
      method: "allowance",
      args: [arg.address(from), arg.address(spender)],
      contract: "usdc",
    },
    from,
  );
  const amount = BigInt(amountRaw);

  let liveUntilLedger: number | null = null;
  try {
    const key = xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol("Allowance"),
      arg.struct({
        from: new Address(from).toScVal(),
        spender: new Address(spender).toScVal(),
      }),
    ]);
    const entry = await rpcServer(config.rpcUrl).getContractData(config.usdcSacId, key, rpc.Durability.Temporary);
    const data = entry.val.type === "contractData" ? entry.val.value : null;
    const value = data ? (scValToNative(data.val) as { amount?: bigint; live_until_ledger?: number }) : null;
    if (value && typeof value.live_until_ledger === "number") {
      liveUntilLedger = value.live_until_ledger;
    } else if (entry.liveUntilLedgerSeq) {
      liveUntilLedger = entry.liveUntilLedgerSeq;
    }
  } catch {
    // No live allowance entry (never approved, expired, or archived).
    liveUntilLedger = null;
  }

  return { amount, liveUntilLedger };
}

/** SAC `approve(from, spender, amount, expiration_ledger)`. */
export async function approveUsdc(
  config: StellarConfig,
  params: { from: string; spender: string; amount: bigint; expirationLedger: number },
  options: { sign: SignTransaction },
): Promise<InvokeResult> {
  return invoke(
    config,
    {
      contractId: config.usdcSacId,
      method: "approve",
      args: [
        arg.address(params.from),
        arg.address(params.spender),
        arg.i128(params.amount),
        arg.u32(params.expirationLedger),
      ],
      contract: "usdc",
    },
    { source: params.from, sign: options.sign },
  );
}

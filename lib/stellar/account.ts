import { Asset, Operation } from "@stellar/stellar-sdk";

import { arg } from "./args";
import type { StellarConfig } from "./config";
import { simulateRead, submitClassic, type InvokeResult, type SignTransaction } from "./invoke";
import { rpcServer } from "./rpc";

/** `TrustLineFlags::AUTHORIZED_FLAG` */
const AUTHORIZED_FLAG = 1;

export interface AccountState {
  /** `false` when the account does not exist on the network yet (needs XLM). */
  exists: boolean;
  xlmStroops: bigint;
  usdc: {
    hasTrustline: boolean;
    authorized: boolean;
    balance: bigint;
    limit: bigint;
  };
}

/**
 * Resolves the classic USDC asset behind the SAC. Uses
 * `NEXT_PUBLIC_USDC_ISSUER` when set, otherwise reads the SAC's `name()`,
 * which is `CODE:ISSUER` for a wrapped classic asset.
 */
export async function resolveUsdcAsset(config: StellarConfig, source: string): Promise<Asset> {
  if (config.usdcIssuer) {
    return new Asset("USDC", config.usdcIssuer);
  }
  const name = await simulateRead<string>(
    config,
    { contractId: config.usdcSacId, method: "name", args: [], contract: "usdc" },
    source,
  );
  const [code, issuer] = String(name).split(":");
  if (!code || !issuer) {
    throw new Error(`unexpected SAC name: ${name}`);
  }
  return new Asset(code, issuer);
}

/** Reads the account entry and the USDC trustline entry through RPC `getLedgerEntries`. */
export async function getAccountState(config: StellarConfig, address: string, asset: Asset): Promise<AccountState> {
  const server = rpcServer(config.rpcUrl);
  const empty: AccountState = {
    exists: false,
    xlmStroops: 0n,
    usdc: { hasTrustline: false, authorized: false, balance: 0n, limit: 0n },
  };

  let xlmStroops: bigint;
  try {
    const entry = await server.getAccountEntry(address);
    xlmStroops = entry.balance;
  } catch {
    return empty;
  }

  try {
    const trustline = await server.getTrustline(address, asset);
    return {
      exists: true,
      xlmStroops,
      usdc: {
        hasTrustline: true,
        authorized: (trustline.flags & AUTHORIZED_FLAG) === AUTHORIZED_FLAG,
        balance: trustline.balance,
        limit: trustline.limit,
      },
    };
  } catch {
    return { ...empty, exists: true, xlmStroops };
  }
}

/** One-click "Enable USDC": a classic `changeTrust` signed by the wallet. */
export async function enableUsdcTrustline(
  config: StellarConfig,
  asset: Asset,
  options: { source: string; sign: SignTransaction },
): Promise<InvokeResult> {
  return submitClassic(config, [Operation.changeTrust({ asset })], "Enable USDC", options);
}

/** `balance(address)` on the USDC SAC (fails with TrustlineMissingError without a trustline). */
export async function usdcBalance(config: StellarConfig, address: string): Promise<bigint> {
  const raw = await simulateRead<bigint>(
    config,
    { contractId: config.usdcSacId, method: "balance", args: [arg.address(address)], contract: "usdc" },
    address,
  );
  return BigInt(raw);
}

import { arg } from "./args";
import type { StellarConfig } from "./config";
import { invoke, simulateRead, type InvokeResult, type SignTransaction } from "./invoke";

/** `vault.balance(user)`: the user's withdrawable vault balance, in stroops. */
export async function vaultBalance(config: StellarConfig, user: string): Promise<bigint> {
  const raw = await simulateRead<bigint>(
    config,
    { contractId: config.contracts.vault, method: "balance", args: [arg.address(user)], contract: "vault" },
    user,
  );
  return BigInt(raw);
}

export async function vaultIsPaused(config: StellarConfig, source: string): Promise<boolean> {
  return simulateRead<boolean>(
    config,
    { contractId: config.contracts.vault, method: "is_paused", args: [], contract: "vault" },
    source,
  );
}

/** `vault.deposit(user, amount)`: moves USDC from the wallet into the vault. */
export function depositToVault(
  config: StellarConfig,
  params: { user: string; amount: bigint },
  options: { sign: SignTransaction },
): Promise<InvokeResult> {
  return invoke(
    config,
    {
      contractId: config.contracts.vault,
      method: "deposit",
      args: [arg.address(params.user), arg.i128(params.amount)],
      contract: "vault",
    },
    { source: params.user, sign: options.sign },
  );
}

/** `vault.withdraw(user, amount)`: moves USDC from the vault back to the wallet. Works while paused. */
export function withdrawFromVault(
  config: StellarConfig,
  params: { user: string; amount: bigint },
  options: { sign: SignTransaction },
): Promise<InvokeResult> {
  return invoke(
    config,
    {
      contractId: config.contracts.vault,
      method: "withdraw",
      args: [arg.address(params.user), arg.i128(params.amount)],
      contract: "vault",
    },
    { source: params.user, sign: options.sign },
  );
}

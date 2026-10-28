/**
 * Network configuration: ids and URLs only, never secrets.
 *
 * The API's `GET /stellar/config` is the source of truth (it is what the
 * backend indexes). `NEXT_PUBLIC_*` variables, when set, override single
 * fields so a deployment can point at another RPC or at freshly deployed
 * contracts. All of these values are public.
 */

export type StellarNetwork = "testnet" | "mainnet";

export interface StellarConfig {
  network: StellarNetwork;
  networkPassphrase: string;
  rpcUrl: string;
  usdcSacId: string;
  contracts: {
    vault: string;
    subscriptions: string;
    payroll: string;
  };
  /** Classic issuer of USDC (needed for the trustline). Resolved from the SAC when unset. */
  usdcIssuer: string | null;
}

/** Shape of `GET /stellar/config`. */
export interface ApiStellarConfig {
  network: string;
  networkPassphrase: string;
  rpcUrl: string;
  usdcSacId: string;
  contracts: { vault: string; subscriptions: string; payroll: string };
  sep10?: { homeDomain: string; webAuthDomain: string };
}

const PASSPHRASES: Record<StellarNetwork, string> = {
  testnet: "Test SDF Network ; September 2015",
  mainnet: "Public Global Stellar Network ; September 2015",
};

function blank(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// Next.js inlines NEXT_PUBLIC_* only when referenced as literal property accesses.
export const envOverrides = {
  network: blank(process.env.NEXT_PUBLIC_STELLAR_NETWORK),
  rpcUrl: blank(process.env.NEXT_PUBLIC_STELLAR_RPC_URL),
  networkPassphrase: blank(process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE),
  usdcSacId: blank(process.env.NEXT_PUBLIC_USDC_SAC_ID),
  vault: blank(process.env.NEXT_PUBLIC_VAULT_CONTRACT_ID),
  subscriptions: blank(process.env.NEXT_PUBLIC_SUBSCRIPTIONS_CONTRACT_ID),
  payroll: blank(process.env.NEXT_PUBLIC_PAYROLL_CONTRACT_ID),
  usdcIssuer: blank(process.env.NEXT_PUBLIC_USDC_ISSUER),
};

/** `true` when every field can be filled from env vars alone (API config optional). */
export function hasCompleteEnvConfig(): boolean {
  return Boolean(
    envOverrides.rpcUrl &&
      envOverrides.usdcSacId &&
      envOverrides.vault &&
      envOverrides.subscriptions &&
      envOverrides.payroll &&
      (envOverrides.network || envOverrides.networkPassphrase),
  );
}

function asNetwork(value: string | undefined): StellarNetwork | undefined {
  return value === "testnet" || value === "mainnet" ? value : undefined;
}

/**
 * Merges the API config with the env overrides. Returns `null` when a
 * required field is missing from both sources.
 */
export function resolveStellarConfig(api: ApiStellarConfig | null): StellarConfig | null {
  const network = asNetwork(envOverrides.network) ?? asNetwork(api?.network);
  const networkPassphrase =
    envOverrides.networkPassphrase ?? api?.networkPassphrase ?? (network ? PASSPHRASES[network] : undefined);
  const rpcUrl = envOverrides.rpcUrl ?? api?.rpcUrl;
  const usdcSacId = envOverrides.usdcSacId ?? api?.usdcSacId;
  const vault = envOverrides.vault ?? api?.contracts.vault;
  const subscriptions = envOverrides.subscriptions ?? api?.contracts.subscriptions;
  const payroll = envOverrides.payroll ?? api?.contracts.payroll;

  if (!networkPassphrase || !rpcUrl || !usdcSacId || !vault || !subscriptions || !payroll) {
    return null;
  }

  const resolvedNetwork: StellarNetwork =
    network ?? (networkPassphrase === PASSPHRASES.mainnet ? "mainnet" : "testnet");

  return {
    network: resolvedNetwork,
    networkPassphrase,
    rpcUrl,
    usdcSacId,
    contracts: { vault, subscriptions, payroll },
    usdcIssuer: envOverrides.usdcIssuer ?? null,
  };
}

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1").replace(/\/+$/, "");

export const CIRCLE_FAUCET_URL = "https://faucet.circle.com";

/** Friendbot needs the address as a query parameter (the bare URL returns 400). */
export function friendbotUrl(address: string): string {
  return `https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`;
}

export function stellarLabFundUrl(address: string): string {
  return `https://lab.stellar.org/account/fund?$=network$id=testnet;;&account$address=${encodeURIComponent(address)};;`;
}

export function explorerTxUrl(config: Pick<StellarConfig, "network">, hash: string): string {
  const net = config.network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/tx/${hash}`;
}

export function explorerAccountUrl(config: Pick<StellarConfig, "network">, address: string): string {
  const net = config.network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/account/${address}`;
}

export function explorerContractUrl(config: Pick<StellarConfig, "network">, id: string): string {
  const net = config.network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/contract/${id}`;
}

export function shortAddress(address: string, head = 4, tail = 4): string {
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

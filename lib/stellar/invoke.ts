import {
  Account,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

import type { StellarConfig } from "./config";
import { describeContractError, describeHostError, parseContractErrorCode, type ErrorContract } from "./errors";
import { rpcServer } from "./rpc";

/** Asks the connected wallet to sign a transaction envelope (base64 XDR) and returns the signed XDR. */
export type SignTransaction = (xdr: string) => Promise<string>;

export type TxErrorKind =
  | "simulation"
  | "rejected"
  | "submit"
  | "failed"
  | "timeout"
  | "restore"
  | "network";

/** A user-facing transaction error. `message` is safe to show as-is. */
export class StellarTxError extends Error {
  constructor(
    readonly kind: TxErrorKind,
    message: string,
    readonly details: {
      hash?: string;
      contract?: ErrorContract;
      code?: number;
      errorName?: string;
      raw?: string;
    } = {},
  ) {
    super(message);
    this.name = "StellarTxError";
  }
}

export interface CallSpec {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
  /** Which error table applies to this contract. */
  contract: ErrorContract;
}

export interface InvokeResult {
  hash: string;
  ledger: number;
  returnValue: unknown;
}

const USER_REJECTED = /reject|declin|denied|cancel|closed|user refused/i;

/** Maps an error thrown by the wallet kit to a `StellarTxError`. */
export function walletErrorToTxError(error: unknown): StellarTxError {
  const message = errorMessage(error);
  if (USER_REJECTED.test(message)) {
    return new StellarTxError("rejected", "You rejected the request in your wallet.", { raw: message });
  }
  return new StellarTxError("rejected", `The wallet could not sign the transaction: ${message}`, { raw: message });
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function simulationError(spec: CallSpec, raw: string): StellarTxError {
  const code = parseContractErrorCode(raw);
  if (code !== null) {
    // The SAC is invoked as a sub-call by the vault / subscriptions / payroll;
    // when the code is not one of the contract's own, try the SAC table.
    const own = describeContractError(spec.contract, code);
    if (!own.name.startsWith("Unknown") || spec.contract === "usdc") {
      return new StellarTxError("simulation", own.message, { contract: spec.contract, code, errorName: own.name, raw });
    }
    const sac = describeContractError("usdc", code);
    return new StellarTxError("simulation", sac.message, { contract: "usdc", code, errorName: sac.name, raw });
  }
  const host = describeHostError(raw);
  return new StellarTxError("simulation", host ?? `The transaction simulation failed: ${raw}`, { raw });
}

function buildTx(config: StellarConfig, source: Account, spec: CallSpec, timeoutSeconds: number) {
  return new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase: config.networkPassphrase })
    .addOperation(new Contract(spec.contractId).call(spec.method, ...spec.args))
    .setTimeout(timeoutSeconds)
    .build();
}

/**
 * Simulates a read-only call and returns its native value. Nothing is signed
 * or submitted; `source` only needs to be a syntactically valid account id.
 */
export async function simulateRead<T = unknown>(
  config: StellarConfig,
  spec: CallSpec,
  source: string,
): Promise<T> {
  const server = rpcServer(config.rpcUrl);
  const tx = buildTx(config, new Account(source, "0"), spec, 60);
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw simulationError(spec, sim.error);
  }
  if (!sim.result) {
    throw new StellarTxError("simulation", `The call to ${spec.method} returned no result.`);
  }
  return scValToNative(sim.result.retval) as T;
}

/** Current ledger sequence (for allowance expirations and ledger-time maths). */
export async function latestLedger(config: StellarConfig): Promise<number> {
  const server = rpcServer(config.rpcUrl);
  const latest = await server.getLatestLedger();
  return latest.sequence;
}

/**
 * Builds a contract call, simulates it, assembles the Soroban data, asks the
 * wallet to sign, submits and polls until the transaction is final.
 *
 * Throws `StellarTxError` with a user-facing message for every failure path:
 * simulation (contract error codes mapped per contract), wallet rejection,
 * submission errors, on-chain failure and polling timeout.
 */
export async function invoke(
  config: StellarConfig,
  spec: CallSpec,
  options: { source: string; sign: SignTransaction; timeoutSeconds?: number; pollAttempts?: number },
): Promise<InvokeResult> {
  const server = rpcServer(config.rpcUrl);

  let account: Account;
  try {
    account = await server.getAccount(options.source);
  } catch {
    throw new StellarTxError(
      "network",
      "Your Stellar account was not found on this network. Fund it with XLM first (Friendbot on testnet).",
    );
  }

  const tx = buildTx(config, account, spec, options.timeoutSeconds ?? 120);
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw simulationError(spec, sim.error);
  }
  if (rpc.Api.isSimulationRestore(sim)) {
    throw new StellarTxError(
      "restore",
      "Some contract data has been archived and must be restored before this call works. Please contact the maintainers.",
    );
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  return signAndSubmit(config, prepared.toXDR(), spec.method, options);
}

/**
 * Signs an already-built envelope with the wallet, submits it and polls.
 * Used by `invoke` and by classic operations (e.g. `changeTrust`).
 */
export async function signAndSubmit(
  config: StellarConfig,
  envelopeXdr: string,
  label: string,
  options: { sign: SignTransaction; pollAttempts?: number },
): Promise<InvokeResult> {
  const server = rpcServer(config.rpcUrl);

  let signedXdr: string;
  try {
    signedXdr = await options.sign(envelopeXdr);
  } catch (error) {
    throw walletErrorToTxError(error);
  }

  const signed = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);
  const sent = await server.sendTransaction(signed);

  if (sent.status === "TRY_AGAIN_LATER") {
    throw new StellarTxError("submit", "The network is busy; please try again in a moment.", { hash: sent.hash });
  }
  if (sent.status === "ERROR") {
    const raw = sent.errorResult ? sent.errorResult.toXDR("base64") : "unknown error";
    throw new StellarTxError("submit", `The network rejected the ${label} transaction.`, { hash: sent.hash, raw });
  }

  const result = await server.pollTransaction(sent.hash, { attempts: options.pollAttempts ?? 30 });

  if (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    throw new StellarTxError(
      "timeout",
      "The transaction was submitted but is not confirmed yet. Check the explorer link before retrying.",
      { hash: sent.hash },
    );
  }
  if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
    throw new StellarTxError("failed", `The ${label} transaction failed on-chain.`, {
      hash: sent.hash,
      raw: result.resultXdr.toXDR("base64"),
    });
  }

  return {
    hash: sent.hash,
    ledger: result.ledger,
    returnValue: result.returnValue ? scValToNative(result.returnValue) : undefined,
  };
}

/** Builds and submits a classic (non-Soroban) transaction with the given operations. */
export async function submitClassic(
  config: StellarConfig,
  operations: xdr.Operation[],
  label: string,
  options: { source: string; sign: SignTransaction; timeoutSeconds?: number },
): Promise<InvokeResult> {
  const server = rpcServer(config.rpcUrl);
  let account: Account;
  try {
    account = await server.getAccount(options.source);
  } catch {
    throw new StellarTxError(
      "network",
      "Your Stellar account was not found on this network. Fund it with XLM first (Friendbot on testnet).",
    );
  }
  const builder = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: config.networkPassphrase });
  for (const op of operations) builder.addOperation(op);
  const tx = builder.setTimeout(options.timeoutSeconds ?? 120).build();
  return signAndSubmit(config, tx.toXDR(), label, options);
}

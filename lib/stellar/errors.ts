/**
 * Contract error tables and user-facing messages.
 *
 * The numeric codes are copied from each contract's `src/errors.rs` in
 * RL-smart-contracts (vault, subscriptions, payroll). `npm run check:errors`
 * (scripts/check-contract-errors.mjs) parses those files and fails when the
 * tables drift. The USDC SAC table comes from `soroban-env-host`'s
 * `builtin_contracts/contract_error.rs` (read 2026-10-28). Authorization
 * failures are host errors, not contract codes.
 */

export type RubbiContract = "vault" | "subscriptions" | "payroll";
export type ErrorContract = RubbiContract | "usdc";

export interface ContractErrorEntry {
  name: string;
  message: string;
}

export const VAULT_ERRORS: Record<number, ContractErrorEntry> = {
  1: { name: "InvalidAmount", message: "The amount must be greater than zero." },
  2: { name: "InsufficientBalance", message: "Your Rubbi wallet balance is smaller than that amount." },
  3: { name: "Paused", message: "The vault is paused. Deposits are blocked for now; withdrawals still work." },
  4: { name: "DuplicateReference", message: "This settlement reference was already used." },
  5: { name: "NoPendingAdmin", message: "No admin transfer is pending." },
  6: { name: "Overflow", message: "The amount is too large to process." },
};

export const SUBSCRIPTIONS_ERRORS: Record<number, ContractErrorEntry> = {
  1: { name: "InvalidAmount", message: "The amount must be greater than zero." },
  2: { name: "Paused", message: "The subscriptions contract is paused. New subscriptions and charges are blocked; you can still pause or cancel." },
  3: { name: "FeeTooHigh", message: "The fee exceeds the 10% cap." },
  4: { name: "InvalidPeriod", message: "The billing period must be between 1 day and 366 days." },
  5: { name: "NameTooLong", message: "The plan name is longer than 64 bytes." },
  6: { name: "MerchantExists", message: "This address is already a merchant." },
  7: { name: "MerchantNotFound", message: "This address is not an approved merchant." },
  8: { name: "MerchantInactive", message: "This merchant is deactivated and cannot take new subscribers." },
  9: { name: "PlanNotFound", message: "This plan does not exist." },
  10: { name: "PlanInactive", message: "This plan is no longer accepting new subscribers." },
  11: { name: "NotPlanOwner", message: "Only the merchant that owns this plan can change it." },
  12: { name: "AlreadySubscribed", message: "You already have an active subscription to this plan." },
  13: { name: "SubscriptionNotFound", message: "This subscription does not exist." },
  14: { name: "NotSubscriber", message: "Only the subscriber can change this subscription." },
  15: { name: "NotDue", message: "This subscription is not due yet." },
  16: { name: "NotChargeable", message: "This subscription is paused or cancelled and cannot be charged." },
  17: { name: "NotPausable", message: "Only active or past-due subscriptions can be paused." },
  18: { name: "NotPaused", message: "Only paused subscriptions can be resumed." },
  19: { name: "AlreadyCancelled", message: "This subscription is already cancelled." },
  20: { name: "PaymentFailed", message: "The first payment could not be pulled. Check your USDC balance and the approved allowance, then try again." },
  21: { name: "BatchTooLarge", message: "At most 25 items can be processed in one batch." },
  22: { name: "NoPendingAdmin", message: "No admin transfer is pending." },
  23: { name: "Overflow", message: "The amount is too large to process." },
  24: { name: "PayoutUnavailable", message: "This merchant cannot receive USDC right now (its payout address has no usable USDC trustline)." },
};

export const PAYROLL_ERRORS: Record<number, ContractErrorEntry> = {
  1: { name: "InvalidAmount", message: "The amount must be greater than zero." },
  2: { name: "Paused", message: "The payroll contract is paused. Funding, new schedules and payouts are blocked; escrow withdrawals still work." },
  3: { name: "FeeTooHigh", message: "The fee exceeds the 10% cap." },
  4: { name: "InvalidPeriod", message: "The pay period must be between 1 day and 366 days." },
  5: { name: "LabelTooLong", message: "A schedule label is longer than 64 bytes." },
  6: { name: "InsufficientEscrow", message: "Your escrow balance is smaller than that amount." },
  7: { name: "TooManySchedules", message: "At most 25 schedules can be created in one transaction." },
  8: { name: "FirstDueInPast", message: "The first payment date must be in the future." },
  9: { name: "ScheduleNotFound", message: "This schedule does not exist." },
  10: { name: "NotEmployer", message: "Only the employer that created this schedule can change it." },
  11: { name: "NotActive", message: "This schedule is not active (it is paused or cancelled)." },
  12: { name: "NotPaused", message: "Only paused schedules can be resumed." },
  13: { name: "AlreadyCancelled", message: "This schedule is already cancelled." },
  14: { name: "NotDue", message: "This schedule is not due yet." },
  15: { name: "BatchTooLarge", message: "At most 25 schedules can be paid in one batch." },
  16: { name: "NoPendingAdmin", message: "No admin transfer is pending." },
  17: { name: "Overflow", message: "The amount is too large to process." },
};

/** Stellar Asset Contract errors (`soroban-env-host/src/builtin_contracts/contract_error.rs`). */
export const USDC_SAC_ERRORS: Record<number, ContractErrorEntry> = {
  2: { name: "OperationNotSupportedError", message: "This operation is not supported by the asset contract." },
  3: { name: "AlreadyInitializedError", message: "The asset contract is already initialised." },
  4: { name: "UnauthorizedError", message: "The asset issuer has not authorised this account to hold USDC." },
  5: { name: "AuthenticationError", message: "The asset contract rejected the authorisation." },
  6: { name: "AccountMissingError", message: "The Stellar account does not exist. Fund it with XLM first." },
  7: { name: "AccountIsNotClassic", message: "This operation needs a classic Stellar account (G...)." },
  8: { name: "NegativeAmountError", message: "The amount cannot be negative." },
  9: { name: "AllowanceError", message: "The approved USDC allowance is too small or has expired." },
  10: { name: "BalanceError", message: "Insufficient USDC balance (or the receiver's trustline limit would be exceeded)." },
  11: { name: "BalanceDeauthorizedError", message: "The USDC trustline is frozen by the issuer." },
  12: { name: "OverflowError", message: "The amount is too large to process." },
  13: { name: "TrustlineMissingError", message: "The account has no USDC trustline. Enable USDC first." },
  14: { name: "InsufficientAccountReserve", message: "The account does not hold enough XLM reserve." },
  15: { name: "TooManyAccountSubentries", message: "The account has too many subentries." },
};

export const CONTRACT_ERRORS: Record<ErrorContract, Record<number, ContractErrorEntry>> = {
  vault: VAULT_ERRORS,
  subscriptions: SUBSCRIPTIONS_ERRORS,
  payroll: PAYROLL_ERRORS,
  usdc: USDC_SAC_ERRORS,
};

export const CONTRACT_LABELS: Record<ErrorContract, string> = {
  vault: "Rubbi vault",
  subscriptions: "subscriptions contract",
  payroll: "payroll contract",
  usdc: "USDC asset contract",
};

/**
 * Extracts the contract error code from a simulation or diagnostic message
 * such as `HostError: Error(Contract, #4)`. Returns null for host errors.
 */
export function parseContractErrorCode(message: string): number | null {
  const match = /Error\(Contract,\s*#(\d+)\)/.exec(message);
  return match && match[1] ? Number(match[1]) : null;
}

export function describeContractError(contract: ErrorContract, code: number): ContractErrorEntry {
  return (
    CONTRACT_ERRORS[contract][code] ?? {
      name: `Unknown(${code})`,
      message: `The ${CONTRACT_LABELS[contract]} returned error code ${code}.`,
    }
  );
}

/** Host-level failures that are not contract codes. */
export function describeHostError(message: string): string | null {
  if (/Error\(Auth,\s*InvalidAction\)|require_auth|Auth, InvalidAction/.test(message)) {
    return "The transaction was not authorised by the required account.";
  }
  if (/Error\(Storage,\s*MissingValue\)|MissingValue/.test(message)) {
    return "A required ledger entry is missing (the contract or account may not exist on this network).";
  }
  if (/Error\(Budget,\s*ExceededLimit\)|ExceededLimit/.test(message)) {
    return "The transaction exceeds the network's resource limits.";
  }
  if (/archived|RESTORE/i.test(message)) {
    return "Some contract data has been archived and must be restored before this call works. Please contact the maintainers.";
  }
  return null;
}

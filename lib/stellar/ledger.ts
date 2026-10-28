/**
 * Ledger-time helpers. Stellar closes a ledger every ~5 seconds (measured on
 * testnet and mainnet on 2026-10-27: 100 ledgers in 500 s; the network's
 * `ledger_target_close_time_milliseconds` is 5000).
 */

export const LEDGER_SECONDS = 5;

/**
 * `max_entry_ttl` from the live `state_archival` ConfigSetting on testnet and
 * mainnet (read on 2026-10-28): the farthest ledger an entry's TTL (and so a
 * SAC allowance's `expiration_ledger`) may point to, relative to the current
 * ledger. TODO(verify): re-read if the networks change the setting.
 */
export const MAX_ENTRY_TTL = 3_110_400;

/** A safety margin added to approval expirations so the last period is still covered. */
export const EXPIRATION_BUFFER_LEDGERS = Math.ceil((24 * 60 * 60) / LEDGER_SECONDS);

export function ledgersForSeconds(seconds: number): number {
  return Math.ceil(seconds / LEDGER_SECONDS);
}

/**
 * Expiration ledger for a SAC `approve` that must cover `periods` periods of
 * `periodSeconds` each, starting now. Capped at the network's maximum TTL.
 */
export function approvalExpirationLedger(currentLedger: number, periodSeconds: number, periods: number): number {
  const wanted = currentLedger + ledgersForSeconds(periodSeconds * periods) + EXPIRATION_BUFFER_LEDGERS;
  const max = currentLedger + MAX_ENTRY_TTL - 1;
  return Math.min(wanted, max);
}

/** Approximate wall-clock date at which `targetLedger` closes. */
export function ledgerToApproxDate(currentLedger: number, targetLedger: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + (targetLedger - currentLedger) * LEDGER_SECONDS * 1000);
}

export function formatPeriod(seconds: number): string {
  const day = 86_400;
  if (seconds % (30 * day) === 0) {
    const months = seconds / (30 * day);
    return months === 1 ? "every 30 days" : `every ${months * 30} days`;
  }
  if (seconds % (7 * day) === 0) {
    const weeks = seconds / (7 * day);
    return weeks === 1 ? "weekly" : `every ${weeks} weeks`;
  }
  if (seconds % day === 0) {
    const days = seconds / day;
    return days === 1 ? "daily" : `every ${days} days`;
  }
  return `every ${seconds} s`;
}

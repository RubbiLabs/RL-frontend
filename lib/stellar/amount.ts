/**
 * USDC amount helpers. USDC on Stellar has 7 decimals and contract amounts
 * are i128 "stroops". Every conversion here is string/bigint based: no
 * floating-point arithmetic is used for money anywhere in the frontend.
 */

export const USDC_DECIMALS = 7;
export const SCALE = 10n ** BigInt(USDC_DECIMALS);

/** Same rule as the API: a positive decimal with at most 7 decimals. */
const AMOUNT_RE = /^\d+(\.\d{1,7})?$/;

/** `true` when `input` is a positive decimal USDC amount with at most 7 decimals. */
export function isValidUsdcAmount(input: string): boolean {
  const trimmed = input.trim();
  if (!AMOUNT_RE.test(trimmed)) return false;
  return parseUsdc(trimmed) > 0n;
}

/**
 * Parses a decimal string ("12.5", "0.0000001") into stroops. Throws on
 * malformed input, more than 7 decimals or a negative sign.
 */
export function parseUsdc(input: string): bigint {
  const trimmed = input.trim();
  if (!AMOUNT_RE.test(trimmed)) {
    throw new Error(`invalid USDC amount: "${input}"`);
  }
  const [whole, fraction = ""] = trimmed.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(USDC_DECIMALS, "0"));
}

/** Like `parseUsdc` but returns `null` instead of throwing. */
export function tryParseUsdc(input: string): bigint | null {
  try {
    return parseUsdc(input);
  } catch {
    return null;
  }
}

/**
 * Formats stroops as a plain decimal string. `trim` (default true) drops
 * trailing zeros but always keeps at least `minDecimals` decimals.
 */
export function formatUsdc(
  stroops: bigint | string | number,
  { minDecimals = 2, maxDecimals = USDC_DECIMALS }: { minDecimals?: number; maxDecimals?: number } = {},
): string {
  const value = typeof stroops === "bigint" ? stroops : BigInt(stroops);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / SCALE;
  let fraction = (abs % SCALE).toString().padStart(USDC_DECIMALS, "0");
  fraction = fraction.slice(0, Math.max(minDecimals, maxDecimals));
  while (fraction.length > minDecimals && fraction.endsWith("0")) {
    fraction = fraction.slice(0, -1);
  }
  const wholeStr = whole.toLocaleString("en-US");
  return `${negative ? "-" : ""}${wholeStr}${fraction.length > 0 ? `.${fraction}` : ""}`;
}

/** Formats an API decimal string ("12.5000000") for display, without float math. */
export function formatUsdcDecimal(decimal: string, opts?: { minDecimals?: number; maxDecimals?: number }): string {
  const trimmed = decimal.trim();
  const negative = trimmed.startsWith("-");
  const body = negative ? trimmed.slice(1) : trimmed;
  const parsed = tryParseUsdc(body);
  if (parsed === null) return decimal;
  return formatUsdc(negative ? -parsed : parsed, opts);
}

/** XLM also has 7 decimals; same formatting rules. */
export const formatXlm = formatUsdc;

/** Floor division helper: how many `unit`-sized payments `total` covers. */
export function coveredPayments(total: bigint, unit: bigint): number {
  if (unit <= 0n || total <= 0n) return 0;
  const n = total / unit;
  return n > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(n);
}

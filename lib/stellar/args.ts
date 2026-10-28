import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";

/**
 * Explicit ScVal builders: every argument states its XDR type so a JS number
 * is never guessed into the wrong integer width.
 */
export const arg = {
  address: (value: string) => new Address(value).toScVal(),
  i128: (value: bigint) => nativeToScVal(value, { type: "i128" }),
  u64: (value: bigint) => nativeToScVal(value, { type: "u64" }),
  u32: (value: number) => xdr.ScVal.scvU32(value),
  bool: (value: boolean) => xdr.ScVal.scvBool(value),
  string: (value: string) => xdr.ScVal.scvString(value),
  symbol: (value: string) => xdr.ScVal.scvSymbol(value),
  u64Vec: (values: bigint[]) => xdr.ScVal.scvVec(values.map((v) => nativeToScVal(v, { type: "u64" }))),
  vec: (values: xdr.ScVal[]) => xdr.ScVal.scvVec(values),
  /** A `#[contracttype]` struct: a map keyed by symbols, sorted by key (Soroban requires sorted maps). */
  struct: (fields: Record<string, xdr.ScVal>) =>
    xdr.ScVal.scvMap(
      Object.keys(fields)
        .sort()
        .map((key) => new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(key), val: fields[key] })),
    ),
};

/** Normalises a unit enum variant (`["Active"]` or `"Active"`) to its name. */
export function enumName(value: unknown): string {
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === "string") return value[0];
  if (typeof value === "string") return value;
  throw new Error(`not an enum variant: ${JSON.stringify(value)}`);
}

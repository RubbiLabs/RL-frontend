#!/usr/bin/env node
/**
 * Checks lib/stellar/errors.ts against the contracts' errors.rs files.
 *
 * Usage: node scripts/check-contract-errors.mjs [path/to/RL-smart-contracts]
 * Defaults to ../RL-smart-contracts. Exits 0 with a notice when the default
 * sibling repo is not present (local checkout without ../RL-smart-contracts),
 * and exits 1 when an explicit path argument is missing or on any drift.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const explicitContractsArg = process.argv[2];
const contractsRoot = resolve(
  explicitContractsArg ?? resolve(here, "..", "..", "RL-smart-contracts"),
);
const errorsTs = readFileSync(resolve(here, "..", "lib", "stellar", "errors.ts"), "utf8");

const CONTRACTS = {
  vault: "VAULT_ERRORS",
  subscriptions: "SUBSCRIPTIONS_ERRORS",
  payroll: "PAYROLL_ERRORS",
};

function parseRust(source) {
  const codes = new Map();
  const body = source.slice(source.indexOf("pub enum Error"));
  for (const match of body.matchAll(/^\s*([A-Z][A-Za-z0-9]*)\s*=\s*(\d+)\s*,/gm)) {
    codes.set(Number(match[2]), match[1]);
  }
  return codes;
}

function parseTs(constName) {
  const start = errorsTs.indexOf(`export const ${constName}`);
  if (start < 0) throw new Error(`${constName} not found in errors.ts`);
  const end = errorsTs.indexOf("};", start);
  const body = errorsTs.slice(start, end);
  const codes = new Map();
  for (const match of body.matchAll(/^\s*(\d+):\s*\{\s*name:\s*"([A-Za-z0-9]+)"/gm)) {
    codes.set(Number(match[1]), match[2]);
  }
  return codes;
}

if (!existsSync(contractsRoot)) {
  if (explicitContractsArg !== undefined) {
    console.error(`check-contract-errors: contracts repo not found at ${contractsRoot}`);
    process.exit(1);
  }
  console.log(`check-contract-errors: contracts repo not found at ${contractsRoot}; skipping`);
  process.exit(0);
}

let drift = 0;
for (const [contract, constName] of Object.entries(CONTRACTS)) {
  const rustPath = resolve(contractsRoot, "contracts", contract, "src", "errors.rs");
  const rust = parseRust(readFileSync(rustPath, "utf8"));
  const ts = parseTs(constName);
  const all = new Set([...rust.keys(), ...ts.keys()]);
  for (const code of [...all].sort((a, b) => a - b)) {
    const r = rust.get(code);
    const t = ts.get(code);
    if (r !== t) {
      drift++;
      console.error(`${contract}: code ${code} is ${r ?? "missing"} in errors.rs but ${t ?? "missing"} in errors.ts`);
    }
  }
  if (rust.size === 0) {
    drift++;
    console.error(`${contract}: no variants parsed from ${rustPath}`);
  }
  console.log(`${contract}: ${ts.size} codes, ${rust.size} in errors.rs ${drift === 0 ? "ok" : ""}`);
}

process.exit(drift === 0 ? 0 : 1);

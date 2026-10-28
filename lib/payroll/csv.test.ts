import assert from "node:assert/strict";
import test from "node:test";
import { Keypair } from "@stellar/stellar-sdk";

import { chunkScheduleInputs, detectDelimiter, parseCsvLine, parsePayrollCsv } from "./csv.ts";
import { validateFirstDue, validateRow, validateRows } from "./validate.ts";

function generateAddresses(count: number): string[] {
  return Array.from({ length: count }, () => Keypair.random().publicKey());
}

test("detectDelimiter identifies comma and semicolon delimiters while ignoring quoted characters", () => {
  assert.equal(detectDelimiter("recipient,amount,period_days,label"), ",");
  assert.equal(detectDelimiter("recipient;amount;period_days;label"), ";");
  assert.equal(detectDelimiter('"a;b;c",amount,period_days,label'), ",");
});

test("parseCsvLine handles quoted fields with commas, semicolons, and escaped quotes", () => {
  const commaLine = parseCsvLine('GABC,120.50,30,"Engineering, Platform ""Core"""', ",");
  assert.equal(commaLine.unclosedQuote, false);
  assert.deepEqual(commaLine.fields, ["GABC", "120.50", "30", 'Engineering, Platform "Core"']);

  const semiLine = parseCsvLine('GABC;120.50;14;"Ops; Lead, EMEA"', ";");
  assert.equal(semiLine.unclosedQuote, false);
  assert.deepEqual(semiLine.fields, ["GABC", "120.50", "14", "Ops; Lead, EMEA"]);
});

test("40-row valid CSV previews 40 ok rows, 2 transactions, and chunks into 25 + 15", () => {
  const [employer, ...recipients] = generateAddresses(41);
  const lines = ["recipient,amount,period_days,label"];
  for (let i = 0; i < 40; i++) {
    lines.push(`${recipients[i]},10.25,30,"Team member ${i + 1}, R&D"`);
  }

  const parsed = parsePayrollCsv(lines.join("\n"), employer);
  assert.equal(parsed.headerError, null);
  assert.equal(parsed.rows.length, 40);
  assert.equal(parsed.validCount, 40);
  assert.equal(parsed.invalidCount, 0);
  assert.equal(parsed.transactionCount, 2);
  assert.equal(parsed.totalPerPeriod, 40n * 102500000n);

  const batches = chunkScheduleInputs(parsed.rows);
  assert.equal(batches.length, 2);
  assert.equal(batches[0].length, 25);
  assert.equal(batches[1].length, 15);
  assert.equal(batches[0][0].amount, 102500000n);
  assert.equal(batches[0][0].period, BigInt(30 * 86_400));
});

test("semicolon delimiter is supported with quoted commas and semicolons", () => {
  const [employer, r1, r2] = generateAddresses(3);
  const csv = [
    "recipient;amount;period_days;label",
    `${r1};100;30;"Design, Brand; Lead"`,
    `${r2};50.1234567;7;QA`,
  ].join("\r\n");

  const parsed = parsePayrollCsv(csv, employer);
  assert.equal(parsed.delimiter, ";");
  assert.equal(parsed.headerError, null);
  assert.equal(parsed.validCount, 2);
  assert.equal(parsed.invalidCount, 0);
  assert.equal(parsed.rows[0].label, "Design, Brand; Lead");
  assert.equal(parsed.totalPerPeriod, 1501234567n);
});

test("invalid rows (bad address, 8 decimals, 0 days, >366 days, >64-byte label, employer self-pay, duplicate recipient) are flagged with specific errors", () => {
  const [employer, validAddr, otherAddr] = generateAddresses(3);
  const longLabel = "A".repeat(70);

  const csv = [
    "recipient,amount,period_days,label",
    `BAD_ADDRESS,100,30,Dev`,
    `${validAddr},10.12345678,30,EightDecimals`,
    `${otherAddr},10,0,ZeroDays`,
    `${otherAddr},10,400,TooManyDays`,
    `${otherAddr},10,30,${longLabel}`,
    `${employer},10,30,SelfPay`,
    `${validAddr},25,30,FirstValid`,
    `${validAddr},30,14,DuplicateRecipient`,
  ].join("\n");

  const parsed = parsePayrollCsv(csv, employer);
  assert.equal(parsed.headerError, null);
  assert.equal(parsed.rows.length, 8);
  assert.equal(parsed.validCount, 1);
  assert.equal(parsed.invalidCount, 7);

  assert.match(parsed.rows[0].error ?? "", /Stellar account/i);
  assert.match(parsed.rows[1].error ?? "", /max 7 decimals/i);
  assert.match(parsed.rows[2].error ?? "", /between 1 and 366 days/i);
  assert.match(parsed.rows[3].error ?? "", /between 1 and 366 days/i);
  assert.match(parsed.rows[4].error ?? "", /70 bytes; the maximum is 64/i);
  assert.match(parsed.rows[5].error ?? "", /cannot be the employer/i);
  assert.equal(parsed.rows[6].error, null);
  assert.match(parsed.rows[7].error ?? "", /Duplicate recipient/i);
});

test("validateRow, validateRows and validateFirstDue enforce contract boundaries", () => {
  const [employer, r1] = generateAddresses(2);
  assert.equal(
    validateRow({ recipient: r1, amount: "1", periodDays: "366", label: "ok" }, employer),
    null,
  );
  const rows = validateRows(
    [
      { recipient: r1, amount: "1", periodDays: "30", label: "first" },
      { recipient: r1, amount: "2", periodDays: "30", label: "second" },
    ],
    employer,
  );
  assert.equal(rows[0], null);
  assert.match(rows[1] ?? "", /Duplicate recipient/);

  const now = 1_700_000_000_000;
  assert.match(validateFirstDue("not-a-date", now) ?? "", /Pick a first payment date/);
  assert.match(validateFirstDue(new Date(now + 5 * 60 * 1000).toISOString(), now) ?? "", /at least 10 minutes/);
  assert.equal(validateFirstDue(new Date(now + 15 * 60 * 1000).toISOString(), now), null);
});

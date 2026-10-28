import { isValidUsdcAmount, parseUsdc } from "../stellar/amount.ts";

import { MAX_SCHEDULES_PER_CALL, rowToScheduleInput, validateRows, type ScheduleInput, type ScheduleRowDraft } from "./validate.ts";

export const EXPECTED_HEADERS = ["recipient", "amount", "period_days", "label"] as const;

export const CSV_TEMPLATE = [
  "recipient,amount,period_days,label",
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF,250.00,30,\"Product designer\"",
  "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBW7I,180.50,14,\"Backend engineer, platform\"",
].join("\n") + "\n";

export interface ParsedCsvRow extends ScheduleRowDraft {
  rowNumber: number;
  error: string | null;
}

export interface CsvParseResult {
  delimiter: "," | ";";
  headerError: string | null;
  rows: ParsedCsvRow[];
  validCount: number;
  invalidCount: number;
  totalPerPeriod: bigint;
  transactionCount: number;
}

/**
 * Detects whether a header line uses `,` or `;` outside quoted segments.
 */
export function detectDelimiter(headerLine: string): "," | ";" {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;

  for (let i = 0; i < headerLine.length; i++) {
    const ch = headerLine[i];
    if (ch === '"') {
      if (inQuotes && headerLine[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes) {
      if (ch === ",") commas++;
      else if (ch === ";") semicolons++;
    }
  }

  return semicolons > commas ? ";" : ",";
}

/**
 * Splits a single CSV record using RFC 4180 quoting rules for the chosen delimiter.
 */
export function parseCsvLine(line: string, delimiter: "," | ";"): { fields: string[]; unclosedQuote: boolean } {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  fields.push(current);
  return { fields, unclosedQuote: inQuotes };
}

/**
 * Splits CSV text into logical lines while respecting quoted newlines and
 * stripping a leading UTF-8 BOM if present.
 */
function splitCsvLines(text: string): string[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      if (inQuotes && clean[i + 1] === '"') {
        current += '""';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      current += ch;
    } else if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && clean[i + 1] === "\n") {
        i++;
      }
      if (current.trim().length > 0) {
        lines.push(current);
      }
      current = "";
    } else {
      current += ch;
    }
  }

  if (current.trim().length > 0) {
    lines.push(current);
  }

  return lines;
}

/**
 * Parses and validates a payroll CSV string on the client.
 */
export function parsePayrollCsv(text: string, employer: string | null): CsvParseResult {
  const lines = splitCsvLines(text);
  if (lines.length === 0) {
    return {
      delimiter: ",",
      headerError: "CSV is empty. Include a header row: recipient,amount,period_days,label.",
      rows: [],
      validCount: 0,
      invalidCount: 0,
      totalPerPeriod: 0n,
      transactionCount: 0,
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerParsed = parseCsvLine(lines[0], delimiter);
  const normalizedHeader = headerParsed.fields.map((h) => h.trim().toLowerCase());

  const headerMatches =
    !headerParsed.unclosedQuote &&
    normalizedHeader.length === EXPECTED_HEADERS.length &&
    EXPECTED_HEADERS.every((expected, idx) => normalizedHeader[idx] === expected);

  if (!headerMatches) {
    return {
      delimiter,
      headerError: "Header row must be: recipient,amount,period_days,label.",
      rows: [],
      validCount: 0,
      invalidCount: 0,
      totalPerPeriod: 0n,
      transactionCount: 0,
    };
  }

  const drafts: ScheduleRowDraft[] = [];
  const columnErrors = new Map<number, string>();

  for (let i = 1; i < lines.length; i++) {
    const parsed = parseCsvLine(lines[i], delimiter);
    const rowIdx = drafts.length;

    if (parsed.unclosedQuote) {
      columnErrors.set(rowIdx, "Malformed CSV row: unclosed quote.");
      drafts.push({ recipient: "", amount: "", periodDays: "", label: "" });
      continue;
    }

    if (parsed.fields.length !== EXPECTED_HEADERS.length) {
      columnErrors.set(
        rowIdx,
        `Expected ${EXPECTED_HEADERS.length} columns (recipient,amount,period_days,label), got ${parsed.fields.length}.`,
      );
    }

    const [recipient = "", amount = "", periodDays = "", label = ""] = parsed.fields;
    drafts.push({
      recipient: recipient.trim(),
      amount: amount.trim(),
      periodDays: periodDays.trim(),
      label: label.trim(),
    });
  }

  const validationErrors = validateRows(drafts, employer);
  const rows: ParsedCsvRow[] = drafts.map((draft, idx) => ({
    ...draft,
    rowNumber: idx + 1,
    error: columnErrors.get(idx) ?? validationErrors[idx],
  }));

  const validCount = rows.filter((r) => r.error === null).length;
  const invalidCount = rows.length - validCount;
  const totalPerPeriod = rows.reduce(
    (sum, r) => (isValidUsdcAmount(r.amount) ? sum + parseUsdc(r.amount) : sum),
    0n,
  );
  const transactionCount = rows.length > 0 ? Math.ceil(rows.length / MAX_SCHEDULES_PER_CALL) : 0;

  return {
    delimiter,
    headerError: null,
    rows,
    validCount,
    invalidCount,
    totalPerPeriod,
    transactionCount,
  };
}

/**
 * Splits validated rows into batches of at most `batchSize` (default 25) `ScheduleInput`s.
 */
export function chunkScheduleInputs(
  rows: ScheduleRowDraft[],
  batchSize = MAX_SCHEDULES_PER_CALL,
): ScheduleInput[][] {
  if (batchSize < 1) throw new Error("batchSize must be at least 1");
  const inputs = rows.map(rowToScheduleInput);
  const chunks: ScheduleInput[][] = [];
  for (let i = 0; i < inputs.length; i += batchSize) {
    chunks.push(inputs.slice(i, i + batchSize));
  }
  return chunks;
}

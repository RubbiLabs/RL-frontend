"use client";
import React from "react";

import { formatUsdc, isValidUsdcAmount, tryParseUsdc } from "@/lib/stellar/amount";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  /** Upper bound in stroops; enables a "Max" button and validation. */
  max?: bigint | null;
  disabled?: boolean;
  symbol?: string;
}

/** Decimal USDC input validated as a string (at most 7 decimals); no float conversion. */
export default function AmountInput({ value, onChange, label, placeholder = "0.00", max, disabled, symbol = "USDC" }: Props) {
  const parsed = tryParseUsdc(value);
  const invalid = value.trim() !== "" && !isValidUsdcAmount(value);
  const overMax = parsed !== null && max !== null && max !== undefined && parsed > max;

  return (
    <div>
      {label && <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">{label}</label>}
      <div
        className={`flex items-center rounded-xl border bg-white px-3 ${
          invalid || overMax ? "border-red-300" : "border-neutral-200 focus-within:border-primary/50"
        }`}
      >
        <input
          inputMode="decimal"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
          className="flex-1 py-3 text-sm bg-transparent focus:outline-none disabled:opacity-50"
        />
        <span className="text-xs font-bold text-neutral-400 mr-2">{symbol}</span>
        {max !== null && max !== undefined && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(formatUsdc(max, { minDecimals: 0, maxDecimals: 7 }).replace(/,/g, ""))}
            className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline disabled:opacity-50"
          >
            Max
          </button>
        )}
      </div>
      {invalid && <p className="text-xs text-red-600 mt-1">Enter a positive amount with at most 7 decimals.</p>}
      {!invalid && overMax && max !== null && max !== undefined && (
        <p className="text-xs text-red-600 mt-1">Above the available {formatUsdc(max)} {symbol}.</p>
      )}
    </div>
  );
}

"use client";
import React from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";

/**
 * Shown on every marketing page. Rubbi runs on Stellar testnet today: USDC
 * comes from Circle's testnet faucet, and cards are issued by a mock issuer.
 */
export default function TestnetNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm px-4 py-2.5 rounded-xl ${className}`}
    >
      <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-widest text-[11px]">
        <FlaskConical size={14} /> Testnet
      </span>
      <span>
        Rubbi currently runs on Stellar <strong>testnet</strong> with test USDC and a mock card
        issuer. No real money moves.{" "}
        <Link href="/docs" className="underline underline-offset-2 font-semibold hover:text-amber-700">
          How to get test funds
        </Link>
      </span>
    </div>
  );
}

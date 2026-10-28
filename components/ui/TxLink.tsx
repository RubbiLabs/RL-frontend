"use client";
import { ExternalLink } from "lucide-react";

import { useStellarWallet } from "@/context/StellarWalletContext";
import { explorerTxUrl } from "@/lib/stellar/config";

export default function TxLink({ hash, label }: { hash: string; label?: string }) {
  const { config } = useStellarWallet();
  if (!config) return <span className="font-mono text-xs">{hash.slice(0, 8)}…</span>;
  return (
    <a
      href={explorerTxUrl(config, hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
    >
      {label ?? `${hash.slice(0, 8)}…`} <ExternalLink size={11} />
    </a>
  );
}

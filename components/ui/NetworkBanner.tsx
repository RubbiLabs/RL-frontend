"use client";

import { useStellarWallet } from "@/context/StellarWalletContext";

/** Shown when the wallet is on another Stellar network than the app's configuration. */
export function NetworkBanner() {
  const { config, networkMismatch, walletNetworkPassphrase } = useStellarWallet();
  if (!config || !networkMismatch) return null;

  return (
    <div className="bg-yellow-400 text-yellow-950 px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium">
      <span>
        Your wallet is on <span className="font-mono text-xs">{walletNetworkPassphrase}</span>. Switch it to{" "}
        <strong>Stellar {config.network}</strong> to sign transactions.
      </span>
    </div>
  );
}

"use client";
import { useQuery } from "@tanstack/react-query";
import type { Asset } from "@stellar/stellar-sdk";

import { useStellarWallet } from "@/context/StellarWalletContext";
import { getAccountState, resolveUsdcAsset } from "@/lib/stellar/account";
import { latestLedger } from "@/lib/stellar/invoke";
import { escrowOf } from "@/lib/stellar/payroll";
import { getAllowance } from "@/lib/stellar/sac";
import { vaultBalance } from "@/lib/stellar/vault";

/** Direct ledger reads (RPC); all keys start with "chain" so a tx can invalidate them together. */

export function useUsdcAsset() {
  const { config, address } = useStellarWallet();
  return useQuery<Asset>({
    queryKey: ["chain", "usdc-asset", config?.usdcSacId, address],
    queryFn: () => resolveUsdcAsset(config!, address!),
    enabled: Boolean(config && address),
    staleTime: Infinity,
  });
}

export function useAccountState() {
  const { config, address } = useStellarWallet();
  const asset = useUsdcAsset();
  return useQuery({
    queryKey: ["chain", "account", address, asset.data?.getIssuer()],
    queryFn: () => getAccountState(config!, address!, asset.data!),
    enabled: Boolean(config && address && asset.data),
    refetchInterval: 20_000,
  });
}

export function useVaultBalance() {
  const { config, address } = useStellarWallet();
  return useQuery({
    queryKey: ["chain", "vault-balance", address],
    queryFn: () => vaultBalance(config!, address!),
    enabled: Boolean(config && address),
    refetchInterval: 20_000,
  });
}

export function useEscrow() {
  const { config, address } = useStellarWallet();
  return useQuery({
    queryKey: ["chain", "escrow", address],
    queryFn: () => escrowOf(config!, address!),
    enabled: Boolean(config && address),
    refetchInterval: 20_000,
  });
}

export function useAllowance() {
  const { config, address } = useStellarWallet();
  return useQuery({
    queryKey: ["chain", "allowance", address],
    queryFn: () => getAllowance(config!, address!, config!.contracts.subscriptions),
    enabled: Boolean(config && address),
    refetchInterval: 30_000,
  });
}

export function useLatestLedger() {
  const { config } = useStellarWallet();
  return useQuery({
    queryKey: ["chain", "latest-ledger", config?.rpcUrl],
    queryFn: () => latestLedger(config!),
    enabled: Boolean(config),
    refetchInterval: 30_000,
  });
}

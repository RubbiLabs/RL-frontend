"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api, apiErrorMessage, onUnauthorized, session } from "@/lib/api";
import { hasCompleteEnvConfig, resolveStellarConfig, type StellarConfig } from "@/lib/stellar/config";
import { StellarTxError, walletErrorToTxError } from "@/lib/stellar/invoke";
import { initWalletKit, type LoadedKit } from "@/lib/stellar/walletKit";
import type { ApiUser } from "@/types/api";

export interface StellarWalletValue {
  /** `true` once the kit is loaded and a previous session (if any) was restored. */
  isHydrated: boolean;
  config: StellarConfig | null;
  configError: string | null;

  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  walletNetworkPassphrase: string | null;
  /** The wallet is on a different network than the app's configuration. */
  networkMismatch: boolean;
  connect: () => Promise<string>;
  disconnect: () => Promise<void>;
  /** Asks the wallet to sign an envelope for the configured network. */
  signTransaction: (xdr: string) => Promise<string>;

  token: string | null;
  user: ApiUser | null;
  isSignedIn: boolean;
  isSigningIn: boolean;
  /** SEP-10: challenge → wallet signature → JWT. Requires a connected wallet. */
  signIn: () => Promise<ApiUser>;
  signOut: () => void;
  refreshUser: () => Promise<ApiUser | null>;
  setUser: (user: ApiUser) => void;
}

const StellarWalletContext = createContext<StellarWalletValue | null>(null);

export function StellarWalletProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const kitRef = useRef<LoadedKit | null>(null);

  const envOnly = hasCompleteEnvConfig();
  const configQuery = useQuery({
    queryKey: ["stellar-config"],
    queryFn: api.stellar.config,
    enabled: !envOnly,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
  const config = useMemo(
    () => resolveStellarConfig(configQuery.data ?? null),
    [configQuery.data],
  );
  const configError = configQuery.isError
    ? `Could not load the network configuration: ${apiErrorMessage(configQuery.error)}`
    : !envOnly && configQuery.isSuccess && !config
      ? "The API returned an incomplete network configuration."
      : null;

  const [isHydrated, setIsHydrated] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletNetworkPassphrase, setWalletNetworkPassphrase] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUserState] = useState<ApiUser | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signOut = useCallback(() => {
    session.clear();
    setToken(null);
    setUserState(null);
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "stellar-config" });
  }, [queryClient]);

  // A 401 from the API means the JWT expired or was revoked.
  useEffect(() => onUnauthorized(() => signOut()), [signOut]);

  const refreshUser = useCallback(async (): Promise<ApiUser | null> => {
    if (!session.token()) return null;
    try {
      const me = await api.users.me();
      setUserState(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  // Load the kit once the network is known, subscribe to its state and restore a previous session.
  useEffect(() => {
    if (!config) return;
    let cancelled = false;
    let unsubscribe: Array<() => void> = [];

    (async () => {
      try {
        const loaded = await initWalletKit(config.networkPassphrase);
        if (cancelled) return;
        kitRef.current = loaded;

        unsubscribe = [
          loaded.kit.on(loaded.KitEventType.STATE_UPDATED, (event) => {
            setAddress(event.payload.address ?? null);
            setWalletNetworkPassphrase(event.payload.networkPassphrase || null);
          }),
          loaded.kit.on(loaded.KitEventType.DISCONNECT, () => {
            setAddress(null);
            setWalletNetworkPassphrase(null);
            signOut();
          }),
        ];

        const stored = session.get();
        if (stored) {
          try {
            const { address: current } = await loaded.kit.getAddress();
            if (current === stored.address) {
              setAddress(current);
              setToken(stored.token);
              try {
                const network = await loaded.kit.getNetwork();
                setWalletNetworkPassphrase(network.networkPassphrase);
              } catch {
                // Some wallets do not expose the network; the banner stays hidden.
              }
              await refreshUser();
            } else {
              session.clear();
            }
          } catch {
            session.clear();
          }
        }
      } catch (error) {
        console.error("wallet kit failed to load", error);
      } finally {
        if (!cancelled) setIsHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe.forEach((fn) => fn());
    };
  }, [config, refreshUser, signOut]);

  const connect = useCallback(async (): Promise<string> => {
    const loaded = kitRef.current;
    if (!loaded) throw new Error("The wallet kit is not ready yet.");
    setIsConnecting(true);
    try {
      const { address: next } = await loaded.kit.authModal();
      setAddress(next);
      try {
        const network = await loaded.kit.getNetwork();
        setWalletNetworkPassphrase(network.networkPassphrase);
      } catch {
        setWalletNetworkPassphrase(null);
      }
      const stored = session.get();
      if (stored && stored.address !== next) signOut();
      return next;
    } catch (error) {
      throw walletErrorToTxError(error);
    } finally {
      setIsConnecting(false);
    }
  }, [signOut]);

  const disconnect = useCallback(async () => {
    signOut();
    setAddress(null);
    setWalletNetworkPassphrase(null);
    try {
      await kitRef.current?.kit.disconnect();
    } catch {
      // Already disconnected.
    }
  }, [signOut]);

  const networkMismatch = Boolean(
    config && walletNetworkPassphrase && walletNetworkPassphrase !== config.networkPassphrase,
  );

  const signTransaction = useCallback(
    async (xdr: string): Promise<string> => {
      const loaded = kitRef.current;
      if (!loaded || !address || !config) throw new StellarTxError("rejected", "Connect a wallet first.");
      if (networkMismatch) {
        throw new StellarTxError(
          "network",
          `Your wallet is on another network. Switch it to ${config.network} and try again.`,
        );
      }
      try {
        const { signedTxXdr } = await loaded.kit.signTransaction(xdr, {
          networkPassphrase: config.networkPassphrase,
          address,
        });
        return signedTxXdr;
      } catch (error) {
        throw walletErrorToTxError(error);
      }
    },
    [address, config, networkMismatch],
  );

  const signIn = useCallback(async (): Promise<ApiUser> => {
    if (!address) throw new Error("Connect a wallet first.");
    setIsSigningIn(true);
    try {
      const challenge = await api.auth.challenge(address);
      if (config && challenge.network_passphrase !== config.networkPassphrase) {
        throw new Error("The API's SEP-10 challenge is for a different network than this app.");
      }
      const loaded = kitRef.current;
      if (!loaded) throw new Error("The wallet kit is not ready yet.");
      let signed: string;
      try {
        signed = (
          await loaded.kit.signTransaction(challenge.transaction, {
            networkPassphrase: challenge.network_passphrase,
            address,
          })
        ).signedTxXdr;
      } catch (error) {
        throw walletErrorToTxError(error);
      }
      const result = await api.auth.token(signed);
      session.set({ token: result.token, address });
      setToken(result.token);
      const me = await api.users.me();
      setUserState(me);
      return me;
    } finally {
      setIsSigningIn(false);
    }
  }, [address, config]);

  const value = useMemo<StellarWalletValue>(
    () => ({
      isHydrated,
      config,
      configError,
      address,
      isConnected: Boolean(address),
      isConnecting,
      walletNetworkPassphrase,
      networkMismatch,
      connect,
      disconnect,
      signTransaction,
      token,
      user,
      isSignedIn: Boolean(token && address),
      isSigningIn,
      signIn,
      signOut,
      refreshUser,
      setUser: setUserState,
    }),
    [
      isHydrated,
      config,
      configError,
      address,
      isConnecting,
      walletNetworkPassphrase,
      networkMismatch,
      connect,
      disconnect,
      signTransaction,
      token,
      user,
      isSigningIn,
      signIn,
      signOut,
      refreshUser,
    ],
  );

  return <StellarWalletContext.Provider value={value}>{children}</StellarWalletContext.Provider>;
}

export function useStellarWallet(): StellarWalletValue {
  const ctx = useContext(StellarWalletContext);
  if (!ctx) throw new Error("useStellarWallet must be used within StellarWalletProvider");
  return ctx;
}

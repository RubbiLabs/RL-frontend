"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api, apiErrorMessage, onUnauthorized, session } from "@/lib/api";
import { hasCompleteEnvConfig, resolveStellarConfig, shortAddress, type StellarConfig } from "@/lib/stellar/config";
import { StellarTxError, walletAccessErrorToTxError, walletErrorToTxError } from "@/lib/stellar/invoke";
import { FREIGHTER_MODULE_ID, initWalletKit, type LoadedKit } from "@/lib/stellar/walletKit";
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

  /**
   * Confirms that the wallet has granted this site access and returns the
   * account it exposes.
   *
   * In kit 2.7.1 `kit.getAddress()` only reads the kit's memory (restored from
   * localStorage) and never contacts the wallet, so an address can be shown
   * while Freighter has not allowed the site; signing then fails with
   * "<site> is not currently connected to Freighter". `kit.fetchAddress()`
   * calls the module's `getAddress()` without `skipRequestAccess`, which for
   * Freighter runs `requestAccess()`: the connect popup when the site is not
   * allowed yet, a silent return when it is. Other wallets open their own
   * prompt on every address fetch, so for them the kit's memory is trusted.
   *
   * When `expected` is given and the wallet exposes another account (the user
   * switched accounts in the wallet), the session is dropped, the new address
   * is adopted and the caller gets an error asking to sign in again. Nothing is
   * ever signed for an address other than the one shown in the app.
   */
  const ensureWalletAccess = useCallback(
    async (loaded: LoadedKit, expected: string | null): Promise<string> => {
      let granted: string;
      try {
        const current = loaded.kit.selectedModule;
        granted =
          current.productId === FREIGHTER_MODULE_ID
            ? (await loaded.kit.fetchAddress()).address
            : (await loaded.kit.getAddress()).address;
      } catch (error) {
        throw walletAccessErrorToTxError(error);
      }
      if (expected && granted !== expected) {
        signOut();
        setAddress(granted);
        throw new StellarTxError(
          "rejected",
          `Your wallet switched accounts. Sign in again with ${shortAddress(granted)}.`,
        );
      }
      return granted;
    },
    [signOut],
  );

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
            // Confirms site access with the wallet; a different account or a
            // denied request throws, and the session is dropped below.
            const current = await ensureWalletAccess(loaded, stored.address);
            setAddress(current);
            setToken(stored.token);
            try {
              const network = await loaded.kit.getNetwork();
              setWalletNetworkPassphrase(network.networkPassphrase);
            } catch {
              // Some wallets do not expose the network; the banner stays hidden.
            }
            await refreshUser();
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
  }, [config, ensureWalletAccess, refreshUser, signOut]);

  const connect = useCallback(async (): Promise<string> => {
    const loaded = kitRef.current;
    if (!loaded) throw new Error("The wallet kit is not ready yet.");
    setIsConnecting(true);
    try {
      await loaded.kit.authModal();
      // The modal's address is not trusted until the wallet confirms the site
      // has access (Freighter shows its connect popup here if it has not).
      const next = await ensureWalletAccess(loaded, null);
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
      throw error instanceof StellarTxError ? error : walletErrorToTxError(error);
    } finally {
      setIsConnecting(false);
    }
  }, [ensureWalletAccess, signOut]);

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
      await ensureWalletAccess(loaded, address);
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
    [address, config, ensureWalletAccess, networkMismatch],
  );

  const signIn = useCallback(async (): Promise<ApiUser> => {
    if (!address) throw new Error("Connect a wallet first.");
    setIsSigningIn(true);
    try {
      const loaded = kitRef.current;
      if (!loaded) throw new Error("The wallet kit is not ready yet.");
      // Site access first: without it Freighter refuses to sign the challenge.
      await ensureWalletAccess(loaded, address);
      const challenge = await api.auth.challenge(address);
      if (config && challenge.network_passphrase !== config.networkPassphrase) {
        throw new Error("The API's SEP-10 challenge is for a different network than this app.");
      }
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
  }, [address, config, ensureWalletAccess]);

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

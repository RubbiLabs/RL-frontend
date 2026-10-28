"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, KeyRound, Shield, User, Wallet } from "lucide-react";

import CardVisual from "@/components/card/CardVisual";
import Button from "@/components/ui/Button";
import { NetworkBanner } from "@/components/ui/NetworkBanner";
import RubbiLogo from "@/components/ui/RubbiLogo";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useToast } from "@/context/ToastContext";
import { api, apiErrorMessage } from "@/lib/api";
import { shortAddress } from "@/lib/stellar/config";
import { errorMessage } from "@/lib/stellar/invoke";

type Step = "connect" | "sign-in" | "username" | "card";

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

export default function OnboardingPage() {
  const router = useRouter();
  const {
    isHydrated,
    configError,
    address,
    isConnected,
    isConnecting,
    connect,
    isSignedIn,
    isSigningIn,
    signIn,
    user,
    setUser,
    networkMismatch,
    config,
  } = useStellarWallet();
  const { success, error } = useToast();

  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const step: Step = !isConnected ? "connect" : !isSignedIn ? "sign-in" : !user?.username ? "username" : "card";

  useEffect(() => {
    if (user?.username) setUsername(user.username);
  }, [user?.username]);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (err) {
      error("Connection failed", errorMessage(err));
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn();
      success("Signed in", "Your wallet signed the SEP-10 challenge.");
    } catch (err) {
      error("Sign-in failed", apiErrorMessage(err));
    }
  };

  const handleUsername = async () => {
    const value = username.trim().toLowerCase();
    if (!USERNAME_RE.test(value)) {
      setUsernameError("3–32 characters: lowercase letters, numbers and underscores.");
      return;
    }
    setUsernameError(null);
    setSavingUsername(true);
    try {
      const me = await api.users.setUsername(value);
      setUser(me);
      success("Username set", "Your Rubbi card has been created.");
    } catch (err) {
      setUsernameError(apiErrorMessage(err));
    } finally {
      setSavingUsername(false);
    }
  };

  if (!isHydrated && !configError) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-neutral-400">Loading…</div>;
  }

  const steps: Array<{ id: Step; label: string; icon: React.ReactNode }> = [
    { id: "connect", label: "Connect wallet", icon: <Wallet size={14} /> },
    { id: "sign-in", label: "Sign in (SEP-10)", icon: <KeyRound size={14} /> },
    { id: "username", label: "Choose username", icon: <User size={14} /> },
    { id: "card", label: "Your card", icon: <Shield size={14} /> },
  ];
  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="min-h-screen bg-neutral-50 font-manrope">
      <NetworkBanner />
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <RubbiLogo size={32} />
              <span className="text-2xl font-bold text-primary">
                <span className="text-3xl text-primary-400 font-extrabold">u</span>bbi
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-neutral-900">Welcome to Rubbi</h1>
            <p className="text-sm text-neutral-500 mt-2">
              Connect a Stellar wallet, sign in, pick a username and get your card.
              {config && <span className="block mt-1 text-xs uppercase tracking-widest text-amber-700">Stellar {config.network}</span>}
            </p>
          </div>

          <ol className="flex items-center justify-between mb-8 text-[11px] font-bold uppercase tracking-widest">
            {steps.map((s, i) => (
              <li key={s.id} className={`flex items-center gap-1.5 ${i <= stepIndex ? "text-primary" : "text-neutral-400"}`}>
                {i < stepIndex ? <CheckCircle size={14} /> : s.icon}
                <span className="hidden sm:inline">{s.label}</span>
              </li>
            ))}
          </ol>

          {configError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{configError}</div>
          )}

          <div className="bg-white rounded-2xl border-2 border-neutral-200 p-6 space-y-5">
            {step === "connect" && (
              <>
                <h2 className="font-bold text-neutral-900">Connect your Stellar wallet</h2>
                <p className="text-sm text-neutral-500">
                  Freighter, xBull, Albedo, Lobstr and other Stellar wallets are supported. Rubbi never holds your keys.
                </p>
                <Button fullWidth size="lg" icon={<Wallet size={18} />} loading={isConnecting} onClick={handleConnect} disabled={Boolean(configError)}>
                  Connect wallet
                </Button>
              </>
            )}

            {step === "sign-in" && address && (
              <>
                <h2 className="font-bold text-neutral-900">Sign in with your wallet</h2>
                <p className="text-sm text-neutral-500">
                  Rubbi uses SEP-10: your wallet signs a challenge transaction that is never submitted to the network. This
                  proves you control <span className="font-mono">{shortAddress(address, 6, 6)}</span>.
                </p>
                {networkMismatch && (
                  <p className="text-xs text-amber-700">Switch your wallet to Stellar {config?.network} before signing.</p>
                )}
                <Button fullWidth size="lg" icon={<KeyRound size={18} />} loading={isSigningIn} onClick={handleSignIn} disabled={networkMismatch}>
                  Sign challenge
                </Button>
              </>
            )}

            {step === "username" && (
              <>
                <h2 className="font-bold text-neutral-900">Choose a username</h2>
                <p className="text-sm text-neutral-500">
                  One username per Stellar address; it cannot be changed later. Setting it creates your Rubbi card.
                </p>
                <div>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    placeholder="e.g. ada_lovelace"
                    maxLength={32}
                    autoComplete="off"
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {usernameError && <p className="text-xs text-red-600 mt-2">{usernameError}</p>}
                </div>
                <Button fullWidth size="lg" icon={<ArrowRight size={18} />} iconPosition="right" loading={savingUsername} onClick={handleUsername}>
                  Save username and create card
                </Button>
              </>
            )}

            {step === "card" && user?.card && (
              <>
                <h2 className="font-bold text-neutral-900">Your Rubbi card is ready</h2>
                <CardVisual card={user.card} holder={`@${user.username}`} className="mx-auto" />
                {user.card.issuer === "MOCK" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    This card comes from the mock issuer: it has no real card number and cannot be used outside this testnet
                    demo. Load it from your Rubbi wallet balance on the Card page.
                  </p>
                )}
                <Button fullWidth size="lg" icon={<ArrowRight size={18} />} iconPosition="right" onClick={() => router.push("/dashboard")}>
                  Go to dashboard
                </Button>
              </>
            )}

            {step === "card" && user && !user.card && (
              <>
                <h2 className="font-bold text-neutral-900">Card pending</h2>
                <p className="text-sm text-neutral-500">Your card is not available yet. Continue to the dashboard.</p>
                <Button fullWidth size="lg" onClick={() => router.push("/dashboard")}>
                  Go to dashboard
                </Button>
              </>
            )}
          </div>

          {address && (
            <p className="text-center text-xs text-neutral-400 mt-4 font-mono break-all">{address}</p>
          )}
        </div>
      </div>
    </div>
  );
}

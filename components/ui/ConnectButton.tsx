"use client";

import { Wallet } from "lucide-react";
import { useRouter } from "next/navigation";

import Button from "@/components/ui/Button";
import { useStellarWallet } from "@/context/StellarWalletContext";

/** Landing-page entry point: connected and signed in → dashboard, otherwise onboarding. */
export function ConnectButton({ size = "md", label = "Connect wallet" }: { size?: "sm" | "md" | "lg"; label?: string }) {
  const router = useRouter();
  const { isSignedIn, isConnecting } = useStellarWallet();

  return (
    <Button
      size={size}
      icon={<Wallet size={16} />}
      loading={isConnecting}
      onClick={() => router.push(isSignedIn ? "/dashboard" : "/onboarding")}
    >
      {isSignedIn ? "Go to dashboard" : label}
    </Button>
  );
}

"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut, Wallet, Copy, Check } from "lucide-react";

import Button from "@/components/ui/Button";
import RubbiLogo from "@/components/ui/RubbiLogo";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { useToast } from "@/context/ToastContext";
import { shortAddress } from "@/lib/stellar/config";

interface DashboardNavbarProps {
  onMenuClick: () => void;
}

export default function DashboardNavbar({ onMenuClick }: DashboardNavbarProps) {
  const router = useRouter();
  const { disconnect, address, user, config } = useStellarWallet();
  const { info } = useToast();
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDisconnect = async () => {
    await disconnect();
    info("Signed out", "Your wallet is disconnected.");
    router.push("/");
  };

  const copyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable: the address is still visible.
    }
  };

  return (
    <>
      <header className="bg-neutral-50 border-b border-neutral-200 px-5 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <RubbiLogo size={28} />
          </div>
          {config && (
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                config.network === "mainnet" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {config.network}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={copyAddress}
            title={address ?? ""}
            className="hidden sm:flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2 hover:border-primary/40 transition-colors"
          >
            <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
              <Wallet size={11} className="text-primary" />
            </div>
            <span className="text-[13px] font-medium text-neutral-600 leading-none">
              {user?.username ? `@${user.username}` : address ? shortAddress(address, 6, 4) : ""}
            </span>
            {address && (copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} className="text-neutral-400" />)}
          </button>

          <button
            onClick={() => setShowDisconnectModal(true)}
            title="Sign out"
            className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scaleIn">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Disconnect wallet?</h3>
            <p className="text-sm text-neutral-500 mb-6">
              Your session token will be discarded and you will be redirected to the homepage.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowDisconnectModal(false)}>
                Cancel
              </Button>
              <Button
                fullWidth
                variant="danger"
                onClick={() => {
                  setShowDisconnectModal(false);
                  void handleDisconnect();
                }}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

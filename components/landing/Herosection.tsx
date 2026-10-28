"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Shield, Wallet, Zap, ArrowUpRight, Repeat } from "lucide-react";
import { useStellarWallet } from "@/context/StellarWalletContext";
import Button from "@/components/ui/Button";
import TestnetNotice from "@/components/landing/TestnetNotice";

export default function HeroSection() {
  const router = useRouter();
  const { isSignedIn, isConnecting } = useStellarWallet();

  const handleConnect = async () => {
    router.push(isSignedIn ? "/dashboard" : "/onboarding");
  };

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl translate-x-1/3 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-[#8dbcd794] blur-3xl -translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full bg-secondary/4 blur-3xl -translate-x-1/2 -translate-y-1/2" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #22577A 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <div className="px-6 lg:px-36 py-24 w-full flex items-center justify-between gap-12">
        {/* Left copy */}
        <div className="flex-1 max-w-2xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 bg-primary/8 text-primary text-[11px] font-bold px-3.5 py-1.5 rounded-full mb-7 animate-fadeIn tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Built on Stellar · Testnet preview
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[68px] font-extrabold text-neutral-900 leading-[1.04] tracking-tight mb-6 animate-slideUp">
            Automate Your
            <br />
            Financial <span className="text-primary">Life.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base lg:text-lg text-neutral-500 leading-relaxed max-w-xl mb-10">
            Hold USDC in a Rubbi wallet on Stellar, load it onto a virtual card, pay recurring subscriptions from your own wallet and run payroll from an escrow — all signed with your own Stellar wallet.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 mb-12">
            <Button
              size="lg"
              icon={<Wallet size={18} />}
              loading={isConnecting}
              onClick={handleConnect}
            >
              {isSignedIn ? "Go to Dashboard" : "Get Started"}
            </Button>

          </div>

          {/* Facts */}
          <div className="flex flex-wrap items-center gap-6 text-neutral-400 mb-8">
            <div className="flex items-center gap-2">
              <Shield size={14} />
              <span className="text-xs font-semibold">Subscriptions pull from a bounded allowance you set</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={14} />
              <span className="text-xs font-semibold">Stellar ledgers close in about 5 seconds</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard size={14} />
              <span className="text-xs font-semibold">Virtual card (mock issuer on testnet)</span>
            </div>
          </div>

          <TestnetNotice className="max-w-xl" />
        </div>

        {/* Right animated scene */}
        <div className="relative hidden lg:block flex-1 max-w-[520px]">
          {/* Virtual Card */}
          <div className="relative bg-primary rounded-[28px] p-6 text-white card-shine aspect-[1.586/1] animate-floatSlow shadow-[0_22px_60px_rgba(34,87,122,0.3)] max-w-[380px] ml-auto">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/55">Rubbi Virtual Card · Mock</p>
              <CreditCard size={18} className="text-white/70" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#EBCB7B] mb-7" />
            <p className="font-mono tracking-[0.28em] text-sm mb-7">•••• •••• •••• 6721</p>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] text-white/45 uppercase tracking-[0.28em] mb-1">Holder</p>
                <p className="text-sm font-bold text-white">RUBBI USER</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-white/45 uppercase tracking-[0.28em] mb-1">Expires</p>
                <p className="text-sm font-bold text-white">09/30</p>
              </div>
            </div>
          </div>

          {/* Floating notification - Subscription */}
          <div className="absolute -left-4 top-[220px] rounded-2xl bg-white border border-neutral-200 px-4 py-3 shadow-xl animate-floatReverse z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                <Repeat size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900">Monthly subscription</p>
                <p className="text-xs text-green-600 font-semibold">Charged 12.00 USDC · Active</p>
              </div>
            </div>
          </div>

          {/* Floating notification - Card load */}
          <div className="absolute right-0 bottom-[60px] rounded-2xl bg-neutral-950 text-white px-4 py-3 shadow-xl animate-floatSlow z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Repeat size={16} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/45">Card loaded</p>
                <p className="text-sm font-semibold">+50.00 USDC on card</p>
              </div>
            </div>
          </div>

          {/* Floating notification - Payroll */}
          <div className="absolute left-8 bottom-[-10px] rounded-2xl bg-primary text-white px-4 py-3 shadow-xl animate-driftSideways z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/12 flex items-center justify-center">
                <ArrowUpRight size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/55">Payroll</p>
                <p className="text-sm font-semibold">+245.00 USDC paid out</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

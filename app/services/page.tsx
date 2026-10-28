"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, DollarSign, Shield, Wallet, ArrowRight, CreditCard } from "lucide-react";
import LandingNavbar from "../../components/layout/LandingNavbar";
import LandingFooter from "../../components/layout/LandingFooter";
import TestnetNotice from "../../components/landing/TestnetNotice";
import { useStellarWallet } from "@/context/StellarWalletContext";
import Button from "../../components/ui/Button";

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function Tag({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
        dark ? "bg-white/10 text-white/80" : "bg-primary/8 text-primary"
      }`}
    >
      {children}
    </span>
  );
}

export default function ServicesPage() {
  const router = useRouter();
  const { isSignedIn, isHydrated, isConnecting } = useStellarWallet();

  useEffect(() => {
    if (!isHydrated) return;
    if (isSignedIn) router.replace("/dashboard");
  }, [isSignedIn, isHydrated, router]);

  const handleConnect = () => {
    router.push("/onboarding");
  };

  if (isHydrated && isSignedIn) return null;

  return (
    <div className="min-h-screen bg-neutral-50 font-manrope overflow-x-hidden">
      <LandingNavbar />

      {/* HERO */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-secondary/5 blur-3xl" />
        </div>
        <div className="px-6 lg:px-36">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4 animate-fadeIn">
              What Rubbi does
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 leading-[1.05] mb-6 animate-slideUp">
              A USDC wallet, a card,
              <br />
              <span className="text-primary">subscriptions and payroll.</span>
            </h1>
            <p className="text-neutral-500 leading-relaxed mb-8">
              Four flows, all on Stellar, all signed with your own wallet. This page describes exactly what the
              app does today; nothing more.
            </p>
            <TestnetNotice className="mx-auto max-w-2xl" />
          </div>
        </div>
      </section>

      {/* WALLET AND CARD */}
      <section className="py-20 bg-white">
        <div className="px-6 lg:px-36">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <FadeIn>
              <div className="w-12 h-12 bg-primary/8 rounded-xl flex items-center justify-center mb-6">
                <CreditCard size={24} className="text-primary" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-5">Rubbi wallet and virtual card</h2>
              <p className="text-neutral-500 leading-relaxed mb-6">
                Deposit USDC from your Stellar account into your Rubbi wallet, an on-chain vault you can withdraw
                from at any time. Load part of that balance onto a virtual card, spend from the card, and unload
                whatever you do not use back into the wallet. On testnet the card comes from a mock issuer and is
                clearly labelled MOCK; it has no real card number.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                <Tag>Deposit and withdraw any time</Tag>
                <Tag>Load and unload the card</Tag>
                <Tag>Freeze and unfreeze</Tag>
              </div>
              <Button icon={<ArrowRight size={16} />} iconPosition="right" onClick={handleConnect} loading={isConnecting}>
                Get started
              </Button>
            </FadeIn>
            <FadeIn delay={150}>
              <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-100 space-y-4">
                {[
                  { label: "Deposit to Rubbi wallet", amount: "+100.00", note: "signed in your wallet" },
                  { label: "Load card", amount: "−40.00", note: "settled on-chain, then funded at the issuer" },
                  { label: "Card purchase", amount: "−12.50", note: "card balance only" },
                  { label: "Unload card", amount: "+27.50", note: "refunded to the vault by the treasury" },
                ].map((row) => (
                  <div key={row.label} className="bg-white rounded-xl p-4 flex items-center justify-between border border-neutral-100">
                    <div>
                      <p className="font-semibold text-neutral-800 text-sm">{row.label}</p>
                      <p className="text-xs text-neutral-400">{row.note}</p>
                    </div>
                    <p className="font-bold text-primary text-sm">
                      {row.amount} <span className="text-xs text-neutral-400 font-medium">USDC</span>
                    </p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* SUBSCRIPTIONS */}
      <section className="py-20 bg-primary text-white">
        <div className="px-6 lg:px-36">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <FadeIn delay={150}>
              <div className="bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/10 space-y-3">
                {[
                  { step: "1", title: "Approve", desc: "Grant the subscriptions contract a USDC allowance for 3 periods, with an expiry." },
                  { step: "2", title: "Subscribe", desc: "The first period is charged now and the next due date is set." },
                  { step: "3", title: "Each period", desc: "The keeper calls charge when it is due. Not enough allowance: the subscription is marked past due and nothing is pulled." },
                  { step: "4", title: "Top up or cancel", desc: "Extend the allowance from the dashboard, or pause, resume and cancel from your wallet." },
                ].map((s) => (
                  <div key={s.step} className="flex gap-4 bg-white/5 rounded-xl p-4">
                    <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold shrink-0">{s.step}</span>
                    <div>
                      <p className="text-sm font-semibold">{s.title}</p>
                      <p className="text-xs text-white/60 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn>
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                <Calendar size={24} className="text-white" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-5">Subscriptions from your own wallet</h2>
              <p className="text-white/70 leading-relaxed mb-6">
                Plans are published on-chain by merchants Rubbi has allowlisted. Your funds stay in your Stellar
                account: you approve a bounded, expiring USDC allowance and each period&apos;s payment is pulled on
                its due date, never early and never twice. If you fall behind, you are charged once, not for every
                missed period.
              </p>
              <div className="flex flex-wrap gap-2">
                <Tag dark>Allowance you control</Tag>
                <Tag dark>Pause, resume, cancel</Tag>
                <Tag dark>0.5% fee to Rubbi</Tag>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* PAYROLL */}
      <section className="py-20 bg-white">
        <div className="px-6 lg:px-36">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <FadeIn>
              <div className="w-12 h-12 bg-primary/8 rounded-xl flex items-center justify-center mb-6">
                <DollarSign size={24} className="text-primary" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-5">Payroll from an escrow</h2>
              <p className="text-neutral-500 leading-relaxed mb-6">
                Fund a payroll escrow in USDC and create recurring schedules for your team: recipient, amount,
                period (1 to 366 days) and a label, up to 25 schedules per transaction. When a schedule is due,
                the keeper pays it; you can also pay everything due with one click. A missed period stays owed
                and is paid one period at a time. Unused escrow can be withdrawn whenever you like.
              </p>
              <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-8">
                <div>
                  <p className="text-2xl font-extrabold text-primary">25</p>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mt-1">Schedules per tx</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-primary">0.5%</p>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mt-1">Fee per payment</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-primary">1–366</p>
                  <p className="text-xs text-neutral-400 uppercase tracking-wider mt-1">Days per period</p>
                </div>
              </div>
            </FadeIn>
            <FadeIn delay={150}>
              <div className="bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100">
                <div className="bg-neutral-800 p-3 flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="p-6 font-mono text-sm space-y-2">
                  <p className="text-green-500">payroll.create_schedules</p>
                  <p className="text-neutral-400">recipient: GABC…XYZ</p>
                  <p className="text-neutral-400">amount: 450.00 USDC</p>
                  <p className="text-neutral-400">period: 30 days</p>
                  <p className="text-neutral-400">label: &quot;Design lead&quot;</p>
                  <p className="text-green-400 mt-3">✓ schedule_created #1</p>
                  <p className="text-primary">next due in 30 days</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* SIGN-IN */}
      <section className="py-20 bg-neutral-50">
        <div className="px-6 lg:px-36">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <FadeIn>
              <div className="w-12 h-12 bg-primary/8 rounded-xl flex items-center justify-center mb-6">
                <Shield size={24} className="text-primary" />
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-5">Sign in with your Stellar wallet</h2>
              <p className="text-neutral-500 leading-relaxed mb-6">
                There is no password. You connect a Stellar wallet such as Freighter, sign a SEP-10 challenge, and
                pick a username. Rubbi never sees your secret key, and every transaction is shown to you by your
                wallet before it is signed.
              </p>
              <div className="flex flex-wrap gap-2">
                <Tag>SEP-10</Tag>
                <Tag>One username per address</Tag>
                <Tag>Keys stay in your wallet</Tag>
              </div>
            </FadeIn>
            <FadeIn delay={150}>
              <div className="bg-white rounded-2xl p-8 border border-neutral-100">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Not in the app yet</p>
                <p className="text-sm text-neutral-500 leading-relaxed mb-4">
                  Buying USDC with naira, swapping XLM to USDC, passkey wallets, fee sponsorship and a production
                  card issuer are planned work, tracked as open issues on GitHub. The landing pages only describe
                  what you can use today.
                </p>
                <Link href="/docs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-secondary">
                  Read the guide <ArrowRight size={14} />
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-24 bg-white">
        <div className="px-6 lg:px-36 text-center">
          <FadeIn>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-5">Try it on testnet</h2>
            <p className="text-neutral-500 mb-8">
              Switch Freighter to testnet, get XLM from Friendbot and USDC from Circle&apos;s faucet, and walk
              through every flow with test funds.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" icon={<Wallet size={18} />} loading={isConnecting} onClick={handleConnect}>
                Get started
              </Button>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-neutral-100 text-neutral-800 rounded-xl text-base font-semibold border border-neutral-200 hover:bg-neutral-200 transition-all"
              >
                Read the guide
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

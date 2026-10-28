"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LandingNavbar from "../../components/layout/LandingNavbar";
import LandingFooter from "../../components/layout/LandingFooter";
import TestnetNotice from "../../components/landing/TestnetNotice";
import { Shield, Zap, BookOpen, ExternalLink } from "lucide-react";
import { useStellarWallet } from "@/context/StellarWalletContext";

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

const repos = [
  { name: "RL-smart-contracts", desc: "Soroban contracts: vault, subscriptions, payroll", href: "https://github.com/RubbiLabs/RL-smart-contracts" },
  { name: "RL-api", desc: "Backend: SEP-10 sign-in, event indexer, keeper, card issuer adapters", href: "https://github.com/RubbiLabs/RL-api" },
  { name: "RL-frontend", desc: "This web app", href: "https://github.com/RubbiLabs/RL-frontend" },
];

export default function AboutPage() {
  const router = useRouter();
  const { isSignedIn, isHydrated } = useStellarWallet();

  useEffect(() => {
    if (!isHydrated) return;
    if (isSignedIn) router.replace("/dashboard");
  }, [isSignedIn, isHydrated, router]);

  if (isHydrated && isSignedIn) return null;

  return (
    <div className="min-h-screen bg-neutral-50 font-manrope overflow-x-hidden">
      <LandingNavbar />

      {/* HERO */}
      <section className="relative pt-32 pb-16 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/4 blur-3xl" />
        </div>
        <div className="px-6 lg:px-36">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center mt-20 lg:mt-28">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4 animate-fadeIn">About Rubbi</div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 leading-[1.05] tracking-tight mb-6 animate-slideUp">
                Everyday payments,
                <br />
                <span className="text-primary">settled in USDC on Stellar.</span>
              </h1>
              <p className="text-neutral-500 leading-relaxed mb-6">
                Rubbi is a payment automation app built for people and small teams in Nigeria who want to hold dollars,
                pay recurring bills and salaries, and spend through a card. It runs on Stellar with USDC as its only
                asset, and every action that moves your money is a transaction you sign in your own wallet.
              </p>
              <TestnetNotice />
            </div>
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative w-80 h-80">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 rotate-12" />
                <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent rotate-6" />
                <div className="absolute inset-8 rounded-xl bg-primary/30 flex items-center justify-center">
                  <span className="text-8xl font-extrabold text-primary/20 tracking-tighter">R</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-white">
        <div className="px-6 lg:px-36">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <FadeIn>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 mb-6">How it works</h2>
              <p className="text-neutral-500 leading-relaxed mb-6">
                Three small Soroban contracts hold the on-chain side of the product. The <strong>vault</strong> is your
                Rubbi wallet: deposit USDC, withdraw it any time, and load part of it onto your card. The{" "}
                <strong>subscriptions</strong> contract never holds your funds; you approve a USDC allowance for a few
                periods and each payment is pulled on its due date. The <strong>payroll</strong> contract holds an
                employer&apos;s escrow and pays each schedule one period at a time.
              </p>
              <p className="text-neutral-500 leading-relaxed mb-8">
                Rubbi&apos;s backend signs in users with SEP-10, mirrors contract events into the dashboard, runs the
                keeper that triggers due payments (anyone could, the functions are permissionless and time-gated),
                and settles card loads and unloads. It never holds your keys.
              </p>
              <Link href="/docs" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary border-b-2 border-primary pb-1">
                Read the guide
              </Link>
            </FadeIn>
            <FadeIn delay={150}>
              <div className="space-y-6">
                <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <div className="w-10 h-10 bg-primary/8 rounded-xl flex items-center justify-center mb-4">
                    <Shield size={20} className="text-primary" />
                  </div>
                  <h3 className="font-bold text-neutral-900 mb-2">You can always withdraw</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">Pausing a contract blocks new deposits and payments, never withdrawals. Subscriptions can be paused, resumed or cancelled by you alone.</p>
                </div>
                <div className="p-6 bg-primary rounded-2xl text-white">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                    <Zap size={20} className="text-white" />
                  </div>
                  <h3 className="font-bold mb-2">Paid on time, never twice</h3>
                  <p className="text-sm text-white/70 leading-relaxed">Every recurring payment is time-gated on-chain and pays exactly one period. A subscription that fell behind is charged once, not for every missed month; a missed salary stays owed and is caught up one period at a time.</p>
                </div>
                <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <div className="w-10 h-10 bg-tertiary/10 rounded-xl flex items-center justify-center mb-4">
                    <BookOpen size={20} className="text-tertiary" />
                  </div>
                  <h3 className="font-bold text-neutral-900 mb-2">Open source</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">Contracts, backend and app are MIT-licensed and tested in CI. The contracts have not been independently audited yet; the fee on subscription and payroll payments is 0.5%.</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* STATUS */}
      <section className="py-20 bg-primary">
        <div className="px-6 lg:px-36">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
            {[
              { val: "Testnet", label: "Current network" },
              { val: "USDC", label: "Only asset" },
              { val: "3", label: "Soroban contracts" },
              { val: "Mock", label: "Card issuer today" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl lg:text-4xl font-extrabold text-white mb-2">{s.val}</p>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REPOS */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-4 text-center">Built in the open</h2>
            <p className="text-neutral-500 leading-relaxed mb-10 text-center">
              Rubbi is three repositories under the RubbiLabs organisation. Scoped issues labelled{" "}
              <span className="font-semibold">Stellar Wave</span> are open to outside contributors through the Drips Wave programme.
            </p>
            <ul className="space-y-3">
              {repos.map((r) => (
                <li key={r.name}>
                  <a href={r.href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 p-5 bg-neutral-50 rounded-xl border border-neutral-100 hover:border-primary/30 transition-all">
                    <div>
                      <p className="font-semibold text-neutral-800 text-sm font-mono">{r.name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{r.desc}</p>
                    </div>
                    <ExternalLink size={16} className="text-neutral-400 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>
      </section>

      {/* SCROLLING TICKER */}
      <div className="bg-neutral-900 py-4 overflow-hidden ticker-wrap">
        <div className="flex animate-ticker whitespace-nowrap">
          {["WALLET", "CARD", "SUBSCRIPTIONS", "PAYROLL", "USDC", "STELLAR", "OPEN SOURCE", "WALLET", "CARD", "SUBSCRIPTIONS", "PAYROLL", "USDC", "STELLAR", "OPEN SOURCE"].map((w, i) => (
            <span key={i} className="text-neutral-600 font-bold text-lg tracking-widest mx-8">{w}</span>
          ))}
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}

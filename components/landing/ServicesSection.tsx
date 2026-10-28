"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, DollarSign, ArrowRight, Shield, Wallet, CreditCard, ExternalLink } from "lucide-react";
import { useStellarWallet } from "@/context/StellarWalletContext";
import Button from "@/components/ui/Button";

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
      { threshold: 0.1 }
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

const services = [
  {
    icon: <CreditCard size={22} className="text-primary" />,
    iconBg: "bg-primary/8",
    title: "Rubbi wallet and card",
    desc: "Deposit USDC into your Rubbi wallet on Stellar and withdraw it whenever you like. Load part of it onto a virtual card and unload what you do not spend.",
    tags: ["Withdraw at any time, even while paused", "Card from a mock issuer on testnet"],
    tagColor: "bg-primary/8 text-primary",
    linkColor: "text-primary hover:text-secondary",
    dark: false,
  },
  {
    icon: <Calendar size={22} className="text-white" />,
    iconBg: "bg-white/10",
    title: "Subscriptions",
    desc: "Pay recurring plans from your own wallet. You approve a USDC allowance for a few periods; each payment is pulled when it is due and never early or twice.",
    tags: ["Allowance covers a set number of payments", "Pause, resume or cancel from your wallet"],
    tagColor: "bg-white/10 text-white/80",
    linkColor: "text-white/60 hover:text-white",
    dark: true,
  },
  {
    icon: <DollarSign size={22} className="text-primary" />,
    iconBg: "bg-primary/8",
    title: "Payroll",
    desc: "Fund an escrow and schedule recurring USDC salaries for your team, up to 25 schedules per transaction. A missed period stays owed and is paid one period at a time.",
    tags: ["Pay what is due with one click", "Withdraw unused escrow at any time"],
    tagColor: "bg-primary/8 text-primary",
    linkColor: "text-primary hover:text-secondary",
    dark: false,
  },
];

export default function ServicesSection() {
  const router = useRouter();
  const { isSignedIn, isConnecting } = useStellarWallet();

  const handleConnect = () => {
    router.push(isSignedIn ? "/dashboard" : "/onboarding");
  };

  return (
    <>
      {/* ── Foundations strip ── */}
      <section className="py-24 bg-white">
        <div className="px-6 lg:px-36 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <FadeIn>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
              Foundations
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 leading-tight mb-6">
              Your keys, your money.
            </h2>
            <p className="text-neutral-500 leading-relaxed text-[15px]">
              Rubbi is a set of open-source Soroban contracts on Stellar with USDC as
              the only asset. Every deposit, withdrawal, approval and payroll action
              is a transaction you sign in your own wallet. Rubbi&apos;s backend only
              settles card loads, runs the keeper that triggers due payments, and
              mirrors on-chain events for your dashboard.
            </p>
          </FadeIn>

          <FadeIn delay={150} className="space-y-4">
            {[
              {
                icon: <Shield size={18} className="text-primary" />,
                title: "Open source, tested in CI",
                desc: "Contracts, backend and app are MIT-licensed with full test suites. The contracts have not been independently audited yet.",
              },
              {
                icon: <Calendar size={18} className="text-tertiary" />,
                title: "Built on Stellar",
                desc: "Ledgers close about every 5 seconds and network fees are a fraction of a cent. Rubbi charges a 0.5% fee on subscription and payroll payments.",
              },
              {
                icon: <DollarSign size={18} className="text-secondary" />,
                title: "Sign in with your wallet",
                desc: "SEP-10 sign-in with a Stellar wallet such as Freighter. Rubbi never holds your keys.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="flex gap-4 p-5 bg-neutral-50 rounded-xl border border-neutral-100 hover:border-primary/30 hover:shadow-card transition-all"
              >
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="font-semibold text-neutral-800 text-sm">{f.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ── Services suite ── */}
      <section className="py-24 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <FadeIn className="text-center mb-14">
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
              What you can do today
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900">
              Three things, done properly
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, i) => (
              <FadeIn key={s.title} delay={i * 100}>
                <div
                  className={`rounded-2xl p-8 h-full flex flex-col justify-between transition-all hover:shadow-card ${
                    s.dark
                      ? "bg-primary text-white"
                      : "bg-white border border-neutral-100"
                  }`}
                >
                  <div>
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${s.iconBg}`}
                    >
                      {s.icon}
                    </div>
                    <h3
                      className={`text-xl font-bold mb-3 ${
                        s.dark ? "text-white" : "text-neutral-900"
                      }`}
                    >
                      {s.title}
                    </h3>
                    <p
                      className={`text-sm leading-relaxed mb-5 ${
                        s.dark ? "text-white/70" : "text-neutral-500"
                      }`}
                    >
                      {s.desc}
                    </p>
                    <ul className="space-y-2">
                      {s.tags.map((t) => (
                        <li key={t} className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              s.dark ? "bg-tertiary" : "bg-primary"
                            }`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              s.dark ? "text-white/80" : "text-neutral-600"
                            }`}
                          >
                            {t}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href="/services"
                    className={`mt-8 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${s.linkColor}`}
                  >
                    Learn More <ArrowRight size={14} />
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <FadeIn>
            <div className="bg-primary rounded-3xl p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/5 translate-x-1/3 -translate-y-1/3" />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 -translate-x-1/3 translate-y-1/3" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">
                  Try it on Stellar testnet
                </h2>
                <p className="text-white/70 text-sm max-w-md mx-auto mb-8 leading-relaxed">
                  Install Freighter, switch it to testnet, get XLM from Friendbot and
                  USDC from Circle&apos;s faucet, and walk through every flow with test
                  funds. The code is open on GitHub.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    size="lg"
                    className="!bg-white !text-primary hover:!bg-neutral-100"
                    icon={<Wallet size={18} />}
                    loading={isConnecting}
                    onClick={handleConnect}
                  >
                    Get started
                  </Button>
                  <Link
                    href="/docs"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 text-white rounded-xl text-base font-semibold border border-white/20 hover:bg-white/20 transition-all"
                  >
                    Read the guide
                  </Link>
                  <a
                    href="https://github.com/RubbiLabs"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 text-white rounded-xl text-base font-semibold border border-white/20 hover:bg-white/20 transition-all"
                  >
                    <ExternalLink size={18} /> GitHub
                  </a>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}

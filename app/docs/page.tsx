"use client";
import React, { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CreditCard, HelpCircle, Repeat, Shield, Users, Wallet } from "lucide-react";

import LandingNavbar from "@/components/layout/LandingNavbar";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { CIRCLE_FAUCET_URL, explorerContractUrl } from "@/lib/stellar/config";

const sections = [
  { id: "introduction", label: "Introduction", icon: <BookOpen size={16} /> },
  { id: "getting-started", label: "Getting started", icon: <ArrowRight size={16} /> },
  { id: "wallet", label: "Wallet & USDC", icon: <Wallet size={16} /> },
  { id: "card", label: "Card", icon: <CreditCard size={16} /> },
  { id: "subscriptions", label: "Subscriptions", icon: <Repeat size={16} /> },
  { id: "payroll", label: "Payroll", icon: <Users size={16} /> },
  { id: "contracts", label: "Smart contracts", icon: <Shield size={16} /> },
  { id: "faq", label: "FAQ", icon: <HelpCircle size={16} /> },
];

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl lg:text-3xl font-extrabold text-neutral-900 mb-5">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-bold text-neutral-900 mb-2 mt-6">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-neutral-600 leading-relaxed mb-4">{children}</p>;
}
function Ol({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal list-inside text-neutral-600 mb-4 space-y-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  );
}
function Note({ children }: { children: React.ReactNode }) {
  return <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-neutral-700 mb-4">{children}</div>;
}

export default function DocsPage() {
  const { config } = useStellarWallet();
  const [activeSection, setActiveSection] = useState("introduction");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && setActiveSection(entry.target.id)),
      { rootMargin: "-20% 0px -60% 0px" },
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-screen bg-neutral-50 font-manrope overflow-hidden flex flex-col">
      <LandingNavbar />

      <div className="flex-1 pt-24 pb-8 overflow-hidden">
        <div className="px-6 lg:px-36 h-full">
          <div className="flex gap-10 h-full">
            <aside className="hidden lg:block w-56 shrink-0">
              <nav className="sticky top-0 space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      activeSection === s.id ? "bg-white text-primary shadow-sm" : "text-neutral-500 hover:text-primary"
                    }`}
                  >
                    {s.icon} {s.label}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="flex-1 overflow-y-auto pr-2 pb-8">
              <div className="max-w-3xl">
                <section id="introduction" className="mb-16">
                  <h1 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-6">Rubbi on Stellar</h1>
                  <P>
                    Rubbi is a payment automation platform built on Stellar. You fund a USDC balance, pay recurring
                    subscriptions and bills, run payroll for your team and spend through a virtual card. Money moves in USDC
                    through three Soroban contracts; Rubbi&apos;s backend indexes them and issues the card.
                  </P>
                  <Note>
                    <ul className="space-y-1">
                      <li>• Sign in with your own Stellar wallet (SEP-10). Rubbi never holds your keys.</li>
                      <li>• Subscriptions are non-custodial: funds stay in your wallet until a period is due.</li>
                      <li>• Payroll is escrow-based: one period is paid per due schedule, missed periods stay owed.</li>
                      <li>• The card is funded from your Rubbi wallet (the on-chain vault); on testnet it is a visibly labelled mock card.</li>
                    </ul>
                  </Note>
                </section>

                <section id="getting-started" className="mb-16">
                  <H2>Getting started</H2>
                  <Ol
                    items={[
                      <>Install a Stellar wallet such as Freighter and switch it to <strong>{config?.network ?? "testnet"}</strong>.</>,
                      <>Open <strong>Get started</strong> and connect the wallet.</>,
                      <>Sign the SEP-10 challenge. It is a transaction that is never submitted; it only proves you control the address.</>,
                      <>Choose a username (one per address). This creates your Rubbi card.</>,
                    ]}
                  />
                  <P>Your session token lives in this browser tab only and is discarded when you disconnect or close the tab.</P>
                </section>

                <section id="wallet" className="mb-16">
                  <H2>Wallet &amp; USDC</H2>
                  <P>
                    A Stellar account needs a little XLM to exist and must opt in to USDC with a <em>trustline</em>. The Wallet page
                    checks both and offers a one-click <strong>Enable USDC</strong> step.
                  </P>
                  <H3>Testnet funds</H3>
                  <Ol
                    items={[
                      <>XLM: use Friendbot (linked from the Wallet page).</>,
                      <>
                        USDC: use{" "}
                        <a href={CIRCLE_FAUCET_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Circle&apos;s testnet faucet
                        </a>{" "}
                        after enabling the trustline.
                      </>,
                    ]}
                  />
                  <H3>Rubbi wallet (vault)</H3>
                  <P>
                    <strong>Deposit</strong> moves USDC from your Stellar account into the vault contract; <strong>Withdraw</strong> moves
                    it back and works even if the vault is paused. The vault balance is what you can load onto your card.
                  </P>
                </section>

                <section id="card" className="mb-16">
                  <H2>Card</H2>
                  <P>
                    <strong>Load card</strong> moves USDC from your Rubbi wallet onto the card: Rubbi&apos;s operator settles the amount
                    on-chain first, then the issuer funds the card. <strong>Unload card</strong> defunds the card and the treasury credits
                    your vault. Each movement shows its status; <em>PENDING_TREASURY</em> means the unload is waiting for the treasury
                    operator.
                  </P>
                  <Note>
                    Cards marked <strong>MOCK</strong> come from the mock issuer: a deterministic test card with no real number. Card
                    data always comes from the backend; the app never generates card numbers.
                  </Note>
                </section>

                <section id="subscriptions" className="mb-16">
                  <H2>Subscriptions</H2>
                  <Ol
                    items={[
                      <>Pick a plan (created on-chain by approved merchants).</>,
                      <>
                        <strong>Approve</strong> an allowance on the USDC contract for 3 periods, with an expiration ledger covering them.
                      </>,
                      <>
                        <strong>Subscribe</strong>: the first period is charged immediately and the next due date is set.
                      </>,
                    ]}
                  />
                  <P>
                    Rubbi&apos;s keeper charges each period when it is due. A failed pull marks the subscription <em>past due</em> until the
                    next successful charge; a user who was past due for months is charged once, not retroactively. Pause, resume and
                    cancel any time. The allowance status shows how many payments are still covered and when it expires.
                  </P>
                </section>

                <section id="payroll" className="mb-16">
                  <H2>Payroll</H2>
                  <P>
                    Fund an <strong>escrow</strong>, then create up to 25 schedules per transaction (recipient, amount, period, label). Each
                    schedule pays one period when due; <strong>Pay due now</strong> runs the payouts yourself instead of waiting for the keeper.
                    Pause keeps the owed salary owed; cancel is final. Escrow can be withdrawn any time.
                  </P>
                </section>

                <section id="contracts" className="mb-16">
                  <H2>Smart contracts</H2>
                  <P>Three Soroban contracts hold the logic. Ids are read from the backend&apos;s public configuration.</P>
                  {config ? (
                    <table className="w-full text-sm mb-4">
                      <tbody>
                        {(["vault", "subscriptions", "payroll"] as const).map((name) => (
                          <tr key={name} className="border-b border-neutral-100">
                            <td className="py-2 font-semibold capitalize text-neutral-800">{name}</td>
                            <td className="py-2">
                              <a href={explorerContractUrl(config, config.contracts[name])} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-primary hover:underline break-all">
                                {config.contracts[name]}
                              </a>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td className="py-2 font-semibold text-neutral-800">USDC</td>
                          <td className="py-2 font-mono text-xs text-neutral-600 break-all">{config.usdcSacId}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <P>Connect to the backend to see the deployed contract ids.</P>
                  )}
                  <P>
                    Fees: subscriptions and payroll take a small configurable fee (0.5% at deployment) from the payee; the payer always
                    pays exactly the plan or salary amount.
                  </P>
                </section>

                <section id="faq" className="mb-16">
                  <H2>FAQ</H2>
                  <H3>Which wallets work?</H3>
                  <P>Freighter, xBull, Albedo, Lobstr, Rabet, Hana and the other wallets supported by Stellar Wallets Kit.</P>
                  <H3>Is Rubbi custodial?</H3>
                  <P>
                    Subscriptions and payroll are non-custodial for the payer. The vault that funds your card is custodial by design: Rubbi&apos;s
                    operator settles card loads from it, and you can withdraw the rest at any time.
                  </P>
                  <H3>Why did my transaction fail?</H3>
                  <P>
                    Every contract error is translated into a message in the transaction dialog (for example an expired allowance or a
                    merchant that cannot receive USDC). Make sure your wallet is on the right network and your account holds some XLM for fees.
                  </P>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

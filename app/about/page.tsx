"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LandingNavbar from "../../components/layout/LandingNavbar";
import LandingFooter from "../../components/layout/LandingFooter";
import { Shield, Zap, BookOpen } from "lucide-react";
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
              <div className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4 animate-fadeIn">Building Foundations for Financial Autonomy</div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 leading-[1.05] tracking-tight mb-6 animate-slideUp">
                The Architectural Archive for
                <br />
                <span className="text-primary">Decentralized Finance.</span>
              </h1>
              <p className="text-neutral-500 leading-relaxed">
                In an era defined by autonomous code and fluid liquidity, Rubbi serves as the limestone foundation for decentralized finance. We build the tactile ledger for a future where your assets move with architectural precision.
              </p>
            </div>
            {/* Abstract 3D shape placeholder */}
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

      {/* MISSION */}
      <section className="py-24 bg-white">
        <div className="px-6 lg:px-36">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <FadeIn>
              <h2 className="text-3xl sm:text-4xl lg:text-4xl font-extrabold text-neutral-900 mb-6">A Mission of Permanence</h2>
              <p className="text-neutral-500 leading-relaxed mb-6">
                The digital world moves fast, often sacrificing stability for speed. Rubbi was conceived to bridge this gap — creating a financial interface that feels as substantial and permanent as a physical bank vault, while harnessing the speed and low fees of the Stellar network.
              </p>
              <p className="text-neutral-500 leading-relaxed mb-8">
                We believe that autonomy requires structure. Our &quot;Tactile Ledger&quot; philosophy ensures that every transaction, every stream, and every automated event is recorded with editorial clarity and structural integrity on-chain.
              </p>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary border-b-2 border-primary pb-1">
                Our Core Thesis
              </div>
            </FadeIn>
            <FadeIn delay={150}>
              <div className="space-y-6">
                <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <div className="w-10 h-10 bg-primary/8 rounded-xl flex items-center justify-center mb-4">
                    <Shield size={20} className="text-primary" />
                  </div>
                  <h3 className="font-bold text-neutral-900 mb-2">Structural Trust</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">Every line of code is an architectural beam. We prioritize the security and permanence of your assets over temporary market noise.</p>
                </div>
                <div className="p-6 bg-primary rounded-2xl text-white">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
                    <Zap size={20} className="text-white" />
                  </div>
                  <h3 className="font-bold mb-2">Fluid Automation</h3>
                  <p className="text-sm text-white/70 leading-relaxed">Financial streams should flow with the natural rhythm of your life. Our automation is designed to be invisible, yet immutable.</p>
                </div>
                <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <div className="w-10 h-10 bg-tertiary/10 rounded-xl flex items-center justify-center mb-4">
                    <BookOpen size={20} className="text-tertiary" />
                  </div>
                  <h3 className="font-bold text-neutral-900 mb-2">Tactile Experience</h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">We believe in the weight of the ledger. Our UI is designed to feel physical, providing a sense of security and clarity in a digital space.</p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20 bg-primary">
        <div className="px-6 lg:px-36">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
            {[
              { val: "$0.00B", label: "Initial Capital Secured" },
              { val: "100%", label: "On-Chain Transparency" },
              { val: "24/7", label: "Autonomous Processing" },
              { val: "0ms", label: "Settlement Delay" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl lg:text-4xl font-extrabold text-white mb-2">{s.val}</p>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW ERA */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <FadeIn>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-6">A New Era of Finance</h2>
            <p className="text-neutral-500 leading-relaxed mb-6">
              Rubbi isn&apos;t just a tool; it&apos;s a statement about the future of digital wealth. As we move away from manual intervention and toward a world of autonomous financial entities, we need a common language of trust built on-chain.
            </p>
            <p className="text-neutral-500 leading-relaxed">
              The Tactile Ledger is that language. It is the archive where your financial future is not just recorded, but constructed — layer by layer, ledger by ledger, on Stellar.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* SCROLLING TICKER */}
      <div className="bg-neutral-900 py-4 overflow-hidden ticker-wrap">
        <div className="flex animate-ticker whitespace-nowrap">
          {["SECURITY", "LEDGER", "AUTOMATION", "IDENTITY", "TRUST", "STREAMS", "PROTOCOL", "SECURITY", "LEDGER", "AUTOMATION", "IDENTITY", "TRUST", "STREAMS", "PROTOCOL"].map((w, i) => (
            <span key={i} className="text-neutral-600 font-bold text-lg tracking-widest mx-8">{w}</span>
          ))}
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}

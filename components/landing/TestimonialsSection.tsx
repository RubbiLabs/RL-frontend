"use client";
import React, { useEffect, useRef, useState } from "react";
import { Star, BookOpen, Globe } from "lucide-react";

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

const testimonials = [
  {
    stars: 5,
    quote:
      "Rubbi's salary streaming is the first time we've felt like we're actually living in the future of finance.",
    author: "Alex Rivera",
    role: "CTO, Vertex Lab",
    initials: "AR",
  },
  {
    stars: 5,
    quote:
      "The UI feels heavy and secure — like a vault. It gives us the confidence to automate our entire treasury.",
    author: "Sarah Chen",
    role: "Founder, LiquidDAO",
    initials: "SC",
  },
];

export default function TestimonialsSection() {
  return (
    <>
      {/* ── Testimonials ── */}
      <section className="py-24 bg-neutral-50">
        <div className="px-6 lg:px-36">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 items-start">
            <FadeIn>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                Voices from the Archive
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 leading-tight mb-4">
                Teams building on Stellar trust Rubbi to automate their finances.
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                Real teams. Real automation. Real capital flows on-chain.
              </p>
            </FadeIn>

            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 120}>
                <div className="bg-white rounded-2xl p-7 border border-neutral-100 hover:shadow-card transition-all h-full flex flex-col justify-between">
                  <div>
                    {/* Stars */}
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: t.stars }).map((_, j) => (
                        <Star
                          key={j}
                          size={14}
                          className="fill-tertiary text-tertiary"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-neutral-700 leading-relaxed italic mb-5">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{t.initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-800">{t.author}</p>
                      <p className="text-xs text-neutral-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact form ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <FadeIn>
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
              Inquiries
            </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-neutral-900 mb-6">
              Ready to Automate
              <br />
              Your Ledger?
            </h2>
            <p className="text-neutral-500 text-sm leading-relaxed mb-8">
              Get in touch with our integration team to explore how Rubbi can
              streamline your financial operations on Stellar.
            </p>
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/8 rounded-xl flex items-center justify-center">
                  <BookOpen size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Email us</p>
                  <p className="text-sm font-semibold text-primary">
                    protocol@rubbi.finance
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/8 rounded-xl flex items-center justify-center">
                  <Globe size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Twitter</p>
                  <p className="text-sm font-semibold text-primary">
                    @RubbiProtocol
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <div className="bg-neutral-50 rounded-2xl p-8 border border-neutral-100">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                    Work Email
                  </label>
                  <input
                    type="email"
                    placeholder="john@company.com"
                    className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    placeholder="How can we help?"
                    className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  />
                </div>
                <button className="w-full bg-primary text-white rounded-xl py-3.5 text-sm font-bold hover:bg-[#1B4562] transition-colors">
                  Send Request
                </button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}

"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, RectangleHorizontal, CreditCard, Users, Wallet, ExternalLink } from "lucide-react";

import RubbiLogo from "@/components/ui/RubbiLogo";
import { useStellarWallet } from "@/context/StellarWalletContext";
import { explorerContractUrl } from "@/lib/stellar/config";

export const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/card", label: "Card", icon: RectangleHorizontal },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/dashboard/payroll", label: "Payroll", icon: Users },
];

export function NetworkPanel() {
  const { config } = useStellarWallet();
  if (!config) return null;
  return (
    <div className="rounded-xl bg-white border border-neutral-200 p-3 text-[11px] text-neutral-500 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-bold uppercase tracking-widest text-neutral-400">Network</span>
        <span className={`font-bold uppercase ${config.network === "mainnet" ? "text-green-700" : "text-amber-700"}`}>
          Stellar {config.network}
        </span>
      </div>
      {(["vault", "subscriptions", "payroll"] as const).map((name) => (
        <a
          key={name}
          href={explorerContractUrl(config, config.contracts[name])}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between hover:text-primary transition-colors"
        >
          <span className="capitalize">{name}</span>
          <span className="inline-flex items-center gap-1 font-mono">
            {config.contracts[name].slice(0, 4)}…{config.contracts[name].slice(-4)} <ExternalLink size={10} />
          </span>
        </a>
      ))}
    </div>
  );
}

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-neutral-50 border-r border-neutral-200 shrink-0 h-full">
      <div className="p-5 border-b border-neutral-100 flex items-end">
        <RubbiLogo size={28} />
        <span className="text-xl font-bold text-primary">
          <span className="text-2xl text-primary-400 font-extrabold">u</span>
          bbi
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold
                uppercase tracking-widest transition-all duration-150 group
                ${
                  active
                    ? "bg-white text-primary shadow-sm border-r-2 border-primary"
                    : "text-neutral-500 hover:bg-white/70 hover:text-primary hover:border-r-2 border-primary"
                }
              `}
            >
              <Icon
                size={16}
                className={active ? "text-primary" : "text-neutral-400 group-hover:text-neutral-600 transition-colors"}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-100">
        <NetworkPanel />
      </div>
    </aside>
  );
}

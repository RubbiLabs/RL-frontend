"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";

import DashboardNavbar from "@/components/layout/DashboardNavbar";
import DashboardSidebar, { navItems, NetworkPanel } from "@/components/layout/DashboardSidebar";
import { NetworkBanner } from "@/components/ui/NetworkBanner";
import RubbiLogo from "@/components/ui/RubbiLogo";
import { useStellarWallet } from "@/context/StellarWalletContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isHydrated, isSignedIn, configError } = useStellarWallet();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isSignedIn) router.replace("/onboarding");
  }, [isSignedIn, isHydrated, router]);

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-100">
        <div className="bg-white rounded-2xl border border-red-200 p-6 max-w-md text-center">
          <h1 className="font-bold text-neutral-900 mb-2">Backend unavailable</h1>
          <p className="text-sm text-neutral-500">{configError}</p>
        </div>
      </div>
    );
  }

  if (!isHydrated || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 text-sm text-neutral-400">
        Loading your session…
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-100 overflow-hidden font-manrope">
      <DashboardSidebar />

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-neutral-50 flex flex-col shadow-2xl animate-slideDown">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RubbiLogo size={28} />
                <span className="font-bold text-primary">Rubbi</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors"
                aria-label="Close sidebar"
              >
                <X size={17} />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
                      active ? "bg-white text-primary shadow-sm" : "text-neutral-500 hover:bg-white/70"
                    }`}
                  >
                    <Icon size={15} /> {label}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-neutral-100">
              <NetworkPanel />
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <NetworkBanner />
        <DashboardNavbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-neutral-100 p-6 lg:p-8">{children}</main>

        <footer className="bg-neutral-50 border-t border-neutral-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-neutral-400">© {new Date().getFullYear()} Rubbi — payments automation on Stellar</p>
          <div className="flex gap-4 text-xs text-neutral-400">
            <Link href="/docs" className="hover:text-primary transition-colors">
              Docs
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

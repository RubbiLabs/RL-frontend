"use client";
import React from "react";
import Link from "next/link";
import { useStellarWallet } from "@/context/StellarWalletContext";
import RubbiLogo from "@/components/ui/RubbiLogo";
import { FileText } from "lucide-react";

export default function LandingFooter() {
  const year = new Date().getFullYear();
  const { isSignedIn } = useStellarWallet();
  const logoHref = isSignedIn ? "/dashboard" : "/";



  return (
    <footer className="bg-neutral-50 border-t border-neutral-200">
      <div className="px-6 lg:px-36 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-3">
            <Link href={logoHref} className="flex items-end mb-5">
                        <RubbiLogo size={28} />
                        <span className="text-xl font-bold text-primary">
                          <span className="text-2xl text-primary-400 font-extrabold">u</span>
                        bbi
                        </span>
                      </Link>

            <p className="text-sm text-neutral-500 leading-relaxed max-w-xs">
              Building the architectural foundations for a decentralized, autonomous financial era on Stellar.
              Permanent. Trustworthy. Tactile.
            </p>
            <div className="flex items-center gap-2 mt-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Secure Enclave Active
              </span>
            </div>
          </div>

          {/* Documentation link */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Resources</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/docs" className="text-sm text-neutral-600 hover:text-primary transition-colors font-medium flex items-center gap-2">
                  <FileText size={14} /> Documentation
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200">
        <div className="px-6 lg:px-36 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-400">
            © {year} Rubbi Financial Automation. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="text-xs text-neutral-400 hover:text-primary transition-colors">Documentation</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";
import React from "react";
import Link from "next/link";
import { useStellarWallet } from "@/context/StellarWalletContext";
import RubbiLogo from "@/components/ui/RubbiLogo";
import { FileText, ExternalLink, FlaskConical } from "lucide-react";

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
              A USDC wallet, virtual card, subscriptions and payroll on Stellar, signed with your own wallet.
              Open source under the MIT license.
            </p>
            <div className="flex items-center gap-2 mt-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                <FlaskConical size={12} />
                Running on Stellar testnet
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
              <li>
                <a href="https://github.com/RubbiLabs" target="_blank" rel="noreferrer" className="text-sm text-neutral-600 hover:text-primary transition-colors font-medium flex items-center gap-2">
                  <ExternalLink size={14} /> GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200">
        <div className="px-6 lg:px-36 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-400">
            © {year} RubbiLabs contributors. MIT licensed.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/docs" className="text-xs text-neutral-400 hover:text-primary transition-colors">Documentation</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

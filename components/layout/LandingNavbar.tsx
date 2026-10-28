"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";
import RubbiLogo from "@/components/ui/RubbiLogo";

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleConnect = async () => {
    router.push("/onboarding");
  };

  const logoHref = "/";
  const links = [
        { href: "/", label: "Home" },
        { href: "/about", label: "About" },
        { href: "/services", label: "Services" },
        { href: "/docs", label: "Docs" },
      ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-neutral-200/80 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="px-6 lg:px-36">
        <div className="flex items-center justify-between h-16 lg:h-24">
          {/* Logo */}
          <Link href={logoHref} className="flex items-end gap-0">
            <RubbiLogo size={28} />
            <span className="text-xl font-bold text-primary">
              <span className="text-2xl text-primary-400 font-extrabold">u</span>
            bbi
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-medium nav-link transition-colors ${
                  isActive(l.href)
                    ? "text-primary active"
                    : "text-neutral-600 hover:text-primary"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              icon={<Wallet size={16} />}
              onClick={handleConnect}
            >
              Begin Automation
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
            onClick={() => setMobileOpen((p) => !p)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-neutral-100 px-6 py-4 flex flex-col gap-3 animate-slideDown shadow-lg">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={`text-sm font-medium py-2 transition-colors ${
                isActive(l.href) ? "text-primary" : "text-neutral-600"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-neutral-100">
              <Button
                variant="primary"
                size="md"
                fullWidth
                icon={<Wallet size={16} />}
                onClick={() => { setMobileOpen(false); router.push("/onboarding"); }}
              >
                Begin Automation
              </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { HeaderAuthIsland } from "@/components/public/HeaderAuthIsland";
import { CartIconIsland } from "@/components/public/CartIconIsland";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
];

export function DHTHeaderShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-(--dht-darker) shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-16 md:h-20">
          {/* Logo - Left Column */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/dynamic_hub_Logo.png"
              alt="Dynamic Hub"
              width={150}
              height={50}
              className="h-12 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation - Center Column */}
          <nav className="hidden md:flex items-center gap-8 justify-self-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white hover:text-(--dht-red) font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions - Right Column */}
          <div className="hidden md:flex items-center gap-4 justify-self-end">
            <CartIconIsland variant="desktop" />
            <HeaderAuthIsland variant="desktop" />
          </div>

          {/* Mobile Menu Button - Positioned absolutely */}
          <button
            className="md:hidden p-2 text-white absolute right-4 top-1/2 -translate-y-1/2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-white/10">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white hover:text-(--dht-red) font-medium transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <CartIconIsland
                variant="mobile"
                onClick={() => setMobileMenuOpen(false)}
              />
              <HeaderAuthIsland
                variant="mobile"
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

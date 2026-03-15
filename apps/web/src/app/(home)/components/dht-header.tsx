"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, CircleUser } from "lucide-react";
import { SignInDialog } from "@/components/sign-in-dialog";
import { authClient } from "@/lib/auth-client";

const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
    { href: "/about", label: "About Us" },
    { href: "/divisions", label: "Our Divisions" },
    { href: "/contact", label: "Contact Us" },
];

export function DHTHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [signInOpen, setSignInOpen] = useState(false);
    const { data: session } = authClient.useSession();

    const isAuthenticated = !!session?.user;

    return (
        <header className="sticky top-0 z-50 bg-(--dht-darker) shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
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

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-white hover:text-(--dht-red) font-medium transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                        {isAuthenticated ? (
                            <Link
                                href="/settings/account"
                                className="flex items-center gap-2 text-white hover:text-(--dht-red) font-medium transition-colors"
                            >
                                <CircleUser className="h-5 w-5" />
                                <span>{session?.user?.name || "Profile"}</span>
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setSignInOpen(true)}
                                className="text-white hover:text-(--dht-red) font-medium transition-colors"
                            >
                                Sign In
                            </button>
                        )}
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-white"
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
                            {isAuthenticated ? (
                                <Link
                                    href="/settings/account"
                                    className="flex items-center gap-2 text-white hover:text-(--dht-red) font-medium transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <CircleUser className="h-5 w-5" />
                                    <span>{session?.user?.name || "Profile"}</span>
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        setSignInOpen(true);
                                    }}
                                    className="text-left text-white hover:text-(--dht-red) font-medium transition-colors"
                                >
                                    Sign In
                                </button>
                            )}
                        </div>
                    </nav>
                )}
            </div>
            <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
        </header>
    );
}

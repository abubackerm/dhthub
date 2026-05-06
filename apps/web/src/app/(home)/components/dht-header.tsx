"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, CircleUser, ShoppingCart, ChevronDown, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/providers/auth-provider";
import { authClient } from "@/lib/auth-client";
import { useCart } from "@/lib/api/cart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact Us" },
];

export function DHTHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { requireAuth, isAuthenticated } = useRequireAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { data: session } = authClient.useSession();
    const { data: cart } = useCart();

    const itemCount = cart?.itemCount || 0;

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await authClient.signOut();
            toast.success("Signed out successfully");
            window.location.reload();
        } catch {
            toast.error("Failed to sign out");
        } finally {
            setIsLoggingOut(false);
        }
    };

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
                        {/* Cart Icon */}
                        <Link
                            href="/cart"
                            className="flex items-center gap-2 text-white hover:text-(--dht-red) font-medium transition-colors relative"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            {itemCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-(--dht-red) text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {itemCount > 99 ? '99+' : itemCount}
                                </span>
                            )}
                        </Link>

                        {/* Auth Section */}
                        {isAuthenticated ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 text-white hover:text-(--dht-red) font-medium transition-colors focus:outline-none"
                                    >
                                        <CircleUser className="h-5 w-5" />
                                        <span>{session?.user?.name || "Profile"}</span>
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem asChild>
                                        <Link href="/account/profile" className="w-full cursor-pointer">
                                            Profile
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/account/orders" className="w-full cursor-pointer">
                                            Orders
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="cursor-pointer">
                                        {isLoggingOut ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <LogOut className="h-4 w-4 mr-2" />
                                        )}
                                        {isLoggingOut ? "Signing out..." : "Logout"}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <button
                                type="button"
                                onClick={() => requireAuth(() => {})}
                                className="text-white hover:text-(--dht-red) font-medium transition-colors"
                            >
                                Sign In
                            </button>
                        )}
                    </div>

                    {/* Mobile Menu Button - Positioned absolutely to not affect grid */}
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
                            
                            {/* Mobile Cart Icon */}
                            <Link
                                href="/cart"
                                className="flex items-center gap-2 text-white hover:text-(--dht-red) font-medium transition-colors relative"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <ShoppingCart className="h-5 w-5" />
                                {itemCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-(--dht-red) text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                        {itemCount > 99 ? '99+' : itemCount}
                                    </span>
                                )}
                                <span>Cart</span>
                            </Link>

                            {/* Mobile Auth Section */}
                            {isAuthenticated ? (
                                <>
                                    <Link
                                        href="/account/profile"
                                        className="flex items-center gap-2 text-white hover:text-(--dht-red) font-medium transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <CircleUser className="h-5 w-5" />
                                        <span>{session?.user?.name || "Profile"}</span>
                                    </Link>
                                    <Link
                                        href="/account/orders"
                                        className="text-white hover:text-(--dht-red) font-medium transition-colors"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Orders
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleLogout();
                                            setMobileMenuOpen(false);
                                        }}
                                        disabled={isLoggingOut}
                                        className="flex items-center gap-2 text-left text-white hover:text-(--dht-red) font-medium transition-colors"
                                    >
                                        {isLoggingOut ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <LogOut className="h-5 w-5" />
                                        )}
                                        {isLoggingOut ? "Signing out..." : "Logout"}
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        requireAuth(() => {});
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
        </header>
    );
}

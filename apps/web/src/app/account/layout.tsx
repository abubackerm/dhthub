import type { Metadata } from "next";
import Link from "next/link";
import { DHTHeader } from "../(home)/components/dht-header";
import { DHTFooter } from "../(home)/components/dht-footer";

export const metadata: Metadata = {
    title: "Account - Dynamic Hub",
    description: "Manage your account settings and view your orders.",
};

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <DHTHeader />
            <main className="flex-1 bg-(--dht-gray-light)">
                {/* Breadcrumb Navigation */}
                <div className="bg-(--dht-darker) border-b border-white/10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <nav className="flex items-center gap-2 text-sm text-white/70">
                            <Link href="/" className="hover:text-(--dht-red) transition-colors">
                                Home
                            </Link>
                            <span className="text-white/30">/</span>
                            <span className="text-white">Account</span>
                        </nav>
                    </div>
                </div>
                {children}
            </main>
            <DHTFooter />
        </div>
    );
}

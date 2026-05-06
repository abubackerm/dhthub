import type { Metadata } from "next";
import { DHTHeaderShell } from "@/components/public/DHTHeaderShell";
import { DHTFooter } from "../(home)/components/dht-footer";

export const metadata: Metadata = {
    title: "Cookie Policy | Dynamic Hub Trading",
    description: "Learn about how Dynamic Hub Trading uses cookies and similar technologies on our website.",
};

export default function CookiePolicyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <DHTHeaderShell />
            <main className="flex-1">{children}</main>
            <DHTFooter />
        </div>
    );
}

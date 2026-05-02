import type { Metadata } from "next";
import { DHTHeaderShell } from "@/components/public/DHTHeaderShell";
import { DHTFooter } from "../(home)/components/dht-footer";

export const metadata: Metadata = {
    title: "About Us | Dynamic Hub Trading",
    description: "Learn about Dynamic Hub Trading - 15+ years of excellence in HVAC, facilities management, and procurement solutions across Saudi Arabia.",
};

export default function AboutLayout({
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

import type { Metadata } from "next";
import { DHTHeaderShell } from "@/components/public/DHTHeaderShell";
import { DHTFooter } from "./components/dht-footer";

export const metadata: Metadata = {
    title: "Dynamic Hub — B2B Industrial Catalogue",
    description:
        "Saudi Arabia's B2B Industrial Marketplace. Aramco Approved Vendor #10117241. Trusted by EPC companies and drilling teams across the Eastern Province.",
};

export default function HomeLayout({
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

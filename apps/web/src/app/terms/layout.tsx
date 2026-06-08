import type { Metadata } from "next";
import { DHTHeaderShell } from "@/components/public/DHTHeaderShell";
import { DHTFooter } from "../(home)/components/dht-footer";

export const metadata: Metadata = {
  title: "Terms and Conditions | Dynamic Hub Trading",
  description:
    "Terms and Conditions for Dynamic Hub Trading - Read our terms of service and usage policies.",
};

export default function TermsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col bg-(--dht-darker)">
            <DHTHeaderShell />
            <main className="flex-1">{children}</main>
            <DHTFooter />
        </div>
    );
}

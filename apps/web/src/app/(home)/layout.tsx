import type { Metadata } from "next";
import { DHTHeaderShell } from "@/components/public/DHTHeaderShell";
import { DHTFooter } from "./components/dht-footer";

export const metadata: Metadata = {
    title: "Dynamic Hub - From Infrastructure to Offshore",
    description:
        "Dynamic Hub delivers a diversified portfolio through General Maintenance, Facility Management, HVAC Services, and Procurement & Sourcing divisions.",
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

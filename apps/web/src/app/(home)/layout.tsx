import type { Metadata } from "next";
import { DHTHeader } from "./components/dht-header";
import { DHTFooter } from "./components/dht-footer";
import { HomeClientLayout } from "./components/home-client-layout";

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
        <HomeClientLayout>
            <div className="min-h-screen flex flex-col">
                <DHTHeader />
                <main className="flex-1">{children}</main>
                <DHTFooter />
            </div>
        </HomeClientLayout>
    );
}

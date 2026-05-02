import type { Metadata } from "next";
import { DHTHeaderShell } from "@/components/public/DHTHeaderShell";
import { DHTFooter } from "../(home)/components/dht-footer";

export const metadata: Metadata = {
  title: "Contact Us | Dynamic Hub Trading",
  description:
    "Get in touch with Dynamic Hub Trading. Contact us for HVAC solutions, facilities management, procurement services, and general maintenance inquiries.",
};

export default function ContactLayout({
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

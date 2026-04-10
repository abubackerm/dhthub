import type { Metadata } from "next";
import { DHTHeader } from "../(home)/components/dht-header";
import { DHTFooter } from "../(home)/components/dht-footer";
import { ContactClientLayout } from "./contact-client-layout";

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
    <ContactClientLayout>
      <div className="min-h-screen flex flex-col">
        <DHTHeader />
        <main className="flex-1">{children}</main>
        <DHTFooter />
      </div>
    </ContactClientLayout>
  );
}

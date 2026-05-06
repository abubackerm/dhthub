import type { Metadata } from "next";
import { DHTHeaderShell } from "@/components/public/DHTHeaderShell";
import { DHTFooter } from "../(home)/components/dht-footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Dynamic Hub Trading",
  description:
    "Privacy Policy for Dynamic Hub Trading - Learn how we collect, use, and safeguard your personal information.",
};

export default function PrivacyPolicyLayout({
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

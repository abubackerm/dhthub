import type { Metadata } from "next";
import "./globals.css";

import { QueryProvider } from "@/providers/query-provider";
import { inter } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Dynamic Hub - From Infrastructure to Offshore",
  description: "Dynamic Hub delivers a diversified portfolio through General Maintenance, Facility Management, HVAC Services, and Procurement & Sourcing divisions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}

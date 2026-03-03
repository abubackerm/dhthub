import type { Metadata } from "next";
import "./globals.css";

import { SidebarConfigProvider } from "@/contexts/sidebar-context";
import { inter } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Shadcn Dashboard",
  description: "A dashboard built with Next.js and shadcn/ui",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className={inter.className}>
        <SidebarConfigProvider>
          {children}
        </SidebarConfigProvider>
      </body>
    </html>
  );
}

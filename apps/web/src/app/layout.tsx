import type { Metadata } from "next";
import "./globals.css";

import { SidebarConfigProvider } from "@/contexts/sidebar-context";
import { QueryProvider } from "@/providers/query-provider";
import { ConfirmDialogProvider } from "@/providers/confirm-dialog-provider";
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
        <QueryProvider>
          <ConfirmDialogProvider>
            <SidebarConfigProvider>
              {children}
            </SidebarConfigProvider>
          </ConfirmDialogProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

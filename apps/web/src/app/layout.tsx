import type { Metadata } from "next";
import "./globals.css";

import { SidebarConfigProvider } from "@/contexts/sidebar-context";
import { QueryProvider } from "@/providers/query-provider";
import { ConfirmDialogProvider } from "@/providers/confirm-dialog-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getThemeScript } from "@/lib/theme-init";
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
    <html lang="en" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeScript() }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="nextjs-ui-theme">
          <QueryProvider>
            <ConfirmDialogProvider>
              <SidebarConfigProvider>
                {children}
              </SidebarConfigProvider>
            </ConfirmDialogProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

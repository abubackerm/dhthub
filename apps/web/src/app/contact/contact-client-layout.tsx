"use client";

import { AuthProvider } from "@/providers/auth-provider";

export function ContactClientLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

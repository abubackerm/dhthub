"use client";

import { AuthProvider } from "@/providers/auth-provider";

export function AboutClientLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

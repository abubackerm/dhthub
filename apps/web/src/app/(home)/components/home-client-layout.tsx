"use client";

import { AuthProvider } from "@/providers/auth-provider";

export function HomeClientLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

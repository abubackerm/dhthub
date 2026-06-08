"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { useRequireAuth } from "@/providers/auth-provider";

export function AccountGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { requireAuth } = useRequireAuth();
  const hasRedirected = React.useRef(false);

  React.useEffect(() => {
    if (isPending) return;

    if (!session?.user && !hasRedirected.current) {
      hasRedirected.current = true;
      requireAuth(() => {
        // If user signs in successfully, they'll be on the account page
      });
      // Give user a moment, then redirect to home
      const timer = setTimeout(() => {
        router.push("/");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [session, isPending, requireAuth, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--dht-gray-light)">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--dht-red)" />
      </div>
    );
  }

  if (!session?.user) {
    // Still render children so the layout structure is visible while popup shows
    return <>{children}</>;
  }

  return <>{children}</>;
}

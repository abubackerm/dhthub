"use client";

import { useCallback, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SignInDialog } from "@/components/sign-in-dialog";

interface AddToCartIslandProps {
  children: (opts: { trigger: () => void }) => React.ReactNode;
  onAuthenticated: () => void;
}

export function AddToCartIsland({ children, onAuthenticated }: AddToCartIslandProps) {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;
  const [signInOpen, setSignInOpen] = useState(false);
  const actionRef = useRef<(() => void) | null>(null);

  const trigger = useCallback(() => {
    actionRef.current = onAuthenticated;
    if (isAuthenticated) {
      onAuthenticated();
    } else {
      setSignInOpen(true);
    }
  }, [isAuthenticated, onAuthenticated]);

  const handleSignInSuccess = useCallback(() => {
    setSignInOpen(false);
    const pending = actionRef.current;
    actionRef.current = null;
    setTimeout(() => {
      pending?.();
    }, 100);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      actionRef.current = null;
    }
    setSignInOpen(open);
  }, []);

  return (
    <>
      {children({ trigger })}
      <SignInDialog
        open={signInOpen}
        onOpenChange={handleOpenChange}
        onSuccess={handleSignInSuccess}
      />
    </>
  );
}

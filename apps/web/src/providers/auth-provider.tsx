"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { SignInDialog } from "@/components/sign-in-dialog";

interface AuthContextValue {
  isAuthenticated: boolean;
  requireAuth: (action: () => void) => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useRequireAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useRequireAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;
  const [signInOpen, setSignInOpen] = React.useState(false);
  const pendingActionRef = React.useRef<(() => void) | null>(null);

  const requireAuth = React.useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
      } else {
        pendingActionRef.current = action;
        setSignInOpen(true);
      }
    },
    [isAuthenticated],
  );

  const handleSignInSuccess = React.useCallback(() => {
    setSignInOpen(false);
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    // Small delay to let session settle after sign-in
    setTimeout(() => {
      pending?.();
    }, 100);
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      pendingActionRef.current = null;
    }
    setSignInOpen(open);
  }, []);

  const contextValue = React.useMemo(
    () => ({ isAuthenticated, requireAuth }),
    [isAuthenticated, requireAuth],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <SignInDialog
        open={signInOpen}
        onOpenChange={handleOpenChange}
        onSuccess={handleSignInSuccess}
      />
    </AuthContext.Provider>
  );
}

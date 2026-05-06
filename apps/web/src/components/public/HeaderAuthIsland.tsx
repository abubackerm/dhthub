"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { CircleUser, ChevronDown, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { SignInDialog } from "@/components/sign-in-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderAuthIslandProps {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export function HeaderAuthIsland({ variant = "desktop", onNavigate }: HeaderAuthIslandProps) {
  const { data: session } = authClient.useSession();
  const [isClient, setIsClient] = useState(false);
  const isAuthenticated = !!session?.user;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Prevent hydration mismatch by only rendering icons on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  const requireAuth = useCallback(
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

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      toast.success("Signed out successfully");
      window.location.reload();
    } catch {
      toast.error("Failed to sign out");
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  const handleSignInSuccess = useCallback(() => {
    setSignInOpen(false);
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    setTimeout(() => {
      pending?.();
    }, 100);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      pendingActionRef.current = null;
    }
    setSignInOpen(open);
  }, []);

  if (variant === "mobile") {
    return (
      <>
        {isAuthenticated ? (
          <>
            <Link
              href="/account/profile"
              className="flex items-center gap-2 text-white hover:text-(--dht-red) font-medium transition-colors"
              onClick={onNavigate}
              suppressHydrationWarning
            >
              {isClient && <CircleUser className="h-5 w-5" />}
              <span>{session?.user?.name || "Profile"}</span>
            </Link>
            <Link
              href="/account/orders"
              className="text-white hover:text-(--dht-red) font-medium transition-colors"
              onClick={onNavigate}
            >
              Orders
            </Link>
            <button
              type="button"
              onClick={() => {
                handleLogout();
                onNavigate?.();
              }}
              disabled={isLoggingOut}
              className="flex items-center gap-2 text-left text-white hover:text-(--dht-red) font-medium transition-colors"
            >
              {isLoggingOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
              {isLoggingOut ? "Signing out..." : "Logout"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              requireAuth(() => {});
            }}
            className="text-left text-white hover:text-(--dht-red) font-medium transition-colors"
          >
            Sign In
          </button>
        )}
        <SignInDialog
          open={signInOpen}
          onOpenChange={handleOpenChange}
          onSuccess={handleSignInSuccess}
        />
      </>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 text-white hover:text-(--dht-red) font-medium transition-colors focus:outline-none"
              suppressHydrationWarning
            >
              {isClient && <CircleUser className="h-5 w-5" />}
              <span>{session?.user?.name || "Profile"}</span>
              {isClient && <ChevronDown className="h-4 w-4" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/account/profile" className="w-full cursor-pointer">
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account/orders" className="w-full cursor-pointer">
                Orders
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut} className="cursor-pointer">
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              {isLoggingOut ? "Signing out..." : "Logout"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          type="button"
          onClick={() => requireAuth(() => {})}
          className="text-white hover:text-(--dht-red) font-medium transition-colors"
        >
          Sign In
        </button>
      )}
      <SignInDialog
        open={signInOpen}
        onOpenChange={handleOpenChange}
        onSuccess={handleSignInSuccess}
      />
    </>
  );
}

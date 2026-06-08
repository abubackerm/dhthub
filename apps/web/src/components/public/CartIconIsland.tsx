"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useCart } from "@/lib/api/cart";

interface CartIconIslandProps {
  variant?: "desktop" | "mobile";
  onClick?: () => void;
}

export function CartIconIsland({ variant = "desktop", onClick }: CartIconIslandProps) {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  const { data: cart } = useCart();
  const itemCount = isAuthenticated ? (cart?.itemCount || 0) : 0;

  if (variant === "mobile") {
    return (
      <Link
        href="/cart"
        className="flex items-center gap-2 text-white hover:text-(--dht-red) font-medium transition-colors relative"
        onClick={onClick}
      >
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-(--dht-red) text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
        <span>Cart</span>
      </Link>
    );
  }

  return (
    <Link
      href="/cart"
      className="flex items-center gap-2 text-white hover:text-(--dht-red) font-medium transition-colors relative"
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-(--dht-red) text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}

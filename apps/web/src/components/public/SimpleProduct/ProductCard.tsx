"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageIcon, ShoppingCart, Package } from "lucide-react";
import type { SimpleProductView } from "@/lib/api/catalog/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAddToCart } from "@/lib/api/cart";
import { AddToCartIsland } from "@/components/public/AddToCartIsland";

interface ProductCardProps {
  product: SimpleProductView;
  basePath: string;
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return "";
  const sarPrice = price / 100;
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
  }).format(sarPrice);
}

export function ProductCard({ product, basePath }: ProductCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const primaryImage = product.images?.[0]?.url || null;
  const addToCart = useAddToCart();
  const inStock = product.quantity > 0;
  const hasVariant = !!product.defaultVariantId;

  return (
    <Link
      href={`${basePath}/${product.slug}`}
      className="group flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {primaryImage ? (
          <>
            {!isImageLoaded && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              className={`object-contain p-2 transition-all duration-300 ${
                isImageLoaded
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95"
              } group-hover:scale-110`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onLoad={() => setIsImageLoaded(true)}
              onError={() => setIsImageLoaded(true)}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-xs font-medium text-gray-900 line-clamp-2 leading-snug group-hover:text-(--dht-red) transition-colors">
          {product.name}
        </h3>
        {product.sku && (
          <p className="text-[10px] text-gray-400 font-mono">SKU: {product.sku}</p>
        )}
        {product.price != null && (
          <p className="text-sm font-semibold text-gray-900">
            {formatPrice(product.price)}
          </p>
        )}

        {/* Add to Cart / Out of Stock */}
        <div className="mt-auto pt-2" onClick={(e) => e.preventDefault()}>
          {inStock && hasVariant ? (
            <AddToCartIsland
              onAuthenticated={() => {
                addToCart.mutate({ variantId: product.defaultVariantId!, qty: 1 });
              }}
            >
              {({ trigger }) => (
                <Button
                  className="w-full bg-(--dht-red) hover:bg-(--dht-red-hover) text-white h-9 text-sm gap-1.5"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    trigger();
                  }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </Button>
              )}
            </AddToCartIsland>
          ) : inStock && !hasVariant ? (
            <p className="text-xs text-muted-foreground text-center py-1">
              Unavailable
            </p>
          ) : (
            <Badge
              variant="secondary"
              className="w-full justify-center py-1 text-xs bg-gray-100 text-gray-500 hover:bg-gray-100"
            >
              <Package className="w-3 h-3 mr-1" />
              Out of Stock
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

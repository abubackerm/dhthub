"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import type { SimpleProductView } from "@/lib/api/catalog/types";

interface ProductCardProps {
  product: SimpleProductView;
  basePath: string;
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return "";
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
  }).format(price);
}

export function ProductCard({ product, basePath }: ProductCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const primaryImage = product.images?.[0]?.url || null;

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
              className={`object-contain p-4 transition-all duration-300 ${
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
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug group-hover:text-(--dht-red) transition-colors">
          {product.name}
        </h3>
        {product.sku && (
          <p className="text-xs text-gray-400 font-mono">SKU: {product.sku}</p>
        )}
        {product.price != null && (
          <p className="text-base font-semibold text-gray-900 mt-auto pt-2">
            {formatPrice(product.price)}
          </p>
        )}
      </div>
    </Link>
  );
}

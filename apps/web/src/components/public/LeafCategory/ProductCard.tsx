import Link from "next/link";
import type { LeafProductView, LeafVariantView } from "@/lib/api/catalog/types";

interface ProductCardProps {
  product: LeafProductView;
  variant: LeafVariantView;
  basePath: string;
}

export function ProductCard({ product, variant, basePath }: ProductCardProps) {
  const primaryImage = variant.images?.[0]?.url || product.images?.[0]?.url;
  const price = variant.price || product.price;
  const compareAtPrice = variant.compareAtPrice || product.compareAtPrice;

  return (
    <Link
      href={`${basePath}/${product.slug}`}
      className="product-card group"
    >
      <div className="product-card__image-wrapper">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={variant.name || product.name}
            className="product-card__image"
            loading="lazy"
            sizes="(max-width: 768px) 50vw, 200px"
          />
        ) : (
          <div className="product-card__image-placeholder" />
        )}
      </div>
      <div className="product-card__content">
        <h3 className="product-card__title">{variant.name || product.name}</h3>
        <div className="product-card__price">
          {price && (
            <>
              <span className="product-card__price-current">
                {formatPrice(price)}
              </span>
              {compareAtPrice && compareAtPrice > price && (
                <span className="product-card__price-compare">
                  {formatPrice(compareAtPrice)}
                </span>
              )}
            </>
          )}
        </div>
        {variant.sku && (
          <p className="product-card__sku">SKU: {variant.sku}</p>
        )}
      </div>
    </Link>
  );
}

function formatPrice(price: number | string | null | undefined): string {
  if (!price) return "N/A";
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
  }).format(numPrice);
}

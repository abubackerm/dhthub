"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SpecTable } from "./SpecTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  ShoppingCart,
  Download,
  Clock,
  TruckIcon,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";
import type { ProductDetailView, CategoryTreeNode } from "@/lib/api/catalog/types";

interface ProductDetailProps {
  product: ProductDetailView;
  category: CategoryTreeNode | null;
  pathNames: string[];
  pathSlugs: string[];
}

export function ProductDetailPage({
  product,
  category,
  pathNames,
  pathSlugs,
}: ProductDetailProps) {
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants.find((v) => v.isDefault)?.id || product.variants[0]?.id || null
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Get selected variant
  const selectedVariant = useMemo(() => {
    return product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  }, [product.variants, selectedVariantId]);

  // Build breadcrumb items
  const breadcrumbItems = pathNames.map((name, index) => ({
    name,
    slug: pathSlugs[index],
    path: pathSlugs.slice(0, index + 1).join("/"),
  }));

  // Build spec rows from variant attribute values
  const specs = useMemo(() => {
    if (!selectedVariant) return [];

    return selectedVariant.attributeValues
      .sort((a, b) => a.attribute.name.localeCompare(b.attribute.name))
      .map((av) => {
        let value = "";
        if (av.numberValue !== null) {
          value = String(av.numberValue);
        } else if (av.textValue !== null) {
          value = av.textValue;
        } else if (av.booleanValue !== null) {
          value = av.booleanValue ? "Yes" : "No";
        } else if (av.option) {
          value = av.option.label;
        }

        return {
          name: av.attribute.name,
          value: value || "—",
          unit: av.attribute.unit?.symbol || null,
        };
      });
  }, [selectedVariant]);

  // Get all images from all variants
  const allImages = useMemo(() => {
    const images: { url: string; altText: string | null; isPrimary: boolean; variantId: string }[] = [];

    // Start with product-level images
    product.images.forEach((img) => {
      images.push({ ...img, variantId: "product" });
    });

    // Add variant images
    product.variants.forEach((variant) => {
      variant.images.forEach((img) => {
        images.push({ ...img, variantId: variant.id });
      });
    });

    // If no images, return placeholder
    if (images.length === 0) {
      return [{ url: "", altText: "No image", isPrimary: true, variantId: "placeholder" }];
    }

    return images;
  }, [product.images, product.variants]);

  // Current image
  const currentImage = allImages[selectedImageIndex] || allImages[0];

  // Check stock
  const inStock = selectedVariant ? selectedVariant.quantity > 0 : false;
  const minOrderQty = 1;

  // Calculate price
  const price = selectedVariant?.price ?? product.price ?? 0;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice;

  const basePath = `/products/${pathSlugs.join("/")}`;
  const productPath = `${basePath}/${product.slug}`;

  // Quantity handlers
  const incrementQuantity = () => setQuantity((q) => q + 1);
  const decrementQuantity = () => setQuantity((q) => Math.max(minOrderQty, q - 1));

  return (
    <div className="catalog-page">
      {/* Breadcrumb */}
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link href="/products" className="catalog-breadcrumb__link">
          Products
        </Link>
        <span className="catalog-breadcrumb__sep" aria-hidden="true">
          <ChevronRight className="w-4 h-4" />
        </span>
        {breadcrumbItems.map((item, i) => (
          <span key={i}>
            <span className="catalog-breadcrumb__sep" aria-hidden="true">
              <ChevronRight className="w-4 h-4" />
            </span>
            {i === breadcrumbItems.length - 1 ? (
              <span className="catalog-breadcrumb__current" aria-current="page">{item.name}</span>
            ) : (
              <Link href={`/products/${item.path}`} className="catalog-breadcrumb__link">
                {item.name}
              </Link>
            )}
          </span>
        ))}
        <span className="catalog-breadcrumb__sep" aria-hidden="true">
          <ChevronRight className="w-4 h-4" />
        </span>
        <span className="catalog-breadcrumb__current" aria-current="page">{product.name}</span>
      </nav>

      {/* Back Link */}
      <Link
        href={basePath}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 mt-2"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to {category?.name || "Products"}
      </Link>

      {/* Product Details Grid */}
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column - Image Gallery */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center border overflow-hidden">
            {currentImage?.url ? (
              <img
                src={currentImage.url}
                alt={currentImage.altText || product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <Package className="w-32 h-32 text-muted-foreground/30" />
            )}
          </div>

          {/* Thumbnail Strip */}
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {allImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-16 h-16 bg-muted rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                    selectedImageIndex === index
                      ? "border-(--dht-red) ring-1 ring-(--dht-red)"
                      : "hover:border-(--dht-red)/50"
                  }`}
                >
                  {img.url ? (
                    <img
                      src={img.url}
                      alt={img.altText || `Image ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Product Info */}
        <div className="space-y-6">
          {/* Product Name & SKU */}
          <div>
            {selectedVariant && (
              <Badge variant="outline" className="mb-2 font-mono text-xs">
                {selectedVariant.sku}
              </Badge>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>
            {product.description && (
              <p className="text-muted-foreground mt-2">{product.description}</p>
            )}
          </div>

          {/* Variant Selector */}
          {product.variants.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Variant</Label>
              <Select
                value={selectedVariantId || undefined}
                onValueChange={setSelectedVariantId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a variant" />
                </SelectTrigger>
                <SelectContent>
                  {product.variants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      <div className="flex items-center gap-2">
                        <span>{variant.name || variant.sku}</span>
                        {variant.price != null && (
                          <span className="text-muted-foreground">
                            - ${variant.price.toFixed(2)}
                          </span>
                        )}
                        {variant.quantity <= 0 && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Out of Stock
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Price */}
          <div className="border-t border-b py-4">
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-bold text-foreground">${price.toFixed(2)}</p>
              {compareAtPrice && compareAtPrice > price && (
                <p className="text-lg text-muted-foreground line-through">
                  ${compareAtPrice.toFixed(2)}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">per unit</p>
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            {inStock ? (
              <>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                  In Stock
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {selectedVariant?.quantity} available
                </span>
              </>
            ) : (
              <Badge
                variant="destructive"
                className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
              >
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Quantity & Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="w-36">
                <Label className="text-sm text-muted-foreground">Quantity</Label>
                <div className="flex items-center mt-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-r-none"
                    onClick={decrementQuantity}
                    disabled={quantity <= minOrderQty}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min={minOrderQty}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(minOrderQty, parseInt(e.target.value) || minOrderQty))
                    }
                    className="h-10 w-16 text-center rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-l-none"
                    onClick={incrementQuantity}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground pb-2">
                Min: {minOrderQty}
              </p>
            </div>

            <Button
              className="w-full bg-(--dht-red) hover:bg-(--dht-red-hover) text-white h-12 text-lg"
              disabled={!inStock}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Add to Cart
            </Button>
          </div>

          {/* Shipping Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <TruckIcon className="w-4 h-4 text-muted-foreground" />
              <span>Free shipping on orders over $50</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span>30-day return policy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications Section */}
      {specs.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">Specifications</h2>
          <SpecTable specs={specs} />
        </div>
      )}

      {/* Cell Info */}
      {product.cell && (
        <div className="mt-8 p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Part of{" "}
            <Link
              href={basePath}
              className="text-(--dht-red) hover:underline font-medium"
            >
              {product.cell.name}
            </Link>
            {" "}in{" "}
            <span className="font-medium">{product.cell.category.name}</span>
          </p>
        </div>
      )}
    </div>
  );
}

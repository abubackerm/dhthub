"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Package, ShoppingCart, Minus, Plus, ImageIcon } from "lucide-react";
import type { SimpleProductView } from "@/lib/api/catalog/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpecTable } from "@/components/public/ProductDetail/SpecTable";
import { ImageWithPlaceholder } from "@/components/ui/image-with-placeholder";
import { useAddToCart, useCart } from "@/lib/api/cart";
import { AddToCartIsland } from "@/components/public/AddToCartIsland";

interface SimpleProductDetailProps {
  product: SimpleProductView;
  pathNames: string[];
  pathSlugs: string[];
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return "";
  return (price / 100).toFixed(2);
}

export function SimpleProductDetailPage({
  product,
  pathNames,
  pathSlugs,
}: SimpleProductDetailProps) {
  const addToCart = useAddToCart();
  const { data: cartData } = useCart();
  const basePath = `/products/${pathSlugs.join("/")}`;
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const minOrderQty = 1;

  // Build breadcrumb items from path
  const breadcrumbItems = pathNames.map((name, index) => ({
    name,
    slug: pathSlugs[index],
    path: pathSlugs.slice(0, index + 1).join("/"),
  }));

  // Build specs from product attribute values using SpecTable format
  const specs = useMemo(() => {
    if (!product.attributeValues || product.attributeValues.length === 0) return [];

    return product.attributeValues
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
        } else if (av.rawValue) {
          value = av.rawValue;
        }

        return {
          name: av.attribute.name,
          value: value || "—",
          unit: null,
        };
      });
  }, [product.attributeValues]);

  // Build all images for thumbnail gallery
  const allImages = useMemo(() => {
    const images: { url: string; altText: string | null; isPrimary: boolean }[] = [];

    if (product.images) {
      images.push(...product.images);
    }

    if (images.length === 0) {
      return [{ url: "", altText: "No image", isPrimary: true }];
    }

    return images;
  }, [product.images]);

  const currentImage = allImages[selectedImageIndex] || allImages[0];
  const variantId = product.defaultVariantId;
  const rawMaxQty = Math.max(0, product.quantity);

  // Account for items already in cart
  const existingCartQty = useMemo(() => {
    if (!cartData?.items || !variantId) return 0;
    const item = cartData.items.find((i) => i.variantId === variantId);
    return item?.qty || 0;
  }, [cartData, variantId]);

  const effectiveMaxQty = Math.max(0, rawMaxQty - existingCartQty);

  const inStock = effectiveMaxQty > 0;
  const maxQty = effectiveMaxQty;

  const incrementQuantity = () => setQuantity((q) => Math.min(maxQty, q + 1));
  const decrementQuantity = () => setQuantity((q) => Math.max(minOrderQty, q - 1));

  return (
    <div className="catalog-page">
      {/* Breadcrumb */}
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link href="/products" className="catalog-breadcrumb__link">
          Products
        </Link>
        {breadcrumbItems.map((item, i) => (
          <React.Fragment key={i}>
            <span className="catalog-breadcrumb__sep" aria-hidden="true">
              <ChevronRight className="w-4 h-4" />
            </span>
            <Link href={i === 0 ? "/products" : `/products/${item.path}`} className="catalog-breadcrumb__link">
              {item.name}
            </Link>
          </React.Fragment>
        ))}
        <span className="catalog-breadcrumb__sep" aria-hidden="true">
          <ChevronRight className="w-4 h-4" />
        </span>
        <span className="catalog-breadcrumb__current" aria-current="page">{product.name}</span>
      </nav>

      {/* Product Details Grid */}
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column - Image Gallery */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center border overflow-hidden">
            {currentImage?.url ? (
              <ImageWithPlaceholder
                src={currentImage.url}
                alt={currentImage.altText || product.name}
                width={400}
                height={400}
                className="w-full h-full object-contain"
                loading="eager"
                decoding="sync"
                showBlur={true}
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-32 h-32 text-muted-foreground/30" />
              </div>
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
                    <ImageWithPlaceholder
                      src={img.url}
                      alt={img.altText || `Image ${index + 1}`}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover rounded"
                      loading="lazy"
                      decoding="async"
                      showBlur={true}
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
            {product.sku && (
              <Badge variant="outline" className="mb-2 font-mono text-xs">
                {product.sku}
              </Badge>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>
            {product.description && (
              <p className="text-muted-foreground mt-2">{product.description}</p>
            )}
          </div>

          {/* Price */}
          <div className="border-t border-b py-4">
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-bold text-foreground">SAR {formatPrice(product.price)}</p>
            </div>
            <p className="text-sm text-muted-foreground">per unit</p>
          </div>

          {/* Stock Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {product.quantity > 0 ? (
                <>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                    In Stock
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {product.quantity} available
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
            {existingCartQty > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Already {existingCartQty} in your cart{effectiveMaxQty <= 0 ? " (max reached)" : ""}
              </p>
            )}
          </div>

          {/* Quantity & Add to Cart */}
          {inStock ? (
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
                        setQuantity(Math.min(maxQty, Math.max(minOrderQty, parseInt(e.target.value) || minOrderQty)))
                      }
                      className="h-10 w-16 text-center rounded-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-l-none"
                      onClick={incrementQuantity}
                      disabled={quantity >= maxQty}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pb-2">
                  Min: {minOrderQty}
                  <span className="ml-2">Max: {maxQty}</span>
                </p>
              </div>

              <AddToCartIsland
                onAuthenticated={() => {
                  if (variantId && quantity <= maxQty) {
                    addToCart.mutate({ variantId, qty: quantity });
                  }
                }}
              >
                {({ trigger }) => (
                  <Button
                    className="w-full bg-(--dht-red) hover:bg-(--dht-red-hover) text-white h-12 text-lg"
                    disabled={!variantId || quantity > maxQty}
                    onClick={trigger}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart
                  </Button>
                )}
              </AddToCartIsland>
            </div>
          ) : (
            <Button
              className="w-full bg-muted text-muted-foreground h-12 text-lg cursor-not-allowed"
              disabled
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {existingCartQty > 0 && product.quantity > 0
                ? "All in Cart"
                : "Out of Stock"}
            </Button>
          )}
        </div>
      </div>

      {/* Specifications Section */}
      {specs.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">Specifications</h2>
          <SpecTable specs={specs} />
        </div>
      )}
    </div>
  );
}

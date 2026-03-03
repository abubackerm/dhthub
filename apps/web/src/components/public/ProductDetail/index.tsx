"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Product, mockAttributes, mockProducts, Category } from "@/lib/mock-data";
import { CatalogBreadcrumb } from "@/components/public/CatalogBreadcrumb";
import { SpecTable } from "./SpecTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  ShoppingCart,
  Download,
  Clock,
  TruckIcon,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

interface ProductDetailProps {
  product: Product;
  category: Category;
  pathNames: string[];
  pathSlugs: string[];
}

export function ProductDetail({
  product,
  category,
  pathNames,
  pathSlugs,
}: ProductDetailProps) {
  const [quantity, setQuantity] = useState(product.minOrderQty || 1);

  // Build breadcrumb items
  const breadcrumbItems = pathNames.map((name, index) => ({
    name,
    slug: pathSlugs[index],
    path: pathSlugs.slice(0, index + 1).join("/"),
  }));

  // Get attributes for this product's category
  const attributes = useMemo(
    () => mockAttributes
      .filter((attr) => attr.categoryId === category.id && attr.showInSpecSheet !== false)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [category.id]
  );

  // Build spec rows from product attributes
  const specs = useMemo(() => {
    return attributes.map((attr) => ({
      name: attr.name,
      value: product.attributes[attr.slug] || "",
      unit: attr.unit,
    }));
  }, [attributes, product.attributes]);

  // Get related products (same category, excluding current product)
  const relatedProducts = useMemo(
    () =>
      mockProducts
        .filter(
          (p) =>
            p.categoryId === category.id &&
            p.id !== product.id &&
            p.status === "PUBLISHED"
        )
        .slice(0, 6),
    [category.id, product.id]
  );

  const basePath = `/products/${pathSlugs.join("/")}`;

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <CatalogBreadcrumb items={breadcrumbItems} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          href={basePath}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to {category.name}
        </Link>

        {/* Product Details Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center border overflow-hidden">
              <Package className="w-32 h-32 text-muted-foreground/30" />
            </div>
            {/* Thumbnail Strip */}
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-16 h-16 bg-muted rounded border flex items-center justify-center cursor-pointer hover:border-[--dht-red] transition-colors"
                >
                  <Package className="w-6 h-6 text-muted-foreground/30" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-6">
            {/* Product Name & SKU */}
            <div>
              <Badge variant="outline" className="mb-2 font-mono">
                {product.sku}
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {product.name}
              </h1>
            </div>

            {/* Price */}
            <div className="border-t border-b py-4">
              <p className="text-3xl font-bold text-foreground">
                ${product.basePrice.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">per unit</p>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {product.inStock ? (
                <>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                    In Stock
                  </Badge>
                  {product.stockQty && (
                    <span className="text-sm text-muted-foreground">
                      {product.stockQty} available
                    </span>
                  )}
                </>
              ) : (
                <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                  Out of Stock
                </Badge>
              )}
            </div>

            {/* Lead Time */}
            {product.leadTimeDays && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Ships in {product.leadTimeDays} business days</span>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="w-32">
                  <Label className="text-sm text-muted-foreground">Quantity</Label>
                  <Input
                    type="number"
                    min={product.minOrderQty || 1}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(product.minOrderQty || 1, parseInt(e.target.value) || 1))
                    }
                    className="mt-1"
                  />
                </div>
                <p className="text-sm text-muted-foreground pb-2">
                  Min: {product.minOrderQty || 1}
                </p>
              </div>

              <Button
                className="w-full bg-[--dht-red] hover:bg-[--dht-red-hover] text-white h-12 text-lg"
                disabled={!product.inStock}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>

              {product.pdfSpecUrl && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={product.pdfSpecUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-2" />
                    Download Spec Sheet
                  </a>
                </Button>
              )}
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
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-foreground mb-4">Specifications</h2>
          <SpecTable specs={specs} />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">Related Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {relatedProducts.map((relProduct) => (
                <Link
                  key={relProduct.id}
                  href={`${basePath}/${relProduct.sku}`}
                  className="group"
                >
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-2 group-hover:ring-2 group-hover:ring-[--dht-red] transition-all">
                    <Package className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-[--dht-red]">
                    {relProduct.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ${relProduct.basePrice.toFixed(2)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

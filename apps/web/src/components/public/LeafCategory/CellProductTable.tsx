"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Minus, Plus, ShoppingCart, Package } from "lucide-react";
import type {
  LeafProductView,
  LeafFilterableAttributeView,
  LeafTableColumnView,
  LeafVariantView,
  LeafAttributeValueView,
} from "@/lib/api/catalog/types";
import { useAddToCart } from "@/lib/api/cart";
import { AddToCartIsland } from "@/components/public/AddToCartIsland";

interface CellProductTableProps {
  products: LeafProductView[];
  filterableAttributes: LeafFilterableAttributeView[];
  basePath: string;
}

type SortDirection = "asc" | "desc" | null;

export function CellProductTable({
  products,
  filterableAttributes,
  basePath,
}: CellProductTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addToCart = useAddToCart();

  // Get visible attributes for table columns.
  // Use product-level tableColumns (at_head) for ordering when available,
  // falling back to category-level filterableAttributes sorted alphabetically.
  const visibleAttributes = useMemo(() => {
    // Collect all unique attribute IDs from all products' tableColumns,
    // preserving a reference to the first tableColumn seen for each attribute
    // (to use its metadata when the attribute isn't in filterableAttributes).
    const orderedAttrIds: string[] = [];
    const seenAttrIds = new Set<string>();
    const tcMap = new Map<string, LeafTableColumnView>();

    for (const product of products) {
      for (const tc of product.tableColumns) {
        if (!seenAttrIds.has(tc.attributeId)) {
          seenAttrIds.add(tc.attributeId);
          orderedAttrIds.push(tc.attributeId);
          tcMap.set(tc.attributeId, tc);
        }
      }
    }

    // If any products have tableColumns, use that ordering
    if (orderedAttrIds.length > 0) {
      const attrMap = new Map(filterableAttributes.map((a) => [a.id, a]));
      const result: LeafFilterableAttributeView[] = [];

      for (const attrId of orderedAttrIds) {
        const attr = attrMap.get(attrId);
        if (attr) {
          const tc = tcMap.get(attrId);
          result.push({
            ...attr,
            unitName: attr.unitName ?? tc?.unitName ?? null,
          });
        } else {
          // Attribute is in tableColumns but not in filterableAttributes.
          // Synthesize a column definition from the tableColumn data.
          const tc = tcMap.get(attrId);
          if (tc) {
            result.push({
              id: tc.attributeId,
              name: tc.attributeName,
              slug: tc.attributeSlug,
              dataType: tc.dataType as LeafFilterableAttributeView["dataType"],
              filterType: null,
              unitName: tc.unitName,
              options: [],
            });
          }
        }
      }

      // Append any filterable attributes not in tableColumns (sorted alphabetically)
      for (const attr of filterableAttributes) {
        if (!seenAttrIds.has(attr.id)) {
          result.push(attr);
        }
      }

      return result;
    }

    // Fallback: use all filterableAttributes sorted alphabetically
    return [...filterableAttributes].sort((a, b) => a.name.localeCompare(b.name));
  }, [products, filterableAttributes]);

  // Flatten all variants with product info for the table
  const flatVariants = useMemo(() => {
    const variants: Array<LeafVariantView & { productId: string; productName: string; productSlug: string; productImages: LeafProductView["images"] }> = [];
    products.forEach((product) => {
      product.variants.forEach((variant) => {
        variants.push({
          ...variant,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          productImages: product.images,
        });
      });
    });
    return variants;
  }, [products]);

  // Get current sort from URL
  const sortColumn = searchParams.get("sort") || null;
  const sortDirection = (searchParams.get("dir") as SortDirection) || null;

  // Sort variants
  const sortedVariants = useMemo(() => {
    if (!sortColumn || !sortDirection) return flatVariants;

    return [...flatVariants].sort((a, b) => {
      let aVal: string | number = getAttributeValueForSort(a.attributeValues, sortColumn);
      let bVal: string | number = getAttributeValueForSort(b.attributeValues, sortColumn);

      // Handle special columns
      if (sortColumn === "sku") {
        aVal = a.sku;
        bVal = b.sku;
      } else if (sortColumn === "price") {
        aVal = a.price ?? 0;
        bVal = b.price ?? 0;
      } else if (sortColumn === "quantity") {
        aVal = a.quantity;
        bVal = b.quantity;
      }

      // Try to parse as numbers
      const aNum = typeof aVal === "number" ? aVal : parseFloat(String(aVal));
      const bNum = typeof bVal === "number" ? bVal : parseFloat(String(bVal));

      if (!isNaN(aNum) && !isNaN(bNum)) {
        aVal = aNum;
        bVal = bNum;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [flatVariants, sortColumn, sortDirection]);

  // Handle sort click
  const handleSort = (columnSlug: string) => {
    const urlParams = new URLSearchParams(searchParams.toString());

    if (sortColumn === columnSlug) {
      if (sortDirection === "asc") {
        urlParams.set("dir", "desc");
      } else if (sortDirection === "desc") {
        urlParams.delete("sort");
        urlParams.delete("dir");
      }
    } else {
      urlParams.set("sort", columnSlug);
      urlParams.set("dir", "asc");
    }

    router.push(`${basePath}?${urlParams.toString()}`);
  };

  // Get sort icon for column
  if (sortedVariants.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground text-sm">No variants available</p>
      </div>
    );
  }

  return (
    <div className="cell-product-table-wrapper">
      <div className="border rounded-md overflow-hidden">
        <Table className="cell-product-table">
          <TableHeader>
            <TableRow
              className="bg-linear-to-b from-[#ff3b3b] via-[#e60000_45%,#c40000_55%] to-[#990000] [box-shadow:inset_0_-2px_0_rgba(0,0,0,0.2)] border-b border-[#990000]"
            >
              <TableHead className="w-[60px] p-2"></TableHead>
              <TableHead
                className="font-semibold text-xs uppercase tracking-wide text-white w-[120px] p-2 cursor-pointer select-none hover:bg-white/10 transition-colors"
                onClick={() => handleSort("sku")}
              >
                <span>SKU</span>
              </TableHead>
              {visibleAttributes.map((attr) => (
                <TableHead
                  key={attr.id}
                  className="font-semibold text-xs uppercase tracking-wide text-white p-2 cursor-pointer select-none hover:bg-white/10 transition-colors leading-tight"
                  onClick={() => handleSort(attr.slug)}
                >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="wrap-break-word">{attr.name}</span>
                      {attr.unitName && (
                        <span className="font-normal text-white/70">
                          ({attr.unitName})
                        </span>
                      )}
                    </div>
                </TableHead>
              ))}
              <TableHead
                className="font-semibold text-xs uppercase tracking-wide text-white text-right w-[100px] p-2 cursor-pointer select-none hover:bg-white/10 transition-colors"
                onClick={() => handleSort("price")}
              >
                <div className="flex items-center justify-end">
                  <span>Price</span>
                </div>
              </TableHead>
              <TableHead className="w-[80px] p-2"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedVariants.map((variant, index) => {
              const productPath = `${basePath}/${variant.productSlug}?variant=${encodeURIComponent(variant.sku)}`;

              return (
                <TableRow
                  key={variant.id}
                  className="group cursor-pointer transition-colors"
                  onClick={() => router.push(productPath)}
                >
                  {/* Image Thumbnail */}
                  <TableCell className="p-2">
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center overflow-hidden">
                      {(() => {
                        const variantImage = variant.images.find((img) => img.isPrimary)?.url || variant.images[0]?.url;
                        const productImage = variant.productImages?.find((img) => img.isPrimary)?.url || variant.productImages?.[0]?.url;
                        const imageUrl = variantImage || productImage;
                        if (!imageUrl) {
                          return <Package className="w-5 h-5 text-muted-foreground/40" />;
                        }
                        return (
                          <img
                            src={imageUrl}
                            alt={variant.name || variant.productName}
                            className="w-full h-full object-cover"
                          />
                        );
                      })()}
                    </div>
                  </TableCell>

                  {/* SKU */}
                  <TableCell className="p-2">
                    <Link
                      href={productPath}
                      className="font-mono text-xs text-muted-foreground hover:text-(--dht-red) transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {variant.sku}
                    </Link>
                  </TableCell>

                  {/* Dynamic Attribute Columns */}
                  {visibleAttributes.map((attr) => {
                    const value = getAttributeValueDisplay(variant.attributeValues, attr.id, attr.unitName);
                    return (
                      <TableCell key={attr.id} className="p-2 text-sm">
                        {value}
                      </TableCell>
                    );
                  })}

                  {/* Price */}
                  <TableCell className="p-2 text-right">
                    {variant.price != null ? (
                      <span className="font-semibold text-sm">SAR {variant.price.toFixed(2)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Add to Cart */}
                  <TableCell className="p-2">
                    <CellAddToCartButton
                      variantId={variant.id}
                      addToCart={addToCart}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mt-2">
        {sortedVariants.length} variant{sortedVariants.length !== 1 ? "s" : ""} total
      </p>
    </div>
  );
}

function CellAddToCartButton({
  variantId,
  addToCart,
}: {
  variantId: string;
  addToCart: { mutate: (data: { variantId: string; qty: number }) => void; isPending: boolean };
}) {
  const [qty, setQty] = useState(1);

  const handleAddToCart = useCallback(() => {
    addToCart.mutate({ variantId, qty });
    setQty(1);
  }, [variantId, qty, addToCart]);

  return (
    <AddToCartIsland onAuthenticated={handleAddToCart}>
      {({ trigger }) => (
        <QuantityPopoverUI
          qty={qty}
          setQty={setQty}
          onConfirm={trigger}
          isPending={addToCart.isPending}
        />
      )}
    </AddToCartIsland>
  );
}

function QuantityPopoverUI({
  qty,
  setQty,
  onConfirm,
  isPending,
}: {
  qty: number;
  setQty: (q: number) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleAdd = useCallback(() => {
    onConfirm();
    setOpen(false);
  }, [onConfirm]);

  const adjustQty = useCallback((delta: number) => {
    setQty(Math.max(1, qty + delta));
  }, [qty, setQty]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={buttonRef}
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-(--dht-red) hover:text-(--dht-red-hover) hover:bg-(--dht-red)/10"
          onClick={(e) => e.stopPropagation()}
        >
          <ShoppingCart className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2"
        align="end"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              adjustQty(-1);
            }}
            disabled={qty <= 1}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1) setQty(val);
            }}
            className="h-7 w-12 text-center text-sm border rounded-md bg-background outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              adjustQty(1);
            }}
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            className="h-7 px-2.5 ml-0.5 bg-(--dht-red) hover:bg-(--dht-red-hover) text-white"
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
            disabled={isPending}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Helper function to get attribute value for display
function getAttributeValueDisplay(
  attributeValues: LeafAttributeValueView[],
  attributeId: string,
  unitName: string | null
): React.ReactNode {
  const av = attributeValues.find((v) => v.attributeId === attributeId);
  if (!av) return <span className="text-muted-foreground">—</span>;

  // Use rawValue when available (exact CSV input like "3/4\""), fall back to typed values
  if (av.rawValue != null && av.rawValue !== '') {
    return <>{av.rawValue}</>;
  }

  let value: string | number | null = null;

  switch (av.dataType) {
    case "number":
      value = av.numberValue;
      break;
    case "text":
      value = av.textValue;
      break;
    case "enum":
      value = av.optionLabel || av.optionValue || av.textValue;
      break;
    case "boolean":
      value = av.booleanValue ? "Yes" : "No";
      break;
  }

  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <>
      {value}
      {unitName && <span className="text-muted-foreground ml-0.5">{unitName}</span>}
    </>
  );
}

// Helper function to get attribute value for sorting
function getAttributeValueForSort(
  attributeValues: LeafAttributeValueView[],
  attributeSlug: string
): string | number {
  const av = attributeValues.find((v) => v.attributeSlug === attributeSlug);
  if (!av) return "";

  switch (av.dataType) {
    case "number":
      return av.numberValue ?? 0;
    case "text":
      return av.textValue ?? "";
    case "enum":
      return av.optionValue ?? av.optionLabel ?? av.textValue ?? "";
    case "boolean":
      return av.booleanValue ? 1 : 0;
    default:
      return "";
  }
}

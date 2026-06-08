"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ChevronsUpDown, ShoppingCart } from "lucide-react";
import { Attribute, Product } from "@/lib/mock-data";
import { useMemo, useCallback } from "react";
import { useAddToCart } from "@/lib/api/cart";
import { AddToCartIsland } from "@/components/public/AddToCartIsland";

interface ProductTableProps {
  products: Product[];
  attributes: Attribute[];
  basePath: string;
  totalProducts: number;
}

type SortDirection = "asc" | "desc" | null;

export function ProductTable({
  products,
  attributes,
  basePath,
  totalProducts,
}: ProductTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addToCart = useAddToCart();

  // Get visible attributes for table columns
  const visibleAttributes = useMemo(
    () => attributes.filter((attr) => attr.isVisibleInTable).sort((a, b) => a.sortOrder - b.sortOrder),
    [attributes]
  );

  // Get current sort from URL
  const sortColumn = searchParams.get("sort") || null;
  const sortDirection = (searchParams.get("dir") as SortDirection) || null;

  // Sort products
  const sortedProducts = useMemo(() => {
    if (!sortColumn || !sortDirection) return products;

    return [...products].sort((a, b) => {
      let aVal: string | number = a.attributes[sortColumn] || "";
      let bVal: string | number = b.attributes[sortColumn] || "";

      // Try to parse as numbers
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        aVal = aNum;
        bVal = bNum;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [products, sortColumn, sortDirection]);

  // Handle sort click
  const handleSort = useCallback(
    (columnSlug: string) => {
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
    },
    [router, searchParams, basePath, sortColumn, sortDirection]
  );

  // Get sort icon for column
  const getSortIcon = (columnSlug: string) => {
    if (sortColumn !== columnSlug) {
      return <ChevronsUpDown className="w-4 h-4 text-muted-foreground/50" />;
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="w-4 h-4 text-[--dht-red]" />;
    }
    return <ChevronDown className="w-4 h-4 text-[--dht-red]" />;
  };

  // Pagination
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 50;
  const totalPages = Math.ceil(totalProducts / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalProducts);
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  const goToPage = (newPage: number) => {
    const urlParams = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      urlParams.delete("page");
    } else {
      urlParams.set("page", newPage.toString());
    }
    router.push(`${basePath}?${urlParams.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {startIndex + 1}–{endIndex} of {totalProducts} products
        </p>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold w-[100px]">SKU</TableHead>
              <TableHead className="font-semibold min-w-[200px]">Name</TableHead>
              {visibleAttributes.map((attr) => (
                <TableHead
                  key={attr.id}
                  className="font-semibold cursor-pointer select-none hover:bg-muted/80 transition-colors"
                  onClick={() => handleSort(attr.slug)}
                >
                  <div className="flex items-center gap-1">
                    <span>{attr.name}</span>
                    {attr.unit && (
                      <span className="font-normal text-muted-foreground">
                        ({attr.unit})
                      </span>
                    )}
                    {getSortIcon(attr.slug)}
                  </div>
                </TableHead>
              ))}
              <TableHead className="font-semibold text-right w-[100px]">Price</TableHead>
              <TableHead className="font-semibold text-center w-[80px]">Stock</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.map((product, index) => (
              <TableRow
                key={product.id}
                className={`cursor-pointer hover:bg-muted/30 ${index % 2 === 1 ? "bg-muted/20" : ""}`}
              >
                <TableCell className="font-mono text-sm">
                  <Link
                    href={`${basePath}/${product.sku}`}
                    className="hover:text-[--dht-red] transition-colors"
                  >
                    {product.sku}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`${basePath}/${product.sku}`}
                    className="font-medium hover:text-[--dht-red] transition-colors line-clamp-1"
                  >
                    {product.name}
                  </Link>
                </TableCell>
                {visibleAttributes.map((attr) => (
                  <TableCell key={attr.id}>
                    {product.attributes[attr.slug] || "—"}
                    {product.attributes[attr.slug] && attr.unit && (
                      <span className="text-muted-foreground ml-1">{attr.unit}</span>
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right font-semibold">
                  SAR {product.basePrice.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  {product.inStock ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
                      In Stock
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                      Out
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <AddToCartIsland
                    onAuthenticated={() => {
                      if (product.id) {
                        addToCart.mutate({ variantId: product.id, qty: 1 });
                      }
                    }}
                  >
                    {({ trigger }) => (
                      <Button
                        size="sm"
                        className="bg-[--dht-red] hover:bg-[--dht-red-hover] text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          trigger();
                        }}
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    )}
                  </AddToCartIsland>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Empty State */}
      {paginatedProducts.length === 0 && (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">No products match your filters.</p>
          <Button variant="link" className="text-[--dht-red]" onClick={() => router.push(basePath)}>
            Clear all filters
          </Button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  className={page === pageNum ? "bg-[--dht-red] hover:bg-[--dht-red-hover]" : ""}
                  onClick={() => goToPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

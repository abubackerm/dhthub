"use client";

import { useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSimpleProductsBySlug } from "@/lib/api/catalog/use-categories";
import { useFilterContext } from "@/contexts/filter-context";
import type { SimpleProductView } from "@/lib/api/catalog/types";
import { Skeleton } from "@/components/ui/skeleton";
import { LeafCategoryBreadcrumb } from "@/components/public/LeafCategory/LeafCategoryBreadcrumb";
import { ProductCard } from "./ProductCard";
import { SimpleProductFilters } from "./SimpleProductFilters";

interface SimpleProductGridPageProps {
  categorySlug: string;
  pathNames: string[];
  pathSlugs: string[];
  serverData?: SimpleProductView[];
}

export function SimpleProductGridPage({
  categorySlug,
  pathNames,
  pathSlugs,
  serverData,
}: SimpleProductGridPageProps) {
  const { data: clientData, isLoading } = useSimpleProductsBySlug(
    !serverData ? categorySlug : undefined,
  );
  const searchParams = useSearchParams();
  const basePath = `/products/${pathSlugs.join("/")}`;

  const data = serverData || clientData;
  const { setFilterData: setFilterContext } = useFilterContext();

  // Clear filter context to prevent stale variant-attribute filters from showing
  useEffect(() => {
    setFilterContext(null);
    return () => setFilterContext(null);
  }, [setFilterContext]);

  // Filter products based on URL search params
  const filteredProducts = useMemo(() => {
    if (!data) return [];

    const q = searchParams.get("q")?.toLowerCase().trim() ?? "";
    const priceMin = searchParams.get("priceMin");
    const priceMax = searchParams.get("priceMax");

    return data.filter((product) => {
      // Text search: match name or SKU
      if (q) {
        const nameMatch = product.name.toLowerCase().includes(q);
        const skuMatch = product.sku?.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !skuMatch) return false;
      }

      // Price range
      if (priceMin && product.price != null && product.price < parseFloat(priceMin)) {
        return false;
      }
      if (priceMax && product.price != null && product.price > parseFloat(priceMax)) {
        return false;
      }

      return true;
    });
  }, [data, searchParams]);

  // Show loading skeleton while client fetches
  if (!serverData && isLoading) {
    return <SimpleProductGridPageSkeleton pathNames={pathNames} pathSlugs={pathSlugs} />;
  }

  if (!data) {
    return (
      <div className="catalog-page">
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            Unable to load products. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // Category info - we derive it from the category slug lookup pathNames
  // The last path name is the current category
  const categoryName = pathNames[pathNames.length - 1] ?? "Products";

  return (
    <div className="catalog-page">
      {/* Breadcrumb */}
      <LeafCategoryBreadcrumb pathNames={pathNames} pathSlugs={pathSlugs} />

      {/* Category Title */}
      <h1 className="catalog-page__title">{categoryName}</h1>

      {/* Simple Filters */}
      <SimpleProductFilters basePath={basePath} />

      {/* Product Grid */}
      <div>
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No products match your filters.</p>
            {searchParams.toString().length > 0 && (
              <Link
                href={basePath}
                className="text-(--dht-red) hover:underline mt-2 inline-block"
              >
                Clear all filters
              </Link>
            )}
            {searchParams.toString().length === 0 && (
              <p className="text-sm text-gray-400 mt-1">
                Check back soon for new products.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  basePath={basePath}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Loading skeleton for the simple product grid page */
function SimpleProductGridPageSkeleton({
  pathNames,
  pathSlugs,
}: {
  pathNames: string[];
  pathSlugs: string[];
}) {
  return (
    <div className="catalog-page">
      {/* Breadcrumb Skeleton */}
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4 ml-2" />
        <Skeleton className="h-4 w-24 ml-2" />
        <Skeleton className="h-4 w-4 ml-2" />
        <Skeleton className="h-4 w-32 ml-2" />
      </nav>

      {/* Title Skeleton */}
      <Skeleton className="h-10 w-64 mt-6 mb-3" />
      <Skeleton className="h-4 w-48 mb-6" />

      {/* Filters Skeleton */}
      <div className="flex gap-3 mb-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-52" />
      </div>

      {/* Product Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
            <Skeleton className="aspect-square w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-5 w-1/3 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLeafPageData, useAggregatedFilterData } from "@/lib/api/catalog/use-categories";
import { useFilterContext } from "@/contexts/filter-context";
import type {
  LeafCellView,
  LeafProductView,
  LeafFilterableAttributeView,
  LeafAttributeValueView,
  LeafPageView,
  AggregatedFilterDataView,
} from "@/lib/api/catalog/types";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileFilterToggle } from "./MobileFilterToggle";
import { LeafCategoryBreadcrumb } from "./LeafCategoryBreadcrumb";
import { CellSection } from "./CellSection";

export { ConsolidatedLeafCategoryPage } from "./ConsolidatedLeafCategoryPage";

interface LeafCategoryPageProps {
  categorySlug: string;
  pathNames: string[];
  pathSlugs: string[];
  serverData?: LeafPageView | null;
  serverFilterData?: AggregatedFilterDataView | null;
}

export function LeafCategoryPage({
  categorySlug,
  pathNames,
  pathSlugs,
  serverData,
  serverFilterData,
}: LeafCategoryPageProps) {
  const { data: clientData, isLoading, error } = useLeafPageData(!serverData ? categorySlug : undefined);
  const { data: clientFilterData } = useAggregatedFilterData(!serverFilterData ? categorySlug : undefined);
  const searchParams = useSearchParams();
  const basePath = `/products/${pathSlugs.join("/")}`;
  const { setFilterData: setFilterContext } = useFilterContext();

  const data = serverData || clientData;
  const filterData = serverFilterData || clientFilterData;

  const facets = filterData?.facets ?? {};
  const filterableAttributes = filterData?.filterableAttributes ?? data?.filterableAttributes ?? [];

  useEffect(() => {
    if (filterData && filterData.filterableAttributes.length > 0) {
      setFilterContext({
        attributes: filterData.filterableAttributes,
        facets: filterData.facets,
        basePath,
      });
    } else {
      setFilterContext(null);
    }

    return () => setFilterContext(null);
  }, [filterData, basePath, setFilterContext]);

  const totalVariantCount = useMemo(() => {
    if (!data) return 0;
    let variantCount = 0;
    data.cells.forEach((c) => c.products.forEach((p) => { variantCount += p.variants.length; }));
    if (variantCount > 0) return variantCount;
    return data.cells.reduce((sum, c) => sum + c.products.length, 0);
  }, [data]);

  const filteredCells = useMemo(() => {
    if (!data) return [];
    const cells = data.cells;
    const hasActiveFilters = Array.from(searchParams.keys()).length > 0;
    if (!hasActiveFilters) return cells;
    return cells.map((cell) => ({
      ...cell,
      products: cell.products.map((product) => ({
        ...product,
        _hadVariants: product.variants.length > 0,
        variants: product.variants.filter((variant) => {
          return filterableAttributes.every((attr) => {
            const attrValue = getAttributeValue(variant.attributeValues, attr.id);
            if (attrValue === null) return true;
            if (attr.filterType === "RANGE") {
              const min = searchParams.get(`${attr.slug}_min`);
              const max = searchParams.get(`${attr.slug}_max`);
              const numValue = typeof attrValue === "number" ? attrValue : parseFloat(String(attrValue));
              if (min && !isNaN(numValue) && numValue < parseFloat(min)) return false;
              if (max && !isNaN(numValue) && numValue > parseFloat(max)) return false;
            } else if (attr.filterType === "CHECKBOX") {
              const selectedValues = searchParams.getAll(attr.slug);
              if (selectedValues.length > 0) {
                const strValue = String(attrValue);
                if (!selectedValues.includes(strValue)) return false;
              }
            }
            return true;
          });
        }),
      })).filter((product) => product.variants.length > 0 || !product._hadVariants),
    })).filter((cell) => cell.products.length > 0);
  }, [data, filterableAttributes, searchParams]);

  if (!serverData && isLoading) {
    return <LeafCategoryPageSkeleton />;
  }
  if (!data) {
    return (
      <div className="catalog-page">
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            Unable to load category data. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-page">
      {/* Breadcrumb */}
      <LeafCategoryBreadcrumb pathNames={pathNames} pathSlugs={pathSlugs} />

      {/* h1: Leaf Category Title */}
      <h1 className="catalog-page__title">{data.category.name}</h1>
      {data.category.description && (
        <p className="text-muted-foreground mb-6 max-w-3xl">{data.category.description}</p>
      )}
      <p className="text-sm text-gray-500 mb-6">
        {totalVariantCount} item{totalVariantCount !== 1 ? "s" : ""} available
      </p>

      {/* Mobile Filter */}
      {filterableAttributes.length > 0 && (
        <div className="lg:hidden mb-4">
          <MobileFilterToggle
            attributes={filterableAttributes}
            facets={facets}
            basePath={basePath}
          />
        </div>
      )}

      {/* Main Content: cells > products > table */}
      <div>
        {filteredCells.length === 0 && (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No items match your filters.</p>
            <Link href={basePath} className="text-(--dht-red) hover:underline mt-2 inline-block">
              Clear all filters
            </Link>
          </div>
        )}

        {filteredCells.map((cell) => (
          <CellSection
            key={cell.id}
            cell={cell}
            basePath={basePath}
            filterableAttributes={filterableAttributes}
          />
        ))}
      </div>
    </div>
  );
}

function getAttributeValue(
  attributeValues: LeafAttributeValueView[],
  attributeId: string
): string | number | boolean | null {
  const av = attributeValues.find((v) => v.attributeId === attributeId);
  if (!av) return null;

  switch (av.dataType) {
    case "number":
      return av.numberValue;
    case "text":
      return av.textValue;
    case "enum":
      return av.optionValue;
    case "boolean":
      return av.booleanValue;
    default:
      return null;
  }
}

function LeafCategoryPageSkeleton() {
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

      {/* Title and Description Skeleton */}
      <Skeleton className="h-10 w-80 mt-6 mb-3" />
      <Skeleton className="h-4 w-64 mb-2" />
      <Skeleton className="h-4 w-48 mb-6" />

      {/* Product Grid Skeleton */}
      <div className="mt-8 space-y-8">
        {/* Cell Section */}
        <div>
          <Skeleton className="h-7 w-56 mb-4" />
          {/* Product */}
          <div>
            <Skeleton className="h-6 w-48 mb-3" />
            {/* Product Table Placeholder */}
            <div className="border rounded-lg overflow-hidden">
              <Skeleton className="h-10 w-full border-b" />
              <Skeleton className="h-16 w-full border-b" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>

        {/* Another Cell Section */}
        <div>
          <Skeleton className="h-7 w-56 mb-4" />
          {/* Product */}
          <div>
            <Skeleton className="h-6 w-48 mb-3" />
            {/* Product Table Placeholder */}
            <div className="border rounded-lg overflow-hidden">
              <Skeleton className="h-10 w-full border-b" />
              <Skeleton className="h-16 w-full border-b" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

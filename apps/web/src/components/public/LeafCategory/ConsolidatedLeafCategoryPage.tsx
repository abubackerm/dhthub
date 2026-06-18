"use client";

import React, { useMemo, useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useConsolidatedLeafData, useAggregatedFilterData, isCategoryTooManyLeavesError, getCategoryTooManyLeavesMessage } from "@/lib/api/catalog/use-categories";
import { useFilterContext } from "@/contexts/filter-context";
import { ApiError } from "@/lib/api/client";
import type {
  LeafProductView,
  LeafFilterableAttributeView,
  LeafAttributeValueView,
  ConsolidatedLeafPageView,
  AggregatedFilterDataView,
} from "@/lib/api/catalog/types";
import { CellProductTable } from "./CellProductTable";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileFilterToggle } from "./MobileFilterToggle";

import { Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { ImageWithPlaceholder } from "@/components/ui/image-with-placeholder";

interface ConsolidatedLeafCategoryPageProps {
  categorySlug: string;
  pathNames: string[];
  pathSlugs: string[];
  serverData?: ConsolidatedLeafPageView | null;
  serverFilterData?: AggregatedFilterDataView | null;
}

export function ConsolidatedLeafCategoryPage({
  categorySlug,
  pathNames,
  pathSlugs,
  serverData,
  serverFilterData,
}: ConsolidatedLeafCategoryPageProps) {
  const { data: clientData, isLoading, error } = useConsolidatedLeafData(!serverData ? categorySlug : undefined);
  const { data: clientFilterData } = useAggregatedFilterData(!serverFilterData ? categorySlug : undefined);
  const searchParams = useSearchParams();
  const basePath = `/products/${pathSlugs.join("/")}`;
  const { setFilterData: setFilterContext } = useFilterContext();

  const data = serverData || clientData;
  const filterData = serverFilterData || clientFilterData;

  const breadcrumbItems = pathNames.map((name, index) => ({
    name,
    path: `/products/${pathSlugs.slice(0, index + 1).join("/")}`,
  }));

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
    if (!data?.leafCategories) return 0;
    let variantCount = 0;
    data.leafCategories.forEach(lc => lc.cells.forEach(c => c.products.forEach(p => { variantCount += p.variants.length; })));
    if (variantCount > 0) return variantCount;
    let productCount = 0;
    data.leafCategories.forEach(lc => lc.cells.forEach(c => { productCount += c.products.length; }));
    return productCount;
  }, [data?.leafCategories]);

  const filteredLeafCategories = useMemo(() => {
    if (!data?.leafCategories || !filterableAttributes) return (data?.leafCategories ?? []).sort((a, b) => a.name.localeCompare(b.name));

    const hasActiveFilters = Array.from(searchParams.keys()).length > 0;
    if (!hasActiveFilters) return [...data.leafCategories].sort((a, b) => a.name.localeCompare(b.name));

    return data.leafCategories
      .map((leafCat) => ({
        ...leafCat,
        cells: leafCat.cells
          .map((cell) => ({
            ...cell,
            products: cell.products
              .map((product) => ({
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
              }))
              .filter((product) => product.variants.length > 0 || !product._hadVariants),
          }))
          .filter((cell) => cell.products.length > 0),
      }))
      .filter((leafCat) => leafCat.cells.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.leafCategories, filterableAttributes, searchParams]);

  if (!serverData && isLoading) {
    return <ConsolidatedLeafCategoryPageSkeleton />;
  }
  if (!data) {
    const tooManyLeaves = isCategoryTooManyLeavesError(error);
    const tooManyMessage = error instanceof ApiError ? getCategoryTooManyLeavesMessage(error) : undefined;
    return (
      <div className="catalog-page">
        <div className="text-center py-16">
          {tooManyLeaves ? (
            <div className="mx-auto max-w-lg rounded-lg border border-amber-300 bg-amber-50 px-6 py-8">
              <p className="text-amber-800 text-lg font-medium mb-2">Category too broad</p>
              <p className="text-amber-700 text-sm">{tooManyMessage || 'This category has too many sub-categories to display together. Navigate to a specific sub-category from the sidebar or breadcrumb.'}</p>
              <Link href="/products" className="text-(--dht-red) hover:underline mt-4 inline-block text-sm">
                Browse all categories
              </Link>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground text-lg">
                Unable to load category data. Please try again later.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-page">
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

      {/* Main Content: leaves > cells > products */}
      <div>
        {filteredLeafCategories.length === 0 && (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No items match your filters.</p>
            <Link href={basePath} className="text-(--dht-red) hover:underline mt-2 inline-block">
              Clear all filters
            </Link>
          </div>
        )}

        {filteredLeafCategories.map((leafCat, leafIndex) => (
          <div key={leafCat.id}>
            {/* Separator between leaf categories */}
            {leafIndex > 0 && (
              <hr className="my-10 border-t-2 border-gray-300" />
            )}

            {/* h1: Leaf category name with hero background */}
            <div className="relative overflow-hidden rounded-lg mb-6">
              <Image
                src="/images/leaf_hero.png"
                alt=""
                fill
                className="object-cover"
                priority={leafIndex === 0}
                loading={leafIndex === 0 ? "eager" : "lazy"}
                decoding={leafIndex === 0 ? "sync" : "async"}
              />
              <div className="relative z-10 px-6 py-4">
                {leafIndex === 0 ? (
                  <>
                    {/* First leaf: include breadcrumb and item count */}
                    <nav className="catalog-breadcrumb--hero" aria-label="Breadcrumb">
                      <Link href="/" className="catalog-breadcrumb__link">Home</Link>
                      <span className="catalog-breadcrumb__sep" aria-hidden="true">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                      <Link href="/products" className="catalog-breadcrumb__link">All Categories</Link>
                      {breadcrumbItems.map((item, i) => (
                        <React.Fragment key={i}>
                          <span className="catalog-breadcrumb__sep" aria-hidden="true">
                            <ChevronRight className="w-4 h-4" />
                          </span>
                          {i === breadcrumbItems.length - 1 ? (
                            <span className="catalog-breadcrumb__current" aria-current="page">{item.name}</span>
                          ) : (
                            <Link href={i === 0 ? "/products" : item.path} className="catalog-breadcrumb__link">{item.name}</Link>
                          )}
                        </React.Fragment>
                      ))}
                    </nav>
                    <p className="text-sm text-gray-500 mt-1 mb-3">
                      {totalVariantCount} item{totalVariantCount !== 1 ? "s" : ""} available across {data.leafCategories.length} categor{data.leafCategories.length !== 1 ? "ies" : "y"}
                    </p>
                    <h1 className="catalog-page__title m-0">{leafCat.name}</h1>
                    {leafCat.description && (
                      <p className="text-muted-foreground mb-0 mt-1 max-w-3xl">{leafCat.description}</p>
                    )}
                  </>
                ) : (
                  /* Subsequent leaves: just title and description */
                  <>
                    <h1 className="catalog-page__title m-0">{leafCat.name}</h1>
                    {leafCat.description && (
                      <p className="text-muted-foreground mb-0 mt-2 max-w-3xl">{leafCat.description}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Cells under this leaf */}
            {leafCat.cells.map((cell) => (
              <div key={cell.id} className="cell-section">
                <div className="flex gap-6 mb-4">
                  {/* Thumbnail */}
                  <div className="shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-muted">
                    {(() => {
                      const imageUrl = cell.images && cell.images.length > 0
                        ? cell.images.find((img) => img.isPrimary)?.storagePath || cell.images[0]?.storagePath
                        : cell.imageUrl;
                      if (!imageUrl) {
                        return (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        );
                      }
                      // Use regular img tag for localhost URLs to avoid Next.js optimization issues
                      const isLocalhost = imageUrl.includes('localhost');
                      if (isLocalhost) {
                        return (
                          <img 
                            src={imageUrl} 
                            alt={cell.name} 
                            className="object-contain w-full h-full"
                            loading="lazy"
                            decoding="async"
                          />
                        );
                      }
                      return (
                        <ImageWithPlaceholder
                          src={imageUrl}
                          alt={cell.name}
                          width={128}
                          height={128}
                          className="object-contain w-full h-full"
                          loading="lazy"
                          decoding="async"
                          sizes="128px"
                          showBlur={true}
                        />
                      );
                    })()}
                  </div>

                  {/* Name + Description */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-foreground mb-2">{cell.name}</h2>
                    {cell.description && (
                      <p className="text-sm text-muted-foreground">{cell.description}</p>
                    )}
                  </div>
                </div>

                {/* Products under this cell */}
                {cell.products.map((product) => (
                  <ProductSection
                    key={product.id}
                    product={product}
                    filterableAttributes={filterableAttributes}
                    basePath={basePath}
                    leafSlug={leafCat.slug}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductSection({
  product,
  filterableAttributes,
  basePath,
  leafSlug,
}: {
  product: LeafProductView;
  filterableAttributes: LeafFilterableAttributeView[];
  basePath: string;
  leafSlug: string;
}) {
  if (product.variants.length === 0) {
    const productBasePath = `${basePath}/${leafSlug}`;
    return (
      <div className="mb-6">
        <h2 className="text-lg font-medium text-foreground mb-2">
          <Link
            href={`${productBasePath}/${product.slug}`}
            className="hover:text-(--dht-red) transition-colors"
          >
            {product.name}
          </Link>
        </h2>
        {product.description && (
          <p className="text-sm text-muted-foreground mb-2 max-w-3xl">{product.description}</p>
        )}
      </div>
    );
  }

  const productBasePath = `${basePath}/${leafSlug}`;

  return (
    <div className="mb-6">
      {/* h2: Product name */}
      <h2 className="text-lg font-medium text-foreground mb-2">
        <Link
          href={`${productBasePath}/${product.slug}`}
          className="hover:text-(--dht-red) transition-colors"
        >
          {product.name}
        </Link>
      </h2>
      {product.description && (
        <p className="text-sm text-muted-foreground mb-2 max-w-3xl">{product.description}</p>
      )}

      {/* Variants table for this product */}
      <CellProductTable
        products={[product]}
        filterableAttributes={filterableAttributes}
        basePath={productBasePath}
      />
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

function ConsolidatedLeafCategoryPageSkeleton() {
  return (
    <div className="catalog-page">
      {/* First Leaf Category with Hero */}
      <div className="mb-10">
        {/* Hero Banner Skeleton */}
        <div className="relative overflow-hidden rounded-lg mb-6 bg-muted">
          <div className="px-6 py-4">
            {/* Breadcrumb */}
            <nav className="catalog-breadcrumb--hero" aria-label="Breadcrumb">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-3 ml-2" />
              <Skeleton className="h-4 w-20 ml-2" />
              <Skeleton className="h-4 w-3 ml-2" />
              <Skeleton className="h-4 w-28 ml-2" />
            </nav>
            <Skeleton className="h-4 w-40 mt-2 mb-3" />
            <Skeleton className="h-9 w-72 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>

        {/* Cell Section */}
        <div className="cell-section">
          <div className="flex gap-6 mb-4">
            <Skeleton className="w-32 h-32 rounded-lg shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-7 w-56 mb-2" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
          {/* Product Table */}
          <div className="border rounded-lg overflow-hidden">
            <Skeleton className="h-10 w-full border-b" />
            <Skeleton className="h-16 w-full border-b" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>

      {/* Second Leaf Category */}
      <div>
        {/* Title Banner */}
        <div className="relative overflow-hidden rounded-lg mb-6 bg-muted">
          <div className="px-6 py-4">
            <Skeleton className="h-9 w-72 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>

        {/* Cell Section */}
        <div className="cell-section">
          <div className="flex gap-6 mb-4">
            <Skeleton className="w-32 h-32 rounded-lg shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-7 w-56 mb-2" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
          {/* Product Table */}
          <div className="border rounded-lg overflow-hidden">
            <Skeleton className="h-10 w-full border-b" />
            <Skeleton className="h-16 w-full border-b" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

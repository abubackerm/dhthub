"use client";

import React, { useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useConsolidatedLeafData } from "@/lib/api/catalog/use-categories";
import { useFilterContext } from "@/contexts/filter-context";
import type {
  LeafCellView,
  LeafProductView,
  LeafFilterableAttributeView,
  LeafVariantView,
  LeafAttributeValueView,
} from "@/lib/api/catalog/types";
import { CellProductTable } from "./CellProductTable";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileFilterToggle } from "./MobileFilterToggle";

import { ChevronRight } from "lucide-react";
import Image from "next/image";

interface ConsolidatedLeafCategoryPageProps {
  categorySlug: string;
  pathNames: string[];
  pathSlugs: string[];
}

export function ConsolidatedLeafCategoryPage({ categorySlug, pathNames, pathSlugs }: ConsolidatedLeafCategoryPageProps) {
  const { data, isLoading, error } = useConsolidatedLeafData(categorySlug);
  const searchParams = useSearchParams();
  const basePath = `/products/${pathSlugs.join("/")}`;
  const { setFilterData } = useFilterContext();

  const breadcrumbItems = pathNames.map((name, index) => ({
    name,
    path: `/products/${pathSlugs.slice(0, index + 1).join("/")}`,
  }));

  const allVariants = useMemo(() => {
    if (!data?.leafCategories) return [];
    const variants: Array<LeafVariantView & {
      productId: string;
      productName: string;
      productSlug: string;
      cellId: string;
      cellName: string;
      categoryId: string;
      categoryName: string;
    }> = [];
    data.leafCategories.forEach((leafCat) => {
      leafCat.cells.forEach((cell) => {
        cell.products.forEach((product) => {
          product.variants.forEach((variant) => {
            variants.push({
              ...variant,
              productId: product.id,
              productName: product.name,
              productSlug: product.slug,
              cellId: cell.id,
              cellName: cell.name,
              categoryId: leafCat.id,
              categoryName: leafCat.name,
            });
          });
        });
      });
    });
    return variants;
  }, [data?.leafCategories]);

  // Set filter data in context when data is loaded
  useEffect(() => {
    if (data && data.filterableAttributes && data.filterableAttributes.length > 0) {
      setFilterData({
        attributes: data.filterableAttributes,
        variants: allVariants,
        basePath,
      });
    } else {
      setFilterData(null);
    }

    // Cleanup when unmounting
    return () => setFilterData(null);
  }, [data, allVariants, basePath, setFilterData]);

  const totalVariantCount = useMemo(() => allVariants.length, [allVariants]);

  const filteredLeafCategories = useMemo(() => {
    if (!data?.leafCategories || !data?.filterableAttributes) return data?.leafCategories ?? [];

    const hasActiveFilters = Array.from(searchParams.keys()).length > 0;
    if (!hasActiveFilters) return data.leafCategories;

    return data.leafCategories
      .map((leafCat) => ({
        ...leafCat,
        cells: leafCat.cells
          .map((cell) => ({
            ...cell,
            products: cell.products
              .map((product) => ({
                ...product,
                variants: product.variants.filter((variant) => {
                  return data.filterableAttributes.every((attr) => {
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
              .filter((product) => product.variants.length > 0),
          }))
          .filter((cell) => cell.products.length > 0),
      }))
      .filter((leafCat) => leafCat.cells.length > 0);
  }, [data?.leafCategories, data?.filterableAttributes, searchParams]);

  if (isLoading) {
    return <ConsolidatedLeafCategoryPageSkeleton />;
  }
  if (error || !data) {
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
      {/* Mobile Filter */}
      {data.filterableAttributes.length > 0 && (
        <div className="lg:hidden mb-4">
          <MobileFilterToggle
            attributes={data.filterableAttributes}
            variants={allVariants}
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
              />
              <div className="relative z-10 px-6 py-4">
                {leafIndex === 0 ? (
                  <>
                    {/* First leaf: include breadcrumb and item count */}
                    <nav className="catalog-breadcrumb--hero" aria-label="Breadcrumb">
                      <Link href="/" className="catalog-breadcrumb__link">Home</Link>
                      <span className="catalog-breadcrumb__sep" aria-hidden="true">&gt;</span>
                      <Link href="/products" className="catalog-breadcrumb__link">All Categories</Link>
                      {breadcrumbItems.map((item, i) => (
                        <React.Fragment key={i}>
                          <span className="catalog-breadcrumb__sep" aria-hidden="true">&gt;</span>
                          {i === breadcrumbItems.length - 1 ? (
                            <span className="catalog-breadcrumb__current" aria-current="page">{item.name}</span>
                          ) : (
                            <Link href={item.path} className="catalog-breadcrumb__link">{item.name}</Link>
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
                {/* h2: Cell name */}
                <h2 className="text-xl font-semibold text-foreground mb-4">{cell.name}</h2>
                {cell.description && (
                  <p className="text-sm text-muted-foreground mb-4">{cell.description}</p>
                )}

                {/* Products under this cell */}
                {cell.products.map((product) => (
                  <ProductSection
                    key={product.id}
                    product={product}
                    filterableAttributes={data.filterableAttributes}
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
  if (product.variants.length === 0) return null;

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
        <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
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
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-32 ml-2" />
      </nav>
      <Skeleton className="h-4 w-48 mt-2 mb-6" />
      <div>
        <div>
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-6 w-36 mb-2" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div>
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

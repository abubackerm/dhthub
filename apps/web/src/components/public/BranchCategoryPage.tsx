"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAggregatedFilterData } from "@/lib/api/catalog/use-categories";
import { useFilterContext } from "@/contexts/filter-context";
import { CategoryIcon } from "@/components/public/CategoryIcon";
import { getCategoryIconName } from "@/lib/utils/category-icon-map";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryTreeNode } from "@/lib/api/catalog/types";
import type { AggregatedFilterDataView } from "@/lib/api/catalog/types";
import { ImageWithPlaceholder } from "@/components/ui/image-with-placeholder";

interface BranchCategoryPageProps {
  category: CategoryTreeNode;
  pathNames: string[];
  pathSlugs: string[];
  serverFilterData?: AggregatedFilterDataView | null;
}

export function BranchCategoryPage({
  category,
  pathNames,
  pathSlugs,
  serverFilterData,
}: BranchCategoryPageProps) {
  const lastSlug = pathSlugs[pathSlugs.length - 1];
  const basePath = `/products/${pathSlugs.join("/")}`;
  const { data: clientData, isLoading } = useAggregatedFilterData(!serverFilterData ? lastSlug : undefined);
  const { setFilterData } = useFilterContext();

  // Use server data if available, otherwise fall back to client fetch
  const filterData = serverFilterData || clientData;

  if (!serverFilterData && isLoading) {
    return <BranchCategoryPageSkeleton />;
  }

  const activeChildren = category.children
    .filter((c) => c.isActive)
    .sort((a, b) => a.name.localeCompare(b.name));
  const hasDescriptions = activeChildren.some((c) => c.description);

  useEffect(() => {
    if (filterData && filterData.filterableAttributes && filterData.filterableAttributes.length > 0) {
      setFilterData({
        attributes: filterData.filterableAttributes,
        facets: filterData.facets,
        basePath,
      });
    } else {
      setFilterData(null);
    }

    return () => setFilterData(null);
  }, [filterData, basePath, setFilterData]);

  return (
    <div className="catalog-page">
      {/* Breadcrumb */}
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link href="/products" className="catalog-breadcrumb__link">
          Products
        </Link>
        {pathSlugs.map((slug, index) => (
          <span key={slug}>
            <span className="catalog-breadcrumb__sep" aria-hidden="true">
              &gt;
            </span>
            <span className="catalog-breadcrumb__current" aria-current="page">
              {pathNames[index] || slug}
            </span>
          </span>
        ))}
      </nav>

      {/* Category title */}
      <h1 className="catalog-page__title">{category.name}</h1>

      {/* Grid of child categories */}
      <div className={`catalog-grid${hasDescriptions ? " catalog-grid--has-descriptions" : ""}`}>
        {activeChildren.map((child) => (
          <Link
            key={child.id}
            href={`/products/${pathSlugs.join("/")}/${child.slug}`}
            className="catalog-grid__cell"
          >
            <div className="catalog-grid__icon">
              {child.imageUrl ? (
                <ImageWithPlaceholder
                  src={child.imageUrl}
                  alt={child.name}
                  width={80}
                  height={80}
                  className="w-full h-full"
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 768px) 50vw, 80px"
                  showBlur={true}
                />
              ) : (
                <CategoryIcon
                  iconName={getCategoryIconName(child.name)}
                  className="w-12 h-12 text-gray-600"
                  strokeWidth={1.5}
                />
              )}
            </div>
            <div className="catalog-grid__text">
              <span className="catalog-grid__label">{child.name}</span>
              {child.description && (
                <p className="catalog-grid__desc">{child.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {activeChildren.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            No subcategories available at this time.
          </p>
        </div>
      )}
    </div>
  );
}

function BranchCategoryPageSkeleton() {
  return (
    <div className="catalog-page">
      {/* Breadcrumb Skeleton */}
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-3 ml-2" />
        <Skeleton className="h-4 w-24 ml-2" />
        <Skeleton className="h-4 w-3 ml-2" />
        <Skeleton className="h-4 w-32 ml-2" />
      </nav>

      {/* Title Skeleton */}
      <Skeleton className="h-10 w-80 mt-6 mb-8" />

      {/* Category Grid Skeleton */}
      <div className="catalog-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="catalog-grid__cell">
            <div className="catalog-grid__icon">
              <Skeleton className="w-12 h-12 rounded-full" />
            </div>
            <div className="catalog-grid__text">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

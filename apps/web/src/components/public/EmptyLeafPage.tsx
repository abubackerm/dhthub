"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAggregatedFilterData } from "@/lib/api/catalog/use-categories";
import { useFilterContext } from "@/contexts/filter-context";
import type { CategoryTreeNode } from "@/lib/api/catalog/types";

interface EmptyLeafPageProps {
  category: CategoryTreeNode;
  pathNames: string[];
  pathSlugs: string[];
}

export function EmptyLeafPage({
  category,
  pathNames,
  pathSlugs,
}: EmptyLeafPageProps) {
  const lastSlug = pathSlugs[pathSlugs.length - 1];
  const basePath = `/products/${pathSlugs.join("/")}`;
  const { data } = useAggregatedFilterData(lastSlug);
  const { setFilterData } = useFilterContext();

  useEffect(() => {
    if (data && data.filterableAttributes && data.filterableAttributes.length > 0) {
      setFilterData({
        attributes: data.filterableAttributes,
        variants: data.variants,
        basePath,
      });
    } else {
      setFilterData(null);
    }

    return () => setFilterData(null);
  }, [data, basePath, setFilterData]);

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

      {category.description && (
        <p className="text-muted-foreground mb-6 max-w-3xl">
          {category.description}
        </p>
      )}

      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">
          Products are being added to this category. Check back soon!
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAggregatedFilterData } from "@/lib/api/catalog/use-categories";
import { useFilterContext } from "@/contexts/filter-context";
import { CategoryIcon } from "@/components/public/CategoryIcon";
import { getCategoryIconName } from "@/lib/utils/category-icon-map";
import type { CategoryTreeNode } from "@/lib/api/catalog/types";

interface BranchCategoryPageProps {
  category: CategoryTreeNode;
  pathNames: string[];
  pathSlugs: string[];
}

export function BranchCategoryPage({
  category,
  pathNames,
  pathSlugs,
}: BranchCategoryPageProps) {
  const lastSlug = pathSlugs[pathSlugs.length - 1];
  const basePath = `/products/${pathSlugs.join("/")}`;
  const { data, isLoading } = useAggregatedFilterData(lastSlug);
  const { setFilterData } = useFilterContext();

  const activeChildren = category.children.filter((c) => c.isActive);

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

      {/* Grid of child categories */}
      <div className="catalog-grid">
        {activeChildren.map((child) => (
          <Link
            key={child.id}
            href={`/products/${pathSlugs.join("/")}/${child.slug}`}
            className="catalog-grid__cell"
          >
            <div className="catalog-grid__icon">
              {child.imageUrl ? (
                <Image
                  src={child.imageUrl}
                  alt={child.name}
                  width={128}
                  height={128}
                  className="w-full h-full"
                />
              ) : (
                <CategoryIcon
                  iconName={getCategoryIconName(child.name)}
                  className="w-12 h-12 text-gray-600"
                  strokeWidth={1.5}
                />
              )}
            </div>
            <span className="catalog-grid__label">{child.name}</span>
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

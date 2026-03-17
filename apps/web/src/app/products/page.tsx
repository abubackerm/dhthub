"use client";

import Link from "next/link";
import { CategoryIcon } from "@/components/public/CategoryIcon";
import { useCategoryTree } from "@/lib/api/catalog";
import { getCategoryIconName } from "@/lib/utils/category-icon-map";

export default function ProductsPage() {
  const { data: categories = [], isLoading } = useCategoryTree();

  // Filter for top-level (root) categories that are active
  const topLevelCategories = categories.filter(
    (cat) => cat.depth === 0 && cat.isActive
  );

  if (isLoading) {
    return (
      <div className="catalog-page">
        {/* Breadcrumb */}
        <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/" className="catalog-breadcrumb__link">Home</Link>
          <span className="catalog-breadcrumb__sep" aria-hidden="true">
            &gt;
          </span>
          <span className="catalog-breadcrumb__current" aria-current="page">All Categories</span>
        </nav>

        {/* Loading state */}
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-muted-foreground">Loading categories...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-page">
      {/* Breadcrumb */}
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link href="/" className="catalog-breadcrumb__link">Home</Link>
        <span className="catalog-breadcrumb__sep" aria-hidden="true">
          &gt;
        </span>
        <span className="catalog-breadcrumb__current" aria-current="page">All Categories</span>
      </nav>

      {/* Each top-level category rendered as a section */}
      {topLevelCategories.map((category) => {
        const activeChildren = category.children.filter((c) => c.isActive);

        return (
          <div key={category.id} className="catalog-section">
            <h2 className="catalog-section__title">
              <Link href={`/products/${category.slug}`} className="catalog-section__title-link">
                {category.name}
              </Link>
            </h2>

            <div className="catalog-grid">
              {activeChildren.map((child) => (
                <Link
                  key={child.id}
                  href={`/products/${category.slug}/${child.slug}`}
                  className="catalog-grid__cell"
                >
                  <div className="catalog-grid__icon">
                    <CategoryIcon
                      iconName={getCategoryIconName(child.name)}
                      className="w-12 h-12 text-gray-600"
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="catalog-grid__label">{child.name}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {topLevelCategories.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            No categories available at this time.
          </p>
        </div>
      )}
    </div>
  );
}

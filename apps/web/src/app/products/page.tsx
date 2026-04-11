"use client";

import Link from "next/link";
import Image from "next/image";
import { CategoryIcon } from "@/components/public/CategoryIcon";
import { useCategoryTree } from "@/lib/api/catalog";
import { getCategoryIconName } from "@/lib/utils/category-icon-map";
import { useSearchParams, useRouter } from "next/navigation";

export default function ProductsPage() {
  const { data: categories = [], isLoading } = useCategoryTree();
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedCategorySlug = searchParams.get("category");

  // Filter for top-level (root) categories that are active, sorted A-Z
  const topLevelCategories = categories.filter(
    (cat) => cat.depth === 0 && cat.isActive
  ).sort((a, b) => a.name.localeCompare(b.name));

  // When a category is selected via sidebar, show only that category's children
  const displayCategories = selectedCategorySlug
    ? topLevelCategories.filter((cat) => cat.slug === selectedCategorySlug)
    : topLevelCategories;

  const selectedCategory = selectedCategorySlug
    ? topLevelCategories.find((cat) => cat.slug === selectedCategorySlug)
    : null;

  const clearSelection = () => {
    router.replace("/products");
  };

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
        {selectedCategory ? (
          <>
            <button
              onClick={clearSelection}
              className="catalog-breadcrumb__link hover:text-(--dht-red) cursor-pointer"
            >
              All Categories
            </button>
            <span className="catalog-breadcrumb__sep" aria-hidden="true">
              &gt;
            </span>
            <span className="catalog-breadcrumb__current" aria-current="page">{selectedCategory.name}</span>
          </>
        ) : (
          <span className="catalog-breadcrumb__current" aria-current="page">All Categories</span>
        )}
      </nav>

      {/* Category title when filtered */}
      {selectedCategory && (
        <div className="flex items-center justify-between mb-4">
          <h1 className="catalog-page__title">{selectedCategory.name}</h1>
          <button
            onClick={clearSelection}
            className="text-sm text-muted-foreground hover:text-(--dht-red) transition-colors cursor-pointer"
          >
            Show all categories
          </button>
        </div>
      )}

      {/* Each top-level category rendered as a section */}
      {displayCategories.map((category) => {
        const activeChildren = category.children.filter((c) => c.isActive);

        return (
          <div key={category.id} className="catalog-section">
            {/* Only show section heading when viewing all categories */}
            {!selectedCategory && (
              <h2 className="catalog-section__title">
                <Link href={`/products/${category.slug}`} className="catalog-section__title-link">
                  {category.name}
                </Link>
              </h2>
            )}

            <div className="catalog-grid">
              {activeChildren.map((child) => (
                <Link
                  key={child.id}
                  href={`/products/${category.slug}/${child.slug}`}
                  className="catalog-grid__cell"
                >
                  <div className="catalog-grid__icon">
                    {child.imageUrl ? (
                      <Image
                        src={child.imageUrl}
                        alt={child.name}
                        width={80}
                        height={80}
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
                  <div className="catalog-grid__text">
                    <span className="catalog-grid__label">{child.name}</span>
                    {child.description && (
                      <p className="catalog-grid__desc">{child.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {displayCategories.length === 0 && selectedCategory && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            Category not found.
          </p>
        </div>
      )}

      {topLevelCategories.length === 0 && !selectedCategory && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            No categories available at this time.
          </p>
        </div>
      )}
    </div>
  );
}

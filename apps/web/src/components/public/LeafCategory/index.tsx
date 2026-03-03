"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Category, mockProducts, mockAttributes } from "@/lib/mock-data";
import { FilterPanel } from "./FilterPanel";
import { ProductTable } from "./ProductTable";
import { useSearchParams } from "next/navigation";

interface LeafCategoryProps {
  category: Category;
  pathNames: string[];
  pathSlugs: string[];
}

export function LeafCategory({ category, pathNames, pathSlugs }: LeafCategoryProps) {
  const searchParams = useSearchParams();
  const basePath = `/products/${pathSlugs.join("/")}`;

  // Build breadcrumb items
  const breadcrumbItems = pathNames.map((name, index) => ({
    name,
    path: `/products/${pathSlugs.slice(0, index + 1).join("/")}`,
  }));

  // Get attributes for this category
  const attributes = useMemo(
    () => mockAttributes.filter((attr) => attr.categoryId === category.id),
    [category.id]
  );

  // Get all products for this category (PUBLISHED only for public view)
  const allProducts = useMemo(
    () => mockProducts.filter(
      (p) => p.categoryId === category.id && p.status === "PUBLISHED"
    ),
    [category.id]
  );

  // Apply filters from URL params
  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      for (const attr of attributes) {
        if (!attr.isFilterable) continue;

        if (attr.filterType === "RANGE") {
          const min = searchParams.get(`${attr.slug}_min`);
          const max = searchParams.get(`${attr.slug}_max`);
          const value = parseFloat(product.attributes[attr.slug]);

          if (min && !isNaN(value) && value < parseFloat(min)) return false;
          if (max && !isNaN(value) && value > parseFloat(max)) return false;
        } else if (attr.filterType === "CHECKBOX_LIST") {
          const selectedValues = searchParams.getAll(attr.slug);
          if (selectedValues.length > 0) {
            const productValue = product.attributes[attr.slug];
            if (!selectedValues.includes(productValue)) return false;
          }
        } else if (attr.filterType === "TOGGLE") {
          const toggleValue = searchParams.get(attr.slug);
          if (toggleValue === "true") {
            const productValue = product.attributes[attr.slug];
            if (productValue !== "true" && productValue !== "Yes" && productValue !== "1") {
              return false;
            }
          }
        }
      }
      return true;
    });
  }, [allProducts, attributes, searchParams]);

  return (
    <div className="catalog-page">
      {/* Breadcrumb */}
      <div className="catalog-breadcrumb">
        <Link href="/" className="catalog-breadcrumb__link">Home</Link>
        <span className="catalog-breadcrumb__sep">&gt;</span>
        <Link href="/products" className="catalog-breadcrumb__link">All Categories</Link>
        {breadcrumbItems.map((item, i) => (
          <span key={i}>
            <span className="catalog-breadcrumb__sep">&gt;</span>
            {i === breadcrumbItems.length - 1 ? (
              <span className="catalog-breadcrumb__current">{item.name}</span>
            ) : (
              <Link href={item.path} className="catalog-breadcrumb__link">{item.name}</Link>
            )}
          </span>
        ))}
      </div>

      {/* Category Title */}
      <h1 className="catalog-page__title">{category.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} available
      </p>

      {/* Main Content */}
      <div className="flex gap-8">
        {/* Filter Panel - Desktop */}
        <div className="hidden lg:block">
          <FilterPanel
            attributes={attributes}
            products={allProducts}
            basePath={basePath}
          />
        </div>

        {/* Product Table */}
        <div className="flex-1 min-w-0">
          {/* Mobile Filter */}
          <div className="lg:hidden mb-4">
            <FilterPanel
              attributes={attributes}
              products={allProducts}
              basePath={basePath}
            />
          </div>

          <ProductTable
            products={filteredProducts}
            attributes={attributes}
            basePath={basePath}
            totalProducts={filteredProducts.length}
          />
        </div>
      </div>
    </div>
  );
}


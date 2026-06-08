"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  name: string;
  path: string;
}

interface LeafCategoryBreadcrumbProps {
  pathNames: string[];
  pathSlugs: string[];
}

export function LeafCategoryBreadcrumb({
  pathNames,
  pathSlugs,
}: LeafCategoryBreadcrumbProps) {
  const breadcrumbItems = pathNames.map((name, index) => ({
    name,
    path: `/products/${pathSlugs.slice(0, index + 1).join("/")}`,
  }));

  return (
    <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
      <Link href="/" className="catalog-breadcrumb__link">Home</Link>
      <span className="catalog-breadcrumb__sep" aria-hidden="true">
        <ChevronRight className="w-4 h-4" />
      </span>
      <Link href="/products" className="catalog-breadcrumb__link">All Categories</Link>
      {breadcrumbItems.map((item, i) => (
        <span key={i}>
          <span className="catalog-breadcrumb__sep" aria-hidden="true">
            <ChevronRight className="w-4 h-4" />
          </span>
          {i === breadcrumbItems.length - 1 ? (
            <span className="catalog-breadcrumb__current" aria-current="page">{item.name}</span>
          ) : (
            <Link href={item.path} className="catalog-breadcrumb__link">{item.name}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

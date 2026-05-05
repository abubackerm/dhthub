import Link from "next/link";
import { getServerCategoryTree } from "@/lib/api/catalog";
import { ProductsClientContent } from "./products-client-content";
import type { CategoryTreeNode } from "@/lib/api/catalog/types";

export const revalidate = 120;

export default async function ProductsPage() {
  let categories: CategoryTreeNode[] = [];

  try {
    categories = await getServerCategoryTree({ maxDepth: 1 });
  } catch (error) {
    console.error("Failed to fetch category tree:", error);
  }

  if (categories.length === 0) {
    return (
      <div className="catalog-page">
        <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
          <Link href="/" className="catalog-breadcrumb__link">Home</Link>
          <span className="catalog-breadcrumb__sep" aria-hidden="true">
            &gt;
          </span>
          <span className="catalog-breadcrumb__current" aria-current="page">All Categories</span>
        </nav>
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            No categories available at this time.
          </p>
        </div>
      </div>
    );
  }

  return <ProductsClientContent categories={categories} />;
}

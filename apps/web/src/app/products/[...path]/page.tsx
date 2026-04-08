import { notFound } from "next/navigation";
import { getCategoryTree, getCellsByCategorySlug } from "@/lib/api/catalog";
import { getProductBySlug } from "@/lib/api/catalog/products";
import { LeafCategoryPage } from "@/components/public/LeafCategory";
import { ProductDetailPage } from "@/components/public/ProductDetail";
import { ConsolidatedLeafCategoryPage } from "@/components/public/LeafCategory/ConsolidatedLeafCategoryPage";
import { BranchCategoryPage } from "@/components/public/BranchCategoryPage";
import { EmptyLeafPage } from "@/components/public/EmptyLeafPage";
import type { Cell } from "@/lib/api/catalog";
import type { ProductDetailView } from "@/lib/api/catalog/types";

interface PageProps {
  params: Promise<{ path: string[] }>;
}

// Find category by slug in the category tree
function findCategoryBySlug(tree: any[], slug: string, currentPath: string[] = []): any | null {
  for (const category of tree) {
    if (category.slug === slug) {
      return category;
    }

    if (category.children && category.children.length > 0) {
      const found = findCategoryBySlug(category.children, slug, [...currentPath, category.name]);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

// Build path names from slugs
function buildPathNames(categories: any[], pathSlugs: string[]): string[] {
  const pathNames: string[] = [];
  for (const slug of pathSlugs) {
    const found = findCategoryBySlug(categories, slug);
    if (found) {
      pathNames.push(found.name);
    } else {
      pathNames.push(slug);
    }
  }
  return pathNames;
}

export default async function DynamicCategoryPage({ params }: PageProps) {
  const { path } = await params;

  // Fetch category tree server-side
  const categories = await getCategoryTree().catch(() => []);

  // Find the category by the last path segment
  const lastSlug = path[path.length - 1];
  const currentCategory = findCategoryBySlug(categories, lastSlug);

  // Build path names for breadcrumb
  const pathNames = buildPathNames(categories, path);

  // If not found as a category, try to find it as a product
  if (!currentCategory) {
    // Try to fetch as product by slug
    let product: ProductDetailView | null = null;
    try {
      product = await getProductBySlug(lastSlug);
    } catch (error) {
      // Product not found, will fall through to 404
    }

    if (product) {
      // Get the category path (all segments except the last one which is the product slug)
      const categoryPath = path.slice(0, -1);
      const categorySlug = categoryPath[categoryPath.length - 1];
      const parentCategory = categorySlug ? findCategoryBySlug(categories, categorySlug) : null;

      // Build path names without the product slug
      const categoryPathNames = buildPathNames(categories, categoryPath);

      return (
        <ProductDetailPage
          product={product}
          category={parentCategory}
          pathNames={categoryPathNames}
          pathSlugs={categoryPath}
        />
      );
    }

    // Neither category nor product found
    notFound();
  }

  // If it's a branch category (has children), show them in a grid
  // But first check if all children are leaf categories (no grandchildren)
  if (currentCategory.children && currentCategory.children.length > 0) {
    // Check if all children are leaf categories (none have children)
    const allChildrenAreLeaves = currentCategory.children.every((child: any) => {
      return !child.children || child.children.length === 0;
    });

    if (allChildrenAreLeaves) {
      // Render consolidated leaf page showing all leaf categories together
      return (
        <ConsolidatedLeafCategoryPage
          categorySlug={lastSlug}
          pathNames={pathNames}
          pathSlugs={path}
        />
      );
    }

    // Traditional branch page with subcategory links
    return (
      <BranchCategoryPage
        category={currentCategory}
        pathNames={pathNames}
        pathSlugs={path}
      />
    );
  }

  // If it's a leaf category (no children), fetch cells and render the leaf page
  const cells: Cell[] = await getCellsByCategorySlug(lastSlug || '').catch(() => []);

  // If there are no cells yet, show a placeholder message
  if (cells.length === 0) {
    return (
      <EmptyLeafPage
        category={currentCategory}
        pathNames={pathNames}
        pathSlugs={path}
      />
    );
  }

  // Render the leaf category page with cells
  return (
    <LeafCategoryPage
      categorySlug={lastSlug}
      pathNames={pathNames}
      pathSlugs={path}
    />
  );
}

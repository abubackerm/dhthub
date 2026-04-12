import { notFound } from "next/navigation";
import { getServerCategoryBySlugLookup, getServerCategoryTree } from "@/lib/api/catalog";
import { getCellsByCategorySlug } from "@/lib/api/catalog";
import { getServerProductBySlug } from "@/lib/api/catalog/products";
import { LeafCategoryPage } from "@/components/public/LeafCategory";
import { ProductDetailPage } from "@/components/public/ProductDetail";
import { ConsolidatedLeafCategoryPage } from "@/components/public/LeafCategory/ConsolidatedLeafCategoryPage";
import { BranchCategoryPage } from "@/components/public/BranchCategoryPage";
import { EmptyLeafPage } from "@/components/public/EmptyLeafPage";
import type { Cell } from "@/lib/api/catalog";
import type { ProductDetailView } from "@/lib/api/catalog/types";

export const revalidate = 120;

interface PageProps {
  params: Promise<{ path: string[] }>;
}

export default async function DynamicCategoryPage({ params }: PageProps) {
  const { path } = await params;

  const lastSlug = path[path.length - 1];

  let currentCategory: Awaited<ReturnType<typeof getServerCategoryBySlugLookup>> | null = null;
  try {
    currentCategory = await getServerCategoryBySlugLookup(lastSlug);
  } catch {
    // Category not found via lookup, will try product below
  }

  const pathNames: string[] = currentCategory
    ? [...currentCategory.ancestors.map((a) => a.name), currentCategory.category.name]
    : path.map((s) => s);

  if (!currentCategory) {
    let product: ProductDetailView | null = null;
    try {
      product = await getServerProductBySlug(lastSlug);
    } catch {
      // Product not found, will fall through to 404
    }

    if (product) {
      const categoryPath = path.slice(0, -1);
      const categorySlug = categoryPath[categoryPath.length - 1];

      let parentCategory: Awaited<ReturnType<typeof getServerCategoryBySlugLookup>> | null = null;
      if (categorySlug) {
        try {
          parentCategory = await getServerCategoryBySlugLookup(categorySlug);
        } catch {
          // Parent category not found
        }
      }

      const categoryPathNames = parentCategory
        ? [...parentCategory.ancestors.map((a) => a.name), parentCategory.category.name]
        : categoryPath;

      return (
        <ProductDetailPage
          product={product}
          category={parentCategory?.category ?? null}
          pathNames={categoryPathNames}
          pathSlugs={categoryPath}
        />
      );
    }

    notFound();
  }

  const categoryData = currentCategory;

  if (categoryData.hasChildren) {
    const categories = await getServerCategoryTree().catch(() => []);

    function findCategoryBySlug(tree: any[], slug: string): any | null {
      for (const category of tree) {
        if (category.slug === slug) return category;
        if (category.children?.length > 0) {
          const found = findCategoryBySlug(category.children, slug);
          if (found) return found;
        }
      }
      return null;
    }

    const fullCategory = findCategoryBySlug(categories, lastSlug);
    const allChildrenAreLeaves = fullCategory?.children?.every(
      (child: any) => !child.children || child.children.length === 0,
    ) ?? false;

    if (allChildrenAreLeaves) {
      return (
        <ConsolidatedLeafCategoryPage
          categorySlug={lastSlug}
          pathNames={pathNames}
          pathSlugs={path}
        />
      );
    }

    return (
      <BranchCategoryPage
        category={fullCategory ?? categoryData.category}
        pathNames={pathNames}
        pathSlugs={path}
      />
    );
  }

  const cells: Cell[] = await getCellsByCategorySlug(lastSlug || '').catch(() => []);

  if (cells.length === 0) {
    return (
      <EmptyLeafPage
        category={categoryData.category}
        pathNames={pathNames}
        pathSlugs={path}
      />
    );
  }

  return (
    <LeafCategoryPage
      categorySlug={lastSlug}
      pathNames={pathNames}
      pathSlugs={path}
    />
  );
}

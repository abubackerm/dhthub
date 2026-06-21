import { notFound } from "next/navigation";
import { getServerCategoryBySlugLookup, getServerCategoryTree } from "@/lib/api/catalog";
import { getCellsByCategorySlug } from "@/lib/api/catalog";
import { getServerProductBySlug } from "@/lib/api/catalog/products";
import {
  getServerLeafPageData,
  getServerConsolidatedLeafData,
  getServerAggregatedFilterData,
} from "@/lib/api/catalog/categories";
import { getServerSimpleProductsBySlug, getServerSimpleProductBySlug } from "@/lib/api/catalog/simple-products";
import { LeafCategoryPage } from "@/components/public/LeafCategory";
import { ProductDetailPage } from "@/components/public/ProductDetail";
import { ConsolidatedLeafCategoryPage } from "@/components/public/LeafCategory/ConsolidatedLeafCategoryPage";
import { BranchCategoryPage } from "@/components/public/BranchCategoryPage";
import { EmptyLeafPage } from "@/components/public/EmptyLeafPage";
import { SimpleProductGridPage } from "@/components/public/SimpleProduct/SimpleProductGridPage";
import { SimpleProductDetailPage } from "@/components/public/SimpleProduct/SimpleProductDetailPage";
import type { Cell } from "@/lib/api/catalog";
import type { ProductDetailView } from "@/lib/api/catalog/types";

// Product detail pages - more frequent revalidation (60s)
// Category pages - standard revalidation (120s)
export const revalidate = 60;

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
    // Build category path from all but the last slug (which is the product slug)
    const buildCategoryInfo = (slugs: string[]) => {
      const categoryPath = slugs.slice(0, -1);
      const categorySlug = categoryPath[categoryPath.length - 1];
      return { categoryPath, categorySlug };
    };

    // 1. Try simple product detail page first (handles simple products with attributes)
    try {
      const simpleProduct = await getServerSimpleProductBySlug(lastSlug);
      const { categoryPath, categorySlug } = buildCategoryInfo(path);

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
        <SimpleProductDetailPage
          product={simpleProduct}
          pathNames={categoryPathNames}
          pathSlugs={categoryPath}
        />
      );
    } catch {
      // Not found via simple product API, try regular product API below
    }

    // 2. Try regular product detail (variable products or legacy simple products)
    let product: ProductDetailView | null = null;
    try {
      product = await getServerProductBySlug(lastSlug);
    } catch {
      // Product not found
    }

    if (product) {
      const { categoryPath, categorySlug } = buildCategoryInfo(path);

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
      const [consolidatedData, filterData] = await Promise.all([
        getServerConsolidatedLeafData(lastSlug).catch(() => null),
        getServerAggregatedFilterData(lastSlug).catch(() => null),
      ]);

      return (
        <ConsolidatedLeafCategoryPage
          categorySlug={lastSlug}
          pathNames={pathNames}
          pathSlugs={path}
          serverData={consolidatedData}
          serverFilterData={filterData}
        />
      );
    }

    // Fetch filter data for branch category page
    const filterData = await getServerAggregatedFilterData(lastSlug).catch(() => null);

    return (
      <BranchCategoryPage
        category={fullCategory ?? categoryData.category}
        pathNames={pathNames}
        pathSlugs={path}
        serverFilterData={filterData}
      />
    );
  }

  // SIMPLE_GRID mode: render simple products grid instead of cell-based leaf page
  if (categoryData.category.displayMode === 'SIMPLE_GRID') {
    const products = await getServerSimpleProductsBySlug(lastSlug).catch(() => []);
    return (
      <SimpleProductGridPage
        categorySlug={lastSlug}
        pathNames={pathNames}
        pathSlugs={path}
        serverData={products}
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

  const [leafData, filterData] = await Promise.all([
    getServerLeafPageData(lastSlug).catch(() => null),
    getServerAggregatedFilterData(lastSlug).catch(() => null),
  ]);

  return (
    <LeafCategoryPage
      categorySlug={lastSlug}
      pathNames={pathNames}
      pathSlugs={path}
      serverData={leafData}
      serverFilterData={filterData}
    />
  );
}

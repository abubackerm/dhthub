import { notFound } from "next/navigation";
import { mockCategories, mockProducts, Category, Product } from "@/lib/mock-data";
import { BranchCategory } from "@/components/public/BranchCategory";
import { LeafCategory } from "@/components/public/LeafCategory";
import { ProductDetail } from "@/components/public/ProductDetail";

interface PageProps {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Helper to build path arrays for all categories
function buildCategoryPaths(categories: Category[], parentSlugs: string[] = [], parentNames: string[] = []): Map<string, { slugs: string[]; names: string[]; category: Category }> {
  const pathMap = new Map<string, { slugs: string[]; names: string[]; category: Category }>();

  function traverse(items: Category[], currentSlugs: string[], currentNames: string[]) {
    for (const item of items) {
      const slugs = [...currentSlugs, item.slug];
      const names = [...currentNames, item.name];
      
      pathMap.set(item.id, { slugs, names, category: item });
      
      if (item.children.length > 0) {
        traverse(item.children, slugs, names);
      }
    }
  }

  traverse(categories, parentSlugs, parentNames);
  return pathMap;
}

// Find category by path slugs
function findCategoryByPath(pathSlugs: string[]): { category: Category; pathNames: string[] } | null {
  const pathMap = buildCategoryPaths(mockCategories);
  
  for (const [, data] of pathMap) {
    if (JSON.stringify(data.slugs) === JSON.stringify(pathSlugs)) {
      return { category: data.category, pathNames: data.names };
    }
  }
  
  return null;
}

// Find product by SKU
function findProductBySku(sku: string): Product | null {
  return mockProducts.find((p) => p.sku === sku && p.status === "PUBLISHED") || null;
}

export default async function DynamicProductPage({ params, searchParams }: PageProps) {
  const { path } = await params;
  void searchParams;

  // Try to find category by full path
  const categoryMatch = findCategoryByPath(path);

  if (categoryMatch) {
    const { category, pathNames } = categoryMatch;

    if (category.type === "BRANCH") {
      return (
        <BranchCategory
          category={category}
          pathNames={pathNames}
          pathSlugs={path}
        />
      );
    }

    if (category.type === "LEAF") {
      return (
        <LeafCategory
          category={category}
          pathNames={pathNames}
          pathSlugs={path}
        />
      );
    }
  }

  // Try to match as product detail: /category/path/sku
  // Take all but last segment as category path
  const categoryPath = path.slice(0, -1);
  const potentialSku = path[path.length - 1];

  if (categoryPath.length > 0 && potentialSku) {
    const parentCategory = findCategoryByPath(categoryPath);
    const product = findProductBySku(potentialSku);

    if (parentCategory && product && product.categoryId === parentCategory.category.id) {
      return (
        <ProductDetail
          product={product}
          category={parentCategory.category}
          pathNames={parentCategory.pathNames}
          pathSlugs={categoryPath}
        />
      );
    }
  }

  // No match found - 404
  notFound();
}

// Generate static params for common routes
export function generateStaticParams() {
  const paths: { path: string[] }[] = [];

  // Add top-level categories
  for (const category of mockCategories) {
    if (category.isActive) {
      paths.push({ path: [category.slug] });
      
      // Add depth-1 children
      for (const child of category.children) {
        if (child.isActive) {
          paths.push({ path: [category.slug, child.slug] });
        }
      }
    }
  }

  return paths;
}

export const metadata = {
  title: "Products - DHT Hub",
  description: "Browse our product catalog",
};

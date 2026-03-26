"use client";

import { useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLeafPageData } from "@/lib/api/catalog/use-categories";
import { useFilterContext } from "@/contexts/filter-context";
import type {
  LeafPageView,
  LeafCellView,
  LeafProductView,
  LeafFilterableAttributeView,
  LeafVariantView,
  LeafAttributeValueView,
} from "@/lib/api/catalog/types";
import { CellProductTable } from "./CellProductTable";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileFilterToggle } from "./MobileFilterToggle";

import { ChevronRight } from "lucide-react";

export { ConsolidatedLeafCategoryPage } from "./ConsolidatedLeafCategoryPage";

interface LeafCategoryPageProps {
  categorySlug: string;
  pathNames: string[];
  pathSlugs: string[];
}

export function LeafCategoryPage({ categorySlug, pathNames, pathSlugs }: LeafCategoryPageProps) {
  const { data, isLoading, error } = useLeafPageData(categorySlug);
  const searchParams = useSearchParams();
  const basePath = `/products/${pathSlugs.join("/")}`;
  const { setFilterData } = useFilterContext();

  const breadcrumbItems = pathNames.map((name, index) => ({
    name,
    path: `/products/${pathSlugs.slice(0, index + 1).join("/")}`,
  }));

  const allVariants = useMemo(() => {
    if (!data) return [];
    const variants: Array<LeafVariantView & { productId: string; productName: string; productSlug: string; cellId: string; cellName: string }> = [];
    data.cells.forEach((cell) => {
      cell.products.forEach((product) => {
        product.variants.forEach((variant) => {
          variants.push({
            ...variant,
            productId: product.id,
            productName: product.name,
            productSlug: product.slug,
            cellId: cell.id,
            cellName: cell.name,
          });
        });
      });
    });
    return variants;
  }, [data]);

  // Set filter data in context when data is loaded
  useEffect(() => {
    if (data && data.filterableAttributes.length > 0) {
      setFilterData({
        attributes: data.filterableAttributes,
        variants: allVariants,
        basePath,
      });
    } else {
      setFilterData(null);
    }

    // Cleanup when unmounting
    return () => setFilterData(null);
  }, [data, allVariants, basePath, setFilterData]);

  const totalVariantCount = useMemo(() => {
    if (!data) return 0;
    const variantCount = allVariants.length;
    if (variantCount > 0) return variantCount;
    const productCount = data.cells.reduce((sum, c) => sum + c.products.length, 0);
    return productCount;
  }, [data, allVariants]);

  const filteredCells = useMemo(() => {
    if (!data) return [];
    const cells = data.cells;
    const hasActiveFilters = Array.from(searchParams.keys()).length > 0;
    if (!hasActiveFilters) return cells;
    return cells.map((cell) => ({
      ...cell,
      products: cell.products.map((product) => ({
        ...product,
        _hadVariants: product.variants.length > 0,
        variants: product.variants.filter((variant) => {
          return data.filterableAttributes.every((attr) => {
            const attrValue = getAttributeValue(variant.attributeValues, attr.id);
            if (attrValue === null) return true;
            if (attr.filterType === "RANGE") {
              const min = searchParams.get(`${attr.slug}_min`);
              const max = searchParams.get(`${attr.slug}_max`);
              const numValue = typeof attrValue === "number" ? attrValue : parseFloat(String(attrValue));
              if (min && !isNaN(numValue) && numValue < parseFloat(min)) return false;
              if (max && !isNaN(numValue) && numValue > parseFloat(max)) return false;
            } else if (attr.filterType === "CHECKBOX") {
              const selectedValues = searchParams.getAll(attr.slug);
              if (selectedValues.length > 0) {
                const strValue = String(attrValue);
                if (!selectedValues.includes(strValue)) return false;
              }
            }
            return true;
          });
        }),
      })).filter((product) => product.variants.length > 0 || !product._hadVariants),
    })).filter((cell) => cell.products.length > 0);
  }, [data, searchParams]);

  if (isLoading) {
    return <LeafCategoryPageSkeleton />;
  }
  if (error || !data) {
    return (
      <div className="catalog-page">
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">
            Unable to load category data. Please try again later.
          </p>
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

      {/* h1: Leaf Category Title */}
      <h1 className="catalog-page__title">{data.category.name}</h1>
      {data.category.description && (
        <p className="text-muted-foreground mb-6 max-w-3xl">{data.category.description}</p>
      )}
      <p className="text-sm text-gray-500 mb-6">
        {totalVariantCount} item{totalVariantCount !== 1 ? "s" : ""} available
      </p>

      {/* Mobile Filter */}
      {data.filterableAttributes.length > 0 && (
        <div className="lg:hidden mb-4">
          <MobileFilterToggle
            attributes={data.filterableAttributes}
            variants={allVariants}
            basePath={basePath}
          />
        </div>
      )}

      {/* Main Content: cells > products > table */}
      <div>
        {filteredCells.length === 0 && (
          <div className="text-center py-16 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">No items match your filters.</p>
            <Link href={basePath} className="text-(--dht-red) hover:underline mt-2 inline-block">
              Clear all filters
            </Link>
          </div>
        )}

        {filteredCells.map((cell) => (
          <CellSection
            key={cell.id}
            cell={cell}
            basePath={basePath}
            filterableAttributes={data.filterableAttributes}
          />
        ))}
      </div>
    </div>
  );
}

function CellSection({
  cell,
  basePath,
  filterableAttributes,
}: {
  cell: LeafCellView;
  basePath: string;
  filterableAttributes: LeafFilterableAttributeView[];
}) {
  const variantCount = cell.products.reduce((sum, p) => sum + p.variants.length, 0);
  const hasProducts = cell.products.length > 0;
  if (variantCount === 0 && !hasProducts) return null;

  return (
    <div className="cell-section">
      {/* h2: Cell name */}
      <h2 className="text-xl font-semibold text-foreground mb-4">{cell.name}</h2>
      {cell.description && (
        <p className="text-sm text-muted-foreground mb-4">{cell.description}</p>
      )}

      {/* Products under this cell */}
      {cell.products.map((product) => (
        <ProductSection
          key={product.id}
          product={product}
          filterableAttributes={filterableAttributes}
          basePath={basePath}
        />
      ))}
    </div>
  );
}

function ProductSection({
  product,
  filterableAttributes,
  basePath,
}: {
  product: LeafProductView;
  filterableAttributes: LeafFilterableAttributeView[];
  basePath: string;
}) {
  if (product.variants.length === 0) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-medium text-foreground mb-2">
          <Link
            href={`${basePath}/${product.slug}`}
            className="hover:text-(--dht-red) transition-colors"
          >
            {product.name}
          </Link>
        </h2>
        {product.description && (
          <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* h2: Product name */}
      <h2 className="text-lg font-medium text-foreground mb-2">
        <Link
          href={`${basePath}/${product.slug}`}
          className="hover:text-(--dht-red) transition-colors"
        >
          {product.name}
        </Link>
      </h2>
      {product.description && (
        <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
      )}

      <CellProductTable
        products={[product]}
        filterableAttributes={filterableAttributes}
        basePath={basePath}
      />
    </div>
  );
}

function getAttributeValue(
  attributeValues: LeafAttributeValueView[],
  attributeId: string
): string | number | boolean | null {
  const av = attributeValues.find((v) => v.attributeId === attributeId);
  if (!av) return null;

  switch (av.dataType) {
    case "number":
      return av.numberValue;
    case "text":
      return av.textValue;
    case "enum":
      return av.optionValue;
    case "boolean":
      return av.booleanValue;
    default:
      return null;
  }
}

function LeafCategoryPageSkeleton() {
  return (
    <div className="catalog-page">
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-32 ml-2" />
      </nav>
      <Skeleton className="h-8 w-64 mt-4" />
      <Skeleton className="h-4 w-48 mt-2" />
      <div className="mt-6">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-6 w-36 mb-2" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

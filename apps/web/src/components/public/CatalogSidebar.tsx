"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCategoryTree } from "@/lib/api/catalog/use-categories";
import { useFilterContext } from "@/contexts/filter-context";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useCallback, useMemo } from "react";
import type { CategoryTreeNode } from "@/lib/api/catalog/types";
import type {
  LeafFilterableAttributeView,
  LeafVariantView,
} from "@/lib/api/catalog/types";

export function CatalogSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { filterData } = useFilterContext();
    const { data: categoryTree, isLoading, error } = useCategoryTree();

    const selectedCategory = searchParams.get("category");

    // Show categories on /products, filters on all other pages
    const showCategories = pathname === "/products";

    if (!showCategories) {
        // Show filters on nested pages
        if (!filterData || filterData.attributes.length === 0) {
            return null;
        }
        return (
            <aside className="catalog-sidebar">
                <FilterPanelContent
                    attributes={filterData.attributes}
                    variants={filterData.variants}
                    basePath={filterData.basePath}
                />
            </aside>
        );
    }

    // Show categories on /products, sorted A-Z
    const topLevelCategories = (categoryTree?.filter(
        (cat: CategoryTreeNode) => cat.depth === 0 && cat.children.length > 0 && cat.isActive
    ) ?? []).sort((a, b) => a.name.localeCompare(b.name));

    const handleCategoryClick = (slug: string) => {
        if (selectedCategory === slug) {
            router.replace("/products");
        } else {
            router.replace(`/products?category=${slug}`);
        }
    };

    return (
        <aside className="catalog-sidebar">
            <div className="bg-(--dht-red) py-2 px-1 mb-3 rounded">
                <h2 className="text-xs font-semibold text-white uppercase tracking-wide text-center">All Categories</h2>
            </div>
            <nav>
                <ul className="catalog-sidebar__list">
                    {isLoading ? (
                        <li className="catalog-sidebar__link">Loading...</li>
                    ) : error ? (
                        <li className="catalog-sidebar__link">Error loading categories</li>
                    ) : topLevelCategories.length === 0 ? (
                        <li className="catalog-sidebar__link">No categories available</li>
                    ) : (
                        topLevelCategories.map((category) => {
                            const isActive = selectedCategory === category.slug;

                            return (
                                <li key={category.id}>
                                    <button
                                        onClick={() => handleCategoryClick(category.slug)}
                                        className={`catalog-sidebar__link w-full text-left cursor-pointer ${isActive ? "catalog-sidebar__link--active" : ""}`}
                                    >
                                        {category.name}
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>
            </nav>
        </aside>
    );
}

// Simplified FilterPanel component for sidebar use
function FilterPanelContent({
  attributes,
  variants,
  basePath,
}: {
  attributes: LeafFilterableAttributeView[];
  variants: Array<
    LeafVariantView & {
      productId: string;
      productName: string;
      productSlug: string;
      cellId: string;
      cellName: string;
    }
  >;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse current filters from URL
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; value: string }[] = [];

    attributes.forEach((attr) => {
      if (attr.filterType === "RANGE") {
        const min = searchParams.get(`${attr.slug}_min`);
        const max = searchParams.get(`${attr.slug}_max`);
        if (min) {
          filters.push({ key: `${attr.slug}_min`, label: `${attr.name} Min`, value: min });
        }
        if (max) {
          filters.push({ key: `${attr.slug}_max`, label: `${attr.name} Max`, value: max });
        }
      } else if (attr.filterType === "CHECKBOX" || attr.filterType === "SELECT") {
        const values = searchParams.getAll(attr.slug);
        values.forEach((v) => {
          const option = attr.options.find((o) => o.value === v);
          filters.push({ key: attr.slug, label: attr.name, value: option?.label || v });
        });
      }
    });

    return filters;
  }, [searchParams, attributes]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  // Get value counts for checkbox filters
  const getValueCounts = useCallback(
    (attr: LeafFilterableAttributeView) => {
      const counts: Record<string, number> = {};
      variants.forEach((variant) => {
        const av = variant.attributeValues.find((v) => v.attributeId === attr.id);
        if (av) {
          let value: string | null = null;
          if (av.dataType === "enum" && av.optionValue) {
            value = av.optionValue;
          } else if (av.dataType === "text" && av.textValue) {
            value = av.textValue;
          } else if (av.dataType === "boolean") {
            value = av.booleanValue ? "true" : "false";
          } else if (av.dataType === "number" && av.numberValue !== null) {
            value = String(av.numberValue);
          }
          if (value) {
            counts[value] = (counts[value] || 0) + 1;
          }
        }
      });
      return counts;
    },
    [variants]
  );

  // Get min/max for range filters
  const getRangeBounds = useCallback(
    (attr: LeafFilterableAttributeView) => {
      const values = variants
        .map((v) => {
          const av = v.attributeValues.find((av) => av.attributeId === attr.id);
          return av?.numberValue;
        })
        .filter((v): v is number => v !== null && !isNaN(v));

      if (values.length === 0) return { min: 0, max: 100 };

      return {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    },
    [variants]
  );

  const filterableAttributes = attributes.filter(
    (attr) => attr.filterType === "RANGE" || attr.filterType === "CHECKBOX" || attr.filterType === "SELECT"
  );

  if (filterableAttributes.length === 0) {
    return null;
  }

  return (
    <div className="sidebar-filter">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground text-sm">Filters</h3>
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b">
          {activeFilters.map((filter, index) => (
            <Badge
              key={`${filter.key}-${filter.value}-${index}`}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
            >
              <span className="text-xs">
                {filter.label}: {filter.value}
              </span>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  if (filter.key.endsWith("_min") || filter.key.endsWith("_max")) {
                    params.delete(filter.key);
                  } else {
                    const existing = params.getAll(filter.key);
                    params.delete(filter.key);
                    existing.forEach((v) => {
                      if (v !== filter.value) params.append(filter.key, v);
                    });
                  }
                  const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;
                  router.push(newUrl);
                }}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Filter Accordion */}
      <Accordion type="multiple" className="w-full" defaultValue={filterableAttributes.map((a) => a.slug)}>
        {filterableAttributes.map((attr) => (
          <AccordionItem key={attr.id} value={attr.slug} className="border-b last:border-b-0">
            <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
              <span>
                {attr.name}
                {attr.unitSymbol && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({attr.unitSymbol})
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              {attr.filterType === "RANGE" && (
                <RangeFilter
                  attr={attr}
                  bounds={getRangeBounds(attr)}
                  searchParams={searchParams}
                  basePath={basePath}
                  router={router}
                />
              )}
              {(attr.filterType === "CHECKBOX" || attr.filterType === "SELECT") && (
                <CheckboxFilter
                  attr={attr}
                  valueCounts={getValueCounts(attr)}
                  searchParams={searchParams}
                  basePath={basePath}
                  router={router}
                />
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// Range Filter Component
function RangeFilter({
  attr,
  bounds,
  searchParams,
  basePath,
  router,
}: {
  attr: LeafFilterableAttributeView;
  bounds: { min: number; max: number };
  searchParams: URLSearchParams;
  basePath: string;
  router: ReturnType<typeof useRouter>;
}) {
  const currentMin = searchParams.get(`${attr.slug}_min`) || "";
  const currentMax = searchParams.get(`${attr.slug}_max`) || "";

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Min</Label>
          <Input
            type="number"
            placeholder={bounds.min.toFixed(2)}
            value={currentMin}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              if (e.target.value) {
                params.set(`${attr.slug}_min`, e.target.value);
              } else {
                params.delete(`${attr.slug}_min`);
              }
              const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;
              router.push(newUrl);
            }}
            className="h-8 text-sm mt-1"
            step="any"
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Max</Label>
          <Input
            type="number"
            placeholder={bounds.max.toFixed(2)}
            value={currentMax}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              if (e.target.value) {
                params.set(`${attr.slug}_max`, e.target.value);
              } else {
                params.delete(`${attr.slug}_max`);
              }
              const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;
              router.push(newUrl);
            }}
            className="h-8 text-sm mt-1"
            step="any"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Range: {bounds.min.toFixed(2)} - {bounds.max.toFixed(2)} {attr.unitSymbol}
      </p>
    </div>
  );
}

// Checkbox Filter Component
function CheckboxFilter({
  attr,
  valueCounts,
  searchParams,
  basePath,
  router,
}: {
  attr: LeafFilterableAttributeView;
  valueCounts: Record<string, number>;
  searchParams: URLSearchParams;
  basePath: string;
  router: ReturnType<typeof useRouter>;
}) {
  const selectedValues = searchParams.getAll(attr.slug);

  const toggleValue = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(attr.slug);
    params.delete(attr.slug);

    if (current.includes(value)) {
      current.filter((v) => v !== value).forEach((v) => params.append(attr.slug, v));
    } else {
      [...current, value].forEach((v) => params.append(attr.slug, v));
    }

    const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;
    router.push(newUrl);
  };

  const options = attr.options.length > 0 ? attr.options : Object.keys(valueCounts).map((v) => ({ id: v, label: v, value: v }));

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {options.map((option) => (
        <label
          key={option.id}
          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors"
        >
          <Checkbox
            checked={selectedValues.includes(option.value)}
            onCheckedChange={() => toggleValue(option.value)}
            className="data-[state=checked]:bg-(--dht-red) data-[state=checked]:border-(--dht-red)"
          />
          <span className="text-sm flex-1">{option.label}</span>
          <Badge variant="outline" className="text-xs font-normal">
            {valueCounts[option.value] || 0}
          </Badge>
        </label>
      ))}
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X, SlidersHorizontal } from "lucide-react";
import type {
  LeafFilterableAttributeView,
  LeafVariantView,
  LeafAttributeValueView,
} from "@/lib/api/catalog/types";

interface FilterPanelProps {
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
}

interface FilterValue {
  key: string;
  label: string;
  value: string;
}

export function FilterPanel({ attributes, variants, basePath }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse current filters from URL
  const activeFilters = useMemo(() => {
    const filters: FilterValue[] = [];

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

  // Update URL with new filter params
  const updateFilters = useCallback(
    (updates: { key: string; value: string | null; action: "set" | "delete" | "deleteAll" }[]) => {
      const params = new URLSearchParams(searchParams.toString());

      updates.forEach(({ key, value, action }) => {
        if (action === "deleteAll") {
          // Delete all params starting with this key
          Array.from(params.keys())
            .filter((k) => k === key || k.startsWith(`${key}_`))
            .forEach((k) => params.delete(k));
        } else if (action === "delete") {
          // For multi-value params, remove just this value
          const existing = params.getAll(key);
          params.delete(key);
          existing.forEach((v) => {
            if (v !== value) params.append(key, v);
          });
        } else if (value !== null) {
          // For multi-value params, append
          const existing = params.getAll(key);
          params.delete(key);
          if (existing.length > 0 && !existing.includes(value)) {
            [...existing, value].forEach((v) => params.append(key, v));
          } else {
            params.set(key, value);
          }
        }
      });

      const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;
      router.push(newUrl);
    },
    [router, searchParams, basePath]
  );

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

  // Check if there are any filterable attributes
  const filterableAttributes = attributes.filter(
    (attr) => attr.filterType === "RANGE" || attr.filterType === "CHECKBOX" || attr.filterType === "SELECT"
  );

  if (filterableAttributes.length === 0) {
    return null;
  }

  return (
    <div className="w-full lg:w-[260px] shrink-0">
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden mb-4">
        <Button variant="outline" className="w-full justify-start gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilters.length > 0 && (
            <Badge className="ml-auto bg-(--dht-red)">{activeFilters.length}</Badge>
          )}
        </Button>
      </div>

      <div className="bg-card border rounded-lg p-4 sticky top-4 hidden lg:block">
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
                  onClick={() =>
                    updateFilters([
                      { key: filter.key, value: filter.value, action: "delete" },
                    ])
                  }
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
                {/* Range Filter */}
                {attr.filterType === "RANGE" && (
                  <RangeFilter
                    attr={attr}
                    bounds={getRangeBounds(attr)}
                    searchParams={searchParams}
                    basePath={basePath}
                    router={router}
                  />
                )}

                {/* Checkbox Filter */}
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

  // Use options from the attribute if available, otherwise use value counts keys
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

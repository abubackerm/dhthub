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
import { Attribute, Product } from "@/lib/mock-data";

interface FilterPanelProps {
  attributes: Attribute[];
  products: Product[];
  basePath: string;
}

interface FilterValue {
  key: string;
  label: string;
  value: string;
}

export function FilterPanel({ attributes, products, basePath }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get filterable attributes
  const filterableAttributes = useMemo(
    () => attributes.filter((attr) => attr.isFilterable),
    [attributes]
  );

  // Parse current filters from URL
  const activeFilters = useMemo(() => {
    const filters: FilterValue[] = [];
    
    filterableAttributes.forEach((attr) => {
      if (attr.filterType === "RANGE") {
        const min = searchParams.get(`${attr.slug}_min`);
        const max = searchParams.get(`${attr.slug}_max`);
        if (min) {
          filters.push({ key: `${attr.slug}_min`, label: `${attr.name} Min`, value: min });
        }
        if (max) {
          filters.push({ key: `${attr.slug}_max`, label: `${attr.name} Max`, value: max });
        }
      } else if (attr.filterType === "TOGGLE") {
        const value = searchParams.get(attr.slug);
        if (value === "true") {
          filters.push({ key: attr.slug, label: attr.name, value: "Yes" });
        }
      } else if (attr.filterType === "CHECKBOX_LIST") {
        const values = searchParams.getAll(attr.slug);
        values.forEach((v) => {
          filters.push({ key: attr.slug, label: attr.name, value: v });
        });
      }
    });

    return filters;
  }, [searchParams, filterableAttributes]);

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
          if (params.has(key)) {
            params.append(key, value);
          } else {
            params.set(key, value);
          }
        }
      });

      router.push(`${basePath}?${params.toString()}`);
    },
    [router, searchParams, basePath]
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    router.push(basePath);
  }, [router, basePath]);

  // Get value counts for checkbox filters
  const getValueCounts = useCallback(
    (attr: Attribute) => {
      const counts: Record<string, number> = {};
      products.forEach((product) => {
        const value = product.attributes[attr.slug];
        if (value) {
          counts[value] = (counts[value] || 0) + 1;
        }
      });
      return counts;
    },
    [products]
  );

  // Get min/max for range filters
  const getRangeBounds = useCallback(
    (attr: Attribute) => {
      const values = products
        .map((p) => parseFloat(p.attributes[attr.slug]))
        .filter((v) => !isNaN(v));
      
      if (values.length === 0) return { min: 0, max: 100 };
      
      return {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    },
    [products]
  );

  return (
    <div className="w-full lg:w-[260px] shrink-0">
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden mb-4">
        <Button variant="outline" className="w-full justify-start gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilters.length > 0 && (
            <Badge className="ml-auto bg-[--dht-red]">{activeFilters.length}</Badge>
          )}
        </Button>
      </div>

      <div className="bg-card border rounded-lg p-4 sticky top-4 hidden lg:block">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Filters</h3>
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
            {activeFilters.map((filter, index) => (
              <Badge
                key={`${filter.key}-${filter.value}-${index}`}
                variant="secondary"
                className="gap-1 pr-1"
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
        <Accordion type="multiple" className="w-full" defaultValue={filterableAttributes.map(a => a.slug)}>
          {filterableAttributes.map((attr) => (
            <AccordionItem key={attr.slug} value={attr.slug}>
              <AccordionTrigger className="text-sm font-medium py-3">
                {attr.name}
                {attr.unit && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({attr.unit})
                  </span>
                )}
              </AccordionTrigger>
              <AccordionContent>
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

                {/* Checkbox List Filter */}
                {attr.filterType === "CHECKBOX_LIST" && (
                  <CheckboxFilter
                    attr={attr}
                    valueCounts={getValueCounts(attr)}
                    searchParams={searchParams}
                    basePath={basePath}
                    router={router}
                  />
                )}

                {/* Toggle Filter */}
                {attr.filterType === "TOGGLE" && (
                  <ToggleFilter
                    attr={attr}
                    searchParams={searchParams}
                    basePath={basePath}
                    router={router}
                  />
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* No Filterable Attributes */}
        {filterableAttributes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No filters available
          </p>
        )}
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
  attr: Attribute;
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
            placeholder={bounds.min.toString()}
            value={currentMin}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              if (e.target.value) {
                params.set(`${attr.slug}_min`, e.target.value);
              } else {
                params.delete(`${attr.slug}_min`);
              }
              router.push(`${basePath}?${params.toString()}`);
            }}
            className="h-8 text-sm mt-1"
            step="any"
          />
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Max</Label>
          <Input
            type="number"
            placeholder={bounds.max.toString()}
            value={currentMax}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              if (e.target.value) {
                params.set(`${attr.slug}_max`, e.target.value);
              } else {
                params.delete(`${attr.slug}_max`);
              }
              router.push(`${basePath}?${params.toString()}`);
            }}
            className="h-8 text-sm mt-1"
            step="any"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Range: {bounds.min.toFixed(2)} - {bounds.max.toFixed(2)} {attr.unit}
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
  attr: Attribute;
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

    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {attr.allowedValues.map((value) => (
        <label
          key={value}
          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
        >
          <Checkbox
            checked={selectedValues.includes(value)}
            onCheckedChange={() => toggleValue(value)}
            className="data-[state=checked]:bg-[--dht-red] data-[state=checked]:border-[--dht-red]"
          />
          <span className="text-sm flex-1">{value}</span>
          <Badge variant="outline" className="text-xs">
            {valueCounts[value] || 0}
          </Badge>
        </label>
      ))}
    </div>
  );
}

// Toggle Filter Component
function ToggleFilter({
  attr,
  searchParams,
  basePath,
  router,
}: {
  attr: Attribute;
  searchParams: URLSearchParams;
  basePath: string;
  router: ReturnType<typeof useRouter>;
}) {
  const currentValue = searchParams.get(attr.slug) === "true";

  const toggleValue = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (currentValue) {
      params.delete(attr.slug);
    } else {
      params.set(attr.slug, "true");
    }
    
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm cursor-pointer" onClick={toggleValue}>
        Yes
      </Label>
      <Switch
        checked={currentValue}
        onCheckedChange={toggleValue}
        className="data-[state=checked]:bg-[--dht-red]"
      />
    </div>
  );
}

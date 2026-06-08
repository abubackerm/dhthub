"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type {
  LeafFilterableAttributeView,
  FacetStats,
} from "@/lib/api/catalog/types";

interface MobileFilterToggleProps {
  attributes: LeafFilterableAttributeView[];
  facets: Record<string, FacetStats>;
  basePath: string;
}

export function MobileFilterToggle({ attributes, facets, basePath }: MobileFilterToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

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
    setIsOpen(false);
  }, [router, basePath]);

  const filterableAttributes = attributes.filter(
    (attr) => attr.filterType === "RANGE" || attr.filterType === "CHECKBOX" || attr.filterType === "SELECT"
  );

  if (filterableAttributes.length === 0) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilters.length > 0 && (
            <Badge className="ml-auto bg-(--dht-red)">{activeFilters.length}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {activeFilters.length > 0 && (
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-muted-foreground">
                {activeFilters.length} active filter{activeFilters.length !== 1 ? "s" : ""}
              </span>
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear all
              </Button>
            </div>
          )}

          <Accordion type="multiple" className="w-full" defaultValue={filterableAttributes.map((a) => a.slug)}>
            {filterableAttributes.map((attr) => (
              <AccordionItem key={attr.id} value={attr.slug} className="border-b last:border-b-0">
                <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
                  <span>
                    {attr.name}
                    {attr.unitName && (
                      <span className="text-muted-foreground font-normal ml-1">
                        ({attr.unitName})
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  {attr.filterType === "RANGE" && (
                    <RangeFilter
                      attr={attr}
                      facets={facets}
                      searchParams={searchParams}
                      basePath={basePath}
                      router={router}
                    />
                  )}
                  {(attr.filterType === "CHECKBOX" || attr.filterType === "SELECT") && (
                    <CheckboxFilter
                      attr={attr}
                      facets={facets}
                      searchParams={searchParams}
                      basePath={basePath}
                      router={router}
                      onClose={() => setIsOpen(false)}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Range Filter Component
function RangeFilter({
  attr,
  facets,
  searchParams,
  basePath,
  router,
}: {
  attr: LeafFilterableAttributeView;
  facets: Record<string, FacetStats>;
  searchParams: URLSearchParams;
  basePath: string;
  router: ReturnType<typeof useRouter>;
}) {
  const currentMin = searchParams.get(`${attr.slug}_min`) || "";
  const currentMax = searchParams.get(`${attr.slug}_max`) || "";

  const bounds = useMemo(() => {
    const stats = facets[attr.id];
    if (!stats || stats.min == null || stats.max == null) return { min: 0, max: 100 };
    return { min: stats.min, max: stats.max };
  }, [facets, attr.id]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;
    router.push(newUrl);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Min</Label>
          <Input
            type="number"
            placeholder={bounds.min.toFixed(2)}
            value={currentMin}
            onChange={(e) => updateFilter(`${attr.slug}_min`, e.target.value)}
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
            onChange={(e) => updateFilter(`${attr.slug}_max`, e.target.value)}
            className="h-8 text-sm mt-1"
            step="any"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Range: {bounds.min.toFixed(2)} - {bounds.max.toFixed(2)} {attr.unitName}
      </p>
    </div>
  );
}

// Checkbox Filter Component
function CheckboxFilter({
  attr,
  facets,
  searchParams,
  basePath,
  router,
  onClose,
}: {
  attr: LeafFilterableAttributeView;
  facets: Record<string, FacetStats>;
  searchParams: URLSearchParams;
  basePath: string;
  router: ReturnType<typeof useRouter>;
  onClose: () => void;
}) {
  const selectedValues = searchParams.getAll(attr.slug);

  const valueCounts = useMemo(() => {
    const stats = facets[attr.id];
    if (!stats?.buckets) return {};
    const counts: Record<string, number> = {};
    for (const bucket of stats.buckets) {
      counts[bucket.value] = bucket.count;
    }
    return counts;
  }, [facets, attr.id]);

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
    onClose();
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

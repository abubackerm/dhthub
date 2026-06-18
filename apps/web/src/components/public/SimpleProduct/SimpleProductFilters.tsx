"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

function useDebouncedValue(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface SimpleProductFiltersProps {
  basePath: string;
}

export function SimpleProductFilters({ basePath }: SimpleProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchText, setSearchText] = useState(searchParams.get("q") ?? "");
  const [priceMin, setPriceMin] = useState(searchParams.get("priceMin") ?? "");
  const [priceMax, setPriceMax] = useState(searchParams.get("priceMax") ?? "");

  const debouncedSearch = useDebouncedValue(searchText, 300);
  const prevDebouncedRef = useRef(debouncedSearch);
  const hasMounted = useRef(false);

  // Sync debounced search to URL
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (debouncedSearch === prevDebouncedRef.current) return;
    prevDebouncedRef.current = debouncedSearch;

    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    } else {
      params.delete("q");
    }
    const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;
    router.push(newUrl);
  }, [debouncedSearch, basePath, router, searchParams]);

  const hasActiveFilters = searchParams.toString().length > 0;

  const clearAllFilters = useCallback(() => {
    setSearchText("");
    setPriceMin("");
    setPriceMax("");
    router.push(basePath);
  }, [router, basePath]);

  const updateUrlParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const newUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath;
      router.push(newUrl);
    },
    [basePath, router, searchParams],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4 mb-6">
      {/* Text Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          type="text"
          placeholder="Search name or SKU..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Price Range */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 whitespace-nowrap">Price:</span>
        <Input
          type="number"
          placeholder="Min"
          value={priceMin}
          onChange={(e) => {
            setPriceMin(e.target.value);
            updateUrlParam("priceMin", e.target.value);
          }}
          className="w-20 h-9 text-sm"
          min={0}
          step="any"
        />
        <span className="text-gray-400 text-xs">-</span>
        <Input
          type="number"
          placeholder="Max"
          value={priceMax}
          onChange={(e) => {
            setPriceMax(e.target.value);
            updateUrlParam("priceMax", e.target.value);
          }}
          className="w-20 h-9 text-sm"
          min={0}
          step="any"
        />
      </div>

      {/* Clear All */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="h-9 text-xs gap-1 text-gray-500 hover:text-(--dht-red)"
        >
          <X className="h-3.5 w-3.5" />
          Clear all
        </Button>
      )}
    </div>
  );
}

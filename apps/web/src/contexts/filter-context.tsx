"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type {
  LeafFilterableAttributeView,
  FacetStats,
} from "@/lib/api/catalog/types";

interface FilterData {
  attributes: LeafFilterableAttributeView[];
  facets: Record<string, FacetStats>;
  basePath: string;
}

interface FilterContextType {
  filterData: FilterData | null;
  setFilterData: (data: FilterData | null) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filterData, setFilterData] = useState<FilterData | null>(null);

  return (
    <FilterContext.Provider value={{ filterData, setFilterData }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterContext() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilterContext must be used within a FilterProvider");
  }
  return context;
}

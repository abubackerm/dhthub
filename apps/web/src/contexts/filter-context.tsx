"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import type {
  LeafFilterableAttributeView,
  LeafVariantView,
} from "@/lib/api/catalog/types";

interface FilterData {
  attributes: LeafFilterableAttributeView[];
  variants: Array<LeafVariantView & {
    productId: string;
    productName: string;
    productSlug: string;
    cellId: string;
    cellName: string;
  }>;
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

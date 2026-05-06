"use client";

import { useSearchParams } from "next/navigation";
import { useFilterContext } from "@/contexts/filter-context";
import type {
  LeafFilterableAttributeView,
  AggregatedFilterDataView,
} from "@/lib/api/catalog/types";

interface LeafCategoryFiltersProps {
  attributes: LeafFilterableAttributeView[];
  facets: AggregatedFilterDataView["facets"];
  basePath: string;
}

export function LeafCategoryFilters({
  attributes,
  facets,
  basePath,
}: LeafCategoryFiltersProps) {
  const searchParams = useSearchParams();
  const { setFilterData } = useFilterContext();

  // Initialize filter context when component mounts
  if (attributes.length > 0) {
    setFilterData({
      attributes,
      facets: facets ?? {},
      basePath,
    });
  }

  return (
    <aside className="filter-sidebar">
      <h3 className="filter-sidebar__title">Filters</h3>
      <div className="filter-sidebar__content">
        {attributes.map((attr) => (
          <FilterSection
            key={attr.id}
            attribute={attr}
            facets={facets}
            searchParams={searchParams}
          />
        ))}
      </div>
    </aside>
  );
}

function FilterSection({
  attribute,
  facets,
  searchParams,
}: {
  attribute: LeafFilterableAttributeView;
  facets: AggregatedFilterDataView["facets"];
  searchParams: URLSearchParams;
}) {
  if (attribute.filterType === "RANGE") {
    return (
      <RangeFilter
        attribute={attribute}
        facets={facets}
        searchParams={searchParams}
      />
    );
  }

  if (attribute.filterType === "CHECKBOX") {
    return (
      <CheckboxFilter
        attribute={attribute}
        facets={facets}
        searchParams={searchParams}
      />
    );
  }

  return null;
}

function RangeFilter({
  attribute,
  facets,
  searchParams,
}: {
  attribute: LeafFilterableAttributeView;
  facets: AggregatedFilterDataView["facets"];
  searchParams: URLSearchParams;
}) {
  const minParam = `${attribute.slug}_min`;
  const maxParam = `${attribute.slug}_max`;
  const currentMin = searchParams.get(minParam);
  const currentMax = searchParams.get(maxParam);

  const facet = facets?.[attribute.id];
  const minValue = facet?.min ?? 0;
  const maxValue = facet?.max ?? 100;

  return (
    <div className="filter-section">
      <h4 className="filter-section__title">{attribute.name}</h4>
      <div className="filter-section__range">
        <div className="filter-section__range-inputs">
          <input
            type="number"
            placeholder={`Min: ${minValue}`}
            defaultValue={currentMin ?? undefined}
            data-filter-name={minParam}
            className="filter-input"
          />
          <input
            type="number"
            placeholder={`Max: ${maxValue}`}
            defaultValue={currentMax ?? undefined}
            data-filter-name={maxParam}
            className="filter-input"
          />
        </div>
      </div>
    </div>
  );
}

function CheckboxFilter({
  attribute,
  facets,
  searchParams,
}: {
  attribute: LeafFilterableAttributeView;
  facets: AggregatedFilterDataView["facets"];
  searchParams: URLSearchParams;
}) {
  const facet = facets?.[attribute.id];
  const selectedValues = searchParams.getAll(attribute.slug);

  return (
    <div className="filter-section">
      <h4 className="filter-section__title">{attribute.name}</h4>
      <div className="filter-section__options">
        {facet?.options?.map((option) => (
          <label key={option.value} className="filter-checkbox">
            <input
              type="checkbox"
              name={attribute.slug}
              value={option.value}
              defaultChecked={selectedValues.includes(option.value)}
              data-filter-name={attribute.slug}
            />
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span className="filter-count">({option.count})</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

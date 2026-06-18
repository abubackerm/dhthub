import { AttributeDataType, AttributeFilterType } from '@prisma/client';

export interface LeafAttributeValueView {
  attributeId: string;
  attributeName: string;
  attributeSlug: string;
  dataType: AttributeDataType;
  unitName: string | null;
  rawValue: string | null;
  numberValue: number | null;
  textValue: string | null;
  optionValue: string | null;
  optionLabel: string | null;
  booleanValue: boolean | null;
}

export interface LeafVariantView {
  id: string;
  sku: string;
  name: string;
  price: number | null;
  quantity: number;
  isDefault: boolean;
  attributeValues: LeafAttributeValueView[];
  images: { url: string; altText: string | null; isPrimary: boolean }[];
}

export interface LeafProductView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  images: { url: string; altText: string | null; isPrimary: boolean }[];
  variants: LeafVariantView[];
  tableColumns: LeafTableColumnView[];
}

export interface LeafTableColumnView {
  id: string;
  position: number;
  attributeId: string;
  attributeName: string;
  attributeSlug: string;
  dataType: string;
  unitName: string | null;
}

export interface LeafCellView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  imageUrl: string | null;
  images: { url: string; altText: string | null; isPrimary: boolean }[];
  products: LeafProductView[];
}

export interface LeafFilterableAttributeView {
  id: string;
  name: string;
  slug: string;
  dataType: AttributeDataType;
  filterType: AttributeFilterType | null;
  unitName: string | null;
  options: { id: string; label: string; value: string }[];
}

export class LeafPageView {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    path: string;
    sku: string | null;
    imageUrl: string | null;
    displayMode: string;
  };
  cells: LeafCellView[];
  filterableAttributes: LeafFilterableAttributeView[];

  static fromPrisma(data: {
    category: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      path: string;
      imageUrl: string | null;
      sku?: string | null;
      displayMode?: string;
    };
    cells: any[];
    filterableAttributes: any[];
  }): LeafPageView {
    const view = new LeafPageView();
    view.category = {
      id: data.category.id,
      name: data.category.name,
      slug: data.category.slug,
      description: data.category.description,
      path: data.category.path,
      sku: data.category.sku ?? null,
      imageUrl: LeafPageView.normalizeImageUrl(data.category.imageUrl),
      displayMode: data.category.displayMode ?? 'VARIANT_TABLE',
    };
    view.cells = data.cells.map((cell: any) => LeafPageView.mapCell(cell));
    view.filterableAttributes = data.filterableAttributes.map((attr: any) =>
      LeafPageView.mapFilterableAttribute(attr)
    );
    return view;
  }

  public static mapCell(cell: any): LeafCellView {
    return {
      id: cell.id,
      name: cell.name,
      slug: cell.slug,
      description: cell.description,
      sortOrder: cell.sortOrder,
      imageUrl: LeafPageView.normalizeImageUrl(cell.imageUrl),
      images: (cell.images || []).map((img: any) => {
        // Normalize storage path - remove full URL and /catalog prefix if present
        let storagePath = img.storagePath;
        if (storagePath.startsWith('http')) {
          const url = new URL(storagePath);
          storagePath = url.pathname;
        }
        // Remove /catalog prefix if present
        if (storagePath.startsWith('/catalog')) {
          storagePath = storagePath.replace('/catalog', '');
        }
        return {
          id: img.id,
          storagePath,
          altText: img.altText,
          isPrimary: img.isPrimary,
        };
      }),
      products: (cell.products || []).map((product: any) =>
        LeafPageView.mapProduct(product)
      ),
    };
  }

  public static mapProduct(product: any): LeafProductView {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      images: (product.images || []).map((img: any) => {
        // Normalize image URL - remove full URL and /catalog prefix if present
        let url = img.url;
        if (url && url.startsWith('http')) {
          const parsed = new URL(url);
          url = parsed.pathname;
        }
        // Remove /catalog prefix if present
        if (url.startsWith('/catalog')) {
          url = url.replace('/catalog', '');
        }
        return {
          url,
          altText: img.altText,
          isPrimary: img.isPrimary,
        };
      }),
      variants: (product.variants || []).map((variant: any) =>
        LeafPageView.mapVariant(variant)
      ),
      tableColumns: (product.tableColumns || []).map((tc: any) => ({
        id: tc.id,
        position: tc.position,
        attributeId: tc.attribute.id,
        attributeName: tc.attribute.name,
        attributeSlug: tc.attribute.slug,
        dataType: tc.attribute.dataType,
        unitName: tc.unit?.name || null,
      })),
    };
  }

  public static mapVariant(variant: any): LeafVariantView {
    return {
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      price: variant.price,
      quantity: variant.quantity,
      isDefault: variant.isDefault,
      attributeValues: (variant.attributeValues || []).map((av: any) =>
        LeafPageView.mapAttributeValue(av)
      ),
      images: (variant.variantImages || []).map((img: any) => {
        // Normalize image URL - remove full URL and /catalog prefix if present
        let url = img.storagePath;
        if (url && url.startsWith('http')) {
          const parsed = new URL(url);
          url = parsed.pathname;
        }
        // Remove /catalog prefix if present
        if (url.startsWith('/catalog')) {
          url = url.replace('/catalog', '');
        }
        return {
          url,
          altText: img.altText,
          isPrimary: img.isPrimary,
        };
      }),
    };
  }

  public static mapAttributeValue(av: any): LeafAttributeValueView {
    return {
      attributeId: av.attribute.id,
      attributeName: av.attribute.name,
      attributeSlug: av.attribute.slug,
      dataType: av.attribute.dataType,
      unitName: null,
      numberValue: av.numberValue,
      rawValue: av.rawValue,
      textValue: av.textValue,
      optionValue: av.option?.value || null,
      optionLabel: av.option?.label || null,
      booleanValue: av.booleanValue,
    };
  }

  public static mapFilterableAttribute(attr: any): LeafFilterableAttributeView {
    return {
      id: attr.attribute.id,
      name: attr.attribute.name,
      slug: attr.attribute.slug,
      dataType: attr.attribute.dataType,
      filterType: attr.attribute.filterType,
      unitName: null,
      options: (attr.attribute.options || []).map((opt: any) => ({
        id: opt.id,
        label: opt.label,
        value: opt.value,
      })),
    };
  }

  public static normalizeImageUrl(url: string | null): string | null {
    if (!url) return url;
    // Normalize URL: strip http(s)://hostname, remove /catalog prefix
    if (url.startsWith('http')) {
      const parsed = new URL(url);
      url = parsed.pathname;
    }
    if (url.startsWith('/catalog')) {
      url = url.replace('/catalog', '');
    }
    return url;
  }
}

export interface LeafCategoryView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cells: LeafCellView[];
  filterableAttributes: LeafFilterableAttributeView[];
}

export interface FacetBucket {
  value: string;
  label: string;
  count: number;
}

export interface FacetStats {
  attributeId: string;
  buckets?: FacetBucket[];
  min?: number | null;
  max?: number | null;
}

export class AggregatedFilterDataView {
  filterableAttributes: LeafFilterableAttributeView[];
  facets: Record<string, FacetStats>;

  static fromPrisma(data: {
    filterableAttributes: any[];
    facets: Array<{
      attributeId: string;
      optionId?: string;
      optionLabel?: string;
      optionValue?: string;
      variantCount: number;
      min?: number | null;
      max?: number | null;
    }>;
  }): AggregatedFilterDataView {
    const view = new AggregatedFilterDataView();
    view.filterableAttributes = data.filterableAttributes.map((attr: any) =>
      LeafPageView.mapFilterableAttribute(attr),
    );

    view.facets = {};
    for (const row of data.facets) {
      if (view.facets[row.attributeId] === undefined) {
        view.facets[row.attributeId] = {
          attributeId: row.attributeId,
          min: row.min ?? null,
          max: row.max ?? null,
        };
      }
      if (row.min !== undefined || row.max !== undefined) {
        const existing = view.facets[row.attributeId];
        if (row.min !== undefined && row.min !== null) {
          existing.min = existing.min == null ? row.min : Math.min(existing.min, row.min);
        }
        if (row.max !== undefined && row.max !== null) {
          existing.max = existing.max == null ? row.max : Math.max(existing.max, row.max);
        }
      }
      if (row.optionId) {
        const stats = view.facets[row.attributeId];
        if (!stats.buckets) stats.buckets = [];
        stats.buckets.push({
          value: row.optionValue ?? '',
          label: row.optionLabel ?? '',
          count: row.variantCount,
        });
      }
    }

    return view;
  }
}

export class ConsolidatedLeafPageView {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    path: string;
    sku: string | null;
    imageUrl: string | null;
    displayMode: string;
  };
  leafCategories: LeafCategoryView[];
  filterableAttributes: LeafFilterableAttributeView[];
  totalLeafCount: number;
  isTruncated: boolean;

  static fromPrisma(data: {
    category: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      path: string;
      imageUrl: string | null;
      sku?: string | null;
      displayMode?: string;
    };
    leafCategories: any[];
    filterableAttributes: any[];
    totalLeafCount?: number;
    isTruncated?: boolean;
  }): ConsolidatedLeafPageView {
    const view = new ConsolidatedLeafPageView();
    view.category = {
      id: data.category.id,
      name: data.category.name,
      slug: data.category.slug,
      description: data.category.description,
      path: data.category.path,
      sku: data.category.sku ?? null,
      imageUrl: LeafPageView.normalizeImageUrl(data.category.imageUrl),
      displayMode: data.category.displayMode ?? 'VARIANT_TABLE',
    };
    view.leafCategories = data.leafCategories.map((lc: any) => ({
      id: lc.id,
      name: lc.name,
      slug: lc.slug,
      description: lc.description,
      cells: (lc.cells || []).map((cell: any) => LeafPageView.mapCell(cell)),
      filterableAttributes: (lc.filterableAttributes || []).map((attr: any) =>
        LeafPageView.mapFilterableAttribute(attr)
      ),
    }));
    view.filterableAttributes = data.filterableAttributes.map((attr: any) =>
      LeafPageView.mapFilterableAttribute(attr)
    );
    view.totalLeafCount = data.totalLeafCount ?? data.leafCategories.length;
    view.isTruncated = data.isTruncated ?? false;
    return view;
  }
}

import { AttributeDataType, AttributeFilterType } from '@prisma/client';

export interface LeafAttributeValueView {
  attributeId: string;
  attributeName: string;
  attributeSlug: string;
  dataType: AttributeDataType;
  unitSymbol: string | null;
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
  variants: LeafVariantView[];
}

export interface LeafCellView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  products: LeafProductView[];
}

export interface LeafFilterableAttributeView {
  id: string;
  name: string;
  slug: string;
  dataType: AttributeDataType;
  filterType: AttributeFilterType | null;
  unitSymbol: string | null;
  options: { id: string; label: string; value: string }[];
}

export class LeafPageView {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    path: string;
    imageUrl: string | null;
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
    };
    cells: any[];
    filterableAttributes: any[];
  }): LeafPageView {
    const view = new LeafPageView();
    view.category = data.category;
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
      variants: (product.variants || []).map((variant: any) =>
        LeafPageView.mapVariant(variant)
      ),
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
      images: (variant.images || []).map((img: any) => ({
        url: img.url,
        altText: img.altText,
        isPrimary: img.isPrimary,
      })),
    };
  }

  public static mapAttributeValue(av: any): LeafAttributeValueView {
    return {
      attributeId: av.attribute.id,
      attributeName: av.attribute.name,
      attributeSlug: av.attribute.slug,
      dataType: av.attribute.dataType,
      unitSymbol: av.attribute.unit?.symbol || null,
      numberValue: av.numberValue,
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
      unitSymbol: attr.attribute.unit?.symbol || null,
      options: (attr.attribute.options || []).map((opt: any) => ({
        id: opt.id,
        label: opt.label,
        value: opt.value,
      })),
    };
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

export class ConsolidatedLeafPageView {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    path: string;
    imageUrl: string | null;
  };
  leafCategories: LeafCategoryView[];
  filterableAttributes: LeafFilterableAttributeView[];

  static fromPrisma(data: {
    category: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      path: string;
      imageUrl: string | null;
    };
    leafCategories: any[];
    filterableAttributes: any[];
  }): ConsolidatedLeafPageView {
    const view = new ConsolidatedLeafPageView();
    view.category = data.category;
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
    return view;
  }
}

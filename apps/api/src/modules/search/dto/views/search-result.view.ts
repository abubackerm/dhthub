export interface SearchFacet {
  field: string;
  values: Array<{
    value: string | number;
    count: number;
  }>;
}

export interface SearchResultItem {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  categoryId: string | null;
  categoryPath: string | null;
  price: number | null;
  currency: string;
  stock: number;
  image: string | null;
  attributes: Record<string, string | number>;
  highlight?: {
    productName?: string;
    sku?: string;
    categoryPath?: string;
  };
}

export interface SearchResultView {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: SearchResultItem[];
  facets?: SearchFacet[];
}

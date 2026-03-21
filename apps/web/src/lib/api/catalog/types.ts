export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  path: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
  depth: number;
  productCount: number;
  cellCount?: number;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type AttributeDataType = 'number' | 'text' | 'enum' | 'boolean';

export type AttributeFilterType = 'RANGE' | 'CHECKBOX' | 'SELECT' | null;

export interface AttributeOptionView {
  id: string;
  attributeId: string;
  label: string;
  value: string;
  sortOrder: number;
  createdAt: string;
}

export interface AttributeView {
  id: string;
  name: string;
  slug: string;
  dataType: AttributeDataType;
  group: string | null;
  sortOrder: number;
  filterType: AttributeFilterType;
  unitId: string | null;
  isFilterable: boolean;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryAttributeView {
  assignmentId: string;
  categoryId: string;
  createdAt: string;
  attribute: AttributeView;
  options: AttributeOptionView[];
}

export interface CreateAttributeInput {
  name: string;
  slug: string;
  dataType: Exclude<AttributeDataType, null>;
  group?: string;
  sortOrder?: number;
  filterType?: Exclude<AttributeFilterType, null>;
  unitId?: string;
  isFilterable?: boolean;
  isRequired?: boolean;
}

export interface UpdateAttributeInput {
  name?: string;
  dataType?: Exclude<AttributeDataType, null>;
  group?: string;
  sortOrder?: number;
  filterType?: Exclude<AttributeFilterType, null>;
  unitId?: string;
  isFilterable?: boolean;
  isRequired?: boolean;
}

export interface AssignAttributeToCategoryInput {
  attributeId: string;
}

export interface CreateAttributeOptionInput {
  label: string;
  value: string;
  sortOrder?: number;
}

export interface UpdateAttributeOptionInput {
  label?: string;
  value?: string;
  sortOrder?: number;
}

export interface ListResponseMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: ListResponseMeta;
}

export type ProductStatus = 'draft' | 'active' | 'archived';

export type ProductType = 'simple' | 'variable';

export interface VariantView {
  id: string;
  sku: string;
  name: string;
  price: number | null;
  quantity: number;
  isDefault: boolean;
  images: { url: string; altText: string | null; isPrimary: boolean }[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ProductType;
  status: ProductStatus;
  categoryId: string | null;
  price: number | null;
  quantity: number;
  isFeatured: boolean;
  primaryImageUrl: string | null;
  variants: VariantView[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  description?: string;
  categoryId?: string;
  type?: ProductType;
  price?: number;
  quantity?: number;
  isFeatured?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string;
  categoryId?: string;
  status?: ProductStatus;
  price?: number;
  quantity?: number;
  isFeatured?: boolean;
}

export interface CreateVariantInput {
  sku: string;
  name?: string;
  price?: number;
  quantity?: number;
  isDefault?: boolean;
}

export interface ProductsQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  cellId?: string;
  status?: ProductStatus;
}

export interface BulkUpdateProductInput {
  ids: string[];
  data: Partial<Pick<UpdateProductInput, 'status' | 'categoryId' | 'price' | 'quantity' | 'isFeatured'>>;
}

export interface BulkUpdateResult {
  updatedCount: number;
}

// Cell Types
export interface Cell {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  categoryId: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface CellWithAttributes extends Cell {
  attributes: Array<{
    cellAttributeId: string;
    attributeId: string;
    displayOrder: number;
    attribute: AttributeView;
  }>;
  productCount: number;
}

export interface CreateCellInput {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  categoryId: string;
}

export interface UpdateCellInput {
  name?: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface AssignAttributeToCellInput {
  attributeId: string;
  displayOrder?: number;
}

export interface CellsQueryParams {
  categoryId?: string;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}

// ============================================
// Leaf Page Types
// ============================================

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
  filterType: AttributeFilterType;
  unitSymbol: string | null;
  options: { id: string; label: string; value: string }[];
}

export interface LeafPageView {
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
}

export interface LeafCategoryView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cells: LeafCellView[];
  filterableAttributes: LeafFilterableAttributeView[];
}

export interface ConsolidatedLeafPageView {
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
}

// ============================================
// Product Detail Types
// ============================================

export interface ProductDetailVariantView {
  id: string;
  sku: string;
  name: string;
  price: number | null;
  compareAtPrice: number | null;
  quantity: number;
  isDefault: boolean;
  sortOrder: number;
  images: { url: string; altText: string | null; isPrimary: boolean }[];
  attributeValues: {
    id: string;
    numberValue: number | null;
    textValue: string | null;
    booleanValue: boolean | null;
    attribute: {
      id: string;
      name: string;
      slug: string;
      dataType: string;
      unit: { symbol: string } | null;
    };
    option: { id: string; label: string; value: string } | null;
  }[];
}

export interface ProductDetailView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  status: string;
  price: number | null;
  compareAtPrice: number | null;
  currency: string;
  quantity: number;
  isFeatured: boolean;
  cell: {
    id: string;
    name: string;
    slug: string;
    category: {
      id: string;
      name: string;
      slug: string;
      path: string;
    };
  } | null;
  variants: ProductDetailVariantView[];
  images: { url: string; altText: string | null; isPrimary: boolean }[];
}

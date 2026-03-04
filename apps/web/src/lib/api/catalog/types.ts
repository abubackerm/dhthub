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
  status?: ProductStatus;
}

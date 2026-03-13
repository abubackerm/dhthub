import { apiClient } from '../client';
import type {
  BulkUpdateProductInput,
  BulkUpdateResult,
  CreateProductInput,
  CreateVariantInput,
  PaginatedResponse,
  ProductView,
  ProductsQueryParams,
  UpdateProductInput,
  VariantView,
} from './types';

export async function getProducts(
  params: ProductsQueryParams = {},
): Promise<PaginatedResponse<ProductView>> {
  const searchParams = new URLSearchParams();

  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.pageSize != null)
    searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.status) searchParams.set('status', params.status);

  const qs = searchParams.toString();
  const endpoint = qs ? `/v1/catalog/products?${qs}` : '/v1/catalog/products';

  return apiClient.get<PaginatedResponse<ProductView>>(endpoint);
}

export async function getProductById(id: string): Promise<ProductView> {
  return apiClient.get<ProductView>(`/v1/catalog/products/${id}`);
}

export async function getProductBySku(sku: string): Promise<ProductView> {
  return apiClient.get<ProductView>(`/v1/catalog/products/by-sku/${sku}`);
}

export async function createProduct(data: CreateProductInput): Promise<ProductView> {
  return apiClient.post<ProductView>('/v1/catalog/products', data);
}

export async function updateProduct(
  id: string,
  data: UpdateProductInput,
): Promise<ProductView> {
  return apiClient.patch<ProductView>(`/v1/catalog/products/${id}`, data);
}

export async function hardDeleteProduct(id: string): Promise<void> {
  return apiClient.delete<void>(`/v1/catalog/products/${id}/hard`);
}

export async function addVariant(
  productId: string,
  data: CreateVariantInput,
): Promise<VariantView> {
  return apiClient.post<VariantView>(
    `/v1/catalog/products/${productId}/variants`,
    data,
  );
}

export async function bulkUpdateProducts(
  input: BulkUpdateProductInput,
): Promise<BulkUpdateResult> {
  return apiClient.patch<BulkUpdateResult>(
    '/v1/catalog/products/bulk',
    input,
  );
}


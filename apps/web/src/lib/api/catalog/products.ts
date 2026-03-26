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
  ProductDetailView,
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
  if (params.cellId) searchParams.set('cellId', params.cellId);
  if (params.status) searchParams.set('status', params.status);

  const qs = searchParams.toString();
  const endpoint = qs ? `/v1/catalog/products?${qs}` : '/v1/catalog/products';

  return apiClient.get<PaginatedResponse<ProductView>>(endpoint);
}

export async function searchProducts(
  query: string,
  limit: number = 50,
): Promise<PaginatedResponse<ProductView>> {
  const searchParams = new URLSearchParams();
  searchParams.set('search', query);
  searchParams.set('pageSize', String(limit));
  searchParams.set('page', '1');

  const qs = searchParams.toString();
  return apiClient.get<PaginatedResponse<ProductView>>(`/v1/catalog/products?${qs}`);
}

export async function getProductById(id: string): Promise<ProductView> {
  return apiClient.get<ProductView>(`/v1/catalog/products/${id}`);
}

export async function getProductBySku(sku: string): Promise<ProductView> {
  return apiClient.get<ProductView>(`/v1/catalog/products/by-sku/${sku}`);
}

export async function getProductBySlug(slug: string): Promise<ProductDetailView> {
  return apiClient.get<ProductDetailView>(`/v1/catalog/products/by-slug/${slug}`);
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

export async function removeVariant(productId: string, variantId: string): Promise<void> {
  return apiClient.delete<void>(`/v1/catalog/products/${productId}/variants/${variantId}`);
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

export async function updateVariant(
  productId: string,
  variantId: string,
  data: CreateVariantInput,
): Promise<VariantView> {
  return apiClient.patch<VariantView>(
    `/v1/catalog/products/${productId}/variants/${variantId}`,
    data,
  );
}

export async function addVariantImage(
  productId: string,
  variantId: string,
  data: { url: string; altText?: string; sortOrder?: number },
): Promise<any> {
  return apiClient.post(
    `/v1/catalog/products/${productId}/variants/${variantId}/images`,
    data,
  );
}

export async function updateImage(
  imageId: string,
  data: { altText?: string; sortOrder?: number; isPrimary?: boolean },
): Promise<any> {
  return apiClient.patch(`/v1/catalog/products/images/${imageId}`, data);
}

export async function removeImage(imageId: string): Promise<void> {
  return apiClient.delete(`/v1/catalog/products/images/${imageId}`);
}

export async function getVariantImages(
  productId: string,
  variantId: string,
): Promise<any[]> {
  return apiClient.get(`/v1/catalog/products/${productId}/variants/${variantId}/images`);
}

export async function exportProducts(productIds?: string[]): Promise<{ filename: string; contentType: string; content: string }> {
  return apiClient.post('/v1/catalog/products/export', {
    productIds,
    exportAll: !productIds || productIds.length === 0,
  });
}


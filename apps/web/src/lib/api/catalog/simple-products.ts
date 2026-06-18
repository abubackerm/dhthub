import { apiClient } from '../client';
import { serverFetch } from '../server-fetch';
import type {
  SimpleProductView,
  SimpleProductImage,
  SimpleProductAttributeValueView,
  CreateSimpleProductImageInput,
  UpdateSimpleProductImageInput,
  CreateSimpleProductInput,
  UpdateSimpleProductInput,
  SetSimpleProductAttributeInput,
} from './types';

export const CACHE_TAG_SIMPLE_PRODUCT = 'simple-product';

// ============================================
// Admin API endpoints
// ============================================

export async function getSimpleProductsByCategory(
  categoryId: string,
): Promise<SimpleProductView[]> {
  return apiClient.get<SimpleProductView[]>(
    `/v1/catalog/simple-products/${categoryId}`,
  );
}

export async function getSimpleProduct(
  categoryId: string,
  productId: string,
): Promise<SimpleProductView> {
  return apiClient.get<SimpleProductView>(
    `/v1/catalog/simple-products/${categoryId}/${productId}`,
  );
}

export async function createSimpleProduct(
  categoryId: string,
  data: CreateSimpleProductInput,
): Promise<SimpleProductView> {
  return apiClient.post<SimpleProductView>(
    `/v1/catalog/simple-products/${categoryId}`,
    data,
  );
}

export async function updateSimpleProduct(
  categoryId: string,
  productId: string,
  data: UpdateSimpleProductInput,
): Promise<SimpleProductView> {
  return apiClient.patch<SimpleProductView>(
    `/v1/catalog/simple-products/${categoryId}/${productId}`,
    data,
  );
}

export async function deleteSimpleProduct(
  categoryId: string,
  productId: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/v1/catalog/simple-products/${categoryId}/${productId}`,
  );
}

// ============================================
// Public endpoint (by category slug)
// ============================================

export async function getSimpleProductsBySlug(
  slug: string,
): Promise<SimpleProductView[]> {
  return apiClient.get<SimpleProductView[]>(
    `/v1/catalog/categories/${slug}/simple-products`,
  );
}

export async function getServerSimpleProductsBySlug(
  slug: string,
): Promise<SimpleProductView[]> {
  return serverFetch<SimpleProductView[]>(
    `/v1/catalog/categories/${slug}/simple-products`,
    {
      tags: [CACHE_TAG_SIMPLE_PRODUCT, `category-${slug}`],
    },
  );
}

export async function getServerSimpleProductBySlug(
  productSlug: string,
): Promise<SimpleProductView> {
  return serverFetch<SimpleProductView>(
    `/v1/catalog/categories/simple-product-by-slug/${productSlug}`,
    {
      tags: [CACHE_TAG_SIMPLE_PRODUCT, `simple-product-${productSlug}`],
    },
  );
}

// ============================================
// Image endpoints
// ============================================

export async function addSimpleProductImage(
  categoryId: string,
  productId: string,
  data: CreateSimpleProductImageInput,
): Promise<SimpleProductImage> {
  return apiClient.post<SimpleProductImage>(
    `/v1/catalog/simple-products/${categoryId}/${productId}/images`,
    data,
  );
}

export async function getSimpleProductImages(
  categoryId: string,
  productId: string,
): Promise<SimpleProductImage[]> {
  return apiClient.get<SimpleProductImage[]>(
    `/v1/catalog/simple-products/${categoryId}/${productId}/images`,
  );
}

export async function updateSimpleProductImage(
  categoryId: string,
  productId: string,
  imageId: string,
  data: UpdateSimpleProductImageInput,
): Promise<SimpleProductImage> {
  return apiClient.patch<SimpleProductImage>(
    `/v1/catalog/simple-products/${categoryId}/${productId}/images/${imageId}`,
    data,
  );
}

export async function deleteSimpleProductImage(
  categoryId: string,
  productId: string,
  imageId: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/v1/catalog/simple-products/${categoryId}/${productId}/images/${imageId}`,
  );
}

// ============================================
// Attribute Value endpoints
// ============================================

export async function getSimpleProductAttributeValues(
  categoryId: string,
  productId: string,
): Promise<SimpleProductAttributeValueView[]> {
  return apiClient.get<SimpleProductAttributeValueView[]>(
    `/v1/catalog/simple-products/${categoryId}/${productId}/attributes`,
  );
}

export async function setSimpleProductAttributeValue(
  categoryId: string,
  productId: string,
  data: SetSimpleProductAttributeInput,
): Promise<SimpleProductAttributeValueView> {
  return apiClient.post<SimpleProductAttributeValueView>(
    `/v1/catalog/simple-products/${categoryId}/${productId}/attributes`,
    data,
  );
}

export async function removeSimpleProductAttributeValue(
  categoryId: string,
  productId: string,
  attributeId: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/v1/catalog/simple-products/${categoryId}/${productId}/attributes/${attributeId}`,
  );
}

import { apiClient } from '../client';
import type {
  Category,
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput,
  LeafPageView,
  ConsolidatedLeafPageView,
} from './types';

export async function getCategories(): Promise<Category[]> {
  return apiClient.get<Category[]>('/v1/catalog/categories');
}

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  return apiClient.get<CategoryTreeNode[]>('/v1/catalog/categories/tree');
}

export async function getCategoryById(id: string): Promise<Category> {
  return apiClient.get<Category>(`/v1/catalog/categories/${id}`);
}

export async function getLeafPageData(slug: string): Promise<LeafPageView> {
  return apiClient.get<LeafPageView>(`/v1/catalog/categories/${slug}/leaf-data`);
}

export async function getConsolidatedLeafData(slug: string): Promise<ConsolidatedLeafPageView> {
  return apiClient.get<ConsolidatedLeafPageView>(`/v1/catalog/categories/${slug}/consolidated-leaf-data`);
}

export async function createCategory(
  data: CreateCategoryInput,
): Promise<Category> {
  return apiClient.post<Category>('/v1/catalog/categories', data);
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryInput,
): Promise<Category> {
  return apiClient.patch<Category>(`/v1/catalog/categories/${id}`, data);
}

export async function deleteCategory(id: string): Promise<void> {
  return apiClient.delete<void>(`/v1/catalog/categories/${id}`);
}
